const https = require('https');

const GEOCODE_ENDPOINT = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

function hasCredentials() {
  return typeof CLIENT_ID === 'string' && CLIENT_ID && typeof CLIENT_SECRET === 'string' && CLIENT_SECRET;
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

function requestNaverGeocode(query) {
  return new Promise((resolve, reject) => {
    if (!hasCredentials()) {
      reject(new Error('Naver Map credentials are not configured.'));
      return;
    }

    const encodedQuery = encodeURIComponent(query);
    const requestUrl = `${GEOCODE_ENDPOINT}?query=${encodedQuery}`;

    const request = https.request(
      requestUrl,
      {
        method: 'GET',
        headers: {
          'X-NCP-APIGW-API-KEY-ID': CLIENT_ID,
          'X-NCP-APIGW-API-KEY': CLIENT_SECRET,
        },
      },
      (response) => {
        const { statusCode } = response;
        const chunks = [];

        response.setEncoding('utf8');

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const rawBody = chunks.join('');

          if (statusCode !== 200) {
            const error = new Error(`Geocoding request failed with status ${statusCode}`);
            error.statusCode = statusCode;
            error.body = rawBody;
            reject(error);
            return;
          }

          let parsed;
          try {
            parsed = rawBody ? JSON.parse(rawBody) : {};
          } catch (error) {
            const parseError = new Error('Failed to parse geocoding response.');
            parseError.cause = error;
            reject(parseError);
            return;
          }

          const addresses = Array.isArray(parsed.addresses) ? parsed.addresses : [];

          if (!addresses.length) {
            reject(new Error('No geocoding results found.'));
            return;
          }

          const first = addresses[0] || {};
          const lat = Number.parseFloat(first.y);
          const lng = Number.parseFloat(first.x);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            reject(new Error('Received invalid coordinates from geocoding response.'));
            return;
          }

          resolve({
            lat,
            lng,
            roadAddress: first.roadAddress || '',
            jibunAddress: first.jibunAddress || '',
            englishAddress: first.englishAddress || '',
            query,
          });
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
}

function requestNominatimGeocode(query) {
  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query);
    const requestUrl = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodedQuery}`;

    const request = https.request(
      requestUrl,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'GangnamKing/1.0 (contact: support@gangnamking.com)',
          'Accept-Language': 'ko',
        },
      },
      (response) => {
        const { statusCode } = response;
        const chunks = [];

        response.setEncoding('utf8');

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const rawBody = chunks.join('');

          if (statusCode !== 200) {
            const error = new Error(`Nominatim request failed with status ${statusCode}`);
            error.statusCode = statusCode;
            error.body = rawBody;
            reject(error);
            return;
          }

          let parsed;
          try {
            parsed = rawBody ? JSON.parse(rawBody) : [];
          } catch (error) {
            const parseError = new Error('Failed to parse Nominatim response.');
            parseError.cause = error;
            reject(parseError);
            return;
          }

          const first = Array.isArray(parsed) && parsed.length ? parsed[0] : null;

          if (!first) {
            reject(new Error('No geocoding results found from Nominatim.'));
            return;
          }

          const lat = Number.parseFloat(first.lat);
          const lng = Number.parseFloat(first.lon);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            reject(new Error('Received invalid coordinates from Nominatim response.'));
            return;
          }

          resolve({
            lat,
            lng,
            displayName: first.display_name || '',
            query,
          });
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
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

async function attemptProvider(queue, provider) {
  const { name, request, formatResult, isAuthError, authErrorCode, extractAuthDetails } = provider;
  let authError = null;

          let parsed;
          try {
            parsed = rawBody ? JSON.parse(rawBody) : [];
          } catch (error) {
            const parseError = new Error('Failed to parse Nominatim response.');
            parseError.cause = error;
            reject(parseError);
            return;
          }

          const first = Array.isArray(parsed) && parsed.length ? parsed[0] : null;

          if (!first) {
            reject(new Error('No geocoding results found from Nominatim.'));
            return;
          }

          const lat = Number.parseFloat(first.lat);
          const lng = Number.parseFloat(first.lon);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            reject(new Error('Received invalid coordinates from Nominatim response.'));
            return;
          }

          resolve({
            lat,
            lng,
            displayName: first.display_name || '',
            query,
          });
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
}

async function attemptProvider(queue, { name, request, formatResult, isAuthError }) {
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
      isAuthError: (error) =>
        Number(error && error.statusCode) === 401 ||
        (error && error.message === 'Naver Map credentials are not configured.'),
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

        const parsed = parseErrorBody(error);
        const responseError = parsed && parsed.error ? parsed.error : null;

        return {
          logMessage: responseError
            ? `Authentication failed: ${responseError.message || 'Permission denied'} (code ${responseError.errorCode || 'unknown'})`
            : 'Authentication failed with status 401. Falling back to alternative provider.',
          details: {
            statusCode: Number(error.statusCode) || null,
            errorCode: responseError && responseError.errorCode ? responseError.errorCode : null,
            providerMessage: responseError && responseError.message ? responseError.message : null,
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
