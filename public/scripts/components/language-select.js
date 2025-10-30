(function () {
  const components = document.querySelectorAll('[data-language-select]');
  const floatingComponents = Array.from(components).filter((component) => {
    return component.classList.contains('language-select--floating');
  });
  const stackedBreakpoint = window.matchMedia('(max-width: 960px)');

  const updateFloatingPositions = () => {
    if (!floatingComponents.length) {
      return;
    }

    const shouldStack = stackedBreakpoint.matches;

    if (!shouldStack) {
      floatingComponents.forEach((component) => {
        if (component instanceof HTMLElement) {
          component.style.removeProperty('--language-select-top');
          component.classList.remove('language-select--stacked');
        }
      });

      return;
    }

    const header = document.querySelector('.site-header');
    const subheader = document.querySelector('.site-subheader');
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
    const subheaderHeight = subheader instanceof HTMLElement ? subheader.offsetHeight : 0;
    const baseOffset = 16;
    const offset = Math.max(baseOffset, headerHeight + subheaderHeight + baseOffset);

    floatingComponents.forEach((component) => {
      if (!(component instanceof HTMLElement)) {
        return;
      }

      component.style.setProperty('--language-select-top', `${offset}px`);
      component.classList.add('language-select--stacked');
    });
  };

  updateFloatingPositions();

  if (typeof stackedBreakpoint.addEventListener === 'function') {
    stackedBreakpoint.addEventListener('change', updateFloatingPositions);
  } else if (typeof stackedBreakpoint.addListener === 'function') {
    stackedBreakpoint.addListener(updateFloatingPositions);
  }
  window.addEventListener('resize', updateFloatingPositions);
  window.addEventListener('orientationchange', updateFloatingPositions);
  window.addEventListener('load', updateFloatingPositions);

  if (!components.length) {
    return;
  }

  components.forEach((component) => {
    const toggle = component.querySelector('[data-language-toggle]');
    const optionsList = component.querySelector('[data-language-options]');
    const optionButtons = component.querySelectorAll('[data-language-option]');

    if (!(toggle instanceof HTMLElement) || !(optionsList instanceof HTMLElement) || !optionButtons.length) {
      return;
    }

    const closeDropdown = () => {
      toggle.setAttribute('aria-expanded', 'false');
      optionsList.hidden = true;
      component.classList.remove('language-select--open');
    };

    const openDropdown = () => {
      toggle.setAttribute('aria-expanded', 'true');
      optionsList.hidden = false;
      component.classList.add('language-select--open');
    };

    const toggleDropdown = () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        closeDropdown();
      } else {
        openDropdown();
      }
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleDropdown();
    });

    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDropdown();
        toggle.focus();
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleDropdown();
      }
    });

    optionButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const url = button.getAttribute('data-language-value');

        if (typeof url === 'string' && url.length > 0) {
          window.location.href = url;
        }
      });
    });

    const handleDocumentClick = (event) => {
      if (!component.contains(event.target)) {
        closeDropdown();
      }
    };

    const handleDocumentKeydown = (event) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
  });
})();
