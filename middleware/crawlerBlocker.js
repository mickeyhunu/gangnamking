const { getCrawlerPathPrefix, isCrawlerUserAgent } = require('../config/crawlers');
const { isSecurityGuardsEnabled } = require('../config/features');
const getClientIp = require('../lib/getClientIp');
const { reportSuspiciousActivity } = require('../services/abuseMonitor');

function crawlerBlocker(req, res, next) {
  if (!isSecurityGuardsEnabled()) {
    return next();
  }

  const pathPrefix = getCrawlerPathPrefix();

  if (!req.originalUrl.startsWith(pathPrefix)) {
    return next();
  }

  const userAgent = req.get('User-Agent') || '';

  if (isCrawlerUserAgent(userAgent)) {
    const ip = getClientIp(req);
    reportSuspiciousActivity(ip, 'CRAWLER_BLOCKED');
    return res.status(403).send('');
  }

  return next();
}

module.exports = crawlerBlocker;
