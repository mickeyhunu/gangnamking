const { CLOUD_PROVIDER_PREFIXES, KOREAN_ISP_PREFIXES } = require('../config/entryIpRules');
const getClientIp = require('../lib/getClientIp');
const { matchesAny, normalizeIpv4 } = require('../lib/ipMatcher');

function entryMapIpFilter(req, res, next) {
  const rawIp = getClientIp(req);
  const clientIp = normalizeIpv4(rawIp);

  if (matchesAny(clientIp, KOREAN_ISP_PREFIXES)) {
    return next();
  }

  if (matchesAny(clientIp, CLOUD_PROVIDER_PREFIXES)) {
    return res.status(403).send('');
  }

  return next();
}

module.exports = entryMapIpFilter;
