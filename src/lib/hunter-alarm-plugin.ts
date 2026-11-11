import { registerPlugin, PluginListenerHandle } from '@capacitor/core';
import type { VoiceLanguage } from './native-notifications';

export interface ReminderSyncPayload {
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietStartHour?: number;
  quietEndHour?: number;
  voiceLanguage: VoiceLanguage;
  targetAmount: number;
  currentBalance: number;
  remainingAmount: number;
  targetDate: string;
  syncedDate: string;
  todayActualSavings: number;
  todayPlannedSavings: number;
  daysRemaining: number;
  bikeModel: string;
}

export interface BackgroundStatus {
  notificationsEnabled: boolean;
  canScheduleExactAlarms: boolean;
  ignoringBatteryOptimizations: boolean;
  nextAlarmAt: number;
  androidApi: number;
}

export interface HunterAlarmPlugin {
  syncReminderState(options: ReminderSyncPayload): Promise<BackgroundStatus>;
  triggerTestNow(
    options: Partial<ReminderSyncPayload> & {
      title?: string;
      body?: string;
      speechText?: string;
      ttsLang?: string;
      playAlarm?: boolean;
    }
  ): Promise<{ started: boolean; title: string; speechText: string }>;
  triggerCustomAlert(options: {
    title: string;
    body: string;
    speechText?: string;
    ttsLang?: string;
    playAlarm?: boolean;
  }): Promise<{ started: boolean }>;
  scheduleBackgroundTest(
    options: Partial<ReminderSyncPayload> & { delaySeconds: number }
  ): Promise<BackgroundStatus & { triggerAt: number; delaySeconds: number }>;
  getBackgroundStatus(): Promise<BackgroundStatus>;
  requestNotificationPermission(): Promise<BackgroundStatus>;
  requestBatteryOptimizationExemption(): Promise<BackgroundStatus>;
  openExactAlarmSettings(): Promise<BackgroundStatus>;
  openAppNotificationSettings(): Promise<BackgroundStatus>;
  consumePendingAction(): Promise<{ action: string | null }>;
  addListener(
    eventName: 'hunterQuickDeposit',
    listenerFunc: (data: { action: string }) => void
  ): Promise<PluginListenerHandle>;
}

export const HunterAlarm = registerPlugin<HunterAlarmPlugin>('HunterAlarm');

