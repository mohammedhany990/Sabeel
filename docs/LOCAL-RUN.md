# Run Sabeel locally

This runs the whole project on one machine with Docker Compose: the Angular web app, the API gateway, 11 backend services, and their infrastructure.

## What you need

- Docker Desktop (Windows or macOS) or Docker Engine with the Compose plugin (Linux). Check with `docker compose version`.
- Git.
- Memory and disk (estimates, see "What was verified" below):
  - 12 GB of RAM on the machine is comfortable. 8 GB can work if you give Docker at least 6 GB and close other heavy programs.
  - Docker Desktop: Settings, Resources, Memory. Set 6 GB or more.
  - About 10 GB of free disk for images and build cache.
- Ports free on the host: 4200, 8080, 8025, 8180, 9090, 3000, and the loopback-only 5432, 6379, 9092, 27017, 8081 to 8091.
- Internet access for the first build (Maven and npm packages, base images).

## Start

```bash
git clone https://github.com/<your-user>/Sabeel.git sabeel
cd sabeel/platform
cp .env.example .env
docker compose up --build -d
```

The first build compiles every service inside Docker and takes a long time (15 to 30 minutes is normal on a laptop). Later starts take a few minutes because the images are cached. Services wait for PostgreSQL, Kafka and Redis, so the first minutes show restarts and warnings while those become ready.

Check progress:

```bash
docker compose ps
./scripts/smoke.sh
```

`smoke.sh` waits for the gateway and services, then runs a set of checks and prints PASS or FAIL for each. Each run registers a new smoke user and creates a new course, so it can be run again on the same data. It needs `curl` and `jq` (on Windows run it from Git Bash or WSL).

## URLs

| What | URL |
| --- | --- |
| Web app | http://localhost:4200 |
| API gateway | http://localhost:8080/api/v1 |
| Gateway health | http://localhost:8080/actuator/health |
| Mailhog (emails the app sends) | http://localhost:8025 |
| Kafka UI | http://localhost:8180 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin / admin, set in `.env`) |

Each backend service also listens on its own port on `127.0.0.1` (auth 8081, user 8082, quran 8083, memorization 8084, revision 8085, notification 8086, prayer 8087, azkar 8088, learning 8089, community 8090, recitation 8091). Swagger UI is under `/swagger-ui` on the service ports.

## First login

There is no pre-made account. Open http://localhost:4200, choose register, and create one. Any verification or reset emails appear in Mailhog at http://localhost:8025. To create a demo account from the command line instead:

```bash
./scripts/demo.sh
```

It registers `demo@sabeel.app` with password `password123` (change them with the `EMAIL` and `PASSWORD` variables) and walks through the main API calls.

The Quran text (6236 ayahs) is loaded into PostgreSQL the first time quran-service starts. Reciter audio is not hosted by this project. The built-in reciters point at public third-party audio hosts, and you can add your own reciters, see the README sections "Using your own reciter audio" and "Adding your own reciters".

## Stop and reset

```bash
docker compose stop            # stop, keep data
docker compose down            # remove containers, keep data volumes
docker compose down -v         # remove containers and all data (database, mongo)
```

## Settings

All settings live in `platform/.env` (copied from `.env.example`). Every service refuses to start when `JWT_SECRET` is missing, shorter than 32 bytes or a known default, unless `SABEEL_DEV_MODE=true`. The example file sets dev mode to true so a local run works unchanged. For any real deployment set a long random `JWT_SECRET` and remove `SABEEL_DEV_MODE`. `RECITATION_ENGINE=passthrough` runs the recitation check as a demo that compares transcripts; the real speech recognition needs the whisper image described in the README.

## Troubleshooting

- Build is killed or the machine freezes: Docker has too little memory. Raise it, or build fewer things at once with `COMPOSE_PARALLEL_LIMIT=2 docker compose build` (the CI uses this too).
- `no space left on device`: run `docker builder prune -af` and `docker system prune`.
- A port is already in use: stop the other program, or change the left side of the port mapping in `platform/docker-compose.yml`.
- A service keeps restarting: `docker compose logs --tail=100 <service>`. During the first minutes restarts are normal while Kafka and PostgreSQL start.
- The web app loads but calls fail: check http://localhost:8080/actuator/health and `web/public/config.js` (it must point to the gateway URL your browser can reach).
- Changed Java code: `docker compose up --build -d <service>` rebuilds only that service.
- Need less: start a subset, for example `docker compose up -d postgres redis kafka api-gateway auth-service user-service quran-service web`. The services you skip simply return errors for their features.

## What was verified and what was not

Verified: the GitHub Actions workflow in `.github/workflows/integration-smoke.yml` runs `mvn package` for all services and then the same `docker compose build` and `up -d` and `scripts/smoke.sh` described here on a clean Linux runner. See the repository's Actions tab for the latest result; this guide is only as good as that run.

Not verified: a run on Windows, macOS or Docker Desktop; the exact RAM use (the 12 GB and 8 GB figures are estimates from the configured limits, with 11 JVMs capped near 320 MB heap each plus PostgreSQL, MongoDB, Kafka, Redis, Prometheus and Grafana, not measured numbers); the subset command above.
