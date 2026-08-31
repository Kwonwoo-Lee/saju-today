// saju-engine.js
// 정확한 명리학(사주) 계산 엔진. 절기 기준 만세력 계산은 lunar-javascript(6tail, MIT)에 위임하고,
// 이 파일은 진태양시 보정, 오행/십성 판정, 오늘의 운세 해석을 담당한다.
"use strict";

// ---------- 60갑자 기본 데이터 ----------
const STEM_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEM_ELEMENT = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];

const BRANCH_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCH_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_ELEMENT = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const BRANCH_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

const ELEMENT_KO = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const ELEMENT_HANJA = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];

// 상생(生): 목생화, 화생토, 토생금, 금생수, 수생목
const GENERATES = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
// 상극(克): 목극토, 토극수, 수극화, 화극금, 금극목
const CONTROLS = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

const LUCKY_NUMBERS = { water: [1, 6], fire: [2, 7], wood: [3, 8], metal: [4, 9], earth: [5, 10] };
const LUCKY_COLOR_NAME = { wood: "초록/청록", fire: "빨강/주황", earth: "황토/노랑", metal: "흰색/은색", water: "검정/남색" };

function stemIndex(hanja) { return STEM_HANJA.indexOf(hanja); }
function branchIndex(hanja) { return BRANCH_HANJA.indexOf(hanja); }
function isYangIndex(i) { return i % 2 === 0; }

// ---------- 진태양시(眞太陽時) 보정 ----------
// 표준시(KST)는 동경 135도를 기준으로 하지만, 실제 태양이 자오선을 통과하는 시각은
// 관측지의 경도와 태양의 균시차(equation of time)에 따라 달라진다.
// 보정(분) = 경도차 보정 + 균시차 보정
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

function equationOfTimeMinutes(date) {
  const N = dayOfYear(date);
  const B = ((2 * Math.PI) / 365) * (N - 81);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

function longitudeCorrectionMinutes(lng) {
  return (lng - 135) * 4; // 표준자오선 135°E 기준, 경도 1도당 4분
}

function trueSolarOffsetMinutes(date, lng) {
  return longitudeCorrectionMinutes(lng) + equationOfTimeMinutes(date);
}

function applyOffset(date, offsetMinutes) {
  return new Date(date.getTime() + Math.round(offsetMinutes * 60000));
}

// ---------- 십성(十神) 판정 ----------
// dayMasterHanja: 본인의 일간(日干) 한자, targetHanja: 비교 대상 천간 한자
const TEN_GOD_NAMES = {
  same_yy: "비견", same_yn: "겁재",
  gen_yy: "식신", gen_yn: "상관",
  ctrl_yy: "편재", ctrl_yn: "정재",
  ctrlBy_yy: "편관", ctrlBy_yn: "정관",
  genBy_yy: "편인", genBy_yn: "정인",
};

function tenGod(dayMasterHanja, targetHanja) {
  const di = stemIndex(dayMasterHanja);
  const ti = stemIndex(targetHanja);
  const dEl = STEM_ELEMENT[di], tEl = STEM_ELEMENT[ti];
  const sameYY = isYangIndex(di) === isYangIndex(ti);

  if (tEl === dEl) return sameYY ? TEN_GOD_NAMES.same_yy : TEN_GOD_NAMES.same_yn;
  if (GENERATES[dEl] === tEl) return sameYY ? TEN_GOD_NAMES.gen_yy : TEN_GOD_NAMES.gen_yn;
  if (CONTROLS[dEl] === tEl) return sameYY ? TEN_GOD_NAMES.ctrl_yy : TEN_GOD_NAMES.ctrl_yn;
  if (CONTROLS[tEl] === dEl) return sameYY ? TEN_GOD_NAMES.ctrlBy_yy : TEN_GOD_NAMES.ctrlBy_yn;
  if (GENERATES[tEl] === dEl) return sameYY ? TEN_GOD_NAMES.genBy_yy : TEN_GOD_NAMES.genBy_yn;
  return "?";
}

// 십성별 해석 (총운 / 재물운 / 애정운 / 건강운)
const TEN_GOD_INFO = {
  "비견": {
    group: "비겁",
    overall: "오늘은 남에게 기대기보다 자기 판단을 믿고 싶어지는 날입니다. 협력보다 독립적인 결정이 잘 맞습니다.",
    wealth: "큰 지출보다 스스로 벌고 스스로 쓰는 흐름이 유리합니다. 동업이나 공동 투자는 하루 미뤄도 좋습니다.",
    love: "혼자만의 시간이 편안하게 느껴집니다. 상대에게 맞추기보다 솔직한 의견을 말하는 편이 관계에 도움이 됩니다.",
    health: "체력은 안정적이지만 고집으로 무리하기 쉬운 날입니다. 몸이 보내는 신호를 무시하지 마세요.",
  },
  "겁재": {
    group: "비겁",
    overall: "경쟁심이 강해지는 날입니다. 추진력은 좋지만 주변과 부딪히지 않도록 속도를 조절하세요.",
    wealth: "돈이 나가기 쉬운 날입니다. 지인과의 금전 거래, 보증, 즉흥적 투자는 특히 조심하세요.",
    love: "질투나 비교하는 마음이 앞설 수 있습니다. 상대의 말을 끝까지 듣는 것만으로도 다툼을 줄일 수 있습니다.",
    health: "긴장과 신경이 예민해지기 쉬운 날입니다. 카페인보다 가벼운 스트레칭이 낫습니다.",
  },
  "식신": {
    group: "식상",
    overall: "몸도 마음도 여유가 생기는 날입니다. 표현하고 나누는 일이 잘 풀립니다.",
    wealth: "꾸준함이 결실로 이어지는 흐름입니다. 취미나 재능을 살린 부수입 기회를 눈여겨보세요.",
    love: "다정한 말 한마디가 관계를 부드럽게 만듭니다. 함께 먹는 자리가 특히 좋습니다.",
    health: "소화기와 관련된 컨디션에 신경 쓰면 좋은 날입니다. 규칙적인 식사가 도움이 됩니다.",
  },
  "상관": {
    group: "식상",
    overall: "생각이 빠르고 표현이 날카로워지는 날입니다. 아이디어는 좋지만 말은 한 번 더 다듬어서 하세요.",
    wealth: "재능이나 콘텐츠로 만드는 수입에 기회가 보입니다. 다만 즉흥적 소비는 늘 수 있습니다.",
    love: "직설적인 말이 오해를 살 수 있습니다. 맞는 말도 부드럽게 전하는 게 오늘의 관건입니다.",
    health: "두통이나 신경 쓰임이 늘 수 있는 날입니다. 과로보다 짧은 휴식을 자주 넣으세요.",
  },
  "편재": {
    group: "재성",
    overall: "기회가 여러 방향에서 들어오는 날입니다. 발이 넓어지는 만큼 선택과 집중이 필요합니다.",
    wealth: "예상 밖의 수입이나 제안이 생길 수 있는 날입니다. 다만 확정 전까지는 낙관을 아껴두세요.",
    love: "새로운 인연이나 설레는 자리가 생기기 쉬운 날입니다. 다만 즉흥적인 약속은 신중히 정하세요.",
    health: "활동량이 늘며 컨디션도 함께 오르내립니다. 잠자리 시간만은 지켜주세요.",
  },
  "정재": {
    group: "재성",
    overall: "차근차근 쌓아온 것이 인정받는 날입니다. 안정과 신뢰가 오늘의 키워드입니다.",
    wealth: "계획한 지출과 저축이 잘 맞아떨어집니다. 큰 결정보다 정리와 관리에 좋은 날입니다.",
    love: "오래된 관계일수록 편안함이 깊어집니다. 작은 약속을 지키는 것이 큰 신뢰로 돌아옵니다.",
    health: "전반적으로 안정적입니다. 다만 반복되는 자세나 습관성 통증은 이번 기회에 점검해보세요.",
  },
  "편관": {
    group: "관성",
    overall: "책임과 압박이 동시에 밀려오는 날입니다. 부담스럽지만 오히려 일이 진행되는 힘이 됩니다.",
    wealth: "지출을 통제하는 결단이 필요합니다. 갑작스러운 비용 요구가 생길 수 있으니 여유 자금을 두세요.",
    love: "긴장감이 관계에 자극이 될 수 있지만 오래 끌면 피곤함으로 바뀝니다. 대화로 빨리 풀어내세요.",
    health: "스트레스가 몸으로 나타나기 쉬운 날입니다. 어깨와 목의 긴장을 자주 풀어주세요.",
  },
  "정관": {
    group: "관성",
    overall: "원칙대로 움직일 때 인정받는 날입니다. 규칙과 절차를 지키는 것이 오히려 지름길입니다.",
    wealth: "정해진 규칙 안에서의 재정 관리가 유리합니다. 세금, 계약, 서류 관련 일을 챙기기 좋은 날입니다.",
    love: "책임감 있는 태도가 신뢰를 더합니다. 진지한 대화나 미래 계획을 꺼내기 좋습니다.",
    health: "규칙적인 생활이 컨디션을 지켜줍니다. 수면 시간을 일정하게 유지하세요.",
  },
  "편인": {
    group: "인성",
    overall: "직관이 예리해지는 날입니다. 남들과 다른 방식이 오히려 통할 수 있습니다.",
    wealth: "정보나 아이디어가 돈이 되는 흐름입니다. 다만 확인 없이 서두르면 손해로 이어질 수 있습니다.",
    love: "혼자 생각이 많아지는 날입니다. 짐작으로 넘겨짚기보다 직접 확인하는 편이 낫습니다.",
    health: "잠이 얕아지거나 생각이 많아 피곤할 수 있습니다. 자기 전 화면 사용을 줄여보세요.",
  },
  "정인": {
    group: "인성",
    overall: "배우고 채우는 것이 잘 맞는 날입니다. 무리하게 나서기보다 준비하는 시간으로 삼으세요.",
    wealth: "당장의 수익보다 공부와 자격, 신용을 쌓는 데 쓰는 돈이 결국 이득이 됩니다.",
    love: "상대를 이해하고 배려하는 마음이 커지는 날입니다. 든든한 조언자 역할이 잘 어울립니다.",
    health: "휴식이 곧 보약인 날입니다. 몸을 쉬게 하는 것만으로 컨디션이 회복됩니다.",
  },
};

// ---------- 오행 밸런스 ----------
function tallyWuxing(pillars) {
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  pillars.forEach((p) => {
    if (!p) return;
    counts[STEM_ELEMENT[stemIndex(p.stem)]] += 1;
    counts[BRANCH_ELEMENT[branchIndex(p.branch)]] += 1;
  });
  return counts;
}

// ---------- 메인 계산 ----------
// input: { year, month, day, hour, minute, hasTime, lng, gender } (gender: 'male' | 'female')
function computeSaju(input) {
  const { year, month, day, hour, minute, hasTime, lng, gender } = input;

  const baseHour = hasTime ? hour : 12;
  const baseMinute = hasTime ? minute : 0;
  const birthLocal = new Date(year, month - 1, day, baseHour, baseMinute, 0);

  const offsetMinutes = trueSolarOffsetMinutes(birthLocal, lng);
  const corrected = hasTime ? applyOffset(birthLocal, offsetMinutes) : birthLocal;

  const solar = Solar.fromYmdHms(
    corrected.getFullYear(),
    corrected.getMonth() + 1,
    corrected.getDate(),
    corrected.getHours(),
    corrected.getMinutes(),
    0
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const pillar = (ganzhi) => ({
    stem: ganzhi[0],
    branch: ganzhi[1],
    stemKo: STEM_KO[stemIndex(ganzhi[0])],
    branchKo: BRANCH_KO[branchIndex(ganzhi[1])],
    animal: BRANCH_ANIMAL[branchIndex(ganzhi[1])],
  });

  const yearPillar = pillar(eightChar.getYear());
  const monthPillar = pillar(eightChar.getMonth());
  const dayPillar = pillar(eightChar.getDay());
  const timePillar = hasTime ? pillar(eightChar.getTime()) : null;

  const pillars = hasTime
    ? [yearPillar, monthPillar, dayPillar, timePillar]
    : [yearPillar, monthPillar, dayPillar];

  const dayMaster = dayPillar.stem;
  const wuxing = tallyWuxing(pillars);

  let yun = null;
  try {
    const genderCode = gender === "male" ? 1 : 0;
    const y = eightChar.getYun(genderCode);
    yun = { startYear: y.getStartYear(), startMonth: y.getStartMonth(), forward: y.isForward() };
  } catch (e) {
    yun = null;
  }

  return {
    yearPillar, monthPillar, dayPillar, timePillar,
    hasTime, dayMaster, wuxing, yun,
    offsetMinutes, lunar, solar,
  };
}

// 오늘(또는 특정일)의 일진과 본인 일간의 관계로 오늘의 운세를 만든다.
function computeTodayFortune(dayMasterHanja, todayDate) {
  const solar = Solar.fromDate(todayDate);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const todayDayGanzhi = eightChar.getDay();
  const todayStem = todayDayGanzhi[0];
  const todayBranch = todayDayGanzhi[1];

  const god = tenGod(dayMasterHanja, todayStem);
  const info = TEN_GOD_INFO[god] || TEN_GOD_INFO["비견"];
  const todayElement = STEM_ELEMENT[stemIndex(todayStem)];

  return {
    todayStem, todayBranch,
    todayStemKo: STEM_KO[stemIndex(todayStem)],
    todayBranchKo: BRANCH_KO[branchIndex(todayBranch)],
    todayAnimal: BRANCH_ANIMAL[branchIndex(todayBranch)],
    tenGod: god,
    info,
    luckyNumbers: LUCKY_NUMBERS[todayElement],
    luckyColor: LUCKY_COLOR_NAME[todayElement],
    todayElement,
  };
}
