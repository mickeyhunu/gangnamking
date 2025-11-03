const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('../lib/constants');
const { localizeShop, findShopByIdentifier } = require('../lib/shopUtils');
const { getShops } = require('../services/dataStore');
const { fetchShopLocation } = require('../services/naverMapService');
const { fetchStaticMapImage } = require('../services/naverStaticMapService');

function parseNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

async function renderShopStaticMap(req, res) {
  try {
    const { id } = req.params;
    const shops = getShops();
    const { shop, translationLang } = findShopByIdentifier(shops, id);

    if (!shop) {
      res.status(404).json({ error: 'Shop not found.' });
      return;
    }

    const requestedLang = typeof req.query.lang === 'string' ? req.query.lang.trim() : '';
    const normalizedLang = SUPPORTED_LANGUAGES.includes(requestedLang)
      ? requestedLang
      : SUPPORTED_LANGUAGES.includes(translationLang)
        ? translationLang
        : DEFAULT_LANGUAGE;
    const localizedShop = localizeShop(shop, normalizedLang);

    let lat = parseNumber(req.query.lat);
    let lng = parseNumber(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const candidateLocations = [localizedShop.location, shop.location];

      for (const candidate of candidateLocations) {
        if (!candidate || typeof candidate !== 'object') {
          continue;
        }

        const candidateLat = parseNumber(candidate.lat);
        const candidateLng = parseNumber(candidate.lng);

        if (Number.isFinite(candidateLat) && Number.isFinite(candidateLng)) {
          lat = candidateLat;
          lng = candidateLng;
          break;
        }
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const locationResult = await fetchShopLocation({
        address: localizedShop.address || shop.address,
        district: localizedShop.district || shop.district,
        region: localizedShop.region || shop.region,
      });

      const location =
        locationResult && typeof locationResult === 'object'
          ? locationResult.location || locationResult
          : null;

      if (location && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
        lat = location.lat;
        lng = location.lng;
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(404).json({ error: 'Location for this shop is not available.' });
      return;
    }

    const width = clamp(Number.parseInt(req.query.w, 10), 200, 1024, 600);
    const height = clamp(Number.parseInt(req.query.h, 10), 200, 1024, 360);
    const level = clamp(Number.parseInt(req.query.zoom, 10), 0, 16, 16);
    const scale = clamp(Number.parseInt(req.query.scale, 10), 1, 2, 1);

    const image = await fetchStaticMapImage({
      lat,
      lng,
      width,
      height,
      level,
      scale,
      lang: normalizedLang,
      marker: null,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
    res.send(image);
  } catch (error) {
    if (error && (error.statusCode === 401 || error.statusCode === 403)) {
      res.status(403).json({ error: 'Static map request is not authorized.' });
      return;
    }

    if (error && error.message === 'Naver Map credentials are not configured.') {
      res.status(503).json({ error: 'Static map service is not configured.' });
      return;
    }

    res.status(502).json({ error: 'Failed to load static map preview.' });
  }
}

module.exports = {
  renderShopStaticMap,
};
