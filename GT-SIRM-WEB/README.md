<div align="center">

# GT-SIRM-WEB
### نسخة الويب (PWA) — GnuTux Short Islamic Reels Maker

**Vanilla JS + WebCodecs — يعمل في كلّ المتصفّحات وحتى تحت `file://`**

[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](../LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blueviolet?logo=pwa)](#)
[![Status](https://img.shields.io/badge/Status-Skeleton-yellow)](../CHANGELOG.md)
[![Version](https://img.shields.io/badge/Version-0.1.0-brightgreen)](./CHANGELOG.md)

</div>

> 📖 راجع [`README.md` الرئيسيّ](../README.md) لإعلان النيّة والتبرّؤ ووصف المشروع الشامل.

---

## 📦 الحالة الحاليّة

**v0.1.0 — Skeleton (هيكل أساسيّ)**: ملفّات تقنيّة بسيطة جاهزة لتلقّي fork كامل من [GT-SQR v3.0](https://github.com/SalehGNUTUX/GT-SQR) في الإصدار v0.2.0.

| الملف | الحالة |
|---|---|
| `index.html` | 🌱 Skeleton — صفحة ترحيب بسيطة |
| `app.js` | 🌱 Skeleton — log فقط |
| `manifest.json` | ✅ معدّ بالكامل لـ PWA |
| `sw.js` | ✅ Service Worker بسيط (سيُستبدل بنسخة GT-SQR في v0.2.0) |

---

## 🚀 التشغيل

### مباشرةً من المتصفّح (تحت `file://`)
```bash
# انقر double-click على index.html
# أو من سطر الأوامر:
xdg-open index.html
```

> ✅ تعمل المزايا كلّها تحت `file://` ما عدا تثبيت PWA و Service Worker (قيود Chromium).

### مع خادم HTTP (للاستفادة الكاملة من PWA)
```bash
python3 -m http.server 8080
# ثمّ افتح: http://localhost:8080
```

### تجربة النسخة المنشورة على الإنترنت
```
https://salehgnutux.github.io/GT-SIRM/GT-SIRM-WEB/
```

---

## 🏗️ البنية المتوقَّعة بعد v0.2.0

```
GT-SIRM-WEB/
├── index.html              # كامل الواجهة (مُورَث من GT-SQR)
├── app.js                  # كل المنطق
├── export-engine-web.js    # محرّك WebCodecs الحتميّ
├── mp4-muxer.js            # IIFE classic — يعمل تحت file://
├── webm-muxer.js           # IIFE classic — يعمل تحت file://
├── fonts-data.js           # بيانات الخطوط مضمّنة (16 خطّاً)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── fonts/                  # ملفّات الخطوط
└── GT-SIRM-icons/          # أيقونات PWA
```

---

## 🆚 المقارنة مع GT-SQR-main

| المظهر | GT-SQR v3.0 | GT-SIRM-WEB v1.0 |
|---|---|---|
| المحتوى | القرآن فقط | القرآن (toggle) + حديث + أذكار + أدعية + أسماء + حِكَم + نصّ حرّ |
| محرّك التصدير | WebCodecs الحتميّ | نفسه (مُورَث) |
| الخطوط | 16 خطّ عربيّ | نفسها (مُورَثة) |
| تحت `file://` | يعمل | يعمل |
| الـ Chromakey | ❌ | ✅ جديد (WebGL shader) |
| محرّر النصّ الحرّ | ❌ | ✅ جديد |
| تسجيل الميكروفون | ❌ | ✅ جديد |
| TTS عربيّ | ❌ | ✅ جديد |
| بادئة localStorage | `gt_sqr_` | `gt_sirm_` |

---

## 🛠️ نصائح تطوير

- **يجب أن يبقى الويب يعمل تحت `file://`** — راجع `../CLAUDE.md` للقيود
- لا تستخدم ES modules — كل المكتبات `classic scripts`
- بيانات الخطوط في `fonts-data.js` (نسخة مضمَّنة من `fonts.json`)
- ارفع `CACHE_VER` في `sw.js` عند كلّ تحديث للملفات

---

## 📜 الرخصة

GNU General Public License v3.0 — راجع [`../LICENSE`](../LICENSE) للنصّ الكامل ومُلحَق التبرّؤ.
