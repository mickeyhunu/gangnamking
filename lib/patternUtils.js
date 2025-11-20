function escapeRegex(value) {
  const specials = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']);
  return String(value || '')
    .split('')
    .map((char) => (specials.has(char) ? `\\${char}` : char))
    .join('');
}

function wildcardToRegex(pattern) {
  const escaped = pattern
    .split('*')
    .map((segment) => escapeRegex(segment))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i');
}

module.exports = {
  wildcardToRegex,
};
