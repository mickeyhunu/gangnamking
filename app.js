const path = require('path');
const fs = require('fs');
const express = require('express');
const { URLSearchParams } = require('url');

const SUPPORTED_LANGUAGES = ['ko', 'en', 'zh', 'ja'];
const LANGUAGE_FLAGS = {
  ko: { src: '/images/flags/flag-ko.png', alt: '한국어' },
  en: { src: '/images/flags/flag-us.svg', alt: 'English' },
  zh: { src: '/images/flags/flag-cn.svg', alt: '中文' },
  ja: { src: '/images/flags/flag-jp.svg', alt: '日本語' },
};
const DEFAULT_LANGUAGE = 'ko';

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGE_FILE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);

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

function sanitizeResourcePath(resourcePath) {
  if (typeof resourcePath !== 'string') {
    return null;
  }

  const trimmed = resourcePath.trim();

  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  const normalized = path.posix.normalize(withoutLeadingSlash);

  if (normalized.startsWith('..')) {
    return null;
  }

  return normalized;
}

function normalizeWebPath(resourcePath) {
  if (typeof resourcePath !== 'string') {
    return null;
  }

  const trimmed = resourcePath.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const relative = sanitizeResourcePath(trimmed);

  if (!relative) {
    return null;
  }

  return `/${relative}`;
}

function getDirectoryFromResource(resourcePath) {
  const relative = sanitizeResourcePath(resourcePath);

  if (!relative || !relative.startsWith('images/')) {
    return null;
  }

  return path.posix.dirname(relative);
}

function getImageDirectoriesForShop(shop) {
  const directories = new Set();

  if (shop && typeof shop.galleryDir === 'string') {
    const sanitizedDir = sanitizeResourcePath(shop.galleryDir);

    if (sanitizedDir && sanitizedDir.startsWith('images/')) {
      directories.add(sanitizedDir);
    }
  }

  const candidates = [];

  if (shop && typeof shop.image === 'string') {
    candidates.push(shop.image);
  }

  if (Array.isArray(shop?.gallery)) {
    shop.gallery.forEach((entry) => {
      const src = typeof entry === 'string' ? entry : entry && entry.src;

      if (typeof src === 'string') {
        candidates.push(src);
      }
    });
  }

  candidates.forEach((candidate) => {
    const dir = getDirectoryFromResource(candidate);

    if (dir) {
      directories.add(dir);
    }
  });

  return Array.from(directories);
}

function readImagesFromDirectory(relativeDir) {
  if (typeof relativeDir !== 'string' || !relativeDir) {
    return [];
  }

  const absoluteDir = path.join(PUBLIC_DIR, relativeDir);

  try {
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && IMAGE_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => `/${path.posix.join(relativeDir, entry.name)}`)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (error) {
    return [];
  }
}

function buildGalleryEntry(entry, fallbackAlt) {
  if (!entry) {
    return null;
  }

  const candidate = typeof entry === 'string' ? { src: entry } : entry;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const normalizedSrc = normalizeWebPath(candidate.src);

  if (!normalizedSrc) {
    return null;
  }

  const altText = typeof candidate.alt === 'string' && candidate.alt.trim()
    ? candidate.alt.trim()
    : fallbackAlt;

  return {
    ...candidate,
    src: normalizedSrc,
    alt: altText,
  };
}

function augmentGalleryWithFolderImages(shop) {
  const fallbackAltBase = typeof shop?.name === 'string' && shop.name.trim()
    ? shop.name.trim()
    : 'Shop';
  const fallbackAlt = `${fallbackAltBase} 이미지`;
  const result = [];
  const seen = new Set();

  function addEntry(entry) {
    const galleryEntry = buildGalleryEntry(entry, fallbackAlt);

    if (!galleryEntry || seen.has(galleryEntry.src)) {
      return;
    }

    seen.add(galleryEntry.src);
    result.push(galleryEntry);
  }

  if (Array.isArray(shop?.gallery)) {
    shop.gallery.forEach((entry) => addEntry(entry));
  }

  getImageDirectoriesForShop(shop).forEach((dir) => {
    readImagesFromDirectory(dir).forEach((src) => addEntry({ src }));
  });

  if (!result.length && typeof shop?.image === 'string') {
    addEntry({ src: shop.image });
  }

  return result;
}

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

function derivePrimaryImage(localizedShop) {
  if (!localizedShop || typeof localizedShop !== 'object') {
    return null;
  }

  if (Array.isArray(localizedShop.gallery) && localizedShop.gallery.length) {
    return localizedShop.gallery[0];
  }

  const normalized = normalizeWebPath(localizedShop.image);

  if (!normalized) {
    return null;
  }

  const fallbackAltBase = typeof localizedShop.name === 'string' && localizedShop.name.trim()
    ? localizedShop.name.trim()
    : 'Shop';

  return {
    src: normalized,
    alt: localizedShop.imageAlt
      || `${fallbackAltBase} 이미지`,
  };
}

function localizeShop(shop, lang) {
  if (!shop || typeof shop !== 'object') {
    return shop;
  }

  let localized = { ...shop };

  if (lang !== DEFAULT_LANGUAGE) {
    const translation = shop.translations && shop.translations[lang];

    if (translation && typeof translation === 'object') {
      localized = {
        ...localized,
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
    }
  }

  localized.gallery = augmentGalleryWithFolderImages(localized);

  const primaryImage = derivePrimaryImage({ ...localized, gallery: localized.gallery });

  if (primaryImage) {
    localized.image = primaryImage.src;
    localized.imageAlt = primaryImage.alt;
  } else {
    localized.image = null;
    localized.imageAlt = null;
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
