package com.turmadoprinty.project200;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MinuteCuePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
