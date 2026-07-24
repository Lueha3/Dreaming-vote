/**
 * 기질 나침반 채점 엔진.
 *
 * 저장·로직의 기준은 항상 0~100 차원 점수. 아키타입은 표시용 파생값이다
 * (docs/blueharmony/03-ai-engine.md §2 — "아키타입은 표시용, 로직은 항상 원점수").
 */
import { PARENT_SURVEY, type ParentAxis, type SurveyItem } from "@/data/harmony/parentSurvey";
import { CHILD_SURVEY, type ChildDim } from "@/data/harmony/childSurvey";
import type { ChildTypeId, ParentTypeId } from "@/data/harmony/archetypes";

/** 문항 id → 응답(0~3). 미응답 문항이 있으면 채점 함수가 throw. */
export type Answers = Record<string, number>;

const MAX_PER_ITEM = 3;

function scoreAxes<Axis extends string>(
  items: SurveyItem<Axis>[],
  answers: Answers,
): Record<Axis, number> {
  const sum = {} as Record<Axis, { got: number; max: number }>;
  for (const item of items) {
    const raw = answers[item.id];
    if (raw === undefined || raw < 0 || raw > MAX_PER_ITEM) {
      throw new Error(`미응답 또는 범위 밖 문항: ${item.id}`);
    }
    const v = item.reverse ? MAX_PER_ITEM - raw : raw;
    const acc = (sum[item.axis] ??= { got: 0, max: 0 });
    acc.got += v;
    acc.max += MAX_PER_ITEM;
  }
  const out = {} as Record<Axis, number>;
  for (const axis of Object.keys(sum) as Axis[]) {
    out[axis] = Math.round((sum[axis].got / sum[axis].max) * 100);
  }
  return out;
}

export type ParentScores = Record<ParentAxis, number>;
export type ChildScores = Record<ChildDim, number>;

export function scoreParent(answers: Answers): ParentScores {
  return scoreAxes(PARENT_SURVEY, answers);
}

export function scoreChild(answers: Answers): ChildScores {
  return scoreAxes(CHILD_SURVEY, answers);
}

/** speed(반응 속도) × style(높음=마음 읽기) 2×2 → 부모 유형 */
export function parentTypeOf(s: ParentScores): ParentTypeId {
  const fast = s.speed >= 50;
  const heart = s.style >= 50;
  if (fast && !heart) return "volcano";
  if (fast && heart) return "wave";
  if (!fast && !heart) return "lighthouse";
  return "lake";
}

/**
 * 아이 유형 — 우선순위 규칙 (위에서부터 첫 매치):
 * 1. 유리병: 민감도 높음 + 적응 느림 (돌봄 관점에서 가장 먼저 알아야 할 프로파일)
 * 2. 불꽃놀이: 반응 강도 높음
 * 3. 로켓: 활동성 높음
 * 4. 시냇물: 그 외 (적응 빠르고 리듬 안정적인 순한 프로파일 포함)
 * 동점·경계값은 규칙 순서가 곧 타이브레이커다.
 */
export function childTypeOf(s: ChildScores): ChildTypeId {
  if (s.sensitivity >= 60 && s.adaptability <= 50) return "glass";
  if (s.intensity >= 60) return "firework";
  if (s.activity >= 60) return "rocket";
  return "stream";
}

/** 차원 점수 표시용 3단 레이블 */
export function levelLabel(score: number): "높음" | "중간" | "낮음" {
  if (score >= 60) return "높음";
  if (score >= 40) return "중간";
  return "낮음";
}
