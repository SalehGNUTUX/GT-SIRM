package org.gnutux.gtsirm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * ═══════════════════════════════════════════════════════════════
 *  GT-SIRM — خِدمةُ المُقَدِّمة أثناءَ التَصدير (v1.2.1)
 *
 *  المُشكِلة: حينَ يُغادِرُ المُستَخدِمُ البَرنامَجَ أو تَنطَفِئُ الشاشة، يُجَمِّدُ
 *  Android عَمَلَ الـWebView (وتُخنَقُ المُؤَقِّتاتُ إلى نِداءٍ كُلَّ ثانية)، فَيَقِفُ
 *  التَصديرُ عِندَ الإطارِ الذي بَلَغَه.
 *
 *  الحَلّ: خِدمةُ مُقَدِّمةٍ ذاتُ إشعارٍ دائِمٍ تَرفَعُ أَولَويّةَ العَمليّة، مَعَ
 *  PARTIAL_WAKE_LOCK يَمنَعُ المُعالِجَ مِنَ النَوم. الإشعارُ يَعرِضُ التَقَدُّمَ
 *  ويَعودُ بِالمُستَخدِمِ إلى البَرنامَجِ عِندَ النَقر.
 * ═══════════════════════════════════════════════════════════════
 */
public class ExportService extends Service {

    public static final String ACTION_START  = "org.gnutux.gtsirm.EXPORT_START";
    public static final String ACTION_UPDATE = "org.gnutux.gtsirm.EXPORT_UPDATE";
    public static final String ACTION_STOP   = "org.gnutux.gtsirm.EXPORT_STOP";
    public static final String EXTRA_TEXT     = "text";
    public static final String EXTRA_PROGRESS = "progress";

    private static final String CHANNEL_ID = "gtsirm_export";
    private static final int NOTIF_ID = 4711;

    private PowerManager.WakeLock wakeLock;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = (intent == null) ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            releaseWakeLock();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String text = (intent != null && intent.getStringExtra(EXTRA_TEXT) != null)
                ? intent.getStringExtra(EXTRA_TEXT) : "جارٍ تَصديرُ الفيديو…";
        int progress = (intent != null) ? intent.getIntExtra(EXTRA_PROGRESS, -1) : -1;

        Notification notif = buildNotification(text, progress);

        if (ACTION_UPDATE.equals(action)) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIF_ID, notif);
            return START_STICKY;
        }

        // ACTION_START
        ensureChannel();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIF_ID, notif);
        }
        acquireWakeLock();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }

    // ── الإشعار ────────────────────────────────────────────────

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "تَصديرُ الفيديو", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("يُبقي التَصديرَ يَعمَلُ حينَ يَكونُ البَرنامَجُ في الخَلفيّة");
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
    }

    private Notification buildNotification(String text, int progress) {
        ensureChannel();

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, piFlags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("GT-SIRM — تَصديرُ الفيديو")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(pi);

        if (progress >= 0) b.setProgress(100, Math.min(100, progress), false);
        else b.setProgress(0, 0, true);

        return b.build();
    }

    // ── قُفلُ اليَقَظة ───────────────────────────────────────────

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GT-SIRM:export");
            wakeLock.setReferenceCounted(false);
            // حَدٌّ أَقصى ساعَتان — شَبَكةُ أَمانٍ لِئَلّا يَبقى القُفلُ لَو تَعَطَّلَ التَصدير
            wakeLock.acquire(2 * 60 * 60 * 1000L);
        } catch (Exception ignored) {}
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception ignored) {}
        wakeLock = null;
    }
}
