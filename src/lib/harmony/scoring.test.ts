import { describe, expect, it } from "vitest";
import { PARENT_SURVEY } from "@/data/harmony/parentSurvey";
import { CHILD_SURVEY } from "@/data/harmony/childSurvey";
import { COMBOS, getCombo, PARENT_TYPES, CHILD_TYPES } from "@/data/harmony/archetypes";
import {
  scoreParent,
  scoreChild,
  parentTypeOf,
  childTypeOf,
  type Answers,
} from "./scoring";

function fill(items: { id: string }[], value: number): Answers {
  return Object.fromEntries(items.map((i) => [i.id, value]));
}

describe("scoreParent / scoreChild", () => {
  it("전부 0으로 답하면 정방향 문항 0점 + 역문항 만점이 섞여 중간대가 된다", () => {
    const s = scoreParent(fill(PARENT_SURVEY, 0));
    // speed축 6문항 중 역문항 2개 → 2*3/18 = 33
    expect(s.speed).toBe(33);
    expect(s.style).toBe(50); // style축 역문항 3개 → 9/18
  });

  it("역문항이 실제로 반전된다", () => {
    const all3 = scoreChild(fill(CHILD_SURVEY, 3));
    const all0 = scoreChild(fill(CHILD_SURVEY, 0));
    // 각 차원 3문항 중 역문항 1개 → 전부 3 응답 시 (3+3+0)/9=67, 전부 0 응답 시 33
    for (const dim of Object.keys(all3) as (keyof typeof all3)[]) {
      expect(all3[dim]).toBe(67);
      expect(all0[dim]).toBe(33);
    }
  });

  it("미응답 문항이 있으면 throw", () => {
    const partial = fill(PARENT_SURVEY.slice(1), 2);
    expect(() => scoreParent(partial)).toThrow(/미응답/);
  });
});

describe("parentTypeOf — 2×2 사분면", () => {
  it.each([
    [80, 30, "volcano"],
    [80, 70, "wave"],
    [30, 30, "lighthouse"],
    [30, 70, "lake"],
  ] as const)("speed=%i style=%i → %s", (speed, style, expected) => {
    expect(parentTypeOf({ speed, style })).toBe(expected);
  });

  it("경계값 50은 '빠름/마음 읽기' 쪽으로 포함된다", () => {
    expect(parentTypeOf({ speed: 50, style: 50 })).toBe("wave");
  });
});

describe("childTypeOf — 우선순위 규칙", () => {
  const base = {
    sensitivity: 30, intensity: 30, persistence: 30,
    adaptability: 70, activity: 30, regularity: 70,
  };
  it("민감 높음 + 적응 느림 → 유리병 (다른 조건보다 우선)", () => {
    expect(childTypeOf({ ...base, sensitivity: 80, adaptability: 40, intensity: 90 })).toBe("glass");
  });
  it("민감 높아도 적응이 빠르면 유리병이 아니다", () => {
    expect(childTypeOf({ ...base, sensitivity: 80, adaptability: 70 })).toBe("stream");
  });
  it("반응 강도 높음 → 불꽃놀이", () => {
    expect(childTypeOf({ ...base, intensity: 75 })).toBe("firework");
  });
  it("활동성 높음 → 로켓", () => {
    expect(childTypeOf({ ...base, activity: 90 })).toBe("rocket");
  });
  it("두드러진 축 없음 → 시냇물", () => {
    expect(childTypeOf(base)).toBe("stream");
  });
});

describe("아키타입 데이터 완전성", () => {
  it("조합 16종이 전부 존재하고 중복이 없다", () => {
    expect(COMBOS).toHaveLength(16);
    const keys = new Set(COMBOS.map((c) => `${c.parent}:${c.child}`));
    expect(keys.size).toBe(16);
    for (const p of Object.keys(PARENT_TYPES) as (keyof typeof PARENT_TYPES)[]) {
      for (const ch of Object.keys(CHILD_TYPES) as (keyof typeof CHILD_TYPES)[]) {
        expect(getCombo(p, ch)).toBeDefined();
      }
    }
  });

  it("모든 조합에 강점과 첫수가 반드시 있다 (No-Blame 원칙)", () => {
    for (const c of COMBOS) {
      expect(c.strength.length).toBeGreaterThan(5);
      expect(c.firstMove.length).toBeGreaterThan(5);
      expect(c.clashes).toHaveLength(3);
    }
  });

  it("충돌 지점은 SOS 상황 프리셋 어휘만 쓴다", () => {
    const PRESETS = new Set([
      "떼쓰기·드러눕기", "등원·등교 거부", "형제·남매 다툼", "미디어 종료",
      "밥 안 먹기", "숙제·학습 거부", "거짓말", "던지기·때리기",
      "공공장소", "아침 준비", "잠자리 거부", "말대답·반항",
    ]);
    for (const c of COMBOS) for (const clash of c.clashes) {
      expect(PRESETS.has(clash), `${c.parent}:${c.child}의 "${clash}"`).toBe(true);
    }
  });
});
