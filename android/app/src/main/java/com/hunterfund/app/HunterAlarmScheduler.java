package com.hunterfund.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Calendar;

/**
 * Manages high-priority notification channels, PhonePe/Paytm-style rich notifications,
 * and self-perpetuating AlarmClock exact alarms so hourly alerts fire reliably even
 * when swiped from recents, killed by OS, or across days.
 */
public final class HunterAlarmScheduler {

    private static final String TAG = "HunterAlarmScheduler";

    public static final String CHANNEL_PUSH_SILENT = "hunter_push_v5";
    public static final String CHANNEL_FALLBACK_ALARM = "hunter_alarm_fallback_v5";

    public static final String ACTION_HOURLY_ALARM = "com.hunterfund.app.ACTION_HOURLY_ALARM";
    public static final String ACTION_TEST_ALARM = "com.hunterfund.app.ACTION_TEST_ALARM";
    public static final String ACTION_STOP_ALERT = "com.hunterfund.app.ACTION_STOP_ALERT";

    public static final int NOTIF_ALERT_ID = 9001;
    private static final int RQ_HOURLY = 8801;
    private static final int RQ_TEST = 8802;
    private static final int RQ_SHOW_APP = 8803;
    private static final int RQ_OPEN_QUICK_ADD = 8804;
    private static final int RQ_STOP_SERVICE = 8805;

    private HunterAlarmScheduler() {}

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // 1. Primary heads-up push channel (channel sound null because HunterAlertService plays loud MediaPlayer on STREAM_ALARM)
        if (nm.getNotificationChannel(CHANNEL_PUSH_SILENT) == null) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_PUSH_SILENT,
                "Hunter Fund Push & Voice Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Hourly PhonePe-style heads-up reminders with alarm chime & voice");
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 350, 150, 350});
            ch.enableLights(true);
            ch.setLightColor(Color.parseColor("#10b981"));
            ch.setSound(null, null);
            ch.setShowBadge(true);
            nm.createNotificationChannel(ch);
        }

        // 2. Fallback alarm channel (plays hunter_alert.wav directly via USAGE_ALARM if FGS ever restricted)
        if (nm.getNotificationChannel(CHANNEL_FALLBACK_ALARM) == null) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_FALLBACK_ALARM,
                "Hunter Fund Loud Alarm Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Loud alarm chime notifications for Hunter Fund 350");
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 400, 150, 400, 150, 400});
            ch.enableLights(true);
            ch.setLightColor(Color.parseColor("#10b981"));

            Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/raw/hunter_alert");
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            ch.setSound(soundUri, attrs);
            ch.setShowBadge(true);
            nm.createNotificationChannel(ch);
        }
    }

    public static PendingIntent buildOpenQuickAddPendingIntent(Context context) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_MAIN);
        launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("hunter_action", "quick-deposit");

        return PendingIntent.getActivity(
            context,
            RQ_OPEN_QUICK_ADD,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static Notification buildRichNotification(
        Context context,
        String channelId,
        String title,
        String body,
        boolean ongoing,
        boolean includeStopAction,
        boolean onlyAlertOnce
    ) {
        ensureChannels(context);
        PendingIntent contentIntent = buildOpenQuickAddPendingIntent(context);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setColor(Color.parseColor("#10b981"))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle()
                .setBigContentTitle(title)
                .bigText(body)
                .setSummaryText("Hunter 350 • Leena Mundhada"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(contentIntent)
            .setAutoCancel(!ongoing)
            .setOngoing(ongoing)
            .setOnlyAlertOnce(onlyAlertOnce)
            .setVibrate(new long[]{0, 350, 150, 350})
            .setLights(Color.parseColor("#10b981"), 1000, 1000)
            .addAction(0, "Record Deposit", contentIntent);

        try {
            Bitmap largeIcon = BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher);
            if (largeIcon != null) {
                builder.setLargeIcon(largeIcon);
            }
        } catch (Exception ignored) {}

        if (includeStopAction) {
            Intent stopIntent = new Intent(context, HunterAlertService.class);
            stopIntent.setAction(ACTION_STOP_ALERT);
            PendingIntent stopPi = PendingIntent.getService(
                context,
                RQ_STOP_SERVICE,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(0, "Stop Sound", stopPi);
        }

        return builder.build();
    }

    public static long scheduleNextHourly(Context context) {
        HunterCopyGenerator.HunterState state = HunterCopyGenerator.loadState(context);
        if (!state.enabled || Math.round(state.remainingAmount) <= 0L) {
            cancelHourly(context);
            return 0L;
        }

        long now = System.currentTimeMillis();
        long triggerMillis = computeNextHourlyTriggerMillis(state, now);
        scheduleAt(context, RQ_HOURLY, ACTION_HOURLY_ALARM, triggerMillis);
        HunterCopyGenerator.saveNextAlarmAt(context, triggerMillis);
        Log.d(TAG, "Next hourly alarm armed for " + new java.util.Date(triggerMillis));
        return triggerMillis;
    }

    public static long scheduleTestAlarm(Context context, int delaySeconds) {
        long safeDelayMs = Math.max(2, delaySeconds) * 1000L;
        long triggerMillis = System.currentTimeMillis() + safeDelayMs;
        scheduleAt(context, RQ_TEST, ACTION_TEST_ALARM, triggerMillis);
        Log.d(TAG, "Background test alarm armed in " + delaySeconds + "s at " + new java.util.Date(triggerMillis));
        return triggerMillis;
    }

    public static void cancelHourly(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            Intent intent = new Intent(context, HunterAlarmReceiver.class);
            intent.setAction(ACTION_HOURLY_ALARM);
            PendingIntent pi = PendingIntent.getBroadcast(
                context,
                RQ_HOURLY,
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        }
        HunterCopyGenerator.saveNextAlarmAt(context, 0L);
    }

    public static void rescheduleFromState(Context context) {
        ensureChannels(context);
        scheduleNextHourly(context);
    }

    private static void scheduleAt(Context context, int requestCode, String action, long triggerMillis) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent receiverIntent = new Intent(context, HunterAlarmReceiver.class);
        receiverIntent.setAction(action);

        PendingIntent receiverPi = PendingIntent.getBroadcast(
            context,
            requestCode,
            receiverIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent showIntent = new Intent(context, MainActivity.class);
        showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent showPi = PendingIntent.getActivity(
            context,
            RQ_SHOW_APP,
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        boolean canExact = canScheduleExactAlarms(context);
        if (canExact) {
            try {
                // setAlarmClock() wakes Samsung/Android out of Deep Doze & App Standby,
                // bypasses Sleeping Apps throttling, and grants background ForegroundService exemption.
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerMillis, showPi);
                am.setAlarmClock(clockInfo, receiverPi);
                return;
            } catch (SecurityException se) {
                Log.w(TAG, "setAlarmClock denied, trying fallback: " + se.getMessage());
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, receiverPi);
        } else {
            am.set(AlarmManager.RTC_WAKEUP, triggerMillis, receiverPi);
        }
    }

    public static long computeNextHourlyTriggerMillis(HunterCopyGenerator.HunterState state, long nowMillis) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMillis + 60L * 60L * 1000L);

        // Check if today's goal is already completely met right now
        HunterCopyGenerator.LiveCopy todayCopy = HunterCopyGenerator.computeLiveCopy(state, false);
        Calendar nowCal = Calendar.getInstance();
        nowCal.setTimeInMillis(nowMillis);

        boolean sameCalendarDay =
            cal.get(Calendar.YEAR) == nowCal.get(Calendar.YEAR)
                && cal.get(Calendar.DAY_OF_YEAR) == nowCal.get(Calendar.DAY_OF_YEAR);

        if (sameCalendarDay && todayCopy.needed <= 0L) {
            // Today's target already deposited -> jump directly to tomorrow morning wake hour
            cal.setTimeInMillis(nowMillis);
            cal.add(Calendar.DAY_OF_YEAR, 1);
            int wakeHour = state.quietHoursEnabled ? state.quietEndHour : 8;
            cal.set(Calendar.HOUR_OF_DAY, wakeHour);
            cal.set(Calendar.MINUTE, 5);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            return cal.getTimeInMillis();
        }

        // If candidate hour lands inside quiet hours (e.g. 23:00 - 07:59), jump to next morning wakeHour
        if (HunterCopyGenerator.isInQuietHours(state, cal)) {
            int hour = cal.get(Calendar.HOUR_OF_DAY);
            if (state.quietStartHour > state.quietEndHour && hour >= state.quietStartHour) {
                cal.add(Calendar.DAY_OF_YEAR, 1);
            }
            cal.set(Calendar.HOUR_OF_DAY, state.quietEndHour);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 5);
            cal.set(Calendar.MILLISECOND, 0);
        }

        if (cal.getTimeInMillis() <= nowMillis + 10_000L) {
            cal.setTimeInMillis(nowMillis + 60L * 60L * 1000L);
        }
        return cal.getTimeInMillis();
    }

    public static boolean areNotificationsEnabled(Context context) {
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    public static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return am == null || am.canScheduleExactAlarms();
    }

    public static boolean isIgnoringBatteryOptimizations(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
    }

    public static Intent buildBatteryOptimizationIntent(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            return intent;
        }
        return null;
    }

    public static Intent buildExactAlarmSettingsIntent(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            return intent;
        }
        return null;
    }

    public static Intent buildAppNotificationSettingsIntent(Context context) {
        Intent intent = new Intent();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
        } else {
            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
        }
        return intent;
    }
}

