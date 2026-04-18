/* ============================================
   Circuit Quest — Configuration
   ============================================
   خطوات الإعداد:
   1. روح imgbb.com → سجّل → Account → API → انسخ الـ key
   2. روح script.google.com → مشروع جديد → الصق كود google-apps-script.gs
      → Deploy → New deployment → Web app → Anyone → انسخ الـ URL
   ============================================ */

var CQ = {
  imgbbKey:  'f23616775da067e60dec9b7dbafb3296',
  scriptUrl: 'https://script.google.com/macros/s/AKfycbwivbkdDH-gjXxiueh8qTdxBJCoBkOTnuOd8VeHrmjFk5ETsDW54QQm6CBnEiJpo_ofYA/exec',
  auth: {
    requireApproval: false
  }
  // secret محذوف من هنا — محطوط بـ admin.html بس لأنه للأدمن فقط
};
