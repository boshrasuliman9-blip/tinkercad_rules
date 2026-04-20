/* Admin landing page — blue accent */
window.LANDING_3D_CONFIG = {
  accentColor: 0x2563eb,
  imgBase:     '../img/',
};

/* ── Admin chip info ── */
try {
  var chipName = document.getElementById('admin-chip-name');
  var chipLink = document.getElementById('admin-chip-link');
  if (chipName && chipLink) {
    var token = sessionStorage.getItem('admin_token') || '';
    var name  = sessionStorage.getItem('admin_username') || 'الأدمن';
    chipName.textContent = name;
    chipLink.href = token ? './dashboard.html' : './auth-admin.html';
  }
} catch (e) {}
