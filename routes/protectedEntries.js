const express = require('express');
const { renderShopEntrySummary } = require('../controllers/shopController');

const router = express.Router();

router.get('/:id/entries.json', renderShopEntrySummary);

module.exports = router;
