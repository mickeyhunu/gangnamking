const fs = require('fs');
const path = require('path');

const BLOCKLIST_FILE = path.join(__dirname, '..', 'data', 'blocked_ips.json');

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
  return blockedIps.includes(ip);
}

module.exports = {
  BLOCKLIST_FILE,
  getBlockedIps,
  reloadBlockedIps,
  isIpBlocked,
};
