const { LANGUAGE_LOCALES, DEFAULT_LANGUAGE, GANGNAM_KEYWORD, AREA_FILTER_DEFAULTS } = require('./constants');
const { augmentGalleryWithFolderImages, derivePrimaryImage } = require('./gallery');
const { getShops } = require('../services/dataStore');

const SEOUL_PROXIMITY_RANK = (() => {
  const proximityGroups = [
    ['서울', '서울특별시'],
    ['경기', '경기도'],
    ['인천', '인천광역시'],
    ['강원', '강원도'],
    ['세종', '세종특별자치시'],
    ['충북', '충청북도'],
    ['충남', '충청남도'],
    ['대전', '대전광역시'],
    ['전북', '전라북도'],
    ['전남', '전라남도'],
    ['광주', '광주광역시'],
    ['경북', '경상북도'],
    ['대구', '대구광역시'],
    ['울산', '울산광역시'],
    ['경남', '경상남도'],
    ['부산', '부산광역시', '부산'],
    ['제주', '제주특별자치도', '제주도'],
  ];

  return proximityGroups.reduce((acc, names, index) => {
    names.forEach((name) => {
      acc[name] = index;
    });
    return acc;
  }, {});
})();

function getSeoulProximityRank(cityName) {
  if (typeof cityName !== 'string') {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = cityName.trim();

  if (!normalized) {
    return Number.POSITIVE_INFINITY;
  }

  if (Object.prototype.hasOwnProperty.call(SEOUL_PROXIMITY_RANK, normalized)) {
    return SEOUL_PROXIMITY_RANK[normalized];
  }

  return Number.POSITIVE_INFINITY;
}

function determineAreaGroup(shop) {
  if (!shop || typeof shop !== 'object') {
    return 'nonGangnam';
  }

  const district = typeof shop.district === 'string' ? shop.district : '';
  const region = typeof shop.region === 'string' ? shop.region : '';
  const address = typeof shop.address === 'string' ? shop.address : '';
  const combined = `${region} ${district} ${address}`;

  if (GANGNAM_KEYWORD.test(combined)) {
    return 'gangnam';
  }

  return 'nonGangnam';
}

function buildAreaFilterConfig(translation, lang) {
  const locale = LANGUAGE_LOCALES[lang] || LANGUAGE_LOCALES[DEFAULT_LANGUAGE];
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const shops = getShops();
  const cityMap = shops.reduce((acc, shop) => {
    if (!shop || typeof shop !== 'object') {
      return acc;
    }

    const region = typeof shop.region === 'string' ? shop.region.trim() : '';
    const district = typeof shop.district === 'string' ? shop.district.trim() : '';

    if (!region) {
      return acc;
    }

    if (!acc[region]) {
      acc[region] = new Set();
    }

    if (district) {
      acc[region].add(district);
    }

    return acc;
  }, {});

  const cities = Object.entries(cityMap)
    .map(([city, districts]) => ({
      value: city,
      label: city,
      districts: [...districts].sort((a, b) => collator.compare(a, b)),
    }))
    .sort((a, b) => {
      const rankA = getSeoulProximityRank(a.label);
      const rankB = getSeoulProximityRank(b.label);

      if (rankA !== rankB) {
        return rankA < rankB ? -1 : 1;
      }

      return collator.compare(a.label, b.label);
    });

  const config = (translation && translation.quickRegions) || {};
  const heroFilters = translation && translation.hero && translation.hero.filters;
  const allLabelFromTranslation =
    heroFilters && typeof heroFilters.all === 'string'
      ? heroFilters.all.trim()
      : '';

  return {
    label: typeof config.label === 'string' && config.label.trim()
      ? config.label.trim()
      : AREA_FILTER_DEFAULTS.label,
    allLabel: allLabelFromTranslation || AREA_FILTER_DEFAULTS.all,
    cities,
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
  localized.areaGroup = determineAreaGroup(shop);

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

module.exports = {
  buildAreaFilterConfig,
  determineAreaGroup,
  localizeShop,
};
