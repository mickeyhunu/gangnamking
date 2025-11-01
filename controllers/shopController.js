const { DEFAULT_LANGUAGE, LANGUAGE_LOCALES } = require('../lib/constants');
const { localizeShop } = require('../lib/shopUtils');
const { getShops } = require('../services/dataStore');
const { fetchEntriesForStore, fetchEntryWorkerNames } = require('../services/entryService');
const { fetchShopLocation } = require('../services/naverMapService');

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

function buildEntrySummary(entries, workerNames) {
  const normalizedWorkerNames = Array.isArray(workerNames)
    ? workerNames
        .map((name) => (typeof name === 'string' ? name.trim() : ''))
        .filter(Boolean)
    : [];

  const workerRows = chunkArray(normalizedWorkerNames, 10);

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

function buildSeoKeywords(shops) {
  return [
    ...new Set(
      shops.flatMap((shop) => (Array.isArray(shop.seoKeywords) ? shop.seoKeywords : []))
    ),
  ];
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
  const seoKeywords = buildSeoKeywords(localizedShops);

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
    const shop = shops.find((item) => item.id === req.params.id);

    if (!shop) {
      return next();
    }

    const lang = res.locals.lang || DEFAULT_LANGUAGE;
    const localizedShop = localizeShop(shop, lang);
    const locale = LANGUAGE_LOCALES[lang] || LANGUAGE_LOCALES[DEFAULT_LANGUAGE];
    const numberFormatter = new Intl.NumberFormat(locale);
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const storeNoRaw = localizedShop.storeNo ?? shop.storeNo;
    const normalizedStoreNo = Number(storeNoRaw);
    const hasStoreNo = Number.isFinite(normalizedStoreNo) && normalizedStoreNo > 0;

    let storeEntries = [];
    let entryWorkerNames = [];
    let entrySummary = {
      enabled: false,
      totalCount: 0,
      workerRows: [],
      hasWorkerRows: false,
      topEntries: [],
    };

    if (hasStoreNo) {
      const rawEntries = await fetchEntriesForStore(normalizedStoreNo, { shopId: shop.id });
      entryWorkerNames = await fetchEntryWorkerNames(normalizedStoreNo, {
        shopId: shop.id,
        entries: rawEntries,
      });

      storeEntries = rawEntries.map((entry) => ({
        workerName: entry.workerName,
        mentionCount: entry.mentionCount,
        mentionCountLabel: numberFormatter.format(entry.mentionCount || 0),
        insertCount: entry.insertCount,
        insertCountLabel: numberFormatter.format(entry.insertCount || 0),
        createdAt: entry.createdAt,
        createdAtLabel: entry.createdAt ? dateFormatter.format(entry.createdAt) : '',
      }));

      entrySummary = {
        ...buildEntrySummary(storeEntries, entryWorkerNames),
        enabled: true,
      };
    }

    let shopLocation = null;
    let mapAuthErrorCode = '';
    try {
      const locationResult = await fetchShopLocation({
        address: localizedShop.address || shop.address,
        district: localizedShop.district || shop.district,
        region: localizedShop.region || shop.region,
      });

      if (locationResult && typeof locationResult === 'object') {
        if (locationResult.location && typeof locationResult.location === 'object') {
          shopLocation = locationResult.location;
        } else if (Number.isFinite(locationResult.lat) && Number.isFinite(locationResult.lng)) {
          shopLocation = locationResult;
        }

        if (locationResult.authError && typeof locationResult.authError === 'object') {
          mapAuthErrorCode = locationResult.authError.code || '';
        }
      } else {
        shopLocation = locationResult;
      }
    } catch (error) {
      // Intentionally ignore location lookup errors so the page can render without map data.
    }

    res.render('shop', {
      shop: localizedShop,
      storeEntries,
      entryWorkerNames,
      entrySummary,
      shopLocation,
      mapAuthErrorCode,
      seoKeywords: Array.isArray(localizedShop.seoKeywords) ? localizedShop.seoKeywords : [],
      pageTitle: `${localizedShop.name}${(res.locals.t.meta && res.locals.t.meta.shopTitleSuffix) || ''}`,
      metaDescription: localizedShop.description || '',
    });
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
  renderSitemap,
};
