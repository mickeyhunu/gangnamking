const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '..', 'data', 'request_logs.jsonl');

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(LOG_FILE_PATH)) {
    fs.closeSync(fs.openSync(LOG_FILE_PATH, 'a'));
  }
}

function appendLog(entry) {
  ensureLogFile();
  const serialized = `${JSON.stringify(entry)}\n`;

  fs.appendFile(LOG_FILE_PATH, serialized, (error) => {
    if (error) {
      console.error('Failed to write request log entry:', error);
    }
  });
}

module.exports = { appendLog, LOG_FILE_PATH };
