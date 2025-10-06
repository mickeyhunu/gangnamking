(function () {
  const slider = document.querySelector('[data-slider]');
  if (slider) {
    const track = slider.querySelector('[data-slider-track]');
    const slides = Array.from(track.children);
    const prev = slider.querySelector('[data-slider-prev]');
    const next = slider.querySelector('[data-slider-next]');
    const dotsHost = slider.querySelector('[data-slider-dots]');
    let index = 0;
    let timer;

    function updateTransform() {
      track.style.transform = `translateX(-${index * 100}%)`;
      if (dotsHost) {
        const dots = dotsHost.querySelectorAll('.detail-gallery__dot');
        dots.forEach((dot, dotIndex) => {
          dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
        });
      }
    }

    function goToSlide(newIndex) {
      if (!slides.length) {
        return;
      }
      const total = slides.length;
      index = (newIndex + total) % total;
      updateTransform();
    }

    function startAuto() {
      if (timer || slides.length < 2) {
        return;
      }
      timer = window.setInterval(() => {
        goToSlide(index + 1);
      }, 6000);
    }

    function stopAuto() {
      if (timer) {
        window.clearInterval(timer);
        timer = undefined;
      }
    }

    if (dotsHost && slides.length > 1) {
      const fragment = document.createDocumentFragment();
      slides.forEach((_, dotIndex) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'detail-gallery__dot';
        dot.setAttribute('aria-label', `${dotIndex + 1}번 이미지 보기`);
        dot.addEventListener('click', () => {
          goToSlide(dotIndex);
          stopAuto();
          startAuto();
        });
        fragment.appendChild(dot);
      });
      dotsHost.appendChild(fragment);
    }

    if (prev) {
      prev.addEventListener('click', () => {
        goToSlide(index - 1);
        stopAuto();
        startAuto();
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        goToSlide(index + 1);
        stopAuto();
        startAuto();
      });
    }

    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);
    slider.addEventListener('touchstart', stopAuto, { passive: true });
    slider.addEventListener('touchend', startAuto, { passive: true });

    updateTransform();
    startAuto();
  }

  const seoEditor = document.querySelector('[data-seo-editor]');
  if (seoEditor) {
    const textarea = seoEditor.querySelector('textarea');
    const copyButton = seoEditor.querySelector('[data-action="copy"]');
    const status = seoEditor.querySelector('[data-status]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    let statusTimer;

    if (!textarea) {
      return;
    }

    function setStatus(message, isSuccess) {
      if (!status) {
        return;
      }
      status.textContent = message;
      status.style.color = isSuccess ? '#ff9bd1' : 'var(--color-muted)';
      if (statusTimer) {
        window.clearTimeout(statusTimer);
      }
      if (message) {
        statusTimer = window.setTimeout(() => {
          status.textContent = '';
        }, 4000);
      }
    }

    function updateMetaKeywords() {
      if (metaKeywords) {
        metaKeywords.setAttribute('content', textarea.value.trim());
      }
    }

    textarea.addEventListener('input', updateMetaKeywords);

    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(textarea.value);
          setStatus('키워드를 복사했습니다. 운영팀에 전달해 반영해주세요.', true);
        } catch (error) {
          console.warn('Clipboard copy failed:', error);
          setStatus('복사에 실패했습니다. 직접 복사해주세요.', false);
        }
      });
    }
  }
})();
