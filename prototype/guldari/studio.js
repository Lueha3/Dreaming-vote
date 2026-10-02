/* 굴다리 스튜디오 — 곡 업로드 → 검수 → 셋리스트 → 무대 파이프라인
 * 전 과정 클라이언트 사이드. 실제 제품에서는 (a) 업로드는 Supabase Storage/R2,
 * (b) 검수는 ACRCloud 핑거프린트·커버 인식·AI 판별 API, (c) 재생은 HLS로 대체된다.
 * 여기서는 그 자리를 시뮬레이션으로 표시하고, 오디오 분석·연출 생성·재생은 진짜로 동작한다.
 */
(function () {
  'use strict';

  var MAX_SONGS = 15;               // 요구사항 1
  var setlist = [];                 // { title, buffer, cues, bpm, seconds, gain, aiLabeled, review }
  var pending = null;               // 검수 대기 중인 곡
  var el = {};

  ['studio','studioOpenBtn','studioCloseBtn','dropzone','fileInput','demoBtn',
   'analyzing','songCard','waveCanvas','titleInput','metaBpm','metaLen','metaLoud',
   'chkOwn','chkThird','aiUse','aiTool','aiToolWrap','reviewBtn','reviewSteps','reviewResult',
   'setlistWrap','setlistItems','setlistCount','setlistTime','goStageBtn','addMoreBtn','cuePreview'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  function show(node) { node.classList.add('show'); }
  function hide(node) { node.classList.remove('show'); }

  // ---------- 오디오 분석 ----------
  function toMono(buf) {
    var n = buf.length, out = new Float32Array(n);
    for (var c = 0; c < buf.numberOfChannels; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < n; i++) out[i] += d[i] / buf.numberOfChannels;
    }
    return out;
  }

  function analyze(buf) {
    var mono = toMono(buf), sr = buf.sampleRate;
    var FPS = 200, hop = Math.floor(sr / FPS);
    var frames = Math.floor(mono.length / hop);
    var env = new Float32Array(frames);   // 표시·섹션 분석용 (원 신호 RMS)
    var hf = new Float32Array(frames);    // 온셋 검출용 (1차 차분 = 간이 하이패스, 지속음 억제)
    var peak = 0, sumSq = 0, prev = 0;
    for (var i = 0; i < frames; i++) {
      var s = 0, sd = 0;
      for (var j = 0; j < hop; j++) {
        var v = mono[i * hop + j] || 0;
        s += v * v;
        var d = v - prev; prev = v; sd += d * d;
        var a = v < 0 ? -v : v; if (a > peak) peak = a;
      }
      env[i] = Math.sqrt(s / hop);
      hf[i] = Math.log(1 + 600 * Math.sqrt(sd / hop)); // 로그 압축
      sumSq += s;
    }
    // onset = 양의 차분(스펙트럴 플럭스 근사)
    var onset = new Float32Array(frames);
    for (var k = 1; k < frames; k++) { var d2 = hf[k] - hf[k - 1]; onset[k] = d2 > 0 ? d2 : 0; }

    // BPM: onset 자기상관 + 옥타브 오류 보정
    function acScore(bpm) {
      var lag = Math.round(FPS * 60 / bpm);
      if (lag < 2 || lag >= frames) return 0;
      var acc = 0, n2 = 0;
      for (var t = 0; t + lag < frames; t += 2) { acc += onset[t] * onset[t + lag]; n2++; }
      return n2 ? acc / n2 : 0;
    }
    var best = { bpm: 100, score: -1 };
    for (var bpm = 55; bpm <= 200; bpm += 0.5) {
      var sc = acScore(bpm);
      if (sc > best.score) best = { bpm: bpm, score: sc };
    }
    // 하이햇 8분음표를 비트로 오검출하는 문제 보정:
    // 정수배·정수분의 후보 중 '체감 템포 중심(약 100 BPM)'에 로그 정규 가중해 재선택
    var detected = best.bpm;
    var pickW = -1;
    [best.bpm / 4, best.bpm / 3, best.bpm / 2, best.bpm, best.bpm * 2, best.bpm * 3].forEach(function (c) {
      if (c < 58 || c > 190) return;
      var s = acScore(c);
      if (s < best.score * 0.45) return;
      var w = s * Math.exp(-Math.pow(Math.log(c / 100), 2) / (2 * 0.42 * 0.42));
      if (w > pickW) { pickW = w; detected = c; }
    });

    // 비트 위상: 비트 위치의 onset 합이 최대가 되는 오프셋
    var beatLag = FPS * 60 / detected, bestPhase = 0, bestPhaseScore = -1;
    for (var p = 0; p < Math.floor(beatLag); p += 1) {
      var ps = 0;
      for (var b = p; b < frames; b += beatLag) ps += onset[Math.round(b)] || 0;
      if (ps > bestPhaseScore) { bestPhaseScore = ps; bestPhase = p; }
    }

    // 라우드니스 근사(RMS dBFS) → -14 LUFS 정규화 게인
    var rms = Math.sqrt(sumSq / (frames * hop)) || 1e-6;
    var dbfs = 20 * Math.log10(rms);
    var lufsApprox = dbfs - 1.5;                       // 근사 보정
    var gain = Math.min(4, Math.pow(10, (-14 - lufsApprox) / 20));
    if (peak * gain > 0.99) gain = 0.99 / (peak || 1); // 클리핑 방지

    return {
      env: env, onset: onset, fps: FPS, bpm: Math.round(detected * 10) / 10,
      beatPhase: bestPhase / FPS, seconds: buf.duration, gain: gain,
      lufs: Math.round(lufsApprox * 10) / 10, peaks: peaksFor(mono, 900)
    };
  }

  function peaksFor(mono, cols) {
    var per = Math.floor(mono.length / cols), out = new Float32Array(cols);
    for (var c = 0; c < cols; c++) {
      var mx = 0, base = c * per;
      for (var i = 0; i < per; i += 16) { var a = Math.abs(mono[base + i] || 0); if (a > mx) mx = a; }
      out[c] = mx;
    }
    return out;
  }

  // ---------- 연출 큐 자동 생성 (연출 시퀀서 초벌) ----------
  function makeCues(an) {
    var cues = [], spb = 60 / an.bpm, barLen = spb * 4;
    var total = an.seconds;
    // 4마디 창 에너지로 섹션 변화 탐지
    var winFrames = Math.max(8, Math.round(barLen * an.fps));
    var wins = [];
    for (var s = 0; s + winFrames < an.env.length; s += winFrames) {
      var acc = 0;
      for (var i = s; i < s + winFrames; i++) acc += an.env[i];
      wins.push({ t: s / an.fps, e: acc / winFrames });
    }
    var maxE = 0, maxI = 0;
    wins.forEach(function (w, i) { if (w.e > maxE) { maxE = w.e; maxI = i; } });

    var flares = 0;
    for (var w = 1; w < wins.length; w++) {
      if (wins[w].e > wins[w - 1].e * 1.25) { cues.push({ t: wins[w].t, type: 'flare' }); flares++; }  // 에너지 급상승
      else if (wins[w].e < wins[w - 1].e * 0.6) cues.push({ t: wins[w].t, type: 'dim' });               // 급하강 = 암전
    }
    // 4마디마다 조명 색 전환
    for (var t2 = an.beatPhase + barLen * 4; t2 < total - 1; t2 += barLen * 4) cues.push({ t: t2, type: 'color' });
    // 최고 에너지 구간 = 조명 터지고 떼창
    if (wins.length) {
      if (!flares) cues.push({ t: wins[maxI].t, type: 'flare' });
      cues.push({ t: wins[maxI].t + 0.25, type: 'singalong' });
    }
    cues.sort(function (a, b) { return a.t - b.t; });
    return cues;
  }

  // ---------- 파형 그리기 ----------
  function drawWave(canvas, an) {
    var dpr = Math.min(window.devicePixelRatio, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var g = canvas.getContext('2d');
    g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
    var peaks = an.peaks, n = peaks.length, mid = h / 2;
    var grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#7ff0d4'); grad.addColorStop(0.5, '#4fc3a8'); grad.addColorStop(1, '#7ff0d4');
    g.fillStyle = grad;
    for (var x = 0; x < w; x++) {
      var v = peaks[Math.floor(x / w * n)] || 0;
      var barH = Math.max(1.2, v * h * 0.92);
      g.fillRect(x, mid - barH / 2, 1, barH);
    }
    // 연출 큐 마커
    var cueColor = { flare: '#ffb45f', color: '#8fb8ff', singalong: '#ff7fa8', dim: '#6b7280' };
    (an._cues || []).forEach(function (c) {
      var x2 = c.t / an.seconds * w;
      g.fillStyle = cueColor[c.type] || '#fff';
      g.globalAlpha = 0.9;
      g.fillRect(x2, 0, 1.5, 7); g.fillRect(x2, h - 7, 1.5, 7);
      g.globalAlpha = 1;
    });
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    if (s === 60) { m++; s = 0; }
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---------- 업로드 ----------
  function handleFile(file) {
    if (!file) return;
    if (!/audio|mp3|wav|m4a|ogg|flac/i.test(file.type + file.name)) {
      window.Guldari.toast('오디오 파일만 올릴 수 있어요 (mp3 · wav · m4a)'); return;
    }
    if (setlist.length >= MAX_SONGS) {
      window.Guldari.toast('셋리스트는 최대 ' + MAX_SONGS + '곡까지예요'); return;
    }
    show(el.analyzing); hide(el.songCard); hide(el.reviewResult);
    var name = file.name.replace(/\.[^.]+$/, '');
    file.arrayBuffer().then(function (ab) {
      return window.Guldari.decode(ab);
    }).then(function (buf) {
      acceptBuffer(name, buf);
    }).catch(function () {
      hide(el.analyzing);
      window.Guldari.toast('이 파일은 브라우저가 디코딩하지 못했어요. 다른 형식으로 시도해 주세요');
    });
  }

  function acceptBuffer(name, buf) {
    var an = analyze(buf);
    an._cues = makeCues(an);
    pending = { title: name, buffer: buf, an: an, cues: an._cues, bpm: an.bpm, seconds: an.seconds, gain: an.gain };
    hide(el.analyzing); show(el.songCard);
    el.songCard.classList.remove('approved');
    el.titleInput.value = name;
    el.metaBpm.textContent = an.bpm + ' BPM';
    el.metaLen.textContent = fmtTime(an.seconds);
    el.metaLoud.textContent = an.lufs + ' LUFS → -14 정규화';
    el.chkOwn.checked = false; el.chkThird.checked = false; el.aiUse.value = 'none';
    el.aiToolWrap.style.display = 'none';
    hide(el.reviewResult); el.reviewSteps.innerHTML = '';
    drawWave(el.waveCanvas, an);
    renderCuePreview(an._cues, an.seconds);
    updateReviewBtn();
    el.songCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderCuePreview(cues, dur) {
    var label = { flare: '조명 플레어', color: '조명 색 전환', singalong: '떼창 유도', dim: '암전' };
    var counts = {};
    cues.forEach(function (c) { counts[c.type] = (counts[c.type] || 0) + 1; });
    el.cuePreview.innerHTML = '<span class="cue-title">AI 초벌 연출 ' + cues.length + '개 생성</span>' +
      Object.keys(counts).map(function (k) {
        return '<span class="cue-chip cue-' + k + '">' + label[k] + ' ' + counts[k] + '</span>';
      }).join('');
  }

  // ---------- 검수 (시뮬레이션) ----------
  function updateReviewBtn() {
    el.reviewBtn.disabled = !(el.chkOwn.checked && el.chkThird.checked);
  }

  var REVIEW_STAGES = [
    { t: 900,  label: '오디오 트랜스코딩 (AAC 128k · HLS 세그먼트)', note: '라우드니스 -14 LUFS 정규화' },
    { t: 1500, label: '핑거프린트 대조 (상용 음원 1.5억 곡 DB)',      note: '일치 없음 — 기존 음원 복제 아님' },
    { t: 1200, label: '커버곡·라이브 변형 인식',                      note: '유사 진행 감지되지 않음' },
    { t: 1100, label: 'AI 생성곡 판별',                               note: null }
  ];

  function runReview() {
    el.reviewBtn.disabled = true;
    el.reviewSteps.innerHTML = '';
    hide(el.reviewResult);
    var aiMode = el.aiUse.value;
    var i = 0;
    function step() {
      if (i >= REVIEW_STAGES.length) return finish();
      var st = REVIEW_STAGES[i];
      var row = document.createElement('div');
      row.className = 'rv-row running';
      row.innerHTML = '<span class="rv-ico"></span><span class="rv-label">' + st.label + '</span><span class="rv-note"></span>';
      el.reviewSteps.appendChild(row);
      setTimeout(function () {
        row.classList.remove('running'); row.classList.add('done');
        var note = st.note;
        if (i === 3) note = aiMode === 'none' ? 'AI 생성 확률 낮음 — 라벨 없음'
                          : 'AI 관여 신고됨 — ‘AI 생성’ 라벨 부착';
        row.querySelector('.rv-note').textContent = note || '';
        i++; step();
      }, st.t);
    }
    step();
  }

  function finish() {
    var aiMode = el.aiUse.value;
    pending.title = (el.titleInput.value || pending.title).trim().slice(0, 40);
    pending.aiLabeled = aiMode !== 'none';
    pending.aiTool = el.aiTool.value.trim();
    pending.review = 'APPROVED';
    el.reviewResult.className = 'rv-result ok show';
    el.reviewResult.innerHTML =
      '<b>검수 통과 — 공개 공연 가능</b>' +
      '<p>‘' + pending.title + '’' + (pending.aiLabeled ? ' <span class="ai-badge">AI 생성</span>' : '') +
      ' 이(가) 셋리스트에 추가됐습니다. ' +
      (pending.aiLabeled ? 'AI 관여곡은 곡 정보에 라벨이 노출됩니다.' : '자작곡으로 등록됐습니다.') + '</p>' +
      '<div class="rv-actions"><button class="ghost" id="simFlagBtn">다른 결과 보기 — 유사곡 감지 시</button></div>';
    document.getElementById('simFlagBtn').addEventListener('click', simulateFlag);
    el.songCard.classList.add('approved'); // 폼은 접고 결과 카드는 남긴다
    addToSetlist(pending);
    pending = null;
  }

  function simulateFlag() {
    el.reviewResult.className = 'rv-result warn show';
    el.reviewResult.innerHTML =
      '<b>검수 대기 — 사람이 한 번 더 확인합니다</b>' +
      '<p>기존 음원과 유사한 구간이 감지됐습니다(신뢰도 62%). <b>반려가 아니라 대기</b>입니다 — ' +
      '자작곡 오탐을 막기 위해 48시간 내 담당자가 확인하고, 그 사이 비공개 리허설은 그대로 쓸 수 있어요.</p>' +
      '<div class="rv-actions"><button class="ghost">이의 신청하기</button><button class="ghost">제작 증빙 첨부</button></div>';
  }

  // ---------- 셋리스트 ----------
  function addToSetlist(song) {
    setlist.push(song);
    renderSetlist();
    show(el.setlistWrap);
    el.setlistWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderSetlist() {
    el.setlistItems.innerHTML = '';
    setlist.forEach(function (s, i) {
      var row = document.createElement('div');
      row.className = 'sl-row';
      row.innerHTML =
        '<span class="sl-no">' + (i + 1) + '</span>' +
        '<span class="sl-title">' + s.title + (s.aiLabeled ? ' <span class="ai-badge">AI</span>' : '') + '</span>' +
        '<span class="sl-meta">' + s.bpm + ' BPM · ' + fmtTime(s.seconds) + ' · 연출 ' + s.cues.length + '</span>' +
        '<span class="sl-ctl"><button data-a="up">↑</button><button data-a="down">↓</button><button data-a="del">✕</button></span>';
      row.querySelector('[data-a="up"]').addEventListener('click', function () { move(i, -1); });
      row.querySelector('[data-a="down"]').addEventListener('click', function () { move(i, 1); });
      row.querySelector('[data-a="del"]').addEventListener('click', function () { setlist.splice(i, 1); renderSetlist(); });
      el.setlistItems.appendChild(row);
    });
    var total = setlist.reduce(function (a, s) { return a + s.seconds; }, 0);
    el.setlistCount.textContent = setlist.length + ' / ' + MAX_SONGS + '곡';
    el.setlistCount.classList.toggle('full', setlist.length >= MAX_SONGS);
    el.setlistTime.textContent = '예상 공연 시간 ' + fmtTime(total + Math.max(0, setlist.length - 1) * 6);
    el.goStageBtn.disabled = setlist.length === 0;
    el.addMoreBtn.disabled = setlist.length >= MAX_SONGS;
    el.dropzone.classList.toggle('disabled', setlist.length >= MAX_SONGS);
  }

  function move(i, d) {
    var j = i + d;
    if (j < 0 || j >= setlist.length) return;
    var tmp = setlist[i]; setlist[i] = setlist[j]; setlist[j] = tmp;
    renderSetlist();
  }

  // ---------- 이벤트 ----------
  el.studioOpenBtn.addEventListener('click', function () {
    window.Guldari.ensureAudio();
    show(el.studio);
  });
  el.studioCloseBtn.addEventListener('click', function () { hide(el.studio); });

  el.dropzone.addEventListener('click', function () { el.fileInput.click(); });
  el.addMoreBtn.addEventListener('click', function () { el.fileInput.click(); });
  el.fileInput.addEventListener('change', function (e) { handleFile(e.target.files[0]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    el.dropzone.addEventListener(ev, function (e) { e.preventDefault(); el.dropzone.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    el.dropzone.addEventListener(ev, function (e) { e.preventDefault(); el.dropzone.classList.remove('over'); });
  });
  el.dropzone.addEventListener('drop', function (e) { handleFile(e.dataTransfer.files[0]); });

  el.demoBtn.addEventListener('click', function () {
    if (setlist.length >= MAX_SONGS) { window.Guldari.toast('셋리스트가 가득 찼어요'); return; }
    show(el.analyzing); hide(el.songCard);
    window.Guldari.renderDemoSong().then(function (buf) {
      acceptBuffer('유성우 (데모 곡)', buf);
    });
  });

  el.aiUse.addEventListener('change', function () {
    el.aiToolWrap.style.display = el.aiUse.value === 'none' ? 'none' : 'flex';
  });
  el.chkOwn.addEventListener('change', updateReviewBtn);
  el.chkThird.addEventListener('change', updateReviewBtn);
  el.reviewBtn.addEventListener('click', runReview);

  el.goStageBtn.addEventListener('click', function () {
    hide(el.studio);
    window.Guldari.begin(setlist.slice());
  });

  window.addEventListener('resize', function () {
    if (pending && el.songCard.classList.contains('show')) drawWave(el.waveCanvas, pending.an);
  });
})();
