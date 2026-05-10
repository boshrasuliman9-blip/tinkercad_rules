/* ============================================
   Circuit Quest — Shared Notification Bell
   يُضاف لكل صفحة فيها site-nav-actions
   ============================================ */

(function () {
  var session = null;
  try { session = JSON.parse(localStorage.getItem('cq_session') || 'null'); } catch (e) {}
  if (!session || !session.id) return;

  /* ── Inject bell HTML into nav ── */
  function injectBell() {
    var actions = document.querySelector('.site-nav-actions');
    if (!actions || document.getElementById('cq-notif-wrap')) return;

    var wrap = document.createElement('div');
    wrap.id = 'cq-notif-wrap';
    // styling via css/main.css (#cq-notif-wrap, #cq-bell-btn, #cq-bell-count)
    wrap.innerHTML =
      '<button id="cq-bell-btn" class="site-icon-btn" type="button" aria-label="الإشعارات" title="الإشعارات" onclick="CQBell.toggle()">🔔</button>'
      + '<span id="cq-bell-count"></span>';

    /* Insert before the theme-toggle button */
    var themeBtn = actions.querySelector('#themeToggle, .site-theme-btn');
    if (themeBtn) actions.insertBefore(wrap, themeBtn);
    else actions.prepend(wrap);

    /* Panel */
    var panel = document.createElement('div');
    panel.id = 'cq-notif-panel';
    panel.style.cssText = 'display:none;position:fixed;top:58px;z-index:500;'
      + 'background:#fff;border:1.5px solid #dde3ea;border-radius:16px;'
      + 'box-shadow:0 12px 40px rgba(15,23,42,.14);width:min(320px,calc(100vw - 32px));'
      + 'max-height:340px;overflow-y:auto;padding:.75rem;'
      + 'font-family:\'Tajawal\',sans-serif;direction:rtl;';

    /* Position: align to the bell */
    function positionPanel() {
      var btn = document.getElementById('cq-bell-btn');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      panel.style.right  = Math.max(4, window.innerWidth - r.right - 4) + 'px';
      panel.style.left   = 'auto';
    }
    window.addEventListener('resize', positionPanel);

    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;">'
      + '<span style="font-size:.72rem;font-weight:800;color:#64748b;letter-spacing:.05em;text-transform:uppercase;">الإشعارات</span>'
      + '<button onclick="CQBell.markAll()" style="font-family:\'Tajawal\',sans-serif;border:none;background:none;font-size:.72rem;color:#64748b;cursor:pointer;">تحديد كمقروء</button>'
      + '</div>'
      + '<ul id="cq-notif-list" style="list-style:none;padding:0;margin:0;"></ul>';

    document.body.appendChild(panel);

    /* Close on outside click */
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && !panel.contains(e.target)) {
        panel.style.display = 'none';
      }
    });

    positionPanel();
  }

  /* ── Public API ── */
  window.CQBell = {
    _notifs: [],

    load: function () {
      var fn = session.role === 'teacher'
        ? CQ_API.getTeacherNotifs(session.id)
        : CQ_API.getStudentNotifs(session.id);

      fn.then(function (res) {
        CQBell._notifs = res.notifs || [];
        CQBell._render();
      });
    },

    toggle: function () {
      var p = document.getElementById('cq-notif-panel');
      if (!p) return;
      if (p.style.display === 'none') {
        /* reposition */
        var btn = document.getElementById('cq-bell-btn');
        if (btn) {
          var r = btn.getBoundingClientRect();
          p.style.right = Math.max(4, window.innerWidth - r.right - 4) + 'px';
        }
        p.style.display = 'block';
        CQBell.load();
      } else {
        p.style.display = 'none';
      }
    },

    markAll: function () {
      CQ_API.markAllNotifsRead(session.id).then(function () {
        CQBell._notifs.forEach(function (n) { n.readAt = new Date().toISOString(); });
        CQBell._render();
      });
    },

    _render: function () {
      var ul = document.getElementById('cq-notif-list');
      var cnt = document.getElementById('cq-bell-count');
      if (!ul) return;

      var unread = CQBell._notifs.filter(function (n) { return !n.readAt; }).length;
      if (cnt) {
        cnt.textContent = unread;
        cnt.style.display = unread > 0 ? 'flex' : 'none';
      }

      if (!CQBell._notifs.length) {
        ul.innerHTML = '<li style="font-size:.84rem;color:#64748b;padding:.5rem;text-align:center;">لا توجد إشعارات</li>';
        return;
      }

      ul.innerHTML = CQBell._notifs.slice(0, 12).map(function (n) {
        var bg  = n.readAt ? '#fff' : '#f0fdf4';
        var dot = n.readAt ? '' : '<span style="width:7px;height:7px;border-radius:50%;background:#16a34a;flex-shrink:0;margin-top:4px;"></span>';
        var icon = n.type === 'approval' ? '✅'
                 : n.type === 'rejection' ? '❌'
                 : n.type === 'challenge_published' ? '⚡'
                 : n.type === 'submission' ? '📝'
                 : '🔔';
        var d = n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar-SA') : '';
        var codeHtml = (n.type === 'challenge' && n.code)
          ? '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;">'
            + '<span style="font-size:.68rem;color:#64748b;font-weight:800;">كود التحدي</span>'
            + '<code style="direction:ltr;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:8px;padding:3px 8px;font-size:.82rem;font-weight:900;letter-spacing:.05em;">' + esc(n.code) + '</code>'
            + '</div>'
          : '';
        return '<li onclick="CQBell._read(\'' + n.id + '\',this)" '
          + 'style="display:flex;gap:8px;align-items:flex-start;padding:.55rem;border-radius:9px;cursor:pointer;background:' + bg + ';margin-bottom:3px;transition:background .12s;"'
          + ' onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'' + bg + '\'">'
          + '<span style="font-size:.95rem;flex-shrink:0;">' + icon + '</span>'
          + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:.82rem;color:#0f172a;line-height:1.5;">' + (n.message || '') + '</div>'
            + codeHtml
            + '<div style="font-size:.7rem;color:#64748b;margin-top:1px;">' + d + '</div>'
          + '</div>'
          + dot
          + '</li>';
      }).join('');
    },

    _read: function (id, el) {
      var n = CQBell._notifs.find(function (x) { return x.id === id; });
      if (n && !n.readAt) {
        n.readAt = new Date().toISOString();
        el.style.background = '#fff';
        var dot = el.querySelector('span:last-child');
        if (dot && dot.style.background === 'rgb(22, 163, 74)') dot.style.display = 'none';
        CQ_API.markNotifRead(id);
        var cnt = document.getElementById('cq-bell-count');
        var unread = CQBell._notifs.filter(function (x) { return !x.readAt; }).length;
        if (cnt) { cnt.textContent = unread; cnt.style.display = unread > 0 ? 'flex' : 'none'; }
      }
      if (n && n.type === 'challenge' && n.code) {
        window.location.href = challengeIntroHref(n);
      }
    }
  };

  function challengeIntroHref(n) {
    var key = n.challengeKey || inferChallengeKey(n);
    var step = key === 'push-button' ? '2' : '1';
    var base = './student/tracks/track-2.html';
    var path = window.location.pathname.replace(/\\/g, '/');
    if (path.indexOf('/student/tracks/challenges/') >= 0) base = '../track-2.html';
    else if (path.indexOf('/student/tracks/') >= 0) base = './track-2.html';
    else if (path.indexOf('/student/') >= 0) base = './tracks/track-2.html';
    return base
      + '?modal=challenge'
      + '&step=' + encodeURIComponent(step)
      + '&challengeKey=' + encodeURIComponent(key)
      + '&code=' + encodeURIComponent(n.code || '')
      + '&assignmentId=' + encodeURIComponent(n.assignmentId || '');
  }

  function inferChallengeKey(n) {
    var text = String((n && (n.challengeName || n.title || n.body)) || '').toLowerCase();
    if (text.indexOf('push') >= 0 || text.indexOf('button') >= 0 || text.indexOf('زر') >= 0) return 'push-button';
    return 'led';
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injectBell(); CQBell.load(); });
  } else {
    injectBell();
    CQBell.load();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
