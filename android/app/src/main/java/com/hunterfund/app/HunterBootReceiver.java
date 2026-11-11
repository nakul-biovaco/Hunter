package com.hunterfund.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.UserManager;
import android.util.Log;

/**
 * Automatically restores the hourly alarm chain after phone reboot, app update,
 * or system clock/timezone adjustments — no need to reopen the app.
 */
public class HunterBootReceiver extends BroadcastReceiver {

    private static final String TAG = "HunterBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                UserManager um = context.getSystemService(UserManager.class);
                if (um == null || !um.isUserUnlocked()) {
                    return;
                }
            } catch (Exception e) {
                return;
            }
        }

        try {
            Log.d(TAG, "Restoring Hunter hourly alarms after system event: " + intent.getAction());
            HunterAlarmScheduler.rescheduleFromState(context);
        } catch (Exception e) {
            Log.e(TAG, "Failed to restore Hunter alarms: " + e.getMessage());
        }
    }
}

