const CONTENT_PROTECTION_STYLE = `
  <style>
    * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    body {
      -webkit-touch-callout: none;
    }

    img,
    a img {
      -webkit-user-drag: none;
      user-drag: none;
      -webkit-touch-callout: none;
    }
  </style>
`;

const CONTENT_PROTECTION_SCRIPT = `
  <script>
    (function () {
      function stopEvent(event) {
        if (event) {
          if (typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
          if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
          }
        }
        return false;
      }

      ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart'].forEach(function (eventName) {
        document.addEventListener(eventName, stopEvent, true);
      });

      document.addEventListener(
        'keydown',
        function (event) {
          if (!event) return;
          const key = (event.key || '').toLowerCase();
          if ((event.ctrlKey || event.metaKey) && ['c', 'x', 's', 'p', 'u', 'a'].includes(key)) {
            stopEvent(event);
          }
        },
        true
      );
    })();
  </script>
`;

function getContentProtectionMarkup() {
  return `${CONTENT_PROTECTION_STYLE}\n${CONTENT_PROTECTION_SCRIPT}`;
}

module.exports = {
  getContentProtectionMarkup,
};
