function getNaverMapCredentials() {
  const clientId = process.env.NAVER_MAP_API_KEY_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

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
