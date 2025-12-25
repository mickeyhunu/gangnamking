const DEFAULT_ALLOWED_REFERRER_HOSTS = [
  'google.com',
  'naver.com',
  'daum.net',
  'bing.com',
  'yahoo.com',
  'duckduckgo.com',
  'kakao.com',
];

function parseHostList(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedReferrerHosts() {
  const envHosts = parseHostList(process.env.REFERRER_ALLOWED_HOSTS);
  const combined = envHosts.length > 0 ? envHosts : DEFAULT_ALLOWED_REFERRER_HOSTS;
  const deduped = Array.from(new Set(combined));
  return deduped;
}

module.exports = {
  getAllowedReferrerHosts,
};
