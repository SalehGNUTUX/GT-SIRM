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

import android.app.Activity;
import android.content.ClipData;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
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
        File file;            // غَيرُ فارِغٍ في المَسارِ الاحتِياطيّ
        String displayPath;   // مَسارٌ يُعرَضُ لِلمُستَخدِم
        long bytes;
        boolean usedFallback; // v1.2.10 — رَفَضَ MediaStore فَنَزَلنا لِمُجَلَّدِ البَرنامَج
        String mediaStoreError;// v1.2.19 — لِمَ رَفَضَ MediaStore؟ نُبلِغُ المُستَخدِمَ بِهِ
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
                // ⚠️ v1.2.19 — سُلَّمُ مُحاوَلات، لا مُحاوَلةٌ واحِدة.
                //   MediaProvider يَختَلِفُ سُلوكُهُ بَينَ إصداراتِ أندرويد وبَينَ
                //   المُصَنِّعين: قَد يَرفُضُ نَوعَ المُحتَوى، أَو الاسمَ ذا اللاحِقةِ
                //   المُزدَوَجة (`.gtsirm.json`)، أَو المُجَلَّدَ الفَرعيّ. كانَت
                //   مُحاوَلةٌ واحِدةٌ فاشِلةٌ تُسقِطُنا فَوراً إلى مُجَلَّدِ البَرنامَجِ
                //   الخاصِّ — وهُوَ مَوضِعٌ لا يَراهُ المُستَخدِمُ في «التَنزيلات»،
                //   فَيَظُنُّ أَنَّ شَيئاً لَم يُحفَظ. الآنَ نُجَرِّبُ أَربَعَ صيَغٍ
                //   قَبلَ أَن نَستَسلِم، ونُسَجِّلُ سَبَبَ كُلِّ إخفاق.
                Uri item = null;
                StringBuilder why = new StringBuilder();
                String simpleName = name.replaceAll("\\.gtsirm(?=\\.)", "");
                String[][] attempts = {
                        { name,       mime },
                        { name,       "application/octet-stream" },
                        { simpleName, mime },
                        { simpleName, "application/octet-stream" },
                };
                for (int at = 0; at < attempts.length && pw.stream == null; at++) {
                    String tryName = attempts[at][0];
                    String tryMime = attempts[at][1];
                    if (at > 0 && tryName.equals(attempts[at - 1][0])
                              && tryMime.equals(attempts[at - 1][1])) continue;
                    item = tryMediaStoreInsert(ctx, pw, tryName, tryMime, subDir, isVideo, why);
                }
                if (pw.stream == null) {
                    android.util.Log.w("GT-SIRM", "MediaStore رَفَضَ كُلَّ الصِيَغ: " + why);
                    pw.mediaStoreError = why.toString();
                }
            } else {
                // API < 29 — كِتابةٌ مُباشِرةٌ بِإذنِ WRITE_EXTERNAL_STORAGE.
                // ⚠️ v1.2.19 — الإذنُ خَطِرٌ ويَحتاجُ مَنحاً وَقتَ التَشغيل؛ إن لَم
                //   يُمنَح رَمى FileOutputStream استِثناءَ EACCES فَسَقَطَ الحَفظُ
                //   كُلُّهُ. الآنَ نَنزِلُ إلى مُجَلَّدِ البَرنامَجِ بَدَلَ الفَشَل.
                try {
                    File base = Environment.getExternalStoragePublicDirectory(
                            isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_DOWNLOADS);
                    File dir = new File(base, "GT-SIRM");
                    if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ المُجَلَّد");
                    File out = new File(dir, name);
                    pw.file = out;
                    pw.stream = new FileOutputStream(out);
                    pw.displayPath = out.getAbsolutePath();
                } catch (Exception legacyEx) {
                    pw.mediaStoreError = "التَخزينُ المُشتَرَك: " + legacyEx.getMessage();
                    pw.file = null; pw.stream = null;
                }
            }

            // احتِياطٌ مَضمونٌ لِكِلا المَسارَين: مُجَلَّدُ البَرنامَجِ الخارِجيّ.
            //   لا يَحتاجُ إذناً ولا يَفشَلُ — لَكِنَّهُ خارِجَ نَظَرِ المُستَخدِم، لِذا
            //   نَرفَعُ `usedFallback` فَتَعرِضُ الواجِهةُ عَرضَ «حِفظٌ باسم…» فَوراً.
            if (pw.stream == null) {
                File dir = new File(ctx.getExternalFilesDir(null), isVideo ? "videos" : "projects");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ الحِفظ");
                File out = new File(dir, name);
                pw.file = out;
                pw.stream = new FileOutputStream(out);
                pw.displayPath = out.getAbsolutePath();
                pw.usedFallback = true;
            }

            if (pw.stream == null) throw new Exception("تَعَذَّرَ فَتحُ مَجرى الكِتابة");

            String token = "w" + (++writeCounter);
            pending.put(token, pw);

            JSObject ret = new JSObject();
            ret.put("token", token);
            ret.put("displayPath", pw.displayPath);
            ret.put("usedFallback", pw.usedFallback);
            if (pw.mediaStoreError != null) ret.put("mediaStoreError", pw.mediaStoreError);
            call.resolve(ret);
        } catch (Exception e) {
            closeQuietly(pw);
            call.reject("فَشَلَ فَتحُ المَلَفِّ لِلكِتابة: " + e.getMessage(), e);
        }
    }

    /**
     * مُحاوَلةُ إدراجٍ واحِدةٌ في MediaStore. تُعيدُ العُنوانَ عِندَ النَجاحِ وتَملَأُ
     * `pw.stream`/`pw.uri`/`pw.displayPath`، أَو `null` وتُضيفُ السَبَبَ إلى `why`.
     */
    private Uri tryMediaStoreInsert(Context ctx, PendingWrite pw, String name, String mime,
                                    String subDir, boolean isVideo, StringBuilder why) {
        try {
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
            if (item == null) { why.append("[").append(mime).append(" → insert=null] "); return null; }
            OutputStream os = resolver.openOutputStream(item);
            if (os == null) {
                try { resolver.delete(item, null, null); } catch (Exception ignored) {}
                why.append("[").append(mime).append(" → openOutputStream=null] ");
                return null;
            }
            pw.uri = item;
            pw.stream = os;
            pw.displayPath = subDir + "/" + name;
            return item;
        } catch (Exception e) {
            why.append("[").append(mime).append(" → ").append(e.getClass().getSimpleName())
               .append(": ").append(e.getMessage()).append("] ");
            pw.uri = null; pw.stream = null;
            return null;
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

            // v1.2.10 — لا تُعلِنِ النَجاحَ إلّا بَعدَ التَحَقُّقِ مِن وُجودِ بايتاتٍ
            if (pw.bytes <= 0) throw new Exception("لَم تُكتَب أَيُّ بايتات");
            if (pw.file != null && (!pw.file.exists() || pw.file.length() <= 0)) {
                throw new Exception("المَلَفُّ غَيرُ مَوجودٍ بَعدَ الكِتابة");
            }

            JSObject ret = new JSObject();
            ret.put("uri", pw.uri != null ? pw.uri.toString() : Uri.fromFile(pw.file).toString());
            ret.put("displayPath", pw.displayPath);
            ret.put("bytes", pw.bytes);
            ret.put("usedFallback", pw.usedFallback);
            if (pw.mediaStoreError != null) ret.put("mediaStoreError", pw.mediaStoreError);
            call.resolve(ret);
        } catch (Exception e) {
            // ⚠️ v1.2.19 — كانَ الصَفُّ يَبقى في MediaStore بِـIS_PENDING=1 إلى
            //   الأَبَد: يَظهَرُ في مُتَصَفِّحِ المِلَفّاتِ باهِتاً مُصَنَّفاً BIN ولا
            //   يَفتَحُهُ شَيء، ويَتَراكَمُ نُسَخاً مَعَ كُلِّ مُحاوَلة. (كانَ `pw` قَد
            //   أُزيلَ مِنَ الخَريطةِ هُنا، فَلَم يَجِدهُ cancelWrite لِيُنَظِّفَه.)
            closeQuietly(pw);
            try {
                if (pw.uri != null) getContext().getContentResolver().delete(pw.uri, null, null);
                else if (pw.file != null && pw.file.exists()) pw.file.delete();
            } catch (Exception ignored) {}
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

    // ── 4) المُشارَكة ────────────────────────────────────────────
    //
    //  ⚠️ لِمَ لا نَستَعمِلُ @capacitor/share هُنا؟
    //  لأنَّ SharePlugin.java يَرفُضُ صَراحةً كُلَّ عُنوانٍ لا يَبدَأُ بِـfile: أو
    //  http: («Unsupported url»)، وعَناوينُ MediaStore التي نَحفَظُ بِها تَبدَأُ
    //  بِـcontent:. فَكانَ زِرُّ المُشارَكةِ يَفشَلُ صامِتاً. نَبني الـIntent هُنا.
    @PluginMethod
    public void shareFile(PluginCall call) {
        String uriStr = call.getString("uri");
        String mime = call.getString("mime", "*/*");
        String title = call.getString("title", "GT-SIRM");
        String text = call.getString("text");
        if (uriStr == null || uriStr.trim().isEmpty()) { call.reject("لا عُنوانَ لِلمَلَفّ"); return; }
        try {
            Uri uri = Uri.parse(uriStr);
            // مَلَفّاتُ file:// تَحتاجُ FileProvider وإلّا رُفِضَت بِـFileUriExposedException
            if ("file".equals(uri.getScheme())) {
                uri = FileProvider.getUriForFile(
                        getActivity(), getContext().getPackageName() + ".fileprovider",
                        new File(uri.getPath()));
            }
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_SUBJECT, title);
            if (text != null && !text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            // ClipData + FLAG يَمنَحانِ التَطبيقَ المُستَقبِلَ إذنَ القِراءة
            send.setClipData(ClipData.newRawUri("", uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // v1.2.13 — أَطلِقها مِنَ الـActivity لا مِن سياقِ التَطبيق: الإطلاقُ
            //   مِن سياقٍ غَيرِ Activity يَحتاجُ NEW_TASK وقَد يُتَجاهَلُ صامِتاً
            //   في بَعضِ الأَجهِزة — فَلا تَظهَرُ ورَقةُ المُشارَكةِ ولا خَطَأ.
            android.app.Activity act = getActivity();
            if (act != null && !act.isFinishing()) {
                act.startActivity(chooser);
            } else {
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(chooser);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("تَعَذَّرَتِ المُشارَكة: " + e.getMessage(), e);
        }
    }

    // ── 5) «حِفظٌ باسم» عَبرَ مُنتَقي النِظام (SAF) ────────────────
    //
    //  يَفتَحُ ACTION_CREATE_DOCUMENT فَيَختارُ المُستَخدِمُ المُجَلَّدَ والاسمَ بِنَفسِه
    //  (وِحدةُ تَخزينٍ خارِجيّة، Drive، أَيُّ مُزَوِّد) ثُمَّ نَنسَخُ البايتات.
    private String pendingSaveAsSourceUri = null;

    @PluginMethod
    public void saveAs(PluginCall call) {
        String uriStr = call.getString("uri");
        String name = call.getString("name", "GT-SIRM");
        String mime = call.getString("mime", "application/octet-stream");
        if (uriStr == null) { call.reject("لا عُنوانَ لِلمَصدَر"); return; }
        try {
            pendingSaveAsSourceUri = uriStr;
            Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            create.addCategory(Intent.CATEGORY_OPENABLE);
            create.setType(mime);
            create.putExtra(Intent.EXTRA_TITLE, sanitize(name));
            startActivityForResult(call, create, "saveAsResult");
        } catch (Exception e) {
            call.reject("تَعَذَّرَ فَتحُ مُنتَقي الحَفظ: " + e.getMessage(), e);
        }
    }

    @ActivityCallback
    private void saveAsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String srcStr = pendingSaveAsSourceUri;
        pendingSaveAsSourceUri = null;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject ret = new JSObject();
            ret.put("canceled", true);
            call.resolve(ret);
            return;
        }
        InputStream in = null;
        OutputStream out = null;
        try {
            Uri dest = result.getData().getData();
            Uri src = Uri.parse(srcStr);
            ContentResolver cr = getContext().getContentResolver();
            in = "file".equals(src.getScheme())
                    ? new java.io.FileInputStream(new File(src.getPath()))
                    : cr.openInputStream(src);
            out = cr.openOutputStream(dest);
            if (in == null || out == null) throw new Exception("تَعَذَّرَ فَتحُ المَجرى");
            byte[] buf = new byte[65536];
            int n; long total = 0;
            while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); total += n; }
            out.flush();
            JSObject ret = new JSObject();
            ret.put("canceled", false);
            ret.put("uri", dest.toString());
            ret.put("bytes", total);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("فَشِلَ النَسخُ إلى الوِجهة: " + e.getMessage(), e);
        } finally {
            try { if (in != null) in.close(); } catch (Exception ignored) {}
            try { if (out != null) out.close(); } catch (Exception ignored) {}
        }
    }

    // ── 6) التَحديثُ الذاتيّ: تَنزيلُ الحُزمةِ ثُمَّ تَسليمُها لِمُثَبِّتِ النِظام ──
    //
    //  ⚠️ لا يُثَبَّتُ شَيءٌ تِلقائيّاً. نُنَزِّلُ بِطَلَبِ المُستَخدِم، ثُمَّ نَفتَحُ
    //     شاشةَ التَثبيتِ الرَسميّةَ التي يُؤَكِّدُ فيها بِنَفسِه.
    @PluginMethod
    public void downloadUpdate(final PluginCall call) {
        final String url = call.getString("url");
        final String name = call.getString("name", "GT-SIRM-update.apk");
        if (url == null || !url.startsWith("https://")) {
            call.reject("رابِطُ التَحديثِ يَجِبُ أن يَكونَ https");
            return;
        }
        new Thread(() -> {
            HttpURLConnection conn = null;
            InputStream in = null;
            OutputStream out = null;
            // ⚠️ v1.2.21 — التَنزيلُ كانَ يَقِفُ عِندَ إطفاءِ الشاشةِ ثُمَّ يَبدَأُ
            //   مِنَ الصِفرِ عِندَ المُحاوَلةِ التالِية. سَبَبانِ مُنفَصِلان:
            //   (١) لا خِدمةَ مُقَدِّمةٍ ولا wake lock ⇒ يُجَمِّدُ النِظامُ الخَيطَ
            //       ويَنقَطِعُ المِقبَس. الحَلُّ: نَفسُ خِدمةِ التَصدير.
            //   (٢) كانَ يَحذِفُ **كُلَّ** مُحتَوى مُجَلَّدِ التَحديثاتِ قَبلَ البَدء —
            //       بِما فيهِ الجُزءُ المُنَزَّلُ سابِقاً — ثُمَّ يَفتَحُ المَلَفَّ
            //       بِـFileOutputStream عادِيٍّ (يَقطَعُهُ مِن أَوَّلِه) بِلا تَرويسةِ
            //       Range. فَكانَ الاستِئنافُ مُستَحيلاً بِالبِناء.
            startUpdateForegroundService("جارٍ تَنزيلُ التَحديث…", 0);
            try {
                File dir = new File(getContext().getExternalFilesDir(null), "updates");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ التَحديثات");

                File apk  = new File(dir, sanitize(name));
                File part = new File(dir, sanitize(name) + ".part");

                // نَظِّف ما لا يَخُصُّ هذا التَنزيل، واحفَظِ الجُزءَ المُنَزَّل
                File[] old = dir.listFiles();
                if (old != null) for (File f : old) {
                    if (f.isFile() && !f.equals(part) && !f.equals(apk)) f.delete();
                }
                // حُزمةٌ مُكتَمِلةٌ بِنَفسِ الاسمِ مِن قَبل ⇒ لا تُنَزِّل مِن جَديد
                if (apk.exists() && apk.length() > 0 && !part.exists()) {
                    JSObject done = new JSObject();
                    done.put("path", apk.getAbsolutePath());
                    done.put("bytes", apk.length());
                    done.put("resumed", false);
                    done.put("cached", true);
                    call.resolve(done);
                    return;
                }

                long have = part.exists() ? part.length() : 0;
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                if (have > 0) conn.setRequestProperty("Range", "bytes=" + have + "-");
                conn.connect();
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("HTTP " + code);

                // 206 ⇒ قَبِلَ الاستِئناف. 200 مَعَ have>0 ⇒ رَفَضَهُ فَنَبدَأُ مِنَ الصِفر.
                boolean resumed = (code == 206 && have > 0);
                if (!resumed) have = 0;

                long total = -1;
                String cr = conn.getHeaderField("Content-Range");
                if (resumed && cr != null && cr.contains("/")) {
                    try { total = Long.parseLong(cr.substring(cr.indexOf('/') + 1).trim()); } catch (Exception ignored) {}
                }
                if (total < 0) {
                    long cl = conn.getContentLengthLong();
                    if (cl > 0) total = cl + have;
                }

                in  = conn.getInputStream();
                out = new FileOutputStream(part, resumed);   // append عِندَ الاستِئناف
                byte[] buf = new byte[65536];
                int n; long got = have; long lastEmit = 0;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    got += n;
                    long now = System.currentTimeMillis();
                    if (now - lastEmit > 400) {
                        lastEmit = now;
                        int pct = (total > 0) ? (int) (got * 100 / total) : -1;
                        JSObject ev = new JSObject();
                        ev.put("received", got);
                        ev.put("total", total);
                        ev.put("percent", pct);
                        ev.put("resumed", resumed);
                        notifyListeners("updateProgress", ev);
                        updateUpdateForegroundService(
                            "جارٍ تَنزيلُ التَحديث… " + (pct >= 0 ? pct + "٪" : ""), pct);
                    }
                }
                out.flush();
                try { out.close(); } catch (Exception ignored) {}
                out = null;

                if (total > 0 && part.length() != total) {
                    // ناقِصٌ: أَبقِ الجُزءَ لِيُستَأنَفَ، ولا تَدَّعِ اكتِمالاً
                    throw new Exception("التَنزيلُ ناقِص (" + part.length() + "/" + total + ") — أَعِد المُحاوَلةَ لِيُستَكمَل");
                }
                if (apk.exists()) apk.delete();
                if (!part.renameTo(apk)) throw new Exception("تَعَذَّرَ إتمامُ المَلَفّ");

                JSObject ret = new JSObject();
                ret.put("path", apk.getAbsolutePath());
                ret.put("bytes", apk.length());
                ret.put("resumed", resumed);
                call.resolve(ret);
            } catch (Exception e) {
                // لا نَحذِفُ `.part`: هُوَ رَصيدُ الاستِئنافِ في المُحاوَلةِ القادِمة
                call.reject("فَشِلَ تَنزيلُ التَحديث: " + e.getMessage(), e);
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
                stopUpdateForegroundService();
            }
        }).start();
    }

    // ── خِدمةُ المُقَدِّمةِ أثناءَ تَنزيلِ التَحديث ───────────────────
    private void startUpdateForegroundService(String text, int progress) {
        try {
            Intent i = new Intent(getContext(), ExportService.class);
            i.setAction(ExportService.ACTION_START);
            i.putExtra(ExportService.EXTRA_TEXT, text);
            i.putExtra(ExportService.EXTRA_PROGRESS, progress);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getContext().startForegroundService(i);
            else getContext().startService(i);
        } catch (Exception e) {
            android.util.Log.w("GT-SIRM", "تَعَذَّرَ بَدءُ خِدمةِ التَنزيل: " + e.getMessage());
        }
    }

    private void updateUpdateForegroundService(String text, int progress) {
        try {
            Intent i = new Intent(getContext(), ExportService.class);
            i.setAction(ExportService.ACTION_UPDATE);
            i.putExtra(ExportService.EXTRA_TEXT, text);
            i.putExtra(ExportService.EXTRA_PROGRESS, progress);
            getContext().startService(i);
        } catch (Exception ignored) {}
    }

    private void stopUpdateForegroundService() {
        try {
            Intent i = new Intent(getContext(), ExportService.class);
            i.setAction(ExportService.ACTION_STOP);
            getContext().startService(i);
        } catch (Exception ignored) {}
    }

    /** يَفتَحُ شاشةَ تَثبيتِ النِظام لِلحُزمةِ المُنَزَّلة. */
    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        if (path == null) { call.reject("لا مَسارَ لِلحُزمة"); return; }
        try {
            File apk = new File(path);
            if (!apk.exists()) throw new Exception("المَلَفُّ غَيرُ مَوجود");

            // Android 8+ يَشتَرِطُ إذنَ «تَثبيتُ تَطبيقاتٍ مَجهولةِ المَصدَر» لِهذا
            // التَطبيقِ بِعَينِه — إن لَم يُمنَح، افتَح شاشةَ الإعداداتِ لِيَمنَحَه.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent settings = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getContext().getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settings);
                JSObject ret = new JSObject();
                ret.put("needsPermission", true);
                call.resolve(ret);
                return;
            }

            Uri uri = FileProvider.getUriForFile(
                    getActivity(), getContext().getPackageName() + ".fileprovider", apk);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(uri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(install);

            JSObject ret = new JSObject();
            ret.put("needsPermission", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("تَعَذَّرَ فَتحُ مُثَبِّتِ النِظام: " + e.getMessage(), e);
        }
    }

    // ── 7) تَنزيلُ رابِطٍ مُباشِر ─────────────────────────────────
    //
    //  لِمَ أَصليّاً لا بِـfetch مِنَ الصَفحة؟ لأنَّ الـWebView يَعمَلُ عَلى أَصلِ
    //  https://localhost، فَأَيُّ طَلَبٍ إلى نِطاقٍ آخَرَ يَخضَعُ لِـCORS، وأَكثَرُ
    //  خَوادِمِ الوَسائِطِ لا تُرسِلُ Access-Control-Allow-Origin — فَيُحجَبُ الطَلَبُ
    //  وإن كانَ الرابِطُ سَليماً. الطَبَقةُ الأَصليّةُ لا تَعرِفُ CORS أَصلاً.
    //  يُحفَظُ المَلَفُّ في مُجَلَّدِ البَرنامَجِ ثُمَّ تَقرَؤُهُ الصَفحةُ عَبرَ
    //  Capacitor.convertFileSrc (أَصلٌ واحِدٌ ⇒ بِلا CORS ولا base64).
    @PluginMethod
    public void downloadFile(final PluginCall call) {
        final String url = call.getString("url");
        final String suggested = call.getString("name");
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            call.reject("رابِطٌ غَيرُ صالِح — يَجِبُ أن يَبدَأَ بِـhttp أو https");
            return;
        }
        new Thread(() -> {
            HttpURLConnection conn = null;
            InputStream in = null;
            OutputStream out = null;
            File dest = null;
            try {
                File dir = new File(getContext().getExternalFilesDir(null), "downloads");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ التَنزيلات");

                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android) GT-SIRM");
                conn.connect();
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("HTTP " + code);

                String mime = conn.getContentType();
                if (mime != null && mime.contains(";")) mime = mime.split(";")[0].trim();

                String name = suggested;
                if (name == null || name.trim().isEmpty()) {
                    // Content-Disposition أَوَّلاً ثُمَّ آخِرُ جُزءٍ مِنَ المَسار
                    String cd = conn.getHeaderField("Content-Disposition");
                    if (cd != null && cd.contains("filename=")) {
                        name = cd.substring(cd.indexOf("filename=") + 9).replace("\"", "").trim();
                        if (name.contains(";")) name = name.split(";")[0].trim();
                    } else {
                        String p2 = Uri.parse(url).getLastPathSegment();
                        name = (p2 == null || p2.isEmpty()) ? "download" : p2;
                    }
                }
                name = sanitize(name);
                if (!name.contains(".")) name += guessExt(mime);

                dest = new File(dir, name);
                final long total = conn.getContentLength();
                in = conn.getInputStream();
                out = new FileOutputStream(dest);
                byte[] buf = new byte[65536];
                int n; long got = 0; long lastEmit = 0;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    got += n;
                    long now = System.currentTimeMillis();
                    if (now - lastEmit > 300) {
                        lastEmit = now;
                        JSObject ev = new JSObject();
                        ev.put("received", got);
                        ev.put("total", total);
                        ev.put("percent", total > 0 ? (int) (got * 100 / total) : -1);
                        notifyListeners("downloadProgress", ev);
                    }
                }
                out.flush();

                JSObject ret = new JSObject();
                ret.put("path", dest.getAbsolutePath());
                ret.put("name", name);
                ret.put("mime", mime != null ? mime : "application/octet-stream");
                ret.put("bytes", got);
                call.resolve(ret);
            } catch (Exception e) {
                if (dest != null && dest.exists()) { try { dest.delete(); } catch (Exception ignored) {} }
                call.reject("فَشِلَ التَنزيل: " + e.getMessage(), e);
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private String guessExt(String mime) {
        if (mime == null) return "";
        if (mime.startsWith("video/mp4")) return ".mp4";
        if (mime.startsWith("video/webm")) return ".webm";
        if (mime.startsWith("video/")) return ".mp4";
        if (mime.startsWith("audio/mpeg")) return ".mp3";
        if (mime.startsWith("audio/mp4")) return ".m4a";
        if (mime.startsWith("audio/ogg")) return ".ogg";
        if (mime.startsWith("audio/wav") || mime.startsWith("audio/x-wav")) return ".wav";
        if (mime.startsWith("audio/")) return ".mp3";
        if (mime.startsWith("image/jpeg")) return ".jpg";
        if (mime.startsWith("image/png")) return ".png";
        return "";
    }

    /** يَحذِفُ مُجَلَّدَ التَنزيلاتِ المُؤَقَّتة (تَنظيفٌ بَعدَ الاستيراد). */
    @PluginMethod
    public void clearDownloads(PluginCall call) {
        try {
            File dir = new File(getContext().getExternalFilesDir(null), "downloads");
            File[] fs = dir.listFiles();
            if (fs != null) for (File f : fs) { if (f.isFile()) f.delete(); }
        } catch (Exception ignored) {}
        call.resolve();
    }

    // ── 8) قِراءةُ الحافِظة ──────────────────────────────────────
    //
    //  `navigator.clipboard.readText()` داخِلَ WebView يَتَطَلَّبُ إذناً وتَركيزاً
    //  ويَفشَلُ كَثيراً بِـNotAllowedError، فَتَظهَرُ «تَعَذَّرَ الوُصولُ لِلحافِظة»
    //  رَغمَ وُجودِ نَصٍّ فيها. ClipboardManager الأَصليُّ لا يَشتَرِطُ شَيئاً مِن ذلِك.
    @PluginMethod
    public void readClipboard(PluginCall call) {
        try {
            android.content.ClipboardManager cm =
                    (android.content.ClipboardManager) getContext()
                            .getSystemService(Context.CLIPBOARD_SERVICE);
            String text = "";
            if (cm != null && cm.hasPrimaryClip()) {
                android.content.ClipData clip = cm.getPrimaryClip();
                if (clip != null && clip.getItemCount() > 0) {
                    CharSequence cs = clip.getItemAt(0).coerceToText(getContext());
                    if (cs != null) text = cs.toString();
                }
            }
            JSObject ret = new JSObject();
            ret.put("text", text);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("تَعَذَّرَت قِراءةُ الحافِظة: " + e.getMessage(), e);
        }
    }

    // ── 9) مُشارَكةُ حُزمةِ التَطبيقِ نَفسِها (APK) ────────────────
    //
    //  تُتيحُ نَشرَ البَرنامَجِ يَداً بِيَدٍ بِلا إنترنت. حُزمةُ التَطبيقِ المُثَبَّتِ
    //  مَقروءةٌ مِن مَسارِها (`sourceDir`)، لَكِنَّها في مُجَلَّدِ النِظامِ فَلا
    //  يَصِلُها FileProvider — فَنَنسَخُها إلى مُجَلَّدِ البَرنامَجِ ثُمَّ نُشارِكُها.
    @PluginMethod
    public void shareApk(PluginCall call) {
        new Thread(() -> {
            InputStream in = null;
            OutputStream out = null;
            try {
                android.content.pm.PackageManager pm = getContext().getPackageManager();
                android.content.pm.PackageInfo pi = pm.getPackageInfo(getContext().getPackageName(), 0);
                String srcPath = pi.applicationInfo.sourceDir;
                String ver = pi.versionName != null ? pi.versionName : "app";

                File dir = new File(getContext().getExternalFilesDir(null), "share");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ المُشارَكة");
                File apk = new File(dir, "GT-SIRM-v" + ver + ".apk");

                if (!apk.exists() || apk.length() != new File(srcPath).length()) {
                    in = new java.io.FileInputStream(srcPath);
                    out = new FileOutputStream(apk);
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    out.flush();
                }

                Uri uri = FileProvider.getUriForFile(
                        getActivity(), getContext().getPackageName() + ".fileprovider", apk);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("application/vnd.android.package-archive");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_SUBJECT, "GT-SIRM v" + ver);
                send.setClipData(ClipData.newRawUri("", uri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(send, "مُشارَكةُ حُزمةِ GT-SIRM");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                android.app.Activity act = getActivity();
                if (act != null && !act.isFinishing()) act.startActivity(chooser);
                else { chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(chooser); }

                JSObject ret = new JSObject();
                ret.put("path", apk.getAbsolutePath());
                ret.put("bytes", apk.length());
                ret.put("version", ver);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("تَعَذَّرَت مُشارَكةُ الحُزمة: " + e.getMessage(), e);
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
            }
        }).start();
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
