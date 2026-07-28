package com.turmadoprinty.project200;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.URLUtil;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String UPDATE_HOST = "pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev";
    private static final String UPDATE_PATH_PREFIX = "/project200/app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getBridge().getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                boolean trustedUpdate = "https".equalsIgnoreCase(uri.getScheme())
                    && UPDATE_HOST.equalsIgnoreCase(uri.getHost())
                    && path != null
                    && path.startsWith(UPDATE_PATH_PREFIX);

                if (!trustedUpdate) {
                    Toast.makeText(this, "Link de atualização inválido.", Toast.LENGTH_LONG).show();
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
                request.setDescription("Atualização do iLife Mindset");
                request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                );
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                DownloadManager downloadManager =
                    (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (downloadManager == null) {
                    throw new IllegalStateException("Gerenciador de downloads indisponível.");
                }
                downloadManager.enqueue(request);
                Toast.makeText(this, "Baixando atualização do iLife…", Toast.LENGTH_LONG).show();
            } catch (Exception error) {
                Toast.makeText(
                    this,
                    "Não foi possível iniciar o download da atualização.",
                    Toast.LENGTH_LONG
                ).show();
            }
        });
    }
}