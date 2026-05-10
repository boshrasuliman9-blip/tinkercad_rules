/* ============================================
   Track 3 — أرسل عملك
   ١. يرفع الصورة لـ ImgBB (رابط دائم)
   ٢. يرسل البيانات لـ Google Apps Script
   ٣. Apps Script يبعث إيميل فيه زر ✅ موافقة
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var form        = document.getElementById('upload-form');
  var formCard    = document.getElementById('form-card');
  var successCard = document.getElementById('success-card');
  var fileInput   = document.getElementById('file-input');
  var uploadArea  = document.getElementById('upload-area');
  var preview     = document.getElementById('upload-preview');
  var submitBtn   = form ? form.querySelector('button[type="submit"]') : null;
  var selectedFile = null;
  var session = getSession();

  if (!form) return;

  fillAutoFields();

  function populateChallengeOptions() {
    var select = document.getElementById('challenge-select') || form.querySelector('[name="challenge"]');
    var challenges = Array.isArray(window.CQ_CHALLENGES) ? window.CQ_CHALLENGES : [];
    if (!select || !challenges.length) return;

    select.innerHTML = '<option value="" disabled selected>اختر التحدي</option>';
    challenges
      .filter(function (challenge) { return challenge && challenge.enabled !== false; })
      .sort(function (a, b) { return (a.id || 0) - (b.id || 0); })
      .forEach(function (challenge) {
        var option = document.createElement('option');
        option.value = challenge.value || challenge.title || '';
        option.textContent = challenge.label || challenge.title || option.value;
        select.appendChild(option);
      });
  }

  /* ── منطقة رفع الصورة ── */
  function getSession() {
    try { return JSON.parse(localStorage.getItem('cq_session') || 'null'); }
    catch (e) { return null; }
  }

  function setDisplay(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  }

  function setHidden(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  function showAutoNote(text) {
    var note = document.getElementById('auto-submit-note');
    if (!note) return;
    note.textContent = text || '';
    note.classList.toggle('show', !!text);
  }

  function getChallengeFromState() {
    if (!session || !session.id) return null;
    var state = [];
    try { state = JSON.parse(localStorage.getItem('cq_t2_state_' + session.id) || '[]'); } catch(e) {}
    if (!Array.isArray(state) || !state.length) return null;
    var candidates = state.filter(function(item) {
      return item && item.name && (item.status === 'started' || item.status === 'submitted' || item.status === 'approved');
    });
    return candidates.length ? candidates[candidates.length - 1] : null;
  }

  function getChallengeFromUrlOrList() {
    var params = new URLSearchParams(window.location.search);
    var key = params.get('challengeKey') || params.get('challenge') || '';
    var challenges = Array.isArray(window.CQ_CHALLENGES) ? window.CQ_CHALLENGES : [];
    if (key) {
      var match = challenges.find(function(ch) {
        return ch && (ch.key === key || ch.value === key || ch.title === key);
      });
      if (match) return { name: match.value || match.title || match.label || key };
      return { name: key };
    }
    var fromState = getChallengeFromState();
    if (fromState) return { name: fromState.name };
    return null;
  }

  function fillSchoolName() {
    var fallback = (session && (session.schoolName || session.school || session.schoolId)) || '';
    setDisplay('auto-school-name', fallback);
    setHidden('school-name-hidden', fallback);
    if (!session || !session.schoolId || !window.CQ_API || !CQ_API.getSchools) return;

    CQ_API.getSchools().then(function(res) {
      var schools = res.schools || res.data || [];
      var school = schools.find(function(s) { return s.id === session.schoolId; });
      if (!school) return;
      setDisplay('auto-school-name', school.name || fallback);
      setHidden('school-name-hidden', school.name || fallback);
    });
  }

  function fillAutoFields() {
    if (!session || session.role !== 'student') {
      showAutoNote('سجّل الدخول كطالب حتى يتم تعبئة بياناتك تلقائياً.');
      return;
    }

    setDisplay('auto-student-name', session.name || '');
    setHidden('student-name-hidden', session.name || '');
    fillSchoolName();

    var challenge = getChallengeFromUrlOrList();
    if (challenge && challenge.name) {
      setDisplay('auto-challenge-name', challenge.name);
      setHidden('challenge-hidden', challenge.name);
      showAutoNote('');
    } else {
      setDisplay('auto-challenge-name', 'لم يتم تحديد تحدي');
      setHidden('challenge-hidden', '');
      showAutoNote('افتح التحدي من الإشعار أو من خريطة التحديات أولاً حتى نحدد اسم التحدي تلقائياً.');
    }
  }

  if (uploadArea) {
    uploadArea.addEventListener('click', function () { fileInput && fileInput.click(); });
    uploadArea.addEventListener('dragover', function (e) { e.preventDefault(); uploadArea.classList.add('drag'); });
    uploadArea.addEventListener('dragleave', function () { uploadArea.classList.remove('drag'); });
    uploadArea.addEventListener('drop', function (e) {
      e.preventDefault(); uploadArea.classList.remove('drag');
      if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (fileInput.files[0]) setFile(fileInput.files[0]);
    });
  }

  function setFile(file) {
    if (!file.type.startsWith('image/')) { alert('يرجى اختيار صورة فقط'); return; }
    selectedFile = file;
    var reader = new FileReader();
    reader.onload = function (e) {
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
      if (uploadArea) {
        var icon = uploadArea.querySelector('.upload-icon');
        var text = uploadArea.querySelector('.upload-text');
        if (icon) icon.textContent = '✅';
        if (text) text.innerHTML = '<strong>' + file.name + '</strong>';
      }
    };
    reader.readAsDataURL(file);
  }

  /* ── إرسال الفورم ── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name      = (form.querySelector('[name="student_name"]') || {}).value || '';
    var school    = (form.querySelector('[name="school_name"]')  || {}).value || '';
    var challenge = (form.querySelector('[name="challenge"]')    || {}).value || '';

    if (!name.trim() || !school.trim() || !challenge.trim()) { alert('تعذر تحديد بيانات الطالب أو المدرسة أو التحدي تلقائياً'); return; }
    if (!selectedFile) { alert('يرجى اختيار صورة الدائرة'); return; }

    setLoading(true);

    /* الخطوة ١ — رفع الصورة لـ ImgBB */
    var imgData = new FormData();
    imgData.append('image', selectedFile);

    fetch('https://api.imgbb.com/1/upload?key=' + CQ.imgbbKey, {
      method: 'POST',
      body: imgData
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success) throw new Error('فشل رفع الصورة — تحقق من مفتاح ImgBB في config.js');
      var imageUrl = res.data.url;

      /* الخطوة ٢ — إرسال البيانات لـ Apps Script */
      var url = CQ.scriptUrl
        + '?action=submit'
        + '&name='      + encodeURIComponent(name.trim())
        + '&school='    + encodeURIComponent(school.trim())
        + '&challenge=' + encodeURIComponent(challenge)
        + '&imageUrl='  + encodeURIComponent(imageUrl);

      return fetch(url);
    })
    .then(function () {
      formCard.classList.add('hidden');
      successCard.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(function (err) {
      setLoading(false);
      alert('حدث خطأ:\n' + err.message);
    });
  });

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled    = on;
    submitBtn.textContent = on ? '⏳ جاري الإرسال...' : '📤 أرسل العمل';
  }
});
