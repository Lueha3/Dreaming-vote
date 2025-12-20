/**
 * 안전한 HTTP 요청 헬퍼
 * 
 * 서버가 HTML 에러 페이지를 반환하는 경우를 감지하고 로깅합니다.
 * UI가 크래시되는 것을 방지하기 위해 JSON 파싱 실패 시 원본 응답을 콘솔에 출력합니다.
 */

/**
 * 안전한 JSON 파싱
 * 응답이 JSON이 아닌 경우(HTML 에러 페이지 등)를 감지하고 로깅합니다.
 */
export async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("NON-JSON RESPONSE:", text);
    throw new Error("Response was not JSON (likely HTML error page).");
  }
}

/**
 * JSON API 호출 헬퍼
 * 
 * - 항상 JSON 응답을 기대하고 안전하게 파싱합니다
 * - 에러 발생 시 상세한 로깅을 제공합니다
 * - ok: false 응답도 에러로 처리합니다
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, { cache: "no-store", ...init });
  const data = await safeJson<any>(res);
  
  if (!res.ok || data?.ok === false) {
    const msg = data?.error ?? `HTTP ${res.status}`;
    console.error("API ERROR:", {
      input: String(input),
      status: res.status,
      data,
    });
    throw new Error(msg);
  }
  
  return data as T;
}

