(function () {
  const regionFilter = document.getElementById('region-filter');
  const districtFilter = document.getElementById('district-filter');
  const categoryFilter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('[data-grid] .shop-card');
  const searchButton = document.getElementById('search-button');
  const mappingElement = document.getElementById('region-district-data');
  const districtMap = mappingElement ? JSON.parse(mappingElement.textContent || '{}') : {};

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
      const grid = document.querySelector('[data-grid]');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  populateDistricts(regionFilter ? regionFilter.value : 'all');
})();
