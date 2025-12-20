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
  
  let data: any;
  try {
    data = await safeJson<any>(res);
  } catch (parseError) {
    // JSON 파싱 실패 시 친화적 에러
    console.debug("API parse error:", { input: String(input), status: res.status });
    throw new Error("서버 응답 오류. 잠시 후 다시 시도해주세요.");
  }
  
  if (!res.ok || data?.ok === false) {
    // 서버가 반환한 에러 메시지 사용, 없으면 기본 메시지
    const msg = data?.error || "요청 실패. 잠시 후 다시 시도해주세요.";
    console.debug("API error:", { input: String(input), status: res.status, error: msg });
    throw new Error(msg);
  }
  
  return data as T;
}

