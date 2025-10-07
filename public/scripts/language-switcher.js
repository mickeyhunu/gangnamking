(function () {
  const selects = document.querySelectorAll('[data-language-select]');

  if (!selects.length) {
    return;
  }

  selects.forEach((select) => {
    select.addEventListener('change', (event) => {
      const target = event.currentTarget;

      if (!(target instanceof HTMLSelectElement)) {
        return;
      }

      const url = target.value;

      if (typeof url === 'string' && url.length > 0) {
        window.location.href = url;
      }
    });
  });
})();
