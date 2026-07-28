// 실행 환경 판정 — 브라우저 탭인지, 홈 화면에 추가한 앱(standalone)인지.
// 푸시 지원 판정(usePushSubscription)과 앱 실행 스플래시(SplashIntro)가 함께 쓴다.
// 주의: iOS는 display-mode 미디어쿼리를 오래 지원하지 않아 navigator.standalone을 함께 봐야 한다.
// 두 벌로 복사하면 iOS 분기가 갈라지므로 반드시 이 파일 하나만 쓴다.

type IosNavigator = Navigator & { standalone?: boolean };

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as IosNavigator).standalone === true
  );
}
