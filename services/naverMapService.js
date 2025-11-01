const axios = require('axios');

const GEOCODE_ENDPOINT = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const { getNaverMapCredentials, hasNaverMapCredentials } = require('../config/naver');

function hasCredentials() {
  return hasNaverMapCredentials();
}

function normalizeQuery(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function buildQueryQueue({ address, district, region }) {
  const queries = [];
  const seen = new Set();

  function enqueue(raw) {
    const normalized = normalizeQuery(raw);

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    queries.push(normalized);
  }

  enqueue([region, district, address].filter(Boolean).join(' '));
  enqueue([district, address].filter(Boolean).join(' '));
  enqueue([region, address].filter(Boolean).join(' '));
  enqueue(address);
  enqueue([district, region].filter(Boolean).join(' '));

  return queries;
}

async function requestNaverGeocode(query) {
  if (!hasCredentials()) {
    throw new Error('Naver Map credentials are not configured.');
  }

  const { clientId, clientSecret } = getNaverMapCredentials();

  try {
    const response = await axios.get(GEOCODE_ENDPOINT, {
      params: { query },
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        Accept: 'application/json',
      },
    });

    const data = response && typeof response.data === 'object' ? response.data : {};
    const addresses = Array.isArray(data.addresses) ? data.addresses : [];

    if (!addresses.length) {
      throw new Error('No geocoding results found.');
    }

    const first = addresses[0] || {};
    const lat = Number.parseFloat(first.y);
    const lng = Number.parseFloat(first.x);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Received invalid coordinates from geocoding response.');
    }

    return {
      lat,
      lng,
      roadAddress: first.roadAddress || '',
      jibunAddress: first.jibunAddress || '',
      englishAddress: first.englishAddress || '',
      query,
    };
  } catch (error) {
    throw normalizeAxiosError(error, 'Geocoding request failed');
  }
}

async function requestNominatimGeocode(query) {
  try {
    const response = await axios.get(NOMINATIM_ENDPOINT, {
      params: {
        format: 'json',
        limit: 1,
        q: query,
      },
      headers: {
        'User-Agent': 'GangnamKing/1.0 (contact: support@gangnamking.com)',
        'Accept-Language': 'ko',
      },
    });

    const data = response && response.data ? response.data : [];
    const first = Array.isArray(data) && data.length ? data[0] : null;

    if (!first) {
      throw new Error('No geocoding results found from Nominatim.');
    }

    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Received invalid coordinates from Nominatim response.');
    }

    return {
      lat,
      lng,
      displayName: first.display_name || '',
      query,
    };
  } catch (error) {
    throw normalizeAxiosError(error, 'Nominatim request failed');
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

function parseErrorBody(error) {
  if (!error || typeof error.body !== 'string') {
    return null;
  }

  try {
    return JSON.parse(error.body);
  } catch (parseError) {
    return null;
  }
}

function extractResponseError(error) {
  const parsed = parseErrorBody(error);
  if (!parsed || typeof parsed.error !== 'object' || !parsed.error) {
    return null;
  }

  const responseError = parsed.error;
  const rawCode = responseError.errorCode;

  return {
    statusCode: Number(error && error.statusCode) || null,
    errorCode: typeof rawCode === 'string' || typeof rawCode === 'number'
      ? String(rawCode).trim()
      : null,
    message: typeof responseError.message === 'string' ? responseError.message : '',
  };
}

function inferAuthReason(error) {
  if (!error) {
    return null;
  }

  if (error.message === 'Naver Map credentials are not configured.') {
    return 'missing_credentials';
  }

  const statusCode = Number(error.statusCode);
  if (statusCode === 401) {
    return 'invalid_credentials';
  }

  if (statusCode === 403) {
    return 'permission_denied';
  }

  const responseError = extractResponseError(error);
  if (responseError && responseError.errorCode) {
    const normalized = responseError.errorCode.toUpperCase();

    if (normalized === '210') {
      return 'permission_denied';
    }

    if (normalized === '024') {
      return 'invalid_credentials';
    }

    if (normalized === '010' || normalized === '011' || normalized === '012') {
      return 'subscription_required';
    }
  }

  return null;
}

function isNaverAuthError(error) {
  if (!error) {
    return false;
  }

  if (error.message === 'Naver Map credentials are not configured.') {
    return true;
  }

  const statusCode = Number(error.statusCode);
  if (statusCode === 401 || statusCode === 403) {
    return true;
  }

  const responseError = extractResponseError(error);
  if (!responseError) {
    return false;
  }

  if (responseError.errorCode) {
    const normalized = responseError.errorCode.toUpperCase();
    return normalized === '024' || normalized === '010' || normalized === '011' || normalized === '012' || normalized === '210';
  }

  return false;
}

async function attemptProvider(
  queue,
  { name, request, formatResult, isAuthError, authErrorCode, extractAuthDetails }
) {
  let authError = null;

  for (const query of queue) {
    try {
      const result = await request(query);
      const formatted = formatResult(result);

      if (formatted) {
        return { location: formatted, authError: null };
      }
    } catch (error) {
      const isAuthIssue = typeof isAuthError === 'function' && isAuthError(error);

      if (isAuthIssue) {
        let details = null;
        let logMessage = '';

        if (typeof extractAuthDetails === 'function') {
          const extracted = extractAuthDetails(error) || {};
          details = extracted.details || null;
          logMessage = extracted.logMessage || '';
        }

        if (logMessage) {
          console.warn(`[${name}] ${logMessage}`);
        } else {
          console.warn(`[${name}] Authentication error for query "${query}":`, error);
        }

        authError = {
          code: authErrorCode || 'AUTH_ERROR',
          details,
        };
        break;
      }

      if (queue[queue.length - 1] === query) {
        console.warn(`[${name}] Failed to fetch shop location for query "${query}":`, error);
      }
    }
  }

  return { location: null, authError };
}

async function fetchShopLocation({ address, district, region }) {
  const queue = buildQueryQueue({ address, district, region });

  const providers = [];
  let authError = null;

  if (!hasCredentials()) {
    authError = {
      code: 'NAVER_MAP_AUTH',
      details: {
        reason: 'missing_credentials',
      },
    };
  }

  if (hasCredentials()) {
    providers.push({
      name: 'Naver Maps',
      request: requestNaverGeocode,
      formatResult: (result) => ({
        lat: result.lat,
        lng: result.lng,
        formattedAddress:
          result.roadAddress || result.jibunAddress || result.englishAddress || result.query,
        roadAddress: result.roadAddress,
        jibunAddress: result.jibunAddress,
        englishAddress: result.englishAddress,
        queryUsed: result.query,
      }),
      isAuthError: (error) => isNaverAuthError(error),
      authErrorCode: 'NAVER_MAP_AUTH',
      extractAuthDetails: (error) => {
        if (!error) {
          return null;
        }

        if (error.message === 'Naver Map credentials are not configured.') {
          return {
            logMessage: 'Naver Map credentials are missing. Falling back to alternative provider.',
            details: {
              reason: 'missing_credentials',
            },
          };
        }

        const responseError = extractResponseError(error);
        const reason = inferAuthReason(error);
        const logMessage = responseError
          ? `Authentication failed: ${responseError.message || 'Permission denied'} (code ${
              responseError.errorCode || 'unknown'
            })`
          : reason === 'permission_denied'
          ? 'Authentication failed: Permission denied. Falling back to alternative provider.'
          : reason === 'subscription_required'
          ? 'Authentication failed: Maps subscription is not enabled. Falling back to alternative provider.'
          : 'Authentication failed with status 401. Falling back to alternative provider.';

        return {
          logMessage,
          details: {
            statusCode: Number(error.statusCode) || null,
            errorCode: responseError && responseError.errorCode ? responseError.errorCode : null,
            providerMessage: responseError && responseError.message ? responseError.message : null,
            reason: reason || (responseError ? 'unknown' : null),
          },
        };
      },
    });
  }

  providers.push({
    name: 'OpenStreetMap',
    request: requestNominatimGeocode,
    formatResult: (result) => ({
      lat: result.lat,
      lng: result.lng,
      formattedAddress: result.displayName || result.query,
      roadAddress: '',
      jibunAddress: '',
      englishAddress: '',
      queryUsed: result.query,
    }),
  });

  for (const provider of providers) {
    const { location, authError: providerAuthError } = await attemptProvider(queue, provider);

    if (providerAuthError && !authError) {
      authError = providerAuthError;
    }

    if (location) {
      return {
        location,
        authError,
      };
    }
  }

  return {
    location: null,
    authError,
  };
}

module.exports = {
  fetchShopLocation,
};
