// 주소 정규화 엔진 — 이 도구의 핵심 경쟁력(매칭률의 70%가 여기서 결정).
//
// 사람이 붙여넣는 주소는 "더럽다": 서울/서울시/서울특별시 혼용, 123번지 4호 vs 123-4,
// 괄호 안 법정동·동호수 섞임, 공백·전각·오타. 이 파일은 그 잡음을 걷어내
// 결정론적 매칭 키로 환원한다.

/** 시도명 표준화 맵 — 축약·구어 표기를 법정 표기로 통일. */
const SIDO_MAP: Record<string, string> = {
  서울: "서울특별시",
  서울시: "서울특별시",
  서울특별시: "서울특별시",
  부산: "부산광역시",
  부산시: "부산광역시",
  부산광역시: "부산광역시",
  대구: "대구광역시",
  대구시: "대구광역시",
  대구광역시: "대구광역시",
  인천: "인천광역시",
  인천시: "인천광역시",
  인천광역시: "인천광역시",
  광주: "광주광역시",
  광주시: "광주광역시",
  광주광역시: "광주광역시",
  대전: "대전광역시",
  대전시: "대전광역시",
  대전광역시: "대전광역시",
  울산: "울산광역시",
  울산시: "울산광역시",
  울산광역시: "울산광역시",
  세종: "세종특별자치시",
  세종시: "세종특별자치시",
  세종특별자치시: "세종특별자치시",
  경기: "경기도",
  경기도: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  강원특별자치도: "강원특별자치도",
  충북: "충청북도",
  충청북도: "충청북도",
  충남: "충청남도",
  충청남도: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전북특별자치도: "전북특별자치도",
  전남: "전라남도",
  전라남도: "전라남도",
  경북: "경상북도",
  경상북도: "경상북도",
  경남: "경상남도",
  경상남도: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
  제주특별자치도: "제주특별자치도",
};

/** 시도 표준 표기 → 매칭 키에 쓰는 짧은 코드(공백·이형태 흡수). */
const SIDO_SHORT: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

/** 전각 숫자·영문 → 반각, 유사문자 정리. */
function toHalfWidth(s: string): string {
  return s.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

/**
 * 1차 클린업: 전각→반각, 괄호·동호수 등 매칭에 방해되는 꼬리 제거, 공백 압축.
 * 원문 보존은 호출부 책임(여기 반환값은 매칭용).
 */
export function cleanRaw(raw: string): string {
  let s = toHalfWidth(raw).trim();
  // 괄호 블록 제거: (역삼동), (우성아파트) 등 — 도로명주소 참고항목/법정동
  s = s.replace(/[([{（【][^)\]}）】]*[)\]}）】]/g, " ");
  // 층·동·호·번지 뒤 상세 (아파트 동/호) 제거 — 단, 지번 "123-4"는 보존
  //   "101동 202호", "3층", "b1", "지하1층" 류
  s = s.replace(/(지하\s*)?\d+\s*층/g, " ");
  s = s.replace(/\d+\s*동\s*\d+\s*호/g, " ");
  s = s.replace(/\d+\s*호(?![-\d])/g, " ");
  // 마침표·쉼표·중점 → 공백
  s = s.replace(/[.,·ㆍ]/g, " ");
  // 공백 압축
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * 번지 표기 통일: "123번지 4호" / "123번 4" / "123 - 4" → "123-4",
 * "산 12" → "산12". 매칭 키 생성 직전에 적용.
 */
export function normalizeNumberTokens(s: string): string {
  let out = s;
  // "산" 뒤 공백 + 숫자 → 산숫자
  out = out.replace(/산\s+(\d)/g, "산$1");
  // "123번지 4호" / "123번지4호"
  out = out.replace(/(\d+)\s*번지\s*(\d+)\s*호?/g, "$1-$2");
  // "123번 4" (부번)
  out = out.replace(/(\d+)\s*번\s+(\d+)/g, "$1-$2");
  // 남은 "번지"/"번" 단독 제거
  out = out.replace(/(\d+)\s*번지/g, "$1");
  // 하이픈 주변 공백 제거: "123 - 4" → "123-4"
  out = out.replace(/(\d+)\s*-\s*(\d+)/g, "$1-$2");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

/** 시도 표준 표기 반환 (매칭 불가 시 원문 그대로). */
export function standardizeSido(token: string): string {
  return SIDO_MAP[token] ?? token;
}

/** 문자열 선두에서 시도 토큰을 떼어내 표준화. { sido, rest } 반환. */
export function extractSido(s: string): { sido: string; rest: string } {
  const parts = s.split(" ");
  if (parts.length && SIDO_MAP[parts[0]]) {
    return { sido: SIDO_MAP[parts[0]], rest: parts.slice(1).join(" ") };
  }
  return { sido: "", rest: s };
}

/** 시도 표준 표기를 매칭 키용 짧은 코드로. */
export function sidoShort(standardSido: string): string {
  return SIDO_SHORT[standardSido] ?? standardSido;
}

/**
 * 도로명 주소 → 매칭 키. 예: "서울특별시 강남구 테헤란로 152" → "서울|강남구|테헤란로|152".
 * 시군구가 없으면 생략. 건물번호는 본번-부번 그대로 유지.
 */
export function roadKeyOf(sido: string, sigungu: string, roadName: string, buildingNo: string): string {
  const parts = [sidoShort(standardizeSido(sido)), sigungu, roadName, buildingNo]
    .map((p) => p.replace(/\s+/g, ""))
    .filter(Boolean);
  return parts.join("|");
}

/**
 * 지번 주소 → 매칭 키. 예: "서울 강남구 역삼동 737" → "서울|강남구|역삼동|737".
 */
export function jibunKeyOf(sido: string, sigungu: string, emd: string, jibun: string): string {
  const parts = [sidoShort(standardizeSido(sido)), sigungu, emd, jibun]
    .map((p) => p.replace(/\s+/g, ""))
    .filter(Boolean);
  return parts.join("|");
}

/** 정규화 후 공백 토큰 배열 (부분/유사 매칭 스캔용). */
export function tokenize(raw: string): string[] {
  const cleaned = normalizeNumberTokens(cleanRaw(raw));
  const { sido, rest } = extractSido(cleaned);
  const tokens = rest.split(" ").filter(Boolean);
  return sido ? [sidoShort(sido), ...tokens] : tokens;
}
