const { pool } = require('../config/db');

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

async function fetchEntriesForStore(storeNo, options = {}) {
  if (!storeNo) {
    return [];
  }

  if (!pool || typeof pool.query !== 'function') {
    return [];
  }

  const requiredEnv = [process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME];

  if (requiredEnv.some((value) => !value)) {
    return [];
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

    return normalized;
  } catch (error) {
    console.error('Failed to fetch entries for store', storeNo, error);
    return [];
  }
}

async function fetchEntryWorkerNames(storeNo, options = {}) {
  const { entries: prefetchedEntries, ...fetchOptions } = options || {};
  const entries = Array.isArray(prefetchedEntries)
    ? prefetchedEntries
    : await fetchEntriesForStore(storeNo, fetchOptions);

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
