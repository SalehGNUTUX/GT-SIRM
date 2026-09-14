#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════
#  v1.2.7 — تَهيئةُ مَشروعِ Android المُوَلَّدِ لِـyt-dlp
#  ⚠️ مُجَلَّد android/ في .gitignore ويُعيدُ `cap add` تَوليدَه، فَلا تُعَدِّلهُ
#     مُباشَرةً — هذا السكربتُ يُطَبِّقُ التَعديلاتِ بَعدَ كُلِّ sync، وهُوَ
#     **مُتَكَرِّرٌ آمِن** (يَفحَصُ قَبلَ أن يُعَدِّل).
# ═══════════════════════════════════════════════════════════════
import re, sys, os
import json
import os

G = "android/app/build.gradle"
V = "android/variables.gradle"
DEP = 'io.github.junkfood02.youtubedl-android:library'

if not os.path.isfile(G):
    print("   ⚠️ %s غَير مَوجود" % G); sys.exit(0)

# 1) minSdk 24 — شَرطُ المَكتَبة (المُوَلَّدُ الافتِراضيُّ 22)
if os.path.isfile(V):
    v = open(V, encoding="utf-8").read()
    nv = re.sub(r"minSdkVersion\s*=\s*2[0-3]\b", "minSdkVersion = 24", v)
    if nv != v:
        open(V, "w", encoding="utf-8").write(nv)
        print("   ✔ رُفِعَ minSdkVersion إلى 24")
    else:
        print("   ✔ minSdkVersion مَضبوطٌ سَلَفاً")

c = open(G, encoding="utf-8").read()
orig = c

# 2) اعتِمادُ المَكتَبة
if DEP in c:
    print("   ✔ اعتِمادُ yt-dlp مَوجودٌ سَلَفاً")
else:
    m = re.search(r"^dependencies \{\n", c, re.M)
    if m:
        c = c[:m.end()] + '    implementation "%s:0.18.1"\n' % DEP + c[m.end():]
        print("   ✔ أُضيفَ اعتِمادُ yt-dlp")
    else:
        print("   ⚠️ لَم تُعثَر كُتلةُ dependencies")

# 3) قَصرُ المِعماريّاتِ عَلى ARM (x86 لِلمُحاكياتِ فَقَط — تَوفيرُ ~30 م.ب)
if "abiFilters" in c:
    print("   ✔ abiFilters مَضبوطٌ سَلَفاً")
else:
    m = re.search(r"^    defaultConfig \{\n", c, re.M)
    if m:
        blk = '        ndk {\n            abiFilters "arm64-v8a", "armeabi-v7a"\n        }\n'
        c = c[:m.end()] + blk + c[m.end():]
        print("   ✔ حُصِرَتِ المِعماريّاتُ في ARM")

# 4) استِخراجُ المَكتَباتِ الأَصليّةِ إلى القُرص — بِلا هذا تَفشَلُ تَهيئةُ Python
#    (المَكتَبةُ تَقرَأُ libpython.zip.so كَمَلَفٍّ حَقيقيٍّ في nativeLibraryDir).
if "useLegacyPackaging" in c:
    print("   ✔ useLegacyPackaging مَضبوطٌ سَلَفاً")
else:
    m = re.search(r"^    buildTypes \{\n", c, re.M)
    if m:
        blk = ("    packagingOptions {\n"
               "        jniLibs {\n"
               "            useLegacyPackaging = true\n"
               "        }\n"
               "    }\n")
        c = c[:m.start()] + blk + c[m.start():]
        print("   ✔ فُعِّلَ useLegacyPackaging")
    else:
        print("   ⚠️ لَم تُعثَر كُتلةُ buildTypes")


# ⚠️ 5) إصدارُ الحُزمة — عَطَبٌ صامِتٌ دامَ حَتّى v1.4.2
#    `versionName "1.0"` هُوَ افتِراضُ Capacitor ولَم يُحَدَّث قَطّ. ولَمّا صارَ
#    البَرنامَجُ يَقرَأُ إصدارَهُ مِنَ النِظامِ (PackageInfo.versionName) بَدَلَ
#    الصَفحة — وهُوَ الصَوابُ مَبدَئيّاً — صارَ يَقرَأُ "1.0" دائِماً، فَيَرى
#    تَحديثاً مُتاحاً بَعدَ كُلِّ إقلاعٍ مَهما كانَ المُثَبَّت. المَصدَرُ الواحِدُ
#    لِلحَقيقةِ هُوَ package.json، فَنَشتَقُّ مِنهُ الاسمَ والرَقمَ هُنا.
try:
    _pkg = json.load(open(os.path.join(os.path.dirname(os.path.dirname(G)),
                                       "..", "package.json"), encoding="utf-8"))
except Exception:
    _pkg = None
if _pkg is None:
    try:
        _pkg = json.load(open("package.json", encoding="utf-8"))
    except Exception:
        _pkg = {}
_ver = str(_pkg.get("version", "")).strip()
if re.match(r"^\d+\.\d+\.\d+$", _ver):
    _a, _b, _c = (int(x) for x in _ver.split("."))
    _code = _a * 10000 + _b * 100 + _c          # 1.4.2 ⇒ 10402 (يَتَزايَدُ دائِماً)
    _new = c
    _new = re.sub(r'versionCode\s+\d+', "versionCode %d" % _code, _new, count=1)
    _new = re.sub(r'versionName\s+"[^"]*"', 'versionName "%s"' % _ver, _new, count=1)
    if _new != c:
        c = _new
        print("   ✔ إصدارُ الحُزمة: %s (code %d)" % (_ver, _code))
    else:
        print("   ⚠️ لَم يُعثَر عَلى versionName/versionCode")
else:
    print("   ⚠️ إصدارٌ غَيرُ صالِحٍ في package.json: %r" % _ver)

if c != orig:
    open(G, "w", encoding="utf-8").write(c)
