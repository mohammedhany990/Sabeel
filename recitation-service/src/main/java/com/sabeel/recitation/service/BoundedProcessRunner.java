package com.sabeel.recitation.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

final class BoundedProcessRunner {
    static final int MAX_OUTPUT_BYTES = 1_000_000;

    private BoundedProcessRunner() {
    }

    static String run(List<String> command, int timeoutSeconds, String errorPrefix) {
        Process process;
        try {
            process = new ProcessBuilder(command).redirectError(ProcessBuilder.Redirect.DISCARD).start();
        } catch (IOException e) {
            throw new IllegalStateException(errorPrefix + ": " + e.getMessage());
        }
        AtomicBoolean overflow = new AtomicBoolean();
        ByteArrayOutputStream collected = new ByteArrayOutputStream();
        Thread drainer = new Thread(() -> {
            byte[] buffer = new byte[8192];
            try (InputStream in = process.getInputStream()) {
                int n;
                while ((n = in.read(buffer)) != -1) {
                    synchronized (collected) {
                        if (collected.size() + n > MAX_OUTPUT_BYTES) {
                            overflow.set(true);
                            process.destroyForcibly();
                            return;
                        }
                        collected.write(buffer, 0, n);
                    }
                }
            } catch (IOException ignored) {
            }
        });
        drainer.setDaemon(true);
        drainer.start();
        try {
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException(errorPrefix + ": exceeded " + timeoutSeconds + "s limit");
            }
            drainer.join(5000);
            if (overflow.get()) {
                throw new IllegalStateException(errorPrefix + ": output exceeded 1 MB");
            }
            if (process.exitValue() != 0) {
                throw new IllegalStateException(errorPrefix + ": exit " + process.exitValue());
            }
            synchronized (collected) {
                return collected.toString(StandardCharsets.UTF_8);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
            throw new IllegalStateException(errorPrefix + ": interrupted");
        }
    }
}
