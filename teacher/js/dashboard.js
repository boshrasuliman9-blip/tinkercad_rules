/* ════════════════════════════════════════
   Circuit Quest — Teacher Dashboard
   ════════════════════════════════════════ */

var T = {
  session:      null,
  classes:      [],
  studentsCache:{},   // classId → []
  assignments:  [],
  challenges:   [],
  schools:      [],
  notifs:       [],
  _rejectCodeId:   null,
  _reopenAssignId: null,
  _reopenStudents: [],
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
function fmtDur(ms) {
  if (!ms || ms < 0) return '—';
  var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s %= 60;
  var h = Math.floor(m / 60); m %= 60;
  return h > 0 ? h+'س '+m+'د' : m+'د '+s+'ث';
}
function sha256(str) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    .then(function(buf){ return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join(''); });
}
function showMsg(id, txt, type) {
  var el = document.getElementById(id);
  if (el) { el.textContent = txt; el.className = 'f-msg ' + type; }
}
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ── Auth ── */
function initAuth() {
  var devMode = new URLSearchParams(window.location.search).get('dev') === '1';
  function startDevTeacher() {
    T.session = {id:'dev-teacher-dashboard', name:'معلم تجريبي', email:'teacher@dev.local', role:'teacher', status:'active', teacherCode:'DEV-TEACHER'};
    localStorage.setItem('cq_session', JSON.stringify(T.session));
    return JSON.stringify(T.session);
  }

  var raw = localStorage.getItem('cq_session');
  if (!raw && devMode && window.CQ && CQ.auth && CQ.auth.requireApproval === false) {
    raw = startDevTeacher();
  }
  if (!raw) { location.href = './auth-teacher.html?reason=teacher_login_required'; return; }
  try { T.session = JSON.parse(raw); } catch(e) {
    localStorage.removeItem('cq_session');
    if (devMode && window.CQ && CQ.auth && CQ.auth.requireApproval === false) raw = startDevTeacher();
    else { location.href = './auth-teacher.html?reason=teacher_login_required'; return; }
  }
  if (!T.session || T.session.role !== 'teacher') {
    localStorage.removeItem('cq_session');
    if (devMode && window.CQ && CQ.auth && CQ.auth.requireApproval === false) raw = startDevTeacher();
    else { location.href = './auth-teacher.html?reason=teacher_login_required'; return; }
  }

  document.getElementById('app').style.display = 'block';
  document.getElementById('sb-name').textContent = T.session.name || '—';
  document.getElementById('sb-code').textContent = T.session.teacherCode || '';
  document.getElementById('ov-name').textContent = T.session.name || '';
  var tbName = document.getElementById('topbar-name');
  if (tbName) tbName.textContent = T.session.name || '—';

  var days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var now  = new Date();
  document.getElementById('ov-date').textContent = days[now.getDay()] + '، ' + now.toLocaleDateString('ar-SA');

  loadAll();
}

function doLogout() {
  localStorage.removeItem('cq_session');
  location.href = './auth-teacher.html';
}

function resetMockDb() {
  if (!confirm('إعادة قاعدة البيانات التجريبية؟ سيتم حذف تغييرات التجربة الحالية.')) return;
  localStorage.removeItem('cq_mock_db_v1');
  T.studentsCache = {};
  loadAll();
}

/* ── Section nav ── */
function showSection(id) {
  document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  document.querySelectorAll('.mobile-nav-btn').forEach(function(n){ n.classList.remove('active'); });
  var sec = document.getElementById('section-' + id);
  var nav = document.getElementById('nav-' + id);
  var mobileNav = document.querySelector('[data-mobile-nav="' + id + '"]');
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');
  if (mobileNav) mobileNav.classList.add('active');

  if (id === 'submissions')  populateSubClassSel();
  if (id === 'challenges')   { populateAssignSelects(); populateMapPills(); }
  if (id === 'achievements') { populateAchStudentSel(); populateAchFilterCls(); populateWinnerSchools(); loadAchievements(); loadWinners(); }
  if (id === 'notifs')       loadNotifs();
}

/* ── Load data ── */
function loadAll() {
  loadClasses();
  loadChallenges();
  loadSchools();
  loadNotifs();
}

function loadClasses() {
  CQ_API.getClasses(T.session.id).then(function(res) {
    T.classes = res.classes || res.data || [];
    renderClassesList();
    updateStats();
  });
}

function loadChallenges() {
  CQ_API.getChallenges().then(function(res) {
    T.challenges = (res.challenges || res.data || []).filter(function(c){ return c.status === 'published'; });
    if (document.getElementById('section-challenges').classList.contains('active')) {
      populateAssignSelects();
      populateMapPills();
    }
  });
  CQ_API.getAssignments(T.session.id).then(function(res) {
    T.assignments = res.assignments || res.data || [];
    renderAssignmentsTable();
    updateStats();
    renderOvPending();
  });
}

function loadSchools() {
  CQ_API.getSchools().then(function(res) {
    T.schools = res.schools || res.data || [];
    var sel = document.getElementById('cls-school-sel');
    sel.innerHTML = T.schools.map(function(s){ return '<option value="'+s.id+'">'+esc(s.name)+'</option>'; }).join('');
  });
}

function loadNotifs() {
  CQ_API.getTeacherNotifs(T.session.id).then(function(res) {
    T.notifs = res.notifs || res.data || [];
    var unread = T.notifs.filter(function(n){ return !n.readAt; }).length;
    var badge = document.getElementById('nav-notif-badge');
    badge.textContent = unread;
    badge.style.display = unread ? 'flex' : 'none';
    ['topbar-bell-badge'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) { el.textContent = unread; el.style.display = unread ? '' : 'none'; }
    });
    renderNotifList();
    renderOverviewWidgets();
  });
}

/* ── Stats ── */
function updateStats() {
  document.getElementById('st-classes').textContent = T.classes.length;
  var total = T.classes.reduce(function(s,c){ return s + (parseInt(c.studentCount)||0); }, 0);
  document.getElementById('st-students').textContent = total;
  var pending = T.assignments.reduce(function(s,a){ return s + (parseInt(a.pendingCount)||0); }, 0);
  document.getElementById('st-pending').textContent = pending;
  document.getElementById('st-assignments').textContent = T.assignments.length;
  renderOverviewWidgets();
}

/* ── Classes ── */
function renderClassesList() {
  var el = document.getElementById('classes-list');
  if (!T.classes.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🏫</div>لا توجد صفوف بعد</div>'; return; }
  el.innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>اسم الصف</th><th>المدرسة</th><th>الشعبة</th><th>الطلاب</th><th>إجراءات</th></tr></thead><tbody>'
    + T.classes.map(function(c) {
      return '<tr>'
        + '<td><strong>'+esc(c.name)+'</strong></td>'
        + '<td>'+esc(c.schoolName||'—')+'</td>'
        + '<td>'+esc(c.section||'—')+'</td>'
        + '<td>'+(c.studentCount||0)+'</td>'
        + '<td>'
          + '<button class="btn btn-sm btn-blue" onclick="viewStudents(\''+c.id+'\',\''+esc(c.name)+'\')">👥 الطلاب</button> '
          + '<button class="btn btn-sm btn-danger" onclick="deleteClass(\''+c.id+'\',\''+esc(c.name)+'\')">حذف</button>'
        + '</td>'
        + '</tr>';
    }).join('')
    + '</tbody></table></div>';
}

function viewStudents(classId, name) {
  document.getElementById('cls-panel-name').textContent = name;
  document.getElementById('students-panel').style.display = '';
  if (T.studentsCache[classId]) { renderStudentsTable(T.studentsCache[classId]); return; }
  document.getElementById('students-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center"><span class="spinner"></span></td></tr>';
  CQ_API.getStudentsByClass(classId).then(function(res) {
    T.studentsCache[classId] = res.students || res.data || [];
    renderStudentsTable(T.studentsCache[classId]);
    populateAchStudentSel();
  });
}

function renderStudentsTable(students) {
  var el = document.getElementById('students-tbody');
  if (!students.length) { el.innerHTML = '<tr><td colspan="5"><div class="empty">لا يوجد طلاب مسجلون</div></td></tr>'; return; }
  el.innerHTML = students.map(function(s) {
    var accEl = s.hasAccount ? '<span class="has-acc">✓ مسجّل</span>' : '<span class="no-acc">— لم يسجل بعد</span>';
    var leftBtn = s.isLeft
      ? '<button class="btn btn-xs btn-outline" onclick="markLeft(\''+s.id+'\',false)">↩ إعادة</button>'
      : '<button class="btn btn-xs btn-danger" onclick="markLeft(\''+s.id+'\',true)">✕ غادر</button>';
    return '<tr>'
      + '<td>'+esc(s.name)+'</td>'
      + '<td><code style="font-size:.78rem">'+esc(s.studentCode||'—')+'</code></td>'
      + '<td>'+esc(s.email||'—')+'</td>'
      + '<td>'+accEl+'</td>'
      + '<td>'+leftBtn+'</td>'
      + '</tr>';
  }).join('');
}

function markLeft(studentId, left) {
  CQ_API.markStudentLeft(studentId, left).then(function(res) {
    if (res.ok) { T.studentsCache = {}; loadClasses(); }
    else alert(res.msg || 'حدث خطأ');
  });
}

function deleteClass(classId, name) {
  if (!confirm('حذف الصف "' + name + '"؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
  CQ_API.deleteClass(classId, T.session.id).then(function(res) {
    if (res.ok) { T.studentsCache = {}; loadClasses(); document.getElementById('students-panel').style.display = 'none'; }
    else alert(res.msg || 'حدث خطأ');
  });
}

function openAddClass() {
  document.getElementById('cls-name').value = '';
  document.getElementById('cls-section').value = '';
  document.getElementById('cls-msg').className = 'f-msg';
  openModal('modal-addclass');
}

function doCreateClass() {
  var name     = document.getElementById('cls-name').value.trim();
  var schoolId = document.getElementById('cls-school-sel').value;
  var section  = document.getElementById('cls-section').value.trim();
  if (!name) { showMsg('cls-msg','يرجى إدخال اسم الصف','err'); return; }
  CQ_API.createClass(T.session.id, T.session.email, name, schoolId, section).then(function(res) {
    if (res.ok) { closeModal('modal-addclass'); loadClasses(); }
    else showMsg('cls-msg', res.msg || 'حدث خطأ', 'err');
  });
}

/* ── Challenges ── */
function switchChalTab(tab, btn) {
  document.querySelectorAll('.inner-tab').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('chal-tab-assign').style.display = tab === 'assign' ? '' : 'none';
  document.getElementById('chal-tab-map').style.display    = tab === 'map'    ? '' : 'none';
  if (tab === 'map') populateMapPills();
}

function populateAssignSelects() {
  document.getElementById('assign-class-sel').innerHTML = T.classes.map(function(c){
    return '<option value="'+c.id+'">'+esc(c.name)+'</option>';
  }).join('');
  document.getElementById('assign-chal-sel').innerHTML = T.challenges.length
    ? T.challenges.map(function(c){
      return '<option value="'+c.id+'">'+esc(c.name)+'</option>';
    }).join('')
    : '<option value="">لا توجد تحديات منشورة بعد</option>';
  updateChallengeOpenButton();
}

function getChallengeStudentHref(challenge) {
  if (!challenge) return '';
  if (challenge.href) return challenge.href;
  if (challenge.challengeHref) return challenge.challengeHref;
  if (challenge.key === 'led' || challenge.challengeKey === 'led') return './track-2-led-challenge.html';
  if (challenge.key === 'push-button' || challenge.challengeKey === 'push-button') return './track-2-pushbutton-challenge.html';
  return '';
}

function getChallengeHref(challenge) {
  var href = getChallengeStudentHref(challenge);
  if (!href) return '';
  if (href.indexOf('./') === 0) href = '../' + href.slice(2);
  return href;
}

function openChallengePreview(challengeId) {
  var challenge = T.challenges.find(function(c){ return c.id === challengeId; })
    || T.assignments.find(function(a){ return a.id === challengeId; });
  var href = getChallengeHref(challenge);
  if (!href) { alert('لا يوجد رابط لهذا التحدي بعد.'); return; }
  href += (href.indexOf('?') >= 0 ? '&' : '?') + 'teacher=1';
  window.open(href, '_blank');
}

function updateChallengeOpenButton() {
  var btn = document.getElementById('open-challenge-btn');
  var sel = document.getElementById('assign-chal-sel');
  if (!btn || !sel) return;
  var challenge = T.challenges.find(function(c){ return c.id === sel.value; });
  btn.disabled = !challenge || !getChallengeHref(challenge);
}

function fallbackExpiry() {
  var d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

function doAssignChallenge() {
  var classId     = document.getElementById('assign-class-sel').value;
  var challengeId = document.getElementById('assign-chal-sel').value;
  var challenge   = T.challenges.find(function(c){ return c.id === challengeId; });
  var expiresAt   = document.getElementById('assign-expires').value || fallbackExpiry();
  if (!classId) { showMsg('assign-msg','يرجى اختيار الصف','err'); return; }
  if (!challengeId || !challenge) { showMsg('assign-msg','لا يوجد تحدي منشور للتعيين. انشر التحدي من لوحة الأدمن أولاً.','err'); return; }
  CQ_API.assignChallenge({
      teacherId:T.session.id,
      classId:classId,
      challengeKey:challenge.key || challenge.id,
      challengeName:challenge.name || challenge.title || 'التحدي',
      href:getChallengeStudentHref(challenge),
      expiresAt:expiresAt
    })
    .then(function(res) {
      if (res.ok) { showMsg('assign-msg','تم تعيين التحدي بنجاح ✓','ok'); loadChallenges(); }
      else showMsg('assign-msg', res.msg || 'حدث خطأ', 'err');
    });
}

function renderAssignmentsTable() {
  var el = document.getElementById('assignments-tbody');
  if (!T.assignments.length) {
    el.innerHTML = '<tr><td colspan="5"><div class="empty">لا توجد تحديات مُعيّنة بعد</div></td></tr>';
    return;
  }
  el.innerHTML = T.assignments.map(function(a) {
    var openBtn = getChallengeHref(a) ? '<button class="btn btn-xs btn-outline" onclick="openChallengePreview(\''+a.id+'\')">فتح التحدي</button> ' : '';
    return '<tr>'
      + '<td><strong>'+esc(a.challengeName)+'</strong></td>'
      + '<td>'+esc(a.className)+'</td>'
      + '<td>'+fmtDate(a.assignedAt)+'</td>'
      + '<td>'+(a.expiresAt ? fmtDate(a.expiresAt) : '—')+'</td>'
      + '<td>'+openBtn+'<button class="btn btn-xs btn-blue" onclick="viewAssignmentSubs(\''+a.id+'\')">📝 التسليمات</button></td>'
      + '</tr>';
  }).join('');
}

/* ── Map ── */
function populateMapPills() {
  var el = document.getElementById('map-class-pills');
  el.innerHTML = T.classes.map(function(c){
    return '<button class="class-pill" onclick="loadMapForClass(\''+c.id+'\',this)">'+esc(c.name)+'</button>';
  }).join('');
}

function loadMapForClass(classId, btn) {
  document.querySelectorAll('.class-pill').forEach(function(p){ p.classList.remove('active'); });
  btn.classList.add('active');
  var assigns = T.assignments.filter(function(a){ return a.classId === classId; });
  renderMap(assigns);
}

function renderMap(assignments) {
  var el = document.getElementById('map-container');
  if (!assignments.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⚡</div>لا توجد تحديات مُعيّنة لهذا الصف</div>';
    return;
  }
  var icons = ['⚡','🔌','💡','🔧','🛡️','🚀','🔬','🌊','🔥','💎'];
  el.innerHTML = '<div class="map-grid">'
    + assignments.map(function(a,i){
      var openBtn = getChallengeHref(a) ? '<button class="btn btn-xs btn-outline" onclick="openChallengePreview(\''+a.id+'\')">فتح التحدي</button>' : '';
      return '<div class="map-card '+(i === 0 ? 'unlocked' : 'locked')+'">'
        + '<div class="map-card-num">#'+(i+1)+'</div>'
        + '<div class="map-card-icon">'+icons[i % icons.length]+'</div>'
        + '<div class="map-card-name">'+esc(a.challengeName)+'</div>'
        + '<div class="map-card-status">'+esc(a.className)+'</div>'
        + '<div style="margin-top:10px">'+openBtn+'</div>'
        + '</div>';
    }).join('')
    + '</div>';
}

/* ── Submissions ── */
function populateSubClassSel() {
  var el = document.getElementById('sub-class-sel');
  el.innerHTML = '<option value="">— اختر صفاً —</option>'
    + T.classes.map(function(c){ return '<option value="'+c.id+'">'+esc(c.name)+'</option>'; }).join('');
  document.getElementById('sub-assign-sel').innerHTML = '<option value="">— اختر تحدياً —</option>';
  document.getElementById('submissions-container').innerHTML = '<div class="empty"><div class="empty-icon">📝</div>اختر صفاً وتحدياً</div>';
}

function loadSubmissionsForClass() {
  var classId = document.getElementById('sub-class-sel').value;
  var sel = document.getElementById('sub-assign-sel');
  if (!classId) { sel.innerHTML = '<option value="">— اختر تحدياً —</option>'; return; }
  var assigns = T.assignments.filter(function(a){ return a.classId === classId; });
  sel.innerHTML = '<option value="">— اختر تحدياً —</option>'
    + assigns.map(function(a){ return '<option value="'+a.id+'">'+esc(a.challengeName)+'</option>'; }).join('');
}

function loadSubmissions() {
  var assignId = document.getElementById('sub-assign-sel').value;
  if (!assignId) { document.getElementById('submissions-container').innerHTML = '<div class="empty"><div class="empty-icon">📝</div>اختر صفاً وتحدياً</div>'; return; }
  document.getElementById('submissions-container').innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  CQ_API.getSubmissionsByAssignment(assignId, T.session.id).then(function(res) {
    renderSubmissions(res.submissions || res.data || [], assignId);
  });
}

function viewAssignmentSubs(assignId) {
  showSection('submissions');
  setTimeout(function() {
    var a = T.assignments.find(function(x){ return x.id === assignId; });
    if (!a) return;
    document.getElementById('sub-class-sel').value = a.classId;
    loadSubmissionsForClass();
    setTimeout(function(){
      document.getElementById('sub-assign-sel').value = assignId;
      loadSubmissions();
    }, 80);
  }, 80);
}

function renderSubmissions(subs, assignId) {
  var el = document.getElementById('submissions-container');
  if (!subs.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">📝</div>لا توجد تسليمات بعد</div>'; return; }

  var pending  = subs.filter(function(s){ return s.status === 'submitted'; });
  var reviewed = subs.filter(function(s){ return s.status !== 'submitted'; });
  var rankColors = ['gold','silver','bronze'];

  function buildGroup(title, list, withRank) {
    if (!list.length) return '';
    var h = '<div class="panel"><div class="panel-hd"><span class="panel-title">'+title+'</span></div>';
    list.forEach(function(s, i) {
      var dur = (s.startedAt && s.submittedAt) ? fmtDur(new Date(s.submittedAt)-new Date(s.startedAt)) : '—';
      var rankCls = withRank && rankColors[i] ? rankColors[i] : '';
      var rankNum = withRank ? '#'+(i+1) : '—';
      var badge = s.status==='submitted' ? '<span class="badge badge-submitted">تسليم جديد</span>'
                : s.status==='approved'  ? '<span class="badge badge-active">✓ مقبول</span>'
                : '<span class="badge badge-rejected">✕ مرفوض</span>';
      h += '<div class="rank-row">'
         + '<div class="rank-num '+rankCls+'">'+rankNum+'</div>'
         + '<div class="rank-info"><div class="rank-name">'+esc(s.studentName)+'</div><div class="rank-code">'+esc(s.studentCode||'')+'</div></div>'
         + '<div class="rank-time">⏱ '+dur+'</div>'
         + '<div>'+badge+'</div>';
      if (s.status === 'submitted') {
        h += '<div class="rank-actions">'
           + '<button class="btn btn-xs btn-green" onclick="approveSubmission(\''+s.codeId+'\')">✓ قبول</button>'
           + '<button class="btn btn-xs btn-danger" onclick="openReject(\''+s.codeId+'\')">✕ رفض</button>'
           + '</div>';
      } else {
        h += '<div class="rank-actions">'
           + '<button class="btn btn-xs btn-outline" onclick="openReopenFor(\''+assignId+'\',[\''+s.studentId+'\'])">↩ إعادة</button>'
           + '</div>';
      }
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  el.innerHTML = buildGroup('تسليمات تنتظر المراجعة', pending, false)
               + buildGroup('التسليمات المراجَعة (مرتبة حسب السرعة)', reviewed, true);
}

function approveSubmission(codeId) {
  CQ_API.approveSubmissionTeacher(codeId, T.session.id).then(function(res) {
    if (res.ok) loadSubmissions();
    else alert(res.msg || 'حدث خطأ');
  });
}

function openReject(codeId) {
  T._rejectCodeId = codeId;
  document.getElementById('reject-note').value = '';
  openModal('modal-reject');
}

function doRejectSubmission() {
  var note = document.getElementById('reject-note').value.trim();
  CQ_API.rejectSubmissionTeacher(T._rejectCodeId, T.session.id, note).then(function(res) {
    closeModal('modal-reject');
    if (res.ok) loadSubmissions();
    else alert(res.msg || 'حدث خطأ');
  });
}

/* ── Reopen ── */
function openReopenFor(assignId, studentIds) {
  T._reopenAssignId = assignId;
  T._reopenStudents = studentIds ? studentIds.slice() : [];
  document.getElementById('reopen-expires').value = '';
  document.getElementById('reopen-msg').className = 'f-msg';

  var assign   = T.assignments.find(function(a){ return a.id === assignId; });
  var students = assign && T.studentsCache[assign.classId] ? T.studentsCache[assign.classId] : [];

  function build(list) {
    var el = document.getElementById('reopen-students-list');
    if (!list.length) { el.innerHTML = '<p style="font-size:.85rem;color:var(--gray)">لا يوجد طلاب</p>'; return; }
    el.innerHTML = list.map(function(s) {
      var chk = T._reopenStudents.indexOf(s.id) > -1 ? 'checked' : '';
      return '<label style="display:flex;align-items:center;gap:8px;padding:.4rem;border-radius:8px;cursor:pointer;font-size:.86rem;">'
        + '<input type="checkbox" value="'+s.id+'" '+chk+' onchange="toggleReopenStu(this)">'
        + esc(s.name) + (s.studentCode ? ' <span style="color:var(--gray);font-size:.72rem;font-family:monospace">('+s.studentCode+')</span>' : '')
        + '</label>';
    }).join('');
  }

  if (!students.length && assign) {
    CQ_API.getStudentsByClass(assign.classId).then(function(res) {
      T.studentsCache[assign.classId] = res.students || res.data || [];
      build(T.studentsCache[assign.classId]);
    });
  } else {
    build(students);
  }
  openModal('modal-reopen');
}

function toggleReopenStu(cb) {
  if (cb.checked) { if (T._reopenStudents.indexOf(cb.value) < 0) T._reopenStudents.push(cb.value); }
  else T._reopenStudents = T._reopenStudents.filter(function(id){ return id !== cb.value; });
}

function doReopenChallenge() {
  if (!T._reopenStudents.length) { showMsg('reopen-msg','اختر طالباً واحداً على الأقل','err'); return; }
  var exp = document.getElementById('reopen-expires').value;
  CQ_API.reopenChallenge(T._reopenAssignId, T.session.id, T._reopenStudents, exp)
    .then(function(res) {
      if (res.ok) { closeModal('modal-reopen'); loadSubmissions(); }
      else showMsg('reopen-msg', res.msg || 'حدث خطأ', 'err');
    });
}

/* ── Overview pending ── */
function renderOvPending() {
  var el = document.getElementById('ov-pending-list');
  var list = T.assignments.filter(function(a){ return a.pendingCount > 0; });
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div>لا توجد تسليمات معلقة</div>'; return; }
  el.innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>التحدي</th><th>الصف</th><th>معلق</th><th></th></tr></thead><tbody>'
    + list.map(function(a) {
      return '<tr><td>'+esc(a.challengeName)+'</td><td>'+esc(a.className)+'</td>'
        + '<td><span class="badge badge-pending">'+a.pendingCount+'</span></td>'
        + '<td><button class="btn btn-xs btn-blue" onclick="viewAssignmentSubs(\''+a.id+'\')">مراجعة</button></td></tr>';
    }).join('')
    + '</tbody></table></div>';
}

function daysUntil(ts) {
  if (!ts) return null;
  var diff = new Date(ts).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function renderOverviewWidgets() {
  renderNextStep();
  renderDeadlines();
  renderActivity();
  renderClassPulse();
}

function renderNextStep() {
  var title = document.getElementById('next-step-title');
  var note = document.getElementById('next-step-note');
  if (!title || !note) return;

  var pending = T.assignments.reduce(function(s,a){ return s + (parseInt(a.pendingCount)||0); }, 0);
  if (!T.classes.length) {
    title.textContent = 'ابدأ بإضافة صفك الأول';
    note.textContent = 'بعد إضافة الصف ستقدر تعيّن التحديات وتتابع أكواد الطلاب.';
  } else if (!T.assignments.length) {
    title.textContent = 'عيّن أول تحدي لصفك';
    note.textContent = 'اختَر تحدياً منشوراً وحدد موعد انتهاء ليصل الطلاب إلى المسار الثاني بالكود.';
  } else if (pending > 0) {
    title.textContent = 'راجع ' + pending + ' تسليمات معلقة';
    note.textContent = 'المراجعة السريعة تحافظ على إيقاع الطلاب وتفتح خطوة الإنجازات والفائزين.';
  } else {
    title.textContent = 'الوضع هادئ، جهّز التحدي التالي';
    note.textContent = 'تابع المواعيد القادمة أو امنح إنجازاً لطالب متميز.';
  }
}

function renderDeadlines() {
  var el = document.getElementById('ov-deadlines');
  if (!el) return;
  var list = T.assignments
    .filter(function(a){ return !!a.expiresAt; })
    .sort(function(a,b){ return new Date(a.expiresAt) - new Date(b.expiresAt); })
    .slice(0, 5);

  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📅</div>لا توجد مواعيد قادمة</div>';
    return;
  }

  el.innerHTML = list.map(function(a) {
    var days = daysUntil(a.expiresAt);
    var cls = days < 0 ? ' deadline-over' : days <= 2 ? ' deadline-soon' : '';
    var label = days < 0 ? 'منتهي' : days === 0 ? 'اليوم' : 'بعد ' + days + ' يوم';
    var badgeCls = days < 0 ? 'badge-rejected' : days <= 2 ? 'badge-pending' : 'badge-active';
    return '<div class="mini-item'+cls+'">'
      + '<div class="mini-main"><div class="mini-title">'+esc(a.challengeName)+'</div><div class="mini-sub">'+esc(a.className)+' | '+fmtDate(a.expiresAt)+'</div></div>'
      + '<div class="mini-meta"><span class="badge '+badgeCls+'">'+label+'</span></div>'
      + '</div>';
  }).join('');
}

function renderActivity() {
  var el = document.getElementById('ov-activity');
  if (!el) return;
  var list = T.notifs.slice(0, 5);
  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🔔</div>لا توجد نشاطات بعد</div>';
    return;
  }
  el.innerHTML = list.map(function(n) {
    var icon = n.type === 'challenge_published' ? '⚡' : n.type === 'submission' ? '📝' : '🔔';
    var text = n.message || n.title || n.body || '';
    return '<div class="mini-item">'
      + '<div class="mini-main"><div class="mini-title">'+icon+' '+esc(text)+'</div><div class="mini-sub">'+fmtDate(n.createdAt)+'</div></div>'
      + '<div class="mini-meta">'+(!n.readAt ? '<span class="badge badge-active">جديد</span>' : '')+'</div>'
      + '</div>';
  }).join('');
}

function renderClassPulse() {
  var el = document.getElementById('ov-class-pulse');
  if (!el) return;
  if (!T.classes.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🏫</div>أضف صفك الأول للبدء</div>';
    return;
  }
  el.innerHTML = T.classes.slice(0, 6).map(function(c) {
    var assigns = T.assignments.filter(function(a){ return a.classId === c.id; });
    var pending = assigns.reduce(function(s,a){ return s + (parseInt(a.pendingCount)||0); }, 0);
    return '<div class="pulse-card">'
      + '<div class="pulse-name">'+esc(c.name)+'</div>'
      + '<div class="pulse-row"><span>الطلاب</span><strong>'+(c.studentCount||0)+'</strong></div>'
      + '<div class="pulse-row"><span>التحديات</span><strong>'+assigns.length+'</strong></div>'
      + '<div class="pulse-row"><span>تسليمات معلقة</span><strong>'+pending+'</strong></div>'
      + '</div>';
  }).join('');
}

/* ── Achievements ── */
var ACH_ICONS = {star:'⭐',fire:'🔥',rocket:'🚀',diamond:'💎',crown:'👑',lightning:'⚡',text:'📝'};

function getAllStudents() {
  var all = [];
  Object.values(T.studentsCache).forEach(function(list){ all = all.concat(list); });
  return all;
}

function populateAchStudentSel() {
  var sel = document.getElementById('ach-student-sel');
  var students = getAllStudents();
  sel.innerHTML = '<option value="">— اختر طالباً —</option>'
    + students.map(function(s){
      return '<option value="'+s.id+'">'+esc(s.name)+(s.studentCode?' ('+s.studentCode+')':'')+'</option>';
    }).join('');
}

function populateAchFilterCls() {
  var sel = document.getElementById('ach-filter-cls');
  sel.innerHTML = '<option value="">كل الصفوف</option>'
    + T.classes.map(function(c){ return '<option value="'+c.id+'">'+esc(c.name)+'</option>'; }).join('');
}

function doAddAchievement() {
  var studentId = document.getElementById('ach-student-sel').value;
  var badge     = document.getElementById('ach-badge-sel').value;
  var text      = document.getElementById('ach-text').value.trim();
  if (!studentId) { showMsg('ach-msg','يرجى اختيار الطالب','err'); return; }
  if (!text)      { showMsg('ach-msg','يرجى كتابة نص الإنجاز','err'); return; }
  CQ_API.addAchievement({ studentId:studentId, teacherId:T.session.id, badge:badge, text:text })
    .then(function(res) {
      if (res.ok) { showMsg('ach-msg','تم منح الإنجاز بنجاح ✓','ok'); document.getElementById('ach-text').value = ''; loadAchievements(); }
      else showMsg('ach-msg', res.msg || 'حدث خطأ', 'err');
    });
}

function loadAchievements() {
  var classId = document.getElementById('ach-filter-cls').value;
  CQ_API.getAchievements({ teacherId:T.session.id, classId:classId||'' }).then(function(res) {
    var list = res.achievements || res.data || [];
    var el = document.getElementById('achievements-list');
    if (!list.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🏆</div>لا توجد إنجازات بعد</div>'; return; }
    el.innerHTML = '<div style="display:grid;gap:10px;">'
      + list.map(function(a) {
        var icon = ACH_ICONS[a.badge] || '📝';
        return '<div class="ach-card">'
          + '<div class="ach-badge">'+icon+'</div>'
          + '<div class="ach-body"><div class="ach-title">'+esc(a.text)+'</div><div class="ach-sub">للطالب: '+esc(a.studentName)+' | '+fmtDate(a.createdAt)+'</div></div>'
          + '</div>';
      }).join('')
      + '</div>';
  });
}

function populateWinnerSchools() {
  var sel = document.getElementById('winner-school-sel');
  if (!sel) return;
  var seen = {};
  var opts = ['<option value="">الترتيب العام</option>'];
  T.classes.forEach(function(c) {
    if (!c.schoolId || seen[c.schoolId]) return;
    seen[c.schoolId] = true;
    opts.push('<option value="'+esc(c.schoolId)+'">فائزون: '+esc(c.schoolName || c.name)+'</option>');
  });
  var current = sel.value;
  sel.innerHTML = opts.join('');
  if (current && seen[current]) sel.value = current;
}

function loadWinners() {
  var el = document.getElementById('winners-list');
  if (!el) return;
  var schoolId = document.getElementById('winner-school-sel').value;
  el.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  CQ_API.getWinners(schoolId, '').then(function(res) {
    var list = schoolId ? (res.local || []) : (res.global || []);
    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">🏁</div>لا توجد حلول مقبولة بعد</div>';
      return;
    }
    el.innerHTML = '<div style="display:grid;gap:10px;">' + list.map(function(w, i) {
      var dur = w.durationSec ? fmtDur(w.durationSec * 1000) : '—';
      var rankCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      return '<div class="rank-row">'
        + '<div class="rank-num '+rankCls+'">#'+(i+1)+'</div>'
        + '<div class="rank-info"><div class="rank-name">'+esc(w.studentName)+'</div><div class="rank-code">'+esc(w.challengeName || '')+'</div></div>'
        + '<div class="rank-time">⏱ '+dur+'</div>'
        + '<div><span class="badge badge-active">'+esc(w.schoolName || 'عام')+'</span></div>'
        + '</div>';
    }).join('') + '</div>';
  });
}

/* ── Notifications ── */
function renderNotifList() {
  var el = document.getElementById('notif-list');
  if (!T.notifs.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🔔</div>لا توجد إشعارات</div>'; return; }
  el.innerHTML = T.notifs.map(function(n) {
    var icon = n.type === 'challenge_published' ? '⚡' : n.type === 'submission' ? '📝' : '🔔';
    var text = n.message || n.title || n.body || '';
    return '<li class="notif-item-li '+(n.readAt?'':'unread')+'" onclick="readNotif(\''+n.id+'\',this)">'
      + '<div class="notif-icon">'+icon+'</div>'
      + '<div class="notif-text"><div>'+esc(text)+'</div><div class="notif-time">'+fmtDate(n.createdAt)+'</div></div>'
      + (!n.readAt ? '<div class="notif-dot"></div>' : '')
      + '</li>';
  }).join('');
}

function readNotif(id, el) {
  if (!el.classList.contains('unread')) return;
  el.classList.remove('unread');
  var dot = el.querySelector('.notif-dot');
  if (dot) dot.remove();
  CQ_API.markNotifRead(id);
  loadNotifs();
}

function markAllRead() {
  CQ_API.markAllNotifsRead(T.session.id).then(loadNotifs);
}

/* ── Change password ── */
function openChangePass() {
  document.getElementById('new-pass').value = '';
  document.getElementById('new-pass-confirm').value = '';
  document.getElementById('chgpass-msg').className = 'f-msg';
  openModal('modal-chgpass');
}

function doChangePassword() {
  var p1 = document.getElementById('new-pass').value;
  var p2 = document.getElementById('new-pass-confirm').value;
  if (!p1 || p1.length < 6) { showMsg('chgpass-msg','كلمة المرور يجب أن تكون 6 أحرف على الأقل','err'); return; }
  if (p1 !== p2) { showMsg('chgpass-msg','كلمتا المرور غير متطابقتين','err'); return; }
  sha256(p1).then(function(hash) {
    CQ_API.changePassword(T.session.id, hash, 'self').then(function(res) {
      if (res.ok) showMsg('chgpass-msg','تم تغيير كلمة المرور بنجاح ✓','ok');
      else showMsg('chgpass-msg', res.msg || 'حدث خطأ', 'err');
    });
  });
}

/* ── Backdrop close ── */
document.querySelectorAll('.modal-bg').forEach(function(bg) {
  bg.addEventListener('click', function(e){ if (e.target === bg) bg.classList.remove('open'); });
});

/* ── Idle timeout: 2h ── */
var _idle;
function resetIdle() {
  clearTimeout(_idle);
  _idle = setTimeout(function(){ alert('انتهت الجلسة بسبب عدم النشاط.'); doLogout(); }, 7200000);
}
['mousemove','keydown','click','touchstart'].forEach(function(ev){ document.addEventListener(ev, resetIdle, {passive:true}); });
resetIdle();

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

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', initAuth);
