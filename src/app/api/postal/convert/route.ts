// 우편번호 일괄 변환 API — 운영 확장 지점.
//
// MVP: 샘플 MemoryStore 로 응답(UI는 클라이언트 변환을 쓰므로 이 라우트는 옵션).
// 운영: store 를 Postgres 백엔드 구현으로 교체하면 전국 수백만 건을 그대로 처리.
// 대용량은 청크로 잘라 여러 번 호출(또는 스트리밍)하는 것을 권장한다.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MemoryStore,
  SAMPLE_RECORDS,
  convertLine,
  summarize,
} from "@/lib/postal";

export const runtime = "nodejs";

// 한 번에 받는 최대 줄 수(과도한 페이로드 방지). 초과 시 클라이언트가 청크 분할.
const MAX_LINES = 20_000;

const Body = z.object({
  lines: z.array(z.string()).max(MAX_LINES),
});

// 운영에서는 여기를 DB 백엔드 store 로 교체한다.
const store = new MemoryStore(SAMPLE_RECORDS);

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `줄 수는 최대 ${MAX_LINES}줄까지 처리합니다.` },
      { status: 400 },
    );
  }

  const results = parsed.data.lines.map((line) => convertLine(line, store));
  return NextResponse.json({ results, summary: summarize(results) });
}
