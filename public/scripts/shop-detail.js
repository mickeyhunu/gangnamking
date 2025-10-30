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

  const seoEditor = document.querySelector('[data-seo-editor]');
  if (seoEditor) {
    const textarea = seoEditor.querySelector('textarea');
    const copyButton = seoEditor.querySelector('[data-action="copy"]');
    const status = seoEditor.querySelector('[data-status]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const successMessage = seoEditor.dataset.successMessage || 'Copied keywords.';
    const errorMessage = seoEditor.dataset.errorMessage || 'Copy failed. Please try again.';
    let statusTimer;

    if (!textarea) {
      return;
    }

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
          console.warn('Clipboard copy failed:', error);
          setStatus(errorMessage, false);
        }
      });
    }
  }

  const mapHost = document.querySelector('[data-shop-map]');
  if (mapHost) {
    const mapContainer = mapHost.querySelector('[data-map-region]');
    const status = mapHost.querySelector('[data-map-status]');
    const address = (mapHost.dataset.shopAddress || '').trim();
    const district = (mapHost.dataset.shopDistrict || '').trim();
    const region = (mapHost.dataset.shopRegion || '').trim();
    const venueName = mapHost.dataset.shopName || '';
    const loadingText = mapHost.dataset.loadingText || 'Loading map...';
    const errorText = mapHost.dataset.errorText || 'Unable to load map.';
    const latValue = mapHost.dataset.shopLat;
    const lngValue = mapHost.dataset.shopLng;
    const authErrorMessage = (mapHost.dataset.mapAuthError || '').trim();
    const mapLocale = (mapHost.dataset.mapLocale || '').trim();
    const staticMapEndpoint = (mapHost.dataset.staticMapEndpoint || '').trim();
    const staticMapMessage = mapHost.dataset.staticMapMessage || '';
    const staticMapAlt = mapHost.dataset.staticMapAlt || '';
    const presetLat =
      typeof latValue === 'string' && latValue.trim() !== '' ? Number.parseFloat(latValue) : NaN;
    const presetLng =
      typeof lngValue === 'string' && lngValue.trim() !== '' ? Number.parseFloat(lngValue) : NaN;
    const hasPresetCoordinates = Number.isFinite(presetLat) && Number.isFinite(presetLng);
    let staticMapObjectUrl = '';
    let staticMapAbortController = null;

    function setStatus(message, state) {
      if (state) {
        mapHost.dataset.mapState = state;
      } else {
        delete mapHost.dataset.mapState;
      }

      if (status) {
        if (message) {
          status.textContent = message;
          status.hidden = false;
        } else {
          status.textContent = '';
          status.hidden = true;
        }
      }
    }

    function cancelStaticMapRequest() {
      if (staticMapAbortController && typeof staticMapAbortController.abort === 'function') {
        staticMapAbortController.abort();
      }

      staticMapAbortController = null;
    }

    function releaseStaticMapObjectUrl() {
      if (staticMapObjectUrl) {
        URL.revokeObjectURL(staticMapObjectUrl);
        staticMapObjectUrl = '';
      }
    }

    function removeExistingStaticImage() {
      if (!mapContainer) {
        return;
      }

      const existingImage = mapContainer.querySelector('.shop-map__static-image');
      if (existingImage) {
        existingImage.remove();
      }
    }

    function getStaticMapSize() {
      if (!mapContainer) {
        return { width: 600, height: 360 };
      }

      const rect = mapContainer.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width), 200);
      const height = Math.max(Math.round(rect.height), 200);

      return { width, height };
    }

    async function loadStaticMap(lat, lng) {
      if (!staticMapEndpoint) {
        throw new Error('Static map endpoint is not configured.');
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Static map coordinates are not available.');
      }

      const { width, height } = getStaticMapSize();
      const url = new URL(staticMapEndpoint, window.location.origin);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lng', String(lng));
      url.searchParams.set('w', String(width));
      url.searchParams.set('h', String(height));
      url.searchParams.set('zoom', '16');
      url.searchParams.set('scale', window.devicePixelRatio >= 1.5 ? '2' : '1');
      if (mapLocale) {
        url.searchParams.set('lang', mapLocale);
      }

      const controller = typeof AbortController === 'function' ? new AbortController() : null;

      if (controller) {
        cancelStaticMapRequest();
        staticMapAbortController = controller;
      }

      setStatus(loadingText, 'loading');

      try {
        const response = await fetch(url.toString(), controller ? { signal: controller.signal } : undefined);

        if (!response.ok) {
          throw new Error(`Static map request failed with status ${response.status}`);
        }

        const blob = await response.blob();

        if (controller && controller.signal.aborted) {
          return;
        }

        if (staticMapAbortController === controller) {
          staticMapAbortController = null;
        } else {
          cancelStaticMapRequest();
        }

        releaseStaticMapObjectUrl();

        staticMapObjectUrl = URL.createObjectURL(blob);

        removeExistingStaticImage();
        mapContainer.innerHTML = '';

        const image = document.createElement('img');
        image.className = 'shop-map__static-image';
        image.src = staticMapObjectUrl;
        image.alt = staticMapAlt || '';
        image.decoding = 'async';
        mapContainer.appendChild(image);

        if (staticMapMessage) {
          setStatus(staticMapMessage, 'static');
        } else {
          setStatus('', 'static');
        }
      } catch (error) {
        if (error && error.name === 'AbortError') {
          return;
        }

        throw error;
      }
    }

    function attemptStaticFallback(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      loadStaticMap(lat, lng).catch((error) => {
        console.warn('Failed to load static map fallback:', error);
        setStatus(authErrorMessage || errorText, 'error');
      });
    }

    function releaseStaticMap() {
      cancelStaticMapRequest();
      releaseStaticMapObjectUrl();
      removeExistingStaticImage();
    }

    window.addEventListener('pagehide', releaseStaticMap);
    window.addEventListener('beforeunload', releaseStaticMap);

    if (!mapContainer || (!address && !hasPresetCoordinates)) {
      setStatus(authErrorMessage || errorText, 'error');
      return;
    }

    if (status) {
      status.hidden = false;
    }

    const naverMaps = window.naver && window.naver.maps;

    if (!naverMaps || !naverMaps.Service || !naverMaps.LatLng) {
      console.warn('Naver Maps library is not available.');
      if (hasPresetCoordinates) {
        attemptStaticFallback(presetLat, presetLng);
      } else {
        setStatus(authErrorMessage || errorText, 'error');
      }
      return;
    }

    function renderMap(lat, lng) {
      releaseStaticMap();

      const center = new naverMaps.LatLng(lat, lng);
      const map = new naverMaps.Map(mapContainer, {
        center,
        zoom: 16,
        scaleControl: false,
        mapDataControl: false,
        logoControlOptions: {
          position: naverMaps.Position.BOTTOM_RIGHT,
        },
        zoomControl: true,
        zoomControlOptions: {
          position: naverMaps.Position.TOP_RIGHT,
        },
      });

      const marker = new naverMaps.Marker({
        position: center,
        map,
        title: venueName || undefined,
      });

      if (venueName) {
        const infoContent = document.createElement('div');
        infoContent.className = 'shop-map__info-window';
        infoContent.textContent = venueName;

        const infoWindow = new naverMaps.InfoWindow({
          content: infoContent,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          disableAnchor: true,
        });

        infoWindow.open(map, marker);
      }

      setStatus('', 'ready');
    }

    if (hasPresetCoordinates) {
      renderMap(presetLat, presetLng);
      return;
    }

    setStatus(loadingText, 'loading');

    function normalizeQuery(query) {
      if (typeof query !== 'string') {
        return '';
      }

      return query.replace(/\s+/g, ' ').trim();
    }

    function buildQueryQueue() {
      const queries = [];
      const seen = new Set();

      function enqueue(value) {
        const normalized = normalizeQuery(value);

        if (!normalized || seen.has(normalized)) {
          return;
        }

        seen.add(normalized);
        queries.push(normalized);
      }

      enqueue([region, district, address].filter(Boolean).join(' '));
      enqueue([district, address].filter(Boolean).join(' '));
      enqueue([region, address].filter(Boolean).join(' '));
      enqueue(address);
      enqueue([district, region].filter(Boolean).join(' '));

      return queries;
    }

    const geocodeQueue = buildQueryQueue();

    if (!geocodeQueue.length) {
      setStatus(authErrorMessage || errorText, 'error');
      return;
    }

    function geocode(query) {
      return new Promise((resolve, reject) => {
        naverMaps.Service.geocode({ query }, (serviceStatus, response) => {
          if (serviceStatus !== naverMaps.Service.Status.OK) {
            reject(new Error(`Geocoding failed with status ${serviceStatus}`));
            return;
          }

          const addresses =
            response && response.v2 && Array.isArray(response.v2.addresses)
              ? response.v2.addresses
              : [];

          if (!addresses.length) {
            reject(new Error('No geocoding results found.'));
            return;
          }

          const first = addresses[0];
          const lat = parseFloat(first.y);
          const lng = parseFloat(first.x);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            reject(new Error('Invalid coordinates received.'));
            return;
          }

          resolve({ lat, lng });
        });
      });
    }

    function geocodeNext(queue) {
      if (!queue.length) {
        return Promise.reject(new Error('No geocoding results found.'));
      }

      const currentQuery = queue.shift();

      return geocode(currentQuery).catch((error) => {
        if (queue.length) {
          console.warn(`Geocoding attempt failed for query "${currentQuery}":`, error);
          return geocodeNext(queue);
        }

        throw error;
      });
    }

    geocodeNext([...geocodeQueue])
      .then(({ lat, lng }) => {
        renderMap(lat, lng);
      })
      .catch((error) => {
        console.warn('Failed to render map:', error);
        if (hasPresetCoordinates) {
          attemptStaticFallback(presetLat, presetLng);
        } else {
          setStatus(authErrorMessage || errorText, 'error');
        }
      });
  }

  const sectionNav = document.querySelector('[data-section-nav]');
  if (sectionNav) {
    const navLinks = Array.from(sectionNav.querySelectorAll('[data-section-nav-link]'));
    const indicator = sectionNav.querySelector('[data-section-nav-indicator]');
    const listHost = sectionNav.querySelector('.section-progress-nav__list');
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
      if (indicator) {
        indicator.style.width = '0px';
        indicator.classList.remove('section-progress-nav__indicator--visible');
      }
      return;
    }

    let activeIndex = -1;
    let scrollUpdateHandle = null;
    let sectionMetrics = sections.map(() => null);

    const requestFrame =
      (window.requestAnimationFrame && window.requestAnimationFrame.bind(window)) ||
      ((callback) => window.setTimeout(callback, 16));
    const cancelFrame =
      (window.cancelAnimationFrame && window.cancelAnimationFrame.bind(window)) ||
      window.clearTimeout.bind(window);

    function updateIndicator(index) {
      if (!indicator) {
        return;
      }

      if (index < 0 || index >= count) {
        indicator.style.width = '0px';
        indicator.classList.remove('section-progress-nav__indicator--visible');
        return;
      }

      const { link } = sections[index];
      const linkRect = link.getBoundingClientRect();
      const navRect = sectionNav.getBoundingClientRect();
      const width = Math.max(linkRect.width, 0);

      if (!width) {
        indicator.style.width = '0px';
        indicator.classList.remove('section-progress-nav__indicator--visible');
        return;
      }

      indicator.style.width = `${width}px`;
      indicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
      indicator.classList.add('section-progress-nav__indicator--visible');
    }

    function ensureActiveLinkVisible() {
      if (!listHost || activeIndex < 0 || activeIndex >= count) {
        return;
      }

      if (listHost.scrollWidth <= listHost.clientWidth + 1) {
        return;
      }

      const { link } = sections[activeIndex];
      const linkRect = link.getBoundingClientRect();
      const listRect = listHost.getBoundingClientRect();

      if (linkRect.left < listRect.left) {
        listHost.scrollLeft += Math.floor(linkRect.left - listRect.left - 16);
      } else if (linkRect.right > listRect.right) {
        listHost.scrollLeft += Math.ceil(linkRect.right - listRect.right + 16);
      }
    }

    function setActive(index, options = {}) {
      const { force = false } = options;

      if (index < 0 || index >= count || (!force && index === activeIndex)) {
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

      updateIndicator(index);
      ensureActiveLinkVisible();
    }

    function measureSections() {
      sectionMetrics = sections.map(({ target }) => {
        const rect = target.getBoundingClientRect();
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        return {
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
        };
      });
    }

    function getHeaderOffset() {
      const header = sectionNav.closest('.site-subheader');
      const headerHeight = header ? header.offsetHeight : 0;
      return headerHeight + 16;
    }

    function updateActiveFromScrollPosition() {
      if (!sectionMetrics.length || sectionMetrics.some((metrics) => !metrics)) {
        measureSections();
      }

      const doc = document.documentElement;
      const scrollY = window.pageYOffset || doc.scrollTop || 0;
      const docHeight = doc ? doc.scrollHeight : 0;
      const viewportBottom = scrollY + window.innerHeight;

      if (docHeight && viewportBottom >= docHeight - 2) {
        setActive(count - 1);
        return;
      }

      const activationPoint = scrollY + getHeaderOffset();
      let targetIndex = 0;

      for (let index = 0; index < count; index += 1) {
        const metrics = sectionMetrics[index];
        if (!metrics) {
          continue;
        }

        if (activationPoint >= metrics.top - 1) {
          targetIndex = index;
        } else {
          break;
        }
      }

      setActive(targetIndex);
    }

    function scheduleScrollUpdate(options = {}) {
      const { immediate = false } = options;

      if (immediate) {
        if (scrollUpdateHandle !== null) {
          cancelFrame(scrollUpdateHandle);
          scrollUpdateHandle = null;
        }
        updateActiveFromScrollPosition();
        return;
      }

      if (scrollUpdateHandle !== null) {
        return;
      }

      scrollUpdateHandle = requestFrame(() => {
        scrollUpdateHandle = null;
        updateActiveFromScrollPosition();
      });
    }

    sections.forEach((item, index) => {
      item.link.addEventListener('click', (event) => {
        event.preventDefault();
        const hash = item.link.hash;

        item.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(index);
        scheduleScrollUpdate({ immediate: true });

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
        scheduleScrollUpdate({ immediate: true });
      }
    }

    function refreshLayout() {
      measureSections();
      if (activeIndex < 0) {
        setActive(0, { force: true });
      } else {
        setActive(activeIndex, { force: true });
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('scroll', () => scheduleScrollUpdate(), { passive: true });
    window.addEventListener('resize', () => {
      refreshLayout();
      scheduleScrollUpdate({ immediate: true });
    });

    const initialHash = window.location.hash;
    refreshLayout();

    if (initialHash) {
      const initialIndex = sections.findIndex((item) => item.link.hash === initialHash);
      if (initialIndex >= 0) {
        setActive(initialIndex, { force: true });
      } else {
        setActive(0, { force: true });
      }
    } else {
      setActive(0, { force: true });
    }

    scheduleScrollUpdate({ immediate: true });
    window.setTimeout(() => {
      refreshLayout();
      scheduleScrollUpdate({ immediate: true });
    }, 250);

    window.addEventListener('load', () => {
      refreshLayout();
      scheduleScrollUpdate({ immediate: true });
    });
  }
})();
