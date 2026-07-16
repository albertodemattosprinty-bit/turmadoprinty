package com.turmadoprinty.project200;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MinuteCueService extends Service {
    public static final String ACTION_START = "com.turmadoprinty.project200.MINUTE_CUE_START";
    public static final String ACTION_STOP = "com.turmadoprinty.project200.MINUTE_CUE_STOP";

    private static final String CHANNEL_ID = "ilife_task_countdown";
    private static final int NOTIFICATION_ID = 2001;
    private static final long PRELOAD_MS = 6000L;
    private static final int MAX_MINUTES = 360;
    private static final String AUDIO_BASE_URL = "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/project200/audio/pt-BR/minutos-restantes/v1";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Set<Integer> playedMinutes = new HashSet<>();
    private final List<MediaPlayer> preparedPlayers = new ArrayList<>();
    private final Set<MediaPlayer> readyPlayers = new HashSet<>();
    private long endAtElapsedMs = 0L;
    private int intervalMinutes = 0;
    private boolean finalMinutesEnabled = true;
    private int preparedMinute = 0;
    private boolean playingCue = false;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            tick();
            if (endAtElapsedMs > 0L) handler.postDelayed(this, 250L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopCountdown();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) return START_NOT_STICKY;

        String taskTitle = intent.getStringExtra("taskTitle");
        int remainingSeconds = Math.max(0, intent.getIntExtra("remainingSeconds", 0));
        intervalMinutes = normalizeInterval(intent.getIntExtra("intervalMinutes", 0));
        finalMinutesEnabled = intent.getBooleanExtra("finalMinutesEnabled", true);
        endAtElapsedMs = SystemClock.elapsedRealtime() + (remainingSeconds * 1000L);
        playedMinutes.clear();
        releasePreparedPlayers();
        startForeground(NOTIFICATION_ID, buildNotification(taskTitle));
        handler.removeCallbacks(ticker);
        handler.post(ticker);
        return START_NOT_STICKY;
    }

    private int normalizeInterval(int value) {
        return value == 1 || value == 3 || value == 5 || value == 10 ? value : 0;
    }

    private boolean shouldAnnounce(int minute) {
        if (minute < 1 || minute > MAX_MINUTES) return false;
        boolean intervalCue = intervalMinutes > 0 && minute % intervalMinutes == 0;
        boolean finalCue = finalMinutesEnabled && (minute == 5 || minute == 3 || minute == 1);
        return intervalCue || finalCue;
    }

    private int findNextMinute(long remainingMs) {
        int highestMinute = Math.min(MAX_MINUTES, (int) Math.floor((remainingMs + 999L) / 60000d));
        for (int minute = highestMinute; minute >= 1; minute--) {
            if (shouldAnnounce(minute) && !playedMinutes.contains(minute)) return minute;
        }
        return 0;
    }

    private void tick() {
        long remainingMs = endAtElapsedMs - SystemClock.elapsedRealtime();
        if (remainingMs <= 0L) {
            stopCountdown();
            return;
        }
        int minute = findNextMinute(remainingMs);
        if (minute <= 0) return;
        long untilCueMs = remainingMs - (minute * 60000L);
        if (untilCueMs <= PRELOAD_MS && preparedMinute != minute) prepareMinute(minute);
        if (untilCueMs <= 120L && untilCueMs >= -900L && !playedMinutes.contains(minute)) {
            playedMinutes.add(minute);
            playPreparedPlayers(minute);
        }
    }

    private List<String> buildUrls(int minute) {
        List<String> urls = new ArrayList<>();
        if (minute <= 60 || minute % 5 == 0) {
            urls.add(fileUrl(minute));
            return urls;
        }
        int hourMinutes = (minute / 60) * 60;
        int remainder = minute % 60;
        urls.add(fileUrl(hourMinutes));
        urls.add(fileUrl(remainder));
        return urls;
    }

    private String fileUrl(int minute) {
        return AUDIO_BASE_URL + "/" + String.format(java.util.Locale.US, "%03d-minutos.mp3", minute);
    }

    private void prepareMinute(int minute) {
        releasePreparedPlayers();
        preparedMinute = minute;
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build();
        for (String url : buildUrls(minute)) {
            MediaPlayer player = new MediaPlayer();
            preparedPlayers.add(player);
            try {
                player.setAudioAttributes(attributes);
                player.setDataSource(url);
                player.setOnPreparedListener(readyPlayers::add);
                player.setOnErrorListener((failedPlayer, what, extra) -> {
                    readyPlayers.remove(failedPlayer);
                    return true;
                });
                player.prepareAsync();
            } catch (Exception error) {
                preparedPlayers.remove(player);
                player.release();
            }
        }
    }

    private void playPreparedPlayers(int minute) {
        if (playingCue || preparedMinute != minute || preparedPlayers.isEmpty()) return;
        if (readyPlayers.size() != preparedPlayers.size()) {
            handler.postDelayed(() -> playPreparedPlayers(minute), 120L);
            return;
        }
        playingCue = true;
        requestAudioFocus();
        playPlayerAt(0);
    }

    private void playPlayerAt(int index) {
        if (index >= preparedPlayers.size()) {
            playingCue = false;
            abandonAudioFocus();
            releasePreparedPlayers();
            return;
        }
        MediaPlayer player = preparedPlayers.get(index);
        player.setOnCompletionListener(completed -> playPlayerAt(index + 1));
        try {
            player.seekTo(0);
            player.start();
        } catch (Exception error) {
            playPlayerAt(index + 1);
        }
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build())
                .build();
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(null);
        }
        audioFocusRequest = null;
    }

    private void releasePreparedPlayers() {
        for (MediaPlayer player : preparedPlayers) {
            try { player.stop(); } catch (Exception ignored) {}
            try { player.release(); } catch (Exception ignored) {}
        }
        preparedPlayers.clear();
        readyPlayers.clear();
        preparedMinute = 0;
        playingCue = false;
    }

    private Notification buildNotification(String taskTitle) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        String safeTitle = taskTitle == null || taskTitle.trim().isEmpty() ? "Tarefa em andamento" : taskTitle.trim();
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("iLife Mindset • contagem ativa")
            .setContentText(safeTitle + " • avisos de minutos em português")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Contagem de tarefas",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Mantém os avisos de tempo das tarefas ativos em segundo plano.");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }

    private void stopCountdown() {
        endAtElapsedMs = 0L;
        handler.removeCallbacks(ticker);
        releasePreparedPlayers();
        abandonAudioFocus();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopCountdown();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
