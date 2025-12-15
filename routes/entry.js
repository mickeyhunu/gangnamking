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
const entryImageGuard = require('../middleware/entryImageGuard');

const router = express.Router();

// router.get('/', (req, res) => {
//   res.redirect('/entry');
// });

router.get('/', renderHome);
router.get('/entrymap/:storeNo/data.json', authGuard, renderStoreEntriesData);
router.get('/entrymap/:storeNo', renderStoreEntries);
router.get('/entrymap/:storeNo/entryImage', entryImageGuard, renderStoreEntryImage);
router.get('/roommap/:storeNo/data.json', authGuard, renderRoomInfoData);
router.get('/roommap/:storeNo', renderRoomInfo);
router.get('/roommap/:storeNo/roomImage', renderRoomImage);
router.get('/today', renderTodayImage);

module.exports = router;
