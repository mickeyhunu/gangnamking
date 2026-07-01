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
const ENTRY_DISPLAY_LIMIT = 15;
const MORE_ENTRIES_URL = 'https://nightmens.com/play/live';

function buildEntrySummary(entries, workerNames, limit = ENTRY_DISPLAY_LIMIT) {
  const normalizedWorkerNames = Array.isArray(workerNames)
    ? workerNames
        .map((name) => (typeof name === 'string' ? name.trim() : ''))
        .filter(Boolean)
    : [];

  const visibleWorkerLimit = Math.max(0, Number(limit) || 0);
  const visibleWorkerNames = normalizedWorkerNames.slice(0, visibleWorkerLimit);
  const workerRows = chunkArray(visibleWorkerNames, ENTRY_ROW_SIZE);
  const hiddenWorkerCount = Math.max(0, normalizedWorkerNames.length - visibleWorkerNames.length);

  return {
    enabled: false,
    totalCount: Array.isArray(entries) ? entries.length : 0,
    workerRows,
    hasWorkerRows: workerRows.some((row) => Array.isArray(row) && row.length),
    hiddenWorkerCount,
    moreLink: hiddenWorkerCount > 0 ? MORE_ENTRIES_URL : '',
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

function normalizeKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords
    .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
    .filter(Boolean);
}

function uniqueKeywords(keywords, limit = 80) {
  return [...new Set(normalizeKeywords(keywords))].slice(0, limit);
}

function pickKeywords(keywords, limit = 8) {
  return uniqueKeywords(keywords, limit);
}

function buildHomeSeoContent(shops, t = {}) {
  const meta = t.meta || {};
  const seo = t.seo || {};
  const regions = uniqueKeywords(shops.map((shop) => shop.district || shop.region), 6);
  const categories = uniqueKeywords(shops.map((shop) => shop.category), 4);
  const featuredShops = uniqueKeywords(shops.map((shop) => shop.name), 6);
  const keywordHighlights = pickKeywords([
    ...(Array.isArray(seo.priorityKeywords) ? seo.priorityKeywords : []),
    ...regions,
    ...categories,
    ...featuredShops,
  ], 12);

  return {
    title: meta.indexTitle || '룸빵1번지 - 강남 룸빵·하이퍼블릭 최저가 예약',
    description: meta.description || '강남·논현·역삼 중심 룸빵, 하이퍼블릭, 셔츠룸, 가라오케 정보를 비교하고 예약 혜택을 확인하세요.',
    heading: seo.homeHeading || '강남 룸빵·하이퍼블릭 최저가 업소 비교',
    summary: seo.homeSummary || '룸빵1번지는 강남, 논현, 역삼 등 핵심 상권의 검증 업소 정보를 지역·카테고리별로 정리해 빠른 비교와 예약 상담을 돕습니다.',
    keywordHighlights,
  };
}

function buildShopSeoContent(shop, t = {}) {
  const meta = t.meta || {};
  const seo = t.seo || {};
  const regionText = [shop.region, shop.district].filter(Boolean).join(' ');
  const priorityKeywords = pickKeywords([
    `${shop.district || shop.region || ''} ${shop.category || ''}`.trim(),
    `${shop.district || shop.region || ''} ${shop.name || ''}`.trim(),
    shop.name,
    shop.category,
    ...(Array.isArray(shop.seoKeywords) ? shop.seoKeywords : []),
  ], 10);
  const titleTemplate = meta.shopTitleTemplate || '{{shopName}} - {{district}} {{category}} 예약 | 룸빵1번지';
  const descriptionTemplate = meta.shopDescriptionTemplate || '{{region}} {{shopName}} {{category}} 업소 정보, 가격, 위치, 영업시간과 예약 상담을 룸빵1번지에서 확인하세요.';
  const replacements = {
    shopName: shop.name || '',
    district: shop.district || shop.region || '',
    category: shop.category || '',
    region: regionText || shop.region || '',
  };
  const applyTemplate = (template) => Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value),
    template
  );

  return {
    title: applyTemplate(titleTemplate),
    description: shop.description || applyTemplate(descriptionTemplate),
    heading: applyTemplate(seo.shopHeading || '{{district}} {{category}} {{shopName}} 상세 정보'),
    summary: applyTemplate(seo.shopSummary || '{{region}}에 위치한 {{shopName}}의 가격, 위치, 영업시간, 담당자 정보를 한 번에 확인하고 예약 상담을 진행할 수 있습니다.'),
    keywordHighlights: priorityKeywords,
  };
}

function buildOrganizationJsonLd(req, t = {}) {
  const host = `${req.protocol}://${req.get('host')}`;
  const meta = t.meta || {};

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: meta.siteName || '룸빵1번지',
    url: `${host}/`,
    logo: `${host}/images/logo-roompang.png`,
  };
}

function buildShopJsonLd(req, shop) {
  const host = `${req.protocol}://${req.get('host')}`;
  const url = `${host}/shops/${encodeURIComponent(shop.id)}`;
  const imageUrl = typeof shop.image === 'string' && shop.image.startsWith('/') ? `${host}${shop.image}` : shop.image;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name,
    description: shop.description,
    url,
    image: imageUrl || undefined,
    address: shop.address,
    areaServed: [shop.region, shop.district].filter(Boolean).join(' '),
    openingHours: shop.hours,
  };
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
    const labelX = Math.min(width - 150, Math.max(16, centerX + 22));
    const labelY = Math.min(height - 24, Math.max(42, centerY - 8));
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(name)} 카카오맵 위치</title>
  <desc id="desc">${escapeXml(address || region || coordinates || name)}</desc>
  <defs>
    <pattern id="blocks" width="74" height="54" patternUnits="userSpaceOnUse">
      <path d="M0 0H74V54H0Z" fill="#f6f7f4"/>
      <path d="M74 0H0V54" fill="none" stroke="#d8dcd5" stroke-width="1"/>
      <path d="M14 0V54M38 0V54M0 18H74M0 37H74" stroke="#e6e8e2" stroke-width="1"/>
    </pattern>
    <filter id="pinShadow" x="-45%" y="-25%" width="190%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1f2937" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#blocks)"/>
  <path d="M ${-width * 0.04} ${height * 0.82} C ${width * 0.2} ${height * 0.72}, ${width * 0.34} ${height * 0.46}, ${width * 0.54} ${height * 0.5} S ${width * 0.83} ${height * 0.32}, ${width * 1.04} ${height * 0.22}" fill="none" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/>
  <path d="M ${-width * 0.04} ${height * 0.82} C ${width * 0.2} ${height * 0.72}, ${width * 0.34} ${height * 0.46}, ${width * 0.54} ${height * 0.5} S ${width * 0.83} ${height * 0.32}, ${width * 1.04} ${height * 0.22}" fill="none" stroke="#f0c94b" stroke-width="5" stroke-linecap="round"/>
  <path d="M ${width * 0.15} ${-height * 0.06} L ${width * 0.28} ${height * 1.08} M ${width * 0.72} ${-height * 0.06} L ${width * 0.62} ${height * 1.08}" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
  <path d="M ${width * 0.15} ${-height * 0.06} L ${width * 0.28} ${height * 1.08} M ${width * 0.72} ${-height * 0.06} L ${width * 0.62} ${height * 1.08}" stroke="#b8c0c8" stroke-width="3" stroke-linecap="round"/>
  <path d="M 0 ${height * 0.22} H ${width * 0.33} M ${width * 0.42} 0 V ${height}" stroke="#ffffff" stroke-width="12" opacity="0.9"/>
  <path d="M 0 ${height * 0.22} H ${width * 0.33} M ${width * 0.42} 0 V ${height}" stroke="#d4d9d0" stroke-width="2" opacity="0.9"/>
  <g font-family="'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" font-size="14" font-weight="700">
    <text x="${width * 0.12}" y="${height * 0.18}" fill="#e87817">${escapeXml(region || '강남구')}</text>
    <text x="${width * 0.48}" y="${height * 0.34}" fill="#4f62c5">${escapeXml(name)}</text>
    <text x="${width * 0.70}" y="${height * 0.64}" fill="#6b7280">${escapeXml(address || '카카오맵 위치안내')}</text>
  </g>
  <g filter="url(#pinShadow)" transform="translate(${centerX} ${centerY - 12})">
    <path d="M0 38C-24 8-18-22 0-22S24 8 0 38Z" fill="#2f8dfb"/>
    <circle cx="0" cy="0" r="10" fill="#ffffff"/>
    <circle cx="0" cy="0" r="4" fill="#2f8dfb"/>
  </g>
  <g transform="translate(${labelX} ${labelY})">
    <rect x="0" y="0" width="${Math.min(310, width - labelX - 12)}" height="32" rx="16" fill="#ffffff" opacity="0.94"/>
    <text x="14" y="21" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" font-size="14" font-weight="800" fill="#2563eb">${escapeXml(name)}</text>
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

  const homeSeo = buildHomeSeoContent(localizedShops, res.locals.t);
  const seoKeywords = buildSeoKeywords(localizedShops, {
    extraKeywords: [
      ...translationSeoKeywords,
      ...homeSeo.keywordHighlights,
    ],
  });

  res.render('index', {
    shops: localizedShops,
    shopsByCategory,
    regions,
    categories: shopsByCategory.map((group) => group.category),
    districtMap,
    seoKeywords,
    seoContent: homeSeo,
    pageTitle: homeSeo.title,
    metaDescription: homeSeo.description,
    jsonLd: buildOrganizationJsonLd(req, res.locals.t),
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

    const shopSeo = buildShopSeoContent(localizedShop, res.locals.t);
    const shopSeoKeywords = uniqueKeywords([
      ...shopSeo.keywordHighlights,
      ...(Array.isArray(localizedShop.seoKeywords) ? localizedShop.seoKeywords : []),
    ]);

    res.render('shop', {
      shop: localizedShop,
      entrySummary,
      shopLocation,
      seoKeywords: shopSeoKeywords,
      seoContent: shopSeo,
      pageTitle: shopSeo.title,
      metaDescription: shopSeo.description,
      jsonLd: buildShopJsonLd(req, localizedShop),
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
