<div align="center">

# GT-SIRM
### GnuTux Short Islamic Reels Maker

**صانع ريلز إسلاميّة بجودة احترافيّة — قرآن، حديث، أذكار، أدعية، أسماء الله الحسنى، حِكَم**

[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
[![Platform: Linux + Web](https://img.shields.io/badge/Platform-Linux%20%2B%20Web-orange?logo=linux)](#)
[![Status](https://img.shields.io/badge/Status-Pre--alpha-yellow)](#)
[![Version](https://img.shields.io/badge/Version-0.1.0-brightgreen)](./CHANGELOG.md)

</div>

---

## 🌙 إعلان النيّة والتبرّؤ

> بُنِيَ هذا البرنامجُ ابتغاءَ وجهِ الله الكريم، خِدمةً لكتابه العزيز وسُنّة نبيِّه الأمين ﷺ، ونشرَ الخيرِ بين عباده.
>
> ونُعلِنُ تبرُّؤَنا أمام الله تعالى من كلِّ من اتّخذه ذريعةً إلى ما يُسخِط الله سبحانه، أو سبيلاً إلى ترويج باطلٍ أو نشرِ معصيةٍ أو تشويهٍ لدين الله. ومَن فَعَلَ ذلك فنحن خصومُه بين يَدَيِ الله يومَ يقومُ الناسُ لربِّ العالمين.
>
> **اللهمّ إنّا قد بلّغنا، اللهمّ فاشهد.**

---

## 📖 عن المشروع

**GT-SIRM** صانع ريلز إسلامي شامل، يجمع كلَّ ما يحتاجه الداعية والمعلِّم وصانع المحتوى الدينيّ في تطبيق واحد بنسختَين متطابقتَين الميزات: نسخة سطح المكتب لـ GNU/Linux، ونسخة الويب (PWA) تعمل في كلِّ المتصفّحات.

يَرِثُ GT-SIRM كلَّ مزايا [GT-SQRM](https://github.com/SalehGNUTUX/GT-SQRM) (صانع الريلز القرآنيّة) — مع توگل لتفعيل/إلغاء وحدة القرآن — ويُضيف إليها وحدات للحديث والأذكار والأدعية وأسماء الله الحسنى والحِكَم، إلى جانب محرّر نصٍّ حرٍّ، وأداة Chromakey لإزالة الخلفيّات، ومرونةً كاملةً في استيراد الصوت والصورة والفيديو.

### الميزات المخطَّطة (v1.0)

- 📖 **وحدة القرآن** — موروثة من GT-SQRM v3.0 (قابلة للإلغاء)
- 📜 **وحدة الحديث الشريف** — الكتب الستة مع شارة التصحيح
- 🕊️ **وحدة الأذكار** — 132 فئة و 267 ذكراً من حصن المسلم (مأخوذة من مشروع [GT-HISNMUSLIM](https://github.com/SalehGNUTUX/GT_HISNMUSLIM) بإذن المؤلِّف نفسه)
- ✨ **أسماء الله الحسنى** — 99+1 اسماً مع المعاني والشواهد القرآنيّة (من حديث الترمذي وشروح ابن القيّم وابن عثيمين)
- 🤲 **الأدعية المأثورة** — 32 دعاءً من القرآن والسنّة الصحيحة (الصحيحان والسنن) مع المصدر والمناسبة
- 🌟 **الحِكَم والمواعظ** — 32 قولاً للسلف بإسناد لقائله ومرجعه (الصحابة، التابعون، الأئمّة الأربعة، ابن القيّم وابن تيمية)
- ✍️ **محرّر النصّ الحرّ** — لاستيراد أيّ نصٍّ خارجيّ
- 🎬 **Chromakey** — إزالة الخلفيّات بـ WebGL shader و ffmpeg
- 🎤 **3 مصادر صوت** — ميكروفون + TTS عربيّ + صامت
- 🎨 **كلّ مزايا GT-SQRM v3** — 10 أنماط ظهور · 9 أنماط ألوان · 9 موجات صوت · 16 خطّاً · خلفيّات متعددة

---

## 📦 النسختان

| النسخة | المجلد | الوصف |
|---|---|---|
| 🐧 **سطح المكتب** | [`GT-SIRM-DESKTOP/`](./GT-SIRM-DESKTOP/) | Electron + ffmpeg لـ AppImage / DEB / RPM |
| 🌐 **الويب (PWA)** | [`GT-SIRM-WEB/`](./GT-SIRM-WEB/) | Vanilla JS + WebCodecs لكلّ المتصفّحات |

---

## 🚀 البدء السريع

### النسخة الويب — مباشرةً في المتصفّح
```
https://salehgnutux.github.io/GT-SIRM/GT-SIRM-WEB/
```

### النسخة المكتبيّة — تنزيل لـ Linux
```bash
# AppImage (يعمل على كلّ التوزيعات)
chmod +x GT-SIRM-x.y.z.AppImage && ./GT-SIRM-x.y.z.AppImage

# DEB (Debian/Ubuntu/Mint)
sudo dpkg -i gt-sirm_x.y.z_amd64.deb

# RPM (Fedora/RHEL/openSUSE)
sudo dnf install ./gt-sirm-x.y.z.x86_64.rpm
```

تفاصيل التثبيت الكاملة في [`GT-SIRM-DESKTOP/README.md`](./GT-SIRM-DESKTOP/README.md).

---

## 🛠️ التطوير

كلّ نسخة لها أدواتها الخاصّة:

- **سطح المكتب**: راجع [`GT-SIRM-DESKTOP/README.md`](./GT-SIRM-DESKTOP/README.md) — Node.js 18+ و `electron-builder` و `ffmpeg`/`yt-dlp` و `rpmbuild`/`alien`.
- **الويب**: راجع [`GT-SIRM-WEB/README.md`](./GT-SIRM-WEB/README.md) — أيّ خادم HTTP بسيط، أو يعمل تحت `file://` أيضاً.

قواعد البنية والمزامنة بين النسختَين موثَّقة في [`CLAUDE.md`](./CLAUDE.md).
خارطة الطريق في [`ROADMAP.md`](./ROADMAP.md).

---

## 🤝 المساهمة

كلّ مساهمة مرحَّب بها مع التزامها بمبادئ المشروع:
- التزام إعلان النيّة والتبرّؤ
- محتوى موافق للكتاب والسنّة
- مصادر موثَّقة (للأحاديث: درجة التصحيح؛ للأقوال: قائلها)
- اختبار التغيير في النسختَين قبل تقديم PR

---

## 📄 الرخصة

GNU General Public License v3.0 — راجع [`LICENSE`](./LICENSE) للنصّ الكامل ومُلحَق التبرّؤ.

---

<div align="center">

**بُنِيَ بـ ❤️ لخدمة الإسلام والمسلمين**

[المستودع](https://github.com/SalehGNUTUX/GT-SIRM) · [الإصدارات](https://github.com/SalehGNUTUX/GT-SIRM/releases) · [المشاكل](https://github.com/SalehGNUTUX/GT-SIRM/issues) · [المطوّر](https://github.com/SalehGNUTUX)

</div>
