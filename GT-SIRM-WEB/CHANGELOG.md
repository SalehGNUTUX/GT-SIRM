# سجل التغييرات | CHANGELOG (GT-SIRM Web)

كلّ تغيير ملحوظ في نسخة الويب يُوثَّق هنا. التواريخ بصيغة YYYY-MM-DD.

> راجع [`../CHANGELOG.md`](../CHANGELOG.md) للسجل المشترك بين النسختَين.

---

## [0.1.0] — 2026-06-06 (Skeleton)

### 🌱 إنشاء البنية الأساسيّة

- `index.html` — صفحة ترحيب Skeleton
- `app.js` — سكربت أساسيّ
- `manifest.json` — PWA manifest كامل (name, icons, start_url, scope, shortcuts)
- `sw.js` — Service Worker v1 بسيط (cache-first + offline fallback)
- بنية `GT-SIRM-icons/` و `fonts/` و `screenshot/`

### 🎯 ما يأتي في v0.2.0
- Fork كامل من `GT-SQR-main/` v3.0.0
- محرّك التصدير WebCodecs الحتميّ
- 16 خطّ عربيّ مع `fonts-data.js` المضمَّن (يعمل تحت `file://`)
- `mp4-muxer.js` و `webm-muxer.js` (classic IIFE)
- بادئات `gt_sirm_` بدلاً من `gt_sqr_`
- Service Worker v2 مع كل الأصول
