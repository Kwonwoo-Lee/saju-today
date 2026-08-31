// app.js — UI 바인딩
"use strict";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- 지역 셀렉트 채우기 ----
const regionSelect = document.getElementById("region");
REGIONS.forEach((r) => {
  const opt = document.createElement("option");
  opt.value = r.id;
  opt.textContent = r.name;
  regionSelect.appendChild(opt);
});
function regionLng(id) {
  const r = REGIONS.find((x) => x.id === id);
  return r ? r.lng : 135;
}

// ---- 시간 모름 토글 ----
const timeInput = document.getElementById("birth-time");
const timeUnknown = document.getElementById("time-unknown");
timeUnknown.addEventListener("change", () => {
  timeInput.disabled = timeUnknown.checked;
  timeInput.required = !timeUnknown.checked;
  if (timeUnknown.checked) timeInput.value = "";
});

// ---- 이름 입력 검증(영문) ----
const nameInput = document.getElementById("name");
const namePattern = /^[A-Za-z][A-Za-z .'\-]{0,58}$/;
nameInput.addEventListener("input", () => {
  const ok = namePattern.test(nameInput.value.trim());
  nameInput.setCustomValidity(nameInput.value.trim() === "" || ok ? "" : "영문 알파벳으로 입력해주세요.");
});

// ---- 폼 제출 ----
const form = document.getElementById("saju-form");
const resultsSection = document.getElementById("results");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const name = nameInput.value.trim();
  const dateVal = document.getElementById("birth-date").value; // yyyy-mm-dd
  const gender = document.getElementById("gender").value;
  const regionId = regionSelect.value;
  const hasTime = !timeUnknown.checked && timeInput.value !== "";

  const [year, month, day] = dateVal.split("-").map(Number);
  let hour = 12, minute = 0;
  if (hasTime) {
    const [h, m] = timeInput.value.split(":").map(Number);
    hour = h; minute = m;
  }

  const lng = regionLng(regionId);

  const saju = computeSaju({ year, month, day, hour, minute, hasTime, lng, gender });
  const fortune = computeTodayFortune(saju.dayMaster, new Date());

  renderResults({ name, saju, fortune, lng, regionId, hasTime });

  resultsSection.hidden = false;
  requestAnimationFrame(() => {
    resultsSection.classList.add("revealed");
    resultsSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  });
});

// ---- 렌더링 ----
function pillarNode(label, p) {
  const el = document.createElement("div");
  el.className = "pillar";
  el.innerHTML = `
    <p class="pillar-label">${label}</p>
    <div class="pillar-chars">
      <span class="hanja" data-element="${STEM_ELEMENT[stemIndex(p.stem)]}">${p.stem}</span>
      <span class="hanja" data-element="${BRANCH_ELEMENT[branchIndex(p.branch)]}">${p.branch}</span>
    </div>
    <p class="pillar-reading">${p.stemKo}${p.branchKo} · ${p.animal}띠 기운</p>
  `;
  return el;
}

function renderResults({ name, saju, fortune, regionId, hasTime }) {
  // 사주팔자 타이틀
  const pillarsCount = hasTime ? 4 : 3;
  document.getElementById("pillars-title").textContent =
    `${name}님의 사주${pillarsCount === 4 ? "팔자" : " (년·월·일주)"}`;

  const note = document.getElementById("correction-note");
  const regionName = REGIONS.find((r) => r.id === regionId)?.name || "";
  const offsetAbs = Math.abs(Math.round(saju.offsetMinutes));
  const dir = saju.offsetMinutes < 0 ? "느리게" : "빠르게";
  note.textContent = hasTime
    ? `${regionName} 기준 진태양시 보정 적용 (표준시보다 약 ${offsetAbs}분 ${dir} 흐름) · 시주까지 4기둥 표기`
    : "태어난 시각 미상 · 시주(時柱)는 제외한 3기둥만 표기합니다";

  // 기둥
  const pillarsEl = document.getElementById("pillars");
  pillarsEl.innerHTML = "";
  pillarsEl.appendChild(pillarNode("년주", saju.yearPillar));
  pillarsEl.appendChild(pillarNode("월주", saju.monthPillar));
  pillarsEl.appendChild(pillarNode("일주", saju.dayPillar));
  if (hasTime) pillarsEl.appendChild(pillarNode("시주", saju.timePillar));
  [...pillarsEl.children].forEach((child, i) => {
    child.style.setProperty("--stagger", i);
  });

  // 오행 차트
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
      <span class="wuxing-label" data-element="${el}">${ELEMENT_HANJA[el]} ${ELEMENT_KO[el]}</span>
      <div class="wuxing-track"><div class="wuxing-fill" data-element="${el}" style="--pct:${pct}%"></div></div>
      <span class="wuxing-count">${count}</span>
    `;
    wuxingEl.appendChild(row);
  });

  // 대운 캡션 (있으면)
  if (saju.yun) {
    const dir2 = saju.yun.forward ? "순행" : "역행";
    note.textContent += ` · 대운은 만 ${saju.yun.startYear}세${saju.yun.startMonth ? " " + saju.yun.startMonth + "개월" : ""}부터 ${dir2}으로 시작`;
  }

  // 오늘의 운세
  const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  document.getElementById("today-date").textContent = todayStr;

  document.getElementById("today-ganji").innerHTML = `
    <span class="hanja small" data-element="${fortune.todayElement}">${fortune.todayStem}${fortune.todayBranch}</span>
    <span class="today-ganji-label">오늘은 ${fortune.todayStemKo}${fortune.todayBranchKo}일 (${fortune.todayAnimal}띠 기운) · 나와의 관계는 <strong>${fortune.tenGod}</strong></span>
  `;

  document.getElementById("fortune-headline").textContent = fortune.info.overall;
  document.getElementById("fortune-body").textContent =
    `오늘의 일간은 ${ELEMENT_KO[fortune.todayElement]}(${ELEMENT_HANJA[fortune.todayElement]}) 기운이고, ${name}님의 일간과는 '${fortune.tenGod}' 관계를 이룹니다.`;

  const grid = document.getElementById("fortune-grid");
  grid.innerHTML = "";
  [
    { label: "재물운", text: fortune.info.wealth },
    { label: "애정운", text: fortune.info.love },
    { label: "건강운", text: fortune.info.health },
  ].forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "fortune-card";
    card.style.setProperty("--stagger", i);
    card.innerHTML = `<h3>${item.label}</h3><p>${item.text}</p>`;
    grid.appendChild(card);
  });

  document.getElementById("lucky-row").innerHTML = `
    <span>오늘의 행운 색 <strong>${fortune.luckyColor}</strong></span>
    <span>오늘의 행운 숫자 <strong>${fortune.luckyNumbers.join(" · ")}</strong></span>
  `;
}
