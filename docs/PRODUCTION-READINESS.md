# Sabeel: Production Readiness Review

Status: this project is a development release. It is not production-ready. This review lists what is missing or risky before a public launch, in priority order, and states what was and was not verified.

## What was verified

- All 12 services compile and their unit tests pass on GitHub Actions (JDK 21, `mvn package` from the root parent pom).
- Real whisper.cpp speech-to-text ran once, locally, on one public clip (Al-Fatiha 1) and scored 100 percent. This is one clip and one reciter.
- Real PostgreSQL and Kafka ran a recitation-to-notification chain once outside Docker.
- The full Docker Compose stack and `platform/scripts/smoke.sh` are exercised by the `integration-smoke` workflow. The latest run result is in the repository Actions tab; do not treat a past failure or success as a launch signal.

## What was not verified

- No load, soak, failover or security testing (no penetration test, no dependency or container image scan).
- No test on real mobile clients, real email delivery or real push delivery.
- No review of Arabic wording by a native speaker or a religious scholar.
- No legal review.

## Priority 1: must fix before any public launch

1. Secrets. Defaults such as the development JWT secret, the PostgreSQL password and the Grafana admin password are in `.env.example` and compose defaults. Use a secrets manager, rotate all values, and fail startup when a development default is detected.
2. Token signing. Services share one HS256 secret, so any service holding it can mint tokens. Move to asymmetric signing (RS256 or EdDSA) with a key published by the auth service, and add key rotation.
3. TLS and ingress. Nothing terminates TLS. Put the gateway behind a TLS-terminating ingress, restrict published ports (databases, Kafka, Redis, Mongo, Grafana, Kafka UI, Mailhog, Prometheus must not be public), and enable Kafka and database authentication and encryption in transit.
4. Database migrations. All JPA services use `ddl-auto: update`. Replace it with Flyway or Liquibase migrations and `validate`, and test upgrades on a copy of real data.
5. Quran text. The full 6236-ayah Tanzil text is now bundled and loads on first start, with a sample switch for development. Tanzil publishes its text as carefully verified, but a public religious app should still have the text reviewed against a certified mushaf by a qualified person, and must keep it unchanged and credited as the Tanzil license requires. Wrong Quran text is the highest reputational risk. Do not replace the bundled Tanzil text with data from the Quran Foundation API without reading its Developer Terms: they restrict storing content for more than a week without their sync APIs, bundling it in a repository, and require credit.
6. Backups and recovery. No backup, restore or disaster-recovery plan exists. Define backups for PostgreSQL and MongoDB, test a restore, and set retention.
7. Privacy and data protection. The app stores accounts, profiles, locations for prayer times and recitation audio references. A privacy policy, consent, data export, account deletion, retention limits and a lawful basis (GDPR-style and local law) are required. Review what is logged.

## Priority 2: fix soon after the first release candidate

8. CORS. The gateway allows all origins. Restrict it to the real web origin.
9. Rate limiting and abuse protection. A gateway limit exists (Redis-backed, per user key). Add per-IP limits for anonymous endpoints, login throttling and lockout, email verification and bot protection on registration.
10. Observability. Prometheus and Grafana exist for development. Add centralized logs, tracing, alerting, uptime checks, and runbooks. Check that logs carry no personal data or tokens.
11. Email and push. Mailhog is a dev mailbox. Configure a real provider with SPF, DKIM and DMARC. Firebase Cloud Messaging is disabled by default and needs project credentials, token lifecycle handling and a test on real devices.
12. Resilience. Review Kafka topic replication, consumer retry and dead-letter handling, outbox behaviour under longer outages, and Postgres/Kafka/Redis high availability (the compose stack uses single instances).
13. Container hardening. Run containers as non-root, pin base image digests, add resource limits and health checks everywhere, scan images, and add dependency updates.
14. Authorization review. Check every endpoint for role and ownership rules (teacher, admin, community), and add tests for access control.

## Priority 3: content, accuracy and legal

15. Prayer times. Times, qibla and Hijri dates are computed by the app's own engine. Different authorities and calculation methods differ by minutes. Show the method used, state that times are estimates, test against trusted references for target cities, and handle high latitudes and Hijri moon-sighting differences.
16. Arabic wording. Arabic UI text, error messages, notifications and names for azkar, badges and surahs were written by the development team and must be reviewed by a native speaker. Azkar text and references need review by a qualified source.
17. Recitation scoring. The ASR engine (whisper.cpp base model) compares transcribed words only. It is not a tajweed judge, accuracy varies with noise, dialect and reciter, and base-model Arabic recognition has known limits. Label the feature as practice feedback, add user-visible confidence limits, and benchmark on a representative, consented dataset before claiming accuracy. Local ASR also costs CPU and time (about a minute per clip on one CPU).
18. Audio sources. Reciter audio is streamed from everyayah.com and quranicaudio.com by default and is not copied by this project; `QURAN_AUDIO_AYAH_BASE_URL` and `QURAN_AUDIO_SURAH_BASE_URL` let you point to your own storage. As read on 2026-11-26: quranicaudio.com says its files are for personal use, the Quran Foundation Developer Terms ask for credit to Quran Foundation and the reciter for audio from its hosts, and everyayah.com shows no license text (one reciter folder lists "Recitation license: UNKNOWN"). Check the terms of any recordings you host yourself, credit reciters, and remove a recording if its rights holder asks.
19. Third-party licences. Review licences and attributions for Quran text sources, fonts, icons, images, the whisper.cpp and ggml model licences, and all Maven and npm dependencies. Add a NOTICE file.
20. Terms of use, disclaimers and age rules. Publish terms, a religious-content disclaimer and an age policy for the community features, plus moderation and reporting tools.

## Suggested launch gates

- Gate 1: items 1 to 7 closed and retested.
- Gate 2: a staging environment with real TLS, real email, real push, load test, and backup restore drill.
- Gate 3: item 5, 15, 16 and 17 reviewed by qualified people, with written sign-off.
- Gate 4: legal review of privacy policy, terms and audio and text licences.
