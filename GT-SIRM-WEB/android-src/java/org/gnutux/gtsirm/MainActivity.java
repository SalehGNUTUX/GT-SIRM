package org.gnutux.gtsirm;

import com.getcapacitor.BridgeActivity;

/**
 * ⚠️ مُجَلَّد android/ في .gitignore ويُعادُ تَوليدُه — هذا المَصدَرُ المُعتَمَد،
 *    ويَنسَخُهُ scripts/build-apk.sh بَعدَ `cap sync`.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // v1.2.1 — إضافاتٌ مَحَلّيّةٌ يَجِبُ تَسجيلُها قَبلَ إنشاءِ الجِسر
        registerPlugin(GtsirmNative.class);
        super.onCreate(savedInstanceState);
    }
}
