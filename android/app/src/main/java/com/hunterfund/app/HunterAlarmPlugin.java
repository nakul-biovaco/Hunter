package com.hunterfund.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.text.TextUtils;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor Bridge Plugin for Hunter Fund Native Background Alarm & TTS Engine.
 */
@CapacitorPlugin(
    name = "HunterAlarm",
    permissions = {
        @Permission(strings = {Manifest.permission.POST_NOTIFICATIONS}, alias = "notifications")
    }
)
public class HunterAlarmPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        HunterAlarmScheduler.ensureChannels(getContext());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent != null && "quick-deposit".equals(intent.getStringExtra("hunter_action"))) {
            MainActivity.consumePendingQuickDepositFlag();
            JSObject payload = new JSObject();
            payload.put("action", "quick-deposit");
            notifyListeners("hunterQuickDeposit", payload, true);
        }
    }

    @PluginMethod
    public void syncReminderState(PluginCall call) {
        Context ctx = getContext();
        HunterAlarmScheduler.ensureChannels(ctx);

        HunterCopyGenerator.HunterState state = stateFromCall(call);
        HunterCopyGenerator.saveState(ctx, state);

        if (state.enabled && Math.round(state.remainingAmount) > 0L) {
            HunterAlarmScheduler.scheduleNextHourly(ctx);
        } else {
            HunterAlarmScheduler.cancelHourly(ctx);
        }

        call.resolve(getBackgroundStatusPayload());
    }

    @PluginMethod
    public void triggerTestNow(PluginCall call) {
        Context ctx = getContext();
        HunterAlarmScheduler.ensureChannels(ctx);

        if (call.hasOption("remainingAmount") || call.hasOption("voiceLanguage")) {
            HunterCopyGenerator.HunterState updated = stateFromCall(call);
            HunterCopyGenerator.saveState(ctx, updated);
        }

        HunterCopyGenerator.HunterState state = HunterCopyGenerator.loadState(ctx);
        HunterCopyGenerator.LiveCopy copy = HunterCopyGenerator.computeLiveCopy(state, true);

        String title = call.getString("title", copy.title);
        String body = call.getString("body", copy.body);
        String speechText = call.getString("speechText", copy.speechText);
        String ttsLang = call.getString("ttsLang", copy.ttsLang);
        boolean playAlarm = call.getBoolean("playAlarm", true);

        startAlertService(ctx, title, body, speechText, ttsLang, playAlarm);

        JSObject res = new JSObject();
        res.put("started", true);
        res.put("title", title);
        res.put("speechText", speechText);
        call.resolve(res);
    }

    @PluginMethod
    public void triggerCustomAlert(PluginCall call) {
        Context ctx = getContext();
        HunterAlarmScheduler.ensureChannels(ctx);

        String title = call.getString("title", "Hunter Fund 350");
        String body = call.getString("body", "");
        String speechText = call.getString("speechText", "");
        String ttsLang = call.getString("ttsLang", "hi-IN");
        boolean playAlarm = call.getBoolean("playAlarm", true);

        startAlertService(ctx, title, body, speechText, ttsLang, playAlarm);

        JSObject res = new JSObject();
        res.put("started", true);
        call.resolve(res);
    }

    @PluginMethod
    public void scheduleBackgroundTest(PluginCall call) {
        Context ctx = getContext();
        HunterAlarmScheduler.ensureChannels(ctx);

        if (call.hasOption("remainingAmount") || call.hasOption("voiceLanguage")) {
            HunterCopyGenerator.HunterState updated = stateFromCall(call);
            HunterCopyGenerator.saveState(ctx, updated);
        }

        int delaySeconds = call.getInt("delaySeconds", 10);
        long triggerAt = HunterAlarmScheduler.scheduleTestAlarm(ctx, delaySeconds);

        JSObject res = getBackgroundStatusPayload();
        res.put("triggerAt", triggerAt);
        res.put("delaySeconds", delaySeconds);
        call.resolve(res);
    }

    @PluginMethod
    public void getBackgroundStatus(PluginCall call) {
        call.resolve(getBackgroundStatusPayload());
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
        } else {
            call.resolve(getBackgroundStatusPayload());
        }
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        call.resolve(getBackgroundStatusPayload());
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        Context ctx = getContext();
        if (HunterAlarmScheduler.isIgnoringBatteryOptimizations(ctx)) {
            call.resolve(getBackgroundStatusPayload());
            return;
        }
        Intent intent = HunterAlarmScheduler.buildBatteryOptimizationIntent(ctx);
        if (intent == null) {
            call.resolve(getBackgroundStatusPayload());
            return;
        }
        try {
            startActivityForResult(call, intent, "settingsCallback");
        } catch (Exception e) {
            call.resolve(getBackgroundStatusPayload());
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Intent intent = HunterAlarmScheduler.buildExactAlarmSettingsIntent(getContext());
        if (intent == null) {
            call.resolve(getBackgroundStatusPayload());
            return;
        }
        try {
            startActivityForResult(call, intent, "settingsCallback");
        } catch (Exception e) {
            call.resolve(getBackgroundStatusPayload());
        }
    }

    @PluginMethod
    public void openAppNotificationSettings(PluginCall call) {
        Intent intent = HunterAlarmScheduler.buildAppNotificationSettingsIntent(getContext());
        try {
            startActivityForResult(call, intent, "settingsCallback");
        } catch (Exception e) {
            call.resolve(getBackgroundStatusPayload());
        }
    }

    @ActivityCallback
    private void settingsCallback(PluginCall call, ActivityResult result) {
        call.resolve(getBackgroundStatusPayload());
    }

    @PluginMethod
    public void consumePendingAction(PluginCall call) {
        boolean quickDeposit = MainActivity.consumePendingQuickDepositFlag();
        JSObject res = new JSObject();
        res.put("action", quickDeposit ? "quick-deposit" : null);
        call.resolve(res);
    }

    private void startAlertService(
        Context ctx,
        String title,
        String body,
        String speechText,
        String ttsLang,
        boolean playAlarm
    ) {
        Intent serviceIntent = new Intent(ctx, HunterAlertService.class);
        serviceIntent.putExtra(HunterAlertService.EXTRA_TITLE, !TextUtils.isEmpty(title) ? title : "Hunter Fund — Reminder");
        serviceIntent.putExtra(HunterAlertService.EXTRA_BODY, body != null ? body : "");
        serviceIntent.putExtra(HunterAlertService.EXTRA_SPEECH_TEXT, speechText != null ? speechText : "");
        serviceIntent.putExtra(HunterAlertService.EXTRA_TTS_LANG, !TextUtils.isEmpty(ttsLang) ? ttsLang : "hi-IN");
        serviceIntent.putExtra(HunterAlertService.EXTRA_PLAY_ALARM, playAlarm);
        ContextCompat.startForegroundService(ctx, serviceIntent);
    }

    private HunterCopyGenerator.HunterState stateFromCall(PluginCall call) {
        HunterCopyGenerator.HunterState current = HunterCopyGenerator.loadState(getContext());
        HunterCopyGenerator.HunterState s = new HunterCopyGenerator.HunterState();

        s.enabled = call.getBoolean("enabled", current.enabled);
        s.quietHoursEnabled = call.getBoolean("quietHoursEnabled", current.quietHoursEnabled);
        s.quietStartHour = call.getInt("quietStartHour", current.quietStartHour);
        s.quietEndHour = call.getInt("quietEndHour", current.quietEndHour);
        s.voiceLanguage = call.getString("voiceLanguage", current.voiceLanguage);
        s.targetAmount = call.getDouble("targetAmount", current.targetAmount);
        s.currentBalance = call.getDouble("currentBalance", current.currentBalance);
        s.remainingAmount = call.getDouble("remainingAmount", current.remainingAmount);
        s.targetDate = call.getString("targetDate", current.targetDate);
        s.syncedDate = call.getString("syncedDate", HunterCopyGenerator.getTodayDateString());
        s.todayActualSavings = call.getDouble("todayActualSavings", current.todayActualSavings);
        s.todayPlannedSavings = call.getDouble("todayPlannedSavings", current.todayPlannedSavings);
        s.daysRemaining = call.getInt("daysRemaining", (int) current.daysRemaining);
        s.bikeModel = call.getString("bikeModel", current.bikeModel);
        return s;
    }

    private JSObject getBackgroundStatusPayload() {
        Context ctx = getContext();
        JSObject obj = new JSObject();
        obj.put("notificationsEnabled", HunterAlarmScheduler.areNotificationsEnabled(ctx));
        obj.put("canScheduleExactAlarms", HunterAlarmScheduler.canScheduleExactAlarms(ctx));
        obj.put("ignoringBatteryOptimizations", HunterAlarmScheduler.isIgnoringBatteryOptimizations(ctx));
        obj.put("nextAlarmAt", HunterCopyGenerator.getNextAlarmAt(ctx));
        obj.put("androidApi", Build.VERSION.SDK_INT);
        return obj;
    }
}

