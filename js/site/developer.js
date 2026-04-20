const AUTH_USERS_KEY = 'cq_users';
const AUTH_SESSION_KEY = 'cq_session';
const DEV_EMAIL = 'dev@circuitquest.test';
const DEV_PASSWORD = 'Test1234';

const pages = [
  ['الرئيسية', 'index.html'],
  ['تسجيل الدخول', 'auth/index.html'],
  ['صفحة الطالب', 'student/index.html'],
  ['صفحة المعلم', 'teacher/dashboard.html'],
  ['لوحة الأدمن', 'admin/index.html'],
  ['المسارات', 'student/tracks/tracks.html'],
  ['الخريطة', 'student/map.html'],
  ['المسار 1', 'student/tracks/track-1.html'],
  ['المسار 2', 'student/tracks/track-2.html'],
  ['تحدي الدائرة', 'student/tracks/challenges/track-2-led-challenge.html'],
  ['تحدي الزر', 'student/tracks/challenges/track-2-pushbutton-challenge.html'],
  ['المسار 3', 'student/tracks/track-3.html'],
  ['المسار 4', 'student/tracks/track-4.html'],
  ['Circuit Quest', 'archive/legacy-pages/circuit-quest-legacy.html']
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(16);
}

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY));
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function upsertUser(users, user) {
  const index = users.findIndex((item) => item.email === user.email && item.role === user.role);
  if (index >= 0) {
    users[index] = { ...users[index], ...user };
  } else {
    users.push(user);
  }
}

function seedUsers() {
  const users = readUsers();
  const now = new Date().toISOString();
  const password = hash(DEV_PASSWORD);

  upsertUser(users, {
    id: 'dev-student',
    name: 'طالب تجريبي',
    email: DEV_EMAIL,
    password,
    role: 'student',
    status: 'active',
    joinedAt: now,
    progress: {
      track1: { completed: true, updatedAt: now },
      track2: { completed: false, updatedAt: now }
    }
  });

  upsertUser(users, {
    id: 'dev-teacher',
    name: 'معلم تجريبي',
    email: DEV_EMAIL,
    password,
    role: 'teacher',
    status: 'active',
    joinedAt: now,
    reviewedAt: now,
    progress: {}
  });

  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  showStatus('تم تجهيز حساب الطالب والمعلم.');
}

function loginAs(role) {
  seedUsers();
  const user = role === 'teacher'
    ? { id: 'dev-teacher', name: 'معلم تجريبي', email: DEV_EMAIL, role: 'teacher', status: 'active' }
    : { id: 'dev-student', name: 'طالب تجريبي', email: DEV_EMAIL, role: 'student', status: 'active' };

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  window.location.href = role === 'teacher' ? './teacher/dashboard.html' : './student/tracks/tracks.html';
}

function showStatus(message) {
  const status = document.getElementById('dev-status');
  status.textContent = message;
  status.style.display = 'block';
}

function renderLinks() {
  document.getElementById('dev-links').innerHTML = pages.map(([label, href]) => (
    `<a class="dev-link" href="./${href}"><span>${label}</span><small>${href}</small></a>`
  )).join('');
}

renderLinks();
seedUsers();
