const {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
} = require('./constants');

function parseCookies(req) {
  const header = req && req.headers ? req.headers.cookie : null;

  if (typeof header !== 'string' || header.length === 0) {
    return {};
  }

  return header.split(';').reduce((acc, part) => {
    const [name, ...valueParts] = part.split('=');
    if (!name) {
      return acc;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return acc;
    }
    const value = valueParts.join('=');
    if (!value) {
      acc[trimmedName] = '';
      return acc;
    }

    const trimmedValue = value.trim();

    try {
      acc[trimmedName] = decodeURIComponent(trimmedValue);
    } catch (error) {
      acc[trimmedName] = trimmedValue;
    }
    return acc;
  }, {});
}

function getCookieLanguage(req) {
  const cookies = parseCookies(req);
  const cookieLang = cookies[LANGUAGE_COOKIE_NAME];
  return normalizeLanguage(cookieLang);
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

  const cookieLang = getCookieLanguage(req);
  if (cookieLang) {
    return cookieLang;
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

module.exports = {
  normalizeLanguage,
  detectLanguage,
  getCookieLanguage,
};
