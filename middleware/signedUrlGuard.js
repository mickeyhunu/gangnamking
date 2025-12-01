const { verifySignature } = require('../lib/signedUrl');
const getClientIp = require('../lib/getClientIp');

const allowUnsigned = (process.env.ALLOW_UNSIGNED_ENTRY_ACCESS || 'false').trim().toLowerCase() === 'true';

function extractSignature(req) {
  const sig = req.query.sig || req.get('x-signature') || '';
  const ts = req.query.ts || req.get('x-timestamp') || '';
  return { signature: String(sig), timestamp: String(ts) };
}

function signedUrlGuard(req, res, next) {
  if (allowUnsigned) {
    return next();
  }

  const { signature, timestamp } = extractSignature(req);
  const verification = verifySignature({
    path: req.path,
    timestamp,
    signature,
    ip: getClientIp(req),
    userAgent: req.get('user-agent') || '',
  });

  if (!verification.ok) {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    return res.status(403).send('Signed token required');
  }

  return next();
}

module.exports = signedUrlGuard;
