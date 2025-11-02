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
    const defaultErrorMessage = 'Unable to load map. Please check the address.';
    const latValue = mapHost.dataset.shopLat;
    const lngValue = mapHost.dataset.shopLng;
    const authErrorMessage = (mapHost.dataset.mapAuthError || '').trim();
    const presetLat =
      typeof latValue === 'string' && latValue.trim() !== '' ? Number.parseFloat(latValue) : NaN;
    const presetLng =
      typeof lngValue === 'string' && lngValue.trim() !== '' ? Number.parseFloat(lngValue) : NaN;
    const hasPresetCoordinates = Number.isFinite(presetLat) && Number.isFinite(presetLng);
    const hasLeaflet = Boolean(window.L && typeof window.L.map === 'function');
    const reloadButton = mapHost.querySelector('[data-map-reload]');
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

    if (reloadButton) {
      reloadButton.hidden = true;
      reloadButton.disabled = true;
      reloadButton.addEventListener('click', (event) => {
        event.preventDefault();
        logTiming('Manual reload requested by user.');
        triggerMapReload(true);
      });
    }

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

    function toggleReloadButton(show) {
      if (!reloadButton) {
        return;
      }

      reloadButton.hidden = !show;
      reloadButton.disabled = !show;
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
      toggleReloadButton(false);
      logMapReady(source);
    }

    function triggerMapReload(isManual) {
      if (!mapContainer) {
        warn('Reload requested but map container is unavailable.');
        return;
      }

      const reloadReason = isManual ? 'manual reload' : 'programmatic reload';
      logTiming(`Reloading map (${reloadReason}).`);
      mapInitialized = false;
      naverRetryCount = 0;
      clearNaverRetry();
      destroyActiveMaps();
      resetMapContainer();
      setMapState('loading');
      toggleReloadButton(false);
      startMapInitialization(reloadReason);
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

    function handleError(message, options) {
      const settings = options || {};
      const allowReload = settings.allowReload !== false;
      const reason = typeof settings.reason === 'string' ? settings.reason : '';

      setMapState('error');

      if (message) {
        warn(message);
      }

      if (allowReload) {
        toggleReloadButton(true);
      } else {
        toggleReloadButton(false);
      }
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
      const markerColor = typeof settings.markerColor === 'string' && settings.markerColor.trim()
        ? settings.markerColor.trim()
        : 'lightblue1';
      const staticUrl =
        `https://staticmap.openstreetmap.de/staticmap.php?center=${normalizedLat},${normalizedLng}` +
        `&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${normalizedLat},${normalizedLng},${markerColor}`;

      mapContainer.innerHTML = '';

      const image = document.createElement('img');
      image.className = 'shop-map__static-image';
      image.alt = venueName ? `${venueName} location map` : 'Shop location map';
      image.decoding = 'async';
      image.loading = 'lazy';
      image.src = staticUrl;

      image.addEventListener('error', () => {
        if (persistent) {
          warn('Failed to load static fallback map preview.');
          return;
        }

        handleError(getErrorMessage(), { reason: 'static-map-error' });
      });

      mapContainer.appendChild(image);
      setMapState('static');

      if (markReady) {
        mapInitialized = true;
        toggleReloadButton(false);
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

        handleError(getErrorMessage(), { allowReload: false, reason: 'missing-map-data' });
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

        if (hasPresetCoordinates && renderStaticFallbackMap(presetLat, presetLng, { attemptId })) {
          return;
        }

        if (scheduleNaverRetry()) {
          setMapState('loading');
          return;
        }

        handleError(getErrorMessage(), { reason: 'naver-unavailable' });
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
        handleError(getErrorMessage(), { allowReload: false, reason: 'empty-geocode-queue' });
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

          handleError(getErrorMessage(), { reason: 'geocode-failed' });
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
