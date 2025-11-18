(function () {
  const root = document.querySelector('[data-entry-map]');
  if (!root || typeof window.fetch !== 'function') {
    return;
  }

  const endpoint = (root.dataset.entryEndpoint || '').trim();
  if (!endpoint) {
    return;
  }

  const loadingNode = root.querySelector('[data-entry-loading-message]');
  const errorNode = root.querySelector('[data-entry-error-message]');
  const summaryNode = root.querySelector('[data-entry-summary]');
  const storesHost = root.querySelector('[data-entry-stores]');
  const workerEmptyText = root.dataset.entryWorkerEmpty || '';
  const topEmptyText = root.dataset.entryTopEmpty || workerEmptyText;
  const loadingText = root.dataset.entryLoadingText || '';
  const errorText = root.dataset.entryErrorText || '';
  const scoreLabel = root.dataset.entryTopScoreLabel || '';
  const locale = root.dataset.entryLocale || 'ko-KR';

  let numberFormatter;
  try {
    numberFormatter = new Intl.NumberFormat(locale);
  } catch (error) {
    numberFormatter = new Intl.NumberFormat();
  }

  function setVisibility(node, visible) {
    if (!node) return;
    if (visible) {
      node.removeAttribute('hidden');
    } else {
      node.setAttribute('hidden', 'hidden');
    }
  }

  function showLoading() {
    if (loadingNode) {
      loadingNode.textContent = loadingText;
    }
    setVisibility(loadingNode, true);
    setVisibility(errorNode, false);
    setVisibility(summaryNode, false);
    setVisibility(storesHost, false);
  }

  function showError(message) {
    if (errorNode) {
      errorNode.textContent = message || errorText;
    }
    setVisibility(loadingNode, false);
    setVisibility(errorNode, true);
    setVisibility(summaryNode, false);
    setVisibility(storesHost, false);
  }

  function showContent() {
    setVisibility(loadingNode, false);
    setVisibility(errorNode, false);
    setVisibility(storesHost, true);
  }

  function createWorkerRows(rows) {
    const container = document.createElement('div');
    container.className = 'entry-rows';

    if (!Array.isArray(rows) || !rows.length) {
      const empty = document.createElement('p');
      empty.className = 'entry-empty';
      empty.textContent = workerEmptyText;
      container.appendChild(empty);
      return container;
    }

    rows.forEach((row) => {
      if (!Array.isArray(row) || !row.length) {
        return;
      }
      const rowEl = document.createElement('div');
      rowEl.className = 'entry-row';
      row.forEach((name) => {
        if (typeof name !== 'string' || !name.trim()) {
          return;
        }
        const badge = document.createElement('span');
        badge.className = 'entry-name';
        badge.textContent = name;
        rowEl.appendChild(badge);
      });
      if (rowEl.childElementCount) {
        container.appendChild(rowEl);
      }
    });

    if (!container.childElementCount) {
      const empty = document.createElement('p');
      empty.className = 'entry-empty';
      empty.textContent = workerEmptyText;
      container.appendChild(empty);
    }

    return container;
  }

  function createTopList(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      const empty = document.createElement('p');
      empty.className = 'top-empty';
      empty.textContent = topEmptyText;
      return empty;
    }

    const list = document.createElement('ol');
    list.className = 'top-list';

    entries.forEach((entry, index) => {
      const item = document.createElement('li');
      item.className = 'top-list__item';

      const name = document.createElement('span');
      name.className = 'top-list__name';
      name.textContent = `${index + 1}. ${entry.name || ''}`;

      const score = document.createElement('span');
      score.className = 'top-list__score';
      const normalizedScore = Number.isFinite(entry.score) ? entry.score : 0;
      score.textContent = `${scoreLabel} ${numberFormatter.format(normalizedScore)}`;

      item.appendChild(name);
      item.appendChild(score);
      list.appendChild(item);
    });

    return list;
  }

  function createStoreCard(store) {
    const card = document.createElement('article');
    card.className = 'entry-card';

    const header = document.createElement('header');
    header.className = 'entry-card__header';

    const title = document.createElement('h2');
    title.className = 'entry-card__title';
    title.textContent = store.storeName || '';

    const count = document.createElement('p');
    count.className = 'entry-card__count';
    const total = Number.isFinite(store.totalWorkers) ? store.totalWorkers : 0;
    count.textContent = `총 출근인원: ${numberFormatter.format(total)}명`;

    header.appendChild(title);
    header.appendChild(count);

    const body = document.createElement('div');
    body.className = 'entry-card__body';

    const workersSection = document.createElement('div');
    workersSection.className = 'entry-section';
    const workersTitle = document.createElement('h3');
    workersTitle.textContent = '출근부 목록';
    workersSection.appendChild(workersTitle);
    workersSection.appendChild(createWorkerRows(store.workerRows));

    const topSection = document.createElement('div');
    topSection.className = 'top-section';
    const topTitle = document.createElement('h3');
    topTitle.textContent = '오늘의 인기 멤버 TOP 5';
    topSection.appendChild(topTitle);
    topSection.appendChild(createTopList(store.topEntries));

    body.appendChild(workersSection);
    body.appendChild(topSection);

    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  async function loadEntries() {
    showLoading();
    try {
      const response = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entry data');
      }

      const payload = await response.json();
      const isAll = payload.scope === 'all';
      const stores = isAll ? payload.stores || [] : [payload.store].filter(Boolean);

      storesHost.innerHTML = '';

      if (!stores.length) {
        showError(workerEmptyText);
        return;
      }

      stores.forEach((store) => {
        storesHost.appendChild(createStoreCard(store));
      });

      if (summaryNode) {
        if (isAll) {
          const totalEntries = Number.isFinite(payload.totalEntries) ? payload.totalEntries : 0;
          const storeCount = Number.isFinite(payload.storeCount) ? payload.storeCount : stores.length;
          summaryNode.textContent = `총 출근인원: ${numberFormatter.format(totalEntries)}명 / 가게 수: ${numberFormatter.format(storeCount)}곳`;
        } else {
          const store = stores[0];
          const total = store ? store.totalWorkers : 0;
          summaryNode.textContent = `총 출근인원: ${numberFormatter.format(total)}명`;
        }
        setVisibility(summaryNode, true);
      }

      showContent();
    } catch (error) {
      console.error('[entry-map] failed to load entries', error);
      showError(errorText);
    }
  }

  loadEntries();
})();
