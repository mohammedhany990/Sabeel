package com.sabeel.recitation.service;

import com.sabeel.recitation.domain.EvaluationJob;

public interface SpeechToTextEngine {
    String transcribe(EvaluationJob job);

    String mode();
}
