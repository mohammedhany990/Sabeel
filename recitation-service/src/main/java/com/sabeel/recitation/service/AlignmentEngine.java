package com.sabeel.recitation.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class AlignmentEngine {

    public record Mistake(String type, String expected, String actual, int position) {
    }

    public record Result(List<Mistake> mistakes, double accuracy) {
    }

    public Result align(List<String> expected, List<String> actual) {
        int n = expected.size();
        int m = actual.size();
        if (n == 0) {
            return new Result(List.of(), m == 0 ? 100.0 : 0.0);
        }
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 0; i <= n; i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= m; j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                int cost = expected.get(i - 1).equals(actual.get(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j - 1] + cost,
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1));
            }
        }
        List<Mistake> mistakes = new ArrayList<>();
        int i = n;
        int j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && expected.get(i - 1).equals(actual.get(j - 1))
                    && dp[i][j] == dp[i - 1][j - 1]) {
                i--;
                j--;
            } else if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + 1) {
                mistakes.add(new Mistake("SUBSTITUTION", expected.get(i - 1), actual.get(j - 1), i - 1));
                i--;
                j--;
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
                mistakes.add(new Mistake("OMISSION", expected.get(i - 1), null, i - 1));
                i--;
            } else {
                mistakes.add(new Mistake("ADDITION", null, actual.get(j - 1), j - 1));
                j--;
            }
        }
        java.util.Collections.reverse(mistakes);
        double accuracy = Math.max(0.0, 100.0 * (1.0 - (double) dp[n][m] / n));
        return new Result(mistakes, Math.round(accuracy * 100.0) / 100.0);
    }
}
