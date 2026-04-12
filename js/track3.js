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

  if (!form) return;

  populateChallengeOptions();

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

    if (!name.trim() || !school.trim() || !challenge) { alert('يرجى ملء جميع الحقول'); return; }
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
