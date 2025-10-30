function resolveClientSecret() {
  const primary = process.env.NAVER_MAP_CLIENT_SECRET;

  if (typeof primary === 'string' && primary.trim()) {
    return primary;
  }

  // NAVER_MAP_API_KEY was the original environment variable used for the
  // client secret. Keep supporting it so existing deployments continue to work.
  const legacy = process.env.NAVER_MAP_API_KEY;
  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy;
  }

  return '';
}

function getNaverMapCredentials() {
  const clientId = process.env.NAVER_MAP_API_KEY_ID;
  const clientSecret = resolveClientSecret();

  return {
    clientId: typeof clientId === 'string' && clientId ? clientId : '',
    clientSecret: typeof clientSecret === 'string' && clientSecret ? clientSecret : '',
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
