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
  document.getElementById("og-title").setAttribute("content", s.pageTitle);
  document.getElementById("og-description").setAttribute("content", s.metaDescription);
  document.getElementById("twitter-title").setAttribute("content", s.pageTitle);
  document.getElementById("twitter-description").setAttribute("content", s.metaDescription);
  document.getElementById("brand-name").textContent = s.brand;
  document.getElementById("brand-sub").textContent = s.brandSub;
  document.getElementById("hero-title-1").textContent = s.heroTitleLine1;
  document.getElementById("hero-title-2").textContent = s.heroTitleLine2;
  document.getElementById("hero-eyebrow").textContent = s.brand;
  document.getElementById("hero-form-title").textContent = s.heroFormTitle;
  document.getElementById("form-back-label").textContent = s.formBack;
  document.getElementById("results-back-label").textContent = s.resultsBack;
  document.getElementById("feature-pillars-title").textContent = s.featurePillarsTitle;
  document.getElementById("feature-pillars-body").textContent = s.featurePillarsBody;
  document.getElementById("feature-wuxing-title").textContent = s.featureWuxingTitle;
  document.getElementById("feature-wuxing-body").textContent = s.featureWuxingBody;
  document.getElementById("feature-today-title").textContent = s.featureTodayTitle;
  document.getElementById("feature-today-body").textContent = s.featureTodayBody;

  document.getElementById("label-name").textContent = s.labelName;
  document.getElementById("name").placeholder = s.placeholderName;
  document.getElementById("hint-name").textContent = s.hintName;
  document.getElementById("label-birth-date").textContent = s.labelBirthDate;
  document.getElementById("calendar-solar-btn").textContent = s.calendarSolar;
  document.getElementById("calendar-lunar-btn").textContent = s.calendarLunar;
  document.getElementById("label-gender").textContent = s.labelGender;
  document.getElementById("gender-male-btn").textContent = s.optionMale;
  document.getElementById("gender-female-btn").textContent = s.optionFemale;
  document.getElementById("hint-gender").textContent = s.hintGender;
  document.getElementById("label-birth-time").textContent = s.labelBirthTime;
  document.getElementById("label-time-unknown").textContent = s.labelTimeUnknown;
  document.getElementById("hint-time").textContent = s.hintTime;
  document.getElementById("label-region").textContent = s.labelRegion;
  document.getElementById("hint-region").textContent = s.hintRegion;
  document.getElementById("label-dst").textContent = s.labelDST;
  document.getElementById("hint-dst").textContent = s.hintDST;
  document.getElementById("label-partner-toggle").textContent = s.labelPartnerToggle;
  document.getElementById("hint-partner").textContent = s.hintPartner;
  document.getElementById("label-partner-name").textContent = s.labelPartnerName;
  document.getElementById("partner-name").placeholder = s.placeholderPartnerName;
  document.getElementById("label-partner-birth-date").textContent = s.labelPartnerBirthDate;
  document.getElementById("submit-btn-label").textContent = s.submitBtn;
  document.getElementById("wuxing-title").textContent = s.resultTitleWuxing;
  document.getElementById("today-title").textContent = s.resultTitleToday;
  document.getElementById("year-title").textContent = s.resultTitleYear;
  document.getElementById("compat-title").textContent = s.resultTitleCompat;
  document.getElementById("tab-today-btn").textContent = s.resultTitleToday;
  document.getElementById("tab-year-btn").textContent = s.resultTitleYear;
  document.getElementById("tab-compat-btn").textContent = s.resultTitleCompat;
  document.getElementById("footer-disclaimer").textContent = s.footerDisclaimer;
  document.getElementById("lang-switch").setAttribute("aria-label", s.langLabel);

  document.getElementById("footer-brand-name").textContent = s.brand;
  document.getElementById("footer-nav-analysis").textContent = s.navAnalysis;
  document.getElementById("footer-nav-year").textContent = s.navYear;
  document.getElementById("footer-nav-compat").textContent = s.navCompat;
  document.getElementById("footer-copyright").textContent = s.footerCopyright;
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

// ---------- 태어난 시간 드롭다운 (시/분/오전-오후) ----------
const hourSelect = document.getElementById("birth-hour");
const minuteSelect = document.getElementById("birth-minute");
const ampmSelect = document.getElementById("birth-ampm");
for (let h = 1; h <= 12; h++) {
  const opt = document.createElement("option");
  opt.value = String(h);
  opt.textContent = String(h).padStart(2, "0");
  hourSelect.appendChild(opt);
}
for (let m = 0; m < 60; m++) {
  const opt = document.createElement("option");
  opt.value = String(m);
  opt.textContent = String(m).padStart(2, "0");
  minuteSelect.appendChild(opt);
}
hourSelect.value = "8";
minuteSelect.value = "30";
ampmSelect.value = "AM";

// ---------- 시간 모름 토글 ----------
const timeUnknown = document.getElementById("time-unknown");
const timeSelectEls = [hourSelect, minuteSelect, ampmSelect];
timeUnknown.addEventListener("change", () => {
  timeSelectEls.forEach((el) => { el.disabled = timeUnknown.checked; });
});

// ---------- 성별 필 토글 ----------
const genderInput = document.getElementById("gender");
const genderButtons = document.querySelectorAll("#gender-toggle .pill-toggle-btn");
genderButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    genderButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    genderInput.value = btn.dataset.value;
    document.getElementById("gender-toggle").classList.remove("field-error");
  });
});

// ---------- 양력/음력 토글 ----------
let calendarType = "solar";
const calendarButtons = document.querySelectorAll("#calendar-toggle .pill-toggle-btn");
calendarButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    calendarButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    calendarType = btn.dataset.value;
  });
});
document.getElementById("calendar-solar-btn").classList.add("is-active");

// ---------- 궁합 상대방 토글 ----------
const partnerToggle = document.getElementById("partner-toggle");
const partnerFields = document.getElementById("partner-fields");
partnerToggle.addEventListener("change", () => {
  partnerFields.hidden = !partnerToggle.checked;
});

// ---------- 이름 입력 검증 (다국어 문자 허용) ----------
const nameInput = document.getElementById("name");
const namePattern = /^[\p{L}][\p{L} .'\-]{0,58}$/u;
nameInput.addEventListener("input", () => {
  const ok = namePattern.test(nameInput.value.trim());
  nameInput.setCustomValidity(nameInput.value.trim() === "" || ok ? "" : "Please enter a valid name.");
});

// ---------- 생년월일 입력 (점(.) 포맷 텍스트란 직접 입력 + 달력 아이콘 클릭, 둘 다 동작) ----------
function setupDateField(displayId, hiddenId, nativeId) {
  const displayEl = document.getElementById(displayId);
  const hiddenEl = document.getElementById(hiddenId);
  const nativeEl = document.getElementById(nativeId);

  function format(raw) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean);
    return parts.join(".");
  }

  function sync() {
    displayEl.classList.remove("field-error");
    const digits = displayEl.value.replace(/\D/g, "");
    if (digits.length !== 8) {
      hiddenEl.value = "";
      return;
    }
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const mm = Number(m), dd = Number(d), yy = Number(y);
    const valid = yy >= 1900 && yy <= 2026 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
    hiddenEl.value = valid ? `${y}-${m}-${d}` : "";
    // 달력 버튼을 다시 열었을 때 방금 타이핑한 날짜에서 시작하도록 네이티브 입력도 맞춰둔다.
    if (nativeEl) nativeEl.value = valid ? `${y}-${m}-${d}` : "";
  }

  // 키보드 직접 입력: 텍스트란은 달력 버튼과 완전히 분리된 별도 요소라 서로 방해하지 않는다.
  displayEl.addEventListener("input", () => {
    const caretWasAtEnd = displayEl.selectionEnd === displayEl.value.length;
    displayEl.value = format(displayEl.value);
    if (caretWasAtEnd) displayEl.setSelectionRange(displayEl.value.length, displayEl.value.length);
    sync();
  });
  displayEl.addEventListener("blur", sync);

  // 달력 아이콘 자리의 네이티브 date input을 직접 클릭하면 브라우저 기본 달력이 뜬다.
  // 날짜를 고르면 change 이벤트로 점(.) 포맷 텍스트란과 숨김 필드에 그대로 반영된다.
  if (nativeEl) {
    nativeEl.addEventListener("change", () => {
      if (!nativeEl.value) return;
      const [y, m, d] = nativeEl.value.split("-");
      displayEl.value = `${y}.${m}.${d}`;
      sync();
    });
  }

  return { displayEl, sync };
}

const birthDateField = setupDateField("birth-date-display", "birth-date", "birth-date-native");
const partnerBirthDateField = setupDateField("partner-birth-date-display", "partner-birth-date", "partner-birth-date-native");

// ---------- 폼 제출 ----------
const form = document.getElementById("saju-form");
const resultsSection = document.getElementById("results");

const genderToggleEl = document.getElementById("gender-toggle");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  // type="hidden" 인풋은 브라우저 제약 검증에서 자동 제외되므로 성별은 직접 검사한다.
  if (!genderInput.value) {
    genderToggleEl.classList.add("field-error");
    genderToggleEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    return;
  }
  // type="hidden" 인풋은 브라우저 제약 검증에서 자동 제외되므로 생년월일도 직접 검사한다.
  birthDateField.sync();
  if (!document.getElementById("birth-date").value) {
    birthDateField.displayEl.classList.add("field-error");
    birthDateField.displayEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    return;
  }
  partnerBirthDateField.sync();

  const name = nameInput.value.trim();
  const dateVal = document.getElementById("birth-date").value; // yyyy-mm-dd
  const gender = genderInput.value;
  const regionId = document.getElementById("region").value;
  const dst = document.getElementById("dst").checked;
  const hasTime = !timeUnknown.checked;

  let [year, month, day] = dateVal.split("-").map(Number);
  if (calendarType === "lunar") {
    const solar = Lunar.fromYmd(year, month, day).getSolar();
    year = solar.getYear(); month = solar.getMonth(); day = solar.getDay();
  }

  let hour = 12, minute = 0;
  if (hasTime) {
    hour = Number(hourSelect.value) % 12 + (ampmSelect.value === "PM" ? 12 : 0);
    minute = Number(minuteSelect.value);
  }

  const region = REGIONS.find((r) => r.id === regionId) || { lng: null, utcOffset: null };

  const saju = computeSaju({ year, month, day, hour, minute, hasTime, lng: region.lng, utcOffset: region.utcOffset, dst, gender });
  const fortune = computeTodayFortune(saju.dayMaster, new Date());
  const yearFortune = computeYearFortune(saju.dayMaster, new Date().getFullYear());

  let compat = null;
  if (partnerToggle.checked) {
    const partnerDateVal = document.getElementById("partner-birth-date").value;
    if (partnerDateVal) {
      const partnerName = document.getElementById("partner-name").value.trim();
      const [py, pm, pd] = partnerDateVal.split("-").map(Number);
      const partnerSaju = computeSaju({ year: py, month: pm, day: pd, hasTime: false, lng: null, utcOffset: null, dst: false, gender: "female" });
      compat = { partnerName, dayMasterA: saju.dayMaster, dayMasterB: partnerSaju.dayMaster, ...computeCompatibility(saju.dayMaster, partnerSaju.dayMaster) };
    }
  }

  lastResult = { name, saju, fortune, yearFortune, compat, hasTime, regionId };
  renderResults(currentLang, lastResult);

  // 궁합 탭이 선택된 상태로 제출됐는데 상대방 정보가 없다면 오늘의 운세로 되돌린다.
  if (activeResultTab === "compat" && !compat) activeResultTab = "today";
  applyResultTabVisibility();

  showResultsView();
});

// ---------- 결과 탭 (오늘의 운세 / 신년 총운 / 궁합 따로 선택해서 보기) ----------
let activeResultTab = "today";
const resultBlocks = {
  today: document.getElementById("block-today"),
  year: document.getElementById("block-year"),
  compat: document.getElementById("block-compat"),
};
const resultTabButtons = document.querySelectorAll("#result-tabs .pill-toggle-btn");
const compatTabBtn = document.querySelector('#result-tabs [data-tab="compat"]');

function applyResultTabVisibility() {
  const hasCompat = !!(lastResult && lastResult.compat);
  Object.entries(resultBlocks).forEach(([key, el]) => { el.hidden = key !== activeResultTab; });
  resultTabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === activeResultTab;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  compatTabBtn.classList.toggle("is-disabled", !hasCompat);
}

// ---------- 랜딩(카드 선택) / 입력 폼 화면 전환 ----------
// 처음엔 입력 칸 없이 카드 3개만 보여주고, 카드를 누르면 그때 해당 운세용 입력 폼으로 들어간다.
const heroGrid = document.getElementById("hero-grid");
const heroFormWrap = document.getElementById("hero-form-wrap");
const formBackBtn = document.getElementById("form-back-btn");

function showLanding() {
  heroGrid.classList.add("is-landing");
  heroFormWrap.hidden = true;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}
function showFormView(tab) {
  heroGrid.classList.remove("is-landing");
  heroFormWrap.hidden = false;
  if (tab === "compat") {
    partnerToggle.checked = true;
    partnerFields.hidden = false;
  }
  if (tab) activeResultTab = tab;
  history.replaceState(null, "", "#" + (tab || "form"));
  heroFormWrap.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}
formBackBtn.addEventListener("click", showLanding);

// ---------- 입력 화면 → 결과 화면 전환 ----------
// 결과는 입력 폼 아래에 이어붙이지 않고, 히어로(랜딩/폼) 전체를 감추고 결과만 보이는
// 별도 화면으로 전환한다. "정보 수정" 버튼을 누르면 입력했던 값 그대로 폼 화면으로 되돌아간다.
const heroSection = document.querySelector(".hero");
const resultsBackBtn = document.getElementById("results-back-btn");

function showResultsView() {
  heroSection.hidden = true;
  resultsSection.hidden = false;
  requestAnimationFrame(() => {
    resultsSection.classList.add("revealed");
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
}
function hideResultsView() {
  resultsSection.hidden = true;
  resultsSection.classList.remove("revealed");
  heroSection.hidden = false;
  showFormView(activeResultTab);
}
resultsBackBtn.addEventListener("click", hideResultsView);

// 상단 3카드 / 결과 탭 / 헤더·푸터의 신년운세·궁합 내비게이션에서 공통으로 쓰는 이동 로직.
// 아직 사주 계산 전이면 해당 탭에 맞는 입력 폼을 열고, 궁합인데 상대방 정보가 없다면
// 빈 탭을 보여주는 대신 상대방 입력란으로 안내한다.
function goToResultTab(tab) {
  if (tab === "compat" && !(lastResult && lastResult.compat)) {
    showFormView("compat");
    document.getElementById("partner-birth-date-display").focus({ preventScroll: true });
    return;
  }
  if (!lastResult) {
    showFormView(tab);
    return;
  }
  activeResultTab = tab;
  applyResultTabVisibility();
  resultsSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

// 초기 진입: 주소에 #today/#year/#compat 이 붙어 있으면 바로 그 폼으로 들어간다.
const initialHash = location.hash.replace("#", "");
if (["today", "year", "compat"].includes(initialHash)) showFormView(initialHash);

resultTabButtons.forEach((btn) => btn.addEventListener("click", () => goToResultTab(btn.dataset.tab)));
document.querySelectorAll(".feature-card--clickable").forEach((card) => {
  card.addEventListener("click", () => goToResultTab(card.dataset.tab));
});
[["footer-nav-year", "year"], ["footer-nav-compat", "compat"]].forEach(([id, tab]) => {
  document.getElementById(id).addEventListener("click", (e) => { e.preventDefault(); goToResultTab(tab); });
});
document.getElementById("footer-nav-analysis").addEventListener("click", (e) => {
  e.preventDefault();
  if (lastResult) { document.getElementById("block-pillars").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" }); return; }
  showFormView();
});

// 로고(브랜드) 클릭 = 홈으로: 결과 화면이든 폼 화면이든 다 접고 처음 랜딩(카드 3개) 화면으로 돌아간다.
document.querySelector(".brand-lockup").addEventListener("click", (e) => {
  e.preventDefault();
  resultsSection.hidden = true;
  resultsSection.classList.remove("revealed");
  heroSection.hidden = false;
  showLanding();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
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
  const animal = BRANCH_ANIMALS[lang][fortune.todayAnimalIndex];
  const godName = TEN_GOD_NAMES[lang][fortune.tenGodKey];
  if (lang === "ko") return `오늘은 ${fortune.todayStemKo}${fortune.todayBranchKo}일 (${animal}띠 기운) · 나와의 관계는 <strong>${godName}</strong>`;
  if (lang === "zh") {
    const roman = `${STEM_ROMAN[stemIndex(fortune.todayStem)]}-${BRANCH_ROMAN[branchIndex(fortune.todayBranch)]}`;
    return `今天是${roman}日（${animal}能量）· 与你的关系：<strong>${godName}</strong>`;
  }
  const meaning = stemMeaning(lang, fortune.todayStem);
  if (lang === "fr") return `Aujourd'hui est un jour ${animal} (${meaning}) · votre relation avec lui : <strong>${godName}</strong>`;
  return `Today's animal is the ${animal} (${meaning} energy) · your relationship with it: <strong>${godName}</strong>`;
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
// 중국어는 실제 한자를, 한국어는 한글 갑자를 보여준다. 영어/프랑스어는 병음(중국어 발음)을
// 쓰지 않고, 그 나라 말로 뜻이 통하는 오행(천간) / 띠 동물(지지)로 바꿔서 보여준다.
// 음양(陰陽)은 +/- 기운이므로 "Yang/Yin"이라는 외래어 대신 기호로 표기한다 (언어 무관, 번역 불필요).
function stemMeaning(lang, stemHanja) {
  const idx = stemIndex(stemHanja);
  const sign = isYangIndex(idx) ? "+" : "−"; // U+2212 MINUS SIGN
  const el = ELEMENT_NAMES[lang][STEM_ELEMENT[idx]];
  return `${sign} ${el}`;
}
function glyphScript(lang) {
  if (lang === "zh") return "cjk";
  if (lang === "ko") return "hangul";
  return "roman";
}
function pillarGlyphs(lang, p) {
  if (lang === "zh") return [p.stem, p.branch];
  if (lang === "ko") return [p.stemKo, p.branchKo];
  return [stemMeaning(lang, p.stem), BRANCH_ANIMALS[lang][p.animalIndex]];
}
function stemBranchGlyphText(lang, stem, branch, stemKo, branchKo, animalIndex) {
  if (lang === "zh") return stem + branch;
  if (lang === "ko") return stemKo + branchKo;
  const animal = BRANCH_ANIMALS[lang][animalIndex];
  return `${stemMeaning(lang, stem)} · ${animal}`;
}
function todayGlyphText(lang, fortune) {
  return stemBranchGlyphText(lang, fortune.todayStem, fortune.todayBranch, fortune.todayStemKo, fortune.todayBranchKo, fortune.todayAnimalIndex);
}

// ---------- 렌더링 ----------
function pillarNode(lang, label, p) {
  const el = document.createElement("div");
  el.className = "pillar";
  const stemEl = STEM_ELEMENT[stemIndex(p.stem)];
  el.style.setProperty("--pillar-glow", `var(--el-${stemEl})`);
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

// ---------- 오행 레이더 차트 (SVG) ----------
// 축 순서는 상생(相生) 순환(목→화→토→금→수)을 그대로 따르고, 히어로의 아스트롤라베
// 장식과 같은 각도를 써서 시각적으로 짝을 이루게 한다.
const SVGNS = "http://www.w3.org/2000/svg";
const WUXING_AXES = ELEMENT_ORDER.map((key, i) => ({ key, angleDeg: -90 + i * 72 }));
const WUXING_CENTER = 150, WUXING_MAX_R = 118, WUXING_MIN_R = 16;

function polarPoint(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return [WUXING_CENTER + r * Math.cos(rad), WUXING_CENTER + r * Math.sin(rad)];
}
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function buildWuxingChart(lang, wuxing) {
  const maxCount = Math.max(1, ...Object.values(wuxing));
  const svg = svgEl("svg", { viewBox: "0 0 300 300", class: "wuxing-svg", role: "img" });
  svg.setAttribute("aria-label", ELEMENT_ORDER.map((el) => `${ELEMENT_NAMES[lang][el]} ${wuxing[el]}`).join(", "));

  [0.34, 0.67, 1].forEach((f) => {
    svg.appendChild(svgEl("circle", { cx: WUXING_CENTER, cy: WUXING_CENTER, r: WUXING_MIN_R + (WUXING_MAX_R - WUXING_MIN_R) * f, class: "wuxing-web" }));
  });

  WUXING_AXES.forEach(({ angleDeg }) => {
    const [x, y] = polarPoint(angleDeg, WUXING_MAX_R);
    svg.appendChild(svgEl("line", { x1: WUXING_CENTER, y1: WUXING_CENTER, x2: x, y2: y, class: "wuxing-axis" }));
  });

  const points = WUXING_AXES.map(({ key, angleDeg }) => {
    const r = WUXING_MIN_R + (WUXING_MAX_R - WUXING_MIN_R) * (wuxing[key] / maxCount);
    return polarPoint(angleDeg, r);
  });
  svg.appendChild(svgEl("polygon", { points: points.map((p) => p.join(",")).join(" "), class: "wuxing-shape" }));

  WUXING_AXES.forEach(({ key }, i) => {
    const [x, y] = points[i];
    svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 5.5, class: "wuxing-point", "data-element": key }));
  });

  return svg;
}

function buildWuxingLegend(lang, wuxing) {
  const wrap = document.createElement("div");
  wrap.className = "wuxing-legend";
  ELEMENT_ORDER.forEach((el, i) => {
    const item = document.createElement("span");
    item.className = "wuxing-legend-item";
    item.style.setProperty("--stagger", i);
    item.innerHTML = `<span class="swatch" data-element="${el}" style="background:var(--el-${el})"></span>${ELEMENT_NAMES[lang][el]} <span class="count">${wuxing[el]}</span>`;
    wrap.appendChild(item);
  });
  return wrap;
}

// ---------- 히어로 장식(아스트롤라베) 눈금 ----------
function astrolabePoint(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return [160 + r * Math.cos(rad), 160 + r * Math.sin(rad)];
}
function drawAstrolabeTicks() {
  const g = document.getElementById("astrolabe-ticks");
  if (!g || g.childElementCount) return;
  for (let i = 0; i < 24; i++) {
    const angle = i * 15;
    const major = i % 2 === 0;
    const [x1, y1] = astrolabePoint(angle - 90, 150);
    const [x2, y2] = astrolabePoint(angle - 90, major ? 137 : 143);
    g.appendChild(svgEl("line", { x1, y1, x2, y2, class: major ? "astrolabe-tick astrolabe-tick--major" : "astrolabe-tick" }));
  }
}
drawAstrolabeTicks();

function yearGlyphText(lang, yf) {
  if (lang === "zh") return yf.yearStem + yf.yearBranch;
  if (lang === "ko") return yf.yearStemKo + yf.yearBranchKo;
  const animal = BRANCH_ANIMALS[lang][yf.yearAnimalIndex];
  return `${stemMeaning(lang, yf.yearStem)} · ${animal}`;
}

function formatYearGanji(lang, yf, currentYear) {
  const animal = BRANCH_ANIMALS[lang][yf.yearAnimalIndex];
  const godName = TEN_GOD_NAMES[lang][yf.tenGodKey];
  if (lang === "ko") return `${currentYear}년은 ${yf.yearStemKo}${yf.yearBranchKo}년 (${animal}띠 기운) · 나와의 관계는 <strong>${godName}</strong>`;
  if (lang === "zh") {
    const roman = `${STEM_ROMAN[stemIndex(yf.yearStem)]}-${BRANCH_ROMAN[branchIndex(yf.yearBranch)]}`;
    return `${currentYear}年是${roman}年（${animal}能量）· 与你的关系：<strong>${godName}</strong>`;
  }
  const meaning = stemMeaning(lang, yf.yearStem);
  if (lang === "fr") return `${currentYear} est une année ${animal} (${meaning}) · votre relation avec elle : <strong>${godName}</strong>`;
  return `${currentYear}'s animal is the ${animal} (${meaning} energy) · your relationship with it: <strong>${godName}</strong>`;
}

function dayMasterGlyphText(lang, stemHanja) {
  if (lang === "zh") return stemHanja;
  if (lang === "ko") return STEM_KO[stemIndex(stemHanja)];
  return stemMeaning(lang, stemHanja);
}

function renderYearFortune(lang, yearFortune) {
  const currentYear = new Date().getFullYear();
  document.getElementById("year-ganji").innerHTML = `
    <span class="pillar-glyph small ${glyphScript(lang)}" data-element="${yearFortune.yearElement}">${yearGlyphText(lang, yearFortune)}</span>
    <span class="today-ganji-label">${formatYearGanji(lang, yearFortune, currentYear)}</span>
  `;
  document.getElementById("year-headline").textContent = YEAR_FORTUNE_INFO[lang][yearFortune.tenGodKey];
}

const COMPAT_RELATION_ICON = { same: "=", generate: "→", control: "⚔" };

function renderCompatibility(lang, name, compat) {
  if (!compat) return; // 표시 여부는 activeResultTab 기반의 applyResultTabVisibility()가 담당한다.

  const s = STRINGS[lang];
  const partnerLabel = compat.partnerName || s.labelPartnerName;
  document.getElementById("compat-subtitle").textContent = `${name} ${s.compatIntro} ${partnerLabel}`;

  const script = glyphScript(lang);
  const pair = document.getElementById("compat-pair");
  pair.innerHTML = `
    <div class="compat-person">
      <span class="pillar-glyph small ${script}" data-element="${compat.elA}">${dayMasterGlyphText(lang, compat.dayMasterA)}</span>
      <span class="compat-person-name">${name}</span>
    </div>
    <div class="compat-relation">
      <span class="compat-relation-icon" aria-hidden="true">${COMPAT_RELATION_ICON[compat.relation]}</span>
      <span class="compat-relation-label">${COMPAT_LABELS[lang][compat.relation]}</span>
    </div>
    <div class="compat-person">
      <span class="pillar-glyph small ${script}" data-element="${compat.elB}">${dayMasterGlyphText(lang, compat.dayMasterB)}</span>
      <span class="compat-person-name">${partnerLabel}</span>
    </div>
  `;

  document.getElementById("compat-body").textContent = COMPAT_INFO[lang][compat.relation];
}

function renderResults(lang, result) {
  const { name, saju, fortune, yearFortune, compat, hasTime, regionId } = result;
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
  wuxingEl.appendChild(buildWuxingChart(lang, saju.wuxing));
  wuxingEl.appendChild(buildWuxingLegend(lang, saju.wuxing));

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

  renderYearFortune(lang, yearFortune);
  renderCompatibility(lang, name, compat);
}

// ---------- 초기화 ----------
setLang(getStoredLang());
