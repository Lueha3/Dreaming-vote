import { describe, it, expect } from "vitest";
import { recommendClubs, type ClubCandidate, type PersonaInput } from "@/lib/clubMatch";

const persona: PersonaInput = {
  catchphrase: "전략가",
  coreTraits: "다윗형, 솔로몬형",
  optimalEcosystem: "도전적인 환경",
  corePosition: "리더",
};

function cand(over: Partial<ClubCandidate> & { id: string }): ClubCandidate {
  return {
    name: over.id,
    category: "스터디",
    description: "함께 공부하는 모임이에요.",
    tags: "코딩, 성장",
    maxMembers: null,
    memberCount: 0,
    memberArchetypes: [],
    ...over,
  };
}

describe("recommendClubs — 결정론·밴드", () => {
  it("후보가 없으면 빈 배열", () => {
    expect(recommendClubs(persona, [], 5)).toEqual([]);
  });

  it("같은 입력은 항상 같은 결과(결정론 불변식)", () => {
    const candidates = [
      cand({ id: "a", category: "스터디" }),
      cand({ id: "b", category: "운동" }),
      cand({ id: "c", category: "봉사" }),
    ];
    const r1 = recommendClubs(persona, candidates, 5);
    const r2 = recommendClubs(persona, candidates, 5);
    expect(r1).toEqual(r2);
  });

  it("점수는 항상 20..98 밴드 안", () => {
    const candidates = [
      cand({ id: "full", maxMembers: 2, memberCount: 2 }),
      cand({ id: "open", maxMembers: 10, memberCount: 0 }),
      cand({ id: "homo", memberArchetypes: ["다윗형", "다윗형"] }),
    ];
    for (const m of recommendClubs(persona, candidates, 5)) {
      expect(m.score).toBeGreaterThanOrEqual(20);
      expect(m.score).toBeLessThanOrEqual(98);
    }
  });

  it("topN으로 제한", () => {
    const many = Array.from({ length: 8 }, (_, i) => cand({ id: `c${i}` }));
    expect(recommendClubs(persona, many, 3)).toHaveLength(3);
  });
});

describe("recommendClubs — 참여 신호 보정", () => {
  it("만석 동아리는 동일 조건의 여석 동아리보다 점수가 낮다", () => {
    const full = cand({ id: "full", maxMembers: 2, memberCount: 2 });
    const open = cand({ id: "open", maxMembers: 10, memberCount: 0 });
    const res = recommendClubs(persona, [full, open], 5);
    const f = res.find((r) => r.clubId === "full")!;
    const o = res.find((r) => r.clubId === "open")!;
    expect(f.score).toBeLessThan(o.score);
  });

  it("나와 같은 인물형 멤버가 있으면 동질성 보너스로 점수가 높다", () => {
    const base = { category: "봉사" as const, maxMembers: null, memberCount: 0 };
    const without = cand({ id: "w", ...base, memberArchetypes: [] });
    const withHomo = cand({ id: "h", ...base, memberArchetypes: ["다윗형", "다윗형"] });
    const res = recommendClubs(persona, [without, withHomo], 5);
    const w = res.find((r) => r.clubId === "w")!;
    const h = res.find((r) => r.clubId === "h")!;
    expect(h.score).toBeGreaterThan(w.score);
    expect(h.reason).toContain("비슷한 인물형");
  });
});
