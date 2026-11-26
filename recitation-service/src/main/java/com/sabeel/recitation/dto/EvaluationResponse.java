package com.sabeel.recitation.dto;

import com.sabeel.recitation.domain.EvaluationJob;

public record EvaluationResponse(String id, int surahId, int fromAyah, int toAyah, String status,
                                 String evaluationMode, Integer mistakeCount, Double accuracy,
                                 String mistakes, String error, String createdAt, String completedAt) {
    public static EvaluationResponse of(EvaluationJob job) {
        return new EvaluationResponse(job.getId().toString(), job.getSurahId(), job.getFromAyah(),
                job.getToAyah(), job.getStatus().name(), job.getEngineMode(), job.getMistakeCount(),
                job.getAccuracy(), job.getMistakesJson(), job.getError(), job.getCreatedAt().toString(),
                job.getCompletedAt() == null ? null : job.getCompletedAt().toString());
    }
}
