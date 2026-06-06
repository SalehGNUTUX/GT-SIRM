<div align="center">

# GT-SIRM-DESKTOP
### نسخة سطح المكتب — GnuTux Short Islamic Reels Maker

**Electron + ffmpeg لنظام GNU/Linux**

[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](../LICENSE)
[![Platform: Linux](https://img.shields.io/badge/Platform-GNU%2FLinux-orange?logo=linux)](#)
[![Status](https://img.shields.io/badge/Status-Skeleton-yellow)](../CHANGELOG.md)
[![Version](https://img.shields.io/badge/Version-0.1.0-brightgreen)](./CHANGELOG.md)

</div>

> 📖 راجع [`README.md` الرئيسيّ](../README.md) لإعلان النيّة والتبرّؤ ووصف المشروع الشامل.

---

## 📦 الحالة الحاليّة

**v0.1.0 — Skeleton (هيكل أساسيّ)**: ملفّات تقنيّة بسيطة جاهزة لتلقّي fork كامل من [GT-SQRM v3.0](https://github.com/SalehGNUTUX/GT-SQRM) في الإصدار v0.2.0.

| الملف | الحالة |
|---|---|
| `package.json` | ✅ معدّ بالكامل (electron-builder + AppImage + DEB + RPM) |
| `src/main/main.js` | 🌱 Skeleton — يفتح نافذة بسيطة |
| `src/preload/preload.js` | 🌱 Skeleton — جسر IPC أساسيّ |
| `src/renderer/index.html` | 🌱 Skeleton — صفحة ترحيب |
| `src/renderer/app.js` | 🌱 Skeleton — يقرأ الإصدار فقط |
| `scripts/build-all.sh` | 🌱 Skeleton — يطبع رسالة المرحلة |

---

## 🚀 التطوير

### المتطلبات
- Node.js 18+
- npm
- ffmpeg (سيُحمَّل تلقائياً عند البناء)
- yt-dlp (سيُحمَّل تلقائياً عند البناء)
- `rpmbuild` و `alien` و `fakeroot` لبناء RPM

### التشغيل في وضع التطوير
```bash
npm install
npm run dev          # مع DevTools
# أو:
npm start            # تشغيل عاديّ
```

### البناء
```bash
npm run build        # AppImage فقط
npm run build:deb    # DEB فقط
npm run build:rpm    # RPM (مع alien fallback)
npm run build:all    # الثلاثة معاً
npm run build:clean  # تنظيف dist/ والكاش التالف
```

> **ملاحظة v0.1.0**: سكربتات البناء حالياً Skeleton فقط. النسخة الكاملة تأتي في v0.2.0.

---

## 🏗️ البنية المتوقَّعة بعد v0.2.0

```
GT-SIRM-DESKTOP/
├── src/
│   ├── main/
│   │   └── main.js                 # Electron main + IPC + ffmpeg
│   ├── preload/
│   │   └── preload.js              # API bridge
│   └── renderer/
│       ├── index.html              # كامل الواجهة (مُورَث من GT-SQRM)
│       ├── app.js                  # كل المنطق
│       ├── export-engine.js        # محرّك V2 الحتمي
│       ├── ytdlp-panel.js          # لوحة yt-dlp
│       └── fonts/                  # 16 خط عربيّ
├── resources/bin/                  # ffmpeg + yt-dlp (تُحمَّل تلقائياً)
├── scripts/
│   └── build-all.sh                # build wrapper مع cache fix + alien fallback
├── GT-SIRM-icons/                  # أيقونات التطبيق (placeholder)
└── package.json
```

---

## 🆚 المقارنة مع GT-SQRM-main

| المظهر | GT-SQRM v3.0 | GT-SIRM-DESKTOP v1.0 |
|---|---|---|
| المحتوى | القرآن فقط | القرآن (toggle) + حديث + أذكار + أدعية + أسماء + حِكَم + نصّ حرّ |
| محرّك التصدير | ffmpeg V2 الحتميّ | نفسه (مُورَث) |
| الخطوط | 16 خطّ عربيّ | نفسها (مُورَثة) |
| الـ Chromakey | ❌ | ✅ جديد |
| محرّر النصّ الحرّ | ❌ | ✅ جديد |
| تسجيل الميكروفون | ❌ | ✅ جديد |
| TTS عربيّ | ❌ | ✅ جديد |
| الاسم في الواجهة | GT-SQRM | GT-SIRM |
| بادئة localStorage | `gt_sqrm_` | `gt_sirm_` |

---

## 📜 الرخصة

GNU General Public License v3.0 — راجع [`../LICENSE`](../LICENSE) للنصّ الكامل ومُلحَق التبرّؤ.
