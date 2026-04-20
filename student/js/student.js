/* ── Guard: must be logged in ── */
document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getCurrentUser();
  if (!user) { window.location.href = '../auth/index.html'; return; }
  if (user.role === Auth.roles.TEACHER) { window.location.href = '../teacher/dashboard.html'; return; }
  renderProfile(user);
  loadChallengeNotifs(user.id);
});

function loadChallengeNotifs(studentId) {
  CQ_API.getStudentNotifs(studentId).then(notifs => {
    if (!notifs.ok || !notifs.data.length) return;
    const section = document.getElementById('challenges-notif-section');
    const list = document.getElementById('challenge-notifs');
    section.style.display = '';
    list.innerHTML = '';

    notifs.data.forEach(n => {
      const now = new Date();
      const expDate = n.expiresAt ? new Date(n.expiresAt) : null;
      const expired = expDate && expDate < now;
      const nearExp = expDate && !expired && (expDate - now) < 48 * 60 * 60 * 1000;

      const expText = expDate
        ? (expired ? 'انتهت الصلاحية' : 'تنتهي: ' + expDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
        : '';
      const expClass = expired ? 'over' : (nearExp ? 'near' : '');

      const card = document.createElement('div');
      card.className = 'ch-notif-card' + (expired ? ' expired' : '') + (!n.read ? ' unread' : '');
      card.innerHTML = `
        <div class="ch-notif-left">
          <div class="ch-notif-title">${n.title}</div>
          <div><span class="ch-notif-code">${n.code}</span></div>
          ${expText ? `<div class="ch-notif-exp ${expClass}">${expText}</div>` : ''}
        </div>
        ${expired ? '<span style="font-size:.76rem;color:#dc2626;font-weight:700;">منتهي</span>' : ''}
      `;
      list.appendChild(card);

      if (!n.read) CQ_API.markNotifRead(n.id);
    });
  });
}

const TRACKS = [
  { id: 'track1', href: 'tracks/track-1.html', icon: '⚡', iconClass: 'tp-icon-1', title: 'المسار الأول', sub: 'أساسيات الإلكترونيات', stages: 4, points: 40 },
  { id: 'track2', href: 'tracks/track-2.html', icon: '🔌', iconClass: 'tp-icon-2', title: 'المسار الثاني', sub: 'الدارات والمكونات', stages: 4, points: 60 },
  { id: 'track3', href: 'tracks/track-3.html', icon: '🧪', iconClass: 'tp-icon-3', title: 'المسار الثالث', sub: 'المشاريع التطبيقية', stages: 3, points: 80 },
  { id: 'track4', href: 'tracks/track-4.html', icon: '🏆', iconClass: 'tp-icon-4', title: 'المسار الرابع', sub: 'التحدي النهائي', stages: 1, points: 100 },
];

function renderProfile(user) {
  /* Avatar & name */
  document.getElementById('std-avatar').textContent = user.name.charAt(0);
  document.getElementById('std-name').textContent = user.name;
  document.getElementById('std-email').textContent = user.email;

  /* Join date from full user record */
  const users = JSON.parse(localStorage.getItem('cq_users') || '[]');
  const full = users.find(u => u.id === user.id);
  if (full?.joinedAt) {
    const d = new Date(full.joinedAt);
    document.getElementById('std-since').textContent =
      'انضم في ' + d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* Stats */
  const progress = Auth.getAllProgress();
  let completedTracks = 0, completedStages = 0, totalPoints = 0;

  TRACKS.forEach(t => {
    const p = progress[t.id];
    const done = p?.completed ? t.stages : (p?.stagesFinished?.length || 0);
    if (p?.completed) { completedTracks++; totalPoints += t.points; }
    completedStages += done;
  });

  document.getElementById('stat-tracks').textContent = completedTracks;
  document.getElementById('stat-stages').textContent = completedStages;
  document.getElementById('stat-points').textContent = totalPoints;

  /* Track cards */
  const list = document.getElementById('tracks-progress');
  list.innerHTML = TRACKS.map(t => {
    const p = progress[t.id];
    const stagesDone = p?.completed ? t.stages : (p?.stagesFinished?.length || 0);
    const pct = Math.round((stagesDone / t.stages) * 100);

    let badgeClass, badgeTxt;
    if (p?.completed) { badgeClass = 'tp-badge-done'; badgeTxt = 'مكتمل ✓'; }
    else if (stagesDone) { badgeClass = 'tp-badge-partial'; badgeTxt = `${stagesDone}/${t.stages} مراحل`; }
    else { badgeClass = 'tp-badge-new'; badgeTxt = 'لم يبدأ'; }

    return `
      <a href="./${t.href}" class="track-progress-card">
        <div class="tp-icon ${t.iconClass}">${t.icon}</div>
        <div class="tp-body">
          <div class="tp-title">${t.title} — ${t.sub}</div>
          <div class="tp-sub">${stagesDone} من ${t.stages} مراحل · ${t.points} نقطة</div>
          <div class="tp-bar-bg"><div class="tp-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="tp-badge ${badgeClass}">${badgeTxt}</div>
      </a>`;
  }).join('');
}

function sha256(str) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    .then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
}

function showPassMsg(text, type) {
  const msg = document.getElementById('chgpass-msg');
  msg.textContent = text;
  msg.className = 'pass-msg ' + type;
}

function openChangePass() {
  document.getElementById('new-pass').value = '';
  document.getElementById('new-pass-confirm').value = '';
  document.getElementById('chgpass-msg').className = 'pass-msg';
  document.getElementById('modal-chgpass').classList.add('open');
}

function closeChangePass() {
  document.getElementById('modal-chgpass').classList.remove('open');
}

function doChangePassword() {
  const user = Auth.getCurrentUser();
  const p1 = document.getElementById('new-pass').value;
  const p2 = document.getElementById('new-pass-confirm').value;

  if (!user) { window.location.href = '../auth/index.html'; return; }
  if (!p1 || p1.length < 6) { showPassMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'err'); return; }
  if (p1 !== p2) { showPassMsg('كلمتا المرور غير متطابقتين', 'err'); return; }

  sha256(p1).then(function (hash) {
    CQ_API.changePassword(user.id, hash, 'self').then(function (res) {
      if (res.ok) {
        showPassMsg('تم تغيير كلمة المرور بنجاح ✓', 'ok');
        setTimeout(closeChangePass, 900);
      } else {
        showPassMsg(res.msg || 'تعذر تغيير كلمة المرور', 'err');
      }
    });
  });
}

document.getElementById('modal-chgpass').addEventListener('click', function (e) {
  if (e.target === this) closeChangePass();
});

/* ── Theme toggle ── */
(function () {
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;
  const MOON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const saved = localStorage.getItem('cq_theme') || 'light';
  html.dataset.theme = saved;
  btn.innerHTML = saved === 'dark' ? SUN : MOON;
  btn.addEventListener('click', () => {
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('cq_theme', next);
    btn.innerHTML = next === 'dark' ? SUN : MOON;
  });
})();
