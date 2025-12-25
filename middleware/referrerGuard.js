const { isSecurityGuardsEnabled } = require('../config/features');
const { getAllowedReferrerHosts } = require('../config/referrer');

function normalizeHost(hostname) {
  return String(hostname || '').trim().toLowerCase();
}

function hostMatches(hostname, allowedHost) {
  const normalizedHost = normalizeHost(hostname);
  const normalizedAllowed = normalizeHost(allowedHost);

  if (!normalizedHost || !normalizedAllowed) {
    return false;
  }

  return (
    normalizedHost === normalizedAllowed ||
    normalizedHost.endsWith(`.${normalizedAllowed}`)
  );
}

function isDirectNavigation(req) {
  const secFetchSite = normalizeHost(req.get('sec-fetch-site'));
  const referer = normalizeHost(req.get('referer') || req.get('referrer'));

  if (!referer) {
    return true;
  }

  return ['none', 'same-origin'].includes(secFetchSite);
}

function isAllowedReferer(req) {
  if (!isSecurityGuardsEnabled()) {
    return true;
  }

  if (isDirectNavigation(req)) {
    return true;
  }

  const refererHeader = req.get('referer') || req.get('referrer');
  let refererHost = '';

  try {
    const refererUrl = new URL(refererHeader);
    refererHost = refererUrl.hostname;
  } catch (error) {
    return false;
  }

  const allowedHosts = getAllowedReferrerHosts();
  const requestHost = normalizeHost(req.headers.host);

  if (hostMatches(refererHost, requestHost)) {
    return true;
  }

  return allowedHosts.some((allowed) => hostMatches(refererHost, allowed));
}

function referrerGuard(req, res, next) {
  if (isAllowedReferer(req)) {
    return next();
  }

  return res.status(403).send('');
}

module.exports = referrerGuard;
