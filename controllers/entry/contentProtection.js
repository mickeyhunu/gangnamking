const SHARED_PROTECTION_CSS = `
    * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    body,
    svg {
      -webkit-touch-callout: none;
      touch-action: pan-y;
    }

    img,
    a img {
      -webkit-user-drag: none;
      user-drag: none;
      -webkit-touch-callout: none;
    }
`;

const CONTENT_PROTECTION_STYLE = `
  <style>
${SHARED_PROTECTION_CSS}
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

const SVG_PROTECTION_STYLE = `
  <style><![CDATA[
${SHARED_PROTECTION_CSS}
    text,
    tspan,
    rect,
    line,
    circle {
      pointer-events: none;
    }
  ]]></style>
`;

const SVG_PROTECTION_SCRIPT = `
  <script><![CDATA[
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
  ]]></script>
`;

function getSvgContentProtectionElements() {
  return {
    defsMarkup: SVG_PROTECTION_STYLE,
    scriptMarkup: SVG_PROTECTION_SCRIPT,
  };
}

module.exports = {
  getContentProtectionMarkup,
  getSvgContentProtectionElements,
};
