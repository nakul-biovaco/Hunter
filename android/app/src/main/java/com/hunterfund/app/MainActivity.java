package com.hunterfund.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static volatile boolean pendingQuickDeposit = false;

    public static boolean consumePendingQuickDepositFlag() {
        boolean val = pendingQuickDeposit;
        pendingQuickDeposit = false;
        return val;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HunterAlarmPlugin.class);
        captureLaunchAction(getIntent());
        super.onCreate(savedInstanceState);
        HunterAlarmScheduler.ensureChannels(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        captureLaunchAction(intent);
        super.onNewIntent(intent);
    }

    private void captureLaunchAction(Intent intent) {
        if (intent != null && "quick-deposit".equals(intent.getStringExtra("hunter_action"))) {
            pendingQuickDeposit = true;
        }
    }
}
