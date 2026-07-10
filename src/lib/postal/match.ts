// 매칭 엔진 — 판별된 유형에 따라 입력 한 줄을 정규화 키로 환원하고
// AddressStore(샘플 메모리 or 운영 Postgres)에 질의해 나머지 표기를 채운다.
//
// 스펙 확정 사항: 우편번호→주소는 1:N(한 우편번호에 건물 수백). "대표주소 + 외 N건"
// 형태로 반환하며, 특정 1건으로 좁혀주지 않는다.

import type {
  AddressStore,
  ConvertResult,
  IndexedRecord,
} from "./types";
import { detectKind } from "./detect";
import {
  cleanRaw,
  extractSido,
  jibunKeyOf,
  normalizeNumberTokens,
  roadKeyOf,
  sidoShort,
} from "./normalize";

/** 도로명 토큰 판별: 대로/로/길로 끝나는 단어. */
function isRoadToken(t: string): boolean {
  return /(대로|로|길)$/.test(t);
}

/** 읍면동/가/리 토큰 판별. */
function isEmdToken(t: string): boolean {
  return /(동|가|리|읍|면)$/.test(t) && !/^\d/.test(t);
}

/** 지번 숫자 토큰 판별: 123, 123-4, 산12, 산12-3. */
function isJibunNumber(t: string): boolean {
  return /^(산)?\d+(-\d+)?$/.test(t);
}

/** 도로명 입력 → 도로명 매칭 키(실패 시 null). */
export function roadKeyFromInput(raw: string): string | null {
  const cleaned = normalizeNumberTokens(cleanRaw(raw));
  const { sido, rest } = extractSido(cleaned);
  const tokens = rest.split(" ").filter(Boolean);
  const roadIdx = tokens.findIndex(isRoadToken);
  if (roadIdx === -1) return null;
  const roadName = tokens[roadIdx];
  const buildingNo = tokens[roadIdx + 1];
  if (!buildingNo || !/^\d+(-\d+)?$/.test(buildingNo)) return null;
  const sigungu = tokens.slice(0, roadIdx).join(" ");
  return roadKeyOf(sido, sigungu, roadName, buildingNo);
}

/** 지번 입력 → 지번 매칭 키(실패 시 null). */
export function jibunKeyFromInput(raw: string): string | null {
  const cleaned = normalizeNumberTokens(cleanRaw(raw));
  const { sido, rest } = extractSido(cleaned);
  const tokens = rest.split(" ").filter(Boolean);
  // 뒤에서부터 지번 숫자 토큰을 찾는다.
  let jibunIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (isJibunNumber(tokens[i])) {
      jibunIdx = i;
      break;
    }
  }
  if (jibunIdx === -1) return null;
  const jibun = tokens[jibunIdx];
  // 지번 앞의 읍면동
  const emdIdx = tokens.slice(0, jibunIdx).findIndex(isEmdToken);
  if (emdIdx === -1) return null;
  const emd = tokens[emdIdx];
  const sigungu = tokens.slice(0, emdIdx).join(" ");
  return jibunKeyOf(sido, sigungu, emd, jibun);
}

/** 레코드 → 도로명 전체주소 문자열. */
export function formatRoadAddress(r: IndexedRecord): string {
  const bno =
    r.buildingSub > 0 ? `${r.buildingMain}-${r.buildingSub}` : `${r.buildingMain}`;
  const base = [r.sido, r.sigungu, r.roadName, (r.isBasement ? "지하 " : "") + bno]
    .filter(Boolean)
    .join(" ");
  return r.buildingName ? `${base} (${r.buildingName})` : base;
}

/** 레코드 → 지번 전체주소 문자열. */
export function formatJibunAddress(r: IndexedRecord): string {
  const jno =
    r.jibunSub > 0 ? `${r.jibunMain}-${r.jibunSub}` : `${r.jibunMain}`;
  const num = (r.isMountain ? "산" : "") + jno;
  return [r.sido, r.sigungu, r.emd, r.ri, num].filter(Boolean).join(" ");
}

function emptyResult(input: string): ConvertResult {
  return {
    input,
    kind: "unknown",
    status: "empty",
    roadAddress: "",
    jibunAddress: "",
    zipcode: "",
    buildingName: "",
    candidateCount: 0,
    note: "",
  };
}

function fromRecord(
  input: string,
  kind: ConvertResult["kind"],
  r: IndexedRecord,
): ConvertResult {
  return {
    input,
    kind,
    status: "matched",
    roadAddress: formatRoadAddress(r),
    jibunAddress: formatJibunAddress(r),
    zipcode: r.zipcode,
    buildingName: r.buildingName,
    candidateCount: 1,
    note: "",
  };
}

/** 우편번호(1:N) 결과 구성: 대표 1건 + 외 N건. */
function fromZipcode(input: string, records: IndexedRecord[]): ConvertResult {
  const rep = records[0];
  const extra = records.length - 1;
  const suffix = extra > 0 ? ` 외 ${extra}건` : "";
  return {
    input,
    kind: "zipcode",
    status: extra > 0 ? "ambiguous" : "matched",
    roadAddress: formatRoadAddress(rep) + suffix,
    jibunAddress: formatJibunAddress(rep) + suffix,
    zipcode: rep.zipcode,
    buildingName: rep.buildingName,
    candidateCount: records.length,
    note:
      extra > 0
        ? "우편번호 1개에 여러 건물이 속합니다. 대표주소만 표시합니다."
        : "",
  };
}

/**
 * 입력 한 줄을 변환한다. 유형 판별 → 키 생성 → store 질의 → 결과 구성.
 * store 없이도(키만 필요할 때) 호출 가능하지만 그 경우 unmatched 로 떨어진다.
 */
export function convertLine(raw: string, store: AddressStore): ConvertResult {
  const input = raw;
  const trimmed = raw.trim();
  if (!trimmed) return emptyResult(input);

  const kind = detectKind(trimmed);

  if (kind === "zipcode") {
    const recs = store.byZipcode(trimmed);
    if (recs.length) return fromZipcode(input, recs);
    return unmatched(input, "zipcode", "해당 우편번호를 찾지 못했습니다.");
  }

  if (kind === "road") {
    const key = roadKeyFromInput(trimmed);
    if (key) {
      const recs = store.byRoadKey(key);
      if (recs.length) return fromRecord(input, "road", recs[0]);
    }
    return partialFallback(input, "road", trimmed, store);
  }

  if (kind === "jibun") {
    const key = jibunKeyFromInput(trimmed);
    if (key) {
      const recs = store.byJibunKey(key);
      if (recs.length) return fromRecord(input, "jibun", recs[0]);
    }
    return partialFallback(input, "jibun", trimmed, store);
  }

  return unmatched(input, "unknown", "주소 형식을 인식하지 못했습니다.");
}

function unmatched(
  input: string,
  kind: ConvertResult["kind"],
  note: string,
): ConvertResult {
  return { ...emptyResult(input), kind, status: "unmatched", note };
}

/** 정확일치 실패 시 건물명·부분일치 스캔(2차). store.scan 미구현이면 unmatched. */
function partialFallback(
  input: string,
  kind: ConvertResult["kind"],
  trimmed: string,
  store: AddressStore,
): ConvertResult {
  if (!store.scan) {
    return unmatched(input, kind, "정확히 일치하는 주소를 찾지 못했습니다.");
  }
  const cleaned = normalizeNumberTokens(cleanRaw(trimmed));
  const { sido, rest } = extractSido(cleaned);
  const tokens = [sido ? sidoShort(sido) : "", ...rest.split(" ")].filter(
    Boolean,
  );
  const cands = store.scan(tokens);
  if (cands.length === 1) {
    return { ...fromRecord(input, kind, cands[0]), note: "유사매칭(참고)" };
  }
  if (cands.length > 1) {
    return {
      ...fromRecord(input, kind, cands[0]),
      status: "ambiguous",
      candidateCount: cands.length,
      note: `유사 후보 ${cands.length}건 중 대표 1건`,
    };
  }
  return unmatched(input, kind, "정확히 일치하는 주소를 찾지 못했습니다.");
}
