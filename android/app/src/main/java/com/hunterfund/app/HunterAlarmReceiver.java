package com.hunterfund.app;

import android.app.Notification;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Triggered by AlarmManager (AlarmClock / AllowWhileIdle) even when the app is killed,
 * swiped from Recents, or device screen is locked.
 * Re-arms the next hourly alarm immediately and launches HunterAlertService for loud playback + TTS.
 */
public class HunterAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "HunterAlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (!HunterAlarmScheduler.ACTION_HOURLY_ALARM.equals(action)
            && !HunterAlarmScheduler.ACTION_TEST_ALARM.equals(action)) {
            return;
        }

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "HunterFund:AlarmReceiverLock");
            wakeLock.setReferenceCounted(false);
            try {
                wakeLock.acquire(15_000L);
            } catch (Exception ignored) {}
        }

        try {
            HunterAlarmScheduler.ensureChannels(context);
            HunterCopyGenerator.HunterState state = HunterCopyGenerator.loadState(context);
            boolean isTest = HunterAlarmScheduler.ACTION_TEST_ALARM.equals(action);

            if (!isTest) {
                // Immediately chain the next hourly alarm so the hourly cycle never breaks
                HunterAlarmScheduler.scheduleNextHourly(context);

                if (!state.enabled) {
                    return;
                }
                if (HunterCopyGenerator.isInQuietHours(state, Calendar.getInstance())) {
                    Log.d(TAG, "Skipping hourly alert inside quiet hours");
                    return;
                }
            }

            HunterCopyGenerator.LiveCopy copy = HunterCopyGenerator.computeLiveCopy(state, isTest);
            if (!isTest && (copy.needed <= 0L || copy.remaining <= 0L)) {
                Log.d(TAG, "Skipping hourly alert: today's target already met");
                return;
            }

            Intent serviceIntent = new Intent(context, HunterAlertService.class);
            serviceIntent.putExtra(HunterAlertService.EXTRA_TITLE, copy.title);
            serviceIntent.putExtra(HunterAlertService.EXTRA_BODY, copy.body);
            serviceIntent.putExtra(HunterAlertService.EXTRA_SPEECH_TEXT, copy.speechText);
            serviceIntent.putExtra(HunterAlertService.EXTRA_TTS_LANG, copy.ttsLang);
            serviceIntent.putExtra(HunterAlertService.EXTRA_PLAY_ALARM, true);

            try {
                ContextCompat.startForegroundService(context, serviceIntent);
            } catch (Exception fgsEx) {
                Log.w(TAG, "ForegroundService restricted, invoking fallback path: " + fgsEx.getMessage());
                runBroadcastFallback(context, copy);
            }
        } finally {
            try {
                if (wakeLock != null && wakeLock.isHeld()) {
                    wakeLock.release();
                }
            } catch (Exception ignored) {}
        }
    }

    private void runBroadcastFallback(Context context, HunterCopyGenerator.LiveCopy copy) {
        try {
            Notification notif = HunterAlarmScheduler.buildRichNotification(
                context,
                HunterAlarmScheduler.CHANNEL_FALLBACK_ALARM,
                copy.title,
                copy.body,
                false,
                false,
                false
            );
            NotificationManagerCompat.from(context).notify(HunterAlarmScheduler.NOTIF_ALERT_ID, notif);
        } catch (SecurityException se) {
            Log.w(TAG, "Notification permission denied during fallback: " + se.getMessage());
        }

        final PendingResult pendingResult = goAsync();
        final Context appCtx = context.getApplicationContext();
        final Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] done = {false};
        final TextToSpeech[] holder = new TextToSpeech[1];

        Runnable cleanup = () -> {
            if (!done[0]) {
                done[0] = true;
                try {
                    if (holder[0] != null) {
                        holder[0].stop();
                        holder[0].shutdown();
                    }
                } catch (Exception ignored) {}
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        };

        handler.postDelayed(cleanup, 12_000L);
        handler.postDelayed(() -> {
            if (done[0]) return;
            try {
                holder[0] = new TextToSpeech(appCtx, status -> {
                    if (done[0]) return;
                    if (status == TextToSpeech.SUCCESS && holder[0] != null) {
                        String prefix = copy.ttsLang != null ? copy.ttsLang.split("-")[0] : "hi";
                        Locale loc = "mr".equals(prefix) ? new Locale("mr", "IN")
                            : ("en".equals(prefix) ? new Locale("en", "IN") : new Locale("hi", "IN"));
                        holder[0].setLanguage(loc);
                        holder[0].setSpeechRate(0.92f);
                        holder[0].setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        );
                        holder[0].setOnUtteranceProgressListener(new UtteranceProgressListener() {
                            @Override public void onStart(String s) {}
                            @Override public void onDone(String s) { handler.post(cleanup); }
                            @Override public void onError(String s) { handler.post(cleanup); }
                        });
                        Bundle params = new Bundle();
                        params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_ALARM);
                        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
                        holder[0].speak(copy.speechText, TextToSpeech.QUEUE_FLUSH, params, "fb_utt");
                    } else {
                        handler.post(cleanup);
                    }
                });
            } catch (Exception e) {
                handler.post(cleanup);
            }
        }, 1800L);
    }
}

