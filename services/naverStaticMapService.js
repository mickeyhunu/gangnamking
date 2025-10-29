const https = require('https');
const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('../lib/constants');
const { getNaverMapCredentials, hasNaverMapCredentials } = require('../config/naver');

const STATIC_MAP_ENDPOINT = 'https://naveropenapi.apigw.ntruss.com/map-static/v2/raster';
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 360;
const DEFAULT_LEVEL = 16;
const MAX_DIMENSION = 1024;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function resolveDimension(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  const dimension = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(dimension, 1, MAX_DIMENSION);
}

function resolveScale(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return clamp(parsed, 1, 2);
}

function resolveLevel(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LEVEL;
  }

  return clamp(parsed, 0, 16);
}

function hasCredentials() {
  return hasNaverMapCredentials();
}

function normalizeLanguage(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (normalized && SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_LANGUAGE;
}

function buildStaticMapParams({ lat, lng, width, height, level, scale, lang }) {
  const params = new URLSearchParams();
  params.set('w', String(resolveDimension(width, DEFAULT_WIDTH)));
  params.set('h', String(resolveDimension(height, DEFAULT_HEIGHT)));
  params.set('center', `${lng},${lat}`);
  params.set('level', String(resolveLevel(level)));
  params.set('scale', String(resolveScale(scale)));
  params.set('format', 'png');
  params.append('markers', `type:t|size:mid|color:0xff478b|pos:${lng},${lat}`);
  params.set('lang', normalizeLanguage(lang));

  return params.toString();
}

function fetchStaticMapImage({ lat, lng, width, height, level, scale, lang }) {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      reject(new Error('Latitude and longitude are required to request a static map.'));
      return;
    }

    if (!hasCredentials()) {
      reject(new Error('Naver Map credentials are not configured.'));
      return;
    }

    const params = buildStaticMapParams({ lat, lng, width, height, level, scale, lang });
    const requestUrl = `${STATIC_MAP_ENDPOINT}?${params}`;
    const { clientId, clientSecret } = getNaverMapCredentials();

    const request = https.request(
      requestUrl,
      {
        method: 'GET',
        headers: {
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret,
          Accept: 'image/png,image/jpeg',
        },
      },
      (response) => {
        const { statusCode } = response;
        const chunks = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const body = Buffer.concat(chunks);

          if (statusCode !== 200) {
            const error = new Error(`Static map request failed with status ${statusCode}`);
            error.statusCode = statusCode;
            error.body = body;
            reject(error);
            return;
          }

          resolve(body);
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
}

module.exports = {
  fetchStaticMapImage,
};
