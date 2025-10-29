(function () {
  const regionFilter = document.getElementById('region-filter');
  const districtFilter = document.getElementById('district-filter');
  const categoryFilter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('[data-grid] .shop-card');
  const categorySections = document.querySelectorAll('[data-category-section]');
  const searchButton = document.getElementById('search-button');
  const mappingElement = document.getElementById('region-district-data');
  const cityDataElement = document.getElementById('city-district-data');
  const cityFilterContainer = document.querySelector('[data-area-filter]');
  const districtBar = document.querySelector('[data-city-district-bar]');
  const initialStateElement = document.getElementById('initial-filter-state');

  function normalizeStateValue(value) {
    if (typeof value !== 'string') {
      return 'all';
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : 'all';
  }

  let initialState = { region: 'all', district: 'all', category: 'all' };

  if (initialStateElement) {
    try {
      const parsed = JSON.parse(initialStateElement.textContent || '{}');

      if (parsed && typeof parsed === 'object') {
        initialState = {
          ...initialState,
          ...parsed,
        };
      }
    } catch (error) {
      initialState = { region: 'all', district: 'all', category: 'all' };
    }
  }

  const initialRegion = normalizeStateValue(initialState.region);
  const initialDistrict = normalizeStateValue(initialState.district);
  const initialCategory = normalizeStateValue(initialState.category);

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

  let activeCity = initialRegion === 'all' ? null : initialRegion;
  let activeDistrict = initialDistrict;

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

  let lastSelectionSignature = '';

  function updateCategoryFilterOptions(availableCategories, currentValue) {
    if (!categoryFilter) {
      return currentValue;
    }

    const normalizedCurrent = normalizeStateValue(currentValue);
    let hasCurrent = normalizedCurrent === 'all';

    const options = Array.from(categoryFilter.options || []);

    options.forEach((option) => {
      const optionValue = option.value || '';

      if (!optionValue || optionValue === 'all') {
        option.hidden = false;
        option.disabled = false;
        return;
      }

      const isAvailable = availableCategories.has(optionValue);
      option.hidden = !isAvailable;
      option.disabled = !isAvailable;

      if (optionValue === normalizedCurrent) {
        hasCurrent = isAvailable;
      }
    });

    if (!hasCurrent) {
      categoryFilter.value = 'all';
      return 'all';
    }

    return normalizedCurrent;
  }

  function notifySelectionChange(regionValue, districtValue, categoryValue) {
    const signature = `${regionValue}|${districtValue}|${categoryValue}`;

    if (signature === lastSelectionSignature) {
      return;
    }

    lastSelectionSignature = signature;

    let labelText = '';

    if (regionValue === 'all' && districtValue === 'all') {
      labelText = '';
    } else if (districtValue === 'all') {
      labelText = regionValue;
    } else if (regionValue === 'all') {
      labelText = districtValue;
    } else {
      labelText = `${regionValue} · ${districtValue}`;
    }

    document.dispatchEvent(
      new CustomEvent('filters:selectionChange', {
        detail: {
          region: regionValue,
          district: districtValue,
          category: categoryValue,
          label: labelText,
        },
      })
    );
  }

  function applyFilters() {
    const regionValue =
      typeof activeCity === 'string' && activeCity.length
        ? activeCity
        : regionFilter
        ? normalizeStateValue(regionFilter.value)
        : 'all';
    const districtValue = normalizeStateValue(activeDistrict);
    const rawCategoryValue = categoryFilter ? normalizeStateValue(categoryFilter.value) : 'all';

    const sectionVisibility = new Map();
    const availableCategories = new Set();
    const cardStates = Array.from(cards || [], (card) => {
      const dataset = card.dataset || {};
      const category = dataset.category || '';
      const matchesRegion = regionValue === 'all' || dataset.region === regionValue;
      const matchesDistrict = districtValue === 'all' || dataset.district === districtValue;

      if (matchesRegion && matchesDistrict && category) {
        availableCategories.add(category);
      }

      return {
        card,
        category,
        matchesRegion,
        matchesDistrict,
      };
    });

    const categoryValue = updateCategoryFilterOptions(availableCategories, rawCategoryValue);

    cardStates.forEach((state) => {
      const matchesCategory = categoryValue === 'all' || state.category === categoryValue;
      const isVisible = state.matchesRegion && state.matchesDistrict && matchesCategory;
      state.card.style.display = isVisible ? 'flex' : 'none';

      const section = state.card.closest('[data-category-section]');
      if (section) {
        if (!sectionVisibility.has(section)) {
          sectionVisibility.set(section, false);
        }

        if (isVisible) {
          sectionVisibility.set(section, true);
        }
      }
    });

    categorySections.forEach((section) => {
      const shouldShow = Boolean(sectionVisibility.get(section));
      section.hidden = !shouldShow;
    });

    notifySelectionChange(regionValue, districtValue, categoryValue);
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

  function activateCity(city, options = {}) {
    const { apply = true, keepDistrict = false } = options;
    const normalizedCity = typeof city === 'string' && city.length ? city : null;

    setActiveCity(normalizedCity);

    if (regionFilter) {
      regionFilter.value = normalizedCity || 'all';
      populateDistricts(regionFilter.value);
    }

    renderDistrictBar(normalizedCity);

    if (!keepDistrict) {
      setActiveDistrict('all');
    }

    if (apply) {
      applyFilters();
    }
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

  document.addEventListener('areaMenu:select', (event) => {
    const detail = event.detail || {};
    const region = typeof detail.region === 'string' && detail.region.length ? detail.region : 'all';
    const district = typeof detail.district === 'string' && detail.district.length ? detail.district : 'all';

    if (regionFilter) {
      regionFilter.value = region === 'all' ? 'all' : region;
      populateDistricts(regionFilter.value);
    }

    if (region === 'all') {
      activateCity(null, { apply: false });
    } else {
      activateCity(region, { apply: false, keepDistrict: true });
    }

    if (districtFilter) {
      if (district === 'all' || districtFilter.disabled) {
        districtFilter.value = 'all';
      } else {
        const exists = Array.from(districtFilter.options).some((option) => option.value === district);
        if (!exists) {
          const option = document.createElement('option');
          option.value = district;
          option.textContent = district;
          districtFilter.appendChild(option);
        }
        districtFilter.value = district;
      }
    }

    setActiveDistrict(district, { syncDropdown: false });
    applyFilters();
  });

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      applyFilters();
      const firstVisibleSection = Array.from(categorySections || []).find(
        (section) => !section.hasAttribute('hidden')
      );
      const grid = firstVisibleSection
        ? firstVisibleSection.querySelector('[data-grid]')
        : document.querySelector('[data-grid]');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  const normalizedInitialRegion =
    activeCity || (regionFilter ? normalizeStateValue(regionFilter.value) : 'all');

  if (regionFilter) {
    regionFilter.value = normalizedInitialRegion || 'all';
  }

  populateDistricts(normalizedInitialRegion || 'all');

  if (activeCity) {
    activateCity(activeCity, { apply: false, keepDistrict: true });
  } else if (regionFilter && regionFilter.value && regionFilter.value !== 'all') {
    syncCityFromRegion(regionFilter.value);
  } else {
    setActiveCity(null);
    renderDistrictBar(null);
  }

  const normalizedInitialDistrict = normalizeStateValue(activeDistrict);

  if (normalizedInitialDistrict !== 'all') {
    if (districtFilter) {
      const hasOption = Array.from(districtFilter.options || []).some(
        (option) => option.value === normalizedInitialDistrict
      );

      if (!hasOption) {
        const option = document.createElement('option');
        option.value = normalizedInitialDistrict;
        option.textContent = normalizedInitialDistrict;
        districtFilter.appendChild(option);
      }
    }

    setActiveDistrict(normalizedInitialDistrict);
  } else {
    setActiveDistrict('all');
  }

  if (categoryFilter) {
    const normalizedInitialCategory = normalizeStateValue(initialCategory);
    const hasCategoryOption = Array.from(categoryFilter.options || []).some(
      (option) => option.value === normalizedInitialCategory
    );

    if (normalizedInitialCategory !== 'all' && hasCategoryOption) {
      categoryFilter.value = normalizedInitialCategory;
    } else {
      categoryFilter.value = 'all';
    }
  }

  applyFilters();
})();
