import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { SAMPLE_RECORDS } from "./sample-data";
import { convertLine } from "./match";
import { convertMany, toTSV, summarize } from "./index";

const store = new MemoryStore(SAMPLE_RECORDS);

describe("convertLine — 도로명 입력", () => {
  it("도로명 → 지번 + 우편번호", () => {
    const r = convertLine("서울특별시 강남구 테헤란로 152", store);
    expect(r.status).toBe("matched");
    expect(r.zipcode).toBe("06236");
    expect(r.jibunAddress).toContain("역삼동 737");
  });
  it("축약 시도(서울) 도 매칭", () => {
    const r = convertLine("서울 강남구 테헤란로 152", store);
    expect(r.zipcode).toBe("06236");
  });
  it("괄호 법정동이 섞여도 매칭", () => {
    const r = convertLine("서울 강남구 테헤란로 152 (역삼동)", store);
    expect(r.zipcode).toBe("06236");
  });
  it("시 + 구 두 토큰 시군구(성남시 분당구)", () => {
    const r = convertLine("경기 성남시 분당구 불정로 6", store);
    expect(r.status).toBe("matched");
    expect(r.zipcode).toBe("13561");
  });
});

describe("convertLine — 지번 입력", () => {
  it("지번 → 도로명 + 우편번호", () => {
    const r = convertLine("서울 강남구 역삼동 737", store);
    expect(r.status).toBe("matched");
    expect(r.zipcode).toBe("06236");
    expect(r.roadAddress).toContain("테헤란로 152");
  });
  it("번지/호 표기(737번지 4호... 부번 없는 케이스는 706-12)", () => {
    const r = convertLine("서울 강남구 역삼동 706-12", store);
    expect(r.status).toBe("matched");
    expect(r.zipcode).toBe("06142");
  });
});

describe("convertLine — 우편번호 입력(1:N)", () => {
  it("단일 매칭", () => {
    const r = convertLine("13561", store);
    expect(r.status).toBe("matched");
    expect(r.roadAddress).toContain("불정로 6");
  });
  it("여러 건물이면 대표 + 외 N건", () => {
    const r = convertLine("06236", store);
    expect(r.status).toBe("ambiguous");
    expect(r.candidateCount).toBe(2);
    expect(r.roadAddress).toContain("외 1건");
  });
});

describe("convertLine — 실패", () => {
  it("없는 주소는 unmatched", () => {
    const r = convertLine("서울 강남구 없는로 9999", store);
    expect(r.status).not.toBe("matched");
  });
  it("빈 줄은 empty", () => {
    expect(convertLine("", store).status).toBe("empty");
  });
});

describe("convertMany + TSV", () => {
  it("여러 줄 처리 + 행 정렬 유지", () => {
    const text = ["06236", "", "서울 강남구 역삼동 737"].join("\n");
    const res = convertMany(text, store);
    expect(res).toHaveLength(3);
    expect(res[1].status).toBe("empty");
  });
  it("TSV 헤더 + 탭 구분", () => {
    const res = convertMany("13561", store);
    const tsv = toTSV(res);
    expect(tsv.split("\n")[0]).toContain("\t");
    expect(tsv).toContain("13561");
  });
  it("summarize 매칭률", () => {
    const res = convertMany(
      ["13561", "서울 강남구 역삼동 737", "없는주소 123"].join("\n"),
      store,
    );
    const s = summarize(res);
    expect(s.total).toBe(3);
    expect(s.matched).toBeGreaterThanOrEqual(2);
  });
});

describe("성능 — 수천 건 즉시 처리", () => {
  it("5,000줄을 1초 내 변환", () => {
    const lines: string[] = [];
    for (let i = 0; i < 5000; i++) {
      lines.push("서울 강남구 테헤란로 152");
    }
    const start = performance.now();
    const res = convertMany(lines.join("\n"), store);
    const elapsed = performance.now() - start;
    expect(res).toHaveLength(5000);
    expect(elapsed).toBeLessThan(1000);
  });
});
