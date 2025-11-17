const { pool } = require('../../config/db');
const { getContentProtectionMarkup } = require('./contentProtection');

async function renderHome(req, res, next) {
  try {
    const [stores] = await pool.query(
      `SELECT storeNo, storeName
         FROM INFO_STORE
        ORDER BY storeNo ASC`
    );

    const protectionMarkup = getContentProtectionMarkup();
    let html =
      "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>가게 목록</title>" +
      protectionMarkup +
      '</head><body>';
    html += '<header class="community-link">강남의 밤 소통방 "강밤" : "<a href="https://open.kakao.com/o/gALpMlRg" target="_blank" rel="noopener noreferrer">https://open.kakao.com/o/gALpMlRg</a>"</header>';
    html += '<h1>가게 목록</h1><ul>';
    stores.forEach((store) => {
      html += `<li>${store.storeNo} - ${store.storeName}
                 [<a href="/entry/entrymap/${store.storeNo}">엔트리 보러가기</a>]
                 [<a href="/entry/roommap/${store.storeNo}">룸현황 보러가기</a>]
              </li>`;
    });
    html += '<li>0 - 전체 가게 [<a href="/entry/entrymap/0">엔트리 보러가기</a>] [<a href="/entry/roommap/0">룸현황 보러가기</a>]</li>';
    html += '</ul>';
    html += '</body></html>';

    res.send(html);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderHome,
};
