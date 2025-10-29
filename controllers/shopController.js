const { DEFAULT_LANGUAGE, LANGUAGE_LOCALES } = require('../lib/constants');
const { localizeShop } = require('../lib/shopUtils');
const { getShops } = require('../services/dataStore');
const { fetchEntriesForStore } = require('../services/entryService');
const { fetchShopLocation } = require('../services/naverMapService');

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
  const districtMap = buildDistrictMap(localizedShops);
  const seoKeywords = buildSeoKeywords(localizedShops);

  res.render('index', {
    shops: localizedShops,
    regions,
    categories,
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
    const storeNo = localizedShop.storeNo || shop.storeNo;
    const rawEntries = await fetchEntriesForStore(storeNo);
    const storeEntries = rawEntries.map((entry) => ({
      workerName: entry.workerName,
      mentionCount: entry.mentionCount,
      mentionCountLabel: numberFormatter.format(entry.mentionCount || 0),
      insertCount: entry.insertCount,
      insertCountLabel: numberFormatter.format(entry.insertCount || 0),
      createdAt: entry.createdAt,
      createdAtLabel: entry.createdAt ? dateFormatter.format(entry.createdAt) : '',
    }));

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
      console.warn('Failed to retrieve shop location details:', error);
    }

    res.render('shop', {
      shop: localizedShop,
      storeEntries,
      shopLocation,
      mapAuthErrorCode,
      seoKeywords: Array.isArray(localizedShop.seoKeywords) ? localizedShop.seoKeywords : [],
      pageTitle: `${localizedShop.name}${(res.locals.t.meta && res.locals.t.meta.shopTitleSuffix) || ''}`,
      metaDescription: localizedShop.description || '',
    });
  } catch (error) {
    console.error('Failed to render shop detail page', error);
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
