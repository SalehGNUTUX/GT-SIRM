package org.gnutux.gtsirm;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;
import com.yausername.youtubedl_android.YoutubeDLResponse;

import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import kotlin.Unit;
import kotlin.jvm.functions.Function3;

/**
 * ═══════════════════════════════════════════════════════════════
 *  GT-SIRM — جِسرُ yt-dlp لِأندرويد (v1.2.7)
 *
 *  يَقومُ عَلى io.github.junkfood02.youtubedl-android، وهي المَكتَبةُ التي
 *  يَقومُ عَلَيها تَطبيقُ YTDLnis: تُضَمِّنُ مُفَسِّرَ Python مَعَ yt-dlp وتُهَيِّئُهُ
 *  عِندَ أَوَّلِ تَشغيل.
 *
 *  ⚠️ بِلا ffmpeg (لَم نُضَمِّنهُ — 133 م.ب): لِذا نَطلُبُ صيَغاً **مَدموجةً
 *     مُسبَقاً** (صَوتٌ وصورةٌ في مَجرىً واحِد). هذا يَحرِمُنا أَحياناً مِن أَعلى
 *     جَودةٍ مُتاحةٍ (يوتيوب يَفصِلُ 1080p+ إلى مَجرَيَين) لَكِنَّهُ يَتَجَنَّبُ
 *     ثُلثَ حَجمِ الحُزمة. لِذا نَبدَأُ بِأَفضَلِ مَدموجٍ ثُمَّ نَتَنازَل.
 *
 *  التَهيئةُ ثَقيلةٌ في أَوَّلِ مَرّة (فَكُّ ضَغطِ Python)، فَتَجري في خَيطٍ
 *  مُنفَصِلٍ ولا تُستَدعى إلّا عِندَ الحاجةِ الأُولى.
 * ═══════════════════════════════════════════════════════════════
 */
@CapacitorPlugin(name = "GtsirmYtdlp")
public class GtsirmYtdlp extends Plugin {

    private static boolean initialized = false;
    private static final Object INIT_LOCK = new Object();
    private String currentProcessId = null;

    private void ensureInit(Context ctx) throws Exception {
        synchronized (INIT_LOCK) {
            if (initialized) return;
            YoutubeDL.getInstance().init(ctx);
            initialized = true;
        }
    }

    /** هَل الجِسرُ مَبنيٌّ في هذه الحُزمة؟ (يُميِّزُ الحُزمةَ الكامِلةَ مِنَ الخَفيفة) */
    @PluginMethod
    public void available(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("initialized", initialized);
        call.resolve(ret);
    }

    /** تَهيئةُ Python + yt-dlp (ثَقيلةٌ أَوَّلَ مَرّة). */
    @PluginMethod
    public void init(final PluginCall call) {
        new Thread(() -> {
            try {
                ensureInit(getContext());
                JSObject ret = new JSObject();
                ret.put("initialized", true);
                ret.put("version", YoutubeDL.getInstance().version(getContext()));
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("فَشِلَت تَهيئةُ yt-dlp: " + e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void version(final PluginCall call) {
        new Thread(() -> {
            try {
                ensureInit(getContext());
                JSObject ret = new JSObject();
                ret.put("version", YoutubeDL.getInstance().version(getContext()));
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("تَعَذَّرَت قِراءةُ الإصدار: " + e.getMessage(), e);
            }
        }).start();
    }

    /** تَحديثُ yt-dlp نَفسِهِ مِن قَناةِ STABLE. */
    @PluginMethod
    public void update(final PluginCall call) {
        new Thread(() -> {
            try {
                ensureInit(getContext());
                YoutubeDL.UpdateStatus st = YoutubeDL.getInstance()
                        .updateYoutubeDL(getContext(), YoutubeDL.UpdateChannel._STABLE);
                JSObject ret = new JSObject();
                ret.put("status", st != null ? st.name() : "UNKNOWN");
                ret.put("updated", st == YoutubeDL.UpdateStatus.DONE);
                ret.put("version", YoutubeDL.getInstance().version(getContext()));
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("فَشِلَ تَحديثُ yt-dlp: " + e.getMessage(), e);
            }
        }).start();
    }

    /**
     * يُنَزِّلُ مِن أَيِّ مَوقِعٍ يَدعَمُهُ yt-dlp.
     *   url  — رابِطُ الصَفحة
     *   kind — "video" أو "audio"
     * يُعيد: { path, name, mime, bytes }
     */
    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        final String kind = call.getString("kind", "video");
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            call.reject("رابِطٌ غَيرُ صالِح");
            return;
        }
        final String procId = "gtsirm-" + System.currentTimeMillis();
        currentProcessId = procId;

        new Thread(() -> {
            try {
                ensureInit(getContext());
                File dir = new File(getContext().getExternalFilesDir(null), "downloads");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("تَعَذَّرَ إنشاءُ مُجَلَّدِ التَنزيلات");

                final Set<String> before = new HashSet<>();
                File[] pre = dir.listFiles();
                if (pre != null) for (File f : pre) before.add(f.getName());

                YoutubeDLRequest req = new YoutubeDLRequest(url);
                req.addOption("--no-playlist");
                req.addOption("--no-mtime");
                req.addOption("--restrict-filenames");
                req.addOption("-o", new File(dir, "%(title).60s.%(ext)s").getAbsolutePath());
                if ("audio".equals(kind)) {
                    // بِلا ffmpeg: لا نَستَخرِجُ الصَوتَ بَل نَأخُذُ مَجرىً صَوتيّاً جاهِزاً
                    req.addOption("-f", "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio");
                } else {
                    // صيَغٌ مَدموجةٌ مُسبَقاً فَقَط (لا دَمجَ ⇒ لا حاجةَ لِـffmpeg)
                    req.addOption("-f", "best[ext=mp4]/best[ext=webm]/best");
                }

                YoutubeDLResponse res = YoutubeDL.getInstance().execute(req, procId,
                        new Function3<Float, Long, String, Unit>() {
                            @Override
                            public Unit invoke(Float progress, Long etaSec, String line) {
                                JSObject ev = new JSObject();
                                ev.put("percent", progress != null ? Math.round(progress) : -1);
                                ev.put("eta", etaSec != null ? etaSec : -1);
                                ev.put("line", line != null ? line : "");
                                notifyListeners("ytdlpProgress", ev);
                                return Unit.INSTANCE;
                            }
                        });

                // اعثُر عَلى المَلَفِّ الجَديد: أَحدَثُ مَلَفٍّ لَم يَكُن مَوجوداً قَبلَ التَنزيل
                File out = null;
                File[] post = dir.listFiles();
                if (post != null) {
                    for (File f : post) {
                        if (!f.isFile() || before.contains(f.getName())) continue;
                        if (f.getName().endsWith(".part") || f.getName().endsWith(".ytdl")) continue;
                        if (out == null || f.lastModified() > out.lastModified()) out = f;
                    }
                }
                if (out == null) {
                    String tail = (res != null && res.getOut() != null)
                            ? res.getOut().substring(Math.max(0, res.getOut().length() - 300)) : "";
                    throw new Exception("لَم يُعثَر عَلى المَلَفِّ المُنَزَّل. " + tail);
                }

                String n = out.getName().toLowerCase();
                String mime = n.endsWith(".mp4") ? "video/mp4"
                            : n.endsWith(".webm") ? "video/webm"
                            : n.endsWith(".mkv") ? "video/x-matroska"
                            : n.endsWith(".m4a") ? "audio/mp4"
                            : n.endsWith(".mp3") ? "audio/mpeg"
                            : n.endsWith(".opus") || n.endsWith(".ogg") ? "audio/ogg"
                            : "application/octet-stream";

                JSObject ret = new JSObject();
                ret.put("path", out.getAbsolutePath());
                ret.put("name", out.getName());
                ret.put("mime", mime);
                ret.put("bytes", out.length());
                call.resolve(ret);
            } catch (YoutubeDL.CanceledException ce) {
                call.reject("cancelled");
            } catch (Exception e) {
                call.reject("فَشِلَ التَنزيل: " + e.getMessage(), e);
            } finally {
                currentProcessId = null;
            }
        }).start();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        try {
            if (currentProcessId != null) YoutubeDL.getInstance().destroyProcessById(currentProcessId);
        } catch (Exception ignored) {}
        call.resolve();
    }
}
