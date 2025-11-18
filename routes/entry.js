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

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect('/entry/home');
});

router.get('/home', renderHome);
router.get('/entrymap/:storeNo/data.json', renderStoreEntriesData);
router.get('/entrymap/:storeNo', renderStoreEntries);
router.get('/entrymap/:storeNo/entryImage', renderStoreEntryImage);
router.get('/roommap/:storeNo/data.json', renderRoomInfoData);
router.get('/roommap/:storeNo', renderRoomInfo);
router.get('/roommap/:storeNo/roomImage', renderRoomImage);
router.get('/today', renderTodayImage);

module.exports = router;
