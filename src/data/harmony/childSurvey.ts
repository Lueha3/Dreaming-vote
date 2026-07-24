/**
 * 아이 기질 검사 — 6차원 18문항 (부모 관찰 응답).
 *
 * 차원은 Thomas & Chess 기질 차원의 현대적 축약 (docs/blueharmony/03-ai-engine.md §2):
 * sensitivity(자극 민감도) · intensity(반응 강도) · persistence(지속성) ·
 * adaptability(적응 속도, 높음=빠른 적응) · activity(활동성) · regularity(규칙성)
 *
 * 응답 4점 빈도 척도(0~3), reverse 문항은 채점 시 반전.
 * 대전제: 기질에는 좋고 나쁨이 없다 — 결과 화면은 항상 강점을 함께 보여준다 (원칙 3).
 */
import type { SurveyItem } from "./parentSurvey";

export type ChildDim =
  | "sensitivity"
  | "intensity"
  | "persistence"
  | "adaptability"
  | "activity"
  | "regularity";

export const CHILD_DIM_LABELS: Record<ChildDim, string> = {
  sensitivity: "자극 민감도",
  intensity: "반응 강도",
  persistence: "지속성",
  adaptability: "적응 속도",
  activity: "활동성",
  regularity: "규칙성",
};

export const CHILD_SURVEY: SurveyItem<ChildDim>[] = [
  // ── sensitivity ──
  { id: "c1", axis: "sensitivity", text: "옷 태그, 소리, 냄새 같은 작은 자극에 예민하게 반응한다." },
  { id: "c2", axis: "sensitivity", text: "낯선 장소나 낯선 사람 앞에서 몸이 굳거나 뒤로 숨는다." },
  { id: "c3", axis: "sensitivity", text: "주변이 시끄럽거나 어수선해도 크게 개의치 않는다.", reverse: true },
  // ── intensity ──
  { id: "c4", axis: "intensity", text: "기쁘거나 화나면 온몸으로, 크게 표현한다." },
  { id: "c5", axis: "intensity", text: "울음이 한번 터지면 소리가 크고 오래간다." },
  { id: "c6", axis: "intensity", text: "감정 표현이 잔잔해서 속마음을 짐작하기 어렵다.", reverse: true },
  // ── persistence ──
  { id: "c7", axis: "persistence", text: "하고 싶은 것이 생기면 될 때까지 조르거나 매달린다." },
  { id: "c8", axis: "persistence", text: "놀이나 만들기를 시작하면 끝을 봐야 직성이 풀린다." },
  { id: "c9", axis: "persistence", text: "안 된다고 하면 금방 다른 것으로 관심을 돌린다.", reverse: true },
  // ── adaptability ──
  { id: "c10", axis: "adaptability", text: "새로운 환경(새 반, 새 장소)에 금방 스며든다." },
  { id: "c11", axis: "adaptability", text: "하던 일을 멈추고 다른 일로 넘어가는 전환이 어렵지 않다." },
  { id: "c12", axis: "adaptability", text: "계획이 갑자기 바뀌면 한참 힘들어한다.", reverse: true },
  // ── activity ──
  { id: "c13", axis: "activity", text: "잠시도 가만히 있지 못하고 몸을 움직인다." },
  { id: "c14", axis: "activity", text: "앉아서 하는 놀이보다 뛰고 구르는 놀이를 훨씬 좋아한다." },
  { id: "c15", axis: "activity", text: "그림, 퍼즐처럼 한자리에 앉아 하는 활동을 오래 한다.", reverse: true },
  // ── regularity ──
  { id: "c16", axis: "regularity", text: "먹고 자는 시간이 대체로 일정하다." },
  { id: "c17", axis: "regularity", text: "익숙한 순서(양치, 정리 같은 루틴)를 스스로 잘 지킨다." },
  { id: "c18", axis: "regularity", text: "컨디션(기분·낮잠·식사)이 날마다 들쭉날쭉하다.", reverse: true },
];
