const fs = require('fs');
const path = require('path');

const BLOCKLIST_FILE = path.join(__dirname, '..', 'data', 'blocked_ips.json');

function persistBlockedIps(ips) {
  ensureBlocklistFile();
  fs.writeFileSync(BLOCKLIST_FILE, `${JSON.stringify(ips, null, 2)}\n`);
}

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

function matchesBlockEntry(entry, ip) {
  const normalizedEntry = normalizeIp(entry);
  const normalizedIp = normalizeIp(ip);

  if (!normalizedEntry || !normalizedIp) {
    return false;
  }

  if (normalizedEntry.includes('*')) {
    return wildcardToRegex(normalizedEntry).test(normalizedIp);
  }

  if (normalizedEntry.endsWith('.')) {
    return normalizedIp.startsWith(normalizedEntry);
  }

  return normalizedIp === normalizedEntry;
}

function ensureBlocklistFile() {
  const dir = path.dirname(BLOCKLIST_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(BLOCKLIST_FILE)) {
    fs.writeFileSync(BLOCKLIST_FILE, `${JSON.stringify([], null, 2)}\n`);
  }
}

function loadBlockedIps() {
  ensureBlocklistFile();
  try {
    const contents = fs.readFileSync(BLOCKLIST_FILE, 'utf8');
    const parsed = JSON.parse(contents);
    if (Array.isArray(parsed)) {
      return parsed
        .map((ip) => String(ip).trim())
        .filter(Boolean);
    }
  } catch (error) {
    console.error('Failed to load blocked IP list. Falling back to empty list.', error);
  }

  return [];
}

let blockedIps = loadBlockedIps();

function getBlockedIps() {
  return [...blockedIps];
}

function reloadBlockedIps() {
  blockedIps = loadBlockedIps();
  return getBlockedIps();
}

function isIpBlocked(ip) {
  return blockedIps.some((entry) => matchesBlockEntry(entry, ip));
}

function addBlockedIp(ip, reason = '') {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp) {
    return false;
  }

  if (blockedIps.some((entry) => normalizeIp(entry) === normalizedIp)) {
    return false;
  }

  blockedIps = [...blockedIps, normalizedIp];
  persistBlockedIps(blockedIps);
  if (reason) {
    console.warn(`[security] IP ${normalizedIp} added to block list. Reason: ${reason}`);
  } else {
    console.warn(`[security] IP ${normalizedIp} added to block list.`);
  }
  return true;
}

module.exports = {
  BLOCKLIST_FILE,
  getBlockedIps,
  reloadBlockedIps,
  isIpBlocked,
  addBlockedIp,
};
