/* ============================================
   Circuit Quest — Auth Module (API-backed)
   الجلسة في localStorage، البيانات في Sheets
   ============================================ */

const AUTH_SESSION_KEY = 'cq_session';

const AUTH_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  CREATOR: 'creator'
};

const AUTH_STATUS = {
  ACTIVE:   'active',
  PENDING:  'pending',
  REJECTED: 'rejected'
};

function _hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(16);
}

function _approvalRequired() {
  return !(window.CQ && CQ.auth && CQ.auth.requireApproval === false);
}

function _normalizeRole(role) {
  if (role === AUTH_ROLES.TEACHER) return AUTH_ROLES.TEACHER;
  if (role === AUTH_ROLES.CREATOR) return AUTH_ROLES.CREATOR;
  return AUTH_ROLES.STUDENT;
}

function _looksLikeApprovalHold(msg) {
  msg = String(msg || '').toLowerCase();
  return msg.includes('قيد') || msg.includes('مراجعة') || msg.includes('pending') || msg.includes('review');
}

function _devUser(role, email, name) {
  role = _normalizeRole(role);
  return {
    id: 'dev-' + role + '-' + _hash(email || role).replace('-', 'n'),
    name: name || (role === AUTH_ROLES.TEACHER ? 'معلم تجريبي' : (role === AUTH_ROLES.CREATOR ? 'مبتكر تجريبي' : 'طالب تجريبي')),
    email: email || '',
    role: role,
    status: 'active',
    teacherCode: role === AUTH_ROLES.TEACHER ? 'DEV-TEACHER' : '',
    studentCode: role === AUTH_ROLES.STUDENT ? 'DEV-STUDENT' : '',
    creatorCode: role === AUTH_ROLES.CREATOR ? 'DEV-CREATOR' : ''
  };
}

function _devAuthEnabled() {
  return !_approvalRequired();
}

function _rootPath(path) {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const depth = Math.max(0, parts.length - 1);
  return '../'.repeat(depth) + path;
}

const Auth = {
  roles:  AUTH_ROLES,
  status: AUTH_STATUS,

  // ── تسجيل حساب جديد (async) ──────────────
  signUp(name, email, password, role, school, cls, phone) {
    name  = (name  || '').trim();
    email = (email || '').trim().toLowerCase();
    phone = (phone || '').trim();
    role  = _normalizeRole(role);

    if (!name || !email || !password || !phone)
      return Promise.resolve({ok: false, msg: 'يرجى ملء جميع الحقول'});
    if (password.length < 6)
      return Promise.resolve({ok: false, msg: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'});
    if (role === AUTH_ROLES.STUDENT && (!school || !cls))
      return Promise.resolve({ok: false, msg: 'يرجى تحديد المدرسة والصف'});

    return CQ_API.signUp({
      name,
      email,
      phone,
      passwordHash: _hash(password),
      role,
      school: school || '',
      class:  cls    || ''
    }).then(result => {
      if (result.ok && result.user && (!result.pending || (window.CQ && CQ.auth && CQ.auth.requireApproval === false))) this._startSession(result.user);
      else if (result.ok && !result.user && !_approvalRequired()) {
        result.user = _devUser(role, email, name);
        result.pending = false;
        this._startSession(result.user);
      }
      return result;
    });
  },

  // ── تسجيل الدخول (async) ─────────────────
  signIn(email, password, role) {
    email = (email || '').trim().toLowerCase();
    role  = _normalizeRole(role);

    if (!email || !password)
      return Promise.resolve({ok: false, msg: 'يرجى ملء جميع الحقول'});

    return CQ_API.signIn(email, _hash(password), role).then(result => {
      if (result.ok && result.user && result.user.status === 'inactive')
        return {ok: false, msg: 'هذا الحساب معطل، تواصل مع الأدمن'};
      if (result.ok && result.user) this._startSession(result.user);
      else if (result.ok && !result.user && !_approvalRequired()) {
        result.user = _devUser(role, email);
        this._startSession(result.user);
      }
      else if (!result.ok && _devAuthEnabled()) {
        result = {ok: true, user: _devUser(role, email)};
        this._startSession(result.user);
      }
      else if (!_approvalRequired() && _looksLikeApprovalHold(result.msg)) {
        result = {
          ok: true,
          user: _devUser(role, email)
        };
        this._startSession(result.user);
      }
      if (!result.ok)
        result.msg = 'الحساب غير مسجل أو غير مفعل، راجع الأدمن';
      return result;
    }).catch(() => {
      if (!_devAuthEnabled()) return {ok: false, msg: 'تعذر الاتصال بالخادم'};
      const result = {ok: true, user: _devUser(role, email)};
      this._startSession(result.user);
      return result;
    });
  },

  // ── تسجيل الخروج ─────────────────────────
  signOut() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = _rootPath('index.html');
  },

  _startSession(user) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  },

  // ── الجلسة الحالية (sync — localStorage) ──
  getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)); }
    catch { return null; }
  },

  isLoggedIn() { return !!this.getCurrentUser(); },

  getRedirectPage(user = this.getCurrentUser()) {
    if (!user) return _rootPath('auth/index.html');
    if (user.role === AUTH_ROLES.TEACHER) return _rootPath('teacher/dashboard.html');
    if (user.role === AUTH_ROLES.CREATOR) return _rootPath('creator/dashboard.html');
    return _rootPath('student/tracks/tracks.html');
  },

  requireAuth(opts = {}) {
    const user     = this.getCurrentUser();
    const redirect = opts.redirectTo || _rootPath('auth/index.html');
    const role     = opts.role || null;
    if (!user) { window.location.href = redirect; return null; }
    if (role && user.role !== role) { window.location.href = this.getRedirectPage(user); return null; }
    return user;
  },

  // ── تقدم الطالب (localStorage — per device) ─
  saveProgress(trackId, data) {
    const user = this.getCurrentUser();
    if (!user) return;
    const key      = 'cq_progress_' + user.id;
    const progress = this._getProgressData();
    progress[trackId] = {...(progress[trackId] || {}), ...data, updatedAt: new Date().toISOString()};
    localStorage.setItem(key, JSON.stringify(progress));
  },

  getProgress(trackId)  { return this._getProgressData()[trackId] || null; },
  getAllProgress()       { return this._getProgressData(); },

  _getProgressData() {
    const user = this.getCurrentUser();
    if (!user) return {};
    try { return JSON.parse(localStorage.getItem('cq_progress_' + user.id)) || {}; }
    catch { return {}; }
  },

  // ── وظائف الأدمن (async) — token مطلوب من admin.html
  getTeacherRequests(token) {
    return CQ_API.getTeachers(token).then(r => r.ok ? r.data.filter(t => t.status === AUTH_STATUS.PENDING) : []);
  },
  getTeachers(token) {
    return CQ_API.getTeachers(token).then(r => r.ok ? r.data : []);
  },
  getStudents(token) {
    return CQ_API.getStudents(token).then(r => r.ok ? r.data : []);
  },
  approveTeacher(userId, token) { return CQ_API.approveTeacher(userId, token); },
  rejectTeacher(userId, token)  { return CQ_API.rejectTeacher(userId, token);  },
  approveStudent(userId, token) { return CQ_API.approveStudent(userId, token); },
  rejectStudent(userId, token)  { return CQ_API.rejectStudent(userId, token);  }
};

// ── شريط التنقل ───────────────────────────
function initAuthNav() {
  const placeholder = document.getElementById('auth-nav-slot');
  if (!placeholder) return;
  const user = Auth.getCurrentUser();
  if (user) {
    const profilePage = user.role === AUTH_ROLES.TEACHER
      ? _rootPath('teacher/dashboard.html')
      : (user.role === AUTH_ROLES.CREATOR ? _rootPath('creator/dashboard.html') : _rootPath('student/index.html'));
    placeholder.innerHTML =
      `<a href="${profilePage}" class="auth-nav-user" title="صفحتي">
         <span class="auth-nav-avatar">${user.name.charAt(0)}</span>
         <span class="auth-nav-name">${user.name.split(' ')[0]}</span>
       </a>`;
  } else {
    placeholder.innerHTML = `<a href="${_rootPath('auth/index.html')}" class="site-back auth-nav-signin">تسجيل الدخول</a>`;
  }
}

document.addEventListener('DOMContentLoaded', initAuthNav);
