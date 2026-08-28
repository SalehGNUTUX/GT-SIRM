package org.gnutux.gtsirm;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * ═══════════════════════════════════════════════════════════════
 *  GT-SIRM — الجِسرُ الأَصليّ (v1.2.1)
 *  يَحُلُّ ثَلاثَ عِلَلٍ لا تُحَلُّ مِن داخِلِ الـWebView:
 *
 *   1) الحَفظُ الحَقيقيّ: `<a download>` لا يَفعَلُ شَيئاً داخِلَ WebView، فَكانَ
 *      الفيديو المُصَدَّرُ يَضيعُ بِلا أَثَر. هُنا نَكتُبُهُ عَبرَ MediaStore إلى
 *      Movies/GT-SIRM (يَظهَرُ في المَعرِض) والمَشاريعَ إلى Download/GT-SIRM.
 *
 *   2) بَقاءُ التَصديرِ حَيّاً: خِدمةُ مُقَدِّمةٍ + PARTIAL_WAKE_LOCK حَتّى لا
 *      يُجَمِّدَ النِظامُ العَمليّةَ عِندَ مُغادَرةِ البَرنامَجِ أو انطِفاءِ الشاشة.
 *
 *   3) إبقاءُ الشاشةِ مُضاءةً (FLAG_KEEP_SCREEN_ON) طَوالَ التَصدير.
 *
 *  النَقلُ إلى الأَصليّ يَجري مُقَطَّعاً (begin/append/end) لأنّ تَمريرَ عَشَراتِ
 *  الميغابايتِ base64 في نِداءٍ واحِدٍ يُنفِدُ ذاكِرةَ الجِسر.
 * ═══════════════════════════════════════════════════════════════
 */
@CapacitorPlugin(name = "GtsirmNative")
public class GtsirmNative extends Plugin {

    /** كِتاباتٌ جاريةٌ مَفتوحة، مِفتاحُها الرَمزُ المُعادُ لِلـJS. */
    private static class PendingWrite {
        OutputStream stream;
        Uri uri;              // غَيرُ فارِغٍ في مَسارِ MediaStore
        File file;            // غَيرُ فارِغٍ في المَسارِ الاحتِياطيّ (API < 29)
        String displayPath;   // مَسارٌ يُعرَضُ لِلمُستَخدِم
        long bytes;
    }

    private final Map<String, PendingWrite> pending = new HashMap<>();
    private int writeCounter = 0;

    // ── 1) الحَفظ ───────────────────────────────────────────────

    /**
     * يَفتَحُ مَلَفّاً لِلكِتابة. المُعامِلات:
     *   name  — اسمُ المَلَفّ (مَعَ اللاحِقة)
     *   mime  — نَوعُ المُحتَوى
     *   kind  — "video" (→ Movies/GT-SIRM) أو غَيرُه (→ Download/GT-SIRM)
     * يُعيد: { token, displayPath }
     */
    @PluginMethod
    public void beginWrite(PluginCall call) {
        String name = call.getString("name");
        String mime = call.getString("mime", "application/octet-stream");
        String kind = call.getString("kind", "file");
        if (name == null || name.trim().isEmpty()) {
            call.reject("اسمُ المَلَفِّ مَفقود");
            return;
        }
        name = sanitize(name);

        boolean isVideo = "video".equals(kind);
        String subDir = isVideo ? "Movies/GT-SIRM" : "Download/GT-SIRM";

        PendingWrite pw = new PendingWrite();
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = ctx.getContentResolver();
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, subDir);
                cv.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri collection = isVideo
                        ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                        : MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);

                Uri item = resolver.insert(collection, cv);
                if (item == null) throw new Exception("تَعَذَّرَ إنشاءُ سِجِلِّ MediaStore");
                pw.uri = item;
                pw.stream = resolver.openOutputStream(item);
                pw.displayPath = subDir + "/" + name;
            } else {
                // API < 29 — كِتابةٌ مُباشِرةٌ بِإذنِ WRITE_EXTERNAL_STORAGE
                File base = Environment.getExternalStoragePublicDirectory(
                        isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_DOWNLOADS);
                File dir = new File(base, "GT-SIRM");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ المُجَلَّد");
                File out = new File(dir, name);
                pw.file = out;
                pw.stream = new FileOutputStream(out);
                pw.displayPath = out.getAbsolutePath();
            }

            if (pw.stream == null) throw new Exception("تَعَذَّرَ فَتحُ مَجرى الكِتابة");

            String token = "w" + (++writeCounter);
            pending.put(token, pw);

            JSObject ret = new JSObject();
            ret.put("token", token);
            ret.put("displayPath", pw.displayPath);
            call.resolve(ret);
        } catch (Exception e) {
            closeQuietly(pw);
            call.reject("فَشَلَ فَتحُ المَلَفِّ لِلكِتابة: " + e.getMessage(), e);
        }
    }

    /** يُلحِقُ قِطعةَ base64 بِمَلَفٍّ مَفتوح. */
    @PluginMethod
    public void appendChunk(PluginCall call) {
        String token = call.getString("token");
        String data = call.getString("data");
        PendingWrite pw = (token == null) ? null : pending.get(token);
        if (pw == null) { call.reject("رَمزُ الكِتابةِ غَيرُ مَعروف"); return; }
        if (data == null) { call.reject("لا بَياناتَ في القِطعة"); return; }
        try {
            byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
            pw.stream.write(bytes);
            pw.bytes += bytes.length;
            JSObject ret = new JSObject();
            ret.put("bytes", pw.bytes);
            call.resolve(ret);
        } catch (Exception e) {
            abortWrite(token);
            call.reject("فَشِلَت كِتابةُ القِطعة: " + e.getMessage(), e);
        }
    }

    /** يُغلِقُ المَلَفَّ ويُشهِرُهُ لِلنِظام. يُعيد: { uri, displayPath, bytes } */
    @PluginMethod
    public void endWrite(PluginCall call) {
        String token = call.getString("token");
        PendingWrite pw = (token == null) ? null : pending.remove(token);
        if (pw == null) { call.reject("رَمزُ الكِتابةِ غَيرُ مَعروف"); return; }
        try {
            pw.stream.flush();
            pw.stream.close();
            pw.stream = null;

            if (pw.uri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(pw.uri, cv, null, null);
            } else if (pw.file != null) {
                // أَعلِمِ المَعرِضَ بِالمَلَفِّ الجَديد (الأَجهِزةُ القَديمة)
                Intent scan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                scan.setData(Uri.fromFile(pw.file));
                getContext().sendBroadcast(scan);
            }

            JSObject ret = new JSObject();
            ret.put("uri", pw.uri != null ? pw.uri.toString() : Uri.fromFile(pw.file).toString());
            ret.put("displayPath", pw.displayPath);
            ret.put("bytes", pw.bytes);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("فَشِلَ إغلاقُ المَلَفّ: " + e.getMessage(), e);
        }
    }

    /** يُلغي كِتابةً جاريةً ويَحذِفُ المَلَفَّ النّاقِص. */
    @PluginMethod
    public void cancelWrite(PluginCall call) {
        abortWrite(call.getString("token"));
        call.resolve();
    }

    private void abortWrite(String token) {
        if (token == null) return;
        PendingWrite pw = pending.remove(token);
        if (pw == null) return;
        closeQuietly(pw);
        try {
            if (pw.uri != null) getContext().getContentResolver().delete(pw.uri, null, null);
            else if (pw.file != null && pw.file.exists()) pw.file.delete();
        } catch (Exception ignored) {}
    }

    private void closeQuietly(PendingWrite pw) {
        if (pw != null && pw.stream != null) {
            try { pw.stream.close(); } catch (Exception ignored) {}
            pw.stream = null;
        }
    }

    private String sanitize(String name) {
        String s = name.replaceAll("[\\\\/:*?\"<>|\\u0000]", "_").trim();
        if (s.isEmpty()) s = "GT-SIRM";
        return s.length() > 120 ? s.substring(0, 120) : s;
    }

    // ── 2) إبقاءُ الشاشةِ مُضاءة ─────────────────────────────────

    @PluginMethod
    public void keepAwake(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", Boolean.TRUE));
        final PluginCall theCall = call;
        getActivity().runOnUiThread(() -> {
            try {
                if (on) {
                    getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
                theCall.resolve();
            } catch (Exception e) {
                theCall.reject("تَعَذَّرَ ضَبطُ إبقاءِ الشاشةِ مُضاءة: " + e.getMessage(), e);
            }
        });
    }

    // ── 3) خِدمةُ المُقَدِّمة ───────────────────────────────────────

    @PluginMethod
    public void startExportService(PluginCall call) {
        try {
            // Android 13+ يُخفي إشعارَ الخِدمةِ بِلا إذنِ POST_NOTIFICATIONS.
            // الخِدمةُ تَعمَلُ بِدونِه، لَكِنَّ المُستَخدِمَ يَفقِدُ رُؤيةَ التَقَدُّم —
            // فَنَطلُبُهُ مَرّةً بِلا إلحاح (لا يُعَطِّلُ التَصديرَ إن رُفِض).
            if (Build.VERSION.SDK_INT >= 33) {
                try {
                    if (getContext().checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        getActivity().requestPermissions(
                                new String[]{"android.permission.POST_NOTIFICATIONS"}, 9713);
                    }
                } catch (Exception ignored) {}
            }
            Intent i = new Intent(getContext(), ExportService.class);
            i.setAction(ExportService.ACTION_START);
            i.putExtra(ExportService.EXTRA_TEXT, call.getString("text", "جارٍ تَصديرُ الفيديو…"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(i);
            } else {
                getContext().startService(i);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("تَعَذَّرَ بَدءُ خِدمةِ التَصدير: " + e.getMessage(), e);
        }
    }

    /** يُحَدِّثُ نَصَّ الإشعار (نِسبةُ التَقَدُّم). */
    @PluginMethod
    public void updateExportService(PluginCall call) {
        try {
            Intent i = new Intent(getContext(), ExportService.class);
            i.setAction(ExportService.ACTION_UPDATE);
            i.putExtra(ExportService.EXTRA_TEXT, call.getString("text", ""));
            i.putExtra(ExportService.EXTRA_PROGRESS, call.getInt("progress", -1));
            getContext().startService(i);
            call.resolve();
        } catch (Exception e) {
            call.resolve();   // تَحديثُ الإشعارِ ثانَويّ — لا تُفشِلِ التَصديرَ لأَجلِه
        }
    }

    @PluginMethod
    public void stopExportService(PluginCall call) {
        try {
            Intent i = new Intent(getContext(), ExportService.class);
            i.setAction(ExportService.ACTION_STOP);
            getContext().startService(i);
        } catch (Exception ignored) {}
        call.resolve();
    }

    /** لِلـJS: هَل الجِسرُ الأَصليُّ حاضِرٌ فِعلاً؟ */
    @PluginMethod
    public void ping(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }
}
