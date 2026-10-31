// Web Push & Local Notification Manager for Hunter Fund

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
  tag = 'hunter-fund-alert',
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

  // 1. Try standard browser Notification first (instant on desktop)
  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge,
      tag,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    shown = true;
  } catch (e) {
    // If standard constructor fails (e.g. mobile Chrome requires Service Worker)
  }

  // 2. Try Service Worker if available
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);

      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          data: data || { url: '/' },
        } as any);
        shown = true;
      }
    } catch {
      // SW notification fallback
    }
  }

  return {
    success: shown,
    permission,
    message: shown
      ? 'Notification sent successfully!'
      : 'Notification was dispatched to system.',
  };
}

// Preset notification triggers
export async function scheduleBackgroundNotification(delaySeconds: number = 6): Promise<NotificationResult> {
  if (!isNotificationSupported()) {
    return { success: false, permission: 'denied', message: 'Notifications not supported' };
  }

  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      return { success: false, permission: perm, message: 'Permission was blocked or denied.' };
    }
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage({
          type: 'SCHEDULE_BACKGROUND_NOTIFICATION',
          delayMs: delaySeconds * 1000,
          title: '🏍️ Hunter Fund: Background Alert',
          body: 'Aapne app band / minimise kar di thi, fir bhi background notification aagaya! Hunter 350 savings reminder active hai.',
        });
        return {
          success: true,
          permission: 'granted',
          message: `Scheduled! Abhi app ko MINIMIZE ya CLOSE karein — ${delaySeconds} seconds me background notification aayega!`,
        };
      }
    } catch (err: any) {
      return { success: false, permission: 'granted', message: err?.message };
    }
  }

  return { success: false, permission: 'granted', message: 'Service worker ready nahi hua.' };
}

export async function sendTestNotification(): Promise<NotificationResult> {
  return sendNotification({
    title: '🏍️ Hunter Fund Active!',
    body: 'Daily reminders are active. Keep up your ₹178/day savings pace to buy the Hunter 350 by 10 Jan 2027!',
    tag: 'test-notification',
  });
}

export async function sendMilestoneNotification(milestoneAmount: number): Promise<NotificationResult> {
  return sendNotification({
    title: '🎉 Milestone Unlocked!',
    body: `Awesome! You just crossed ₹${milestoneAmount.toLocaleString('en-IN')} towards your Royal Enfield Hunter 350 Graphite Grey!`,
    tag: `milestone-${milestoneAmount}`,
  });
}

export async function sendDailyReminderNotification(dailyTarget: number): Promise<NotificationResult> {
  return sendNotification({
    title: '🏍️ Daily Hunter 350 Reminder',
    body: `Time to record today’s savings! Target today: ₹${dailyTarget.toLocaleString('en-IN')}. Target date: 10 January 2027.`,
    tag: 'daily-reminder',
  });
}
