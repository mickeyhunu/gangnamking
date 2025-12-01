const express = require('express');
const getClientIp = require('../lib/getClientIp');
const {
  TURNSTILE_COOKIE_NAME,
  DEFAULT_COOKIE_TTL_MS,
  getTurnstileSiteKey,
  isTurnstileConfigured,
  verifyTurnstileToken,
  getVerificationExpiry,
} = require('../services/cloudflareTurnstile');

const router = express.Router();

function normalizeNextPath(rawNextPath, fallback = '/') {
  if (typeof rawNextPath !== 'string') {
    return fallback;
  }

  const trimmed = rawNextPath.trim();
  if (!trimmed) {
    return fallback;
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch (error) {
    decoded = trimmed;
  }

  if (!decoded.startsWith('/')) {
    return fallback;
  }

  return decoded;
}

router.get('/challenge', (req, res) => {
  if (!isTurnstileConfigured()) {
    return res.redirect(normalizeNextPath(req.query.next));
  }

  const nextPath = normalizeNextPath(req.query.next);

  return res.render('cloudflare-challenge', {
    pageTitle: 'Cloudflare 인증 필요',
    siteKey: getTurnstileSiteKey(),
    nextPath,
    errorMessage: '',
  });
});

router.post('/verify', async (req, res) => {
  if (!isTurnstileConfigured()) {
    return res.redirect(normalizeNextPath(req.body.next));
  }

  const nextPath = normalizeNextPath(req.body.next);
  const token = req.body['cf-turnstile-response'];
  const ip = getClientIp(req);

  const { success, errorCodes } = await verifyTurnstileToken(token, ip);

  if (success) {
    const expiresAt = getVerificationExpiry();

    const forwardedProto = req.headers['x-forwarded-proto'];
    const isSecureRequest =
      req.secure || (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https');

    res.cookie(TURNSTILE_COOKIE_NAME, expiresAt, {
      maxAge: DEFAULT_COOKIE_TTL_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureRequest,
      path: '/',
    });

    return res.redirect(nextPath);
  }

  return res.status(400).render('cloudflare-challenge', {
    pageTitle: 'Cloudflare 인증 필요',
    siteKey: getTurnstileSiteKey(),
    nextPath,
    errorMessage: `Cloudflare 인증에 실패했습니다. (${(errorCodes || []).join(', ') || '확인 불가'})`,
  });
});

module.exports = router;
