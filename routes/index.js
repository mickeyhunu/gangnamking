const express = require('express');
const {
  renderIndex,
  renderSeoLandingPage,
  renderShopDetail,
  renderShopStaticMap,
  renderSitemap,
} = require('../controllers/shopController');

const router = express.Router();

router.get('/', renderIndex);
router.get(['/community', '/play/live', '/business-info'], renderSeoLandingPage);
router.get('/shops/:id/map/static', renderShopStaticMap);
router.get('/shops/:id', renderShopDetail);
router.get('/sitemap.xml', renderSitemap);

module.exports = router;
