(function () {
  var VALID_GRADES = [
    '\u0627\u0644\u0627\u0648\u0644',
    '\u0627\u0644\u062b\u0627\u0646\u064a',
    '\u0627\u0644\u062b\u0627\u0644\u062b',
    '\u0627\u0644\u0631\u0627\u0628\u0639',
    '\u0627\u0644\u062e\u0627\u0645\u0633',
    '\u0627\u0644\u0633\u0627\u062f\u0633',
    '\u0627\u0644\u0633\u0627\u0628\u0639',
    '\u0627\u0644\u062b\u0627\u0645\u0646',
    '\u0627\u0644\u062a\u0627\u0633\u0639',
    '\u0627\u0644\u0639\u0627\u0634\u0631',
    '\u0627\u0644\u062d\u0627\u062f\u064a \u0639\u0634\u0631',
    '\u0627\u0644\u062b\u0627\u0646\u064a \u0639\u0634\u0631'
  ];
  var VALID_SECTIONS = [
    '\u0627',
    '\u0628',
    '\u062c',
    '\u062f',
    '\u0647',
    '\u0648',
    '\u0632'
  ];

  function hashText(str) {
    var h = 0;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h.toString(16);
  }

  function getState() {
    return window.A || {
      schools: [],
      teachers: [],
      students: [],
      challenges: [],
      creators: [],
      submissions: [],
      notifs: []
    };
  }

  function schoolStatusMap() {
    try { return JSON.parse(localStorage.getItem('cq_school_status_overrides') || '{}'); } catch (e) { return {}; }
  }

  function isSchoolActive(schoolId) {
    var state = getState();
    var saved = schoolStatusMap();
    var school = (state.schools || []).find(function (s) { return s.id === schoolId; });
    var status = saved[schoolId] || (school ? school.status : '') || 'active';
    return status !== 'inactive';
  }

  function normalizeRelatedText(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[أإآا]/g, 'ا')
      .replace(/ى/g, 'ي')
      .toLowerCase();
  }

  function normalizeRelatedSection(value) {
    return normalizeRelatedText(value).replace(/^[|il]$/g, 'ا');
  }

  function cleanRelatedText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function firstFilled() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return '';
  }

  function assistantNameFor(record, role) {
    record = record || {};
    var state = getState();
    var id = role === 'trainer'
      ? firstFilled(record.assistantTrainerId, record.trainerAssistantId, record.coTrainerId, record.assistantId)
      : firstFilled(record.assistantTeacherId, record.teacherAssistantId, record.coTeacherId, record.assistantId);
    if (id && id !== 'admin-unassigned') {
      var teacher = (state.teachers || []).find(function (t) { return t.id === id; });
      if (teacher) return teacher.name || teacher.email || '';
    }
    var name = role === 'trainer'
      ? firstFilled(record.assistantTrainerName, record.trainerAssistantName, record.coTrainerName, record.assistantName)
      : firstFilled(record.assistantTeacherName, record.teacherAssistantName, record.coTeacherName, record.assistantName);
    return name && name !== id ? name : '';
  }

  function normalizeRelatedText(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u0623\u0625\u0622\u0627]/g, '\u0627')
      .replace(/\u0649/g, '\u064a')
      .toLowerCase();
  }

  function normalizeRelatedSection(value) {
    return normalizeRelatedText(value).replace(/^[|il]$/g, '\u0627');
  }

  function splitRelatedClassParts(name, section) {
    var cleanName = cleanRelatedText(name);
    var cleanSection = cleanRelatedText(section);
    var parts = cleanName.split(' ');
    var last = parts.length ? parts[parts.length - 1] : '';
    if (last && normalizeRelatedSection(last) === normalizeRelatedSection(cleanSection || last)) {
      cleanSection = cleanSection || last;
      if (parts.length > 1) cleanName = parts.slice(0, -1).join(' ');
    }
    return {
      grade: cleanName,
      section: cleanSection
    };
  }

  function uniqueRows(rows, keyFn) {
    var seen = {};
    return (rows || []).filter(function (row) {
      var key = keyFn(row);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function schoolByIdGlobal(schoolId) {
    var state = getState();
    return (state.schools || []).find(function (s) { return s.id === schoolId; }) || null;
  }

  function belongsToSchool(item, school) {
    if (!item || !school) return false;
    var schoolId = school.id || '';
    var schoolName = normalizeRelatedText(school.name || '');
    var values = [
      item.schoolId,
      item.schoolID,
      item.school,
      item.schoolName,
      item.school_name
    ];
    if (Array.isArray(item.schools)) {
      values = values.concat(item.schools);
    }
    return values.some(function (value) {
      if (!value) return false;
      return String(value) === String(schoolId) || normalizeRelatedText(value) === schoolName;
    });
  }

  function userStatusMap() {
    try { return JSON.parse(localStorage.getItem('cq_user_status_overrides') || '{}'); } catch (e) { return {}; }
  }

  function userStatus(user) {
    var saved = userStatusMap();
    if (saved[user.id]) return saved[user.id];
    return user.status === 'inactive' ? 'inactive' : 'active';
  }

  function renderAdminCommandCenter() {
    var state = getState();
    var pendingTeachers = state.teachers.filter(function (t) { return t.status === 'pending'; }).length;
    var pendingStudents = state.students.filter(function (s) { return s.status === 'pending' && s.role !== 'creator'; }).length;
    var pendingCreators = state.creators.filter(function (c) { return c.status === 'pending'; }).length;
    var pendingSubs = (state.submissions || []).length;
    var drafts = state.challenges.filter(function (c) { return (c.status || 'draft') !== 'published'; }).length;
    var managedUsers = state.teachers.length + state.students.length + state.creators.length;

    var pendingEl = document.getElementById('cmd-pending-total');
    var draftsEl = document.getElementById('cmd-draft-challenges');
    var usersEl = document.getElementById('cmd-managed-users');
    var schoolsEl = document.getElementById('cmd-school-coverage');

    if (pendingEl) pendingEl.textContent = pendingTeachers + pendingStudents + pendingCreators + pendingSubs;
    if (draftsEl)  draftsEl.textContent  = drafts;
    if (usersEl)   usersEl.textContent   = managedUsers;
    if (schoolsEl) schoolsEl.textContent = state.schools.length;
    document.querySelectorAll('#command-grid .skeleton-val').forEach(function(el){ el.remove(); });
  }

  /* ── Admin Guide navigation ── */
  var _guideSection = 0;
  var _guideTotalSections = 6;

  window.setGuideSection = function (n) {
    _guideSection = Math.max(0, Math.min(n, _guideTotalSections - 1));
    document.querySelectorAll('.guide-section').forEach(function (el) {
      el.classList.toggle('active', parseInt(el.dataset.section) === _guideSection);
    });
    document.querySelectorAll('.guide-tab').forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.section) === _guideSection);
    });
    document.querySelectorAll('.guide-dot-el').forEach(function (dot, i) {
      dot.classList.toggle('active', i === _guideSection);
    });
    var prev = document.getElementById('guide-prev-btn');
    var next = document.getElementById('guide-next-btn');
    if (prev) prev.disabled = _guideSection === 0;
    if (next) next.disabled = _guideSection === _guideTotalSections - 1;
  };

  window.nextGuideSection = function () { window.setGuideSection(_guideSection + 1); };
  window.prevGuideSection = function () { window.setGuideSection(_guideSection - 1); };

  function renderAdminPermissions() {
    var pillList = document.getElementById('permission-pill-list');
    var matrix = document.getElementById('permission-matrix');

    if (pillList) {
      pillList.innerHTML = [
        {
          title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646',
          state: '\u0645\u0641\u0639\u0644',
          stateClass: '',
          copy: '\u0627\u0644\u0623\u062f\u0645\u0646 \u064a\u0646\u0634\u0626 \u0648\u064a\u0639\u0631\u0636 \u0648\u064a\u0639\u062f\u0644 \u0648\u064a\u062d\u0630\u0641 \u0648\u064a\u0641\u0639\u0644 \u0648\u064a\u0639\u0637\u0644 \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064a\u0646 \u0648\u0627\u0644\u0645\u0628\u062a\u0643\u0631\u064a\u0646 \u0645\u0646 \u0644\u0648\u062d\u0629 \u0648\u0627\u062d\u062f\u0629.'
        },
        {
          title: '\u0627\u0644\u0645\u062f\u0627\u0631\u0633 \u0648\u0627\u0644\u0635\u0641\u0648\u0641',
          state: '\u0645\u0641\u0639\u0644',
          stateClass: '',
          copy: '\u0627\u0644\u0623\u062f\u0645\u0646 \u064a\u062f\u064a\u0631 \u0627\u0644\u0645\u062f\u0627\u0631\u0633 \u0648\u0627\u0644\u0635\u0641\u0648\u0641 \u0648\u064a\u0631\u0628\u0637 \u0643\u0644 \u0635\u0641 \u0628\u0645\u062f\u0631\u0633\u0629 \u0645\u0639 \u062a\u0642\u064a\u064a\u062f \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0645\u0633\u0645\u0648\u062d\u0629 \u0644\u0644\u0635\u0641 \u0648\u0627\u0644\u0634\u0639\u0628\u0629.'
        },
        {
          title: '\u0627\u0644\u062a\u062d\u062f\u064a\u0627\u062a',
          state: '\u0645\u0641\u0639\u0644',
          stateClass: '',
          copy: '\u0627\u0644\u0645\u0628\u062a\u0643\u0631 \u064a\u0646\u0634\u0626 \u0627\u0644\u062a\u062d\u062f\u064a\u060c \u0628\u064a\u0646\u0645\u0627 \u0627\u0644\u0623\u062f\u0645\u0646 \u064a\u0631\u0627\u062c\u0639 \u0648\u064a\u0639\u062f\u0644 \u0648\u064a\u062d\u0630\u0641 \u0648\u064a\u0646\u0634\u0631 \u0648\u064a\u0644\u063a\u064a \u0627\u0644\u0646\u0634\u0631 \u0641\u0642\u0637.'
        },
        {
          title: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646',
          state: '\u0645\u0641\u0639\u0644',
          stateClass: '',
          copy: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u0648\u062d\u062f\u0629 \u062a\u062d\u062a user_request\u060c \u0648\u0645\u0639 \u0643\u0644 \u0637\u0644\u0628 \u062c\u062f\u064a\u062f \u064a\u0635\u0644 \u062a\u0646\u0628\u064a\u0647 \u0644\u0644\u0623\u062f\u0645\u0646.'
        },
        {
          title: '\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
          state: '\u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0646\u0638\u0627\u0645',
          stateClass: 'limited',
          copy: '\u0628\u0646\u064a\u0629 \u0627\u0644\u062c\u062f\u0627\u0648\u0644 \u0648\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a \u0648\u0642\u0648\u0627\u0639\u062f \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629 \u062a\u0628\u0642\u0649 \u0641\u064a \u0627\u0644\u0628\u0627\u0643 \u0625\u0646\u062f\u060c \u0648\u0647\u0630\u0647 \u0627\u0644\u0644\u0648\u062d\u0629 \u062a\u0639\u0643\u0633\u0647\u0627 \u0641\u0642\u0637.'
        }
      ].map(function (item) {
        return '<div class="permission-pill">' +
          '<div class="permission-pill-top">' +
            '<div class="permission-pill-title">' + item.title + '</div>' +
            '<div class="permission-pill-state ' + item.stateClass + '">' + item.state + '</div>' +
          '</div>' +
          '<div class="permission-pill-copy">' + item.copy + '</div>' +
        '</div>';
      }).join('');
    }

    if (matrix) {
      matrix.innerHTML = [
        ['\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646', '\u0625\u0646\u0634\u0627\u0621 / \u0639\u0631\u0636 / \u062a\u0639\u062f\u064a\u0644 / \u062d\u0630\u0641 / \u062a\u0641\u0639\u064a\u0644 / \u062a\u0639\u0637\u064a\u0644', '', '\u064a\u0646\u0637\u0628\u0642 \u0639\u0644\u0649 student \u0648 teacher \u0648 creator \u062f\u0627\u062e\u0644 \u0646\u0645\u0648\u0630\u062c users \u0645\u0648\u062d\u062f.'],
        ['\u0627\u0644\u0645\u062f\u0627\u0631\u0633', '\u0625\u0646\u0634\u0627\u0621 / \u0639\u0631\u0636 / \u062a\u0639\u062f\u064a\u0644 / \u062d\u0630\u0641 / \u062a\u0641\u0639\u064a\u0644 / \u062a\u0639\u0637\u064a\u0644', '', '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u064a\u062d\u062a\u0627\u062c school_name \u0641\u0642\u0637\u060c \u062b\u0645 \u064a\u0645\u0643\u0646 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629 \u0623\u0648 \u0627\u0644\u062a\u0639\u0637\u064a\u0644 \u0644\u0627\u062d\u0642\u064b\u0627.'],
        ['\u0627\u0644\u0635\u0641\u0648\u0641', '\u0625\u0646\u0634\u0627\u0621 / \u0639\u0631\u0636 / \u062a\u0639\u062f\u064a\u0644 / \u062d\u0630\u0641 / \u062a\u0641\u0639\u064a\u0644 / \u062a\u0639\u0637\u064a\u0644', '', '\u0643\u0644 \u0635\u0641 \u064a\u062a\u0628\u0639 \u0645\u062f\u0631\u0633\u0629\u060c \u0648\u0627\u0644\u0635\u0641 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0645\u0646: ' + VALID_GRADES.join('\u060c ') + '\u060c \u0648\u0627\u0644\u0634\u0639\u0628\u0629 \u0645\u0646: ' + VALID_SECTIONS.join('\u060c ') + '.'],
        ['\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646', '\u0642\u0631\u0627\u0621\u0629 / \u0642\u0628\u0648\u0644 / \u0631\u0641\u0636', '', '\u0643\u0644 user_request \u0633\u0648\u0627\u0621 \u062c\u0627\u0621 \u0645\u0646 \u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0623\u0648 \u0627\u0644\u0645\u0648\u0642\u0639 \u064a\u062f\u062e\u0644 \u0646\u0641\u0633 \u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u064a\u0631\u0633\u0644 \u062a\u0646\u0628\u064a\u0647\u064b\u0627 \u0644\u0644\u0623\u062f\u0645\u0646.'],
        ['\u0627\u0644\u062a\u062d\u062f\u064a\u0627\u062a', '\u0642\u0631\u0627\u0621\u0629 / \u062a\u0639\u062f\u064a\u0644 / \u062d\u0630\u0641 / \u0646\u0634\u0631 / \u0625\u0644\u063a\u0627\u0621 \u0646\u0634\u0631', '', '\u0627\u0644\u0623\u062f\u0645\u0646 \u064a\u062f\u064a\u0631 \u062a\u062d\u062f\u064a\u0627\u062a \u0627\u0644\u0645\u0628\u062a\u0643\u0631\u064a\u0646 \u0644\u0643\u0646\u0647 \u0644\u0627 \u064a\u0646\u0634\u0626 \u062a\u062d\u062f\u064a\u064b\u0627 \u062c\u062f\u064a\u062f\u064b\u0627 \u0628\u0646\u0641\u0633\u0647.'],
        ['\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a', '\u0639\u0631\u0636 / \u0645\u062a\u0627\u0628\u0639\u0629', 'view', '\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0644\u0623\u062f\u0645\u0646 \u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0627\u0644\u0646\u0634\u0627\u0637\u0627\u062a \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0644\u062a\u0633\u0647\u064a\u0644 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629.']
      ].map(function (row) {
        return '<div class="permission-row">' +
          '<div class="permission-capability">' + row[0] + '</div>' +
          '<div class="permission-status ' + row[2] + '">' + row[1] + '</div>' +
          '<div class="permission-desc">' + row[3] + '</div>' +
        '</div>';
      }).join('');
    }
  }

  var _activityFilter = 'all';

  window.setActivityFilter = function (filter) {
    _activityFilter = filter;
    document.querySelectorAll('.activity-filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderOverviewActivity();
  };

  function _filterNotifs(notifs, filter) {
    if (filter === 'all') return notifs;
    return notifs.filter(function (n) {
      var title = n.title || n.text || n.message || '';
      var type  = n.type || '';
      if (filter === 'teachers')   return type === 'user_request' && title.indexOf('\u0645\u0639\u0644\u0645') >= 0;
      if (filter === 'students')   return type === 'user_request' && title.indexOf('\u0637\u0627\u0644\u0628') >= 0;
      if (filter === 'creators')   return type === 'user_request' && title.indexOf('\u0645\u0628\u062a\u0643\u0631') >= 0;
      if (filter === 'challenges') return type === 'new_challenge' || type === 'challenge' || title.indexOf('\u062a\u062d\u062f\u064a') >= 0;
      return true;
    });
  }

  var ACTIVITY_ICONS = {
    user_request:  '\ud83d\udc64',
    new_challenge: '\u26a1',
    challenge:     '\u26a1',
    submission:    '\ud83d\udcdd',
    grade:         '\u2705',
    reset_link:    '\ud83d\udd11',
    info:          '\ud83d\udd14'
  };

  function renderOverviewActivity() {
    var state = getState();
    var ov = document.getElementById('ov-activity');
    var badge = document.getElementById('nav-notif-badge');
    var unread = state.notifs.filter(function (n) { return !n.readAt; }).length;

    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread ? '' : 'none';
    }

    if (!ov) return;

    var filtered = _filterNotifs(state.notifs, _activityFilter);

    if (!filtered.length) {
      ov.innerHTML = '<div class="empty"><div class="empty-icon">' +
        (_activityFilter === 'all' ? '!' : '\ud83d\udd0d') +
        '</div>' + (_activityFilter === 'all' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u0634\u0627\u0637\u0627\u062a \u0628\u0639\u062f' : '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u0634\u0627\u0637\u0627\u062a \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629') + '</div>';
      return;
    }

    ov.innerHTML = filtered.slice(0, 6).map(function (n) {
      var title    = n.title || n.text || n.message || '\u062a\u0646\u0628\u064a\u0647';
      var when     = typeof window.fmtDate === 'function' ? window.fmtDate(n.createdAt) : '';
      var icon     = ACTIVITY_ICONS[n.type] || '\ud83d\udd14';
      var badgeHtml = !n.readAt
        ? '<span class="badge badge-blue">\u062c\u062f\u064a\u062f</span>'
        : '<span class="badge badge-draft">\u0645\u0642\u0631\u0648\u0621</span>';

      return '<div class="mini-item">' +
        '<div class="mini-meta" style="font-size:1.25rem;min-width:28px;text-align:center">' + icon + '</div>' +
        '<div class="mini-main">' +
          '<div class="mini-title">' + title + '</div>' +
          '<div class="mini-sub">' + when + '</div>' +
        '</div>' +
        '<div class="mini-meta">' + badgeHtml + '</div>' +
      '</div>';
    }).join('');
  }

  function populateStudentClassInputs() {
    var gradeOpts = VALID_GRADES.map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');
    var sectionOpts = VALID_SECTIONS.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
    var studentClass = document.getElementById('student-class');
    if (studentClass) {
      studentClass.innerHTML = '<option value="">\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0623\u0648\u0644\u0627\u064b</option>';
      studentClass.disabled = true;
    }
    var addGrade = document.getElementById('addclass-grade');
    if (addGrade) addGrade.innerHTML = gradeOpts;
    var editGrade = document.getElementById('edit-class-inline-grade');
    if (editGrade) editGrade.innerHTML = gradeOpts;
    ['student-section', 'addclass-section', 'edit-class-inline-section'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = sectionOpts;
    });
  }

  function studentClassOptionsForSchool(schoolId) {
    var school = (window.A.schools || []).find(function (s) { return s.id === schoolId; }) || {};
    var isSelectedCenter = String(school.type || '').toLowerCase() === 'center';
    var rows = isSelectedCenter
      ? (window.A.courses || []).filter(function (course) {
          return course.schoolId === schoolId && String(course.status || course.courseStatus || 'active') !== 'deleted';
        }).map(function (course) {
          return { value: course.name || '', label: course.name || '', section: '\u062f\u0648\u0631\u0629' };
        })
      : getSchoolClassesOrCourses(schoolId).map(function (row) {
          return { value: row.name || '', label: row.section ? (row.name + ' - ' + row.section) : row.name, section: row.section || '' };
        });

    var seen = {};
    return rows.filter(function (row) {
      var key = [normalizeRelatedText(row.value), normalizeRelatedSection(row.section)].join('::');
      if (!row.value || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  window.onStudentSchoolChange = function () {
    var schoolSel = document.getElementById('student-school-sel');
    var clsSel = document.getElementById('student-class');
    var secSel = document.getElementById('student-section');
    var schoolId = schoolSel ? schoolSel.value : '';
    if (!clsSel) return;
    if (!schoolId) {
      clsSel.innerHTML = '<option value="">\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0623\u0648\u0644\u0627\u064b</option>';
      clsSel.disabled = true;
      if (secSel) secSel.value = '';
      return;
    }
    var options = studentClassOptionsForSchool(schoolId);
    clsSel.disabled = !options.length;
    clsSel.innerHTML = options.length
      ? '<option value="">-- \u0627\u062e\u062a\u0631 \u0627\u0644\u0635\u0641 --</option>' + options.map(function (row) {
          return '<option value="' + window.esc(row.value) + '" data-section="' + window.esc(row.section || '') + '">' + window.esc(row.label || row.value) + '</option>';
        }).join('')
      : '<option value="">\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0645\u062f\u0631\u0633\u0629</option>';
    if (secSel) secSel.value = '';
  };

  window.onStudentClassChange = function () {
    var clsSel = document.getElementById('student-class');
    var secSel = document.getElementById('student-section');
    if (!clsSel || !secSel) return;
    var opt = clsSel.options[clsSel.selectedIndex];
    var section = opt ? opt.getAttribute('data-section') || '' : '';
    if (!section && window.A && window.A._manageClassStudentsTarget && window.A._manageClassStudentsTarget.className === clsSel.value) {
      section = window.A._manageClassStudentsTarget.section || '';
    }
    if (section) ensureSelectOption('student-section', section, section);
    secSel.value = section;
  };

  function activeStudentSchoolOptions() {
    return (window.A.schools || []).filter(function (school) {
      return String(school.status || 'active') !== 'deleted' && String(school.status || 'active') !== 'inactive';
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  function schoolKindLabel(school) {
    return String((school && school.type) || '').toLowerCase() === 'center' ? '\u0645\u0631\u0643\u0632' : '\u0645\u062f\u0631\u0633\u0629';
  }

  function getTeacherPlaces(teacherId) {
    var byId = {};
    function addSchool(schoolId, detail) {
      if (!schoolId) return;
      var school = (window.A.schools || []).find(function (s) { return s.id === schoolId; });
      if (!school || String(school.status || 'active') === 'deleted') return;
      if (!byId[school.id]) byId[school.id] = { school: school, details: [] };
      if (detail && byId[school.id].details.indexOf(detail) === -1) byId[school.id].details.push(detail);
    }

    var teacher = (window.A.teachers || []).find(function (t) { return t.id === teacherId; }) || {};
    addSchool(teacher.schoolId, '\u0645\u0633\u062c\u0644');
    (teacher.schools || []).forEach(function (schoolId) { addSchool(schoolId, '\u0645\u0631\u062a\u0628\u0637'); });

    (window.A.classes || []).forEach(function (cls) {
      if (cls.teacherId !== teacherId || String(cls.status || 'active') === 'deleted') return;
      addSchool(cls.schoolId, cls.grade || cls.name || '\u0635\u0641');
    });
    (window.A.courses || []).forEach(function (course) {
      if ((course.trainerId || course.teacherId) !== teacherId || String(course.status || course.courseStatus || 'active') === 'deleted') return;
      addSchool(course.schoolId, course.name || '\u062f\u0648\u0631\u0629');
    });

    return Object.keys(byId).map(function (id) { return byId[id]; }).sort(function (a, b) {
      return String(a.school.name || '').localeCompare(String(b.school.name || ''), 'ar');
    });
  }

  window.openTeacherPlaces = function (teacherId) {
    var teacher = (window.A.teachers || []).find(function (t) { return t.id === teacherId; }) || {};
    var rows = getTeacherPlaces(teacherId);
    var titleEl = document.getElementById('school-related-title');
    var listEl = document.getElementById('school-related-list');
    if (!listEl) return;
    if (titleEl) titleEl.textContent = '\u0623\u0645\u0627\u0643\u0646 \u062a\u062f\u0631\u064a\u0633 ' + (teacher.name || '');
    listEl.innerHTML = rows.length ? rows.map(function (row) {
      var school = row.school;
      return '<div class="related-item">' +
        '<div><strong>' + window.esc(school.name || '\u2014') + '</strong>' +
        '<div>' + window.esc(schoolKindLabel(school) + (row.details.length ? ' - ' + row.details.join('\u060c ') : '')) + '</div></div>' +
        '<span class="badge badge-blue">' + window.esc(school.city || '') + '</span>' +
      '</div>';
    }).join('') : '<div class="empty"><div class="empty-icon">\ud83c\udfeb</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0623\u0645\u0627\u0643\u0646 \u0645\u0631\u062a\u0628\u0637\u0629</div>';
    window.openModal('modal-school-related');
  };

  function ensureSelectOption(selectId, value, label) {
    var sel = document.getElementById(selectId);
    if (!sel || !value) return;
    var str = String(value);
    var exists = Array.prototype.some.call(sel.options, function (opt) { return opt.value === str; });
    if (!exists) {
      var opt = document.createElement('option');
      opt.value = str;
      opt.textContent = label || str;
      sel.appendChild(opt);
    }
    sel.value = str;
  }

  function classRowKey(schoolId, grade, section) {
    return [
      String(schoolId || '').trim(),
      String(grade || '').trim().toLowerCase(),
      String(section || '').trim().toLowerCase()
    ].join('::');
  }

  function getHiddenClassRows() {
    try {
      var parsed = JSON.parse(localStorage.getItem('cq_hidden_class_rows') || '{}');
      return { ids: parsed.ids || {}, keys: parsed.keys || {} };
    } catch (e) {
      return { ids: {}, keys: {} };
    }
  }

  function saveHiddenClassRows(hidden) {
    localStorage.setItem('cq_hidden_class_rows', JSON.stringify(hidden || { ids: {}, keys: {} }));
  }

  function hideClassRow(classId, schoolId, grade, section) {
    var hidden = getHiddenClassRows();
    hidden.ids = hidden.ids || {};
    hidden.keys = hidden.keys || {};
    if (classId) hidden.ids[classId] = true;
    hidden.keys[classRowKey(schoolId, grade, section)] = true;
    saveHiddenClassRows(hidden);
  }

  function renderClassesDirectory() {
    window._amReg = {};
    var _amIdx = 0;
    var state = getState();
    var wrap = document.getElementById('classes-directory');
    if (!wrap) return;

    var schoolFilter = (document.getElementById('class-school-filter') || {}).value || '';
    var textFilter = ((document.getElementById('class-search') || {}).value || '').trim();
    var activeTabBtn = document.querySelector('.classes-split-tabs .inner-tab.active');
    var activeTab = (activeTabBtn && activeTabBtn.getAttribute('data-classes-tab')) || 'classes';
    var classesDisplay = activeTab === 'courses' ? ' style="display:none"' : '';
    var coursesDisplay = activeTab === 'courses' ? '' : ' style="display:none"';
    var classMap = {};
    var hiddenRows = getHiddenClassRows();

    function isCenter(school) {
      return String((school && school.type) || '').toLowerCase() === 'center';
    }

    function schoolById(schoolId) {
      return state.schools.find(function (s) { return s.id === schoolId; }) || null;
    }

    function normalizeClassPart(value) {
      return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[أإآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .toLowerCase();
    }

    function normalizeClassSection(value) {
      return normalizeClassPart(value).replace(/^[|il]$/g, 'ا');
    }

    function displayClassPart(value, fallback) {
      var text = String(value || '').trim().replace(/\s+/g, ' ');
      return text || fallback || '';
    }

    function splitClassParts(name, section) {
      var cleanName = displayClassPart(name);
      var cleanSection = displayClassPart(section);
      var parts = cleanName.split(' ');
      var last = parts.length ? parts[parts.length - 1] : '';
      if (last && normalizeClassSection(last) === normalizeClassSection(cleanSection || last)) {
        cleanSection = cleanSection || last;
        if (parts.length > 1) cleanName = parts.slice(0, -1).join(' ');
      }
      return {
        grade: cleanName,
        section: cleanSection
      };
    }

    function classMapKey(school, schoolId, grade, section) {
      return [
        normalizeClassPart((school && school.name) || schoolId),
        normalizeClassPart(grade),
        normalizeClassSection(section)
      ].join('::');
    }

    function mergeClassRow(target, source) {
      if (!target.id && source.id) target.id = source.id;
      if ((!target.teacherId || target.teacherId === 'admin-unassigned') && source.teacherId) target.teacherId = source.teacherId;
      if (!assistantNameFor(target, 'teacher') && assistantNameFor(source, 'teacher')) {
        target.assistantTeacherId = source.assistantTeacherId || source.teacherAssistantId || source.coTeacherId || source.assistantId || '';
        target.assistantTeacherName = assistantNameFor(source, 'teacher');
      }
      if (target.status !== 'inactive' && source.status === 'inactive') target.status = 'inactive';
      target.activeCount += source.activeCount || 0;
      target.pendingCount += source.pendingCount || 0;
      target.centerActiveCount += source.centerActiveCount || 0;
      target.centerPendingCount += source.centerPendingCount || 0;
      return target;
    }

    function isHiddenClassRow(row) {
      if (!row) return false;
      if (row.id && hiddenRows.ids[row.id]) return true;
      return !!hiddenRows.keys[classRowKey(row.schoolId, row.grade || row.label || '', row.section || '')];
    }

    (state.classes || []).forEach(function (cls) {
      var schoolId = cls.schoolId || cls.school || '';
      if (!isSchoolActive(schoolId)) return;
      var school = schoolById(schoolId);
      if (isCenter(school)) return;
      var parts = splitClassParts(cls.grade || cls.name || '', cls.section || '');
      var grade = parts.grade;
      var section = parts.section;
      var label = grade;
      var key = classMapKey(school, schoolId, grade || label, section);
      if (!grade && !label) return;

      var row = {
        id: cls.id || '',
        schoolId: schoolId,
        schoolName: school ? school.name : '-',
        grade: grade,
        section: section || '-',
        label: displayClassPart(label || grade),
        teacherId: cls.teacherId || '',
        assistantTeacherId: cls.assistantTeacherId || cls.teacherAssistantId || cls.coTeacherId || cls.assistantId || '',
        assistantTeacherName: assistantNameFor(cls, 'teacher'),
        status: cls.status || 'active',
        activeCount: 0,
        pendingCount: 0,
        centerActiveCount: 0,
        centerPendingCount: 0
      };
      classMap[key] = classMap[key] ? mergeClassRow(classMap[key], row) : row;
    });

    state.students.forEach(function (student) {
      var schoolId = student.schoolId || '';
      if (!isSchoolActive(schoolId)) return;
      var school = schoolById(schoolId);
      if (isCenter(school)) return;
      var parts = splitClassParts(student.class || '', student.section || '');
      var grade = parts.grade;
      var section = parts.section;
      var label = (grade + ' ' + section).trim();
      var key = classMapKey(school, schoolId, grade, section);
      if (!grade) return;

      if (!classMap[key]) {
        classMap[key] = {
          id: '',
          schoolId: schoolId,
          schoolName: school ? school.name : '—',
          grade: grade,
          section: section || '—',
          label: label || grade,
          status: 'active',
          activeCount: 0,
          pendingCount: 0,
          centerActiveCount: 0,
          centerPendingCount: 0
        };
      }

      if (student.status === 'active') classMap[key].activeCount += 1;
      else classMap[key].pendingCount += 1;
    });

    var cf = ((window.A || {}).colFilters || {}).classes || {};
    var classRows = Object.keys(classMap).map(function (key) { return classMap[key]; }).filter(function (row) {
      if (isHiddenClassRow(row)) return false;
      var matchesSchool = !schoolFilter || row.schoolId === schoolFilter;
      var hay = [row.schoolName, row.grade, row.section, row.label].join(' ');
      var matchesText = !textFilter || hay.indexOf(textFilter) !== -1;
      var cfGrade   = !cf.grade  || (row.grade || row.label || '') === cf.grade;
      var cfSchool  = !cf.school || row.schoolId === cf.school;
      var cfStatus  = !cf.status || (row.status || 'active') === cf.status;
      var cfTeacher = !cf.teacher || (function() {
        var t = (state.teachers || []).find(function(x){ return x.id === row.teacherId; });
        return t && t.name === cf.teacher;
      })();
      return matchesSchool && matchesText && cfGrade && cfSchool && cfStatus && cfTeacher;
    }).sort(function (a, b) {
      if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName, 'ar');
      return a.label.localeCompare(b.label, 'ar');
    });
    var renderedClassRows = {};
    classRows = classRows.filter(function (row) {
      var key = [
        normalizeClassPart(row.schoolName || row.schoolId),
        normalizeClassPart(row.grade || row.label),
        normalizeClassSection(row.section)
      ].join('::');
      if (renderedClassRows[key]) {
        mergeClassRow(renderedClassRows[key], row);
        return false;
      }
      renderedClassRows[key] = row;
      return true;
    });

    var classRowsHtml = classRows.length ? classRows.map(function (row) {
      var teacher = (state.teachers || []).find(function (t) { return t.id === row.teacherId; });
      var teacherName = teacher ? teacher.name : null;
      var assistantTeacherName = assistantNameFor(row, 'teacher');
      var totalStudents = row.activeCount + row.pendingCount;
      var totalCenter = (row.centerActiveCount || 0) + (row.centerPendingCount || 0);
      var totalSchool = row.activeCount + row.pendingCount;
      var rowStatus = row.status || 'active';
      var statusBadge = rowStatus === 'inactive'
        ? '<span class="badge badge-inactive">\u0645\u0639\u0637\u0644</span>'
        : row.pendingCount
        ? '<span class="badge badge-pending">\u064a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629</span>'
        : '<span class="badge badge-active">\u0646\u0634\u0637</span>';
      var safeLabel = window.esc(String(row.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var safeGrade = window.esc(String(row.grade || row.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var safeSection = window.esc(String(row.section || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var amClassKey = 'c' + (++_amIdx);
      window.amReg(amClassKey, {
        subtype: 'class',
        classId: row.id || '',
        schoolId: row.schoolId,
        grade: safeGrade,
        section: safeSection,
        status: rowStatus,
        teacherId: (row.teacherId && row.teacherId !== 'admin-unassigned') ? row.teacherId : '',
        label: safeLabel,
        hideEdit: true
      });
      var classEditAction = row.id
        ? 'openEditClass(\'' + row.id + '\')'
        : 'openEditVirtualClass(\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')';

      return '<tr>' +
        '<td><strong class="class-table-title">' + window.esc(row.label) + '</strong></td>' +
        '<td><span class="badge badge-blue">' + window.esc(row.section || '\u2014') + '</span></td>' +
        '<td>' + window.esc(row.schoolName || '\u2014') + '</td>' +
        '<td>' + (teacherName ? window.esc(teacherName) : (row.id ? '<button class="assign-teacher-quick-btn" onclick="openAssignTeacherToClass(\'' + row.id + '\',\'' + safeLabel + '\')">+ حدد المعلم</button>' : '<span class="no-teacher-label">غير متاح</span>')) + '</td>' +
        '<td>' + (assistantTeacherName
          ? window.esc(assistantTeacherName)
          : (row.id && teacherName ? '<button class="assign-teacher-quick-btn" type="button" onclick="openAssignClassAssistant(\'' + row.id + '\',\'' + safeLabel + '\')">+ حدد مساعد المعلم</button>' : '<button class="assign-teacher-quick-btn" type="button" disabled title="حدد المعلم أولاً">حدد المعلم أولاً</button>')) + '</td>' +
        '<td class="class-student-count"><button class="class-student-count-btn" type="button" onclick="openClassStudents(\'class\',\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')"><strong>' + totalSchool + '</strong><span>' + row.activeCount + ' \u0646\u0634\u0637</span></button></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td class="row-actions-cell"><div class="split-action">' +
          '<button class="split-action-primary" type="button" onclick="' + classEditAction + '">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="split-action-menu" type="button" title="\u0627\u0644\u0623\u0648\u0627\u0645\u0631" aria-label="\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0635\u0641" aria-haspopup="menu" onclick="toggleActionMenu(this,\'reg\',\'' + amClassKey + '\',\'\')"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="8"><div class="empty"><div class="empty-icon">\ud83c\udfeb</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0645\u062f\u0627\u0631\u0633 \u0645\u0637\u0627\u0628\u0642\u0629</div></td></tr>';

    var cfCourses = ((window.A || {}).colFilters || {}).courses || {};
    var courseRows = (state.courses || []).filter(function (course) {
      var schoolId = course.schoolId || '';
      if (!isSchoolActive(schoolId)) return false;
      var school = schoolById(schoolId);
      if (!isCenter(school)) return false;
      var matchesSchool = !schoolFilter || schoolId === schoolFilter;
      var hay = [school ? school.name : '', course.name || '', course.trainerName || '', course.startTime || '', course.endTime || '', course.weeks || ''].join(' ');
      var matchesText   = !textFilter || hay.indexOf(textFilter) !== -1;
      var cfSchool  = !cfCourses.school || schoolId === cfCourses.school;
      var cfStatus  = !cfCourses.status || (course.courseStatus || course.activeStatus || 'active') === cfCourses.status;
      return matchesSchool && matchesText && cfSchool && cfStatus;
    }).sort(function (a, b) {
      var as = schoolById(a.schoolId);
      var bs = schoolById(b.schoolId);
      var an = as ? as.name : '';
      var bn = bs ? bs.name : '';
      if (an !== bn) return an.localeCompare(bn, 'ar');
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
    var renderedCourseRows = {};
    courseRows = courseRows.filter(function (course) {
      var key = [
        String(course.schoolId || '').trim(),
        normalizeRelatedText(course.name || ''),
        String(course.startTime || '').trim(),
        String(course.endTime || '').trim(),
        String(course.weeks || '').trim()
      ].join('::');
      if (renderedCourseRows[key]) {
        var existing = renderedCourseRows[key];
        if (!existing.trainerId && course.trainerId) existing.trainerId = course.trainerId;
        if (!existing.trainerName && course.trainerName) existing.trainerName = course.trainerName;
        if (!assistantNameFor(existing, 'trainer') && assistantNameFor(course, 'trainer')) {
          existing.assistantTrainerId = course.assistantTrainerId || course.trainerAssistantId || course.coTrainerId || course.assistantId || '';
          existing.assistantTrainerName = assistantNameFor(course, 'trainer');
        }
        if (existing.courseStatus !== 'inactive' && (course.courseStatus === 'inactive' || course.activeStatus === 'inactive')) existing.courseStatus = 'inactive';
        if (!existing.id && course.id) existing.id = course.id;
        return false;
      }
      renderedCourseRows[key] = course;
      return true;
    });

    var courseRowsHtml = courseRows.length ? courseRows.map(function (course) {
      var center = schoolById(course.schoolId);
      var trainerName = course.trainerName || '';
      var assistantTrainerName = assistantNameFor(course, 'trainer');
      var time = fmtTime(course.startTime) + ' - ' + fmtTime(course.endTime);
      var courseStatus = course.courseStatus || course.activeStatus || 'active';
      var courseStudents = (state.students || []).filter(function (student) {
        return (student.schoolId || '') === (course.schoolId || '') && String(student.class || '') === String(course.name || '');
      });
      var centerCourseStudents = courseStudents.filter(function (student) {
        var sc = schoolById(student.schoolId || '');
        return isCenter(sc);
      });
      var schoolCourseStudents = courseStudents.filter(function (student) {
        var sc = schoolById(student.schoolId || '');
        return !isCenter(sc);
      });
      var centerCourseActive = centerCourseStudents.filter(function (student) { return student.status === 'active'; }).length;
      var schoolCourseActive = schoolCourseStudents.filter(function (student) { return student.status === 'active'; }).length;
      var courseActiveStudents = centerCourseActive + schoolCourseActive;
      var trainerActionLabel = course.trainerId ? '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u062f\u0631\u0628' : '\u0631\u0628\u0637 \u0627\u0644\u0645\u062f\u0631\u0628';
      var trainerActionClass = course.trainerId ? 'btn-blue' : 'btn-purple';
      var safeCourseName = window.esc(String(course.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var courseStatusAction = courseStatus === 'inactive'
        ? '<button class="btn btn-xs btn-green action-chip" onclick="doToggleCourseStatus(\'' + course.id + '\',\'active\')">\u062a\u0641\u0639\u064a\u0644</button>'
        : '<button class="btn btn-xs btn-danger action-chip" onclick="doToggleCourseStatus(\'' + course.id + '\',\'inactive\')">\u062a\u0639\u0637\u064a\u0644</button>';
      var amCourseKey = 'c' + (++_amIdx);
      window.amReg(amCourseKey, {
        subtype: 'course',
        courseId: course.id,
        schoolId: course.schoolId,
        courseName: safeCourseName,
        status: courseStatus,
        hasTrainer: !!course.trainerId,
        hideEdit: true
      });

      return '<tr>' +
        '<td><strong class="class-table-title">' + window.esc(course.name || '\u2014') + '</strong><div class="class-table-sub">\u062f\u0648\u0631\u0629 \u0645\u0631\u0643\u0632</div></td>' +
        '<td>' + window.esc(center ? center.name : '\u2014') + '</td>' +
        '<td><span class="badge badge-purple">' + window.esc(time) + '</span></td>' +
        '<td>' + window.esc(course.weeks || '\u2014') + '</td>' +
        '<td>' + (trainerName ? window.esc(trainerName) : '<button class="assign-teacher-quick-btn" onclick="openAssignTrainerToCourse(\'' + course.id + '\',\'' + safeCourseName + '\')">+ \u062d\u062f\u062f \u0645\u062f\u0631\u0628</button>') + '</td>' +
        '<td>' + (assistantTrainerName
          ? '<button class="assign-teacher-quick-btn" type="button" onclick="openAssignCourseAssistant(\'' + course.id + '\',\'' + safeCourseName + '\')">' + window.esc(assistantTrainerName) + '</button>'
          : (trainerName ? '<button class="assign-teacher-quick-btn" type="button" onclick="openAssignCourseAssistant(\'' + course.id + '\',\'' + safeCourseName + '\')">+ حدد مساعد المدرب</button>' : '<button class="assign-teacher-quick-btn" type="button" disabled title="حدد المدرب أولاً">حدد المدرب</button>')) + '</td>' +
        '<td class="class-student-count"><button class="class-student-count-btn" type="button" onclick="openClassStudents(\'course\',\'' + course.schoolId + '\',\'' + safeCourseName + '\',\'\')"><strong>' + courseStudents.length + '</strong><span>' + courseActiveStudents + ' \u0646\u0634\u0637</span></button></td>' +
        '<td>' + (courseStatus === 'inactive' ? '<span class="badge badge-inactive">\u0645\u0639\u0637\u0644</span>' : '<span class="badge badge-active">\u0646\u0634\u0637</span>') + '</td>' +
        '<td class="row-actions-cell"><div class="split-action">' +
          '<button class="split-action-primary" type="button" onclick="openEditCourse(\'' + course.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="split-action-menu" type="button" title="\u0627\u0644\u0623\u0648\u0627\u0645\u0631" aria-label="\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062f\u0648\u0631\u0629" aria-haspopup="menu" onclick="toggleActionMenu(this,\'reg\',\'' + amCourseKey + '\',\'\')"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="9"><div class="empty"><div class="empty-icon">\ud83e\udde9</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0648\u0631\u0627\u062a \u0645\u0631\u0627\u0643\u0632 \u0645\u0637\u0627\u0628\u0642\u0629</div></td></tr>';

    wrap.innerHTML =
      '<div id="classes-tab-classes" class="classes-directory-tab"' + classesDisplay + '>' +
        '<div class="tbl-wrap classes-table-wrap">' +
          '<table class="data-table classes-table">' +
            '<thead><tr>' +
            '<th><span class="th-fw">\u0627\u0644\u0635\u0641 <button class="cfb" data-tbl="classes" data-col="grade" onclick="openColFilter(this,\'classes\',\'grade\')" title="\u0641\u0644\u062a\u0631">&#9662;</button></span></th>' +
            '<th>\u0627\u0644\u0634\u0639\u0628\u0629</th>' +
            '<th><span class="th-fw">\u0627\u0644\u0645\u062f\u0631\u0633\u0629 <button class="cfb" data-tbl="classes" data-col="school" onclick="openColFilter(this,\'classes\',\'school\')" title="\u0641\u0644\u062a\u0631">&#9662;</button></span></th>' +
            '<th><span class="th-fw">\u0627\u0644\u0645\u0639\u0644\u0645 <button class="cfb" data-tbl="classes" data-col="teacher" onclick="openColFilter(this,\'classes\',\'teacher\')" title="\u0641\u0644\u062a\u0631">&#9662;</button></span></th>' +
            '<th>\u0645\u0633\u0627\u0639\u062f \u0627\u0644\u0645\u0639\u0644\u0645</th><th>\u0627\u0644\u0637\u0644\u0627\u0628</th>' +
            '<th><span class="th-fw">\u0627\u0644\u062d\u0627\u0644\u0629 <button class="cfb" data-tbl="classes" data-col="status" onclick="openColFilter(this,\'classes\',\'status\')" title="\u0641\u0644\u062a\u0631">&#9662;</button></span></th>' +
            '<th>\u0625\u062c\u0631\u0627\u0621\u0627\u062a</th>' +
            '</tr></thead>' +
            '<tbody>' + classRowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
      '<div id="classes-tab-courses" class="classes-directory-tab"' + coursesDisplay + '>' +
        '<div class="tbl-wrap classes-table-wrap">' +
          '<table class="data-table classes-table table-courses">' +
            '<thead><tr>' +
            '<th>\u0627\u0644\u062f\u0648\u0631\u0629</th>' +
            '<th><span class="th-fw">\u0627\u0644\u0645\u0631\u0643\u0632 <button class="cfb" data-tbl="courses" data-col="school" onclick="openColFilter(this,\'courses\',\'school\')" title="\u0641\u0644\u062a\u0631">&#9662;</button></span></th>' +
            '<th>\u0627\u0644\u0648\u0642\u062a</th>' +
            '<th>\u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639</th>' +
            '<th>\u0627\u0644\u0645\u062f\u0631\u0628</th>' +
            '<th>\u0645\u0633\u0627\u0639\u062f \u0627\u0644\u0645\u062f\u0631\u0628</th>' +
            '<th>\u0627\u0644\u0637\u0644\u0627\u0628</th>' +
            '<th><span class="th-fw">\u0627\u0644\u062d\u0627\u0644\u0629 <button class="cfb" data-tbl="courses" data-col="status" onclick="openColFilter(this,\'courses\',\'status\')" title="\u0641\u0644\u062a\u0631">&#9662;</button></span></th>' +
            '<th>\u0625\u062c\u0631\u0627\u0621\u0627\u062a</th>' +
            '</tr></thead>' +
            '<tbody>' + courseRowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  function mergeDirectoryClasses(list) {
    var existing = {};
    window.A.classes = window.A.classes || [];
    window.A.classes.forEach(function (c) {
      var key = c.id || [c.schoolId || c.school || '', c.name || c.grade || '', c.section || ''].join('::');
      if (key) existing[key] = true;
    });
    (list || []).forEach(function (c) {
      var key = c.id || [c.schoolId || c.school || '', c.name || c.grade || '', c.section || ''].join('::');
      if (!key || existing[key]) return;
      existing[key] = true;
      window.A.classes.push(c);
    });
  }

  window.loadClassesForDirectoryFilter = function () {
    var wrap = document.getElementById('classes-directory');
    var loadingHtml = '<div class="tbl-wrap classes-table-wrap"><table class="data-table classes-table"><tbody><tr><td colspan="9"><div class="empty"><div class="empty-icon">...</div>\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u0648\u0641 \u0648\u0627\u0644\u062f\u0648\u0631\u0627\u062a</div></td></tr></tbody></table></div>';
    if (wrap) wrap.innerHTML = loadingHtml;
    var ids = ['admin-unassigned'].concat((window.A.teachers || []).map(function (t) { return t.id; }).filter(Boolean));
    Promise.all(ids.map(function (id) {
      return window.CQ_API.getClasses(id).then(function (r) {
        mergeDirectoryClasses(r.classes || r.data || []);
      }).catch(function () {});
    }).concat([
      window.CQ_API.getCourses(window.A.token || '').then(function (r) {
        window.A.courses = r.courses || r.data || window.A.courses || [];
      }).catch(function () {})
    ])).then(function () {
      renderClassesDirectory();
    }).catch(function () {
      renderClassesDirectory();
    });
  };

  var originalInitAuth = window.initAuth;
  if (typeof originalInitAuth === 'function') {
    window.initAuth = function () {
      renderAdminPermissions();
      return originalInitAuth.apply(this, arguments);
    };
  }

  var originalUpdateStats = window.updateStats;
  if (typeof originalUpdateStats === 'function') {
    window.updateStats = function () {
      var result = originalUpdateStats.apply(this, arguments);
      renderAdminCommandCenter();
      return result;
    };
  }

  var originalRenderRequestsTables = window.renderRequestsTables;
  if (typeof originalRenderRequestsTables === 'function') {
    window.renderRequestsTables = function () {
      var result = originalRenderRequestsTables.apply(this, arguments);
      renderAdminCommandCenter();
      return result;
    };
  }

  var originalRenderNotifList = window.renderNotifList;
  if (typeof originalRenderNotifList === 'function') {
    window.renderNotifList = function () {
      var result = originalRenderNotifList.apply(this, arguments);
      renderOverviewActivity();
      return result;
    };
  }

  var originalDoAddSchool = window.doAddSchool;
  if (typeof originalDoAddSchool === 'function') {
    window.doAddSchool = function () {
      var nameEl = document.getElementById('school-name');
      var cityEl = document.getElementById('school-city');
      var typeEl = document.getElementById('school-type');
      var name = nameEl ? nameEl.value.trim() : '';
      var city = cityEl ? cityEl.value.trim() : '';
      var type = typeEl ? typeEl.value : 'school';
      if (!name) {
        if (typeof window.showMsg === 'function') window.showMsg('school-msg', '\u0627\u0633\u0645 \u0627\u0644\u0645\u062f\u0631\u0633\u0629/\u0627\u0644\u0645\u0631\u0643\u0632 \u0645\u0637\u0644\u0648\u0628', 'err');
        return;
      }
      window.CQ_API.createSchool({ name: name, city: city, type: type }, window.A && window.A.token).then(function (res) {
        if (res && (res.ok || res.success)) {
          if (typeof window.closeModal === 'function') window.closeModal('modal-addschool');
          if (typeof window.loadSchools === 'function') window.loadSchools();
        } else if (typeof window.showMsg === 'function') {
          window.showMsg('school-msg', (res && (res.message || res.msg)) || '\u062d\u062f\u062b \u062e\u0637\u0623', 'err');
        }
      }).catch(function () {
        if (typeof window.showMsg === 'function') window.showMsg('school-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err');
      });
    };
  }

  var originalOpenAddChallenge = window.openAddChallenge;
  if (typeof originalOpenAddChallenge === 'function') {
    window.openAddChallenge = function () {
      alert('\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u062d\u062f\u064a\u0627\u062a \u0645\u062a\u0627\u062d \u0644\u0644\u0645\u0628\u062a\u0643\u0631 \u0641\u0642\u0637. \u064a\u0633\u062a\u0637\u064a\u0639 \u0627\u0644\u0623\u062f\u0645\u0646 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u062d\u062f\u064a\u0627\u062a \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0648\u0627\u0644\u0645\u0633\u0648\u062f\u0627\u062a \u0641\u0642\u0637.');
    };
  }

  var originalDoSaveChallenge = window.doSaveChallenge;
  if (typeof originalDoSaveChallenge === 'function') {
    window.doSaveChallenge = function () {
      if (!window.A || !window.A._editChalId) {
        if (typeof window.showMsg === 'function') {
          window.showMsg('chal-msg', '\u0627\u0644\u0623\u062f\u0645\u0646 \u0644\u0627 \u064a\u0646\u0634\u0626 \u062a\u062d\u062f\u064a\u0627\u062a \u062c\u062f\u064a\u062f\u0629. \u0627\u0644\u062a\u062d\u062f\u064a \u064a\u062c\u0628 \u0623\u0646 \u064a\u0623\u062a\u064a \u0645\u0646 \u062d\u0633\u0627\u0628 \u0645\u0628\u062a\u0643\u0631.', 'err');
        }
        return;
      }
      return originalDoSaveChallenge.apply(this, arguments);
    };
  }

  function badgeStatus(status) {
    return status === 'active'
      ? '<span class="badge badge-active">\u0646\u0634\u0637</span>'
      : '<span class="badge badge-pending">\u0645\u0639\u0644\u0642</span>';
  }

  window.initAuth = function () {
    var token = sessionStorage.getItem('admin_token');
    var username = sessionStorage.getItem('admin_username') || '\u0627\u0644\u0623\u062f\u0645\u0646';
    if (!token) { location.href = './auth-admin.html'; return; }

    window.A.session = { name: username, role: 'admin' };
    window.A.token = token;

    document.getElementById('app').style.display = 'block';
    document.getElementById('sb-name').textContent = username;
    document.getElementById('ov-name').textContent = username;
    var tbName = document.getElementById('topbar-name');
    if (tbName) tbName.textContent = username;

    var days = [
      '\u0627\u0644\u0623\u062d\u062f',
      '\u0627\u0644\u0627\u062b\u0646\u064a\u0646',
      '\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621',
      '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621',
      '\u0627\u0644\u062e\u0645\u064a\u0633',
      '\u0627\u0644\u062c\u0645\u0639\u0629',
      '\u0627\u0644\u0633\u0628\u062a'
    ];
    var now = new Date();
    var dateEl = document.getElementById('ov-date');
    if (dateEl) dateEl.textContent = days[now.getDay()] + '\u060c ' + now.toLocaleDateString('ar-SA');

    window.loadAll();
  };

  window.doLogout = function () {
    if (!confirm('\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c\u061f')) return;
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_username');
    location.href = './auth-admin.html';
  };

  window.updateStats = function () {
    var stSchools = document.getElementById('st-schools');
    var stTeachers = document.getElementById('st-teachers');
    var stStudents = document.getElementById('st-students');
    var stChallenges = document.getElementById('st-challenges');
    var heroSummary = document.getElementById('hero-summary');

    if (stSchools) stSchools.textContent = window.A.schools.length;
    if (stTeachers) stTeachers.textContent = window.A.teachers.length;
    if (stStudents) stStudents.textContent = window.A.students.length;
    if (stChallenges) stChallenges.textContent = window.A.challenges.filter(function (c) { return c.status === 'published'; }).length;
    if (heroSummary) {
      heroSummary.textContent =
        window.A.schools.length + ' \u0645\u062f\u0631\u0633\u0629 | ' +
        window.A.teachers.length + ' \u0645\u0639\u0644\u0645 | ' +
        window.A.students.length + ' \u0637\u0627\u0644\u0628';
    }
    renderAdminCommandCenter();
    renderClassesDirectory();
  };

  window.populateSchoolSelects = function () {
    var savedStatuses = schoolStatusMap();
    var opts = window.A.schools.filter(function (s) {
      return (savedStatuses[s.id] || s.status || 'active') !== 'inactive';
    }).map(function (s) {
      var typeLabel = String(s.type || '').toLowerCase() === 'center' ? 'مركز' : 'مدرسة';
      return '<option value="' + s.id + '">' + window.esc(typeLabel + ': ' + s.name) + '</option>';
    }).join('');
    ['teacher-school-sel', 'student-school-sel', 'import-teacher-school', 'class-school-filter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var prefix = id === 'class-school-filter'
        ? '<option value="">كل المدارس والمراكز</option>'
        : '<option value="">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062f\u0627\u0631\u0633</option>';
      el.innerHTML = (id === 'class-school-filter' ? '<option value="">كل المدارس والمراكز</option>' : '') + (opts || prefix);
    });
    populateStudentClassInputs();
  };

  window.populateStudentSchoolFilter = function () {
    var sel = document.getElementById('student-school-filter');
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">\u0643\u0644 \u0627\u0644\u0645\u062f\u0627\u0631\u0633</option>' +
      window.A.schools.filter(function (s) { return isSchoolActive(s.id); }).map(function (s) {
        return '<option value="' + s.id + '">' + window.esc(s.name) + '</option>';
      }).join('');
    sel.value = current;
  };

  window.renderSchoolsTable = function (filter) {
    var tbody = document.getElementById('schools-tbody');
    if (!tbody) return;
    var savedStatuses = {};
    try { savedStatuses = JSON.parse(localStorage.getItem('cq_school_status_overrides') || '{}'); } catch (e) {}
    var cf = ((window.A.colFilters || {}).schools) || {};
    var list = window.A.schools.filter(function (s) {
      var matchText   = !filter || (s.name || '').includes(filter) || (s.city || '').includes(filter);
      var matchType   = !cf.type   || (s.type   || 'school') === cf.type;
      var matchStatus = !cf.status || (s.status || 'active') === cf.status;
      return matchText && matchType && matchStatus;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">🏫</div>لا توجد مدارس بعد</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (s) {
      var teacherCount = getSchoolTeachers(s.id).length;
      var studentCount = getSchoolStudents(s.id).length;
      var classCount = getSchoolClassesOrCourses(s.id).length;
      var status = savedStatuses[s.id] || s.status || 'active';
      var isActive = status !== 'inactive';
      var amSchoolKey = 'sd-' + s.id;
      window.amReg(amSchoolKey, {
        subtype: 'school-dir',
        schoolId: s.id,
        isCenter: s.type === 'center',
        status: status,
        hideEdit: true
      });
      return '<tr' + (isActive ? '' : ' style="opacity:.6"') + '>' +
        '<td><strong>' + window.esc(s.name) + '</strong><div style="font-size:.75rem;color:#888">' + window.esc(s.city || '') + '</div></td>' +
        '<td><span class="badge badge-blue">' + (s.type === 'center' ? 'مركز' : 'مدرسة') + '</span></td>' +
        '<td>' + badgeStatus(status) + '</td>' +
        '<td style="text-align:center"><button class="count-link" onclick="openSchoolRelated(\'' + s.id + '\',\'teachers\')">' + teacherCount + '</button></td>' +
        '<td style="text-align:center"><button class="count-link" onclick="openSchoolRelated(\'' + s.id + '\',\'students\')">' + studentCount + '</button></td>' +
        '<td style="text-align:center"><button class="count-link" onclick="openSchoolRelated(\'' + s.id + '\',\'classes\')">' + classCount + '</button></td>' +
        '<td class="row-actions-cell"><div class="split-action">' +
          '<button class="split-action-primary" type="button" onclick="openEditSchool(\'' + s.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="split-action-menu" type="button" title="\u0627\u0644\u0623\u0648\u0627\u0645\u0631" aria-label="\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u062f\u0631\u0633\u0629" aria-haspopup="menu" onclick="toggleActionMenu(this,\'reg\',\'' + amSchoolKey + '\',\'\')"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  };

  window.openAddTeacherForSchool = function (schoolId) {
    window.openConnectTeacher(schoolId);
  };

  function getSchoolTeachers(schoolId) {
    var school = schoolByIdGlobal(schoolId);
    var isCenter = String((school && school.type) || '').toLowerCase() === 'center';
    var teacherIds = {};
    var teachers = [];

    if (isCenter) {
      (window.A.courses || []).forEach(function (course) {
        if ((course.status || '') === 'deleted' || !belongsToSchool(course, school)) return;
        var trainerId = course.trainerId || '';
        if (!trainerId || trainerId === 'admin-unassigned' || teacherIds[trainerId]) return;
        teacherIds[trainerId] = true;
        var trainer = (window.A.teachers || []).find(function (t) { return t.id === trainerId; });
        teachers.push(trainer || {
          id: trainerId,
          name: course.trainerName || trainerId,
          email: '',
          status: course.courseStatus || course.status || 'active'
        });
      });
    } else {
      (window.A.classes || []).forEach(function (cls) {
        if ((cls.status || '') === 'deleted' || !belongsToSchool(cls, school)) return;
        var teacherId = cls.teacherId || '';
        if (!teacherId || teacherId === 'admin-unassigned' || teacherIds[teacherId]) return;
        teacherIds[teacherId] = true;
        var teacher = (window.A.teachers || []).find(function (t) { return t.id === teacherId; });
        if (teacher) teachers.push(teacher);
      });
    }

    return uniqueRows(teachers, function (t) {
      return t.id || normalizeRelatedText(t.email || t.name || '');
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  function getSchoolStudents(schoolId) {
    var school = schoolByIdGlobal(schoolId);
    var isCenter = String((school && school.type) || '').toLowerCase() === 'center';
    var addedRows = isCenter ? getSchoolClassesOrCourses(schoolId) : [];
    return uniqueRows((window.A.students || []).filter(function (s) {
      if (s.status === 'deleted' || !belongsToSchool(s, school)) return false;
      if (isCenter) {
        var courseName = normalizeRelatedText(s.class || s.className || '');
        return addedRows.some(function (row) {
          return normalizeRelatedText(row.name) === courseName;
        });
      }
      return true;
    }), function (s) {
      return s.id || normalizeRelatedText(s.email || s.name || '');
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  function getTargetStudents(target) {
    target = target || {};
    var schoolId = String(target.schoolId || '');
    var className = String(target.className || '');
    var section = String(target.section || '');
    var isCourse = target.kind === 'course';
    return (window.A.students || []).filter(function (student) {
      if (student.role && student.role !== 'student') return false;
      if (student.status === 'deleted' || student.leftSchool === true || String(student.leftSchool || '') === 'true') return false;
      if (String(student.schoolId || '') !== schoolId) return false;
      var studentClass = student.class || student.className || '';
      if (isCourse) return normalizeRelatedText(studentClass) === normalizeRelatedText(className);
      var parts = splitRelatedClassParts(studentClass, student.section || '');
      return normalizeRelatedText(parts.grade) === normalizeRelatedText(className) &&
        normalizeRelatedSection(parts.section || '') === normalizeRelatedSection(section || '');
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  function renderManagedClassStudents() {
    var target = window.A._manageClassStudentsTarget || {};
    var listEl = document.getElementById('class-students-list');
    var titleEl = document.getElementById('class-students-title');
    var metaEl = document.getElementById('class-students-meta');
    if (!listEl) return;

    var school = (window.A.schools || []).find(function (s) { return s.id === target.schoolId; }) || {};
    var students = getTargetStudents(target);
    if (titleEl) titleEl.textContent = (target.kind === 'course' ? '\u0637\u0644\u0627\u0628 \u0627\u0644\u062f\u0648\u0631\u0629' : '\u0637\u0644\u0627\u0628 \u0627\u0644\u0635\u0641');
    if (metaEl) {
      metaEl.innerHTML =
        '<strong>' + window.esc(target.className || '\u2014') + '</strong>' +
        (target.section && target.kind !== 'course' ? ' <span class="badge badge-blue">' + window.esc(target.section) + '</span>' : '') +
        '<span>' + window.esc(school.name || '\u2014') + '</span>' +
        '<span>' + students.length + ' \u0637\u0627\u0644\u0628</span>';
    }

    listEl.innerHTML = students.length ? students.map(function (student) {
      var sub = [student.email || student.studentCode || '', student.status === 'inactive' ? '\u0645\u0639\u0637\u0644' : ''].filter(Boolean).join(' - ');
      return '<div class="class-student-row">' +
        '<div class="class-student-main">' +
          '<strong>' + window.esc(student.name || student.email || '\u2014') + '</strong>' +
          '<span>' + window.esc(sub || '\u2014') + '</span>' +
        '</div>' +
        '<div class="class-student-actions">' +
          '<button class="btn btn-xs btn-outline" onclick="openEditStudent(\'' + student.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="btn btn-xs btn-danger-outline" onclick="doRemoveStudentFromClass(\'' + student.id + '\')">\u0625\u0632\u0627\u0644\u0629</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="empty"><div class="empty-icon">\ud83c\udf93</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0635\u0641</div>';
  }

  function refreshManagedClassStudents() {
    var modal = document.getElementById('modal-class-students');
    if (modal && modal.classList.contains('open')) renderManagedClassStudents();
  }

  window.openClassStudents = function (kind, schoolId, className, section) {
    window.A._manageClassStudentsTarget = {
      kind: kind || 'class',
      schoolId: schoolId || '',
      className: className || '',
      section: section || ''
    };
    renderManagedClassStudents();
    window.openModal('modal-class-students');
  };

  window.openAddStudentForManagedClass = function () {
    var target = window.A._manageClassStudentsTarget || {};
    if (!target.schoolId || !target.className) return;
    openExistingStudentPicker(target);
  };

  function setSelectValue(sel, value) {
    if (!sel) return;
    value = String(value || '');
    if (value) sel.disabled = false;
    var found = Array.prototype.some.call(sel.options || [], function (opt) {
      return opt.value === value;
    });
    if (value && !found) {
      var opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      sel.appendChild(opt);
    }
    sel.value = value;
  }

  window.openCreateStudentForManagedClass = function () {
    var target = window.A._manageClassStudentsTarget || {};
    if (!target.schoolId || !target.className) return;
    window.openAddStudent();
    setSelectValue(document.getElementById('student-school-sel'), target.schoolId);
    window.onStudentSchoolChange();
    setSelectValue(document.getElementById('student-class'), target.className);
    window.onStudentClassChange();
    setSelectValue(document.getElementById('student-section'), target.section || (target.kind === 'course' ? '\u062f\u0648\u0631\u0629' : ''));
  };

  window.doRemoveStudentFromClass = function (studentId) {
    var student = (window.A.students || []).find(function (s) { return s.id === studentId; });
    if (!student) return;
    if (!confirm('\u0625\u0632\u0627\u0644\u0629 \u0647\u0630\u0627 \u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0646 \u0627\u0644\u0635\u0641\u061f')) return;
    window.CQ_API.adminUpdateUser(studentId, {
      class: '',
      section: ''
    }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        student.class = '';
        student.className = '';
        student.section = '';
        window.renderStudentsTable();
        renderClassesDirectory();
        renderManagedClassStudents();
        if (typeof window.loadStudents === 'function') window.loadStudents();
      } else {
        alert((res && (res.message || res.msg)) || '\u062d\u062f\u062b \u062e\u0637\u0623');
      }
    }).catch(function () { alert('\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645'); });
  };

  function getSchoolClassesOrCoursesLegacy(schoolId) {
    var school = (window.A.schools || []).find(function (s) { return s.id === schoolId; }) || {};
    var isCenter = String(school.type || '').toLowerCase() === 'center';
    var source = isCenter ? (window.A.courses || []) : (window.A.classes || []);
    var seen = {};
    return source.filter(function (item) {
      return item.schoolId === schoolId && item.status !== 'deleted';
    }).map(function (item) {
      return {
        id: item.id || '',
        name: item.name || item.grade || '',
        sub: isCenter
          ? [fmtTime(item.startTime), fmtTime(item.endTime)].filter(function (v) { return v && v !== '—'; }).join(' - ')
          : (item.section ? 'الشعبة ' + item.section : ''),
        status: item.courseStatus || item.status || 'active'
      };
    }).filter(function (item) {
      var key = [
        String(item.name || '').trim().toLowerCase(),
        String(item.sub || '').trim().toLowerCase()
      ].join('::');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  function getSchoolClassesOrCourses(schoolId) {
    var school = schoolByIdGlobal(schoolId) || {};
    var isCenter = String(school.type || '').toLowerCase() === 'center';
    var rows = [];

    if (isCenter) {
      rows = (window.A.courses || []).filter(function (item) {
        return (item.status || '') !== 'deleted' && belongsToSchool(item, school);
      }).map(function (item) {
        return {
          id: item.id || '',
          name: cleanRelatedText(item.name || item.grade || ''),
          sub: [fmtTime(item.startTime), fmtTime(item.endTime)].filter(function (v) { return v && v !== '—'; }).join(' - '),
          section: '',
          status: item.courseStatus || item.status || 'active'
        };
      });
    } else {
      (window.A.classes || []).forEach(function (item) {
        if ((item.status || '') === 'deleted' || !belongsToSchool(item, school)) return;
        var parts = splitRelatedClassParts(item.grade || item.name || '', item.section || '');
        rows.push({
          id: item.id || '',
          name: parts.grade,
          section: parts.section,
          status: item.status || 'active'
        });
      });

      rows = rows.map(function (item) {
        return {
          id: item.id || '',
          name: item.name || '—',
          sub: item.section ? '\u0627\u0644\u0634\u0639\u0628\u0629 ' + item.section : '',
          section: item.section || '',
          status: item.status || 'active'
        };
      });
    }

    return uniqueRows(rows, function (item) {
      return [
        normalizeRelatedText(item.name),
        normalizeRelatedSection(item.section || String(item.sub || '').replace(/^\u0627\u0644\u0634\u0639\u0628\u0629\s*/, ''))
      ].join('::');
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  window.openSchoolRelated = function (schoolId, type) {
    var school = (window.A.schools || []).find(function (s) { return s.id === schoolId; }) || {};
    var titleEl = document.getElementById('school-related-title');
    var listEl = document.getElementById('school-related-list');
    if (!listEl) return;

    var rows = [];
    var title = '';
    if (type === 'teachers') {
      rows = getSchoolTeachers(schoolId).map(function (t) {
        return { name: t.name || t.email || '—', sub: t.email || t.teacherCode || '', status: t.status || '' };
      });
      title = 'معلمو ' + (school.name || '');
    } else if (type === 'students') {
      rows = getSchoolStudents(schoolId).map(function (s) {
        return { name: s.name || s.email || '—', sub: [s.class || s.className || '', s.section || ''].filter(Boolean).join(' - '), status: s.status || '' };
      });
      title = 'طلاب ' + (school.name || '');
    } else {
      rows = getSchoolClassesOrCourses(schoolId);
      title = (String(school.type || '').toLowerCase() === 'center' ? 'دورات ' : 'صفوف ') + (school.name || '');
    }

    if (titleEl) titleEl.textContent = title;
    listEl.innerHTML = rows.length ? rows.map(function (row) {
      var badge = row.status ? '<span class="badge ' + (row.status === 'inactive' ? 'badge-inactive' : 'badge-active') + '">' + window.esc(row.status === 'inactive' ? 'معطل' : 'نشط') + '</span>' : '';
      return '<div class="related-item">' +
        '<div><strong>' + window.esc(row.name || '—') + '</strong>' +
        (row.sub ? '<div>' + window.esc(row.sub) + '</div>' : '') + '</div>' +
        badge +
      '</div>';
    }).join('') : '<div class="empty"><div class="empty-icon">📋</div>لا توجد بيانات</div>';
    window.openModal('modal-school-related');
  };

  /* ── تنسيق الوقت ── */
  function fmtTime(iso) {
    if (!iso) return '—';
    var m = String(iso).match(/T(\d{2}):(\d{2})/);
    if (m) return m[1] + ':' + m[2];
    var t = String(iso).match(/^(\d{1,2}):(\d{2})/);
    if (t) return (t[1].length === 1 ? '0' + t[1] : t[1]) + ':' + t[2];
    return iso;
  }

  /* ── توليد قائمة ساعات ── */
  function _buildTimeOptions(selId) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '';
    for (var h = 7; h <= 22; h++) {
      ['00', '30'].forEach(function (m) {
        if (h === 22 && m === '30') return;
        var label = (h > 12 ? h - 12 : h) + ':' + m + ' ' + (h < 12 ? 'ص' : h === 12 ? 'ظ' : 'م');
        var val   = (h < 10 ? '0' : '') + h + ':' + m;
        var opt   = document.createElement('option');
        opt.value = val; opt.textContent = label;
        sel.appendChild(opt);
      });
    }
  }

  /* ── عرض صفوف مدرسة ── */
  window.mgclsToggleDropdown = function (btn) {
    var td = btn.closest('td');
    var template = td ? td.querySelector('.mgcls-dropdown') : null;
    if (!template) return;

    var existing = document.getElementById('mgcls-floating-dropdown');
    var isOwn = existing && existing.dataset.owner === btn._mgclsId;

    /* أغلق أي قائمة مفتوحة */
    if (existing) { existing.remove(); }
    if (isOwn) return;

    /* أنشئ معرّف فريد للزر */
    if (!btn._mgclsId) btn._mgclsId = 'mgcls_' + Date.now();

    /* اصنع نسخة عائمة وألحقها بـ body */
    var floating = document.createElement('div');
    floating.id = 'mgcls-floating-dropdown';
    floating.dataset.owner = btn._mgclsId;
    floating.className = 'mgcls-dropdown';
    floating.innerHTML = template.innerHTML;
    floating.style.display = '';
    document.body.appendChild(floating);

    /* حدّد موقعه بناءً على مكان الزر */
    var rect = btn.getBoundingClientRect();
    floating.style.position = 'fixed';
    floating.style.zIndex   = '9999';
    var dropW = floating.offsetWidth;
    var left  = rect.right - dropW;
    var top   = rect.bottom + 4;
    /* إذا خرج من أسفل الشاشة، اعكسه للأعلى */
    if (top + floating.offsetHeight > window.innerHeight - 8) {
      top = rect.top - floating.offsetHeight - 4;
    }
    floating.style.left = Math.max(8, left) + 'px';
    floating.style.top  = top + 'px';
  };

  if (!window._mgclsOutsideHandler) {
    window._mgclsOutsideHandler = true;
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.split-action-menu') && !e.target.closest('#mgcls-floating-dropdown')) {
        var d = document.getElementById('mgcls-floating-dropdown');
        if (d) d.remove();
      }
    });
  }

  function _renderMgClsList(schoolId) {
    var el = document.getElementById('mgcls-list');
    if (!el) return;
    var classMap = {};
    (window.A.classes || []).filter(function (c) { return c.schoolId === schoolId; }).forEach(function (c) {
      var parts = splitRelatedClassParts(c.grade || c.name || '', c.section || '');
      var key = [
        normalizeRelatedText(parts.grade),
        normalizeRelatedSection(parts.section)
      ].join('::');
      if (!key || key === '::') return;
      if (!classMap[key]) {
        classMap[key] = Object.assign({}, c, {
          grade: parts.grade,
          name: parts.grade,
          section: parts.section
        });
        return;
      }
      if ((!classMap[key].teacherId || classMap[key].teacherId === 'admin-unassigned') && c.teacherId) {
        classMap[key].teacherId = c.teacherId;
        if (c.id) classMap[key].id = c.id;
      }
      if (classMap[key].status !== 'inactive' && c.status === 'inactive') {
        classMap[key].status = 'inactive';
      }
    });
    var classes = Object.keys(classMap).map(function (key) { return classMap[key]; }).sort(function (a, b) {
      return String(a.grade || a.name || '').localeCompare(String(b.grade || b.name || ''), 'ar');
    });
    if (!classes.length) {
      el.innerHTML = '<div style="color:#888;font-size:.85rem;padding:.5rem 0">لا توجد صفوف بعد</div>';
      return;
    }
    el.innerHTML = '<div class="tbl-wrap mgcls-tbl-wrap">' +
      '<table class="data-table mgcls-table">' +
      '<thead><tr>' +
      '<th>الصف</th>' +
      '<th>الشعبة</th>' +
      '<th>المعلم</th>' +
      '<th>مساعد المعلم</th>' +
      '<th class="class-student-count">الطلاب</th>' +
      '<th>الحالة</th>' +
      '<th>إجراءات</th>' +
      '</tr></thead><tbody>' +
      classes.map(function (c) {
        var teacher = (window.A.teachers || []).find(function (t) { return t.id === c.teacherId; });
        var hasTeacher = !!(teacher);
        var assistantName = assistantNameFor(c, 'teacher');
        var hasAssistant = !!(assistantName);
        var safeLabel   = window.esc((c.grade || c.name || '') + ' ' + (c.section || '')).trim();
        var safeGrade   = window.esc(c.grade || c.name || '');
        var safeSection = window.esc(c.section || '');
        var classStudents = (window.A.students || []).filter(function (s) {
          if (s.status === 'deleted' || s.leftSchool === true || String(s.leftSchool || '') === 'true') return false;
          if ((s.schoolId || '') !== c.schoolId) return false;
          var parts = splitRelatedClassParts(s.class || s.className || '', s.section || '');
          return normalizeRelatedText(parts.grade) === normalizeRelatedText(c.grade || c.name || '') &&
            normalizeRelatedSection(parts.section || '') === normalizeRelatedSection(c.section || '');
        });
        var activeStudents = classStudents.filter(function (s) { return s.status === 'active'; }).length;
        var totalStudents  = classStudents.length;
        var isInactive = c.status === 'inactive';
        var statusBadge = isInactive
          ? '<span class="badge badge-inactive">معطل</span>'
          : '<span class="badge badge-active">نشط</span>';
        var classEditAction = c.id
          ? 'openEditClass(\'' + c.id + '\')'
          : 'openEditVirtualClass(\'' + c.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')';
        var teacherCell = hasTeacher
          ? window.esc(teacher.name)
          : (c.id
            ? '<button class="assign-teacher-quick-btn" onclick="openAssignTeacherToClass(\'' + c.id + '\',\'' + safeLabel + '\')">+ ربط معلم</button>'
            : '<span class="no-teacher-label">غير متاح</span>');
        var assistantCell = hasAssistant
          ? window.esc(assistantName)
          : (hasTeacher && c.id
            ? '<button class="assign-teacher-quick-btn" onclick="openAssignClassAssistant(\'' + c.id + '\',\'' + safeLabel + '\')">+ إضافة مساعد</button>'
            : '<span class="no-teacher-label">—</span>');
        var dropdownItems =
          '<button class="mgcls-drop-item" onclick="openAddStudentForClass(\'' + c.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')">إضافة طالب</button>';
        if (c.id && hasTeacher)
          dropdownItems += '<button class="mgcls-drop-item" onclick="openAssignTeacherToClass(\'' + c.id + '\',\'' + safeLabel + '\')">تغيير المعلم</button>';
        if (c.id && hasTeacher && hasAssistant)
          dropdownItems += '<button class="mgcls-drop-item" onclick="openAssignClassAssistant(\'' + c.id + '\',\'' + safeLabel + '\')">تغيير مساعد المعلم</button>';
        else if (c.id && hasTeacher)
          dropdownItems += '<button class="mgcls-drop-item" onclick="openAssignClassAssistant(\'' + c.id + '\',\'' + safeLabel + '\')">إضافة مساعد معلم</button>';
        if (c.id)
          dropdownItems += isInactive
            ? '<button class="mgcls-drop-item mgcls-drop-green" onclick="doToggleClassStatus(\'' + c.id + '\',\'active\')">تفعيل الصف</button>'
            : '<button class="mgcls-drop-item mgcls-drop-red" onclick="doToggleClassStatus(\'' + c.id + '\',\'inactive\')">تعطيل الصف</button>';
        return '<tr>' +
          '<td><strong class="class-table-title">' + window.esc(c.grade || c.name || '') + '</strong></td>' +
          '<td><span class="badge badge-blue">' + window.esc(c.section || '—') + '</span></td>' +
          '<td>' + teacherCell + '</td>' +
          '<td>' + assistantCell + '</td>' +
          '<td class="class-student-count"><button class="class-student-count-btn" type="button" onclick="openClassStudents(\'class\',\'' + c.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')"><strong>' + totalStudents + '</strong><span>' + activeStudents + ' نشط</span></button></td>' +
          '<td>' + statusBadge + '</td>' +
          '<td class="row-actions-cell" style="position:relative">' +
            '<div class="split-action">' +
              '<button class="split-action-primary" onclick="' + classEditAction + '">تعديل</button>' +
              '<button class="split-action-menu" onclick="window.mgclsToggleDropdown(this)" title="المزيد"><svg viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
            '</div>' +
            '<div class="mgcls-dropdown" style="display:none">' + dropdownItems + '</div>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  window.doDeleteClass = function (classId) {
    if (!confirm('حذف هذا الصف نهائياً؟')) return;
    window.CQ_API.deleteClass(classId, 'admin-unassigned', window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        window.A.classes = (window.A.classes || []).filter(function (c) { return c.id !== classId; });
        _renderMgClsList(window.A._addClassSchoolId);
        renderClassesDirectory();
      } else {
        alert((res && (res.message || res.msg)) || 'حدث خطأ');
      }
    }).catch(function () { alert('تعذر الاتصال بالخادم'); });
  };

  window.doToggleClassStatus = function (classId, newStatus) {
    var label = newStatus === 'active' ? 'تفعيل' : 'تعطيل';
    if (!confirm(label + ' هذا الصف؟')) return;
    window.CQ_API.updateClass(classId, 'admin-unassigned', { status: newStatus }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
        if (cls) cls.status = newStatus;
        _renderMgClsList(window.A._addClassSchoolId);
        renderClassesDirectory();
      } else {
        alert((res && (res.message || res.msg)) || 'حدث خطأ');
      }
    }).catch(function () { alert('تعذر الاتصال بالخادم'); });
  };

  function sameClassValue(actual, expected) {
    var a = String(actual || '').trim().toLowerCase();
    var e = String(expected || '').trim().toLowerCase();
    if ((e === '-' || e === '\u2014') && !a) return true;
    return a === e;
  }

  function unlinkStudentsFromClass(schoolId, grade, section) {
    var expectedClass = String(grade || '').trim();
    var expectedSection = String(section || '').trim();
    var students = (window.A.students || []).filter(function (student) {
      var studentClass = student.class || student.className || '';
      return String(student.schoolId || '') === String(schoolId || '') &&
        sameClassValue(studentClass, expectedClass) &&
        sameClassValue(student.section || '', expectedSection);
    });
    if (!students.length) return Promise.resolve();
    return Promise.all(students.map(function (student) {
      return window.CQ_API.adminUpdateUser(student.id, {
        schoolId: student.schoolId || '',
        class: '',
        className: '',
        section: '',
        leftSchool: false
      }, window.A.token).then(function () {
        student.class = '';
        student.className = '';
        student.section = '';
        student.leftSchool = false;
      });
    }));
  }

  window.doDeleteVirtualClassData = function (schoolId, grade, section) {
    if (!confirm('حذف هذه البيانات من جدول الصفوف؟ سيتم إزالة ربط الطلاب بهذا الصف.')) return;
    hideClassRow('', schoolId, grade, section);
    renderClassesDirectory();
    unlinkStudentsFromClass(schoolId, grade, section).then(function () {
      renderClassesDirectory();
      window.renderStudentsTable();
      if (typeof window.loadStudents === 'function') window.loadStudents();
    }).catch(function () { alert('تعذر حذف بيانات الصف'); });
  };

  window.doDeleteClassData = function (classId, schoolId, grade, section) {
    if (!confirm('حذف هذا الصف وبيانات ربط الطلاب به؟')) return;
    hideClassRow(classId, schoolId, grade, section);
    window.A.classes = (window.A.classes || []).filter(function (c) { return c.id !== classId; });
    renderClassesDirectory();
    var deletePromise = window.CQ_API.deleteClass(classId, 'admin-unassigned', window.A.token).then(function (res) {
      window.A.classes = (window.A.classes || []).filter(function (c) { return c.id !== classId; });
      if (!(res && (res.ok || res.success))) console.warn('deleteClass failed; continuing cleanup', res);
    });
    deletePromise.then(function () {
      return unlinkStudentsFromClass(schoolId, grade, section);
    }).then(function () {
      renderClassesDirectory();
      window.renderStudentsTable();
      if (typeof window.loadAllClasses === 'function') window.loadAllClasses();
      if (typeof window.loadStudents === 'function') window.loadStudents();
    }).catch(function () { alert('تعذر حذف بيانات الصف'); });
  };

  window.doDeleteCourse = function (courseId) {
    var course = (window.A.courses || []).find(function (c) { return c.id === courseId; });
    if (!course) return;
    if (!confirm('نقل هذه الدورة إلى سلة المهملات؟')) return;
    if (typeof window.moveToTrash === 'function') {
      window.moveToTrash(course, 'course');
      renderClassesDirectory();
    }
  };

  window.doToggleCourseStatus = function (courseId, newStatus) {
    var label = newStatus === 'active' ? 'تفعيل' : 'تعطيل';
    if (!confirm(label + ' هذه الدورة؟')) return;
    window.CQ_API.updateCourse(courseId, { courseStatus: newStatus, activeStatus: newStatus }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        var crs = (window.A.courses || []).find(function (c) { return c.id === courseId; });
        if (crs) {
          crs.courseStatus = newStatus;
          crs.activeStatus = newStatus;
        }
        _renderMgCrsList(window.A._addCourseSchoolId);
        renderClassesDirectory();
      } else {
        alert((res && (res.message || res.msg)) || 'حدث خطأ');
      }
    }).catch(function () { alert('تعذر الاتصال بالخادم'); });
  };

  /* ── عرض دورات مركز ── */
  function _renderMgCrsList(schoolId) {
    var el = document.getElementById('mgcrs-list');
    if (!el) return;
    var courseMap = {};
    (window.A.courses || []).filter(function (c) { return c.schoolId === schoolId; }).forEach(function (c) {
      var key = [
        normalizeRelatedText(c.name || ''),
        cleanRelatedText(c.startTime || ''),
        cleanRelatedText(c.endTime || ''),
        cleanRelatedText(c.weeks || '')
      ].join('::');
      if (!key || key === '::::::') return;
      if (!courseMap[key]) {
        courseMap[key] = Object.assign({}, c);
        return;
      }
      if ((!courseMap[key].trainerId || courseMap[key].trainerId === 'admin-unassigned') && c.trainerId) {
        courseMap[key].trainerId = c.trainerId;
        courseMap[key].trainerName = c.trainerName || courseMap[key].trainerName;
      }
      var status = c.courseStatus || c.activeStatus || c.status || 'active';
      if ((courseMap[key].courseStatus || courseMap[key].activeStatus || 'active') !== 'inactive' && status === 'inactive') {
        courseMap[key].courseStatus = 'inactive';
        courseMap[key].activeStatus = 'inactive';
      }
    });
    var courses = Object.keys(courseMap).map(function (key) { return courseMap[key]; }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
    if (!courses.length) {
      el.innerHTML = '<div style="color:#888;font-size:.85rem;padding:.5rem 0">لا توجد دورات بعد</div>';
      return;
    }
    el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
      '<thead><tr style="background:var(--bg,#f3f7fb)">' +
      '<th style="padding:6px 8px;text-align:right">الدورة</th>' +
      '<th style="padding:6px 8px;text-align:right">التوقيت</th>' +
      '<th style="padding:6px 8px;text-align:right">المدرب</th>' +
      '<th style="padding:6px 8px"></th>' +
      '</tr></thead><tbody>' +
      courses.map(function (c) {
        var timeLabel = c.startTime && c.endTime ? (fmtTime(c.startTime) + ' – ' + fmtTime(c.endTime)) : '—';
        if (c.weeks) timeLabel += ' (' + c.weeks + ' أسابيع)';
        var trainerName = c.trainerName || '<span style="color:#aaa">غير محدد</span>';
        var courseStatus = c.courseStatus || c.activeStatus || 'active';
        return '<tr style="border-bottom:1px solid var(--border,#e5e7eb)">' +
          '<td style="padding:6px 8px"><strong>' + window.esc(c.name) + '</strong></td>' +
          '<td style="padding:6px 8px;font-size:.8rem">' + timeLabel + '</td>' +
          '<td style="padding:6px 8px">' + trainerName + '</td>' +
          '<td style="padding:6px 8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
            '<button class="btn btn-xs btn-outline" onclick="openEditCourse(\'' + c.id + '\')">تعديل</button>' +
            '<button class="btn btn-xs btn-purple" onclick="openAssignTrainerToCourse(\'' + c.id + '\',\'' + window.esc(c.name) + '\')">ربط مدرب</button>' +
            '<button class="btn btn-xs btn-blue" onclick="openAddStudentForCourse(\'' + c.schoolId + '\',\'' + window.esc(c.name) + '\')">إضافة طالب</button>' +
            (courseStatus === 'inactive'
              ? '<button class="btn btn-xs btn-green" onclick="doToggleCourseStatus(\'' + c.id + '\',\'active\')">تفعيل</button>'
              : '<button class="btn btn-xs btn-danger" onclick="doToggleCourseStatus(\'' + c.id + '\',\'inactive\')">تعطيل</button>') +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function _setMgClsList(show) {
    var el = document.getElementById('mgcls-list');
    if (el) el.style.display = show ? '' : 'none';
  }

  window.openAddClassForSchool = function (schoolId) {
    window.A._addClassSchoolId = schoolId;
    window.A._editClassId = null;
    var school = window.A.schools.find(function (s) { return s.id === schoolId; });
    var nameEl = document.getElementById('mgcls-school-name');
    if (nameEl) nameEl.textContent = school ? school.name : '';
    var titleEl = document.getElementById('addclass-form-title');
    if (titleEl) titleEl.textContent = 'إضافة صف جديد';
    var btnEl = document.getElementById('addclass-submit-btn');
    if (btnEl) btnEl.textContent = 'إضافة الصف';
    var gradeEl = document.getElementById('addclass-grade');
    if (gradeEl) gradeEl.value = '';
    var sectionEl = document.getElementById('addclass-section');
    if (sectionEl) sectionEl.value = '';
    window.showMsg('addclass-msg', '', '');
    _setMgClsList(true);
    _renderMgClsList(schoolId);
    window.openModal('modal-manage-classes');
  };

  window.openEditClass = function (classId) {
    var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
    if (!cls) return;
    window.A._editClassId = classId;
    window.A._addClassSchoolId = cls.schoolId || '';
    var titleEl = document.getElementById('edit-class-inline-title');
    if (titleEl) titleEl.textContent = 'تعديل الصف';
    ensureSelectOption('edit-class-inline-grade', cls.grade || cls.name || '');
    ensureSelectOption('edit-class-inline-section', cls.section || '');
    window.showMsg('edit-class-inline-msg', '', '');
    window.openModal('modal-edit-class-inline');
  };

  window.closeEditClassInline = function () {
    window.closeModal('modal-edit-class-inline');
  };

  window.doSaveEditClassInline = function () {
    var gradeEl   = document.getElementById('edit-class-inline-grade');
    var sectionEl = document.getElementById('edit-class-inline-section');
    var grade   = gradeEl   ? gradeEl.value   : '';
    var section = sectionEl ? sectionEl.value : '';
    if (!grade) { window.showMsg('edit-class-inline-msg', 'يرجى اختيار الصف', 'err'); return; }
    var editId   = window.A._editClassId;
    var schoolId = window.A._addClassSchoolId;

    function onSuccess() {
      window.showMsg('edit-class-inline-msg', 'تم حفظ التعديل', 'ok');
      _renderMgClsList(schoolId);
      renderClassesDirectory();
      setTimeout(window.closeEditClassInline, 700);
    }
    function onError(res) {
      window.showMsg('edit-class-inline-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
    }

    if (!editId) {
      var origGrade   = window.A._virtualClassOriginalGrade   || '';
      var origSection = window.A._virtualClassOriginalSection || '';
      // Check if target class already exists — if so, migrate students instead of creating duplicate
      var normGrade   = grade.trim().toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ى/g, 'ي');
      var normSection = (section || '').trim().toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ى/g, 'ي');
      var existingCls = (window.A.classes || []).find(function (c) {
        if ((c.schoolId || '') !== schoolId) return false;
        var cg = (c.grade || c.name || '').trim().toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ى/g, 'ي');
        var cs = (c.section || '').trim().toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ى/g, 'ي');
        return cg === normGrade && cs === normSection;
      });
      if (existingCls && origGrade) {
        // Migrate students from the virtual class into the existing class
        window.CQ_API.migrateStudents(origGrade, origSection, existingCls.grade || grade, existingCls.section || section || '', schoolId, window.A.token)
          .then(function (res) {
            if (res && (res.ok || res.success)) {
              var toGr = existingCls.grade || grade;
              var toSe = existingCls.section || section || '';
              var fromCombined = (origGrade + (origSection ? ' ' + origSection : '')).trim();
              (window.A.students || []).forEach(function (st) {
                if (st.schoolId !== schoolId) return;
                var uCombined = (st.class + (st.section ? ' ' + st.section : '')).trim();
                if (st.class === origGrade || uCombined === origGrade || st.class === fromCombined || uCombined === fromCombined) {
                  st.class = toGr; st.section = toSe;
                }
              });
              onSuccess();
            } else { onError(res); }
          }).catch(function () { window.showMsg('edit-class-inline-msg', 'تعذر الاتصال بالخادم', 'err'); });
      } else {
        // Virtual class — no DB record yet; create it
        window.CQ_API.adminCreateClass({
          grade: grade, name: grade, section: section || '', schoolId: schoolId
        }, window.A.token).then(function (res) {
          if (res && (res.ok || res.success)) {
            var created = res.data || res.class || res.createdClass || res.classItem || null;
            if (created && created.id) {
              created.grade    = created.grade    || grade;
              created.name     = created.name     || (grade + (section ? ' ' + section : '')).trim();
              created.section  = created.section  || section || '';
              created.schoolId = created.schoolId || schoolId;
              window.A.classes = window.A.classes || [];
              window.A.classes.push(created);
            }
            onSuccess();
          } else { onError(res); }
        }).catch(function () { window.showMsg('edit-class-inline-msg', 'تعذر الاتصال بالخادم', 'err'); });
      }
    } else {
      var cls = (window.A.classes || []).find(function (c) { return c.id === editId; });
      var teacherId = cls ? (cls.teacherId || 'admin-unassigned') : 'admin-unassigned';
      var oldGrade   = cls ? (cls.grade   || cls.name || '') : '';
      var oldSection = cls ? (cls.section || '') : '';
      window.CQ_API.updateClass(editId, teacherId, { grade: grade, section: section }, window.A.token)
        .then(function (res) {
          if (res && (res.ok || res.success)) {
            if (cls) { cls.grade = grade; cls.name = grade; cls.section = section; }
            var oldCombined = (oldGrade + (oldSection ? ' ' + oldSection : '')).trim();
            (window.A.students || []).forEach(function (st) {
              if (st.schoolId !== schoolId) return;
              var uCombined = ((st.class || '') + (st.section ? ' ' + st.section : '')).trim();
              var match = st.class === oldGrade || uCombined === oldGrade || st.class === oldCombined || uCombined === oldCombined;
              if (match) { st.class = grade; st.section = section; }
            });
            onSuccess();
          } else { onError(res); }
        }).catch(function () { window.showMsg('edit-class-inline-msg', 'تعذر الاتصال بالخادم', 'err'); });
    }
  };

  window.openEditVirtualClass = function (schoolId, grade, section) {
    window.A._editClassId = null;
    window.A._addClassSchoolId = schoolId || '';
    window.A._virtualClassOriginalGrade   = grade   || '';
    window.A._virtualClassOriginalSection = section || '';
    var titleEl = document.getElementById('edit-class-inline-title');
    if (titleEl) titleEl.textContent = 'تعديل الصف';
    ensureSelectOption('edit-class-inline-grade', grade || '');
    ensureSelectOption('edit-class-inline-section', section || '');
    window.showMsg('edit-class-inline-msg', 'سيتم حفظ هذا الصف كسجل رسمي عند الضغط على حفظ التعديل', 'ok');
    window.openModal('modal-edit-class-inline');
  };

  window.doToggleVirtualClassStatus = function (schoolId, grade, section, newStatus) {
    var label = newStatus === 'active' ? 'تفعيل' : 'تعطيل';
    if (!confirm(label + ' هذا الصف؟')) return;
    window.CQ_API.adminCreateClass({
      grade: grade,
      name: grade,
      section: section || '',
      schoolId: schoolId,
      status: newStatus
    }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        var created = res.data || res.class || res.createdClass || res.classItem || null;
        if (created && created.id) {
          created.grade = created.grade || grade;
          created.name = created.name || (grade + (section ? ' ' + section : '')).trim();
          created.section = created.section || section || '';
          created.schoolId = created.schoolId || schoolId;
          created.status = created.status || newStatus;
          window.A.classes = window.A.classes || [];
          window.A.classes.push(created);
        }
        renderClassesDirectory();
        window.CQ_API.getClasses('', window.A.token || '').then(function (r) {
          var synced = r.classes || r.data || [];
          if (synced.length) window.A.classes = synced;
          renderClassesDirectory();
        }).catch(function () {});
      } else {
        alert((res && (res.message || res.msg)) || 'حدث خطأ');
      }
    }).catch(function () { alert('تعذر الاتصال بالخادم'); });
  };

  window.doAddClass = function () {
    var schoolId = window.A._addClassSchoolId;
    var grade   = ((document.getElementById('addclass-grade')   || {}).value || '').trim();
    var section = ((document.getElementById('addclass-section') || {}).value || '').trim();
    var editId  = window.A._editClassId || null;
    if (!grade) { window.showMsg('addclass-msg', 'يرجى اختيار الصف', 'err'); return; }
    if (!schoolId) { window.showMsg('addclass-msg', 'يرجى اختيار مدرسة أولاً', 'err'); return; }

    // Condition: can't add same grade+section to same school twice
    if (!editId) {
      var dupClass = (window.A.classes || []).find(function (c) {
        return c.schoolId === schoolId && c.grade === grade && (c.section || '') === (section || '');
      });
      if (dupClass) {
        window.showMsg('addclass-msg', 'يوجد صف بنفس الاسم والشعبة في هذه المدرسة مسبقاً', 'err');
        return;
      }
    }

    if (editId) {
      window.CQ_API.updateClass(editId, 'admin-unassigned', { grade: grade, name: grade, section: section, schoolId: schoolId }, window.A.token).then(function (res) {
        if (res && (res.ok || res.success)) {
          var cls = (window.A.classes || []).find(function (c) { return c.id === editId; });
          if (cls) {
            cls.grade = grade;
            cls.name = grade + (section ? ' ' + section : '');
            cls.section = section;
            cls.schoolId = schoolId;
          }
          window.A._editClassId = null;
          var titleEl = document.getElementById('addclass-form-title');
          if (titleEl) titleEl.textContent = 'إضافة صف جديد';
          var btnEl = document.getElementById('addclass-submit-btn');
          if (btnEl) btnEl.textContent = 'إضافة الصف';
          window.showMsg('addclass-msg', 'تم تعديل الصف', 'ok');
          _renderMgClsList(schoolId);
          renderClassesDirectory();
        } else {
          window.showMsg('addclass-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
        }
      }).catch(function () { window.showMsg('addclass-msg', 'تعذر الاتصال بالخادم', 'err'); });
      return;
    }

    function saveCreated(res) {
      if (res && (res.ok || res.success)) {
        var created = res.data || res.class || res.createdClass || res.classItem || null;
        if (!created || !created.id) {
          window.showMsg('addclass-msg', (res && (res.message || res.msg)) || 'لم يتم حفظ الصف', 'err');
          return;
        }
        created.grade = created.grade || grade;
        created.section = created.section || section;
        created.schoolId = created.schoolId || schoolId;
        created.name = created.name || (grade + (section ? ' ' + section : '')).trim();
        window.A.classes = window.A.classes || [];
        var existingIndex = window.A.classes.findIndex(function (c) { return c.id === created.id; });
        if (existingIndex >= 0) window.A.classes[existingIndex] = created;
        else window.A.classes.push(created);
        window.showMsg('addclass-msg', 'تمت إضافة الصف', 'ok');
        _renderMgClsList(schoolId);
        renderClassesDirectory();
        /* نحمّل الصفوف من GAS لنضمن الـ ID الحقيقي */
        window.CQ_API.getClasses('', window.A.token || '').then(function (r) {
        var synced = r.classes || r.data || [];
        if (synced.length) window.A.classes = synced;
          _renderMgClsList(schoolId);
          renderClassesDirectory();
        }).catch(function () { _renderMgClsList(schoolId); renderClassesDirectory(); });
      } else {
        window.showMsg('addclass-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
      }
    }

    window.CQ_API.adminCreateClass({ grade: grade, name: grade, section: section, schoolId: schoolId }, window.A.token).then(function (res) {
      var created = res && (res.data || res.class || res.createdClass || res.classItem);
      if (created && created.id) {
        saveCreated(res);
        return;
      }
      window.CQ_API.createClass('admin-unassigned', '', grade, schoolId, section, window.A.token).then(saveCreated);
    }).catch(function () { window.showMsg('addclass-msg', 'تعذر الاتصال بالخادم', 'err'); });
  };

  window.openAssignTeacherToClass = function (classId, classLabel) {
    window.A._assignClassId = classId;
    var labelEl = document.getElementById('acteacher-class-label');
    if (labelEl) labelEl.textContent = 'الصف: ' + (classLabel || '');
    var sel = document.getElementById('acteacher-sel');
    if (sel) {
      var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
      var assistantId = cls ? firstFilled(cls.assistantTeacherId, cls.teacherAssistantId, cls.coTeacherId, cls.assistantId) : '';
      var teachers = (window.A.teachers || []).filter(function (t) {
        return (t.status === 'active' || t.status === 'pending') && (!assistantId || t.id !== assistantId);
      });
      sel.innerHTML = '<option value="">-- اختر معلماً --</option>' +
        teachers.map(function (t) {
          return '<option value="' + t.id + '">' + window.esc(t.name) + '</option>';
        }).join('');
      if (cls && cls.teacherId) sel.value = cls.teacherId;
    }
    window.showMsg('acteacher-msg', '', '');
    window.openModal('modal-assign-class-teacher');
  };

  window.doAssignTeacherToClass = function () {
    var classId = window.A._assignClassId;
    var sel = document.getElementById('acteacher-sel');
    var teacherId = sel ? sel.value : '';
    if (!teacherId) { window.showMsg('acteacher-msg', 'يرجى اختيار معلم', 'err'); return; }
    var teacher = (window.A.teachers || []).find(function (t) { return t.id === teacherId; });
    var teacherEmail = teacher ? (teacher.email || '') : '';
    var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
    var shouldMoveUnassigned = cls && cls.teacherId === 'admin-unassigned';
    var oldClassId = cls ? cls.id : classId;
    var assistantId = cls ? firstFilled(cls.assistantTeacherId, cls.teacherAssistantId, cls.coTeacherId, cls.assistantId) : '';
    var updateData = {teacherEmail: teacherEmail};
    if (assistantId && assistantId === teacherId) {
      updateData.assistantTeacherId = '';
      updateData.assistantTeacherName = '';
    }
    var savePromise = cls && cls._localOnly
      ? window.CQ_API.createClass(teacherId, teacherEmail, cls.grade || cls.name || '', cls.schoolId || window.A._addClassSchoolId || '', cls.section || '', window.A.token)
      : window.CQ_API.updateClass(classId, teacherId, updateData, window.A.token);

    savePromise.then(function (res) {
      if (res && (res.ok || res.success)) {
        if (cls) {
          var saved = res.data || res.class || res.classItem || null;
          if (saved && saved.id) {
            cls.id = saved.id;
            cls.name = saved.name || cls.name;
            cls.grade = saved.grade || cls.grade || saved.name || cls.name;
            cls.schoolId = saved.schoolId || cls.schoolId;
            cls.section = saved.section || cls.section;
            cls._localOnly = false;
          }
          cls.teacherId = teacherId;
          cls.teacherEmail = teacherEmail;
          if (assistantId && assistantId === teacherId) {
            cls.assistantTeacherId = '';
            cls.assistantTeacherName = '';
          }
        }
        if (cls && cls._localOnly && shouldMoveUnassigned && oldClassId && oldClassId !== (cls && cls.id)) {
          window.CQ_API.deleteClass(oldClassId, 'admin-unassigned', window.A.token).then(function () {}).catch(function () {});
        }
        window.showMsg('acteacher-msg', 'تم ربط المعلم', 'ok');
        _renderMgClsList(window.A._addClassSchoolId);
        renderClassesDirectory();
        window.CQ_API.getClasses('', window.A.token || '').then(function (r) {
          var synced = r.classes || r.data || [];
          if (synced.length) {
            window.A.classes = synced;
            _renderMgClsList(window.A._addClassSchoolId);
            renderClassesDirectory();
          }
        }).catch(function () {});
        setTimeout(function () { window.closeModal('modal-assign-class-teacher'); }, 700);
      } else {
        window.showMsg('acteacher-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
      }
    }).catch(function () { window.showMsg('acteacher-msg', 'تعذر الاتصال بالخادم', 'err'); });
  };

  function teacherOptionList(excludeId) {
    return (window.A.teachers || []).filter(function (t) {
      return (t.status === 'active' || t.status === 'pending') && t.id !== excludeId;
    });
  }

  window.openAssignClassAssistant = function (classId, classLabel) {
    var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
    if (!cls) return;
    if (!cls.teacherId || cls.teacherId === 'admin-unassigned') {
      window.showMsg('assistant-msg', 'حدد المعلم أولاً', 'err');
      return;
    }
    var teachers = teacherOptionList(cls.teacherId || '');
    window.A._assignAssistant = { type: 'class', id: classId };
    var titleEl = document.getElementById('assistant-modal-title');
    var labelEl = document.getElementById('assistant-target-label');
    var selectLabel = document.getElementById('assistant-select-label');
    var sel = document.getElementById('assistant-sel');
    if (titleEl) titleEl.textContent = 'تعيين مساعد معلم';
    if (labelEl) labelEl.textContent = 'الصف: ' + (classLabel || '');
    if (selectLabel) selectLabel.textContent = 'اختر مساعد المعلم';
    if (sel) {
      sel.innerHTML = '<option value="">-- اختر مساعد المعلم --</option>' + teachers.map(function (t) {
        return '<option value="' + t.id + '">' + window.esc(t.name) + '</option>';
      }).join('');
      sel.value = firstFilled(cls.assistantTeacherId, cls.teacherAssistantId, cls.coTeacherId, cls.assistantId);
    }
    window.showMsg('assistant-msg', teachers.length ? '' : 'لا يوجد معلمون متاحون كمساعدين لهذا الصف', teachers.length ? '' : 'err');
    window.openModal('modal-assign-assistant');
  };

  window.openAssignCourseAssistant = function (courseId, courseName) {
    var course = (window.A.courses || []).find(function (c) { return c.id === courseId; });
    if (!course) return;
    if (!course.trainerId && !course.teacherId) {
      window.showMsg('assistant-msg', 'حدد المدرب أولاً', 'err');
      return;
    }
    var teachers = teacherOptionList(course.trainerId || course.teacherId || '');
    window.A._assignAssistant = { type: 'course', id: courseId };
    var titleEl = document.getElementById('assistant-modal-title');
    var labelEl = document.getElementById('assistant-target-label');
    var selectLabel = document.getElementById('assistant-select-label');
    var sel = document.getElementById('assistant-sel');
    if (titleEl) titleEl.textContent = 'تعيين مساعد مدرب';
    if (labelEl) labelEl.textContent = 'الدورة: ' + (courseName || '');
    if (selectLabel) selectLabel.textContent = 'اختر مساعد المدرب';
    if (sel) {
      sel.innerHTML = '<option value="">-- اختر مساعد المدرب --</option>' + teachers.map(function (t) {
        return '<option value="' + t.id + '">' + window.esc(t.name) + '</option>';
      }).join('');
      sel.value = firstFilled(course.assistantTrainerId, course.trainerAssistantId, course.coTrainerId, course.assistantId);
    }
    window.showMsg('assistant-msg', teachers.length ? '' : 'لا يوجد معلمون متاحون كمساعدين لهذه الدورة', teachers.length ? '' : 'err');
    window.openModal('modal-assign-assistant');
  };

  window.doAssignAssistant = function () {
    var target = window.A._assignAssistant || {};
    var sel = document.getElementById('assistant-sel');
    var assistantId = sel ? sel.value : '';
    if (!assistantId) { window.showMsg('assistant-msg', 'يرجى اختيار المساعد', 'err'); return; }
    var assistant = (window.A.teachers || []).find(function (t) { return t.id === assistantId; });
    var assistantName = assistant ? (assistant.name || '') : '';

    if (target.type === 'class') {
      var cls = (window.A.classes || []).find(function (c) { return c.id === target.id; });
      if (!cls) return;
      if (assistantId === cls.teacherId) { window.showMsg('assistant-msg', 'لا يمكن اختيار معلم المادة كمساعد', 'err'); return; }
      window.CQ_API.updateClass(target.id, cls.teacherId || 'admin-unassigned', {
        assistantTeacherId: assistantId,
        assistantTeacherName: assistantName
      }, window.A.token).then(function (res) {
        if (res && (res.ok || res.success)) {
          cls.assistantTeacherId = assistantId;
          cls.assistantTeacherName = assistantName;
          window.showMsg('assistant-msg', 'تم تعيين مساعد المعلم', 'ok');
          renderClassesDirectory();
          setTimeout(function () { window.closeModal('modal-assign-assistant'); }, 700);
        } else {
          window.showMsg('assistant-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
        }
      }).catch(function () { window.showMsg('assistant-msg', 'تعذر الاتصال بالخادم', 'err'); });
      return;
    }

    if (target.type === 'course') {
      var course = (window.A.courses || []).find(function (c) { return c.id === target.id; });
      if (!course) return;
      if (assistantId === (course.trainerId || course.teacherId)) { window.showMsg('assistant-msg', 'لا يمكن اختيار المدرب الأساسي كمساعد', 'err'); return; }
      window.CQ_API.updateCourse(target.id, {
        assistantTrainerId: assistantId,
        assistantTrainerName: assistantName
      }, window.A.token).then(function (res) {
        if (res && (res.ok || res.success)) {
          course.assistantTrainerId = assistantId;
          course.assistantTrainerName = assistantName;
          window.showMsg('assistant-msg', 'تم تعيين مساعد المدرب', 'ok');
          renderClassesDirectory();
          setTimeout(function () { window.closeModal('modal-assign-assistant'); }, 700);
        } else {
          window.showMsg('assistant-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
        }
      }).catch(function () { window.showMsg('assistant-msg', 'تعذر الاتصال بالخادم', 'err'); });
    }
  };

  window.openAddCourseForSchool = function (schoolId) {
    window.A._addCourseSchoolId = schoolId;
    window.A._editCourseId = null;
    var school = window.A.schools.find(function (s) { return s.id === schoolId; });
    var nameEl = document.getElementById('mgcrs-school-name');
    if (nameEl) nameEl.textContent = school ? school.name : '';
    var nameInput = document.getElementById('mgcrs-name');
    if (nameInput) nameInput.value = '';
    _buildTimeOptions('mgcrs-start-time');
    _buildTimeOptions('mgcrs-end-time');
    var endSel = document.getElementById('mgcrs-end-time');
    if (endSel && endSel.options.length > 2) endSel.selectedIndex = 2;
    var wkSel = document.getElementById('mgcrs-weeks');
    if (wkSel) wkSel.value = '';
    var titleEl = document.getElementById('mgcrs-form-title');
    if (titleEl) titleEl.textContent = 'إضافة دورة جديدة';
    var btnEl = document.getElementById('mgcrs-submit-btn');
    if (btnEl) btnEl.textContent = 'إضافة الدورة';
    window.showMsg('mgcrs-msg', '', '');
    if (!window.A.courses) window.A.courses = [];
    _renderMgCrsList(schoolId);
    window.openModal('modal-manage-courses');
  };

  window.openEditCourse = function (courseId) {
    var course = (window.A.courses || []).find(function (c) { return c.id === courseId; });
    if (!course) return;
    window.A._editCourseId = courseId;
    window.A._addCourseSchoolId = course.schoolId || '';
    var school = window.A.schools.find(function (s) { return s.id === course.schoolId; });
    var nameEl = document.getElementById('mgcrs-school-name');
    if (nameEl) nameEl.textContent = school ? school.name : '';
    _buildTimeOptions('mgcrs-start-time');
    _buildTimeOptions('mgcrs-end-time');
    var nameInput = document.getElementById('mgcrs-name');
    if (nameInput) nameInput.value = course.name || '';
    ensureSelectOption('mgcrs-start-time', course.startTime || '');
    ensureSelectOption('mgcrs-end-time', course.endTime || '');
    ensureSelectOption('mgcrs-weeks', course.weeks || '');
    var titleEl = document.getElementById('mgcrs-form-title');
    if (titleEl) titleEl.textContent = 'تعديل الدورة';
    var btnEl = document.getElementById('mgcrs-submit-btn');
    if (btnEl) btnEl.textContent = 'حفظ التعديل';
    window.showMsg('mgcrs-msg', '', '');
    _renderMgCrsList(course.schoolId);
    window.openModal('modal-manage-courses');
  };

  window.doAddCourseMgr = function () {
    var schoolId  = window.A._addCourseSchoolId;
    var name      = (document.getElementById('mgcrs-name') || {}).value ? document.getElementById('mgcrs-name').value.trim() : '';
    var startTime = (document.getElementById('mgcrs-start-time') || {}).value || '';
    var endTime   = (document.getElementById('mgcrs-end-time')   || {}).value || '';
    var weeks     = (document.getElementById('mgcrs-weeks')      || {}).value || '';
    var editId    = window.A._editCourseId || null;
    if (!name) { window.showMsg('mgcrs-msg', 'يرجى إدخال اسم الدورة', 'err'); return; }
    if (!startTime || !endTime) { window.showMsg('mgcrs-msg', 'يرجى تحديد وقت البدء والانتهاء', 'err'); return; }
    if (startTime >= endTime) { window.showMsg('mgcrs-msg', 'وقت الانتهاء يجب أن يكون بعد وقت البدء', 'err'); return; }

    // Condition: can't add two courses with overlapping times at same center
    var timeConflict = (window.A.courses || []).find(function (c) {
      return c.schoolId === schoolId && c.id !== editId &&
        c.startTime && c.endTime &&
        c.startTime < endTime && c.endTime > startTime;
    });
    if (timeConflict) {
      window.showMsg('mgcrs-msg', 'يوجد تعارض في الوقت مع دورة أخرى في نفس المركز: ' + window.esc(timeConflict.name || ''), 'err');
      return;
    }

    if (editId) {
      window.CQ_API.updateCourse(editId, { name: name, startTime: startTime, endTime: endTime, weeks: weeks }, window.A.token).then(function (res) {
        if (res && (res.ok || res.success)) {
          var course = (window.A.courses || []).find(function (c) { return c.id === editId; });
          if (course) {
            course.name = name;
            course.startTime = startTime;
            course.endTime = endTime;
            course.weeks = weeks;
          }
          window.A._editCourseId = null;
          var titleEl = document.getElementById('mgcrs-form-title');
          if (titleEl) titleEl.textContent = 'إضافة دورة جديدة';
          var btnEl = document.getElementById('mgcrs-submit-btn');
          if (btnEl) btnEl.textContent = 'إضافة الدورة';
          document.getElementById('mgcrs-name').value = '';
          window.showMsg('mgcrs-msg', 'تم تعديل الدورة', 'ok');
          _renderMgCrsList(schoolId);
          renderClassesDirectory();
        } else {
          window.showMsg('mgcrs-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
        }
      }).catch(function () { window.showMsg('mgcrs-msg', 'تعذر الاتصال بالخادم', 'err'); });
      return;
    }

    window.CQ_API.createCourse({ name: name, schoolId: schoolId, startTime: startTime, endTime: endTime, weeks: weeks }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        document.getElementById('mgcrs-name').value = '';
        window.showMsg('mgcrs-msg', 'تمت إضافة الدورة', 'ok');
        window.CQ_API.getCourses(window.A.token).then(function (r) {
          window.A.courses = r.courses || r.data || window.A.courses || [];
          _renderMgCrsList(schoolId);
          renderClassesDirectory();
        }).catch(function () {
          if (!window.A.courses) window.A.courses = [];
          if (res.data) window.A.courses.push(res.data);
          _renderMgCrsList(schoolId);
          renderClassesDirectory();
        });
      } else {
        window.showMsg('mgcrs-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
      }
    }).catch(function () { window.showMsg('mgcrs-msg', 'تعذر الاتصال بالخادم', 'err'); });
  };

  window.openAssignTrainerToCourse = function (courseId, courseName) {
    window.A._assignCourseId = courseId;
    var labelEl = document.getElementById('actrainer-course-label');
    if (labelEl) labelEl.textContent = 'الدورة: ' + (courseName || '');
    var sel = document.getElementById('actrainer-sel');
    if (sel) {
      var crs = (window.A.courses || []).find(function (c) { return c.id === courseId; });
      var assistantId = crs ? firstFilled(crs.assistantTrainerId, crs.trainerAssistantId, crs.coTrainerId, crs.assistantId) : '';
      var teachers = (window.A.teachers || []).filter(function (t) {
        return (t.status === 'active' || t.status === 'pending') && (!assistantId || t.id !== assistantId);
      });
      sel.innerHTML = '<option value="">-- اختر مدرباً --</option>' +
        teachers.map(function (t) {
          return '<option value="' + t.id + '">' + window.esc(t.name) + '</option>';
        }).join('');
      if (crs && crs.trainerId) sel.value = crs.trainerId;
    }
    window.showMsg('actrainer-msg', '', '');
    window.openModal('modal-assign-course-trainer');
  };

  window.doAssignTrainerToCourse = function () {
    var courseId = window.A._assignCourseId;
    var sel = document.getElementById('actrainer-sel');
    var trainerId = sel ? sel.value : '';
    var trainerName = sel && sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].textContent : '';
    var crsBefore = (window.A.courses || []).find(function (c) { return c.id === courseId; });
    var assistantId = crsBefore ? firstFilled(crsBefore.assistantTrainerId, crsBefore.trainerAssistantId, crsBefore.coTrainerId, crsBefore.assistantId) : '';
    var updateData = { trainerId: trainerId, trainerName: trainerName };
    if (assistantId && assistantId === trainerId) {
      updateData.assistantTrainerId = '';
      updateData.assistantTrainerName = '';
    }
    window.CQ_API.updateCourse(courseId, updateData, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        var crs = (window.A.courses || []).find(function (c) { return c.id === courseId; });
        if (crs) {
          crs.trainerId = trainerId;
          crs.trainerName = trainerName;
          if (assistantId && assistantId === trainerId) {
            crs.assistantTrainerId = '';
            crs.assistantTrainerName = '';
          }
        }
        window.showMsg('actrainer-msg', 'تم ربط المدرب', 'ok');
        _renderMgCrsList(window.A._addCourseSchoolId);
        renderClassesDirectory();
        setTimeout(function () { window.closeModal('modal-assign-course-trainer'); }, 700);
      } else {
        window.showMsg('actrainer-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
      }
    }).catch(function () { window.showMsg('actrainer-msg', 'تعذر الاتصال بالخادم', 'err'); });
  };
  window.openAddSchool = function () {
    window.A._editSchoolId = null;
    document.getElementById('school-name').value = '';
    document.getElementById('school-city').value = '';
    document.getElementById('school-type').value = 'school';
    var titleEl = document.getElementById('school-modal-title');
    if (titleEl) titleEl.textContent = 'إضافة مدرسة/مركز';
    var btnEl = document.getElementById('school-submit-btn');
    if (btnEl) btnEl.textContent = 'إضافة';
    window.showMsg('school-msg', '', '');
    window.openModal('modal-addschool');
  };

  window.openEditSchool = function (id) {
    var s = window.A.schools.find(function (sc) { return sc.id === id; });
    if (!s) return;
    window.A._editSchoolId = id;
    document.getElementById('school-name').value = s.name || '';
    document.getElementById('school-city').value = s.city || '';
    document.getElementById('school-type').value = s.type || 'school';
    var titleEl = document.getElementById('school-modal-title');
    if (titleEl) titleEl.textContent = 'تعديل مدرسة/مركز';
    var btnEl = document.getElementById('school-submit-btn');
    if (btnEl) btnEl.textContent = 'حفظ التعديلات';
    window.showMsg('school-msg', '', '');
    window.openModal('modal-addschool');
  };

  window.doAddSchool = function () {
    var nameEl = document.getElementById('school-name');
    var cityEl = document.getElementById('school-city');
    var typeEl = document.getElementById('school-type');
    var name = nameEl ? nameEl.value.trim() : '';
    var city = cityEl ? cityEl.value.trim() : '';
    var type = typeEl ? typeEl.value : 'school';
    if (!name) { window.showMsg('school-msg', 'اسم المدرسة/المركز مطلوب', 'err'); return; }
    var editId = window.A._editSchoolId || null;
    var promise = editId
      ? window.CQ_API.updateSchool(editId, { name: name, city: city, type: type }, window.A.token)
      : window.CQ_API.createSchool({ name: name, city: city, type: type }, window.A.token);
    var btn = document.getElementById('school-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }
    promise.then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = editId ? 'حفظ التعديلات' : 'إضافة'; }
      if (res && (res.ok || res.success)) {
        window.A._editSchoolId = null;
        window.closeModal('modal-addschool');
        window.loadSchools();
      } else {
        window.showMsg('school-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = editId ? 'حفظ التعديلات' : 'إضافة'; }
      window.showMsg('school-msg', 'تعذر الاتصال بالخادم', 'err');
    });
  };

  window.doToggleSchoolStatus = function (schoolId) {
    var school = window.A.schools.find(function (s) { return s.id === schoolId; });
    if (!school) return;
    var savedStatuses = {};
    try { savedStatuses = JSON.parse(localStorage.getItem('cq_school_status_overrides') || '{}'); } catch (e) {}
    var currentStatus = savedStatuses[schoolId] || school.status || 'active';
    var newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    school.status = newStatus;
    savedStatuses[schoolId] = newStatus;
    localStorage.setItem('cq_school_status_overrides', JSON.stringify(savedStatuses));
    window.populateSchoolSelects();
    window.populateStudentSchoolFilter();
    if (!isSchoolActive((document.getElementById('class-school-filter') || {}).value || '')) {
      var classFilter = document.getElementById('class-school-filter');
      if (classFilter) classFilter.value = '';
    }
    renderClassesDirectory();
    window.renderSchoolsTable();
    window.CQ_API.updateSchool(schoolId, { status: newStatus }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        window.renderSchoolsTable();
      } else {
        alert((res && (res.message || res.msg)) || 'حدث خطأ');
      }
    }).catch(function () { alert('تعذر الاتصال بالخادم'); });
  };

  window.openConnectTeacher = function (schoolId) {
    window.A._connectSchoolId = schoolId;
    var sel = document.getElementById('connect-teacher-sel');
    if (sel) {
      var teachers = window.A.teachers.filter(function (t) { return t.status === 'active' || t.status === 'pending'; });
      sel.innerHTML = teachers.length
        ? teachers.map(function (t) {
            return '<option value="' + t.id + '">' + window.esc(t.name) + ' (' + window.esc(t.teacherCode || t.email || '') + ')</option>';
          }).join('')
        : '<option value="">لا يوجد معلمون</option>';
    }
    window.showMsg('connect-teacher-msg', '', '');
    window.openModal('modal-connect-teacher');
  };

  window.doConnectTeacher = function () {
    var schoolId = window.A._connectSchoolId;
    var sel = document.getElementById('connect-teacher-sel');
    var teacherId = sel ? sel.value : '';
    if (!teacherId || !schoolId) { window.showMsg('connect-teacher-msg', 'يرجى اختيار معلم', 'err'); return; }
    window.CQ_API.assignTeacherSchool(teacherId, schoolId, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        window.A._connectSchoolId = null;
        window.closeModal('modal-connect-teacher');
        window.loadTeachers();
        window.loadSchools();
      } else {
        window.showMsg('connect-teacher-msg', (res && (res.message || res.msg)) || 'حدث خطأ', 'err');
      }
    }).catch(function () { window.showMsg('connect-teacher-msg', 'تعذر الاتصال بالخادم', 'err'); });
  };
  window.renderTeachersTable = function (filter) {
    var tbody = document.getElementById('teachers-tbody');
    if (!tbody) return;
    var cf = ((window.A.colFilters || {}).teachers) || {};
    var list = window.A.teachers.filter(function (t) {
      var matchText   = !filter || (t.name || '').includes(filter) || (t.teacherCode || '').includes(filter);
      var matchSchool = !cf.school || t.schoolId === cf.school;
      var matchStatus = !cf.status || (t.status || 'active') === cf.status;
      return matchText && matchSchool && matchStatus;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">\ud83d\udc64</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0639\u0644\u0645\u0648\u0646 \u0628\u0639\u062f</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (t) {
      var places = getTeacherPlaces(t.id);
      return '<tr>' +
        '<td><strong>' + window.esc(t.name) + '</strong></td>' +
        '<td><code>' + window.esc(t.teacherCode || '\u2014') + '</code></td>' +
        '<td>' + window.esc(t.email || '\u2014') + '</td>' +
        '<td><button class="count-link" onclick="openTeacherPlaces(\'' + t.id + '\')">' + places.length + '</button></td>' +
        '<td>' + badgeStatus(userStatus(t)) + '</td>' +
        '<td class="row-actions-cell"><div class="split-action">' +
          '<button class="split-action-primary" type="button" onclick="openEditTeacher(\'' + t.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="split-action-menu" type="button" title="\u0627\u0644\u0623\u0648\u0627\u0645\u0631" aria-label="\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u0639\u0644\u0645" aria-haspopup="menu" onclick="toggleActionMenu(this,\'teacher-more\',\'' + t.id + '\',\'' + userStatus(t) + '\')"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  };

  window.renderStudentsTable = function () {
    var tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    var schoolFilter = (document.getElementById('student-school-filter') || {}).value || '';
    var textFilter = (document.getElementById('student-search') || {}).value || '';
    var cf = ((window.A.colFilters || {}).students) || {};
    var list = window.A.students.filter(function (s) {
      var school = window.A.schools.find(function (sc) { return sc.id === s.schoolId; });
      var sType = school && String((school.type || '')).toLowerCase() === 'center' ? 'center' : 'school';
      var matchSchoolDrop = !schoolFilter || s.schoolId === schoolFilter;
      var matchText   = !textFilter || (s.name || '').includes(textFilter) || (s.studentCode || '').includes(textFilter);
      var matchGrade  = !cf.grade  || (s.class || '') === cf.grade;
      var matchSchool = !cf.school || s.schoolId === cf.school;
      var matchType   = !cf.type   || sType === cf.type;
      var matchStatus = !cf.status || (s.status || 'pending') === cf.status;
      return matchSchoolDrop && matchText && matchGrade && matchSchool && matchType && matchStatus;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><div class="empty-icon">\ud83c\udf93</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (s) {
      var school = window.A.schools.find(function (sc) { return sc.id === s.schoolId; });
      var isCenter = school && String((school.type || '')).toLowerCase() === 'center';
      var typeBadge = isCenter
        ? '<span class="badge badge-purple">\u0645\u0631\u0643\u0632</span>'
        : '<span class="badge badge-blue">\u0645\u062f\u0631\u0633\u0629</span>';
      return '<tr>' +
        '<td><strong>' + window.esc(s.name) + '</strong></td>' +
        '<td><code>' + window.esc(s.studentCode || '\u2014') + '</code></td>' +
        '<td>' + window.esc(s.email || '\u2014') + '</td>' +
        '<td>' + ((s.className || s.class)
          ? window.esc(s.className || s.class)
          : '<button class="assign-teacher-quick-btn" ' + (school ? '' : 'disabled title="\u0639\u064a\u0646 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0623\u0648\u0644\u0627\u064b"') + ' onclick="openAssignStudentClass(\'' + s.id + '\')">+ \u0639\u064a\u0646 \u0627\u0644\u0635\u0641</button>') + '</td>' +
        '<td>' + (school ? window.esc(school.name) : '<button class="assign-teacher-quick-btn" onclick="openAssignStudentSchool(\'' + s.id + '\')">+ \u0639\u064a\u0646 \u0627\u0644\u0645\u062f\u0631\u0633\u0629</button>') + '</td>' +
        '<td>' + typeBadge + '</td>' +
        '<td>' + badgeStatus(userStatus(s)) + '</td>' +
        '<td class="row-actions-cell"><div class="split-action">' +
          '<button class="split-action-primary" type="button" onclick="openEditStudent(\'' + s.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="split-action-menu" type="button" title="\u0627\u0644\u0623\u0648\u0627\u0645\u0631" aria-label="\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0637\u0627\u0644\u0628" aria-haspopup="menu" onclick="toggleActionMenu(this,\'student-more\',\'' + s.id + '\',\'' + userStatus(s) + '\')"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  };

  window.difficultyLabel = function (d) {
    return d === 'easy' ? '<span class="badge badge-active">\u0633\u0647\u0644</span>'
      : d === 'hard' ? '<span class="badge badge-rejected">\u0635\u0639\u0628</span>'
      : '<span class="badge badge-pending">\u0645\u062a\u0648\u0633\u0637</span>';
  };

  window.renderCreatorsTable = function (filter) {
    var tbody = document.getElementById('creators-tbody');
    if (!tbody) return;
    var cf = ((window.A.colFilters || {}).creators) || {};
    var list = window.A.creators.filter(function (c) {
      var matchText   = !filter || (c.name || '').includes(filter);
      var matchStatus = !cf.status || (c.status || 'pending') === cf.status;
      return matchText && matchStatus;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><div class="empty-icon">\u2728</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0628\u062a\u0643\u0631\u0648\u0646 \u0628\u0639\u062f</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (c) {
      return '<tr>' +
        '<td><strong>' + window.esc(c.name) + '</strong></td>' +
        '<td>' + window.esc(c.email || '\u2014') + '</td>' +
        '<td>' + badgeStatus(userStatus(c)) + '</td>' +
        '<td class="row-actions-cell"><div class="split-action">' +
          '<button class="split-action-primary" type="button" onclick="openEditCreator(\'' + c.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="split-action-menu" type="button" title="\u0627\u0644\u0623\u0648\u0627\u0645\u0631" aria-label="\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u0628\u062a\u0643\u0631" aria-haspopup="menu" onclick="toggleActionMenu(this,\'creator-more\',\'' + c.id + '\',\'' + userStatus(c) + '\')"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  };

  window.renderOvChallenges = function () {
    var el = document.getElementById('ov-challenges-list');
    if (!el) return;
    var recent = window.A.challenges.slice(-5).reverse();
    if (!recent.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">\u26a1</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u062d\u062f\u064a\u0627\u062a \u0628\u0639\u062f</div>';
      return;
    }
    el.innerHTML = '<div class="mini-list">' + recent.map(function (c) {
      return '<div class="mini-item">' +
        '<div class="mini-main"><div class="mini-title">' + window.esc(c.title || c.name) + '</div>' +
        '<div class="mini-sub">\u0627\u0644\u0645\u0633\u0627\u0631 ' + window.esc(c.track || '\u2014') + ' \u2014 ' + (c.status === 'published' ? '\u0645\u0646\u0634\u0648\u0631' : '\u0645\u0633\u0648\u062f\u0629') + '</div></div>' +
        '<div class="mini-meta">' + window.difficultyLabel(c.difficulty) + '</div>' +
      '</div>';
    }).join('') + '</div>';
  };

  window.renderOvTeachers = function () {
    var el = document.getElementById('ov-teachers-list');
    if (!el) return;
    var recent = window.A.teachers.slice(-5).reverse();
    if (!recent.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">\ud83d\udc64</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0639\u0644\u0645\u0648\u0646 \u0628\u0639\u062f</div>';
      return;
    }
    el.innerHTML = recent.map(function (t) {
      var school = window.A.schools.find(function (s) { return s.id === t.schoolId; });
      return '<div class="mini-item">' +
        '<div class="mini-main"><div class="mini-title">' + window.esc(t.name) + '</div>' +
        '<div class="mini-sub">' + window.esc(school ? school.name : '\u2014') + ' \u2014 <code>' + window.esc(t.teacherCode || '') + '</code></div></div>' +
      '</div>';
    }).join('');
  };

  window.renderNotifList = function () {
    var el = document.getElementById('notif-list');
    if (!el) return;
    if (!window.A.notifs.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">\ud83d\udd14</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a</div>';
      return;
    }
    el.innerHTML = window.A.notifs.map(function (n) {
      return '<li class="notif-item-li ' + (n.readAt ? '' : 'unread') + '" onclick="markRead(\'' + n.id + '\')">' +
        '<span class="notif-icon">\ud83d\udd14</span>' +
        '<div class="notif-text"><div>' + window.esc(n.text || n.message || n.title || '') + '</div>' +
        '<div class="notif-time">' + window.fmtDate(n.createdAt) + '</div></div>' +
        (n.readAt ? '' : '<span class="notif-dot"></span>') +
      '</li>';
    }).join('');
    renderOverviewActivity();
  };

  window.openAddTeacher = function () {
    window.A._editTeacherId = null;
    document.getElementById('teacher-name').value = '';
    document.getElementById('teacher-email').value = '';
    document.getElementById('teacher-pass').value = '';
    var titleEl = document.getElementById('teacher-modal-title');
    if (titleEl) titleEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0645\u0639\u0644\u0645 \u062c\u062f\u064a\u062f';
    var btnEl = document.getElementById('teacher-submit-btn');
    if (btnEl) btnEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0644\u0645';
    window.showMsg('teacher-msg', '', '');
    window.openModal('modal-addteacher');
  };

  window.openEditTeacher = function (id) {
    var t = (window.A.teachers || []).find(function (t) { return t.id === id; });
    if (!t) return;
    window.A._editTeacherId = id;
    document.getElementById('teacher-name').value = t.name || '';
    document.getElementById('teacher-email').value = t.email || '';
    var sel = document.getElementById('teacher-school-sel');
    if (sel) sel.value = t.schoolId || '';
    document.getElementById('teacher-pass').value = '';
    var titleEl = document.getElementById('teacher-modal-title');
    if (titleEl) titleEl.textContent = '\u062a\u0639\u062f\u064a\u0644 \u0645\u0639\u0644\u0645';
    var btnEl = document.getElementById('teacher-submit-btn');
    if (btnEl) btnEl.textContent = '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a';
    window.showMsg('teacher-msg', '', '');
    window.openModal('modal-addteacher');
  };

  window.doSaveTeacher = function () {
    var name   = document.getElementById('teacher-name').value.trim();
    var email  = document.getElementById('teacher-email').value.trim();
    var school = document.getElementById('teacher-school-sel').value;
    var pass   = document.getElementById('teacher-pass').value;
    var editId = window.A._editTeacherId || null;
    if (!name || !email) { window.showMsg('teacher-msg', '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', 'err'); return; }
    if (!editId && !pass) { window.showMsg('teacher-msg', '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', 'err'); return; }
    var promise = editId
      ? window.CQ_API.adminUpdateUser(editId, { name: name, email: email, schoolId: school }, window.A.token)
      : window.CQ_API.adminCreateUser({ name: name, email: email, schoolId: school, passwordHash: hashText(pass), role: 'teacher' }, window.A.token);
    var btn = document.getElementById('teacher-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = '\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638...'; }
    promise.then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = editId ? '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a' : '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0644\u0645'; }
      if (res.success || res.ok) {
        window.A._editTeacherId = null;
        window.closeModal('modal-addteacher');
        window.loadTeachers();
      } else { window.showMsg('teacher-msg', res.message || res.msg || '\u062d\u062f\u062b \u062e\u0637\u0623', 'err'); }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = editId ? '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a' : '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0644\u0645'; }
      window.showMsg('teacher-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err');
    });
  };

  window.doAddTeacher = window.doSaveTeacher;

  window.doDeleteTeacher = function (id) {
    var t = (window.A.teachers || []).find(function (x) { return x.id === id; });
    if (!t) return;
    if (!confirm('نقل هذا المعلم إلى سلة المهملات؟')) return;
    if (typeof window.moveToTrash === 'function') { window.moveToTrash(t, 'teacher'); window.renderTeachersTable(); }
  };

  window.doToggleUserStatus = function (id, newStatus, type) {
    var label = newStatus === 'active' ? 'تفعيل' : 'تعطيل';
    if (!confirm(label + ' هذا الحساب؟')) return;
    var list = type === 'teacher' ? window.A.teachers : (type === 'creator' ? window.A.creators : window.A.students);
    var user = (list || []).find(function (u) { return u.id === id; });
    if (user) user.status = newStatus;
    var savedStatuses = userStatusMap();
    savedStatuses[id] = newStatus;
    localStorage.setItem('cq_user_status_overrides', JSON.stringify(savedStatuses));
    if (type === 'teacher') window.renderTeachersTable();
    else if (type === 'creator') window.renderCreatorsTable();
    else window.renderStudentsTable();
    window.CQ_API.adminSetUserStatus(id, { status: newStatus }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        if (type === 'teacher') window.renderTeachersTable();
        else if (type === 'creator') window.renderCreatorsTable();
        else window.renderStudentsTable();
      } else {
        alert((res && (res.message || res.msg)) || 'حدث خطأ');
      }
    }).catch(function () { alert('تعذر الاتصال بالخادم'); });
  };

  window.doImportTeachers = function () {
    window.showMsg('import-teacher-msg', '\u062c\u0627\u0631\u064a \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f...', 'ok');
  };

  window.openAddStudent = function () {
    window.A._editStudentId = null;
    document.getElementById('student-name').value = '';
    document.getElementById('student-email').value = '';
    document.getElementById('student-pass').value = '';
    var schoolSel = document.getElementById('student-school-sel');
    if (schoolSel) schoolSel.disabled = false;
    if (schoolSel) schoolSel.value = '';
    var clsSel = document.getElementById('student-class');
    var secSel = document.getElementById('student-section');
    if (secSel) secSel.disabled = false;
    window.onStudentSchoolChange();
    var titleEl = document.getElementById('student-modal-title');
    if (titleEl) titleEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0637\u0627\u0644\u0628 \u062c\u062f\u064a\u062f';
    var btnEl = document.getElementById('student-submit-btn');
    if (btnEl) btnEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0644\u0628';
    window.showMsg('student-msg', '', '');
    window.openModal('modal-addstudent');
  };

  window.openAssignStudentSchool = function (id) {
    var student = (window.A.students || []).find(function (s) { return s.id === id; });
    if (!student) return;
    var schools = activeStudentSchoolOptions();
    if (!schools.length) {
      alert('\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062f\u0627\u0631\u0633 \u0623\u0648 \u0645\u0631\u0627\u0643\u0632 \u0645\u062a\u0627\u062d\u0629');
      return;
    }
    window.A._assignStudentTarget = { mode: 'school', studentId: id };
    var titleEl = document.getElementById('assign-student-target-title');
    var labelEl = document.getElementById('assign-student-target-label');
    var sel = document.getElementById('assign-student-target-sel');
    if (titleEl) titleEl.textContent = '\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0645\u062f\u0631\u0633\u0629/\u0627\u0644\u0645\u0631\u0643\u0632';
    if (labelEl) labelEl.textContent = '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062f\u0631\u0633\u0629/\u0627\u0644\u0645\u0631\u0643\u0632';
    if (sel) {
      sel.innerHTML = '<option value="">-- \u0627\u062e\u062a\u0631 --</option>' + schools.map(function (school) {
        return '<option value="' + window.esc(school.id) + '">' + window.esc(school.name + ' (' + schoolKindLabel(school) + ')') + '</option>';
      }).join('');
    }
    window.showMsg('assign-student-target-msg', '', '');
    window.openModal('modal-assign-student-target');
  };

  function saveAssignedStudentSchool(student, schoolId) {
    window.CQ_API.adminUpdateUser(student.id, { schoolId: schoolId, class: '', section: '' }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        student.schoolId = schoolId;
        student.class = '';
        student.className = '';
        student.section = '';
        window.closeModal('modal-assign-student-target');
        window.renderStudentsTable();
        renderClassesDirectory();
      } else {
        window.showMsg('assign-student-target-msg', (res && (res.message || res.msg)) || '??? ???', 'err');
      }
    }).catch(function () { window.showMsg('assign-student-target-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err'); });
  }

  window.openAssignStudentClass = function (id) {
    var student = (window.A.students || []).find(function (s) { return s.id === id; });
    if (!student) return;
    if (!student.schoolId) {
      alert('\u0639\u064a\u0646 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0623\u0648\u0644\u0627\u064b');
      return;
    }
    var options = studentClassOptionsForSchool(student.schoolId);
    if (!options.length) {
      alert('\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641/\u062f\u0648\u0631\u0627\u062a \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0648\u062c\u0647\u0629');
      return;
    }
    window.A._assignStudentTarget = { mode: 'class', studentId: id, options: options };
    var school = (window.A.schools || []).find(function (s) { return s.id === student.schoolId; }) || {};
    var titleEl = document.getElementById('assign-student-target-title');
    var labelEl = document.getElementById('assign-student-target-label');
    var sel = document.getElementById('assign-student-target-sel');
    if (titleEl) titleEl.textContent = '\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0635\u0641/\u0627\u0644\u062f\u0648\u0631\u0629';
    if (labelEl) labelEl.textContent = '\u0627\u062e\u062a\u0631 \u0645\u0646 ' + (school.name || '\u0627\u0644\u0648\u062c\u0647\u0629');
    if (sel) {
      sel.innerHTML = '<option value="">-- \u0627\u062e\u062a\u0631 --</option>' + options.map(function (row, idx) {
        return '<option value="' + idx + '">' + window.esc(row.label || row.value) + '</option>';
      }).join('');
    }
    window.showMsg('assign-student-target-msg', '', '');
    window.openModal('modal-assign-student-target');
  };

  function saveAssignedStudentClass(student, row) {
    window.CQ_API.adminUpdateUser(student.id, { class: row.value, section: row.section || '' }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        student.class = row.value;
        student.className = row.value;
        student.section = row.section || '';
        window.closeModal('modal-assign-student-target');
        window.renderStudentsTable();
        renderClassesDirectory();
      } else {
        window.showMsg('assign-student-target-msg', (res && (res.message || res.msg)) || '??? ???', 'err');
      }
    }).catch(function () { window.showMsg('assign-student-target-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err'); });
  }

  window.doAssignStudentTarget = function () {
    var target = window.A._assignStudentTarget || {};
    var student = (window.A.students || []).find(function (s) { return s.id === target.studentId; });
    var sel = document.getElementById('assign-student-target-sel');
    var value = sel ? sel.value : '';
    if (!student || !value) {
      window.showMsg('assign-student-target-msg', '\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631', 'err');
      return;
    }
    if (target.mode === 'school') {
      saveAssignedStudentSchool(student, value);
      return;
    }
    var row = (target.options || [])[parseInt(value, 10)];
    if (!row) {
      window.showMsg('assign-student-target-msg', '\u0627\u062e\u062a\u064a\u0627\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d', 'err');
      return;
    }
    saveAssignedStudentClass(student, row);
  };

  function openExistingStudentPicker(opts) {
    opts = opts || {};
    window.A._assignExistingStudentTarget = opts;
    var school = (window.A.schools || []).find(function (s) { return s.id === opts.schoolId; });
    var targetEl = document.getElementById('existing-student-target');
    if (targetEl) {
      targetEl.innerHTML =
        '<strong>' + window.esc(opts.kind === 'course' ? '\u0627\u0644\u062f\u0648\u0631\u0629' : '\u0627\u0644\u0635\u0641') + ':</strong> ' + window.esc(opts.className || '\u2014') +
        (opts.section ? ' <span class="badge badge-blue">' + window.esc(opts.section) + '</span>' : '') +
        '<br><strong>' + window.esc(opts.kind === 'course' ? '\u0627\u0644\u0645\u0631\u0643\u0632' : '\u0627\u0644\u0645\u062f\u0631\u0633\u0629') + ':</strong> ' + window.esc(school ? school.name : '\u2014');
    }

    var sel = document.getElementById('existing-student-sel');
    if (sel) {
      var students = (window.A.students || []).filter(function (student) {
        if (student.role && student.role !== 'student') return false;
        if (student.status === 'deleted' || student.leftSchool === true || String(student.leftSchool || '') === 'true') return false;
        // show only students with no class assigned yet
        return !(student.class || student.className);
      }).sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
      });
      sel.innerHTML = students.length
        ? students.map(function (student) {
            return '<option value="' + student.id + '">' + window.esc(student.name || student.email || student.studentCode || '') + '</option>';
          }).join('')
        : '<option value="">لا يوجد طلاب غير مسجلين في صف</option>';
    }

    window.showMsg('existing-student-msg', '', '');
    window.openModal('modal-assign-existing-student');
  }

  window.openAddStudentForClass = function (schoolId, className, section) {
    openExistingStudentPicker({
      kind: 'class',
      schoolId: schoolId,
      className: className || '',
      section: section || ''
    });
  };

  window.openAddStudentForCourse = function (schoolId, courseName) {
    openExistingStudentPicker({
      kind: 'course',
      schoolId: schoolId,
      className: courseName || '',
      section: '\u062f\u0648\u0631\u0629'
    });
  };

  window.doAssignExistingStudent = function () {
    var target = window.A._assignExistingStudentTarget || {};
    var sel = document.getElementById('existing-student-sel');
    var studentId = sel ? sel.value : '';
    if (!studentId) { window.showMsg('existing-student-msg', '\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0637\u0627\u0644\u0628', 'err'); return; }
    if (!target.schoolId || !target.className) { window.showMsg('existing-student-msg', '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0648\u062c\u0647\u0629 \u0646\u0627\u0642\u0635\u0629', 'err'); return; }

    // Condition: student can't be in two classes at the same time
    var existingStudent = (window.A.students || []).find(function (s) { return s.id === studentId; });
    if (existingStudent && existingStudent.class && existingStudent.class !== target.className) {
      window.showMsg('existing-student-msg', '\u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0633\u062c\u0644 \u0645\u0633\u0628\u0642\u0627\u064b \u0641\u064a \u0635\u0641 "' + existingStudent.class + '"\u060c \u064a\u062c\u0628 \u0625\u0632\u0627\u0644\u062a\u0647 \u0645\u0646\u0647 \u0623\u0648\u0644\u0627\u064b', 'err');
      return;
    }

    var btn = document.getElementById('existing-student-submit');
    if (btn) { btn.disabled = true; btn.textContent = '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0636\u0627\u0641\u0629...'; }
    window.CQ_API.adminUpdateUser(studentId, {
      schoolId: target.schoolId,
      class: target.className,
      section: target.section || ''
    }, window.A.token).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0644\u0628'; }
      if (res && (res.ok || res.success)) {
        var student = (window.A.students || []).find(function (s) { return s.id === studentId; });
        if (student) {
          student.schoolId = target.schoolId;
          student.class = target.className;
          student.className = target.className;
          student.section = target.section || '';
        }
        window.A._assignExistingStudentTarget = null;
        window.closeModal('modal-assign-existing-student');
        window.renderStudentsTable();
        renderClassesDirectory();
        refreshManagedClassStudents();
        if (typeof window.loadStudents === 'function') window.loadStudents();
      } else {
        window.showMsg('existing-student-msg', (res && (res.message || res.msg)) || '\u062d\u062f\u062b \u062e\u0637\u0623', 'err');
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0644\u0628'; }
      window.showMsg('existing-student-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err');
    });
  };

  window.openEditStudent = function (id) {
    var s = (window.A.students || []).find(function (s) { return s.id === id; });
    if (!s) return;
    window.A._editStudentId = id;
    document.getElementById('student-name').value = s.name || '';
    document.getElementById('student-email').value = s.email || '';
    var schoolSel = document.getElementById('student-school-sel');
    if (schoolSel) schoolSel.disabled = false;
    if (schoolSel) schoolSel.value = s.schoolId || '';
    var clsSel = document.getElementById('student-class');
    if (clsSel) clsSel.disabled = false;
    window.onStudentSchoolChange();
    if (clsSel) setSelectValue(clsSel, s.class || s.className || '');
    window.onStudentClassChange();
    var secSel = document.getElementById('student-section');
    if (secSel) secSel.disabled = false;
    if (secSel) setSelectValue(secSel, s.section || '');
    document.getElementById('student-pass').value = '';
    var titleEl = document.getElementById('student-modal-title');
    if (titleEl) titleEl.textContent = '\u062a\u0639\u062f\u064a\u0644 \u0637\u0627\u0644\u0628';
    var btnEl = document.getElementById('student-submit-btn');
    if (btnEl) btnEl.textContent = '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a';
    window.showMsg('student-msg', '', '');
    var studentModalBg = document.getElementById('modal-addstudent');
    if (studentModalBg) studentModalBg.style.zIndex = '200';
    window.openModal('modal-addstudent');
  };

  window.doSaveStudent = function () {
    var name    = document.getElementById('student-name').value.trim();
    var email   = document.getElementById('student-email').value.trim();
    var school  = document.getElementById('student-school-sel').value;
    var cls     = document.getElementById('student-class').value;
    var section = document.getElementById('student-section').value;
    var pass    = document.getElementById('student-pass').value;
    var editId  = window.A._editStudentId || null;
    if (!name || !email) { window.showMsg('student-msg', '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', 'err'); return; }
    if (school && !cls) { window.showMsg('student-msg', '\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0641 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0645\u062f\u0631\u0633\u0629', 'err'); return; }
    if (!editId && (!school || !cls || !pass)) {
      window.showMsg('student-msg', '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0648\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0648\u0627\u0644\u0635\u0641 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', 'err'); return;
    }
    var promise = editId
      ? window.CQ_API.adminUpdateUser(editId, { name: name, email: email, schoolId: school, class: cls, section: section }, window.A.token)
      : window.CQ_API.adminCreateUser({ name: name, email: email, schoolId: school, class: cls, section: section, passwordHash: hashText(pass), role: 'student' }, window.A.token);
    var btn = document.getElementById('student-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = '\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638...'; }
    promise.then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = editId ? '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a' : '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0644\u0628'; }
      if (res.success || res.ok) {
        window.A._editStudentId = null;
        ['student-school-sel', 'student-class', 'student-section'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.disabled = false;
        });
        window.closeModal('modal-addstudent');
        window.loadStudents();
        renderClassesDirectory();
        setTimeout(refreshManagedClassStudents, 500);
      } else {
        window.showMsg('student-msg', res.message || res.msg || '\u062d\u062f\u062b \u062e\u0637\u0623', 'err');
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = editId ? '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a' : '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0644\u0628'; }
      window.showMsg('student-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err');
    });
  };

  window.doAddStudent = window.doSaveStudent;

  window.doDeleteStudent = function (id) {
    var s = (window.A.students || []).find(function (x) { return x.id === id; });
    if (!s) return;
    if (!confirm('نقل هذا الطالب إلى سلة المهملات؟')) return;
    if (typeof window.moveToTrash === 'function') { window.moveToTrash(s, 'student'); window.renderStudentsTable(); }
  };

  window.openAddCreator = function () {
    window.A._editCreatorId = null;
    document.getElementById('creator-name').value = '';
    document.getElementById('creator-email').value = '';
    document.getElementById('creator-pass').value = '';
    var titleEl = document.getElementById('creator-modal-title');
    if (titleEl) titleEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0645\u0628\u062a\u0643\u0631';
    var btnEl = document.getElementById('creator-submit-btn');
    if (btnEl) btnEl.textContent = '\u0625\u0636\u0627\u0641\u0629';
    window.openModal('modal-addcreator');
    window.showMsg('creator-msg', '', '');
  };

  window.openEditCreator = function (id) {
    var c = (window.A.creators || []).find(function (x) { return x.id === id; });
    if (!c) return;
    window.A._editCreatorId = id;
    document.getElementById('creator-name').value = c.name || '';
    document.getElementById('creator-email').value = c.email || '';
    document.getElementById('creator-pass').value = '';
    var titleEl = document.getElementById('creator-modal-title');
    if (titleEl) titleEl.textContent = '\u062a\u0639\u062f\u064a\u0644 \u0645\u0628\u062a\u0643\u0631';
    var btnEl = document.getElementById('creator-submit-btn');
    if (btnEl) btnEl.textContent = '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a';
    window.openModal('modal-addcreator');
    window.showMsg('creator-msg', '', '');
  };

  window.doAddCreator = function () {
    var name = document.getElementById('creator-name').value.trim();
    var email = document.getElementById('creator-email').value.trim();
    var pass = document.getElementById('creator-pass').value;
    var editId = window.A._editCreatorId || null;
    if (!name || !email || (!editId && !pass)) { window.showMsg('creator-msg', '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064a\u062f' + (editId ? '' : ' \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631'), 'err'); return; }
    var promise = editId
      ? window.CQ_API.adminUpdateUser(editId, { name: name, email: email }, window.A.token)
      : window.CQ_API.adminCreateUser({ name: name, email: email, passwordHash: hashText(pass), role: 'creator' }, window.A.token);
    promise.then(function (res) {
      if (res.success || res.ok) {
        window.A._editCreatorId = null;
        window.closeModal('modal-addcreator');
        var newUser = res.user || { id: res.userId || ('tmp-' + Date.now()), name: name, email: email, role: 'creator', status: 'active' };
        window.A.creators = window.A.creators || [];
        var existing = editId ? window.A.creators.find(function(c) { return c.id === editId; }) : null;
        if (existing) {
          existing.name = name;
          existing.email = email;
        } else if (!window.A.creators.find(function(c) { return c.email === newUser.email; })) {
          window.A.creators.push(newUser);
        }
        window.renderCreatorsTable();
        window.loadCreators();
      } else { window.showMsg('creator-msg', res.message || res.msg || '\u062d\u062f\u062b \u062e\u0637\u0623', 'err'); }
    }).catch(function () { window.showMsg('creator-msg', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'err'); });
  };

  window.doDeleteCreator = function (id) {
    var c = (window.A.creators || []).find(function (x) { return x.id === id; });
    if (!c) return;
    if (!confirm('نقل هذا المبتكر إلى سلة المهملات؟')) return;
    if (typeof window.moveToTrash === 'function') { window.moveToTrash(c, 'creator'); window.renderCreatorsTable(); }
  };

  if (document.readyState !== 'loading') {
    renderAdminPermissions();
    renderAdminCommandCenter();
    renderOverviewActivity();
    populateStudentClassInputs();
    renderClassesDirectory();
  }

  window.renderClassesDirectory = renderClassesDirectory;
})();
