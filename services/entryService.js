const fs = require('fs');
const path = require('path');

const STATIC_ENTRY_DATA_PATH = path.resolve(process.cwd(), 'data/entry-static.json');

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
  const normalizedStoreNo = Number(storeNo);
  if (!Number.isFinite(normalizedStoreNo) || normalizedStoreNo <= 0) {
    return [];
  }

  const stores = readStaticEntryStores();
  const matchedStore = stores.find((store) => store.storeNo === normalizedStoreNo);

  if (!matchedStore || !Array.isArray(matchedStore.entries)) {
    return [];
  }

  return matchedStore.entries
    .map(normalizeEntry)
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
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
        if (!Number.isFinite(storeNo)) {
          return null;
        }

        const entries = Array.isArray(store.entries) ? store.entries : [];

        return {
          storeNo,
          entries,
        };
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}
