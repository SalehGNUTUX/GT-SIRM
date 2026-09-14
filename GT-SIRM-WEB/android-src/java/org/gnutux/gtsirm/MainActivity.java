package org.gnutux.gtsirm;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.BridgeActivity;

/**
 * ⚠️ مُجَلَّد android/ في .gitignore ويُعادُ تَوليدُه — هذا المَصدَرُ المُعتَمَد،
 *    ويَنسَخُهُ scripts/build-apk.sh بَعدَ `cap sync`.
 */
public class MainActivity extends BridgeActivity {

    /**
     * ⚠️ v1.4.3 — «المُشارَكةُ إلى البَرنامَج» لَم تَكُن تَعمَل.
     *
     * حينَ يُرسِلُ المُستَخدِمُ مَلَفَّ مَشروعٍ (‏`.gtsirm`) مِنَ الحاسوبِ إلى
     * الهاتِفِ ثُمَّ يُشارِكُهُ مَعَ GT-SIRM، يَصِلُ الطَلَبُ بِـ`ACTION_SEND`
     * والمَلَفُّ في `EXTRA_STREAM`. أمّا إضافةُ App في Capacitor فَلا تَقرَأُ
     * إلّا `intent.getData()` الخاصَّ بِـ`ACTION_VIEW` — فَلا يَصِلُ الحَدَثُ
     * `appUrlOpen` أَصلاً ولا يُفتَحُ المَلَفّ.
     *
     * فَنُحَوِّلُ الطَلَبَ هُنا إلى الشَكلِ الذي تَفهَمُهُ الإضافةُ قَبلَ إنشاءِ
     * الجِسر: نَنقُلُ `EXTRA_STREAM` إلى `data` ونَجعَلُ الفِعلَ `VIEW`.
     * بِهذا يَعمَلُ مَسارُ الفَتحِ القائِمُ كَما هُوَ بِلا تَكرارِ مَنطِق.
     *
     * (‏`.gtsirm` لاحِقةٌ مَجهولةٌ لِلنِظام، فَأَكثَرُ التَطبيقاتِ تُرسِلُها بِنَوعٍ
     * عامّ — ولِذا يَقبَلُ المانيفِست كُلَّ الأَنواعِ أيضاً.)
     */
    private void adaptShareIntent(Intent intent) {
        if (intent == null) return;
        final String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action)) return;
        try {
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri == null) return;
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(uri);
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // v1.2.1 — إضافاتٌ مَحَلّيّةٌ يَجِبُ تَسجيلُها قَبلَ إنشاءِ الجِسر
        registerPlugin(GtsirmNative.class);
        registerPlugin(GtsirmYtdlp.class);   // v1.2.7 — yt-dlp لِأندرويد
        adaptShareIntent(getIntent());       // v1.4.3 — قَبلَ إنشاءِ الجِسر
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        adaptShareIntent(intent);            // v1.4.3 — والبَرنامَجُ يَعمَلُ سَلَفاً
        super.onNewIntent(intent);
    }
}
