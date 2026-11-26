package com.sabeel.recitation.service;

import com.sabeel.recitation.domain.EvaluationJob;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class WhisperCppSpeechToTextEngineTest {
    private final AudioSourceGuard guard = new AudioSourceGuard(1024, 5);

    private WhisperCppSpeechToTextEngine engineWithBinary(String binary) {
        return new WhisperCppSpeechToTextEngine(binary, "/nonexistent-model.bin", 4, 30, 600, guard);
    }

    @Test
    void missingBinaryFailsWithExplicitReason() {
        EvaluationJob job = job("https://example.com/a.mp3");
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> engineWithBinary("/nonexistent/whisper-cli").transcribe(job));
        assertTrue(e.getMessage().contains("whisper-cli binary not found"));
    }

    @Test
    void missingModelFailsWithExplicitReason() {
        String fakeBinary = "/bin/true";
        EvaluationJob job = job("https://example.com/a.mp3");
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> engineWithBinary(fakeBinary).transcribe(job));
        assertTrue(e.getMessage().contains("whisper model not found"));
    }

    @Test
    void missingAudioUrlFailsWithExplicitReason() {
        EvaluationJob job = job(null);
        job.setAudioObjectKey("media-object-key");
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> engineWithBinary("/bin/true").transcribe(job));
        assertTrue(e.getMessage().contains("requires an audioUrl"));
    }

    @Test
    void modeLabelsLocalAsr() {
        assertEquals("WHISPER_CPP_LOCAL_ASR", engineWithBinary("/bin/true").mode());
    }

    @Test
    void parsesWhisperOutputStrippingTimestamps() {
        String raw = "[00:00:00.000 --> 00:00:02.500]   بسم الله الرحمن الرحيم\n 17] الحمد لله رب العالمين\n";
        assertEquals("بسم الله الرحمن الرحيم الحمد لله رب العالمين",
                WhisperCppSpeechToTextEngine.parseWhisperOutput(raw));
    }

    @Test
    void parsesEmptyOutputToBlank() {
        assertEquals("", WhisperCppSpeechToTextEngine.parseWhisperOutput("[00:00:00.000 --> 00:00:01.000]\n"));
    }


    @Test
    void outputOverOneMbIsTerminatedDuringExecution() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                BoundedProcessRunner.run(List.of("head", "-c", "3000000", "/dev/zero"), 30, "probe failed"));
        assertTrue(e.getMessage().contains("output exceeded 1 MB"));
    }

    @Test
    void normalOutputIsReturned() {
        String out = BoundedProcessRunner.run(List.of("printf", "hello-asr"), 30, "probe failed");
        assertEquals("hello-asr", out);
    }

    @Test
    void stderrIsNotMergedIntoStdout() {
        String out = BoundedProcessRunner.run(
                List.of("sh", "-c", "echo 51865 1500 512 >&2; printf transcript-only"), 30, "probe failed");
        assertEquals("transcript-only", out);
    }

    private EvaluationJob job(String audioUrl) {
        return EvaluationJob.builder().id(UUID.randomUUID()).userId(UUID.randomUUID())
                .surahId(1).fromAyah(1).toAyah(1).audioUrl(audioUrl).expectedText("نص")
                .status(EvaluationJob.Status.PENDING).createdAt(Instant.now()).build();
    }
}
