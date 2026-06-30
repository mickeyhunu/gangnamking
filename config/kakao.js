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

function getKakaoMapAppKey() {
  return resolveValue(
    process.env.KAKAO_MAP_APP_KEY,
    process.env.KAKAO_MAP_API_KEY,
    process.env.KAKAO_JAVASCRIPT_KEY
  );
}

module.exports = {
  getKakaoMapAppKey,
};
