#!/usr/bin/env bash
BASE="${BASE:-http://localhost:8080}"
TOKENS=$(curl -s -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"smoke@sabeel.app","password":"password123"}')
ACCESS=$(jq -r '.accessToken // empty' <<<"$TOKENS")
AUTH="Authorization: Bearer $ACCESS"
show() {
  echo "--- $1"
  curl -s -i --max-time 10 "$BASE$1" -H "$AUTH" | head -c 700
  echo
}
show "/api/v1/prayer/times"
show "/api/v1/prayer/qibla?lat=30.0444&lng=31.2357"
show "/api/v1/prayer/hijri?date=2026-11-26"
show "/api/v1/azkar/categories"
show "/api/v1/quran/reciters/1/audio?surah=1&ayah=1"
echo "--- direct prayer-service"
curl -s -i --max-time 10 "http://localhost:8087/api/v1/prayer/qibla?lat=30.0444&lng=31.2357" -H "$AUTH" | head -c 500
echo
