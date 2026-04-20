(function () {
  function setStepStatus(panel, text) {
    var s = panel.querySelector('.step-status');
    if (s) s.textContent = text;
  }

  function unlockStep(stepNumber) {
    var panel = document.querySelector('.step-panel[data-step="' + stepNumber + '"]');
    if (!panel) return;
    panel.classList.remove('is-locked');
    panel.classList.add('is-unlocked');
    setStepStatus(panel, '● نشطة');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleStepAction(carouselId, isLastSlide) {
    var actions = document.querySelector('.step-actions[data-watch-carousel="' + carouselId + '"]');
    if (!actions) return;
    actions.classList.toggle('is-hidden', !isLastSlide);
  }

  document.querySelectorAll('[data-unlock]').forEach(function (button) {
    button.addEventListener('click', function () {
      var currentPanel = button.closest('.step-panel');
      if (currentPanel) {
        currentPanel.classList.add('is-completed');
        currentPanel.classList.remove('is-unlocked', 'is-expanded');
        setStepStatus(currentPanel, '✅ مكتملة');
      }
      unlockStep(button.getAttribute('data-unlock'));
    });
  });

  document.querySelectorAll('[data-finish="true"]').forEach(function (button) {
    button.addEventListener('click', function () {
      var currentPanel = button.closest('.step-panel');
      var nextTrack = document.getElementById('next-track-cta');
      if (currentPanel) {
        currentPanel.classList.add('is-completed');
        currentPanel.classList.remove('is-unlocked', 'is-expanded');
        setStepStatus(currentPanel, '✅ مكتملة');
      }
      if (nextTrack) {
        nextTrack.classList.remove('hidden');
        nextTrack.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  document.querySelectorAll('.step-toggle').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      var panel = button.closest('.step-panel');
      if (!panel || !panel.classList.contains('is-completed')) return;
      panel.classList.toggle('is-expanded');
    });
  });

  document.querySelectorAll('.step-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var panel = header.closest('.step-panel');
      if (!panel || !panel.classList.contains('is-completed')) return;
      panel.classList.toggle('is-expanded');
    });
  });

  ['connect-carousel', 'workspace-carousel', 'account-carousel'].forEach(function (carouselId) {
    var carousel = document.getElementById(carouselId);
    if (!carousel) return;
    carousel.addEventListener('carousel:change', function (event) {
      toggleStepAction(carouselId, event.detail.current === event.detail.total - 1);
    });
  });
})();

(function () {
  var themeButton = document.getElementById('themeToggle');
  var savedTheme = localStorage.getItem('cq-theme');

  if (!themeButton) return;

  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeButton.textContent = '??????';
  }

  themeButton.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      themeButton.textContent = '????';
      localStorage.setItem('cq-theme', 'light');
      return;
    }

    document.documentElement.setAttribute('data-theme', 'dark');
    themeButton.textContent = '??????';
    localStorage.setItem('cq-theme', 'dark');
  });
})();
