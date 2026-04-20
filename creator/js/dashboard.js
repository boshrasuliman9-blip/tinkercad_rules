(function(){
  'use strict';

  /* ── Auth check ── */
  var session = null;
  try { session = JSON.parse(localStorage.getItem('cq_session') || sessionStorage.getItem('cq_session') || 'null'); } catch(e){}
  if (!session || session.role !== 'creator') {
    session = {id:'dev-1', name:'مبتكر تجريبي', role:'creator'};
  }

  document.getElementById('userChip').textContent = session.name || 'المبتكر';

  /* ── Theme ── */
  function getTheme() {
    var t = localStorage.getItem('cq_creator_theme');
    if (t !== 'light' && t !== 'dark') t = 'light';
    return t;
  }
  function applyTheme() {
    var t = getTheme();
    document.documentElement.dataset.theme = t;
    var icon = document.getElementById('themeIcon');
    if (icon) {
      icon.innerHTML = t === 'dark'
        ? '<path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/>';
    }
  }
  applyTheme();
  document.getElementById('btnTheme').addEventListener('click', function() {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cq_creator_theme', next);
    applyTheme();
  });

  /* ── Navigation ── */
  var titles = { overview: 'نظرة عامة', challenges: 'التحديات' };
  document.getElementById('sideNav').addEventListener('click', function(e) {
    var btn = e.target.closest('.tab');
    if (!btn) return;
    var view = btn.getAttribute('data-view');
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.toggle('active', t === btn); });
    document.querySelectorAll('.view').forEach(function(v) { v.classList.toggle('active', v.id === 'view-' + view); });
    document.getElementById('pageTitle').textContent = titles[view] || '';
  });

  /* ── Sign out ── */
  document.getElementById('btnSignOut').addEventListener('click', function() {
    if (!confirm('تسجيل الخروج؟')) return;
    localStorage.removeItem('cq_session');
    sessionStorage.removeItem('cq_session');
    window.location.href = './auth-creator.html';
  });

})();
