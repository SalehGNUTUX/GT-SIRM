#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GT-SIRM Web → APK Build Script
#  يحزّم نسخة الويب إلى تطبيق Android عبر Capacitor
#
#  المتطلبات:
#    - Node.js 18+
#    - Java JDK 17+
#    - Android SDK (مع cmdline-tools, build-tools 33+)
#    - متغير البيئة ANDROID_HOME أو ANDROID_SDK_ROOT
#
#  الاستخدام:
#    ./scripts/build-apk.sh              # APK debug
#    ./scripts/build-apk.sh release      # APK release (موقَّع)
#    ./scripts/build-apk.sh bundle       # AAB لـ Google Play
#    ./scripts/build-apk.sh clean        # تنظيف
# ═══════════════════════════════════════════════════════════════
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "══════════════════════════════════════════════════════════"
echo "   GT-SIRM Web → Android APK"
echo "══════════════════════════════════════════════════════════"

# ── التحقق من المتطلبات ────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js مطلوب"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ Java JDK 17+ مطلوب"; exit 1; }

if [ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]; then
    echo "❌ متغير ANDROID_HOME أو ANDROID_SDK_ROOT غير مضبوط"
    echo ""
    echo "تثبيت Android SDK بسرعة:"
    echo "  1. حمّل cmdline-tools من https://developer.android.com/studio"
    echo "  2. فكّ الضغط إلى ~/Android/cmdline-tools/latest/"
    echo "  3. أضف لـ ~/.bashrc:"
    echo "     export ANDROID_HOME=\$HOME/Android"
    echo "     export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools"
    echo "  4. sdkmanager \"platforms;android-34\" \"build-tools;34.0.0\" \"platform-tools\""
    exit 1
fi

echo "✅ Node:     $(node -v)"
echo "✅ Java:     $(java -version 2>&1 | head -1)"
echo "✅ ANDROID_HOME: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
echo ""

# ── الإجراء ────────────────────────────────────────────────────
TARGET="${1:-debug}"

if [ "$TARGET" = "clean" ]; then
    echo "🧹 تنظيف..."
    rm -rf android/ node_modules/ dist-apk/
    echo "✅ تم"
    exit 0
fi

# ── تثبيت Capacitor ────────────────────────────────────────────
if [ ! -d node_modules ]; then
    echo "📦 تثبيت Capacitor و التبعيات..."
    npm install
fi

# ── تحضير مجلّد www/ (v0.8.12) ──────────────────────────────────
# Capacitor الحديث يرفض webDir="." — يجب أن يكون مجلّد فرعيّ
echo "📂 تحضير www/..."
rm -rf www
mkdir -p www
for item in index.html app.js export-engine-web.js mp4-muxer.js webm-muxer.js fonts-data.js hadith-data.js azkar-data.js asma-data.js duas-data.js hikam-data.js manifest.json sw.js fonts GT-SIRM-icons; do
    [ -e "$item" ] && cp -r "$item" www/
done
echo "   ✅ نُسخت أصول الويب إلى www/ ($(du -sh www/ | cut -f1))"

# ── إنشاء مجلد android/ إن لم يوجد ──────────────────────────────
if [ ! -d android ]; then
    echo "📱 إنشاء مشروع Android لأوّل مرّة..."
    npx cap add android
fi

# ── مزامنة ─────────────────────────────────────────────────────
echo "🔄 مزامنة ملفّات الويب مع Android..."
npx cap sync android

# ── البناء ─────────────────────────────────────────────────────
mkdir -p dist-apk

case "$TARGET" in
    debug)
        echo "🛠️  بناء APK Debug..."
        (cd android && ./gradlew assembleDebug)
        APK=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -1)
        if [ -n "$APK" ]; then
            cp "$APK" "dist-apk/GT-SIRM-debug.apk"
            echo "✅ Debug APK: $PROJECT_DIR/dist-apk/GT-SIRM-debug.apk"
            ls -lh "dist-apk/GT-SIRM-debug.apk"
        fi
        ;;
    release)
        echo "📦 بناء APK Release..."
        if [ ! -f keystore/gt-sirm.keystore ]; then
            echo "❌ keystore غير موجود. أنشئه أوّلاً:"
            echo "   mkdir -p keystore && keytool -genkey -v -keystore keystore/gt-sirm.keystore \\"
            echo "     -alias gtsirm -keyalg RSA -keysize 2048 -validity 10000"
            exit 1
        fi
        (cd android && ./gradlew assembleRelease)
        APK=$(find android/app/build/outputs/apk/release -name "*.apk" | head -1)
        if [ -n "$APK" ]; then
            cp "$APK" "dist-apk/GT-SIRM-release.apk"
            echo "✅ Release APK: $PROJECT_DIR/dist-apk/GT-SIRM-release.apk"
        fi
        ;;
    bundle)
        echo "📦 بناء AAB (Google Play)..."
        (cd android && ./gradlew bundleRelease)
        AAB=$(find android/app/build/outputs/bundle/release -name "*.aab" | head -1)
        if [ -n "$AAB" ]; then
            cp "$AAB" "dist-apk/GT-SIRM-release.aab"
            echo "✅ AAB: $PROJECT_DIR/dist-apk/GT-SIRM-release.aab"
        fi
        ;;
    *)
        echo "الاستخدام: $0 [debug|release|bundle|clean]"
        exit 1
        ;;
esac

echo ""
echo "💡 تثبيت على جهاز عبر USB:"
echo "   adb install dist-apk/GT-SIRM-debug.apk"
