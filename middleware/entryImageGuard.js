const { appendLog } = require('../services/requestLogger');
const getClientIp = require('../lib/getClientIp');
const { addBlockedIp } = require('../config/security');
const { isSecurityGuardsEnabled } = require('../config/features');

const SUSPICIOUS_KEYWORDS = [
  'bot',
  'crawler',
  'spider',
  'headless',
  'python',
  'curl',
  'wget',
  'httpclient',
];

const ALLOWED_USER_AGENT_WHITELIST = ['facebookexternalhit', 'kakaotalk-scrap'];

const requestTimestamps = new Map();

function isWhitelistedUserAgent(userAgent) {
  const normalized = String(userAgent || '').toLowerCase();
  return ALLOWED_USER_AGENT_WHITELIST.some((allowed) => normalized.includes(allowed));
}

function isSuspiciousUserAgent(userAgent) {
  const normalized = String(userAgent || '').toLowerCase();
  if (!normalized || normalized.length < 20) {
    return true;
  }

  return SUSPICIOUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isBadReferer(req) {
  const referer = req.get('referer');
  if (!referer) {
    return true;
  }

  try {
    const refererUrl = new URL(referer);
    const hostHeader = (req.get('host') || '').toLowerCase();
    const allowedDomain = (process.env.ALLOWED_REFERER_DOMAIN || '').toLowerCase();

    if (allowedDomain && refererUrl.host.toLowerCase().endsWith(allowedDomain)) {
      return false;
    }

    if (hostHeader && refererUrl.host.toLowerCase().includes(hostHeader)) {
      return false;
    }
  } catch (error) {
    return true;
  }

  return true;
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;
  const timestamps = (requestTimestamps.get(ip) || []).filter(
    (ts) => now - ts < windowMs
  );

  timestamps.push(now);
  requestTimestamps.set(ip, timestamps);

  return timestamps.length >= maxRequests;
}

function logDecision({ timestamp, ip, userAgent, path, blocked, reason }) {
  appendLog({ timestamp, ip, userAgent, path, blocked, reason });
}

function blockRequest(res, statusCode = 403) {
  res.status(statusCode).send('');
}

function entryImageGuard(req, res, next) {
  if (!isSecurityGuardsEnabled()) {
    return next();
  }

  const ip = getClientIp(req);
  const userAgent = req.get('user-agent') || '';
  const path = req.originalUrl;
  const timestamp = new Date().toISOString();

  let blocked = false;
  let reason = '';

  if (!isWhitelistedUserAgent(userAgent) && isSuspiciousUserAgent(userAgent)) {
    blocked = true;
    reason = 'suspicious-user-agent';
  }

  if (!blocked && isBadReferer(req)) {
    blocked = true;
    reason = 'invalid-referer';
  }

  if (!blocked && isRateLimited(ip)) {
    blocked = true;
    reason = 'rate-limit';
  }

  if (blocked) {
    addBlockedIp(ip, reason);
    logDecision({ timestamp, ip, userAgent, path, blocked: true, reason });
    return blockRequest(res, reason === 'suspicious-user-agent' ? 444 : 403);
  }

  logDecision({ timestamp, ip, userAgent, path, blocked: false });
  return next();
}

module.exports = entryImageGuard;
