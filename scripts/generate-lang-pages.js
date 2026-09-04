// scripts/generate-lang-pages.js
//
// index.html + i18n.js가 유일한 원본(single source of truth)입니다.
// 이 스크립트는 index.html(영어)을 템플릿으로 삼아, i18n.js의 STRINGS를
// 그대로 읽어서 /zh/index.html, /fr/index.html, /ko/index.html을
// "빌드 시점에 미리 렌더링된" 정적 페이지로 생성합니다.
//
// 목적: 지금까지는 언어 전환이 클라이언트 JS로만 일어나서 URL이 하나뿐이었고,
// 검색엔진이 번역된 콘텐츠를 별도로 색인할 방법이 없었습니다. 이 스크립트로
// 언어별 실제 URL이 생기고, 크롤러가 JS 실행 없이도 해당 언어 텍스트를
// 바로 읽을 수 있게 됩니다.
//
// 실행: node scripts/generate-lang-pages.js
// (index.html이나 i18n.js를 고치면 반드시 다시 실행해야 4개 언어가 동기화됩니다.)
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://saju.tradesmrt.com";

// ---------- i18n.js에서 STRINGS를 안전하게 읽기 (i18n.js 자체는 수정 안 함) ----------
const i18nSource = fs.readFileSync(path.join(ROOT, "i18n.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
// i18n.js는 top-level에서 const로 선언하는데, vm 컨텍스트에서 const/let 바인딩은
// 전역 객체(sandbox)의 프로퍼티로 노출되지 않으므로, 같은 스크립트 끝에 한 줄
// 덧붙여서 필요한 값들을 sandbox로 명시적으로 꺼내온다 (i18n.js 파일 자체는 안 건드림).
const wrapped = i18nSource + "\n;globalThis.__EXPORTS__ = { STRINGS: STRINGS, SUPPORTED_LANGS: SUPPORTED_LANGS, DEFAULT_LANG: DEFAULT_LANG };";
vm.runInContext(wrapped, sandbox, { filename: "i18n.js" });
const { STRINGS, SUPPORTED_LANGS, DEFAULT_LANG } = sandbox.__EXPORTS__ || {};
if (!STRINGS || !SUPPORTED_LANGS || !DEFAULT_LANG) {
  throw new Error("i18n.js에서 STRINGS/SUPPORTED_LANGS/DEFAULT_LANG을 읽지 못했습니다.");
}

const LANG_PATH = { en: "/", zh: "/zh/", fr: "/fr/", ko: "/ko/" };

// applyStaticStrings(app.js)와 1:1로 대응하는 텍스트 필드 매핑
const TEXT_FIELDS = [
  ["page-title", "pageTitle"],
  ["brand-name", "brand"], ["brand-sub", "brandSub"],
  ["hero-title-1", "heroTitleLine1"], ["hero-title-2", "heroTitleLine2"],
  ["hero-eyebrow", "heroEyebrowSeo"], ["hero-form-title", "heroFormTitle"],
  ["form-back-label", "formBack"], ["results-back-label", "resultsBack"],
  ["feature-pillars-title", "featurePillarsTitle"], ["feature-pillars-body", "featurePillarsBody"],
  ["feature-wuxing-title", "featureWuxingTitle"], ["feature-wuxing-body", "featureWuxingBody"],
  ["feature-today-title", "featureTodayTitle"], ["feature-today-body", "featureTodayBody"],
  ["label-name", "labelName"], ["hint-name", "hintName"],
  ["label-birth-date", "labelBirthDate"],
  ["calendar-solar-btn", "calendarSolar"], ["calendar-lunar-btn", "calendarLunar"],
  ["label-gender", "labelGender"],
  ["gender-male-btn", "optionMale"], ["gender-female-btn", "optionFemale"],
  ["hint-gender", "hintGender"],
  ["label-birth-time", "labelBirthTime"], ["label-time-unknown", "labelTimeUnknown"],
  ["hint-time", "hintTime"],
  ["label-region", "labelRegion"], ["hint-region", "hintRegion"],
  ["label-dst", "labelDST"], ["hint-dst", "hintDST"],
  ["submit-btn-label", "submitBtn"],
  ["compat-form-title", "compatFormTitle"], ["compat-form-back-label", "formBack"],
  ["label-compat-name-a", "labelCompatNameA"], ["label-compat-date-a", "labelCompatDateA"],
  ["label-compat-name-b", "labelPartnerName"], ["label-compat-date-b", "labelPartnerBirthDate"],
  ["hint-compat-form", "hintCompatForm"], ["compat-submit-btn-label", "compatSubmitBtn"],
  ["compat-score-kicker", "compatScoreKicker"],
  ["wuxing-title", "resultTitleWuxing"], ["today-title", "resultTitleToday"],
  ["year-title", "resultTitleYear"], ["compat-title", "resultTitleCompat"],
  ["tab-today-btn", "resultTitleToday"], ["tab-year-btn", "resultTitleYear"],
  ["tab-compat-btn", "resultTitleCompat"],
  ["footer-disclaimer", "footerDisclaimer"],
  ["about-title", "aboutTitle"], ["about-lede", "aboutLede"],
  ["footer-brand-name", "brand"],
  ["footer-nav-analysis", "navAnalysis"], ["footer-nav-year", "navYear"], ["footer-nav-compat", "navCompat"],
  ["footer-nav-privacy", "navPrivacy"], ["footer-nav-terms", "navTerms"], ["footer-nav-contact", "navContact"],
  ["footer-copyright", "footerCopyright"],
  ["share-today-label", "shareCardBtn"], ["share-year-label", "shareCardBtn"], ["share-compat-label", "shareCardBtn"],
  ["faq-q1", "faqQ1"], ["faq-a1", "faqA1"],
  ["faq-q2", "faqQ2"], ["faq-a2", "faqA2"],
  ["faq-q3", "faqQ3"], ["faq-a3", "faqA3"],
  ["faq-q4", "faqQ4"], ["faq-a4", "faqA4"],
  ["faq-q5", "faqQ5"], ["faq-a5", "faqA5"],
];

const ATTR_FIELDS = [
  ["meta-description", "content", "metaDescription"],
  ["og-title", "content", "pageTitle"],
  ["og-description", "content", "metaDescription"],
  ["twitter-title", "content", "pageTitle"],
  ["twitter-description", "content", "metaDescription"],
  ["name", "placeholder", "placeholderName"],
  ["compat-name-a", "placeholder", "placeholderName"],
  ["compat-name-b", "placeholder", "placeholderPartnerName"],
  ["lang-switch", "aria-label", "langLabel"],
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setText(html, id, text) {
  const re = new RegExp(`(id="${id}"[^>]*>)([\\s\\S]*?)(</)`);
  if (!re.test(html)) throw new Error(`[setText] id="${id}" 요소를 찾지 못했습니다.`);
  return html.replace(re, (_m, open, _old, close) => open + escapeHtml(text) + close);
}

function setAttr(html, id, attr, value) {
  const re = new RegExp(`(id="${id}"[^>]*${attr}=")([^"]*)(")`);
  if (!re.test(html)) throw new Error(`[setAttr] id="${id}" 의 ${attr} 속성을 찾지 못했습니다.`);
  return html.replace(re, (_m, open, _old, close) => open + escapeHtml(value) + close);
}

function rewriteJsonLd(html, lang, s) {
  const scriptRe = /<script type="application\/ld\+json">\r?\n([\s\S]*?)\r?\n<\/script>/g;
  let match;
  const replacements = [];
  while ((match = scriptRe.exec(html)) !== null) {
    const raw = match[1];
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error(`JSON-LD 파싱 실패: ${e.message}`);
    }
    if (data["@type"] === "WebApplication") {
      data.url = SITE_URL + LANG_PATH[lang];
      data.description = s.metaDescription;
      data.inLanguage = [lang];
    } else if (data["@type"] === "FAQPage") {
      data.mainEntity = data.mainEntity.map((_q, i) => ({
        "@type": "Question",
        name: s[`faqQ${i + 1}`],
        acceptedAnswer: { "@type": "Answer", text: s[`faqA${i + 1}`] },
      }));
    }
    replacements.push([match[0], `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`]);
  }
  let out = html;
  for (const [oldBlock, newBlock] of replacements) out = out.replace(oldBlock, newBlock);
  return out;
}

function generate(lang) {
  const s = STRINGS[lang];
  if (!s) throw new Error(`STRINGS에 "${lang}" 언어가 없습니다.`);

  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  // <html lang="en"> -> 대상 언어
  html = html.replace(/<html lang="en">/, `<html lang="${lang}">`);

  // canonical / og:url -> 언어별 경로
  html = html.replace(
    /<link rel="canonical" href="https:\/\/saju\.tradesmrt\.com\/">/,
    `<link rel="canonical" href="${SITE_URL}${LANG_PATH[lang]}">`
  );
  html = html.replace(
    /<meta property="og:url" content="https:\/\/saju\.tradesmrt\.com\/">/,
    `<meta property="og:url" content="${SITE_URL}${LANG_PATH[lang]}">`
  );

  // 루트 페이지 전용 브라우저 언어 자동 안내 스크립트는 언어별 페이지에는 불필요 -
  // (이미 pathname 가드가 있어 안전하지만, 생성물을 깔끔하게 유지하기 위해 통째로 제거)
  html = html.replace(/<script id="lang-auto-redirect">[\s\S]*?<\/script>\n?/, "");

  for (const [id, key] of TEXT_FIELDS) {
    if (!(key in s)) throw new Error(`STRINGS.${lang}.${key} 가 없습니다 (id="${id}")`);
    html = setText(html, id, s[key]);
  }
  for (const [id, attr, key] of ATTR_FIELDS) {
    if (!(key in s)) throw new Error(`STRINGS.${lang}.${key} 가 없습니다 (id="${id}" ${attr})`);
    html = setAttr(html, id, attr, s[key]);
  }

  html = rewriteJsonLd(html, lang, s);

  const outDir = path.join(ROOT, lang);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
  console.log(`generated ${lang}/index.html (${html.length} bytes)`);
}

for (const lang of SUPPORTED_LANGS) {
  if (lang === DEFAULT_LANG) continue; // 기본 언어(en)는 루트 index.html을 그대로 사용
  generate(lang);
}
