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

  let lastSelectionSignature = '';

  function updateCategoryFilterOptions(availableCategories, currentValue) {
    if (!categoryFilter) {
      return currentValue;
    }

    const normalizedCurrent =
      typeof currentValue === 'string' && currentValue.length ? currentValue : 'all';
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
        ? regionFilter.value
        : 'all';
    const districtValue =
      typeof activeDistrict === 'string' && activeDistrict.length
        ? activeDistrict
        : 'all';
    const rawCategoryValue = categoryFilter ? categoryFilter.value : 'all';

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

      if (shouldShow) {
        section.hidden = false;
        section.classList.remove('shop-category--hidden');
        section.setAttribute('aria-hidden', 'false');
        section.style.removeProperty('display');
      } else {
        section.hidden = true;
        section.classList.add('shop-category--hidden');
        section.setAttribute('aria-hidden', 'true');
        section.style.display = 'none';
      }
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
