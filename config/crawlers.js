const DEFAULT_SHOP_PATH_PREFIX = '/shops';

const DEFAULT_USER_AGENT_PATTERNS = [
  /facebookexternalhit/i,
  /kakaotalk[- ]?scrap/i,
  /kakaotalk/i,
  /headless/i,
  /python-requests/i,
  /httpclient/i,
  /curl/i,
  /wget/i,
  /spider/i,
  /crawler/i,
  /bot\b/i,
];

function parseCustomPatterns(rawPatterns = '') {
  return String(rawPatterns)
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => new RegExp(pattern, 'i'));
}

function getBlockedUserAgentPatterns() {
  return [
    ...DEFAULT_USER_AGENT_PATTERNS,
    ...parseCustomPatterns(process.env.CRAWLER_USER_AGENT_BLOCKLIST),
  ];
}

function getCrawlerPathPrefix() {
  return process.env.CRAWLER_PATH_PREFIX || DEFAULT_SHOP_PATH_PREFIX;
}

function isCrawlerUserAgent(userAgent) {
  if (!userAgent) {
    return true;
  }

  const patterns = getBlockedUserAgentPatterns();
  return patterns.some((pattern) => pattern.test(userAgent));
}

module.exports = {
  getCrawlerPathPrefix,
  isCrawlerUserAgent,
};
