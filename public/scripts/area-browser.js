(function () {
  const mappingElement = document.getElementById('area-hierarchy-data');
  const browserRoot = document.querySelector('[data-area-browser]');

  if (!mappingElement || !browserRoot) {
    return;
  }

  let areaHierarchy = {};

  try {
    areaHierarchy = JSON.parse(mappingElement.textContent || '{}');
  } catch (error) {
    console.error('Failed to parse area hierarchy data', error);
    return;
  }

  const emptyMessage = browserRoot.getAttribute('data-empty-message') || '';
  const regionButtons = Array.from(browserRoot.querySelectorAll('[data-area-region]'));
  const districtContainer = browserRoot.querySelector('[data-area-browser-districts]');

  if (!districtContainer) {
    return;
  }

  const clearContainer = () => {
    districtContainer.innerHTML = '';
  };

  const renderEmpty = () => {
    clearContainer();
    if (!emptyMessage) {
      return;
    }

    const empty = document.createElement('p');
    empty.className = 'area-browser__empty';
    empty.textContent = emptyMessage;
    districtContainer.appendChild(empty);
  };

  const renderDistrictEntry = (districtName, dongs) => {
    const district = document.createElement('div');
    district.className = 'area-browser__district';

    const title = document.createElement('div');
    title.className = 'area-browser__district-name';
    title.textContent = districtName;
    district.appendChild(title);

    if (Array.isArray(dongs) && dongs.length > 0) {
      const dongList = document.createElement('div');
      dongList.className = 'area-browser__dong-list';

      dongs.forEach((dong) => {
        const chip = document.createElement('span');
        chip.className = 'area-browser__dong-chip';
        chip.textContent = dong;
        dongList.appendChild(chip);
      });

      district.appendChild(dongList);
    }

    districtContainer.appendChild(district);
  };

  const renderRegion = (regionKey) => {
    if (regionKey === 'all') {
      renderAllRegions();
      return;
    }

    const regionData = areaHierarchy[regionKey] || {};
    const districts = Object.entries(regionData).sort((a, b) =>
      a[0].localeCompare(b[0], 'ko-KR')
    );

    clearContainer();

    if (districts.length === 0) {
      renderEmpty();
      return;
    }

    districts.forEach(([districtName, dongs]) => {
      renderDistrictEntry(districtName, Array.isArray(dongs) ? dongs : []);
    });
  };

  const renderAllRegions = () => {
    const regions = Object.entries(areaHierarchy).sort((a, b) =>
      a[0].localeCompare(b[0], 'ko-KR')
    );

    clearContainer();

    if (regions.length === 0) {
      renderEmpty();
      return;
    }

    regions.forEach(([regionName, districts]) => {
      const group = document.createElement('div');
      group.className = 'area-browser__region-group';

      const heading = document.createElement('h3');
      heading.className = 'area-browser__region-heading';
      heading.textContent = regionName;
      group.appendChild(heading);

      const groupGrid = document.createElement('div');
      groupGrid.className = 'area-browser__region-grid';

      Object.entries(districts)
        .sort((a, b) => a[0].localeCompare(b[0], 'ko-KR'))
        .forEach(([districtName, dongs]) => {
          const district = document.createElement('div');
          district.className = 'area-browser__district';

          const title = document.createElement('div');
          title.className = 'area-browser__district-name';
          title.textContent = districtName;
          district.appendChild(title);

          if (Array.isArray(dongs) && dongs.length > 0) {
            const dongList = document.createElement('div');
            dongList.className = 'area-browser__dong-list';

            dongs.forEach((dong) => {
              const chip = document.createElement('span');
              chip.className = 'area-browser__dong-chip';
              chip.textContent = dong;
              dongList.appendChild(chip);
            });

            district.appendChild(dongList);
          }

          groupGrid.appendChild(district);
        });

      group.appendChild(groupGrid);
      districtContainer.appendChild(group);
    });
  };

  regionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const regionKey = button.getAttribute('data-area-region');

      regionButtons.forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');

      renderRegion(regionKey);
    });
  });

  const initialActive =
    browserRoot.querySelector('[data-area-region].is-active') || regionButtons[0];

  if (initialActive) {
    renderRegion(initialActive.getAttribute('data-area-region'));
  }
})();
