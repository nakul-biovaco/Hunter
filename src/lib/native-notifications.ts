// Native Notification Manager for Hunter Fund (Capacitor Android)
// Uses @capacitor/local-notifications for reliable background delivery

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const HOURLY_REMINDER_BASE_ID = 1000;
const MILESTONE_ID = 2000;
const TEST_ID = 3000;
const DAILY_REMINDER_ID = 4000;
export const NOTIFICATION_CHANNEL_ID = 'hunter_reminders';

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
 * Create high-priority Android notification channel for heads-up reminders
 */
export async function setupNativeNotificationChannel(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Hunter Fund Savings Reminders',
      description: 'Hourly savings goal reminders and milestone celebrations',
      importance: 5, // High (shows banner, plays sound, pops up)
      visibility: 1, // Public (shows on lock screen)
      vibration: true,
      sound: 'default',
      lights: true,
      lightColor: '#10b981',
    });
  } catch (err) {
    console.warn('Channel creation warning:', err);
  }
}

/**
 * Send an immediate native notification
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
          sound: 'default',
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
 * Schedule a background test notification on native Android
 */
export async function scheduleNativeBackgroundTest(options: {
  delaySeconds: number;
  neededToday: number;
  todayPlannedSavings: number;
  todayActualSavings: number;
  bikeModel: string;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  try {
    await setupNativeNotificationChannel();
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      const granted = await requestNativePermission();
      if (!granted) return false;
    }

    const planned = Math.round(options.todayPlannedSavings);
    const needed = Math.round(options.neededToday);
    const actual = Math.round(options.todayActualSavings);

    let title: string;
    let body: string;

    if (actual > 0) {
      title = `₹${needed.toLocaleString('en-IN')} remaining — ${options.bikeModel}`;
      body = `You've saved ₹${actual.toLocaleString('en-IN')} today. Record ₹${needed.toLocaleString('en-IN')} more to complete your daily target.`;
    } else {
      title = `₹${needed.toLocaleString('en-IN')} to save today — ${options.bikeModel}`;
      body = `Today's target is ₹${planned.toLocaleString('en-IN')}. Tap to record your deposit.`;
    }

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
          sound: 'default',
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
 * Schedule hourly native notifications for deposit reminders.
 * Schedules individual notifications for each hour remaining today (up to 16 hours).
 */
export async function scheduleHourlyReminders(options: {
  neededToday: number;
  todayPlannedSavings: number;
  todayActualSavings: number;
  bikeModel: string;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  try {
    // Cancel any existing hourly reminders first
    await cancelHourlyReminders();
    
    if (options.neededToday <= 0) return true; // Target met, no reminders needed
    
    await setupNativeNotificationChannel();
    const hasPermission = await checkNativePermission();
    if (!hasPermission) {
      const granted = await requestNativePermission();
      if (!granted) return false;
    }

    const planned = Math.round(options.todayPlannedSavings);
    const needed = Math.round(options.neededToday);
    const actual = Math.round(options.todayActualSavings);

    let title: string;
    let body: string;

    if (actual > 0) {
      title = `₹${needed.toLocaleString('en-IN')} remaining — ${options.bikeModel}`;
      body = `You've saved ₹${actual.toLocaleString('en-IN')} today. Record ₹${needed.toLocaleString('en-IN')} more to hit your daily target of ₹${planned.toLocaleString('en-IN')}.`;
    } else {
      title = `₹${needed.toLocaleString('en-IN')} to save today — ${options.bikeModel}`;
      body = `Today's target is ₹${planned.toLocaleString('en-IN')}. Record your deposit to stay on track for 10 Jan 2027.`;
    }

    // Schedule notifications for the remaining hours today
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
        sound: 'default' as const,
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
      .filter(n => n.id >= HOURLY_REMINDER_BASE_ID && n.id < HOURLY_REMINDER_BASE_ID + 100)
      .map(n => ({ id: n.id }));
    
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
    body: 'You will receive hourly reminders until today\'s savings target is recorded. Tap to add a deposit.',
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
    body: `Congratulations! You've crossed ₹${milestoneAmount.toLocaleString('en-IN')} towards your Royal Enfield Hunter 350. Keep going!`,
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
    body: `Today's target: ₹${dailyTarget.toLocaleString('en-IN')}. Record your deposit to stay on schedule for 10 January 2027.`,
    extra: { action: 'daily-reminder' },
  });
}

/**
 * Register notification action types and listeners.
 * Call this once on app startup.
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
