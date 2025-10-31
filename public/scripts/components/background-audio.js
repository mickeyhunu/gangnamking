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

  function persistState() {
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

  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastPersist >= PERSIST_INTERVAL) {
      lastPersist = now;
      persistState();
    }
  });

  audio.addEventListener('play', function () {
    try {
      sessionStorage.setItem(STATE_KEY, 'playing');
    } catch (error) {
      // Ignore storage errors
    }
  });

  audio.addEventListener('pause', function () {
    try {
      sessionStorage.setItem(STATE_KEY, 'paused');
    } catch (error) {
      // Ignore storage errors
    }
    persistState();
  });

  window.addEventListener('beforeunload', persistState);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      persistState();
    }
  });

  if (storedState === 'playing') {
    requestPlay();
  } else if (storedState === 'paused') {
    audio.pause();
  } else {
    requestPlay();
  }
})();
