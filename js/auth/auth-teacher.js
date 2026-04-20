const FORCED_ROLE = 'teacher';

function switchTab(tab) {
  ['signin','signup','forgot','reset'].forEach(function(t) {
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.auth-tab').forEach(function(btn, i) {
    btn.classList.toggle('active', (tab === 'signin' && i === 0) || (tab === 'signup' && i === 1));
  });
}

function handleSignIn(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-signin');
  const msg = document.getElementById('msg-signin');
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الدخول...';

  Auth.signIn(
    document.getElementById('si-email').value,
    document.getElementById('si-password').value,
    FORCED_ROLE
  ).then(result => {
    btn.disabled = false; btn.textContent = 'دخول';
    if (result.ok) {
      msg.textContent = 'تم الدخول بنجاح! جاري التحويل...'; msg.className = 'auth-msg success';
      setTimeout(() => window.location.href = Auth.getRedirectPage(result.user), 800);
    } else {
      msg.textContent = result.msg; msg.className = 'auth-msg error';
    }
  });
}

function handleSignUp(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-signup');
  const msg = document.getElementById('msg-signup');
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الإرسال...';

  CQ_API.signUp({
    name:         document.getElementById('su-name').value.trim(),
    email:        document.getElementById('su-email').value.trim().toLowerCase(),
    phone:        document.getElementById('su-phone').value,
    passwordHash: (function(p){ var h=0; for(var i=0;i<p.length;i++) h=(Math.imul(31,h)+p.charCodeAt(i))|0; return h.toString(16); })(document.getElementById('su-password').value),
    role:         'teacher'
  }).then(result => {
    btn.disabled = false; btn.textContent = 'إرسال طلب التسجيل';
    if (result.ok) {
      msg.textContent = 'تم إرسال طلبك! سيتم مراجعته من قِبل الأدمن وستتلقى إشعاراً عند القبول.';
      msg.className = 'auth-msg success';
      setTimeout(() => switchTab('signin'), 2000);
    } else { msg.textContent = result.msg; msg.className = 'auth-msg error'; }
  });
}

function handleForgot(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-forgot'); const msg = document.getElementById('msg-forgot');
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الإرسال...';
  CQ_API.requestReset(document.getElementById('fg-email').value).then(result => {
    btn.disabled = false; btn.textContent = 'إرسال الطلب';
    msg.textContent = result.msg || (result.ok ? 'تم الإرسال بنجاح' : 'حدث خطأ');
    msg.className = 'auth-msg ' + (result.ok ? 'success' : 'error');
  });
}

function handleReset(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-reset'); const msg = document.getElementById('msg-reset');
  const pass = document.getElementById('rs-password').value;
  const conf = document.getElementById('rs-confirm').value;
  const tok  = document.getElementById('panel-reset').dataset.token;
  if (pass !== conf)  { msg.textContent = 'كلمتا المرور غير متطابقتين'; msg.className = 'auth-msg error'; return; }
  if (pass.length < 6){ msg.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'; msg.className = 'auth-msg error'; return; }
  msg.className = 'auth-msg'; btn.disabled = true; btn.textContent = 'جاري الحفظ...';
  function _h(s){ let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return h.toString(16); }
  CQ_API.resetPassword(tok, _h(pass)).then(result => {
    btn.disabled = false; btn.textContent = 'تغيير كلمة المرور';
    msg.textContent = result.msg || (result.ok ? 'تم التغيير بنجاح' : 'حدث خطأ');
    msg.className = 'auth-msg ' + (result.ok ? 'success' : 'error');
    if (result.ok) setTimeout(() => switchTab('signin'), 1400);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('force') === '1') localStorage.removeItem('cq_session');
  const user = Auth.getCurrentUser();
  if (user && user.role === 'teacher') { window.location.href = Auth.getRedirectPage(user); return; }
  if (user && user.role !== 'teacher') localStorage.removeItem('cq_session');
  if (params.get('tab') === 'signup') switchTab('signup');
  const resetToken = params.get('reset');
  if (resetToken) { document.getElementById('panel-reset').dataset.token = resetToken; switchTab('reset'); return; }
  const reason = params.get('reason');
  const msgEl  = document.getElementById('msg-signin');
  if (reason === 'teacher_login_required') { msgEl.textContent = 'يلزمك تسجيل الدخول بحساب معلم أولاً.'; msgEl.className = 'auth-msg error'; }
  else if (reason === 'teacher_pending')   { msgEl.textContent = 'حساب المعلم بانتظار موافقة الأدمن.'; msgEl.className = 'auth-msg error'; }
  else if (reason === 'teacher_rejected')  { msgEl.textContent = 'تم رفض طلب المعلم. راجع الأدمن لإعادة التقديم.'; msgEl.className = 'auth-msg error'; }
});

(function() {
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;
  const saved = localStorage.getItem('cq_theme') || 'light';
  html.dataset.theme = saved;
  btn.textContent = saved === 'dark' ? '☀️' : '🌙';
  btn.addEventListener('click', () => {
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('cq_theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
})();
