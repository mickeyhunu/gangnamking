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
    const venueName = mapHost.dataset.shopName || '';
    const locale = mapHost.dataset.mapLocale || document.documentElement.lang || 'en';
    const loadingText = mapHost.dataset.loadingText || 'Loading map...';
    const errorText = mapHost.dataset.errorText || 'Unable to load map.';

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

    if (!mapContainer || !address) {
      setStatus(errorText, 'error');
      return;
    }

    if (status) {
      status.hidden = false;
    }

    setStatus(loadingText, 'loading');

    if (typeof L === 'undefined') {
      console.warn('Leaflet library is not available.');
      setStatus(errorText, 'error');
      return;
    }

    const query = encodeURIComponent(address);

    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`, {
      headers: {
        'Accept-Language': locale,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Geocoding request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((results) => {
        if (!Array.isArray(results) || !results.length) {
          throw new Error('No geocoding results found.');
        }

        const [firstResult] = results;
        const lat = parseFloat(firstResult.lat);
        const lon = parseFloat(firstResult.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          throw new Error('Invalid coordinates received.');
        }

        const map = L.map(mapContainer, {
          scrollWheelZoom: false,
        }).setView([lat, lon], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const marker = L.marker([lat, lon]).addTo(map);

        if (venueName) {
          marker.bindPopup(venueName);
        }

        setStatus('', 'ready');

        window.setTimeout(() => {
          map.invalidateSize();
          if (venueName) {
            marker.openPopup();
          }
        }, 250);
      })
      .catch((error) => {
        console.warn('Failed to render map:', error);
        setStatus(errorText, 'error');
      });
  }
})();
