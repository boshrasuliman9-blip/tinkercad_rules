/* ════════════════════════════════════════
   Circuit Quest — Admin Dashboard
   ════════════════════════════════════════ */

var A = {
  session:     null,
  token:       '',
  schools:     [],
  teachers:    [],
  students:    [],
  classes:     [],
  courses:     [],
  challenges:  [],
  creators:    [],
  submissions: [],
  notifs:      [],
  trash:       [],
  _editChalId: null,
};

/* ── Helpers ── */
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  return d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
}
function showMsg(id, txt, type) {
  var el = document.getElementById(id);
  if (el) { el.textContent = txt; el.className = 'f-msg ' + type; }
}
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function hashText(s) {
  /* Simple deterministic hash for localStorage mock — NOT for real auth */
  if (!s) return '';
  return btoa(unescape(encodeURIComponent(s))).replace(/=/g, '');
}

/* ── Auth ── */
function initAuth() {
  var token    = sessionStorage.getItem('admin_token');
  var username = sessionStorage.getItem('admin_username') || 'الأدمن';
  if (!token) { location.href = './auth-admin.html'; return; }

  A.session = { name: username, role: 'admin' };
  A.token   = token;

  document.getElementById('app').style.display = 'block';
  document.getElementById('sb-name').textContent = username;
  document.getElementById('ov-name').textContent = username;
  var tbName = document.getElementById('topbar-name');
  if (tbName) tbName.textContent = username;

  var days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var now = new Date();
  var dateEl = document.getElementById('ov-date');
  if (dateEl) dateEl.textContent = days[now.getDay()] + '، ' + now.toLocaleDateString('ar-SA');

  loadAll();
}

function doLogout() {
  if (!confirm('تسجيل الخروج؟')) return;
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_username');
  location.href = './auth-admin.html';
}

/* ── Sidebar drawer (mobile) ── */
function openSidebar() {
  document.querySelector('.sidebar').classList.add('open');
  var bd = document.getElementById('sidebar-backdrop');
  if (bd) bd.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  var bd = document.getElementById('sidebar-backdrop');
  if (bd) bd.classList.remove('open');
  document.body.style.overflow = '';
}
function toggleSidebar() {
  if (document.querySelector('.sidebar').classList.contains('open')) closeSidebar();
  else openSidebar();
}

/* ── Section nav ── */
function showSection(id) {
  document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  document.querySelectorAll('.mobile-nav-btn').forEach(function(n){ n.classList.remove('active'); });
  var sec = document.getElementById('section-' + id);
  var nav = document.getElementById('nav-' + id);
  var mob = document.querySelector('[data-mobile-nav="' + id + '"]');
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');
  if (mob) mob.classList.add('active');
  if (id === 'requests')   renderRequestsTables();
  if (id === 'teachers')   renderTeachersTable();
  if (id === 'students')   { populateStudentSchoolFilter(); renderStudentsTable(); }
  if (id === 'challenges') renderChallengesTables();
  if (id === 'creators')   renderCreatorsTable();
  if (id === 'notifs')     renderNotifList();
  if (id === 'trash')      renderTrashSection();
  if (window.innerWidth <= 768) closeSidebar();
}

/* ── Inner tab switch ── */
function switchTab(section, tab, btn) {
  var prefix = section + '-tab-';
  document.querySelectorAll('[id^="' + prefix + '"]').forEach(function(el){ el.style.display = 'none'; });
  var target = document.getElementById(prefix + tab);
  if (target) target.style.display = '';
  var tabs = btn.closest('.inner-tabs');
  if (tabs) tabs.querySelectorAll('.inner-tab').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

/* ── Load all ── */
function loadAll() {
  loadTrash();
  loadSchools();
  loadTeachers();
  loadStudents();
  loadAllClasses();
  loadChallenges();
  loadCreators();
  loadSubmissions();
  loadNotifs();
}

function loadAllClasses() {
  var seen = {};
  function merge(list) {
    (list || []).forEach(function(c) {
      var key = c.id || [c.schoolId || c.school || '', c.name || c.grade || '', c.section || ''].join('::');
      if (!key || seen[key]) return;
      seen[key] = true;
      A.classes.push(c);
    });
  }
  A.classes = [];
  CQ_API.getClasses('', A.token).then(function(res) {
    merge(res.classes || res.data || []);
    var ids = ['admin-unassigned'].concat((A.teachers || []).map(function(t) { return t.id; }).filter(Boolean));
    return Promise.all(ids.map(function(id) {
      return CQ_API.getClasses(id).then(function(r) { merge(r.classes || r.data || []); }).catch(function() {});
    }));
  }).then(function() {
    if (typeof window.renderClassesDirectory === 'function') window.renderClassesDirectory();
    if (typeof window.renderSchoolsTable === 'function') window.renderSchoolsTable();
  }).catch(function() {
    if (typeof window.renderClassesDirectory === 'function') window.renderClassesDirectory();
    if (typeof window.renderSchoolsTable === 'function') window.renderSchoolsTable();
  });
  CQ_API.getCourses(A.token).then(function(res) {
    A.courses = _filterTrashed(res.courses || res.data || [], 'course');
    if (typeof window.renderClassesDirectory === 'function') window.renderClassesDirectory();
    if (typeof window.renderSchoolsTable === 'function') window.renderSchoolsTable();
  }).catch(function() { if (!A.courses) A.courses = []; });
}

function _filterTrashed(list, type) {
  var ids = (A.trash || []).filter(function(e){ return e.type === type; }).map(function(e){ return e.data.id; });
  if (!ids.length) return list;
  return list.filter(function(item){ return ids.indexOf(item.id) === -1; });
}

function loadSchools() {
  CQ_API.getSchools().then(function(res) {
    A.schools = _filterTrashed(res.schools || res.data || [], 'school');
    renderSchoolsTable();
    populateSchoolSelects();
    updateStats();
  }).catch(function(){ renderSchoolsTable(); });
}

function loadTeachers() {
  CQ_API.getTeachers(A.token).then(function(res) {
    A.teachers = _filterTrashed(res.teachers || res.data || [], 'teacher');
    renderTeachersTable();
    renderRequestsTables();
    updateStats();
    renderOvTeachers();
    loadAllClasses();
  }).catch(function(){ renderTeachersTable(); });
}

function loadStudents() {
  CQ_API.getStudents(A.token).then(function(res) {
    A.students = _filterTrashed(res.students || res.data || [], 'student');
    populateStudentSchoolFilter();
    renderStudentsTable();
    renderRequestsTables();
    updateStats();
    if (typeof window.renderClassesDirectory === 'function') window.renderClassesDirectory();
  }).catch(function(){ renderStudentsTable(); });
}

function loadChallenges() {
  CQ_API.getChallenges(A.token).then(function(res) {
    A.challenges = _filterTrashed(res.challenges || res.data || [], 'challenge');
    renderChallengesTables();
    updateStats();
    renderOvChallenges();
  }).catch(function(){ renderChallengesTables(); });
}

function loadCreators() {
  CQ_API.getCreators(A.token).then(function(res) {
    if (res.ok && (res.creators || res.data)) {
      A.creators = _filterTrashed(res.creators || res.data || [], 'creator');
    }
    renderCreatorsTable();
    renderRequestsTables();
  }).catch(function(){});
}

function loadSubmissions() {
  CQ_API.listSubmissions(A.token).then(function(res) {
    A.submissions = res.submissions || [];
    renderRequestsTables();
  }).catch(function(){});
}

function loadNotifs() {
  CQ_API.getAdminNotifs(A.token).then(function(res) {
    A.notifs = res.notifs || res.data || [];
    if (typeof window.updateNotifBadges === 'function') window.updateNotifBadges();
    renderNotifList();
  }).catch(function() { A.notifs = []; });
}

/* ── Stats ── */
function updateStats() {
  var stSchools = document.getElementById('st-schools');
  var stTeachers = document.getElementById('st-teachers');
  var stStudents = document.getElementById('st-students');
  var stChallenges = document.getElementById('st-challenges');
  var heroSummary = document.getElementById('hero-summary');

  if (stSchools)    stSchools.textContent    = A.schools.length;
  if (stTeachers)   stTeachers.textContent   = A.teachers.length;
  if (stStudents)   stStudents.textContent   = A.students.length;
  if (stChallenges) stChallenges.textContent = A.challenges.filter(function(c){ return c.status === 'published'; }).length;
  if (heroSummary)  heroSummary.textContent  =
    A.schools.length + ' مدرسة | ' + A.teachers.length + ' معلم | ' + A.students.length + ' طالب';
}

/* ── Render Schools ── */
function renderSchoolsTable(filter) {
  var tbody = document.getElementById('schools-tbody');
  if (!tbody) return;
  var list = filter ? A.schools.filter(function(s){
    return (s.name||'').includes(filter) || (s.city||'').includes(filter);
  }) : A.schools;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">🏫</div>لا توجد مدارس بعد</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(s) {
    var teacherCount = A.teachers.filter(function(t){ return t.schoolId === s.id || (t.schools||[]).includes(s.id); }).length;
    var studentCount = A.students.filter(function(st){ return st.schoolId === s.id; }).length;
    var statusLabel = s.status === 'inactive'
      ? '<span class="badge badge-pending">معطّل</span>'
      : '<span class="badge badge-active">نشط</span>';
    return '<tr>' +
      '<td><strong>' + esc(s.name) + '</strong></td>' +
      '<td>' + esc(s.city||'—') + '</td>' +
      '<td><span class="badge badge-blue">' + (s.type === 'center' ? 'مركز' : 'مدرسة') + '</span></td>' +
      '<td>' + teacherCount + '</td>' +
      '<td>' + studentCount + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
        '<button class="btn btn-xs btn-outline" onclick="openEditSchool(\'' + s.id + '\')">' + statusLabel.replace(/<[^>]+>/g,'') + ' تعديل</button>' +
        (s.status === 'inactive'
          ? '<button class="btn btn-xs btn-green" onclick="doToggleSchool(\'' + s.id + '\',\'active\')">تفعيل</button>'
          : '<button class="btn btn-xs btn-danger" onclick="doToggleSchool(\'' + s.id + '\',\'inactive\')">تعطيل</button>') +
        '<button class="btn btn-xs btn-danger" onclick="doDeleteSchool(\'' + s.id + '\')"title="حذف">حذف</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterSchools() {
  renderSchoolsTable(document.getElementById('school-search').value.trim());
}

function populateSchoolSelects() {
  var opts = A.schools.map(function(s){ return '<option value="'+s.id+'">'+esc(s.name)+'</option>'; }).join('');
  ['teacher-school-sel','student-school-sel','import-teacher-school'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.innerHTML = opts || '<option value="">لا توجد مدارس</option>';
  });
}

/* ── Render Teachers ── */
function renderTeachersTable(filter) {
  var tbody = document.getElementById('teachers-tbody');
  if (!tbody) return;
  var list = filter ? A.teachers.filter(function(t){
    return (t.name||'').includes(filter) || (t.teacherCode||'').includes(filter);
  }) : A.teachers;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">👤</div>لا يوجد معلمون بعد</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(t) {
    var school = A.schools.find(function(s){ return s.id === t.schoolId; });
    var isActive = t.status === 'active';
    var statusBadge = isActive
      ? '<span class="badge badge-active">نشط</span>'
      : '<span class="badge badge-pending">معلق</span>';
    return '<tr>' +
      '<td><strong>' + esc(t.name) + '</strong></td>' +
      '<td><code>' + esc(t.teacherCode||'—') + '</code></td>' +
      '<td>' + esc(t.email||'—') + '</td>' +
      '<td>' + esc(school ? school.name : '—') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
        (isActive
          ? '<button class="btn btn-xs btn-danger" onclick="doToggleUserStatus(\'' + t.id + '\',\'inactive\',\'teacher\')"> تعطيل</button>'
          : '<button class="btn btn-xs btn-green" onclick="doToggleUserStatus(\'' + t.id + '\',\'active\',\'teacher\')"> تفعيل</button>') +
        '<button class="btn btn-xs btn-danger" onclick="doDeleteTeacher(\'' + t.id + '\')">حذف</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterTeachers() {
  renderTeachersTable(document.getElementById('teacher-search').value.trim());
}

/* ── Render Students ── */
function populateStudentSchoolFilter() {
  var sel = document.getElementById('student-school-filter');
  if (!sel) return;
  var current = sel.value;
  sel.innerHTML = '<option value="">كل المدارس</option>' +
    A.schools.map(function(s){ return '<option value="'+s.id+'">'+esc(s.name)+'</option>'; }).join('');
  sel.value = current;
}

function renderStudentsTable() {
  var tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  var schoolFilter = (document.getElementById('student-school-filter')||{}).value || '';
  var textFilter   = (document.getElementById('student-search')||{}).value || '';
  var list = A.students.filter(function(s){
    var matchSchool = !schoolFilter || s.schoolId === schoolFilter;
    var matchText   = !textFilter || (s.name||'').includes(textFilter) || (s.studentCode||'').includes(textFilter);
    return matchSchool && matchText;
  });
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">🎓</div>لا يوجد طلاب</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(s) {
    var school = A.schools.find(function(sc){ return sc.id === s.schoolId; });
    var isActive = s.status === 'active';
    var statusBadge = isActive
      ? '<span class="badge badge-active">نشط</span>'
      : '<span class="badge badge-pending">معلق</span>';
    return '<tr>' +
      '<td><strong>' + esc(s.name) + '</strong></td>' +
      '<td><code>' + esc(s.studentCode||'—') + '</code></td>' +
      '<td>' + esc(s.email||'—') + '</td>' +
      '<td>' + esc(s.class||s.className||'—') + '</td>' +
      '<td>' + esc(school ? school.name : '—') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
        (isActive
          ? '<button class="btn btn-xs btn-danger" onclick="doToggleUserStatus(\'' + s.id + '\',\'inactive\',\'student\')"> تعطيل</button>'
          : '<button class="btn btn-xs btn-green" onclick="doToggleUserStatus(\'' + s.id + '\',\'active\',\'student\')"> تفعيل</button>') +
        '<button class="btn btn-xs btn-danger" onclick="doDeleteStudent(\'' + s.id + '\')">حذف</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterStudents() { renderStudentsTable(); }

/* ── Render Challenges ── */
function renderChallengesTables() {
  var published = A.challenges.filter(function(c){ return c.status === 'published'; });
  var drafts    = A.challenges.filter(function(c){ return c.status !== 'published'; });

  var pubTbody = document.getElementById('challenges-published-tbody');
  if (pubTbody) {
    pubTbody.innerHTML = published.length ? published.map(function(c) {
      var label = c.name || c.title || '—';
      return '<tr>' +
        '<td><strong>' + esc(label) + '</strong></td>' +
        '<td>المسار ' + esc(c.track||'—') + '</td>' +
        '<td>' + difficultyLabel(c.difficulty) + '</td>' +
        '<td>' + fmtDate(c.publishedAt) + '</td>' +
        '<td>' + (c.assignedCount||0) + '</td>' +
        '<td style="display:flex;gap:4px;">' +
          '<button class="btn btn-xs btn-outline" onclick="openEditChallenge(\'' + c.id + '\')">تعديل</button>' +
          '<button class="btn btn-xs btn-danger" onclick="doUnpublishChallenge(\'' + c.id + '\')">إلغاء النشر</button>' +
          '<button class="btn btn-xs btn-danger-outline" onclick="doDeleteChallenge(\'' + c.id + '\')">حذف</button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-icon">⚡</div>لا توجد تحديات منشورة</div></td></tr>';
  }

  var draftTbody = document.getElementById('challenges-draft-tbody');
  if (draftTbody) {
    draftTbody.innerHTML = drafts.length ? drafts.map(function(c) {
      var dLabel = c.name || c.title || '—';
      return '<tr>' +
        '<td><strong>' + esc(dLabel) + '</strong></td>' +
        '<td>المسار ' + esc(c.track||'—') + '</td>' +
        '<td>' + difficultyLabel(c.difficulty) + '</td>' +
        '<td>' + fmtDate(c.updatedAt||c.createdAt) + '</td>' +
        '<td style="display:flex;gap:4px;">' +
          '<button class="btn btn-xs btn-outline" onclick="openEditChallenge(\'' + c.id + '\')">تعديل</button>' +
          '<button class="btn btn-xs btn-green" onclick="doPublishChallenge(\'' + c.id + '\')">نشر</button>' +
          '<button class="btn btn-xs btn-danger" onclick="doDeleteChallenge(\'' + c.id + '\')">حذف</button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="5"><div class="empty"><div class="empty-icon">📝</div>لا توجد مسودات</div></td></tr>';
  }
}

function difficultyLabel(d) {
  return d === 'easy' ? '<span class="badge badge-active">سهل</span>'
       : d === 'hard' ? '<span class="badge badge-rejected">صعب</span>'
       : '<span class="badge badge-pending">متوسط</span>';
}

/* ── Render Creators ── */
function renderCreatorsTable(filter) {
  var tbody = document.getElementById('creators-tbody');
  if (!tbody) return;
  var list = filter ? A.creators.filter(function(c){ return (c.name||'').includes(filter); }) : A.creators;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><div class="empty-icon">✨</div>لا يوجد مبتكرون بعد</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(c) {
    var isActive = c.status === 'active';
    var statusBadge = isActive
      ? '<span class="badge badge-active">نشط</span>'
      : '<span class="badge badge-pending">معلق</span>';
    return '<tr>' +
      '<td><strong>' + esc(c.name) + '</strong></td>' +
      '<td>' + esc(c.email||'—') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
        (isActive
          ? '<button class="btn btn-xs btn-danger" onclick="doToggleUserStatus(\'' + c.id + '\',\'inactive\',\'creator\')"> تعطيل</button>'
          : '<button class="btn btn-xs btn-green" onclick="doToggleUserStatus(\'' + c.id + '\',\'active\',\'creator\')"> تفعيل</button>') +
        '<button class="btn btn-xs btn-danger" onclick="doDeleteCreator(\'' + c.id + '\')">حذف</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterCreators() {
  renderCreatorsTable(document.getElementById('creator-search').value.trim());
}

/* ── Overview lists ── */
function renderOvChallenges() {
  var el = document.getElementById('ov-challenges-list');
  if (!el) return;
  var recent = A.challenges.slice(-5).reverse();
  if (!recent.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">⚡</div>لا توجد تحديات بعد</div>'; return; }
  el.innerHTML = '<div class="mini-list">' + recent.map(function(c) {
    var name = c.name || c.title || '—';
    return '<div class="mini-item">' +
      '<div class="mini-main"><div class="mini-title">' + esc(name) + '</div>' +
      '<div class="mini-sub">المسار ' + esc(c.track||'—') + ' — ' + (c.status === 'published' ? 'منشور' : 'مسودة') + '</div></div>' +
      '<div class="mini-meta">' + difficultyLabel(c.difficulty) + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function renderOvTeachers() {
  var el = document.getElementById('ov-teachers-list');
  if (!el) return;
  var recent = A.teachers.slice(-5).reverse();
  if (!recent.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">👤</div>لا يوجد معلمون بعد</div>'; return; }
  el.innerHTML = recent.map(function(t) {
    var school = A.schools.find(function(s){ return s.id === t.schoolId; });
    return '<div class="mini-item">' +
      '<div class="mini-main"><div class="mini-title">' + esc(t.name) + '</div>' +
      '<div class="mini-sub">' + esc(school ? school.name : '—') + ' — <code>' + esc(t.teacherCode||'') + '</code></div></div>' +
    '</div>';
  }).join('');
}

/* ── Notifs ── */
function renderNotifList() {
  var el = document.getElementById('notif-list');
  if (!el) return;
  if (!A.notifs.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🔔</div>لا توجد إشعارات</div>'; return; }
  el.innerHTML = A.notifs.map(function(n) {
    return '<li class="notif-item-li ' + (n.readAt ? '' : 'unread') + '" onclick="markRead(\'' + n.id + '\')">' +
      '<span class="notif-icon">🔔</span>' +
      '<div class="notif-text"><div>' + esc(n.text||n.message||'') + '</div>' +
      '<div class="notif-time">' + fmtDate(n.createdAt) + '</div></div>' +
      (n.readAt ? '' : '<span class="notif-dot"></span>') +
    '</li>';
  }).join('');
}

function markRead(id) {
  A.notifs.forEach(function(n){ if (n.id === id) n.readAt = Date.now(); });
  renderNotifList();
}

function markAllRead() {
  A.notifs.forEach(function(n){ n.readAt = n.readAt || Date.now(); });
  var badge = document.getElementById('nav-notif-badge');
  if (badge) badge.style.display = 'none';
  renderNotifList();
}

/* ── Add School ── */
function openAddSchool() { openModal('modal-addschool'); showMsg('school-msg','',''); }
function doAddSchool() {
  var name = document.getElementById('school-name').value.trim();
  var city = document.getElementById('school-city').value.trim();
  var type = document.getElementById('school-type').value;
  if (!name || !city) { showMsg('school-msg','يرجى إدخال اسم المدرسة/المركز والمدينة','err'); return; }
  if (!name) { showMsg('school-msg','يرجى إدخال اسم المدرسة/المركز','err'); return; }
  CQ_API.createSchool({name:name, city:city, type:type}, A.token).then(function(res) {
    if (res.success || res.ok) {
      closeModal('modal-addschool');
      loadSchools();
    } else { showMsg('school-msg', res.message || res.msg || '??? ???','err'); }
  }).catch(function(){ showMsg('school-msg','تعذر الاتصال بالخادم','err'); });
}

function openEditSchool(id) {
  var s = A.schools.find(function(sc){ return sc.id === id; });
  if (!s) return;
  document.getElementById('school-name').value = s.name||'';
  document.getElementById('school-city').value = s.city||'';
  document.getElementById('school-type').value = s.type||'school';
  openModal('modal-addschool');
}

/* ── Add Teacher ── */
function openAddTeacher() { openModal('modal-addteacher'); showMsg('teacher-msg','',''); }
function doAddTeacher() {
  var name   = document.getElementById('teacher-name').value.trim();
  var email  = document.getElementById('teacher-email').value.trim();
  var school = document.getElementById('teacher-school-sel').value;
  var pass   = document.getElementById('teacher-pass').value;
  if (!name || !email) { showMsg('teacher-msg','يرجى إدخال الاسم والبريد الإلكتروني','err'); return; }
  CQ_API.adminCreateUser({name:name, email:email, schoolId:school, password:pass, role:'teacher'}, A.token).then(function(res) {
    if (res.success || res.ok) {
      closeModal('modal-addteacher');
      loadTeachers();
    } else { showMsg('teacher-msg', res.message || res.msg || '??? ???','err'); }
  }).catch(function(){ showMsg('teacher-msg','تعذر الاتصال بالخادم','err'); });
}

function doDeleteTeacher(id) {
  var t = A.teachers.find(function(x){ return x.id === id; });
  if (!t) return;
  if (!confirm('نقل هذا المعلم إلى سلة المهملات؟')) return;
  moveToTrash(t, 'teacher');
  renderTeachersTable();
}

function doToggleUserStatus(id, newStatus, type) {
  var label = newStatus === 'active' ? 'تفعيل' : 'تعطيل';
  if (!confirm(label + ' هذا الحساب؟')) return;
  CQ_API.adminSetUserStatus(id, {status: newStatus}, A.token).then(function(res) {
    if (res.ok || res.success) {
      if (type === 'teacher') loadTeachers();
      else if (type === 'creator') loadCreators();
      else loadStudents();
    } else {
      alert('حدث خطأ: ' + (res.msg || res.message || ''));
    }
  }).catch(function(){ alert('تعذر الاتصال بالخادم'); });
}

function doToggleSchool(id, newStatus) {
  var label = newStatus === 'active' ? 'تفعيل' : 'تعطيل';
  if (!confirm(label + ' هذه المدرسة؟')) return;
  CQ_API.updateSchool(id, {status: newStatus}, A.token).then(function(res) {
    if (res.ok || res.success) loadSchools();
    else alert('حدث خطأ: ' + (res.msg || res.message || ''));
  }).catch(function(){ alert('تعذر الاتصال بالخادم'); });
}

function doDeleteSchool(id) {
  var s = A.schools.find(function(x){ return x.id === id; });
  if (!s) return;
  if (!confirm('نقل هذه المدرسة إلى سلة المهملات؟')) return;
  moveToTrash(s, 'school');
  renderSchoolsTable();
  populateSchoolSelects();
}

function doImportTeachers() {
  showMsg('import-teacher-msg','جاري الاستيراد...','ok');
}

/* ── Add/Edit Challenge ── */
function openAddChallenge() {
  A._editChalId = null;
  document.getElementById('challenge-modal-title').textContent = 'تحدي جديد';
  ['chal-title','chal-desc','chal-link'].forEach(function(id){
    document.getElementById(id).value = '';
  });
  document.getElementById('chal-track').value = '1';
  document.getElementById('chal-difficulty').value = 'medium';
  document.getElementById('chal-status').value = 'draft';
  showMsg('chal-msg','','');
  openModal('modal-addchallenge');
}

function openEditChallenge(id) {
  var c = A.challenges.find(function(ch){ return ch.id === id; });
  if (!c) return;
  A._editChalId = id;
  document.getElementById('challenge-modal-title').textContent = 'تعديل التحدي';
  document.getElementById('chal-title').value = c.title||'';
  document.getElementById('chal-desc').value  = c.description||c.desc||'';
  document.getElementById('chal-link').value  = c.link||'';
  document.getElementById('chal-track').value = c.track||'1';
  document.getElementById('chal-difficulty').value = c.difficulty||'medium';
  document.getElementById('chal-status').value = c.status||'draft';
  showMsg('chal-msg','','');
  openModal('modal-addchallenge');
}

function doSaveChallenge() {
  var data = {
    title:      document.getElementById('chal-title').value.trim(),
    description:document.getElementById('chal-desc').value.trim(),
    link:       document.getElementById('chal-link').value.trim(),
    track:      document.getElementById('chal-track').value,
    difficulty: document.getElementById('chal-difficulty').value,
    status:     document.getElementById('chal-status').value,
  };
  if (!data.title) { showMsg('chal-msg','يرجى إدخال عنوان التحدي','err'); return; }
  var promise = A._editChalId
    ? CQ_API.updateChallenge(A._editChalId, data, A.token)
    : CQ_API.createChallenge(data, A.token);
  promise.then(function(res) {
    if (res.success || res.ok) {
      closeModal('modal-addchallenge');
      loadChallenges();
    } else { showMsg('chal-msg', res.message || res.msg || '??? ???','err'); }
  }).catch(function(){ showMsg('chal-msg','تعذر الاتصال بالخادم','err'); });
}

function doPublishChallenge(id) {
  CQ_API.publishChallenge(id, A.token).then(function(){ loadChallenges(); });
}

function doUnpublishChallenge(id) {
  if (!confirm('إلغاء نشر هذا التحدي؟ لن يظهر للمعلمين.')) return;
  CQ_API.unpublishChallenge(id, A.token).then(function(){ loadChallenges(); });
}

function doDeleteChallenge(id) {
  var c = A.challenges.find(function(x){ return x.id === id; });
  if (!c) return;
  if (!confirm('نقل هذا التحدي إلى سلة المهملات؟')) return;
  moveToTrash(c, 'challenge');
  renderChallengesTables();
}

/* ── Students ── */
function doDeleteStudent(id) {
  var s = A.students.find(function(x){ return x.id === id; });
  if (!s) return;
  if (!confirm('نقل هذا الطالب إلى سلة المهملات؟')) return;
  moveToTrash(s, 'student');
  renderStudentsTable();
}

/* ── Creators ── */
function openAddStudent() {
  openModal('modal-addstudent');
  showMsg('student-msg','','');
}

function doAddStudent() {
  var name    = document.getElementById('student-name').value.trim();
  var email   = document.getElementById('student-email').value.trim();
  var school  = document.getElementById('student-school-sel').value;
  var cls     = document.getElementById('student-class').value.trim();
  var section = document.getElementById('student-section').value.trim();
  var pass    = document.getElementById('student-pass').value;
  if (!name || !email || !school || !cls || !pass) {
    showMsg('student-msg','يرجى إدخال الاسم والبريد والمدرسة والصف وكلمة المرور','err');
    return;
  }
  CQ_API.adminCreateUser({
    name: name,
    email: email,
    schoolId: school,
    class: cls,
    section: section,
    passwordHash: hashText(pass),
    role: 'student'
  }, A.token).then(function(res) {
    if (res.success || res.ok) {
      closeModal('modal-addstudent');
      loadStudents();
    } else {
      showMsg('student-msg', res.message || res.msg || 'حدث خطأ','err');
    }
  }).catch(function() {
    showMsg('student-msg','تعذر الاتصال بالخادم','err');
  });
}

function openAddCreator() { openModal('modal-addcreator'); showMsg('creator-msg','',''); }
function doAddCreator() {
  var name  = document.getElementById('creator-name').value.trim();
  var email = document.getElementById('creator-email').value.trim();
  var pass  = document.getElementById('creator-pass').value;
  if (!name || !email) { showMsg('creator-msg','يرجى إدخال الاسم والبريد الإلكتروني','err'); return; }
  CQ_API.adminCreateUser({name:name, email:email, passwordHash: hashText ? hashText(pass) : pass, role:'creator'}, A.token).then(function(res) {
    if (res.success || res.ok) {
      closeModal('modal-addcreator');
      var newUser = res.user || { id: res.userId || ('tmp-' + Date.now()), name: name, email: email, role: 'creator', status: 'active' };
      A.creators = A.creators || [];
      if (!A.creators.find(function(c) { return c.email === newUser.email; })) {
        A.creators.push(newUser);
      }
      renderCreatorsTable();
      loadCreators();
    } else { showMsg('creator-msg', res.message || res.msg || 'حدث خطأ','err'); }
  }).catch(function(){ showMsg('creator-msg','تعذر الاتصال بالخادم','err'); });
}

function doDeleteCreator(id) {
  var c = A.creators.find(function(x){ return x.id === id; });
  if (!c) return;
  if (!confirm('نقل هذا المبتكر إلى سلة المهملات؟')) return;
  moveToTrash(c, 'creator');
  renderCreatorsTable();
}

/* ── Requests (pending signups + submissions) ── */
function renderRequestsTables() {
  var pendingTeachers  = A.teachers.filter(function(t){ return t.status === 'pending'; });
  var pendingStudents  = A.students.filter(function(s){ return s.status === 'pending' && s.role !== 'creator'; });
  var pendingCreators  = A.creators.filter(function(c){ return c.status === 'pending'; });
  var pendingSubs      = A.submissions || [];

  var total = pendingTeachers.length + pendingStudents.length + pendingCreators.length + pendingSubs.length;

  var sumT   = document.getElementById('req-sum-teachers');
  var sumS   = document.getElementById('req-sum-students');
  var sumC   = document.getElementById('req-sum-creators');
  var sumCh  = document.getElementById('req-sum-challenges');
  var sumTot = document.getElementById('req-sum-total');
  if (sumT)   sumT.textContent   = pendingTeachers.length;
  if (sumS)   sumS.textContent   = pendingStudents.length;
  if (sumC)   sumC.textContent   = pendingCreators.length;
  if (sumCh)  sumCh.textContent  = pendingSubs.length;
  if (sumTot) sumTot.textContent = total;

  ['nav-req-badge','ov-req-badge','topbar-req-badge'].forEach(function(id){
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = total;
    el.style.display = total ? '' : 'none';
  });

  function setBadge(id, count) {
    var el = document.getElementById(id);
    if (el) { el.textContent = count; el.style.display = count ? 'inline-flex' : 'none'; }
  }
  setBadge('req-teacher-count',  pendingTeachers.length);
  setBadge('req-student-count',  pendingStudents.length);
  setBadge('req-creator-count',  pendingCreators.length);
  setBadge('req-challenge-count', pendingSubs.length);

  function userRows(list, approveFunc, rejectFunc, emptyIcon, emptyText) {
    if (!list.length) return '<tr><td colspan="5"><div class="empty"><div class="empty-icon">' + emptyIcon + '</div>' + emptyText + '</div></td></tr>';
    return list.map(function(u) {
      return '<tr>' +
        '<td><strong>' + esc(u.name) + '</strong></td>' +
        '<td>' + esc(u.email||'—') + '</td>' +
        '<td>' + esc(u.phone||'—') + '</td>' +
        '<td>' + fmtDate(u.joinedAt) + '</td>' +
        '<td style="display:flex;gap:6px;">' +
          '<button class="btn btn-xs btn-green" onclick="' + approveFunc + '(\'' + u.id + '\')">✓ قبول</button>' +
          '<button class="btn btn-xs btn-danger" onclick="' + rejectFunc  + '(\'' + u.id + '\')">✕ رفض</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  var tBody = document.getElementById('req-teachers-tbody');
  if (tBody) tBody.innerHTML = userRows(pendingTeachers, 'doApproveTeacher', 'doRejectTeacher', '👤', 'لا توجد طلبات معلقة');

  var sBody = document.getElementById('req-students-tbody');
  if (sBody) sBody.innerHTML = userRows(pendingStudents, 'doApproveStudent', 'doRejectStudent', '🎓', 'لا توجد طلبات معلقة');

  var cBody = document.getElementById('req-creators-tbody');
  if (cBody) cBody.innerHTML = userRows(pendingCreators, 'doApproveCreator', 'doRejectCreator', '✨', 'لا توجد طلبات معلقة');

  var chBody = document.getElementById('req-challenges-tbody');
  if (chBody) {
    chBody.innerHTML = pendingSubs.length ? pendingSubs.map(function(sub) {
      return '<tr>' +
        '<td><strong>' + esc(sub.name) + '</strong></td>' +
        '<td>' + esc(sub.school||'—') + '</td>' +
        '<td>' + esc(sub.challenge||'—') + '</td>' +
        '<td>' + (sub.imageUrl ? '<a href="' + esc(sub.imageUrl) + '" target="_blank" style="color:var(--accent)">عرض الصورة</a>' : '—') + '</td>' +
        '<td>' + fmtDate(sub.date) + '</td>' +
        '<td style="display:flex;gap:6px;">' +
          '<button class="btn btn-xs btn-green" onclick="doApproveSubmission(\'' + sub.id + '\')">✓ قبول</button>' +
          '<button class="btn btn-xs btn-danger" onclick="doRejectSubmission(\'' + sub.id + '\')">✕ رفض</button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-icon">⚡</div>لا توجد تحديات معلقة</div></td></tr>';
  }
}

function _showToast(msg, type) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (type === 'err' ? '#ef4444' : '#16a34a') + ';color:#fff;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.18);direction:rtl';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3000);
}

function doApproveTeacher(id) {
  CQ_API.approveTeacher(id, A.token).then(function(res) {
    if (res.ok || res.success) { loadTeachers(); loadNotifs(); _showToast('✅ تم قبول الطلب بنجاح'); }
    else _showToast('حدث خطأ: ' + (res.msg || res.message || ''), 'err');
  });
}
function doRejectTeacher(id) {
  if (!confirm('رفض هذا المعلم؟')) return;
  CQ_API.rejectTeacher(id, A.token).then(function(res) {
    if (res.ok || res.success) { loadTeachers(); loadNotifs(); _showToast('تم رفض الطلب', 'err'); }
    else _showToast('حدث خطأ: ' + (res.msg || res.message || ''), 'err');
  });
}

function doApproveStudent(id) {
  CQ_API.approveStudent(id, A.token).then(function(res) {
    if (res.ok || res.success) { loadStudents(); loadNotifs(); _showToast('✅ تم قبول الطلب بنجاح'); }
    else _showToast('حدث خطأ: ' + (res.msg || res.message || ''), 'err');
  });
}
function doRejectStudent(id) {
  if (!confirm('رفض هذا الطالب؟')) return;
  CQ_API.rejectStudent(id, A.token).then(function(res) {
    if (res.ok || res.success) { loadStudents(); loadNotifs(); _showToast('تم رفض الطلب', 'err'); }
    else _showToast('حدث خطأ: ' + (res.msg || res.message || ''), 'err');
  });
}

function doApproveCreator(id) {
  CQ_API.approveCreator(id, A.token).then(function(res) {
    if (res.ok || res.success) { loadCreators(); loadStudents(); loadNotifs(); _showToast('✅ تم قبول الطلب بنجاح'); }
    else _showToast('حدث خطأ: ' + (res.msg || res.message || ''), 'err');
  });
}
function doRejectCreator(id) {
  if (!confirm('رفض هذا المبتكر؟')) return;
  CQ_API.rejectCreator(id, A.token).then(function(res) {
    if (res.ok || res.success) { loadCreators(); loadStudents(); loadNotifs(); _showToast('تم رفض الطلب', 'err'); }
    else _showToast('حدث خطأ: ' + (res.msg || res.message || ''), 'err');
  });
}

function doApproveSubmission(id) {
  CQ_API.approveSubmission(id, A.token).then(function(res) {
    if (res.ok) { loadSubmissions(); }
    else alert('حدث خطأ: ' + (res.msg || ''));
  });
}
function doRejectSubmission(id) {
  if (!confirm('رفض هذا التحدي؟')) return;
  CQ_API.rejectSubmission(id, A.token).then(function(res) {
    if (res.ok) { loadSubmissions(); }
    else alert('حدث خطأ: ' + (res.msg || ''));
  });
}

/* ── Change Password ── */
function openChangePass() { openModal('modal-chgpass'); showMsg('chgpass-msg','',''); }
function doChangePassword() {
  var p1 = document.getElementById('new-pass').value;
  var p2 = document.getElementById('new-pass-confirm').value;
  if (p1.length < 6) { showMsg('chgpass-msg','كلمة المرور 6 أحرف على الأقل','err'); return; }
  if (p1 !== p2)     { showMsg('chgpass-msg','كلمتا المرور غير متطابقتين','err'); return; }
  showMsg('chgpass-msg','تم تغيير كلمة المرور','ok');
}

var MOON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
var SUN_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

/* ── Dark Mode ── */
function toggleDashTheme() {
  var html = document.documentElement;
  var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  localStorage.setItem('cq_dash_theme', next);
  var btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = next === 'dark' ? SUN_SVG : MOON_SVG;
}
(function() {
  var saved = localStorage.getItem('cq_dash_theme') || 'light';
  document.documentElement.dataset.theme = saved;
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('themeToggle');
    if (btn) btn.innerHTML = saved === 'dark' ? SUN_SVG : MOON_SVG;
  });
})();

/* ── Init ── */
window.updateNotifBadges = function() {
  var unread = A.notifs.filter(function(n) { return !n.readAt; }).length;
  ['nav-notif-badge', 'topbar-notif-badge'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = unread;
    el.style.display = unread ? '' : 'none';
  });
};

window.loadNotifs = function() {
  CQ_API.getAdminNotifs(A.token).then(function(res) {
    A.notifs = res.notifs || res.data || [];
    window.updateNotifBadges();
    renderNotifList();
    if (typeof renderOverviewActivity === 'function') renderOverviewActivity();
  }).catch(function() {
    A.notifs = [];
    window.updateNotifBadges();
  });
};

window.markRead = function(id) {
  A.notifs.forEach(function(n){ if (n.id === id) n.readAt = new Date().toISOString(); });
  CQ_API.markNotifRead(id);
  window.updateNotifBadges();
  renderNotifList();
};

window.markAllRead = function() {
  A.notifs.forEach(function(n){ n.readAt = n.readAt || new Date().toISOString(); });
  CQ_API.markAllNotifsRead('admin');
  window.updateNotifBadges();
  renderNotifList();
};

/* ════ Trash System ════ */

function loadTrash() {
  try { A.trash = JSON.parse(localStorage.getItem('cq_admin_trash') || '[]'); } catch(e) { A.trash = []; }
  updateTrashBadge();
}

function saveTrash() {
  try { localStorage.setItem('cq_admin_trash', JSON.stringify(A.trash)); } catch(e) {}
  updateTrashBadge();
}

function updateTrashBadge() {
  var count = (A.trash || []).length;
  var badge = document.getElementById('nav-trash-badge');
  if (badge) { badge.textContent = count; badge.style.display = count ? '' : 'none'; }
}

function moveToTrash(item, type) {
  A.trash = A.trash || [];
  A.trash.push({
    _trashId: 'tr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type:      type,
    deletedAt: Date.now(),
    data:      JSON.parse(JSON.stringify(item))
  });
  saveTrash();
  if (type === 'school')    A.schools    = A.schools.filter(function(x){ return x.id !== item.id; });
  if (type === 'teacher')   A.teachers   = A.teachers.filter(function(x){ return x.id !== item.id; });
  if (type === 'student')   A.students   = A.students.filter(function(x){ return x.id !== item.id; });
  if (type === 'challenge') A.challenges = A.challenges.filter(function(x){ return x.id !== item.id; });
  if (type === 'creator')   A.creators   = A.creators.filter(function(x){ return x.id !== item.id; });
  if (type === 'course')    A.courses    = (A.courses||[]).filter(function(x){ return x.id !== item.id; });
  updateStats();
  _showToast('تم النقل إلى سلة المهملات');
}

function _trashLabel(type) {
  return ({school:'مدرسة/مركز', teacher:'معلم', student:'طالب', challenge:'تحدي', creator:'مبتكر', course:'دورة'})[type] || type;
}
function _trashIcon(type) {
  return ({school:'🏫', teacher:'👤', student:'🎓', challenge:'⚡', creator:'✨', course:'🧩'})[type] || '🗑️';
}

function renderTrashSection() {
  var trash = A.trash || [];
  var counts = { all: trash.length, schools: 0, teachers: 0, students: 0, challenges: 0, creators: 0, courses: 0 };
  trash.forEach(function(e) {
    if (e.type === 'school')    counts.schools++;
    if (e.type === 'teacher')   counts.teachers++;
    if (e.type === 'student')   counts.students++;
    if (e.type === 'challenge') counts.challenges++;
    if (e.type === 'creator')   counts.creators++;
    if (e.type === 'course')    counts.courses++;
  });

  ['all','schools','teachers','students','challenges','creators','courses'].forEach(function(k) {
    var b = document.getElementById('trash-count-' + k);
    if (b) { b.textContent = counts[k]; b.style.display = counts[k] ? 'inline-flex' : 'none'; }
  });

  var sumMap = { schools: counts.schools, teachers: counts.teachers, students: counts.students, challenges: counts.challenges, creators: counts.creators, courses: counts.courses };
  Object.keys(sumMap).forEach(function(k) {
    var el = document.getElementById('trash-sum-' + k);
    if (el) el.textContent = sumMap[k];
  });
  var tot = document.getElementById('trash-sum-total');
  if (tot) tot.textContent = counts.all;

  var sets = {
    all:        trash,
    schools:    trash.filter(function(e){ return e.type === 'school'; }),
    teachers:   trash.filter(function(e){ return e.type === 'teacher'; }),
    students:   trash.filter(function(e){ return e.type === 'student'; }),
    challenges: trash.filter(function(e){ return e.type === 'challenge'; }),
    creators:   trash.filter(function(e){ return e.type === 'creator'; }),
    courses:    trash.filter(function(e){ return e.type === 'course'; })
  };

  Object.keys(sets).forEach(function(key) {
    var container = document.getElementById('trash-tab-' + key);
    if (!container) return;
    var items = sets[key];
    if (!items.length) {
      container.innerHTML = '<div class="panel"><div class="empty"><div class="empty-icon">🗑️</div>لا توجد عناصر هنا</div></div>';
      return;
    }
    container.innerHTML =
      '<div class="panel"><div class="tbl-wrap"><table>' +
      '<thead><tr><th>النوع</th><th>الاسم</th><th>التفاصيل</th><th>تاريخ الحذف</th><th>إجراءات</th></tr></thead>' +
      '<tbody>' + items.map(function(e) {
        var d = e.data;
        var detail = '';
        if (e.type === 'school')    detail = esc(d.city || '') + (d.type === 'center' ? ' · مركز' : ' · مدرسة');
        if (e.type === 'teacher')   detail = esc(d.email || '—');
        if (e.type === 'student')   detail = esc(d.email || '—') + (d.class ? ' · ' + esc(d.class) : '');
        if (e.type === 'challenge') detail = 'المسار ' + esc(String(d.track || '—')) + ' · ' + (d.status === 'published' ? 'منشور' : 'مسودة');
        if (e.type === 'creator')   detail = esc(d.email || '—');
        if (e.type === 'course')    detail = esc(d.schoolName || '—') + (d.weeks ? ' · ' + d.weeks + ' أسابيع' : '');
        return '<tr>' +
          '<td><span class="trash-type-badge trash-type-' + e.type + '">' + _trashIcon(e.type) + ' ' + _trashLabel(e.type) + '</span></td>' +
          '<td><strong>' + esc(d.name || d.title || '—') + '</strong></td>' +
          '<td class="trash-detail">' + detail + '</td>' +
          '<td class="trash-date">' + fmtDate(e.deletedAt) + '</td>' +
          '<td><div class="trash-row-actions">' +
            '<button class="btn btn-xs btn-green" onclick="doRestoreTrash(\'' + e._trashId + '\')">↩ استعادة</button>' +
            '<button class="btn btn-xs btn-danger-outline" onclick="doPermanentDelete(\'' + e._trashId + '\')">حذف نهائي</button>' +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div></div>';
  });
}

function doRestoreTrash(trashId) {
  var idx = -1;
  (A.trash || []).forEach(function(e, i){ if (e._trashId === trashId) idx = i; });
  if (idx === -1) return;
  var entry = A.trash[idx];
  var d = entry.data;
  if (entry.type === 'school')    { A.schools.push(d);    renderSchoolsTable(); populateSchoolSelects(); }
  if (entry.type === 'teacher')   { A.teachers.push(d);   renderTeachersTable(); }
  if (entry.type === 'student')   { A.students.push(d);   renderStudentsTable(); }
  if (entry.type === 'challenge') { A.challenges.push(d); renderChallengesTables(); renderOvChallenges(); }
  if (entry.type === 'creator')   { A.creators.push(d);   renderCreatorsTable(); }
  if (entry.type === 'course')    { A.courses = A.courses || []; A.courses.push(d); if (typeof window.renderClassesDirectory === 'function') window.renderClassesDirectory(); }
  A.trash.splice(idx, 1);
  saveTrash();
  updateStats();
  renderTrashSection();
  _showToast('✅ تمت الاستعادة بنجاح');
}

function doPermanentDelete(trashId) {
  if (!confirm('حذف نهائي من الخادم؟ لا يمكن التراجع عن هذا الإجراء.')) return;
  var idx = -1;
  (A.trash || []).forEach(function(e, i){ if (e._trashId === trashId) idx = i; });
  if (idx === -1) return;
  var entry = A.trash[idx];
  var d = entry.data;
  var p;
  if (entry.type === 'school')         p = CQ_API.deleteSchool(d.id, A.token);
  else if (entry.type === 'challenge') p = CQ_API.deleteChallenge(d.id, A.token);
  else if (entry.type === 'course')    p = CQ_API.updateCourse(d.id, {courseStatus:'deleted'}, A.token);
  else                                 p = CQ_API.adminSetUserStatus(d.id, {status:'deleted'}, A.token);
  p.catch(function(){}).then(function() {
    A.trash.splice(idx, 1);
    saveTrash();
    renderTrashSection();
    _showToast('تم الحذف النهائي', 'err');
  });
}

function doClearTrash() {
  if (!(A.trash && A.trash.length)) { _showToast('السلة فارغة أصلاً', 'err'); return; }
  if (!confirm('حذف جميع العناصر نهائياً من الخادم؟ لا يمكن التراجع.')) return;
  var promises = (A.trash || []).map(function(entry) {
    var d = entry.data;
    if (entry.type === 'school')         return CQ_API.deleteSchool(d.id, A.token).catch(function(){});
    if (entry.type === 'challenge')      return CQ_API.deleteChallenge(d.id, A.token).catch(function(){});
    if (entry.type === 'course')         return CQ_API.updateCourse(d.id, {courseStatus:'deleted'}, A.token).catch(function(){});
    return CQ_API.adminSetUserStatus(d.id, {status:'deleted'}, A.token).catch(function(){});
  });
  Promise.all(promises).then(function() {
    A.trash = [];
    saveTrash();
    renderTrashSection();
    _showToast('تم تفريغ السلة', 'err');
  });
}

window.addEventListener('DOMContentLoaded', initAuth);
