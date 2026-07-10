// 우편번호 조회 도구 — 공개 진입점.
// 여러 줄(수천~수만 건) 일괄 변환 + 엑셀 붙여넣기용 TSV 직렬화.

import type { AddressStore, ConvertResult } from "./types";
import { convertLine } from "./match";

export * from "./types";
export { convertLine } from "./match";
export { MemoryStore, indexRecord } from "./store";
export { detectKind } from "./detect";
export { SAMPLE_RECORDS } from "./sample-data";

/** 붙여넣은 텍스트를 줄 단위로 쪼갠다(CRLF/CR/LF 대응, 원문 보존). */
export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

/** 여러 줄 일괄 변환. 빈 줄은 그대로 통과(원문-결과 행 정렬 유지). */
export function convertMany(text: string, store: AddressStore): ConvertResult[] {
  return splitLines(text).map((line) => convertLine(line, store));
}

const HEADER = ["원본", "도로명주소", "지번주소", "우편번호", "건물명", "상태"];

function statusLabel(s: ConvertResult["status"]): string {
  switch (s) {
    case "matched":
      return "성공";
    case "ambiguous":
      return "여러건";
    case "unmatched":
      return "실패";
    case "empty":
      return "";
  }
}

/** 결과 → 탭 구분 TSV(엑셀 열 붙여넣기용). 헤더 포함. */
export function toTSV(results: ConvertResult[], withHeader = true): string {
  const rows = results.map((r) =>
    [
      r.input,
      r.roadAddress,
      r.jibunAddress,
      r.zipcode,
      r.buildingName,
      statusLabel(r.status),
    ]
      .map((c) => c.replace(/\t/g, " ").replace(/\r?\n/g, " "))
      .join("\t"),
  );
  return (withHeader ? [HEADER.join("\t"), ...rows] : rows).join("\n");
}

/** 실패·모호 행만 TSV 로. */
export function failuresToTSV(results: ConvertResult[]): string {
  return toTSV(
    results.filter((r) => r.status === "unmatched" || r.status === "ambiguous"),
    true,
  );
}

/** 변환 통계. */
export function summarize(results: ConvertResult[]) {
  let matched = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let empty = 0;
  for (const r of results) {
    if (r.status === "matched") matched++;
    else if (r.status === "ambiguous") ambiguous++;
    else if (r.status === "unmatched") unmatched++;
    else empty++;
  }
  const total = matched + ambiguous + unmatched;
  const rate = total ? Math.round(((matched + ambiguous) / total) * 1000) / 10 : 0;
  return { total, matched, ambiguous, unmatched, empty, matchRate: rate };
}
