// saju-engine.js
// 정확한 명리학(사주) 계산 엔진. 절기 기준 만세력 계산은 lunar-javascript(6tail, MIT)에 위임하고,
// 이 파일은 진태양시 보정, 오행/십성 판정을 담당한다. 언어별 표시 문구는 i18n.js에서 관리한다.
"use strict";

// ---------- 60갑자 기본 데이터 ----------
const STEM_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEM_ELEMENT = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];

const BRANCH_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCH_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_ELEMENT = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const BRANCH_ANIMAL_KO = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

const ELEMENT_HANJA = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];

// 상생(生): 목생화, 화생토, 토생금, 금생수, 수생목
const GENERATES = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
// 상극(克): 목극토, 토극수, 수극화, 화극금, 금극목
const CONTROLS = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

const LUCKY_NUMBERS = { water: [1, 6], fire: [2, 7], wood: [3, 8], metal: [4, 9], earth: [5, 10] };

function stemIndex(hanja) { return STEM_HANJA.indexOf(hanja); }
function branchIndex(hanja) { return BRANCH_HANJA.indexOf(hanja); }
function isYangIndex(i) { return i % 2 === 0; }

// ---------- 진태양시(眞太陽時) 보정 ----------
// 시계가 가리키는 "표준시"는 그 지역 표준 자오선(utcOffset × 15도)을 기준으로 하지만,
// 실제 태양이 자오선을 통과하는 시각은 관측지의 정확한 경도와 균시차(equation of time)에 따라 달라진다.
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

function longitudeCorrectionMinutes(lng, utcOffset) {
  const standardMeridian = utcOffset * 15; // UTC 1시간 = 경도 15도
  return (lng - standardMeridian) * 4; // 경도 1도당 4분
}

function trueSolarOffsetMinutes(date, lng, utcOffset) {
  if (lng === null || lng === undefined || utcOffset === null || utcOffset === undefined) return 0;
  return longitudeCorrectionMinutes(lng, utcOffset) + equationOfTimeMinutes(date);
}

function applyOffset(date, offsetMinutes) {
  return new Date(date.getTime() + Math.round(offsetMinutes * 60000));
}

// ---------- 십성(十神) 판정 ----------
// dayMasterHanja: 본인의 일간(日干) 한자, targetHanja: 비교 대상 천간 한자
// 반환값은 언어 중립 코드(i18n.js의 TEN_GOD_NAMES/TEN_GOD_INFO 키와 매칭됨)
function tenGod(dayMasterHanja, targetHanja) {
  const di = stemIndex(dayMasterHanja);
  const ti = stemIndex(targetHanja);
  const dEl = STEM_ELEMENT[di], tEl = STEM_ELEMENT[ti];
  const sameYY = isYangIndex(di) === isYangIndex(ti);

  if (tEl === dEl) return sameYY ? "biJian" : "jieCai";
  if (GENERATES[dEl] === tEl) return sameYY ? "shiShen" : "shangGuan";
  if (CONTROLS[dEl] === tEl) return sameYY ? "pianCai" : "zhengCai";
  if (CONTROLS[tEl] === dEl) return sameYY ? "qiSha" : "zhengGuan";
  if (GENERATES[tEl] === dEl) return sameYY ? "pianYin" : "zhengYin";
  return null;
}

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
// input: { year, month, day, hour, minute, hasTime, lng, utcOffset, dst, gender }
function computeSaju(input) {
  const { year, month, day, hour, minute, hasTime, lng, utcOffset, dst, gender } = input;

  let baseHour = hasTime ? hour : 12;
  const baseMinute = hasTime ? minute : 0;
  if (hasTime && dst) baseHour -= 1; // 서머타임이면 표준시로 환원

  const birthLocal = new Date(year, month - 1, day, baseHour, baseMinute, 0);
  const offsetMinutes = trueSolarOffsetMinutes(birthLocal, lng, utcOffset);
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
    animalIndex: branchIndex(ganzhi[1]),
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
    offsetMinutes, correctionApplied: hasTime && lng !== null && utcOffset !== null && lng !== undefined && utcOffset !== undefined,
  };
}

// 올해(양력 연도)의 연간(年干)과 본인 일간의 관계로 신년 총운을 만든다.
// 절기 경계(입춘) 근처 왜곡을 피하려고 그 해 6월 중순을 기준일로 잡는다.
function computeYearFortune(dayMasterHanja, year) {
  const solar = Solar.fromYmdHms(year, 6, 15, 12, 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const yearGanzhi = eightChar.getYear();
  const yearStem = yearGanzhi[0];
  const yearBranch = yearGanzhi[1];

  const god = tenGod(dayMasterHanja, yearStem);
  const yearElement = STEM_ELEMENT[stemIndex(yearStem)];

  return {
    yearStem, yearBranch,
    yearStemKo: STEM_KO[stemIndex(yearStem)],
    yearBranchKo: BRANCH_KO[branchIndex(yearBranch)],
    yearAnimalIndex: branchIndex(yearBranch),
    tenGodKey: god,
    yearElement,
  };
}

// 두 사람의 일간(日干)을 오행 상생/상극/비화 관계로 비교해 궁합을 만든다.
function computeCompatibility(dayMasterA, dayMasterB) {
  const elA = STEM_ELEMENT[stemIndex(dayMasterA)];
  const elB = STEM_ELEMENT[stemIndex(dayMasterB)];

  let relation;
  if (elA === elB) relation = "same";
  else if (GENERATES[elA] === elB || GENERATES[elB] === elA) relation = "generate";
  else relation = "control"; // CONTROLS[elA]===elB 이거나 CONTROLS[elB]===elA 인 나머지 모든 경우

  return { elA, elB, relation };
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
  const todayElement = STEM_ELEMENT[stemIndex(todayStem)];

  return {
    todayStem, todayBranch,
    todayStemKo: STEM_KO[stemIndex(todayStem)],
    todayBranchKo: BRANCH_KO[branchIndex(todayBranch)],
    todayAnimalIndex: branchIndex(todayBranch),
    tenGodKey: god,
    luckyNumbers: LUCKY_NUMBERS[todayElement],
    todayElement,
  };
}
