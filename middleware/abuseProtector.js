const { evaluateRequest } = require('../services/abuseMonitor');
const getClientIp = require('../lib/getClientIp');

function abuseProtector(req, res, next) {
  const ip = getClientIp(req);
  const { limited, blocked } = evaluateRequest(ip);

  if (blocked) {
    return res.status(403).send('');
  }

  if (limited) {
    return res.status(429).send('');
  }

  return next();
}

module.exports = abuseProtector;
