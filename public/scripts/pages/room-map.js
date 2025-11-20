(function () {
  const section = document.querySelector('[data-room-map]');
  if (!section) return;

  const loadingMessage = section.querySelector('[data-room-loading-message]');
  const errorMessage = section.querySelector('[data-room-error-message]');
  const summaryElement = section.querySelector('[data-room-summary]');
  const storesContainer = section.querySelector('[data-room-stores]');
  const {
    roomEndpoint: endpoint,
    roomMode,
    roomEmptyText,
    roomDetailEmpty,
    roomRoomLabel,
    roomWaitLabel,
    roomUpdatedLabel,
    roomSummaryAllLabel,
    roomSummarySingleLabel,
  } = section.dataset;

  const preloadedNode = document.getElementById('room-map-preloaded-data');
  let preloadedPayload = null;
  if (preloadedNode) {
    try {
      preloadedPayload = JSON.parse(preloadedNode.textContent || 'null');
    } catch (error) {
      preloadedPayload = null;
    }
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setVisibility({ loading = false, error = false, summary = false, stores = false }) {
    if (loadingMessage) loadingMessage.hidden = !loading;
    if (errorMessage) errorMessage.hidden = !error;
    if (summaryElement) summaryElement.hidden = !summary;
    if (storesContainer) storesContainer.hidden = !stores;
  }

  function renderRoomCard(room) {
    const detailLines = Array.isArray(room.detailLines) ? room.detailLines : [];
    const detailMarkup = detailLines.length
      ? `<ul class="room-card__detail-list">${detailLines
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join('')}</ul>`
      : `<p class="room-card__detail-empty">${escapeHtml(roomDetailEmpty)}</p>`;

    return `
      <article class="room-card">
        <header class="room-card__header">
          <h2 class="room-card__title">${escapeHtml(room.storeName ?? '')}</h2>
          <p class="room-card__updated">
            ${escapeHtml(roomUpdatedLabel)}: <span>${escapeHtml(room.updatedAtDisplay ?? '')}</span>
          </p>
        </header>
        <dl class="room-card__meta">
          <div class="room-card__meta-row">
            <dt>${escapeHtml(roomRoomLabel)}</dt>
            <dd>${escapeHtml(room.roomInfo ?? '')}</dd>
          </div>
          <div class="room-card__meta-row">
            <dt>${escapeHtml(roomWaitLabel)}</dt>
            <dd>${escapeHtml(room.waitInfo ?? '')}</dd>
          </div>
        </dl>
        <section class="room-card__details">
          <h3>상세 정보</h3>
          ${detailMarkup}
        </section>
      </article>
    `;
  }

  async function hydrate() {
    try {
      const payload = preloadedPayload
        ? preloadedPayload
        : await (async () => {
            const response = await fetch(endpoint, {
              credentials: 'same-origin',
              headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
              throw new Error('Failed to load room data');
            }

            return response.json();
          })();

      preloadedPayload = null;
      const rooms = Array.isArray(payload.rooms) ? payload.rooms : [];

      if (!rooms.length) {
        if (summaryElement) {
          summaryElement.textContent = roomEmptyText;
        }
        setVisibility({ loading: false, error: false, summary: true, stores: false });
        return;
      }

      if (summaryElement) {
        if ((payload.mode || roomMode) === 'all') {
          const total = payload.totalStores ?? rooms.length;
          summaryElement.textContent = `${roomSummaryAllLabel}: ${total}곳`;
        } else {
          const storeName = rooms[0]?.storeName ?? '';
          summaryElement.textContent = `${storeName} ${roomSummarySingleLabel}`.trim();
        }
      }

      if (storesContainer) {
        storesContainer.innerHTML = rooms.map(renderRoomCard).join('');
      }

      setVisibility({ loading: false, error: false, summary: true, stores: true });
    } catch (error) {
      console.warn('[room-map] Failed to load room data', error);
      setVisibility({ loading: false, error: true, summary: false, stores: false });
    }
  }

  setVisibility({ loading: true, error: false, summary: false, stores: false });
  hydrate();
})();
