const DEFAULT_SESSION_NAME = process.env.SESSION_COOKIE_NAME || 'session_token';
const configuredTokens = (process.env.PROTECTED_ENTRY_TOKENS || '')
  .split(',')
  .map((token) => token.trim())
  .filter(Boolean);

const allowLocalBypass = (process.env.PROTECTED_ENTRY_ALLOW_LOCAL_BYPASS || 'false')
  .toLowerCase()
  .trim() === 'true';

const allowedTokens = new Set(configuredTokens);

function extractToken(req) {
  const authHeader = req.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }

  const sessionToken = req.cookies ? req.cookies[DEFAULT_SESSION_NAME] : null;
  if (typeof sessionToken === 'string' && sessionToken.trim()) {
    return sessionToken.trim();
  }

  return '';
}

function isValidToken(token) {
  if (allowedTokens.size === 0) {
    // No tokens configured: require explicit bypass conditions instead of public access.
    return false;
  }

  if (!token) {
    return false;
  }

  return allowedTokens.has(token);
}

function isLoopbackIp(ipAddress) {
  if (!ipAddress) {
    return false;
  }

  const normalized = ipAddress.replace('::ffff:', '');

  if (normalized === '127.0.0.1' || normalized === '::1') {
    return true;
  }

  return false;
}

function canBypassWithoutTokens(req) {
  if (!allowLocalBypass) {
    return false;
  }

  return isLoopbackIp(req.ip);
}

function authGuard(req, res, next) {
  if (allowedTokens.size === 0 && canBypassWithoutTokens(req)) {
    return next();
  }

  const token = extractToken(req);

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  if (!isValidToken(token)) {
    return res.status(403).send('Forbidden');
  }

  return next();
}

module.exports = authGuard;
