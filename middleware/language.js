const { URLSearchParams } = require('url');
const { detectLanguage, getCookieLanguage, normalizeLanguage } = require('../lib/language');
const {
  SUPPORTED_LANGUAGES,
  LANGUAGE_FLAGS,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
} = require('../lib/constants');
const { buildAreaFilterConfig } = require('../lib/shopUtils');
const { getTranslations } = require('../services/dataStore');

function getCanonicalOrigin(req) {
  const host = typeof req.get === 'function' ? req.get('host') : '';
  const hostname = host.split(':')[0].toLowerCase();
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const forwardedProto = typeof req.get === 'function' ? req.get('x-forwarded-proto') : null;
  const firstForwardedProto = typeof forwardedProto === 'string'
    ? forwardedProto.split(',')[0].trim().toLowerCase()
    : '';
  const requestProtocol = typeof req.protocol === 'string' ? req.protocol : 'http';
  const protocol = isLocalHost
    ? firstForwardedProto || requestProtocol
    : 'https';

  return `${protocol}://${host}`;
}

function buildLanguageOptions(req, activeLang, translations) {
  const canonicalOrigin = getCanonicalOrigin(req);
  return SUPPORTED_LANGUAGES.map((code) => {
    const params = new URLSearchParams(req.query);
    params.set('lang', code);
    const queryString = params.toString();
    const relativeUrl = `${req.path}${queryString ? `?${queryString}` : ''}`;
    let absoluteUrl = `${canonicalOrigin}${relativeUrl}`;

    if (code === DEFAULT_LANGUAGE) {
      const defaultParams = new URLSearchParams(req.query);
      defaultParams.delete('lang');
      const defaultQuery = defaultParams.toString();
      const defaultRelativeUrl = `${req.path}${defaultQuery ? `?${defaultQuery}` : ''}`;
      absoluteUrl = `${canonicalOrigin}${defaultRelativeUrl}`;
    }

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
}

function languageMiddleware(req, res, next) {
  const translations = getTranslations();
  const lang = detectLanguage(req);
  const activeLang = translations[lang] ? lang : DEFAULT_LANGUAGE;
  const translation = translations[activeLang] || {};
  const cookieLang = getCookieLanguage(req);
  if (cookieLang !== activeLang) {
    res.cookie(LANGUAGE_COOKIE_NAME, activeLang, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
    });
  }
  const requestedLang = normalizeLanguage(req.query.lang);
  const shouldRedirectToDefault =
    requestedLang === DEFAULT_LANGUAGE &&
    activeLang === DEFAULT_LANGUAGE &&
    typeof req.method === 'string' &&
    req.method.toUpperCase() === 'GET';

  if (shouldRedirectToDefault) {
    const params = new URLSearchParams(req.query);
    params.delete('lang');
    const queryString = params.toString();
    const redirectUrl = `${req.path}${queryString ? `?${queryString}` : ''}`;

    if (redirectUrl !== req.originalUrl) {
      return res.redirect(302, redirectUrl);
    }
  }
  const languageOptions = buildLanguageOptions(req, activeLang, translations);
  const currentLanguageOption = languageOptions.find((item) => item.isCurrent) || languageOptions[0];

  res.locals.lang = activeLang;
  res.locals.t = translation;
  res.locals.languageOptions = languageOptions;
  res.locals.defaultLanguage = DEFAULT_LANGUAGE;
  res.locals.areaFilterConfig = buildAreaFilterConfig(translation, activeLang);
  res.locals.canonicalUrl = currentLanguageOption
    ? currentLanguageOption.absoluteUrl
    : `${getCanonicalOrigin(req)}${req.originalUrl}`;

  next();
}

module.exports = languageMiddleware;
