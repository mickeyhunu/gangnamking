const { isIpBlocked } = require('../config/security');
const getClientIp = require('../lib/getClientIp');

function ipBlocker(req, res, next) {
  const ip = getClientIp(req);
  if (isIpBlocked(ip)) {
    return res.status(403).send('해당 IP는 현재 차단되어 있습니다.');
  }

  return next();
}

module.exports = ipBlocker;
