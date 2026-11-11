// Native Notification & Dynamic Multi-Language Voice Manager for Hunter Fund
// Uses custom native HunterAlarm Engine (AlarmClock + ForegroundService + Google Neural TTS)
// Supports: English, Hinglish, Hindi, Marathi addressed to Leena Mundhada

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { HunterAlarm, BackgroundStatus, ReminderSyncPayload } from './hunter-alarm-plugin';
import { getTodayString } from './formatters';

const HOURLY_REMINDER_BASE_ID = 1000;
export const NOTIFICATION_CHANNEL_ID = 'hunter_alarm_fallback_v5';
export const NOTIFICATION_SOUND = 'hunter_alert.wav';

export type VoiceLanguage = 'english' | 'hinglish' | 'hindi' | 'marathi';

export interface SmartNotificationData {
  neededToday: number;
  todayPlannedSavings: number;
  todayActualSavings: number;
  remainingAmount?: number;
  currentBalance?: number;
  targetAmount?: number;
  daysRemaining?: number;
  targetDate?: string;
  bikeModel?: string;
  userName?: string;
  language?: VoiceLanguage;
}

let legacyCapacitorAlarmsCleared = false;

/**
 * Check if running on a native platform (Android/iOS)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request notification permissions on native platform
 */
export async function requestNativePermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const status = await HunterAlarm.requestNotificationPermission();
    if (status.notificationsEnabled) return true;
  } catch {}

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (err) {
    console.error('Failed to request native notification permissions:', err);
    return false;
  }
}

/**
 * Check current native notification permission status
 */
export async function checkNativePermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const status = await HunterAlarm.getBackgroundStatus();
    return status.notificationsEnabled;
  } catch {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch {
      return false;
    }
  }
}

export async function getNativeBackgroundStatus(): Promise<BackgroundStatus | null> {
  if (!isNativePlatform()) return null;
  try {
    return await HunterAlarm.getBackgroundStatus();
  } catch {
    return null;
  }
}

export async function requestNativeBatteryUnrestricted(): Promise<BackgroundStatus | null> {
  if (!isNativePlatform()) return null;
  try {
    return await HunterAlarm.requestBatteryOptimizationExemption();
  } catch {
    return null;
  }
}

export async function openNativeExactAlarmSettings(): Promise<BackgroundStatus | null> {
  if (!isNativePlatform()) return null;
  try {
    return await HunterAlarm.openExactAlarmSettings();
  } catch {
    return null;
  }
}

export async function openNativeNotificationSettings(): Promise<BackgroundStatus | null> {
  if (!isNativePlatform()) return null;
  try {
    return await HunterAlarm.openAppNotificationSettings();
  } catch {
    return null;
  }
}

/**
 * Setup notification channel cleanup for older deprecated channel IDs
 */
export async function setupNativeNotificationChannel(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    for (const oldId of ['hunter_reminders', 'hunter_custom_alert_v1', 'hunter_alarm_voice_v3', 'hunter_alarm_v4']) {
      try {
        await LocalNotifications.deleteChannel({ id: oldId });
      } catch {}
    }
  } catch {}
}

/**
 * Generates personalized, multi-lingual smart notification copy addressed to Leena Mundhada
 */
export function generateSmartNotificationCopy(data: SmartNotificationData) {
  const needed = Math.max(0, Math.round(data.neededToday));
  const planned = Math.max(0, Math.round(data.todayPlannedSavings));
  const actual = Math.max(0, Math.round(data.todayActualSavings));
  const remaining = Math.max(0, Math.round(data.remainingAmount ?? 78000));
  const days = Math.max(0, Math.round(data.daysRemaining ?? 61));
  const lang = data.language || 'hinglish';

  let title = '';
  let body = '';
  let speechText = '';
  let ttsLang = 'hi-IN';

  switch (lang) {
    case 'hindi':
      ttsLang = 'hi-IN';
      if (remaining <= 0) {
        title = `बधाई हो लीना जी! हंटर 350 लक्ष्य पूरा हो गया`;
        body = `नमस्ते लीना मूंधड़ा जी! आपने ₹${planned.toLocaleString('en-IN')} का पूरा बचत लक्ष्य हासिल कर लिया है।`;
        speechText = `बधाई हो लीना मूंधड़ा जी! आपकी रॉयल एनफील्ड हंटर 350 का पूरा बचत लक्ष्य पूरा हो चुका है।`;
      } else if (actual > 0) {
        title = `लीना जी, ₹${needed.toLocaleString('en-IN')} आज और जमा करें — हंटर 350`;
        body = `नमस्ते लीना मूंधड़ा जी! आज ₹${actual.toLocaleString('en-IN')} जमा किए हैं, लक्ष्य ₹${planned.toLocaleString('en-IN')} है। कुल ₹${remaining.toLocaleString('en-IN')} बाकी हैं (${days} दिन शेष)।`;
        speechText = `नमस्ते लीना मूंधड़ा जी! हंटर फंड रिमाइंडर। आज आपने ${actual} रुपये जमा किए हैं। आज का लक्ष्य पूरा करने के लिए ${needed} रुपये और जमा करें। आपकी हंटर 350 के लिए कुल ${remaining} रुपये बाकी हैं।`;
      } else {
        title = `लीना जी, आज ₹${needed.toLocaleString('en-IN')} जमा करें — हंटर 350`;
        body = `नमस्ते लीना मूंधड़ा जी! आज का बचत लक्ष्य ₹${planned.toLocaleString('en-IN')} है। हंटर 350 के लिए कुल ₹${remaining.toLocaleString('en-IN')} शेष हैं (${days} दिन शेष)। अपनी बचत दर्ज करें!`;
        speechText = `नमस्ते लीना मूंधड़ा जी! हंटर फंड रिमाइंडर। आज का बचत लक्ष्य ${planned} रुपये है। अभी शून्य रुपये जमा हुए हैं। आपकी हंटर 350 के लिए कुल ${remaining} रुपये बाकी हैं। कृपया अपनी बचत दर्ज करें।`;
      }
      break;

    case 'marathi':
      ttsLang = 'mr-IN';
      if (remaining <= 0) {
        title = `अभिनंदन लीना ताई! हंटर 350 उद्दिष्ट पूर्ण झाले`;
        body = `नमस्कार लीना मुंढडा ताई! आपले हंटर 350 साठीचे संपूर्ण बचत उद्दिष्ट पूर्ण झाले आहे.`;
        speechText = `अभिनंदन लीना मुंढडा ताई! आपल्या रॉयल एनफील्ड हंटर 350 चे संपूर्ण बचत उद्दिष्ट पूर्ण झाले आहे.`;
      } else if (actual > 0) {
        title = `लीना ताई, ₹${needed.toLocaleString('en-IN')} आज जमा करायचे बाकी — हंटर 350`;
        body = `नमस्कार लीना मुंढडा ताई! आज ₹${actual.toLocaleString('en-IN')} जमा केले, उद्दिष्ट ₹${planned.toLocaleString('en-IN')} आहे. एकूण ₹${remaining.toLocaleString('en-IN')} शिल्लक आहेत (${days} दिवस उरले).`;
        speechText = `नमस्कार लीना मुंढडा ताई! हंटर फंड रिमाइंडर. आज आपण ${actual} रुपये जमा केले आहेत. आजचे उद्दिष्ट गाठण्यासाठी ${needed} रुपये जमा करायचे बाकी आहेत. आपल्या हंटर 350 साठी एकूण ${remaining} रुपये शिल्लक आहेत.`;
      } else {
        title = `लीना ताई, आज ₹${needed.toLocaleString('en-IN')} जमा करा — हंटर 350`;
        body = `नमस्कार लीना मुंढडा ताई! आजचे बचतीचे उद्दिष्ट ₹${planned.toLocaleString('en-IN')} आहे. हंटर 350 साठी एकूण ₹${remaining.toLocaleString('en-IN')} शिल्लक आहेत (${days} दिवस उरले). आजची बचत नोंदवा!`;
        speechText = `नमस्कार लीना मुंढडा ताई! हंटर फंड रिमाइंडर. आजचे बचतीचे उद्दिष्ट ${planned} रुपये आहे. आपल्या हंटर 350 साठी एकूण ${remaining} रुपये शिल्लक आहेत. कृपया आजची बचत नोंदवा.`;
      }
      break;

    case 'english':
      ttsLang = 'en-IN';
      if (remaining <= 0) {
        title = `Congratulations Leena! Hunter 350 Goal Achieved`;
        body = `Hello Leena Mundhada! Your complete savings goal for Royal Enfield Hunter 350 is ready!`;
        speechText = `Congratulations Leena Mundhada! You have achieved your complete savings goal for the Royal Enfield Hunter 350.`;
      } else if (actual > 0) {
        title = `Leena, ₹${needed.toLocaleString('en-IN')} More Needed Today — Hunter 350`;
        body = `Hello Leena Mundhada! You saved ₹${actual.toLocaleString('en-IN')} of ₹${planned.toLocaleString('en-IN')} today. ₹${remaining.toLocaleString('en-IN')} left for Hunter 350 (${days}d left to 10 Jan 2027).`;
        speechText = `Hello Leena Mundhada! Hunter Fund alert. You have saved ${actual} rupees today. You need ${needed} more rupees to hit your daily goal of ${planned} rupees. Total remaining for your Hunter 350 is ${remaining} rupees.`;
      } else {
        title = `Leena, ₹${needed.toLocaleString('en-IN')} Deposit Required Today — Hunter 350`;
        body = `Hello Leena Mundhada! Today's target: ₹${planned.toLocaleString('en-IN')} (Saved: ₹0) • ₹${remaining.toLocaleString('en-IN')} balance remaining (${days}d left). Tap to record deposit!`;
        speechText = `Hello Leena Mundhada! Hunter Fund alert. Today's required deposit is ${planned} rupees. Zero rupees saved today. Total remaining for your Hunter 350 is ${remaining} rupees. Record your deposit now.`;
      }
      break;

    case 'hinglish':
    default:
      ttsLang = 'hi-IN';
      if (remaining <= 0) {
        title = `बधाई हो लीना जी! Hunter 350 Target Complete`;
        body = `Hello Leena Mundhada ji! Aapne Hunter 350 ka poora savings goal complete kar liya hai!`;
        speechText = `बधाई हो लीना मूंधड़ा जी! आपने अपनी हंटर 350 का पूरा बचत लक्ष्य पूरा कर लिया है।`;
      } else if (actual > 0) {
        title = `लीना जी, ₹${needed.toLocaleString('en-IN')} आज जमा करना बाकी है — Hunter 350`;
        body = `Hello Leena Mundhada ji! Aaj ₹${actual.toLocaleString('en-IN')} save hua hai (Target: ₹${planned.toLocaleString('en-IN')}). Total ₹${remaining.toLocaleString('en-IN')} bache hain (${days} din bache). Tap karke deposit karein!`;
        speechText = `हेलो लीना मूंधड़ा जी! हंटर फंड अलर्ट। आज आपने ${actual} रुपये जमा किए हैं। आज का लक्ष्य पूरा करने के लिए ${needed} रुपये और जमा करें। हंटर 350 के लिए कुल ${remaining} रुपये बाकी हैं।`;
      } else {
        title = `लीना जी, ₹${needed.toLocaleString('en-IN')} आज जमा करना है — Hunter 350`;
        body = `Hello Leena Mundhada ji! Aaj ka savings target ₹${planned.toLocaleString('en-IN')} hai. Hunter 350 ke liye kul ₹${remaining.toLocaleString('en-IN')} bache hain (${days} din bache). Jaldi se apna deposit record karein!`;
        speechText = `हेलो लीना मूंधड़ा जी! हंटर फंड अलर्ट। आज का बचत लक्ष्य ${planned} रुपये है। हंटर 350 के लिए कुल ${remaining} रुपये बाकी हैं। जल्दी से अपनी आज की बचत दर्ज करें।`;
      }
      break;
  }

  return { title, body, speechText, ttsLang, needed, planned, actual, remaining, days };
}

/**
 * Finds the highest quality neural or natural voice index for web/plugin TTS fallback
 */
async function findBestVoiceIndex(langCode: string): Promise<number | undefined> {
  try {
    const res = await TextToSpeech.getSupportedVoices();
    if (!res || !res.voices || res.voices.length === 0) return undefined;

    const langTarget = langCode.toLowerCase().replace('_', '-');
    const langPrefix = langTarget.split('-')[0];

    const p1 = res.voices.findIndex((v) => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      const vName = (v.name || '').toLowerCase();
      const matchesLang = vLang === langTarget || vLang.startsWith(langPrefix);
      const isHighQuality =
        vName.includes('network') ||
        vName.includes('neural') ||
        vName.includes('local') ||
        vName.includes('female');
      return matchesLang && isHighQuality;
    });
    if (p1 >= 0) return p1;

    const p2 = res.voices.findIndex((v) => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang === langTarget || vLang.startsWith(langPrefix);
    });
    if (p2 >= 0) return p2;
  } catch {}
  return undefined;
}

/**
 * Speaks the personalized message on Web browser fallback.
 * Note: On native Android, HunterAlertService ForegroundService speaks natively at MAX volume.
 */
export async function speakDynamicAlert(data: SmartNotificationData): Promise<void> {
  const { speechText, ttsLang } = generateSmartNotificationCopy(data);

  if (isNativePlatform()) {
    try {
      await TextToSpeech.stop();
      const voiceIdx = await findBestVoiceIndex(ttsLang);
      await TextToSpeech.speak({
        text: speechText,
        lang: ttsLang,
        rate: 0.92,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
        voice: voiceIdx,
      });
      return;
    } catch (err) {
      console.warn('Native TextToSpeech plugin fallback error:', err);
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = ttsLang.split('-')[0];
      const matchedVoice = voices.find((v) => {
        const vLang = (v.lang || '').toLowerCase();
        return vLang.includes(langPrefix) || vLang.includes('in');
      });
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.lang = ttsLang;
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Browser SpeechSynthesis fallback error:', err);
    }
  }
}

function buildSyncPayload(
  options: SmartNotificationData & {
    enabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: number;
    quietHoursEnd?: number;
  }
): ReminderSyncPayload {
  return {
    enabled: options.enabled,
    quietHoursEnabled: options.quietHoursEnabled,
    quietStartHour: options.quietHoursStart ?? 23,
    quietEndHour: options.quietHoursEnd ?? 8,
    voiceLanguage: options.language || 'hinglish',
    targetAmount: Math.round(options.targetAmount ?? 130000),
    currentBalance: Math.round(options.currentBalance ?? 52000),
    remainingAmount: Math.round(options.remainingAmount ?? 78000),
    targetDate: options.targetDate || '2027-01-10',
    syncedDate: getTodayString(),
    todayActualSavings: Math.round(options.todayActualSavings),
    todayPlannedSavings: Math.round(options.todayPlannedSavings),
    daysRemaining: Math.round(options.daysRemaining ?? 61),
    bikeModel: options.bikeModel || 'Royal Enfield Hunter 350',
  };
}

/**
 * Syncs full live savings state & preferences into Android Native HunterAlarm Engine.
 * Re-arms persistent AlarmClock hourly chain that survives app kill, Doze, and midnight rollovers.
 */
export async function syncNativeReminderEngine(
  options: SmartNotificationData & {
    enabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: number;
    quietHoursEnd?: number;
  }
): Promise<BackgroundStatus | null> {
  if (!isNativePlatform()) return null;

  try {
    if (!legacyCapacitorAlarmsCleared) {
      legacyCapacitorAlarmsCleared = true;
      await cancelHourlyReminders();
      await setupNativeNotificationChannel();
    }

    const payload = buildSyncPayload(options);
    return await HunterAlarm.syncReminderState(payload);
  } catch (err) {
    console.error('Failed to sync native HunterAlarm engine:', err);
    return null;
  }
}

/**
 * Triggers an immediate loud alarm chime + natural voice push notification through HunterAlertService
 */
export async function triggerNativeDepositAlert(options: SmartNotificationData): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      await requestNativePermission();
    }

    const copy = generateSmartNotificationCopy(options);
    await HunterAlarm.triggerTestNow({
      ...buildSyncPayload({ ...options, enabled: true, quietHoursEnabled: true }),
      title: copy.title,
      body: copy.body,
      speechText: copy.speechText,
      ttsLang: copy.ttsLang,
      playAlarm: true,
    });
    return true;
  } catch (err) {
    console.error('Native immediate alert error:', err);
    return false;
  }
}

/**
 * Send an immediate native custom alert (used for tests / milestones)
 */
export async function sendNativeNotification(options: {
  id?: number;
  title: string;
  body: string;
  speechText?: string;
  ttsLang?: string;
  playAlarm?: boolean;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      await requestNativePermission();
    }

    await HunterAlarm.triggerCustomAlert({
      title: options.title,
      body: options.body,
      speechText: options.speechText ?? '',
      ttsLang: options.ttsLang ?? 'hi-IN',
      playAlarm: options.playAlarm ?? true,
    });
    return true;
  } catch (err) {
    console.error('Native notification error:', err);
    return false;
  }
}

/**
 * Schedule a background test notification via AlarmClock + HunterAlertService.
 * Fires even if the user closes/kills the app from Recents or locks the phone.
 */
export async function scheduleNativeBackgroundTest(
  options: SmartNotificationData & { delaySeconds: number }
): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      const granted = await requestNativePermission();
      if (!granted) return false;
    }

    await HunterAlarm.scheduleBackgroundTest({
      ...buildSyncPayload({ ...options, enabled: true, quietHoursEnabled: true }),
      delaySeconds: options.delaySeconds,
    });

    return true;
  } catch (err) {
    console.error('Native test schedule error:', err);
    return false;
  }
}

/**
 * Schedule hourly native notifications (delegated to persistent HunterAlarm native engine)
 */
export async function scheduleHourlyReminders(
  options: SmartNotificationData & {
    quietHoursEnabled: boolean;
    quietHoursStart: number;
    quietHoursEnd: number;
  }
): Promise<boolean> {
  const status = await syncNativeReminderEngine({
    ...options,
    enabled: true,
  });
  return status !== null;
}

/**
 * Cancel legacy Capacitor scheduled hourly notifications & stop native hourly alarm
 */
export async function cancelHourlyReminders(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    const hourlyIds = pending.notifications
      .filter((n) => n.id >= HOURLY_REMINDER_BASE_ID && n.id < HOURLY_REMINDER_BASE_ID + 100)
      .map((n) => ({ id: n.id }));

    if (hourlyIds.length > 0) {
      await LocalNotifications.cancel({ notifications: hourlyIds });
    }
  } catch {}
}

/**
 * Send a test notification (native)
 */
export async function sendNativeTestNotification(language: VoiceLanguage = 'hinglish'): Promise<boolean> {
  const langMap: Record<VoiceLanguage, { title: string; body: string; speech: string; tts: string }> = {
    hindi: {
      title: 'हंटर फंड — रिमाइंडर सक्रिय हैं',
      body: 'लीना मूंधड़ा जी, हर घंटे अलार्म और आवाज़ के साथ बचत रिमाइंडर चालू हो गए हैं।',
      speech: 'नमस्ते लीना मूंधड़ा जी! हंटर फंड के हर घंटे वाले रिमाइंडर अब सक्रिय हैं।',
      tts: 'hi-IN',
    },
    marathi: {
      title: 'हंटर फंड — रिमाइंडर सुरू झाले आहेत',
      body: 'लीना मुंढडा ताई, दर तासाला अलार्म आणि आवाजासह बचतीचे रिमाइंडर सुरू झाले आहेत.',
      speech: 'नमस्कार लीना मुंढडा ताई! हंटर फंडचे दर तासाचे रिमाइंडर आता सुरू झाले आहेत.',
      tts: 'mr-IN',
    },
    english: {
      title: 'Hunter Fund — Reminders Active',
      body: 'Leena Mundhada, hourly loud alarm and voice reminders are now active.',
      speech: 'Hello Leena Mundhada! Hourly loud alarm and voice reminders are now active for your Hunter 350.',
      tts: 'en-IN',
    },
    hinglish: {
      title: 'हंटर फंड — Reminders Active हैं',
      body: 'Leena Mundhada ji, har ghante loud alarm aur voice reminders ab active hain. Tap to deposit.',
      speech: 'हेलो लीना मूंधड़ा जी! हंटर फंड के हर घंटे वाले अलार्म और वॉइस रिमाइंडर अब चालू हैं।',
      tts: 'hi-IN',
    },
  };

  const msg = langMap[language] || langMap.hinglish;
  return sendNativeNotification({
    title: msg.title,
    body: msg.body,
    speechText: msg.speech,
    ttsLang: msg.tts,
    playAlarm: true,
  });
}

/**
 * Send a milestone notification (native)
 */
export async function sendNativeMilestoneNotification(
  milestoneAmount: number,
  language: VoiceLanguage = 'hinglish'
): Promise<boolean> {
  const formatted = milestoneAmount.toLocaleString('en-IN');
  const ttsLang = language === 'marathi' ? 'mr-IN' : language === 'english' ? 'en-IN' : 'hi-IN';

  let title = `Milestone Reached — ₹${formatted}`;
  let body = `Badhai ho Leena Mundhada ji! Aapne ₹${formatted} cross kar liye hain Royal Enfield Hunter 350 ke liye.`;
  let speechText = `बधाई हो लीना मूंधड़ा जी! आपने हंटर 350 के लिए ${milestoneAmount} रुपये का माइलस्टोन पार कर लिया है।`;

  if (language === 'marathi') {
    title = `अभिनंदन लीना ताई! ₹${formatted} टप्पा पूर्ण`;
    body = `नमस्कार लीना मुंढडा ताई! आपण हंटर 350 साठी ₹${formatted} बचतीचा टप्पा पार केला आहे.`;
    speechText = `अभिनंदन लीना मुंढडा ताई! आपण हंटर 350 साठी ${milestoneAmount} रुपयांचा टप्पा पार केला आहे.`;
  } else if (language === 'english') {
    body = `Congratulations Leena Mundhada! You crossed ₹${formatted} towards your Royal Enfield Hunter 350.`;
    speechText = `Congratulations Leena Mundhada! You have crossed ${milestoneAmount} rupees towards your Royal Enfield Hunter 350.`;
  }

  return sendNativeNotification({
    title,
    body,
    speechText,
    ttsLang,
    playAlarm: true,
  });
}

/**
 * Send daily reminder notification (native)
 */
export async function sendNativeDailyReminder(dailyTarget: number): Promise<boolean> {
  return sendNativeNotification({
    title: 'Daily Savings Reminder — Hunter 350',
    body: `Leena Mundhada ji, today's target is ₹${dailyTarget.toLocaleString('en-IN')}. Record your deposit to stay on schedule for 10 January 2027.`,
    speechText: `हेलो लीना मूंधड़ा जी! आज का बचत लक्ष्य ${dailyTarget} रुपये है।`,
    ttsLang: 'hi-IN',
    playAlarm: true,
  });
}

/**
 * Register notification tap listeners for both cold-start launch and warm onNewIntent
 */
export async function registerNativeNotificationActions(onQuickDeposit: () => void): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await setupNativeNotificationChannel();

    const pending = await HunterAlarm.consumePendingAction();
    if (pending?.action === 'quick-deposit') {
      onQuickDeposit();
    }

    await HunterAlarm.addListener('hunterQuickDeposit', (data) => {
      if (data?.action === 'quick-deposit') {
        onQuickDeposit();
      }
    });

    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const action = notification.actionId;
      const extra = notification.notification.extra;
      if (action === 'quick-deposit' || action === 'tap' || extra?.action === 'quick-deposit') {
        onQuickDeposit();
      }
    });
  } catch (err) {
    console.error('Failed to register native notification actions:', err);
  }
}
