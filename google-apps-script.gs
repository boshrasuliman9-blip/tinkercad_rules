// ============================================
//  Circuit Quest — Google Apps Script Backend
//  script.google.com → مشروع جديد → الصق هذا الكود
//  ثم: Deploy → New deployment → Web app
//       Execute as: Me
//       Who has access: Anyone
//  انسخ الـ URL وضعه في js/config.js
//
//  Script Properties:
//    SITE_URL  → رابط موقعك
//    TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM → اختياري SMS
// ============================================

var SECRET      = 'cq2024';
var ADMIN_EMAIL = 'boshrasuliman9@gmail.com';

// ─── أسماء الجداول ───────────────────────────
var SH = {
  SUBMISSIONS:    'Submissions',
  USERS:          'Users',
  CLASSES:        'Classes',
  ASSIGNMENTS:    'Assignments',
  CODES:          'Codes',
  NOTIFICATIONS:  'Notifications',
  RESET_TOKENS:   'ResetTokens',
  OTP_CODES:      'OtpCodes',
  SCHOOLS:        'Schools',
  TEACHER_SCHOOLS:'TeacherSchools',
  CHALLENGES:     'Challenges',
  ACHIEVEMENTS:   'Achievements'
};

// ─── رؤوس الجداول ────────────────────────────
var HEADERS = {
  Users:          ['id','name','email','phone','passwordHash','role','status','schoolId','class','section','studentCode','teacherCode','requestSource','joinedAt','reviewedAt','updatedAt','leftSchool'],
  Classes:        ['id','teacherId','teacherEmail','name','grade','schoolId','section','startTime','endTime','weeks','trainerId','trainerName','status','courseStatus','createdAt','updatedAt'],
  Assignments:    ['id','teacherId','classId','challengeKey','challengeName','expiresAt','createdAt'],
  Codes:          ['id','assignmentId','studentId','studentEmail','studentName','code','startedAt','submittedAt','status','teacherNote','createdAt'],
  Notifications:  ['id','userId','type','title','body','code','assignmentId','expiresAt','read','createdAt','readAt'],
  ResetTokens:    ['id','userId','userEmail','token','expiresAt','used','createdAt'],
  OtpCodes:       ['id','userId','phone','otp','resetToken','expiresAt','used','createdAt'],
  Schools:        ['id','name','city','type','status','createdAt','updatedAt'],
  TeacherSchools: ['id','teacherId','schoolId','createdAt'],
  Challenges:     ['id','key','name','title','description','coverImage','href','link','htmlFile','steps','track','difficulty','creatorId','status','createdAt','updatedAt','publishedAt'],
  Achievements:   ['id','teacherId','studentId','studentName','schoolId','text','badge','createdAt']
};

var _cb = '';

var VALID_CLASS_GRADES = ['الاول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];
var VALID_CLASS_SECTIONS = ['ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز'];

// ════════════════════════════════════════════
//  نقطة الدخول
// ════════════════════════════════════════════
function doGet(e) {
  var p      = e.parameter;
  var action = p.action || '';
  _cb        = p.callback || '';

  try {
    var result;

    if (action === 'submit')  return _submit(p);
    if (action === 'approve') return _approveSubmission(p);
    if (action === 'reject')  return _rejectSubmission(p);

    if      (action === 'list')                result = _listSubmissions(p);
    else if (action === 'signUp')              result = _signUp(p);
    else if (action === 'signIn')              result = _signIn(p);
    else if (action === 'notifyFastApiSignup') result = _notifyFastApiSignup(p);
    // ── أدمن ──
    else if (action === 'getTeachers')         result = _getTeachers(p);
    else if (action === 'getStudents')         result = _getStudents(p);
    else if (action === 'getCreators')         result = _getCreators(p);
    else if (action === 'approveTeacher')      result = _approveTeacher(p);
    else if (action === 'rejectTeacher')       result = _rejectTeacher(p);
    else if (action === 'approveStudent')      result = _approveStudent(p);
    else if (action === 'rejectStudent')       result = _rejectStudent(p);
    else if (action === 'approveCreator')      result = _approveCreator(p);
    else if (action === 'rejectCreator')       result = _rejectCreator(p);
    else if (action === 'generateResetLink')   result = _generateResetLink(p);
    else if (action === 'changePassword')      result = _changePassword(p);
    else if (action === 'getAdminNotifs')      result = _getAdminNotifs(p);
    // ── مدارس ──
    else if (action === 'createSchool')        result = _createSchool(p);
    else if (action === 'getSchools')          result = _getSchools(p);
    else if (action === 'updateSchool')        result = _updateSchool(p);
    else if (action === 'deleteSchool')        result = _deleteSchool(p);
    // ── علاقة معلم←مدارس ──
    else if (action === 'assignTeacherSchool') result = _assignTeacherSchool(p);
    else if (action === 'removeTeacherSchool') result = _removeTeacherSchool(p);
    else if (action === 'getTeacherSchools')   result = _getTeacherSchools(p);
    // ── تحديات (أدمن) ──
    else if (action === 'createChallenge')     result = _createChallenge(p);
    else if (action === 'getChallenges')       result = _getChallenges(p);
    else if (action === 'updateChallenge')     result = _updateChallenge(p);
    else if (action === 'publishChallenge')    result = _publishChallenge(p);
    else if (action === 'unpublishChallenge')  result = _unpublishChallenge(p);
    else if (action === 'deleteChallenge')     result = _deleteChallenge(p);
    // ── أدمن — صفوف ودورات ──
    else if (action === 'adminCreateClass')    result = _createClass(p);
    else if (action === 'getCourses')          result = _getCourses(p);
    else if (action === 'createCourse')        result = _createCourse(p);
    else if (action === 'updateCourse')        result = _updateCourse(p);
    // ── استيراد Excel ──
    else if (action === 'importUsers')         result = _importUsers(p);
    else if (action === 'adminCreateUser')     result = _adminCreateUser(p);
    else if (action === 'adminUpdateUser')     result = _adminUpdateUser(p);
    else if (action === 'adminSetUserStatus')  result = _adminSetUserStatus(p);
    else if (action === 'lookupCode')          result = _lookupCode(p);
    // ── معلم — صفوف ──
    else if (action === 'getClasses')          result = _getClasses(p);
    else if (action === 'createClass')         result = _createClass(p);
    else if (action === 'updateClass')         result = _updateClass(p);
    else if (action === 'deleteClass')         result = _deleteClass(p);
    // ── معلم — طلاب ──
    else if (action === 'getStudentsByClass')  result = _getStudentsByClass(p);
    else if (action === 'markStudentLeft')     result = _markStudentLeft(p);
    // ── معلم — تحديات ──
    else if (action === 'assignChallenge')     result = _assignChallenge(p);
    else if (action === 'getAssignments')      result = _getAssignments(p);
    else if (action === 'adminGetAllAssignments') result = _adminGetAllAssignments(p);
    else if (action === 'getSubmissionsByAssignment') result = _getSubmissionsByAssignment(p);
    else if (action === 'approveSubmissionTeacher')   result = _approveSubmissionTeacher(p);
    else if (action === 'rejectSubmissionTeacher')    result = _rejectSubmissionTeacher(p);
    else if (action === 'reopenChallenge')     result = _reopenChallenge(p);
    else if (action === 'getTeacherNotifs')    result = _getTeacherNotifs(p);
    // ── إنجازات ──
    else if (action === 'addAchievement')      result = _addAchievement(p);
    else if (action === 'getAchievements')     result = _getAchievements(p);
    // ── فائزون ──
    else if (action === 'getWinners')          result = _getWinners(p);
    // ── طالب ──
    else if (action === 'getStudentNotifs')    result = _getStudentNotifs(p);
    else if (action === 'markNotifRead')       result = _markNotifRead(p);
    else if (action === 'validateCode')        result = _validateCode(p);
    else if (action === 'startChallenge')      result = _startChallenge(p);
    else if (action === 'submitChallengeCode') result = _submitChallengeCode(p);
    // ── كلمة المرور ──
    else if (action === 'requestReset')        result = _requestPasswordReset(p);
    else if (action === 'requestPhoneOtp')     result = _requestPhoneOtp(p);
    else if (action === 'verifyPhoneOtp')      result = _verifyPhoneOtp(p);
    else if (action === 'resetPassword')       result = _resetPassword(p);
    else result = {ok: true, msg: 'Circuit Quest API OK'};

    return _json(result, _cb);
  } catch (err) {
    return _json({ok: false, msg: err.message}, _cb);
  }
}

// ════════════════════════════════════════════
//  مساعدات Spreadsheet
// ════════════════════════════════════════════
function _ss() {
  var props = PropertiesService.getScriptProperties();
  var id    = props.getProperty('SS_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create('Circuit Quest Data');
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function _sheet(name) {
  var ss    = _ss();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (HEADERS[name]) sheet.appendRow(HEADERS[name]);
  } else if (HEADERS[name]) {
    _ensureHeaders(sheet, HEADERS[name]);
  }
  return sheet;
}

function _ensureHeaders(sheet, expected) {
  if (sheet.getLastRow() === 0) { sheet.appendRow(expected); return; }
  var heads = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  expected.forEach(function(h) {
    if (heads.indexOf(h) < 0) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      heads.push(h);
    }
  });
}

function _rows(name) {
  var sheet = _sheet(name);
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var heads = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    heads.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function _rowIdx(name, field, value) {
  var sheet = _sheet(name);
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  var col = data[0].indexOf(field);
  if (col < 0) return -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][col]) === String(value)) return i + 1;
  }
  return -1;
}

function _setCell(name, rowIdx, field, value) {
  var sheet = _sheet(name);
  var heads = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col   = heads.indexOf(field);
  if (col < 0) return;
  sheet.getRange(rowIdx, col + 1).setValue(value);
}

function _appendObject(name, obj) {
  var sheet = _sheet(name);
  var heads = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(heads.map(function(h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  }));
}

function _hash(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(16);
}

function _code(len) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out   = '';
  for (var i = 0; i < (len || 8); i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function _genUserCode(prefix) {
  var year = new Date().getFullYear();
  var num  = String(Math.floor(1000 + Math.random() * 9000));
  return (prefix + '-' + year + '-' + num).toUpperCase();
}

function _bool(val) { return val === true || val === 'TRUE' || val === 'true'; }

function _siteUrl() {
  return PropertiesService.getScriptProperties().getProperty('SITE_URL') || 'https://your-site.com';
}

function _normalizePhone(phone) { return String(phone || '').replace(/[^\d+]/g, ''); }

function _normalizeCode(code) { return String(code || '').trim().toUpperCase(); }

function _sendSms(to, body) {
  var props = PropertiesService.getScriptProperties();
  var sid   = props.getProperty('TWILIO_ACCOUNT_SID');
  var auth  = props.getProperty('TWILIO_AUTH_TOKEN');
  var from  = props.getProperty('TWILIO_FROM');
  if (!sid || !auth || !from) return {ok: false, msg: 'SMS غير مفعّل'};
  var url = 'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: {To: to, From: from, Body: body},
    headers: {Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + auth)},
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  return (code >= 200 && code < 300) ? {ok: true} : {ok: false, msg: 'تعذر إرسال SMS'};
}

function _safeUser(u) {
  return {
    id:          u.id,
    name:        u.name,
    email:       u.email,
    role:        u.role,
    status:      u.status,
    schoolId:    u.schoolId || u.school || '',
    class:       u.class,
    section:     u.section || '',
    phone:       u.phone,
    studentCode: u.studentCode || '',
    teacherCode: u.teacherCode || '',
    creatorCode: u.role === 'creator' ? (u.teacherCode || '') : '',
    requestSource: u.requestSource || '',
    joinedAt:    u.joinedAt,
    leftSchool:  _bool(u.leftSchool)
  };
}

function _challengeTitle(c) {
  return c.title || c.name || '';
}

function _challengeHref(c) {
  return c.href || c.link || '';
}

function _challengeHtmlFile(c) {
  return c.htmlFile || _challengeHref(c);
}

function _normalizeChallenge(c, assignedCount) {
  return {
    id: c.id,
    key: c.key,
    name: c.name || c.title || '',
    title: _challengeTitle(c),
    description: c.description || '',
    coverImage: c.coverImage || '',
    href: _challengeHref(c),
    link: _challengeHref(c),
    htmlFile: _challengeHtmlFile(c),
    steps: c.steps || '[]',
    track: String(c.track || ''),
    difficulty: c.difficulty || 'medium',
    creatorId: c.creatorId || '',
    status: c.status || 'draft',
    createdAt: c.createdAt || '',
    updatedAt: c.updatedAt || c.createdAt || '',
    publishedAt: c.publishedAt || '',
    assignedCount: assignedCount || 0
  };
}

function _classDisplayName(grade, section, fallbackName) {
  var g = String(grade || '').trim();
  var s = String(section || '').trim();
  if (g && s) return g + ' ' + s;
  if (g) return g;
  return String(fallbackName || '').trim();
}

function _appendNotification(userId, type, title, body, extra) {
  var payload = extra || {};
  _appendObject(SH.NOTIFICATIONS, {
    id: Utilities.getUuid(),
    userId: userId || '',
    type: type || 'info',
    title: title || '',
    body: body || '',
    code: payload.code || '',
    assignmentId: payload.assignmentId || '',
    expiresAt: payload.expiresAt || '',
    read: false,
    createdAt: new Date().toISOString(),
    readAt: ''
  });
}

// ════════════════════════════════════════════
//  المصادقة
// ════════════════════════════════════════════
function _signUp(p) {
  var name    = (p.name  || '').trim();
  var email   = (p.email || '').trim().toLowerCase();
  var phone   = _normalizePhone(p.phone);
  var ph      = p.passwordHash || '';
  var role    = p.role === 'teacher' ? 'teacher' : (p.role === 'creator' ? 'creator' : 'student');
  var section = (p.section || '').trim();
  var requestSource = (p.requestSource || 'site').trim().toLowerCase() || 'site';
  var autoApprove = String(p.autoApprove || '') === 'true';
  var initialStatus = autoApprove ? 'active' : 'pending';

  if (!name || !email || !ph) return {ok: false, msg: 'بيانات ناقصة'};

  var users = _rows(SH.USERS);

  var exists = users.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (exists) return {ok: false, msg: 'تم التسجيل بهذا الإيميل مسبقاً'};

  var schoolId    = '';
  var cls         = '';
  var studentCode = '';
  var teacherCode = '';


  var id  = Utilities.getUuid();
  var now = new Date().toISOString();
  _appendObject(SH.USERS, {
    id:           id,
    name:         name,
    email:        email,
    phone:        phone,
    passwordHash: ph,
    role:         role,
    status:       initialStatus,
    schoolId:     schoolId,
    class:        cls,
    section:      section,
    studentCode:  studentCode,
    teacherCode:  teacherCode,
    requestSource: requestSource,
    joinedAt:     now,
    reviewedAt:   '',
    updatedAt:    now,
    leftSchool:   ''
  });

  var user = {id: id, name: name, email: email, phone: phone, role: role, status: initialStatus, schoolId: schoolId, class: cls, section: section, studentCode: studentCode, teacherCode: teacherCode, requestSource: requestSource, joinedAt: now};
  if (!autoApprove) {
    if (role === 'teacher') _notifyAdminNewTeacher(user);
    else if (role === 'student') _notifyAdminNewStudent(user);
    else if (role === 'creator') _notifyAdminNewCreator(user);
  }
  return {ok: true, pending: !autoApprove, user: _safeUser(user)};
}

function _signIn(p) {
  var email = (p.email || '').trim().toLowerCase();
  var ph    = String(p.passwordHash || '').trim();
  var role  = p.role === 'teacher' ? 'teacher' : (p.role === 'creator' ? 'creator' : 'student');
  var autoApprove = String(p.autoApprove || '') === 'true';

  if (!email || !ph) return {ok: false, msg: 'بيانات ناقصة'};

  var users = _rows(SH.USERS);
  var match = users.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email &&
           String(u.role  || '').trim() === role &&
           String(u.passwordHash || '').trim() === ph;
  });

  if (!match) {
    var byEmail = users.find(function(u) { return String(u.email || '').trim().toLowerCase() === email; });
    if (byEmail && String(byEmail.role || '').trim() !== role) {
      var r = String(byEmail.role || '').trim();
      return {ok: false, msg: r === 'teacher' ? 'هذا البريد مسجل كمعلم' : (r === 'creator' ? 'هذا البريد مسجل كمبتكر' : 'هذا البريد مسجل كطالب')};
    }
    if (!byEmail) return {ok: false, msg: 'لا يوجد حساب بهذا البريد'};
    return {ok: false, msg: 'كلمة المرور غير صحيحة'};
  }

  var status = String(match.status || '').trim();
  if (status === 'pending' && autoApprove) {
    var idx = _rowIdx(SH.USERS, 'id', match.id);
    if (idx > 0) {
      _setCell(SH.USERS, idx, 'status', 'active');
      _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
      match.status = 'active';
    }
    return {ok: true, user: _safeUser(match)};
  }
  if (status === 'pending')  return {ok: false, msg: 'حسابك قيد المراجعة'};
  if (status === 'rejected') return {ok: false, msg: 'تم رفض الحساب'};

  return {ok: true, user: _safeUser(match)};
}

// ════════════════════════════════════════════
//  الأدمن — المستخدمون
// ════════════════════════════════════════════
function _getTeachers(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var data = _rows(SH.USERS).filter(function(u) { return u.role === 'teacher' && u.status !== 'deleted'; }).map(_safeUser);
  return {ok: true, data: data, teachers: data};
}

function _getStudents(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var data = _rows(SH.USERS).filter(function(u) { return u.role === 'student' && u.status !== 'deleted'; }).map(_safeUser);
  return {ok: true, data: data, students: data};
}

function _approvalEmailHtml(name, roleLabel, loginUrl) {
  return '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:auto">' +
    '<div style="background:#16a34a;padding:24px;border-radius:12px 12px 0 0;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:26px">✅ تم قبول الطلب بنجاح</h1></div>' +
    '<div style="background:#fff;padding:28px;border:1px solid #eee;border-top:none;text-align:right">' +
    '<p style="font-size:16px;color:#333">مرحباً <strong>' + name + '</strong>،</p>' +
    '<p style="font-size:15px;color:#555">تم قبول طلب انضمامك كـ <strong>' + roleLabel + '</strong> في منصة Circuit Quest بنجاح.</p>' +
    '<p style="font-size:15px;color:#555">يمكنك الآن تسجيل الدخول والبدء باستخدام المنصة.</p>' +
    '<div style="text-align:center;margin:24px 0">' +
    '<a href="' + loginUrl + '" style="background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700">تسجيل الدخول</a>' +
    '</div></div></div>';
}

function _approveTeacher(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'المعلم غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'active');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  var teacher = _rows(SH.USERS).find(function(u) { return u.id === p.userId; });
  if (teacher && teacher.email) {
    try { MailApp.sendEmail(teacher.email, '✅ تم قبول الطلب بنجاح — Circuit Quest', '', {htmlBody: _approvalEmailHtml(teacher.name || '', 'معلم', _siteUrl() + '/teacher/index.html')}); } catch(e) { Logger.log('Email error: ' + e.message); }
  }
  if (!p.ajax) return _htmlPage('✅ تم قبول الطلب بنجاح', '#f0fdf4', '#16a34a');
  return {ok: true};
}

function _rejectTeacher(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'المعلم غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'rejected');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  if (!p.ajax) return _htmlPage('❌ تم رفض المعلم', '#fef2f2', '#dc2626');
  return {ok: true};
}

function _approveStudent(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'الطالب غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'active');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  var student = _rows(SH.USERS).find(function(u) { return u.id === p.userId; });
  if (student && student.email) {
    try { MailApp.sendEmail(student.email, '✅ تم قبول الطلب بنجاح — Circuit Quest', '', {htmlBody: _approvalEmailHtml(student.name || '', 'طالب', _siteUrl() + '/student/index.html')}); } catch(e) { Logger.log('Email error: ' + e.message); }
  }
  if (!p.ajax) return _htmlPage('✅ تم قبول الطلب بنجاح', '#f0fdf4', '#16a34a');
  return {ok: true};
}

function _rejectStudent(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'الطالب غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'rejected');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  if (!p.ajax) return _htmlPage('❌ تم رفض الطالب', '#fef2f2', '#dc2626');
  return {ok: true};
}

function _approveCreator(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'المبتكر غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'active');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  var creator = _rows(SH.USERS).find(function(u) { return u.id === p.userId; });
  if (creator && creator.email) {
    try { MailApp.sendEmail(creator.email, '✅ تم قبول الطلب بنجاح — Circuit Quest', '', {htmlBody: _approvalEmailHtml(creator.name || '', 'مبتكر', _siteUrl())}); } catch(e) { Logger.log('Email error: ' + e.message); }
  }
  if (!p.ajax) return _htmlPage('✅ تم قبول الطلب بنجاح', '#f0fdf4', '#16a34a');
  return {ok: true};
}

function _rejectCreator(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'المبتكر غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'rejected');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  if (!p.ajax) return _htmlPage('❌ تم رفض المبتكر', '#fef2f2', '#dc2626');
  return {ok: true};
}

function _changePassword(p) {
  var userId  = p.userId  || '';
  var newHash = p.newPasswordHash || '';
  var token   = p.token   || '';
  if (token !== SECRET && token !== 'self') return {ok: false, msg: 'غير مصرح'};
  if (!userId || !newHash) return {ok: false, msg: 'بيانات ناقصة'};
  var idx = _rowIdx(SH.USERS, 'id', userId);
  if (idx < 0) return {ok: false, msg: 'المستخدم غير موجود'};
  _setCell(SH.USERS, idx, 'passwordHash', newHash);
  return {ok: true};
}

function _generateResetLink(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var users = _rows(SH.USERS);
  var user  = users.find(function(u) { return u.id === p.userId; });
  if (!user) return {ok: false, msg: 'المستخدم غير موجود'};
  var token     = _code(16);
  var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  _appendObject(SH.RESET_TOKENS, {id: Utilities.getUuid(), userId: user.id, userEmail: user.email, token: token, expiresAt: expiresAt, used: false, createdAt: new Date().toISOString()});
  var resetLink = _siteUrl() + '/auth.html?reset=' + token;
  return {ok: true, resetLink: resetLink};
}

// ════════════════════════════════════════════
//  المدارس والمراكز
// ════════════════════════════════════════════
function _deleteSchool(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.SCHOOLS, 'id', p.schoolId);
  if (idx < 0) return {ok: false, msg: 'المدرسة غير موجودة'};
  _sheet(SH.SCHOOLS).deleteRow(idx);
  return {ok: true};
}

// ════════════════════════════════════════════
//  علاقة معلم ← مدارس
// ════════════════════════════════════════════
function _assignTeacherSchool(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var teacherId = p.teacherId || '';
  var schoolId  = p.schoolId  || '';
  if (!teacherId || !schoolId) return {ok: false, msg: 'بيانات ناقصة'};
  var exists = _rows(SH.TEACHER_SCHOOLS).find(function(r) { return r.teacherId === teacherId && r.schoolId === schoolId; });
  if (exists) return {ok: false, msg: 'العلاقة موجودة مسبقاً'};
  _appendObject(SH.TEACHER_SCHOOLS, {id: Utilities.getUuid(), teacherId: teacherId, schoolId: schoolId, createdAt: new Date().toISOString()});
  return {ok: true};
}

function _removeTeacherSchool(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var rows = _rows(SH.TEACHER_SCHOOLS);
  var found = rows.find(function(r) { return r.teacherId === p.teacherId && r.schoolId === p.schoolId; });
  if (!found) return {ok: false, msg: 'العلاقة غير موجودة'};
  var idx = _rowIdx(SH.TEACHER_SCHOOLS, 'id', found.id);
  if (idx > 0) _sheet(SH.TEACHER_SCHOOLS).deleteRow(idx);
  return {ok: true};
}

function _getTeacherSchools(p) {
  var teacherId = p.teacherId || '';
  var relations = _rows(SH.TEACHER_SCHOOLS).filter(function(r) { return r.teacherId === teacherId; });
  var schools   = _rows(SH.SCHOOLS);
  var data = relations.map(function(r) {
    var s = schools.find(function(sc) { return sc.id === r.schoolId; });
    return s ? {id: s.id, name: s.name, city: s.city, type: s.type} : null;
  }).filter(Boolean);
  return {ok: true, data: data, schools: data};
}

// ════════════════════════════════════════════
//  التحديات (أدمن)
// ════════════════════════════════════════════
function _deleteChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CHALLENGES, 'id', p.challengeId);
  if (idx < 0) return {ok: false, msg: 'التحدي غير موجود'};
  _sheet(SH.CHALLENGES).deleteRow(idx);
  return {ok: true};
}

// ════════════════════════════════════════════
//  استيراد Excel (Bulk)
// ════════════════════════════════════════════
function _importUsers(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var role = p.role === 'teacher' ? 'teacher' : 'student';
  var rows;
  try { rows = JSON.parse(p.rows || '[]'); } catch(e) { return {ok: false, msg: 'بيانات غير صالحة'}; }
  if (!rows.length) return {ok: false, msg: 'لا توجد بيانات'};

  var existingUsers = _rows(SH.USERS);
  var existingEmails = existingUsers.map(function(u) { return String(u.email || '').toLowerCase(); });
  var existingCodes  = existingUsers.map(function(u) { return _normalizeCode(u.studentCode || u.teacherCode || ''); });

  var added = 0, skipped = 0, errors = [];
  var now = new Date().toISOString();

  rows.forEach(function(row, i) {
    var name     = (row.name     || '').trim();
    var schoolId = (row.schoolId || '').trim();
    var cls      = (row.class    || '').trim();
    var section  = (row.section  || '').trim();
    var phone    = _normalizePhone(row.phone || '');

    if (!name) { errors.push('صف ' + (i+1) + ': الاسم مطلوب'); skipped++; return; }

    // توليد رمز تعريفي فريد
    var userCode = '';
    var prefix   = role === 'teacher' ? 'TE' : 'ST';
    var attempts = 0;
    do {
      userCode = _genUserCode(prefix);
      attempts++;
    } while (existingCodes.indexOf(userCode) >= 0 && attempts < 20);

    existingCodes.push(userCode);

    var id = Utilities.getUuid();
    _appendObject(SH.USERS, {
      id:          id,
      name:        name,
      email:       '',
      phone:       phone,
      passwordHash:'',
      role:        role,
      status:      'pending',
      schoolId:    schoolId,
      class:       cls,
      section:     section,
      studentCode: role === 'student' ? userCode : '',
      teacherCode: role === 'teacher' ? userCode : '',
      joinedAt:    '',
      reviewedAt:  '',
      leftSchool:  ''
    });
    added++;
  });

  return {ok: true, added: added, skipped: skipped, errors: errors};
}

function _adminUpdateUser(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var userId = p.userId || '';
  var idx = _rowIdx(SH.USERS, 'id', userId);
  if (idx < 0) return {ok: false, msg: 'المستخدم غير موجود'};

  // منع تكرار البريد عند تغييره
  if (p.email) {
    var email = String(p.email || '').trim().toLowerCase();
    var dup = _rows(SH.USERS).find(function(u) {
      return u.id !== userId && String(u.email || '').trim().toLowerCase() === email;
    });
    if (dup) return {ok: false, msg: 'البريد الإلكتروني مستخدم مسبقاً'};
    _setCell(SH.USERS, idx, 'email', email);
  }

  if (p.name != null)     _setCell(SH.USERS, idx, 'name', String(p.name || '').trim());
  if (p.phone != null)    _setCell(SH.USERS, idx, 'phone', _normalizePhone(p.phone || ''));
  if (p.schoolId != null) _setCell(SH.USERS, idx, 'schoolId', String(p.schoolId || '').trim());
  if (p.class != null)    _setCell(SH.USERS, idx, 'class', String(p.class || '').trim());
  if (p.className != null) _setCell(SH.USERS, idx, 'class', String(p.className || '').trim());
  if (p.section != null)  _setCell(SH.USERS, idx, 'section', String(p.section || '').trim());
  if (p.leftSchool != null) _setCell(SH.USERS, idx, 'leftSchool', p.leftSchool === 'true' || p.leftSchool === true);
  if (p.status != null)   _setCell(SH.USERS, idx, 'status', String(p.status || '').trim());

  return {ok: true};
}

// ════════════════════════════════════════════
//  البحث عن رمز تعريفي (قبل التسجيل)
// ════════════════════════════════════════════
function _lookupCode(p) {
  var code = _normalizeCode(p.code || '');
  if (!code) return {ok: false, msg: 'أدخل الرمز'};

  var users = _rows(SH.USERS);
  var found;

  if (code.startsWith('ST-')) {
    found = users.find(function(u) { return _normalizeCode(u.studentCode) === code && u.role === 'student'; });
  } else if (code.startsWith('TE-')) {
    found = users.find(function(u) { return _normalizeCode(u.teacherCode) === code && u.role === 'teacher'; });
  } else if (code.startsWith('CR-')) {
    found = users.find(function(u) { return _normalizeCode(u.teacherCode) === code && u.role === 'creator'; });
  } else {
    return {ok: false, msg: 'الرمز غير صالح. يجب أن يبدأ بـ ST- أو TE- أو CR-'};
  }

  if (!found) return {ok: false, msg: 'الرمز غير موجود'};
  if (found.email) return {ok: false, msg: 'هذا الرمز مستخدم مسبقاً'};

  var schools = _rows(SH.SCHOOLS);
  var school  = schools.find(function(s) { return s.id === found.schoolId; });

  return {
    ok:       true,
    name:     found.name,
    role:     found.role,
    schoolId: found.schoolId || '',
    schoolName: school ? school.name : '',
    class:    found.class   || '',
    section:  found.section || ''
  };
}

// ════════════════════════════════════════════
//  المعلم — الصفوف
// ════════════════════════════════════════════
function _deleteClass(p) {
  var idx = _rowIdx(SH.CLASSES, 'id', p.classId);
  if (idx < 0) return {ok: false, msg: 'الصف غير موجود'};
  var sheet   = _sheet(SH.CLASSES);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row     = sheet.getRange(idx, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (String(p.token || '') !== SECRET && row[headers.indexOf('teacherId')] !== p.teacherId) return {ok: false, msg: 'غير مصرح'};
  sheet.deleteRow(idx);
  return {ok: true};
}

// ════════════════════════════════════════════
//  المعلم — الطلاب
// ════════════════════════════════════════════
function _getStudentsByClass(p) {
  var cls = _rows(SH.CLASSES).find(function(c) { return c.id === p.classId; });
  if (!cls) return {ok: false, msg: 'الصف غير موجود'};

  var schoolId = cls.schoolId || cls.school || '';
  var students = _rows(SH.USERS).filter(function(u) {
    return u.role === 'student' &&
           (u.schoolId || u.school || '') === schoolId &&
           (u.class || '') === cls.name;
  }).map(function(u) {
    return {
      id:          u.id,
      name:        u.name,
      email:       u.email || '',
      studentCode: u.studentCode || '',
      section:     u.section || '',
      status:      u.status || 'pending',
      joinedAt:    u.joinedAt || '',
      leftSchool:  _bool(u.leftSchool),
      hasAccount:  !!(u.email)
    };
  });
  return {ok: true, data: students, students: students};
}

function _markStudentLeft(p) {
  var idx = _rowIdx(SH.USERS, 'id', p.studentId);
  if (idx < 0) return {ok: false, msg: 'الطالب غير موجود'};
  _setCell(SH.USERS, idx, 'leftSchool', p.left === 'true');
  return {ok: true};
}

// ════════════════════════════════════════════
//  المعلم — التحديات
// ════════════════════════════════════════════
function _assignChallenge(p) {
  var classId      = p.classId      || '';
  var challengeKey = p.challengeKey || '';
  var challengeName= p.challengeName|| '';
  var expiresAt    = p.expiresAt    || '';
  var teacherId    = p.teacherId    || '';
  if (!classId || !challengeKey || !teacherId) return {ok: false, msg: 'بيانات ناقصة'};

  var cls = _rows(SH.CLASSES).find(function(c) { return c.id === classId && c.teacherId === teacherId; });
  if (!cls) return {ok: false, msg: 'الصف غير موجود'};

  var schoolId = cls.schoolId || cls.school || '';
  var students = _rows(SH.USERS).filter(function(u) {
    return u.role === 'student' &&
           String(u.status || '') === 'active' &&
           !_bool(u.leftSchool) &&
           (u.schoolId || u.school || '') === schoolId &&
           (u.class || '') === cls.name;
  });
  if (!students.length) return {ok: false, msg: 'لا يوجد طلاب نشطون في هذا الصف'};

  var assignId   = Utilities.getUuid();
  var now        = new Date().toISOString();
  _appendObject(SH.ASSIGNMENTS, {id: assignId, teacherId: teacherId, classId: classId, challengeKey: challengeKey, challengeName: challengeName, expiresAt: expiresAt, createdAt: now});

  var codeSheet  = _sheet(SH.CODES);
  var notifSheet = _sheet(SH.NOTIFICATIONS);
  var generated  = [];

  students.forEach(function(student) {
    var code = _code(8);
    _appendObject(SH.CODES, {id: Utilities.getUuid(), assignmentId: assignId, studentId: student.id, studentEmail: student.email, studentName: student.name, code: code, startedAt: '', submittedAt: '', status: 'assigned', teacherNote: '', createdAt: now});
    notifSheet.appendRow([Utilities.getUuid(), student.id, 'challenge', 'تحدي جديد: ' + challengeName, 'كودك الخاص للتحدي', code, assignId, expiresAt, false, now]);
    generated.push({studentId: student.id, studentName: student.name, code: code});
  });

  return {ok: true, assignmentId: assignId, total: generated.length, codes: generated};
}

function _getAssignments(p) {
  var classes = _rows(SH.CLASSES);
  var codes = _rows(SH.CODES);
  var data = _rows(SH.ASSIGNMENTS).filter(function(a) { return a.teacherId === p.teacherId; }).map(function(a) {
    var cls = classes.find(function(c) { return c.id === a.classId; });
    var related = codes.filter(function(c) { return c.assignmentId === a.id; });
    a.className = cls ? cls.name : '';
    a.totalCount = related.length;
    a.submittedCount = related.filter(function(c) { return c.submittedAt; }).length;
    a.pendingCount = related.filter(function(c) { return c.status === 'submitted'; }).length;
    a.approvedCount = related.filter(function(c) { return c.status === 'approved'; }).length;
    a.rejectedCount = related.filter(function(c) { return c.status === 'rejected'; }).length;
    return a;
  });
  return {ok: true, data: data, assignments: data};
}

function _adminGetAllAssignments(p) {
  if (p.secret !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var users   = _rows(SH.USERS);
  var classes = _rows(SH.CLASSES);
  var codes   = _rows(SH.CODES);
  var data = _rows(SH.ASSIGNMENTS).map(function(a) {
    var cls     = classes.find(function(c) { return c.id === a.classId; });
    var teacher = users.find(function(u) { return u.id === a.teacherId; });
    var related = codes.filter(function(c) { return c.assignmentId === a.id; });
    a.className   = cls     ? cls.name     : '';
    a.teacherName = teacher ? teacher.name : '';
    a.totalCount     = related.length;
    a.submittedCount = related.filter(function(c) { return c.submittedAt;           }).length;
    a.approvedCount  = related.filter(function(c) { return c.status === 'approved'; }).length;
    return a;
  });
  return {ok: true, data: data};
}

function _getSubmissionsByAssignment(p) {
  var assignId  = p.assignmentId || '';
  var teacherId = p.teacherId    || '';
  var assign    = _rows(SH.ASSIGNMENTS).find(function(a) { return a.id === assignId && a.teacherId === teacherId; });
  if (!assign) return {ok: false, msg: 'غير مصرح'};

  var codes = _rows(SH.CODES).filter(function(c) { return c.assignmentId === assignId && c.submittedAt; });
  codes.sort(function(a, b) {
    if (!a.startedAt || !b.startedAt) return 0;
    var dA = a.submittedAt ? (new Date(a.submittedAt) - new Date(a.startedAt)) : Infinity;
    var dB = b.submittedAt ? (new Date(b.submittedAt) - new Date(b.startedAt)) : Infinity;
    return dA - dB;
  });
  var submissions = codes.map(function(c, i) {
    return {
      rank: i + 1,
      codeId: c.id,
      studentId: c.studentId,
      studentName: c.studentName,
      studentEmail: c.studentEmail,
      studentCode: c.code,
      startedAt: c.startedAt,
      submittedAt: c.submittedAt,
      status: c.status || 'submitted',
      teacherNote: c.teacherNote || '',
      duration: c.startedAt && c.submittedAt ? Math.round((new Date(c.submittedAt) - new Date(c.startedAt)) / 60000) : null
    };
  });
  return {ok: true, data: submissions, submissions: submissions};
}

function _approveSubmissionTeacher(p) {
  var teacherId = p.teacherId || '';
  var codeId    = p.codeId    || '';
  var code = _rows(SH.CODES).find(function(c) { return c.id === codeId; });
  if (!code) return {ok: false, msg: 'غير موجود'};
  var assign = _rows(SH.ASSIGNMENTS).find(function(a) { return a.id === code.assignmentId && a.teacherId === teacherId; });
  if (!assign) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CODES, 'id', codeId);
  if (idx > 0) {
    _setCell(SH.CODES, idx, 'status', 'approved');
    _setCell(SH.CODES, idx, 'teacherNote', '');
  }
  _sheet(SH.NOTIFICATIONS).appendRow([
    Utilities.getUuid(), code.studentId, 'grade',
    'تم قبول حلك ✅', 'أحسنت! تم قبول حلك في تحدي ' + assign.challengeName,
    '', assign.id, '', false, new Date().toISOString()
  ]);
  return {ok: true};
}

function _rejectSubmissionTeacher(p) {
  var teacherId = p.teacherId || '';
  var codeId    = p.codeId    || '';
  var code = _rows(SH.CODES).find(function(c) { return c.id === codeId; });
  if (!code) return {ok: false, msg: 'غير موجود'};
  var assign = _rows(SH.ASSIGNMENTS).find(function(a) { return a.id === code.assignmentId && a.teacherId === teacherId; });
  if (!assign) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CODES, 'id', codeId);
  if (idx > 0) {
    _setCell(SH.CODES, idx, 'status', 'rejected');
    _setCell(SH.CODES, idx, 'teacherNote', p.note || '');
  }
  _sheet(SH.NOTIFICATIONS).appendRow([
    Utilities.getUuid(), code.studentId, 'grade',
    'تحتاج مراجعة ❌', (p.note || 'يرجى مراجعة حلك وإعادة المحاولة') + ' — تحدي ' + assign.challengeName,
    '', assign.id, '', false, new Date().toISOString()
  ]);
  return {ok: true};
}

function _reopenChallenge(p) {
  var teacherId  = p.teacherId  || '';
  var assignId   = p.assignmentId || '';
  var studentIds = [];
  try { studentIds = JSON.parse(p.studentIds || '[]'); } catch(e) { Logger.log('Email error: ' + e.message); }
  var newExpiry  = p.expiresAt  || '';

  var assign = _rows(SH.ASSIGNMENTS).find(function(a) { return a.id === assignId && a.teacherId === teacherId; });
  if (!assign) return {ok: false, msg: 'غير مصرح'};

  var assignIdx = _rowIdx(SH.ASSIGNMENTS, 'id', assignId);
  if (assignIdx > 0 && newExpiry) _setCell(SH.ASSIGNMENTS, assignIdx, 'expiresAt', newExpiry);

  var notifSheet = _sheet(SH.NOTIFICATIONS);
  var now = new Date().toISOString();
  studentIds.forEach(function(sid) {
    var codeRow = _rows(SH.CODES).find(function(c) { return c.assignmentId === assignId && c.studentId === sid; });
    if (codeRow) {
      notifSheet.appendRow([
        Utilities.getUuid(), sid, 'challenge',
        'تم فتح التحدي من جديد: ' + assign.challengeName,
        'كودك السابق لا يزال صالحاً',
        codeRow.code, assignId, newExpiry || assign.expiresAt, false, now
      ]);
    }
  });
  return {ok: true};
}

function _getTeacherNotifs(p) {
  var notifs = _rows(SH.NOTIFICATIONS).filter(function(n) {
    return n.userId === p.teacherId && (n.type === 'reset_link' || n.type === 'new_challenge' || n.type === 'submission');
  }).map(function(n) {
    var read = _bool(n.read);
    return {id: n.id, type: n.type, title: n.title, body: n.body, message: n.title || n.body || '', read: read, readAt: read ? (n.createdAt || true) : '', createdAt: n.createdAt};
  }).sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return {ok: true, data: notifs, notifs: notifs};
}

// ════════════════════════════════════════════
//  الإنجازات
// ════════════════════════════════════════════
function _addAchievement(p) {
  var teacherId   = p.teacherId   || '';
  var studentId   = p.studentId   || '';
  var studentName = p.studentName || '';
  var schoolId    = p.schoolId    || '';
  var text        = (p.text  || '').trim();
  var badge       = p.badge  || '';
  if (!teacherId || !studentId || (!text && !badge)) return {ok: false, msg: 'بيانات ناقصة'};
  if (!studentName || !schoolId) {
    var student = _rows(SH.USERS).find(function(u) { return u.id === studentId; });
    if (student) {
      studentName = studentName || student.name || '';
      schoolId = schoolId || student.schoolId || student.school || '';
    }
  }
  _appendObject(SH.ACHIEVEMENTS, {id: Utilities.getUuid(), teacherId: teacherId, studentId: studentId, studentName: studentName, schoolId: schoolId, text: text, badge: badge, createdAt: new Date().toISOString()});
  return {ok: true};
}

function _getAchievements(p) {
  var all = _rows(SH.ACHIEVEMENTS);
  if (p.schoolId) all = all.filter(function(a) { return a.schoolId === p.schoolId; });
  if (p.teacherId) all = all.filter(function(a) { return a.teacherId === p.teacherId; });
  if (p.studentId) all = all.filter(function(a) { return a.studentId === p.studentId; });
  all.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return {ok: true, data: all, achievements: all};
}

// ════════════════════════════════════════════
//  الفائزون
// ════════════════════════════════════════════
function _getWinners(p) {
  var schoolId  = p.schoolId  || '';
  var weekStart = p.weekStart || '';

  var codes   = _rows(SH.CODES).filter(function(c) { return c.startedAt && c.submittedAt && c.status === 'approved'; });
  var assigns = _rows(SH.ASSIGNMENTS);
  var users   = _rows(SH.USERS);
  var schools = _rows(SH.SCHOOLS);

  var results = codes.map(function(c) {
    var assign  = assigns.find(function(a) { return a.id === c.assignmentId; });
    if (!assign) return null;
    var student = users.find(function(u) { return u.id === c.studentId; });
    if (!student) return null;
    var school  = schools.find(function(s) { return s.id === (student.schoolId || student.school); });
    var duration = Math.round((new Date(c.submittedAt) - new Date(c.startedAt)) / 1000);
    return {
      studentId:     c.studentId,
      studentName:   c.studentName || student.name,
      schoolId:      student.schoolId || student.school || '',
      schoolName:    school ? school.name : '',
      challengeKey:  assign.challengeKey,
      challengeName: assign.challengeName,
      startedAt:     c.startedAt,
      submittedAt:   c.submittedAt,
      durationSec:   duration
    };
  }).filter(Boolean);

  // فلترة أسبوعية
  if (weekStart) {
    var ws = new Date(weekStart);
    var we = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000);
    results = results.filter(function(r) {
      var d = new Date(r.submittedAt);
      return d >= ws && d < we;
    });
  }

  // فائزون محليون (نفس المدرسة)
  var local  = schoolId ? results.filter(function(r) { return r.schoolId === schoolId; }) : [];
  local.sort(function(a, b) { return a.durationSec - b.durationSec; });

  // فائزون عامون
  var global = results.slice();
  global.sort(function(a, b) { return a.durationSec - b.durationSec; });

  return {ok: true, local: local.slice(0, 10), global: global.slice(0, 10)};
}

// ════════════════════════════════════════════
//  الطالب — الإشعارات والكودات
// ════════════════════════════════════════════
function _getStudentNotifs(p) {
  var now    = new Date();
  var notifs = _rows(SH.NOTIFICATIONS).filter(function(n) { return n.userId === p.studentId; })
    .map(function(n) {
      var read = _bool(n.read);
      return {id: n.id, type: n.type, title: n.title, body: n.body, message: n.title || n.body || '', code: n.code, assignmentId: n.assignmentId, expiresAt: n.expiresAt, expired: n.expiresAt ? new Date(n.expiresAt) < now : false, read: read, readAt: read ? (n.createdAt || true) : '', createdAt: n.createdAt};
    }).sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return {ok: true, data: notifs, notifs: notifs};
}

function _markNotifRead(p) {
  if (p.all === 'true') {
    var rows = _rows(SH.NOTIFICATIONS);
    rows.forEach(function(n) {
      if (n.userId === p.userId) {
        var idx = _rowIdx(SH.NOTIFICATIONS, 'id', n.id);
        if (idx > 0) _setCell(SH.NOTIFICATIONS, idx, 'read', true);
      }
    });
    return {ok: true};
  }
  var idx = _rowIdx(SH.NOTIFICATIONS, 'id', p.notifId);
  if (idx < 0) return {ok: false, msg: 'الإشعار غير موجود'};
  _setCell(SH.NOTIFICATIONS, idx, 'read', true);
  return {ok: true};
}

function _validateCode(p) {
  var code      = _normalizeCode(p.code || '');
  var studentId = p.studentId || '';
  var found = _rows(SH.CODES).find(function(c) { return c.code === code && c.studentId === studentId; });
  if (!found) return {ok: false, msg: 'الكود غير صحيح أو لا ينتمي لحسابك'};
  var assign = _rows(SH.ASSIGNMENTS).find(function(a) { return a.id === found.assignmentId; });
  if (!assign) return {ok: false, msg: 'التحدي غير موجود'};
  if (assign.expiresAt && new Date(assign.expiresAt) < new Date()) {
    return {ok: false, expired: true, msg: 'انتهت صلاحية الكود'};
  }
  var challenge = _rows(SH.CHALLENGES).find(function(c) { return c.key === assign.challengeKey; });
  var href = challenge && challenge.href ? challenge.href : '';
  if (!href && assign.challengeKey === 'led') href = './track-2-led-challenge.html';
  if (!href && assign.challengeKey === 'push-button') href = './track-2-pushbutton-challenge.html';
  return {ok: true, codeId: found.id, challengeKey: assign.challengeKey, challengeName: assign.challengeName, tinkercadUrl: href, href: href, expiresAt: assign.expiresAt};
}

function _startChallenge(p) {
  var codeId    = p.codeId    || '';
  var studentId = p.studentId || '';
  var codeRow   = _rows(SH.CODES).find(function(c) { return c.id === codeId && c.studentId === studentId; });
  if (!codeRow) return {ok: false, msg: 'غير موجود'};
  if (codeRow.startedAt) return {ok: true, startedAt: codeRow.startedAt};
  var now = new Date().toISOString();
  var idx = _rowIdx(SH.CODES, 'id', codeId);
  if (idx > 0) _setCell(SH.CODES, idx, 'startedAt', now);
  return {ok: true, startedAt: now};
}

function _submitChallengeCode(p) {
  var codeId    = p.codeId    || '';
  var studentId = p.studentId || '';
  var codeRow   = _rows(SH.CODES).find(function(c) { return c.id === codeId && c.studentId === studentId; });
  if (!codeRow) return {ok: false, msg: 'غير موجود'};
  var assign = _rows(SH.ASSIGNMENTS).find(function(a) { return a.id === codeRow.assignmentId; });
  if (!assign) return {ok: false, msg: 'التحدي غير موجود'};
  if (assign.expiresAt && new Date(assign.expiresAt) < new Date()) return {ok: false, msg: 'انتهى وقت التحدي'};
  var now = new Date().toISOString();
  var idx = _rowIdx(SH.CODES, 'id', codeId);
  if (idx > 0) {
    _setCell(SH.CODES, idx, 'submittedAt', now);
    _setCell(SH.CODES, idx, 'status', 'submitted');
    _setCell(SH.CODES, idx, 'teacherNote', '');
  }
  // إشعار المعلم
  _sheet(SH.NOTIFICATIONS).appendRow([
    Utilities.getUuid(), assign.teacherId, 'submission',
    'طالب سلّم التحدي', codeRow.studentName + ' سلّم حله في: ' + assign.challengeName,
    '', assign.id, '', false, now
  ]);
  return {ok: true, submittedAt: now};
}

// ════════════════════════════════════════════
//  إعادة تعيين كلمة المرور
// ════════════════════════════════════════════
function _requestPasswordReset(p) {
  var email   = (p.email || '').trim().toLowerCase();
  var siteUrl = p.siteUrl || _siteUrl();
  var users   = _rows(SH.USERS);
  var user    = users.find(function(u) { return String(u.email || '').toLowerCase() === email; });
  if (!user) return {ok: false, msg: 'لا يوجد حساب بهذا البريد'};
  var token     = _code(16);
  var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  _appendObject(SH.RESET_TOKENS, {id: Utilities.getUuid(), userId: user.id, userEmail: user.email, token: token, expiresAt: expiresAt, used: false, createdAt: new Date().toISOString()});
  var resetLink = siteUrl + '/auth.html?reset=' + token;
  try { MailApp.sendEmail(user.email, 'إعادة تعيين كلمة المرور — Circuit Quest', 'الرابط صالح 24 ساعة:\n' + resetLink); } catch(e) { Logger.log('Email error: ' + e.message); }
  return {ok: true, msg: 'تم إرسال رابط الإعادة إلى بريدك'};
}

function _requestPhoneOtp(p) {
  var phone = _normalizePhone(p.phone);
  if (!phone) return {ok: false, msg: 'أدخل رقم الهاتف'};
  var user = _rows(SH.USERS).find(function(u) { return _normalizePhone(u.phone) === phone; });
  if (!user) return {ok: false, msg: 'لا يوجد حساب بهذا الرقم'};
  var otp       = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  _appendObject(SH.OTP_CODES, {id: Utilities.getUuid(), userId: user.id, phone: phone, otp: otp, resetToken: '', expiresAt: expiresAt, used: false, createdAt: new Date().toISOString()});
  var sent = _sendSms(phone, 'Circuit Quest OTP: ' + otp + ' (صالح 10 دقائق)');
  if (!sent.ok) return sent;
  return {ok: true, msg: 'تم إرسال كود التحقق'};
}

function _verifyPhoneOtp(p) {
  var phone   = _normalizePhone(p.phone);
  var otp     = String(p.otp || '').trim();
  var siteUrl = p.siteUrl || _siteUrl();
  if (!phone || !otp) return {ok: false, msg: 'بيانات ناقصة'};
  var now   = new Date();
  var codes = _rows(SH.OTP_CODES).filter(function(r) {
    return _normalizePhone(r.phone) === phone && String(r.otp) === otp && !_bool(r.used) && new Date(r.expiresAt) >= now;
  }).sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  if (!codes.length) return {ok: false, msg: 'كود التحقق غير صحيح أو منتهي'};
  var otpRow  = codes[0];
  var user    = _rows(SH.USERS).find(function(u) { return u.id === otpRow.userId; });
  if (!user)  return {ok: false, msg: 'الحساب غير موجود'};
  var token     = _code(16);
  var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  _appendObject(SH.RESET_TOKENS, {id: Utilities.getUuid(), userId: user.id, userEmail: user.email, token: token, expiresAt: expiresAt, used: false, createdAt: new Date().toISOString()});
  var link = siteUrl + '/auth.html?reset=' + token;
  _sendSms(phone, 'رابط إعادة كلمة المرور: ' + link);
  var rowIdx = _rowIdx(SH.OTP_CODES, 'id', otpRow.id);
  if (rowIdx > 0) { _setCell(SH.OTP_CODES, rowIdx, 'used', true); _setCell(SH.OTP_CODES, rowIdx, 'resetToken', token); }
  return {ok: true, msg: 'تم الإرسال'};
}

function _resetPassword(p) {
  var token = (p.token || '').trim();
  var newPh = p.newPasswordHash || '';
  if (!token || !newPh) return {ok: false, msg: 'بيانات ناقصة'};
  var tokenRow = _rows(SH.RESET_TOKENS).find(function(t) { return t.token === token && !_bool(t.used); });
  if (!tokenRow) return {ok: false, msg: 'الرابط غير صالح'};
  if (new Date(tokenRow.expiresAt) < new Date()) return {ok: false, msg: 'انتهت صلاحية الرابط'};
  var userIdx = _rowIdx(SH.USERS, 'id', tokenRow.userId);
  if (userIdx < 0) return {ok: false, msg: 'المستخدم غير موجود'};
  _setCell(SH.USERS, userIdx, 'passwordHash', newPh);
  var tokenIdx = _rowIdx(SH.RESET_TOKENS, 'token', token);
  if (tokenIdx > 0) _setCell(SH.RESET_TOKENS, tokenIdx, 'used', true);
  return {ok: true, msg: 'تم تغيير كلمة المرور'};
}

// ════════════════════════════════════════════
//  الإنجازات القديمة (محافظ على التوافق)
// ════════════════════════════════════════════
function _getSubmissionsSheet() {
  var ss    = _ss();
  var sheet = ss.getSheetByName(SH.SUBMISSIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SH.SUBMISSIONS);
    sheet.appendRow(['ID','الاسم','المدرسة','التحدي','رابط الصورة','الحالة','التاريخ']);
  }
  return sheet;
}

function _submit(p) {
  var sheet = _getSubmissionsSheet();
  var id    = Utilities.getUuid();
  sheet.appendRow([id, p.name||'', p.school||'', p.challenge||'', p.imageUrl||'', 'pending', new Date()]);
  var base       = ScriptApp.getService().getUrl();
  var approveUrl = base + '?action=approve&id=' + id + '&token=' + SECRET;
  var rejectUrl  = base + '?action=reject&id='  + id + '&token=' + SECRET;
  try { MailApp.sendEmail(ADMIN_EMAIL, '🔔 طالب جديد: '+(p.name||'')+' — '+(p.challenge||''), '', {htmlBody: _submissionEmail(p, approveUrl, rejectUrl)}); } catch(e) { Logger.log('Email error: ' + e.message); }
  return _json({submitted: true, id: id});
}

function _approveSubmission(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌','#fef2f2','#dc2626');
  _updateSubmissionStatus(p.id, 'approved');
  if (p.ajax) return _json({ok: true});
  return _htmlPage('✅ تم القبول!','#f0fdf4','#16a34a');
}

function _rejectSubmission(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌','#fef2f2','#dc2626');
  _updateSubmissionStatus(p.id, 'rejected');
  if (p.ajax) return _json({ok: true});
  return _htmlPage('❌ تم الرفض','#fef2f2','#dc2626');
}

function _listSubmissions(p) {
  var token = p ? (p.token || '') : '';
  if (token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var rows = _getSubmissionsSheet().getDataRange().getValues();
  var res  = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][5] === 'pending') res.push({id:rows[i][0],name:rows[i][1],school:rows[i][2],challenge:rows[i][3],imageUrl:rows[i][4],status:rows[i][5],date:rows[i][6]?rows[i][6].toString():''});
  }
  return {ok: true, submissions: res};
}

function _updateSubmissionStatus(id, status) {
  var sheet = _getSubmissionsSheet();
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { sheet.getRange(i+1, 6).setValue(status); return; }
  }
}

function _notifyFastApiSignup(p) {
  var role = String(p.role || 'student').toLowerCase();
  var name = String(p.name || p.email || 'New user');
  var email = String(p.email || '');
  var phone = String(p.phone || '');
  var userId = String(p.userId || '');
  var approvalBaseUrl = String(p.approvalBaseUrl || '').replace(/\/$/, '');
  if (!userId || !approvalBaseUrl) return {ok:false, msg:'Missing approval data'};

  var approveAction = role === 'teacher' ? 'approveTeacher' : (role === 'creator' ? 'approveCreator' : 'approveStudent');
  var rejectAction = role === 'teacher' ? 'rejectTeacher' : (role === 'creator' ? 'rejectCreator' : 'rejectStudent');
  var approveUrl = approvalBaseUrl + '?action=' + approveAction + '&userId=' + encodeURIComponent(userId) + '&token=' + encodeURIComponent(SECRET) + '&ngrok-skip-browser-warning=1';
  var rejectUrl = approvalBaseUrl + '?action=' + rejectAction + '&userId=' + encodeURIComponent(userId) + '&token=' + encodeURIComponent(SECRET) + '&ngrok-skip-browser-warning=1';
  var roleLabel = role === 'teacher' ? 'Teacher' : (role === 'creator' ? 'Creator' : 'Student');

  var html =
    '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:auto">' +
    '<div style="background:#ea580c;padding:20px;border-radius:12px 12px 0 0"><h2 style="color:#fff;margin:0">طلب تسجيل جديد</h2></div>' +
    '<div style="background:#fff;padding:20px;border:1px solid #eee;border-top:none">' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
    '<tr style="background:#f8f8f8"><td style="padding:10px;font-weight:700">الدور</td><td style="padding:10px">' + roleLabel + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:700">الاسم</td><td style="padding:10px">' + name + '</td></tr>' +
    '<tr style="background:#f8f8f8"><td style="padding:10px;font-weight:700">البريد</td><td style="padding:10px">' + (email || '—') + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:700">الهاتف</td><td style="padding:10px">' + (phone || '—') + '</td></tr>' +
    '</table>' +
    '<a href="' + approveUrl + '" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-left:8px">قبول</a>' +
    '<a href="' + rejectUrl  + '" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">رفض</a>' +
    '</div></div>';

  var subject = 'طلب تسجيل ' + roleLabel + ': ' + name;
  MailApp.sendEmail(ADMIN_EMAIL, subject, 'New signup request: ' + name + ' (' + email + ')', {htmlBody: html});
  return {ok:true, sentTo: ADMIN_EMAIL, subject: subject};
}

function _submissionEmail(p, approveUrl, rejectUrl) {
  return '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:auto">' +
    '<div style="background:#f04e23;padding:20px;border-radius:12px 12px 0 0"><h2 style="color:#fff;margin:0">🔔 إنجاز جديد</h2></div>' +
    '<div style="background:#fff;padding:20px;border:1px solid #eee;border-top:none">' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
    '<tr style="background:#f8f8f8"><td style="padding:10px;font-weight:700">الاسم</td><td style="padding:10px">' + (p.name||'—') + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:700">المدرسة</td><td style="padding:10px">' + (p.school||'—') + '</td></tr>' +
    '<tr style="background:#f8f8f8"><td style="padding:10px;font-weight:700">التحدي</td><td style="padding:10px">' + (p.challenge||'—') + '</td></tr>' +
    '</table>' +
    '<img src="' + (p.imageUrl||'') + '" style="width:100%;max-height:400px;object-fit:contain;border-radius:10px;margin-bottom:20px">' +
    '<a href="' + approveUrl + '" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-left:8px">✅ موافقة</a>' +
    '<a href="' + rejectUrl  + '" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">❌ رفض</a>' +
    '</div></div>';
}

// ════════════════════════════════════════════
//  مساعدات الإخراج
// ════════════════════════════════════════════
function _json(data, callback) {
  var json = JSON.stringify(data);
  if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function _htmlPage(title, bg, color, sub) {
  var s = sub ? '<p style="color:#555;font-size:16px">' + sub + '</p>' : '';
  return HtmlService.createHtmlOutput(
    '<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:80px;background:' + bg + '">' +
    '<div style="font-size:56px;margin-bottom:16px">' + title.split(' ')[0] + '</div>' +
    '<h1 style="color:' + color + ';margin:0 0 12px">' + title + '</h1>' + s + '</body></html>'
  );
}

// ════════════════════════════════════════════
//  بيانات تجريبية — شغّلها مرة واحدة فقط
//  من محرر GAS: اختر seedData ← Run
// ════════════════════════════════════════════
function seedData() {
  var ss  = _ss();
  var now = new Date().toISOString();

  function uid() { return Utilities.getUuid(); }
  function pad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }

  // نفس دالة الهاش المستخدمة في الواجهة
  function simpleHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  }

  var PASS = simpleHash('123456'); // كلمة مرور الجميع

  var SCHOOLS_DATA = [
    { name: 'مدرسة الرواد الأساسية',  city: 'عمّان',   type: 'school'  },
    { name: 'مدرسة الأمل للبنات',     city: 'إربد',    type: 'school'  },
    { name: 'مركز STEM المستقبل',     city: 'الزرقاء', type: 'center'  },
    { name: 'مدرسة النور الوطنية',    city: 'العقبة',  type: 'school'  },
    { name: 'مدرسة الإبداع التقني',   city: 'السلط',   type: 'school'  }
  ];

  var GRADES   = ['السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
  var SECTIONS = ['أ', 'ب'];

  var MALE_NAMES   = ['أحمد','محمد','عمر','يوسف','خالد','سامر','نادر','علي','زيد','باسل'];
  var FEMALE_NAMES = ['سارة','ليلى','منى','رنا','دانا','نور','آية','ريم','سلمى','هبة'];
  var LAST_NAMES   = ['الأحمد','السالم','العمري','الخالد','القاسم','الحسن','الرحمن','العلي','النعيمي','الشريف'];

  var schools       = [];
  var users         = [];   // معلمون + طلاب
  var teacherSchols = [];
  var classes       = [];

  var tCount = 0;
  var sCount = 0;

  SCHOOLS_DATA.forEach(function(sc, si) {
    var schId = uid();
    schools.push({ id: schId, name: sc.name, city: sc.city, type: sc.type, createdAt: now });

    // ── معلمان لكل مدرسة ──────────────────────────
    var schTeachers = [];
    for (var t = 0; t < 2; t++) {
      tCount++;
      var tId   = uid();
      var tCode = 'TE-2026-' + pad(tCount, 3);
      var tEmail = 'teacher' + tCount + '@cq.test';
      var tName  = (t === 0 ? 'أستاذ ' : 'أستاذة ') + ['ماجد','سمر','وليد','ريم','طارق','دانا','نبيل','هند','رامي','لينا'][tCount - 1] + ' - مدرسة ' + (si + 1);
      users.push({
        id: tId, name: tName, email: tEmail,
        phone: '0791' + pad(tCount, 6),
        passwordHash: PASS, role: 'teacher', status: 'active',
        schoolId: schId, class: '', section: '',
        studentCode: '', teacherCode: tCode,
        joinedAt: now, reviewedAt: now, leftSchool: false
      });
      teacherSchols.push({ id: uid(), teacherId: tId, schoolId: schId, createdAt: now });
      schTeachers.push({ id: tId, email: tEmail });
    }

    // ── 5 صفوف × 2 شعب = 10 صفوف لكل مدرسة ──────
    GRADES.forEach(function(grade) {
      SECTIONS.forEach(function(section, secIdx) {
        var teacher  = schTeachers[secIdx]; // المعلم الأول → شعبة أ ، الثاني → شعبة ب
        var clsId    = uid();
        var clsName  = 'الصف ' + grade + ' ' + section;
        classes.push({
          id: clsId, teacherId: teacher.id, teacherEmail: teacher.email,
          name: clsName, schoolId: schId, section: section, createdAt: now
        });

        // ── 10 طلاب لكل صف ────────────────────────
        var firstNames = (sc.name.indexOf('بنات') > -1) ? FEMALE_NAMES : MALE_NAMES;
        for (var n = 0; n < 10; n++) {
          sCount++;
          var stCode  = 'ST-2026-' + pad(sCount, 4);
          var stName  = firstNames[n] + ' ' + LAST_NAMES[n];
          var stEmail = 'st' + sCount + '@cq.test';
          users.push({
            id: uid(), name: stName, email: stEmail,
            phone: '0790' + pad(sCount, 6),
            passwordHash: PASS, role: 'student', status: 'active',
            schoolId: schId, class: grade, section: section,
            studentCode: stCode, teacherCode: '',
            joinedAt: now, reviewedAt: now, leftSchool: false
          });
        }
      });
    });
  });

  // ── الكتابة في الجداول ────────────────────────────
  function writeRows(sheetName, rows) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) { sheet = ss.insertSheet(sheetName); }
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS[sheetName]);
    var heads = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    rows.forEach(function(row) {
      sheet.appendRow(heads.map(function(h) { return row.hasOwnProperty(h) ? row[h] : ''; }));
    });
  }

  writeRows('Schools',       schools);
  writeRows('Users',         users);
  writeRows('TeacherSchools',teacherSchols);
  writeRows('Classes',       classes);

  Logger.log('✅ تم إنشاء البيانات التجريبية:');
  Logger.log('   مدارس:  ' + schools.length);
  Logger.log('   معلمون: ' + (tCount) + '  (TE-2026-001 → TE-2026-' + pad(tCount,3) + ')');
  Logger.log('   صفوف:   ' + classes.length);
  Logger.log('   طلاب:   ' + (sCount) + '  (ST-2026-0001 → ST-2026-' + pad(sCount,4) + ')');
  Logger.log('   كلمة المرور لجميع الحسابات: 123456');
}

// ════════════════════════════════════════════
//  دوال محسّنة — تستبدل النسخ الأساسية أعلاه
// ════════════════════════════════════════════

function _classDisplayNameNormalized(grade, section, fallbackName) {
  var g = String(grade || '').trim();
  var s = String(section || '').trim();
  if (g && s) return g + ' ' + s;
  if (g) return g;
  return String(fallbackName || '').trim();
}

function _getCreators(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var data = _rows(SH.USERS).filter(function(u) {
    return u.role === 'creator' && u.status !== 'deleted';
  }).map(_safeUser);
  return {ok: true, data: data, creators: data};
}

function _getAdminNotifs(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var notifs = _rows(SH.NOTIFICATIONS).filter(function(n) {
    return n.userId === 'admin';
  }).map(function(n) {
    var read = _bool(n.read);
    return {
      id: n.id, type: n.type, title: n.title, body: n.body,
      message: n.title || n.body || '', read: read,
      readAt: n.readAt || '', createdAt: n.createdAt || ''
    };
  }).sort(function(a, b) {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  return {ok: true, data: notifs, notifs: notifs};
}

function _createSchool(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var name = (p.name || '').trim();
  var city = (p.city || '').trim();
  var type = p.type === 'center' ? 'center' : 'school';
  if (!name) return {ok: false, msg: 'اسم المدرسة مطلوب'};
  var exists = _rows(SH.SCHOOLS).find(function(s) {
    return String(s.name || '').toLowerCase() === name.toLowerCase() && String(s.status || 'active') !== 'deleted';
  });
  if (exists) return {ok: false, msg: 'هذه المدرسة/المركز موجودة مسبقاً'};
  var id = Utilities.getUuid();
  var now = new Date().toISOString();
  var school = {id: id, name: name, city: city, type: type, status: 'active', createdAt: now, updatedAt: now};
  _appendObject(SH.SCHOOLS, school);
  return {ok: true, data: school};
}

function _getSchools(p) {
  var data = _rows(SH.SCHOOLS).filter(function(s) {
    return String(s.status || 'active') !== 'deleted';
  });
  return {ok: true, data: data, schools: data};
}

function _updateSchool(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.SCHOOLS, 'id', p.schoolId);
  if (idx < 0) return {ok: false, msg: 'المدرسة غير موجودة'};
  if (p.name   != null) _setCell(SH.SCHOOLS, idx, 'name',   String(p.name   || '').trim());
  if (p.city   != null) _setCell(SH.SCHOOLS, idx, 'city',   String(p.city   || '').trim());
  if (p.type   != null) _setCell(SH.SCHOOLS, idx, 'type',   String(p.type   || '').trim());
  if (p.status != null) _setCell(SH.SCHOOLS, idx, 'status', String(p.status || '').trim());
  _setCell(SH.SCHOOLS, idx, 'updatedAt', new Date().toISOString());
  return {ok: true};
}

function _getClasses(p) {
  var schoolIdFilter = String(p.schoolId || '').trim();
  var rows = _rows(SH.CLASSES).filter(function(c) {
    if (String(c.status || 'active') === 'deleted') return false;
    if (String(c.status || 'active') === 'course') return false;
    if (schoolIdFilter && String(c.schoolId || '') !== schoolIdFilter) return false;
    if (p.teacherId && String(c.teacherId || '') !== String(p.teacherId || '')) return false;
    return true;
  });
  var schools = _rows(SH.SCHOOLS);
  var users = _rows(SH.USERS);
  var data = rows.map(function(c) {
    var schoolId = c.schoolId || '';
    var school = schools.find(function(s) { return s.id === schoolId; });
    var className = _classDisplayNameNormalized(c.grade, c.section, c.name);
    var studentCount = users.filter(function(u) {
      return u.role === 'student' && !_bool(u.leftSchool) &&
        String(u.schoolId || '') === schoolId && String(u.class || '') === className;
    }).length;
    return {
      id: c.id, teacherId: c.teacherId || '', teacherEmail: c.teacherEmail || '',
      name: className, grade: c.grade || '', section: c.section || '',
      schoolId: schoolId, schoolName: school ? school.name : '',
      status: c.status || 'active', studentCount: studentCount,
      createdAt: c.createdAt || '', updatedAt: c.updatedAt || c.createdAt || ''
    };
  });
  return {ok: true, data: data, classes: data};
}

function _createClass(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var schoolId = String(p.schoolId || '').trim();
  var grade    = String(p.grade || p.name || '').trim();
  var section  = String(p.section || '').trim();
  if (!schoolId) return {ok: false, msg: 'المدرسة مطلوبة'};
  if (!grade)    return {ok: false, msg: 'الصف مطلوب'};
  var school = _rows(SH.SCHOOLS).find(function(s) {
    return s.id === schoolId && String(s.status || 'active') !== 'deleted';
  });
  if (!school) return {ok: false, msg: 'المدرسة غير موجودة'};
  var className = _classDisplayNameNormalized(grade, section, p.name || '');
  var exists = _rows(SH.CLASSES).find(function(c) {
    return String(c.schoolId || '') === schoolId &&
      String(c.grade || c.name || '').trim() === grade &&
      String(c.section || '').trim() === section &&
      String(c.status || 'active') !== 'deleted';
  });
  if (exists) return {ok: false, msg: 'هذا الصف موجود مسبقاً'};
  var now = new Date().toISOString();
  var cls = {
    id: Utilities.getUuid(), teacherId: String(p.teacherId || '').trim(),
    teacherEmail: String(p.teacherEmail || '').trim(), name: className,
    grade: grade, schoolId: schoolId, section: section,
    status: String(p.status || 'active').trim() || 'active',
    createdAt: now, updatedAt: now
  };
  _appendObject(SH.CLASSES, cls);
  return {ok: true, data: cls, classItem: cls};
}

function _getCourses(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var all = _rows(SH.CLASSES).filter(function(c) { return String(c.status || '') === 'course'; });
  var users = _rows(SH.USERS);
  var data = all.map(function(c) {
    var trainerId = c.trainerId || c.teacherId || '';
    var trainer = trainerId ? users.find(function(u) { return u.id === trainerId; }) : null;
    return {
      id: c.id, name: c.name || '', schoolId: c.schoolId || '',
      startTime: c.startTime || '', endTime: c.endTime || '', weeks: c.weeks || '',
      trainerId: trainerId, trainerName: c.trainerName || (trainer ? trainer.name : ''),
      courseStatus: c.courseStatus || 'active', activeStatus: c.courseStatus || 'active',
      createdAt: c.createdAt || ''
    };
  });
  return {ok: true, data: data, courses: data};
}

function _createCourse(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var name     = String(p.name || '').trim();
  var schoolId = String(p.schoolId || '').trim();
  if (!name || !schoolId) return {ok: false, msg: 'اسم الدورة والمركز مطلوبان'};
  var school = _rows(SH.SCHOOLS).find(function(s) { return s.id === schoolId && String(s.status || 'active') !== 'deleted'; });
  if (!school) return {ok: false, msg: 'المركز غير موجود'};
  var now = new Date().toISOString();
  var id  = Utilities.getUuid();
  _appendObject(SH.CLASSES, {id: id, teacherId: '', teacherEmail: '', name: name, grade: '', schoolId: schoolId,
    section: '', startTime: p.startTime || '', endTime: p.endTime || '', weeks: p.weeks || '',
    trainerId: '', trainerName: '', status: 'course', courseStatus: 'active', createdAt: now, updatedAt: now});
  return {ok: true, data: {id: id, name: name, schoolId: schoolId, startTime: p.startTime || '',
    endTime: p.endTime || '', weeks: p.weeks || '', trainerId: '', trainerName: '', courseStatus: 'active', activeStatus: 'active', createdAt: now}};
}

function _updateCourse(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CLASSES, 'id', p.courseId);
  if (idx < 0) return {ok: false, msg: 'الدورة غير موجودة'};
  if (p.name      != null) _setCell(SH.CLASSES, idx, 'name', String(p.name || '').trim());
  if (p.startTime != null) _setCell(SH.CLASSES, idx, 'startTime', String(p.startTime || '').trim());
  if (p.endTime   != null) _setCell(SH.CLASSES, idx, 'endTime', String(p.endTime || '').trim());
  if (p.weeks     != null) _setCell(SH.CLASSES, idx, 'weeks', String(p.weeks || '').trim());
  if (p.trainerId   != null) { _setCell(SH.CLASSES, idx, 'trainerId', String(p.trainerId || '')); _setCell(SH.CLASSES, idx, 'teacherId', String(p.trainerId || '')); }
  if (p.trainerName != null) _setCell(SH.CLASSES, idx, 'trainerName', String(p.trainerName || ''));
  if (p.courseStatus != null) _setCell(SH.CLASSES, idx, 'courseStatus', String(p.courseStatus || 'active'));
  if (p.activeStatus != null) _setCell(SH.CLASSES, idx, 'courseStatus', String(p.activeStatus || 'active'));
  _setCell(SH.CLASSES, idx, 'updatedAt', new Date().toISOString());
  return {ok: true};
}

function _updateClass(p) {
  var token = String(p.token || '');
  var idx = _rowIdx(SH.CLASSES, 'id', p.classId);
  if (idx < 0) return {ok: false, msg: 'الصف غير موجود'};
  var sheet   = _sheet(SH.CLASSES);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row     = sheet.getRange(idx, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowTeacherId = row[headers.indexOf('teacherId')] || '';
  var reqTeacherId = String(p.teacherId || '');
  if (token !== SECRET && rowTeacherId !== reqTeacherId) return {ok: false, msg: 'غير مصرح'};
  if (p.name         != null) _setCell(SH.CLASSES, idx, 'name',         String(p.name         || '').trim());
  if (p.grade        != null) _setCell(SH.CLASSES, idx, 'grade',        String(p.grade        || '').trim());
  if (p.section      != null) _setCell(SH.CLASSES, idx, 'section',      String(p.section      || '').trim());
  if (p.schoolId     != null) _setCell(SH.CLASSES, idx, 'schoolId',     String(p.schoolId     || '').trim());
  if (p.teacherEmail != null) _setCell(SH.CLASSES, idx, 'teacherEmail', String(p.teacherEmail || '').trim());
  if (p.status       != null) _setCell(SH.CLASSES, idx, 'status',       String(p.status       || '').trim());
  if (token === SECRET && p.teacherId != null) {
    _setCell(SH.CLASSES, idx, 'teacherId', String(p.teacherId || '').trim());
    var tUser = _rows(SH.USERS).find(function(u) { return u.id === p.teacherId; });
    if (tUser && !p.teacherEmail) _setCell(SH.CLASSES, idx, 'teacherEmail', tUser.email || '');
  }
  _setCell(SH.CLASSES, idx, 'updatedAt', new Date().toISOString());
  return {ok: true};
}

function _adminCreateUser(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var role         = p.role === 'teacher' ? 'teacher' : (p.role === 'creator' ? 'creator' : 'student');
  var name         = (p.name  || '').trim();
  var email        = (p.email || '').trim().toLowerCase();
  var phone        = _normalizePhone(p.phone || '');
  var schoolId     = (p.schoolId || '').trim();
  var cls          = (p.class   || '').trim();
  var section      = (p.section || '').trim();
  var passwordHash = String(p.passwordHash || '').trim();
  if (!email)        return {ok: false, msg: 'البريد الإلكتروني مطلوب'};
  if (!passwordHash && p.password) passwordHash = _hash(String(p.password));
  if (!passwordHash) return {ok: false, msg: 'كلمة المرور مطلوبة'};
  var existingUsers = _rows(SH.USERS);
  var dup = existingUsers.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email && u.status !== 'deleted';
  });
  if (dup) return {ok: false, msg: 'البريد الإلكتروني مستخدم مسبقاً'};
  var userCode = '';
  if (role !== 'creator') {
    var existingCodes = existingUsers.map(function(u) { return _normalizeCode(u.studentCode || u.teacherCode || ''); });
    var prefix = role === 'teacher' ? 'TE' : 'ST';
    var attempts = 0;
    do { userCode = _genUserCode(prefix); attempts++; } while (existingCodes.indexOf(userCode) >= 0 && attempts < 20);
  }
  var id  = Utilities.getUuid();
  var now = new Date().toISOString();
  var user = {
    id: id, name: name, email: email, phone: phone, passwordHash: passwordHash,
    role: role, status: 'active', schoolId: schoolId, class: cls, section: section,
    studentCode: role === 'student' ? userCode : '',
    teacherCode: role === 'teacher' ? userCode : '',
    requestSource: 'admin', joinedAt: now, reviewedAt: now, updatedAt: now, leftSchool: ''
  };
  _appendObject(SH.USERS, user);
  return {ok: true, userCode: userCode, user: _safeUser(user)};
}

function _adminSetUserStatus(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.USERS, 'id', p.userId || '');
  if (idx < 0) return {ok: false, msg: 'المستخدم غير موجود'};
  if (p.status    != null) _setCell(SH.USERS, idx, 'status',    String(p.status || '').trim());
  if (p.leftSchool!= null) _setCell(SH.USERS, idx, 'leftSchool', p.leftSchool === 'true' || p.leftSchool === true);
  _setCell(SH.USERS, idx, 'updatedAt', new Date().toISOString());
  return {ok: true};
}

function _createChallenge(p) {
  var creatorId = String(p.creatorId || '').trim();
  if (!creatorId && p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  if (creatorId) {
    var creator = _rows(SH.USERS).find(function(u) { return u.id === creatorId && u.role === 'creator' && String(u.status || 'active') !== 'deleted'; });
    if (!creator) return {ok: false, msg: 'حساب المبتكر غير صالح'};
  }
  var title = (p.title || p.name || '').trim();
  var key   = (p.key || title.toLowerCase().replace(/\s+/g, '-')).trim();
  if (!title) return {ok: false, msg: 'عنوان التحدي مطلوب'};
  var exists = _rows(SH.CHALLENGES).find(function(c) { return c.key === key; });
  if (exists) return {ok: false, msg: 'مفتاح التحدي موجود مسبقاً'};
  var now  = new Date().toISOString();
  var href = p.href || p.link || p.htmlFile || '';
  var challenge = {
    id: Utilities.getUuid(), key: key, name: title, title: title,
    description: p.description || '', coverImage: p.coverImage || '',
    href: href, link: href, htmlFile: href, steps: p.steps || '[]',
    track: String(p.track || ''), difficulty: p.difficulty || 'medium',
    creatorId: creatorId, status: 'draft', createdAt: now, updatedAt: now, publishedAt: ''
  };
  _appendObject(SH.CHALLENGES, challenge);
  return {ok: true, data: _normalizeChallenge(challenge, 0), challenge: _normalizeChallenge(challenge, 0)};
}

function _getChallenges(p) {
  var assignments = _rows(SH.ASSIGNMENTS);
  var all = _rows(SH.CHALLENGES).map(function(c) {
    var assignedCount = assignments.filter(function(a) { return a.challengeKey === c.key; }).length;
    return _normalizeChallenge(c, assignedCount);
  });
  if (!p.token || p.token !== SECRET) {
    all = all.filter(function(c) { return c.status === 'published'; });
  }
  return {ok: true, data: all, challenges: all};
}

function _updateChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CHALLENGES, 'id', p.challengeId);
  if (idx < 0) return {ok: false, msg: 'التحدي غير موجود'};
  if (p.title != null || p.name != null) { var title = String(p.title || p.name || '').trim(); _setCell(SH.CHALLENGES, idx, 'title', title); _setCell(SH.CHALLENGES, idx, 'name', title); }
  if (p.description != null) _setCell(SH.CHALLENGES, idx, 'description', String(p.description || '').trim());
  if (p.coverImage  != null) _setCell(SH.CHALLENGES, idx, 'coverImage',  String(p.coverImage  || '').trim());
  if (p.href != null || p.link != null || p.htmlFile != null) { var href = String(p.href || p.link || p.htmlFile || '').trim(); _setCell(SH.CHALLENGES, idx, 'href', href); _setCell(SH.CHALLENGES, idx, 'link', href); _setCell(SH.CHALLENGES, idx, 'htmlFile', href); }
  if (p.steps      != null) _setCell(SH.CHALLENGES, idx, 'steps',      p.steps || '[]');
  if (p.track      != null) _setCell(SH.CHALLENGES, idx, 'track',      String(p.track      || '').trim());
  if (p.difficulty != null) _setCell(SH.CHALLENGES, idx, 'difficulty', String(p.difficulty || 'medium').trim());
  if (p.status     != null) _setCell(SH.CHALLENGES, idx, 'status',     String(p.status     || 'draft').trim());
  _setCell(SH.CHALLENGES, idx, 'updatedAt', new Date().toISOString());
  return {ok: true};
}

function _publishChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CHALLENGES, 'id', p.challengeId);
  if (idx < 0) return {ok: false, msg: 'التحدي غير موجود'};
  var now = new Date().toISOString();
  _setCell(SH.CHALLENGES, idx, 'status', 'published');
  _setCell(SH.CHALLENGES, idx, 'publishedAt', now);
  _setCell(SH.CHALLENGES, idx, 'updatedAt', now);
  var challenge = _rows(SH.CHALLENGES).find(function(c) { return c.id === p.challengeId; });
  _rows(SH.USERS).filter(function(u) { return u.role === 'teacher' && u.status === 'active'; }).forEach(function(t) {
    _appendNotification(t.id, 'new_challenge', 'تحدي جديد: ' + _challengeTitle(challenge), challenge ? (challenge.description || '') : '');
  });
  return {ok: true};
}

function _unpublishChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CHALLENGES, 'id', p.challengeId);
  if (idx < 0) return {ok: false, msg: 'التحدي غير موجود'};
  _setCell(SH.CHALLENGES, idx, 'status', 'draft');
  _setCell(SH.CHALLENGES, idx, 'publishedAt', '');
  _setCell(SH.CHALLENGES, idx, 'updatedAt', new Date().toISOString());
  return {ok: true};
}

function _notifyAdminNewTeacher(teacher) {
  _appendNotification('admin', 'user_request', 'طلب تسجيل معلم', (teacher.name || teacher.email || '') + ' أرسل طلب تسجيل كمعلم.');
  try {
    var base = ScriptApp.getService().getUrl();
    var approveUrl = base + '?action=approveTeacher&userId=' + teacher.id + '&token=' + SECRET;
    var rejectUrl  = base + '?action=rejectTeacher&userId='  + teacher.id + '&token=' + SECRET;
    MailApp.sendEmail(ADMIN_EMAIL, 'طلب معلم جديد', 'Approve: ' + approveUrl + '\nReject: ' + rejectUrl);
  } catch(e) { Logger.log('Email error: ' + e.message); }
}

function _notifyAdminNewStudent(student) {
  _appendNotification('admin', 'user_request', 'طلب تسجيل طالب', (student.name || student.email || '') + ' أرسل طلب تسجيل كطالب.');
}

function _notifyAdminNewCreator(creator) {
  _appendNotification('admin', 'user_request', 'طلب تسجيل مبتكر', (creator.name || creator.email || '') + ' أرسل طلب تسجيل كمبتكر.');
  try {
    var base       = ScriptApp.getService().getUrl();
    var approveUrl = base + '?action=approveCreator&userId=' + creator.id + '&token=' + SECRET;
    var rejectUrl  = base + '?action=rejectCreator&userId='  + creator.id + '&token=' + SECRET;
    var html =
      '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:auto">' +
      '<div style="background:#7c3aed;padding:20px;border-radius:12px 12px 0 0"><h2 style="color:#fff;margin:0">✨ طلب مبتكر جديد</h2></div>' +
      '<div style="background:#fff;padding:20px;border:1px solid #eee;border-top:none">' +
      '<p>' + (creator.name||'—') + ' — ' + (creator.email||'—') + '</p>' +
      '<a href="' + approveUrl + '" style="background:#22c55e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-left:8px">✅ قبول</a>' +
      '<a href="' + rejectUrl  + '" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">❌ رفض</a>' +
      '</div></div>';
    MailApp.sendEmail(ADMIN_EMAIL, '✨ طلب مبتكر: ' + (creator.name||creator.email||''), '', {htmlBody: html});
  } catch(e) {}
}
