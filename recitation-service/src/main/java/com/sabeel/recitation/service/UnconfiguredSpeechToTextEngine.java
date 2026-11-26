package com.sabeel.recitation.service;

import com.sabeel.recitation.domain.EvaluationJob;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "recitation.engine", havingValue = "none", matchIfMissing = true)
public class UnconfiguredSpeechToTextEngine implements SpeechToTextEngine {
    @Override
    public String transcribe(EvaluationJob job) {
        throw new IllegalStateException(
                "no speech-to-text engine configured; set recitation.engine and provide engine credentials");
    }

    @Override
    public String mode() {
        return "UNCONFIGURED_NO_ASR";
    }
}
