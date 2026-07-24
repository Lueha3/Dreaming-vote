/**
 * 부모 양육 성향 검사 — 2축 12문항.
 *
 * 축 설계 (docs/blueharmony/03-ai-engine.md §2):
 * - speed: 감정 반응 속도 (높음 = 자극에 즉각 반응, 회복도 빠른 편)
 * - style: 개입 방식 (높음 = 마음 읽기 우선 / 낮음 = 방향 제시·규칙 우선)
 *
 * 응답은 4점 빈도 척도(0~3). reverse 문항은 채점 시 (3 - 응답)으로 뒤집는다.
 * 화면 고지 원칙: 심리측정학적으로 타당화된 도구가 아닌 "참고용 프로파일" —
 * 타당화 공동연구는 로드맵 Phase 1~2 마일스톤.
 */
export type ParentAxis = "speed" | "style";

export type SurveyItem<Axis extends string> = {
  id: string;
  text: string;
  axis: Axis;
  reverse?: boolean;
};

export const PARENT_SCALE_LABELS = ["거의 없다", "가끔 그렇다", "자주 그렇다", "거의 항상"] as const;

export const PARENT_SURVEY: SurveyItem<ParentAxis>[] = [
  // ── speed: 감정 반응 속도 ──
  { id: "p1", axis: "speed", text: "아이가 말을 안 들으면, 생각보다 말이 먼저 나간다." },
  { id: "p2", axis: "speed", text: "아이 행동에 욱했다가 금방 후회한 적이 이번 주에도 있다." },
  { id: "p3", axis: "speed", text: "갈등 상황에서 일단 한 박자 쉬고 나서 말하는 편이다.", reverse: true },
  { id: "p4", axis: "speed", text: "아이가 떼를 쓰면 내 목소리도 빠르게 커진다." },
  { id: "p5", axis: "speed", text: "화가 나도 겉으로는 잘 드러나지 않는다는 말을 듣는다.", reverse: true },
  { id: "p6", axis: "speed", text: "아이 감정이 격해지면 나도 같이 격해진다." },
  // ── style: 개입 방식 ──
  { id: "p7", axis: "style", text: "훈육할 때 아이 기분보다 '해야 할 일'을 먼저 말하게 된다.", reverse: true },
  { id: "p8", axis: "style", text: "아이가 울면 이유를 따지기 전에 마음부터 읽어주려 한다." },
  { id: "p9", axis: "style", text: "규칙과 약속은 예외 없이 지키게 하는 편이다.", reverse: true },
  { id: "p10", axis: "style", text: "아이 말이 길어져도 끊지 않고 끝까지 듣고 나서 내 말을 한다." },
  { id: "p11", axis: "style", text: "“그래서 어떻게 할 건데?”처럼 해결책부터 묻는 편이다.", reverse: true },
  { id: "p12", axis: "style", text: "아이가 혼날 행동을 했을 때도, 먼저 그 마음이 궁금하다." },
];
