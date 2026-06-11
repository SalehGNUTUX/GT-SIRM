<div align="center">

<img src="./GT-SIRM-ICON.png" alt="GT-SIRM" width="180" />

# GT-SIRM
### GnuTux Short Islamic Reels Maker

**صانع ريلز إسلاميّة بجودة احترافيّة — قرآن، حديث، أذكار، أدعية، أسماء الله الحسنى، حِكَم**

[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
[![Platform: Linux + Web + Android](https://img.shields.io/badge/Platform-Linux%20%7C%20Web%20%7C%20Android-orange?logo=linux)](#)
[![Status](https://img.shields.io/badge/Status-Beta-blueviolet)](#)
[![Version](https://img.shields.io/badge/Version-0.13.3-brightgreen)](./CHANGELOG.md)
[![Releases](https://img.shields.io/github/v/release/SalehGNUTUX/GT-SIRM?include_prereleases&label=Latest%20Release)](https://github.com/SalehGNUTUX/GT-SIRM/releases)

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

### الميزات المُكتمَلة (v0.13.3) ✅

#### 📚 وَحدات المحتوى الإسلاميّ (6 وَحدات، 6557+ عُنصراً)
- 📖 **القرآن الكَريم** — 114 سورة، 6236 آية + قُرّاء + 60 ترجمة (api.alquran.cloud + everyayah)
- 📜 **الحديث الشَريف** — 90 حَديثاً (الأربعون النووية + رياض الصالحين) مع شارة التصحيح
- 🕊️ **الأذكار** — 267 ذكراً في 132 فئة (من [GT-HISNMUSLIM](https://github.com/SalehGNUTUX/GT_HISNMUSLIM) بإذن المؤلِّف)
- ✨ **أسماء الله الحسنى** — 100 اسماً مع المعاني والشواهد القرآنيّة (حديث الترمذي + ابن القيّم + ابن عثيمين)
- 🤲 **الأدعية المأثورة** — 32 دعاءً من القرآن والسنّة الصحيحة (5 فئات) مع المصدر
- 🌟 **الحِكَم والمواعظ** — 32 قولاً للسلف بإسناد لقائله (4 فئات: صحابة + تابعون + أئمّة + ابن القيّم/ابن تيمية)

#### 🎙️ مَصادر الصَوت
- **التَلاوة من القرآن** — قُرّاء حَقيقيّون (everyayah.com)
- **صَوت مُخصّص** — استيراد ملفّ + تَنزيل عَبر yt-dlp (سَطح المكتب)
- **فيديو تَلاوة جاهز** (recvid) — استبدال كامل بفيديو من خارج البَرنامج
- **🎙️ تَسجيل الميكروفون** (v0.13.0) — مع canvas ذَبذبات حيّة + استماع مُباشَر + مؤثّرات صَوتيّة
- **🤖 توليد القِراءة من النصّ (TTS)** (v0.13.1، تَجريبيّ) — Google Translate TTS + eSpeak-NG + API مُخصّص

#### 🎨 المُحرّك البَصريّ والصَوتيّ
- **محرّك تَصدير حَتميّ** — ffmpeg (سَطح المكتب، إطار بإطار) + WebCodecs (الويب)
- **10 أنماط ظهور الآيات** — تَلاشي، انزلاق، تَكبير، سُقوط، صُعود، ضَبابيّ، توهّج، كلمة-بكلمة، مُختلط…
- **9 أنماط ألوان** — دافئ، بارد، ليليّ، سينما، رمضان، صَحراء، بنّيّ، أبيض-أسود…
- **9 موجات صَوت** — Bars/Line/Area/Dots/Mirror/Radial/Blocks/Pulse/Wave3D
- **مؤثّرات بَصرية** — Vignette، Grain، نُجوم، أَشعّة، بوكيه، Pixelate، Mosaic، Ripple، Wave، Swirl، Kaleidoscope، Glitch، Old Film
- **مؤثّرات صَوتية** (v0.11) — Reverb (5 presets) + Echo + 3-band EQ على bgAudio و recvid
- **🎭 Chromakey** — إزالة الخَلفيّات بـYCbCr + spill suppression
- **16 خَطّاً عَربيّاً** مَحلّيّاً — Amiri Quran، Scheherazade، Lateef، Harmattan، Reem Kufi، Aref Ruqaa، Cairo، Tajawal…

#### ✍️ التَّحكُّم بالنَصّ
- **محرّر النَصّ الحرّ** — استيراد أيّ نَصّ خارجيّ
- **توقيت تَفصيليّ لكلّ شَريحة** + 🔒 **تَجميد** فَرديّ (v0.13.0)
- **تَجزئة ذَكيّة** للأذكار (آيات ﴿﴾، أقواس، ترقيم عَربيّ)
- **تَوقيت آليّ** متزامِن مع مدّة الصَوت (مع إصلاح WebM duration bug)

#### 📁 مجلّد العَمل (سَطح المكتب، v0.12)
- مَسار افتراضيّ: `~/Documents/مجلد عمل ريلز إسلامية/`
- 8 مَجلّدات فَرعيّة (projects/bg-videos/bg-audio/recitations/custom-audio/logos/exports/recordings)
- توجيه ذَكيّ تلقائيّ لتَنزيلات yt-dlp
- اعتراض ملفّات الرَفع → kdialog/zenity مع فَتح في المجلّد الصَحيح

#### 💾 إدارة المَشاريع
- صيغة `.gtsirm` (JSON مع base64 dataURL ≤50MB)
- حِفظ تلقائيّ + استرجاع المَشاريع المَفقودة
- مُعالج "🔄 استيراد إعدادات GT-SQRM" لنَقل القَوالب والقُرّاء والخُطوط
- ارتباط بصيغة `.gtsirm` على سَطح المكتب + Android

#### 🖼️ الواجهة (v0.12.12+)
- جميع الأقسام قابلة للطيّ (57 على سَطح المكتب، 46 على الويب)
- البَدء افتراضيّاً على تَبويب الإعدادات (v0.13.1)
- نَجمة ذَهبيّة "⭐ رَئيسيّ" لقسم وَحدات المحتوى
- يَعمل بدون إنترنت 100% (v0.13.2) — الخُطوط مَحلّيّة + لا CDN

---

## 📦 النُّسَخ الثَلاث

| النسخة | المجلد | الحُزَم | الوصف |
|---|---|---|---|
| 🐧 **سطح المكتب** | [`GT-SIRM-DESKTOP/`](./GT-SIRM-DESKTOP/) | AppImage · DEB · RPM | Electron + ffmpeg + yt-dlp |
| 🌐 **الويب (PWA)** | [`GT-SIRM-WEB/`](./GT-SIRM-WEB/) | تَشغيل في المُتصفّح | Vanilla JS + WebCodecs |
| 📱 **Android** | [`GT-SIRM-WEB/android/`](./GT-SIRM-WEB/) | APK (debug + release) | Capacitor 6 + WebView |

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

### نُسخة Android — APK
حَمِّل `GT-SIRM-x.y.z-debug.apk` مِن [الإصدارات](https://github.com/SalehGNUTUX/GT-SIRM/releases) ثُمَّ ثَبِّته يَدويّاً.
يَطلب الأذونات: ميكروفون + تَخزين + وَسائط + اهتزاز عند الحاجة فقط.

تفاصيل التثبيت الكاملة في [`GT-SIRM-DESKTOP/README.md`](./GT-SIRM-DESKTOP/README.md) و[`GT-SIRM-WEB/README.md`](./GT-SIRM-WEB/README.md).

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
