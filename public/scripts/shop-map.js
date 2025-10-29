(function () {
  function escapeHtml(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const mapElement = document.getElementById('shop-map');

  if (!mapElement || typeof L === 'undefined') {
    return;
  }

  const latitude = Number.parseFloat(mapElement.dataset.latitude);
  const longitude = Number.parseFloat(mapElement.dataset.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return;
  }

  const rawShopName = mapElement.dataset.shopName || '';
  const rawShopAddress = mapElement.dataset.shopAddress || '';
  const shopName = rawShopName ? escapeHtml(rawShopName) : '';
  const shopAddress = rawShopAddress ? escapeHtml(rawShopAddress) : '';

  const map = L.map(mapElement, {
    scrollWheelZoom: false,
  }).setView([latitude, longitude], 17);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  const marker = L.marker([latitude, longitude]).addTo(map);
  const popupParts = [];

  if (shopName) {
    popupParts.push(`<strong>${shopName}</strong>`);
  }

  if (shopAddress) {
    popupParts.push(shopAddress);
  }

  if (popupParts.length) {
    marker.bindPopup(popupParts.join('<br />'), {
      closeButton: false,
    }).openPopup();
  }
})();
