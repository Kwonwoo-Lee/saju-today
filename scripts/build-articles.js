// scripts/build-articles.js
//
// Builds every article page, the per-language archive index pages, and
// articles/latest.json from two sources of truth:
//   - articles/manifest.json          — ordered list of {date, slug}, newest first
//   - articles/content/<slug>/<lang>.json — {title, description, excerpt, bodyHtml}
//
// A story only needs a content/<slug>/<lang>.json file for the languages it has
// actually been written in — missing languages are simply skipped (no page,
// no index entry, no hreflang link) rather than erroring.
//
// Output:
//   /articles/<slug>              (English, root — matches the site's default-lang convention)
//   /ko/articles/<slug>
//   /zh/articles/<slug>
//   /fr/articles/<slug>
//   /articles/index.html, /ko/articles/index.html, /zh/articles/index.html, /fr/articles/index.html
//   /articles/latest.json         ({ en: {...}, ko: {...}, zh: {...}, fr: {...} })
//
// Run: node scripts/build-articles.js
// (Run this after adding/editing anything under articles/content/ or manifest.json.)
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://saju.tradesmrt.com";
const LANGS = ["en", "zh", "fr", "ko"];
const LANG_PREFIX = { en: "", zh: "/zh", fr: "/fr", ko: "/ko" };

const UI = {
  en: {
    brand: "Saju Today", brandSub: "Four Pillars",
    back: "← Back to Today's Reads", home: "Home", articlesNav: "Today's Reads",
    privacy: "Privacy", terms: "Terms", contact: "Contact",
    disclaimer: "This piece is general seasonal reference content and doesn't replace a personal Saju reading.",
    listTitle: "Today's Reads", listBack: "← Back to Saju Today",
    listLede: "Fresh zodiac & Saju stories, published regularly. Past posts stay archived here.",
    listMetaDescription: "Zodiac and Saju stories from Saju Today, published regularly — today's lucky signs, seasonal reads, and more.",
    footerCopyright: "© 2026 Saju Today. All rights reserved.",
  },
  zh: {
    brand: "今日八字", brandSub: "四柱",
    back: "← 返回今日文章", home: "首页", articlesNav: "今日文章",
    privacy: "隐私政策", terms: "使用条款", contact: "联系我们",
    disclaimer: "本文是基于季节变化的一般性参考内容，不能替代个人八字命盘解读。",
    listTitle: "今日文章", listBack: "← 返回今日八字",
    listLede: "定期发布的星座与八字文章，往期文章也都保留在这里。",
    listMetaDescription: "今日八字定期发布的星座与八字文章——今日幸运星座、季节话题等。",
    footerCopyright: "© 2026 今日八字. All rights reserved.",
  },
  fr: {
    brand: "Saju du Jour", brandSub: "Quatre Piliers",
    back: "← Retour aux articles du jour", home: "Accueil", articlesNav: "Articles du jour",
    privacy: "Confidentialité", terms: "Conditions", contact: "Contact",
    disclaimer: "Cet article est un contenu de référence général basé sur les saisons et ne remplace pas une lecture Saju personnelle.",
    listTitle: "Articles du jour", listBack: "← Retour à Saju du Jour",
    listLede: "Des articles sur le zodiaque et le Saju publiés régulièrement. Les anciens articles restent archivés ici.",
    listMetaDescription: "Articles sur le zodiaque et le Saju publiés régulièrement par Saju du Jour — signes chanceux du jour, lectures saisonnières, et plus.",
    footerCopyright: "© 2026 Saju du Jour. Tous droits réservés.",
  },
  ko: {
    brand: "사주 오늘", brandSub: "오늘의 네 기둥",
    back: "← 오늘의 글 목록으로", home: "홈", articlesNav: "오늘의 글",
    privacy: "개인정보처리방침", terms: "이용약관", contact: "문의",
    disclaimer: "이 글은 계절의 흐름을 바탕으로 한 일반적인 참고용 콘텐츠이며, 개인의 정확한 사주 풀이를 대신하지 않습니다.",
    listTitle: "오늘의 글", listBack: "← 사주 오늘로 돌아가기",
    listLede: "별자리와 사주 이야기를 매일 새로 씁니다. 지나간 글도 모두 여기서 다시 볼 수 있어요.",
    listMetaDescription: "사주 오늘이 매일 발행하는 별자리·사주 운세 글 모음입니다. 오늘 운이 좋은 별자리, 이달의 흐름 같은 이야기를 확인하세요.",
    footerCopyright: "© 2026 사주 오늘. All rights reserved.",
  },
};

const DATE_LABEL = {
  en: (d) => `Published ${new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}`,
  zh: (d) => `${d.replace(/-/g, "年").replace("年", "年").replace(/年(\d+)年/, "年$1月")}日发布`.replace(/^(\d+)年/, "$1年"),
  fr: (d) => `Publié le ${new Date(d + "T00:00:00Z").toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}`,
  ko: (d) => `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 발행`,
};
// zh date label built more simply to avoid regex gymnastics above being fragile
DATE_LABEL.zh = (d) => `${d.slice(0, 4)}年${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日发布`;

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function articleDir(lang) {
  return path.join(ROOT, lang === "en" ? "" : lang, "articles");
}
function articleUrl(lang, slug) {
  return `${LANG_PREFIX[lang]}/articles/${slug}`;
}
function articlesIndexUrl(lang) {
  return `${LANG_PREFIX[lang]}/articles/`;
}
function homeHref(lang) {
  return `${LANG_PREFIX[lang]}/`;
}

function renderHead({ lang, title, ogTitle, description, canonical, jsonLd, hreflangSiblings }) {
  const hreflang = hreflangSiblings
    .map(([hl, url]) => `<link rel="alternate" hreflang="${hl}" href="${url}">`)
    .join("\n");
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3QH442VS1C"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-3QH442VS1C');
</script>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WJVS8HPK');</script>
<!-- End Google Tag Manager -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
${hreflang}
<meta name="theme-color" content="#06070f">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔮</text></svg>">
${jsonLd ? `
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${ogTitle || title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:card" content="summary_large_image">

<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>` : ""}

<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<link rel="stylesheet" href="/style.css">`;
}

function renderChrome({ lang, head, mainInner }) {
  const t = UI[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
${head}
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WJVS8HPK"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<div class="grain" aria-hidden="true"></div>

<header class="site-header">
  <div class="wrap site-header-row">
    <a href="${homeHref(lang)}" class="brand-lockup" aria-label="${t.brand}">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" class="brand-mark-ring"></circle><circle cx="20" cy="20" r="10" class="brand-mark-ring brand-mark-ring--in"></circle><circle cx="20" cy="20" r="3" class="brand-mark-core"></circle><line x1="20" y1="1" x2="20" y2="5" class="brand-mark-tick"></line><line x1="20" y1="35" x2="20" y2="39" class="brand-mark-tick"></line><line x1="1" y1="20" x2="5" y2="20" class="brand-mark-tick"></line><line x1="35" y1="20" x2="39" y2="20" class="brand-mark-tick"></line></svg>
      </span>
      <span class="brand">${t.brand}</span>
      <span class="brand-sub">${t.brandSub}</span>
    </a>
  </div>
</header>

${mainInner}

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-row">
      <div class="footer-brand">
        <p class="footer-brand-name">${t.brand}</p>
        <p class="footer-url">saju.tradesmrt.com</p>
      </div>
      <div class="footer-right">
        <nav class="footer-nav" aria-label="Footer">
          <a href="${homeHref(lang)}">${t.home}</a>
          <a href="${articlesIndexUrl(lang)}">${t.articlesNav}</a>
          <a href="/privacy">${t.privacy}</a>
          <a href="/terms">${t.terms}</a>
          <a href="mailto:kwonwoo4056@gmail.com">${t.contact}</a>
        </nav>
        <p class="footer-copyright">${t.footerCopyright}</p>
      </div>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function buildArticlePage(story, lang, content, siblingLangs) {
  const t = UI[lang];
  const canonical = `${SITE_URL}${articleUrl(lang, story.slug)}`;
  const hreflangSiblings = siblingLangs.map((hl) => [hl, `${SITE_URL}${articleUrl(hl, story.slug)}`]);
  hreflangSiblings.push(["x-default", `${SITE_URL}${articleUrl("en", story.slug)}`]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.title,
    description: content.description,
    datePublished: story.date,
    dateModified: story.date,
    inLanguage: lang,
    author: { "@type": "Organization", name: "Saju Today" },
    publisher: { "@type": "Organization", name: "Saju Today", url: `${SITE_URL}/` },
    mainEntityOfPage: canonical,
  };
  const head = renderHead({
    lang,
    title: `${content.title} - ${t.brand}`,
    ogTitle: content.title,
    description: content.description,
    canonical,
    jsonLd,
    hreflangSiblings,
  });
  const mainInner = `<main class="legal-main">
  <div class="wrap">
    <a href="${articlesIndexUrl(lang)}" class="legal-back">${t.back}</a>
    <h1>${content.title}</h1>
    <p class="legal-updated">${DATE_LABEL[lang](story.date)}</p>

    ${content.bodyHtml}

    <p class="legal-updated" style="margin-top:40px;">${t.disclaimer}</p>
  </div>
</main>`;
  return renderChrome({ lang, head, mainInner });
}

function buildIndexPage(lang, entries) {
  const t = UI[lang];
  const canonical = `${SITE_URL}${articlesIndexUrl(lang)}`;
  const items = entries
    .map(
      (e) => `        <div class="faq-item">
          <p class="legal-updated" style="margin-bottom:6px;">${e.date}</p>
          <h3><a href="${e.url}">${e.title}</a></h3>
          <p>${e.excerpt || ""}</p>
        </div>`
    )
    .join("\n");
  const head = renderHead({
    lang,
    title: `${t.listTitle} - ${t.brand}`,
    description: t.listMetaDescription,
    canonical,
    jsonLd: null,
    hreflangSiblings: LANGS.map((hl) => [hl, `${SITE_URL}${articlesIndexUrl(hl)}`]).concat([["x-default", `${SITE_URL}${articlesIndexUrl("en")}`]]),
  });
  const mainInner = `<main class="legal-main">
  <div class="wrap">
    <a href="${homeHref(lang)}" class="legal-back">${t.listBack}</a>
    <h1>${t.listTitle}</h1>
    <p class="legal-updated">${t.listLede}</p>

    <div class="faq-list" id="article-list" style="grid-template-columns: 1fr; margin-top: 32px;">
${items || ""}
    </div>
  </div>
</main>`;
  return renderChrome({ lang, head, mainInner });
}

// ---------- main ----------
const manifest = readJSON(path.join(ROOT, "articles", "manifest.json"));
if (!Array.isArray(manifest)) throw new Error("articles/manifest.json must be an array.");

const indexEntries = { en: [], zh: [], fr: [], ko: [] };
const latest = {};

for (const story of manifest) {
  const contentDir = path.join(ROOT, "articles", "content", story.slug);
  const availableLangs = LANGS.filter((l) => fs.existsSync(path.join(contentDir, `${l}.json`)));
  if (availableLangs.length === 0) {
    console.warn(`warning: no content files found for ${story.slug}, skipping`);
    continue;
  }
  for (const lang of availableLangs) {
    const content = readJSON(path.join(contentDir, `${lang}.json`));
    const siblingLangs = availableLangs.filter((l) => l !== lang);
    const html = buildArticlePage(story, lang, content, siblingLangs);
    const outDir = articleDir(lang);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${story.slug}.html`), html, "utf8");

    const url = articleUrl(lang, story.slug);
    indexEntries[lang].push({ date: story.date, url, title: content.title, excerpt: content.excerpt });
    if (!latest[lang]) latest[lang] = { url, title: content.title, excerpt: content.excerpt, date: story.date };
  }
}

for (const lang of LANGS) {
  const html = buildIndexPage(lang, indexEntries[lang]);
  const outDir = articleDir(lang);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

fs.writeFileSync(path.join(ROOT, "articles", "latest.json"), JSON.stringify(latest, null, 2) + "\n", "utf8");

console.log(`built ${manifest.length} stories x up to ${LANGS.length} languages; wrote latest.json and 4 index pages`);
