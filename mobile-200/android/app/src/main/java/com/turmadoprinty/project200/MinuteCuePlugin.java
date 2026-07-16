package com.turmadoprinty.project200;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MinuteCue",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class MinuteCuePlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), MinuteCueService.class);
        intent.setAction(MinuteCueService.ACTION_START);
        intent.putExtra("sessionId", call.getString("sessionId", ""));
        intent.putExtra("taskTitle", call.getString("taskTitle", "Tarefa em andamento"));
        intent.putExtra("remainingSeconds", Math.max(0, call.getInt("remainingSeconds", 0)));
        intent.putExtra("intervalMinutes", Math.max(0, call.getInt("intervalMinutes", 0)));
        intent.putExtra("finalMinutesEnabled", call.getBoolean("finalMinutesEnabled", true));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MinuteCueService.class));
        call.resolve();
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(result);
    }
}
