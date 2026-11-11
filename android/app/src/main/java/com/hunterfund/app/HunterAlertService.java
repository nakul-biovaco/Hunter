package com.hunterfund.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.text.TextUtils;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.ServiceCompat;
import java.util.Locale;
import java.util.Set;

/**
 * Foreground Service responsible for:
 * 1. Posting PhonePe/Paytm-grade heads-up notification immediately on lockscreen & tray
 * 2. Boosting ALARM audio stream cleanly to MAX volume and holding CPU WakeLock
 * 3. Playing loud R.raw.hunter_alert chime via MediaPlayer
 * 4. Speaking natural Indian Google TTS voice sequentially right after chime completes
 * 5. Restoring audio settings & detaching notification cleanly on finish
 */
public class HunterAlertService extends Service {

    private static final String TAG = "HunterAlertService";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";
    public static final String EXTRA_SPEECH_TEXT = "extra_speech_text";
    public static final String EXTRA_TTS_LANG = "extra_tts_lang";
    public static final String EXTRA_PLAY_ALARM = "extra_play_alarm";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private int generation = 0;

    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private AudioManager.OnAudioFocusChangeListener legacyFocusListener;
    private boolean hasSavedAlarmVol = false;
    private int savedAlarmVol = -1;

    private MediaPlayer mediaPlayer;
    private TextToSpeech tts;

    private String currentTitle = "Hunter Fund — Reminder";
    private String currentBody = "";
    private String currentSpeechText = "";
    private String currentTtsLang = "hi-IN";
    private boolean currentPlayAlarm = true;

    private boolean chimeFinished = false;
    private boolean ttsReady = false;
    private boolean hasSpoken = false;
    private boolean triedDefaultEngine = false;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        HunterAlarmScheduler.ensureChannels(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && HunterAlarmScheduler.ACTION_STOP_ALERT.equals(intent.getAction())) {
            int myGen = ++generation;
            tearDownMediaAndTts();
            restoreVolumeAndFocus();
            detachFinalNotification();
            releaseWakeLock();
            stopSelf();
            Log.d(TAG, "Stopped alert by user action (gen " + myGen + ")");
            return START_NOT_STICKY;
        }

        final int myGen = ++generation;
        tearDownMediaAndTts();
        mainHandler.removeCallbacksAndMessages(null);

        if (intent != null) {
            String t = intent.getStringExtra(EXTRA_TITLE);
            String b = intent.getStringExtra(EXTRA_BODY);
            String s = intent.getStringExtra(EXTRA_SPEECH_TEXT);
            String l = intent.getStringExtra(EXTRA_TTS_LANG);
            if (!TextUtils.isEmpty(t)) currentTitle = t;
            if (!TextUtils.isEmpty(b)) currentBody = b;
            currentSpeechText = s != null ? s : "";
            currentTtsLang = !TextUtils.isEmpty(l) ? l : "hi-IN";
        } else {
            HunterCopyGenerator.HunterState st = HunterCopyGenerator.loadState(this);
            HunterCopyGenerator.LiveCopy copy = HunterCopyGenerator.computeLiveCopy(st, false);
            currentTitle = copy.title;
            currentBody = copy.body;
            currentSpeechText = copy.speechText;
            currentTtsLang = copy.ttsLang;
        }

        boolean playAlarm = intent == null || intent.getBooleanExtra(EXTRA_PLAY_ALARM, true);
        currentPlayAlarm = playAlarm;

        // 1. Immediately promote to Foreground so Android never throws ForegroundServiceDidNotStartInTimeException
        Notification activeNotif = HunterAlarmScheduler.buildRichNotification(
            this,
            HunterAlarmScheduler.CHANNEL_PUSH_SILENT,
            currentTitle,
            currentBody,
            true,
            true,
            false
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                HunterAlarmScheduler.NOTIF_ALERT_ID,
                activeNotif,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(HunterAlarmScheduler.NOTIF_ALERT_ID, activeNotif);
        }

        // 2. WakeLock + AudioFocus + Maximize ALARM volume
        acquireWakeLock();
        requestAudioFocusAndBoostVolume();

        chimeFinished = !playAlarm;
        ttsReady = TextUtils.isEmpty(currentSpeechText);
        hasSpoken = false;
        triedDefaultEngine = false;

        // Global 35s safety timeout (opening chime + full TTS + closing outro chime)
        mainHandler.postDelayed(() -> finishAndStop(myGen), 35_000L);

        // 3. Start loud opening chime & initialize Google TTS in parallel
        if (playAlarm) {
            playRawChime(myGen, R.raw.hunter_alert, () -> {
                chimeFinished = true;
                mainHandler.postDelayed(() -> maybeStartSpeech(myGen), 160L);
            });
        }

        if (!TextUtils.isEmpty(currentSpeechText)) {
            initTtsEngine(myGen, isPackageInstalled("com.google.android.tts") ? "com.google.android.tts" : null);
        } else if (!playAlarm) {
            finishAndStop(myGen);
        }

        return START_NOT_STICKY;
    }

    private void playRawChime(final int myGen, final int rawResId, final Runnable onDoneCallback) {
        if (myGen != generation) return;
        releaseMediaPlayerOnly();

        final boolean[] completed = {false};
        final Runnable completeOnce = () -> {
            if (myGen != generation || completed[0]) return;
            completed[0] = true;
            releaseMediaPlayerOnly();
            onDoneCallback.run();
        };

        try {
            AssetFileDescriptor afd = getResources().openRawResourceFd(rawResId);
            if (afd == null) {
                completeOnce.run();
                return;
            }

            AudioAttributes chimeAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(chimeAttrs);
            mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            mediaPlayer.setVolume(1.0f, 1.0f);

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "Chime completed cleanly (res=" + rawResId + ")");
                completeOnce.run();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.w(TAG, "MediaPlayer chime error: " + what + "/" + extra);
                completeOnce.run();
                return true;
            });

            mediaPlayer.prepare();
            mediaPlayer.start();

            // Safety chime timeout (2.8s)
            mainHandler.postDelayed(() -> {
                if (myGen == generation && !completed[0]) {
                    Log.d(TAG, "Chime safety timer triggered (res=" + rawResId + ")");
                    completeOnce.run();
                }
            }, 2800L);

        } catch (Exception e) {
            Log.e(TAG, "Failed to play chime: " + e.getMessage());
            completeOnce.run();
        }
    }

    private void initTtsEngine(final int myGen, @Nullable final String enginePackage) {
        if (myGen != generation) return;
        try {
            TextToSpeech.OnInitListener listener = status -> {
                if (myGen != generation) return;
                if (status == TextToSpeech.SUCCESS) {
                    configureTtsAndMarkReady(myGen);
                } else {
                    Log.w(TAG, "TTS init failed (" + enginePackage + ") status=" + status);
                    if (enginePackage != null && !triedDefaultEngine) {
                        triedDefaultEngine = true;
                        releaseTtsOnly();
                        initTtsEngine(myGen, null);
                    } else {
                        finishIfNoSpeech(myGen);
                    }
                }
            };

            if (enginePackage != null) {
                tts = new TextToSpeech(getApplicationContext(), listener, enginePackage);
            } else {
                tts = new TextToSpeech(getApplicationContext(), listener);
            }
        } catch (Exception e) {
            Log.e(TAG, "TTS constructor failed: " + e.getMessage());
            if (enginePackage != null && !triedDefaultEngine) {
                triedDefaultEngine = true;
                initTtsEngine(myGen, null);
            } else {
                finishIfNoSpeech(myGen);
            }
        }
    }

    private void configureTtsAndMarkReady(final int myGen) {
        if (myGen != generation || tts == null) return;
        try {
            Locale targetLocale = resolveLocale(currentTtsLang);
            int langStatus = tts.setLanguage(targetLocale);
            if (langStatus == TextToSpeech.LANG_MISSING_DATA || langStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
                if ("mr".equalsIgnoreCase(targetLocale.getLanguage())) {
                    targetLocale = new Locale("hi", "IN");
                } else if ("en".equalsIgnoreCase(targetLocale.getLanguage())) {
                    targetLocale = Locale.ENGLISH;
                }
                tts.setLanguage(targetLocale);
            }
            tts.setSpeechRate(0.92f);
            tts.setPitch(1.0f);

            Voice bestVoice = selectBestIndianVoice(tts, targetLocale);
            if (bestVoice != null) {
                tts.setVoice(bestVoice);
                Log.d(TAG, "Selected TTS voice: " + bestVoice.getName() + " (offline=" + !bestVoice.isNetworkConnectionRequired() + ")");
            }

            AudioAttributes ttsAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            tts.setAudioAttributes(ttsAttrs);

            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {}

                @Override
                public void onDone(String utteranceId) {
                    mainHandler.post(() -> onSpeechCompletedPlayOutro(myGen));
                }

                @Override
                @SuppressWarnings("deprecation")
                public void onError(String utteranceId) {
                    mainHandler.post(() -> finishAndStop(myGen));
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    Log.w(TAG, "TTS utterance error code=" + errorCode);
                    mainHandler.post(() -> finishAndStop(myGen));
                }
            });

            ttsReady = true;
            maybeStartSpeech(myGen);
        } catch (Exception e) {
            Log.e(TAG, "Error configuring TTS: " + e.getMessage());
            finishIfNoSpeech(myGen);
        }
    }

    private void maybeStartSpeech(final int myGen) {
        if (myGen != generation || hasSpoken) return;
        if (!chimeFinished || !ttsReady) return;

        if (TextUtils.isEmpty(currentSpeechText) || tts == null) {
            finishAndStop(myGen);
            return;
        }

        hasSpoken = true;
        try {
            Bundle params = new Bundle();
            params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_ALARM);
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
            String utteranceId = "hunter_utt_" + System.currentTimeMillis();
            int res = tts.speak(currentSpeechText, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
            if (res == TextToSpeech.ERROR) {
                Log.w(TAG, "tts.speak returned ERROR");
                finishAndStop(myGen);
            }
        } catch (Exception e) {
            Log.e(TAG, "tts.speak exception: " + e.getMessage());
            finishAndStop(myGen);
        }
    }

    private void onSpeechCompletedPlayOutro(final int myGen) {
        if (myGen != generation) return;
        releaseTtsOnly();
        if (currentPlayAlarm) {
            mainHandler.postDelayed(() -> {
                if (myGen == generation) {
                    playRawChime(myGen, R.raw.hunter_outro, () -> finishAndStop(myGen));
                }
            }, 180L);
        } else {
            finishAndStop(myGen);
        }
    }

    private void finishIfNoSpeech(final int myGen) {
        if (chimeFinished) {
            finishAndStop(myGen);
        } else {
            // Let opening chime finish playing, then stop
            ttsReady = true;
        }
    }

    private void finishAndStop(final int myGen) {
        if (myGen != generation) return;
        ++generation; // prevent re-entry
        mainHandler.removeCallbacksAndMessages(null);
        tearDownMediaAndTts();
        restoreVolumeAndFocus();
        detachFinalNotification();
        releaseWakeLock();
        stopSelf();
    }

    private void detachFinalNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                Notification finalNotif = HunterAlarmScheduler.buildRichNotification(
                    this,
                    HunterAlarmScheduler.CHANNEL_PUSH_SILENT,
                    currentTitle,
                    currentBody,
                    false,
                    false,
                    true
                );
                nm.notify(HunterAlarmScheduler.NOTIF_ALERT_ID, finalNotif);
            }
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
        } catch (Exception e) {
            Log.w(TAG, "Detach notification warning: " + e.getMessage());
            try {
                ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
            } catch (Exception ignored) {}
        }
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "HunterFund:AlertServiceLock");
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(38_000L);
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock acquire warning: " + e.getMessage());
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void requestAudioFocusAndBoostVolume() {
        if (audioManager == null) return;
        try {
            AudioAttributes focusAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(focusAttrs)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(focusChange -> {})
                    .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                legacyFocusListener = focusChange -> {};
                audioManager.requestAudioFocus(
                    legacyFocusListener,
                    AudioManager.STREAM_ALARM,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                );
            }
        } catch (Exception ignored) {}

        // Boost STREAM_ALARM cleanly to max volume so chime & TTS ring loud and clear
        try {
            if (!hasSavedAlarmVol) {
                savedAlarmVol = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                hasSavedAlarmVol = true;
            }
            int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            if (maxVol > 0) {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Cannot adjust STREAM_ALARM volume (DND policy): " + se.getMessage());
        } catch (Exception ignored) {}
    }

    private void restoreVolumeAndFocus() {
        if (audioManager == null) return;
        try {
            if (hasSavedAlarmVol && savedAlarmVol >= 0) {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVol, 0);
            }
        } catch (Exception ignored) {
        } finally {
            hasSavedAlarmVol = false;
            savedAlarmVol = -1;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            } else if (legacyFocusListener != null) {
                audioManager.abandonAudioFocus(legacyFocusListener);
                legacyFocusListener = null;
            }
        } catch (Exception ignored) {}
    }

    private void tearDownMediaAndTts() {
        releaseMediaPlayerOnly();
        releaseTtsOnly();
    }

    private void releaseMediaPlayerOnly() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
            } catch (Exception ignored) {}
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
    }

    private void releaseTtsOnly() {
        if (tts != null) {
            try {
                tts.stop();
            } catch (Exception ignored) {}
            try {
                tts.shutdown();
            } catch (Exception ignored) {}
            tts = null;
        }
    }

    private Locale resolveLocale(String ttsLang) {
        String prefix = ttsLang != null ? ttsLang.toLowerCase(Locale.US).split("-")[0] : "hi";
        switch (prefix) {
            case "mr":
                return new Locale("mr", "IN");
            case "en":
                return new Locale("en", "IN");
            default:
                return new Locale("hi", "IN");
        }
    }

    @Nullable
    private Voice selectBestIndianVoice(TextToSpeech engine, Locale targetLocale) {
        Set<Voice> voices;
        try {
            voices = engine.getVoices();
        } catch (Exception e) {
            return null;
        }
        if (voices == null || voices.isEmpty()) return null;

        String targetLang = targetLocale.getLanguage().toLowerCase(Locale.US);
        String targetCountry = targetLocale.getCountry().toLowerCase(Locale.US);

        Voice best = null;
        int bestScore = Integer.MIN_VALUE;

        for (Voice v : voices) {
            if (v == null || v.getLocale() == null) continue;
            String vLang = v.getLocale().getLanguage().toLowerCase(Locale.US);
            if (!vLang.equals(targetLang)) continue;

            int score = 100;
            String vCountry = v.getLocale().getCountry().toLowerCase(Locale.US);
            if (vCountry.equals(targetCountry)) score += 60;

            // Strongly prefer local offline neural voices so background Doze mode never fails on network
            if (!v.isNetworkConnectionRequired()) {
                score += 50;
            }

            if (v.getQuality() >= Voice.QUALITY_VERY_HIGH) score += 30;
            else if (v.getQuality() >= Voice.QUALITY_HIGH) score += 20;

            String name = v.getName().toLowerCase(Locale.US);
            if (name.contains("hia") || name.contains("hie") || name.contains("hif")
                || name.contains("mrb") || name.contains("mre")
                || name.contains("ena") || name.contains("enc") || name.contains("ene")
                || name.contains("female") || name.contains("neural") || name.contains("local")) {
                score += 25;
            }
            if (name.contains("hid") || name.contains("hic") || name.contains("enb") || name.contains("male")) {
                score -= 10;
            }

            if (score > bestScore) {
                bestScore = score;
                best = v;
            }
        }
        return best;
    }

    private boolean isPackageInstalled(String packageName) {
        try {
            getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @Override
    public void onDestroy() {
        ++generation;
        mainHandler.removeCallbacksAndMessages(null);
        tearDownMediaAndTts();
        restoreVolumeAndFocus();
        releaseWakeLock();
        super.onDestroy();
    }
}

