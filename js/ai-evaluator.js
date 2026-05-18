/* ============================================================
   Circuit Quest — AI Circuit Evaluator
   يتواصل مع Python Flask server على http://localhost:5000
   النتيجة لا تظهر للطالب — تذهب للمعلم والأدمن فقط
   ============================================================ */

var CQ_AI = (function () {

  var SERVER_URL = 'http://localhost:5000/evaluate';
  var _initialized = false;
  var _loadingTimer = null;
  var _badgeTimer   = null;
  var _currentImageData = null;

  var BADGE_SCAN_STEPS = ['فحص وجود الدارة...', 'فحص المكونات...', 'فحص الأسلاك...'];

  var LOADING_STEPS = [
    { icon: '📸', label: 'جاري قراءة بيانات الصورة...',             pct: 15 },
    { icon: '🔌', label: 'جاري تحديد المكونات الإلكترونية...',       pct: 40 },
    { icon: '⚡', label: 'جاري التحقق من اتجاه LED والمقاومة...',   pct: 65 },
    { icon: '🤖', label: 'جاري تتبع مسار التيار الكهربائي...',       pct: 85 },
    { icon: '⏳', label: 'جاري إنتاج التقرير النهائي...',            pct: 94 }
  ];

  /* ─── Read student context ─── */
  function getStudentContext() {
    var params  = new URLSearchParams(window.location.search);
    var session = null;
    try { session = JSON.parse(localStorage.getItem('cq_session') || 'null'); } catch(e) {}
    return {
      codeId:      params.get('codeId')      || '',
      studentId:   session ? (session.id   || '') : '',
      studentName: session ? (session.name || '') : ''
    };
  }

  /* ─── Public: initialize evaluation section ─── */
  function init(challengeKey) {
    if (_initialized) return;
    _initialized = true;

    var fileInput   = document.getElementById('ai-file-input');
    var dropzone    = document.getElementById('ai-dropzone');
    var previewWrap = document.getElementById('ai-preview-wrap');
    var previewImg  = document.getElementById('ai-preview-img');
    var changeBtn   = document.getElementById('ai-change-btn');
    var submitBtn   = document.getElementById('ai-submit-btn');

    if (!fileInput) return;

    var currentImageData = null;

    function loadImage(file) {
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        alert('الصورة أكبر من 10MB، اختر صورة أصغر.');
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var MAX = 1000;
          var scale = Math.min(1, MAX / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          currentImageData = canvas.toDataURL('image/jpeg', 0.92);
          _currentImageData = currentImageData;
          previewImg.src   = currentImageData;
          previewWrap.classList.remove('hidden');
          dropzone.classList.add('hidden');
          submitBtn.disabled = false;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', function () {
      if (fileInput.files[0]) loadImage(fileInput.files[0]);
    });

    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        currentImageData = null;
        _currentImageData = null;
        previewWrap.classList.remove('is-scanning');
        var oldRadar = previewWrap.querySelector('.ai-scan-radar');
        if (oldRadar) oldRadar.remove();
        var oldProg = document.getElementById('ai-scan-progress');
        if (oldProg) oldProg.remove();
        previewWrap.classList.add('hidden');
        dropzone.classList.remove('hidden');
        submitBtn.classList.remove('hidden');
        submitBtn.disabled = true;
        fileInput.value = '';
        hidePending();
      });
    }

    /* Drag & drop */
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('is-drag-over');
    });
    dropzone.addEventListener('dragleave', function () {
      dropzone.classList.remove('is-drag-over');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('is-drag-over');
      var file = e.dataTransfer.files[0];
      if (file) loadImage(file);
    });

    submitBtn.addEventListener('click', function () {
      if (!currentImageData) return;
      runEvaluation(currentImageData, challengeKey || 'led', getStudentContext());
    });
  }

  /* ─── Run evaluation ─── */
  function runEvaluation(imageData, challenge, ctx) {
    showLoading(true);

    fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image:       imageData,
        challenge:   challenge,
        codeId:      (ctx && ctx.codeId)      || '',
        studentId:   (ctx && ctx.studentId)   || '',
        studentName: (ctx && ctx.studentName) || ''
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showLoading(false);
        renderResult(data);  // مؤقت للتيست — بعدين نرجع showPending()
      })
      .catch(function () {
        showLoading(false);
        showError();
      });
  }

  /* ─── UI helpers ─── */
  var COMP_LABELS = [
    { key: 'arduino',    label: 'Arduino UNO' },
    { key: 'breadboard', label: 'لوحة التجارب' },
    { key: 'led',        label: 'LED' },
    { key: 'resistor',   label: 'Resistor' }
  ];
  var WIRE_LABELS = [
    { key: 'power_wire', label: 'سلك الطاقة (5V أو Digital Pin)' },
    { key: 'gnd_wire',   label: 'سلك الأرضي (GND)' },
    { key: 'series',     label: 'LED و Resistor موصولين بالتسلسل' }
  ];

  function showLoading(show) {
    var loading     = document.getElementById('ai-loading');
    var previewWrap = document.getElementById('ai-preview-wrap');
    var dropzone    = document.getElementById('ai-dropzone');
    var submitBtn   = document.getElementById('ai-submit-btn');
    var changeBtn   = document.getElementById('ai-change-btn');

    if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }

    if (!show) {
      if (_badgeTimer) { clearInterval(_badgeTimer); _badgeTimer = null; }
      if (loading) loading.classList.add('hidden');
      if (previewWrap) {
        previewWrap.classList.remove('is-scanning');
        var oldRadar = previewWrap.querySelector('.ai-scan-radar');
        if (oldRadar) oldRadar.remove();
      }
      return;
    }

    /* show=true: blur الصورة + رادار فوقها */
    var existing = document.getElementById('ai-result-test-wrap');
    if (existing) existing.remove();

    if (loading)   loading.classList.add('hidden');
    if (dropzone)  dropzone.classList.add('hidden');
    if (submitBtn) submitBtn.classList.add('hidden');
    if (changeBtn) changeBtn.classList.add('hidden');

    if (!previewWrap) return;
    previewWrap.classList.remove('hidden');
    previewWrap.classList.add('is-scanning');
    var oldRadar = previewWrap.querySelector('.ai-scan-radar');
    if (oldRadar) oldRadar.remove();

    var radar = document.createElement('div');
    radar.className = 'ai-scan-radar';
    radar.innerHTML =
      '<div class="ai-scan-corner tl"></div>' +
      '<div class="ai-scan-corner tr"></div>' +
      '<div class="ai-scan-corner bl"></div>' +
      '<div class="ai-scan-corner br"></div>' +
      '<div class="ai-scan-line"></div>' +
      '<div class="ai-scan-top">' +
        '<span class="ai-scan-badge" id="ai-scan-badge">' + BADGE_SCAN_STEPS[0] + '</span>' +
      '</div>';
    previewWrap.appendChild(radar);

    /* cycling badge text */
    var _badgeIndex = 0;
    if (_badgeTimer) clearInterval(_badgeTimer);
    _badgeTimer = setInterval(function () {
      _badgeIndex = (_badgeIndex + 1) % BADGE_SCAN_STEPS.length;
      var b = document.getElementById('ai-scan-badge');
      if (b) b.textContent = BADGE_SCAN_STEPS[_badgeIndex];
    }, 1800);

  }

  /* تشغيل animation تسلسلية بعد وصول النتيجة */
  function animateChecklist(wrap, items, startDelay, onDone) {
    var SPIN_MS   = 600;
    var GAP_MS    = 150;
    var list = wrap.querySelector('[data-checklist="' + items[0].listId + '"]');

    items.forEach(function(item, i) {
      var delay = startDelay + i * (SPIN_MS + GAP_MS);

      /* 1 — أظهر السطر مع spinner */
      setTimeout(function() {
        var li = document.createElement('li');
        li.className = 'ai-check-row is-loading';
        li.style.opacity   = '0';
        li.style.transform = 'translateX(10px)';
        li.innerHTML =
          '<span class="ai-check-icon"><span class="ai-check-spinner"></span></span>' +
          '<span class="ai-check-label">' + item.label + '</span>';
        list.appendChild(li);
        requestAnimationFrame(function() {
          li.style.transition = 'opacity .25s ease, transform .25s ease';
          li.style.opacity    = '1';
          li.style.transform  = 'translateX(0)';
        });

        /* 2 — بعد SPIN_MS حوّله لنتيجة */
        setTimeout(function() {
          li.className = 'ai-check-row ' + (item.ok ? 'is-ok' : 'is-fail');
          var icon = li.querySelector('.ai-check-icon');
          if (icon) icon.innerHTML = item.ok ? '✅' : '❌';
          if (!item.ok && item.note) {
            var n = document.createElement('span');
            n.className   = 'ai-check-note';
            n.textContent = item.note;
            li.appendChild(n);
          }
        }, SPIN_MS);
      }, delay);
    });

    var totalTime = startDelay + items.length * (SPIN_MS + GAP_MS);
    if (onDone) setTimeout(onDone, totalTime);
    return totalTime;
  }

  /* بعد الإرسال الناجح — رسالة "في انتظار المراجعة" */
  function showPending() {
    var pending = document.getElementById('ai-pending');
    if (pending) {
      pending.classList.remove('hidden');
      pending.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function hidePending() {
    var pending = document.getElementById('ai-pending');
    if (pending) pending.classList.add('hidden');
  }

  /* نتيجة التقييم */
  function renderResult(data) {
    var pending     = document.getElementById('ai-pending');
    var errEl       = document.getElementById('ai-conn-error');
    var previewWrap = document.getElementById('ai-preview-wrap');
    if (pending)     pending.classList.add('hidden');
    if (errEl)       errEl.classList.add('hidden');
    if (previewWrap) previewWrap.classList.add('hidden');

    var section  = document.getElementById('ai-eval-section');
    var existing = document.getElementById('ai-result-test-wrap');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.id = 'ai-result-test-wrap';

    if (data.notACircuit) {
      wrap.innerHTML =
        '<div class="ai-not-circuit">' +
          '<div class="ai-not-circuit-icon">🖼️</div>' +
          '<div class="ai-not-circuit-title">الصورة لا تمثل دارة إلكترونية</div>' +
          '<p class="ai-not-circuit-sub">يرجى رفع لقطة شاشة لدائرتك من Tinkercad (عرض Breadboard).</p>' +
          '<button class="ai-retry-btn" onclick="(function(b){var u=document.getElementById(\'ai-upload-step\');if(u)u.classList.remove(\'hidden\');document.getElementById(\'ai-change-btn\').click();b.closest(\'#ai-result-test-wrap\').remove();})(this)">ضع صورة دارة</button>' +
        '</div>';
      if (section) section.appendChild(wrap);
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    var correct  = data.correct === true;
    var feedback = data.feedback || '';
    var comps    = data.components || {};
    var wiring   = data.wiring    || {};

    /* جمع كل الأخطاء من المكونات والتوصيلة */
    var issues = [];
    ['arduino','breadboard','led','resistor'].forEach(function(key) {
      var c = comps[key] || {};
      if (c.found === false && c.note) issues.push(c.note);
    });
    if (wiring.checked) {
      ['power_wire','gnd_wire','series'].forEach(function(key) {
        var w = wiring[key] || {};
        if (w.ok === false && w.note) issues.push(w.note);
      });
    }

    var issuesHtml = issues.length
      ? '<ul class="ai-result-test-issues">' + issues.map(function(i){ return '<li>' + i + '</li>'; }).join('') + '</ul>'
      : '';

    var retryOnclick = "(function(b){var u=document.getElementById('ai-upload-step');if(u)u.classList.remove('hidden');document.getElementById('ai-change-btn').click();b.closest('#ai-result-test-wrap').remove();})(this)";
    var actionsHtml = correct
      ? '<div class="ai-result-actions"><button class="ai-retry-btn" onclick="' + retryOnclick + '">جرّب مرة ثانية</button></div>'
      : '<div class="ai-result-actions">' +
          '<button class="ai-retry-btn" onclick="' + retryOnclick + '">غيّر الصورة وجرّب</button>' +
          '<button class="ai-review-btn" onclick="(function(){var s=document.querySelector(\'[data-step]\');if(s)s.scrollIntoView({behavior:\'smooth\',block:\'start\'});})()">راجع خطوات التوصيل</button>' +
        '</div>';

    var imgHtml = _currentImageData
      ? '<img src="' + _currentImageData + '" alt="صورة الدائرة" class="ai-result-test-img">'
      : '';

    wrap.innerHTML =
      '<div class="ai-result-test ' + (correct ? 'is-correct' : 'is-wrong') + '">' +
        imgHtml +
        '<div class="ai-result-test-badge">' + (correct ? '✅' : '❌') + '</div>' +
        '<div class="ai-result-test-title">' + (correct ? 'دائرتك صحيحة! 🎉' : 'الدائرة تحتاج تعديل') + '</div>' +
        '<p class="ai-result-test-feedback">' + feedback + '</p>' +
        issuesHtml +
        actionsHtml +
      '</div>';

    if (section) section.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* خطأ في الاتصال */
  function showError() {
    var errEl = document.getElementById('ai-conn-error');
    if (errEl) {
      errEl.classList.remove('hidden');
      var uploadStep = document.getElementById('ai-upload-step');
      if (uploadStep) uploadStep.classList.remove('hidden');
    }
  }

  return { init: init };

})();
