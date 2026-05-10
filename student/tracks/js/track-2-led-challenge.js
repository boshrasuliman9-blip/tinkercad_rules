if (new URLSearchParams(window.location.search).get('teacher') === '1') {
  document.body.classList.add('teacher-preview');
  window.addEventListener('DOMContentLoaded', function () {
    var logo = document.querySelector('.site-logo');
    var home = document.querySelector('.site-back');
    if (logo) logo.href = '../../../teacher/dashboard.html';
    if (home) { home.href = '../../../teacher/dashboard.html'; home.textContent = 'لوحة المعلم'; }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var counter          = document.getElementById('steps-counter');
  var wiringAction     = document.getElementById('wiring-done-actions');
  var codingAction     = document.getElementById('coding-done-actions');
  var nextTrack        = document.getElementById('next-track-cta');
  var submitGate       = document.getElementById('submit-gate');
  var submitProjectBtn = document.getElementById('submit-project-btn');
  var submitWarning    = document.getElementById('submit-warning');
  var submitCancelBtn  = document.getElementById('submit-cancel-btn');
  var submitConfirmBtn = document.getElementById('submit-confirm-btn');
  var wiringStepDuration = document.getElementById('wiring-step-duration');
  var topWiringStepDuration = document.getElementById('top-wiring-step-duration');

  var wiringStepCards       = Array.from(document.querySelectorAll('[data-wiring-step]'));
  var wiringChecks          = Array.from(document.querySelectorAll('[data-wiring-check]'));
  var programmingStepCards  = Array.from(document.querySelectorAll('[data-programming-step]'));
  var programmingChecks     = Array.from(document.querySelectorAll('[data-programming-check]'));
  var completeWiringSubsteps = Array.from(document.querySelectorAll('[data-complete-wiring-step]'));
  var completeProgrammingSubsteps = Array.from(document.querySelectorAll('[data-complete-programming-step]'));
  var stepPanels            = Array.from(document.querySelectorAll('.step-panel'));
  var programmingCounter    = document.getElementById('programming-steps-counter');

  var completeStep1 = document.querySelector('[data-unlock="2"]');
  var completeStep2 = document.querySelector('[data-finish="true"]');

  var wiringStepsStage  = document.getElementById('wiring-steps-stage');
  var startChallengeBtn = document.getElementById('wiring-start-btn');
  var componentsStage   = document.getElementById('components-stage');
  var componentsToggle  = document.getElementById('components-toggle');
  var componentsGrid    = componentsStage ? componentsStage.querySelector('.components-grid') : null;
  var startChallengeWrap = startChallengeBtn ? startChallengeBtn.closest('.wiring-start-wrap') : null;

  var guideOverlay  = document.getElementById('guide-overlay');
  var guideSpotlight = document.getElementById('guide-spotlight');
  var guideTip      = document.getElementById('challenge-tip');
  var guideTipText  = document.getElementById('challenge-tip-text');
  var guideTipStep  = document.getElementById('challenge-tip-step');
  var guideDismiss  = document.getElementById('challenge-tip-dismiss');
  var guideNext     = document.getElementById('challenge-tip-next');
  var timeUpPanel   = document.getElementById('time-up-panel');

  var dummyGuideStep    = document.getElementById('guide-dummy-step');
  var dummyGuideHeader  = document.getElementById('guide-dummy-header');
  var dummyGuideCarousel = document.getElementById('guide-dummy-carousel');
  var dummyGuideNav     = document.getElementById('guide-dummy-nav');
  var dummyGuidePieces  = document.getElementById('guide-dummy-pieces');
  var dummyGuideChecks  = Array.from(document.querySelectorAll('[data-guide-check]'));
  var realGuideHeader   = document.getElementById('guide-real-step-header');

  var firstWiringCard = wiringStepCards[0] || null;
  var currentGuideTarget = null;
  var currentGuideStepTarget = null;
  var currentGuideStartsChallenge = false;
  var guideSequence = [];
  var currentGuideIndex = -1;
  var dummyGuideReadyForChecks = false;
  var realStepUnlockedFromGuide = false;
  var wiringTimerId = null;
  var wiringTimerStartedAt = null;
  var wiringChallengeSeconds = 10 * 60;
  var challengeTimeUp = false;
  var projectLocked = false;
  window.projectLocked = false;
  var stepTimerOrb = document.createElement('div');
  stepTimerOrb.className = 'step-timer-orb';
  stepTimerOrb.innerHTML = '<span>وقت</span><b>10:00</b>';
  stepTimerOrb.addEventListener('click', function (event) { event.stopPropagation(); });

  var isTeacherPreview = document.body.classList.contains('teacher-preview');

  function applyTeacherPreview() {
    document.querySelectorAll('.step-panel').forEach(function(panel) {
      panel.classList.remove('is-locked', 'is-completed', 'is-hidden', 'is-collapsed', 'is-content-collapsed', 'is-header-hidden');
      panel.classList.add('is-unlocked', 'is-expanded');
      var status = panel.querySelector('.step-status');
      if (status) status.textContent = 'مفتوحة للمعلم';
    });
    document.querySelectorAll('.wiring-substep').forEach(function(card) {
      card.classList.remove('is-locked', 'is-completed', 'is-hidden', 'is-collapsed', 'is-awaiting-check');
      card.classList.add('is-unlocked', 'is-expanded');
      var status = card.querySelector('.wiring-substep-status');
      if (status) status.textContent = 'مفتوحة للشرح';
    });
    if (wiringStepsStage) wiringStepsStage.classList.remove('is-hidden');
    if (componentsStage) componentsStage.classList.add('is-started');
    if (componentsStage) componentsStage.classList.remove('is-collapsed');
    if (componentsGrid) componentsGrid.style.display = 'grid';
    if (componentsToggle) componentsToggle.style.display = 'none';
    if (startChallengeWrap) startChallengeWrap.style.display = 'none';
    if (submitGate) submitGate.classList.add('hidden');
    if (nextTrack) nextTrack.classList.add('hidden');
    if (counter) counter.textContent = wiringStepCards.length + ' من ' + wiringStepCards.length;
    if (programmingCounter) programmingCounter.textContent = programmingStepCards.length + ' من ' + programmingStepCards.length;
    if (wiringStepDuration) wiringStepDuration.textContent = 'مفتوح للمعلم';
    if (topWiringStepDuration) topWiringStepDuration.textContent = 'مفتوح للمعلم';
    removeStepTimerOrb();
  }

  if (isTeacherPreview) {
    applyTeacherPreview();
    return;
  }

  /* ── Helpers ── */
  function setStepStatus(panel, text) {
    var s = panel.querySelector('.step-status');
    if (s) s.textContent = text;
  }

  function unlockStep(stepNumber) {
    var panel = document.querySelector('.step-panel[data-step="' + stepNumber + '"]');
    if (!panel) return;
    panel.classList.remove('is-locked', 'is-completed', 'is-expanded', 'is-hidden');
    panel.classList.add('is-unlocked', 'is-header-hidden');
    var preview = document.querySelector('.step-panel[data-step-preview="' + stepNumber + '"]');
    if (preview) {
      preview.classList.remove('is-locked');
      preview.classList.add('is-unlocked');
      var ps = preview.querySelector('.step-status');
      if (ps) ps.textContent = '● نشطة';
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateWiringCounter() {
    var completed = wiringStepCards.filter(function (c) { return c.classList.contains('is-completed'); }).length;
    if (counter) counter.textContent = completed + ' من ' + wiringStepCards.length;
    return completed;
  }

  function updateWiringAction() {
    var completed = updateWiringCounter();
    if (wiringAction) wiringAction.classList.toggle('is-hidden', completed !== wiringStepCards.length);
  }

  function isWiringStepComplete(index) {
    var card = wiringStepCards[index];
    if (!card) return false;
    var checks = Array.from(card.querySelectorAll('[data-wiring-check]'));
    return checks.length > 0 && checks.every(function (i) { return i.classList.contains('is-checked'); });
  }

  function unlockWiringSubstep(index) {
    var card = wiringStepCards[index];
    if (!card) return;
    card.classList.remove('is-locked', 'is-completed');
    card.classList.add('is-unlocked', 'is-expanded');
    var s = card.querySelector('.wiring-substep-status');
    if (s) s.textContent = '● نشطة';
    moveStepTimerToCard(card);
  }

  function unlockProgrammingSubstep(index) {
    var card = programmingStepCards[index];
    if (!card) return;
    card.classList.remove('is-locked', 'is-completed');
    card.classList.add('is-unlocked', 'is-expanded');
    var s = card.querySelector('.wiring-substep-status');
    if (s) s.textContent = '● نشطة';
    moveStepTimerToCard(card);
  }

  function updateProgrammingCounter() {
    var completed = programmingStepCards.filter(function (c) { return c.classList.contains('is-completed'); }).length;
    if (programmingCounter) programmingCounter.textContent = completed + ' من ' + programmingStepCards.length;
    return completed;
  }

  function refreshWiringSubsteps() {
    wiringStepCards.forEach(function (card, index) {
      var action = card.querySelector('.substep-actions');
      var done = isWiringStepComplete(index);
      if (card.classList.contains('is-unlocked') && done) card.classList.add('is-expanded');
      card.classList.toggle('is-awaiting-check', card.classList.contains('is-unlocked') && index === 0 && !done);
      if (action) action.classList.toggle('is-hidden', !(card.classList.contains('is-unlocked') && done));
    });
  }

  function updateCodingAction() {
    var completed = updateProgrammingCounter();
    var all = programmingStepCards.length > 0
      ? completed === programmingStepCards.length
      : programmingChecks.every(function (i) { return i.classList.contains('is-checked'); });
    if (codingAction) codingAction.classList.toggle('is-hidden', !all);
  }

  function markTopStepCompleted(stepNumber) {
    var tab = document.querySelector('.steps-top-row [data-step-headonly="' + stepNumber + '"], .steps-top-row [data-step-preview="' + stepNumber + '"]');
    if (!tab) return;
    tab.classList.remove('is-locked', 'is-unlocked', 'is-collapsed');
    tab.classList.add('is-completed');
    var status = tab.querySelector('.step-status');
    if (status) status.textContent = '✅ مكتملة';
  }

  /* ── Timer ── */
  function formatTimer(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function moveStepTimerToCard(card) {
    if (!card) return;
    var header = card.querySelector('.wiring-substep-header');
    if (header) header.appendChild(stepTimerOrb);
  }

  function lockProjectReview() {
    projectLocked = true;
    window.projectLocked = true;
    document.querySelectorAll('.step-panel[data-step]').forEach(function (panel) {
      panel.classList.remove('is-expanded');
      panel.classList.add('is-content-collapsed');
      var toggle = panel.querySelector('.step-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.steps-top-row .step-panel').forEach(function (tab) {
      tab.classList.add('is-collapsed');
    });
  }
  function removeStepTimerOrb() {
    if (stepTimerOrb.parentNode) stepTimerOrb.parentNode.removeChild(stepTimerOrb);
  }
  function moveStepTimerToSubmitGate() {
    if (submitGate) submitGate.appendChild(stepTimerOrb);
  }
  function setCompletionButtonsDisabled(disabled) {
    completeWiringSubsteps.concat(completeProgrammingSubsteps).forEach(function (button) {
      button.disabled = disabled;
      button.style.opacity = disabled ? '.55' : '';
      button.style.cursor = disabled ? 'not-allowed' : '';
    });
    if (completeStep1) completeStep1.disabled = disabled;
    if (completeStep2) completeStep2.disabled = disabled;
  }
  function handleTimeUp() {
    challengeTimeUp = true;
    setCompletionButtonsDisabled(true);
    if (timeUpPanel && stepTimerOrb.parentNode) {
      stepTimerOrb.parentNode.insertAdjacentElement('afterend', timeUpPanel);
      timeUpPanel.classList.add('is-visible');
    }
  }
  function setWiringTimerText(text) {
    if (wiringStepDuration) wiringStepDuration.textContent = text;
    var orbText = text.indexOf(':') !== -1 ? text.replace('⏱', '').trim() : '10:00';
    if (text.indexOf('انتهى') !== -1) orbText = 'انتهى';
    var orbValue = stepTimerOrb.querySelector('b');
    if (orbValue) orbValue.textContent = orbText;
    stepTimerOrb.classList.toggle('is-running', !!wiringTimerStartedAt && text.indexOf('انتهى') === -1);
    stepTimerOrb.classList.toggle('is-ended', text.indexOf('انتهى') !== -1);
  }
  function updateWiringTimerLabel() {
    if (!wiringStepDuration && !topWiringStepDuration) return;
    if (!wiringTimerStartedAt) { setWiringTimerText('⏱ 10 دقائق'); return; }
    var elapsed = Math.floor((Date.now() - wiringTimerStartedAt) / 1000);
    var remaining = Math.max(0, wiringChallengeSeconds - elapsed);
    setWiringTimerText('⏱ ' + formatTimer(remaining));
    if (remaining === 0 && wiringTimerId) {
      window.clearInterval(wiringTimerId);
      wiringTimerId = null;
      setWiringTimerText('⏱ انتهى الوقت');
      handleTimeUp();
    }
  }
  function startWiringTimer() {
    if (wiringTimerStartedAt) return;
    wiringTimerStartedAt = Date.now();
    updateWiringTimerLabel();
    wiringTimerId = window.setInterval(updateWiringTimerLabel, 1000);
  }

  /* ── Guide system ── */
  function clearGuideTarget() {
    if (!currentGuideTarget) return;
    currentGuideTarget.classList.remove('guide-target');
    var p = currentGuideTarget.closest('.guide-parent-active');
    if (p) p.classList.remove('guide-parent-active');
    currentGuideTarget = currentGuideStepTarget = null;
    currentGuideStartsChallenge = false;
  }

  function updateGuideSpotlight(target) {
    if (!target || !guideSpotlight) return;
    var r = target.getBoundingClientRect(), px = 14, py = 14;
    guideSpotlight.style.top    = Math.max(8, r.top  - py) + 'px';
    guideSpotlight.style.left   = Math.max(8, r.left - px) + 'px';
    guideSpotlight.style.width  = Math.min(window.innerWidth  - 16, r.width  + px * 2) + 'px';
    guideSpotlight.style.height = Math.min(window.innerHeight - 16, r.height + py * 2) + 'px';
    guideSpotlight.style.borderRadius = Math.min(32, Math.max(18, r.height / 3)) + 'px';
  }

  function positionGuideTip(target) {
    if (!target || !guideTip) return;
    var r = target.getBoundingClientRect();
    var tw = Math.min(480, window.innerWidth - 24);
    var left = r.left + r.width / 2 - tw / 2;
    var top  = r.bottom + 16;
    if (top + guideTip.offsetHeight > window.innerHeight - 12) top = r.top - guideTip.offsetHeight - 16;
    top  = Math.max(12, top);
    left = Math.max(12, Math.min(left, window.innerWidth - tw - 12));
    guideTip.style.width = tw + 'px';
    guideTip.style.left  = left + 'px';
    guideTip.style.top   = top  + 'px';
  }

  function hideGuide() {
    if (guideOverlay) { guideOverlay.classList.remove('is-active'); guideOverlay.setAttribute('aria-hidden', 'true'); }
    if (guideTip) guideTip.classList.remove('is-guide-visible');
    if (guideNext) guideNext.classList.add('is-hidden');
    clearGuideTarget();
    guideSequence = [];
    currentGuideIndex = -1;
  }

  function showGuideStep(index) {
    if (!guideSequence[index] || !guideTip || !guideOverlay || !guideSpotlight) return;
    var step = guideSequence[index];
    if (!step.target) return;
    clearGuideTarget();
    currentGuideIndex = index;
    currentGuideStepTarget = step.target;
    currentGuideStartsChallenge = !!step.startsChallenge;
    currentGuideTarget = step.expandToCard && step.target.closest('.wiring-substep')
      ? step.target.closest('.wiring-substep') : step.target;
    currentGuideTarget.classList.add('guide-target');
    var gp = currentGuideTarget.closest('.wiring-substep');
    if (gp) gp.classList.add('guide-parent-active');
    if (guideTipText) guideTipText.textContent = step.text;
    if (guideTipStep) guideTipStep.textContent = String(index + 1);
    if (guideNext) { guideNext.textContent = step.nextLabel || 'التالي'; guideNext.classList.toggle('is-hidden', !step.showNext); }
    guideTip.classList.add('is-guide-visible');
    guideOverlay.classList.add('is-active');
    guideOverlay.setAttribute('aria-hidden', 'false');
    updateGuideSpotlight(step.target);
    positionGuideTip(step.target);
  }

  function startGuideSequence(steps) {
    guideSequence = steps.filter(function (s) { return s && s.target; });
    if (guideSequence.length) showGuideStep(0);
  }

  function goToNextGuideStep() {
    if (currentGuideIndex < 0) return;
    if (currentGuideStepTarget === realGuideHeader) { unlockFirstWiringFromGuide(); hideGuide(); return; }
    if (currentGuideIndex >= guideSequence.length - 1) { hideGuide(); return; }
    if (guideSequence[currentGuideIndex + 1] && guideSequence[currentGuideIndex + 1].target === realGuideHeader) prepareRealWiringPreview();
    showGuideStep(currentGuideIndex + 1);
  }

  function prepareRealWiringPreview() {
    if (dummyGuideStep) dummyGuideStep.classList.add('is-hidden');
  }

  function unlockFirstWiringFromGuide() {
    if (realStepUnlockedFromGuide) return;
    realStepUnlockedFromGuide = true;
    if (dummyGuideStep) dummyGuideStep.classList.add('is-hidden');
    wiringStepCards.forEach(function (card, index) {
      if (index === 0) return;
      card.classList.remove('is-unlocked', 'is-expanded');
      if (!card.classList.contains('is-completed')) {
        card.classList.add('is-locked');
        var s = card.querySelector('.wiring-substep-status');
        if (s) s.textContent = '🔒 مقفلة';
      }
    });
    if (componentsStage) componentsStage.classList.add('is-started', 'is-collapsed');
    if (startChallengeWrap) { startChallengeWrap.classList.add('is-hidden'); startChallengeWrap.style.display = 'none'; }
    if (componentsGrid) componentsGrid.style.display = 'none';
    if (componentsToggle) { componentsToggle.textContent = 'إظهار القطع المطلوبة'; componentsToggle.style.display = 'inline-flex'; }
    if (firstWiringCard) {
      firstWiringCard.classList.remove('is-locked', 'is-completed');
      firstWiringCard.classList.add('is-unlocked', 'is-expanded');
      var fs = firstWiringCard.querySelector('.wiring-substep-status');
      if (fs) fs.textContent = '● نشطة';
      moveStepTimerToCard(firstWiringCard);
      firstWiringCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function startActualChallenge() {
    if (wiringStepsStage) wiringStepsStage.classList.remove('is-hidden');
    realStepUnlockedFromGuide = false;
    challengeTimeUp = false;
    setCompletionButtonsDisabled(false);
    if (timeUpPanel) timeUpPanel.classList.remove('is-visible');
    if (wiringTimerId) { window.clearInterval(wiringTimerId); wiringTimerId = null; }
    wiringTimerStartedAt = null;
    setWiringTimerText('⏱ ' + formatTimer(wiringChallengeSeconds));
    unlockFirstWiringFromGuide();
    startWiringTimer();
    hideGuide();
  }

  function unlockGuideProgressIfNeeded() {
    if (!realStepUnlockedFromGuide) {
      startGuideSequence([
        {
          target: realGuideHeader || startChallengeBtn,
          text: 'هل أنت جاهز الآن؟ الوقت لا يبدأ أثناء الإرشادات. عندما تضغط «أنا جاهز» سيبدأ العدّاد من 10:00 من جديد وينتقل معك بين الخطوات.',
          expandToCard: !!realGuideHeader,
          startsChallenge: true,
          showNext: true,
          nextLabel: 'أنا جاهز'
        }
      ]);
    }
  }

  /* ── Event listeners ── */
  wiringStepCards.concat(programmingStepCards).forEach(function (card) {
    var header = card.querySelector('.wiring-substep-header');
    var toggle = card.querySelector('.wiring-substep-toggle');
    function toggleSubstep() {
      if (!card.classList.contains('is-locked')) card.classList.toggle('is-expanded');
    }
    if (header) header.addEventListener('click', function (e) {
      if (e.target.closest('.wiring-substep-toggle')) return;
      toggleSubstep();
    });
    if (toggle) toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSubstep();
    });
  });

  wiringChecks.forEach(function (item) {
    item.addEventListener('click', function () {
      item.classList.toggle('is-checked');
      var key = item.getAttribute('data-comp');
      if (key) {
        var chip = document.querySelector('.components-grid.is-static [data-comp="' + key + '"]');
        if (chip) chip.classList.toggle('is-checked', item.classList.contains('is-checked'));
      }
      updateWiringAction();
      refreshWiringSubsteps();
    });
  });

  completeWiringSubsteps.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (challengeTimeUp) return;
      var card = btn.closest('[data-wiring-step]');
      if (!card) return;
      var index = Number(card.getAttribute('data-wiring-index'));
      card.classList.remove('is-unlocked', 'is-expanded');
      card.classList.add('is-completed');
      var s = card.querySelector('.wiring-substep-status');
      if (s) s.textContent = '✅ مكتملة';
      if (index < wiringStepCards.length - 1) {
        unlockWiringSubstep(index + 1);
        wiringStepCards[index + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updateWiringAction();
      refreshWiringSubsteps();
    });
  });

  completeProgrammingSubsteps.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (challengeTimeUp) return;
      var card = btn.closest('[data-programming-step]');
      if (!card) return;
      var index = Number(card.getAttribute('data-programming-index'));
      card.classList.remove('is-unlocked', 'is-expanded');
      card.classList.add('is-completed');
      var s = card.querySelector('.wiring-substep-status');
      if (s) s.textContent = '✅ مكتملة';
      if (index < programmingStepCards.length - 1) {
        unlockProgrammingSubstep(index + 1);
        programmingStepCards[index + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updateCodingAction();
    });
  });

  if (componentsToggle && componentsStage) {
    componentsToggle.addEventListener('click', function () {
      componentsStage.classList.toggle('is-collapsed');
      if (componentsGrid) componentsGrid.style.display = componentsStage.classList.contains('is-collapsed') ? 'none' : 'grid';
      componentsToggle.textContent = componentsStage.classList.contains('is-collapsed') ? 'إظهار القطع المطلوبة' : 'إخفاء القطع المطلوبة';
    });
  }

  if (startChallengeBtn) {
    startChallengeBtn.addEventListener('click', function () {
      hideGuide();
      if (wiringStepsStage) { wiringStepsStage.classList.remove('is-hidden'); wiringStepsStage.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (dummyGuideStep) { dummyGuideStep.classList.remove('is-hidden', 'is-guide-checks-ready'); dummyGuideStep.classList.add('is-expanded'); }
      dummyGuideReadyForChecks = true;
      realStepUnlockedFromGuide = false;
      if (wiringTimerId) { window.clearInterval(wiringTimerId); wiringTimerId = null; }
      wiringTimerStartedAt = null;
      dummyGuideChecks.forEach(function (i) { i.classList.remove('is-checked'); });
      updateWiringTimerLabel();
      if (dummyGuideStep) moveStepTimerToCard(dummyGuideStep);
      refreshWiringSubsteps();
      window.setTimeout(function () {
        startGuideSequence([
          { target: dummyGuideHeader, text: 'هذه خطوة وهمية لشرح الواجهة. بعد قليل ستنتقل منها إلى الخطوة الفعلية.', showNext: true, nextLabel: 'التالي' },
          { target: stepTimerOrb,     text: 'هذه دائرة الوقت. هنا تظهر كمعاينة فقط ولن يبدأ العدّ أثناء الشرح. عند بداية التحدي الفعلي سيعود الوقت إلى 10:00 ويبدأ بالنقصان.', showNext: true, nextLabel: 'التالي' },
          { target: dummyGuideNav,    text: 'تنقّل بين صور الكروسيل باستخدام السهمين لرؤية صور الخطوة.', showNext: true, nextLabel: 'التالي' },
          { target: dummyGuidePieces, text: 'بعد وضع القطع، حدّدها بعلامة الصح هنا. تبقى صور القطع مغبشة، لكن أزرار الصح تعمل بشكل طبيعي.', showNext: true, nextLabel: 'التالي' },
          { target: realGuideHeader,  text: 'هذه الدائرة الصغيرة هي مؤقت التحدي. الوقت لا يبدأ أثناء الإرشادات. عندما تضغط «أنا جاهز» سيبدأ العدّاد من 10:00 من جديد وينتقل معك من خطوة إلى خطوة.', expandToCard: true, startsChallenge: true, showNext: true, nextLabel: 'أنا جاهز' }
        ]);
      }, 220);
    });
  }

  if (dummyGuideCarousel) {
    dummyGuideCarousel.addEventListener('carousel:change', function (event) {
      if (!dummyGuideReadyForChecks) return;
      if (event.detail.current >= 0 && dummyGuideStep) dummyGuideStep.classList.add('is-guide-checks-ready');
    });
  }

  dummyGuideChecks.forEach(function (item) {
    item.addEventListener('click', function () {
      if (dummyGuideReadyForChecks) item.classList.toggle('is-checked');
    });
  });

  if (guideNext) {
    guideNext.addEventListener('click', function () {
      if (currentGuideStartsChallenge || (guideNext.textContent && guideNext.textContent.indexOf('أنا جاهز') !== -1)) {
        startActualChallenge(); return;
      }
      goToNextGuideStep();
    });
  }

  if (guideDismiss) guideDismiss.addEventListener('click', function () { hideGuide(); unlockGuideProgressIfNeeded(); });

  if (guideOverlay) {
    guideOverlay.addEventListener('click', function (e) {
      if (e.target === guideOverlay) { hideGuide(); unlockGuideProgressIfNeeded(); }
    });
  }

  window.addEventListener('resize', function () {
    if (currentGuideTarget && guideOverlay && guideOverlay.classList.contains('is-active')) { updateGuideSpotlight(currentGuideTarget); positionGuideTip(currentGuideTarget); }
  });
  window.addEventListener('scroll', function () {
    if (currentGuideTarget && guideOverlay && guideOverlay.classList.contains('is-active')) { updateGuideSpotlight(currentGuideTarget); positionGuideTip(currentGuideTarget); }
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hideGuide(); unlockGuideProgressIfNeeded(); }
  });

  programmingChecks.forEach(function (item) {
    item.addEventListener('click', function () { item.classList.toggle('is-checked'); updateCodingAction(); });
  });

  if (completeStep1) {
    completeStep1.addEventListener('click', function () {
      if (challengeTimeUp) return;
      if (wiringAction) wiringAction.classList.add('is-hidden');
      var panel = completeStep1.closest('.step-panel');
      if (panel) { panel.classList.add('is-completed'); panel.classList.remove('is-unlocked', 'is-expanded'); setStepStatus(panel, '✅ مكتملة'); }
      markTopStepCompleted('1');
      unlockStep('2');
      unlockProgrammingSubstep(0);
    });
  }

  if (completeStep2) {
    completeStep2.addEventListener('click', function () {
      if (challengeTimeUp) return;
      if (codingAction) codingAction.classList.add('is-hidden');
      var panel = completeStep2.closest('.step-panel');
      if (panel) { panel.classList.add('is-completed'); panel.classList.remove('is-unlocked', 'is-expanded'); setStepStatus(panel, '✅ مكتملة'); }
      markTopStepCompleted('2');
      localStorage.setItem('cq_challenge_1_complete', 'true');
      moveStepTimerToSubmitGate();
      if (submitGate) { submitGate.classList.remove('hidden'); submitGate.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  if (submitProjectBtn) {
    submitProjectBtn.addEventListener('click', function () {
      if (submitWarning) submitWarning.classList.add('is-visible');
    });
  }

  if (submitCancelBtn) {
    submitCancelBtn.addEventListener('click', function () {
      if (submitWarning) submitWarning.classList.remove('is-visible');
    });
  }

  if (submitConfirmBtn) {
    submitConfirmBtn.addEventListener('click', function () {
      lockProjectReview();
      removeStepTimerOrb();
      if (submitGate) submitGate.classList.add('hidden');
      if (nextTrack) { nextTrack.classList.remove('hidden'); nextTrack.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  stepPanels.forEach(function (panel) {
    var header = panel.querySelector('.step-header');
    var toggle = panel.querySelector('.step-toggle');
    function toggleCompleted(e) {
      if (e) e.stopPropagation();
      if (projectLocked) return;
      if (!panel.classList.contains('is-completed')) return;
      panel.classList.toggle('is-expanded');
      if (toggle) toggle.setAttribute('aria-expanded', panel.classList.contains('is-expanded') ? 'true' : 'false');
    }
    if (header) header.addEventListener('click', function (e) { if (!e.target.closest('.step-toggle')) toggleCompleted(); });
    if (toggle) toggle.addEventListener('click', toggleCompleted);
  });

  updateWiringCounter();
  updateWiringAction();
  updateCodingAction();
  refreshWiringSubsteps();
  updateWiringTimerLabel();

  /* ── Auto-start guide when coming from intro page ── */
  if (new URLSearchParams(window.location.search).get('autostart') === '1' && startChallengeBtn) {
    window.setTimeout(function() { startChallengeBtn.click(); }, 500);
  }
});

/* Top-row tab toggle */
function toggleStepContent(stepNum) {
  var panel = document.querySelector('.step-panel[data-step="' + stepNum + '"]');
  var tab   = document.querySelector('.steps-top-row [data-step-headonly="' + stepNum + '"], .steps-top-row [data-step-preview="' + stepNum + '"]');
  if (!panel) return;
  if (window.projectLocked) return;
  var collapsed = panel.classList.toggle('is-content-collapsed');
  panel.classList.toggle('is-expanded', !collapsed);
  if (tab) tab.classList.toggle('is-collapsed', collapsed);
  if (!collapsed) {
    document.querySelectorAll('.step-panel[data-step]').forEach(function (otherPanel) {
      if (otherPanel === panel) return;
      otherPanel.classList.add('is-content-collapsed');
      otherPanel.classList.remove('is-expanded');
    });
    document.querySelectorAll('.steps-top-row .step-panel').forEach(function (otherTab) {
      if (otherTab === tab) return;
      otherTab.classList.add('is-collapsed');
    });
  }
}

(function(){
  var b=document.getElementById('themeToggle');
  var s=localStorage.getItem('cq-theme');
  if(s==='dark'){document.documentElement.setAttribute('data-theme','dark');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>';}
  b.addEventListener('click',function(){
    var d=document.documentElement.getAttribute('data-theme')==='dark';
    if(d){document.documentElement.removeAttribute('data-theme');b.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';localStorage.setItem('cq-theme','light');}
    else{document.documentElement.setAttribute('data-theme','dark');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>';localStorage.setItem('cq-theme','dark');}
  });
})();

