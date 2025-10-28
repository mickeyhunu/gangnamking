const { pool } = require('../config/db');

async function fetchEntriesForStore(storeNo) {
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

    return rows
      .map((row) => {
        if (!row || typeof row !== 'object') {
          return null;
        }

        const workerName = typeof row.workerName === 'string' ? row.workerName : '';
        const mentionCount = Number.isFinite(Number(row.mentionCount))
          ? Number(row.mentionCount)
          : 0;
        const insertCount = Number.isFinite(Number(row.insertCount))
          ? Number(row.insertCount)
          : 0;
        let createdAt = null;

        if (row.createdAt instanceof Date) {
          createdAt = row.createdAt;
        } else if (row.createdAt) {
          const parsed = new Date(row.createdAt);

          if (!Number.isNaN(parsed.getTime())) {
            createdAt = parsed;
          }
        }

        return {
          workerName,
          mentionCount,
          insertCount,
          createdAt,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Failed to fetch entries for store', storeNo, error);
    return [];
  }
}

module.exports = {
  fetchEntriesForStore,
};
