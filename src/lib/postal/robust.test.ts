// 정제 규칙 보강 회귀 테스트 — 실무의 "더러운" 주소 케이스.
import { describe, it, expect } from "vitest";
import { cleanRaw, normalizeNumberTokens, extractSido } from "./normalize";
import { MemoryStore } from "./store";
import { SAMPLE_RECORDS } from "./sample-data";
import { convertLine } from "./match";

const store = new MemoryStore(SAMPLE_RECORDS);
const zip = (s: string) => convertLine(s, store).zipcode;

describe("cleanRaw 보강", () => {
  it("전각 공백 정리", () => {
    expect(cleanRaw("테헤란로　152")).toBe("테헤란로 152");
  });
  it("선두 목록 마커 제거", () => {
    expect(cleanRaw("1. 서울 강남구 테헤란로 152")).toBe("서울 강남구 테헤란로 152");
    expect(cleanRaw("- 서울 강남구 테헤란로 152")).toBe("서울 강남구 테헤란로 152");
  });
  it("원 숫자 목록기호 제거", () => {
    expect(cleanRaw("① 서울 강남구 테헤란로 152")).toBe("서울 강남구 테헤란로 152");
  });
  it("우편 접두(우)) 제거", () => {
    expect(cleanRaw("(우) 서울 강남구 테헤란로 152")).toBe("서울 강남구 테헤란로 152");
  });
  it("동호수 붙여쓴 것 제거", () => {
    expect(cleanRaw("올림픽로 300 101동202호")).toBe("올림픽로 300");
  });
  it("영문 층 표기(B1/3F) 제거", () => {
    expect(cleanRaw("세종대로 110 B1")).toBe("세종대로 110");
    expect(cleanRaw("세종대로 110 3F")).toBe("세종대로 110");
  });
  it("슬래시 구분 분해", () => {
    expect(cleanRaw("서울/강남구/테헤란로 152")).toBe("서울 강남구 테헤란로 152");
  });
});

describe("normalizeNumberTokens 보강", () => {
  it("부번 0 정규화", () => {
    expect(normalizeNumberTokens("테헤란로 152-0")).toBe("테헤란로 152");
    expect(normalizeNumberTokens("역삼동 산12-0")).toBe("역삼동 산12");
  });
});

describe("extractSido 보강 — 붙여쓴 시도", () => {
  it("서울시강남구 → 시도 분리", () => {
    expect(extractSido("서울시강남구 테헤란로 152")).toEqual({
      sido: "서울특별시",
      rest: "강남구 테헤란로 152",
    });
  });
  it("경기도성남시 → 시도 분리", () => {
    expect(extractSido("경기도성남시 분당구 불정로 6")).toEqual({
      sido: "경기도",
      rest: "성남시 분당구 불정로 6",
    });
  });
  it("도로명 세종대로는 오분리하지 않음", () => {
    expect(extractSido("세종대로 110")).toEqual({ sido: "", rest: "세종대로 110" });
  });
});

describe("실제 변환 — 보강 케이스가 매칭으로 이어지는지", () => {
  it("목록번호 + 괄호 법정동", () => {
    expect(zip("1. 서울 강남구 테헤란로 152 (역삼동)")).toBe("06236");
  });
  it("부번 0 붙은 건물번호", () => {
    expect(zip("서울 강남구 테헤란로 152-0")).toBe("06236");
  });
  it("동호수 붙여쓴 도로명", () => {
    expect(zip("서울 송파구 올림픽로 300 101동202호")).toBe("05551");
  });
  it("우편접두 + 전각공백", () => {
    expect(zip("(우) 서울　강남구　테헤란로 152")).toBe("06236");
  });
  it("붙여쓴 시도(서울시강남구)", () => {
    expect(zip("서울시강남구 테헤란로 152")).toBe("06236");
  });
});

describe("엑셀 여러 열(탭) 붙여넣기", () => {
  it("이름·전화·주소 3열 중 주소 셀을 변환", () => {
    const r = convertLine("홍길동\t010-1234-5678\t서울 강남구 테헤란로 152", store);
    expect(r.status).toBe("matched");
    expect(r.zipcode).toBe("06236");
    expect(r.input).toContain("홍길동"); // 원본 보존
  });
  it("주소가 앞 열이어도 처리", () => {
    const r = convertLine("서울 강남구 역삼동 737\t비고", store);
    expect(r.zipcode).toBe("06236");
  });
  it("주소 셀이 없으면 unmatched", () => {
    const r = convertLine("홍길동\t비고없음", store);
    expect(r.status).not.toBe("matched");
  });
});
