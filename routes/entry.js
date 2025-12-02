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

const router = express.Router();

// router.get('/', (req, res) => {
//   res.redirect('/entry');
// });

router.get('/', renderHome);
router.get('/:storeNo/data.json', authGuard, renderStoreEntriesData);
router.get('/:storeNo', renderStoreEntries);
router.get('/:storeNo/entryImage', renderStoreEntryImage);
router.get('/:storeNo/data.json', authGuard, renderRoomInfoData);
router.get('/:storeNo', renderRoomInfo);
router.get('/:storeNo/roomImage', renderRoomImage);
router.get('/today', renderTodayImage);

module.exports = router;
