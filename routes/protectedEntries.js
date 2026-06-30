const express = require('express');
const {
  renderShopEntrySummary,
  renderShopStaticMap,
} = require('../controllers/shopController');

const router = express.Router();

router.get('/:id/map/static', renderShopStaticMap);
router.get('/:id/entries.json', renderShopEntrySummary);

module.exports = router;
