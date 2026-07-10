// 입력 한 줄의 유형 자동 판별 — 사용자가 모드를 고를 필요 없게("클릭 한 번") 하는 핵심.
//
//   5자리 숫자만        → zipcode
//   '로/길/대로' + 번호  → road
//   그 밖의 주소         → jibun
//   내용 없음/판별불가   → unknown

import type { AddressKind } from "./types";
import { cleanRaw } from "./normalize";

const ZIP_ONLY = /^\d{5}$/;
// 도로명 접미(로/길/대로) — 숫자 건물번호가 뒤따르는 경우가 전형적.
const ROAD_HINT = /(대로|로|길)\s*\d/;
// 도로명 접미가 주소 성분으로 등장(번호 없이도) — "테헤란로", "compassvej" 등 예외 대비
const ROAD_SUFFIX = /(대로|[가-힣]로|[가-힣]길)(\s|$|\d)/;

/** 한 줄의 주소 유형을 판별한다. */
export function detectKind(raw: string): AddressKind {
  const trimmed = raw.trim();
  if (!trimmed) return "unknown";

  // 우편번호: 순수 5자리 (구 우편번호 6자리는 지원 안 함)
  if (ZIP_ONLY.test(trimmed)) return "zipcode";

  const cleaned = cleanRaw(trimmed);

  // 도로명: '로/길/대로' 뒤에 건물번호가 오는 형태를 우선 인정
  if (ROAD_HINT.test(cleaned)) return "road";

  // 숫자가 전혀 없으면 판별 불가(동/도로명만 있고 번호 없음) — 매칭 단계에서 처리
  const hasNumber = /\d/.test(cleaned);

  // 도로명 접미만 있고 번호가 뒤에 붙지 않은 경우도 도로명으로 취급
  if (ROAD_SUFFIX.test(cleaned) && hasNumber) return "road";

  // 나머지 주소는 지번으로 간주
  if (hasNumber) return "jibun";

  return "unknown";
}
