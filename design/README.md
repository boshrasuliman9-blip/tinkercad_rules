# design/

هذا الفولدر يجمع أي **كود تصميم مشترك** بين الصفحات (CSS/JS) حتى ما نكرر نفس الـ layout ونفس الستايل بكل Role.

---

## Landing pages (index/teacher/admin/creator)

الملف الأساسي:
- `design/landing.css`
- `design/landing.js`

كل صفحة Role بتعمل override بسيط فقط عبر CSS variables داخل ملفها:
- `css/site/index.css` (الصفحة الرئيسية) → بس يعمل import
- `teacher/css/index.css` → يحدد الأخضر
- `admin/css/index.css` → يحدد الأزرق + شكل chip
- `creator/css/index.css` → يحدد البنفسجي

---

## Auth pages (teacher/admin/creator)

الملف الأساسي:
- `design/auth.css`

كل صفحة Role بتعمل `@import` + override للألوان فقط:
- `teacher/css/auth-teacher.css` → أخضر
- `admin/css/auth-admin.css` → أزرق + `.admin-chip`
- `creator/css/auth-creator.css` → بنفسجي + `.creator-chip`

### كيف أغير لون auth جديد؟

في ملف الـ Role CSS عدّل هذه المتغيرات داخل `:root`:
- `--auth-accent` و `--auth-accent-rgb`
- `--auth-logo-grad-start/mid/end`
- `--auth-submit-bg` و `--auth-submit-bg-hover`
- `--auth-focus-color` و `--auth-focus-rgb`
- `--auth-badge-*`

---

## Dashboard pages (teacher/admin)

الملف الأساسي:
- `design/dashboard.css`

كل صفحة Role بتعمل `@import` + override للألوان فقط:
- `teacher/css/dashboard.css` → أخضر + `.teacher-badge`
- `admin/css/dashboard.css` → أزرق + `.admin-badge`

### كيف أغير لون dashboard جديد؟

في ملف الـ Role CSS عدّل هذه المتغيرات داخل `:root`:
- `--dash-accent` و `--dash-accent-rgb`
- `--dash-logo-grad-start/end`
- `--dash-hero-grad` و `--dash-hero-grad-refresh`
- `--dash-nav-active-grad` و `--dash-nav-active-shadow`
- `--dash-f-focus-color`، `--dash-spinner-color`، `--dash-guide-dot`

---

## JS المشترك

كل صفحة Landing بتشغّل نفس الـ JS (عن طريق config بسيط):
- `design/landing.js`

---

## هيكل النمط العام

```
design/[base].css       ← الـ layout والـ classes المشتركة (لا تعدّل)
[role]/css/[page].css   ← @import + :root overrides فقط
```

أي تغيير في الـ layout → في ملف design/ فقط.
أي تغيير في لون Role → في ملف الـ Role فقط.

---

## ملاحظة: الأرشيف

فولدر `archive/new-auth-system/` يحتوي على نظام auth قديم (غير مستخدم).
