/* 굴다리(Guldari) — 소형 무대 프로토타입
 * 웹 3D 목업: 굴다리 아래 첫 공연. Three.js(r147 UMD) + Web Audio 단일 파일 데모.
 * 데모 범위: 터널 리버브, 저음 반응 조명/카메라, 관중 봉·폰 플래시, 동전 던지기(포물선 물리),
 *           행인 NPC(흥분도 비례 멈춤→관객 전환), 앙코르 게이지, 별점→SP 리워드 루프.
 */
(function () {
  'use strict';

  // ---------- 상태 ----------
  var state = {
    phase: 'entry', // entry | live | rating | encore | end
    sp: 120,
    audience: 9,
    gauge: 0,          // 앙코르 게이지 0~100
    excitement: 0.15,  // 행인 멈춤 확률에 반영
    flashOn: false,
    coins: 0,
    stars: 0,
    reverbOn: true,
    fast: /[?&]fast=1/.test(location.search)
  };

  var ui = {};
  ['entryOverlay','enterBtn','hud','toastWrap','gaugeFill','gaugeWrap','spVal','audVal',
   'clapBtn','flashBtn','coinBtn','reverbBtn','ratingPanel','endOverlay','endStats','againBtn',
   'songTitle','phaseLabel','songProgress','songIndex','artistName','endNext'].forEach(function (id) { ui[id] = document.getElementById(id); });

  function toast(msg, ms) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    ui.toastWrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 400);
    }, ms || 2600);
  }
  function setSp(v) { state.sp = v; ui.spVal.textContent = v; }
  function setAud(v) { state.audience = v; ui.audVal.textContent = v; }
  function addGauge(v) {
    state.gauge = Math.max(0, Math.min(100, state.gauge + v));
    ui.gaugeFill.style.width = state.gauge + '%';
    if (state.gauge >= 100 && !state.gaugeFullToasted) {
      state.gaugeFullToasted = true;
      toast('앙코르 게이지 100%! 숨겨둔 곡이 해금됩니다 ✨');
    }
  }

  // ---------- THREE 기본 ----------
  var W = window.innerWidth, H = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72;
  renderer.shadowMap.enabled = false;
  document.getElementById('scene').appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a14);
  scene.fog = new THREE.Fog(0x060a14, 18, 46);

  var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 120);
  var camBase = new THREE.Vector3(2.1, 2.25, 4.3); // 굴다리 내부, 관중 머리 너머로 무대를 봄
  var camTarget = new THREE.Vector3(-0.1, 1.05, -3.4);
  camera.position.copy(camBase);
  camera.lookAt(camTarget);

  window.addEventListener('resize', function () {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });

  // 드래그로 시점 살짝 회전
  var drag = { on: false, x: 0, y: 0, yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
  renderer.domElement.addEventListener('pointerdown', function (e) { drag.on = true; drag.x = e.clientX; drag.y = e.clientY; });
  window.addEventListener('pointerup', function () { drag.on = false; });
  window.addEventListener('pointermove', function (e) {
    if (!drag.on) return;
    drag.tyaw = Math.max(-0.5, Math.min(0.5, drag.tyaw + (e.clientX - drag.x) * 0.002));
    drag.tpitch = Math.max(-0.25, Math.min(0.25, drag.tpitch + (e.clientY - drag.y) * 0.0015));
    drag.x = e.clientX; drag.y = e.clientY;
  });

  // ---------- 재질 ----------
  var M = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x383d47, roughness: 0.95 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x272b33, roughness: 0.97 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x191c22, roughness: 0.92 }),
    puddle: new THREE.MeshPhongMaterial({ color: 0x0b1220, shininess: 220, specular: 0x99bbff }),
    stage: new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x888c94, roughness: 0.35, metalness: 0.7 }),
    amp: new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.7 }),
    case_: new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 }),
    caseIn: new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.9 }),
    coin: new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.3, metalness: 0.8, emissive: 0x442c00 })
  };

  // ---------- 굴다리 구조 ----------
  var world = new THREE.Group();
  scene.add(world);

  // 바닥(아스팔트) + 물웅덩이
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 24), M.asphalt);
  ground.rotation.x = -Math.PI / 2;
  world.add(ground);
  var puddle = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), M.puddle);
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(-2.6, 0.01, 2.2); puddle.scale.set(1.5, 1, 1);
  world.add(puddle);

  // 터널: 측벽 2 + 반원 천장 (축 = X)
  var wallGeo = new THREE.BoxGeometry(30, 3.2, 0.6);
  var wallBack = new THREE.Mesh(wallGeo, M.concrete); wallBack.position.set(0, 1.6, -5.2); world.add(wallBack);
  var wallFront = new THREE.Mesh(wallGeo, M.concrete); wallFront.position.set(0, 1.6, 5.2); world.add(wallFront);
  var arch = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 30, 28, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x2e333d, roughness: 0.95, side: THREE.BackSide })
  );
  arch.rotation.z = Math.PI / 2;      // 축을 X로, 반원 쉘이 위(천장)를 덮음
  arch.position.y = 3.2;
  world.add(arch);
  // 터널 끝 외벽(개구부 실루엣)
  [-15, 15].forEach(function (x) {
    var face = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 26), M.concreteDark);
    face.position.set(x, 5, 0); world.add(face);
    var beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 12), M.concreteDark);
    beam.position.set(x, 8.6, 0); world.add(beam);
  });

  // 도시 불빛(터널 밖 원경) + 달
  function cityLights(xSign) {
    var g = new THREE.Group();
    for (var i = 0; i < 26; i++) {
      var c = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.28),
        new THREE.MeshBasicMaterial({ color: Math.random() < 0.6 ? 0xffc873 : 0x7fb4ff, transparent: true, opacity: 0.5 + Math.random() * 0.5 })
      );
      c.position.set(xSign * (24 + Math.random() * 16), 0.4 + Math.random() * 5.5, -9 + Math.random() * 18);
      c.rotation.y = -xSign * Math.PI / 2;
      g.add(c);
    }
    return g;
  }
  world.add(cityLights(1)); world.add(cityLights(-1));
  var moon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xf5f0dc }));
  moon.position.set(34, 12, -6); world.add(moon);

  // 벽 그래피티/포스터 (캔버스 텍스처)
  function textPlane(text, sub, w, h, color, glow) {
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    var cx = cv.getContext('2d');
    cx.clearRect(0, 0, 512, 256);
    if (glow) { cx.shadowColor = color; cx.shadowBlur = 14; }
    cx.fillStyle = color; cx.font = 'bold 96px sans-serif'; cx.textAlign = 'center';
    cx.fillText(text, 256, 128);
    if (sub) { cx.font = '32px sans-serif'; cx.fillStyle = 'rgba(255,255,255,0.75)'; cx.fillText(sub, 256, 190); }
    var tex = new THREE.CanvasTexture(cv);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }));
    return m;
  }
  var neon = textPlane('굴다리', 'GULDARI · 오늘 밤의 무대', 3.4, 1.7, '#57d8b8', true);
  neon.material.opacity = 0.8;
  neon.position.set(0, 3.05, -4.85); world.add(neon);
  var poster = textPlane('첫 공연', '미도 MIDO', 1.5, 0.75, '#e8d9b0', false);
  poster.position.set(-4.4, 1.5, -4.88); poster.rotation.z = 0.06; world.add(poster);

  // ---------- 조명 ----------
  scene.add(new THREE.AmbientLight(0x1c2840, 0.4)); // 밤의 푸른 잔광
  var lamp = new THREE.PointLight(0xff9a3d, 1.2, 11, 1.4); // 나트륨등 — 좁은 웅덩이빛
  lamp.position.set(0, 4.0, 0.6); scene.add(lamp);
  [-12, 12].forEach(function (x) { // 터널 끝에서 새어드는 푸른 밤빛
    var l = new THREE.PointLight(0x33508f, 0.32, 14, 1.4);
    l.position.set(x, 2.6, 0); scene.add(l);
  });
  var lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffc98a }));
  lampBulb.position.copy(lamp.position); scene.add(lampBulb);
  var lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1), M.metal);
  lampArm.position.set(0, 4.6, 0.6); scene.add(lampArm);
  var stageLight = new THREE.PointLight(0xffe0b0, 0.85, 9, 2); // 무대 스트링 라이트 광원
  stageLight.position.set(0, 2.4, -3.2); scene.add(stageLight);
  var lampGlow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffa14f, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
  lampGlow.rotation.x = -Math.PI / 2; lampGlow.position.set(0, 0.02, 0.6); world.add(lampGlow);

  // ---------- 무대 ----------
  var stageG = new THREE.Group(); world.add(stageG);
  var platform = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 2.2), M.stage);
  platform.position.set(0, 0.09, -3.5); stageG.add(platform);
  var amp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.45), M.amp);
  amp.position.set(-1.35, 0.48, -3.9); stageG.add(amp);
  var spk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.38), M.amp);
  spk.position.set(1.45, 0.53, -3.9); stageG.add(spk);
  var micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.35), M.metal);
  micPole.position.set(0.42, 0.85, -2.85); stageG.add(micPole);
  var micHead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshStandardMaterial({ color: 0x333, roughness: 0.5 }));
  micHead.position.set(0.42, 1.55, -2.85); stageG.add(micHead);
  // 스트링 라이트 (뒷벽 캐터너리 2줄)
  var stringBulbs = [];
  for (var s = 0; s < 2; s++) {
    for (var i = 0; i <= 12; i++) {
      var t = i / 12;
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffbe66, transparent: true, opacity: 0.95 }));
      b.position.set(-2.2 + 4.4 * t, (s ? 2.1 : 2.5) - Math.sin(Math.PI * t) * 0.35, -4.7 + s * 0.25);
      stageG.add(b); stringBulbs.push(b);
    }
  }
  // 기타 케이스 (동전 받는 곳)
  var gcase = new THREE.Group();
  var caseBottom = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.45), M.case_);
  var caseIn = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.36), M.caseIn);
  caseIn.position.y = 0.06;
  var caseLid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.45), M.case_);
  caseLid.position.set(0, 0.22, -0.28); caseLid.rotation.x = -1.15;
  gcase.add(caseBottom); gcase.add(caseIn); gcase.add(caseLid);
  gcase.position.set(0.9, 0.06, -2.25); gcase.rotation.y = 0.3;
  world.add(gcase);
  var CASE_POS = new THREE.Vector3(0.9, 0.15, -2.25);

  // ---------- 사람 (아티스트/관중/행인) ----------
  function makePerson(color, scale) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 10),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.85 }));
    body.position.y = 0.62;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8c9a8, roughness: 0.8 }));
    head.position.y = 1.12;
    g.add(body); g.add(head);
    g.userData.head = head;
    g.scale.setScalar(scale || 1);
    return g;
  }

  // 아티스트 '미도'
  var artist = makePerson(0x2f4f6f, 1.06);
  artist.position.set(-0.1, 0.18, -3.2);
  var woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6532, roughness: 0.55 });
  var gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.06, 18), woodMat);
  gBody.rotation.x = Math.PI / 2; gBody.position.set(0.06, 0.58, 0.22);
  var gNeck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.04), woodMat);
  gNeck.position.set(-0.18, 0.84, 0.22); gNeck.rotation.z = 0.9;
  artist.add(gBody); artist.add(gNeck);
  var strumArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f4f6f, roughness: 0.85 }));
  strumArm.position.set(0.24, 0.78, 0.18); strumArm.rotation.z = -0.9;
  artist.add(strumArm);
  world.add(artist);

  // 글로우 스프라이트 텍스처 (라디얼 그라디언트)
  var glowTex = (function () {
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    var cx = cv.getContext('2d');
    var g = cx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,246,216,1)');
    g.addColorStop(0.35, 'rgba(255,236,190,0.45)');
    g.addColorStop(1, 'rgba(255,230,170,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();

  // 관중
  var crowd = [];
  var crowdColors = [0x6b4f8f, 0x8f6b4f, 0x4f8f6b, 0x8f4f5f, 0x557, 0x775, 0x577, 0x955c44, 0x5c7f99];
  var bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 0.4), M.stage);
  bench.position.set(-2.4, 0.16, 0.6); bench.rotation.y = 0.35; world.add(bench);
  function addAudience(pos, sitting, color) {
    var p = makePerson(color || crowdColors[crowd.length % crowdColors.length], 0.96 + Math.random() * 0.1);
    p.position.copy(pos);
    p.lookAt(new THREE.Vector3(0, pos.y, -3.3)); // 같은 높이를 봐서 기울지 않게
    p.rotation.y += (Math.random() - 0.5) * 0.2;
    if (sitting) { p.scale.y *= 0.72; p.userData.sitting = true; }
    // 폰 플래시 스프라이트
    var fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6d8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.scale.setScalar(0.5); fl.position.set(0.16, 1.35, 0.1);
    p.add(fl); p.userData.flash = fl;
    p.userData.phase = Math.random() * Math.PI * 2;
    world.add(p); crowd.push(p);
    return p;
  }
  addAudience(new THREE.Vector3(-0.9, 0, -0.6));
  addAudience(new THREE.Vector3(0.3, 0, -0.2));
  addAudience(new THREE.Vector3(1.3, 0, -0.7));
  addAudience(new THREE.Vector3(-1.9, 0, 0.4));
  addAudience(new THREE.Vector3(-1.3, 0, 1.4));
  addAudience(new THREE.Vector3(-0.3, 0, 1.1), true);   // 바닥에 앉음
  addAudience(new THREE.Vector3(2.2, 0, 0.6), true);
  addAudience(new THREE.Vector3(-2.35, 0.32, 0.62), true); // 벤치
  addAudience(new THREE.Vector3(-2.85, 0.32, 0.9), true);

  // 멀티플레이 배정용 예비 슬롯(기본은 NPC처럼 서 있다가, 실제 플레이어가 입장하면 그 사람이 됨)
  var MP_SLOTS = 6;
  var mpSlotCrowdIndex = [];
  var mpSlotPositions = [
    new THREE.Vector3(-3.4, 0, 1.9), new THREE.Vector3(3.1, 0, 1.3),
    new THREE.Vector3(1.9, 0, 1.9), new THREE.Vector3(-1.7, 0, 2.1),
    new THREE.Vector3(3.0, 0, 2.1), new THREE.Vector3(-3.3, 0, 0.6)
  ];
  for (var mi = 0; mi < MP_SLOTS; mi++) {
    var mp = addAudience(mpSlotPositions[mi], false, 0x596879);
    mp.userData.isMpSlot = true; mp.userData.mpTaken = false;
    mpSlotCrowdIndex.push(crowd.length - 1);
  }

  // 닉네임 스프라이트 (항상 카메라를 향함)
  function nameSprite(text, mine) {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    var cx = cv.getContext('2d');
    cx.font = 'bold 30px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = 'rgba(6,10,18,0.55)';
    var w = Math.min(240, cx.measureText(text).width + 28);
    cx.beginPath(); cx.roundRect ? cx.roundRect(128 - w / 2, 14, w, 36, 18) : cx.rect(128 - w / 2, 14, w, 36);
    cx.fill();
    cx.fillStyle = mine ? '#7ff0d4' : '#eef2f8';
    cx.fillText(text, 128, 33);
    var tex = new THREE.CanvasTexture(cv);
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(0.9, 0.225, 1);
    return spr;
  }

  // ---------- 멀티플레이 바인딩: 서버 슬롯(0~5) ↔ 로컬 관중 아바타 ----------
  function bindRemoteToSlot(slot, name, isMine) {
    var idx = mpSlotCrowdIndex[slot];
    if (idx === undefined) return null;
    var p = crowd[idx];
    p.userData.mpTaken = true; p.userData.remoteBound = true; p.userData.mpFlashOn = false; p.userData.isMine = isMine;
    if (p.userData.tag) { p.remove(p.userData.tag); }
    var tag = nameSprite(isMine ? name + ' (나)' : name, isMine);
    tag.position.set(0, 1.62, 0);
    p.add(tag); p.userData.tag = tag;
    p.userData.jump = 0.5; // 입장 리액션
    return { crowdIndex: idx };
  }
  function unbindSlot(slot) {
    var idx = mpSlotCrowdIndex[slot];
    if (idx === undefined) return;
    var p = crowd[idx];
    p.userData.mpTaken = false; p.userData.remoteBound = false; p.userData.mpFlashOn = false;
    if (p.userData.tag) { p.remove(p.userData.tag); p.userData.tag = null; }
  }
  function setSlotFlash(slot, on) {
    var idx = mpSlotCrowdIndex[slot];
    if (idx === undefined) return;
    crowd[idx].userData.mpFlashOn = !!on;
  }
  function renameSlot(slot, name) {
    var idx = mpSlotCrowdIndex[slot];
    if (idx === undefined) return;
    var p = crowd[idx];
    if (p.userData.tag) { p.remove(p.userData.tag); }
    var tag = nameSprite(p.userData.isMine ? name + ' (나)' : name, p.userData.isMine);
    tag.position.set(0, 1.62, 0);
    p.add(tag); p.userData.tag = tag;
  }
  function remoteCoinDrop() {
    var donors = crowd.filter(function (p) { return p.userData.remoteBound; });
    var from = donors.length ? donors[Math.floor(Math.random() * donors.length)].position : new THREE.Vector3(-2, 1.5, 2);
    var c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14), M.coin);
    c.position.set(from.x, 1.3, from.z);
    var target = CASE_POS.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.2));
    var T = 0.8;
    var vel = target.clone().sub(c.position).multiplyScalar(1 / T);
    vel.y = (target.y - c.position.y) / T + 0.5 * 9.8 * T;
    c.userData = { vel: vel, t: 0, spin: 8 + Math.random() * 6 };
    world.add(c); coins.push(c);
    coinSfx();
  }
  function setGaugeFromServer(v) { state.gauge = Math.max(0, Math.min(100, v)); ui.gaugeFill.style.width = state.gauge + '%'; }

  // 행인 NPC
  var passerby = { g: makePerson(0x777d88, 1.0), state: 'idle', t: 0, dir: 1, stopX: 0 };
  passerby.g.visible = false; world.add(passerby.g);
  function spawnPasserby() {
    if (state.phase !== 'live' && state.phase !== 'encore') return;
    passerby.dir = Math.random() < 0.5 ? 1 : -1;
    passerby.g.position.set(-16 * passerby.dir, 0, 3.9);
    passerby.g.rotation.y = passerby.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    passerby.g.visible = true;
    passerby.state = 'walk';
    passerby.stopX = (Math.random() * 6 - 3);
    passerby.stopped = false;
  }
  setInterval(function () { if (!passerby.g.visible) spawnPasserby(); }, state.fast ? 4000 : 9000);

  // 동전들
  var coins = [];
  function tossCoin() {
    var c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14), M.coin);
    var from = camera.position.clone().add(new THREE.Vector3(0.15, -0.25, -0.4).applyQuaternion(camera.quaternion));
    c.position.copy(from);
    var target = CASE_POS.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.2));
    var T = 0.9; // 비행 시간
    var vel = target.clone().sub(from).multiplyScalar(1 / T);
    vel.y = (target.y - from.y) / T + 0.5 * 9.8 * T;
    c.userData = { vel: vel, t: 0, spin: 8 + Math.random() * 6 };
    world.add(c); coins.push(c);
  }

  // ---------- Web Audio ----------
  var A = { ctx: null, master: null, musicBus: null, dry: null, wet: null, conv: null, analyser: null, fft: null, playing: false };

  function makeImpulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        // 초기 반사(플러터) + 지수 감쇠 — 콘크리트 터널 근사
        var t = i / rate;
        var flutter = (i % Math.floor(rate * 0.055) < 30) ? 0.5 : 1;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * flutter;
      }
    }
    return buf;
  }

  function initAudio() {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    A.ctx = ctx;
    A.master = ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(ctx.destination);
    A.musicBus = ctx.createGain();
    A.dry = ctx.createGain(); A.dry.gain.value = 0.75;
    A.wet = ctx.createGain(); A.wet.gain.value = 0.42; // 굴다리 리버브 ON 기본
    A.conv = ctx.createConvolver(); A.conv.buffer = makeImpulse(ctx, 1.9, 2.6);
    A.musicBus.connect(A.dry); A.dry.connect(A.master);
    A.musicBus.connect(A.conv); A.conv.connect(A.wet); A.wet.connect(A.master);
    A.analyser = ctx.createAnalyser(); A.analyser.fftSize = 256;
    A.musicBus.connect(A.analyser);
    A.fft = new Uint8Array(A.analyser.frequencyBinCount);
  }
  function setReverb(on) {
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    A.wet.gain.linearRampToValueAtTime(on ? 0.42 : 0.05, t + 0.4);
    A.dry.gain.linearRampToValueAtTime(on ? 0.75 : 0.95, t + 0.4);
  }

  var NOTE = {};
  (function () {
    var names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    for (var oct = 1; oct <= 6; oct++) for (var i = 0; i < 12; i++)
      NOTE[names[i] + oct] = 440 * Math.pow(2, (oct * 12 + i - 57) / 12);
  })();

  // 로파이 진행: Fmaj7 → Am7 → Dm7 → G7(sus 느낌)
  var CHORDS = [
    ['F2', 'A3', 'C4', 'E4'],
    ['A2', 'G3', 'C4', 'E4'],
    ['D2', 'F3', 'A3', 'C4'],
    ['G2', 'F3', 'B3', 'D4']
  ];
  var MELODY = [ // (바, 박, 노트, 길이박)
    [0, 0.0, 'A4', 1.2], [0, 2.0, 'C5', 0.8], [0, 3.0, 'E5', 1.0],
    [1, 0.5, 'E5', 0.7], [1, 1.5, 'C5', 0.7], [1, 2.5, 'A4', 1.3],
    [2, 0.0, 'F4', 1.0], [2, 2.0, 'A4', 0.8], [2, 3.0, 'C5', 0.9],
    [3, 0.5, 'D5', 0.9], [3, 2.0, 'B4', 0.8], [3, 3.0, 'G4', 1.0]
  ];

  var song = { bpm: 74, bars: 0, totalBars: 12, startTime: 0, nextBar: 0, timer: null, running: false };

  // 오프라인 렌더링용 컨텍스트 스왑 (데모 곡을 AudioBuffer로 굽는 데 사용)
  var RC = null;
  function actx() { return RC ? RC.ctx : A.ctx; }
  function adest() { return RC ? RC.dest : A.musicBus; }

  function scheduleBar(barIdx, when, bpmOverride) {
    var ctx = actx(), spb = 60 / (bpmOverride || song.bpm); // sec per beat
    var chord = CHORDS[barIdx % 4];
    // 패드
    chord.forEach(function (n, i) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = NOTE[n];
      f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.09 : 0.045, when + 0.3);
      g.gain.setTargetAtTime(0.0001, when + spb * 3.4, 0.25);
      o.connect(f); f.connect(g); g.connect(adest());
      o.start(when); o.stop(when + spb * 4 + 1);
    });
    // 킥 (1,3박) + 해트(8분) + 스네어(2,4박)
    for (var b = 0; b < 4; b++) {
      var t = when + b * spb;
      if (b % 2 === 0) { // kick
        var ko = ctx.createOscillator(), kg = ctx.createGain();
        ko.frequency.setValueAtTime(120, t); ko.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        kg.gain.setValueAtTime(0.5, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        ko.connect(kg); kg.connect(adest()); ko.start(t); ko.stop(t + 0.3);
      } else { // snare-ish
        noiseBurst(t, 0.09, 1800, 0.10);
      }
      noiseBurst(t + spb / 2, 0.03, 7000, 0.035); // hat
    }
    // 멜로디(플럭)
    MELODY.forEach(function (m) {
      if (m[0] !== barIdx % 4) return;
      if (barIdx < 1) return; // 인트로 1마디는 패드만
      var t = when + m[1] * spb;
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = NOTE[m[2]];
      f.type = 'lowpass'; f.frequency.value = 2400;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.setTargetAtTime(0.0001, t + m[3] * spb * 0.6, 0.09);
      o.connect(f); f.connect(g); g.connect(adest());
      o.start(t); o.stop(t + m[3] * spb + 0.5);
    });
  }

  function noiseBurst(t, dur, freq, vol, dest) {
    var ctx = actx();
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    var g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest || adest());
    src.start(t);
  }

  function clapSfx(n) {
    if (!A.ctx) return;
    var t0 = A.ctx.currentTime;
    for (var i = 0; i < (n || 3); i++)
      noiseBurst(t0 + i * (0.09 + Math.random() * 0.05), 0.05, 1200 + Math.random() * 800, 0.12, A.master);
  }
  function applause(dur) {
    if (!A.ctx) return;
    var t0 = A.ctx.currentTime;
    for (var i = 0; i < 60; i++)
      noiseBurst(t0 + Math.random() * (dur || 2.4), 0.05, 900 + Math.random() * 1600, 0.05, A.conv);
  }
  function coinSfx() {
    if (!A.ctx) return;
    var ctx = A.ctx, t = ctx.currentTime;
    [5200, 7600].forEach(function (f, i) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * (1 + i * 0.003);
      g.gain.setValueAtTime(0.12, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 + 0.35);
      o.connect(g); g.connect(A.conv);
      o.start(t + 0.9); o.stop(t + 1.4);
    });
  }

  function startSong(bpm, totalBars, onEnd) {
    song.bpm = bpm; song.totalBars = state.fast ? Math.min(4, totalBars) : totalBars;
    song.running = true;
    var spb = 60 / bpm, barLen = spb * 4;
    song.startTime = A.ctx.currentTime + 0.15;
    song.nextBar = 0;
    song.timer = setInterval(function () {
      if (!song.running) return;
      var now = A.ctx.currentTime;
      while (song.nextBar < song.totalBars && song.startTime + song.nextBar * barLen < now + 0.35) {
        scheduleBar(song.nextBar, song.startTime + song.nextBar * barLen);
        song.nextBar++;
      }
      if (song.nextBar >= song.totalBars && now > song.startTime + song.totalBars * barLen) {
        clearInterval(song.timer); song.running = false;
        onEnd && onEnd();
      }
    }, 40);
  }

  // 데모 곡을 AudioBuffer로 오프라인 렌더 (스튜디오 '데모 곡으로 체험'용)
  function renderDemoSong() {
    initAudio();
    var bpm = 74, bars = 12, spb = 60 / bpm, barLen = spb * 4;
    var dur = bars * barLen + 1.5, sr = 44100;
    var oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(sr * dur), sr);
    var dest = oc.createGain(); dest.gain.value = 0.9; dest.connect(oc.destination);
    RC = { ctx: oc, dest: dest };
    for (var b = 0; b < bars; b++) scheduleBar(b, 0.05 + b * barLen, bpm);
    RC = null;
    return oc.startRendering();
  }

  // ---------- 업로드 곡 재생 ----------
  var live = { list: null, idx: 0, src: null, cues: [], cueIdx: 0, t0: 0, dur: 0, stopping: false };
  var fx = { flare: 0, color: 0, hue: 0 };

  function fireCue(c) {
    if (c.type === 'flare') { fx.flare = 1; }
    else if (c.type === 'color') { fx.hue = (fx.hue + 0.28) % 1; fx.color = 1; }
    else if (c.type === 'dim') { fx.flare = -0.6; }
    else if (c.type === 'singalong') {
      toast('🎤 떼창 구간 — 관중이 따라 부릅니다');
      crowd.forEach(function (p) { p.userData.jump = 0.6; });
      addGauge(10);
    }
  }

  function playSongAt(i) {
    var s = live.list[i];
    live.idx = i;
    ui.songTitle.innerHTML = '‘' + s.title + '’ ' +
      (s.aiLabeled ? '<span style="color:#8fb8ff">· AI 생성</span>' : '<span style="opacity:.7">· 자작곡</span>');
    ui.songIndex.textContent = (i + 1) + ' / ' + live.list.length + '곡';
    var src = A.ctx.createBufferSource();
    src.buffer = s.buffer;
    var g = A.ctx.createGain(); g.gain.value = s.gain || 1;
    src.connect(g); g.connect(A.musicBus);
    live.src = src; live.cues = s.cues || []; live.cueIdx = 0;
    live.t0 = A.ctx.currentTime; live.dur = s.buffer.duration;
    src.onended = function () { if (!live.stopping) nextSong(); };
    src.start();
  }

  function nextSong() {
    live.src = null;
    if (live.idx + 1 < live.list.length) {
      applause(1.4);
      var ments = ['다음 곡도 제가 만든 거예요', '와 주셔서 고맙습니다. 다음 곡 갈게요',
                   '이 노래는 새벽에 썼어요', '조금만 더 들어주실래요?'];
      toast('🎙 미도: “' + ments[live.idx % ments.length] + '”');
      setTimeout(function () { playSongAt(live.idx + 1); }, 3200);
    } else {
      songEnded();
    }
  }

  // ---------- 공연 흐름 ----------
  function enter() { begin(null); }

  function begin(list) {
    ui.entryOverlay.classList.add('hide');
    ui.hud.classList.add('show');
    initAudio();
    state.phase = 'live';
    ui.phaseLabel.textContent = 'LIVE';
    if (window.GuldariMultiplayer) {
      var nickEl = document.getElementById('mpNick');
      window.GuldariMultiplayer.connect(nickEl && nickEl.value);
    }
    if (list && list.length) {
      live.list = list; live.stopping = false; state.songCount = list.length;
      state.ownStage = true;
      ui.artistName.innerHTML = '나의 첫 무대 <span style="font-weight:400;color:#8aa">MY DEBUT</span>';
      toast('당신의 셋리스트 ' + list.length + '곡, 굴다리 무대에 오릅니다');
      setTimeout(function () { toast('굴다리 터널 리버브를 통과한 당신의 곡입니다 — 우측 하단에서 껐다 켜보세요'); }, 4200);
      setTimeout(function () { playSongAt(0); }, 1200);
    } else {
      ui.songIndex.textContent = '1 / 1곡';
      toast('미도(MIDO)의 첫 공연이 시작됩니다 — 자작곡 ‘유성우’');
      setTimeout(function () { toast('굴다리 아래에선 노래가 두 배 좋게 들려요 (터널 리버브 ON)'); }, 3600);
      startSong(74, 12, songEnded);
    }
  }

  function songEnded() {
    state.phase = 'rating';
    ui.phaseLabel.textContent = '공연 종료';
    applause(2.8);
    toast('공연이 끝났습니다 — 오늘 무대는 어땠나요?');
    setTimeout(function () { ui.ratingPanel.classList.add('show'); }, 900);
  }

  function submitStars(n) {
    state.stars = n;
    ui.ratingPanel.classList.remove('show');
    setSp(state.sp + 30);
    toast('관람 리워드 +20 SP · 평가 리워드 +10 SP (별점 값과 무관하게 지급)');
    if (state.gauge >= 60) {
      setTimeout(function () {
        state.phase = 'encore';
        ui.phaseLabel.textContent = 'ENCORE';
        if (live.list && live.list.length) {
          // 셋리스트 첫 곡을 앙코르로 재연 (숨겨둔 곡 자리)
          toast('앙코르! 다시 한 번 ‘' + live.list[0].title + '’ 🎶');
          live.list = [live.list[0]];
          playSongAt(0);
          live.encore = true;
          live.src.onended = function () { if (!live.stopping) showEnd(); };
        } else {
          ui.songTitle.textContent = '‘새벽 산책’ — 숨겨둔 앙코르 곡';
          toast('앙코르! 숨겨둔 곡 ‘새벽 산책’ 🎶');
          startSong(84, 8, showEnd);
        }
      }, 1400);
    } else {
      setTimeout(showEnd, 1600);
    }
  }

  function showEnd() {
    state.phase = 'end';
    live.stopping = true;
    applause(2.2);
    var n = state.songCount || 1;
    if (state.ownStage) {
      ui.endNext.innerHTML = '오늘 당신의 곡이 <b>처음으로 관객 앞에서 울렸습니다</b><br>' +
        '다음 목표 — <b>동네 스팟 · 옥상 루프탑 (800 SP)</b>, 관객 50명의 무대';
    }
    ui.endStats.innerHTML =
      '<div class="stat"><b>' + state.audience + '명</b><span>오늘의 관객</span></div>' +
      '<div class="stat"><b>' + state.coins + '닢</b><span>받은 동전</span></div>' +
      '<div class="stat"><b>' + (state.stars || '-') + '점</b><span>내가 준 별점</span></div>' +
      '<div class="stat"><b>+' + n + '곡</b><span>이번 주 처음으로<br>관객을 만난 곡</span></div>';
    ui.endOverlay.classList.add('show');
  }

  // ---------- UI 이벤트 ----------
  ui.enterBtn.addEventListener('click', enter);
  ui.againBtn.addEventListener('click', function () { location.reload(); });
  ui.clapBtn.addEventListener('click', function () {
    clapSfx(3); addGauge(4); state.excitement = Math.min(1, state.excitement + 0.05);
    crowd.forEach(function (p) { p.userData.jump = 0.6; });
    if (window.GuldariMultiplayer) window.GuldariMultiplayer.sendClap();
  });
  ui.flashBtn.addEventListener('click', function () {
    state.flashOn = !state.flashOn;
    ui.flashBtn.classList.toggle('on', state.flashOn);
    if (state.flashOn) { addGauge(10); state.excitement = Math.min(1, state.excitement + 0.08); toast('폰 플래시 물결 🔦'); }
    if (window.GuldariMultiplayer) window.GuldariMultiplayer.sendFlash(state.flashOn);
  });
  ui.coinBtn.addEventListener('click', function () {
    if (state.sp < 5) { toast('SP가 부족합니다'); return; }
    setSp(state.sp - 5); state.coins++;
    tossCoin(); coinSfx(); addGauge(8);
    state.excitement = Math.min(1, state.excitement + 0.07);
    if (window.GuldariMultiplayer) window.GuldariMultiplayer.sendCoin();
  });
  ui.reverbBtn.addEventListener('click', function () {
    state.reverbOn = !state.reverbOn;
    ui.reverbBtn.classList.toggle('on', state.reverbOn);
    ui.reverbBtn.textContent = state.reverbOn ? '🌉 터널 리버브 ON' : '🌉 터널 리버브 OFF';
    setReverb(state.reverbOn);
    toast(state.reverbOn ? '굴다리의 울림이 돌아왔습니다' : '리버브를 끄면 이렇게 건조합니다 — 공간이 사라진 소리');
  });
  Array.prototype.forEach.call(document.querySelectorAll('#ratingPanel .star'), function (btn) {
    btn.addEventListener('mouseenter', function () {
      var v = +btn.dataset.v;
      Array.prototype.forEach.call(document.querySelectorAll('#ratingPanel .star'), function (b) {
        b.classList.toggle('lit', +b.dataset.v <= v);
      });
    });
    btn.addEventListener('click', function () { submitStars(+btn.dataset.v); });
  });

  // ---------- 루프 ----------
  var clock = new THREE.Clock();
  var bass = 0, shake = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    // 오디오 분석 → 저음 에너지
    if (A.analyser) {
      A.analyser.getByteFrequencyData(A.fft);
      var sum = 0; for (var i = 1; i < 7; i++) sum += A.fft[i];
      bass += ((sum / 6 / 255) - bass) * 0.25;
    } else bass *= 0.95;

    // 연출 큐 진행 (업로드 곡의 자동 생성 시퀀스)
    if (live.src && A.ctx) {
      var pt = A.ctx.currentTime - live.t0;
      while (live.cueIdx < live.cues.length && live.cues[live.cueIdx].t <= pt) {
        fireCue(live.cues[live.cueIdx]); live.cueIdx++;
      }
      if (ui.songProgress) ui.songProgress.style.width = Math.min(100, pt / live.dur * 100) + '%';
    }
    fx.flare += (0 - fx.flare) * dt * 1.6;
    fx.color += (0 - fx.color) * dt * 2.2;

    // 나트륨등: 미세 플리커 + 저음 펄스 + 연출 플레어
    lamp.intensity = 1.15 + Math.sin(t * 31) * 0.03 + Math.sin(t * 7.3) * 0.02 + bass * 0.55 + fx.flare * 1.6;
    stageLight.intensity = 0.75 + bass * 0.8 + fx.flare * 1.2;
    stageLight.color.setHSL((0.09 + fx.hue) % 1, 0.55, 0.62);
    lampGlow.material.opacity = 0.09 + bass * 0.08 + Math.max(0, fx.flare) * 0.12;
    neon.material.opacity = 0.85 + Math.sin(t * 2.2) * 0.08 + bass * 0.2;
    stringBulbs.forEach(function (b, i) {
      var tw = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7);
      if (fx.color > 0.05) b.material.color.setHSL((fx.hue + i * 0.012) % 1, 0.6, 0.65);
      b.material.opacity = state.phase === 'encore' ? (Math.sin(t * 8 + i) > 0 ? 1 : 0.25)
        : Math.min(1, tw + Math.max(0, fx.flare) * 0.5);
    });

    // 아티스트: 바운스 + 스트로크 (프로시저럴 곡 / 업로드 곡 공통)
    var groove = (song.running || live.src) ? 1 : 0.3;
    var curBpm = live.src && live.list ? (live.list[live.idx].bpm || 100) : song.bpm;
    artist.position.y = 0.18 + Math.abs(Math.sin(t * (curBpm / 60) * Math.PI)) * 0.05 * groove;
    strumArm.rotation.z = -0.9 + Math.sin(t * (curBpm / 60) * Math.PI * 2) * 0.35 * groove;
    artist.userData.head.rotation.z = Math.sin(t * 1.9) * 0.08;

    // 관중: 바운스(저음 반응) + 점프 + 플래시
    crowd.forEach(function (p, i) {
      var ud = p.userData;
      var amp = (ud.sitting ? 0.015 : 0.04) * (0.5 + bass * 1.6) * groove;
      var baseY = ud.baseY !== undefined ? ud.baseY : (ud.baseY = p.position.y);
      if (ud.jump && ud.jump > 0) { ud.jump -= dt * 2.2; }
      var jumpY = ud.jump > 0 ? Math.sin((0.6 - ud.jump) / 0.6 * Math.PI) * 0.16 : 0;
      p.position.y = baseY + Math.abs(Math.sin(t * (curBpm / 60) * Math.PI + ud.phase)) * amp + jumpY;
      ud.head.rotation.x = Math.sin(t * 2 + ud.phase) * 0.06;
      var want = ud.remoteBound
        ? (ud.mpFlashOn ? 0.9 : 0)
        : ((state.flashOn && !ud.sitting) || (state.flashOn && i % 2 === 0) ? 0.85 : 0);
      ud.flash.material.opacity += (want - ud.flash.material.opacity) * 0.08;
      if (ud.flash.material.opacity > 0.05)
        ud.flash.position.x = 0.16 + Math.sin(t * 2.4 + ud.phase) * 0.1;
    });

    // 게이지 자연 상승(플래시 유지 시) + 흥분도 감쇠
    var isPlaying = song.running || !!live.src;
    if (state.flashOn && isPlaying) addGauge(dt * 1.2);
    if (isPlaying) addGauge(dt * 0.35);
    state.excitement = Math.max(0.12, state.excitement - dt * 0.01);

    // 행인 NPC
    if (passerby.g.visible) {
      var pg = passerby.g;
      if (passerby.state === 'walk') {
        pg.position.x += passerby.dir * dt * 1.15;
        pg.position.y = Math.abs(Math.sin(t * 6)) * 0.03;
        if (!passerby.stopped && Math.abs(pg.position.x - passerby.stopX) < 0.1 && Math.random() < state.excitement) {
          passerby.state = 'listen'; passerby.t = 3 + Math.random() * 4; passerby.stopped = true;
          pg.lookAt(new THREE.Vector3(0, 1, -3.3));
          toast('지나가던 행인이 발걸음을 멈췄습니다 👀');
        }
        if (Math.abs(pg.position.x) > 16) pg.visible = false;
      } else if (passerby.state === 'listen') {
        passerby.t -= dt;
        pg.userData.head.rotation.x = Math.sin(t * 4) * 0.1; // 고개 끄덕
        if (passerby.t <= 0) {
          if (Math.random() < 0.45 + state.excitement * 0.3) {
            // 관객 전환!
            pg.visible = false;
            var np = addAudience(new THREE.Vector3(2.6 + Math.random(), 0, 1.6 + Math.random()), false, 0x777d88);
            np.userData.baseY = 0;
            setAud(state.audience + 1);
            toast('행인이 관객이 되었습니다! 관객 +1 🎉');
            addGauge(6);
          } else {
            passerby.state = 'walk';
          }
        }
      }
    }

    // 동전 물리
    for (var ci = coins.length - 1; ci >= 0; ci--) {
      var c = coins[ci];
      c.userData.t += dt;
      c.userData.vel.y -= 9.8 * dt;
      c.position.addScaledVector(c.userData.vel, dt);
      c.rotation.x += c.userData.spin * dt; c.rotation.z += c.userData.spin * 0.6 * dt;
      if (c.position.y <= CASE_POS.y && c.userData.t > 0.4) {
        c.position.y = CASE_POS.y;
        c.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, 0);
        c.userData.vel.set(0, 0, 0); c.userData.spin = 0;
        coins.splice(ci, 1); // 케이스에 안착 — 유지
      }
    }

    // 카메라: 아이들 스웨이 + 드래그 + 저음 셰이크
    drag.yaw += (drag.tyaw - drag.yaw) * 0.08;
    drag.pitch += (drag.tpitch - drag.pitch) * 0.08;
    var sway = Math.sin(t * 0.28) * 0.25;
    shake.set((Math.random() - 0.5), (Math.random() - 0.5), 0).multiplyScalar(bass * 0.03);
    camera.position.set(
      camBase.x + sway + Math.sin(drag.yaw) * 4 + shake.x,
      camBase.y + Math.sin(t * 0.4) * 0.05 + drag.pitch * 2 + shake.y,
      camBase.z - (1 - Math.cos(drag.yaw)) * 2
    );
    camera.lookAt(camTarget);

    renderer.render(scene, camera);
  }
  animate();

  // ---------- 스튜디오 연동 API ----------
  window.Guldari = {
    toast: toast,
    ensureAudio: initAudio,
    decode: function (arrayBuffer) {
      initAudio();
      return A.ctx.decodeAudioData(arrayBuffer);
    },
    renderDemoSong: renderDemoSong,
    begin: begin,
    bindRemoteToSlot: bindRemoteToSlot,
    unbindSlot: unbindSlot,
    setSlotFlash: setSlotFlash,
    renameSlot: renameSlot,
    remoteCoinDrop: remoteCoinDrop,
    setGauge: setGaugeFromServer
  };
})();
