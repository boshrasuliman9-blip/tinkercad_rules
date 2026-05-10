/* ============================================
   Circuit Quest — Configuration
   ============================================
   خطوات الإعداد:
   1. روح imgbb.com → سجّل → Account → API → انسخ الـ key
   2. روح script.google.com → مشروع جديد → الصق كود google-apps-script.gs
      → Deploy → New deployment → Web app → Anyone → انسخ الـ URL
   ============================================ */

var CQ = {
  imgbbKey: 'f23616775da067e60dec9b7dbafb3296',
  scriptUrl: 'https://script.google.com/macros/s/AKfycbw0gjcnNnskffcYfIBKPPjNMGeloqKdFngH1nGzzBKEBJNLa1ODlpD4i2blrQgHSt6OZw/exec',
  auth: {
    requireApproval: true
  },
  // secret محذوف من هنا — محطوط بـ admin.html بس لأنه للأدمن فقط
};
