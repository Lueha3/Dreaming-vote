// 우편번호 조회 도구 — 공용 타입 정의.
// 순수 로직 계층(정규화·판별·매칭)과 API/UI가 공유한다.

/** 입력 한 줄의 판별 유형. */
export type AddressKind = "zipcode" | "road" | "jibun" | "unknown";

/** 건물 단위 원본 레코드(행안부 도로명주소 DB 전체분 1행 = 1건물). */
export interface BuildingRecord {
  /** 5자리 우편번호 */
  zipcode: string;
  sido: string; // 시도명 (예: 서울특별시)
  sigungu: string; // 시군구명 (예: 강남구) — 세종시 등은 빈 값 가능
  emd: string; // 읍면동명 (법정동)
  ri: string; // 리명 (없으면 빈 문자열)
  roadName: string; // 도로명 (예: 테헤란로)
  buildingMain: number; // 건물본번
  buildingSub: number; // 건물부번 (없으면 0)
  isBasement: boolean; // 지하 여부
  jibunMain: number; // 지번본번
  jibunSub: number; // 지번부번 (없으면 0)
  isMountain: boolean; // 산 여부
  buildingName: string; // 건물명 (없으면 빈 문자열)
}

/** 매칭 인덱스가 들고 있는 정규화 키가 붙은 레코드. */
export interface IndexedRecord extends BuildingRecord {
  /** 도로명 정규화 매칭 키 */
  roadKey: string;
  /** 지번 정규화 매칭 키 */
  jibunKey: string;
}

/** 한 줄 변환 결과. */
export interface ConvertResult {
  /** 입력 원문 (그대로 보존) */
  input: string;
  /** 판별된 입력 유형 */
  kind: AddressKind;
  /** 매칭 상태 */
  status: "matched" | "ambiguous" | "unmatched" | "empty";
  /** 도로명 전체주소 (매칭 시) */
  roadAddress: string;
  /** 지번 전체주소 (매칭 시) */
  jibunAddress: string;
  /** 5자리 우편번호 (매칭 시) */
  zipcode: string;
  /** 건물명 (있을 때) */
  buildingName: string;
  /**
   * 우편번호 입력처럼 1:N 인 경우 후보 건수. 대표 범위를 roadAddress/jibunAddress
   * 에 "대표주소 외 N건" 형태로 담는다.
   */
  candidateCount: number;
  /** 실패·모호 사유 (사용자 안내용) */
  note: string;
}

/** 매칭 엔진이 데이터에 질의하는 최소 인터페이스. 샘플(메모리)·운영(Postgres) 교체 지점. */
export interface AddressStore {
  /** 도로명 정규화 키로 조회 */
  byRoadKey(key: string): IndexedRecord[];
  /** 지번 정규화 키로 조회 */
  byJibunKey(key: string): IndexedRecord[];
  /** 우편번호로 조회 */
  byZipcode(zipcode: string): IndexedRecord[];
  /** 부분/유사 매칭용 후보 스캔 (선택 구현) */
  scan?(normalizedTokens: string[]): IndexedRecord[];
}
