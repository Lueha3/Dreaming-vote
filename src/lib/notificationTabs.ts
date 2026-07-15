/**
 * 알림 link 접두어 → 하단 탭 배지 매핑. 하단 탭바가 "광장/동아리/내정보"에
 * 새 소식이 있을 때 카카오톡 채팅탭처럼 숫자 배지를 보여주는 데 쓴다.
 * /api/notifications/tab-counts(집계)와 /api/notifications/read(탭 진입 시 읽음 처리)가
 * 이 표를 함께 참조 — 카테고리 정의를 한 곳에서만 바꾸면 됨.
 * 홈·멤버 탭은 대응하는 알림 카테고리가 없어 배지를 달지 않는다.
 * /manage/*·/notices 등 운영자 전용 링크는 하단 탭 소관이 아니라(헤더 햄버거 메뉴 영역)
 * 의도적으로 제외 — 헤더 알림 벨에서는 계속 보인다.
 *
 * lib/notifications.ts와 별도 파일인 이유: 그쪽은 prisma를 최상단에서 import하는
 * 서버 전용 모듈이라, 하단 탭바(클라이언트 컴포넌트)가 그대로 가져오면 번들에
 * prisma가 끼어들어 빌드가 깨진다. 이 파일은 상수·타입뿐이라 양쪽에서 안전하게 공유한다.
 */
export const NOTIFICATION_TAB_LINK_PREFIXES = {
  plaza: ["/prayer"],
  clubs: ["/clubs"],
  my: ["/my", "/start", "/join"],
} satisfies Record<string, readonly string[]>;

export type NotificationTabKey = keyof typeof NOTIFICATION_TAB_LINK_PREFIXES;

/** 알림이 읽음 처리될 때 window에 쏘는 이벤트 이름 — 헤더 벨과 하단 탭바 배지를 동기화한다. */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";
