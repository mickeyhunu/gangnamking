const { getShops } = require('../../services/dataStore');
const { getContentProtectionMarkup } = require('./contentProtection');

const COMMUNITY_CHAT_LINK = 'https://open.kakao.com/o/gALpMlRg';

async function renderHome(req, res, next) {
  try {
    const stores = getShops()
      .map((shop) => ({
        storeNo: shop.storeNo,
        storeName: shop.name,
      }))
      .filter((shop) => typeof shop.storeNo === 'number' && shop.storeName)
      .sort((a, b) => a.storeNo - b.storeNo);

    const storeCards = stores.map((store) => ({
      storeNo: store.storeNo,
      storeName: store.storeName,
      entryUrl: `/entry/entrymap/${store.storeNo}`,
      roomUrl: `/entry/roommap/${store.storeNo}`,
    }));

    storeCards.push({
      storeNo: 0,
      storeName: '전체 가게',
      entryUrl: '/entry/entrymap/0',
      roomUrl: '/entry/roommap/0',
      isAllStores: true,
    });

    res.render('entry-home', {
      pageTitle: '가게 목록',
      pageHeading: '가게 목록',
      totalStores: stores.length,
      communityLink: COMMUNITY_CHAT_LINK,
      contentProtectionMarkup: getContentProtectionMarkup(),
      stores: storeCards,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderHome,
};
