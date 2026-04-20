function switchTab(tab) {
  ['signin','signup','forgot'].forEach(function(t) {
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.auth-tab').forEach(function(btn, i) {
    btn.classList.toggle('active', (tab === 'signin' && i === 0) || (tab === 'signup' && i === 1));
  });
}

function handleLookupCode() {
  var code = document.getElementById('su-code').value.trim().toUpperCase();
  var btn  = document.getElementById('btn-lookup');
  var msg  = document.getElementById('msg-lookup');
  if (!code) { msg.textContent = 'أدخل الرمز التعريفي'; msg.className = 'auth-msg error'; return; }
  btn.disabled = true; btn.textContent = 'جاري التحقق...'; msg.className = 'auth-msg';

  CQ_API.lookupCode(code).then(function(result) {
    btn.disabled = false; btn.textContent = 'تحقق من الرمز';
    if (!result.ok) { msg.textContent = result.msg; msg.className = 'auth-msg error'; return; }
    if (result.role !== 'creator') { msg.textContent = 'هذا الرمز ليس لمبتكر. استخدم رمزاً يبدأ بـ CR-'; msg.className = 'auth-msg error'; return; }
    document.getElementById('su-usercode').value  = code;
    document.getElementById('su-name').value      = result.name || '';
    document.getElementById('su-found-name').textContent = result.name || '';
    document.getElementById('su-found-meta').textContent = 'مبتكر معتمد';
    document.getElementById('step-code').style.display   = 'none';
    document.getElementById('form-signup').style.display = '';
    msg.className = 'auth-msg';
  });
}

function resetCodeStep() {
  document.getElementById('step-code').style.display   = '';
  document.getElementById('form-signup').style.display = 'none';
  document.getElementById('msg-lookup').className = 'auth-msg';
  document.getElementById('su-code').value = '';
}

function handleSignIn(e) {
  e.preventDefault();
  var btn = document.getElementById('btn-signin');
  var msg = document.getElementById('msg-signin');
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الدخول...';
  Auth.signIn(
    document.getElementById('si-email').value,
    document.getElementById('si-password').value,
    'creator'
  ).then(function(result) {
    btn.disabled = false; btn.textContent = 'دخول';
    if (result.ok) {
      msg.textContent = 'تم الدخول بنجاح! جاري التحويل...'; msg.className = 'auth-msg success';
      setTimeout(function() { window.location.href = './dashboard.html'; }, 800);
    } else {
      msg.textContent = result.msg; msg.className = 'auth-msg error';
    }
  });
}

function handleSignUp(e) {
  e.preventDefault();
  var btn = document.getElementById('btn-signup');
  var msg = document.getElementById('msg-signup');
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الإنشاء...';
  CQ_API.signUp({
    name:         document.getElementById('su-name').value.trim(),
    email:        document.getElementById('su-email').value.trim().toLowerCase(),
    passwordHash: (function(p){ var h=0; for(var i=0;i<p.length;i++) h=(Math.imul(31,h)+p.charCodeAt(i))|0; return h.toString(16); })(document.getElementById('su-password').value),
    role:         'creator',
    userCode:     document.getElementById('su-usercode').value
  }).then(function(result) {
    btn.disabled = false; btn.textContent = 'إنشاء الحساب';
    if (result.ok) {
      msg.textContent = result.pending ? 'تم الطلب. بانتظار موافقة الأدمن.' : 'تم إنشاء الحساب! جاري التحويل...';
      msg.className = 'auth-msg success';
      if (!result.pending) setTimeout(function() { window.location.href = './dashboard.html'; }, 800);
      else setTimeout(function() { switchTab('signin'); }, 1400);
    } else {
      msg.textContent = result.msg; msg.className = 'auth-msg error';
    }
  });
}

function handleForgot(e) {
  e.preventDefault();
  var btn = document.getElementById('btn-forgot');
  var msg = document.getElementById('msg-forgot');
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الإرسال...';
  CQ_API.requestReset(document.getElementById('fg-email').value).then(function(result) {
    btn.disabled = false; btn.textContent = 'إرسال الطلب';
    msg.textContent = result.msg || (result.ok ? 'تم الإرسال بنجاح' : 'حدث خطأ');
    msg.className = 'auth-msg ' + (result.ok ? 'success' : 'error');
  });
}

(function() {
  var btn  = document.getElementById('themeToggle');
  var html = document.documentElement;
  var saved = localStorage.getItem('cq_theme') || 'light';
  html.dataset.theme = saved;
  btn.textContent = saved === 'dark' ? '☀️' : '🌙';
  btn.addEventListener('click', function() {
    var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('cq_theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
})();
