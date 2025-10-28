function sanitizeResourcePath(resourcePath) {
  if (typeof resourcePath !== 'string') {
    return null;
  }

  const trimmed = resourcePath.trim();

  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  const normalized = require('path').posix.normalize(withoutLeadingSlash);

  if (normalized.startsWith('..')) {
    return null;
  }

  return normalized;
}

function normalizeWebPath(resourcePath) {
  if (typeof resourcePath !== 'string') {
    return null;
  }

  const trimmed = resourcePath.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const relative = sanitizeResourcePath(trimmed);

  if (!relative) {
    return null;
  }

  return `/${relative}`;
}

function getDirectoryFromResource(resourcePath) {
  const relative = sanitizeResourcePath(resourcePath);

  if (!relative || !relative.startsWith('images/')) {
    return null;
  }

  return require('path').posix.dirname(relative);
}

module.exports = {
  sanitizeResourcePath,
  normalizeWebPath,
  getDirectoryFromResource,
};
