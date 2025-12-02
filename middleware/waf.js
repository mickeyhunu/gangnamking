const { reportSuspiciousActivity } = require('../services/abuseMonitor');
const getClientIp = require('../lib/getClientIp');
const { wildcardToRegex } = require('../lib/patternUtils');

const allowedAgentRules = [
  /googlebot/i,
  /bingbot/i,
  /yahoo! slurp/i,
  /yandexbot/i,
  /naverbot/i,
  /daumoa/i,
];

const suspiciousAgentRules = [
  /curl/i,
  /python-requests/i,
  /scrapy/i,
  /bot/i,
  /spider/i,
  /crawler/i,
  /scanner/i,
];

const sensitivePathRules = [wildcardToRegex('/shops/*/entries.json')];

const pathRateLimitWindowMs = Number(process.env.PROTECTED_RATE_LIMIT_WINDOW_MS) || 30_000;
const pathRateLimitMax = Number(process.env.PROTECTED_RATE_LIMIT_MAX_REQUESTS) || 10;

const pathRequestLog = new Map();

function isSuspiciousAgent(agent) {
  if (!agent || typeof agent !== 'string') {
    return true;
  }

  if (allowedAgentRules.some((rule) => rule.test(agent))) {
    return false;
  }

  return suspiciousAgentRules.some((rule) => rule.test(agent));
}

function isSensitivePath(pathname) {
  return sensitivePathRules.some((rule) => rule.test(pathname));
}

function checkRateLimit(key) {
  const now = Date.now();
  const entry = pathRequestLog.get(key) || [];
  const recent = entry.filter((ts) => now - ts < pathRateLimitWindowMs);
  recent.push(now);
  pathRequestLog.set(key, recent);
  return recent.length <= pathRateLimitMax;
}

function waf(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  const ip = getClientIp(req);
  const path = req.path;

  if (isSuspiciousAgent(userAgent)) {
    reportSuspiciousActivity(ip, 'SUSPICIOUS_USER_AGENT');
    return res.status(403).send('Forbidden');
  }

  if (isSensitivePath(path)) {
    const key = `${ip}:${path}`;
    if (!checkRateLimit(key)) {
      reportSuspiciousActivity(ip, 'PROTECTED_RATE_LIMIT');
      return res.status(429).send('Too Many Requests');
    }
  }

  return next();
}

module.exports = waf;
