(function () {
  const regionFilter = document.getElementById('region-filter');
  const districtFilter = document.getElementById('district-filter');
  const categoryFilter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('[data-grid] .shop-card');
  const searchButton = document.getElementById('search-button');
  const mappingElement = document.getElementById('region-district-data');
  const cityDataElement = document.getElementById('city-district-data');
  const cityFilterContainer = document.querySelector('[data-area-filter]');
  const districtBar = document.querySelector('[data-city-district-bar]');

  let districtMap = {};
  let cityDistrictMap = {};

  if (mappingElement) {
    try {
      districtMap = JSON.parse(mappingElement.textContent || '{}');
    } catch (error) {
      districtMap = {};
    }
  }

  if (cityDataElement) {
    try {
      cityDistrictMap = JSON.parse(cityDataElement.textContent || '{}');
    } catch (error) {
      cityDistrictMap = {};
    }
  }

  const districtAllLabel = cityFilterContainer
    ? cityFilterContainer.getAttribute('data-all-label') || '전체'
    : '전체';

  let activeCity = null;
  let activeDistrict = 'all';

  function populateDistricts(region) {
    if (!districtFilter) {
      return;
    }

    const allLabel = (districtFilter.dataset && districtFilter.dataset.allLabel) || 'All';
    const options = [`<option value="all">${allLabel}</option>`];

    if (region !== 'all' && districtMap[region]) {
      districtMap[region].forEach((district) => {
        options.push(`<option value="${district}">${district}</option>`);
      });
      districtFilter.innerHTML = options.join('');
      districtFilter.disabled = false;
    } else {
      districtFilter.innerHTML = options.join('');
      districtFilter.disabled = true;
    }

    districtFilter.value = 'all';
  }

  function applyFilters() {
    const regionValue = regionFilter ? regionFilter.value : 'all';
    const districtValue = districtFilter && !districtFilter.disabled ? districtFilter.value : 'all';
    const categoryValue = categoryFilter ? categoryFilter.value : 'all';

    cards.forEach((card) => {
      const matchesRegion = regionValue === 'all' || card.dataset.region === regionValue;
      const matchesDistrict = districtValue === 'all' || card.dataset.district === districtValue;
      const matchesCategory = categoryValue === 'all' || card.dataset.category === categoryValue;

      card.style.display = matchesRegion && matchesDistrict && matchesCategory ? 'flex' : 'none';
    });
  }

  function setActiveCity(city) {
    activeCity = city;

    if (!cityFilterContainer) {
      return;
    }

    const buttons = cityFilterContainer.querySelectorAll('[data-city-option]');
    buttons.forEach((button) => {
      if (button.dataset.cityOption === city) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
    });
  }

  function renderDistrictBar(city) {
    if (!districtBar) {
      return;
    }

    districtBar.innerHTML = '';

    const districts = city ? cityDistrictMap[city] : null;

    if (!city || !Array.isArray(districts) || districts.length === 0) {
      districtBar.setAttribute('hidden', '');
      activeDistrict = 'all';
      return;
    }

    const fragment = document.createDocumentFragment();

    function createButton(label, value) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'area-filter__button area-filter__button--district';
      button.setAttribute('data-district-option', value);
      button.textContent = label;
      fragment.appendChild(button);
    }

    createButton(districtAllLabel, 'all');
    districts.forEach((district) => createButton(district, district));

    districtBar.appendChild(fragment);
    districtBar.removeAttribute('hidden');
  }

  function setActiveDistrict(value, options = {}) {
    const { syncDropdown = true } = options;

    activeDistrict = value;

    if (districtBar) {
      const buttons = districtBar.querySelectorAll('[data-district-option]');
      buttons.forEach((button) => {
        if (districtBar.hasAttribute('hidden')) {
          button.classList.remove('is-active');
          return;
        }

        if (button.dataset.districtOption === value) {
          button.classList.add('is-active');
        } else {
          button.classList.remove('is-active');
        }
      });
    }

    if (syncDropdown && districtFilter) {
      if (value === 'all' || districtFilter.disabled) {
        districtFilter.value = 'all';
      } else {
        districtFilter.value = value;
      }
    }
  }

  function activateCity(city) {
    const normalizedCity = typeof city === 'string' && city.length ? city : null;

    setActiveCity(normalizedCity);

    if (regionFilter) {
      regionFilter.value = normalizedCity || 'all';
      populateDistricts(regionFilter.value);
    }

    renderDistrictBar(normalizedCity);
    setActiveDistrict('all');
    applyFilters();
  }

  function syncCityFromRegion(regionValue) {
    const normalizedCity = regionValue === 'all' ? null : regionValue;

    setActiveCity(normalizedCity);
    renderDistrictBar(normalizedCity);

    const currentDistrict =
      districtFilter && !districtFilter.disabled ? districtFilter.value : 'all';

    setActiveDistrict(currentDistrict, { syncDropdown: false });
  }

  if (cityFilterContainer) {
    cityFilterContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-city-option]');

      if (!button || !cityFilterContainer.contains(button)) {
        return;
      }

      const value = button.dataset.cityOption || '';

      if (value === activeCity) {
        activateCity(null);
        return;
      }

      activateCity(value);
    });
  }

  if (districtBar) {
    districtBar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-district-option]');

      if (!button || districtBar.hasAttribute('hidden')) {
        return;
      }

      const value = button.dataset.districtOption || 'all';

      if (value === activeDistrict) {
        return;
      }

      setActiveDistrict(value);
      applyFilters();
    });
  }

  if (regionFilter) {
    regionFilter.addEventListener('change', (event) => {
      const value = event.target.value;
      populateDistricts(value);
      syncCityFromRegion(value);
      applyFilters();
    });
  }

  if (districtFilter) {
    districtFilter.addEventListener('change', () => {
      const value = districtFilter && !districtFilter.disabled ? districtFilter.value : 'all';
      setActiveDistrict(value, { syncDropdown: false });
      applyFilters();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyFilters);
  }

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      applyFilters();
      const grid = document.querySelector('[data-grid]');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  populateDistricts(regionFilter ? regionFilter.value : 'all');

  if (regionFilter && regionFilter.value && regionFilter.value !== 'all') {
    syncCityFromRegion(regionFilter.value);
  } else {
    setActiveCity(null);
    renderDistrictBar(null);
    setActiveDistrict('all');
  }

  applyFilters();
})();
