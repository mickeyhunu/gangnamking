const DEFAULT_THRESHOLD = 30;

const parseBoolean = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseNumber = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getHeader = (req, name) => {
  if (!req || !req.headers) {
    return '';
  }
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value || '';
};

const cloudflareBotGuard = (req, res, next) => {
  const enabled = parseBoolean(process.env.CF_BOT_BLOCK_ENABLED, true);
  if (!enabled) {
    return next();
  }

  const clientBotHeader = getHeader(req, 'cf-client-bot');
  const verifiedBotHeader = getHeader(req, 'cf-verified-bot');
  const scoreHeader = getHeader(req, 'cf-bot-score');

  const allowVerified = parseBoolean(process.env.CF_BOT_ALLOW_VERIFIED, true);
  if (allowVerified && verifiedBotHeader.toString().toLowerCase() === 'true') {
    return next();
  }

  const threshold = parseNumber(process.env.CF_BOT_SCORE_THRESHOLD, DEFAULT_THRESHOLD);
  const score = parseNumber(scoreHeader, NaN);
  const isClientBot = clientBotHeader.toString().toLowerCase() === 'true';
  const isScoreBot = Number.isFinite(score) && score <= threshold;

  if (isClientBot || isScoreBot) {
    return res.status(403).send('Forbidden');
  }

  return next();
};

module.exports = cloudflareBotGuard;
