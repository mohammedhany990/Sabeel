import json
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

API = "https://quranenc.com/api/v1"
OUT = Path(__file__).resolve().parents[2] / "quran-service/src/main/resources/quran/editions"

EDITIONS = [
    {"key": "arabic_moyassar", "kind": "tafsir", "api": "translation", "language": "ar", "version": "1.0.1",
     "title": "At-Tafsir Al-Muyassar", "publisher": "King Fahd Complex for Printing the Holy Quran in Madinah"},
    {"key": "arabic_mokhtasar", "kind": "tafsir", "api": "translation", "language": "ar", "version": "1.0.0",
     "title": "Al-Mukhtasar in Interpreting the Noble Quran", "publisher": "Tafsir Center for Quranic Studies"},
    {"key": "arabic_saadi", "kind": "tafsir", "api": "tafsir", "language": "ar", "version": "1.0.0",
     "title": "Tayseer al-Kareem ar-Rahman (Tafsir As-Saadi)", "publisher": "Abdul Rahman bin Nasser As-Saadi, published by QuranEnc.com"},
    {"key": "arabic_seraj", "kind": "words", "api": "translation", "language": "ar", "version": "1.0.0",
     "title": "As-Siraj fi Bayan Gharib al-Quran (meanings of words)", "publisher": "published by QuranEnc.com"},
    {"key": "english_rwwad", "kind": "translation", "api": "translation", "language": "en", "version": "1.0.21",
     "title": "English Translation - Rowwad Translation Center",
     "publisher": "Rowwad Translation Center with Rabwah Dawah Association, Islamic Content Service Association in Languages and IslamHouse.com"},
]


def get(url):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "sabeel-fetch/1"}), timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if attempt == 4:
                raise
            time.sleep(2 * (attempt + 1))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "editions.json"
    existing = {e["key"]: e for e in json.loads(manifest_path.read_text(encoding="utf-8"))["editions"]} if manifest_path.exists() else {}
    wanted = sys.argv[1:]
    for ed in EDITIONS:
        if wanted and ed["key"] not in wanted:
            continue
        rows = []
        for sura in range(1, 115):
            result = get("%s/%s/sura/%s/%d" % (API, ed["api"], ed["key"], sura))["result"]
            for r in result:
                if ed["api"] == "tafsir":
                    rows.append({"s": int(r["sura"]), "from": int(r["from_aya"]), "to": int(r["to_aya"]), "text": r["text"]})
                else:
                    row = {"s": int(r["sura"]), "from": int(r["aya"]), "to": int(r["aya"]), "text": r["translation"]}
                    if r.get("footnotes"):
                        row["notes"] = r["footnotes"]
                    rows.append(row)
            time.sleep(0.15)
        with open(OUT / (ed["key"] + ".jsonl"), "w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        entry = {k: ed[k] for k in ("key", "kind", "language", "version", "title", "publisher")}
        entry["source"] = "https://quranenc.com/en/browse/" + ed["key"]
        entry["terms"] = "https://quranenc.com/ne/home/contact_us"
        entry["retrieved"] = date.today().isoformat()
        entry["rows"] = len(rows)
        existing[ed["key"]] = entry
        print(ed["key"], len(rows), file=sys.stderr)
        manifest_path.write_text(json.dumps({"editions": [existing[e["key"]] for e in EDITIONS if e["key"] in existing]}, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
