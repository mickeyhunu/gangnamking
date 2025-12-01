const { isTurnstileConfigured, TURNSTILE_COOKIE_NAME } = require('../services/cloudflareTurnstile');

function isProtectedPath(pathname, protectedPrefixes) {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function cloudflareTurnstile(options = {}) {
  const protectedPrefixes = Array.isArray(options.protectedPrefixes)
    ? options.protectedPrefixes
    : ['/entry'];

  return (req, res, next) => {
    if (!isTurnstileConfigured()) {
      return next();
    }

    if (req.path.startsWith('/cloudflare')) {
      return next();
    }

    if (!isProtectedPath(req.path, protectedPrefixes)) {
      return next();
    }

    const cookieValue = req.cookies?.[TURNSTILE_COOKIE_NAME];
    const expiryTimestamp = Number(cookieValue);

    if (Number.isFinite(expiryTimestamp) && expiryTimestamp > Date.now()) {
      return next();
    }

    const nextPath = encodeURIComponent(req.originalUrl || req.url || '/');

    if (cookieValue && !Number.isFinite(expiryTimestamp)) {
      res.clearCookie(TURNSTILE_COOKIE_NAME, { path: '/' });
    }

    return res.redirect(`/cloudflare/challenge?next=${nextPath}`);
  };
}

module.exports = cloudflareTurnstile;
