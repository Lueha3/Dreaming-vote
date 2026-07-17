/**
 * 짧은 터치 진동 — 토스처럼 하단 탭바·상단 메뉴 이동 시마다 촉각 피드백을 준다.
 *
 * 플랫폼 한계: Android(Chrome 계열)는 Vibration API를 지원하지만,
 * iOS Safari/WebKit은 홈 화면 PWA를 포함해 웹 콘텐츠에 진동 API를 아예 노출하지
 * 않는다 — 네이티브 앱이 아닌 이상 웹 코드로 우회할 방법이 없는 플랫폼 제약이다.
 * feature-detect로 iOS에서는 조용히 스킵하고, Android에서만 실제로 울린다.
 */
export function triggerHaptic(durationMs = 8) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(durationMs);
  } catch {
    /* 일부 브라우저는 권한/제스처 컨텍스트 밖 호출 시 예외를 던짐 — best-effort */
  }
}
