package com.sabeel.prayer;

import com.sabeel.prayer.service.AdhanCatalog;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class AdhanCatalogTest {
    @Test
    void emptyWithoutAFile() {
        assertTrue(new AdhanCatalog().adhans().isEmpty());
    }

    @Test
    void keepsValidEntriesAndDropsBadOnes(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("adhans.json");
        Files.writeString(file, "{\"adhans\":[{\"id\":\"mine\",\"name\":\"My adhan\",\"url\":\"https://example.org/a.mp3\"},"
                + "{\"id\":\"Bad Id\",\"name\":\"x\",\"url\":\"https://example.org/b.mp3\"},"
                + "{\"id\":\"js\",\"name\":\"x\",\"url\":\"javascript:alert(1)\"}]}");
        var list = new AdhanCatalog(file.toString()).adhans();
        assertEquals(1, list.size());
        assertEquals("mine", list.get(0).id());
    }
}
