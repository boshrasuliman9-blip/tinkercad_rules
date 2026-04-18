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
  Users:          ['id','name','email','phone','passwordHash','role','status','schoolId','class','section','studentCode','teacherCode','joinedAt','reviewedAt','leftSchool'],
  Classes:        ['id','teacherId','teacherEmail','name','schoolId','section','createdAt'],
  Assignments:    ['id','teacherId','classId','challengeKey','challengeName','expiresAt','createdAt'],
  Codes:          ['id','assignmentId','studentId','studentEmail','studentName','code','startedAt','submittedAt','status','teacherNote','createdAt'],
  Notifications:  ['id','userId','type','title','body','code','assignmentId','expiresAt','read','createdAt'],
  ResetTokens:    ['id','userId','userEmail','token','expiresAt','used','createdAt'],
  OtpCodes:       ['id','userId','phone','otp','resetToken','expiresAt','used','createdAt'],
  Schools:        ['id','name','city','type','createdAt'],
  TeacherSchools: ['id','teacherId','schoolId','createdAt'],
  Challenges:     ['id','key','name','description','coverImage','href','steps','status','createdAt','publishedAt'],
  Achievements:   ['id','teacherId','studentId','studentName','schoolId','text','badge','createdAt']
};

var _cb = '';

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

    if      (action === 'list')                result = _listSubmissions();
    else if (action === 'signUp')              result = _signUp(p);
    else if (action === 'signIn')              result = _signIn(p);
    // ── أدمن ──
    else if (action === 'getTeachers')         result = _getTeachers(p);
    else if (action === 'getStudents')         result = _getStudents(p);
    else if (action === 'approveTeacher')      result = _approveTeacher(p);
    else if (action === 'rejectTeacher')       result = _rejectTeacher(p);
    else if (action === 'approveStudent')      result = _approveStudent(p);
    else if (action === 'rejectStudent')       result = _rejectStudent(p);
    else if (action === 'generateResetLink')   result = _generateResetLink(p);
    else if (action === 'changePassword')      result = _changePassword(p);
    // ── مدارس ──
    else if (action === 'createSchool')        result = _createSchool(p);
    else if (action === 'getSchools')          result = _getSchools(p);
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
    else if (action === 'deleteChallenge')     result = _deleteChallenge(p);
    // ── استيراد Excel ──
    else if (action === 'importUsers')         result = _importUsers(p);
    else if (action === 'adminCreateUser')     result = _adminCreateUser(p);
    else if (action === 'lookupCode')          result = _lookupCode(p);
    // ── معلم — صفوف ──
    else if (action === 'getClasses')          result = _getClasses(p);
    else if (action === 'createClass')         result = _createClass(p);
    else if (action === 'deleteClass')         result = _deleteClass(p);
    // ── معلم — طلاب ──
    else if (action === 'getStudentsByClass')  result = _getStudentsByClass(p);
    else if (action === 'markStudentLeft')     result = _markStudentLeft(p);
    // ── معلم — تحديات ──
    else if (action === 'assignChallenge')     result = _assignChallenge(p);
    else if (action === 'getAssignments')      result = _getAssignments(p);
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
    joinedAt:    u.joinedAt,
    leftSchool:  _bool(u.leftSchool)
  };
}

// ════════════════════════════════════════════
//  المصادقة
// ════════════════════════════════════════════
function _signUp(p) {
  var name    = (p.name  || '').trim();
  var email   = (p.email || '').trim().toLowerCase();
  var phone   = _normalizePhone(p.phone);
  var ph      = p.passwordHash || '';
  var role    = p.role === 'teacher' ? 'teacher' : 'student';
  var userCode= _normalizeCode(p.userCode || '');
  var section = (p.section || '').trim();
  var autoApprove = String(p.autoApprove || '') === 'true';
  var initialStatus = autoApprove ? 'active' : 'pending';

  if (!name || !email || !ph) return {ok: false, msg: 'بيانات ناقصة'};

  var users = _rows(SH.USERS);

  // تحقق من الإيميل المكرر
  var exists = users.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (exists) return {ok: false, msg: 'تم التسجيل بهذا الإيميل مسبقاً'};

  var schoolId = '';
  var cls      = '';
  var studentCode = '';
  var teacherCode = '';

  if (role === 'student') {
    // الطالب يجب أن يدخل الكود
    if (!userCode) return {ok: false, msg: 'يرجى إدخال رمزك التعريفي (ST-2026-XXXX)'};
    if (!userCode.toUpperCase().startsWith('ST-')) return {ok: false, msg: 'رمز الطالب يجب أن يبدأ بـ ST-'};

    // تحقق من الكود في جدول Users (سجل موجود مسبقاً)
    var preReg = users.find(function(u) {
      return _normalizeCode(u.studentCode) === userCode && u.role === 'student' && !u.email;
    });
    if (!preReg) {
      // الكود غير موجود كسجل مسبق → ننشئ حساباً جديداً مباشرة
      studentCode = userCode;
    } else {
      // استخدام بيانات السجل المسبق
      schoolId    = preReg.schoolId || '';
      cls         = preReg.class    || '';
      section     = preReg.section  || section;
      studentCode = userCode;
      // تحديث السجل الموجود بدل إضافة جديد
      var preIdx = _rowIdx(SH.USERS, 'studentCode', userCode);
      if (preIdx > 0) {
        _setCell(SH.USERS, preIdx, 'email',        email);
        _setCell(SH.USERS, preIdx, 'phone',        phone);
        _setCell(SH.USERS, preIdx, 'passwordHash', ph);
        _setCell(SH.USERS, preIdx, 'name',         name);
        _setCell(SH.USERS, preIdx, 'status',       initialStatus);
        _setCell(SH.USERS, preIdx, 'joinedAt',     new Date().toISOString());
        var updUser = {id: preReg.id, name: name, email: email, phone: phone, role: 'student', status: initialStatus, schoolId: schoolId, class: cls, section: section, studentCode: studentCode, teacherCode: '', joinedAt: new Date().toISOString()};
        return {ok: true, pending: !autoApprove, user: _safeUser(updUser)};
      }
    }
  } else {
    // معلم
    if (!userCode) return {ok: false, msg: 'يرجى إدخال رمزك التعريفي (TE-2026-XXXX)'};
    if (!userCode.toUpperCase().startsWith('TE-')) return {ok: false, msg: 'رمز المعلم يجب أن يبدأ بـ TE-'};

    var preRegT = users.find(function(u) {
      return _normalizeCode(u.teacherCode) === userCode && u.role === 'teacher' && !u.email;
    });
    if (!preRegT) {
      teacherCode = userCode;
    } else {
      schoolId    = preRegT.schoolId || '';
      teacherCode = userCode;
      var preIdxT = _rowIdx(SH.USERS, 'teacherCode', userCode);
      if (preIdxT > 0) {
        _setCell(SH.USERS, preIdxT, 'email',        email);
        _setCell(SH.USERS, preIdxT, 'phone',        phone);
        _setCell(SH.USERS, preIdxT, 'passwordHash', ph);
        _setCell(SH.USERS, preIdxT, 'name',         name);
        _setCell(SH.USERS, preIdxT, 'status',       initialStatus);
        _setCell(SH.USERS, preIdxT, 'joinedAt',     new Date().toISOString());
        var updUserT = {id: preRegT.id, name: name, email: email, phone: phone, role: 'teacher', status: initialStatus, schoolId: schoolId, class: '', section: '', studentCode: '', teacherCode: teacherCode, joinedAt: new Date().toISOString()};
        if (!autoApprove) _notifyAdminNewTeacher(updUserT);
        return {ok: true, pending: !autoApprove, user: _safeUser(updUserT)};
      }
    }
  }

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
    joinedAt:     now,
    reviewedAt:   '',
    leftSchool:   ''
  });

  var user = {id: id, name: name, email: email, phone: phone, role: role, status: initialStatus, schoolId: schoolId, class: cls, section: section, studentCode: studentCode, teacherCode: teacherCode, joinedAt: now};
  if (role === 'teacher' && !autoApprove) _notifyAdminNewTeacher(user);
  return {ok: true, pending: !autoApprove, user: _safeUser(user)};
}

function _signIn(p) {
  var email = (p.email || '').trim().toLowerCase();
  var ph    = String(p.passwordHash || '').trim();
  var role  = p.role === 'teacher' ? 'teacher' : 'student';
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
      return {ok: false, msg: byEmail.role === 'teacher' ? 'هذا البريد مسجل كمعلم' : 'هذا البريد مسجل كطالب'};
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
  var data = _rows(SH.USERS).filter(function(u) { return u.role === 'teacher'; }).map(_safeUser);
  return {ok: true, data: data, teachers: data};
}

function _getStudents(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var data = _rows(SH.USERS).filter(function(u) { return u.role === 'student'; }).map(_safeUser);
  return {ok: true, data: data, students: data};
}

function _approveTeacher(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'المعلم غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'active');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  var teacher = _rows(SH.USERS).find(function(u) { return u.id === p.userId; });
  if (teacher && teacher.email) {
    try { GmailApp.sendEmail(teacher.email, 'تم قبول حسابك — Circuit Quest', 'مرحباً ' + teacher.name + '،\n\nتم قبول حسابك كمعلم. يمكنك الدخول من: ' + _siteUrl() + '/teacher/index.html'); } catch(e) {}
  }
  if (!p.ajax) return _htmlPage('✅ تم قبول المعلم!', '#f0fdf4', '#16a34a');
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
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'الطالب غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'active');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
  return {ok: true};
}

function _rejectStudent(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.USERS, 'id', p.userId);
  if (idx < 0) return {ok: false, msg: 'الطالب غير موجود'};
  _setCell(SH.USERS, idx, 'status', 'rejected');
  _setCell(SH.USERS, idx, 'reviewedAt', new Date().toISOString());
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
function _createSchool(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var name = (p.name || '').trim();
  var city = (p.city || '').trim();
  var type = p.type === 'center' ? 'center' : 'school';
  if (!name || !city) return {ok: false, msg: 'الاسم والمدينة مطلوبان'};
  var exists = _rows(SH.SCHOOLS).find(function(s) { return s.name.toLowerCase() === name.toLowerCase(); });
  if (exists) return {ok: false, msg: 'هذه المدرسة/المركز موجود مسبقاً'};
  var id  = Utilities.getUuid();
  var now = new Date().toISOString();
  _appendObject(SH.SCHOOLS, {id: id, name: name, city: city, type: type, createdAt: now});
  return {ok: true, data: {id: id, name: name, city: city, type: type, createdAt: now}};
}

function _getSchools(p) {
  var data = _rows(SH.SCHOOLS);
  return {ok: true, data: data, schools: data};
}

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
function _createChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var name = (p.name || '').trim();
  var key  = (p.key  || name.toLowerCase().replace(/\s+/g, '-')).trim();
  if (!name) return {ok: false, msg: 'اسم التحدي مطلوب'};
  var exists = _rows(SH.CHALLENGES).find(function(c) { return c.key === key; });
  if (exists) return {ok: false, msg: 'مفتاح التحدي موجود مسبقاً'};
  var id  = Utilities.getUuid();
  var now = new Date().toISOString();
  _appendObject(SH.CHALLENGES, {
    id: id, key: key, name: name,
    description: p.description || '',
    coverImage:  p.coverImage  || '',
    href:        p.href        || '',
    steps:       p.steps       || '[]',
    status:      'draft',
    createdAt:   now,
    publishedAt: ''
  });
  return {ok: true, data: {id: id, key: key, name: name, status: 'draft', createdAt: now}};
}

function _getChallenges(p) {
  var all = _rows(SH.CHALLENGES);
  // بدون token → فقط المنشورة
  if (!p.token || p.token !== SECRET) {
    all = all.filter(function(c) { return c.status === 'published'; });
  }
  return {ok: true, data: all, challenges: all};
}

function _updateChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CHALLENGES, 'id', p.challengeId);
  if (idx < 0) return {ok: false, msg: 'التحدي غير موجود'};
  if (p.name)        _setCell(SH.CHALLENGES, idx, 'name',        p.name);
  if (p.description) _setCell(SH.CHALLENGES, idx, 'description', p.description);
  if (p.coverImage)  _setCell(SH.CHALLENGES, idx, 'coverImage',  p.coverImage);
  if (p.href)        _setCell(SH.CHALLENGES, idx, 'href',        p.href);
  if (p.steps)       _setCell(SH.CHALLENGES, idx, 'steps',       p.steps);
  return {ok: true};
}

function _publishChallenge(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var idx = _rowIdx(SH.CHALLENGES, 'id', p.challengeId);
  if (idx < 0) return {ok: false, msg: 'التحدي غير موجود'};
  var now = new Date().toISOString();
  _setCell(SH.CHALLENGES, idx, 'status',      'published');
  _setCell(SH.CHALLENGES, idx, 'publishedAt', now);
  // إشعار كل المعلمين
  var challenge = _rows(SH.CHALLENGES).find(function(c) { return c.id === p.challengeId; });
  var teachers  = _rows(SH.USERS).filter(function(u) { return u.role === 'teacher' && u.status === 'active'; });
  var notifSheet = _sheet(SH.NOTIFICATIONS);
  teachers.forEach(function(t) {
    notifSheet.appendRow([
      Utilities.getUuid(), t.id, 'new_challenge',
      'تحدي جديد: ' + (challenge ? challenge.name : ''),
      challenge ? (challenge.description || '') : '',
      '', '', '', false, now
    ]);
  });
  return {ok: true};
}

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

// ════════════════════════════════════════════
//  إنشاء مستخدم مباشر بواسطة الأدمن
// ════════════════════════════════════════════
function _adminCreateUser(p) {
  if (p.token !== SECRET) return {ok: false, msg: 'غير مصرح'};
  var name    = (p.name    || '').trim();
  var email   = (p.email   || '').trim().toLowerCase();
  var phone   = _normalizePhone(p.phone || '');
  var ph      = p.passwordHash || '';
  var role    = p.role === 'teacher' ? 'teacher' : 'student';
  var schoolId= (p.schoolId || '').trim();
  var cls     = (p.class   || '').trim();
  var section = (p.section || '').trim();

  if (!name || !email || !ph) return {ok: false, msg: 'الاسم والبريد وكلمة المرور مطلوبة'};

  var existingUsers = _rows(SH.USERS);

  // تحقق من تكرار الإيميل
  var dup = existingUsers.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (dup) return {ok: false, msg: 'البريد الإلكتروني مستخدم مسبقاً'};

  // توليد رمز تعريفي فريد
  var existingCodes = existingUsers.map(function(u) {
    return _normalizeCode(u.studentCode || u.teacherCode || '');
  });
  var prefix   = role === 'teacher' ? 'TE' : 'ST';
  var userCode = '';
  var attempts = 0;
  do {
    userCode = _genUserCode(prefix);
    attempts++;
  } while (existingCodes.indexOf(userCode) >= 0 && attempts < 20);

  var id  = Utilities.getUuid();
  var now = new Date().toISOString();
  _appendObject(SH.USERS, {
    id:           id,
    name:         name,
    email:        email,
    phone:        phone,
    passwordHash: ph,
    role:         role,
    status:       'active',
    schoolId:     schoolId,
    class:        cls,
    section:      section,
    studentCode:  role === 'student' ? userCode : '',
    teacherCode:  role === 'teacher' ? userCode : '',
    joinedAt:     now,
    reviewedAt:   now,
    leftSchool:   ''
  });

  return {
    ok:       true,
    userCode: userCode,
    user:     {id: id, name: name, email: email, role: role, status: 'active',
               studentCode: role === 'student' ? userCode : '',
               teacherCode: role === 'teacher' ? userCode : ''}
  };
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
  } else {
    return {ok: false, msg: 'الرمز غير صالح. يجب أن يبدأ بـ ST- أو TE-'};
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
function _getClasses(p) {
  var data = _rows(SH.CLASSES).filter(function(c) { return c.teacherId === p.teacherId; });
  var schools = _rows(SH.SCHOOLS);
  var users = _rows(SH.USERS);
  data = data.map(function(c) {
    var s = schools.find(function(sc) { return sc.id === (c.schoolId || c.school); });
    var schoolId = c.schoolId || c.school || '';
    var studentCount = users.filter(function(u) {
      return u.role === 'student' &&
             !_bool(u.leftSchool) &&
             (u.schoolId || u.school || '') === schoolId &&
             (u.class || '') === c.name;
    }).length;
    return {id: c.id, teacherId: c.teacherId, name: c.name, schoolId: schoolId, schoolName: s ? s.name : '', section: c.section || '', studentCount: studentCount, createdAt: c.createdAt};
  });
  return {ok: true, data: data, classes: data};
}

function _createClass(p) {
  var name      = (p.name  || '').trim();
  var schoolId  = (p.schoolId || p.school || '').trim();
  var section   = (p.section || '').trim();
  var teacherId = p.teacherId || '';
  if (!name || !teacherId) return {ok: false, msg: 'بيانات ناقصة'};
  var exists = _rows(SH.CLASSES).find(function(c) {
    return c.teacherId === teacherId && c.name.toLowerCase() === name.toLowerCase() && (c.schoolId || c.school) === schoolId;
  });
  if (exists) return {ok: false, msg: 'الصف موجود مسبقاً'};
  var id  = Utilities.getUuid();
  var now = new Date().toISOString();
  _appendObject(SH.CLASSES, {id: id, teacherId: teacherId, teacherEmail: p.teacherEmail || '', name: name, schoolId: schoolId, section: section, createdAt: now});
  return {ok: true, data: {id: id, teacherId: teacherId, name: name, schoolId: schoolId, section: section, createdAt: now}};
}

function _deleteClass(p) {
  var idx = _rowIdx(SH.CLASSES, 'id', p.classId);
  if (idx < 0) return {ok: false, msg: 'الصف غير موجود'};
  var sheet   = _sheet(SH.CLASSES);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row     = sheet.getRange(idx, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (row[headers.indexOf('teacherId')] !== p.teacherId) return {ok: false, msg: 'غير مصرح'};
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
  try { studentIds = JSON.parse(p.studentIds || '[]'); } catch(e) {}
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
  try { GmailApp.sendEmail(user.email, 'إعادة تعيين كلمة المرور — Circuit Quest', 'الرابط صالح 24 ساعة:\n' + resetLink); } catch(e) {}
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
  try { GmailApp.sendEmail(ADMIN_EMAIL, '🔔 طالب جديد: '+(p.name||'')+' — '+(p.challenge||''), '', {htmlBody: _submissionEmail(p, approveUrl, rejectUrl)}); } catch(e) {}
  return _json({submitted: true, id: id});
}

function _approveSubmission(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌','#fef2f2','#dc2626');
  _updateSubmissionStatus(p.id, 'approved');
  return _htmlPage('✅ تم النشر!','#f0fdf4','#16a34a');
}

function _rejectSubmission(p) {
  if (p.token !== SECRET) return _htmlPage('غير مصرح ❌','#fef2f2','#dc2626');
  _updateSubmissionStatus(p.id, 'rejected');
  return _htmlPage('❌ تم الرفض','#fef2f2','#dc2626');
}

function _listSubmissions() {
  var rows = _getSubmissionsSheet().getDataRange().getValues();
  var res  = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][5] === 'approved') res.push({id:rows[i][0],name:rows[i][1],school:rows[i][2],challenge:rows[i][3],imageUrl:rows[i][4],date:rows[i][6]?rows[i][6].toString():''});
  }
  return res;
}

function _updateSubmissionStatus(id, status) {
  var sheet = _getSubmissionsSheet();
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { sheet.getRange(i+1, 6).setValue(status); return; }
  }
}

// ════════════════════════════════════════════
//  إشعار الأدمن بمعلم جديد
// ════════════════════════════════════════════
function _notifyAdminNewTeacher(teacher) {
  try {
    var base       = ScriptApp.getService().getUrl();
    var approveUrl = base + '?action=approveTeacher&userId=' + teacher.id + '&token=' + SECRET;
    var rejectUrl  = base + '?action=rejectTeacher&userId='  + teacher.id + '&token=' + SECRET;
    var html =
      '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:auto">' +
      '<div style="background:#16a34a;padding:20px;border-radius:12px 12px 0 0"><h2 style="color:#fff;margin:0">👨‍🏫 طلب معلم جديد</h2></div>' +
      '<div style="background:#fff;padding:20px;border:1px solid #eee;border-top:none">' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
      '<tr style="background:#f8f8f8"><td style="padding:10px;font-weight:700">الاسم</td><td style="padding:10px">' + teacher.name + '</td></tr>' +
      '<tr><td style="padding:10px;font-weight:700">البريد</td><td style="padding:10px">' + (teacher.email||'—') + '</td></tr>' +
      '<tr style="background:#f8f8f8"><td style="padding:10px;font-weight:700">الرمز</td><td style="padding:10px">' + (teacher.teacherCode||'—') + '</td></tr>' +
      '</table>' +
      '<a href="' + approveUrl + '" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-left:8px">✅ قبول</a>' +
      '<a href="' + rejectUrl  + '" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">❌ رفض</a>' +
      '</div></div>';
    GmailApp.sendEmail(ADMIN_EMAIL, '👨‍🏫 طلب معلم: ' + teacher.name, '', {htmlBody: html});
  } catch(e) {}
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
