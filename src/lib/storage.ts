// 우리 Supabase Storage(club-images 버킷) 공개 URL prefix.
// 사용자 입력 이미지 URL 검증에 사용 — 외부 URL·위험 스킴(javascript:/data: 등)을 fail-closed로 차단.
export const SUPABASE_STORAGE_PREFIX =
  "https://owrvsqzlyjeylutwbdpi.supabase.co/storage/v1/object/public/club-images/";
