const { pool } = require('../../config/db');
const fs = require('fs');
const path = require('path');
const { getContentProtectionMarkup, getSvgContentProtectionElements } = require('./contentProtection');

const COMMUNITY_CHAT_LINK = 'https://open.kakao.com/o/gALpMlRg';
const COMMUNITY_CONTACT_TEXT = '강남 하퍼 010-5733-8710';

function getQrDataUrl() {
  const imagePath = path.resolve(process.cwd(), 'public/images/community-qr.png');

  try {
    const base64 = fs.readFileSync(imagePath).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn('[entryController] Failed to load community QR image:', error.message);
    return '';
  }
}

const COMMUNITY_QR_IMAGE_SRC = getQrDataUrl();

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCompositeSvg(lines, options = {}) {
  const {
    defaultFontSize = 24,
    defaultLineHeight = defaultFontSize * 1.4,
    padding = 24,
    background = '#ffffff',
    textColor = '#111111',
    borderRadius = 24,
    borderColor = '#dddddd',
    borderWidth = 1,
    minWidth = 480,
    backgroundType = 'plain',
    notepadMarginOffset = 68,
    notepadTextIndent = 16,
    notepadLineSpacing = defaultLineHeight,
    notepadLineColor = '#e2e7ff',
    notepadMarginColor = '#f16b6f',
    notepadMarginWidth = 2,
    notepadHoleRadius = 6,
    notepadHoleSpacing = 110,
    notepadHoleOffsetX = padding / 2,
  } = options;

  const isNotepad = backgroundType === 'notepad';
  const textStartX = isNotepad
    ? padding + notepadMarginOffset + notepadTextIndent
    : padding;
  const rightPadding = isNotepad ? textStartX + 30 : padding;

  const normalizedLines = (Array.isArray(lines) ? lines : [lines]).map((line) =>
    typeof line === 'string' ? { text: line } : { ...line }
  );

  if (!normalizedLines.length) {
    normalizedLines.push({ text: '' });
  }

  let estimatedWidth = Math.max(minWidth, textStartX + rightPadding);
  normalizedLines.forEach((line) => {
    const fontSize = line.fontSize ?? defaultFontSize;
    const contentWidth = Math.ceil((line.text?.length || 0) * (fontSize * 0.65));
    estimatedWidth = Math.max(
      estimatedWidth,
      textStartX + contentWidth + rightPadding
    );
  });

  let totalHeight = padding;
  const metrics = normalizedLines.map((line, index) => {
    const fontSize = line.fontSize ?? defaultFontSize;
    const lineHeight = line.lineHeight ?? defaultLineHeight;
    const gapBefore = index === 0 ? 0 : line.gapBefore ?? 0;
    const dy = index === 0 ? 0 : gapBefore + lineHeight;

    totalHeight += index === 0 ? fontSize : dy;

    return {
      ...line,
      fontSize,
      lineHeight,
      gapBefore,
      dy,
    };
  });
  totalHeight += padding;

  let textY = padding;
  const spans = metrics
    .map((line, index) => {
      const fontWeight = line.fontWeight ?? 'normal';
      const content = escapeXml(line.text ?? '');

      if (index === 0) {
        textY += line.fontSize;
        return `<tspan x="${textStartX}" y="${textY}" font-size="${line.fontSize}" font-weight="${fontWeight}">${content}</tspan>`;
      }

      return `<tspan x="${textStartX}" dy="${line.dy}" font-size="${line.fontSize}" font-weight="${fontWeight}">${content}</tspan>`;
    })
    .join('');

  const baseBackground = `<rect x="0" y="0" rx="${borderRadius}" ry="${borderRadius}" width="${estimatedWidth}" height="${totalHeight}" fill="${background}" stroke="${borderColor}" stroke-width="${borderWidth}" />`;

  let decorativeLayers = '';

  if (isNotepad) {
    const horizontalLines = [];
    const startY = padding + defaultLineHeight;
    const maxY = totalHeight - padding;

    for (let y = startY; y <= maxY; y += notepadLineSpacing) {
      horizontalLines.push(
        `<line x1="${padding}" y1="${y}" x2="${estimatedWidth - padding}" y2="${y}" stroke="${notepadLineColor}" stroke-width="1" />`
      );
    }

    const holeElements = [];
    const holeStartY = padding + notepadHoleRadius + 4;
    for (let y = holeStartY; y < totalHeight - padding; y += notepadHoleSpacing) {
      holeElements.push(
        `<circle cx="${notepadHoleOffsetX}" cy="${y}" r="${notepadHoleRadius}" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />`
      );
    }

    const marginX = padding + notepadMarginOffset;
    const marginLayer =
      notepadMarginWidth > 0
        ? `<line x1="${marginX}" y1="${padding}" x2="${marginX}" y2="${totalHeight - padding}" stroke="${notepadMarginColor}" stroke-width="${notepadMarginWidth}" />`
        : '';

    decorativeLayers = [
      ...horizontalLines,
      marginLayer,
      ...holeElements,
    ]
      .filter(Boolean)
      .join('\n    ');
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="${totalHeight}" role="img">
  <defs>
    <style>
      text { font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif; fill: ${textColor}; }
    </style>
  </defs>
  ${baseBackground}
  ${decorativeLayers}
  <text x="${textStartX}" y="${padding}" font-size="${defaultFontSize}" xml:space="preserve">
    ${spans}
  </text>
</svg>`;

  return { svg, width: estimatedWidth, height: totalHeight };
}

function buildTodaySvg(text) {
  const width = 800;
  const height = 400;
  const safeText = escapeXml(text);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-labelledby="title">
  <title>오늘 날짜</title>
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="50%" y="50%" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" font-size="96" font-weight="700" fill="#111111" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
</svg>`;
}

async function fetchSingleStoreEntries(storeNo, storeRow = null) {
  let store = storeRow;

  if (!store) {
    const [[foundStore]] = await pool.query(
      `SELECT storeNo, storeName
         FROM INFO_STORE
        WHERE storeNo=?`,
      [storeNo]
    );

    store = foundStore;
  }

  if (!store) {
    return null;
  }

  const [entries] = await pool.query(
    `SELECT workerName, mentionCount, insertCount, createdAt
         FROM ENTRY_TODAY
        WHERE storeNo=?
        ORDER BY createdAt DESC`,
    [store.storeNo]
  );

  const ranked = entries.map((entry) => ({
    ...entry,
    total: (entry.mentionCount * 5 || 0) + (entry.insertCount || 0),
  }));

  const top5 = [...ranked].sort((a, b) => b.total - a.total).slice(0, 5);

  return { store, entries, top5 };
}

async function fetchAllStoreEntries() {
  const [stores] = await pool.query(
    `SELECT storeNo, storeName
         FROM INFO_STORE
        ORDER BY storeNo ASC`
  );

  const results = [];

  for (const store of stores) {
    const data = await fetchSingleStoreEntries(store.storeNo, store);
    if (data) {
      results.push(data);
    }
  }

  return results;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

function buildEntryRowsHtml(entries) {
  const entryRows = chunkArray(entries, 10);
  return entryRows
    .map((row) => {
      const names = row
        .map((entry) => `<span class="entry-name">${escapeHtml(entry.workerName ?? '')}</span>`)
        .join(' ');
      return `<div class="entry-row">${names}</div>`;
    })
    .join('');
}

function computeCompositeLayout(lines, options = {}) {
  const {
    defaultFontSize = 24,
    defaultLineHeight = defaultFontSize * 1.4,
    padding = 24,
    minWidth = 480,
    backgroundType = 'plain',
    notepadMarginOffset = 68,
    notepadTextIndent = 16,
  } = options;

  const isNotepad = backgroundType === 'notepad';
  const textStartX = isNotepad
    ? padding + notepadMarginOffset + notepadTextIndent
    : padding;
  const rightPadding = isNotepad ? textStartX + 30 : padding;

  const normalized = (Array.isArray(lines) ? lines : [lines]).map((line) =>
    typeof line === 'string' ? { text: line } : { ...line }
  );
  if (!normalized.length) normalized.push({ text: '' });

  let estimatedWidth = Math.max(minWidth, textStartX + rightPadding);
  normalized.forEach((line) => {
    const fontSize = line.fontSize ?? defaultFontSize;
    const contentWidth = Math.ceil((line.text?.length || 0) * (fontSize * 0.65));
    estimatedWidth = Math.max(estimatedWidth, textStartX + contentWidth + rightPadding);
  });

  const metrics = [];
  let cursorY = padding;

  normalized.forEach((line, index) => {
    const fontSize = line.fontSize ?? defaultFontSize;
    const lineHeight = line.lineHeight ?? defaultLineHeight;
    const gapBefore = index === 0 ? 0 : line.gapBefore ?? 0;
    const dy = index === 0 ? 0 : gapBefore + lineHeight;

    if (index === 0) cursorY += fontSize;
    else cursorY += dy;

    metrics.push({
      ...line,
      fontSize,
      lineHeight,
      dy,
      x: line.x,
      y: cursorY,
    });
  });

  const totalHeight = cursorY + padding;

  return {
    options,
    normalizedLines: normalized,
    metrics,
    estimatedWidth,
    totalHeight,
    textStartX,
    padding,
    isNotepad,
  };
}

function renderCompositeSvg(layout, extras = {}) {
  const {
    metrics,
    estimatedWidth,
    totalHeight,
    textStartX,
    isNotepad,
    padding,
    options: {
      defaultFontSize = 24,
      defaultLineHeight = defaultFontSize * 1.4,
      background = '#ffffff',
      textColor = '#111111',
      borderRadius = 24,
      borderColor = '#dddddd',
      borderWidth = 1,
      notepadLineSpacing = defaultLineHeight,
      notepadLineColor = '#e2e9ff',
      notepadHoleRadius = 6,
      notepadHoleSpacing = 110,
      notepadHoleOffsetX = padding / 2,
      notepadMarginOffset = 68,
      notepadMarginColor = '#f16b6f',
      notepadMarginWidth = 2,
    },
  } = layout;

  const { overlays = [], overlaysAboveText = [], defs = [] } = extras;
  const { defsMarkup: svgProtectionDefs, scriptMarkup: svgProtectionScript } =
    getSvgContentProtectionElements();

  const spans = metrics
    .map((line, index) => {
      const fontWeight = line.fontWeight ?? 'normal';
      const fill = line.fill ? ` fill="${line.fill}"` : '';
      const align = line.align ?? line.textAlign;
      const anchor = line.textAnchor ?? (align === 'center' ? 'middle' : align === 'end' ? 'end' : undefined);
      const anchorAttr = anchor ? ` text-anchor="${anchor}"` : '';
      const x =
        line.x ??
        (align === 'center'
          ? estimatedWidth / 2
          : align === 'end'
          ? estimatedWidth - padding
          : textStartX);
      const safe = escapeXml(line.text ?? '');
      if (index === 0) {
        return `<tspan x="${x}" y="${line.y}" font-size="${line.fontSize}" font-weight="${fontWeight}"${fill}${anchorAttr}>${safe}</tspan>`;
      }
      return `<tspan x="${x}" dy="${line.dy}" font-size="${line.fontSize}" font-weight="${fontWeight}"${fill}${anchorAttr}>${safe}</tspan>`;
    })
    .join('');

  const baseBg = `<rect x="0" y="0" rx="${borderRadius}" ry="${borderRadius}" width="${estimatedWidth}" height="${totalHeight}" fill="${background}" stroke="${borderColor}" stroke-width="${borderWidth}" />`;

  let deco = '';
  if (isNotepad) {
    const lines = [];
    const startY = padding + defaultLineHeight;
    const maxY = totalHeight - padding;
    for (let y = startY; y <= maxY; y += notepadLineSpacing) {
      lines.push(`<line x1="${padding}" y1="${y}" x2="${estimatedWidth - padding}" y2="${y}" stroke="${notepadLineColor}" stroke-width="1" />`);
    }
    const holes = [];
    const holeStartY = padding + notepadHoleRadius + 4;
    for (let y = holeStartY; y < totalHeight - padding; y += notepadHoleSpacing) {
      holes.push(`<circle cx="${notepadHoleOffsetX}" cy="${y}" r="${notepadHoleRadius}" fill="#ffffff" stroke="#d0d0d0" stroke-width="1"/>`);
    }
    const marginX = padding + notepadMarginOffset;
    const margin =
      notepadMarginWidth > 0
        ? `<line x1="${marginX}" y1="${padding}" x2="${marginX}" y2="${totalHeight - padding}" stroke="${notepadMarginColor}" stroke-width="${notepadMarginWidth}" />`
        : '';
    deco = [...lines, margin, ...holes].filter(Boolean).join('\n');
  }

  const defsContent = [
    `<style>text{font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif;fill:${textColor};}</style>`,
    svgProtectionDefs,
    ...defs,
  ].join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="${totalHeight}" role="img">
  <defs>${defsContent}</defs>
  ${baseBg}
  ${deco}
  ${overlays.join('\n')}
  <text x="${textStartX}" y="${padding}" font-size="${defaultFontSize}" xml:space="preserve">
    ${spans}
  </text>
  ${overlaysAboveText.join('\n')}
  ${svgProtectionScript}
</svg>`;
  return svg;
}

function buildStoreImageDecorations(layout, top5 = []) {
  const defs = [];
  const overlays = [];
  const overlaysAboveText = [];

  const patId = 'wmPattern';
  const wmText = `${COMMUNITY_CONTACT_TEXT}`;
  const unitW = Math.max(560, wmText.length * 28) + 350;
  const unitH = 220;
  defs.push(`
    <pattern id="${patId}" patternUnits="userSpaceOnUse" width="${unitW}" height="${unitH}" patternTransform="rotate(-24)">
      <text x="20" y="80" font-size="40" font-weight="700" fill="#1d4ed8" opacity="0.45">${escapeXml(wmText)}</text>
      <text x="${unitW / 2}" y="${unitH - 40}" font-size="40" font-weight="700" fill="#1d4ed8" opacity="0.45">${escapeXml(wmText)}</text>
    </pattern>
  `);
  overlays.push(`<rect x="0" y="0" width="${layout.estimatedWidth}" height="${layout.totalHeight}" fill="url(#${patId})" opacity="0.16"/>`);

  const x = layout.textStartX + 30;
  const y = Math.max(36, layout.padding - 8 + 50);
  overlays.push(`
    <text x="${x}" y="${y}" font-size="50" font-weight="700" fill="#b91c1c">${escapeXml(COMMUNITY_CONTACT_TEXT)}</text>
  `);

  const headingIdx = layout.normalizedLines.findIndex((line) => line.text === '오늘의 인기 멤버 TOP 5');
  const qrSize = 208;
  const pad = 20;
  let cardW = qrSize + pad * 2;
  let cardH = qrSize + pad * 2 + 96;
  let cardY = layout.padding * 1.5;
  if (headingIdx !== -1 && layout.metrics[headingIdx]) {
    const heading = layout.metrics[headingIdx];
    cardY = Math.max(layout.padding, heading.y - heading.fontSize - 32);
    const lastIdx = Math.min(layout.metrics.length - 1, headingIdx + Math.max(top5.length, 0));
    const last = layout.metrics[lastIdx];
    if (last) {
      const bottom = last.y + (last.lineHeight ?? 36) + 32;
      cardH = Math.max(cardH, bottom - cardY);
    }
  }
  const textWidthGuess = 420;
  let cardX = layout.textStartX + textWidthGuess + 16;
  const rightX = layout.estimatedWidth - layout.padding - cardW;
  if (rightX > cardX) cardX = rightX;

  layout.estimatedWidth = Math.max(layout.estimatedWidth, cardX + cardW + layout.padding);
  layout.totalHeight = Math.max(layout.totalHeight, cardY + cardH + layout.padding);

  overlaysAboveText.push(`
    <g transform="translate(${cardX - 100}, ${cardY - 80}) rotate(-2.5)">
      <rect width="${cardW}" height="${cardH}" rx="20" ry="20" fill="#fef3c7" stroke="#fcd34d" stroke-width="1.5"/>
      <rect x="${(cardW - Math.max(120, cardW * 0.6)) / 2}" y="-12" width="${Math.max(120, cardW * 0.6)}" height="24" rx="8" fill="#fde68a" opacity="0.9"/>
      <image href="${COMMUNITY_QR_IMAGE_SRC}" x="${pad}" y="${pad}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>
      <text x="${cardW / 2}" y="${pad + qrSize + 20}" font-size="14" font-weight="600" text-anchor="middle" fill="#92400e">스캔하고 강밤톡방 참여</text>
      <text x="${cardW / 2}" y="${pad + qrSize + 46}" font-size="20" font-weight="700" text-anchor="middle" fill="#b45309">강남의 밤 오픈채팅</text>
      <text x="${cardW / 2}" y="${pad + qrSize + 70}" font-size="13" text-anchor="middle" fill="#7c2d12">${escapeXml(COMMUNITY_CHAT_LINK)}</text>
    </g>
  `);

  return { defs, overlays, overlaysAboveText };
}

function buildTop5Html(top5) {
  return top5
    .map((entry) => {
      const name = escapeHtml(entry.workerName ?? '');
      const total = entry.total - 6 ?? 0;
      return `<li><span class="name"> ${name}</span><span class="score"> - 합계 ${total}</span></li>`;
    })
    .join('');
}

function buildStoreEntryLines(store, entries, top5) {
  const totalCount = entries.length;

  const lines = [
    { text: '', fontSize: 120 },
    {
      text: `${store.storeName} 엔트리`,
      fontSize: 44,
      fontWeight: '700',
      gapBefore: 80,
    },
    {
      text: `총 출근인원: ${totalCount}명`,
      fontSize: 28,
      fontWeight: '600',
      gapBefore: 16,
    },
  ];

  if (entries.length) {
    lines.push({ text: '엔트리 목록', fontSize: 30, fontWeight: '700', gapBefore: 28 });

    const entryRows = chunkArray(entries, 10);
    entryRows.forEach((row, index) => {
      const chunkText = row
        .map((entry) => entry.workerName ?? '')
        .join(' ');

      lines.push({
        text: chunkText,
        fontSize: 24,
        lineHeight: 34,
        gapBefore: index === 0 ? 12 : 8,
      });
    });

    if (top5.length) {
      lines.push({ text: '오늘의 인기 멤버 TOP 5', fontSize: 30, fontWeight: '700', gapBefore: 32 });

      top5.forEach((entry, index) => {
        const name = entry.workerName ?? '';
        const total = entry.total - 6 ?? 0;
        lines.push({
          text: `${index + 1}. ${name} - 합계 ${total}`,
          fontSize: 24,
          lineHeight: 34,
          gapBefore: index === 0 ? 12 : 8,
        });
      });
    }
  } else {
    lines.push({
      text: '엔트리가 없습니다.',
      fontSize: 24,
      lineHeight: 34,
      gapBefore: 24,
    });
  }

  return lines;
}

function buildAllStoreEntryLines(storeDataList) {
  const totalCount = storeDataList.reduce((sum, data) => sum + data.entries.length, 0);

  const lines = [
    { text: '전체 가게 엔트리', fontSize: 44, fontWeight: '700' },
    {
      text: `총 출근인원: ${totalCount}명 (가게 수: ${storeDataList.length}곳)`,
      fontSize: 28,
      fontWeight: '600',
      gapBefore: 16,
    },
  ];

  storeDataList.forEach((data) => {
    lines.push({
      text: data.store.storeName,
      fontSize: 34,
      fontWeight: '700',
      gapBefore: 32,
    });

    if (data.entries.length) {
      const entryRows = chunkArray(data.entries, 10);
      entryRows.forEach((row, index) => {
        lines.push({
          text: row.map((entry) => entry.workerName ?? '').join(' '),
          fontSize: 24,
          lineHeight: 34,
          gapBefore: index === 0 ? 12 : 8,
        });
      });

      if (data.top5.length) {
        lines.push({
          text: '오늘의 인기 멤버 TOP 5',
          fontSize: 28,
          fontWeight: '600',
          gapBefore: 20,
        });

        data.top5.forEach((entry, index) => {
          const total = entry.total - 6 ?? 0;
          lines.push({
            text: `${index + 1}. ${entry.workerName ?? ''} - 합계 ${total}`,
            fontSize: 24,
            lineHeight: 34,
            gapBefore: index === 0 ? 10 : 6,
          });
        });
      } else {
        lines.push({
          text: '추천 데이터가 없습니다.',
          fontSize: 24,
          lineHeight: 34,
          gapBefore: 16,
        });
      }
    } else {
      lines.push({
        text: '엔트리가 없습니다.',
        fontSize: 24,
        lineHeight: 34,
        gapBefore: 12,
      });
    }
  });

  return lines;
}

const STORE_IMAGE_OPTIONS = {
  defaultFontSize: 24,
  defaultLineHeight: 36,
  padding: 48,
  backgroundType: 'notepad',
  background: '#fffdf5',
  borderColor: '#d7cbc1',
  borderRadius: 28,
  minWidth: 600,
  notepadMarginOffset: 70,
  notepadTextIndent: 20,
  notepadLineSpacing: 38,
  notepadLineColor: '#e2e9ff',
  notepadMarginColor: '#ff7b7d',
  notepadMarginWidth: 0,
  notepadHoleRadius: 7,
  notepadHoleSpacing: 120,
  notepadHoleOffsetX: 28,
};

async function renderStoreEntries(req, res, next) {
  try {
    const { storeNo } = req.params;
    const storeId = Number(storeNo);

    if (storeId === 0) {
      const storeDataList = await fetchAllStoreEntries();
      if (!storeDataList.length) return res.status(404).send('가게를 찾을 수 없습니다.');

      const totalEntries = storeDataList.reduce((sum, data) => sum + data.entries.length, 0);
      const protectionMarkup = getContentProtectionMarkup();

      const sections = storeDataList
        .map(({ store, entries, top5 }) => {
          const entryListMarkup = entries.length
            ? `<ul class="entry-list">${buildEntryRowsHtml(entries)}</ul>`
            : '<p class="empty">엔트리가 없습니다.</p>';
          const topListMarkup = top5.length
            ? `<ol class="top-list">${buildTop5Html(top5)}</ol>`
            : '<p class="empty">추천 데이터가 없습니다.</p>';

          return `<section class="store-section">
            <header class="store-header">
              <h2>${escapeHtml(store.storeName)}</h2>
              <p class="summary">총 출근인원: <strong>${entries.length}</strong>명</p>
            </header>
            <div class="store-content">
              <div class="entry-section">
                <h3>엔트리 목록</h3>
                ${entryListMarkup}
              </div>
              <div class="top-section">
                <h3>오늘의 인기 멤버 TOP 5</h3>
                ${topListMarkup}
              </div>
            </div>
          </section>`;
        })
        .join('');

      const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>전체 가게 엔트리</title>
    ${protectionMarkup}
  </head>
  <body>
      <header class="community-link">강남의 밤 소통방 "강밤" : "<a href="https://open.kakao.com/o/gALpMlRg" target="_blank" rel="noopener noreferrer">https://open.kakao.com/o/gALpMlRg</a>"</header>
      <div class="container">
        <header class="page-header">
          <h1>전체 가게 엔트리</h1>
          <a class="back-link" href="/entry/home">← 가게 목록으로</a>
        </header>
        <p class="summary">총 출근인원: <strong>${totalEntries}</strong>명 / 가게 수: <strong>${storeDataList.length}</strong>곳</p>
        ${sections}
      </div>
    </body>
  </html>`;

      res.send(html);
      return;
    }

    const data = await fetchSingleStoreEntries(storeNo);
    if (!data) return res.status(404).send('가게를 찾을 수 없습니다.');

    const { store, entries, top5 } = data;
    const totalCount = entries.length;

    const entryListMarkup = entries.length
      ? `<ul class="entry-list">${buildEntryRowsHtml(entries)}</ul>`
      : '<p class="empty">엔트리가 없습니다.</p>';
    const topListMarkup = top5.length
      ? `<ol class="top-list">${buildTop5Html(top5)}</ol>`
      : '<p class="empty">추천 데이터가 없습니다.</p>';

    const protectionMarkup = getContentProtectionMarkup();
    const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(store.storeName)} 엔트리</title>
    ${protectionMarkup}
  </head>
  <body>
      <header class="community-link">강남의 밤 소통방 "강밤" : "<a href="https://open.kakao.com/o/gALpMlRg" target="_blank" rel="noopener noreferrer">https://open.kakao.com/o/gALpMlRg</a>"</header>
      <div class="container">
        <header class="page-header">
          <h1>${escapeHtml(store.storeName)} 엔트리</h1>
          <a class="back-link" href="/entry/home">← 가게 목록으로</a>
        </header>
        <p class="summary">총 출근인원: <strong>${totalCount}</strong>명</p>
      <section>
        <h2>엔트리 목록</h2>
        ${entryListMarkup}
      </section>
      <section>
        <h2>오늘의 인기 멤버 TOP 5</h2>
          ${topListMarkup}
        </section>
      </div>
    </body>
  </html>`;

    res.send(html);
  } catch (error) {
    next(error);
  }
}

async function renderStoreEntryImage(req, res, next) {
  try {
    const { storeNo } = req.params;
    const storeId = Number(storeNo);

    if (storeId === 0) {
      const storeDataList = await fetchAllStoreEntries();
      if (!storeDataList.length) return res.status(404).send('가게를 찾을 수 없습니다.');

      const lines = buildAllStoreEntryLines(storeDataList);
      const layout = computeCompositeLayout(lines, STORE_IMAGE_OPTIONS);
      const decorations = buildStoreImageDecorations(layout);
      const svg = renderCompositeSvg(layout, decorations);

      res.set('Cache-Control', 'no-store');
      res.type('image/svg+xml').send(svg);
    } else {
      const data = await fetchSingleStoreEntries(storeNo);
      if (!data) return res.status(404).send('가게를 찾을 수 없습니다.');

      const lines = buildStoreEntryLines(data.store, data.entries, data.top5);
      const layout = computeCompositeLayout(lines, STORE_IMAGE_OPTIONS);
      const decorations = buildStoreImageDecorations(layout, data.top5);
      const svg = renderCompositeSvg(layout, decorations);

      res.set('Cache-Control', 'no-store');
      res.type('image/svg+xml').send(svg);
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const referer = req.get('referer') || '직접 요청';
    const userAgent = req.get('user-agent') || '알 수 없음';
    console.log(`[ENTRYIMAGE ACCESS] IP:${ip} REF:${referer} UA:${userAgent}`);
  } catch (error) {
    next(error);
  }
}

function getAdjustedSeoulDate(now = new Date()) {
  const timeZone = 'Asia/Seoul';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(now)
    .reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = Number(part.value);
      }
      return acc;
    }, {});

  let { year, month, day, hour } = parts;

  if (hour === 24) {
    hour = 0;
  }

  if (hour < 15) {
    const previousDay = new Date(Date.UTC(year, month - 1, day));
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);

    year = previousDay.getUTCFullYear();
    month = previousDay.getUTCMonth() + 1;
    day = previousDay.getUTCDate();
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function renderTodayImage(_, res) {
  const adjustedDate = getAdjustedSeoulDate();
  const todayText = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(adjustedDate);

  const svg = buildTodaySvg(todayText);

  res.set('Cache-Control', 'no-store');
  res.type('image/svg+xml').send(svg);
}

module.exports = {
  renderStoreEntries,
  renderStoreEntryImage,
  renderTodayImage,
};
