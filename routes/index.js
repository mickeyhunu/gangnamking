const express = require('express');
const { renderIndex, renderShopDetail, renderSitemap } = require('../controllers/shopController');
const { renderShopStaticMap } = require('../controllers/mapController');

const router = express.Router();

router.get('/', renderIndex);
router.get('/shops/:id/map/static', renderShopStaticMap);
router.get('/shops/:id', renderShopDetail);
router.get('/sitemap.xml', renderSitemap);

module.exports = router;
