const axios = require('axios');

const TURNSTILE_COOKIE_NAME = 'cf_turnstile_verified';
const TURNSTILE_VERIFICATION_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_COOKIE_TTL_MS = Number(process.env.CLOUDFLARE_TURNSTILE_COOKIE_TTL_MS) || 6 * 60 * 60 * 1000;

function getTurnstileSiteKey() {
  return process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '';
}

function getTurnstileSecretKey() {
  return process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '';
}

function isTurnstileConfigured() {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecretKey());
}

async function verifyTurnstileToken(responseToken, remoteIp) {
  if (!responseToken) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams();
  body.append('secret', getTurnstileSecretKey());
  body.append('response', responseToken);
  if (remoteIp) {
    body.append('remoteip', remoteIp);
  }

  try {
    const { data } = await axios.post(TURNSTILE_VERIFICATION_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      success: Boolean(data && data.success),
      errorCodes: Array.isArray(data && data['error-codes']) ? data['error-codes'] : [],
    };
  } catch (error) {
    console.error('[cloudflareTurnstile] Verification request failed:', error.message);
    return { success: false, errorCodes: ['verification_request_failed'] };
  }
}

function getVerificationExpiry() {
  return Date.now() + DEFAULT_COOKIE_TTL_MS;
}

module.exports = {
  TURNSTILE_COOKIE_NAME,
  DEFAULT_COOKIE_TTL_MS,
  getTurnstileSiteKey,
  isTurnstileConfigured,
  verifyTurnstileToken,
  getVerificationExpiry,
};
