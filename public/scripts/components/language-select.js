(function () {
  const components = document.querySelectorAll('[data-language-select]');

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
