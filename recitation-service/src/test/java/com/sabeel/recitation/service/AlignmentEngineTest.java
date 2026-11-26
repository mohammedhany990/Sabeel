package com.sabeel.recitation.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AlignmentEngineTest {
    private final AlignmentEngine engine = new AlignmentEngine();

    @Test
    void perfectMatchScores100() {
        var result = engine.align(List.of("بسم", "الله", "الرحمن"), List.of("بسم", "الله", "الرحمن"));
        assertEquals(100.0, result.accuracy());
        assertTrue(result.mistakes().isEmpty());
    }

    @Test
    void substitutionIsCounted() {
        var result = engine.align(List.of("بسم", "الله", "الرحمن"), List.of("بسم", "الله", "الرحيم"));
        assertEquals(1, result.mistakes().size());
        assertEquals("SUBSTITUTION", result.mistakes().get(0).type());
        assertEquals("الرحمن", result.mistakes().get(0).expected());
        assertEquals("الرحيم", result.mistakes().get(0).actual());
        assertEquals(66.67, result.accuracy());
    }

    @Test
    void omissionIsCounted() {
        var result = engine.align(List.of("بسم", "الله", "الرحمن"), List.of("بسم", "الرحمن"));
        assertEquals(1, result.mistakes().size());
        assertEquals("OMISSION", result.mistakes().get(0).type());
        assertEquals(66.67, result.accuracy());
    }

    @Test
    void additionIsCounted() {
        var result = engine.align(List.of("بسم", "الله"), List.of("بسم", "الله", "الرحمن"));
        assertEquals(1, result.mistakes().size());
        assertEquals("ADDITION", result.mistakes().get(0).type());
        assertEquals(50.0, result.accuracy());
    }

    @Test
    void emptyExpectedScoresZeroWhenActualPresent() {
        var result = engine.align(List.of(), List.of("بسم"));
        assertEquals(0.0, result.accuracy());
    }

    @Test
    void bothEmptyScores100() {
        assertEquals(100.0, engine.align(List.of(), List.of()).accuracy());
    }
}
