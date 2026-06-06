# سجل التغييرات | CHANGELOG (GT-SIRM Desktop)

كلّ تغيير ملحوظ في نسخة سطح المكتب يُوثَّق هنا. التواريخ بصيغة YYYY-MM-DD.

> راجع [`../CHANGELOG.md`](../CHANGELOG.md) للسجل المشترك بين النسختَين.

---

## [0.1.0] — 2026-06-06 (Skeleton)

### 🌱 إنشاء البنية الأساسيّة

- `package.json` مع إعدادات `electron-builder` كاملة:
  - أهداف Linux: AppImage + DEB + RPM
  - `appId: org.gnutux.gt-sirm`
  - `extraFiles` لـ ffmpeg + yt-dlp
- `src/main/main.js` — Skeleton لـ Electron main process
- `src/preload/preload.js` — جسر IPC أساسيّ
- `src/renderer/index.html` — صفحة ترحيب بسيطة
- `src/renderer/app.js` — يقرأ إصدار التطبيق
- `scripts/build-all.sh` — Skeleton يطبع رسالة المرحلة

### 🎯 ما يأتي في v0.2.0
- Fork كامل من `GT-SQRM-main/` v3.0.0
- محرّك التصدير V2 الحتميّ
- 16 خطّ عربيّ
- سكربت البناء الكامل مع cache fix و alien fallback
- بادئات `gt_sirm_` بدلاً من `gt_sqrm_`
