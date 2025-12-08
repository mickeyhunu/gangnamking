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
      const loadingText = section.dataset.entryLoadingText || '불러오는 중입니다 ..';
      const errorText = section.dataset.entryErrorText || '';
      const scoreLabel = section.dataset.entryTopScoreLabel || '';
      const locale = section.dataset.entryLocale || 'ko';
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
          return;
        }

        if (totalNode) {
          const total = Number(summary.totalCount);
          totalNode.textContent = numberFormatter.format(
            Number.isFinite(total) ? total : 0
          );
        }

        const hasWorkers = renderWorkerRows(summary.workerRows);
        if (workerEmpty) {
          workerEmpty.hidden = hasWorkers;
          if (!hasWorkers) {
            workerEmpty.textContent = workerEmptyDefault;
          }
        }

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
      }

      function showLoading() {
        setWorkerMessage(loadingText || workerEmptyDefault);
        setTopMessage(loadingText || topEmptyDefault);
        if (workerList) {
          workerList.hidden = true;
        }
        if (topList) {
          topList.hidden = true;
        }
      }

      async function fetchEntries(options = {}) {
        const { showLoading: shouldShowLoading = true } = options;

        if (shouldShowLoading) {
          showLoading();
        }
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

      const activationDelayMs = 3000;
      showLoading();
      window.setTimeout(() => {
        if (prefillSummary) {
          applySummary(prefillSummary);

          if (!isPrefilled) {
            fetchEntries({ showLoading: false });
          }
          return;
        }

        if (!isPrefilled) {
          fetchEntries();
        }
      }, activationDelayMs);
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
    let mapContainer = mapHost.querySelector('[data-map-region]');
    const address = (mapHost.dataset.shopAddress || '').trim();
    const district = (mapHost.dataset.shopDistrict || '').trim();
    const region = (mapHost.dataset.shopRegion || '').trim();
    const venueName = mapHost.dataset.shopName || '';
    const shopId = (mapHost.dataset.shopId || '').trim();
    const defaultErrorMessage = 'Unable to load map. Please check the address.';
    const latValue = mapHost.dataset.shopLat;
    const lngValue = mapHost.dataset.shopLng;
    const authErrorMessage = (mapHost.dataset.mapAuthError || '').trim();
    const mapLocale = (mapHost.dataset.mapLocale || '').trim();
    const presetLat =
      typeof latValue === 'string' && latValue.trim() !== '' ? Number.parseFloat(latValue) : NaN;
    const presetLng =
      typeof lngValue === 'string' && lngValue.trim() !== '' ? Number.parseFloat(lngValue) : NaN;
    const hasPresetCoordinates = Number.isFinite(presetLat) && Number.isFinite(presetLng);
    const hasLeaflet = Boolean(window.L && typeof window.L.map === 'function');
    let mapInitialized = false;
    let naverRetryHandle = null;
    let naverRetryCount = 0;
    let naverReadyListenerAttached = false;
    let mapRequestStartTime = null;
    let geocodeRequestStartTime = null;
    let currentMapAttempt = 0;
    const maxNaverRetries = 30;
    const staleAttemptErrorMessage = 'Map load cancelled due to a newer request.';
    let activeNaverMap = null;
    let activeLeafletMap = null;

    function now() {
      if (window.performance && typeof window.performance.now === 'function') {
        return window.performance.now();
      }

      return Date.now();
    }

    function logTiming(message) {
      if (window.console && typeof window.console.log === 'function') {
        window.console.log('[Shop Map]', message);
      }
    }

    function warn(message, error) {
      if (window.console && typeof window.console.warn === 'function') {
        if (typeof error !== 'undefined') {
          window.console.warn('[Shop Map]', message, error);
        } else {
          window.console.warn('[Shop Map]', message);
        }
      }
    }

    function beginMapRequest(reason) {
      if (mapRequestStartTime === null) {
        mapRequestStartTime = now();
        logTiming(`Map request started${reason ? ` (${reason})` : ''}.`);
      } else if (reason) {
        logTiming(`Continuing map request${reason ? ` (${reason})` : ''}.`);
      }
    }

    function logMapReady(source) {
      if (mapRequestStartTime === null) {
        logTiming(`Map ready via ${source}.`);
        return;
      }

      const elapsed = Math.round(now() - mapRequestStartTime);
      logTiming(`Map ready via ${source} in ${elapsed}ms.`);
      mapRequestStartTime = null;
    }

    function startGeocodeTiming(query) {
      geocodeRequestStartTime = now();
      logTiming(`Geocode requested for "${query}".`);
    }

    function finishGeocodeTiming(query, success) {
      if (geocodeRequestStartTime === null) {
        return;
      }

      const elapsed = Math.round(now() - geocodeRequestStartTime);
      geocodeRequestStartTime = null;

      if (typeof success !== 'boolean') {
        return;
      }

      logTiming(`Geocode ${success ? 'succeeded' : 'failed'} in ${elapsed}ms for "${query}".`);
    }

    function clamp(value, min, max) {
      if (!Number.isFinite(value)) {
        return value;
      }

      if (value < min) {
        return min;
      }

      if (value > max) {
        return max;
      }

      return value;
    }

    function isStaleAttempt(attemptId) {
      return typeof attemptId === 'number' && attemptId !== currentMapAttempt;
    }

    function finalizeMapReady(source) {
      logMapReady(source);
    }

    function startMapInitialization(reason) {
      currentMapAttempt += 1;
      mapRequestStartTime = null;
      geocodeRequestStartTime = null;
      initializeInteractiveMap(reason, { attemptId: currentMapAttempt, newAttempt: true });
    }

    function getNaverMaps() {
      const maps = window.naver && window.naver.maps;
      if (!maps || !maps.Service || !maps.LatLng) {
        return null;
      }

      return maps;
    }

    function getErrorMessage() {
      return authErrorMessage || defaultErrorMessage;
    }

    function setMapState(state) {
      if (state) {
        mapHost.dataset.mapState = state;
      } else {
        delete mapHost.dataset.mapState;
      }
    }

    function createStaticMarkerElement(labelText) {
      const marker = document.createElement('div');
      marker.className = 'shop-map__static-marker';
      marker.setAttribute('aria-hidden', 'true');

      if (typeof labelText === 'string' && labelText.trim()) {
        const label = document.createElement('span');
        label.className = 'shop-map__static-marker-label';
        label.textContent = labelText.trim();
        marker.appendChild(label);
      }

      const pin = document.createElement('span');
      pin.className = 'shop-map__static-marker-pin';

      const pinCore = document.createElement('span');
      pinCore.className = 'shop-map__static-marker-pin-core';
      pin.appendChild(pinCore);

      marker.appendChild(pin);

      return marker;
    }

    function clearStaticMapArtifacts() {
      if (!mapContainer) {
        return;
      }

      const staticElements = mapContainer.querySelectorAll(
        '.shop-map__static-image, .shop-map__static-marker',
      );

      staticElements.forEach((element) => {
        if (element && typeof element.remove === 'function') {
          element.remove();
        }
      });
    }

    function clearNaverRetry() {
      if (naverRetryHandle !== null) {
        window.clearTimeout(naverRetryHandle);
        naverRetryHandle = null;
      }
    }

    function destroyActiveMaps() {
      if (activeLeafletMap && typeof activeLeafletMap.remove === 'function') {
        try {
          activeLeafletMap.remove();
        } catch (error) {
          warn('Failed to remove existing Leaflet map instance.', error);
        }
      }
      activeLeafletMap = null;

      if (activeNaverMap) {
        if (typeof activeNaverMap.destroy === 'function') {
          try {
            activeNaverMap.destroy();
          } catch (error) {
            warn('Failed to destroy existing Naver map instance.', error);
          }
        } else if (typeof activeNaverMap.setMap === 'function') {
          try {
            activeNaverMap.setMap(null);
          } catch (error) {
            warn('Failed to detach existing Naver map instance.', error);
          }
        }
      }
      activeNaverMap = null;
    }

    function resetMapContainer() {
      if (!mapContainer) {
        return;
      }

      const parent = mapContainer.parentNode;

      if (parent) {
        const replacement = mapContainer.cloneNode(false);
        parent.replaceChild(replacement, mapContainer);
        mapContainer = replacement;
      } else {
        mapContainer.innerHTML = '';
      }
    }

    function scheduleNaverRetry() {
      if (mapInitialized || naverRetryHandle !== null || naverRetryCount >= maxNaverRetries) {
        return false;
      }

      const attemptId = currentMapAttempt;

      naverRetryHandle = window.setTimeout(() => {
        naverRetryHandle = null;
        naverRetryCount += 1;
        initializeInteractiveMap('naver retry', { attemptId });
      }, 200);

      logTiming(`Waiting for Naver Maps to become available (attempt ${naverRetryCount + 1} of ${maxNaverRetries}).`);
      return true;
    }

    function attachNaverReadyListener() {
      if (naverReadyListenerAttached) {
        return;
      }

      const naverGlobal = window.naver && window.naver.maps;

      if (!naverGlobal || typeof naverGlobal !== 'object') {
        return;
      }

      const existingHandler =
        typeof naverGlobal.onJSContentLoaded === 'function' ? naverGlobal.onJSContentLoaded : null;

      naverGlobal.onJSContentLoaded = function onJSContentLoadedWrapper() {
        if (typeof existingHandler === 'function') {
          try {
            existingHandler();
          } catch (error) {
            warn('Existing onJSContentLoaded handler failed.', error);
          }
        }

        if (!mapInitialized) {
          initializeInteractiveMap('naver script ready');
        }
      };

      naverReadyListenerAttached = true;
    }

    function handleError(message) {

      setMapState('error');

      if (message) {
        warn(message);
      }

    }

    function buildStaticMapRequestUrl({ lat, lng, width, height, zoom, scale }) {
      if (!shopId) {
        return '';
      }

      if (typeof URLSearchParams !== 'function') {
        return '';
      }

      const params = new URLSearchParams();
      if (Number.isFinite(lat)) {
        params.set('lat', lat.toFixed(6));
      }
      if (Number.isFinite(lng)) {
        params.set('lng', lng.toFixed(6));
      }
      if (Number.isFinite(width)) {
        params.set('w', String(Math.round(width)));
      }
      if (Number.isFinite(height)) {
        params.set('h', String(Math.round(height)));
      }
      if (Number.isFinite(zoom)) {
        params.set('zoom', String(Math.round(zoom)));
      }
      if (Number.isFinite(scale)) {
        params.set('scale', String(Math.round(scale)));
      }
      if (mapLocale) {
        params.set('lang', mapLocale);
      }

      const encodedId = encodeURIComponent(shopId);
      return `/shops/${encodedId}/map/static?${params.toString()}`;
    }

    function renderStaticFallbackMap(lat, lng, options) {
      if (!mapContainer || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return false;
      }

      const settings = options || {};
      const attemptId =
        typeof settings.attemptId === 'number' ? settings.attemptId : currentMapAttempt;
      const persistent = settings.persistent === true;
      const markReady = settings.markReady !== false && !persistent;

      if (isStaleAttempt(attemptId)) {
        logTiming('Ignoring static map render request for a stale attempt.');
        return false;
      }

      const normalizedLat = clamp(lat, -85, 85);
      const normalizedLng = clamp(lng, -180, 180);
      const zoom = clamp(Number.parseInt(settings.zoom, 10) || 16, 0, 18);
      const measuredWidth = Math.round(settings.width || mapContainer.clientWidth || mapContainer.offsetWidth || 0);
      const measuredHeight = Math.round(settings.height || mapContainer.clientHeight || mapContainer.offsetHeight || 0);
      const width = clamp(measuredWidth || 600, 200, 1024);
      const height = clamp(measuredHeight || 360, 200, 1024);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scale = clamp(Math.round(devicePixelRatio), 1, 2);
      const staticUrl = buildStaticMapRequestUrl({
        lat: normalizedLat,
        lng: normalizedLng,
        width,
        height,
        zoom,
        scale,
      });

      if (!staticUrl) {
        warn('Unable to determine static map URL for this shop.');
        return false;
      }

      mapContainer.innerHTML = '';

      const image = document.createElement('img');
      image.className = 'shop-map__static-image';
      image.alt = venueName ? `${venueName} location map` : 'Shop location map';
      image.decoding = 'async';
      image.loading = 'lazy';
      image.src = staticUrl;
      image.width = width;
      image.height = height;

      if (scale > 1) {
        const retinaUrl = buildStaticMapRequestUrl({
          lat: normalizedLat,
          lng: normalizedLng,
          width,
          height,
          zoom,
          scale: 2,
        });

        if (retinaUrl) {
          image.srcset = `${retinaUrl} 2x`;
        }
      }

      image.addEventListener('error', () => {
        if (persistent) {
          warn('Failed to load static fallback map preview.');
          return;
        }

        handleError(getErrorMessage());
      });

      mapContainer.appendChild(image);
      mapContainer.appendChild(createStaticMarkerElement(venueName));
      setMapState('static');

      if (markReady) {
        mapInitialized = true;
        finalizeMapReady('Static map');
      }

      return true;
    }

    function renderLeafletMap(lat, lng, attemptId) {
      if (!hasLeaflet || !mapContainer || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return false;
      }

      if (isStaleAttempt(attemptId)) {
        logTiming('Ignoring Leaflet render request for a stale attempt.');
        return false;
      }

      clearStaticMapArtifacts();
      mapContainer.innerHTML = '';

      const map = window.L.map(mapContainer, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = window.L.marker([lat, lng]).addTo(map);

      if (venueName) {
        marker.bindPopup(venueName).openPopup();
      }

      activeLeafletMap = map;
      mapInitialized = true;
      clearNaverRetry();
      setMapState('ready');
      finalizeMapReady('Leaflet');
      return true;
    }

    function renderNaverMap(lat, lng, attemptId) {
      const naverMaps = getNaverMaps();
      if (!naverMaps || !mapContainer || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return false;
      }

      if (isStaleAttempt(attemptId)) {
        logTiming('Ignoring Naver map render request for a stale attempt.');
        return false;
      }

      clearStaticMapArtifacts();
      mapContainer.innerHTML = '';

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

      activeNaverMap = map;
      mapInitialized = true;
      clearNaverRetry();
      setMapState('ready');
      finalizeMapReady('Naver Maps');
      return true;
    }

    function initializeInteractiveMap(triggerReason, options) {
      const settings = options || {};
      const attemptId =
        typeof settings.attemptId === 'number' ? settings.attemptId : currentMapAttempt;

      if (settings.newAttempt === true && attemptId !== currentMapAttempt) {
        currentMapAttempt = attemptId;
      }

      if (attemptId !== currentMapAttempt) {
        logTiming('Skipping map initialization for a stale attempt.');
        return;
      }

      if (mapInitialized) {
        return;
      }

      if (!mapContainer || (!address && !hasPresetCoordinates)) {
        if (hasLeaflet && hasPresetCoordinates) {
          renderLeafletMap(presetLat, presetLng, attemptId);
          return;
        }

        if (hasPresetCoordinates && renderStaticFallbackMap(presetLat, presetLng, { attemptId })) {
          return;
        }

        handleError(getErrorMessage());
        return;
      }

      beginMapRequest(triggerReason || 'initial load');
      attachNaverReadyListener();

      const naverMaps = getNaverMaps();

      if (!naverMaps) {
        if (hasLeaflet && hasPresetCoordinates) {
          renderLeafletMap(presetLat, presetLng, attemptId);
          return;
        }

        const renderedStaticFallback =
          hasPresetCoordinates &&
          renderStaticFallbackMap(presetLat, presetLng, {
            attemptId,
            markReady: false,
          });

        if (scheduleNaverRetry()) {
          if (!renderedStaticFallback) {
            setMapState('loading');
          }
          return;
        }

        if (renderedStaticFallback) {
          return;
        }

        handleError(getErrorMessage());
        return;
      }

      if (hasPresetCoordinates) {
        if (!renderNaverMap(presetLat, presetLng, attemptId)) {
          if (hasLeaflet && renderLeafletMap(presetLat, presetLng, attemptId)) {
            return;
          }

          if (renderStaticFallbackMap(presetLat, presetLng, { attemptId })) {
            return;
          }
        }
        return;
      }

      setMapState('loading');

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
        logTiming('No valid address queries available for geocoding.');
        handleError(getErrorMessage());
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
        startGeocodeTiming(currentQuery);

        if (isStaleAttempt(attemptId)) {
          return Promise.reject(new Error(staleAttemptErrorMessage));
        }

        return geocode(currentQuery)
          .then((result) => {
            finishGeocodeTiming(currentQuery, true);
            return result;
          })
          .catch((error) => {
            const isStaleError = Boolean(error && error.message === staleAttemptErrorMessage);
            finishGeocodeTiming(currentQuery, isStaleError ? undefined : false);

            if (isStaleError) {
              throw error;
            }

            if (queue.length) {
              logTiming('Geocoding failed, retrying with an alternate query.');
              return geocodeNext(queue);
            }

            throw error;
          });
      }

      geocodeNext(geocodeQueue)
        .then((result) => {
          if (!renderNaverMap(result.lat, result.lng, attemptId)) {
            if (hasLeaflet && renderLeafletMap(result.lat, result.lng, attemptId)) {
              return;
            }

            renderStaticFallbackMap(result.lat, result.lng, { attemptId });
          }
        })
        .catch((error) => {
          if (error && error.message === staleAttemptErrorMessage) {
            logTiming('Geocoding cancelled because a newer map request started.');
            return;
          }

          warn('Failed to geocode address.', error);

          if (hasLeaflet && hasPresetCoordinates) {
            renderLeafletMap(presetLat, presetLng, attemptId);
            return;
          }

          if (hasPresetCoordinates && renderStaticFallbackMap(presetLat, presetLng, { attemptId })) {
            return;
          }

          handleError(getErrorMessage());
        });
    }

    const hasInitialStaticMap =
      hasPresetCoordinates &&
      renderStaticFallbackMap(presetLat, presetLng, {
        attemptId: currentMapAttempt,
        persistent: true,
        markReady: false,
      });

    if (!hasInitialStaticMap) {
      setMapState('loading');
    }
    attachNaverReadyListener();
    startMapInitialization('initial load');
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
