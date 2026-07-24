/**
 * 조합 아키타입 시스템 — 부모 4유형 × 아이 4유형 = 조합 16종.
 *
 * 원칙 (docs/blueharmony/03-ai-engine.md §2):
 * - 아키타입 이름은 "표시용 마케팅 언어"다. 내부 로직·저장은 항상 차원 원점수를 쓴다.
 * - 기질에는 좋고 나쁨이 없다 — 모든 유형·조합은 강점(strength)을 반드시 포함한다 (No-Blame).
 * - clashes 어휘는 SOS 상황 프리셋 12종(02-product.md §3 엔진 A)과 동일한 분류를 쓴다 —
 *   검사 결과가 곧 코치·충돌 지도의 컨텍스트가 되도록.
 */

export type ParentTypeId = "volcano" | "wave" | "lighthouse" | "lake";
export type ChildTypeId = "glass" | "firework" | "rocket" | "stream";

export type ParentType = {
  id: ParentTypeId;
  name: string;
  tagline: string;
  desc: string;
  strength: string;
  watchout: string;
};

export type ChildType = {
  id: ChildTypeId;
  name: string;
  tagline: string;
  desc: string;
  strength: string;
  needs: string; // 이 기질이 부모에게 바라는 것
};

export type Combo = {
  parent: ParentTypeId;
  child: ChildTypeId;
  headline: string; // 조합 케미 한 줄
  desc: string;
  clashes: [string, string, string]; // 충돌 예상 지점 3 (SOS 프리셋 어휘)
  strength: string; // 조합 강점 1 (반드시 포함)
  firstMove: string; // 갈등 순간의 첫수 팁 1문장
};

export const PARENT_TYPES: Record<ParentTypeId, ParentType> = {
  volcano: {
    id: "volcano",
    name: "화산형",
    tagline: "반응은 빠르게, 후회도 빠르게",
    desc: "자극에 즉각 반응하고 방향을 명확하게 제시하는 부모예요. 말이 먼저 나가서 후회할 때도 있지만, 그만큼 회복 대화도 빠르고 진심이 잘 전달돼요.",
    strength: "화해가 빠르고 진심이 뜨겁게 전달되는 부모",
    watchout: "폭발 직전 3초 — 그 한 박자가 이 유형의 승부처예요",
  },
  wave: {
    id: "wave",
    name: "파도형",
    tagline: "아이 감정과 함께 크게 출렁이는",
    desc: "아이의 마음을 빠르게 알아차리고 함께 크게 반응하는 부모예요. 공감의 진폭이 커서 아이가 이해받는다고 느끼지만, 감정이 함께 요동쳐 중심을 잃기 쉬워요.",
    strength: "아이가 '엄마·아빠는 내 편'이라고 확신하게 만드는 공감력",
    watchout: "같이 출렁일 때 배의 키를 놓지 않는 것 — 공감 뒤에 한계 설정 한 문장",
  },
  lighthouse: {
    id: "lighthouse",
    name: "등대형",
    tagline: "흔들리지 않는 일관된 신호",
    desc: "차분하게 원칙과 방향을 비추는 부모예요. 감정에 잘 휩쓸리지 않아 아이에게 예측 가능한 환경을 주지만, 규칙이 앞서 마음 읽기가 뒤로 밀릴 수 있어요.",
    strength: "일관성 — 아이가 세상을 안전하다고 믿게 만드는 힘",
    watchout: "규칙을 말하기 전에 감정 한 줄 먼저 — \"속상했구나, 그리고 약속은 지키자\"",
  },
  lake: {
    id: "lake",
    name: "잔잔호수형",
    tagline: "기다려주는 넓고 깊은 수용",
    desc: "아이의 속도를 존중하고 오래 기다려주는 부모예요. 아이가 자기 페이스로 자라게 하는 힘이 있지만, 한계선이 흐려지면 아이가 오히려 불안해질 수 있어요.",
    strength: "아이의 있는 그대로를 받아주는 안정감",
    watchout: "기다림과 방임의 경계 — 지켜야 할 선은 짧고 분명하게",
  },
};

export const CHILD_TYPES: Record<ChildTypeId, ChildType> = {
  glass: {
    id: "glass",
    name: "유리병",
    tagline: "깊게 느끼고 천천히 여는",
    desc: "자극에 민감하고 새로운 것에 천천히 적응하는 아이예요. 위협 앞에서 맞서기보다 얼어붙거나 마음의 문을 닫는 쪽이고, 감정을 읽어주면 빠르게 풀려요.",
    strength: "섬세한 관찰력과 깊은 공감 — 한번 연 마음은 누구보다 깊어요",
    needs: "예고 없는 전환 금지, 큰소리 대신 낮은 목소리, 그리고 기다림",
  },
  firework: {
    id: "firework",
    name: "불꽃놀이",
    tagline: "짧고 화려하게 터지는",
    desc: "감정을 크고 강렬하게 표현하는 아이예요. 폭발은 요란하지만 뒤끝이 없고, 좋아하는 것 앞에서는 세상에서 가장 눈부신 에너지를 보여줘요.",
    strength: "표현이 선명해서 속을 숨기지 않는 정직한 감정",
    needs: "터지는 중엔 설득 금지 — 다 타고 내려올 때까지 곁에 있어주기",
  },
  rocket: {
    id: "rocket",
    name: "로켓",
    tagline: "몸이 먼저 출발하는",
    desc: "에너지가 넘치고 몸이 생각보다 먼저 움직이는 아이예요. 가만히 앉아 있는 것 자체가 과제지만, 움직일 공간만 있으면 스스로 조절을 배워가요.",
    strength: "추진력과 호기심 — 시켜서가 아니라 스스로 부딪혀 배우는 아이",
    needs: "\"하지 마\"보다 \"이걸 해\" — 에너지를 막지 말고 방향을 주기",
  },
  stream: {
    id: "stream",
    name: "시냇물",
    tagline: "순하게 흐르지만 신호는 작은",
    desc: "적응이 빠르고 리듬이 일정한 순한 기질이에요. 키우기 수월하다는 말을 듣지만, 힘든 신호를 작게 내는 편이라 마음의 SOS를 놓치기 쉬워요.",
    strength: "유연함과 안정된 리듬 — 어디서든 제 흐름을 찾는 아이",
    needs: "괜찮아 보여도 하루 한 번 마음 안부 묻기 — 작은 신호를 크게 들어주기",
  },
};

/** 조합 16종 — clashes는 SOS 프리셋 12종 어휘만 사용 */
export const COMBOS: Combo[] = [
  // ── 화산형 부모 ──
  {
    parent: "volcano", child: "glass",
    headline: "불꽃은 빨리 붙지만, 회복 대화도 빠른 조합",
    desc: "빠르고 큰 반응이 민감한 아이에겐 천둥처럼 느껴져요. 아이가 얼어붙으면 화산은 '무시당했다'고 오해하기 쉽지만 — 그건 반항이 아니라 이 기질의 피난 방식이에요.",
    clashes: ["미디어 종료", "아침 준비", "공공장소"],
    strength: "감정 표현이 풍부한 집 — 화해가 진심으로 전달돼요",
    firstMove: "목소리가 커지기 전에 한 박자: \"엄마(아빠)가 지금 좀 급했다\" 하고 톤부터 내려놓기",
  },
  {
    parent: "volcano", child: "firework",
    headline: "폭죽 공장 — 서로 뜨겁고, 서로 금방 식는",
    desc: "둘 다 크게 터지고 뒤끝이 없어요. 문제는 동시에 터질 때 — 소리 대결이 되면 승자 없이 둘 다 지쳐요. 한 명만 볼륨을 내려도 판이 달라져요.",
    clashes: ["떼쓰기·드러눕기", "형제·남매 다툼", "말대답·반항"],
    strength: "서로의 화가 오래가지 않는다는 걸 서로 알아요 — 회복 탄력이 큰 집",
    firstMove: "아이가 터지면 같이 터지지 말고 실황 중계: \"우리 이안이 지금 몹시 화가 났구나\"",
  },
  {
    parent: "volcano", child: "rocket",
    headline: "추진력 × 추진력 — 방향만 맞추면 최강",
    desc: "빠른 부모와 빠른 아이. 속도는 잘 맞는데 방향이 어긋나는 순간 정면충돌해요. 금지어(하지 마, 안 돼)가 많아질수록 로켓은 더 세게 밀어붙여요.",
    clashes: ["공공장소", "던지기·때리기", "잠자리 거부"],
    strength: "함께 몸으로 노는 순간, 세상에서 제일 신나는 팀",
    firstMove: "\"뛰지 마!\" 대신 \"여기까지만 달리자\" — 금지를 방향으로 바꿔 말하기",
  },
  {
    parent: "volcano", child: "stream",
    headline: "큰 목소리가 작은 신호를 덮기 쉬운 조합",
    desc: "순한 아이는 화산의 속도에 맞춰주는 것처럼 보여요. 하지만 맞춰주는 것과 괜찮은 것은 달라요 — 이 조합의 위험은 갈등이 아니라 '조용한 삼킴'이에요.",
    clashes: ["숙제·학습 거부", "밥 안 먹기", "거짓말"],
    strength: "부모의 에너지가 아이의 잔잔한 일상에 즐거운 파동을 만들어요",
    firstMove: "하루 한 번, 혼낼 일 없을 때 묻기: \"오늘 마음은 몇 점이야?\"",
  },
  // ── 파도형 부모 ──
  {
    parent: "wave", child: "glass",
    headline: "깊이 이해받는 아이, 함께 잠기기 쉬운 부모",
    desc: "민감한 아이의 마음을 가장 잘 읽어주는 조합이에요. 대신 아이의 불안에 부모가 같이 출렁이면, 아이는 '내 감정이 위험한 거구나'라고 배울 수 있어요.",
    clashes: ["등원·등교 거부", "잠자리 거부", "공공장소"],
    strength: "아이가 '내 마음을 말해도 안전하다'고 배우는 집",
    firstMove: "공감 뒤에 닻 내리기: \"무서웠구나. 그리고 엄마(아빠)가 있으니 괜찮아\"",
  },
  {
    parent: "wave", child: "firework",
    headline: "감정의 태풍 — 진폭이 두 배가 되는 조합",
    desc: "아이의 큰 감정에 부모의 큰 공감이 얹히면 장면이 실제보다 커져요. 공감은 이 조합의 무기이자, 과열의 원인이에요.",
    clashes: ["떼쓰기·드러눕기", "미디어 종료", "형제·남매 다툼"],
    strength: "슬픔도 기쁨도 함께 크게 — 감정을 숨기지 않는 집",
    firstMove: "공감은 문장 하나로 압축: \"진짜 속상하지\" — 그리고 다음 문장은 선택지로",
  },
  {
    parent: "wave", child: "rocket",
    headline: "마음을 묻는 부모, 몸이 먼저인 아이",
    desc: "\"왜 그랬어? 기분이 어땠어?\"라는 질문에 로켓은 대답할 말이 없어요 — 생각보다 몸이 먼저였으니까. 마음 읽기가 때로 심문처럼 느껴질 수 있는 조합이에요.",
    clashes: ["던지기·때리기", "공공장소", "숙제·학습 거부"],
    strength: "행동 뒤의 마음을 언젠가 말로 꺼내게 해주는 유일한 어른이 될 수 있어요",
    firstMove: "질문 대신 몸부터: 같이 뛰고 난 다음에 \"아까 무슨 일이었어?\"",
  },
  {
    parent: "wave", child: "stream",
    headline: "잔잔한 물에 따뜻한 물결 — 가장 평화로운 조합",
    desc: "갈등 자체가 적은 조합이에요. 다만 부모의 풍부한 감정 표현에 아이가 맞춰주느라 자기 감정을 미루는지, 평화가 진짜인지 가끔 확인이 필요해요.",
    clashes: ["숙제·학습 거부", "미디어 종료", "아침 준비"],
    strength: "일상이 안정적이고 정서적 온도가 따뜻한 집",
    firstMove: "\"우리 이안이는 순해서 걱정 없어\" 금지 — 순한 아이의 마음도 매일 묻기",
  },
  // ── 등대형 부모 ──
  {
    parent: "lighthouse", child: "glass",
    headline: "예측 가능성이라는 최고의 선물",
    desc: "일관된 부모는 민감한 아이에게 가장 안전한 환경이에요. 단, 규칙이 감정보다 먼저 나오면 아이는 '규칙은 아는데 마음이 힘든' 상태로 혼자 남아요.",
    clashes: ["등원·등교 거부", "밥 안 먹기", "잠자리 거부"],
    strength: "규칙적이고 예측 가능한 일상 — 유리병 기질이 가장 안심하는 구조",
    firstMove: "규칙 문장 앞에 감정 문장 하나: \"가기 싫구나. 그리고 학교는 가는 거야\"",
  },
  {
    parent: "lighthouse", child: "firework",
    headline: "폭풍우 속의 등대 — 서로가 서로의 훈련장",
    desc: "아이의 큰 감정이 차분한 부모에겐 '과하다'고 느껴지고, 아이에겐 부모의 침착함이 '내 마음에 관심 없음'으로 읽힐 수 있어요. 온도 차가 곧 갈등 지점이에요.",
    clashes: ["떼쓰기·드러눕기", "말대답·반항", "형제·남매 다툼"],
    strength: "아이는 감정을, 부모는 안정을 — 서로에게 없는 것을 배우는 조합",
    firstMove: "차분한 해결책 전에 감정의 크기부터 인정: \"그만큼 화가 났구나\"",
  },
  {
    parent: "lighthouse", child: "rocket",
    headline: "규칙과 에너지의 협상 테이블",
    desc: "'앉아서, 차례대로, 약속대로'가 로켓에겐 가장 어려운 주문이에요. 규칙을 줄이는 게 아니라, 규칙 안에 움직일 공간을 설계하는 게 이 조합의 기술이에요.",
    clashes: ["공공장소", "숙제·학습 거부", "아침 준비"],
    strength: "에너지에 방향을 줄 수 있는 유일한 조합 — 루틴이 잡히면 폭발적으로 성장해요",
    firstMove: "\"조용히 해\" 대신 임무 주기: \"저기까지 카트 미는 건 네 담당이야\"",
  },
  {
    parent: "lighthouse", child: "stream",
    headline: "모범 답안처럼 보이는, 그래서 조심할 조합",
    desc: "규칙 잘 지키는 부모와 순한 아이 — 겉보기엔 완벽해요. 위험은 단 하나, '별문제 없음'이 기본값이 되어 아이의 작은 신호가 안건에 오르지 못하는 것.",
    clashes: ["거짓말", "숙제·학습 거부", "미디어 종료"],
    strength: "안정된 리듬과 신뢰 — 사춘기의 파도를 견딜 기초 체력이 탄탄한 집",
    firstMove: "일주일에 한 번 규칙 점검 회의에 아이 안건 먼저: \"바꾸고 싶은 규칙 있어?\"",
  },
  // ── 잔잔호수형 부모 ──
  {
    parent: "lake", child: "glass",
    headline: "천천히 여는 아이를 끝까지 기다려주는",
    desc: "민감한 아이의 속도를 존중하는 최고의 짝이에요. 다만 세상은 호수처럼 기다려주지 않아서 — 등원 시간, 마감 시간 앞에서 기다림의 한계를 만나요.",
    clashes: ["아침 준비", "등원·등교 거부", "공공장소"],
    strength: "아이가 제 속도로 마음을 여는 걸 지켜봐주는 인내",
    firstMove: "기다림에 예고 얹기: \"천천히 해도 돼. 시계 긴바늘이 6에 가면 나가는 거야\"",
  },
  {
    parent: "lake", child: "firework",
    headline: "큰 불꽃을 다 받아주는 넓은 수면",
    desc: "아이의 폭발을 받아주는 품이 넓은 조합이에요. 하지만 매번 다 받아주면 불꽃은 더 커져요 — 수용과 허용은 다르다는 게 이 조합의 핵심 과제예요.",
    clashes: ["떼쓰기·드러눕기", "미디어 종료", "던지기·때리기"],
    strength: "아이가 어떤 감정을 보여도 버림받지 않는다고 믿는 집",
    firstMove: "감정은 다 받고 행동엔 선 긋기: \"화나는 건 괜찮아. 던지는 건 안 돼\"",
  },
  {
    parent: "lake", child: "rocket",
    headline: "호수 위의 모터보트 — 평화롭거나 아찔하거나",
    desc: "느긋한 부모와 돌진하는 아이. 부모의 여유가 아이에겐 자유롭지만, 위험 상황(도로, 계단, 공공장소)에서는 브레이크가 한 박자 늦기 쉬워요.",
    clashes: ["공공장소", "던지기·때리기", "잠자리 거부"],
    strength: "아이의 에너지를 억누르지 않아 자율성이 크게 자라는 집",
    firstMove: "안전 규칙만은 즉시·짧게·매번 같게: \"손! 잡고 건너는 거야\"",
  },
  {
    parent: "lake", child: "stream",
    headline: "가장 조용한 집 — 물결이 없다는 게 유일한 물결",
    desc: "둘 다 잔잔해서 갈등이 거의 없어요. 이 조합의 숙제는 싸움이 아니라 표현 — 서로 괜찮아 보여서, 정말 중요한 마음이 말로 나올 기회가 적어요.",
    clashes: ["숙제·학습 거부", "미디어 종료", "거짓말"],
    strength: "존중과 평화가 기본값인 집 — 정서적 안전기지가 이미 완성되어 있어요",
    firstMove: "저녁마다 한 가지씩만 묻기: \"오늘 제일 좋았던 순간은 언제야?\"",
  },
];

export function getParentType(id: ParentTypeId): ParentType {
  return PARENT_TYPES[id];
}
export function getChildType(id: ChildTypeId): ChildType {
  return CHILD_TYPES[id];
}
export function getCombo(parent: ParentTypeId, child: ChildTypeId): Combo {
  // COMBOS는 4×4 전조합을 담고 있어 항상 존재한다 (scoring.test.ts에서 완전성 검증).
  return COMBOS.find((c) => c.parent === parent && c.child === child)!;
}
