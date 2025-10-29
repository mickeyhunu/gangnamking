(function () {
  'use strict';

  function parseJsonScriptContent(elementId) {
    var script = document.getElementById(elementId);
    if (!script) {
      return [];
    }

    try {
      var content = script.textContent || script.innerText || '[]';
      var parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.warn('Failed to parse map data:', error);
      return [];
    }
  }

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

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function normalizeQuery(query) {
    if (typeof query !== 'string') {
      return '';
    }

    return query.replace(/\s+/g, ' ').trim();
  }

  function createQueryVariants(shop, countryToken) {
    var queries = [];
    var seen = new Set();

    function enqueue(value, includeCountryVariant) {
      if (includeCountryVariant === void 0) {
        includeCountryVariant = true;
      }

      var normalized = normalizeQuery(value);
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      queries.push(normalized);

      if (includeCountryVariant) {
        var withCountry = normalized;
        if (!/대한민국|한국|South\s*Korea|Republic\s*of\s*Korea/i.test(normalized)) {
          withCountry = (normalized + ' ' + countryToken).trim();
        }

        if (withCountry && !seen.has(withCountry)) {
          seen.add(withCountry);
          queries.push(withCountry);
        }
      }
    }

    enqueue(shop.address);
    enqueue([shop.region, shop.district, shop.address].filter(Boolean).join(' '));
    enqueue([shop.address, shop.district, shop.region].filter(Boolean).join(', '));
    enqueue([shop.district, shop.region].filter(Boolean).join(' '));

    return queries;
  }

  function geocodeShop(shop, options) {
    var locale = options.locale;
    var countryToken = options.countryToken;
    var delayMs = options.delayMs;

    var queries = createQueryVariants(shop, countryToken);
    if (!queries.length) {
      return Promise.reject(new Error('No geocoding queries available.'));
    }

    var attemptIndex = 0;

    function attemptNext() {
      if (attemptIndex >= queries.length) {
        return Promise.reject(new Error('No geocoding results found.'));
      }

      var query = queries[attemptIndex];
      attemptIndex += 1;
      var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query);

      return fetch(url, {
        headers: {
          'Accept-Language': locale,
        },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Geocoding request failed with status ' + response.status);
          }
          return response.json();
        })
        .then(function (results) {
          if (!Array.isArray(results) || !results.length) {
            throw new Error('No results for query: ' + query);
          }

          var firstResult = results[0];
          var lat = parseFloat(firstResult.lat);
          var lon = parseFloat(firstResult.lon);

          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error('Invalid coordinates received for query: ' + query);
          }

          return { lat: lat, lon: lon };
        })
        .catch(function (error) {
          if (attemptIndex < queries.length) {
            console.warn('Geocoding attempt failed for query "' + query + '":', error);
            return wait(delayMs).then(attemptNext);
          }

          throw error;
        });
    }

    return attemptNext();
  }

  function initializeMap() {
    var mapHost = document.querySelector('[data-shops-map]');
    if (!mapHost) {
      return;
    }

    var mapContainer = mapHost.querySelector('[data-map-region]');
    var status = mapHost.querySelector('[data-map-status]');
    var loadingText = mapHost.dataset.loadingText || 'Loading map...';
    var errorText = mapHost.dataset.errorText || 'Unable to load map. Please check the address.';
    var linkLabel = mapHost.dataset.linkLabel || 'View details';
    var locale = mapHost.dataset.mapLocale || document.documentElement.lang || 'en';

    function setStatus(message, state) {
      if (state) {
        mapHost.dataset.mapState = state;
      } else {
        delete mapHost.dataset.mapState;
      }

      if (!status) {
        return;
      }

      if (message) {
        status.textContent = message;
        status.hidden = false;
      } else {
        status.textContent = '';
        status.hidden = true;
      }
    }

    if (!mapContainer) {
      setStatus(errorText, 'error');
      return;
    }

    if (typeof L === 'undefined') {
      console.warn('Leaflet library is not available.');
      setStatus(errorText, 'error');
      return;
    }

    var shops = parseJsonScriptContent('shop-map-data');
    if (!shops.length) {
      setStatus(errorText, 'error');
      return;
    }

    setStatus(loadingText, 'loading');

    var normalizedLocale = typeof locale === 'string' ? locale.toLowerCase() : 'en';
    var countryToken = normalizedLocale.indexOf('ko') === 0 ? '대한민국' : 'South Korea';
    var geocodeDelay = 500;
    var geocodedShops = [];
    var geocodeCache = new Map();

    function buildCacheKey(shop) {
      var parts = [];
      if (shop.address) {
        parts.push(shop.address.trim());
      }
      if (shop.district) {
        parts.push(shop.district.trim());
      }
      if (shop.region) {
        parts.push(shop.region.trim());
      }
      return parts.join('|');
    }

    var sequence = Promise.resolve();

    shops.forEach(function (shop, index) {
      sequence = sequence
        .then(function () {
          var cacheKey = buildCacheKey(shop);
          if (cacheKey && geocodeCache.has(cacheKey)) {
            geocodedShops.push({
              shop: shop,
              coords: geocodeCache.get(cacheKey),
            });
            return null;
          }

          return geocodeShop(shop, {
            locale: locale,
            countryToken: countryToken,
            delayMs: geocodeDelay,
          })
            .then(function (coords) {
              if (cacheKey) {
                geocodeCache.set(cacheKey, coords);
              }
              geocodedShops.push({
                shop: shop,
                coords: coords,
              });
            })
            .catch(function (error) {
              console.warn('Failed to geocode shop "' + shop.name + '":', error);
            });
        })
        .then(function () {
          if (index === shops.length - 1) {
            return null;
          }
          return wait(geocodeDelay);
        });
    });

    sequence
      .then(function () {
        if (!geocodedShops.length) {
          throw new Error('Unable to geocode any shop locations.');
        }

        var map = L.map(mapContainer, {
          scrollWheelZoom: false,
        });

        var bounds = [];

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        var firstMarker = null;

        geocodedShops.forEach(function (entry) {
          var lat = entry.coords.lat;
          var lon = entry.coords.lon;
          bounds.push([lat, lon]);

          var marker = L.marker([lat, lon]).addTo(map);
          if (!firstMarker) {
            firstMarker = marker;
          }
          var popupParts = [];

          if (entry.shop.name) {
            popupParts.push('<strong>' + escapeHtml(entry.shop.name) + '</strong>');
          }

          if (entry.shop.address) {
            popupParts.push(escapeHtml(entry.shop.address));
          }

          if (entry.shop.url) {
            popupParts.push(
              '<a href="' + escapeHtml(entry.shop.url) + '">' + escapeHtml(linkLabel) + '</a>'
            );
          }

          var popupContent = popupParts.join('<br />');
          if (popupContent) {
            marker.bindPopup(popupContent);
          }
        });

        if (bounds.length === 1) {
          map.setView(bounds[0], 15);
        } else if (bounds.length) {
          map.fitBounds(bounds, { padding: [32, 32] });
        }

        setStatus('', 'ready');

        window.setTimeout(function () {
          map.invalidateSize();
          if (firstMarker) {
            firstMarker.openPopup();
          }
        }, 250);
      })
      .catch(function (error) {
        console.warn('Failed to render overview map:', error);
        setStatus(errorText, 'error');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMap);
  } else {
    initializeMap();
  }
})();
