/* 굴다리 멀티플레이 클라이언트 — server/ 의 Colyseus 룸(GuldariRoom)에 접속해
 * "친구가 같은 공연에 진짜로 들어와 있다"를 검증하기 위한 클라이언트.
 *
 * 02-development-plan.md §5 원칙 그대로: 위치는 동기화하지 않고(고정 관중석에 배정),
 * 클랩·플래시·동전 같은 이벤트와 앙코르 게이지만 서버 권위로 공유한다.
 * 서버가 꺼져 있으면(예: published Artifact 등 WS를 열 수 없는 환경) 조용히 솔로 모드로 남는다 —
 * 이 파일이 없어도 app.js/studio.js는 완전히 독립적으로 동작한다.
 */
(function () {
  'use strict';

  var NICK_POOL = [
    '지나가던_고양이', '굴다리단골', '박수부자', '첫공연응원단', '오늘의행인',
    '동전요정', '떼창담당', '야식먹는중', '집가는길', '우연히발견'
  ];
  function randomNick() { return NICK_POOL[Math.floor(Math.random() * NICK_POOL.length)] + Math.floor(Math.random() * 90 + 10); }

  var el = {};
  ['mpNick', 'mpStatus', 'mpPanel', 'mpList', 'mpCount'].forEach(function (id) { el[id] = document.getElementById(id); });
  if (el.mpNick) el.mpNick.value = randomNick();

  var mp = { room: null, $: null, connected: false, remotes: {}, url: defaultUrl() };

  function defaultUrl() {
    var q = new URLSearchParams(location.search).get('mp');
    if (q) return q;
    return 'ws://' + location.hostname + ':2567';
  }

  function setStatus(text, cls) {
    if (!el.mpStatus) return;
    el.mpStatus.textContent = text;
    el.mpStatus.className = 'mp-status' + (cls ? ' ' + cls : '');
  }

  function renderList() {
    if (!el.mpList) return;
    var names = Object.keys(mp.remotes).map(function (k) { return mp.remotes[k].name; });
    el.mpCount.textContent = names.length;
    el.mpList.innerHTML = names.map(function (n) {
      return '<span class="mp-chip">' + n + '</span>';
    }).join('');
    if (el.mpPanel) el.mpPanel.classList.toggle('show', names.length > 0);
  }

  function bindPlayer(sessionId, player, isMine) {
    var slotInfo = window.Guldari.bindRemoteToSlot(player.slot, player.name, isMine);
    mp.remotes[sessionId] = { name: player.name, slot: player.slot, isMine: isMine, ref: slotInfo };
    renderList();
  }

  function unbindPlayer(sessionId) {
    var r = mp.remotes[sessionId];
    if (!r) return;
    window.Guldari.unbindSlot(r.slot);
    delete mp.remotes[sessionId];
    renderList();
  }

  function connect(nickname) {
    if (!window.Colyseus) { setStatus('멀티플레이 라이브러리 없음', 'off'); return; }
    if (mp.connected || mp.connecting) return;
    mp.connecting = true;
    setStatus('연결 중…', 'wait');
    var client = new Colyseus.Client(mp.url);
    client.joinOrCreate('guldari', { name: nickname || randomNick(), songTitle: '유성우' })
      .then(function (room) {
        mp.room = room;
        mp.$ = Colyseus.getStateCallbacks(room);
        mp.connected = true; mp.connecting = false; mp.readyAt = Date.now();
        setStatus('연결됨 · ' + mp.url.replace('ws://', ''), 'on');
        window.Guldari.toast('🧑‍🤝‍🧑 멀티플레이 서버에 연결됐어요 — 다른 사람이 들어오면 실제로 관중석에 나타납니다');

        var $state = mp.$(room.state);
        $state.players.onAdd(function (player, sessionId) {
          var isMine = sessionId === room.sessionId;
          bindPlayer(sessionId, player, isMine);
          mp.$(player).listen('flashOn', function (on) {
            window.Guldari.setSlotFlash(player.slot, on);
          });
          mp.$(player).listen('name', function (name) {
            if (mp.remotes[sessionId]) { mp.remotes[sessionId].name = name; renderList(); window.Guldari.renameSlot(player.slot, name); }
          });
        });
        $state.players.onRemove(function (_player, sessionId) { unbindPlayer(sessionId); });

        $state.listen('gauge', function (v) { window.Guldari.setGauge(v); });
        $state.listen('coins', function (v, prev) {
          if (typeof prev === 'number' && v > prev) window.Guldari.remoteCoinDrop();
        });

        $state.log.onAdd(function (entry) {
          if (entry.t < mp.readyAt - 500) return; // 입장 시 리플레이되는 과거 이벤트는 건너뜀
          if (entry.from === (room.state.players.get(room.sessionId) || {}).name) return; // 내 행동은 로컬에서 이미 표시함
          var msg = {
            join: '🙋 ' + entry.from + '님이 함께 보러 왔어요',
            leave: entry.from + '님이 나갔어요',
            clap: '👏 ' + entry.from + '님이 박수를 쳤어요',
            coin: '🪙 ' + entry.from + '님이 동전을 던졌어요'
          }[entry.type];
          if (msg) window.Guldari.toast(msg, 1800);
        });

        room.onLeave(function () {
          mp.connected = false; mp.room = null;
          Object.keys(mp.remotes).forEach(unbindPlayer);
          setStatus('연결 끊김', 'off');
        });
      })
      .catch(function () {
        mp.connecting = false;
        setStatus('오프라인 — 로컬 서버 없음(솔로 모드)', 'off');
      });
  }

  function sendClap() { if (mp.room) mp.room.send('clap'); }
  function sendFlash(on) { if (mp.room) mp.room.send('flash', on); }
  function sendCoin() { if (mp.room) mp.room.send('coin'); }

  window.GuldariMultiplayer = {
    connect: connect,
    sendClap: sendClap,
    sendFlash: sendFlash,
    sendCoin: sendCoin,
    isConnected: function () { return mp.connected; }
  };
})();
