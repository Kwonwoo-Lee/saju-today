// scripts/generate-sitemap.js
//
// Regenerates sitemap.xml from: the 4 language homepages + static pages
// (hand-maintained just below) + every article that exists per language,
// read from articles/manifest.json + articles/content/<slug>/<lang>.json.
// Run this after node scripts/build-articles.js whenever articles change.
//
// 실행: node scripts/generate-sitemap.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://saju.tradesmrt.com";
const today = new Date().toISOString().slice(0, 10);
const LANGS = ["en", "zh", "fr", "ko"];
const LANG_PREFIX = { en: "", zh: "/zh", fr: "/fr", ko: "/ko" };

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "articles", "manifest.json"), "utf8"));

const LANG_URLS = {
  en: `${SITE_URL}/`,
  zh: `${SITE_URL}/zh/`,
  fr: `${SITE_URL}/fr/`,
  ko: `${SITE_URL}/ko/`,
};
const homeHreflang = Object.entries(LANG_URLS)
  .map(([lang, url]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${url}"/>`)
  .join("\n") + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${LANG_URLS.en}"/>`;

const homeEntries = [
  { loc: LANG_URLS.en, priority: "1.0" },
  { loc: LANG_URLS.zh, priority: "0.9" },
  { loc: LANG_URLS.fr, priority: "0.9" },
  { loc: LANG_URLS.ko, priority: "0.9" },
].map(
  (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p.priority}</priority>
${homeHreflang}
  </url>`
);

const staticEntries = [
  { loc: `${SITE_URL}/privacy`, lastmod: "2026-09-21", changefreq: "monthly", priority: "0.3" },
  { loc: `${SITE_URL}/terms`, lastmod: "2026-09-04", changefreq: "monthly", priority: "0.3" },
].map(
  (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
);

function articleUrl(lang, slug) {
  return `${SITE_URL}${LANG_PREFIX[lang]}/articles/${slug}`;
}
function articlesIndexUrl(lang) {
  return `${SITE_URL}${LANG_PREFIX[lang]}/articles/`;
}

const articleIndexHreflang = LANGS
  .map((lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${articlesIndexUrl(lang)}"/>`)
  .join("\n") + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${articlesIndexUrl("en")}"/>`;

const articlesIndexEntries = LANGS.map(
  (lang) => `  <url>
    <loc>${articlesIndexUrl(lang)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
${articleIndexHreflang}
  </url>`
);

const articleEntries = [];
for (const story of manifest) {
  const contentDir = path.join(ROOT, "articles", "content", story.slug);
  const availableLangs = LANGS.filter((l) => fs.existsSync(path.join(contentDir, `${l}.json`)));
  if (availableLangs.length === 0) continue;
  const hreflang = availableLangs
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${articleUrl(l, story.slug)}"/>`)
    .join("\n") + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${articleUrl(availableLangs.includes("en") ? "en" : availableLangs[0], story.slug)}"/>`;
  for (const lang of availableLangs) {
    articleEntries.push(`  <url>
    <loc>${articleUrl(lang, story.slug)}</loc>
    <lastmod>${story.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
${hreflang}
  </url>`);
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...homeEntries, ...staticEntries, ...articlesIndexEntries, ...articleEntries].join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
console.log(`generated sitemap.xml (${homeEntries.length} home + ${staticEntries.length} static + ${articlesIndexEntries.length} article-index + ${articleEntries.length} articles)`);
