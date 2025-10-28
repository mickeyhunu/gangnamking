const express = require('express');
const {
  renderIndex,
  renderShopDetail,
  renderSitemap,
} = require('../controllers/shopController');

const router = express.Router();

router.get('/', renderIndex);
router.get('/shops/:id', renderShopDetail);
router.get('/sitemap.xml', renderSitemap);

module.exports = router;
