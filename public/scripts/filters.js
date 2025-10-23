(function () {
  const regionFilter = document.getElementById('region-filter');
  const districtFilter = document.getElementById('district-filter');
  const categoryFilter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('[data-grid] .shop-card');
  const searchButton = document.getElementById('search-button');
  const mappingElement = document.getElementById('region-district-data');
  const districtMap = mappingElement ? JSON.parse(mappingElement.textContent || '{}') : {};
  const areaFilterContainer = document.querySelector('[data-area-filter]');
  let areaFilterValue = 'all';

  if (areaFilterContainer) {
    const activeButton = areaFilterContainer.querySelector('.is-active[data-area-option]');
    if (activeButton && activeButton.dataset.areaOption) {
      areaFilterValue = activeButton.dataset.areaOption;
    }
  }

  function setActiveAreaOption(value) {
    if (!areaFilterContainer) {
      return;
    }

    const buttons = areaFilterContainer.querySelectorAll('[data-area-option]');
    buttons.forEach((button) => {
      if (button.dataset.areaOption === value) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
    });

    areaFilterValue = value;
  }

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
    const areaValue = areaFilterValue || 'all';

    cards.forEach((card) => {
      const matchesRegion = regionValue === 'all' || card.dataset.region === regionValue;
      const matchesDistrict = districtValue === 'all' || card.dataset.district === districtValue;
      const matchesCategory = categoryValue === 'all' || card.dataset.category === categoryValue;
      const matchesArea = areaValue === 'all' || card.dataset.areaGroup === areaValue;

      card.style.display = matchesRegion && matchesDistrict && matchesCategory && matchesArea ? 'flex' : 'none';
    });
  }

  if (regionFilter) {
    regionFilter.addEventListener('change', (event) => {
      populateDistricts(event.target.value);
      applyFilters();
    });
  }

  if (districtFilter) {
    districtFilter.addEventListener('change', applyFilters);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyFilters);
  }

  if (areaFilterContainer) {
    areaFilterContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-area-option]');

      if (!button || !areaFilterContainer.contains(button)) {
        return;
      }

      const value = button.dataset.areaOption || 'all';

      if (value === areaFilterValue) {
        return;
      }

      setActiveAreaOption(value);
      applyFilters();
    });
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
  setActiveAreaOption(areaFilterValue);
  applyFilters();
})();
