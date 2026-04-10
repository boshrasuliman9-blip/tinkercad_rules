/* ============================================
   Track 4 — الإنجازات
   يجلب الإنجازات الموافق عليها من Apps Script
   ويعرضها ديناميكياً
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var grid       = document.getElementById('achievements-grid');
  var emptyState = document.getElementById('empty-state');
  var loadState  = document.getElementById('loading-state');

  loadAchievements();

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
      var challengeKey = item.challenge && item.challenge.toLowerCase().includes('push')
        ? 'push-button' : 'first-circuit';

      var card = document.createElement('div');
      card.className = 'achievement-card';
      card.dataset.challenge = challengeKey;
      card.innerHTML =
        '<img src="' + item.imageUrl + '" alt="' + item.name + '" loading="lazy">' +
        '<div class="achievement-info">' +
          '<div class="achievement-name">'   + item.name   + '</div>' +
          '<div class="achievement-school">' + item.school + '</div>' +
          '<span class="achievement-challenge">' + item.challenge + '</span>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  /* ── فلترة التحديات ── */
  window.filterBy = function (challenge) {
    document.querySelectorAll('#filter-tabs .ch-tab').forEach(function (tab) {
      tab.classList.remove('active');
    });
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

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
