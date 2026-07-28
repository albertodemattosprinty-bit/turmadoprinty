package com.turmadoprinty.project200;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String UPDATE_HOST = "pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev";
    private static final String UPDATE_PATH_PREFIX = "/project200/app/";
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 2007;
    private static final String[] MEDIA_PERMISSIONS = new String[] {
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!hasMediaPermissions()) {
                        ensureMediaPermissions();
                        request.deny();
                        Toast.makeText(MainActivity.this, "Permita camera e microfone e tente novamente.", Toast.LENGTH_LONG).show();
                        return;
                    }
                    request.grant(request.getResources());
                });
            }
        });

        ensureMediaPermissions();

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                boolean trustedUpdate = "https".equalsIgnoreCase(uri.getScheme())
                    && UPDATE_HOST.equalsIgnoreCase(uri.getHost())
                    && path != null
                    && path.startsWith(UPDATE_PATH_PREFIX);

                if (!trustedUpdate) {
                    Toast.makeText(this, "Link de atualizacao invalido.", Toast.LENGTH_LONG).show();
                    return;
                }

                String resolvedMimeType = mimeType == null || mimeType.trim().isEmpty()
                    ? "application/vnd.android.package-archive"
                    : mimeType;
                String fileName = URLUtil.guessFileName(url, contentDisposition, resolvedMimeType);
                DownloadManager.Request request = new DownloadManager.Request(uri);
                request.setMimeType(resolvedMimeType);
                if (userAgent != null && !userAgent.trim().isEmpty()) {
                    request.addRequestHeader("User-Agent", userAgent);
                }
                request.setTitle(fileName);
                request.setDescription("Atualizacao do iLife Mindset");
                request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                );
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                DownloadManager downloadManager =
                    (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (downloadManager == null) {
                    throw new IllegalStateException("Gerenciador de downloads indisponivel.");
                }
                downloadManager.enqueue(request);
                Toast.makeText(this, "Baixando atualizacao do iLife...", Toast.LENGTH_LONG).show();
            } catch (Exception error) {
                Toast.makeText(
                    this,
                    "Nao foi possivel iniciar o download da atualizacao.",
                    Toast.LENGTH_LONG
                ).show();
            }
        });
    }

    private boolean hasMediaPermissions() {
        for (String permission : MEDIA_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    private void ensureMediaPermissions() {
        if (hasMediaPermissions()) {
            return;
        }
        ActivityCompat.requestPermissions(this, MEDIA_PERMISSIONS, MEDIA_PERMISSION_REQUEST_CODE);
    }
}
