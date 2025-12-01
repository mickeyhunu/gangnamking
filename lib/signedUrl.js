const crypto = require('crypto');

const DEFAULT_TTL_MS = Number(process.env.SIGNED_URL_TTL_MS) || 5 * 60 * 1000;
const DRIFT_TOLERANCE_MS = Number(process.env.SIGNED_URL_DRIFT_TOLERANCE_MS) || 60 * 1000;
const FALLBACK_SECRET = process.env.SIGNED_URL_SECRET || 'change-me-secret';

function getSecret() {
  return FALLBACK_SECRET;
}

function createSignature({ path, timestamp, ip = '', userAgent = '', secret = getSecret() }) {
  const canonical = `${path}\n${timestamp}\n${ip}\n${userAgent}`;
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

function isWithinWindow(timestamp, now = Date.now()) {
  const ts = Number(timestamp);
  if (Number.isNaN(ts)) {
    return false;
  }

  const min = now - (DEFAULT_TTL_MS + DRIFT_TOLERANCE_MS);
  const max = now + DRIFT_TOLERANCE_MS;
  return ts >= min && ts <= max;
}

function verifySignature({ path, timestamp, signature, ip = '', userAgent = '', secret = getSecret(), now = Date.now() }) {
  if (!signature || !timestamp) {
    return { ok: false, reason: 'MISSING_SIGNATURE' };
  }

  if (!isWithinWindow(timestamp, now)) {
    return { ok: false, reason: 'EXPIRED_SIGNATURE' };
  }

  const expected = createSignature({ path, timestamp, ip, userAgent, secret });
  if (expected.length !== signature.length) {
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }

  return { ok: true };
}

module.exports = {
  createSignature,
  verifySignature,
};
