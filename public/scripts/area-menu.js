(function () {
  const toggle = document.querySelector('[data-area-menu-toggle]');
  const menu = document.querySelector('[data-area-menu]');

  if (!toggle || !menu) {
    return;
  }

  const labelElement = toggle.querySelector('[data-area-menu-label]');
  const defaultLabel = toggle.getAttribute('data-default-label') || toggle.textContent.trim();
  const closeSelectors = '[data-area-menu-close]';
  const groupButtons = Array.from(menu.querySelectorAll('[data-area-group]'));
  const panels = Array.from(menu.querySelectorAll('[data-area-group-panel]'));
  const actionButtons = Array.from(menu.querySelectorAll('[data-area-menu-action]'));

  let activeGroup = 'all';
  let activeAction = null;

  function setLabel(text) {
    if (!labelElement) {
      return;
    }

    labelElement.textContent = text || defaultLabel;
  }

  function openMenu() {
    if (menu.hasAttribute('hidden')) {
      menu.removeAttribute('hidden');
    }

    document.body.classList.add('has-area-menu');
    toggle.setAttribute('aria-expanded', 'true');
    const firstButton = menu.querySelector('[data-area-group].is-active');
    if (firstButton) {
      firstButton.focus();
    }
  }

  function closeMenu(options = {}) {
    const { restoreFocus = false } = options;

    if (!menu.hasAttribute('hidden')) {
      menu.setAttribute('hidden', '');
    }

    document.body.classList.remove('has-area-menu');
    toggle.setAttribute('aria-expanded', 'false');

    if (restoreFocus) {
      toggle.focus();
    }
  }

  function setActiveGroup(groupId) {
    const normalized = groupId || 'all';

    activeGroup = normalized;

    groupButtons.forEach((button) => {
      if (button.dataset.areaGroup === normalized) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
    });

    panels.forEach((panel) => {
      if (panel.dataset.areaGroupPanel === normalized) {
        panel.classList.add('is-active');
        panel.removeAttribute('hidden');
      } else {
        panel.classList.remove('is-active');
        panel.setAttribute('hidden', '');
      }
    });
  }

  function setActiveAction(button) {
    if (activeAction === button && button) {
      return;
    }

    activeAction = button || null;

    actionButtons.forEach((action) => {
      if (activeAction && action === activeAction) {
        action.classList.add('is-active');
      } else {
        action.classList.remove('is-active');
      }
    });
  }

  function getGroupLabelFromElement(element) {
    if (!element) {
      return '';
    }

    if (element.dataset && element.dataset.areaGroupLabel) {
      return element.dataset.areaGroupLabel;
    }

    const panel = element.closest('[data-area-group-panel]');
    if (panel && panel.dataset.areaGroupLabel) {
      return panel.dataset.areaGroupLabel;
    }

    return '';
  }

  function handleActionClick(button) {
    const region = button.dataset.region || 'all';
    const district = button.dataset.district || 'all';
    const isAll = region === 'all' && district === 'all';
    const panel = button.closest('[data-area-group-panel]');
    const groupLabel = panel && panel.dataset.areaGroupLabel ? panel.dataset.areaGroupLabel : getGroupLabelFromElement(button);

    let nextLabel = defaultLabel;

    if (!isAll) {
      const buttonLabel = button.textContent.trim();

      if (district === 'all') {
        nextLabel = groupLabel ? `${groupLabel} ${buttonLabel}` : buttonLabel;
      } else {
        nextLabel = groupLabel ? `${groupLabel} · ${buttonLabel}` : buttonLabel;
      }
    }

    setLabel(nextLabel);
    setActiveAction(button);

    const detail = {
      region,
      district,
      label: nextLabel,
      groupLabel,
    };

    document.dispatchEvent(
      new CustomEvent('areaMenu:select', {
        detail,
      })
    );

    closeMenu({ restoreFocus: true });
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });

  menu.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) {
      return;
    }

    const closeTarget = event.target.closest(closeSelectors);
    if (closeTarget) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }

    const groupButton = event.target.closest('[data-area-group]');
    if (groupButton && menu.contains(groupButton)) {
      setActiveGroup(groupButton.dataset.areaGroup);
      return;
    }

    const actionButton = event.target.closest('[data-area-menu-action]');
    if (actionButton && menu.contains(actionButton)) {
      event.preventDefault();
      handleActionClick(actionButton);
    }
  });

  document.addEventListener('filters:selectionChange', (event) => {
    const detail = event.detail || {};
    const { region, district, label } = detail;
    const normalizedRegion = typeof region === 'string' && region.length ? region : 'all';
    const normalizedDistrict = typeof district === 'string' && district.length ? district : 'all';

    const groupId = normalizedRegion === 'all' ? 'all' : normalizedRegion;
    setActiveGroup(groupId);

    let activeButton = null;

    if (normalizedDistrict !== 'all') {
      activeButton = menu.querySelector(
        `[data-area-group-panel="${groupId}"] [data-area-menu-action][data-district="${normalizedDistrict}"]`
      );
    }

    if (!activeButton) {
      activeButton = menu.querySelector(
        `[data-area-group-panel="${groupId}"] [data-area-menu-action][data-district="all"]`
      );
    }

    setActiveAction(activeButton || null);

    if (typeof label === 'string' && label.length) {
      setLabel(label);
    } else if ((!region || region === 'all') && (!district || district === 'all')) {
      setLabel(defaultLabel);
    }
  });

  setLabel(defaultLabel);
  setActiveGroup(activeGroup);
})();
