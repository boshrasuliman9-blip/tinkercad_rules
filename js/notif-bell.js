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
    wrap.style.cssText = 'position:relative;display:inline-flex;margin:0 4px;';
    wrap.innerHTML =
      '<button id="cq-bell-btn" title="الإشعارات" onclick="CQBell.toggle()" '
      + 'style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:6px;border-radius:8px;line-height:1;transition:background .15s;"'
      + ' onmouseover="this.style.background=\'rgba(0,0,0,.07)\'" onmouseout="this.style.background=\'none\'">🔔</button>'
      + '<span id="cq-bell-count" style="display:none;position:absolute;top:-2px;right:-4px;background:#ef4444;color:#fff;'
      + 'font-size:.58rem;font-weight:900;min-width:15px;height:15px;border-radius:999px;'
      + 'align-items:center;justify-content:center;padding:0 3px;pointer-events:none;"></span>';

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
        return '<li onclick="CQBell._read(\'' + n.id + '\',this)" '
          + 'style="display:flex;gap:8px;align-items:flex-start;padding:.55rem;border-radius:9px;cursor:pointer;background:' + bg + ';margin-bottom:3px;transition:background .12s;"'
          + ' onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'' + bg + '\'">'
          + '<span style="font-size:.95rem;flex-shrink:0;">' + icon + '</span>'
          + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:.82rem;color:#0f172a;line-height:1.5;">' + (n.message || '') + '</div>'
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
    }
  };

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injectBell(); CQBell.load(); });
  } else {
    injectBell();
    CQBell.load();
  }

})();
