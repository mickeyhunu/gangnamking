const { addBlockedIp } = require('../config/security');

const RATE_LIMIT_WINDOW_MS = Number(process.env.ABUSE_RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.ABUSE_RATE_LIMIT_MAX_REQUESTS) || 30;
const AUTO_BLOCK_THRESHOLD = Number(process.env.ABUSE_AUTO_BLOCK_THRESHOLD) || 3;
const AUTO_BLOCK_WINDOW_MS = Number(process.env.ABUSE_AUTO_BLOCK_WINDOW_MS) || 5 * 60 * 1000;

const stats = new Map();

function getOrCreateEntry(ip) {
  let entry = stats.get(ip);
  if (!entry) {
    entry = {
      timestamps: [],
      violations: [],
    };
    stats.set(ip, entry);
  }
  return entry;
}

function pruneOldEntries(entry, now) {
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  entry.violations = entry.violations.filter((ts) => now - ts < AUTO_BLOCK_WINDOW_MS);
}

function recordViolation(ip, reason, entry, now) {
  const targetEntry = entry || getOrCreateEntry(ip);
  const timestamp = now || Date.now();
  targetEntry.violations.push(timestamp);

  if (targetEntry.violations.length >= AUTO_BLOCK_THRESHOLD) {
    targetEntry.violations = [];
    const blocked = addBlockedIp(ip, reason);
    if (blocked) {
      console.warn(`[abuseMonitor] Automatically blocked ${ip} for ${reason}`);
      return true;
    }
  }

  return false;
}

function evaluateRequest(ip) {
  const now = Date.now();
  const entry = getOrCreateEntry(ip);
  pruneOldEntries(entry, now);
  entry.timestamps.push(now);

  let limited = false;
  let blocked = false;

  if (entry.timestamps.length > RATE_LIMIT_MAX_REQUESTS) {
    limited = true;
    entry.timestamps = [];
    blocked = recordViolation(ip, 'RATE_LIMIT', entry, now);
  }

  return { limited, blocked };
}

function reportSuspiciousActivity(ip, reason = 'SUSPICIOUS_BEHAVIOR') {
  const entry = getOrCreateEntry(ip);
  const blocked = recordViolation(ip, reason, entry);
  return { blocked };
}

module.exports = {
  evaluateRequest,
  reportSuspiciousActivity,
};
