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
    const presetLat =
      typeof latValue === 'string' && latValue.trim() !== '' ? Number.parseFloat(latValue) : NaN;
    const presetLng =
      typeof lngValue === 'string' && lngValue.trim() !== '' ? Number.parseFloat(lngValue) : NaN;
    const hasPresetCoordinates = Number.isFinite(presetLat) && Number.isFinite(presetLng);

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
      setStatus(authErrorMessage || errorText, 'error');
      return;
    }

    function renderMap(lat, lng) {
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
        setStatus(authErrorMessage || errorText, 'error');
      });
  }
})();
