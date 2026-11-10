// Web Push & Local Notification Manager for Hunter Fund
// Background Hourly Reminder Engine — sends reminders until today's deposit target is met

import { Capacitor } from '@capacitor/core';
import {
  isNativePlatform,
  requestNativePermission,
  sendNativeNotification,
  sendNativeTestNotification,
  sendNativeMilestoneNotification,
  sendNativeDailyReminder,
  scheduleHourlyReminders,
  cancelHourlyReminders,
} from './native-notifications';

export interface HourlyReminderState {
  enabled: boolean;
  todayPlannedSavings: number;
  todayActualSavings: number;
  neededToday: number;
  todayDate: string;
  bikeModel: string;
  intervalMinutes?: number;
  quietHoursEnabled: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

export function isNotificationSupported(): boolean {
  if (isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (isNativePlatform()) return 'granted';
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNativePlatform()) {
    const granted = await requestNativePermission();
    return granted ? 'granted' : 'denied';
  }

  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser.');
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    return 'denied';
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
  data?: any;
}

export interface NotificationResult {
  success: boolean;
  permission: NotificationPermission;
  message?: string;
}

export async function sendNotification({
  title,
  body,
  icon = '/icon-192.svg',
  badge = '/icon-192.svg',
  tag = 'hourly-deposit-reminder',
  renotify = true,
  vibrate = [250, 100, 250, 100, 250],
  data,
}: NotificationPayload): Promise<NotificationResult> {
  // Always trigger in-app banner fallback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hunter-inapp-notification', {
        detail: { title, body },
      })
    );
  }

  // Native platform: use Capacitor Local Notifications
  if (isNativePlatform()) {
    const success = await sendNativeNotification({ title, body, extra: data });
    return {
      success,
      permission: 'granted',
      message: success ? 'Notification delivered successfully.' : 'Failed to send native notification.',
    };
  }

  if (!isNotificationSupported()) {
    return {
      success: false,
      permission: 'denied',
      message: 'Your browser does not support push notifications.',
    };
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      message:
        permission === 'denied'
          ? 'Notifications are blocked. Tap the lock icon in your address bar and set Notifications to "Allow".'
          : 'Notification permission was dismissed.',
    };
  }

  let shown = false;

  // 1. Service Worker notification (best for mobile & background delivery)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]);

      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          renotify,
          vibrate,
          data: data || { url: '/?action=quick-deposit' },
          actions: [
            { action: 'quick-deposit', title: 'Record Deposit' },
            { action: 'open', title: 'Open App' }
          ]
        } as any);
        shown = true;
      }
    } catch {
      // Service worker fallback
    }
  }

  // 2. Fallback to standard Notification constructor
  if (!shown) {
    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge,
        tag,
        renotify,
        data: data || { url: '/?action=quick-deposit' },
      } as any);

      notification.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('hunter-open-quick-add'));
        notification.close();
      };
      shown = true;
    } catch {
      // Standard constructor fallback
    }
  }

  return {
    success: shown,
    permission,
    message: shown
      ? 'Notification delivered successfully.'
      : 'Notification dispatched to system.',
  };
}

/**
 * Syncs hourly reminder state with the Service Worker background daemon.
 */
export async function syncHourlyReminderWithServiceWorker(state: HourlyReminderState): Promise<void> {
  // Native platform: schedule native hourly reminders
  if (isNativePlatform()) {
    if (state.enabled && state.neededToday > 0) {
      await scheduleHourlyReminders({
        neededToday: state.neededToday,
        todayPlannedSavings: state.todayPlannedSavings,
        todayActualSavings: state.todayActualSavings,
        bikeModel: state.bikeModel,
        quietHoursEnabled: state.quietHoursEnabled,
        quietHoursStart: state.quietHoursStart ?? 23,
        quietHoursEnd: state.quietHoursEnd ?? 8,
      });
    } else {
      await cancelHourlyReminders();
    }
    return;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({
        type: 'SYNC_HOURLY_REMINDER',
        state,
      });
    }

    // Periodic Sync API (Android PWA / Chromium)
    if ('periodicSync' in reg && state.enabled) {
      try {
        const tags = await (reg as any).periodicSync.getTags();
        if (!tags.includes('hourly-deposit-reminder')) {
          await (reg as any).periodicSync.register('hourly-deposit-reminder', {
            minInterval: 60 * 60 * 1000,
          });
        }
      } catch {
        // Periodic sync requires standalone PWA mode
      }
    }
  } catch (err) {
    console.warn('Could not sync reminder with service worker:', err);
  }
}

/**
 * Sends an hourly deposit reminder with the exact calculated savings amounts.
 */
export async function sendHourlyDepositReminder({
  neededToday,
  todayPlannedSavings,
  todayActualSavings,
  bikeModel = 'Royal Enfield Hunter 350',
}: {
  neededToday: number;
  todayPlannedSavings: number;
  todayActualSavings: number;
  bikeModel?: string;
}): Promise<NotificationResult> {
  const planned = Math.round(todayPlannedSavings);
  const needed = Math.round(neededToday);
  const actual = Math.round(todayActualSavings);

  let title: string;
  let body: string;

  if (actual > 0) {
    title = `₹${needed.toLocaleString('en-IN')} remaining — ${bikeModel}`;
    body = `You've saved ₹${actual.toLocaleString('en-IN')} today. Record ₹${needed.toLocaleString('en-IN')} more to hit your daily target of ₹${planned.toLocaleString('en-IN')}.`;
  } else {
    title = `₹${needed.toLocaleString('en-IN')} to save today — ${bikeModel}`;
    body = `Today's target is ₹${planned.toLocaleString('en-IN')}. Record your deposit to stay on track for 10 Jan 2027.`;
  }

  return sendNotification({
    title,
    body,
    tag: 'hourly-deposit-reminder',
    renotify: true,
    data: { url: '/?action=quick-deposit', neededToday: needed },
  });
}

/**
 * Schedules a background test notification after a delay.
 */
export async function scheduleBackgroundHourlyTest({
  delaySeconds = 10,
  neededToday,
  todayPlannedSavings,
  todayActualSavings,
  bikeModel = 'Royal Enfield Hunter 350',
}: {
  delaySeconds?: number;
  neededToday: number;
  todayPlannedSavings: number;
  todayActualSavings: number;
  bikeModel?: string;
}): Promise<NotificationResult> {
  if (!isNotificationSupported()) {
    return { success: false, permission: 'denied', message: 'Notifications are not supported by your browser.' };
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, permission, message: 'Notification permission was denied.' };
    }
  }

  const planned = Math.round(todayPlannedSavings);
  const needed = Math.round(neededToday);
  const actual = Math.round(todayActualSavings);

  let title: string;
  let body: string;

  if (actual > 0) {
    title = `₹${needed.toLocaleString('en-IN')} remaining — ${bikeModel}`;
    body = `You've saved ₹${actual.toLocaleString('en-IN')} today. Record ₹${needed.toLocaleString('en-IN')} more to complete your daily target.`;
  } else {
    title = `₹${needed.toLocaleString('en-IN')} to save today — ${bikeModel}`;
    body = `Today's target is ₹${planned.toLocaleString('en-IN')}. Tap to record your deposit.`;
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage({
          type: 'SCHEDULE_BACKGROUND_NOTIFICATION',
          delayMs: delaySeconds * 1000,
          title,
          body,
          data: { url: '/?action=quick-deposit', neededToday: needed },
        });

        return {
          success: true,
          permission: 'granted',
          message: `Scheduled! Minimize or lock your device — a notification will appear in ${delaySeconds} seconds.`,
        };
      }
    } catch (err: any) {
      return { success: false, permission: 'granted', message: err?.message };
    }
  }

  // Fallback: in-window timer
  setTimeout(() => {
    sendNotification({ title, body, tag: 'hourly-deposit-reminder' });
  }, delaySeconds * 1000);

  return {
    success: true,
    permission: 'granted',
    message: `Scheduled! Minimize this tab — notification arrives in ${delaySeconds} seconds.`,
  };
}

export async function scheduleBackgroundNotification(delaySeconds: number = 6): Promise<NotificationResult> {
  return scheduleBackgroundHourlyTest({
    delaySeconds,
    neededToday: 1071,
    todayPlannedSavings: 1071,
    todayActualSavings: 0,
  });
}

export async function sendTestNotification(): Promise<NotificationResult> {
  if (isNativePlatform()) {
    const success = await sendNativeTestNotification();
    return { success, permission: 'granted', message: success ? 'Test notification sent.' : 'Failed to send test notification.' };
  }
  return sendNotification({
    title: 'Hunter Fund — Reminders Active',
    body: 'You will receive hourly reminders until today\'s savings target is recorded. Tap to add a deposit.',
    tag: 'test-notification',
  });
}

export async function sendMilestoneNotification(milestoneAmount: number): Promise<NotificationResult> {
  if (isNativePlatform()) {
    const success = await sendNativeMilestoneNotification(milestoneAmount);
    return { success, permission: 'granted', message: success ? 'Milestone notification sent.' : 'Failed.' };
  }
  return sendNotification({
    title: `Milestone Reached — ₹${milestoneAmount.toLocaleString('en-IN')}`,
    body: `Congratulations! You've crossed ₹${milestoneAmount.toLocaleString('en-IN')} towards your Royal Enfield Hunter 350. Keep going!`,
    tag: `milestone-${milestoneAmount}`,
  });
}

export async function sendDailyReminderNotification(dailyTarget: number): Promise<NotificationResult> {
  if (isNativePlatform()) {
    const success = await sendNativeDailyReminder(dailyTarget);
    return { success, permission: 'granted', message: success ? 'Daily reminder sent.' : 'Failed.' };
  }
  return sendNotification({
    title: 'Daily Savings Reminder — Hunter 350',
    body: `Today's target: ₹${dailyTarget.toLocaleString('en-IN')}. Record your deposit to stay on schedule for 10 January 2027.`,
    tag: 'daily-reminder',
  });
}
