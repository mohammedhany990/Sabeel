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
mkdir sabeel && cd sabeel
for z in /path/to/sabeel-*.zip; do unzip -q "$z"; done
cd platform
cp .env.example .env
docker compose up --build
./scripts/demo.sh
```

Each service ZIP extracts to its own top-level directory; the platform ZIP adds `platform/`, `docs/` and `README.md`. Status: 126 unit tests green across all 12 services; the full Compose stack has not been run end-to-end here (no Docker daemon in the build environment). `.github/workflows/integration-smoke.yml` gives that check a reproducible path: it builds everything, starts the Compose stack and runs `platform/scripts/smoke.sh` (auth, security header checks, the memorization→revision event loop, prayer/qibla/hijri, azkar, learning/community/recitation flows, Prometheus health) on every push — its first execution happens on GitHub Actions, which provides Docker.

Swagger UI per service at `http://localhost:<port>/swagger-ui.html`. Kafka UI at `http://localhost:8180`. Mailhog at `http://localhost:8025`. Prometheus at `http://localhost:9090`, Grafana at `http://localhost:3000` (admin/admin).

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

Needs your configuration: strong `JWT_SECRET` outside dev, FCM service-account JSON (`FCM_ENABLED=true`, `FCM_CREDENTIALS_PATH`) for real push, a real SMTP provider for real email, and `quran-service/db/seed-full-quran.sh` for the full 6236-ayah text (verifies counts and page/juz metadata after import; source: quran.com API v4, free for non-commercial use per its terms).

## Docs

`docs/TECHNICAL-ARCHITECTURE.md` — full architecture, schemas, event contracts, phase roadmap.
