/* 굴다리 룸 서버 — 로컬 개발/시연용.
 * 실제 제품에서는 이 서버가 게임 서버 계층(02-development-plan.md §7)이 되고,
 * 계정·SP·별점은 별도의 플랫폼 백엔드(Supabase)가 서버 권위로 처리한다.
 * 실행: npm start  (기본 포트 2567, PORT 환경변수로 변경 가능)
 */
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('colyseus');
const { GuldariRoom } = require('./rooms/GuldariRoom');

const app = express();
app.use(cors());
app.get('/healthz', (_req, res) => res.json({ ok: true, room: 'guldari' }));

const server = http.createServer(app);
const gameServer = new Server({ server });

gameServer.define('guldari', GuldariRoom);

const port = Number(process.env.PORT) || 2567;
gameServer.listen(port).then(() => {
  console.log('[guldari] room server listening on ws://localhost:' + port);
});
