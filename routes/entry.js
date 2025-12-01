const express = require('express');
const { renderHome } = require('../controllers/entry/storeController');
const {
  renderStoreEntries,
  renderStoreEntriesData,
  renderStoreEntryImage,
  renderTodayImage,
} = require('../controllers/entry/entryController');
const {
  renderRoomInfo,
  renderRoomInfoData,
  renderRoomImage,
} = require('../controllers/entry/roomController');
const authGuard = require('../middleware/authGuard');
const entryCrawlerBlocker = require('../middleware/entryCrawlerBlocker');
const entryShield = require('../middleware/entryShield');
const signedUrlGuard = require('../middleware/signedUrlGuard');

const router = express.Router();

router.use(entryCrawlerBlocker);
router.use(entryShield);

router.get('/', (req, res) => {
  res.redirect('/entry/home');
});

router.get('/home', renderHome);
router.get('/entrymap/:storeNo/data.json', authGuard, signedUrlGuard, renderStoreEntriesData);
router.get('/entrymap/:storeNo', signedUrlGuard, renderStoreEntries);
router.get('/entrymap/:storeNo/entryImagege1', signedUrlGuard, renderStoreEntryImage);
router.get('/roommap/:storeNo/data.json', authGuard, signedUrlGuard, renderRoomInfoData);
router.get('/roommap/:storeNo', signedUrlGuard, renderRoomInfo);
router.get('/roommap/:storeNo/roomImagege1', signedUrlGuard, renderRoomImage);
router.get('/today', signedUrlGuard, renderTodayImage);

module.exports = router;
