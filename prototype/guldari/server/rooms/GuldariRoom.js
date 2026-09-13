/* GuldariRoom — 굴다리 소형 무대 룸 서버 (Colyseus)
 * 02-development-plan.md §5의 설계를 그대로 따른다:
 *   - 아티스트/관중 상태는 이벤트(clap·flash·coin)로만 브로드캐스트, 위치 스냅샷은 쓰지 않는다
 *     (MVP는 "소형 무대 30명 룸" — 아바타 자유이동 대신 고정 관중석 슬롯에 원격 플레이어를 배정)
 *   - 별점·리워드(SP)는 이 룸이 아니라 플랫폼 백엔드(Supabase)가 서버 권위로 기록한다는 원칙에 따라
 *     이 룸은 앙코르 게이지·동전·박수 같은 "휘발성 라이브 상태"만 갖는다
 */
const { Room } = require('colyseus');
const { Schema, type, MapSchema, ArraySchema } = require('@colyseus/schema');

const MAX_REMOTE_SLOTS = 6; // 굴다리 무대의 실관중 좌석(나머지는 로컬 NPC로 채움 — 06 문서 "동접 착시" 대응)

class Player extends Schema {}
type('string')(Player.prototype, 'name');
type('boolean')(Player.prototype, 'flashOn');
type('int8')(Player.prototype, 'slot');
type('boolean')(Player.prototype, 'isArtist');
type('number')(Player.prototype, 'joinedAt');

class LogEntry extends Schema {}
type('string')(LogEntry.prototype, 'type');
type('string')(LogEntry.prototype, 'from');
type('number')(LogEntry.prototype, 't');

class RoomState extends Schema {}
type({ map: Player })(RoomState.prototype, 'players');
type('number')(RoomState.prototype, 'gauge');
type('int32')(RoomState.prototype, 'coins');
type('string')(RoomState.prototype, 'songTitle');
type([LogEntry])(RoomState.prototype, 'log');

class GuldariRoom extends Room {
  onCreate(options) {
    this.maxClients = MAX_REMOTE_SLOTS;
    this.setState(new RoomState());
    this.state.players = new MapSchema();
    this.state.log = new ArraySchema();
    this.state.gauge = 0;
    this.state.coins = 0;
    this.state.songTitle = (options && options.songTitle) || '유성우';
    this.freeSlots = Array.from({ length: MAX_REMOTE_SLOTS }, (_, i) => i);

    this.onMessage('clap', (client) => {
      this.bumpGauge(4);
      this.pushLog('clap', this.nameOf(client));
    });

    this.onMessage('flash', (client, on) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.flashOn = !!on;
      if (on) this.bumpGauge(10);
    });

    this.onMessage('coin', (client) => {
      this.state.coins++;
      this.bumpGauge(8);
      this.pushLog('coin', this.nameOf(client));
    });

    this.onMessage('nick', (client, name) => {
      const p = this.state.players.get(client.sessionId);
      if (p && typeof name === 'string') p.name = name.trim().slice(0, 16) || p.name;
    });

    // 앙코르 게이지 자연 감쇠 — 클라 로컬 곡 없이도 방이 살아있게
    this.clock.setInterval(() => {
      this.state.gauge = Math.max(0, this.state.gauge - 0.6);
    }, 1000);
  }

  nameOf(client) {
    const p = this.state.players.get(client.sessionId);
    return p ? p.name : '관객';
  }

  bumpGauge(v) {
    this.state.gauge = Math.max(0, Math.min(100, this.state.gauge + v));
  }

  pushLog(type, from) {
    this.state.log.push(Object.assign(new LogEntry(), { type, from, t: Date.now() }));
    if (this.state.log.length > 20) this.state.log.shift();
  }

  onJoin(client, options) {
    if (this.freeSlots.length === 0) {
      client.leave(4000, '굴다리 무대의 관객 슬롯이 가득 찼어요 (' + MAX_REMOTE_SLOTS + '명)');
      return;
    }
    const slot = this.freeSlots.shift();
    const p = new Player();
    p.name = ((options && options.name) || '관객' + Math.floor(100 + Math.random() * 900)).slice(0, 16);
    p.flashOn = false;
    p.slot = slot;
    p.isArtist = false;
    p.joinedAt = Date.now();
    this.state.players.set(client.sessionId, p);
    this.pushLog('join', p.name);
  }

  onLeave(client) {
    const p = this.state.players.get(client.sessionId);
    if (p) {
      this.freeSlots.push(p.slot);
      this.freeSlots.sort((a, b) => a - b);
      this.pushLog('leave', p.name);
    }
    this.state.players.delete(client.sessionId);
  }
}

module.exports = { GuldariRoom, MAX_REMOTE_SLOTS };
