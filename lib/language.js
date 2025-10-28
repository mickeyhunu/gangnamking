const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('./constants');

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

module.exports = {
  normalizeLanguage,
  detectLanguage,
};
