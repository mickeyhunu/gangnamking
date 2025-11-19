const { pool } = require('../../config/db');
const { getContentProtectionMarkup } = require('./contentProtection');

const COMMUNITY_CHAT_LINK = 'https://open.kakao.com/o/gALpMlRg';

async function renderHome(req, res, next) {
  try {
    const [stores] = await pool.query(
      `SELECT storeNo, storeName
         FROM INFO_STORE
        ORDER BY storeNo ASC`
    );

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
