package com.sabeel.recitation.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AudioSourceGuardTest {

    @Test
    void rejectsNonHttpSchemes() {
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("ftp://example.com/a.mp3"));
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("file:///etc/passwd"));
    }

    @Test
    void rejectsLoopbackAndPrivateHosts() {
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("http://127.0.0.1/a.mp3"));
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("http://localhost/a.mp3"));
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("http://192.168.1.10/a.mp3"));
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("http://169.254.169.254/latest/meta-data"));
    }

    @Test
    void rejectsUnresolvableAndHostless() {
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("http://nonexistent.invalid.example/a.mp3"));
        assertThrows(AudioFetchException.class,
                () -> AudioSourceGuard.validatePublicHttpUrl("not a url"));
    }

    @Test
    void rejectsCgnatAndIpv6Ula() throws Exception {
        assertTrue(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("100.64.0.1")));
        assertTrue(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("100.127.255.254")));
        assertTrue(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("fc00::1")));
        assertTrue(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("fd12:3456::1")));
        assertFalse(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("100.63.255.255")));
        assertFalse(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("8.8.8.8")));
        assertFalse(AudioSourceGuard.isNonPublic(java.net.InetAddress.getByName("2606:4700:4700::1111")));
    }

    @Test
    void acceptsPublicHttpsUrl() {
        assertDoesNotThrow(() ->
                AudioSourceGuard.validatePublicHttpUrl("https://everyayah.com/data/Alafasy_128kbps/001001.mp3"));
    }
}
