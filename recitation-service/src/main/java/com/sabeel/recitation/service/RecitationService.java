package com.sabeel.recitation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.recitation.domain.EvaluationJob;
import com.sabeel.recitation.event.OutboxService;
import com.sabeel.recitation.exception.ApiException;
import com.sabeel.recitation.repository.EvaluationJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.recitation.config.KafkaConfig.TOPIC_EVALUATION_COMPLETED;
import static com.sabeel.recitation.config.KafkaConfig.TOPIC_EVALUATION_REQUESTED;

@Service
@RequiredArgsConstructor
public class RecitationService {
    private final EvaluationJobRepository jobRepository;
    private final SpeechToTextEngine speechToTextEngine;
    private final ArabicNormalizer normalizer;
    private final AlignmentEngine alignmentEngine;
    private final OutboxService outboxService;
    private final ObjectMapper objectMapper;

    @Transactional
    public EvaluationJob requestEvaluation(UUID userId, int surahId, int fromAyah, int toAyah,
                                           String audioObjectKey, String audioUrl, String transcript,
                                           String expectedText) {
        if (fromAyah < 1 || toAyah < fromAyah) {
            throw ApiException.badRequest("invalid ayah range");
        }
        if ((audioObjectKey == null || audioObjectKey.isBlank())
                && (audioUrl == null || audioUrl.isBlank())
                && (transcript == null || transcript.isBlank())) {
            throw ApiException.badRequest("provide an audioUrl or a transcript");
        }
        if (audioUrl != null && !audioUrl.isBlank()) {
            AudioSourceGuard.validatePublicHttpUrl(audioUrl);
        }
        EvaluationJob job = jobRepository.save(EvaluationJob.builder()
                .id(UUID.randomUUID()).userId(userId).surahId(surahId).fromAyah(fromAyah).toAyah(toAyah)
                .audioObjectKey(audioObjectKey).audioUrl(audioUrl).transcript(transcript).expectedText(expectedText)
                .status(EvaluationJob.Status.PENDING).createdAt(Instant.now()).build());
        outboxService.record(TOPIC_EVALUATION_REQUESTED, job.getId().toString(), Map.of(
                "jobId", job.getId().toString(), "userId", userId.toString(),
                "surahId", surahId, "fromAyah", fromAyah, "toAyah", toAyah,
                "audioObjectKey", audioObjectKey == null ? "" : audioObjectKey,
                "audioUrl", audioUrl == null ? "" : audioUrl));
        return job;
    }

    @Transactional
    public void execute(UUID jobId) {
        EvaluationJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> ApiException.notFound("evaluation job not found"));
        if (job.getStatus() == EvaluationJob.Status.COMPLETED) {
            return;
        }
        job.setStatus(EvaluationJob.Status.RUNNING);
        job.setEngineMode(speechToTextEngine.mode());
        jobRepository.save(job);
        try {
            String transcript = speechToTextEngine.transcribe(job);
            job.setTranscript(transcript);
            AlignmentEngine.Result result = alignmentEngine.align(
                    normalizer.tokens(job.getExpectedText()), normalizer.tokens(transcript));
            job.setMistakeCount(result.mistakes().size());
            job.setAccuracy(result.accuracy());
            job.setMistakesJson(serialize(result.mistakes()));
            job.setStatus(EvaluationJob.Status.COMPLETED);
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);
            outboxService.record(TOPIC_EVALUATION_COMPLETED, job.getId().toString(), Map.of(
                    "jobId", job.getId().toString(), "userId", job.getUserId().toString(),
                    "mistakeCount", job.getMistakeCount(), "accuracy", job.getAccuracy()));
        } catch (Exception e) {
            job.setStatus(EvaluationJob.Status.FAILED);
            job.setError(e.getMessage() == null ? "evaluation failed" : e.getMessage());
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);
        }
    }

    public EvaluationJob getOwned(UUID userId, UUID jobId) {
        EvaluationJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> ApiException.notFound("evaluation job not found"));
        if (!job.getUserId().equals(userId)) {
            throw ApiException.notFound("evaluation job not found");
        }
        return job;
    }

    public List<EvaluationJob> myJobs(UUID userId) {
        return jobRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
