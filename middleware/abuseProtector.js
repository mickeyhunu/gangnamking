const { evaluateRequest } = require('../services/abuseMonitor');
const getClientIp = require('../lib/getClientIp');

function abuseProtector(req, res, next) {
  const ip = getClientIp(req);
  const { limited, blocked } = evaluateRequest(ip);

  if (blocked) {
    return res.status(403).send('악성 행위가 감지되어 IP가 자동으로 차단되었습니다.');
  }

  if (limited) {
    return res.status(429).send('요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.');
  }

  return next();
}

module.exports = abuseProtector;
