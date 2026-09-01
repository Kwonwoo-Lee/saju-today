// app.js — UI 바인딩 + 다국어 렌더링
"use strict";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentLang = DEFAULT_LANG;
let lastResult = null; // 언어 전환 시 재렌더링을 위해 마지막 계산 결과를 보관

function getStoredLang() {
  try {
    const stored = localStorage.getItem("saju-lang");
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  } catch (e) { /* localStorage 접근 불가 환경 대비 */ }
  return DEFAULT_LANG;
}
function setStoredLang(lang) {
  try { localStorage.setItem("saju-lang", lang); } catch (e) { /* noop */ }
}

// ---------- 정적 문자열 적용 ----------
function applyStaticStrings(lang) {
  const s = STRINGS[lang];
  document.documentElement.lang = lang;
  document.getElementById("page-title").textContent = s.pageTitle;
  document.getElementById("meta-description").setAttribute("content", s.metaDescription);
  document.getElementById("brand-name").textContent = s.brand;
  document.getElementById("brand-sub").textContent = s.brandSub;
  document.getElementById("hero-title-1").textContent = s.heroTitleLine1;
  document.getElementById("hero-title-2").textContent = s.heroTitleLine2;
  document.getElementById("hero-lede").textContent = s.heroLede;

  document.getElementById("label-name").textContent = s.labelName;
  document.getElementById("name").placeholder = s.placeholderName;
  document.getElementById("hint-name").textContent = s.hintName;
  document.getElementById("label-birth-date").textContent = s.labelBirthDate;
  document.getElementById("label-gender").textContent = s.labelGender;
  document.getElementById("option-select").textContent = s.optionSelect;
  document.getElementById("option-male").textContent = s.optionMale;
  document.getElementById("option-female").textContent = s.optionFemale;
  document.getElementById("hint-gender").textContent = s.hintGender;
  document.getElementById("label-birth-time").textContent = s.labelBirthTime;
  document.getElementById("label-time-unknown").textContent = s.labelTimeUnknown;
  document.getElementById("hint-time").textContent = s.hintTime;
  document.getElementById("label-region").textContent = s.labelRegion;
  document.getElementById("hint-region").textContent = s.hintRegion;
  document.getElementById("label-dst").textContent = s.labelDST;
  document.getElementById("hint-dst").textContent = s.hintDST;
  document.getElementById("submit-btn-label").textContent = s.submitBtn;
  document.getElementById("wuxing-title").textContent = s.resultTitleWuxing;
  document.getElementById("today-title").textContent = s.resultTitleToday;
  document.getElementById("footer-disclaimer").textContent = s.footerDisclaimer;
  document.getElementById("lang-switch").setAttribute("aria-label", s.langLabel);
}

// ---------- 지역 셀렉트 ----------
function populateRegions(lang) {
  const select = document.getElementById("region");
  const prevValue = select.value;
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = STRINGS[lang].optionSelect;
  select.appendChild(placeholder);
  REGIONS.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = regionName(r.id, lang);
    select.appendChild(opt);
  });
  if (prevValue) select.value = prevValue;
}

// ---------- 언어 전환 ----------
const langSwitch = document.getElementById("lang-switch");
function setLang(lang) {
  currentLang = lang;
  langSwitch.value = lang;
  setStoredLang(lang);
  applyStaticStrings(lang);
  populateRegions(lang);
  if (lastResult) renderResults(lang, lastResult);
}
langSwitch.addEventListener("change", () => setLang(langSwitch.value));

// ---------- 시간 모름 토글 ----------
const timeInput = document.getElementById("birth-time");
const timeUnknown = document.getElementById("time-unknown");
timeUnknown.addEventListener("change", () => {
  timeInput.disabled = timeUnknown.checked;
  timeInput.required = !timeUnknown.checked;
  if (timeUnknown.checked) timeInput.value = "";
});

// ---------- 이름 입력 검증 (다국어 문자 허용) ----------
const nameInput = document.getElementById("name");
const namePattern = /^[\p{L}][\p{L} .'\-]{0,58}$/u;
nameInput.addEventListener("input", () => {
  const ok = namePattern.test(nameInput.value.trim());
  nameInput.setCustomValidity(nameInput.value.trim() === "" || ok ? "" : "Please enter a valid name.");
});

// ---------- 폼 제출 ----------
const form = document.getElementById("saju-form");
const resultsSection = document.getElementById("results");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const name = nameInput.value.trim();
  const dateVal = document.getElementById("birth-date").value; // yyyy-mm-dd
  const gender = document.getElementById("gender").value;
  const regionId = document.getElementById("region").value;
  const dst = document.getElementById("dst").checked;
  const hasTime = !timeUnknown.checked && timeInput.value !== "";

  const [year, month, day] = dateVal.split("-").map(Number);
  let hour = 12, minute = 0;
  if (hasTime) {
    const [h, m] = timeInput.value.split(":").map(Number);
    hour = h; minute = m;
  }

  const region = REGIONS.find((r) => r.id === regionId) || { lng: null, utcOffset: null };

  const saju = computeSaju({ year, month, day, hour, minute, hasTime, lng: region.lng, utcOffset: region.utcOffset, dst, gender });
  const fortune = computeTodayFortune(saju.dayMaster, new Date());

  lastResult = { name, saju, fortune, hasTime, regionId };
  renderResults(currentLang, lastResult);

  resultsSection.hidden = false;
  requestAnimationFrame(() => {
    resultsSection.classList.add("revealed");
    resultsSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  });
});

// ---------- 포맷팅 헬퍼 (언어별 어순 처리) ----------
function formatResultTitle(lang, name, hasTime) {
  switch (lang) {
    case "zh": return hasTime ? `${name}的八字` : `${name}的三柱（年·月·日）`;
    case "fr": return hasTime ? `Les Quatre Piliers de ${name}` : `Les Piliers de ${name} (Année, Mois, Jour)`;
    case "ko": return hasTime ? `${name}님의 사주팔자` : `${name}님의 사주 (년·월·일주)`;
    default: return hasTime ? `${name}'s Four Pillars` : `${name}'s Pillars (Year, Month, Day)`;
  }
}

// 프랑스어 "de/d'" 축약 (모음으로 시작하는 단어 앞에서 d')
function frDe(word) {
  return /^[AEIOUÉÈÊËÀÂÎÏÔÙÛÜ]/i.test(word) ? `d'${word}` : `de ${word}`;
}

function formatPillarReading(lang, p) {
  const animal = BRANCH_ANIMALS[lang][p.animalIndex];
  if (lang === "ko") return `${p.stemKo}${p.branchKo} · ${BRANCH_ANIMALS.ko[p.animalIndex]}띠 기운`;
  if (lang === "zh") {
    const roman = `${STEM_ROMAN[stemIndex(p.stem)]}-${BRANCH_ROMAN[branchIndex(p.branch)]}`;
    return `${roman} · ${animal}年气息`;
  }
  const stemEl = STEM_ELEMENT[stemIndex(p.stem)];
  const elName = ELEMENT_NAMES[lang][stemEl];
  if (lang === "fr") return `${animal} ${frDe(elName)}`;
  return `${elName} ${animal}`;
}

const DIR_SLOW = { en: "slower", zh: "慢", fr: "plus lente", ko: "느리게" };
const DIR_FAST = { en: "faster", zh: "快", fr: "plus rapide", ko: "빠르게" };
const DIR_FORWARD = { en: "forward", zh: "顺行", fr: "directe", ko: "순행" };
const DIR_BACKWARD = { en: "backward", zh: "逆行", fr: "inversée", ko: "역행" };

function formatCorrectionNote(lang, hasTime, regionLabel, offsetMinutes, correctionApplied, yun) {
  let note;
  const offsetAbs = Math.abs(Math.round(offsetMinutes));
  if (!hasTime) {
    note = {
      en: "Birth time unknown, showing only the Year, Month and Day Pillars (Hour Pillar omitted).",
      zh: "出生时间不详，仅显示年柱、月柱、日柱（省略时柱）。",
      fr: "Heure de naissance inconnue, seuls les Piliers de l'Année, du Mois et du Jour sont affichés (Pilier de l'Heure omis).",
      ko: "태어난 시각 미상 · 시주는 제외한 3기둥만 표기합니다.",
    }[lang];
  } else if (!correctionApplied) {
    note = {
      en: "No birthplace correction applied. Showing all 4 pillars including the Hour Pillar.",
      zh: "未应用出生地校正。显示时柱在内共四柱。",
      fr: "Aucune correction de lieu de naissance appliquée. Les 4 piliers sont affichés, Pilier de l'Heure inclus.",
      ko: "지역 보정 없이 시주까지 4기둥을 표기합니다.",
    }[lang];
  } else {
    const dir = offsetMinutes < 0 ? DIR_SLOW[lang] : DIR_FAST[lang];
    note = {
      en: `True solar time correction applied for ${regionLabel} (about ${offsetAbs} min ${dir} than standard clock time). Showing all 4 pillars including the Hour Pillar.`,
      zh: `已针对${regionLabel}进行真太阳时校正（比标准时间${dir}约${offsetAbs}分钟）。显示时柱在内共四柱。`,
      fr: `Correction en temps solaire vrai appliquée pour ${regionLabel} (environ ${offsetAbs} min ${dir} que l'heure standard). Les 4 piliers sont affichés, Pilier de l'Heure inclus.`,
      ko: `${regionLabel} 기준 진태양시 보정 적용 (표준시보다 약 ${offsetAbs}분 ${dir} 흐름) · 시주까지 4기둥 표기.`,
    }[lang];
  }
  if (yun) {
    const dir2 = yun.forward ? DIR_FORWARD[lang] : DIR_BACKWARD[lang];
    const m = yun.startMonth || 0;
    const monthsPart = m ? { en: ` ${m} mo`, zh: `${m}个月`, fr: ` ${m} mois`, ko: ` ${m}개월` }[lang] : "";
    const yunText = {
      en: ` Luck cycle (Da Yun) begins at age ${yun.startYear}${monthsPart} and runs ${dir2}.`,
      zh: ` 大运从${yun.startYear}岁${monthsPart}起${dir2}。`,
      fr: ` Le cycle de chance (Da Yun) commence à ${yun.startYear} ans${monthsPart} et progresse de façon ${dir2}.`,
      ko: ` 대운은 만 ${yun.startYear}세${monthsPart}부터 ${dir2}으로 시작.`,
    }[lang];
    note += yunText;
  }
  return note;
}

function formatTodayGanji(lang, fortune) {
  const roman = `${STEM_ROMAN[stemIndex(fortune.todayStem)]}-${BRANCH_ROMAN[branchIndex(fortune.todayBranch)]}`;
  const animal = lang === "ko" ? BRANCH_ANIMALS.ko[fortune.todayAnimalIndex] : BRANCH_ANIMALS[lang][fortune.todayAnimalIndex];
  const godName = TEN_GOD_NAMES[lang][fortune.tenGodKey];
  if (lang === "ko") return `오늘은 ${fortune.todayStemKo}${fortune.todayBranchKo}일 (${animal}띠 기운) · 나와의 관계는 <strong>${godName}</strong>`;
  if (lang === "zh") return `今天是${roman}日（${animal}能量）· 与你的关系：<strong>${godName}</strong>`;
  if (lang === "fr") return `Aujourd'hui est un jour ${roman} (énergie ${animal}) · votre relation avec lui : <strong>${godName}</strong>`;
  return `Today is a ${roman} day (${animal} energy) · your relationship with it: <strong>${godName}</strong>`;
}

function formatFortuneBody(lang, name, element, godName) {
  const elName = ELEMENT_NAMES[lang][element];
  if (lang === "ko") return `오늘의 일간은 ${elName} 기운이고, ${name}님의 일간과는 '${godName}' 관계를 이룹니다.`;
  if (lang === "zh") return `今日日干为${elName}之气，与${name}的日主构成「${godName}」关系。`;
  if (lang === "fr") return `La Tige du Jour porte aujourd'hui l'énergie ${elName}, formant une relation « ${godName} » avec le Maître du Jour de ${name}.`;
  return `Today's Day Stem carries ${elName} energy, forming a "${godName}" relationship with ${name}'s Day Master.`;
}

function formatLuckyRow(lang, colorName, numbers) {
  const sep = lang === "zh" ? "、" : " · ";
  const numStr = numbers.join(sep);
  const labels = {
    en: ["Lucky color today ", "Lucky numbers today "],
    zh: ["今日幸运色 ", "今日幸运数字 "],
    fr: ["Couleur porte-bonheur du jour ", "Chiffres porte-bonheur du jour "],
    ko: ["오늘의 행운 색 ", "오늘의 행운 숫자 "],
  }[lang];
  return `<span>${labels[0]}<strong>${colorName}</strong></span><span>${labels[1]}<strong>${numStr}</strong></span>`;
}

// ---------- 표시 문자(글리프) ----------
// 중국어는 실제 한자를, 그 외 언어는 병음 로마자(en/fr) 또는 한글 갑자(ko)를 큰 글자로 보여준다.
// 한자는 중국어 화면에서만 등장한다.
function glyphScript(lang) {
  if (lang === "zh") return "cjk";
  if (lang === "ko") return "hangul";
  return "roman";
}
function pillarGlyphs(lang, p) {
  if (lang === "zh") return [p.stem, p.branch];
  if (lang === "ko") return [p.stemKo, p.branchKo];
  return [STEM_ROMAN[stemIndex(p.stem)], BRANCH_ROMAN[branchIndex(p.branch)]];
}
function todayGlyphText(lang, fortune) {
  if (lang === "zh") return fortune.todayStem + fortune.todayBranch;
  if (lang === "ko") return fortune.todayStemKo + fortune.todayBranchKo;
  return `${STEM_ROMAN[stemIndex(fortune.todayStem)]}-${BRANCH_ROMAN[branchIndex(fortune.todayBranch)]}`;
}

// ---------- 렌더링 ----------
function pillarNode(lang, label, p) {
  const el = document.createElement("div");
  el.className = "pillar";
  const script = glyphScript(lang);
  const [stemGlyph, branchGlyph] = pillarGlyphs(lang, p);
  el.innerHTML = `
    <p class="pillar-label">${label}</p>
    <div class="pillar-chars">
      <span class="pillar-glyph ${script}" data-element="${STEM_ELEMENT[stemIndex(p.stem)]}">${stemGlyph}</span>
      <span class="pillar-glyph ${script}" data-element="${BRANCH_ELEMENT[branchIndex(p.branch)]}">${branchGlyph}</span>
    </div>
    <p class="pillar-reading">${formatPillarReading(lang, p)}</p>
  `;
  return el;
}

function renderResults(lang, result) {
  const { name, saju, fortune, hasTime, regionId } = result;
  const s = STRINGS[lang];

  document.getElementById("pillars-title").textContent = formatResultTitle(lang, name, hasTime);

  const regionLabel = regionName(regionId, lang);
  const note = document.getElementById("correction-note");
  note.textContent = formatCorrectionNote(lang, hasTime, regionLabel, saju.offsetMinutes, saju.correctionApplied, saju.yun);

  const pillarsEl = document.getElementById("pillars");
  pillarsEl.innerHTML = "";
  pillarsEl.appendChild(pillarNode(lang, s.pillarYear, saju.yearPillar));
  pillarsEl.appendChild(pillarNode(lang, s.pillarMonth, saju.monthPillar));
  pillarsEl.appendChild(pillarNode(lang, s.pillarDay, saju.dayPillar));
  if (hasTime) pillarsEl.appendChild(pillarNode(lang, s.pillarTime, saju.timePillar));
  [...pillarsEl.children].forEach((child, i) => child.style.setProperty("--stagger", i));

  const wuxingEl = document.getElementById("wuxing-chart");
  wuxingEl.innerHTML = "";
  const total = Object.values(saju.wuxing).reduce((a, b) => a + b, 0) || 1;
  ELEMENT_ORDER.forEach((el, i) => {
    const count = saju.wuxing[el];
    const pct = Math.round((count / total) * 100);
    const row = document.createElement("div");
    row.className = "wuxing-row";
    row.style.setProperty("--stagger", i);
    row.innerHTML = `
      <span class="wuxing-label" data-element="${el}">${ELEMENT_NAMES[lang][el]}</span>
      <div class="wuxing-track"><div class="wuxing-fill" data-element="${el}" style="--pct:${pct}%"></div></div>
      <span class="wuxing-count">${count}</span>
    `;
    wuxingEl.appendChild(row);
  });

  const todayStr = new Date().toLocaleDateString(LOCALE_CODE[lang], { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  document.getElementById("today-date").textContent = todayStr;

  document.getElementById("today-ganji").innerHTML = `
    <span class="pillar-glyph small ${glyphScript(lang)}" data-element="${fortune.todayElement}">${todayGlyphText(lang, fortune)}</span>
    <span class="today-ganji-label">${formatTodayGanji(lang, fortune)}</span>
  `;

  const godName = TEN_GOD_NAMES[lang][fortune.tenGodKey];
  const info = TEN_GOD_INFO[lang][fortune.tenGodKey];
  document.getElementById("fortune-headline").textContent = info.overall;
  document.getElementById("fortune-body").textContent = formatFortuneBody(lang, name, fortune.todayElement, godName);

  const grid = document.getElementById("fortune-grid");
  grid.innerHTML = "";
  [
    { label: s.domainWealth, text: info.wealth },
    { label: s.domainLove, text: info.love },
    { label: s.domainHealth, text: info.health },
  ].forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "fortune-card";
    card.style.setProperty("--stagger", i);
    card.innerHTML = `<h3>${item.label}</h3><p>${item.text}</p>`;
    grid.appendChild(card);
  });

  document.getElementById("lucky-row").innerHTML = formatLuckyRow(lang, LUCKY_COLOR_NAMES[lang][fortune.todayElement], fortune.luckyNumbers);
}

// ---------- 초기화 ----------
setLang(getStoredLang());
