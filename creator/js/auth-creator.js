function switchTab(tab) {
  ['signin','signup','forgot'].forEach(function(t) {
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.auth-tab').forEach(function(btn, i) {
    btn.classList.toggle('active', (tab === 'signin' && i === 0) || (tab === 'signup' && i === 1));
  });
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
  var name     = document.getElementById('su-name').value.trim();
  var email    = document.getElementById('su-email').value.trim().toLowerCase();
  var password = document.getElementById('su-password').value;
  var btn = document.getElementById('btn-signup');
  var msg = document.getElementById('msg-signup');

  if (!name)  { msg.textContent = 'أدخل اسمك الكامل'; msg.className = 'auth-msg error'; return; }
  if (!email) { msg.textContent = 'أدخل بريدك الإلكتروني'; msg.className = 'auth-msg error'; return; }
  if (password.length < 6) { msg.textContent = 'كلمة المرور 6 أحرف على الأقل'; msg.className = 'auth-msg error'; return; }

  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الإرسال...';
  CQ_API.signUp({
    name:         name,
    email:        email,
    passwordHash: (function(p){ var h=0; for(var i=0;i<p.length;i++) h=(Math.imul(31,h)+p.charCodeAt(i))|0; return h.toString(16); })(password),
    role:         'creator'
  }).then(function(result) {
    btn.disabled = false; btn.textContent = 'إرسال طلب التسجيل';
    if (result.ok) {
      msg.textContent = 'تم إرسال طلبك بنجاح. بانتظار موافقة الأدمن.';
      msg.className = 'auth-msg success';
      setTimeout(function() { switchTab('signin'); }, 2000);
    } else {
      msg.textContent = result.msg || 'حدث خطأ، حاول مجدداً'; msg.className = 'auth-msg error';
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
