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

const SEO_LANDING_PAGES = {
  '/community': {
    pageTitle: '유흥 커뮤니티 · 룸 조각 · 룸 번개 정보 - 룸빵1번지',
    metaDescription: '강남 유흥 커뮤니티에서 룸 조각, 룸 번개, 동행 모집, 실시간 후기와 업소 소식을 한 번에 확인하세요.',
    seoKeywords: ['유흥 커뮤니티', '룸 조각', '룸 번개', '강남 유흥 커뮤니티', '룸 동행', '강남 룸 조각', '강남 룸 번개'],
    eyebrow: 'Community',
    heading: '유흥 커뮤니티와 룸 조각 정보를 빠르게 확인하세요',
    intro: '룸빵1번지는 강남권 유흥 커뮤니티 이용자가 자주 찾는 룸 조각, 룸 번개, 동행 모집, 업소 후기 키워드를 중심으로 필요한 정보를 정리합니다.',
    primaryTitle: '유흥 커뮤니티 검색자를 위한 안내',
    primaryBody: '룸 조각과 룸 번개는 방문 인원, 지역, 시간대, 업소 컨디션을 빠르게 맞춰야 합니다. 커뮤니티 페이지에서는 강남권 룸 정보와 예약 상담으로 이어지는 핵심 동선을 제공합니다.',
    actions: [
      { label: '업소 목록 보기', href: '/' },
      { label: '출근부 확인', href: '/play/live', secondary: true },
    ],
    keywordGroups: [
      { title: '커뮤니티 핵심 키워드', body: '검색 노출 강화를 위해 실제 이용자가 찾는 대표 표현을 콘텐츠 안에 자연스럽게 배치했습니다.', keywords: ['유흥 커뮤니티', '룸 조각', '룸 번개'] },
      { title: '강남권 모임 검색', body: '강남, 논현, 신사, 역삼 등 주요 상권의 모임 수요와 업소 탐색 흐름을 연결합니다.', keywords: ['강남 룸 조각', '논현 룸 번개', '룸 동행'] },
    ],
  },
  '/play/live': {
    pageTitle: '초이스톡 출근부 · 엔트리 실시간 확인 - 룸빵1번지',
    metaDescription: '초이스톡 출근부, 엔트리, 실시간 출근 현황과 인기 멤버 정보를 빠르게 확인할 수 있는 라이브 페이지입니다.',
    seoKeywords: ['초이스톡', '초이스톡 출근부', '출근부', '엔트리', '실시간 출근부', '강남 엔트리', '강남 출근부'],
    eyebrow: 'Live Entry',
    heading: '초이스톡 출근부와 엔트리 현황을 한눈에',
    intro: '초이스톡 출근부, 엔트리, 실시간 출근 현황을 찾는 사용자가 빠르게 가게별 출근 정보를 확인하도록 라이브 안내 페이지를 구성했습니다.',
    primaryTitle: '출근부·엔트리 검색 최적화',
    primaryBody: '라이브 페이지는 초이스톡 출근부와 엔트리 키워드를 중심으로 오늘 출근 인원, 매장별 출근부, 인기 멤버 확인 동선을 제공합니다.',
    actions: [
      { label: '실시간 엔트리 보기', href: '/entry' },
      { label: '업소 정보 보기', href: '/business-info', secondary: true },
    ],
    keywordGroups: [
      { title: '출근부 키워드', body: '초이스톡을 통해 출근부와 엔트리를 찾는 검색 의도를 반영했습니다.', keywords: ['초이스톡 출근부', '실시간 출근부', '오늘 출근부'] },
      { title: '엔트리 키워드', body: '가게별 엔트리와 멤버 현황으로 이어지는 내부 링크를 강화했습니다.', keywords: ['엔트리', '강남 엔트리', '업소 엔트리'] },
    ],
  },
  '/business-info': {
    pageTitle: '달토 · 달리는토끼 · 유앤미 · 도파민 업체 정보 - 룸빵1번지',
    metaDescription: '달토, 달리는토끼, 유앤미, 도파민 등 강남 주요 업체명 검색자를 위한 업체 정보와 예약 상담 안내 페이지입니다.',
    seoKeywords: ['달토', '달리는토끼', '유앤미', '도파민', '강남 달토', '강남 달리는토끼', '강남 유앤미', '강남 도파민'],
    eyebrow: 'Business Info',
    heading: '달토·달리는토끼·유앤미·도파민 업체 정보를 비교하세요',
    intro: '업체명을 직접 검색하는 고객이 상호, 지역, 업종, 예약 상담 정보를 빠르게 찾을 수 있도록 업체 정보 페이지를 최적화했습니다.',
    primaryTitle: '업체명 검색 상위 노출을 위한 구성',
    primaryBody: '달토, 달리는토끼, 유앤미, 도파민 등 브랜드 검색어를 제목, 설명, 본문, 키워드 메타와 구조화 데이터에 자연스럽게 반영했습니다.',
    actions: [
      { label: '전체 업체 보기', href: '/' },
      { label: '커뮤니티 보기', href: '/community', secondary: true },
    ],
    keywordGroups: [
      { title: '대표 업체명', body: '브랜드 직접 검색 유입을 위해 사용자가 입력하는 축약명과 전체명을 함께 배치했습니다.', keywords: ['달토', '달리는토끼', '유앤미', '도파민'] },
      { title: '지역 결합 검색', body: '강남권 상권명과 업체명을 조합한 롱테일 키워드도 함께 노출합니다.', keywords: ['강남 달토', '강남 유앤미', '강남 도파민'] },
    ],
  },
};

function buildAbsoluteUrl(req, pathname) {
  const host = req.get('host') || 'nightmens.com';
  const protocol = host.includes('nightmens.com') ? 'https' : req.protocol;
  return `${protocol}://${host}${pathname}`;
}

function renderSeoLandingPage(req, res, next) {
  const page = SEO_LANDING_PAGES[req.path];

  if (!page) {
    return next();
  }

  const canonicalUrl = buildAbsoluteUrl(req, req.path);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.pageTitle,
    description: page.metaDescription,
    url: canonicalUrl,
    keywords: page.seoKeywords.join(', '),
  };

  res.render('seo-landing', {
    ...page,
    canonicalUrl,
    structuredData,
  });
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
  const seoPaths = Object.keys(SEO_LANDING_PAGES);
  const urls = [
    `${host}/`,
    ...seoPaths.map((pathname) => `${host}${pathname}`),
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
  renderSeoLandingPage,
  renderShopDetail,
  renderShopStaticMap,
  renderSitemap,
  renderShopEntrySummary,
};
