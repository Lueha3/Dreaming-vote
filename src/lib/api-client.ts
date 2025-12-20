/**
 * 안전한 JSON 파싱 헬퍼
 * 
 * 서버가 HTML 에러 페이지를 반환하는 경우를 감지하고 로깅합니다.
 * UI가 크래시되는 것을 방지하기 위해 JSON 파싱 실패 시 원본 응답을 콘솔에 출력합니다.
 * 
 * 검증 방법:
 * 1. 브라우저에서 API URL 직접 열기 (예: http://localhost:3000/api/recruitments)
 *    - 화면에 JSON만 표시되어야 정상
 *    - HTML이 표시되면 서버 에러 페이지 반환 중
 * 2. DevTools → Network 탭에서 응답 확인
 *    - Response가 HTML이면 서버 에러 페이지
 * 3. 콘솔에서 "NON-JSON RESPONSE:" 로그 확인
 *    - 아래에 HTML이 출력되면 원인 추적 가능
 */
export async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("NON-JSON RESPONSE:", text);
    throw new Error("Response was not JSON. Server likely returned an HTML error page.");
  }
}

/**
 * API 호출 래퍼
 * JSON 응답을 보장하고 에러를 명확하게 처리합니다.
 */
export async function fetchApi<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, { ...options, cache: "no-store" });
  
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText} - ${url}`);
  }
  
  const data = await safeJson<T>(res);
  
  if (!res.ok || (data as any)?.ok === false) {
    const error = (data as any)?.error ?? "API error";
    throw new Error(error);
  }
  
  return data;
}

