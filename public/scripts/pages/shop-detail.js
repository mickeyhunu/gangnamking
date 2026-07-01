(function () {
  const sliders = Array.from(document.querySelectorAll('[data-slider]'));
  if (sliders.length) {
    sliders.forEach((slider) => {
      const track = slider.querySelector('[data-slider-track]');
      if (!track) {
        return;
      }

      const slides = Array.from(track.children);
      if (!slides.length) {
        return;
      }

      const prev = slider.querySelector('[data-slider-prev]');
      const next = slider.querySelector('[data-slider-next]');
      const dotsHost = slider.querySelector('[data-slider-dots]');
      const dotLabelTemplate = slider.dataset.dotLabel || 'View image {{index}}';
      let index = 0;
      let timer;

      function getDotLabel(dotIndex) {
        return dotLabelTemplate.replace('{{index}}', dotIndex + 1);
      }

      function updateTransform() {
        track.style.transform = `translateX(-${index * 100}%)`;
        if (dotsHost) {
          const dots = dotsHost.querySelectorAll('.detail-gallery__dot');
          dots.forEach((dot, dotIndex) => {
            dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
          });
        }
      }

      function goToSlide(newIndex) {
        const total = slides.length;
        if (!total) {
          return;
        }
        index = (newIndex + total) % total;
        updateTransform();
      }

      function startAuto() {
        if (timer || slides.length < 2) {
          return;
        }
        timer = window.setInterval(() => {
          goToSlide(index + 1);
        }, 6000);
      }

      function stopAuto() {
        if (timer) {
          window.clearInterval(timer);
          timer = undefined;
        }
      }

      if (dotsHost && slides.length > 1) {
        const fragment = document.createDocumentFragment();
        slides.forEach((_, dotIndex) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'detail-gallery__dot';
          dot.setAttribute('aria-label', getDotLabel(dotIndex));
          dot.addEventListener('click', () => {
            goToSlide(dotIndex);
            stopAuto();
            startAuto();
          });
          fragment.appendChild(dot);
        });
        dotsHost.appendChild(fragment);
      }

      if (prev) {
        prev.addEventListener('click', () => {
          goToSlide(index - 1);
          stopAuto();
          startAuto();
        });
      }

      if (next) {
        next.addEventListener('click', () => {
          goToSlide(index + 1);
          stopAuto();
          startAuto();
        });
      }

      slider.addEventListener('mouseenter', stopAuto);
      slider.addEventListener('mouseleave', startAuto);
      slider.addEventListener('touchstart', stopAuto, { passive: true });
      slider.addEventListener('touchend', startAuto, { passive: true });

      updateTransform();
      startAuto();
    });
  }

  const entrySections = Array.from(document.querySelectorAll('[data-entry-endpoint]'));

  if (entrySections.length && typeof window.fetch === 'function') {
    entrySections.forEach((section) => {
      const endpoint = (section.dataset.entryEndpoint || '').trim();
      if (!endpoint) {
        return;
      }

      const isPrefilled = (section.dataset.entryPrefilled || '').toLowerCase() === 'true';
      const prefillNode = section.querySelector('[data-entry-prefill]');
      let prefillSummary = null;

      if (prefillNode && prefillNode.textContent) {
        try {
          prefillSummary = JSON.parse(prefillNode.textContent);
        } catch (error) {
          prefillSummary = null;
        }
      }

      const totalNode = section.querySelector('[data-entry-total]');
      const workerList = section.querySelector('[data-entry-worker-list]');
      const workerEmpty = section.querySelector('[data-entry-empty-message]');
      const topList = section.querySelector('[data-entry-top-list]');
      const topEmpty = section.querySelector('[data-entry-top-empty]');
      const moreLink = section.querySelector('[data-entry-more-link]');
      const moreCount = section.querySelector('[data-entry-more-count]');
      const errorText = section.dataset.entryErrorText || '';
      const scoreLabel = section.dataset.entryTopScoreLabel || '';
      const locale = section.dataset.entryLocale || 'ko';
      const visibleWorkerLimit = Math.max(0, Number(section.dataset.entryVisibleLimit) || 15);
      const workerRowSize = 5;
      const workerEmptyDefault = workerEmpty
        ? workerEmpty.dataset.entryEmptyDefault || workerEmpty.textContent || ''
        : '';
      const topEmptyDefault = topEmpty
        ? topEmpty.dataset.entryTopEmptyDefault || topEmpty.textContent || workerEmptyDefault
        : workerEmptyDefault;
      let numberFormatter;

      try {
        numberFormatter = new Intl.NumberFormat(locale);
      } catch (error) {
        numberFormatter = new Intl.NumberFormat();
      }

      function setWorkerMessage(message) {
        if (workerEmpty) {
          workerEmpty.textContent = message || '';
          workerEmpty.hidden = !message;
        }
      }

      function setTopMessage(message) {
        if (topEmpty) {
          topEmpty.textContent = message || '';
          topEmpty.hidden = !message;
        }
      }

      function getVisibleWorkerSummary(summary) {
        const names = [];
        const rows = summary && Array.isArray(summary.workerRows) ? summary.workerRows : [];

        rows.forEach((row) => {
          if (!Array.isArray(row)) {
            return;
          }

          row.forEach((name) => {
            if (typeof name === 'string' && name.trim()) {
              names.push(name.trim());
            }
          });
        });

        const visibleNames = names.slice(0, visibleWorkerLimit);
        const visibleRows = [];

        for (let index = 0; index < visibleNames.length; index += workerRowSize) {
          visibleRows.push(visibleNames.slice(index, index + workerRowSize));
        }

        const hiddenFromRows = Math.max(0, names.length - visibleNames.length);
        const hiddenFromSummary = Number(summary && summary.hiddenWorkerCount);

        return {
          rows: visibleRows,
          hiddenWorkerCount: Math.max(
            Number.isFinite(hiddenFromSummary) ? hiddenFromSummary : 0,
            hiddenFromRows
          ),
        };
      }

      function renderWorkerRows(rows) {
        if (!workerList) {
          return false;
        }

        workerList.innerHTML = '';

        if (!Array.isArray(rows) || !rows.length) {
          workerList.hidden = true;
          return false;
        }

        const fragment = document.createDocumentFragment();

        rows.forEach((row) => {
          if (!Array.isArray(row) || !row.length) {
            return;
          }

          const item = document.createElement('li');
          item.className = 'store-entry-workers__item';

          row.forEach((name) => {
            if (typeof name !== 'string' || !name.trim()) {
              return;
            }
            const span = document.createElement('span');
            span.className = 'store-entry-workers__name';
            span.textContent = name;
            item.appendChild(span);
          });

          if (item.childElementCount) {
            fragment.appendChild(item);
          }
        });

        if (!fragment.childElementCount) {
          workerList.hidden = true;
          return false;
        }

        workerList.appendChild(fragment);
        workerList.hidden = false;
        return true;
      }

      function renderMoreLink(summary) {
        if (!moreLink) {
          return;
        }

        const hiddenCount = Number(summary && summary.hiddenWorkerCount);
        const summaryHref = summary && typeof summary.moreLink === 'string'
          ? summary.moreLink.trim()
          : '';
        const href = summaryHref || moreLink.getAttribute('href') || '';

        if (!Number.isFinite(hiddenCount) || hiddenCount <= 0 || !href) {
          moreLink.hidden = true;
          if (moreCount) {
            moreCount.textContent = '0';
          }
          return;
        }

        moreLink.href = href;
        if (moreCount) {
          moreCount.textContent = numberFormatter.format(hiddenCount);
        }
        moreLink.hidden = false;
      }

      function renderTopEntries(entries) {
        if (!topList) {
          return false;
        }

        topList.innerHTML = '';

        if (!Array.isArray(entries) || !entries.length) {
          topList.hidden = true;
          return false;
        }

        const fragment = document.createDocumentFragment();

        entries.forEach((entry, index) => {
          if (!entry || typeof entry.workerName !== 'string' || !entry.workerName.trim()) {
            return;
          }

          const item = document.createElement('li');
          item.className = 'store-entry-top__item';

          const rank = document.createElement('span');
          rank.className = 'store-entry-top__rank';
          rank.textContent = `${index + 1}.`;

          const name = document.createElement('span');
          name.className = 'store-entry-top__name';
          name.textContent = entry.workerName;

          const score = document.createElement('span');
          score.className = 'store-entry-top__score';
          if (scoreLabel) {
            score.appendChild(document.createTextNode(`${scoreLabel} `));
          }
          const strong = document.createElement('strong');
          const displayScore = Number(entry.displayScore);
          strong.textContent = numberFormatter.format(
            Number.isFinite(displayScore) ? displayScore : 0
          );
          score.appendChild(strong);

          item.appendChild(rank);
          item.appendChild(name);
          item.appendChild(score);
          fragment.appendChild(item);
        });

        if (!fragment.childElementCount) {
          topList.hidden = true;
          return false;
        }

        topList.appendChild(fragment);
        topList.hidden = false;
        return true;
      }

      function applySummary(summary) {
        if (!summary || summary.enabled === false) {
          setWorkerMessage(workerEmptyDefault);
          setTopMessage(topEmptyDefault);
          if (workerList) {
            workerList.hidden = true;
            workerList.innerHTML = '';
          }
          if (topList) {
            topList.hidden = true;
            topList.innerHTML = '';
          }
          if (totalNode) {
            totalNode.textContent = '0';
          }
          renderMoreLink(null);
          return;
        }

        if (totalNode) {
          const total = Number(summary.totalCount);
          totalNode.textContent = numberFormatter.format(
            Number.isFinite(total) ? total : 0
          );
        }

        const visibleWorkerSummary = getVisibleWorkerSummary(summary);
        const hasWorkers = renderWorkerRows(visibleWorkerSummary.rows);
        if (workerEmpty) {
          workerEmpty.hidden = hasWorkers;
          if (!hasWorkers) {
            workerEmpty.textContent = workerEmptyDefault;
          }
        }

        renderMoreLink({
          ...summary,
          hiddenWorkerCount: visibleWorkerSummary.hiddenWorkerCount,
        });

        const hasTopEntries = renderTopEntries(summary.topEntries);
        if (topEmpty) {
          topEmpty.hidden = hasTopEntries;
          if (!hasTopEntries) {
            topEmpty.textContent = topEmptyDefault;
          }
        }
      }

      function showError() {
        if (workerList) {
          workerList.hidden = true;
          workerList.innerHTML = '';
        }
        if (topList) {
          topList.hidden = true;
          topList.innerHTML = '';
        }
        setWorkerMessage(workerEmptyDefault);
        setTopMessage(topEmptyDefault);
        renderMoreLink(null);
      }

      async function fetchEntries() {
        try {
          const response = await window.fetch(endpoint, {
            headers: {
              Accept: 'application/json',
            },
            credentials: 'same-origin',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch entry summary');
          }

          const payload = await response.json();
          applySummary(payload && typeof payload === 'object' ? payload : null);
        } catch (error) {
          showError();
        }
      }

      if (prefillSummary) {
        applySummary(prefillSummary);

        if (!isPrefilled) {
          fetchEntries();
        }
        return;
      }

      if (!isPrefilled) {
        fetchEntries();
      }
    });
  }

  const seoEditor = document.querySelector('[data-seo-editor]');
  if (seoEditor) {
    const textarea = seoEditor.querySelector('textarea');

    if (!textarea) {
      return;
    }

    const copyButton = seoEditor.querySelector('[data-action="copy"]');
    const status = seoEditor.querySelector('[data-status]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const successMessage = seoEditor.dataset.successMessage || 'Copied keywords.';
    const errorMessage = seoEditor.dataset.errorMessage || 'Copy failed. Please try again.';
    let statusTimer;

    function setStatus(message, isSuccess) {
      if (!status) {
        return;
      }
      status.textContent = message;
      status.style.color = isSuccess ? '#ff9bd1' : 'var(--color-muted)';
      if (statusTimer) {
        window.clearTimeout(statusTimer);
      }
      if (message) {
        statusTimer = window.setTimeout(() => {
          status.textContent = '';
        }, 4000);
      }
    }

    function updateMetaKeywords() {
      if (metaKeywords) {
        metaKeywords.setAttribute('content', textarea.value.trim());
      }
    }

    textarea.addEventListener('input', updateMetaKeywords);

    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(textarea.value);
          setStatus(successMessage, true);
        } catch (error) {
          setStatus(errorMessage, false);
        }
      });
    }
  }


  const mapHost = document.querySelector('[data-shop-map]');
  if (mapHost) {
    const mapContainer = mapHost.querySelector('[data-map-region]');
    const address = (mapHost.dataset.shopAddress || '').trim();
    const district = (mapHost.dataset.shopDistrict || '').trim();
    const region = (mapHost.dataset.shopRegion || '').trim();
    const venueName = (mapHost.dataset.shopName || '').trim();
    const latValue = mapHost.dataset.shopLat;
    const lngValue = mapHost.dataset.shopLng;
    let lat = typeof latValue === 'string' && latValue.trim() !== '' ? Number.parseFloat(latValue) : NaN;
    let lng = typeof lngValue === 'string' && lngValue.trim() !== '' ? Number.parseFloat(lngValue) : NaN;

    function hasCoordinates() {
      return Number.isFinite(lat) && Number.isFinite(lng);
    }

    function setMapState(state) {
      if (state) {
        mapHost.dataset.mapState = state;
      } else {
        delete mapHost.dataset.mapState;
      }
    }

    function renderMapFallback() {
      if (!mapContainer) {
        return;
      }

      const fallback = document.createElement('div');
      fallback.className = 'business-profile-mini-map__fallback';
      fallback.textContent = address || district || region || '지도를 불러올 수 없습니다.';

      mapContainer.innerHTML = '';
      mapContainer.appendChild(fallback);
      setMapState('fallback');
    }

    function renderKakaoMap() {
      if (!mapContainer || !hasCoordinates() || !window.kakao || !window.kakao.maps) {
        return false;
      }

      const kakaoMaps = window.kakao.maps;
      const position = new kakaoMaps.LatLng(lat, lng);
      mapContainer.innerHTML = '';

      const map = new kakaoMaps.Map(mapContainer, {
        center: position,
        level: 3,
        draggable: true,
        scrollwheel: true,
        disableDoubleClick: false,
        disableDoubleClickZoom: false,
      });

      const mapMarker = new kakaoMaps.Marker({
        map,
        position,
      });

      if (venueName || address) {
        mapMarker.setTitle(venueName || address);
      }

      if (typeof kakaoMaps.ZoomControl === 'function') {
        map.addControl(new kakaoMaps.ZoomControl(), kakaoMaps.ControlPosition.RIGHT);
      }

      window.setTimeout(() => {
        map.relayout();
        map.setCenter(position);
      }, 0);

      setMapState('ready');
      return true;
    }

    function resolveCoordinatesWithKakaoMaps(callback) {
      if (hasCoordinates() || !address || !window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        callback();
        return;
      }

      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (results, status) => {
        if (status === window.kakao.maps.services.Status.OK && Array.isArray(results) && results[0]) {
          const resolvedLat = Number.parseFloat(results[0].y);
          const resolvedLng = Number.parseFloat(results[0].x);

          if (Number.isFinite(resolvedLat) && Number.isFinite(resolvedLng)) {
            lat = resolvedLat;
            lng = resolvedLng;
          }
        }

        callback();
      });
    }

    function initializeKakaoMiniMap() {
      resolveCoordinatesWithKakaoMaps(() => {
        if (!renderKakaoMap()) {
          renderMapFallback();
        }
      });
    }

    if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
      window.kakao.maps.load(initializeKakaoMiniMap);
    } else {
      initializeKakaoMiniMap();
    }
  }

  const sectionNav = document.querySelector('[data-section-nav]');
  if (sectionNav) {
    const navLinks = Array.from(sectionNav.querySelectorAll('[data-section-nav-link]'));
    const sections = [];

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') {
        return;
      }

      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      sections.push({ link, target });
    });

    const count = sections.length;

    if (!count) {
      return;
    }

    let activeIndex = -1;
    let scrollUpdateHandle = null;
    const requestFrame = (window.requestAnimationFrame && window.requestAnimationFrame.bind(window)) ||
      ((callback) => window.setTimeout(callback, 16));

    function setActive(index) {
      if (index < 0 || index >= count || index === activeIndex) {
        return;
      }

      activeIndex = index;

      sections.forEach((item, itemIndex) => {
        const isActive = itemIndex === index;
        item.link.classList.toggle('section-progress-nav__link--active', isActive);
        if (isActive) {
          item.link.setAttribute('aria-current', 'true');
        } else {
          item.link.removeAttribute('aria-current');
        }
      });
    }

    function updateActiveFromScrollPosition() {
      scrollUpdateHandle = null;

      const doc = document.documentElement;
      const docHeight = doc ? doc.scrollHeight : 0;
      const scrollBottom = window.scrollY + window.innerHeight;

      if (docHeight && scrollBottom >= docHeight - 1) {
        setActive(count - 1);
        return;
      }

      const activationLine = Math.min(window.innerHeight * 0.35, 280);
      let targetIndex = 0;

      for (let index = 0; index < count; index += 1) {
        const { target } = sections[index];
        const rect = target.getBoundingClientRect();
        const top = rect.top;
        const bottom = rect.bottom;

        if (top <= activationLine && bottom > activationLine) {
          targetIndex = index;
          break;
        }

        if (top > activationLine) {
          targetIndex = index;
          break;
        }

        targetIndex = index;
      }

      setActive(targetIndex);
    }

    function scheduleScrollUpdate() {
      if (scrollUpdateHandle !== null) {
        return;
      }

      scrollUpdateHandle = requestFrame(updateActiveFromScrollPosition);
    }

    sections.forEach((item, index) => {
      item.link.addEventListener('click', (event) => {
        event.preventDefault();
        const hash = item.link.hash;

        item.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(index);
        scheduleScrollUpdate();

        if (hash && typeof window.history.replaceState === 'function') {
          try {
            window.history.replaceState(null, '', hash);
          } catch (error) {
            // Ignore history errors silently.
          }
        }
      });
    });

    function handleHashChange() {
      if (!window.location.hash) {
        return;
      }

      const index = sections.findIndex((item) => item.link.hash === window.location.hash);
      if (index >= 0) {
        setActive(index);
        scheduleScrollUpdate();
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollUpdate);

    const initialHash = window.location.hash;
    if (initialHash) {
      const initialIndex = sections.findIndex((item) => item.link.hash === initialHash);
      if (initialIndex >= 0) {
        setActive(initialIndex);
      } else {
        setActive(0);
      }
    } else {
      setActive(0);
    }

    scheduleScrollUpdate();
    window.setTimeout(scheduleScrollUpdate, 200);
  }
})();
