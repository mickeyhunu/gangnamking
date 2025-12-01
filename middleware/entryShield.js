const { reportSuspiciousActivity } = require('../services/abuseMonitor');
const getClientIp = require('../lib/getClientIp');
const { wildcardToRegex } = require('../lib/patternUtils');

const suspiciousAgentRules = [
  /curl/i,
  /python-requests/i,
  /scrapy/i,
  /headless/i,
  /selenium/i,
  /puppeteer/i,
];

const defaultRefererAllowlist = ['self'];
const configuredReferers = (process.env.ENTRY_ALLOWED_REFERERS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const refererAllowlist = configuredReferers.length ? configuredReferers : defaultRefererAllowlist;

const rateLimitWindowMs = Number(process.env.ENTRY_SHIELD_WINDOW_MS) || 10_000;
const rateLimitMaxRequests = Number(process.env.ENTRY_SHIELD_MAX_REQUESTS) || 5;
const requestLog = new Map();

function isSuspiciousAgent(agent) {
  if (!agent || typeof agent !== 'string') {
    return true;
  }
  return suspiciousAgentRules.some((rule) => rule.test(agent));
}

function isAllowedReferer(referer, hostHeader = '') {
  if (!referer) {
    return false;
  }

  const normalized = referer.trim();
  const selfHosts = hostHeader
    ? [`http://${hostHeader}`, `https://${hostHeader}`]
    : [];

  return refererAllowlist.some((pattern) => {
    if (pattern === 'self') {
      return selfHosts.some((selfHost) => normalized.startsWith(selfHost));
    }

    if (pattern.includes('*')) {
      return wildcardToRegex(pattern).test(normalized);
    }

    return normalized.startsWith(pattern);
  });
}

function checkRateLimit(key) {
  const now = Date.now();
  const entry = requestLog.get(key) || [];
  const recent = entry.filter((ts) => now - ts < rateLimitWindowMs);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length <= rateLimitMaxRequests;
}

function entryShield(req, res, next) {
  const ip = getClientIp(req);
  const userAgent = req.get('user-agent') || '';
  const referer = req.get('referer') || '';

  if (isSuspiciousAgent(userAgent)) {
    reportSuspiciousActivity(ip, 'ENTRY_SUSPICIOUS_USER_AGENT');
    return res.status(403).send('Forbidden');
  }

  if (!isAllowedReferer(referer, req.get('host'))) {
    reportSuspiciousActivity(ip, 'ENTRY_REFERER_BLOCK');
    return res.status(403).send('Forbidden');
  }

  const key = `${ip}:${req.path}`;
  if (!checkRateLimit(key)) {
    reportSuspiciousActivity(ip, 'ENTRY_RATE_LIMIT');
    return res.status(429).send('Too Many Requests');
  }

  return next();
}

module.exports = entryShield;
