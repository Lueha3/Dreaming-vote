// 우리 Supabase Storage(club-images 버킷) 공개 URL prefix.
// 사용자 입력 이미지 URL 검증에 사용 — 외부 URL·위험 스킴(javascript:/data: 등)을 fail-closed로 차단.
export const SUPABASE_STORAGE_PREFIX =
  "https://owrvsqzlyjeylutwbdpi.supabase.co/storage/v1/object/public/club-images/";

// 광장 글 첨부 이미지(plaza-images 버킷) 공개 URL prefix.
export const PLAZA_STORAGE_PREFIX =
  "https://owrvsqzlyjeylutwbdpi.supabase.co/storage/v1/object/public/plaza-images/";

/** 광장 이미지 URL이 우리 버킷에서 온 공개 URL인지 — 외부/위험 URL fail-closed 차단. */
export function isValidPlazaImageUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith(PLAZA_STORAGE_PREFIX) && url.length <= 512;
}
