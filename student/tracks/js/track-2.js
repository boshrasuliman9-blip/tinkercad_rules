/* ════════════════════════════════════════
   Circuit Quest — Track 2 Dynamic Map
   ════════════════════════════════════════ */

/* ── Session ── */
var _session = null;
try { _session = JSON.parse(localStorage.getItem('cq_session') || 'null'); } catch(e){}

/* ── Load notifications if logged in ── */
var _notifs = [];
if (_session && _session.id) {
  CQ_API.getStudentNotifs(_session.id).then(function(res) {
    _notifs = res.notifs || res.data || [];
    var unread = _notifs.filter(function(n){ return !n.readAt; }).length;
    var wrap = document.getElementById('notif-bell-wrap');
    var cnt  = document.getElementById('notif-bell-count');
    if (wrap) { wrap.style.display = 'inline-flex'; }
    if (cnt && unread > 0) { cnt.textContent = unread; cnt.style.display = 'flex'; }
    renderNotifPanel();
  });
}

function toggleNotifPanel() {
  var p = document.getElementById('notif-panel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function renderNotifPanel() {
  var ul = document.getElementById('notif-panel-list');
  if (!ul) return;
  if (!_notifs.length) { ul.innerHTML = '<li style="font-size:.85rem;color:#64748b;padding:.5rem;">لا توجد إشعارات</li>'; return; }
  ul.innerHTML = _notifs.slice(0,10).map(function(n) {
    var bg = n.readAt ? '#fff' : '#f0fdf4';
    var icon = n.type === 'approval' ? '✅' : n.type === 'rejection' ? '❌' : '🔔';
    var text = n.message || n.title || n.body || '';
    return '<li onclick="readNotif(\''+n.id+'\',this)" style="display:flex;gap:8px;padding:.6rem;border-radius:10px;cursor:pointer;background:'+bg+';margin-bottom:4px;">'
      + '<span style="font-size:1rem;flex-shrink:0;">'+icon+'</span>'
      + '<div style="font-size:.82rem;"><div>'+text+'</div><div style="font-size:.72rem;color:#64748b;margin-top:2px;">'+fmtDate(n.createdAt)+'</div></div>'
      + '</li>';
  }).join('');
}

function readNotif(id, el) {
  el.style.background = '#fff';
  CQ_API.markNotifRead(id).then(function() {
    var cnt = document.getElementById('notif-bell-count');
    var unread = _notifs.filter(function(n){ return !n.readAt && n.id !== id; }).length;
    if (cnt) { cnt.textContent = unread; cnt.style.display = unread ? 'flex' : 'none'; }
    var n = _notifs.find(function(x){ return x.id === id; });
    if (n) n.readAt = new Date().toISOString();
  });
}

function markAllNotifsRead() {
  if (!_session) return;
  CQ_API.markAllNotifsRead(_session.id).then(function() {
    _notifs.forEach(function(n){ n.readAt = new Date().toISOString(); });
    renderNotifPanel();
    var cnt = document.getElementById('notif-bell-count');
    if (cnt) cnt.style.display = 'none';
  });
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('ar-SA');
}

/* ── localStorage challenge state ── */
var STORE_KEY = _session ? ('cq_t2_state_' + _session.id) : 'cq_t2_state_guest';

function getChallengeState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) { return []; }
}

function saveChallengeState(arr) {
  localStorage.setItem(STORE_KEY, JSON.stringify(arr));
}

/* State item: { step, codeId, name, href, status: 'started'|'submitted'|'approved'|'rejected' } */

/* ── Code entry modal ── */
var _activeStep = null;
var _pendingCodeData = null;

function openCodeModal(step, title) {
  _activeStep = step;
  var el = document.getElementById('code-modal');
  var ti = document.getElementById('code-modal-title');
  var inp = document.getElementById('code-input');
  var msg = document.getElementById('code-msg');
  if (ti) ti.textContent = title || ('التحدي ' + step);
  if (inp) inp.value = '';
  if (msg) msg.style.display = 'none';
  if (el) el.style.display = 'flex';
  setTimeout(function(){ if (inp) inp.focus(); }, 100);
}

function closeCodeModal() {
  var el = document.getElementById('code-modal');
  if (el) el.style.display = 'none';
}

function showCodeMsg(txt, type) {
  var el = document.getElementById('code-msg');
  if (!el) return;
  el.textContent = txt;
  el.style.cssText = 'display:block;font-size:.82rem;padding:9px 12px;border-radius:8px;margin-bottom:.8rem;'
    + (type === 'ok'
      ? 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;'
      : 'background:#fff0ed;color:#c93a12;border:1px solid #fdd;');
}

function submitCode() {
  if (!_session) {
    showCodeMsg('يجب تسجيل الدخول أولاً', 'err');
    return;
  }
  var code = (document.getElementById('code-input').value || '').trim();
  if (!code) { showCodeMsg('أدخل الرمز أولاً', 'err'); return; }

  var btn = document.querySelector('#code-modal button');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  CQ_API.validateCode(code, _session.id).then(function(res) {
    if (btn) { btn.disabled = false; btn.textContent = 'بدء التحدي'; }
    if (!res.ok) { showCodeMsg(res.msg || 'الرمز غير صحيح أو منتهي الصلاحية', 'err'); return; }

    var codeId = res.codeId;
    var challengeName = res.challengeName || 'التحدي';
    var challengeHref = res.href || res.tinkercadUrl || '#';

    CQ_API.startChallenge(codeId, _session.id).then(function(startRes) {
      var state = getChallengeState();
      var existing = state.find(function(s){ return s.step === _activeStep; });
      if (existing) {
        existing.codeId = codeId; existing.name = challengeName; existing.href = challengeHref; existing.status = 'started';
      } else {
        state.push({ step: _activeStep, codeId: codeId, name: challengeName, href: challengeHref, status: 'started' });
      }
      saveChallengeState(state);
      closeCodeModal();
      if (challengeHref && challengeHref !== '#') {
        window.open(challengeHref, '_blank');
      }
      refreshMap();
    });
  });
}

/* ── Submit modal ── */
var _submitStep = null;

function openSubmitModal(step) {
  _submitStep = step;
  var state = getChallengeState();
  var item = state.find(function(s){ return s.step === step; });
  var el = document.getElementById('submit-modal');
  var ti = document.getElementById('submit-modal-title');
  var msg = document.getElementById('submit-msg');
  if (ti) ti.textContent = 'تسليم: ' + (item ? item.name : 'التحدي ' + step);
  if (msg) msg.style.display = 'none';
  if (el) el.style.display = 'flex';
}

function closeSubmitModal() {
  var el = document.getElementById('submit-modal');
  if (el) el.style.display = 'none';
}

function doSubmitChallenge() {
  if (!_session) return;
  var state = getChallengeState();
  var item = state.find(function(s){ return s.step === _submitStep; });
  if (!item || !item.codeId) { return; }

  var btn = document.querySelector('#submit-modal button');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  CQ_API.submitChallengeCode(item.codeId, _session.id).then(function(res) {
    if (btn) { btn.disabled = false; btn.textContent = 'تسليم للمراجعة'; }
    var msgEl = document.getElementById('submit-msg');
    if (res.ok) {
      item.status = 'submitted';
      saveChallengeState(state);
      if (msgEl) {
        msgEl.textContent = 'تم التسليم بنجاح ✓ سيراجعه معلمك قريباً';
        msgEl.style.cssText = 'display:block;font-size:.82rem;padding:9px 12px;border-radius:8px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;margin-bottom:.8rem;';
      }
      setTimeout(function(){ closeSubmitModal(); refreshMap(); }, 1800);
    } else {
      if (msgEl) {
        msgEl.textContent = res.msg || 'حدث خطأ';
        msgEl.style.cssText = 'display:block;font-size:.82rem;padding:9px 12px;border-radius:8px;background:#fff0ed;color:#c93a12;border:1px solid #fdd;margin-bottom:.8rem;';
      }
    }
  });
}

/* ── Close modals on outside click ── */
document.getElementById('code-modal').addEventListener('click', function(e){ if(e.target===this) closeCodeModal(); });
document.getElementById('submit-modal').addEventListener('click', function(e){ if(e.target===this) closeSubmitModal(); });

/* ── Main page logic ── */
document.addEventListener('DOMContentLoaded', function () {

  /* ── Sync approval status from notifications ── */
  function syncStatusFromNotifs() {
    if (!_notifs.length) return;
    var state = getChallengeState();
    var changed = false;
    _notifs.forEach(function(n) {
      if (n.type === 'approval' && n.codeId) {
        var item = state.find(function(s){ return s.codeId === n.codeId; });
        if (item && item.status !== 'approved') { item.status = 'approved'; changed = true; }
      }
      if (n.type === 'rejection' && n.codeId) {
        var item = state.find(function(s){ return s.codeId === n.codeId; });
        if (item && item.status !== 'rejected') { item.status = 'rejected'; changed = true; }
      }
    });
    if (changed) saveChallengeState(state);
  }
  syncStatusFromNotifs();

  var challengeData = {
    1: {
      title: 'إضاءة LED',
      href: './challenges/track-2-led-challenge.html',
      image: './img/challenge-covers/led-challenge.png',
      desc: 'ابنِ دائرتك الأولى وشغّل LED يومض تلقائيًا حتى تتأكد من فهم التوصيل الأساسي.',
      time: '⏱ 10 دقائق',
      parts: '🔧 5 مكونات',
      level: '⭐ مبتدئ',
      rules: [
        'تأكد من وضع الـ LED والمقاومة في المكان الصحيح.',
        'شغّل المحاكاة وتحقق أن الإضاءة تعمل كما هو مطلوب.',
        'عند إنهاء هذا التحدي سيفتح لك التحدي التالي تلقائيًا.'
      ]
    },
    2: {
      title: 'زر الضغط',
      href: './challenges/track-2-pushbutton-challenge.html',
      image: './img/challenge-covers/pushbutton-challenge.png',
      fallbackImage: './img/challenges/pushbutton-challenge.svg',
      desc: 'وصّل زر الضغط مع الـ LED وتحقق أن المصباح يضيء عند الضغط على الزر فقط.',
      time: '⏱ 15 دقيقة',
      parts: '🔧 6 مكونات',
      level: '⭐ متوسط',
      rules: [
        'أكمل التحدي الأول أولًا قبل محاولة هذا التحدي.',
        'تحقق من توصيل مقاومة الـ pull-down بشكل صحيح.',
        'اختبر المحاكاة وتأكد أن الضغط على الزر هو ما يشغّل الـ LED.'
      ]
    },
    3: {
      title: 'المرحلة 3',
      image: './img/track-covers/track-2-challenges.png',
      desc: 'هذه المرحلة قيد التجهيز حاليًا وستُضاف لاحقًا بنفس أسلوب المراحل السابقة.',
      time: 'قريبًا',
      parts: 'مفاجآت جديدة',
      level: 'Coming Soon',
      rules: [
        'هذه المحطة محفوظة للمراحل القادمة.',
        'سنضيف التحدي الثالث هنا عند اكتمال محتواه.'
      ],
      comingSoon: true
    },
    4: {
      title: 'المرحلة 4',
      image: './img/track-covers/track-2-challenges.png',
      desc: 'المسار مجهّز من الآن ليستقبل المرحلة الرابعة عندما تصبح جاهزة.',
      time: 'قريبًا',
      parts: 'مزيد من الأدوات',
      level: 'Coming Soon',
      rules: [
        'هذه المرحلة ليست متاحة بعد.',
        'تابع المراحل الحالية وسنفتح هذا الجزء لاحقًا.'
      ],
      comingSoon: true
    }
  };

  var modal = document.getElementById('challenge-modal');
  var modalKicker = document.getElementById('modal-kicker');
  var modalTitle = document.getElementById('modal-title');
  var modalStatus = document.getElementById('modal-status');
  var modalImage = document.getElementById('modal-image');
  var modalText = document.getElementById('modal-text');
  var modalTime = document.getElementById('modal-time');
  var modalParts = document.getElementById('modal-parts');
  var modalLevel = document.getElementById('modal-level');
  var modalRules = document.getElementById('modal-rules');
  var modalStart = document.getElementById('modal-start');
  var modalClose = document.getElementById('modal-close');
  var modalCancel = document.getElementById('modal-cancel');
  var guideOverlay = document.getElementById('guide-overlay');
  var guideSpotlight = document.getElementById('guide-spotlight');
  var guideTip = document.getElementById('challenge-tip');
  var guideDismiss = document.getElementById('challenge-tip-dismiss');
  var guideSeenKey = 'cq_track2_guide_seen';
  var currentGuideTarget = null;

  /* ── Dynamic progress from localStorage ── */
  function buildProgress() {
    var state = getChallengeState();
    var p = {};
    state.forEach(function(s) {
      p[s.step] = (s.status === 'approved' || s.status === 'submitted');
    });
    return p;
  }

  function isFirstChallengeDone() {
    var first = getChallengeState().find(function(s){ return s.step === 1; });
    return !!(first && (first.status === 'approved' || first.status === 'submitted'));
  }

  function refreshMap() {
    var state = getChallengeState();
    var statusMap = {};
    state.forEach(function(s){ statusMap[s.step] = s; });

    var progress = buildProgress();
    var doneCount = Object.values(progress).filter(Boolean).length;
    var totalChallenges = Object.keys(challengeData).filter(function(k){ return !challengeData[k].comingSoon; }).length;

    if (isFirstChallengeDone()) hideGuide(true);

    var progressCount = document.getElementById('progress-count');
    var progressFill = document.getElementById('progress-fill');
    var progressNote = document.getElementById('progress-note');

    if (progressCount) progressCount.textContent = String(doneCount) + '/' + totalChallenges;
    if (progressFill) progressFill.style.width = (totalChallenges > 0 ? (doneCount / totalChallenges * 100) : 0) + '%';
    if (progressNote) {
      if (doneCount === 0) progressNote.textContent = 'ابدأ بالتحدي الأول ليتم فتح البقية بالتسلسل.';
      else if (doneCount < totalChallenges) progressNote.textContent = 'رائع! أنجزت ' + doneCount + ' من ' + totalChallenges + ' تحديات.';
      else progressNote.textContent = 'ممتاز، أنجزت جميع التحديات المتاحة! 🎉';
    }

    document.querySelectorAll('.roadmap-stage[data-challenge]').forEach(function(stage) {
      var step = Number(stage.getAttribute('data-challenge'));
      var data = challengeData[step];
      if (!data) return;
      var badge = stage.querySelector('[data-stage-badge]');
      var mark  = stage.querySelector('[data-stage-mark]');
      var stateItem = statusMap[step];

      stage.classList.remove('is-done','is-current','is-locked','is-coming');
      stage.onclick = null;

      if (data.comingSoon) {
        stage.classList.add('is-coming');
        if (badge) badge.textContent = 'Coming Soon';
        if (mark)  mark.textContent  = '🔒';
        stage.onclick = function(){ openModal(step, 'coming'); };
        return;
      }

      var prevDone = step === 1 || progress[step - 1];
      var approved = stateItem && stateItem.status === 'approved';
      var submitted = stateItem && stateItem.status === 'submitted';
      var started   = stateItem && stateItem.status === 'started';
      var rejected  = stateItem && stateItem.status === 'rejected';
      var done = approved || submitted;

      if (done) {
        stage.classList.add('is-done');
        if (badge) badge.textContent = approved ? '✓ مكتمل' : '⏳ بانتظار المراجعة';
        if (mark)  mark.textContent  = approved ? '✓' : '⏳';
        stage.onclick = function(){ openModal(step, 'done', stateItem); };
      } else if (rejected) {
        stage.classList.add('is-locked');
        if (badge) badge.textContent = 'مرفوض — أعد المحاولة';
        if (mark)  mark.textContent  = '↩';
        stage.onclick = function(){ openCodeModal(step, data.title); };
      } else if (started) {
        stage.classList.add('is-current');
        if (badge) badge.textContent = 'جارٍ...';
        if (mark)  mark.textContent  = String(step);
        stage.onclick = function(){ openModal(step, 'started', stateItem); };
      } else if (prevDone) {
        stage.classList.add('is-current');
        if (badge) badge.textContent = step === 1 ? 'ابدأ الآن' : 'جاهز';
        if (mark)  mark.textContent  = String(step);
        stage.onclick = function(){ openCodeModal(step, data.title); };
      } else {
        stage.classList.add('is-locked');
        if (badge) badge.textContent = 'مقفل';
        if (mark)  mark.textContent  = '🔒';
        stage.onclick = function(){ openModal(step, 'locked'); };
      }
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function clearGuideTarget() {
    if (currentGuideTarget) {
      currentGuideTarget.classList.remove('guide-target');
      currentGuideTarget = null;
    }
  }

  function hideGuide(remember) {
    if (guideOverlay) {
      guideOverlay.classList.remove('is-active');
      guideOverlay.setAttribute('aria-hidden', 'true');
    }
    if (guideTip) guideTip.classList.remove('is-guide-visible');
    clearGuideTarget();
    if (remember) localStorage.setItem(guideSeenKey, 'true');
  }

  function updateGuideSpotlight(target) {
    if (!target || !guideSpotlight) return;
    var rect = target.getBoundingClientRect();
    var padX = 12;
    var padY = 12;
    guideSpotlight.style.top = Math.max(8, rect.top - padY) + 'px';
    guideSpotlight.style.left = Math.max(8, rect.left - padX) + 'px';
    guideSpotlight.style.width = (rect.width + (padX * 2)) + 'px';
    guideSpotlight.style.height = (rect.height + (padY * 2)) + 'px';
    guideSpotlight.style.borderRadius = Math.min(36, rect.height / 3) + 'px';
  }

  function showGuide(target) {
    if (!guideOverlay || !guideSpotlight || !guideTip || !target) return;
    clearGuideTarget();
    currentGuideTarget = target;
    currentGuideTarget.classList.add('guide-target');
    guideTip.classList.add('is-guide-visible');
    updateGuideSpotlight(target);
    guideOverlay.classList.add('is-active');
    guideOverlay.setAttribute('aria-hidden', 'false');
  }

  function openModal(step, state, stateItem) {
    var data = challengeData[step];
    if (!modal || !data) return;
    var isUnlocked = state === 'unlocked' || state === 'started' || state === 'done';
    var isComingSoon = state === 'coming';
    var isDone = state === 'done';
    var isStarted = state === 'started';

    if (isComingSoon) {
      modalKicker.textContent = 'قريبًا';
    } else {
      modalKicker.textContent = isUnlocked ? ('التحدي ' + step) : 'التحدي مقفل';
    }
    modalTitle.textContent = data.title;
    if (modalImage) {
      modalImage.src = data.image;
      modalImage.alt = data.title;
      modalImage.onerror = function () {
        if (data.fallbackImage) {
          modalImage.onerror = null;
          modalImage.src = data.fallbackImage;
        }
      };
    }
    modalText.textContent = isComingSoon
      ? data.desc
      : (isUnlocked
        ? data.desc
        : 'أنهِ التحديات السابقة أولًا لفتح هذا التحدي، ثم ارجع هنا وابدأ التحدي التالي.');
    if (modalStatus) {
      if (isComingSoon) {
        modalStatus.textContent = 'Coming Soon';
        modalStatus.className = 'challenge-modal-status st-coming';
      } else if (!isUnlocked) {
        modalStatus.textContent = 'غير متاح بعد';
        modalStatus.className = 'challenge-modal-status st-locked';
      } else if (isDone) {
        modalStatus.textContent = 'مكتمل';
        modalStatus.className = 'challenge-modal-status st-done';
      } else {
        modalStatus.textContent = 'غير مكتمل';
        modalStatus.className = 'challenge-modal-status st-open';
      }
    }
    modalTime.textContent = data.time;
    modalParts.textContent = data.parts;
    modalLevel.textContent = isComingSoon ? data.level : (isUnlocked ? data.level : '🔒 غير متاح بعد');

    modalRules.innerHTML = '';
    (isComingSoon
      ? data.rules
      : (isUnlocked ? data.rules : [
        'أكمل التحدي السابق أولًا.',
        'بعد الإنجاز سيصبح هذا التحدي متاحًا تلقائيًا.'
      ])).forEach(function (rule) {
      var li = document.createElement('li');
      li.textContent = rule;
      modalRules.appendChild(li);
    });

    if (isStarted && stateItem) {
      modalStart.style.display = 'inline-flex';
      modalStart.textContent = '↩ العودة للتحدي';
      modalStart.href = stateItem.href || data.href || '#';
      var submitBtn = document.getElementById('modal-submit-btn');
      if (!submitBtn) {
        submitBtn = document.createElement('button');
        submitBtn.id = 'modal-submit-btn';
        submitBtn.className = 'btn-main';
        submitBtn.style.background = '#16a34a';
        submitBtn.style.marginRight = '8px';
        submitBtn.textContent = '✓ تسليم للمراجعة';
        modalStart.parentNode.insertBefore(submitBtn, modalStart);
      }
      submitBtn.style.display = 'inline-flex';
      submitBtn.onclick = function(){ closeModal(); openSubmitModal(step); };
    } else if (isDone && stateItem && (stateItem.status === 'submitted' || stateItem.status === 'approved')) {
      modalStart.style.display = 'none';
      var submitBtn = document.getElementById('modal-submit-btn');
      if (submitBtn) submitBtn.style.display = 'none';
    } else if (isUnlocked && !isDone && !isStarted) {
      modalStart.style.display = 'inline-flex';
      modalStart.textContent = 'ابدأ التحدي الآن';
      modalStart.href = data.href || '#';
      var submitBtn = document.getElementById('modal-submit-btn');
      if (submitBtn) submitBtn.style.display = 'none';
    } else {
      modalStart.style.display = 'none';
      var submitBtn = document.getElementById('modal-submit-btn');
      if (submitBtn) submitBtn.style.display = 'none';
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }
  if (guideDismiss) {
    guideDismiss.addEventListener('click', function () {
      hideGuide(true);
    });
  }
  if (guideOverlay) {
    guideOverlay.addEventListener('click', function (e) {
      if (e.target === guideOverlay) hideGuide(true);
    });
  }
  window.addEventListener('resize', function () {
    if (currentGuideTarget && guideOverlay && guideOverlay.classList.contains('is-active')) {
      updateGuideSpotlight(currentGuideTarget);
    }
  });
  window.addEventListener('scroll', function () {
    if (currentGuideTarget && guideOverlay && guideOverlay.classList.contains('is-active')) {
      updateGuideSpotlight(currentGuideTarget);
    }
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideGuide(true);
  });

  /* ── Init map ── */
  refreshMap();

  var guideTarget = document.querySelector('.roadmap-stage[data-challenge="1"]');
  var ch1State = getChallengeState().find(function(s){ return s.step === 1; });
  if (guideTarget && !localStorage.getItem(guideSeenKey) && !ch1State) showGuide(guideTarget);
});

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

