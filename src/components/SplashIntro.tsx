"use client";

import { useEffect, useState } from "react";

// 애니메이션이 스스로 끝났다고 알려주지 못한 경우의 안전망(정지 상태로 남는 것 방지).
// 정상 경로는 splashOut 애니메이션 종료 이벤트로 치운다.
const SPLASH_FAILSAFE_MS = 8000;

/**
 * 앱 실행 스플래시 — 홈 화면에 추가한 앱을 켤 때 교회 로고가 잠깐 떴다 사라진다.
 * 로고 심볼만 보이다가 '꿈꾸는교회' 워드마크가 펼쳐지고, 다시 감겨 들어간 뒤 앱으로 넘어간다.
 *
 * 노출 판정과 재생 시작은 이 컴포넌트가 아니라 layout.tsx <head>의 인라인 스크립트가 한다
 * (html.splash-on = 보일 것인가 / html.splash-go = 지금부터 돌려라). 그래서:
 *   - 일반 브라우저 방문자에겐 CSS가 display:none으로 막아 번쩍임이 전혀 없고,
 *   - 앱 실행 시엔 하이드레이션을 기다리지 않고 첫 페인트부터 바로 보이며,
 *   - 화면이 실제로 보이기 전에 애니메이션이 혼자 다 돌아버리는 일이 없다.
 *
 * 로고는 CSS data URI로 인라인돼 있어 별도 네트워크 요청이 없다(globals.css .splash-logo 주석 참고).
 * 애니메이션·해제는 전부 CSS가 하므로 JS가 죽어도 화면이 잠기지 않는다.
 * 여기 상태는 끝난 뒤 DOM을 치우는 정리 역할만 한다 —
 * SSR과 첫 클라 렌더의 트리를 동일하게 유지해야 하므로 처음엔 항상 렌더한다(하이드레이션 불일치 방지).
 */
export function SplashIntro() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDone(true), SPLASH_FAILSAFE_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      className="splash-intro"
      aria-hidden
      // 페이드아웃이 실제로 끝난 시점에 DOM에서 제거 — 재생 시작이 늦어져도 중간에 잘리지 않는다.
      onAnimationEnd={(e) => {
        if (e.animationName === "splashOut") setDone(true);
      }}
    >
      <div className="splash-zoom">
        <div className="splash-lock">
          <div className="splash-logo" />
        </div>
      </div>
      <p className="splash-foot">DREAMING CHURCH YOUTH</p>
    </div>
  );
}
