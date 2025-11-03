import { pool } from "../config/db.js";

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 중첩 객체/배열을 펼쳐서 "키: 값" 줄 단위로 만들어줌
function flattenDetail(value, prefix = "", lines = [], level = 0) {
  const pad = "  ".repeat(level); // 들여쓰기(원하면 제거 가능)

  if (value === null || value === undefined) {
    lines.push(`${pad}${prefix}: `);
    return lines;
  }

  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      const key = prefix ? `${prefix}.${i}` : String(i);
      flattenDetail(v, key, lines, level);
    });
    return lines;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object") {
        flattenDetail(v, key, lines, level); // 한 줄에 경로만 두고, 하위도 같은 규칙으로
      } else {
        lines.push(`${pad}${key}: ${v ?? ""}`);
      }
    }
    return lines;
  }

  // 원시값
  lines.push(`${pad}${prefix}: ${value}`);
  return lines;
}

function safeParseJSON(raw) {
  if (raw == null) return { obj: null, text: null };

  if (typeof raw === "object" && !Buffer.isBuffer(raw)) {
    return { obj: raw, text: null };
  }
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);

  try {
    return { obj: JSON.parse(text), text: null };
  } catch {}

  try {
    const fixed = text
      .replace(/\r?\n|\r/g, " ")
      .replace(/([{\s,])(\w+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"');
    return { obj: JSON.parse(fixed), text: null };
  } catch {}

  return { obj: null, text };
}

function extractDetailLines(detailObj, detailRaw) {
  if (detailObj) {
    return flattenDetail(detailObj);
  }

  if (typeof detailRaw === "string") {
    const cleaned = detailRaw.replace(/[{}\"]/g, "");
    return cleaned
      .split(/\r?\n|\r/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function buildCompositeSvg(lines, options = {}) {
  const {
    defaultFontSize = 24,
    defaultLineHeight = defaultFontSize * 1.4,
    padding = 24,
    background = "#ffffff",
    textColor = "#111111",
    borderRadius = 24,
    borderColor = "#dddddd",
    borderWidth = 1,
    minWidth = 480,
  } = options;

  const normalizedLines = (Array.isArray(lines) ? lines : [lines]).map((line) =>
    typeof line === "string" ? { text: line } : { ...line }
  );

  if (!normalizedLines.length) {
    normalizedLines.push({ text: "" });
  }

  let estimatedWidth = minWidth;
  normalizedLines.forEach((line) => {
    const fontSize = line.fontSize ?? defaultFontSize;
    const contentWidth = Math.ceil((line.text?.length || 0) * (fontSize * 0.65));
    estimatedWidth = Math.max(estimatedWidth, padding * 2 + contentWidth);
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
      const fontWeight = line.fontWeight ?? "normal";
      const content = escapeXml(line.text ?? "");

      if (index === 0) {
        textY += line.fontSize;
        return `<tspan x="${padding}" y="${textY}" font-size="${line.fontSize}" font-weight="${fontWeight}">${content}</tspan>`;
      }

      return `<tspan x="${padding}" dy="${line.dy}" font-size="${line.fontSize}" font-weight="${fontWeight}">${content}</tspan>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="${totalHeight}" role="img">
  <defs>
    <style>
      text { font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif; fill: ${textColor}; }
    </style>
  </defs>
  <rect x="0" y="0" rx="${borderRadius}" ry="${borderRadius}" width="${estimatedWidth}" height="${totalHeight}" fill="${background}" stroke="${borderColor}" stroke-width="${borderWidth}" />
  <text x="${padding}" y="${padding}" font-size="${defaultFontSize}" xml:space="preserve">
    ${spans}
  </text>
</svg>`;

  return { svg, width: estimatedWidth, height: totalHeight };
}

const ROOM_IMAGE_OPTIONS = {
  defaultFontSize: 24,
  defaultLineHeight: 34,
  padding: 40,
  background: "#ffffff",
  borderColor: "#d0d0d0",
  minWidth: 560,
};

function normalizeRoomRow(room) {
  const roomInfoDisplay =
    Number(room.roomInfo) === 999 ? "여유" : room.roomInfo ?? "N/A";
  const waitInfoDisplay = room.waitInfo ?? "N/A";
  const { obj: detailObj, text: detailRaw } = safeParseJSON(room.roomDetail);

  const updatedAtDate = room.updatedAt ? new Date(room.updatedAt) : null;
  const updatedAtDisplay = updatedAtDate
    ? updatedAtDate.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "N/A";

  return {
    storeNo: room.storeNo,
    storeName: room.storeName,
    roomInfo: roomInfoDisplay,
    waitInfo: waitInfoDisplay,
    detailObj,
    detailRaw,
    updatedAt: room.updatedAt,
    updatedAtDisplay,
  };
}

async function fetchSingleRoomStatus(storeNo) {
  const [[room]] = await pool.query(
    `SELECT r.storeNo, s.storeName, r.roomInfo, r.waitInfo, r.roomDetail, r.updatedAt
         FROM INFO_ROOM r
         JOIN INFO_STORE s ON s.storeNo = r.storeNo
        WHERE r.storeNo=?`,
    [storeNo]
  );

  if (!room) {
    return null;
  }

  return normalizeRoomRow(room);
}

async function fetchAllRoomStatuses() {
  const [rooms] = await pool.query(
    `SELECT r.storeNo, s.storeName, r.roomInfo, r.waitInfo, r.roomDetail, r.updatedAt
         FROM INFO_ROOM r
         JOIN INFO_STORE s ON s.storeNo = r.storeNo
        ORDER BY r.storeNo ASC`
  );

  return rooms.map(normalizeRoomRow);
}

export async function renderRoomInfo(req, res, next) {
  try {
    const { storeNo } = req.params;
    const storeId = Number(storeNo);

    if (storeId === 0) {
      const rooms = await fetchAllRoomStatuses();
      if (!rooms.length)
        return res.status(404).send("룸현황 정보가 없습니다.");

      const sections = rooms
        .map((room) => {
          const detailLines = extractDetailLines(room.detailObj, room.detailRaw);
          const detailMarkup = detailLines.length
            ? `<pre>${escapeHtml(detailLines.join("\n"))}</pre>`
            : "<p>상세 정보 없음</p>";

          return `<section class="store-section">
            <h2>${escapeHtml(room.storeName)}</h2>
            <div>룸 정보: ${escapeHtml(room.roomInfo)}</div>
            <div>웨이팅 정보: ${escapeHtml(room.waitInfo)}</div>
            <h3>상세 정보</h3>
            ${detailMarkup}
            <div>업데이트: ${escapeHtml(room.updatedAtDisplay)}</div>
          </section>`;
        })
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset='UTF-8'>
<title>전체 가게 룸현황</title></head><body>
<header class="community-link">강남의 밤 소통방 "강밤" : "<a href="https://open.kakao.com/o/gALpMlRg" target="_blank" rel="noopener noreferrer">https://open.kakao.com/o/gALpMlRg</a>"</header>
<h1>전체 가게 룸현황</h1>
<a href="/entry/home">← 가게 목록으로</a><br/><br/>
<p>총 가게 수: <strong>${rooms.length}</strong>곳</p>
${sections}
</body></html>`;

      res.send(html);
      return;
    }

    const room = await fetchSingleRoomStatus(storeNo);
    if (!room) return res.status(404).send("룸현황 정보가 없습니다.");

    const detailLines = extractDetailLines(room.detailObj, room.detailRaw);

    let html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
    html += `<title>${escapeHtml(room.storeName)} 룸현황</title></head><body>`;
    html += '<header class="community-link">강남의 밤 소통방 "강밤" : "<a href="https://open.kakao.com/o/gALpMlRg" target="_blank" rel="noopener noreferrer">https://open.kakao.com/o/gALpMlRg</a>"</header>';
    html += `<h1>${escapeHtml(room.storeName)} 룸현황</h1>`;
    html += `<a href="/entry/home">← 가게 목록으로</a><br/><br/>`;

    html += `<div>룸 정보: ${escapeHtml(room.roomInfo)}</div>`;
    html += `<div>웨이팅 정보: ${escapeHtml(room.waitInfo)}</div>`;

    html += "<h3>상세 정보</h3>";
    if (detailLines.length) {
      html += `<pre>${escapeHtml(detailLines.join("\n"))}</pre>`;
    } else {
      html += "<p>상세 정보 없음</p>";
    }

    html += `<div>업데이트: ${escapeHtml(room.updatedAtDisplay)}</div>`;
    html += '</body></html>';

    res.send(html);
  } catch (err) {
    next(err);
  }
}

function buildRoomImageLines(room) {
  const detailLines = extractDetailLines(room.detailObj, room.detailRaw);

  const lines = [
    { text: `${room.storeName} 룸현황`, fontSize: 44, fontWeight: "700" },
    { text: `룸 정보: ${room.roomInfo}`, fontSize: 28, fontWeight: "600", gapBefore: 20 },
    { text: `웨이팅 정보: ${room.waitInfo}`, fontSize: 24, gapBefore: 12 },
  ];

  if (detailLines.length) {
    lines.push({ text: "상세 정보", fontSize: 30, fontWeight: "700", gapBefore: 28 });
    detailLines.forEach((line, index) => {
      lines.push({
        text: line,
        fontSize: 22,
        lineHeight: 32,
        gapBefore: index === 0 ? 12 : 8,
      });
    });
  } else {
    lines.push({
      text: "상세 정보 없음",
      fontSize: 24,
      lineHeight: 32,
      gapBefore: 28,
    });
  }

  lines.push({
    text: `업데이트: ${room.updatedAtDisplay}`,
    fontSize: 20,
    gapBefore: 24,
  });

  return lines;
}

function buildAllRoomImageLines(rooms) {
  const lines = [
    { text: "전체 가게 룸현황", fontSize: 44, fontWeight: "700" },
    {
      text: `총 가게 수: ${rooms.length}곳`,
      fontSize: 28,
      fontWeight: "600",
      gapBefore: 16,
    },
  ];

  rooms.forEach((room) => {
    const detailLines = extractDetailLines(room.detailObj, room.detailRaw);

    lines.push({
      text: room.storeName,
      fontSize: 34,
      fontWeight: "700",
      gapBefore: 32,
    });
    lines.push({
      text: `룸 정보: ${room.roomInfo}`,
      fontSize: 26,
      fontWeight: "600",
      gapBefore: 12,
    });
    lines.push({
      text: `웨이팅 정보: ${room.waitInfo}`,
      fontSize: 24,
      gapBefore: 8,
    });

    if (detailLines.length) {
      lines.push({
        text: "상세 정보",
        fontSize: 28,
        fontWeight: "600",
        gapBefore: 16,
      });

      detailLines.forEach((line, index) => {
        lines.push({
          text: line,
          fontSize: 22,
          lineHeight: 32,
          gapBefore: index === 0 ? 10 : 6,
        });
      });
    } else {
      lines.push({
        text: "상세 정보 없음",
        fontSize: 22,
        lineHeight: 32,
        gapBefore: 16,
      });
    }

    lines.push({
      text: `업데이트: ${room.updatedAtDisplay}`,
      fontSize: 20,
      gapBefore: 14,
    });
  });

  return lines;
}

export async function renderRoomImage(req, res, next) {
  try {
    const { storeNo } = req.params;

    const storeId = Number(storeNo);

    if (storeId === 0) {
      const rooms = await fetchAllRoomStatuses();
      if (!rooms.length)
        return res.status(404).send("룸현황 정보가 없습니다.");

      const lines = buildAllRoomImageLines(rooms);
      const { svg } = buildCompositeSvg(lines, ROOM_IMAGE_OPTIONS);

      res.set("Cache-Control", "no-store");
      res.type("image/svg+xml").send(svg);
      return;
    }

    const room = await fetchSingleRoomStatus(storeNo);
    if (!room) return res.status(404).send("룸현황 정보가 없습니다.");

    const lines = buildRoomImageLines(room);
    const { svg } = buildCompositeSvg(lines, ROOM_IMAGE_OPTIONS);

    res.set("Cache-Control", "no-store");
    res.type("image/svg+xml").send(svg);
  } catch (err) {
    next(err);
  }
}