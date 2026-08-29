#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  v1.2.7 — حَقنُ اعتِمادِ yt-dlp في مَشروعِ Android المُوَلَّد
#  ⚠️ مُجَلَّد android/ في .gitignore ويُعيدُ `cap add` تَوليدَه، فَلا تُعَدِّل
#     app/build.gradle مُباشَرةً — هذا السكربتُ يَحقِنُ التَعديلَ بَعدَ كُلِّ sync،
#     وهُوَ **مُتَكَرِّرٌ آمِن** (يَفحَصُ قَبلَ أن يُضيف).
# ═══════════════════════════════════════════════════════════════
set -uo pipefail
G="android/app/build.gradle"
V="android/variables.gradle"
[ -f "$G" ] || { echo "⚠️ $G غَير مَوجود"; exit 0; }

# مَكتَبةُ yt-dlp تَشتَرِطُ minSdk 24 (المُوَلَّدُ الافتِراضيُّ 22)، وإلّا فَشِلَ دَمجُ
# الـManifest. أندرويد 7.0 فَما فَوق يُغَطّي السَوادَ الأَعظَمَ مِنَ الأَجهِزةِ العامِلة.
if [ -f "$V" ] && grep -qE "minSdkVersion *= *2[0-3]" "$V"; then
    sed -i -E "s/minSdkVersion *= *2[0-3]/minSdkVersion = 24/" "$V"
    echo "   ✔ رُفِعَ minSdkVersion إلى 24 (شَرطُ مَكتَبةِ yt-dlp)"
fi

YDL_DEP='io.github.junkfood02.youtubedl-android:library'

if grep -q "$YDL_DEP" "$G"; then
    echo "   ✔ اعتِمادُ yt-dlp مَوجودٌ سَلَفاً"
else
    # أَضِفهُ داخِلَ كُتلةِ dependencies (بَعدَ أَوَّلِ سَطرِ implementation)
    python3 - "$G" <<'PY'
import sys, re
p = sys.argv[1]
c = open(p, encoding="utf-8").read()
dep = '    implementation "io.github.junkfood02.youtubedl-android:library:0.18.1"\n'
m = re.search(r'^dependencies \{\n', c, re.M)
if m:
    c = c[:m.end()] + dep + c[m.end():]
    open(p, "w", encoding="utf-8").write(c)
    print("   ✔ أُضيفَ اعتِمادُ yt-dlp")
else:
    print("   ⚠️ لَم تُعثَر كُتلةُ dependencies")
PY
fi

# قَصرُ المِعماريّاتِ عَلى ARM: الحُزمةُ تَحمِلُ مَكتَباتٍ أَصليّةً لِأَربَعِ مِعماريّات
# (نَحوَ 15 م.ب لِكُلِّ واحِدة). x86/x86_64 لِلمُحاكياتِ فَقَط — إسقاطُهُما يُوَفِّرُ ~30 م.ب.
if grep -q "abiFilters" "$G"; then
    echo "   ✔ abiFilters مَضبوطٌ سَلَفاً"
else
    python3 - "$G" <<'PY'
import sys, re
p = sys.argv[1]
c = open(p, encoding="utf-8").read()
blk = '        ndk {\n            abiFilters "arm64-v8a", "armeabi-v7a"\n        }\n'
m = re.search(r'^    defaultConfig \{\n', c, re.M)
if m:
    c = c[:m.end()] + blk + c[m.end():]
    open(p, "w", encoding="utf-8").write(c)
    print("   ✔ حُصِرَتِ المِعماريّاتُ في ARM")
else:
    print("   ⚠️ لَم تُعثَر كُتلةُ defaultConfig")
PY
fi
