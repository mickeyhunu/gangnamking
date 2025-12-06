#!/usr/bin/env node
const {
  loadRequestLogs,
  findCrawlingCandidates,
  isFriendlyUserAgent,
} = require('../services/crawlerDetector');
const { addBlockedIp } = require('../config/security');

function getOptionValue(flags, defaultValue) {
  const args = process.argv.slice(2);
  const normalizedFlags = Array.isArray(flags) ? flags : [flags];
  const index = args.findIndex((arg) => normalizedFlags.includes(arg));
  if (index === -1) {
    return defaultValue;
  }

  const next = args[index + 1];
  if (!next || next.startsWith('--')) {
    return defaultValue;
  }

  const parsed = Number(next);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

function formatDate(date) {
  return date.toISOString();
}

function printSummary(summary) {
  console.log(`\nIP: ${summary.ip}`);
  console.log(`  Requests: ${summary.totalRequests}`);
  console.log(`  Repeat hits: ${summary.repeatHits}`);
  console.log(`  Distinct paths: ${summary.distinctPaths}`);
  console.log(`  Distinct user agents: ${summary.distinctUserAgents}`);
  console.log(`  First seen: ${formatDate(summary.firstSeen)}`);
  console.log(`  Last seen: ${formatDate(summary.lastSeen)}`);
  console.log('  Top paths:');
  summary.topPaths.forEach((entry) => {
    console.log(`    - ${entry.path} (${entry.hits})`);
  });
  console.log('  User agents:');
  summary.topUserAgents.forEach((entry) => {
    console.log(`    - ${entry.agent} (${entry.hits})${isFriendlyUserAgent(entry.agent) ? ' [friendly]' : ''}`);
  });
}

function main() {
  const minRequests = getOptionValue(['--min-requests', '--min'], 10);
  const minDistinctPaths = getOptionValue(['--min-paths', '--paths'], 3);
  const minRepeatHits = getOptionValue(['--min-repeat'], 2);
  const shouldBlock = hasFlag('--block');

  const entries = loadRequestLogs();
  if (!entries.length) {
    console.log('No request logs found to analyze.');
    process.exit(0);
  }

  console.log(
    `Scanning ${entries.length} log entries (minRequests=${minRequests}, minPaths=${minDistinctPaths}, minRepeat=${minRepeatHits})...`
  );

  const candidates = findCrawlingCandidates(entries, {
    minRequests,
    minDistinctPaths,
    minRepeatHits,
  });

  if (!candidates.length) {
    console.log('No suspicious crawling patterns detected with the current thresholds.');
    process.exit(0);
  }

  candidates.forEach((summary) => {
    printSummary(summary);
    if (!shouldBlock) {
      return;
    }

    const reason = `Blocked via crawler audit (requests=${summary.totalRequests}, paths=${summary.distinctPaths})`;
    const added = addBlockedIp(summary.ip, reason);
    if (added) {
      console.log(`  -> Blocked ${summary.ip}`);
    } else {
      console.log(`  -> ${summary.ip} was already blocked or could not be added.`);
    }
  });
}

main();
