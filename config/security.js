const fs = require('fs');
const path = require('path');

const BLOCKLIST_FILE = path.join(__dirname, '..', 'data', 'blocked_ips.json');

function persistBlockedIps(ips) {
  ensureBlocklistFile();
  fs.writeFileSync(BLOCKLIST_FILE, JSON.stringify(ips, null, 2));
}

function normalizeIp(ip) {
  return String(ip || '').trim();
}

function ensureBlocklistFile() {
  const dir = path.dirname(BLOCKLIST_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(BLOCKLIST_FILE)) {
    fs.writeFileSync(BLOCKLIST_FILE, JSON.stringify([], null, 2));
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
  return blockedIps.includes(normalizeIp(ip));
}

function addBlockedIp(ip, reason = '') {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp) {
    return false;
  }

  if (blockedIps.includes(normalizedIp)) {
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
