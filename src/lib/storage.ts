// 우리 Supabase Storage 공개 URL의 공통 베이스. 버킷 이름을 붙여 prefix를 구성한다.
const STORAGE_PUBLIC_BASE =
  "https://owrvsqzlyjeylutwbdpi.supabase.co/storage/v1/object/public/";

// 우리 Supabase Storage(club-images 버킷) 공개 URL prefix.
// 사용자 입력 이미지 URL 검증에 사용 — 외부 URL·위험 스킴(javascript:/data: 등)을 fail-closed로 차단.
export const SUPABASE_STORAGE_PREFIX = `${STORAGE_PUBLIC_BASE}club-images/`;

// 광장 글 첨부 이미지(plaza-images 버킷) 공개 URL prefix.
export const PLAZA_STORAGE_PREFIX = `${STORAGE_PUBLIC_BASE}plaza-images/`;

/** 광장 이미지 URL이 우리 버킷에서 온 공개 URL인지 — 외부/위험 URL fail-closed 차단. */
export function isValidPlazaImageUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith(PLAZA_STORAGE_PREFIX) && url.length <= 512;
}

/**
 * 공개 URL → 버킷 내부 객체 경로. 우리 버킷의 공개 URL이 아니면 null.
 * (스토리지 객체 삭제 시 .remove()에 넘길 경로를 URL에서 역산하기 위함)
 */
export function storagePathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (typeof url !== "string") return null;
  const prefix = `${STORAGE_PUBLIC_BASE}${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  // 쿼리/프래그먼트 제거 후 경로만 추출. 업로드 시 인코딩됐을 수 있어 디코드.
  const rel = url.slice(prefix.length).split("?")[0].split("#")[0];
  if (!rel) return null;
  try {
    return decodeURIComponent(rel);
  } catch {
    return rel;
  }
}

// .remove()만 구조적으로 요구 — supabase 클라이언트 타입 전체를 끌어오지 않기 위함.
type StorageRemover = {
  storage: {
    from: (bucket: string) => { remove: (paths: string[]) => Promise<unknown> };
  };
};

/**
 * 주어진 공개 URL들에 해당하는 스토리지 객체를 best-effort로 삭제한다.
 * 콘텐츠(글·모임·사진 등) 삭제·교체 시 버킷에 고아 파일이 쌓이지 않도록 호출.
 *
 * - 우리 버킷 URL이 아닌 값은 무시한다.
 * - 스토리지 삭제 실패(RLS 거부·네트워크 등)가 콘텐츠 삭제 자체를 되돌리지 않도록
 *   예외를 삼킨다. 특히 plaza-images는 본인 파일만 삭제 가능하므로, 운영진이 타인
 *   글을 모더레이션 삭제할 땐 객체가 남을 수 있다(드문 케이스, 고아 잔존 허용).
 */
export async function removeStorageObjects(
  supabase: StorageRemover,
  bucket: string,
  urls: (string | null | undefined)[],
): Promise<void> {
  const paths = Array.from(
    new Set(
      urls
        .map((u) => storagePathFromPublicUrl(u, bucket))
        .filter((p): p is string => p !== null),
    ),
  );
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(paths);
  } catch {
    /* best-effort — 스토리지 정리 실패가 콘텐츠 삭제/수정을 막지 않음 */
  }
}
