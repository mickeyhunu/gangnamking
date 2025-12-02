const { isIpBlocked } = require('../config/security');
const getClientIp = require('../lib/getClientIp');
const { isSecurityGuardsEnabled } = require('../config/features');

function ipBlocker(req, res, next) {
  if (!isSecurityGuardsEnabled()) {
    return next();
  }

  const ip = getClientIp(req);
  if (isIpBlocked(ip)) {
    return res.status(403).send('');
  }

  return next();
}

module.exports = ipBlocker;
