const { pool } = require('../config/db');
const { getEntrySnapshots } = require('./dataStore');

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function normalizeEntry(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const workerName = typeof row.workerName === 'string' ? row.workerName : '';
  const mentionCount = toNumber(row.mentionCount ?? row.mentions ?? row.mention);
  const insertCount = toNumber(row.insertCount ?? row.inserts ?? row.insert);
  const createdAt = toDate(row.createdAt ?? row.timestamp ?? row.loggedAt);

  return {
    workerName,
    mentionCount,
    insertCount,
    createdAt,
  };
}

function getSnapshotEntries(storeNo, shopId) {
  const snapshots = getEntrySnapshots();

  if (!snapshots || typeof snapshots !== 'object') {
    return [];
  }

  const candidateKeys = [storeNo, shopId]
    .map((key) => {
      if (key === null || key === undefined) {
        return '';
      }

      return String(key).trim();
    })
    .filter(Boolean);

  for (const key of candidateKeys) {
    const snapshot = snapshots[key];

    if (Array.isArray(snapshot) && snapshot.length) {
      return snapshot.map(normalizeEntry).filter(Boolean);
    }
  }

  return [];
}

async function fetchEntriesForStore(storeNo, options = {}) {
  const { shopId } = options;
  const fallbackEntries = () => getSnapshotEntries(storeNo, shopId);

  if (!storeNo) {
    return fallbackEntries();
  }

  if (!pool || typeof pool.query !== 'function') {
    return fallbackEntries();
  }

  const requiredEnv = [process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME];

  if (requiredEnv.some((value) => !value)) {
    return fallbackEntries();
  }

  try {
    const [rows] = await pool.query(
      `SELECT workerName, mentionCount, insertCount, createdAt
         FROM ENTRY_TODAY
        WHERE storeNo=?
        ORDER BY createdAt DESC`,
      [storeNo]
    );

    const normalized = Array.isArray(rows)
      ? rows.map(normalizeEntry).filter(Boolean)
      : [];

    if (normalized.length) {
      return normalized;
    }

    return fallbackEntries();
  } catch (error) {
    console.error('Failed to fetch entries for store', storeNo, error);
    return fallbackEntries();
  }
}

async function fetchEntryWorkerNames(storeNo, options = {}) {
  const entries = await fetchEntriesForStore(storeNo, options);

  if (!Array.isArray(entries) || !entries.length) {
    return [];
  }

  const workerNames = entries
    .map((entry) => (entry && typeof entry.workerName === 'string' ? entry.workerName.trim() : ''))
    .filter(Boolean);

  return [...new Set(workerNames)];
}

module.exports = {
  fetchEntriesForStore,
  fetchEntryWorkerNames,
};
