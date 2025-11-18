const { appendLog } = require('../services/requestLogger');
const getClientIp = require('../lib/getClientIp');

const requestCounts = new Map();

function requestLoggingMiddleware(req, res, next) {
  const ip = getClientIp(req);
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = new Date().toISOString();
  const key = ip;
  const requestCount = (requestCounts.get(key) || 0) + 1;

  requestCounts.set(key, requestCount);

  appendLog({
    timestamp,
    ip,
    userAgent,
    method: req.method,
    path: req.originalUrl,
    repeat: requestCount > 1,
  });

  next();
}

module.exports = requestLoggingMiddleware;
