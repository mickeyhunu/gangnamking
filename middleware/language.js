const { URLSearchParams } = require('url');
const { detectLanguage } = require('../lib/language');
const { SUPPORTED_LANGUAGES, LANGUAGE_FLAGS, DEFAULT_LANGUAGE } = require('../lib/constants');
const { buildAreaFilterConfig } = require('../lib/shopUtils');
const { getTranslations } = require('../services/dataStore');

function buildLanguageOptions(req, activeLang, translations) {
  return SUPPORTED_LANGUAGES.map((code) => {
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
}

function languageMiddleware(req, res, next) {
  const translations = getTranslations();
  const lang = detectLanguage(req);
  const activeLang = translations[lang] ? lang : DEFAULT_LANGUAGE;
  const translation = translations[activeLang] || {};
  const languageOptions = buildLanguageOptions(req, activeLang, translations);
  const currentLanguageOption = languageOptions.find((item) => item.isCurrent) || languageOptions[0];

  res.locals.lang = activeLang;
  res.locals.t = translation;
  res.locals.languageOptions = languageOptions;
  res.locals.defaultLanguage = DEFAULT_LANGUAGE;
  res.locals.areaFilterConfig = buildAreaFilterConfig(translation, activeLang);
  res.locals.canonicalUrl = currentLanguageOption
    ? currentLanguageOption.absoluteUrl
    : `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  next();
}

module.exports = languageMiddleware;
