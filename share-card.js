// share-card.js — 결과를 SNS에 공유할 수 있는 이미지 카드로 렌더링.
// 이 파일은 사주 계산 로직을 전혀 모른다. app.js가 이미 계산·번역해둔 값들을
// 순수 데이터 객체로 넘겨주면, 그걸 Canvas 2D로 그려서 PNG 다운로드까지 처리한다.
// (SVG를 <img>로 래스터라이즈하는 방식 대신 Canvas 2D를 직접 쓰는 이유: 웹폰트가
// <img>로 그려지는 SVG에는 안정적으로 적용되지 않는 브라우저가 많은데, Canvas 2D는
// 페이지에 이미 로드된 Pretendard/Noto Serif 폰트를 그대로 쓸 수 있다.)
//
// 리딩 본문(TEN_GOD_INFO 등)은 언어에 따라 길이 차이가 크다 (한국어 ~300자 vs
// 영어/프랑스어 ~900자). 고정 폰트 크기로는 감당이 안 돼서, shareCardFitParagraph가
// 주어진 줄 수 안에 들어갈 때까지 폰트 크기를 줄여가며 맞추고, 그래도 안 들어가면
// 마지막 줄을 말줄임표로 잘라 절대 문장이 뚝 끊긴 채로 보이지 않게 한다.
"use strict";

const SHARE_CARD_W = 1080;
const SHARE_CARD_BG = "#06070f";
const SHARE_CARD_INK = "#f2efe6";
const SHARE_CARD_MUTED = "#9b9fc2";
const SHARE_CARD_ACCENT = "#c9a24b";
const SHARE_CARD_ACCENT_STRONG = "#ecc978";
const SHARE_CARD_BORDER = "rgba(255, 255, 255, 0.12)";
const SHARE_CARD_ELEMENT_COLOR = {
  wood: "#7cc389", fire: "#e2795f", earth: "#e0bd6e", metal: "#b9c2cf", water: "#7ba8d1",
};
const SHARE_CARD_FONT_UI = '"Pretendard", -apple-system, "Malgun Gothic", sans-serif';
const SHARE_CARD_FONT_HANJA = '"Noto Serif KR", "Noto Serif SC", serif';
const SHARE_CARD_HEIGHT_BY_TYPE = { today: 1700, year: 1600, compat: 1500 };

function shareCardWrapText(ctx, text, maxWidth, lang) {
  // 중국어는 띄어쓰기가 없으므로 글자 단위로, 나머지 언어는 단어 단위로 줄바꿈한다.
  const units = lang === "zh" ? Array.from(text) : text.split(/\s+/);
  const glue = lang === "zh" ? "" : " ";
  const lines = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? current + glue + unit : unit;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = unit;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function shareCardEllipsize(ctx, line, maxWidth) {
  let text = line;
  while (text.length > 1 && ctx.measureText(text + "…").width > maxWidth) {
    text = text.slice(0, -1);
  }
  return text.replace(/[\s,、，.。]+$/, "") + "…";
}

// 최대 폰트 크기에서 시작해 minFontSize까지 줄여가며 maxLines 안에 들어가는 가장 큰
// 크기를 찾는다. 그래도 안 맞으면 마지막 줄을 잘라 말줄임표를 붙인다.
function shareCardFitText(ctx, text, maxWidth, lang, opts) {
  const { maxFontSize, minFontSize, maxLines, weight, fontFamily } = opts;
  let fontSize = maxFontSize;
  let lines = [];
  for (; fontSize >= minFontSize; fontSize -= 2) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    lines = shareCardWrapText(ctx, text, maxWidth, lang);
    if (lines.length <= maxLines) break;
  }
  if (lines.length > maxLines) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = shareCardEllipsize(ctx, lines[maxLines - 1], maxWidth);
  }
  return { fontSize, lines };
}

function shareCardDrawFitParagraph(ctx, text, x, y, maxWidth, lang, opts) {
  const fontFamily = opts.fontFamily || SHARE_CARD_FONT_UI;
  const weight = opts.weight || 600;
  const { fontSize, lines } = shareCardFitText(ctx, text, maxWidth, lang, {
    maxFontSize: opts.maxFontSize, minFontSize: opts.minFontSize, maxLines: opts.maxLines, weight, fontFamily,
  });
  const lineHeight = Math.round(fontSize * (opts.lineHeightRatio || 1.44));
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = opts.color || SHARE_CARD_INK;
  ctx.textAlign = opts.align || "center";
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  ctx.textAlign = "left";
  return y + lines.length * lineHeight;
}

function shareCardDrawParagraph(ctx, text, x, y, maxWidth, lineHeight, lang, opts) {
  opts = opts || {};
  ctx.font = opts.font || `500 30px ${SHARE_CARD_FONT_UI}`;
  ctx.fillStyle = opts.color || SHARE_CARD_MUTED;
  ctx.textAlign = opts.align || "left";
  const lines = shareCardWrapText(ctx, text, maxWidth, lang).slice(0, opts.maxLines || 6);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  ctx.textAlign = "left";
  return y + lines.length * lineHeight;
}

function shareCardDrawBackground(ctx, h) {
  const grad = ctx.createRadialGradient(
    SHARE_CARD_W * 0.5, h * 0.24, 40,
    SHARE_CARD_W * 0.5, h * 0.24, h * 0.9
  );
  grad.addColorStop(0, "#11142a");
  grad.addColorStop(1, SHARE_CARD_BG);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SHARE_CARD_W, h);

  // 은은한 별 점들
  let seed = 42;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 130; i++) {
    const x = rand() * SHARE_CARD_W, y = rand() * h * 0.9, r = rand() * 1.4 + 0.3;
    ctx.globalAlpha = rand() * 0.6 + 0.15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function shareCardDrawBrandHeader(ctx, brand) {
  const cx = 76, cy = 84, r = 22;
  ctx.strokeStyle = SHARE_CARD_ACCENT;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = SHARE_CARD_ACCENT_STRONG;
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  [[cx, cy - r - 8, cx, cy - r + 4], [cx, cy + r - 4, cx, cy + r + 8],
   [cx - r - 8, cy, cx - r + 4, cy], [cx + r - 4, cy, cx + r + 8, cy]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.font = `700 34px ${SHARE_CARD_FONT_UI}`;
  ctx.textBaseline = "middle";
  ctx.fillText(brand, cx + r + 20, cy);
  ctx.textBaseline = "alphabetic";
}

function shareCardDrawFooter(ctx, h, footerUrl, footerCta) {
  ctx.textAlign = "left"; // 앞선 문단이 center로 남겨뒀을 수 있으므로 방어적으로 리셋
  const y = h - 140;
  ctx.strokeStyle = SHARE_CARD_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(76, y); ctx.lineTo(SHARE_CARD_W - 76, y); ctx.stroke();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = SHARE_CARD_ACCENT_STRONG;
  ctx.font = `700 30px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(footerCta, 76, y + 56);

  ctx.fillStyle = SHARE_CARD_MUTED;
  ctx.font = `500 26px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(footerUrl, 76, y + 94);
}

function shareCardGlyphFont(lang, size) {
  return lang === "en" || lang === "fr"
    ? `700 ${size}px ${SHARE_CARD_FONT_UI}`
    : `700 ${size}px ${SHARE_CARD_FONT_HANJA}`;
}

function shareCardDrawGlyphBadge(ctx, cx, cy, radius, glyph, element, lang, fontSize) {
  const color = SHARE_CARD_ELEMENT_COLOR[element] || SHARE_CARD_ACCENT;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 46;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.font = shareCardGlyphFont(lang, fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, cx, cy + fontSize * 0.06);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function shareCardDrawToday(ctx, d, h) {
  ctx.textAlign = "left";
  ctx.fillStyle = SHARE_CARD_MUTED;
  ctx.font = `500 28px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.dateLabel, 76, 190);

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.font = `800 46px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.name, 76, 248);

  shareCardDrawGlyphBadge(ctx, SHARE_CARD_W / 2, 420, 118, d.ganjiGlyph, d.ganjiElement, d.lang, 56);

  ctx.textAlign = "center";
  let y = shareCardDrawParagraph(ctx, d.ganjiLabel, SHARE_CARD_W / 2, 600, 880, 38, d.lang, { align: "center", font: `500 28px ${SHARE_CARD_FONT_UI}`, color: SHARE_CARD_MUTED, maxLines: 2 });

  // info.overall이 실제 읽을거리(언어에 따라 300~900자)이므로 여기가 카드의 본문 -
  // 폰트 자동 축소로 어떤 길이든 잘리지 않게 맞춘다.
  y = shareCardDrawFitParagraph(ctx, d.headline, SHARE_CARD_W / 2, y + 46, 920, d.lang, {
    align: "center", color: SHARE_CARD_INK, weight: 600,
    maxFontSize: 30, minFontSize: 20, maxLines: 16,
  });

  if (d.luckyLine) {
    ctx.textAlign = "center";
    ctx.fillStyle = SHARE_CARD_ACCENT_STRONG;
    ctx.font = `700 26px ${SHARE_CARD_FONT_UI}`;
    ctx.fillText(d.luckyLine, SHARE_CARD_W / 2, y + 50);
  }
}

function shareCardDrawYear(ctx, d, h) {
  ctx.textAlign = "left";
  ctx.fillStyle = SHARE_CARD_MUTED;
  ctx.font = `500 28px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.dateLabel, 76, 190);

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.font = `800 46px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.name, 76, 248);

  shareCardDrawGlyphBadge(ctx, SHARE_CARD_W / 2, 420, 118, d.ganjiGlyph, d.ganjiElement, d.lang, 56);

  ctx.textAlign = "center";
  shareCardDrawFitParagraph(ctx, d.headline, SHARE_CARD_W / 2, 610, 920, d.lang, {
    align: "center", color: SHARE_CARD_INK, weight: 600,
    maxFontSize: 30, minFontSize: 20, maxLines: 16,
  });
}

function shareCardDrawCompat(ctx, d, h) {
  ctx.textAlign = "center";
  ctx.fillStyle = SHARE_CARD_MUTED;
  ctx.font = `500 28px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.relationLabel, SHARE_CARD_W / 2, 190);

  const leftX = SHARE_CARD_W * 0.28, rightX = SHARE_CARD_W * 0.72, gy = 400;
  shareCardDrawGlyphBadge(ctx, leftX, gy, 118, d.glyphA, d.elA, d.lang, 52);
  shareCardDrawGlyphBadge(ctx, rightX, gy, 118, d.glyphB, d.elB, d.lang, 52);

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.font = `700 34px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.nameA, leftX, gy + 175);
  ctx.fillText(d.nameB, rightX, gy + 175);

  ctx.strokeStyle = SHARE_CARD_ACCENT;
  ctx.setLineDash([6, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX + 130, gy);
  ctx.lineTo(rightX - 130, gy);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = SHARE_CARD_ACCENT_STRONG;
  ctx.font = `900 130px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(`${d.score}%`, SHARE_CARD_W / 2, 730);

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.font = `700 38px ${SHARE_CARD_FONT_UI}`;
  ctx.fillText(d.tierLabel, SHARE_CARD_W / 2, 850);

  shareCardDrawFitParagraph(ctx, d.body, SHARE_CARD_W / 2, 940, 900, d.lang, {
    align: "center", color: SHARE_CARD_MUTED, weight: 500,
    maxFontSize: 30, minFontSize: 22, maxLines: 8,
  });
}

/**
 * payload.type: "today" | "year" | "compat"
 * 나머지 필드는 위 3개 draw 함수를 참고 (전부 이미 번역·계산이 끝난 순수 문자열/숫자).
 * 반환값: PNG Blob (다운로드는 shareCardDownload가 처리).
 */
function renderShareCardBlob(payload) {
  return new Promise((resolve, reject) => {
    const h = SHARE_CARD_HEIGHT_BY_TYPE[payload.type];
    if (!h) { reject(new Error("unknown share card type: " + payload.type)); return; }
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_CARD_W;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    shareCardDrawBackground(ctx, h);
    shareCardDrawBrandHeader(ctx, payload.brand);
    if (payload.type === "today") shareCardDrawToday(ctx, payload, h);
    else if (payload.type === "year") shareCardDrawYear(ctx, payload, h);
    else if (payload.type === "compat") shareCardDrawCompat(ctx, payload, h);
    shareCardDrawFooter(ctx, h, payload.footerUrl, payload.footerCta);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob); else reject(new Error("toBlob failed"));
    }, "image/png");
  });
}

async function shareCardDownload(payload, filename) {
  await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
  const blob = await renderShareCardBlob(payload);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "saju-today.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
