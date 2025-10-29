function getNaverMapCredentials() {
  // 환경변수 이름을 정확히 지정
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
