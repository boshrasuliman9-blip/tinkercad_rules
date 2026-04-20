var ADMIN_USERNAME = 'admin';
  var ADMIN_PASSWORD = 'cq2024';
  var ADMIN_TOKEN    = 'cq2024';

  function setMsg(text, kind) {
    var el = document.getElementById('msg-admin-login');
    el.textContent = text;
    el.className = 'auth-msg ' + (kind || '');
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    var username = document.getElementById('ad-username').value.trim();
    var password = document.getElementById('ad-password').value;
    var btn = document.getElementById('btn-admin-login');

    if (!username || !password) { setMsg('أدخل اسم المستخدم وكلمة المرور', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'جاري التحقق...';
    setMsg('', '');

    setTimeout(function () {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_token', ADMIN_TOKEN);
        sessionStorage.setItem('admin_username', username);
        setMsg('تم تسجيل الدخول ✓', 'success');
        setTimeout(function(){ window.location.href = './dashboard.html'; }, 500);
      } else {
        btn.disabled = false;
        btn.textContent = 'دخول';
        setMsg('بيانات الدخول غير صحيحة', 'error');
      }
    }, 250);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var tok = sessionStorage.getItem('admin_token');
    if (tok === ADMIN_TOKEN) { window.location.href = './dashboard.html'; return; }

    var btn  = document.getElementById('themeToggle');
    var html = document.documentElement;
    var saved = localStorage.getItem('cq_theme') || 'light';
    html.dataset.theme = saved;
    btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', function () {
      var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      localStorage.setItem('cq_theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  });
