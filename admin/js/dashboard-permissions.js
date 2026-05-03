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
    if (draftsEl) draftsEl.textContent = drafts;
    if (usersEl) usersEl.textContent = managedUsers;
    if (schoolsEl) schoolsEl.textContent = state.schools.length;
  }

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
    if (!state.notifs.length) {
      ov.innerHTML = '<div class="empty"><div class="empty-icon">!</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u0634\u0627\u0637\u0627\u062a \u0628\u0639\u062f</div>';
      return;
    }

    ov.innerHTML = state.notifs.slice(0, 4).map(function (n) {
      var title = n.title || n.text || n.message || '\u062a\u0646\u0628\u064a\u0647';
      var when = typeof window.fmtDate === 'function' ? window.fmtDate(n.createdAt) : '';
      var badgeHtml = !n.readAt
        ? '<span class="badge badge-blue">\u062c\u062f\u064a\u062f</span>'
        : '<span class="badge badge-draft">\u0645\u0642\u0631\u0648\u0621</span>';

      return '<div class="mini-item">' +
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
    ['student-class', 'addclass-grade'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = gradeOpts;
    });
    ['student-section', 'addclass-section'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = sectionOpts;
    });
  }

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
      if (target.status !== 'inactive' && source.status === 'inactive') target.status = 'inactive';
      target.activeCount += source.activeCount || 0;
      target.pendingCount += source.pendingCount || 0;
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
        status: cls.status || 'active',
        activeCount: 0,
        pendingCount: 0
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
          pendingCount: 0
        };
      }

      if (student.status === 'active') classMap[key].activeCount += 1;
      else classMap[key].pendingCount += 1;
    });

    var classRows = Object.keys(classMap).map(function (key) { return classMap[key]; }).filter(function (row) {
      if (isHiddenClassRow(row)) return false;
      var matchesSchool = !schoolFilter || row.schoolId === schoolFilter;
      var hay = [row.schoolName, row.grade, row.section, row.label].join(' ');
      var matchesText = !textFilter || hay.indexOf(textFilter) !== -1;
      return matchesSchool && matchesText;
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
      var teacherName = teacher ? teacher.name : (row.teacherId && row.teacherId !== 'admin-unassigned' ? row.teacherId : '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f');
      var totalStudents = row.activeCount + row.pendingCount;
      var rowStatus = row.status || 'active';
      var statusBadge = rowStatus === 'inactive'
        ? '<span class="badge badge-inactive">\u0645\u0639\u0637\u0644</span>'
        : row.pendingCount
        ? '<span class="badge badge-pending">\u064a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629</span>'
        : '<span class="badge badge-active">\u0646\u0634\u0637</span>';
      var safeLabel = window.esc(String(row.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var safeGrade = window.esc(String(row.grade || row.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var safeSection = window.esc(String(row.section || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var assignAction;
      if (!row.id) {
        assignAction = '<button class="btn btn-xs btn-outline action-chip" disabled>\u0631\u0628\u0637</button>';
      } else if (row.teacherId && row.teacherId !== 'admin-unassigned') {
        assignAction = '<button class="btn btn-xs btn-blue action-chip" onclick="openAssignTeacherToClass(\'' + row.id + '\',\'' + safeLabel + '\')">\u0627\u0644\u0645\u0639\u0644\u0645</button>';
      } else {
        assignAction = '<button class="btn btn-xs btn-green action-chip" onclick="openAssignTeacherToClass(\'' + row.id + '\',\'' + safeLabel + '\')">\u0627\u0644\u0645\u0639\u0644\u0645</button>';
      }
      var statusAction = rowStatus === 'inactive'
        ? (row.id
          ? '<button class="btn btn-xs btn-green action-chip" onclick="doToggleClassStatus(\'' + row.id + '\',\'active\')">\u062a\u0641\u0639\u064a\u0644</button>'
          : '<button class="btn btn-xs btn-green action-chip" onclick="doToggleVirtualClassStatus(\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\',\'active\')">\u062a\u0641\u0639\u064a\u0644</button>')
        : (row.id
          ? '<button class="btn btn-xs btn-danger action-chip" onclick="doToggleClassStatus(\'' + row.id + '\',\'inactive\')">\u062a\u0639\u0637\u064a\u0644</button>'
          : '<button class="btn btn-xs btn-danger action-chip" onclick="doToggleVirtualClassStatus(\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\',\'inactive\')">\u062a\u0639\u0637\u064a\u0644</button>');
      var editAction = row.id
        ? '<button class="btn btn-xs btn-outline action-chip" onclick="openEditClass(\'' + row.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>'
        : '<button class="btn btn-xs btn-outline action-chip" onclick="openEditVirtualClass(\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')">\u062a\u0639\u062f\u064a\u0644</button>';
      var deleteAction = row.id
        ? '<button class="btn btn-xs btn-danger-outline action-chip" onclick="doDeleteClassData(\'' + row.id + '\',\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')">\u062d\u0630\u0641</button>'
        : '<button class="btn btn-xs btn-danger-outline action-chip" onclick="doDeleteVirtualClassData(\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')">\u062d\u0630\u0641</button>';
      var studentAction = '<button class="btn btn-xs btn-blue action-chip" onclick="openAddStudentForClass(\'' + row.schoolId + '\',\'' + safeGrade + '\',\'' + safeSection + '\')">\u0637\u0627\u0644\u0628</button>';

      return '<tr>' +
        '<td><strong class="class-table-title">' + window.esc(row.label) + '</strong><div class="class-table-sub">' + window.esc(row.grade || '\u2014') + '</div></td>' +
        '<td>' + window.esc(row.schoolName || '\u2014') + '</td>' +
        '<td><span class="badge badge-blue">' + window.esc(row.section || '\u2014') + '</span></td>' +
        '<td>' + window.esc(teacherName) + '</td>' +
        '<td class="class-student-count"><strong>' + totalStudents + '</strong><span>' + row.activeCount + ' \u0646\u0634\u0637</span></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><div class="class-actions">' +
          editAction +
          assignAction +
          studentAction +
          statusAction +
          deleteAction +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="7"><div class="empty"><div class="empty-icon">\ud83c\udfeb</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0645\u062f\u0627\u0631\u0633 \u0645\u0637\u0627\u0628\u0642\u0629</div></td></tr>';

    var courseRows = (state.courses || []).filter(function (course) {
      var schoolId = course.schoolId || '';
      if (!isSchoolActive(schoolId)) return false;
      var school = schoolById(schoolId);
      if (!isCenter(school)) return false;
      var matchesSchool = !schoolFilter || schoolId === schoolFilter;
      var hay = [school ? school.name : '', course.name || '', course.trainerName || '', course.startTime || '', course.endTime || '', course.weeks || ''].join(' ');
      var matchesText = !textFilter || hay.indexOf(textFilter) !== -1;
      return matchesSchool && matchesText;
    }).sort(function (a, b) {
      var as = schoolById(a.schoolId);
      var bs = schoolById(b.schoolId);
      var an = as ? as.name : '';
      var bn = bs ? bs.name : '';
      if (an !== bn) return an.localeCompare(bn, 'ar');
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });

    var courseRowsHtml = courseRows.length ? courseRows.map(function (course) {
      var center = schoolById(course.schoolId);
      var trainerName = course.trainerName || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f';
      var time = fmtTime(course.startTime) + ' - ' + fmtTime(course.endTime);
      var courseStatus = course.courseStatus || course.activeStatus || 'active';
      var courseStudents = (state.students || []).filter(function (student) {
        return (student.schoolId || '') === (course.schoolId || '') && String(student.class || '') === String(course.name || '');
      });
      var courseActiveStudents = courseStudents.filter(function (student) { return student.status === 'active'; }).length;
      var trainerActionLabel = course.trainerId ? '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u062f\u0631\u0628' : '\u0631\u0628\u0637 \u0627\u0644\u0645\u062f\u0631\u0628';
      var trainerActionClass = course.trainerId ? 'btn-blue' : 'btn-purple';
      var safeCourseName = window.esc(String(course.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
      var courseStatusAction = courseStatus === 'inactive'
        ? '<button class="btn btn-xs btn-green action-chip" onclick="doToggleCourseStatus(\'' + course.id + '\',\'active\')">\u062a\u0641\u0639\u064a\u0644</button>'
        : '<button class="btn btn-xs btn-danger action-chip" onclick="doToggleCourseStatus(\'' + course.id + '\',\'inactive\')">\u062a\u0639\u0637\u064a\u0644</button>';
      return '<tr>' +
        '<td><strong class="class-table-title">' + window.esc(course.name || '\u2014') + '</strong><div class="class-table-sub">\u062f\u0648\u0631\u0629 \u0645\u0631\u0643\u0632</div></td>' +
        '<td>' + window.esc(center ? center.name : '\u2014') + '</td>' +
        '<td><span class="badge badge-purple">' + window.esc(time) + '</span></td>' +
        '<td>' + window.esc(course.weeks || '\u2014') + '</td>' +
        '<td>' + window.esc(trainerName) + '</td>' +
        '<td class="class-student-count"><strong>' + courseStudents.length + '</strong><span>' + courseActiveStudents + ' \u0646\u0634\u0637</span></td>' +
        '<td>' + (courseStatus === 'inactive' ? '<span class="badge badge-inactive">\u0645\u0639\u0637\u0644</span>' : '<span class="badge badge-active">\u0646\u0634\u0637</span>') + '</td>' +
        '<td><div class="class-actions">' +
          '<button class="btn btn-xs btn-outline action-chip" onclick="openEditCourse(\'' + course.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          '<button class="btn btn-xs ' + trainerActionClass + ' action-chip" onclick="openAssignTrainerToCourse(\'' + course.id + '\',\'' + safeCourseName + '\')">\u0627\u0644\u0645\u062f\u0631\u0628</button>' +
          '<button class="btn btn-xs btn-blue action-chip" onclick="openAddStudentForCourse(\'' + course.schoolId + '\',\'' + safeCourseName + '\')">\u0637\u0627\u0644\u0628</button>' +
          courseStatusAction +
          '<button class="btn btn-xs btn-danger-outline action-chip" onclick="doDeleteCourse(\'' + course.id + '\')">\u062d\u0630\u0641</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="8"><div class="empty"><div class="empty-icon">\ud83e\udde9</div>\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0648\u0631\u0627\u062a \u0645\u0631\u0627\u0643\u0632 \u0645\u0637\u0627\u0628\u0642\u0629</div></td></tr>';

    wrap.innerHTML =
      '<div id="classes-tab-classes" class="classes-directory-tab"' + classesDisplay + '>' +
        '<div class="tbl-wrap classes-table-wrap">' +
          '<table class="classes-table">' +
            '<thead><tr><th>\u0627\u0644\u0635\u0641</th><th>\u0627\u0644\u0645\u062f\u0631\u0633\u0629</th><th>\u0627\u0644\u0634\u0639\u0628\u0629</th><th>\u0627\u0644\u0645\u0639\u0644\u0645</th><th>\u0627\u0644\u0637\u0644\u0627\u0628</th><th>\u0627\u0644\u062d\u0627\u0644\u0629</th><th>\u0625\u062c\u0631\u0627\u0621\u0627\u062a</th></tr></thead>' +
            '<tbody>' + classRowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
      '<div id="classes-tab-courses" class="classes-directory-tab"' + coursesDisplay + '>' +
        '<div class="tbl-wrap classes-table-wrap">' +
          '<table class="classes-table">' +
            '<thead><tr><th>\u0627\u0644\u062f\u0648\u0631\u0629</th><th>\u0627\u0644\u0645\u0631\u0643\u0632</th><th>\u0627\u0644\u0648\u0642\u062a</th><th>\u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639</th><th>\u0627\u0644\u0645\u062f\u0631\u0628</th><th>\u0627\u0644\u0637\u0644\u0627\u0628</th><th>\u0627\u0644\u062d\u0627\u0644\u0629</th><th>\u0625\u062c\u0631\u0627\u0621\u0627\u062a</th></tr></thead>' +
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
    var loadingHtml = '<div class="tbl-wrap classes-table-wrap"><table class="classes-table"><tbody><tr><td colspan="7"><div class="empty"><div class="empty-icon">...</div>\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u0648\u0641 \u0648\u0627\u0644\u062f\u0648\u0631\u0627\u062a</div></td></tr></tbody></table></div>';
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
    var list = filter ? window.A.schools.filter(function (s) {
      return (s.name || '').includes(filter) || (s.city || '').includes(filter);
    }) : window.A.schools;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">🏫</div>لا توجد مدارس بعد</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (s) {
      var teacherCount = getSchoolTeachers(s.id).length;
      var studentCount = getSchoolStudents(s.id).length;
      var classCount = getSchoolClassesOrCourses(s.id).length;
      var extraBtn = s.type === 'center'
        ? '<button class="btn btn-xs btn-purple" onclick="openAddCourseForSchool(\'' + s.id + '\')">إضافة دورة</button>'
        : '<button class="btn btn-xs btn-blue" onclick="openAddClassForSchool(\'' + s.id + '\')">إضافة صف</button>';
      var status = savedStatuses[s.id] || s.status || 'active';
      var isActive = status !== 'inactive';
      return '<tr' + (isActive ? '' : ' style="opacity:.6"') + '>' +
        '<td><strong>' + window.esc(s.name) + '</strong><div style="font-size:.75rem;color:#888">' + window.esc(s.city || '') + '</div></td>' +
        '<td><span class="badge badge-blue">' + (s.type === 'center' ? 'مركز' : 'مدرسة') + '</span></td>' +
        '<td>' + badgeStatus(status) + '</td>' +
        '<td style="text-align:center"><button class="count-link" onclick="openSchoolRelated(\'' + s.id + '\',\'teachers\')">' + teacherCount + '</button></td>' +
        '<td style="text-align:center"><button class="count-link" onclick="openSchoolRelated(\'' + s.id + '\',\'students\')">' + studentCount + '</button></td>' +
        '<td style="text-align:center"><button class="count-link" onclick="openSchoolRelated(\'' + s.id + '\',\'classes\')">' + classCount + '</button></td>' +
        '<td>' +
          '<div class="school-actions">' +
            '<button class="btn btn-xs btn-outline school-action-edit" onclick="openEditSchool(\'' + s.id + '\')">تعديل</button>' +
            extraBtn +
            (isActive
              ? '<button class="btn btn-xs btn-danger" onclick="doToggleSchoolStatus(\'' + s.id + '\')">تعطيل</button>'
              : '<button class="btn btn-xs btn-green" onclick="doToggleSchoolStatus(\'' + s.id + '\')">تفعيل</button>') +
            '<button class="btn btn-xs btn-danger-outline" onclick="doDeleteSchool(\'' + s.id + '\')">حذف</button>' +
          '</div>' +
        '</td>' +
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
    var addedRows = getSchoolClassesOrCourses(schoolId);
    return uniqueRows((window.A.students || []).filter(function (s) {
      if (s.status === 'deleted' || !belongsToSchool(s, school)) return false;
      if (isCenter) {
        var courseName = normalizeRelatedText(s.class || s.className || '');
        return addedRows.some(function (row) {
          return normalizeRelatedText(row.name) === courseName;
        });
      }
      var parts = splitRelatedClassParts(s.class || s.className || '', s.section || '');
      return addedRows.some(function (row) {
        return normalizeRelatedText(row.name) === normalizeRelatedText(parts.grade) &&
          normalizeRelatedSection(row.section || '') === normalizeRelatedSection(parts.section || '');
      });
    }), function (s) {
      return s.id || normalizeRelatedText(s.email || s.name || '');
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

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
    el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
      '<thead><tr style="background:var(--bg,#f3f7fb)">' +
      '<th style="padding:6px 8px;text-align:right">الصف</th>' +
      '<th style="padding:6px 8px;text-align:right">الشعبة</th>' +
      '<th style="padding:6px 8px;text-align:right">المعلم</th>' +
      '<th style="padding:6px 8px"></th>' +
      '</tr></thead><tbody>' +
      classes.map(function (c) {
        var teacher = (window.A.teachers || []).find(function (t) { return t.id === c.teacherId; });
        var teacherName = teacher ? teacher.name : '<span style="color:#aaa">غير محدد</span>';
        return '<tr style="border-bottom:1px solid var(--border,#e5e7eb)">' +
          '<td style="padding:6px 8px">' + window.esc(c.grade || c.name || '') + '</td>' +
          '<td style="padding:6px 8px">' + window.esc(c.section || '—') + '</td>' +
          '<td style="padding:6px 8px">' + teacherName + '</td>' +
          '<td style="padding:6px 8px;display:flex;gap:4px">' +
            '<button class="btn btn-xs btn-outline" onclick="openEditClass(\'' + c.id + '\')">تعديل</button>' +
            '<button class="btn btn-xs btn-green" onclick="openAssignTeacherToClass(\'' + c.id + '\',\'' + window.esc(c.grade || c.name || '') + ' ' + window.esc(c.section || '') + '\')">ربط معلم</button>' +
            '<button class="btn btn-xs btn-blue" onclick="openAddStudentForClass(\'' + c.schoolId + '\',\'' + window.esc(c.grade || c.name || '') + '\',\'' + window.esc(c.section || '') + '\')">إضافة طالب</button>' +
            (c.status === 'inactive'
              ? '<button class="btn btn-xs btn-green" onclick="doToggleClassStatus(\'' + c.id + '\',\'active\')">تفعيل</button>'
              : '<button class="btn btn-xs btn-danger" onclick="doToggleClassStatus(\'' + c.id + '\',\'inactive\')">تعطيل</button>') +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
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
          '<td style="padding:6px 8px;display:flex;gap:4px;flex-wrap:wrap">' +
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
    _renderMgClsList(schoolId);
    window.openModal('modal-manage-classes');
  };

  window.openEditClass = function (classId) {
    var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
    if (!cls) return;
    window.A._editClassId = classId;
    window.A._addClassSchoolId = cls.schoolId || '';
    var school = window.A.schools.find(function (s) { return s.id === cls.schoolId; });
    var nameEl = document.getElementById('mgcls-school-name');
    if (nameEl) nameEl.textContent = school ? school.name : '';
    var titleEl = document.getElementById('addclass-form-title');
    if (titleEl) titleEl.textContent = 'تعديل الصف';
    var btnEl = document.getElementById('addclass-submit-btn');
    if (btnEl) btnEl.textContent = 'حفظ التعديل';
    ensureSelectOption('addclass-grade', cls.grade || cls.name || '');
    ensureSelectOption('addclass-section', cls.section || '');
    window.showMsg('addclass-msg', '', '');
    _renderMgClsList(cls.schoolId);
    window.openModal('modal-manage-classes');
  };

  window.openEditVirtualClass = function (schoolId, grade, section) {
    window.A._editClassId = null;
    window.A._addClassSchoolId = schoolId || '';
    var school = window.A.schools.find(function (s) { return s.id === schoolId; });
    var nameEl = document.getElementById('mgcls-school-name');
    if (nameEl) nameEl.textContent = school ? school.name : '';
    var titleEl = document.getElementById('addclass-form-title');
    if (titleEl) titleEl.textContent = 'تعديل الصف';
    var btnEl = document.getElementById('addclass-submit-btn');
    if (btnEl) btnEl.textContent = 'حفظ التعديل';
    ensureSelectOption('addclass-grade', grade || '');
    ensureSelectOption('addclass-section', section || '');
    window.showMsg('addclass-msg', 'سيتم حفظ هذا الصف كسجل رسمي عند الضغط على حفظ التعديل', 'ok');
    _renderMgClsList(schoolId);
    window.openModal('modal-manage-classes');
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
      window.CQ_API.createClass('admin-unassigned', '', grade, schoolId, section).then(saveCreated);
    }).catch(function () { window.showMsg('addclass-msg', 'تعذر الاتصال بالخادم', 'err'); });
  };

  window.openAssignTeacherToClass = function (classId, classLabel) {
    window.A._assignClassId = classId;
    var labelEl = document.getElementById('acteacher-class-label');
    if (labelEl) labelEl.textContent = 'الصف: ' + (classLabel || '');
    var sel = document.getElementById('acteacher-sel');
    if (sel) {
      var teachers = (window.A.teachers || []).filter(function (t) { return t.status === 'active' || t.status === 'pending'; });
      sel.innerHTML = '<option value="">-- اختر معلماً --</option>' +
        teachers.map(function (t) {
          return '<option value="' + t.id + '">' + window.esc(t.name) + '</option>';
        }).join('');
      var cls = (window.A.classes || []).find(function (c) { return c.id === classId; });
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
    var savePromise = cls && (cls._localOnly || shouldMoveUnassigned)
      ? window.CQ_API.createClass(teacherId, teacherEmail, cls.grade || cls.name || '', cls.schoolId || window.A._addClassSchoolId || '', cls.section || '')
      : window.CQ_API.updateClass(classId, teacherId, {teacherEmail: teacherEmail}, window.A.token);

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
        }
        if (shouldMoveUnassigned && oldClassId && oldClassId !== (cls && cls.id)) {
          window.CQ_API.deleteClass(oldClassId, 'admin-unassigned').then(function () {}).catch(function () {});
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
      var teachers = (window.A.teachers || []).filter(function (t) { return t.status === 'active' || t.status === 'pending'; });
      sel.innerHTML = '<option value="">-- اختر مدرباً --</option>' +
        teachers.map(function (t) {
          return '<option value="' + t.id + '">' + window.esc(t.name) + '</option>';
        }).join('');
      var crs = (window.A.courses || []).find(function (c) { return c.id === courseId; });
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
    window.CQ_API.updateCourse(courseId, { trainerId: trainerId, trainerName: trainerName }, window.A.token).then(function (res) {
      if (res && (res.ok || res.success)) {
        var crs = (window.A.courses || []).find(function (c) { return c.id === courseId; });
        if (crs) { crs.trainerId = trainerId; crs.trainerName = trainerName; }
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
    var list = filter ? window.A.teachers.filter(function (t) {
      return (t.name || '').includes(filter) || (t.teacherCode || '').includes(filter);
    }) : window.A.teachers;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">\ud83d\udc64</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0639\u0644\u0645\u0648\u0646 \u0628\u0639\u062f</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (t) {
      var school = window.A.schools.find(function (s) { return s.id === t.schoolId; });
      return '<tr>' +
        '<td><strong>' + window.esc(t.name) + '</strong></td>' +
        '<td><code>' + window.esc(t.teacherCode || '\u2014') + '</code></td>' +
        '<td>' + window.esc(t.email || '\u2014') + '</td>' +
        '<td>' + window.esc(school ? school.name : '\u2014') + '</td>' +
        '<td>' + badgeStatus(userStatus(t)) + '</td>' +
        '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
          '<button class="btn btn-xs btn-outline" onclick="openEditTeacher(\'' + t.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          (userStatus(t) === 'inactive'
            ? '<button class="btn btn-xs btn-green" onclick="doToggleUserStatus(\'' + t.id + '\',\'active\',\'teacher\')">\u062a\u0641\u0639\u064a\u0644</button>'
            : '<button class="btn btn-xs btn-danger" onclick="doToggleUserStatus(\'' + t.id + '\',\'inactive\',\'teacher\')">\u062a\u0639\u0637\u064a\u0644</button>') +
          '<button class="btn btn-xs btn-danger-outline" onclick="doDeleteTeacher(\'' + t.id + '\')">\u062d\u0630\u0641</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  };

  window.renderStudentsTable = function () {
    var tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    var schoolFilter = (document.getElementById('student-school-filter') || {}).value || '';
    var textFilter = (document.getElementById('student-search') || {}).value || '';
    var list = window.A.students.filter(function (s) {
      var matchSchool = !schoolFilter || s.schoolId === schoolFilter;
      var matchText = !textFilter || (s.name || '').includes(textFilter) || (s.studentCode || '').includes(textFilter);
      return matchSchool && matchText;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">\ud83c\udf93</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (s) {
      var school = window.A.schools.find(function (sc) { return sc.id === s.schoolId; });
      return '<tr>' +
        '<td><strong>' + window.esc(s.name) + '</strong></td>' +
        '<td><code>' + window.esc(s.studentCode || '\u2014') + '</code></td>' +
        '<td>' + window.esc(s.email || '\u2014') + '</td>' +
        '<td>' + window.esc(s.className || s.class || '\u2014') + '</td>' +
        '<td>' + window.esc(school ? school.name : '\u2014') + '</td>' +
        '<td>' + badgeStatus(userStatus(s)) + '</td>' +
        '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
          '<button class="btn btn-xs btn-outline" onclick="openEditStudent(\'' + s.id + '\')">\u062a\u0639\u062f\u064a\u0644</button>' +
          (userStatus(s) === 'inactive'
            ? '<button class="btn btn-xs btn-green" onclick="doToggleUserStatus(\'' + s.id + '\',\'active\',\'student\')">\u062a\u0641\u0639\u064a\u0644</button>'
            : '<button class="btn btn-xs btn-danger" onclick="doToggleUserStatus(\'' + s.id + '\',\'inactive\',\'student\')">\u062a\u0639\u0637\u064a\u0644</button>') +
          '<button class="btn btn-xs btn-danger-outline" onclick="doDeleteStudent(\'' + s.id + '\')">\u062d\u0630\u0641</button>' +
        '</td>' +
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
    var list = filter ? window.A.creators.filter(function (c) {
      return (c.name || '').includes(filter);
    }) : window.A.creators;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><div class="empty-icon">\u2728</div>\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0628\u062a\u0643\u0631\u0648\u0646 \u0628\u0639\u062f</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (c) {
      return '<tr>' +
        '<td><strong>' + window.esc(c.name) + '</strong></td>' +
        '<td>' + window.esc(c.email || '\u2014') + '</td>' +
        '<td>' + badgeStatus(userStatus(c)) + '</td>' +
        '<td style="display:flex;gap:4px;flex-wrap:wrap">' +
          (userStatus(c) === 'inactive'
            ? '<button class="btn btn-xs btn-green" onclick="doToggleUserStatus(\'' + c.id + '\',\'active\',\'creator\')">\u062a\u0641\u0639\u064a\u0644</button>'
            : '<button class="btn btn-xs btn-danger" onclick="doToggleUserStatus(\'' + c.id + '\',\'inactive\',\'creator\')">\u062a\u0639\u0637\u064a\u0644</button>') +
          '<button class="btn btn-xs btn-danger-outline" onclick="doDeleteCreator(\'' + c.id + '\')">\u062d\u0630\u0641</button>' +
        '</td>' +
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
    var clsSel = document.getElementById('student-class');
    if (clsSel) clsSel.disabled = false;
    var secSel = document.getElementById('student-section');
    if (secSel) secSel.disabled = false;
    var titleEl = document.getElementById('student-modal-title');
    if (titleEl) titleEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0637\u0627\u0644\u0628 \u062c\u062f\u064a\u062f';
    var btnEl = document.getElementById('student-submit-btn');
    if (btnEl) btnEl.textContent = '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0644\u0628';
    window.showMsg('student-msg', '', '');
    window.openModal('modal-addstudent');
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
    if (clsSel) clsSel.value = s.class || s.className || '';
    var secSel = document.getElementById('student-section');
    if (secSel) secSel.disabled = false;
    if (secSel) secSel.value = s.section || '';
    document.getElementById('student-pass').value = '';
    var titleEl = document.getElementById('student-modal-title');
    if (titleEl) titleEl.textContent = '\u062a\u0639\u062f\u064a\u0644 \u0637\u0627\u0644\u0628';
    var btnEl = document.getElementById('student-submit-btn');
    if (btnEl) btnEl.textContent = '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a';
    window.showMsg('student-msg', '', '');
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

  window.openAddCreator = function () { window.openModal('modal-addcreator'); window.showMsg('creator-msg', '', ''); };
  window.doAddCreator = function () {
    var name = document.getElementById('creator-name').value.trim();
    var email = document.getElementById('creator-email').value.trim();
    var pass = document.getElementById('creator-pass').value;
    if (!name || !email || !pass) { window.showMsg('creator-msg', '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', 'err'); return; }
    window.CQ_API.adminCreateUser({ name: name, email: email, passwordHash: hashText(pass), role: 'creator' }, window.A.token).then(function (res) {
      if (res.success || res.ok) {
        window.closeModal('modal-addcreator');
        var newUser = res.user || { id: res.userId || ('tmp-' + Date.now()), name: name, email: email, role: 'creator', status: 'active' };
        window.A.creators = window.A.creators || [];
        if (!window.A.creators.find(function(c) { return c.email === newUser.email; })) {
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
