# تعليمات المشروع - Circuit Quest

---

## قواعد هيكل الأقسام في dashboard.html

- كل قسم يجب أن يكون `<div class="section" id="section-اسم-القسم">...</div>`
- لا تستخدم `<section>` أو أي tag آخر — فقط `<div class="section">`
- كل قسم يجب أن يُفتح ويُغلق بشكل صحيح (لا self-closing)
- كل محتوى القسم يجب أن يكون **داخل** الـ div وليس خارجه

## قاعدة إخفاء وإظهار الأقسام

- الـ CSS يتحكم في الإظهار عبر: `.section { display: none }` و `.section.active { display: block }`
- دالة `showSection(id)` في dashboard.js تضيف class `active` للقسم المطلوب وتحذفه من الباقي
- إذا كان محتوى قسم خارج الـ `div.section` الخاص به، سيظهر دائماً بغض النظر عن الضغطة

## تعليمات الشريط الجانبي

- كل عنصر في الشريط الجانبي يستدعي `showSection('اسم-القسم')`
- يجب أن يكون `id` كل قسم بصيغة `section-اسم-القسم` ليتطابق مع الدالة
- العنصر النشط في الشريط يأخذ class `active` تلقائياً عبر `id="nav-اسم-القسم"`

---

## التعديلات المنجزة

### admin/dashboard.html — إصلاح السايد نافبار

- [x] تغيير `<section class="section active" id="section-overview">` إلى `<div class="section active" id="section-overview">`
- [x] تغليف كل محتوى نظرة عامة داخل الـ div
- [x] إغلاق الـ div بشكل صحيح قبل بداية قسم المدارس
- [x] حذف الـ `</div>` الزائدَين اللي كانوا يكسرون هيكل HTML
