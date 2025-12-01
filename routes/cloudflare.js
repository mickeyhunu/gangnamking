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

router.get('/challenge', (req, res) => {
  if (!isTurnstileConfigured()) {
    return res.redirect(req.query.next || '/');
  }

  return res.render('cloudflare-challenge', {
    pageTitle: 'Cloudflare 인증 필요',
    siteKey: getTurnstileSiteKey(),
    nextPath: typeof req.query.next === 'string' && req.query.next.trim() ? req.query.next : '/',
    errorMessage: '',
  });
});

router.post('/verify', async (req, res) => {
  if (!isTurnstileConfigured()) {
    return res.redirect(req.body.next || '/');
  }

  const nextPath = typeof req.body.next === 'string' && req.body.next.trim() ? req.body.next : '/';
  const token = req.body['cf-turnstile-response'];
  const ip = getClientIp(req);

  const { success, errorCodes } = await verifyTurnstileToken(token, ip);

  if (success) {
    const expiresAt = getVerificationExpiry();

    res.cookie(TURNSTILE_COOKIE_NAME, expiresAt, {
      maxAge: DEFAULT_COOKIE_TTL_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
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
