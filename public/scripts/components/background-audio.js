(function () {
  'use strict';

  var audio = document.getElementById('site-bgm');
  if (!audio) {
    return;
  }

  var TIME_KEY = 'site-bgm:time';
  var STATE_KEY = 'site-bgm:state';
  var lastPersist = 0;
  var PERSIST_INTERVAL = 1000;
  var interactionScheduled = false;

  var toggleButton = document.querySelector('[data-bgm-toggle]');
  var toggleText = toggleButton ? toggleButton.querySelector('.bgm-toggle__text') : null;
  var toggleIcon = toggleButton ? toggleButton.querySelector('.bgm-toggle__icon') : null;
  var playingLabel = toggleButton
    ? toggleButton.getAttribute('data-bgm-toggle-playing-label')
    : null;
  var pausedLabel = toggleButton
    ? toggleButton.getAttribute('data-bgm-toggle-paused-label')
    : null;

  function updateToggleButton() {
    if (!toggleButton) {
      return;
    }

    var isPlaying = !audio.paused;
    var nextLabel = isPlaying
      ? playingLabel || 'Stop music'
      : pausedLabel || 'Play music';
    toggleButton.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    toggleButton.setAttribute('title', nextLabel);
    toggleButton.setAttribute('aria-label', nextLabel);

    if (toggleText) {
      toggleText.textContent = nextLabel;
    } else {
      toggleButton.textContent = nextLabel;
    }

    if (toggleIcon) {
      toggleIcon.textContent = isPlaying ? '🔊' : '🔇';
    }
  }

  var storedTime = null;
  try {
    storedTime = sessionStorage.getItem(TIME_KEY);
  } catch (error) {
    storedTime = null;
  }

  if (storedTime) {
    var parsedTime = parseFloat(storedTime);
    if (!Number.isNaN(parsedTime) && Number.isFinite(parsedTime)) {
      audio.currentTime = Math.max(parsedTime, 0);
    }
  }

  var storedState = null;
  try {
    storedState = sessionStorage.getItem(STATE_KEY);
  } catch (error) {
    storedState = null;
  }

  var hasEverPlayed = storedState === 'playing' || storedState === 'paused';

  function persistState() {
    if (!hasEverPlayed && audio.paused && audio.currentTime === 0) {
      return;
    }

    try {
      sessionStorage.setItem(TIME_KEY, String(audio.currentTime));
      sessionStorage.setItem(STATE_KEY, audio.paused ? 'paused' : 'playing');
    } catch (error) {
      // Ignore persistence errors (e.g. storage disabled)
    }
  }

  function scheduleUserInteraction() {
    if (interactionScheduled) {
      return;
    }

    interactionScheduled = true;

    var cleanup = function () {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
      document.removeEventListener('touchstart', handler);
    };

    var handler = function () {
      cleanup();
      interactionScheduled = false;
      requestPlay();
    };

    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    document.addEventListener('touchstart', handler);
  }

  function requestPlay() {
    var playPromise;

    try {
      playPromise = audio.play();
    } catch (error) {
      scheduleUserInteraction();
      return;
    }

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(function () {
          try {
            sessionStorage.setItem(STATE_KEY, 'playing');
          } catch (error) {
            // Ignore storage errors
          }
        })
        .catch(function () {
          scheduleUserInteraction();
        });
    }
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', function () {
      if (audio.paused) {
        requestPlay();
      } else {
        audio.pause();
      }

      // Ensure the button reflects the current state immediately
      updateToggleButton();
    });
  }

  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastPersist >= PERSIST_INTERVAL) {
      lastPersist = now;
      persistState();
    }
  });

  audio.addEventListener('play', function () {
    hasEverPlayed = true;
    try {
      sessionStorage.setItem(STATE_KEY, 'playing');
    } catch (error) {
      // Ignore storage errors
    }

    updateToggleButton();
  });

  audio.addEventListener('pause', function () {
    if (hasEverPlayed) {
      try {
        sessionStorage.setItem(STATE_KEY, 'paused');
      } catch (error) {
        // Ignore storage errors
      }
      persistState();
    }

    updateToggleButton();
  });

  window.addEventListener('beforeunload', persistState);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      persistState();
    }
  });

  if (storedState !== 'paused') {
    requestPlay();
  }

  updateToggleButton();
})();
