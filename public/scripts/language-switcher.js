(function () {
  const switchers = document.querySelectorAll('[data-language-switcher]');

  if (!switchers.length) {
    return;
  }

  const closeAll = (except) => {
    switchers.forEach((switcher) => {
      if (switcher === except) {
        return;
      }

      switcher.classList.remove('is-open');
      const toggle = switcher.querySelector('.language-switcher__button');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  };

  switchers.forEach((switcher) => {
    const toggle = switcher.querySelector('.language-switcher__button');
    const options = switcher.querySelectorAll('[data-language-option]');

    if (!toggle || !options.length) {
      return;
    }

    const open = () => {
      closeAll(switcher);
      switcher.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    const close = () => {
      switcher.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      if (switcher.classList.contains('is-open')) {
        close();
      } else {
        open();
      }
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        const url = option.getAttribute('data-url');
        if (url) {
          window.location.href = url;
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!switcher.contains(event.target)) {
        close();
      }
    });

    switcher.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        close();
        toggle.focus();
      }
    });
  });
})();
