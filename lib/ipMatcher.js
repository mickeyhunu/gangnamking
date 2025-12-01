function normalizeIp(ip) {
  return String(ip || '').trim();
}

function escapeRegex(value) {
  const specials = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']);
  return value
    .split('')
    .map((char) => (specials.has(char) ? `\\${char}` : char))
    .join('');
}

const wildcardRegexCache = new Map();

function wildcardToRegex(pattern) {
  let cached = wildcardRegexCache.get(pattern);
  if (cached) {
    return cached;
  }

  const escaped = pattern.split('*').map((segment) => escapeRegex(segment)).join('.*');
  cached = new RegExp(`^${escaped}$`);
  wildcardRegexCache.set(pattern, cached);
  return cached;
}

function matchesPattern(pattern, ip) {
  const normalizedPattern = normalizeIp(pattern);
  const normalizedIp = normalizeIp(ip);

  if (!normalizedPattern || !normalizedIp) {
    return false;
  }

  if (normalizedPattern.includes('*')) {
    return wildcardToRegex(normalizedPattern).test(normalizedIp);
  }

  if (normalizedPattern.endsWith('.')) {
    return normalizedIp.startsWith(normalizedPattern);
  }

  return normalizedIp === normalizedPattern;
}

function normalizeIpv4(ip) {
  const normalized = normalizeIp(ip);
  if (normalized.startsWith('::ffff:')) {
    return normalized.replace('::ffff:', '');
  }
  return normalized;
}

function matchesAny(ip, patterns) {
  const normalizedIp = normalizeIpv4(ip);
  return patterns.some((pattern) => matchesPattern(pattern, normalizedIp));
}

module.exports = {
  matchesAny,
  matchesPattern,
  normalizeIpv4,
};
