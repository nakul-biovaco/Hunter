package com.capacitorjs.plugins.localnotifications

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.getcapacitor.JSObject
import com.getcapacitor.Logger
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Creates a notification from a timer event. Registered as a broadcast receiver
 * in AndroidManifest.
 * 
 * Enhanced with Native Background Text-to-Speech:
 * Plays loud alarm chime followed by natural Indian voice alerts for Leena Mundhada
 * even when the app is swiped away from Recents, background killed, or device is locked.
 */
class TimedNotificationPublisher : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification: Notification? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(NOTIFICATION_KEY, Notification::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(NOTIFICATION_KEY)
        }
        if (notification == null) return

        notification.`when` = System.currentTimeMillis()

        val id = intent.getIntExtra(LocalNotificationManager.NOTIFICATION_INTENT_KEY, Int.MIN_VALUE)
        if (id == Int.MIN_VALUE) {
            Logger.error(Logger.tags("LN"), "No valid id supplied", null)
        }
        val storage = NotificationStorage(context)
        val notificationJson = storage.getSavedNotificationAsJSObject(id.toString())
        LocalNotificationsPlugin.fireReceived(notificationJson)
        
        // 1. Post notification banner (triggers loud hunter_alert.wav chime)
        notificationManager.notify(id, notification)
        
        // 2. Speak dynamic alert in background even if app is closed/killed
        speakNativeAlert(context, notificationJson)
        
        rescheduleNotificationIfNeeded(context, intent, id)
    }

    /**
     * Speaks dynamic alert with live amounts in Indian accent using native Android TTS.
     * Uses goAsync() and Partial WakeLock to ensure audio completes reliably even when killed or locked.
     */
    private fun speakNativeAlert(context: Context, notificationJson: JSObject?) {
        val extra = notificationJson?.optJSONObject("extra")
        val speechText = extra?.optString("speechText", null) ?: notificationJson?.optString("body", null)
        if (speechText.isNullOrBlank()) return

        val ttsLang = extra?.optString("ttsLang", "hi-IN") ?: "hi-IN"
        val pendingResult = goAsync()
        val appContext = context.applicationContext

        // Keep CPU awake while TTS finishes speaking
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "HunterFund:TTSWakeLock")
        try {
            wakeLock?.acquire(15000)
        } catch (e: Exception) {
            Logger.warn("HunterTTS", "Failed to acquire wake lock: ${e.message}")
        }

        val handler = Handler(Looper.getMainLooper())

        // Delay 1200ms so the 1.8s loud alarm chime plays first without overlap
        handler.postDelayed({
            var tts: TextToSpeech? = null
            var isFinished = false

            val finishCleanup = Runnable {
                if (!isFinished) {
                    isFinished = true
                    try {
                        tts?.stop()
                        tts?.shutdown()
                    } catch (e: Exception) {}
                    try {
                        if (wakeLock?.isHeld == true) {
                            wakeLock.release()
                        }
                    } catch (e: Exception) {}
                    try {
                        pendingResult.finish()
                    } catch (e: Exception) {}
                }
            }

            // 15 seconds safety timeout
            handler.postDelayed(finishCleanup, 14000)

            try {
                tts = TextToSpeech(appContext) { status ->
                    if (status == TextToSpeech.SUCCESS) {
                        try {
                            val locale = when (ttsLang.lowercase().split("-").firstOrNull()) {
                                "mr" -> Locale("mr", "IN")
                                "en" -> Locale("en", "IN")
                                else -> Locale("hi", "IN")
                            }
                            tts?.language = locale
                            tts?.setSpeechRate(0.90f)
                            tts?.setPitch(1.0f)

                            val voices = tts?.voices
                            if (voices != null) {
                                val langTag = locale.toLanguageTag().lowercase()
                                val langPrefix = locale.language.lowercase()
                                val bestVoice = voices.firstOrNull { v ->
                                    val vLang = v.locale?.toLanguageTag()?.lowercase() ?: ""
                                    val vName = v.name.lowercase()
                                    (vLang == langTag || vLang.startsWith(langPrefix)) &&
                                    (vName.contains("network") || vName.contains("neural") || vName.contains("local") || vName.contains("female"))
                                } ?: voices.firstOrNull { v ->
                                    val vLang = v.locale?.toLanguageTag()?.lowercase() ?: ""
                                    vLang == langTag || vLang.startsWith(langPrefix)
                                }
                                if (bestVoice != null) {
                                    tts?.voice = bestVoice
                                }
                            }

                            // Route through ALARM stream for loud and clear playback
                            val audioAttributes = android.media.AudioAttributes.Builder()
                                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                            tts?.setAudioAttributes(audioAttributes)

                            val params = android.os.Bundle()
                            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
                            val utteranceId = "hunter_tts_" + System.currentTimeMillis()

                            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                                override fun onStart(utteranceId: String?) {}
                                override fun onDone(utteranceId: String?) {
                                    handler.post(finishCleanup)
                                }
                                override fun onError(utteranceId: String?) {
                                    handler.post(finishCleanup)
                                }
                            })

                            tts?.speak(speechText, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
                        } catch (e: Exception) {
                            Logger.error("HunterTTS", "TTS speak error: ${e.message}", e)
                            handler.post(finishCleanup)
                        }
                    } else {
                        Logger.warn("HunterTTS", "TTS init failed with status: $status")
                        handler.post(finishCleanup)
                    }
                }
            } catch (e: Exception) {
                Logger.error("HunterTTS", "TTS constructor error: ${e.message}", e)
                handler.post(finishCleanup)
            }
        }, 1200)
    }

    private fun rescheduleNotificationIfNeeded(context: Context, intent: Intent, id: Int): Boolean {
        val dateString = intent.getStringExtra(CRON_KEY) ?: return false

        val date = DateMatch.fromMatchString(dateString)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val trigger = date.nextTrigger(Date())
        val clone = intent.clone() as Intent
        var flags = PendingIntent.FLAG_CANCEL_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags = flags or PendingIntent.FLAG_MUTABLE
        }
        val pendingIntent = PendingIntent.getBroadcast(context, id, clone, flags)
        val storedNotification = NotificationStorage(context).getSavedNotificationAsJSObject(id.toString())
        val wantsExact = storedNotification?.getBoolean("isExactNotification", true) ?: true
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        if (wantsExact && canExact) {
            alarmManager.setExact(AlarmManager.RTC, trigger, pendingIntent)
        } else {
            if (wantsExact) {
                Logger.warn("Capacitor/LocalNotification", "Exact alarms not allowed in user settings.  Notification scheduled with non-exact alarm.")
            }
            alarmManager.set(AlarmManager.RTC, trigger, pendingIntent)
        }
        val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm:ss")
        Logger.debug(Logger.tags("LN"), "notification " + id + " will next fire at " + sdf.format(Date(trigger)))
        return true
    }

    companion object {
        const val NOTIFICATION_KEY = "NotificationPublisher.notification"
        const val CRON_KEY = "NotificationPublisher.cron"
    }
}

