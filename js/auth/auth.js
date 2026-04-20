function switchTab(tab) {
  ['signin','signup','forgot','reset'].forEach(function(t) {
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.auth-tab').forEach((btn, i) => {
    btn.classList.toggle('active', (tab === 'signin' && i === 0) || (tab === 'signup' && i === 1));
  });
}

function toggleStudentFields() { /* kept for compatibility */ }

function handleLookupCode() {
  var code = document.getElementById('su-code').value.trim().toUpperCase();
  var btn  = document.getElementById('btn-lookup');
  var msg  = document.getElementById('msg-lookup');
  if (!code) { msg.textContent = 'أدخل الرمز التعريفي'; msg.className = 'auth-msg error'; return; }
  btn.disabled = true;
  btn.textContent = 'جاري التحقق...';
  msg.className = 'auth-msg';

  CQ_API.lookupCode(code).then(function(result) {
    btn.disabled = false;
    btn.textContent = 'تحقق من الرمز';
    if (!result.ok) {
      msg.textContent = result.msg;
      msg.className   = 'auth-msg error';
      return;
    }
    // ملأ البيانات
    document.getElementById('su-usercode').value    = code;
    document.getElementById('su-role-hidden').value = result.role;
    document.getElementById('su-name').value        = result.name;
    var meta = result.schoolName || '';
    if (result.class)   meta += (meta ? ' • ' : '') + 'الصف: ' + result.class;
    if (result.section) meta += ' / ' + result.section;
    document.getElementById('su-found-name').textContent = result.name;
    document.getElementById('su-found-meta').textContent = meta;

    // تلوين حسب الدور
    if (result.role === 'teacher') document.body.classList.add('teacher-auth');
    else document.body.classList.remove('teacher-auth');

    document.getElementById('step-code').style.display    = 'none';
    document.getElementById('form-signup').style.display  = '';
    msg.className = 'auth-msg';
  });
}

function resetCodeStep() {
  document.getElementById('step-code').style.display   = '';
  document.getElementById('form-signup').style.display = 'none';
  document.getElementById('msg-lookup').className      = 'auth-msg';
  document.getElementById('su-code').value = '';
}

function getRequestedRole() {
  const role = new URLSearchParams(window.location.search).get('role');
  return role === Auth.roles.STUDENT || role === Auth.roles.TEACHER ? role : null;
}

function isStudentOnlyMode() {
  return getRequestedRole() === Auth.roles.STUDENT;
}

function applyRoleMode() {
  const requestedRole = getRequestedRole();
  if (!requestedRole) {
    toggleStudentFields();
    return;
  }

  document.querySelectorAll(`input[name="si-role"][value="${requestedRole}"], input[name="su-role"][value="${requestedRole}"]`).forEach((input) => {
    input.checked = true;
  });
  document.querySelectorAll('.role-picker').forEach((picker) => {
    const field = picker.closest('.auth-field');
    if (field) field.style.display = 'none';
  });
  toggleStudentFields();
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('force') === '1') {
    localStorage.removeItem('cq_session');
  }
  const requestedRole = getRequestedRole();
  if (requestedRole === Auth.roles.TEACHER) {
    document.body.classList.add('teacher-auth');
    document.getElementById('authLogoLink').href = './teacher/index.html';
    document.getElementById('authHomeLink').href = './teacher/index.html';
    document.getElementById('authCardLogoLink').href = './teacher/index.html';
  }
  const currentUser = Auth.getCurrentUser();
  if (currentUser && (!requestedRole || currentUser.role === requestedRole)) {
    window.location.href = Auth.getRedirectPage(currentUser);
    return;
  }
  if (currentUser && requestedRole && currentUser.role !== requestedRole) {
    localStorage.removeItem('cq_session');
  }

  applyRoleMode();
  if (params.get('tab') === 'signup') {
    switchTab('signup');
  }

  // إعادة تعيين كلمة المرور عبر رابط
  const resetToken = params.get('reset');
  if (resetToken) {
    document.getElementById('panel-reset').dataset.token = resetToken;
    switchTab('reset');
    return;
  }

  const reason = params.get('reason');
  if (!reason) return;
  const msg = document.getElementById('msg-signin');
  if (!msg) return;

  if (reason === 'teacher_login_required') {
    msg.textContent = 'يلزمك تسجيل الدخول بحساب معلم أولاً.';
    msg.className = 'auth-msg error';
  } else if (reason === 'login_required_for_tracks') {
    msg.textContent = 'سجّل الدخول أولاً حتى تدخل صفحة المسارات.';
    msg.className = 'auth-msg error';
  } else if (reason === 'teacher_pending') {
    msg.textContent = 'حساب المعلم بانتظار موافقة الأدمن.';
    msg.className = 'auth-msg error';
  } else if (reason === 'teacher_rejected') {
    msg.textContent = 'تم رفض طلب المعلم. راجع الأدمن لإعادة التقديم.';
    msg.className = 'auth-msg error';
  }
});

function handleSignIn(e) {
  e.preventDefault();
  const btn  = document.getElementById('btn-signin');
  const msg  = document.getElementById('msg-signin');
  msg.className = 'auth-msg';
  btn.disabled  = true;
  btn.textContent = 'جاري الدخول...';

  const role = getRequestedRole() || (document.querySelector('input[name="si-role"]:checked')?.value || 'student');
  Auth.signIn(
    document.getElementById('si-email').value,
    document.getElementById('si-password').value,
    role
  ).then(result => {
    btn.disabled    = false;
    btn.textContent = 'دخول';
    if (result.ok) {
      if (!result.user && window.CQ && CQ.auth && CQ.auth.requireApproval === false) {
        result.user = Auth.getCurrentUser();
      }
      msg.textContent = 'تم الدخول بنجاح! جاري التحويل...';
      msg.className   = 'auth-msg success';
      setTimeout(() => window.location.href = Auth.getRedirectPage(result.user), 800);
    } else {
      msg.textContent = result.msg;
      msg.className   = 'auth-msg error';
    }
  });
}

function handleSignUp(e) {
  e.preventDefault();
  const btn  = document.getElementById('btn-signup');
  const msg  = document.getElementById('msg-signup');
  msg.className = 'auth-msg';
  btn.disabled  = true;
  btn.textContent = 'جاري الإنشاء...';

  const role     = document.getElementById('su-role-hidden').value || getRequestedRole() || 'student';
  const userCode = document.getElementById('su-usercode').value;
  const email    = document.getElementById('su-email').value.trim().toLowerCase();
  const name     = document.getElementById('su-name').value.trim();

  CQ_API.signUp({
    name:         name,
    email:        email,
    phone:        document.getElementById('su-phone').value,
    passwordHash: (function(p){ var h=0; for(var i=0;i<p.length;i++) h=(Math.imul(31,h)+p.charCodeAt(i))|0; return h.toString(16); })(document.getElementById('su-password').value),
    role:         role,
    userCode:     userCode
  }).then(result => {
    if (result.ok && !result.user && window.CQ && CQ.auth && CQ.auth.requireApproval === false) {
      result.user = {
        id: 'dev-' + role + '-' + Date.now(),
        name: name || (role === 'teacher' ? 'معلم تجريبي' : 'طالب تجريبي'),
        email: email,
        role: role,
        status: 'active',
        teacherCode: role === 'teacher' ? 'DEV-TEACHER' : '',
        studentCode: role === 'student' ? 'DEV-STUDENT' : ''
      };
      result.pending = false;
      Auth._startSession(result.user);
    }
    btn.disabled    = false;
    btn.textContent = 'إنشاء الحساب';
    if (result.ok) {
      if (result.pending) {
        if (result.user && window.CQ && CQ.auth && CQ.auth.requireApproval === false) {
          Auth._startSession(result.user);
          msg.textContent = 'تم إنشاء الحساب! جاري التحويل...';
          msg.className   = 'auth-msg success';
          setTimeout(() => window.location.href = Auth.getRedirectPage(result.user), 800);
          return;
        }
        msg.textContent = role === 'teacher'
          ? 'تم إرسال طلب المعلم. يمكنك الدخول بعد موافقة الأدمن.'
          : 'تم إرسال طلب الطالب. يمكنك الدخول بعد موافقة الأدمن.';
        msg.className   = 'auth-msg success';
        setTimeout(() => switchTab('signin'), 1400);
      } else {
        if (result.user) Auth._startSession(result.user);
        msg.textContent = 'تم إنشاء الحساب! جاري التحويل...';
        msg.className   = 'auth-msg success';
        setTimeout(() => window.location.href = Auth.getRedirectPage(result.user), 800);
      }
    } else {
      msg.textContent = result.msg;
      msg.className   = 'auth-msg error';
    }
  });
}

function handleForgot(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-forgot');
  const msg = document.getElementById('msg-forgot');
  msg.className   = 'auth-msg';
  btn.disabled    = true;
  btn.textContent = 'جاري الإرسال...';

  CQ_API.requestReset(document.getElementById('fg-email').value).then(result => {
    btn.disabled    = false;
    btn.textContent = 'إرسال الطلب';
    msg.textContent = result.msg || (result.ok ? 'تم الإرسال بنجاح' : 'حدث خطأ');
    msg.className   = 'auth-msg ' + (result.ok ? 'success' : 'error');
  });
}

function handlePhoneOtp(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-phone-otp');
  const msg = document.getElementById('msg-phone-reset');
  const phone = document.getElementById('fg-phone').value;
  msg.className = 'auth-msg';
  btn.disabled = true;
  btn.textContent = 'جاري إرسال OTP...';

  CQ_API.requestPhoneOtp(phone).then(result => {
    btn.disabled = false;
    btn.textContent = 'إرسال OTP';
    msg.textContent = result.msg || (result.ok ? 'تم إرسال OTP' : 'حدث خطأ');
    msg.className = 'auth-msg ' + (result.ok ? 'success' : 'error');
    if (result.ok) document.getElementById('form-phone-verify').style.display = 'block';
  });
}

function handlePhoneVerify(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-phone-verify');
  const msg = document.getElementById('msg-phone-reset');
  const phone = document.getElementById('fg-phone').value;
  const otp = document.getElementById('fg-otp').value;
  msg.className = 'auth-msg';
  btn.disabled = true;
  btn.textContent = 'جاري التحقق...';

  CQ_API.verifyPhoneOtp(phone, otp).then(result => {
    btn.disabled = false;
    btn.textContent = 'تحقق وأرسل رابط reset';
    msg.textContent = result.msg || (result.ok ? 'تم إرسال رابط reset' : 'حدث خطأ');
    msg.className = 'auth-msg ' + (result.ok ? 'success' : 'error');
  });
}

function handleReset(e) {
  e.preventDefault();
  const btn  = document.getElementById('btn-reset');
  const msg  = document.getElementById('msg-reset');
  const pass = document.getElementById('rs-password').value;
  const conf = document.getElementById('rs-confirm').value;
  const tok  = document.getElementById('panel-reset').dataset.token;

  if (pass !== conf) {
    msg.textContent = 'كلمتا المرور غير متطابقتين';
    msg.className   = 'auth-msg error';
    return;
  }
  if (pass.length < 6) {
    msg.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    msg.className   = 'auth-msg error';
    return;
  }

  msg.className   = 'auth-msg';
  btn.disabled    = true;
  btn.textContent = 'جاري الحفظ...';

  // hash client-side same as Auth
  function _h(str) { let h=0; for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0; return h.toString(16); }

  CQ_API.resetPassword(tok, _h(pass)).then(result => {
    btn.disabled    = false;
    btn.textContent = 'تغيير كلمة المرور';
    msg.textContent = result.msg || (result.ok ? 'تم التغيير بنجاح' : 'حدث خطأ');
    msg.className   = 'auth-msg ' + (result.ok ? 'success' : 'error');
    if (result.ok) setTimeout(() => switchTab('signin'), 1400);
  });
}

(function () {
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
