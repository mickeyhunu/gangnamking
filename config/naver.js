function resolveValue(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();

      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
}

function resolveClientId() {
  return resolveValue(
    process.env.NAVER_MAP_API_KEY_ID,
    process.env.NAVER_MAP_CLIENT_ID,
    process.env.NAVER_CLIENT_ID
  );
}

function resolveClientSecret() {
  return resolveValue(
    process.env.NAVER_MAP_CLIENT_SECRET,
    // NAVER_MAP_API_KEY was the original environment variable used for the
    // client secret. Keep supporting it so existing deployments continue to work.
    process.env.NAVER_MAP_API_KEY,
    process.env.NAVER_CLIENT_SECRET
  );
}

function getNaverMapCredentials() {
  const clientId = resolveClientId();
  const clientSecret = resolveClientSecret();

  return {
    clientId,
    clientSecret,
  };
}

function hasNaverMapCredentials() {
  const { clientId, clientSecret } = getNaverMapCredentials();
  return Boolean(clientId && clientSecret);
}

module.exports = {
  getNaverMapCredentials,
  hasNaverMapCredentials,
};
