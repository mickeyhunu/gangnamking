(function () {
  const regionFilter = document.getElementById('region-filter');
  const districtFilter = document.getElementById('district-filter');
  const categoryFilter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('[data-grid] .shop-card');
  const areaFilterButtons = document.querySelectorAll('[data-area-filter]');
  const searchButton = document.getElementById('search-button');
  const grid = document.querySelector('[data-grid]');
  const mappingElement = document.getElementById('region-district-data');
  const districtMap = mappingElement ? JSON.parse(mappingElement.textContent || '{}') : {};
  let activeAreaFilter = 'all';

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
      const cardAreaGroups = (card.dataset.areaGroups || '').split(/\s+/).filter(Boolean);
      const matchesArea = activeAreaFilter === 'all' || cardAreaGroups.includes(activeAreaFilter);
      const matchesRegion = regionValue === 'all' || card.dataset.region === regionValue;
      const matchesDistrict = districtValue === 'all' || card.dataset.district === districtValue;
      const matchesCategory = categoryValue === 'all' || card.dataset.category === categoryValue;

      card.style.display = matchesArea && matchesRegion && matchesDistrict && matchesCategory ? 'flex' : 'none';
    });
  }

  function setActiveAreaFilter(value) {
    activeAreaFilter = value || 'all';

    areaFilterButtons.forEach((button) => {
      const isActive = button.dataset.areaFilter === activeAreaFilter;

      if (isActive) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
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

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      applyFilters();
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (areaFilterButtons.length) {
    const initialActiveButton = Array.from(areaFilterButtons).find((button) => button.classList.contains('is-active'));

    if (initialActiveButton) {
      activeAreaFilter = initialActiveButton.dataset.areaFilter || 'all';
    }

    setActiveAreaFilter(activeAreaFilter);

    areaFilterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.areaFilter || 'all';
        setActiveAreaFilter(value);

        if (regionFilter) {
          regionFilter.value = 'all';
        }

        if (districtFilter) {
          populateDistricts('all');
        }

        if (categoryFilter) {
          categoryFilter.value = 'all';
        }

        applyFilters();

        if (grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  populateDistricts(regionFilter ? regionFilter.value : 'all');
  applyFilters();
})();
