const themeBtn = document.getElementById('themeToggle');
const saved = localStorage.getItem('cq-theme');
if (saved === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeBtn.textContent = '☀️';
}
themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    themeBtn.textContent = '🌙';
    localStorage.setItem('cq-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeBtn.textContent = '☀️';
    localStorage.setItem('cq-theme', 'dark');
  }
});

document.addEventListener('DOMContentLoaded', function () {
  var user = Auth.getCurrentUser();
  if (!user) {
    window.location.href = '../../auth/index.html?reason=login_required_for_tracks';
    return;
  }
  if (user && user.role === Auth.roles.TEACHER) {
    window.location.href = '../../teacher/dashboard.html';
    return;
  }
});
