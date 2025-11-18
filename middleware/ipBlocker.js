const { isIpBlocked } = require('../config/security');
const getClientIp = require('../lib/getClientIp');

function ipBlocker(req, res, next) {
  const ip = getClientIp(req);
  if (isIpBlocked(ip)) {
    return res.status(403).send('');
  }

  return next();
}

module.exports = ipBlocker;
