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
    const mapContainer = mapHost.querySelector('[data-map-region]');
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
    let mapInitialized = false;
    let naverRetryHandle = null;
    let naverRetryCount = 0;
    let naverReadyListenerAttached = false;
    const maxNaverRetries = 30;

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

    function scheduleNaverRetry() {
      if (mapInitialized || naverRetryHandle !== null || naverRetryCount >= maxNaverRetries) {
        return false;
      }

      naverRetryHandle = window.setTimeout(() => {
        naverRetryHandle = null;
        naverRetryCount += 1;
        initializeInteractiveMap();
      }, 200);

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
            if (window.console && typeof window.console.warn === 'function') {
              console.warn('[Shop Map] Existing onJSContentLoaded handler failed.', error);
            }
          }
        }

        if (!mapInitialized) {
          initializeInteractiveMap();
        }
      };

      naverReadyListenerAttached = true;
    }

    function handleError(message) {
      setMapState('error');

      if (message && window.console && typeof window.console.warn === 'function') {
        console.warn('[Shop Map]', message);
      }
    }

    function renderLeafletMap(lat, lng) {
      if (!hasLeaflet || !mapContainer || !Number.isFinite(lat) || !Number.isFinite(lng)) {
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

      mapInitialized = true;
      clearNaverRetry();
      setMapState('ready');
      return true;
    }

    function renderNaverMap(lat, lng) {
      const naverMaps = getNaverMaps();
      if (!naverMaps || !mapContainer || !Number.isFinite(lat) || !Number.isFinite(lng)) {
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

      mapInitialized = true;
      clearNaverRetry();
      setMapState('ready');
      return true;
    }

    function initializeInteractiveMap() {
      if (mapInitialized) {
        return;
      }

      if (!mapContainer || (!address && !hasPresetCoordinates)) {
        if (hasLeaflet && hasPresetCoordinates) {
          renderLeafletMap(presetLat, presetLng);
          return;
        }

        handleError(getErrorMessage());
        return;
      }

      attachNaverReadyListener();

      const naverMaps = getNaverMaps();

      if (!naverMaps) {
        if (hasLeaflet && hasPresetCoordinates) {
          renderLeafletMap(presetLat, presetLng);
          return;
        }

        if (scheduleNaverRetry()) {
          setMapState('loading');
          return;
        }

        handleError(getErrorMessage());
        return;
      }

      if (hasPresetCoordinates) {
        if (!renderNaverMap(presetLat, presetLng) && hasLeaflet) {
          renderLeafletMap(presetLat, presetLng);
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

        return geocode(currentQuery).catch((error) => {
          if (queue.length) {
            return geocodeNext(queue);
          }

          throw error;
        });
      }

      geocodeNext(geocodeQueue)
        .then((result) => {
          if (!renderNaverMap(result.lat, result.lng) && hasLeaflet) {
            renderLeafletMap(result.lat, result.lng);
          }
        })
        .catch((error) => {
          if (window.console && typeof window.console.warn === 'function') {
            console.warn('[Map] Failed to geocode address:', error);
          }

          if (hasLeaflet && hasPresetCoordinates) {
            renderLeafletMap(presetLat, presetLng);
          } else {
            handleError(getErrorMessage());
          }
        });
    }

    setMapState('loading');
    attachNaverReadyListener();
    initializeInteractiveMap();
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
