const fs = require('fs');
const { LOG_FILE_PATH } = require('./requestLogger');

const FRIENDLY_BOT_PATTERNS = [
  /googlebot/i,
  /adsbot-google/i,
  /bingbot/i,
  /yeti/i,
  /naverbot/i,
  /naverweb/i,
  /daumoa/i,
  /kakaotalk-scrap/i,
  /facebookexternalhit/i,
];

function isFriendlyUserAgent(userAgent) {
  const normalized = String(userAgent || '').trim();
  if (!normalized) {
    return false;
  }

  return FRIENDLY_BOT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function loadRequestLogs() {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    return [];
  }

  const contents = fs.readFileSync(LOG_FILE_PATH, 'utf8');
  const lines = contents.split('\n').filter(Boolean);

  return lines.reduce((entries, line) => {
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.ip) {
        entries.push(parsed);
      }
    } catch (error) {
      // Skip malformed lines while keeping the rest of the log usable
    }
    return entries;
  }, []);
}

function buildIpSummaries(entries) {
  const summaries = new Map();

  entries.forEach((entry) => {
    const ip = String(entry.ip || '').trim();
    if (!ip) {
      return;
    }

    const userAgent = String(entry.userAgent || 'unknown');
    const pathKey = String(entry.path || 'unknown');
    const timestamp = new Date(entry.timestamp || Date.now());

    if (!summaries.has(ip)) {
      summaries.set(ip, {
        ip,
        totalRequests: 0,
        repeatHits: 0,
        paths: new Map(),
        userAgents: new Map(),
        firstSeen: timestamp,
        lastSeen: timestamp,
        hasFriendlyAgent: false,
      });
    }

    const summary = summaries.get(ip);
    summary.totalRequests += 1;
    if (entry.repeat) {
      summary.repeatHits += 1;
    }

    summary.paths.set(pathKey, (summary.paths.get(pathKey) || 0) + 1);
    summary.userAgents.set(userAgent, (summary.userAgents.get(userAgent) || 0) + 1);
    summary.firstSeen = summary.firstSeen < timestamp ? summary.firstSeen : timestamp;
    summary.lastSeen = summary.lastSeen > timestamp ? summary.lastSeen : timestamp;
    summary.hasFriendlyAgent = summary.hasFriendlyAgent || isFriendlyUserAgent(userAgent);
  });

  return Array.from(summaries.values()).map((summary) => ({
    ...summary,
    distinctPaths: summary.paths.size,
    distinctUserAgents: summary.userAgents.size,
    topPaths: Array.from(summary.paths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pathName, hits]) => ({ path: pathName, hits })),
    topUserAgents: Array.from(summary.userAgents.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agent, hits]) => ({ agent, hits })),
  }));
}

function findCrawlingCandidates(entries, options = {}) {
  const {
    minRequests = 10,
    minDistinctPaths = 3,
    minRepeatHits = 2,
  } = options;

  const summaries = buildIpSummaries(entries);

  return summaries
    .filter((summary) =>
      summary.totalRequests >= minRequests &&
      summary.distinctPaths >= minDistinctPaths &&
      summary.repeatHits >= minRepeatHits &&
      !summary.hasFriendlyAgent
    )
    .sort((a, b) => b.totalRequests - a.totalRequests);
}

module.exports = {
  FRIENDLY_BOT_PATTERNS,
  isFriendlyUserAgent,
  loadRequestLogs,
  buildIpSummaries,
  findCrawlingCandidates,
};
