const axios = require('axios');
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
  params.append('markers', `type:t|size:mid|color:0xff478b|pos:${lng} ${lat}`);
  params.set('lang', normalizeLanguage(lang));

  return params.toString();
}

async function fetchStaticMapImage({ lat, lng, width, height, level, scale, lang }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Latitude and longitude are required to request a static map.');
  }

  if (!hasCredentials()) {
    throw new Error('Naver Map credentials are not configured.');
  }

  const params = buildStaticMapParams({ lat, lng, width, height, level, scale, lang });
  const requestUrl = `${STATIC_MAP_ENDPOINT}?${params}`;
  const { clientId, clientSecret } = getNaverMapCredentials();

  try {
    const response = await axios.get(requestUrl, {
      responseType: 'arraybuffer',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        Accept: 'image/png,image/jpeg',
      },
    });

    const data = response && response.data ? response.data : null;
    return Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  } catch (error) {
    throw normalizeAxiosError(error, 'Static map request failed');
  }
}

function normalizeAxiosError(error, fallbackMessage) {
  if (error && error.response) {
    const statusCode = Number(error.response.status);
    const messageSuffix = Number.isFinite(statusCode) ? ` with status ${statusCode}` : '';
    const normalized = new Error(`${fallbackMessage}${messageSuffix}`);
    normalized.statusCode = Number.isFinite(statusCode) ? statusCode : null;
    normalized.body = serializeResponseBody(error.response.data);
    normalized.cause = error;
    throw normalized;
  }

  throw error;
}

function serializeResponseBody(body) {
  if (body === undefined || body === null) {
    return '';
  }

  if (typeof body === 'string') {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  if (body instanceof ArrayBuffer) {
    return Buffer.from(body).toString('utf8');
  }

  try {
    return JSON.stringify(body);
  } catch (error) {
    return String(body);
  }
}

module.exports = {
  fetchStaticMapImage,
};
