"use client";

import { useEffect, useState } from "react";

// 스플래시 총 길이(globals.css의 splashLock/splashOut 타이밍과 맞춰야 한다) + 여유.
// 이 시간이 지나면 DOM에서 제거한다 — CSS가 이미 화면에서 치웠으므로 시각적 변화는 없다.
const SPLASH_MS = 1900;

/**
 * 앱 실행 스플래시 — 홈 화면에 추가한 앱을 켤 때 교회 로고가 잠깐 떴다 사라진다.
 * 로고 심볼만 보이다가 '꿈꾸는교회' 워드마크가 펼쳐지고, 다시 감겨 들어간 뒤 앱으로 넘어간다.
 *
 * 노출 판정은 이 컴포넌트가 아니라 layout.tsx <head>의 인라인 스크립트가 첫 페인트 전에 끝낸다
 * (html.splash-on 클래스). 그래서:
 *   - 일반 브라우저 방문자에겐 CSS가 display:none으로 막아 번쩍임이 전혀 없고,
 *   - 앱 실행 시엔 하이드레이션을 기다리지 않고 첫 페인트부터 바로 보인다.
 *
 * 애니메이션·해제는 전부 CSS가 한다(JS가 죽어도 화면이 잠기지 않는 폴백).
 * 여기 useEffect는 끝난 뒤 DOM을 치우는 정리 역할만 한다.
 * SSR과 첫 클라 렌더의 트리를 동일하게 유지해야 하므로 처음엔 항상 렌더한다(하이드레이션 불일치 방지).
 */
export function SplashIntro() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDone(true), SPLASH_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div className="splash-intro" aria-hidden>
      <div className="splash-zoom">
        <div className="splash-lock">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dreaming-church.png" alt="" className="splash-logo" />
        </div>
      </div>
      <p className="splash-foot">DREAMING CHURCH YOUTH</p>
    </div>
  );
}
