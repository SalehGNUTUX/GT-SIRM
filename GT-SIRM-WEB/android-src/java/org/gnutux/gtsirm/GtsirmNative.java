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
                // ⚠️ v1.2.10 — MediaProvider يَرفُضُ (أو يُعيدُ تَسميةَ) المِلَفّاتِ التي
                //   لا تُطابِقُ لاحِقَتُها نَوعَ المُحتَوى — و`.gtsirm` لاحِقةٌ مَجهولةٌ
                //   لَه. فَإن فَشِلَ الإدراجُ نَنزِلُ إلى مُجَلَّدِ البَرنامَجِ الخارِجيِّ
                //   بَدَلَ أن نَفشَلَ — المُهِمُّ ألّا يَضيعَ عَمَلُ المُستَخدِم.
                Uri item = null;
                try {
                    ContentResolver resolver = ctx.getContentResolver();
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE,
                           isVideo ? mime : "application/octet-stream");
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, subDir);
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri collection = isVideo
                            ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                            : MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);

                    item = resolver.insert(collection, cv);
                    if (item != null) {
                        pw.uri = item;
                        pw.stream = resolver.openOutputStream(item);
                        pw.displayPath = subDir + "/" + name;
                    }
                } catch (Exception mediaEx) {
                    android.util.Log.w("GT-SIRM", "MediaStore رَفَضَ المَلَفّ: " + mediaEx.getMessage());
                    item = null;
                    pw.uri = null;
                    pw.stream = null;
                }

                if (pw.stream == null) {
                    // احتِياطٌ مَضمون: مُجَلَّدُ البَرنامَجِ الخارِجيّ
                    File dir = new File(ctx.getExternalFilesDir(null), isVideo ? "videos" : "projects");
                    if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ الحِفظ");
                    File out = new File(dir, name);
                    pw.file = out;
                    pw.stream = new FileOutputStream(out);
                    pw.displayPath = out.getAbsolutePath();
                    pw.usedFallback = true;
                }
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
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
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
            try {
                File dir = new File(getContext().getExternalFilesDir(null), "updates");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ التَحديثات");
                // نَظِّف الحُزَمَ القَديمةَ حَتّى لا تَتَراكَم
                File[] old = dir.listFiles();
                if (old != null) for (File f : old) { if (f.isFile()) f.delete(); }

                File apk = new File(dir, sanitize(name));
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.connect();
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
                final int total = conn.getContentLength();

                in = conn.getInputStream();
                out = new FileOutputStream(apk);
                byte[] buf = new byte[65536];
                int n; long got = 0; long lastEmit = 0;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    got += n;
                    long now = System.currentTimeMillis();
                    if (now - lastEmit > 400) {
                        lastEmit = now;
                        JSObject ev = new JSObject();
                        ev.put("received", got);
                        ev.put("total", total);
                        ev.put("percent", total > 0 ? (int) (got * 100 / total) : -1);
                        notifyListeners("updateProgress", ev);
                    }
                }
                out.flush();

                JSObject ret = new JSObject();
                ret.put("path", apk.getAbsolutePath());
                ret.put("bytes", got);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("فَشِلَ تَنزيلُ التَحديث: " + e.getMessage(), e);
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
            }
        }).start();
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

    /** لِلـJS: هَل الجِسرُ الأَصليُّ حاضِرٌ فِعلاً؟ */
    @PluginMethod
    public void ping(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }
}
