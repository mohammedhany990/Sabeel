package com.sabeel.recitation.service;

import com.sabeel.recitation.domain.EvaluationJob;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "recitation.engine", havingValue = "passthrough")
public class TranscriptPassthroughEngine implements SpeechToTextEngine {
    @Override
    public String transcribe(EvaluationJob job) {
        if (job.getTranscript() == null || job.getTranscript().isBlank()) {
            throw new IllegalStateException("passthrough engine requires a transcript on the job");
        }
        return job.getTranscript();
    }

    @Override
    public String mode() {
        return "TRANSCRIPT_COMPARISON_DEMO";
    }
}
