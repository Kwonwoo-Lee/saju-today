// scripts/generate-sitemap.js
//
// sitemap.xml을 언어별 홈페이지 + 정적 페이지 + articles/manifest.json의 모든 글로부터
// 다시 생성합니다. 정적 페이지 목록/lastmod은 이 파일 상단에서 손으로 관리하고,
// 글 목록은 manifest.json에서 자동으로 채웁니다.
//
// 실행: node scripts/generate-sitemap.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://saju.tradesmrt.com";
const today = new Date().toISOString().slice(0, 10);

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "articles", "manifest.json"), "utf8"));

const LANG_URLS = {
  en: `${SITE_URL}/`,
  zh: `${SITE_URL}/zh/`,
  fr: `${SITE_URL}/fr/`,
  ko: `${SITE_URL}/ko/`,
};
const hreflangBlock = Object.entries(LANG_URLS)
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
${hreflangBlock}
  </url>`
);

const staticEntries = [
  { loc: `${SITE_URL}/privacy`, lastmod: "2026-09-21", changefreq: "monthly", priority: "0.3" },
  { loc: `${SITE_URL}/terms`, lastmod: "2026-09-04", changefreq: "monthly", priority: "0.3" },
  { loc: `${SITE_URL}/articles/`, lastmod: today, changefreq: "daily", priority: "0.6" },
].map(
  (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
);

const articleEntries = manifest.map(
  (a) => `  <url>
    <loc>${SITE_URL}${a.url}</loc>
    <lastmod>${a.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...homeEntries, ...staticEntries, ...articleEntries].join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
console.log(`generated sitemap.xml (${homeEntries.length} home + ${staticEntries.length} static + ${articleEntries.length} articles)`);
