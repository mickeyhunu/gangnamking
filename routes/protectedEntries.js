const express = require('express');
const authGuard = require('../middleware/authGuard');
const { renderShopEntrySummary } = require('../controllers/shopController');

const router = express.Router();

router.get('/:id/entries.json', authGuard, renderShopEntrySummary);

module.exports = router;
