package com.sabeel.recitation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.recitation.domain.EvaluationJob;
import com.sabeel.recitation.event.OutboxService;
import com.sabeel.recitation.exception.ApiException;
import com.sabeel.recitation.repository.EvaluationJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecitationServiceTest {
    private EvaluationJobRepository jobRepository;
    private SpeechToTextEngine engine;
    private OutboxService outboxService;
    private RecitationService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        jobRepository = mock(EvaluationJobRepository.class);
        engine = mock(SpeechToTextEngine.class);
        outboxService = mock(OutboxService.class);
        service = new RecitationService(jobRepository, engine, new ArabicNormalizer(), new AlignmentEngine(),
                outboxService, new ObjectMapper());
        when(jobRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void requestCreatesPendingJobAndEmitsEvent() {
        EvaluationJob job = service.requestEvaluation(userId, 1, 1, 7, null, null, "بسم الله", "بسم الله الرحمن الرحيم");
        assertEquals(EvaluationJob.Status.PENDING, job.getStatus());
        verify(outboxService).record(eq("recitation.evaluation.requested"), eq(job.getId().toString()), anyMap());
    }

    @Test
    void requestRequiresAudioOrTranscript() {
        assertThrows(ApiException.class, () ->
                service.requestEvaluation(userId, 1, 1, 2, null, null, null, "بسم الله"));
    }

    @Test
    void requestRejectsBackwardsRange() {
        assertThrows(ApiException.class, () ->
                service.requestEvaluation(userId, 1, 5, 2, "key", null, null, "text"));
    }

    @Test
    void executeCompletesJobAndEmitsResult() {
        EvaluationJob job = pendingJob();
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(engine.transcribe(job)).thenReturn("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
        service.execute(job.getId());
        assertEquals(EvaluationJob.Status.COMPLETED, job.getStatus());
        assertEquals(100.0, job.getAccuracy());
        assertEquals(0, job.getMistakeCount());
        verify(outboxService).record(eq("recitation.evaluation.completed"), eq(job.getId().toString()), anyMap());
    }

    @Test
    void executeCountsMistakesAfterNormalization() {
        EvaluationJob job = pendingJob();
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(engine.transcribe(job)).thenReturn("بسم الله الرحيم");
        service.execute(job.getId());
        assertEquals(EvaluationJob.Status.COMPLETED, job.getStatus());
        assertEquals(1, job.getMistakeCount());
        assertEquals(75.0, job.getAccuracy());
        assertTrue(job.getMistakesJson().contains("OMISSION"));
    }

    @Test
    void engineFailureMarksJobFailedWithReason() {
        EvaluationJob job = pendingJob();
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(engine.transcribe(job)).thenThrow(new IllegalStateException("no speech-to-text engine configured"));
        service.execute(job.getId());
        assertEquals(EvaluationJob.Status.FAILED, job.getStatus());
        assertEquals("no speech-to-text engine configured", job.getError());
        verify(outboxService, never()).record(eq("recitation.evaluation.completed"), any(), anyMap());
    }

    @Test
    void getOwnedRejectsOtherUsersJob() {
        EvaluationJob job = pendingJob();
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        assertThrows(ApiException.class, () -> service.getOwned(UUID.randomUUID(), job.getId()));
    }

    @Test
    void completedJobIsNotReExecuted() {
        EvaluationJob job = pendingJob();
        job.setStatus(EvaluationJob.Status.COMPLETED);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        service.execute(job.getId());
        verifyNoInteractions(engine);
    }

    private EvaluationJob pendingJob() {
        return EvaluationJob.builder().id(UUID.randomUUID()).userId(userId).surahId(1).fromAyah(1).toAyah(4)
                .expectedText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
                .status(EvaluationJob.Status.PENDING).createdAt(Instant.now()).build();
    }
}
