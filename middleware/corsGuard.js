const { wildcardToRegex } = require('../lib/patternUtils');
const { isSecurityGuardsEnabled } = require('../config/features');

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const whitelist = allowedOrigins.length ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

function isOriginAllowed(origin) {
  if (!origin) {
    return false;
  }
  return whitelist.some((allowed) => {
    if (allowed.includes('*')) {
      return wildcardToRegex(allowed).test(origin);
    }
    return allowed === origin;
  });
}

function corsGuard(req, res, next) {
  if (!isSecurityGuardsEnabled()) {
    return next();
  }

  const origin = req.get('origin');
  const hasOrigin = typeof origin === 'string' && origin.trim() !== '';

  if (!hasOrigin) {
    return next();
  }

  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden');
  }

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

module.exports = corsGuard;
