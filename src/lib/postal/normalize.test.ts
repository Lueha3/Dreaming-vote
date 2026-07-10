import { describe, it, expect } from "vitest";
import {
  cleanRaw,
  normalizeNumberTokens,
  standardizeSido,
  extractSido,
  roadKeyOf,
  jibunKeyOf,
} from "./normalize";

describe("standardizeSido", () => {
  it("축약·구어 표기를 법정 표기로 통일", () => {
    expect(standardizeSido("서울")).toBe("서울특별시");
    expect(standardizeSido("서울시")).toBe("서울특별시");
    expect(standardizeSido("서울특별시")).toBe("서울특별시");
    expect(standardizeSido("경기")).toBe("경기도");
    expect(standardizeSido("부산")).toBe("부산광역시");
  });
  it("모르는 값은 그대로", () => {
    expect(standardizeSido("역삼동")).toBe("역삼동");
  });
});

describe("cleanRaw", () => {
  it("괄호 블록 제거", () => {
    expect(cleanRaw("테헤란로 152 (역삼동)")).toBe("테헤란로 152");
  });
  it("동/호 상세 제거", () => {
    expect(cleanRaw("올림픽로 300 롯데타워 101동 202호")).toBe(
      "올림픽로 300 롯데타워",
    );
  });
  it("층 표기 제거", () => {
    expect(cleanRaw("세종대로 110 지하1층")).toBe("세종대로 110");
  });
  it("전각 숫자 반각화", () => {
    expect(cleanRaw("테헤란로 １５２")).toBe("테헤란로 152");
  });
});

describe("normalizeNumberTokens", () => {
  it("번지/호 표기를 하이픈으로", () => {
    expect(normalizeNumberTokens("역삼동 737번지 4호")).toBe("역삼동 737-4");
    expect(normalizeNumberTokens("역삼동 123번지")).toBe("역삼동 123");
  });
  it("하이픈 주변 공백 제거", () => {
    expect(normalizeNumberTokens("역삼동 737 - 4")).toBe("역삼동 737-4");
  });
  it("산 표기 결합", () => {
    expect(normalizeNumberTokens("갈전리 산 12")).toBe("갈전리 산12");
  });
});

describe("extractSido", () => {
  it("선두 시도 분리 + 표준화", () => {
    expect(extractSido("서울 강남구 테헤란로 152")).toEqual({
      sido: "서울특별시",
      rest: "강남구 테헤란로 152",
    });
  });
  it("시도 없으면 rest 그대로", () => {
    expect(extractSido("강남구 테헤란로 152")).toEqual({
      sido: "",
      rest: "강남구 테헤란로 152",
    });
  });
});

describe("key 생성", () => {
  it("서울/서울시/서울특별시가 같은 도로명 키로 수렴", () => {
    const a = roadKeyOf("서울", "강남구", "테헤란로", "152");
    const b = roadKeyOf("서울시", "강남구", "테헤란로", "152");
    const c = roadKeyOf("서울특별시", "강남구", "테헤란로", "152");
    expect(a).toBe("서울|강남구|테헤란로|152");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
  it("지번 키", () => {
    expect(jibunKeyOf("서울특별시", "강남구", "역삼동", "737")).toBe(
      "서울|강남구|역삼동|737",
    );
  });
});
