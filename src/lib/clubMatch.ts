/**
 * 동아리 추천 — 결정론적 매칭 (AI 미사용)
 *
 * 성경 인물형(coreTraits)을 토대로 동아리를 추천한다. AI 호출 없이 로컬에서 즉시·일관 실행.
 * 같은 입력 → 항상 같은 점수·순서(저장 후 다시 읽어도 일치 — Math.random 금지).
 *
 * 점수 = 카테고리 적합도(주 신호) + 태그/설명 키워드 일치(보너스).
 *   - 카테고리 적합도: 인물형 19종 × 카테고리 8종 정적 테이블(AFFINITY). 사용자의 인물형을
 *     닮은 순(대표일수록 큰 가중)으로 합산.
 *   - 키워드 보너스: 인물형 keywords가 동아리 tags/description/name에 실제로 등장하면 가점.
 */
import {
  parseTraits,
  type BibleArchetype,
} from "@/lib/bibleArchetypes";

export type PersonaInput = {
  catchphrase: string;
  coreTraits: string;
  optimalEcosystem: string;
  corePosition: string;
};

export type ClubCandidate = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string;
  // 참여 신호 보정용 (없으면 보정 없음).
  maxMembers?: number | null;
  memberCount?: number; // accepted 멤버 수
  memberArchetypes?: string[]; // accepted 멤버들의 대표 인물형 label
};

export type ClubMatch = { clubId: string; score: number; reason: string };

/**
 * 인물형 → 카테고리 적합도 (0=무관, 1=약간, 2=잘 맞음, 3=강하게 맞음).
 * 카테고리: 신앙 · 스터디 · 취미/여가 · 운동 · 봉사 · 창업/사이드프로젝트 · 문화/예술 · 친목
 * 각 인물형의 type·keywords를 근거로 부여. 모든 카테고리는 여러 인물형이 커버하도록 분산.
 */
const AFFINITY: Record<string, Partial<Record<string, number>>> = {
  // 전략·통찰·리더십
  다윗형: { "창업/사이드프로젝트": 3, 운동: 3, 스터디: 1, "취미/여가": 1 },
  요셉형: { "창업/사이드프로젝트": 3, 스터디: 2, 봉사: 1, 신앙: 1 },
  솔로몬형: { 스터디: 3, 신앙: 2, "창업/사이드프로젝트": 1 },
  누가형: { 스터디: 3, "창업/사이드프로젝트": 1, 신앙: 1 },
  도마형: { 스터디: 3, "창업/사이드프로젝트": 1, 신앙: 1 },

  // 추진·개척·도전
  느헤미야형: { "창업/사이드프로젝트": 3, 봉사: 2, 운동: 2 },
  바울형: { "창업/사이드프로젝트": 3, 봉사: 2, 운동: 1, 신앙: 1 },
  아브라함형: { "창업/사이드프로젝트": 3, 신앙: 2, 스터디: 1 },

  // 결단·용기·위기대응 (행동 지향)
  에스더형: { 운동: 3, "창업/사이드프로젝트": 2, 봉사: 1, 신앙: 1 },
  드보라형: { 운동: 3, "창업/사이드프로젝트": 2, 봉사: 1, 신앙: 1 },

  // 사명·인도·돌봄
  모세형: { 신앙: 3, 봉사: 2, 친목: 1 },
  다니엘형: { 신앙: 3, 스터디: 2, 운동: 1 },
  마리아형: { 신앙: 3, "문화/예술": 1, 스터디: 1 },

  // 섬김·헌신·실무
  마르다형: { 봉사: 3, 친목: 2, "취미/여가": 1, 신앙: 1 },
  룻형: { 봉사: 3, 신앙: 2, 친목: 1 },

  // 관계·격려·연결·중재 (사람 지향)
  바나바형: { 친목: 3, 봉사: 2, 신앙: 2, "취미/여가": 1, "문화/예술": 1 },
  안드레형: { 친목: 3, "취미/여가": 3, 운동: 1, 봉사: 1, 신앙: 1 },
  아비가일형: { 친목: 3, 봉사: 2, 신앙: 1 },

  // 표현·예술
  미리암형: { "문화/예술": 3, 친목: 2, 신앙: 2, "취미/여가": 2 },
};

// 닮은 순 가중치 (대표 인물형일수록 크게). 5개 이상이면 0.25.
const ORDER_WEIGHTS = [1.0, 0.7, 0.5, 0.35];
const MAX_AFFINITY = 3;

function weightAt(i: number): number {
  return ORDER_WEIGHTS[i] ?? 0.25;
}

/** coreTraits에서 인식된 인물형을 닮은 순으로(중복 제거, 최대 4개) 추출. */
function userArchetypes(coreTraits: string): BibleArchetype[] {
  const seen = new Set<string>();
  const out: BibleArchetype[] = [];
  for (const { archetype } of parseTraits(coreTraits)) {
    if (archetype && !seen.has(archetype.label)) {
      seen.add(archetype.label);
      out.push(archetype);
      if (out.length === 4) break;
    }
  }
  return out;
}

function buildReason(
  driving: BibleArchetype | null,
  category: string,
  matchedKeywords: string[],
): string {
  if (!driving) {
    return "이 동아리의 활동이 당신의 성향과 잘 어울려요.";
  }
  let reason = `${driving.label}(${driving.type})의 강점을 살릴 수 있는 ${category} 동아리예요.`;
  if (matchedKeywords.length) {
    reason += ` 특히 ‘${matchedKeywords.slice(0, 2).join("·")}’ 키워드가 잘 맞아요.`;
  }
  return reason;
}

/**
 * 페르소나(성경 인물형) 기반으로 후보 동아리를 점수화해 상위 topN을 반환.
 * 결정론적 — 같은 입력이면 항상 같은 결과. 후보가 없으면 빈 배열.
 */
export function recommendClubs(
  persona: PersonaInput,
  candidates: ClubCandidate[],
  topN = 5,
): ClubMatch[] {
  if (candidates.length === 0) return [];

  const archs = userArchetypes(persona.coreTraits);
  const userLabels = new Set(archs.map((a) => a.label));
  // 인식된 인물형이 없을 때(레거시 리포트)를 위한 텍스트 폴백 토큰
  const fallbackTokens =
    archs.length === 0
      ? [...new Set(
          `${persona.coreTraits} ${persona.optimalEcosystem} ${persona.corePosition}`
            .split(/[\s,，、./]+/)
            .map((w) => w.replace(/[은는이가을를에의과와로]+$/u, "").trim())
            .filter((w) => w.length >= 2),
        )]
      : [];

  const maxCat =
    archs.reduce((sum, _a, i) => sum + weightAt(i) * MAX_AFFINITY, 0) || 1;

  type Scored = ClubMatch & { _name: string };
  const scored: Scored[] = candidates.map((c) => {
    const text = `${c.name} ${c.category} ${c.tags} ${c.description}`;

    // ── 1) 적합도 기본 점수 ──
    let baseScore: number;
    let drv: BibleArchetype | null = null;
    const matched = new Set<string>();

    if (archs.length === 0) {
      // 레거시 폴백: 페르소나 토큰이 동아리 텍스트에 얼마나 등장하는지로 차등 (40..85 밴드)
      const hits = fallbackTokens.filter((t) => text.includes(t)).length;
      baseScore = Math.round(40 + Math.min(1, hits * 0.12) * 45);
    } else {
      let catRaw = 0; // 가중 합 (얼마나 폭넓게 이 카테고리로 기우는가)
      let bestWeighted = 0; // 가장 강한 단일 인물형의 가중 적합도 (대표가 강하게 맞는가)
      let driving: BibleArchetype | null = null;
      let drivingAff = -1;

      archs.forEach((a, i) => {
        const aff = AFFINITY[a.label]?.[c.category] ?? 0;
        const weighted = weightAt(i) * aff;
        catRaw += weighted;
        if (weighted > bestWeighted) bestWeighted = weighted;
        // 이 동아리 카테고리에 가장 잘 맞는 인물형 = 추천 이유의 주체
        if (aff > drivingAff) {
          drivingAff = aff;
          driving = a;
        }
        for (const kw of a.keywords) {
          if (text.includes(kw)) matched.add(kw);
        }
      });

      // 폭(sumNorm) + 강도(maxNorm)를 5:5로 혼합. 강도 항이 없으면 소수 인물형만 맞는
      // 니치 카테고리(운동/취미/문화·예술)가 여러 인물형에 걸친 카테고리(친목 등)에 구조적으로 묻힌다.
      const sumNorm = catRaw / maxCat; // 0..1 — 프로필이 전반적으로 이 카테고리로 기운 정도
      const maxNorm = Math.min(1, bestWeighted / (ORDER_WEIGHTS[0] * MAX_AFFINITY)); // 0..1 — 대표가 강하게 맞는가
      const catScore = 0.5 * sumNorm + 0.5 * maxNorm;
      const kwScore = Math.min(1, matched.size * 0.34); // 약 3개 일치 시 포화
      const final01 = 0.72 * catScore + 0.28 * kwScore;
      // 40..98 밴드. 하한을 55→40으로 낮춰 적합도가 낮은 동아리도 솔직하게 낮은 점수로 표시.
      baseScore = Math.round(40 + final01 * 58);
      // 카테고리 적합도가 전부 0이면 대표 인물형을 이유 주체로
      drv = drivingAff > 0 ? driving : archs[0] ?? null;
    }

    // ── 2) 참여 신호 보정 (결정론 유지) ──
    // (a) 멤버 동질성: 나와 같은 대표 인물형 멤버가 있을수록 가점(최대 +6).
    const sharedMembers = (c.memberArchetypes ?? []).filter((l) => userLabels.has(l)).length;
    const homogeneity = Math.min(1, sharedMembers * 0.34); // 약 3명에서 포화
    let score = baseScore + Math.round(6 * homogeneity);
    // (b) 만석/임박 패널티: 들어갈 수 없는(혹은 곧 마감) 동아리를 상위에서 끌어내린다.
    if (c.maxMembers && c.maxMembers > 0 && c.memberCount != null) {
      const ratio = c.memberCount / c.maxMembers;
      if (ratio >= 1) score = Math.round(score * 0.5); // 만석
      else if (ratio >= 0.85) score = Math.round(score * 0.85); // 임박
    }
    score = Math.max(20, Math.min(98, score));

    let reason = buildReason(drv, c.category, [...matched]);
    if (sharedMembers > 0) reason += " 나와 비슷한 인물형 멤버도 함께해요.";

    return { clubId: c.id, score, reason, _name: c.name };
  });

  // 점수 내림차순, 동점은 이름 오름차순으로 안정 정렬(결정론적)
  return scored
    .sort((a, b) => b.score - a.score || a._name.localeCompare(b._name, "ko"))
    .slice(0, topN)
    .map(({ _name: _drop, ...m }) => m);
}
