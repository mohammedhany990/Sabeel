# Sabeel — Islamic Life Platform (Backend)

Microservices backend for Quran reading/listening, memorization planning, smart spaced-repetition revision, prayer times/Qibla/Hijri, daily azkar with streaks, online courses, community challenges/badges/circles, recitation evaluation, and event-driven notifications. Java 17+ bytecode (built and tested with JDK 21), Spring Boot 3.5.16, Spring Cloud 2025.0.3 (Gateway), Apache Kafka 3.8 (KRaft), PostgreSQL 16, MongoDB 7, Redis 7, Docker Compose.

## Services

| Service | Port | Responsibility | Database |
|---|---|---|---|
| api-gateway | 8080 | Routing, JWT validation, spoofed-header stripping, Redis rate limiting, CORS | Redis |
| auth-service | 8081 | Register (always role USER), login, JWT access + rotating refresh tokens with reuse detection, email verification, password reset, outbox events | sabeel_auth |
| user-service | 8082 | Profile, notification preferences, FCM device tokens, outbox events | sabeel_users |
| quran-service | 8083 | Surahs/ayahs/pages/juz, search, reciters + verified audio URLs, bookmarks, reading state/history | sabeel_quran |
| memorization-service | 8084 | Memorization plans, daily target calculation, nightly task generation with carryover, outbox events | sabeel_memorization |
| revision-service | 8085 | Spaced-repetition engine (1-3-7-14-30-60 + ease factor), idempotent event intake, due scheduling, outbox events | sabeel_revision |
| notification-service | 8086 | Idempotent consumers with retry + DLQ, preference-aware scheduling, email (SMTP) + push (Firebase Admin SDK) | sabeel_notifications |
| prayer-service | 8087 | Prayer times (5 calculation methods), Qibla bearing, tabular Hijri calendar, per-user settings, prayer.time.reminder events | sabeel_prayer |
| azkar-service | 8088 | Seeded azkar content, daily checklists, counters, consecutive-day streaks, azkar.reminder + streak milestone events | sabeel_azkar |
| learning-service | 8089 | Courses + lessons (MongoDB), enrollment, per-lesson progress, ratings, course/enrollment events | sabeel_learning (MongoDB) + sabeel_learning_tx |
| community-service | 8090 | Event-driven badges, time-windowed challenges, invite-code memorization circles | sabeel_community |
| recitation-service | 8091 | Async recitation evaluation (pluggable ASR engine, Arabic normalization, word-level alignment) | sabeel_recitation |

## Quick start

```bash
git clone <your repository url> sabeel && cd sabeel
cd platform
cp .env.example .env
docker compose up --build
./scripts/demo.sh
```

The Compose stack starts PostgreSQL, MongoDB, Redis, Kafka, Mailhog, Kafka UI, Prometheus, Grafana, the 12 backend services and the Angular web app. Every service has its own multi-stage `Dockerfile` (Maven build, then a JRE 21 image); the web app builds with Node and is served by nginx. The web app is at `http://localhost:4200` and talks to the gateway at `http://localhost:8080/api/v1` (edit `web/public/config.js` to change that).

## Open in an IDE

The repository root has a Maven parent/aggregator `pom.xml` (`com.sabeel:sabeel-parent`) that lists the 12 services as modules. Open the root folder in IntelliJ IDEA (or any Maven-aware IDE) and import it as a Maven project to get all services in one workspace. Build everything with `mvn package` from the root, or one service with `mvn -pl auth-service -am package`. Each service keeps its own `pom.xml` with Spring Boot as its parent, so a service also builds alone from its folder and inside its own Docker image. The `web/` folder is a separate Angular project (`npm ci`, `npm start`).

## Status

Unit tests were green across all 12 services before the latest changes. The CI workflow `.github/workflows/integration-smoke.yml` builds all modules from the root, starts the full Compose stack and runs `platform/scripts/smoke.sh`: auth, security headers, the memorization to revision event loop, prayer, qibla and hijri, azkar, learning, community and recitation flows, web app reachability and Prometheus health. See the Actions tab for the latest result.

Swagger UI per service at `http://localhost:<port>/swagger-ui.html`. Kafka UI at `http://localhost:8180`. Mailhog at `http://localhost:8025`. Prometheus at `http://localhost:9090`, Grafana at `http://localhost:3000` (admin/admin).

## Languages (English and Arabic)

- Users have a `preferredLanguage` (`en` or `ar`) on their profile (`PUT /api/v1/users/me`); registration accepts an optional `language`.
- Send `Accept-Language: ar` (or `en`) and every service returns its error `detail`/`title` in that language, with a `Content-Language` response header.
- Notifications (push and email) are rendered in the user's stored language; the language travels in the `auth.user.registered` and `user.preferences.updated` events.
- Azkar items have `textEn` and `referenceAr`, badges have `titleAr`/`descriptionAr`, prayer and Hijri responses have Arabic names, surahs and reciters have Arabic labels.
- The Arabic strings were written for this project and need a native-speaker review before a public release. See "Languages" in `docs/Sabeel-Documentation.md`.

## Sources and attribution

- Quran text (Uthmani and simple-clean) and the surah, juz, hizb and page metadata are the Tanzil Quran text, copyright Tanzil Project, license Creative Commons Attribution 3.0. The license allows use in any application if the source is clearly indicated, a link to tanzil.net is shown, the text is not changed, and the notice is kept in the files. The bundled copies in `quran-service/src/main/resources/quran/` are verbatim and keep the Tanzil notice. The web app shows one small footer line linking to tanzil.net. Source: https://tanzil.net/docs/text_license
- Quran text mode: the full 6236-ayah text loads on first start. Set `QURAN_SEED_MODE=sample` for the old 27-ayah development sample. A database that holds only the sample is upgraded to the full text on the next start in full mode.
- Reciter audio is streamed from third-party hosts (everyayah.com and quranicaudio.com) and is never copied or rehosted by this project. The reciter name is shown with each recitation. Rights for commercial use of these recordings are not established; see `docs/PRODUCTION-READINESS.md`.

## Production readiness

This is a development release, not production-ready. See `docs/PRODUCTION-READINESS.md` for the prioritized list of what is missing and what was and was not verified.

## Reliability design

- Every producer writes events to a transactional outbox in the same DB transaction as the state change; a relay publishes to Kafka and retries (10 attempts, then the row is marked dead and kept: dead rows are requeued hourly and can be replayed manually, never silently discarded).
- notification-service consumers process-then-mark inside one transaction: a failure rolls back the processed marker so the message is redelivered; after 3 backoff retries the message lands in `<topic>.DLT` (Spring Kafka's default dead-letter suffix).
- revision-service deduplicates `memorization.task.completed` by event id, so a republished event never advances the repetition ladder twice.
- The gateway strips inbound `X-User-Id`/`X-User-Role` headers before anything else, so clients can neither spoof identity nor bypass per-user rate limiting.
- Reminder notifications respect the user's push/email preferences and preferred reminder time in the user's own timezone, replicated via the `user.preferences.updated` event.

## Security notes

- Services validate JWTs themselves, but calling a service port directly bypasses the gateway's rate limiting and header sanitization. Compose therefore binds every non-gateway port (services, Postgres, Redis, Kafka, Mailhog, Kafka UI) to `127.0.0.1`; only the gateway (8080) is published. Keep that binding outside local development.
- Actuator is restricted to `health,info` on the gateway; per-service actuator exposure is a dev convenience as well.
- Registration always assigns role USER. Teacher/admin roles are granted by an admin (future admin API), never self-selected.
- Refresh tokens are opaque, SHA-256-hashed at rest, rotated per use; presenting a rotated token revokes the whole session family.

## What works out of the box / what needs configuration

Works: full auth lifecycle, profile/preferences auto-created via Kafka, Quran sample data (27 ayahs) with verified reciter audio URLs, plan calculator (whole Quran in 24 months = 9 ayahs/day), nightly task generation, revision engine fed by events, notification pipeline with Mailhog email capture.

Needs your configuration: strong `JWT_SECRET` outside dev, FCM service-account JSON (`FCM_ENABLED=true`, `FCM_CREDENTIALS_PATH`) for real push, a real SMTP provider for real email. The full 6236-ayah Tanzil text is bundled and loads by default.

## Docs

`docs/TECHNICAL-ARCHITECTURE.md` — full architecture, schemas, event contracts, phase roadmap.
