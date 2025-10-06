(function () {
  const switchers = document.querySelectorAll('[data-language-switcher]');

  switchers.forEach((select) => {
    select.addEventListener('change', (event) => {
      const value = event.target.value;
      if (value) {
        window.location.href = value;
      }
    });
  });
})();
