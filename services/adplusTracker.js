const https = require('https');

const ADPLUS_TRACK_HOST = 'www.adplus.store';
const ADPLUS_TRACK_PATH = '/api/track';
const TRACKING_TIMEOUT_MS = 2500;

function trackAdplusVisit(adCode) {
  if (typeof adCode !== 'string' || !adCode.trim()) {
    return;
  }

  const request = https.get(
    {
      hostname: ADPLUS_TRACK_HOST,
      path: `${ADPLUS_TRACK_PATH}?adCode=${encodeURIComponent(adCode.trim())}`,
      timeout: TRACKING_TIMEOUT_MS,
      headers: {
        'User-Agent': 'gangnamking-tracker/1.0',
      },
    },
    (response) => {
      response.resume();
    }
  );

  request.on('timeout', () => {
    request.destroy();
  });

  request.on('error', (error) => {
    console.warn('[adplusTracker] Failed to send tracking pixel:', error.message);
  });
}

module.exports = {
  trackAdplusVisit,
};
