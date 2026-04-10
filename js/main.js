/* ============================================
   Circuit Quest — Main JavaScript
   ============================================ */

/* ── Carousel ── */
function initCarousel(wrap) {
  const track = wrap.querySelector('.carousel-track');
  const slides = wrap.querySelectorAll('.carousel-slide');
  const dots = wrap.querySelectorAll('.carousel-dot');
  const btnPrev = wrap.querySelector('.btn-prev');
  const btnNext = wrap.querySelector('.btn-next');
  let cur = 0;

  function goTo(i) {
    const nextIndex = Math.max(0, Math.min(i, slides.length - 1));
    const beforeChange = new CustomEvent('carousel:beforechange', {
      cancelable: true,
      detail: { current: cur, next: nextIndex, total: slides.length }
    });
    if (!wrap.dispatchEvent(beforeChange)) return;

    cur = nextIndex;
    track.style.transform = 'translateX(' + (cur * 100) + '%)';
    dots.forEach((d, idx) => d.classList.toggle('active', idx === cur));
    if (btnPrev) btnPrev.disabled = cur === 0;
    if (btnNext) btnNext.disabled = cur === slides.length - 1;
    wrap.dispatchEvent(new CustomEvent('carousel:change', {
      detail: { current: cur, total: slides.length }
    }));
  }

  if (btnPrev) btnPrev.addEventListener('click', () => goTo(cur - 1));
  if (btnNext) btnNext.addEventListener('click', () => goTo(cur + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

  // Touch swipe
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? cur + 1 : cur - 1);
  }, { passive: true });

  goTo(0);
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.carousel-wrap').forEach(initCarousel);
});

/* ── Upload preview ── */
function initUpload() {
  const input = document.getElementById('file-input');
  const area = document.getElementById('upload-area');
  const preview = document.getElementById('upload-preview');
  if (!input || !area) return;

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) { alert('يرجى اختيار صورة فقط'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
      area.querySelector('.upload-icon').textContent = '✅';
      area.querySelector('.upload-text').innerHTML = '<strong>' + file.name + '</strong>';
    };
    reader.readAsDataURL(file);
  }
}

document.addEventListener('DOMContentLoaded', initUpload);

/* ── Form submit feedback ── */
function initForm() {
  const form = document.getElementById('upload-form');
  if (!form) return;
  form.addEventListener('submit', function () {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'جاري الإرسال...'; btn.disabled = true; }
  });
}

document.addEventListener('DOMContentLoaded', initForm);
