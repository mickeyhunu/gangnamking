(function () {
  const areaFilter = document.getElementById('area-filter');
  const categoryFilter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('[data-grid] .shop-card');
  const searchButton = document.getElementById('search-button');

  function applyFilters() {
    const areaValue = areaFilter ? areaFilter.value : 'all';
    const categoryValue = categoryFilter ? categoryFilter.value : 'all';

    cards.forEach((card) => {
      const isAreaMatch = areaValue === 'all' || card.dataset.area === areaValue;
      const isCategoryMatch =
        categoryValue === 'all' || card.dataset.category === categoryValue;
      card.style.display = isAreaMatch && isCategoryMatch ? 'flex' : 'none';
    });
  }

  if (areaFilter) {
    areaFilter.addEventListener('change', applyFilters);
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
})();
