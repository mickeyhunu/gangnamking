const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const STATIC_ENTRY_DATA_PATH = path.resolve(process.cwd(), 'data/entry-static.json');
const ENTRY_DISPLAY_LIMIT = 10;

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

  const workerName = typeof row.workerName === 'string' ? row.workerName.trim() : '';
  if (!workerName) {
    return null;
  }

  const mentionCount = Math.max(0, toNumber(row.mentionCount ?? row.mentions ?? row.mention));
  const insertCount = Math.max(0, toNumber(row.insertCount ?? row.inserts ?? row.insert));
  const createdAt = toDate(row.createdAt ?? row.timestamp ?? row.loggedAt);

  return {
    workerName,
    mentionCount,
    insertCount,
    createdAt,
  };
}

function shuffleEntries(entries) {
  const shuffled = [...entries];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function limitEntries(entries, limit = ENTRY_DISPLAY_LIMIT) {
  const normalizedLimit = Number(limit);
  if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) {
    return [];
  }

  return entries.slice(0, normalizedLimit);
}

function readStaticEntryStores() {
  try {
    const raw = fs.readFileSync(STATIC_ENTRY_DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((store) => {
        const storeNo = Number(store.storeNo);
        const storeName = typeof store.storeName === 'string' ? store.storeName.trim() : '';
        if (!Number.isFinite(storeNo)) {
          return null;
        }

        const entries = Array.isArray(store.entries)
          ? store.entries.map(normalizeEntry).filter(Boolean)
          : [];

        return {
          storeNo,
          storeName,
          entries,
        };
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function fetchStaticEntriesForStore(storeNo) {
  const normalizedStoreNo = Number(storeNo);
  if (!Number.isFinite(normalizedStoreNo) || normalizedStoreNo <= 0) {
    return [];
  }

  const matchedStore = readStaticEntryStores().find((store) => store.storeNo === normalizedStoreNo);
  return matchedStore && Array.isArray(matchedStore.entries) ? matchedStore.entries : [];
}

async function fetchDatabaseEntriesForStore(storeNo) {
  const normalizedStoreNo = Number(storeNo);
  if (!Number.isFinite(normalizedStoreNo) || normalizedStoreNo <= 0) {
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
      [normalizedStoreNo]
    );

    return Array.isArray(rows) ? rows.map(normalizeEntry).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

async function fetchEntriesForStore(storeNo, options = {}) {
  const normalizedStoreNo = Number(storeNo);
  if (!Number.isFinite(normalizedStoreNo) || normalizedStoreNo <= 0) {
    return [];
  }

  const displayLimit = options.limit ?? ENTRY_DISPLAY_LIMIT;
  const staticEntries = fetchStaticEntriesForStore(normalizedStoreNo);
  const databaseEntries = await fetchDatabaseEntriesForStore(normalizedStoreNo);
  const combinedEntries = [...staticEntries, ...databaseEntries];

  return limitEntries(shuffleEntries(combinedEntries), displayLimit);
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
  ENTRY_DISPLAY_LIMIT,
  fetchEntriesForStore,
  fetchEntryWorkerNames,
  readStaticEntryStores,
};
