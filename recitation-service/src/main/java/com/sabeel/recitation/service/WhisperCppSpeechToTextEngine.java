package com.sabeel.recitation.service;

import com.sabeel.recitation.domain.EvaluationJob;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
@ConditionalOnProperty(name = "recitation.engine", havingValue = "whispercpp")
public class WhisperCppSpeechToTextEngine implements SpeechToTextEngine {
    private final String binaryPath;
    private final String modelPath;
    private final int threads;
    private final int timeoutSeconds;
    private final int maxDurationSeconds;
    private final AudioSourceGuard audioSourceGuard;

    public WhisperCppSpeechToTextEngine(
            @Value("${recitation.whisper.binary-path:/opt/whisper/whisper-cli}") String binaryPath,
            @Value("${recitation.whisper.model-path:/opt/whisper/model.bin}") String modelPath,
            @Value("${recitation.whisper.threads:4}") int threads,
            @Value("${recitation.whisper.timeout-seconds:300}") int timeoutSeconds,
            @Value("${recitation.audio.max-duration-seconds:600}") int maxDurationSeconds,
            AudioSourceGuard audioSourceGuard) {
        this.binaryPath = binaryPath;
        this.modelPath = modelPath;
        this.threads = threads;
        this.timeoutSeconds = timeoutSeconds;
        this.maxDurationSeconds = maxDurationSeconds;
        this.audioSourceGuard = audioSourceGuard;
    }

    @Override
    public String mode() {
        return "WHISPER_CPP_LOCAL_ASR";
    }

    @Override
    public String transcribe(EvaluationJob job) {
        String audioUrlFirst = job.getAudioUrl();
        if (audioUrlFirst == null || audioUrlFirst.isBlank()) {
            throw new IllegalStateException(
                    "whispercpp engine requires an audioUrl on the job (media-service object keys are not yet supported)");
        }
        if (!Files.isRegularFile(Path.of(binaryPath))) {
            throw new IllegalStateException("whisper-cli binary not found at " + binaryPath
                    + "; build the whisper-enabled image or set recitation.engine=passthrough");
        }
        if (!Files.isRegularFile(Path.of(modelPath))) {
            throw new IllegalStateException("whisper model not found at " + modelPath);
        }
        String audioUrl = audioUrlFirst;
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("sabeel-asr-");
            Path downloaded = audioSourceGuard.download(audioUrl, workDir.resolve("audio.bin"));
            double duration = probeDuration(downloaded);
            if (duration > maxDurationSeconds) {
                throw new IllegalStateException("audio duration " + Math.round(duration)
                        + "s exceeds the " + maxDurationSeconds + "s limit");
            }
            Path wav = workDir.resolve("audio.wav");
            run(List.of("ffmpeg", "-y", "-loglevel", "error", "-i", downloaded.toString(),
                    "-t", String.valueOf(maxDurationSeconds),
                    "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav.toString()), 120, "audio conversion failed");
            String output = run(List.of(binaryPath, "-m", modelPath, "-l", "ar", "-nt",
                    "-t", String.valueOf(threads), "-f", wav.toString()), timeoutSeconds, "transcription failed");
            String transcript = parseWhisperOutput(output);
            if (transcript.isBlank()) {
                throw new IllegalStateException("transcription produced no speech text");
            }
            return transcript;
        } catch (IOException e) {
            throw new IllegalStateException("ASR workspace error: " + e.getMessage());
        } finally {
            if (workDir != null) {
                try (var paths = Files.list(workDir)) {
                    paths.forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                        }
                    });
                    Files.deleteIfExists(workDir);
                } catch (IOException ignored) {
                }
            }
        }
    }

    private double probeDuration(Path wav) {
        String out = run(List.of("ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", wav.toString()), 30, "duration probe failed");
        try {
            return Double.parseDouble(out.trim());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("could not read audio duration");
        }
    }

    private String run(List<String> command, int timeoutSeconds, String errorPrefix) {
        return BoundedProcessRunner.run(command, timeoutSeconds, errorPrefix);
    }

    static String parseWhisperOutput(String raw) {
        List<String> tokens = new ArrayList<>();
        for (String token : raw.replace('\n', ' ').trim().split("\\s+")) {
            if (token.isBlank() || token.contains("[") || token.contains("]") || token.equals("-->")) {
                continue;
            }
            tokens.add(token);
        }
        return String.join(" ", tokens).trim();
    }
}
