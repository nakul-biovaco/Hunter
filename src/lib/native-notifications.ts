// Native Notification & Dynamic Multi-Language Voice Manager for Hunter Fund
// Supports: English, Hinglish, Hindi, Marathi addressed to Leena Mundhada

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const HOURLY_REMINDER_BASE_ID = 1000;
const MILESTONE_ID = 2000;
const TEST_ID = 3000;
const DAILY_REMINDER_ID = 4000;
export const NOTIFICATION_CHANNEL_ID = 'hunter_alarm_voice_v3';
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
  bikeModel?: string;
  userName?: string;
  language?: VoiceLanguage;
}

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
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (err) {
    return false;
  }
}

/**
 * Create high-priority Android notification channel with loud alarm chime
 */
export async function setupNativeNotificationChannel(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    try {
      await LocalNotifications.deleteChannel({ id: 'hunter_reminders' });
      await LocalNotifications.deleteChannel({ id: 'hunter_custom_alert_v1' });
    } catch {}

    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Hunter Fund Loud Alarm & Voice Alerts',
      description: 'Loud alarm chime and personalized voice reminders for Leena Mundhada',
      importance: 5, // High: Heads-up pop-up banner + audio
      visibility: 1, // Public on lockscreen
      vibration: true,
      sound: NOTIFICATION_SOUND,
      lights: true,
      lightColor: '#10b981',
    });
  } catch (err) {
    console.warn('Channel creation warning:', err);
  }
}

/**
 * Generates personalized, multi-lingual smart notification copy addressed to Leena Mundhada
 */
export function generateSmartNotificationCopy(data: SmartNotificationData) {
  const needed = Math.round(data.neededToday);
  const planned = Math.round(data.todayPlannedSavings);
  const actual = Math.round(data.todayActualSavings);
  const remaining = Math.round(data.remainingAmount ?? 76000);
  const days = data.daysRemaining ?? 71;
  const lang = data.language || 'hinglish';

  let title = '';
  let body = '';
  let speechText = '';
  let ttsLang = 'en-IN';

  switch (lang) {
    case 'hindi':
      ttsLang = 'hi-IN';
      if (actual > 0) {
        title = `लीना जी, ₹${needed.toLocaleString('en-IN')} आज और जमा करें — हंटर 350`;
        body = `नमस्ते लीना मूंधड़ा जी! आज ₹${actual.toLocaleString('en-IN')} जमा किए हैं, लक्ष्य ₹${planned.toLocaleString('en-IN')} है। कुल ₹${remaining.toLocaleString('en-IN')} बाकी हैं (${days} दिन शेष)।`;
        speechText = `नमस्ते लीना मूंधड़ा जी! हंटर फंड रिमाइंडर। आज आपने ${actual} रुपये जमा किए हैं। आज का लक्ष्य पूरा करने के लिए ${needed} रुपये और जमा करें। आपकी हंटर 350 के लिए कुल ${remaining} रुपये बाकी हैं।`;
      } else {
        title = `लीना जी, आज ₹${needed.toLocaleString('en-IN')} जमा करें — हंटर 350`;
        body = `नमस्ते लीना मूंधड़ा जी! आज का बचत लक्ष्य ₹${planned.toLocaleString('en-IN')} है। हंटर 350 के लिए कुल ₹${remaining.toLocaleString('en-IN')} शेष हैं। अपनी बचत दर्ज करें!`;
        speechText = `नमस्ते लीना मूंधड़ा जी! हंटर फंड रिमाइंडर। आज का बचत लक्ष्य ${planned} रुपये है। शून्य रुपये जमा हुए हैं। आपकी हंटर 350 के लिए कुल ${remaining} रुपये बाकी हैं। कृपया अपनी बचत दर्ज करें।`;
      }
      break;

    case 'marathi':
      ttsLang = 'mr-IN';
      if (actual > 0) {
        title = `लीना ताई, ₹${needed.toLocaleString('en-IN')} आज जमा करायचे बाकी — हंटर 350`;
        body = `नमस्कार लीना मुंढडा ताई! आज ₹${actual.toLocaleString('en-IN')} जमा केले, उद्दिष्ट ₹${planned.toLocaleString('en-IN')} आहे. एकूण ₹${remaining.toLocaleString('en-IN')} शिल्लक आहेत (${days} दिवस उरले).`;
        speechText = `नमस्कार लीना मुंढडा ताई! हंटर फंड रिमाइंडर. आज आपण ${actual} रुपये जमा केले आहेत. आजचे उद्दिष्ट गाठण्यासाठी ${needed} रुपये जमा करायचे बाकी आहेत. आपल्या हंटर 350 साठी एकूण ${remaining} रुपये शिल्लक आहेत.`;
      } else {
        title = `लीना ताई, आज ₹${needed.toLocaleString('en-IN')} जमा करा — हंटर 350`;
        body = `नमस्कार लीना मुंढडा ताई! आजचे बचतीचे उद्दिष्ट ₹${planned.toLocaleString('en-IN')} आहे. हंटर 350 साठी एकूण ₹${remaining.toLocaleString('en-IN')} शिल्लक आहेत. आजची बचत नोंदवा!`;
        speechText = `नमस्कार लीना मुंढडा ताई! हंटर फंड रिमाइंडर. आजचे बचतीचे उद्दिष्ट ${planned} रुपये आहे. आपल्या हंटर 350 साठी एकूण ${remaining} रुपये शिल्लक आहेत. कृपया आजची बचत नोंदवा.`;
      }
      break;

    case 'english':
      ttsLang = 'en-IN';
      if (actual > 0) {
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
      if (actual > 0) {
        title = `लीना जी, ₹${needed.toLocaleString('en-IN')} आज जमा करना बाकी है — Hunter 350`;
        body = `Hello Leena Mundhada ji! Aaj ₹${actual.toLocaleString('en-IN')} save hua hai (Target: ₹${planned.toLocaleString('en-IN')}). Total ₹${remaining.toLocaleString('en-IN')} bache hain (${days} din bache). Tap karke deposit karein!`;
        speechText = `Hello Leena Mundhada ji! Hunter Fund alert. Aaj aapne ${actual} rupaye save kiye hain. Target poora karne ke liye ${needed} rupaye aur jama karein. Hunter 350 ke liye kul ${remaining} rupaye bache hain.`;
      } else {
        title = `लीना जी, ₹${needed.toLocaleString('en-IN')} आज जमा करना है — Hunter 350`;
        body = `Hello Leena Mundhada ji! Aaj ka savings target ₹${planned.toLocaleString('en-IN')} hai. Hunter 350 ke liye kul ₹${remaining.toLocaleString('en-IN')} bache hain. Jaldi se apna deposit record karein!`;
        speechText = `Hello Leena Mundhada ji! Hunter Fund alert. Aaj ka savings target ${planned} rupaye hai. Hunter 350 ke liye kul ${remaining} rupaye bache hain. Jaldi se apna deposit record karein.`;
      }
      break;
  }

  return { title, body, speechText, ttsLang, needed, planned, actual, remaining, days };
}

/**
 * Speaks the personalized message addressed to Leena Mundhada in the selected language
 */
export async function speakDynamicAlert(data: SmartNotificationData): Promise<void> {
  const { speechText, ttsLang } = generateSmartNotificationCopy(data);

  // 1. Try Native Capacitor Text-to-Speech
  if (isNativePlatform()) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text: speechText,
        lang: ttsLang,
        rate: 0.95,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
      return;
    } catch (err) {
      console.warn('Native TextToSpeech plugin error, trying browser fallback:', err);
    }
  }

  // 2. Web Speech Synthesis Fallback
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = ttsLang.split('-')[0];
      const matchedVoice = voices.find((v) => v.lang.includes(langPrefix) || v.lang.includes('IN'));
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.lang = ttsLang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Browser SpeechSynthesis fallback error:', err);
    }
  }
}

/**
 * Send an immediate native notification with dynamic amounts
 */
export async function sendNativeNotification(options: {
  id?: number;
  title: string;
  body: string;
  actionTypeId?: string;
  extra?: Record<string, string>;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  try {
    await setupNativeNotificationChannel();
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      const granted = await requestNativePermission();
      if (!granted) return false;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: options.id ?? Math.floor(Math.random() * 100000),
          title: options.title,
          body: options.body,
          channelId: NOTIFICATION_CHANNEL_ID,
          actionTypeId: options.actionTypeId || 'DEPOSIT_REMINDER',
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
          sound: NOTIFICATION_SOUND,
          extra: options.extra || { action: 'quick-deposit' },
        },
      ],
    });
    
    return true;
  } catch (err) {
    console.error('Native notification error:', err);
    return false;
  }
}

/**
 * Schedule a background test notification personalized for Leena Mundhada
 */
export async function scheduleNativeBackgroundTest(options: SmartNotificationData & { delaySeconds: number }): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  try {
    await setupNativeNotificationChannel();
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      const granted = await requestNativePermission();
      if (!granted) return false;
    }

    const { title, body, needed } = generateSmartNotificationCopy(options);
    const triggerTime = new Date(Date.now() + options.delaySeconds * 1000);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_ID + 50,
          title,
          body,
          channelId: NOTIFICATION_CHANNEL_ID,
          actionTypeId: 'DEPOSIT_REMINDER',
          schedule: { at: triggerTime, allowWhileIdle: true },
          sound: NOTIFICATION_SOUND,
          extra: { action: 'quick-deposit', neededToday: needed.toString() },
        },
      ],
    });

    return true;
  } catch (err) {
    console.error('Native test schedule error:', err);
    return false;
  }
}

/**
 * Schedule hourly native notifications with live calculated amounts
 */
export async function scheduleHourlyReminders(options: SmartNotificationData & {
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  try {
    await cancelHourlyReminders();
    
    if (options.neededToday <= 0) return true; // Target met
    
    await setupNativeNotificationChannel();
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      const granted = await requestNativePermission();
      if (!granted) return false;
    }

    const { title, body, needed } = generateSmartNotificationCopy(options);

    const now = new Date();
    const notifications = [];
    
    for (let i = 1; i <= 16; i++) {
      const scheduleTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = scheduleTime.getHours();
      
      // Skip quiet hours
      if (options.quietHoursEnabled) {
        if (hour >= options.quietHoursStart || hour < options.quietHoursEnd) {
          continue;
        }
      }
      
      // Don't schedule past midnight
      if (scheduleTime.getDate() !== now.getDate()) break;
      
      notifications.push({
        id: HOURLY_REMINDER_BASE_ID + i,
        title,
        body,
        channelId: NOTIFICATION_CHANNEL_ID,
        actionTypeId: 'DEPOSIT_REMINDER',
        schedule: { at: scheduleTime, allowWhileIdle: true },
        sound: NOTIFICATION_SOUND,
        extra: { action: 'quick-deposit', neededToday: needed.toString() },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
    
    return true;
  } catch (err) {
    console.error('Failed to schedule hourly reminders:', err);
    return false;
  }
}

/**
 * Cancel all scheduled hourly reminders
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
  } catch (err) {
    console.error('Failed to cancel hourly reminders:', err);
  }
}

/**
 * Send a test notification (native)
 */
export async function sendNativeTestNotification(): Promise<boolean> {
  return sendNativeNotification({
    id: TEST_ID,
    title: 'Hunter Fund — Reminders Active',
    body: 'Hourly notifications active with loud alarm and speech alerts for Leena Mundhada. Tap to add a deposit.',
    extra: { action: 'test' },
  });
}

/**
 * Send a milestone notification (native)
 */
export async function sendNativeMilestoneNotification(milestoneAmount: number): Promise<boolean> {
  return sendNativeNotification({
    id: MILESTONE_ID + Math.floor(milestoneAmount / 1000),
    title: `Milestone Reached — ₹${milestoneAmount.toLocaleString('en-IN')}`,
    body: `Badhai ho Leena ji! Aapne ₹${milestoneAmount.toLocaleString('en-IN')} cross kar liye hain Royal Enfield Hunter 350 ke liye.`,
    extra: { action: 'milestone', amount: milestoneAmount.toString() },
  });
}

/**
 * Send daily reminder notification (native)
 */
export async function sendNativeDailyReminder(dailyTarget: number): Promise<boolean> {
  return sendNativeNotification({
    id: DAILY_REMINDER_ID,
    title: 'Daily Savings Reminder — Hunter 350',
    body: `Leena ji, today's target is ₹${dailyTarget.toLocaleString('en-IN')}. Record your deposit to stay on schedule for 10 January 2027.`,
    extra: { action: 'daily-reminder' },
  });
}

/**
 * Register notification action types and listeners.
 */
export async function registerNativeNotificationActions(
  onQuickDeposit: () => void
): Promise<void> {
  if (!isNativePlatform()) return;
  
  try {
    await setupNativeNotificationChannel();

    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'DEPOSIT_REMINDER',
          actions: [
            {
              id: 'quick-deposit',
              title: 'Record Deposit',
            },
            {
              id: 'dismiss',
              title: 'Dismiss',
              destructive: true,
            },
          ],
        },
      ],
    });
    
    // Listen for notification taps
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
