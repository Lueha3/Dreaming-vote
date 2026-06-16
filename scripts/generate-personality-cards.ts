/**
 * 16종 MBTI 성향 카드 사전 생성 스크립트 (dev 전용·재생성용)
 *
 * MBTI 경로는 입력이 16종(INTJ…ESFP)뿐이라, 같은 유형이면 출력도 사실상 동일하다.
 * 미리 생성해 src/data/personalityCards.ts 에 캐싱하면 앱 런타임은 AI 호출이 0건이 된다.
 *
 * 실행:  npx tsx scripts/generate-personality-cards.ts   (.env.local에 GOOGLE_AI_API_KEY 필요)
 * 재생성이 필요한 경우: 인물형 목록(bibleArchetypes)이 바뀌거나 카피를 새로 뽑고 싶을 때.
 *
 * ⚠️ 이 스크립트는 앱 런타임과 분리된 유일한 AI 사용처다(@google/generative-ai = devDependency).
 *    앱 코드(src/)는 Gemini를 전혀 import하지 않는다. 생성기는 결과를 정적 파일로 굳혀 커밋만 한다.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { reportSchema } from "../src/lib/ai.ts";
import { archetypeListForPrompt, normalizeTraits } from "../src/lib/bibleArchetypes.ts";

// ── .env.local 로드 (Gemini 키) ──────────────────────────────────────────────
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const raw of envText.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = val;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

// ── 프롬프트 (구 ai.ts에서 이관 — 앱 런타임에는 더 이상 존재하지 않음) ────────
const SYSTEM_INSTRUCTION = `당신은 한국 교회 청년부 청년의 협업 성향 카드를 만드는 전문가입니다.
반드시 아래 규칙을 따르세요:
1. 오직 valid JSON만 출력. 설명, 마크다운 코드블록, 인사 일체 금지.
2. catchphrase: 15자 이내, 시적·은유적 한 줄 (반드시 핵심 명사로 끝나는 완결된 명사구)
3. coreTraits: [성경 인물형 목록]에서 이 사람과 "뚜렷하게" 닮은 인물형만 가장 닮은 순서로 골라 쉼표로 구분.
   - 개수는 고정이 아니라 유동적이다. 닮은 만큼만(보통 2~4개) 넣고 억지로 채우지 말 것.
   - 누구에게나 해당될 막연한 장점으로 고르지 말고, 가장 두드러진 행동·기질이 인물의 핵심 특징과 실제로 겹칠 때만 선택.
   - 즉흥·순발력형(P+감각)에 장기계획형(느헤미야 등)을 대표(첫 번째)로 두지 말 것.
   - 목록에 없는 인물은 절대 만들지 말 것.
4. optimalEcosystem: 이 사람이 200% 빛나는 공동체·팀 환경 (200자 이내, 중학생도 이해할 쉬운 말)
5. corePosition: 동아리·팀에서 맡으면 좋은 역할 (100자 이내, 쉬운 말)`;

const buildPersonalityPrompt = (type: string) => `
"${type}" 성격 유형을 가진 청년의 협업 성향을 분석해 아래 JSON 형식의 "성향 카드"를 만드세요.
교회 동아리·공동체·팀 활동에서 이 유형이 어떻게 빛나는지 구체적이고 생동감 있게, 중학생도 이해할 쉬운 말로 표현하세요.

[성격 유형]
${type}

[성경 인물형 목록] — coreTraits는 반드시 이 목록의 label 중에서만, 닮은 만큼만(억지로 채우지 말 것) 고를 것
${archetypeListForPrompt()}

[출력 형식] — coreTraits의 인물 수는 예시일 뿐, 실제 닮은 만큼만 (가장 닮은 순)
{"catchphrase":"...","coreTraits":"도마형, 누가형","optimalEcosystem":"...","corePosition":"..."}
`;

// 모델 폴백: 무료 등급 RPM은 모델별 독립 → flash↔lite 교차로 429를 흡수
const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateJson(prompt: string): Promise<unknown> {
  let lastError: Error | null = null;
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_CHAIN[i], systemInstruction: SYSTEM_INSTRUCTION });
      const text = (await model.generateContent(prompt)).response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i === MODEL_CHAIN.length - 2) await sleep(1200);
    }
  }
  throw lastError ?? new Error("AI generation failed after retries");
}

type Card = { catchphrase: string; coreTraits: string; optimalEcosystem: string; corePosition: string };

async function generateCard(type: string): Promise<Card> {
  // 드물게 전부 실패할 수 있으니 한 번 더 재시도
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = reportSchema.parse(await generateJson(buildPersonalityPrompt(type)));
      return { ...parsed, coreTraits: normalizeTraits(parsed.coreTraits) };
    } catch (e) {
      if (attempt === 0) {
        console.warn(`  ↻ ${type} 재시도 (${e instanceof Error ? e.message.slice(0, 80) : e})`);
        await sleep(4000);
      } else {
        throw e;
      }
    }
  }
  throw new Error("unreachable");
}

const TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

// 생성 산출물 위에 덮어쓰는 큐레이션 보정 — 재생성해도 보존된다.
// AI 생성은 가끔 (a) catchphrase 머리말 누락 (b) 즉흥형에 장기계획형 인물형을 대표로 배정하는
// 편차가 있어, 사람이 검수해 고친 항목만 여기 고정한다. (검토 워크플로 wf_e47eb3a5)
type CardField = keyof Card;
const OVERRIDES: Record<string, Partial<Record<CardField, string>>> = {
  INTP: { catchphrase: "숨겨진 본질을 캐는 탐구자" }, // 머리말 없는 미완성 명사구 보정
  ESTP: { coreTraits: "에스더형, 바울형, 마르다형" },   // 대표를 장기계획형(느헤미야)→즉흥·위기대응형(에스더)으로
};

async function main() {
  const cards: Record<string, Card> = {};
  for (const type of TYPES) {
    const card = await generateCard(type);
    cards[type] = card;
    console.log(`✓ ${type}  "${card.catchphrase}"  [${card.coreTraits}]`);
    await sleep(2500); // RPM 여유 간격 (일회성이라 느려도 무방)
  }

  // 큐레이션 보정 적용 — 재생성해도 검수된 수정이 유지된다
  for (const [type, patch] of Object.entries(OVERRIDES)) {
    if (cards[type]) {
      cards[type] = { ...cards[type], ...patch };
      console.log(`✎ ${type} 보정 적용: ${Object.keys(patch).join(", ")}`);
    }
  }

  const entries = TYPES.map(
    (t) => `  ${JSON.stringify(t)}: ${JSON.stringify(cards[t], null, 2).replace(/\n/g, "\n  ")},`,
  ).join("\n");

  const file = `/**
 * AUTO-GENERATED by scripts/generate-personality-cards.ts — 손으로 수정하지 말 것.
 * (일부 항목은 생성기의 OVERRIDES로 큐레이션 보정됨 — 재생성해도 유지된다.)
 *
 * 16종 MBTI 성향 카드 사전 생성 캐시. MBTI 경로(기본 경로)는 입력이 16종뿐이라
 * 라이브 호출 없이 이 캐시로 즉시 응답한다 → 동시 사용 폭주에도 무료·무한 처리.
 * 인물형이 바뀌면 재생성: npx tsx scripts/generate-personality-cards.ts
 */
import type { ParsedReport } from "@/lib/ai";

export const PERSONALITY_CARDS: Record<string, ParsedReport> = {
${entries}
};
`;

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = `${here}/../src/data/personalityCards.ts`;
  mkdirSync(`${here}/../src/data`, { recursive: true });
  writeFileSync(outPath, file, "utf8");
  console.log(`\n📦 ${Object.keys(cards).length}종 생성 완료 → src/data/personalityCards.ts`);
}

main().catch((e) => {
  console.error("생성 실패:", e);
  process.exit(1);
});
