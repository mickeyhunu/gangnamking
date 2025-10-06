const path = require('path');
const fs = require('fs');
const express = require('express');
const { URLSearchParams } = require('url');

const SUPPORTED_LANGUAGES = ['ko', 'en', 'zh', 'ja'];
const LANGUAGE_FLAGS = {
  ko: { src: '/images/flags/flag-ko.svg', alt: '한국어' },
  en: { src: '/images/flags/flag-us.svg', alt: 'English' },
  zh: { src: '/images/flags/flag-cn.svg', alt: '中文' },
  ja: { src: '/images/flags/flag-jp.svg', alt: '日本語' },
};
const DEFAULT_LANGUAGE = 'ko';

const app = express();
const PORT = process.env.PORT || 3000;

// Load shop data
const shopsPath = path.join(__dirname, 'data', 'shops.json');
let shops = [];

const translationsPath = path.join(__dirname, 'data', 'translations.json');
let translations = {};

function loadShops() {
  try {
    const raw = fs.readFileSync(shopsPath, 'utf-8');
    shops = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load shop data:', error);
    shops = [];
  }
}

function loadTranslations() {
  try {
    const raw = fs.readFileSync(translationsPath, 'utf-8');
    translations = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load translation data:', error);
    translations = {};
  }
}

loadShops();
loadTranslations();

fs.watchFile(shopsPath, { interval: 1000 }, () => {
  console.log('Detected change in shop data. Reloading...');
  loadShops();
});

fs.watchFile(translationsPath, { interval: 1000 }, () => {
  console.log('Detected change in translations. Reloading...');
  loadTranslations();
});

function normalizeLanguage(lang) {
  if (typeof lang !== 'string') {
    return null;
  }
  const lowered = lang.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lowered) ? lowered : null;
}

function detectLanguage(req) {
  const queryLang = normalizeLanguage(req.query.lang);
  if (queryLang) {
    return queryLang;
  }

  if (typeof req.acceptsLanguages === 'function') {
    const accepted = req.acceptsLanguages(SUPPORTED_LANGUAGES);
    if (Array.isArray(accepted) && accepted.length) {
      return accepted[0];
    }
    if (typeof accepted === 'string') {
      return accepted;
    }
  }

  return DEFAULT_LANGUAGE;
}

function localizeShop(shop, lang) {
  if (!shop || typeof shop !== 'object') {
    return shop;
  }

  if (lang === DEFAULT_LANGUAGE) {
    return { ...shop };
  }

  const translation = shop.translations && shop.translations[lang];

  if (!translation || typeof translation !== 'object') {
    return { ...shop };
  }

  const localized = {
    ...shop,
    ...translation,
    pricing: {
      ...(shop.pricing || {}),
      ...(translation.pricing || {}),
    },
    manager: {
      ...(shop.manager || {}),
      ...(translation.manager || {}),
    },
  };

  if (Array.isArray(translation.highlights)) {
    localized.highlights = translation.highlights;
  }

  if (Array.isArray(translation.seoKeywords)) {
    localized.seoKeywords = translation.seoKeywords;
  }

  if (Array.isArray(translation.gallery)) {
    localized.gallery = translation.gallery;
  }

  return localized;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const lang = detectLanguage(req);
  const activeLang = translations[lang] ? lang : DEFAULT_LANGUAGE;
  const translation = translations[activeLang] || {};

  const languageOptions = SUPPORTED_LANGUAGES.map((code) => {
    const params = new URLSearchParams(req.query);
    if (code === DEFAULT_LANGUAGE) {
      params.delete('lang');
    } else {
      params.set('lang', code);
    }
    const queryString = params.toString();
    const relativeUrl = `${req.path}${queryString ? `?${queryString}` : ''}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

    const flag = LANGUAGE_FLAGS[code] || {};

    return {
      code,
      label: translations[code]?.languageName || code.toUpperCase(),
      flagSrc: flag.src || '',
      flagAlt:
        flag.alt || translations[code]?.languageName || code.toUpperCase(),
      url: relativeUrl,
      absoluteUrl,
      isCurrent: code === activeLang,
    };
  });

  const currentLanguageOption = languageOptions.find((item) => item.isCurrent) || languageOptions[0];

  res.locals.lang = activeLang;
  res.locals.t = translation;
  res.locals.languageOptions = languageOptions;
  res.locals.defaultLanguage = DEFAULT_LANGUAGE;
  res.locals.canonicalUrl = currentLanguageOption ? currentLanguageOption.absoluteUrl : `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  next();
});

app.get('/', (req, res) => {
  const lang = res.locals.lang || DEFAULT_LANGUAGE;
  const localizedShops = shops.map((shop) => localizeShop(shop, lang));
  const regions = [...new Set(localizedShops.map((shop) => shop.region))];
  const categories = [...new Set(localizedShops.map((shop) => shop.category))];
  const districtMap = regions.reduce((acc, region) => {
    const districts = localizedShops
      .filter((shop) => shop.region === region)
      .map((shop) => shop.district);
    acc[region] = [...new Set(districts)];
    return acc;
  }, {});
  const seoKeywords = [
    ...new Set(
      localizedShops.flatMap((shop) => (Array.isArray(shop.seoKeywords) ? shop.seoKeywords : []))
    )
  ];

  res.render('index', {
    shops: localizedShops,
    regions,
    categories,
    districtMap,
    seoKeywords,
    pageTitle: (res.locals.t.meta && res.locals.t.meta.indexTitle) || 'Gangnam King',
    metaDescription: (res.locals.t.meta && res.locals.t.meta.description) || '',
  });
});

app.get('/shops/:id', (req, res, next) => {
  const shop = shops.find((item) => item.id === req.params.id);

  if (!shop) {
    return next();
  }

  const lang = res.locals.lang || DEFAULT_LANGUAGE;
  const localizedShop = localizeShop(shop, lang);

  res.render('shop', {
    shop: localizedShop,
    seoKeywords: Array.isArray(localizedShop.seoKeywords) ? localizedShop.seoKeywords : [],
    pageTitle: `${localizedShop.name}${(res.locals.t.meta && res.locals.t.meta.shopTitleSuffix) || ''}`,
    metaDescription: localizedShop.description || '',
  });
});

app.get('/sitemap.xml', (req, res) => {
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
});

app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: (res.locals.t.notFound && res.locals.t.notFound.title) || 'Not Found',
    metaDescription: (res.locals.t.notFound && res.locals.t.notFound.description) || '',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
