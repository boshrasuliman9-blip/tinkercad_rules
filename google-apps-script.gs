// ============================================
//  Circuit Quest — Google Apps Script Backend
//  script.google.com → مشروع جديد → الصق هذا الكود
//  ثم: Deploy → New deployment → Web app
//       Execute as: Me
//       Who has access: Anyone
//  انسخ الـ URL وضعه في js/config.js
// ============================================

var EMAIL  = 'boshrasuliman9@gmail.com';
var SECRET = 'cq2024';   // كلمة سر للموافقة — غيّرها لو تبي

// ── نقطة الدخول الوحيدة (GET) ──────────────
function doGet(e) {
  var p      = e.parameter;
  var action = p.action || '';

  if (action === 'submit')  return submit(p);
  if (action === 'approve') return approve(p);
  if (action === 'reject')  return reject(p);
  if (action === 'list')    return list();

  return ContentService.createTextOutput('Circuit Quest OK');
}

// ── استقبال طلب جديد ────────────────────────
function submit(p) {
  var sheet = getSheet();
  var id    = Utilities.getUuid();

  sheet.appendRow([
    id,
    p.name     || '',
    p.school   || '',
    p.challenge|| '',
    p.imageUrl || '',
    'pending',
    new Date()
  ]);

  // بناء الإيميل
  var base       = ScriptApp.getService().getUrl();
  var approveUrl = base + '?action=approve&id=' + id + '&token=' + SECRET;
  var rejectUrl  = base + '?action=reject&id='  + id + '&token=' + SECRET;

  var html =
    '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:auto">' +
    '<div style="background:#f04e23;padding:20px;border-radius:12px 12px 0 0">' +
      '<h2 style="color:#fff;margin:0">🔔 طالب جديد — Circuit Quest</h2>' +
    '</div>' +
    '<div style="background:#fff;padding:20px;border:1px solid #eee;border-top:none">' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        '<tr style="background:#f8f8f8"><td style="padding:10px 14px;font-weight:700;width:120px">الاسم</td>'       + '<td style="padding:10px 14px">' + (p.name      || '—') + '</td></tr>' +
        '<tr>                           <td style="padding:10px 14px;font-weight:700">المدرسة</td>'                  + '<td style="padding:10px 14px">' + (p.school    || '—') + '</td></tr>' +
        '<tr style="background:#f8f8f8"><td style="padding:10px 14px;font-weight:700">التحدي</td>'                   + '<td style="padding:10px 14px">' + (p.challenge || '—') + '</td></tr>' +
      '</table>' +
      '<img src="' + (p.imageUrl || '') + '" style="width:100%;max-height:400px;object-fit:contain;border-radius:10px;border:1px solid #eee;margin-bottom:20px">' +
      '<div style="display:flex;gap:12px">' +
        '<a href="' + approveUrl + '" style="flex:1;background:#22c55e;color:#fff;padding:14px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;text-align:center;display:block">✅ موافقة ونشر</a>' +
        '<a href="' + rejectUrl  + '" style="flex:1;background:#ef4444;color:#fff;padding:14px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;text-align:center;display:block">❌ رفض</a>' +
      '</div>' +
    '</div>' +
    '</div>';

  GmailApp.sendEmail(EMAIL, '🔔 طالب جديد: ' + (p.name || '') + ' — ' + (p.challenge || ''), '', {htmlBody: html});

  return jsonOk({submitted: true, id: id});
}

// ── موافقة ──────────────────────────────────
function approve(p) {
  if (p.token !== SECRET) return htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  updateStatus(p.id, 'approved');
  return htmlPage('✅ تم النشر بنجاح!', '#f0fdf4', '#16a34a', 'تم نشر عمل الطالب في صفحة الإنجازات.');
}

// ── رفض ─────────────────────────────────────
function reject(p) {
  if (p.token !== SECRET) return htmlPage('غير مصرح ❌', '#fef2f2', '#dc2626');
  updateStatus(p.id, 'rejected');
  return htmlPage('❌ تم الرفض', '#fef2f2', '#dc2626');
}

// ── قائمة الإنجازات الموافق عليها ───────────
function list() {
  var sheet = getSheet();
  var rows  = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][5] === 'approved') {
      result.push({
        id:        rows[i][0],
        name:      rows[i][1],
        school:    rows[i][2],
        challenge: rows[i][3],
        imageUrl:  rows[i][4],
        date:      rows[i][6] ? rows[i][6].toString() : ''
      });
    }
  }

  return jsonOk(result);
}

// ── مساعدات ─────────────────────────────────
function getSheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId  = props.getProperty('SS_ID');
  var ss;

  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('Circuit Quest — Submissions');
    props.setProperty('SS_ID', ss.getId());
  }

  var sheet = ss.getSheetByName('Submissions');
  if (!sheet) {
    sheet = ss.insertSheet('Submissions');
    sheet.appendRow(['ID', 'الاسم', 'المدرسة', 'التحدي', 'رابط الصورة', 'الحالة', 'التاريخ']);
  }
  return sheet;
}

function updateStatus(id, status) {
  var sheet = getSheet();
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.getRange(i + 1, 6).setValue(status);
      return;
    }
  }
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlPage(title, bg, color, sub) {
  var s = sub ? '<p style="color:#555;font-size:16px">' + sub + '</p>' : '';
  return HtmlService.createHtmlOutput(
    '<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:80px;background:' + bg + '">' +
    '<div style="font-size:56px;margin-bottom:16px">' + title.split(' ')[0] + '</div>' +
    '<h1 style="color:' + color + ';margin:0 0 12px">' + title + '</h1>' + s +
    '</body></html>'
  );
}
