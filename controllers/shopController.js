const { DEFAULT_LANGUAGE } = require('../lib/constants');
const { localizeShop, findShopByIdentifier } = require('../lib/shopUtils');
const { getShops } = require('../services/dataStore');
const { fetchEntriesForStore, fetchEntryWorkerNames } = require('../services/entryService');

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function chunkArray(items, size) {
  if (!Array.isArray(items) || !size || size <= 0) {
    return [];
  }

  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);
    if (chunk.length) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function buildEntryTopList(entries, limit = 5) {
  if (!Array.isArray(entries) || !entries.length) {
    return [];
  }

  return entries
    .map((entry) => {
      const workerName = typeof entry.workerName === 'string' ? entry.workerName.trim() : '';
      if (!workerName) {
        return null;
      }

      const mentionCount = toFiniteNumber(entry.mentionCount);
      const insertCount = toFiniteNumber(entry.insertCount);
      const totalScore = mentionCount * 5 + insertCount;
      const displayScore = Math.max(totalScore - 6, 0);

      return {
        workerName,
        mentionCount,
        insertCount,
        totalScore,
        displayScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      if (b.mentionCount !== a.mentionCount) {
        return b.mentionCount - a.mentionCount;
      }

      if (b.insertCount !== a.insertCount) {
        return b.insertCount - a.insertCount;
      }

      return a.workerName.localeCompare(b.workerName, 'ko');
    })
    .slice(0, Math.max(0, limit));
}

const ENTRY_ROW_SIZE = 5;

function buildEntrySummary(entries, workerNames) {
  const normalizedWorkerNames = Array.isArray(workerNames)
    ? workerNames
        .map((name) => (typeof name === 'string' ? name.trim() : ''))
        .filter(Boolean)
    : [];

  const workerRows = chunkArray(normalizedWorkerNames, ENTRY_ROW_SIZE);

  return {
    enabled: false,
    totalCount: Array.isArray(entries) ? entries.length : 0,
    workerRows,
    hasWorkerRows: workerRows.some((row) => Array.isArray(row) && row.length),
    topEntries: buildEntryTopList(entries),
  };
}

function getLocalizedShops(lang) {
  const shops = getShops();
  return shops.map((shop) => localizeShop(shop, lang));
}

function buildDistrictMap(shops) {
  const regions = [...new Set(shops.map((shop) => shop.region))];
  return regions.reduce((acc, region) => {
    const districts = shops
      .filter((shop) => shop.region === region)
      .map((shop) => shop.district);
    acc[region] = [...new Set(districts)];
    return acc;
  }, {});
}

function buildSeoKeywords(shops, options = {}) {
  const keywords = new Set();

  shops.forEach((shop) => {
    if (!shop || typeof shop !== 'object') {
      return;
    }

    const shopKeywords = Array.isArray(shop.seoKeywords) ? shop.seoKeywords : [];

    shopKeywords.forEach((keyword) => {
      if (typeof keyword !== 'string') {
        return;
      }

      const normalized = keyword.trim();

      if (normalized) {
        keywords.add(normalized);
      }
    });
  });

  const extraKeywords = Array.isArray(options.extraKeywords) ? options.extraKeywords : [];

  extraKeywords.forEach((keyword) => {
    if (typeof keyword !== 'string') {
      return;
    }

    const normalized = keyword.trim();

    if (normalized) {
      keywords.add(normalized);
    }
  });

  return [...keywords];
}


function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderShopStaticMap(req, res, next) {
  try {
    const shops = getShops();
    const { shop } = findShopByIdentifier(shops, req.params.id);

    if (!shop) {
      return next();
    }

    const lang = res.locals.lang || DEFAULT_LANGUAGE;
    const localizedShop = localizeShop(shop, lang);
    const width = Math.min(Math.max(Number.parseInt(req.query.w, 10) || 960, 320), 1600);
    const height = Math.min(Math.max(Number.parseInt(req.query.h, 10) || 360, 220), 900);
    const name = localizedShop.name || shop.name || '위치 정보';
    const address = localizedShop.address || shop.address || '';
    const region = [localizedShop.region, localizedShop.district].filter(Boolean).join(' · ');
    const lat = Number.parseFloat(req.query.lat);
    const lng = Number.parseFloat(req.query.lng);
    const coordinates = Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      : '';
    const centerX = width / 2;
    const centerY = height / 2;
    const pinY = centerY - 34;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(name)} 위치 지도</title>
  <desc id="desc">${escapeXml(address || region || coordinates || name)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f8fbff"/>
      <stop offset="1" stop-color="#dfeeff"/>
    </linearGradient>
    <pattern id="minorGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#c8d8ea" stroke-width="1" opacity="0.55"/>
    </pattern>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#1f2937" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#minorGrid)"/>
  <path d="M ${width * 0.08} ${height * 0.22} C ${width * 0.28} ${height * 0.16}, ${width * 0.36} ${height * 0.72}, ${width * 0.62} ${height * 0.58} S ${width * 0.86} ${height * 0.36}, ${width * 0.96} ${height * 0.44}" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round" opacity="0.82"/>
  <path d="M ${width * 0.08} ${height * 0.22} C ${width * 0.28} ${height * 0.16}, ${width * 0.36} ${height * 0.72}, ${width * 0.62} ${height * 0.58} S ${width * 0.86} ${height * 0.36}, ${width * 0.96} ${height * 0.44}" fill="none" stroke="#f6c453" stroke-width="10" stroke-linecap="round" opacity="0.92"/>
  <path d="M ${width * 0.18} ${height * 0.92} L ${width * 0.42} ${height * 0.12} M ${width * 0.58} ${height * 0.94} L ${width * 0.78} ${height * 0.1}" stroke="#ffffff" stroke-width="24" stroke-linecap="round" opacity="0.72"/>
  <path d="M ${width * 0.18} ${height * 0.92} L ${width * 0.42} ${height * 0.12} M ${width * 0.58} ${height * 0.94} L ${width * 0.78} ${height * 0.1}" stroke="#b7c7d9" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
  <g filter="url(#shadow)">
    <path d="M ${centerX} ${pinY + 92} C ${centerX - 48} ${pinY + 30}, ${centerX - 38} ${pinY - 34}, ${centerX} ${pinY - 34} C ${centerX + 38} ${pinY - 34}, ${centerX + 48} ${pinY + 30}, ${centerX} ${pinY + 92} Z" fill="#ef4444"/>
    <circle cx="${centerX}" cy="${pinY + 18}" r="20" fill="#ffffff"/>
  </g>
  <g transform="translate(${Math.max(24, centerX - 230)} ${Math.min(height - 122, pinY + 110)})">
    <rect width="460" height="96" rx="18" fill="#111827" opacity="0.9"/>
    <text x="24" y="34" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" font-size="22" font-weight="800" fill="#ffffff">${escapeXml(name)}</text>
    <text x="24" y="62" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" font-size="15" font-weight="600" fill="#d1d5db">${escapeXml(address || region || '카카오맵에서 자세한 위치 확인')}</text>
    <text x="24" y="83" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" font-size="13" fill="#9ca3af">${escapeXml(coordinates)}</text>
  </g>
</svg>`;

    res.set('Cache-Control', 'public, max-age=86400');
    res.type('image/svg+xml').send(svg);
  } catch (error) {
    next(error);
  }
}

function renderIndex(req, res) {
  const lang = res.locals.lang || DEFAULT_LANGUAGE;
  const localizedShops = getLocalizedShops(lang);
  const regions = [...new Set(localizedShops.map((shop) => shop.region))];
  const categories = [...new Set(localizedShops.map((shop) => shop.category))];
  const shopsByCategory = categories
    .map((category) => ({
      category,
      shops: localizedShops.filter((shop) => shop.category === category),
    }))
    .filter((group) => Array.isArray(group.shops) && group.shops.length > 0);
  const districtMap = buildDistrictMap(localizedShops);
  const translationSeoKeywords =
    res.locals.t &&
    res.locals.t.seo &&
    Array.isArray(res.locals.t.seo.areaKeywords)
      ? res.locals.t.seo.areaKeywords
      : [];

  const seoKeywords = buildSeoKeywords(localizedShops, {
    extraKeywords: translationSeoKeywords,
  });

  res.render('index', {
    shops: localizedShops,
    shopsByCategory,
    regions,
    categories: shopsByCategory.map((group) => group.category),
    districtMap,
    seoKeywords,
    pageTitle: (res.locals.t.meta && res.locals.t.meta.indexTitle) || 'Gangnam King',
    metaDescription: (res.locals.t.meta && res.locals.t.meta.description) || '',
  });
}

async function renderShopDetail(req, res, next) {
  try {
    const shops = getShops();
    const { shop } = findShopByIdentifier(shops, req.params.id);

    if (!shop) {
      return next();
    }

    const lang = res.locals.lang || DEFAULT_LANGUAGE;
    const localizedShop = localizeShop(shop, lang);
    const storeNoRaw = localizedShop.storeNo ?? shop.storeNo;
    const normalizedStoreNo = Number(storeNoRaw);
    const hasStoreNo = Number.isFinite(normalizedStoreNo) && normalizedStoreNo > 0;

    let entrySummary = {
      enabled: hasStoreNo,
      totalCount: 0,
      workerRows: [],
      hasWorkerRows: false,
      topEntries: [],
    };

    let shopLocation = null;

    const candidateLocations = [localizedShop.location, shop.location];
    const fallbackAddress = localizedShop.address || shop.address || '';

    for (const candidate of candidateLocations) {
      if (!candidate || typeof candidate !== 'object') {
        continue;
      }

      const candidateLat = Number(candidate.lat);
      const candidateLng = Number(candidate.lng);

      if (!Number.isFinite(candidateLat) || !Number.isFinite(candidateLng)) {
        continue;
      }

      shopLocation = {
        lat: candidateLat,
        lng: candidateLng,
        formattedAddress:
          typeof candidate.formattedAddress === 'string' && candidate.formattedAddress.trim()
            ? candidate.formattedAddress.trim()
            : fallbackAddress,
        roadAddress:
          typeof candidate.roadAddress === 'string' && candidate.roadAddress.trim()
            ? candidate.roadAddress.trim()
            : null,
        jibunAddress:
          typeof candidate.jibunAddress === 'string' && candidate.jibunAddress.trim()
            ? candidate.jibunAddress.trim()
            : null,
        englishAddress:
          typeof candidate.englishAddress === 'string' && candidate.englishAddress.trim()
            ? candidate.englishAddress.trim()
            : null,
        source: 'precomputed',
      };

      break;
    }

    if (hasStoreNo) {
      try {
        entrySummary = await fetchShopEntrySummary(localizedShop);
      } catch (error) {
        console.warn(
          '[shopController] Failed to prefetch entry summary:',
          error.message
        );
      }
    }

    res.render('shop', {
      shop: localizedShop,
      entrySummary,
      shopLocation,
      seoKeywords: Array.isArray(localizedShop.seoKeywords) ? localizedShop.seoKeywords : [],
      pageTitle: `${localizedShop.name}${(res.locals.t.meta && res.locals.t.meta.shopTitleSuffix) || ''}`,
      metaDescription: localizedShop.description || '',
      kakaoMapAppKey: process.env.KAKAO_MAP_APP_KEY || '',
    });
  } catch (error) {
    next(error);
  }
}

async function fetchShopEntrySummary(shop) {
  if (!shop || typeof shop !== 'object') {
    return {
      enabled: false,
      totalCount: 0,
      workerRows: [],
      hasWorkerRows: false,
      topEntries: [],
    };
  }

  const storeNoRaw = shop.storeNo;
  const normalizedStoreNo = Number(storeNoRaw);

  if (!Number.isFinite(normalizedStoreNo) || normalizedStoreNo <= 0) {
    return {
      enabled: false,
      totalCount: 0,
      workerRows: [],
      hasWorkerRows: false,
      topEntries: [],
    };
  }

  const rawEntries = await fetchEntriesForStore(normalizedStoreNo, { shopId: shop.id });
  const entryWorkerNames = await fetchEntryWorkerNames(normalizedStoreNo, {
    shopId: shop.id,
    entries: rawEntries,
  });

  return {
    ...buildEntrySummary(rawEntries, entryWorkerNames),
    enabled: true,
  };
}

async function renderShopEntrySummary(req, res, next) {
  try {
    const shops = getShops();
    const { shop } = findShopByIdentifier(shops, req.params.id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const summary = await fetchShopEntrySummary(shop);

    if (!summary.enabled) {
      return res.json({ enabled: false });
    }

    res.json(summary);
  } catch (error) {
    next(error);
  }
}

function renderSitemap(req, res) {
  const shops = getShops();
  const host = `${req.protocol}://${req.get('host')}`;
  const urls = [
    `${host}/`,
    ...shops.map((shop) => `${host}/shops/${encodeURIComponent(shop.id)}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n')}\n</urlset>`;

  res.type('application/xml');
  res.send(xml);
}

module.exports = {
  renderIndex,
  renderShopDetail,
  renderShopStaticMap,
  renderSitemap,
  renderShopEntrySummary,
};
