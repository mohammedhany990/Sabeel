package com.sabeel.recitation.service;

import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;

@Component
public class AudioSourceGuard {
    private final long maxBytes;
    private final int timeoutSeconds;

    public AudioSourceGuard(@Value("${recitation.audio.max-bytes:26214400}") long maxBytes,
                            @Value("${recitation.audio.timeout-seconds:30}") int timeoutSeconds) {
        this.maxBytes = maxBytes;
        this.timeoutSeconds = timeoutSeconds;
    }

    static List<InetAddress> resolvePublic(String url) {
        URI uri;
        try {
            uri = new URI(url);
        } catch (Exception e) {
            throw new AudioFetchException("audio URL is not a valid URI");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new AudioFetchException("audio URL must be http or https");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new AudioFetchException("audio URL has no host");
        }
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (Exception e) {
            throw new AudioFetchException("audio URL host cannot be resolved");
        }
        for (InetAddress address : addresses) {
            if (isNonPublic(address)) {
                throw new AudioFetchException("audio URL host resolves to a non-public address");
            }
        }
        return List.of(addresses);
    }

    static boolean isNonPublic(InetAddress address) {
        if (address.isLoopbackAddress() || address.isSiteLocalAddress()
                || address.isLinkLocalAddress() || address.isMulticastAddress()
                || address.isAnyLocalAddress()) {
            return true;
        }
        byte[] b = address.getAddress();
        if (b.length == 4) {
            return (b[0] & 0xFF) == 100 && (b[1] & 0xC0) == 64;
        }
        if (b.length == 16) {
            return (b[0] & 0xFE) == 0xFC;
        }
        return true;
    }

    static void validatePublicHttpUrl(String url) {
        resolvePublic(url);
    }

    Path download(String url, Path target) {
        String current = url;
        for (int redirects = 0; redirects <= 3; redirects++) {
            final String requestUrl = current;
            List<InetAddress> pinned = resolvePublic(requestUrl);
            try (CloseableHttpClient client = HttpClients.custom()
                    .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
                            .setDnsResolver(new org.apache.hc.client5.http.DnsResolver() {
                                @Override
                                public InetAddress[] resolve(String host) {
                                    return pinned.toArray(InetAddress[]::new);
                                }

                                @Override
                                public String resolveCanonicalHostname(String host) {
                                    return host;
                                }
                            })
                            .build())
                    .disableRedirectHandling()
                    .setDefaultRequestConfig(RequestConfig.custom()
                            .setConnectTimeout(Timeout.ofSeconds(timeoutSeconds))
                            .setResponseTimeout(Timeout.ofSeconds(timeoutSeconds))
                            .build())
                    .build()) {
                String outcome = client.execute(new HttpGet(URI.create(requestUrl)), response -> {
                    int status = response.getCode();
                    if (status >= 300 && status < 400) {
                        var location = response.getFirstHeader("location");
                        EntityUtils.consumeQuietly(response.getEntity());
                        if (location == null) {
                            throw new AudioFetchException("redirect without location");
                        }
                        return "redirect:" + URI.create(requestUrl).resolve(location.getValue());
                    }
                    if (status != 200) {
                        EntityUtils.consumeQuietly(response.getEntity());
                        throw new AudioFetchException("audio download returned HTTP " + status);
                    }
                    long declared = response.getEntity().getContentLength();
                    if (declared > maxBytes) {
                        EntityUtils.consumeQuietly(response.getEntity());
                        throw new AudioFetchException("audio exceeds the " + maxBytes + " byte limit");
                    }
                    try (InputStream in = response.getEntity().getContent();
                         var out = Files.newOutputStream(target)) {
                        byte[] buffer = new byte[8192];
                        long total = 0;
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            total += read;
                            if (total > maxBytes) {
                                throw new AudioFetchException("audio exceeds the " + maxBytes + " byte limit");
                            }
                            out.write(buffer, 0, read);
                        }
                        if (total == 0) {
                            throw new AudioFetchException("audio download was empty");
                        }
                    }
                    return "done";
                });
                if (outcome.startsWith("redirect:")) {
                    current = outcome.substring("redirect:".length());
                    continue;
                }
                return target;
            } catch (AudioFetchException e) {
                throw e;
            } catch (Exception e) {
                throw new AudioFetchException("audio download failed: " + e.getMessage());
            }
        }
        throw new AudioFetchException("audio download exceeded 3 redirects");
    }
}
