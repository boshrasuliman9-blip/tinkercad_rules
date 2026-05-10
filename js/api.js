/* ============================================
   Circuit Quest — API Module
   وسيط بين الواجهة وGoogle Apps Script
   ============================================ */

var CQ_API = (function () {

  function _call(params) {
    return new Promise(function (resolve) {
      if (_mockEnabled()) {
        setTimeout(function () { resolve(_mockCall(params)); }, 120);
        return;
      }

      var cbName = 'cq_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e5);
      params.callback = cbName;

      var qs = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k] == null ? '' : params[k]);
      }).join('&');

      var script  = document.createElement('script');
      script.src  = CQ.scriptUrl + '?' + qs;

      var timer = setTimeout(function () {
        cleanup();
        resolve({ok: false, msg: 'انتهت مهلة الاتصال'});
      }, 45000);

      window[cbName] = function (data) { cleanup(); resolve(data); };

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.onerror = function () { cleanup(); resolve({ok: false, msg: 'تعذر الاتصال بالخادم'}); };
      document.head.appendChild(script);
    });
  }

  function _siteBaseUrl() {
    return window.location.href.split(/[?#]/)[0].replace(/\/[^\/]*$/, '');
  }

  function _autoApproveFlag() {
    return (window.CQ && CQ.auth && CQ.auth.requireApproval === false) ? 'true' : 'false';
  }

  function _mockEnabled() {
    return !!(window.CQ && CQ.auth && CQ.auth.requireApproval === false);
  }

  var MOCK_KEY = 'cq_mock_db_v1';

  function _id(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
  }

  function _daysFromNow(days) {
    return new Date(Date.now() + days * 86400000).toISOString();
  }

  function _mockSeed() {
    var existing = localStorage.getItem(MOCK_KEY);
    if (existing) {
      try {
        var parsed = JSON.parse(existing);
        if (!parsed.creators) parsed.creators = [];
        if (!parsed.notifs) parsed.notifs = [];
        if (!parsed.codes) parsed.codes = [];
        if (!parsed.assignments) parsed.assignments = [];
        return parsed;
      } catch (e) {}
    }

    var now = new Date().toISOString();
    var db = {
      schools: [
        {id:'sch-arc',  name:'مدرسة الإبداع',    city:'عمّان', type:'school',  status:'active', createdAt:now},
        {id:'sch-stem', name:'مركز STEM الصغير', city:'إربد',  type:'center', status:'active', createdAt:now}
      ],
      teachers: [
        {id:'teacher1', name:'أحمد محمود',  email:'ahmad@school.com',  teacherCode:'TE-1001', role:'teacher', status:'active',  schoolId:'sch-arc',  createdAt:now},
        {id:'teacher2', name:'سارة الخالد', email:'sara@school.com',   teacherCode:'TE-1002', role:'teacher', status:'active',  schoolId:'sch-arc',  createdAt:now},
        {id:'teacher3', name:'محمد علي',    email:'mohamad@stem.com',  teacherCode:'TE-1003', role:'teacher', status:'pending', schoolId:'sch-stem', createdAt:now}
      ],
      classes: [
        {id:'cls-8a', teacherId:'teacher1', teacherEmail:'ahmad@school.com',  name:'الثامن أ',  grade:'الثامن',  schoolId:'sch-arc',  schoolName:'مدرسة الإبداع',    section:'ا', studentCount:5, createdAt:now},
        {id:'cls-9b', teacherId:'teacher2', teacherEmail:'sara@school.com',   name:'التاسع ب',  grade:'التاسع',  schoolId:'sch-arc',  schoolName:'مدرسة الإبداع',    section:'ب', studentCount:4, createdAt:now},
        {id:'cls-7a', teacherId:'teacher3', teacherEmail:'mohamad@stem.com',  name:'السابع ا',  grade:'السابع',  schoolId:'sch-stem', schoolName:'مركز STEM الصغير', section:'ا', studentCount:3, createdAt:now}
      ],
      students: [
        {id:'stu-aya', name:'آية خليل', email:'aya@example.com', studentCode:'ST-2026-1001', schoolId:'sch-arc', class:'الصف الثامن أ', section:'أ', status:'active', hasAccount:true, leftSchool:false},
        {id:'stu-omar', name:'عمر زيد', email:'omar@example.com', studentCode:'ST-2026-1002', schoolId:'sch-arc', class:'الصف الثامن أ', section:'أ', status:'active', hasAccount:true, leftSchool:false},
        {id:'stu-lina', name:'لينا سالم', email:'lina@example.com', studentCode:'ST-2026-1003', schoolId:'sch-arc', class:'الصف الثامن أ', section:'أ', status:'active', hasAccount:true, leftSchool:false},
        {id:'stu-yazan', name:'يزن ناصر', email:'yazan@example.com', studentCode:'ST-2026-1004', schoolId:'sch-arc', class:'الصف الثامن أ', section:'أ', status:'active', hasAccount:false, leftSchool:false},
        {id:'stu-mira', name:'ميرا حسن', email:'mira@example.com', studentCode:'ST-2026-1005', schoolId:'sch-arc', class:'الصف الثامن أ', section:'أ', status:'active', hasAccount:true, leftSchool:false},
        {id:'stu-sara', name:'سارة عادل', email:'sara@example.com', studentCode:'ST-2026-2001', schoolId:'sch-stem', class:'الصف التاسع ب', section:'ب', status:'active', hasAccount:true, leftSchool:false},
        {id:'stu-kenan', name:'كنان مراد', email:'kenan@example.com', studentCode:'ST-2026-2002', schoolId:'sch-stem', class:'الصف التاسع ب', section:'ب', status:'active', hasAccount:true, leftSchool:false},
        {id:'stu-nour', name:'نور خالد', email:'nour@example.com', studentCode:'ST-2026-2003', schoolId:'sch-stem', class:'الصف التاسع ب', section:'ب', status:'active', hasAccount:false, leftSchool:false},
        {id:'stu-rami', name:'رامي فارس', email:'rami@example.com', studentCode:'ST-2026-2004', schoolId:'sch-stem', class:'الصف التاسع ب', section:'ب', status:'active', hasAccount:true, leftSchool:false}
      ],
      challenges: [
        {id:'chal-led', key:'led', name:'إضاءة LED', description:'شغّل LED يومض كل ثانية باستخدام Arduino.', coverImage:'./img/challenge-covers/led-challenge.png', href:'./student/tracks/challenges/track-2-led-challenge.html', steps:'[]', status:'published', createdAt:now, publishedAt:now},
        {id:'chal-push', key:'push-button', name:'Push Button', description:'تحكم بإضاءة LED باستخدام زر ضغط.', coverImage:'./img/challenge-covers/pushbutton-challenge.png', href:'./student/tracks/challenges/track-2-pushbutton-challenge.html', steps:'[]', status:'published', createdAt:now, publishedAt:now}
      ],
      assignments: [
        {id:'asg-led-8a', teacherId:'dev-teacher-dashboard', classId:'cls-8a', className:'الصف الثامن أ', challengeKey:'led', challengeName:'إضاءة LED', challengeHref:'./student/tracks/challenges/track-2-led-challenge.html', expiresAt:_daysFromNow(3), createdAt:_daysFromNow(-2)},
        {id:'asg-push-8a', teacherId:'dev-teacher-dashboard', classId:'cls-8a', className:'الصف الثامن أ', challengeKey:'push-button', challengeName:'Push Button', challengeHref:'./student/tracks/challenges/track-2-pushbutton-challenge.html', expiresAt:_daysFromNow(7), createdAt:_daysFromNow(-1)},
        {id:'asg-led-9b', teacherId:'dev-teacher-dashboard', classId:'cls-9b', className:'الصف التاسع ب', challengeKey:'led', challengeName:'إضاءة LED', challengeHref:'./student/tracks/challenges/track-2-led-challenge.html', expiresAt:_daysFromNow(1), createdAt:_daysFromNow(-1)}
      ],
      codes: [
        {id:'code-aya-led', assignmentId:'asg-led-8a', studentId:'stu-aya', studentEmail:'aya@example.com', studentName:'آية خليل', code:'LEDAYA01', startedAt:_daysFromNow(-2), submittedAt:_daysFromNow(-2), status:'submitted', teacherNote:'', createdAt:_daysFromNow(-2)},
        {id:'code-omar-led', assignmentId:'asg-led-8a', studentId:'stu-omar', studentEmail:'omar@example.com', studentName:'عمر زيد', code:'LEDOMAR1', startedAt:_daysFromNow(-2), submittedAt:_daysFromNow(-1), status:'approved', teacherNote:'', createdAt:_daysFromNow(-2)},
        {id:'code-lina-led', assignmentId:'asg-led-8a', studentId:'stu-lina', studentEmail:'lina@example.com', studentName:'لينا سالم', code:'LEDLINA1', startedAt:_daysFromNow(-1), submittedAt:_daysFromNow(-1), status:'rejected', teacherNote:'راجعي اتجاه الـ LED والمقاومة.', createdAt:_daysFromNow(-2)},
        {id:'code-mira-led', assignmentId:'asg-led-8a', studentId:'stu-mira', studentEmail:'mira@example.com', studentName:'ميرا حسن', code:'LEDMIRA1', startedAt:_daysFromNow(-1), submittedAt:'', status:'started', teacherNote:'', createdAt:_daysFromNow(-2)},
        {id:'code-sara-led', assignmentId:'asg-led-9b', studentId:'stu-sara', studentEmail:'sara@example.com', studentName:'سارة عادل', code:'LEDSARA1', startedAt:_daysFromNow(-1), submittedAt:_daysFromNow(-1), status:'submitted', teacherNote:'', createdAt:_daysFromNow(-1)},
        {id:'code-kenan-led', assignmentId:'asg-led-9b', studentId:'stu-kenan', studentEmail:'kenan@example.com', studentName:'كنان مراد', code:'LEDKENAN', startedAt:_daysFromNow(-1), submittedAt:_daysFromNow(-1), status:'approved', teacherNote:'', createdAt:_daysFromNow(-1)}
      ],
      achievements: [
        {id:'ach-1', teacherId:'dev-teacher-dashboard', studentId:'stu-omar', studentName:'عمر زيد', schoolId:'sch-arc', text:'أسرع حل صحيح لتحدي LED', badge:'rocket', createdAt:_daysFromNow(-1)}
      ],
      creators: [],
      notifs: [
        {id:'nt-1', userId:'dev-teacher-dashboard', type:'submission', title:'تسليم جديد', body:'آية خليل سلّمت تحدي إضاءة LED', message:'آية خليل سلّمت تحدي إضاءة LED', read:false, readAt:'', createdAt:_daysFromNow(-1)},
        {id:'nt-2', userId:'dev-teacher-dashboard', type:'new_challenge', title:'تحدي جديد', body:'تحدي Push Button متاح للتعيين', message:'تحدي Push Button متاح للتعيين', read:false, readAt:'', createdAt:_daysFromNow(-2)},
        {id:'nt-stu-aya-led', userId:'stu-aya', type:'challenge', title:'تحدي جديد: إضاءة LED', body:'كودك الخاص للتحدي', code:'LEDAYA01', assignmentId:'asg-led-8a', expiresAt:_daysFromNow(3), read:false, readAt:'', createdAt:_daysFromNow(-2)},
        {id:'nt-stu-omar-led', userId:'stu-omar', type:'challenge', title:'تحدي جديد: إضاءة LED', body:'كودك الخاص للتحدي', code:'LEDOMAR1', assignmentId:'asg-led-8a', expiresAt:_daysFromNow(3), read:false, readAt:'', createdAt:_daysFromNow(-2)},
        {id:'nt-stu-lina-led', userId:'stu-lina', type:'challenge', title:'تحدي جديد: إضاءة LED', body:'كودك الخاص للتحدي', code:'LEDLINA1', assignmentId:'asg-led-8a', expiresAt:_daysFromNow(3), read:false, readAt:'', createdAt:_daysFromNow(-2)},
        {id:'nt-stu-mira-led', userId:'stu-mira', type:'challenge', title:'تحدي جديد: إضاءة LED', body:'كودك الخاص للتحدي', code:'LEDMIRA1', assignmentId:'asg-led-8a', expiresAt:_daysFromNow(3), read:false, readAt:'', createdAt:_daysFromNow(-2)},
        {id:'nt-stu-sara-led', userId:'stu-sara', type:'challenge', title:'تحدي جديد: إضاءة LED', body:'كودك الخاص للتحدي', code:'LEDSARA1', assignmentId:'asg-led-9b', expiresAt:_daysFromNow(1), read:false, readAt:'', createdAt:_daysFromNow(-1)},
        {id:'nt-stu-kenan-led', userId:'stu-kenan', type:'challenge', title:'تحدي جديد: إضاءة LED', body:'كودك الخاص للتحدي', code:'LEDKENAN', assignmentId:'asg-led-9b', expiresAt:_daysFromNow(1), read:false, readAt:'', createdAt:_daysFromNow(-1)}
      ]
    };
    _mockSave(db);
    return db;
  }

  function _mockSave(db) {
    localStorage.setItem(MOCK_KEY, JSON.stringify(db));
  }

  function _mockClassName(db, classId) {
    var cls = db.classes.find(function(c) { return c.id === classId; });
    return cls ? cls.name : '';
  }

  function _mockStudentMatchesClass(student, cls) {
    if (!student || !cls) return false;
    if ((student.schoolId || '') !== (cls.schoolId || '')) return false;
    function key(value) {
      return String(value || '')
        .replace(/[\u0623\u0625\u0622]/g, '\u0627')
        .replace(/[\u0629]/g, '\u0647')
        .replace(/\u0627\u0644\u0635\u0641/g, '')
        .replace(/\u0635\u0641/g, '')
        .replace(/[\u0640\-\s]+/g, '')
        .trim();
    }
    var grade = String(cls.grade || cls.name || '').trim();
    var section = String(cls.section || '').trim();
    var clsName = (grade + (section ? ' ' + section : '')).trim();
    var sClass = String(student.class || '').trim();
    var sSection = String(student.section || '').trim();
    var combined = (sClass + (sSection ? ' ' + sSection : '')).trim();
    return sClass === cls.id || sClass === cls.name || sClass === clsName || combined === clsName ||
      combined === cls.name || (key(combined || sClass) && (key(combined || sClass) === key(clsName) || key(combined || sClass) === key(cls.name))) ||
      (grade && sClass === grade && (!section || sSection === section));
  }

  function _mockAssignExistingChallengesToStudent(db, student) {
    if (!student || student.role && student.role !== 'student') return 0;
    if (student.status && student.status !== 'active') return 0;
    if (student.leftSchool) return 0;
    var now = new Date();
    var classes = db.classes.filter(function(cls) { return _mockStudentMatchesClass(student, cls); });
    var classIds = classes.map(function(cls) { return cls.id; });
    var created = 0;
    db.assignments.filter(function(a) {
      if (classIds.indexOf(a.classId) < 0) return false;
      if (a.expiresAt && new Date(a.expiresAt) < now) return false;
      return true;
    }).forEach(function(a) {
      var exists = db.codes.some(function(c) { return c.assignmentId === a.id && c.studentId === student.id; });
      if (exists) return;
      var code = ('CQ' + Math.random().toString(36).slice(2, 8)).toUpperCase();
      var createdAt = new Date().toISOString();
      db.codes.push({id:_id('code'), assignmentId:a.id, studentId:student.id, studentEmail:student.email || '', studentName:student.name || '', code:code, startedAt:'', submittedAt:'', status:'assigned', teacherNote:'', createdAt:createdAt});
      db.notifs.push({id:_id('nt'), userId:student.id, type:'challenge', title:'تحدي جديد: ' + (a.challengeName || 'تحدي'), body:'كودك الخاص للتحدي', code:code, assignmentId:a.id, expiresAt:a.expiresAt || '', read:false, readAt:'', createdAt:createdAt});
      created++;
    });
    return created;
  }

  function _mockDecorateAssignments(db, teacherId) {
    return db.assignments.filter(function(a) { return !teacherId || a.teacherId === teacherId; }).map(function(a) {
      var related = db.codes.filter(function(c) { return c.assignmentId === a.id; });
      return Object.assign({}, a, {
        className: a.className || _mockClassName(db, a.classId),
        totalCount: related.length,
        submittedCount: related.filter(function(c) { return !!c.submittedAt; }).length,
        pendingCount: related.filter(function(c) { return c.status === 'submitted'; }).length,
        approvedCount: related.filter(function(c) { return c.status === 'approved'; }).length,
        rejectedCount: related.filter(function(c) { return c.status === 'rejected'; }).length
      });
    });
  }

  function _mockSubmissions(db, assignmentId) {
    return db.codes.filter(function(c) { return c.assignmentId === assignmentId && c.submittedAt; }).sort(function(a, b) {
      return (new Date(a.submittedAt) - new Date(a.startedAt)) - (new Date(b.submittedAt) - new Date(b.startedAt));
    }).map(function(c, i) {
      return Object.assign({rank:i + 1, codeId:c.id, studentCode:c.code, duration:Math.round((new Date(c.submittedAt) - new Date(c.startedAt)) / 60000)}, c);
    });
  }

  function _mockWinners(db, schoolId) {
    var assignments = db.assignments;
    var results = db.codes.filter(function(c) { return c.status === 'approved' && c.startedAt && c.submittedAt; }).map(function(c) {
      var student = db.students.find(function(s) { return s.id === c.studentId; }) || {};
      var school = db.schools.find(function(s) { return s.id === student.schoolId; }) || {};
      var assign = assignments.find(function(a) { return a.id === c.assignmentId; }) || {};
      return {
        studentId:c.studentId,
        studentName:c.studentName,
        schoolId:student.schoolId || '',
        schoolName:school.name || '',
        challengeKey:assign.challengeKey || '',
        challengeName:assign.challengeName || '',
        startedAt:c.startedAt,
        submittedAt:c.submittedAt,
        durationSec:Math.round((new Date(c.submittedAt) - new Date(c.startedAt)) / 1000)
      };
    }).sort(function(a, b) { return a.durationSec - b.durationSec; });
    return {global:results.slice(0, 10), local:results.filter(function(r) { return r.schoolId === schoolId; }).slice(0, 10)};
  }

  function _mockCall(params) {
    var db = _mockSeed();
    var action = params.action || '';

    if (action === 'signIn') {
      var role = params.role === 'teacher' ? 'teacher' : (params.role === 'creator' ? 'creator' : 'student');
      return {ok:true, user:{id: role === 'teacher' ? 'dev-teacher-dashboard' : (role === 'creator' ? 'dev-creator-dashboard' : 'stu-aya'), name: role === 'teacher' ? 'معلم تجريبي' : (role === 'creator' ? 'مبتكر تجريبي' : 'آية خليل'), email: params.email || '', role: role, status:'active', teacherCode: role === 'teacher' ? 'DEV-TEACHER' : '', studentCode: role === 'student' ? 'ST-2026-1001' : '', creatorCode: role === 'creator' ? 'DEV-CREATOR' : ''}};
    }
    if (action === 'signUp') return _mockCall({action:'signIn', role:params.role, email:params.email});
    if (action === 'getSchools') return {ok:true, data:db.schools, schools:db.schools};
    if (action === 'getClasses') return {ok:true, data:db.classes, classes:db.classes};
    if (action === 'getCourses') return {ok:true, data:db.courses||[], courses:db.courses||[]};
    if (action === 'getStudentsByClass') {
      var cls = db.classes.find(function(c) { return c.id === params.classId; });
      var students = cls ? db.students.filter(function(s) { return s.schoolId === cls.schoolId && s.class === cls.name && !s.leftSchool; }) : [];
      return {ok:true, data:students, students:students};
    }
    if (action === 'markStudentLeft') {
      var st = db.students.find(function(s) { return s.id === params.studentId; });
      if (st) st.leftSchool = params.left === 'true';
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'createClass') {
      var school = db.schools.find(function(s) { return s.id === params.schoolId; }) || {};
      var clsNew = {id:_id('cls'), teacherId:params.teacherId, teacherEmail:params.teacherEmail, name:params.name, schoolId:params.schoolId, schoolName:school.name || '', section:params.section || '', studentCount:0, createdAt:new Date().toISOString()};
      db.classes.push(clsNew);
      _mockSave(db);
      return {ok:true, data:clsNew};
    }
    if (action === 'deleteClass') {
      db.classes = db.classes.filter(function(c) { return c.id !== params.classId; });
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'updateClass') {
      var updCls = db.classes.find(function(c) { return c.id === params.classId; });
      if (!updCls) return {ok:false, msg:'الصف غير موجود'};
      if (params.name      != null) updCls.name      = params.name;
      if (params.section   != null) updCls.section   = params.section;
      if (params.teacherId != null) updCls.teacherId = params.teacherId;
      if (params.teacherEmail != null) updCls.teacherEmail = params.teacherEmail;
      if (params.assistantTeacherId != null) updCls.assistantTeacherId = params.assistantTeacherId;
      if (params.assistantTeacherName != null) updCls.assistantTeacherName = params.assistantTeacherName;
      if (params.status    != null) updCls.status    = params.status;
      _mockSave(db); return {ok:true};
    }
    if (action === 'getChallenges') return {ok:true, data:db.challenges, challenges:db.challenges};
    if (action === 'createChallenge') {
      var created = {
        id:_id('chal'),
        key:params.key || String(params.name || 'challenge').toLowerCase().replace(/\s+/g, '-'),
        name:params.name || 'تحدي جديد',
        description:params.description || '',
        coverImage:params.coverImage || '',
        href:params.href || '',
        steps:params.steps || '[]',
        status:'draft',
        createdAt:new Date().toISOString(),
        publishedAt:''
      };
      db.challenges.push(created);
      _mockSave(db);
      return {ok:true, data:created, challenge:created};
    }
    if (action === 'updateChallenge') {
      var upd = db.challenges.find(function(c) { return c.id === params.challengeId; });
      if (!upd) return {ok:false, msg:'التحدي غير موجود'};
      ['key','name','description','coverImage','href','steps'].forEach(function(k) {
        if (params[k] != null && params[k] !== '') upd[k] = params[k];
      });
      _mockSave(db);
      return {ok:true, data:upd, challenge:upd};
    }
    if (action === 'publishChallenge') {
      var pub = db.challenges.find(function(c) { return c.id === params.challengeId; });
      if (!pub) return {ok:false, msg:'التحدي غير موجود'};
      pub.status = 'published';
      pub.publishedAt = new Date().toISOString();
      db.notifs.unshift({id:_id('nt'), userId:'dev-teacher-dashboard', type:'new_challenge', title:'تحدي جديد', body:pub.name + ' متاح للتعيين', message:pub.name + ' متاح للتعيين', read:false, readAt:'', createdAt:pub.publishedAt});
      _mockSave(db);
      return {ok:true, data:pub, challenge:pub};
    }
    if (action === 'deleteChallenge') {
      db.challenges = db.challenges.filter(function(c) { return c.id !== params.challengeId; });
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'adminGetAllAssignments') {
      var allAssign = _mockDecorateAssignments(db, null);
      return {ok:true, data:allAssign};
    }
    if (action === 'getAssignments') {
      var assignments = _mockDecorateAssignments(db, params.teacherId);
      return {ok:true, data:assignments, assignments:assignments};
    }
    if (action === 'assignChallenge') {
      var challenge = db.challenges.find(function(c) { return c.key === params.challengeKey || c.id === params.challengeId; }) || {};
      var clsAssign = db.classes.find(function(c) { return c.id === params.classId; });
      var assignNow = new Date().toISOString();
      var assignment = {id:_id('asg'), teacherId:params.teacherId, classId:params.classId, className:clsAssign ? clsAssign.name : '', challengeKey:params.challengeKey || challenge.key, challengeName:params.challengeName || challenge.name || 'تحدي', challengeHref:challenge.href || params.href || '', expiresAt:params.expiresAt || _daysFromNow(7), createdAt:assignNow};
      db.assignments.push(assignment);
      var students = clsAssign ? db.students.filter(function(s) { return s.schoolId === clsAssign.schoolId && s.class === clsAssign.name && !s.leftSchool; }) : [];
      var generatedCodes = [];
      students.forEach(function(s) {
        var code = ('CQ' + Math.random().toString(36).slice(2, 8)).toUpperCase();
        db.codes.push({id:_id('code'), assignmentId:assignment.id, studentId:s.id, studentEmail:s.email, studentName:s.name, code:code, startedAt:'', submittedAt:'', status:'assigned', teacherNote:'', createdAt:assignNow});
        generatedCodes.push({studentId:s.id, studentName:s.name, code:code});
        db.notifs.push({id:_id('nt'), userId:s.id, type:'challenge', title:'تحدي جديد: ' + assignment.challengeName, body:'كودك الخاص للتحدي', code:code, assignmentId:assignment.id, expiresAt:assignment.expiresAt, read:false, readAt:'', createdAt:assignNow});
      });
      _mockSave(db);
      return {ok:true, assignmentId:assignment.id, total:students.length, codes:generatedCodes};
    }
    if (action === 'getSubmissionsByAssignment') {
      var submissions = _mockSubmissions(db, params.assignmentId);
      return {ok:true, data:submissions, submissions:submissions};
    }
    if (action === 'approveSubmissionTeacher' || action === 'rejectSubmissionTeacher') {
      var code = db.codes.find(function(c) { return c.id === params.codeId; });
      if (code) {
        code.status = action === 'approveSubmissionTeacher' ? 'approved' : 'rejected';
        code.teacherNote = params.note || '';
      }
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'reopenChallenge') {
      var reopenAssign = db.assignments.find(function(a) { return a.id === params.assignmentId && a.teacherId === params.teacherId; });
      if (!reopenAssign) return {ok:false, msg:'غير مصرح'};
      var reopenIds = [];
      try { reopenIds = JSON.parse(params.studentIds || '[]'); } catch (e) {}
      if (params.expiresAt) reopenAssign.expiresAt = params.expiresAt;
      var reopenCodes = [];
      reopenIds.forEach(function(sid) {
        var student = db.students.find(function(s) { return s.id === sid; }) || {};
        var codeRow = db.codes.find(function(c) { return c.assignmentId === reopenAssign.id && c.studentId === sid; });
        var code = codeRow ? codeRow.code : ('CQ' + Math.random().toString(36).slice(2, 8)).toUpperCase();
        var nowReopen = new Date().toISOString();
        if (!codeRow) {
          db.codes.push({id:_id('code'), assignmentId:reopenAssign.id, studentId:sid, studentEmail:student.email || '', studentName:student.name || '', code:code, startedAt:'', submittedAt:'', status:'assigned', teacherNote:'', createdAt:nowReopen});
        }
        db.notifs.push({id:_id('nt'), userId:sid, type:'challenge', title:'تحدي متاح: ' + (reopenAssign.challengeName || 'تحدي'), body:'كودك الخاص للتحدي', code:code, assignmentId:reopenAssign.id, expiresAt:reopenAssign.expiresAt || '', read:false, readAt:'', createdAt:nowReopen});
        reopenCodes.push({studentId:sid, studentName:student.name || '', code:code});
      });
      _mockSave(db);
      return {ok:true, total:reopenCodes.length, codes:reopenCodes};
    }
    if (action === 'getTeacherNotifs') {
      var teacherNotifs = (db.notifs || []).filter(function(n) { return n.userId === params.teacherId; });
      return {ok:true, data:teacherNotifs, notifs:teacherNotifs};
    }
    if (action === 'getStudentNotifs') {
      var now = new Date();
      var studentForNotifs = db.students.find(function(s) { return s.id === params.studentId; });
      if (studentForNotifs) {
        _mockAssignExistingChallengesToStudent(db, studentForNotifs);
        _mockSave(db);
      }
      var studentNotifs = (db.notifs || []).filter(function(n) { return n.userId === params.studentId; })
        .map(function(n) {
          var assignment = db.assignments.find(function(a) { return a.id === n.assignmentId; }) || {};
          return Object.assign({}, n, {
            challengeKey: assignment.challengeKey || '',
            challengeName: assignment.challengeName || '',
            href: assignment.challengeHref || '',
            expired: n.expiresAt ? new Date(n.expiresAt) < now : false,
            message: n.title || n.body || ''
          });
        }).sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      return {ok:true, data:studentNotifs, notifs:studentNotifs};
    }
    if (action === 'markNotifRead') {
      var readNow = new Date().toISOString();
      db.notifs.forEach(function(n) {
        if (params.all === 'true') {
          if (!params.userId || n.userId === params.userId) { n.read = true; n.readAt = readNow; }
        } else if (n.id === params.notifId) {
          n.read = true; n.readAt = readNow;
        }
      });
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'addAchievement') {
      var studentAch = db.students.find(function(s) { return s.id === params.studentId; }) || {};
      db.achievements.unshift({id:_id('ach'), teacherId:params.teacherId, studentId:params.studentId, studentName:studentAch.name || params.studentName || '', schoolId:studentAch.schoolId || params.schoolId || '', text:params.text || '', badge:params.badge || 'star', createdAt:new Date().toISOString()});
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'getAchievements') return {ok:true, data:db.achievements, achievements:db.achievements};
    if (action === 'getWinners') {
      var winners = _mockWinners(db, params.schoolId || '');
      return {ok:true, local:winners.local, global:winners.global};
    }
    if (action === 'validateCode') {
      var normalizedCode = String(params.code || '').trim().toUpperCase();
      var foundCode = db.codes.find(function(c) {
        return String(c.code || '').trim().toUpperCase() === normalizedCode && c.studentId === params.studentId;
      });
      if (!foundCode) return {ok:false, msg:'الكود غير صحيح أو لا ينتمي لحسابك'};
      var foundAssignment = db.assignments.find(function(a) { return a.id === foundCode.assignmentId; });
      if (!foundAssignment) return {ok:false, msg:'التحدي غير موجود'};
      if (foundAssignment.expiresAt && new Date(foundAssignment.expiresAt) < new Date()) {
        return {ok:false, expired:true, msg:'انتهت صلاحية الكود'};
      }
      return {
        ok:true,
        codeId:foundCode.id,
        challengeKey:foundAssignment.challengeKey || '',
        challengeName:foundAssignment.challengeName || '',
        href:foundAssignment.challengeHref || '',
        expiresAt:foundAssignment.expiresAt || ''
      };
    }
    if (action === 'startChallenge') {
      var startCode = db.codes.find(function(c) { return c.id === params.codeId && c.studentId === params.studentId; });
      if (!startCode) return {ok:false, msg:'غير موجود'};
      if (!startCode.startedAt) startCode.startedAt = new Date().toISOString();
      if (startCode.status === 'assigned') startCode.status = 'started';
      _mockSave(db);
      return {ok:true, startedAt:startCode.startedAt};
    }
    if (action === 'submitChallengeCode') {
      var submitCode = db.codes.find(function(c) { return c.id === params.codeId && c.studentId === params.studentId; });
      if (!submitCode) return {ok:false, msg:'غير موجود'};
      submitCode.submittedAt = new Date().toISOString();
      submitCode.status = 'submitted';
      _mockSave(db);
      return {ok:true, submittedAt:submitCode.submittedAt};
    }
    if (action === 'changePassword') return {ok:true};
    if (action === 'adminCreateUser') {
      var role = params.role === 'teacher' ? 'teacher' : (params.role === 'creator' ? 'creator' : 'student');
      var prefix = role === 'teacher' ? 'TE' : (role === 'creator' ? 'CR' : 'ST');
      var year = new Date().getFullYear();
      var code = prefix + '-' + year + '-' + String(Math.floor(1000 + Math.random() * 9000));
      var newUser = {
        id: _id('usr'), name: params.name || '', email: params.email || '',
        role: role, status: 'active',
        studentCode: role === 'student' ? code : '',
        teacherCode: role === 'teacher' ? code : '',
        creatorCode: role === 'creator' ? code : '',
        schoolId: params.schoolId || '', class: params.class || '', section: params.section || ''
      };
      if (role === 'teacher') db.teachers.push(newUser);
      else if (role === 'creator') db.creators.push(newUser);
      else db.students.push(newUser);
      var assignedCount = role === 'student' ? _mockAssignExistingChallengesToStudent(db, newUser) : 0;
      _mockSave(db);
      return {ok:true, userCode: code, user: newUser, assignedChallenges: assignedCount};
    }
    if (action === 'getTeachers') {
      return {ok:true, data:db.teachers||[], teachers:db.teachers||[]};
    }
    if (action === 'getStudents') {
      return {ok:true, data:db.students, students:db.students};
    }
    if (action === 'getCreators') {
      return {ok:true, data:db.creators||[], creators:db.creators||[]};
    }
    if (action === 'getAdminNotifs') {
      return {ok:true, data:db.notifs||[], notifs:db.notifs||[]};
    }
    if (action === 'adminSetUserStatus') {
      [db.teachers, db.students, db.creators || []].some(function(list) {
        var user = list.find(function(u) { return u.id === params.userId; });
        if (!user) return false;
        user.status = params.status || user.status;
        if (user.role === 'student' || user.studentCode) {
          _mockAssignExistingChallengesToStudent(db, user);
        }
        return true;
      });
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'adminUpdateUser') {
      [db.teachers, db.students, db.creators || []].some(function(list) {
        var user = list.find(function(u) { return u.id === params.userId; });
        if (!user) return false;
        ['name','email','schoolId','class','section','status'].forEach(function(k) {
          if (params[k] != null) user[k] = params[k];
        });
        if (params.className != null) user.class = params.className;
        if (params.leftSchool != null) user.leftSchool = params.leftSchool === true || params.leftSchool === 'true';
        if (user.role === 'student' || user.studentCode) {
          _mockAssignExistingChallengesToStudent(db, user);
        }
        return true;
      });
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'approveTeacher' || action === 'rejectTeacher' || action === 'approveStudent' || action === 'rejectStudent' || action === 'approveCreator' || action === 'rejectCreator') return {ok:true};
    if (action === 'createSchool') {
      var newSch = {id:_id('sch'), name:params.name||'', city:params.city||'', type:params.type||'school', status:'active', createdAt:new Date().toISOString()};
      db.schools.push(newSch); _mockSave(db);
      return {ok:true, data:newSch};
    }
    if (action === 'updateSchool') {
      var updSch = db.schools.find(function(s){ return s.id === params.schoolId; });
      if (!updSch) return {ok:false, msg:'المدرسة غير موجودة'};
      if (params.name   != null) updSch.name   = params.name;
      if (params.city   != null) updSch.city   = params.city;
      if (params.type   != null) updSch.type   = params.type;
      if (params.status != null) updSch.status = params.status;
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'deleteSchool') { db.schools=db.schools.filter(function(s){return s.id!==params.schoolId;}); _mockSave(db); return {ok:true}; }
    if (action === 'adminCreateClass') {
      var schForCls = db.schools.find(function(s){ return s.id === params.schoolId; }) || {};
      var grade = params.grade || params.name || '';
      var clsName = (grade + (params.section ? ' ' + params.section : '')).trim();
      var newCls = {id:_id('cls'), teacherId:'', teacherEmail:'', name:clsName, grade:grade, section:params.section||'', schoolId:params.schoolId||'', schoolName:schForCls.name||'', createdAt:new Date().toISOString()};
      db.classes.push(newCls); _mockSave(db);
      return {ok:true, data:newCls};
    }
    if (action === 'createCourse') {
      var schForCrs = db.schools.find(function(s){ return s.id === params.schoolId; }) || {};
      var newCrs = {id:_id('crs'), name:params.name||'', schoolId:params.schoolId||'', schoolName:schForCrs.name||'', startTime:params.startTime||'', endTime:params.endTime||'', weeks:params.weeks||'', trainerId:'', trainerName:'', courseStatus:'active', activeStatus:'active', createdAt:new Date().toISOString()};
      if (!db.courses) db.courses = [];
      db.courses.push(newCrs); _mockSave(db);
      return {ok:true, data:newCrs};
    }
    if (action === 'updateCourse') {
      if (!db.courses) return {ok:true};
      var updCrs = db.courses.find(function(c){ return c.id === params.courseId; });
      if (updCrs && params.trainerId != null) { updCrs.trainerId = params.trainerId; updCrs.trainerName = params.trainerName||''; }
      if (updCrs && params.assistantTrainerId != null) updCrs.assistantTrainerId = params.assistantTrainerId;
      if (updCrs && params.assistantTrainerName != null) updCrs.assistantTrainerName = params.assistantTrainerName;
      if (updCrs && params.name != null) updCrs.name = params.name;
      if (updCrs && params.startTime != null) updCrs.startTime = params.startTime;
      if (updCrs && params.endTime != null) updCrs.endTime = params.endTime;
      if (updCrs && params.weeks != null) updCrs.weeks = params.weeks;
      if (updCrs && params.courseStatus != null) { updCrs.courseStatus = params.courseStatus; updCrs.activeStatus = params.courseStatus; }
      if (updCrs && params.activeStatus != null) { updCrs.activeStatus = params.activeStatus; updCrs.courseStatus = params.activeStatus; }
      _mockSave(db);
      return {ok:true};
    }
    if (action === 'assignTeacherSchool' || action === 'removeTeacherSchool') return {ok:true};
    if (action === 'getTeacherSchools') return {ok:true, data:[], schools:[]};
    if (action === 'importUsers') return {ok:true, added:0, skipped:0, errors:[]};
    return {ok:true, data:[]};
  }

  return {
    // ── المصادقة ──────────────────────────────
    signUp: function (data) {
      return _call(Object.assign({action: 'signUp', autoApprove: _autoApproveFlag()}, data));
    },
    signIn: function (email, passwordHash, role) {
      return _call({action: 'signIn', email: email, passwordHash: passwordHash, role: role, autoApprove: _autoApproveFlag()});
    },
    lookupCode: function (code) {
      return _call({action: 'lookupCode', code: code});
    },

    // ── الأدمن — المستخدمون ──────────────────
    getTeachers: function (token) {
      return _call({action: 'getTeachers', token: token});
    },
    getStudents: function (token) {
      return _call({action: 'getStudents', token: token});
    },
    getCreators: function (token) {
      return _call({action: 'getCreators', token: token});
    },
    approveTeacher: function (userId, token) {
      return _call({action: 'approveTeacher', userId: userId, token: token, ajax: 'true'});
    },
    rejectTeacher: function (userId, token) {
      return _call({action: 'rejectTeacher', userId: userId, token: token, ajax: 'true'});
    },
    approveStudent: function (userId, token) {
      return _call({action: 'approveStudent', userId: userId, token: token, ajax: 'true'});
    },
    rejectStudent: function (userId, token) {
      return _call({action: 'rejectStudent', userId: userId, token: token, ajax: 'true'});
    },
    approveCreator: function (userId, token) {
      return _call({action: 'approveCreator', userId: userId, token: token, ajax: 'true'});
    },
    rejectCreator: function (userId, token) {
      return _call({action: 'rejectCreator', userId: userId, token: token, ajax: 'true'});
    },
    getAdminNotifs: function (token) {
      return _call({action: 'getAdminNotifs', token: token});
    },
    generateResetLink: function (userId, token) {
      return _call({action: 'generateResetLink', userId: userId, token: token});
    },
    changePassword: function (userId, newPasswordHash, token) {
      return _call({action: 'changePassword', userId: userId, newPasswordHash: newPasswordHash, token: token});
    },

    // ── الأدمن — المدارس ─────────────────────
    createSchool: function (data, token) {
      return _call(Object.assign({action: 'createSchool', token: token}, data));
    },
    getSchools: function () {
      return _call({action: 'getSchools'});
    },
    deleteSchool: function (schoolId, token) {
      return _call({action: 'deleteSchool', schoolId: schoolId, token: token});
    },
    updateSchool: function (schoolId, data, token) {
      return _call(Object.assign({action: 'updateSchool', schoolId: schoolId, token: token}, data));
    },

    // ── الأدمن — علاقة معلم←مدارس ───────────
    assignTeacherSchool: function (teacherId, schoolId, token) {
      return _call({action: 'assignTeacherSchool', teacherId: teacherId, schoolId: schoolId, token: token});
    },
    removeTeacherSchool: function (teacherId, schoolId, token) {
      return _call({action: 'removeTeacherSchool', teacherId: teacherId, schoolId: schoolId, token: token});
    },
    getTeacherSchools: function (teacherId) {
      return _call({action: 'getTeacherSchools', teacherId: teacherId});
    },

    // ── الأدمن — التحديات ────────────────────
    createChallenge: function (data, token) {
      return _call(Object.assign({action: 'createChallenge', token: token}, data));
    },
    getChallenges: function (token) {
      return _call({action: 'getChallenges', token: token || ''});
    },
    updateChallenge: function (challengeId, data, token) {
      return _call(Object.assign({action: 'updateChallenge', challengeId: challengeId, token: token}, data));
    },
    publishChallenge: function (challengeId, token) {
      return _call({action: 'publishChallenge', challengeId: challengeId, token: token});
    },
    unpublishChallenge: function (challengeId, token) {
      return _call({action: 'unpublishChallenge', challengeId: challengeId, token: token});
    },
    deleteChallenge: function (challengeId, token) {
      return _call({action: 'deleteChallenge', challengeId: challengeId, token: token});
    },

    // ── الأدمن — طلبات التحديات ──────────────
    listSubmissions: function (token) {
      return _call({action: 'list', token: token});
    },
    approveSubmission: function (id, token) {
      return _call({action: 'approve', id: id, token: token, ajax: 'true'});
    },
    rejectSubmission: function (id, token) {
      return _call({action: 'reject', id: id, token: token, ajax: 'true'});
    },

    // ── الأدمن — إضافة مستخدم يدوياً ────────
    adminCreateUser: function (data, token) {
      return _call(Object.assign({action: 'adminCreateUser', token: token}, data));
    },
    adminUpdateUser: function (userId, data, token) {
      return _call(Object.assign({action: 'adminUpdateUser', userId: userId, token: token}, data));
    },
    adminSetUserStatus: function (userId, data, token) {
      return _call(Object.assign({action: 'adminSetUserStatus', userId: userId, token: token}, data));
    },

    // ── الأدمن — استيراد Excel ───────────────
    importUsers: function (role, rows, token) {
      return _call({action: 'importUsers', role: role, rows: JSON.stringify(rows), token: token});
    },

    // ── الأدمن — إضافة صف / دورة ────────────
    adminCreateClass: function (data, token) {
      return _call(Object.assign({action: 'adminCreateClass', token: token}, data));
    },
    getCourses: function (token) {
      return _call({action: 'getCourses', token: token || ''});
    },
    createCourse: function (data, token) {
      return _call(Object.assign({action: 'createCourse', token: token}, data));
    },
    updateCourse: function (courseId, data, token) {
      return _call(Object.assign({action: 'updateCourse', courseId: courseId, token: token}, data));
    },

    // ── المعلم — الصفوف ──────────────────────
    getClasses: function (teacherId, token) {
      return _call({action: 'getClasses', teacherId: teacherId || '', token: token || ''});
    },
    createClass: function (teacherId, teacherEmail, name, schoolId, section, token) {
      return _call({action: 'createClass', teacherId: teacherId, teacherEmail: teacherEmail, name: name, schoolId: schoolId, section: section || '', token: token || ''});
    },
    updateClass: function (classId, teacherId, data, token) {
      return _call(Object.assign({action: 'updateClass', classId: classId, teacherId: teacherId, token: token || ''}, data));
    },
    migrateStudents: function (fromGrade, fromSection, toGrade, toSection, schoolId, token) {
      return _call({action: 'migrateStudents', fromGrade: fromGrade, fromSection: fromSection, toGrade: toGrade, toSection: toSection, schoolId: schoolId, token: token || ''});
    },
    deleteClass: function (classId, teacherId, token) {
      return _call({action: 'deleteClass', classId: classId, teacherId: teacherId, token: token || ''});
    },

    // ── المعلم — الطلاب ──────────────────────
    getStudentsByClass: function (classId) {
      return _call({action: 'getStudentsByClass', classId: classId});
    },
    markStudentLeft: function (studentId, left) {
      return _call({action: 'markStudentLeft', studentId: studentId, left: left ? 'true' : 'false'});
    },

    // ── المعلم — التحديات ────────────────────
    assignChallenge: function (data) {
      return _call(Object.assign({action: 'assignChallenge'}, data));
    },
    adminGetAllAssignments: function (secret) {
      return _call({action: 'adminGetAllAssignments', secret: secret});
    },
    getAssignments: function (teacherId) {
      return _call({action: 'getAssignments', teacherId: teacherId});
    },
    getSubmissionsByAssignment: function (assignmentId, teacherId) {
      return _call({action: 'getSubmissionsByAssignment', assignmentId: assignmentId, teacherId: teacherId});
    },
    approveSubmissionTeacher: function (codeId, teacherId) {
      return _call({action: 'approveSubmissionTeacher', codeId: codeId, teacherId: teacherId});
    },
    rejectSubmissionTeacher: function (codeId, teacherId, note) {
      return _call({action: 'rejectSubmissionTeacher', codeId: codeId, teacherId: teacherId, note: note || ''});
    },
    reopenChallenge: function (assignmentId, teacherId, studentIds, expiresAt) {
      return _call({action: 'reopenChallenge', assignmentId: assignmentId, teacherId: teacherId, studentIds: JSON.stringify(studentIds), expiresAt: expiresAt || ''});
    },
    getTeacherNotifs: function (teacherId) {
      return _call({action: 'getTeacherNotifs', teacherId: teacherId});
    },

    // ── الإنجازات ────────────────────────────
    addAchievement: function (data) {
      return _call(Object.assign({action: 'addAchievement'}, data));
    },
    getAchievements: function (params) {
      return _call(Object.assign({action: 'getAchievements'}, params || {}));
    },

    // ── الفائزون ─────────────────────────────
    getWinners: function (schoolId, weekStart) {
      return _call({action: 'getWinners', schoolId: schoolId || '', weekStart: weekStart || ''});
    },

    // ── الطالب ───────────────────────────────
    getStudentNotifs: function (studentId) {
      return _call({action: 'getStudentNotifs', studentId: studentId});
    },
    markNotifRead: function (notifId) {
      return _call({action: 'markNotifRead', notifId: notifId});
    },
    markAllNotifsRead: function (userId) {
      return _call({action: 'markNotifRead', userId: userId, all: 'true'});
    },
    validateCode: function (code, studentId) {
      return _call({action: 'validateCode', code: code, studentId: studentId});
    },
    startChallenge: function (codeId, studentId) {
      return _call({action: 'startChallenge', codeId: codeId, studentId: studentId});
    },
    submitChallengeCode: function (codeId, studentId) {
      return _call({action: 'submitChallengeCode', codeId: codeId, studentId: studentId});
    },

    // ── كلمة المرور ──────────────────────────
    requestReset: function (email) {
      return _call({action: 'requestReset', email: email, siteUrl: _siteBaseUrl()});
    },
    requestPhoneOtp: function (phone) {
      return _call({action: 'requestPhoneOtp', phone: phone, siteUrl: _siteBaseUrl()});
    },
    verifyPhoneOtp: function (phone, otp) {
      return _call({action: 'verifyPhoneOtp', phone: phone, otp: otp, siteUrl: _siteBaseUrl()});
    },
    resetPassword: function (token, newPasswordHash) {
      return _call({action: 'resetPassword', token: token, newPasswordHash: newPasswordHash});
    }
  };
})();
