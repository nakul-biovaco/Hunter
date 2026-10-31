// Web Push & Local Notification Manager for Hunter Fund
// Includes Background Hourly Reminder Engine for unrecorded daily deposits

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
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
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
  // Always trigger in-app banner fallback so user never misses it
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hunter-inapp-notification', {
        detail: { title, body },
      })
    );
  }

  if (!isNotificationSupported()) {
    return {
      success: false,
      permission: 'denied',
      message: 'Browser does not support the Web Notification API.',
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
          ? 'Notification permission is blocked. Please enable notifications in your browser address bar (lock icon).'
          : 'Notification permission was dismissed.',
    };
  }

  let shown = false;

  // 1. Try Service Worker first (handles mobile Chrome/Android and desktop best with actions & vibration)
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
            { action: 'quick-deposit', title: '💰 Save Now' },
            { action: 'open', title: 'Open App 🏍️' }
          ]
        } as any);
        shown = true;
      }
    } catch {
      // SW notification fallback
    }
  }

  // 2. Fallback to standard browser Notification constructor if SW didn't show
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
      // standard constructor fallback
    }
  }

  return {
    success: shown,
    permission,
    message: shown
      ? 'Notification sent successfully!'
      : 'Notification dispatched to system tray.',
  };
}

/**
 * Synchronizes the hourly reminder configuration with the Service Worker background daemon.
 * Ensures the Service Worker background alarm keeps ticking even when the tab is sleeping.
 */
export async function syncHourlyReminderWithServiceWorker(state: HourlyReminderState): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({
        type: 'SYNC_HOURLY_REMINDER',
        state,
      });
    }

    // Try Periodic Sync if available (PWA on Android / Chromium)
    if ('periodicSync' in reg && state.enabled) {
      try {
        const tags = await (reg as any).periodicSync.getTags();
        if (!tags.includes('hourly-deposit-reminder')) {
          await (reg as any).periodicSync.register('hourly-deposit-reminder', {
            minInterval: 60 * 60 * 1000, // 1 hour
          });
        }
      } catch {
        // Periodic sync permission or standalone requirement
      }
    }
  } catch (err) {
    console.warn('Could not sync reminder with service worker:', err);
  }
}

/**
 * Fires an hourly reminder notification immediately with the exact calculated savings amounts.
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

  let title = `🏍️ ${bikeModel}: ₹${needed.toLocaleString('en-IN')} Save Karna Baki Hai!`;
  let body = `Aaj ka target ₹${planned.toLocaleString('en-IN')} hai. 10 Jan 2027 tak apni Hunter 350 Graphite Grey lene ke liye abhi deposit karein!`;

  if (actual > 0) {
    title = `🏍️ ${bikeModel}: ₹${needed.toLocaleString('en-IN')} Aur Save Karein!`;
    body = `Aaj ₹${actual.toLocaleString('en-IN')} save ho chuke hain, baaki ₹${needed.toLocaleString('en-IN')} deposit karke aaj ka goal pura karein!`;
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
 * Schedules a background test notification in X seconds so user can minimize/lock phone and see it pop up.
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
    return { success: false, permission: 'denied', message: 'Notifications not supported' };
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, permission, message: 'Permission was blocked or denied.' };
    }
  }

  const planned = Math.round(todayPlannedSavings);
  const needed = Math.round(neededToday);
  const actual = Math.round(todayActualSavings);

  let title = `🏍️ ${bikeModel}: ₹${needed.toLocaleString('en-IN')} Save Karna Baki Hai!`;
  let body = `Aaj ka target ₹${planned.toLocaleString('en-IN')} hai. 10 Jan 2027 tak Hunter 350 lene ke liye abhi deposit add karein!`;

  if (actual > 0) {
    title = `🏍️ ${bikeModel}: ₹${needed.toLocaleString('en-IN')} Aur Save Karein!`;
    body = `Aaj ₹${actual.toLocaleString('en-IN')} save ho chuka hai, baaki ₹${needed.toLocaleString('en-IN')} abhi deposit karein!`;
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
          message: `Scheduled! Abhi app ko MINIMIZE karein — ${delaySeconds} seconds me background notification aayega!`,
        };
      }
    } catch (err: any) {
      return { success: false, permission: 'granted', message: err?.message };
    }
  }

  // Fallback timeout in window
  setTimeout(() => {
    sendNotification({ title, body, tag: 'hourly-deposit-reminder' });
  }, delaySeconds * 1000);

  return {
    success: true,
    permission: 'granted',
    message: `Scheduled! Abhi tab ko minimize karein — ${delaySeconds} seconds me notification aayega!`,
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
  return sendNotification({
    title: '🏍️ Hunter Fund: Reminders Active!',
    body: 'Daily reminders active hain. Jab tak aaj ka deposit add nahi karenge, push notifications aate rahenge.',
    tag: 'test-notification',
  });
}

export async function sendMilestoneNotification(milestoneAmount: number): Promise<NotificationResult> {
  return sendNotification({
    title: '🎉 Milestone Unlocked!',
    body: `Badhai ho! Aapne ₹${milestoneAmount.toLocaleString('en-IN')} cross kar liye hain Royal Enfield Hunter 350 Graphite Grey ke liye!`,
    tag: `milestone-${milestoneAmount}`,
  });
}

export async function sendDailyReminderNotification(dailyTarget: number): Promise<NotificationResult> {
  return sendNotification({
    title: '🏍️ Hunter 350 Savings Target',
    body: `Aaj ka target: ₹${dailyTarget.toLocaleString('en-IN')}. 10 January 2027 delivery ke liye abhi deposit log karein!`,
    tag: 'daily-reminder',
  });
}
