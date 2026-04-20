/* ============================================
   Track 4 — الإنجازات
   يجلب الإنجازات الموافق عليها من Apps Script
   ويعرضها ديناميكياً
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var grid       = document.getElementById('achievements-grid');
  var emptyState = document.getElementById('empty-state');
  var loadState  = document.getElementById('loading-state');
  var filterTabs = document.getElementById('filter-tabs');
  var challenges = Array.isArray(window.CQ_CHALLENGES)
    ? window.CQ_CHALLENGES.filter(function (challenge) { return challenge && challenge.enabled !== false; })
    : [];

  renderFilterTabs();
  loadAchievements();

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getChallengeKey(value) {
    var text = normalize(value);
    var match = challenges.find(function (challenge) {
      return text === normalize(challenge.value)
        || text === normalize(challenge.title)
        || text.indexOf(normalize(challenge.value)) !== -1
        || text.indexOf(normalize(challenge.title)) !== -1;
    });
    return match ? match.key : 'other';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function renderFilterTabs() {
    if (!filterTabs) return;
    filterTabs.innerHTML = '<button class="ch-tab active" type="button" data-filter="all">🏅 الكل</button>';
    challenges
      .sort(function (a, b) { return (a.id || 0) - (b.id || 0); })
      .forEach(function (challenge) {
        var button = document.createElement('button');
        button.className = 'ch-tab';
        button.type = 'button';
        button.dataset.filter = challenge.key;
        button.textContent = challenge.label || challenge.title || challenge.value;
        filterTabs.appendChild(button);
      });

    filterTabs.addEventListener('click', function (event) {
      var button = event.target.closest('.ch-tab');
      if (!button) return;
      window.filterBy(button.dataset.filter || 'all', button);
    });
  }

  /* ── جلب البيانات ── */
  function loadAchievements() {
    if (loadState) loadState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    fetch(CQ.scriptUrl + '?action=list')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        if (loadState) loadState.style.display = 'none';
        render(Array.isArray(items) ? items : []);
      })
      .catch(function () {
        if (loadState) loadState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
      });
  }

  /* ── عرض البطاقات ── */
  function render(items) {
    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    items.forEach(function (item) {
      var challengeKey = getChallengeKey(item.challenge);

      var card = document.createElement('div');
      card.className = 'achievement-card';
      card.dataset.challenge = challengeKey;
      card.innerHTML =
        '<img src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
        '<div class="achievement-info">' +
          '<div class="achievement-name">'   + escapeHtml(item.name)   + '</div>' +
          '<div class="achievement-school">' + escapeHtml(item.school) + '</div>' +
          '<span class="achievement-challenge">' + escapeHtml(item.challenge) + '</span>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  /* ── فلترة التحديات ── */
  window.filterBy = function (challenge, activeTab) {
    document.querySelectorAll('#filter-tabs .ch-tab').forEach(function (tab) {
      tab.classList.remove('active');
    });
    if (activeTab) {
      activeTab.classList.add('active');
    } else {
      var fallbackTab = document.querySelector('#filter-tabs .ch-tab[data-filter="' + challenge + '"]');
      if (fallbackTab) fallbackTab.classList.add('active');
    }

    if (!grid) return;
    grid.querySelectorAll('.achievement-card').forEach(function (card) {
      var show = challenge === 'all' || card.dataset.challenge === challenge;
      card.style.display = show ? '' : 'none';
    });

    if (emptyState) {
      var visible = grid.querySelectorAll('.achievement-card:not([style*="none"])');
      emptyState.style.display = visible.length === 0 ? 'flex' : 'none';
    }
  };
});
