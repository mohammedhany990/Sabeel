#!/usr/bin/env bash
set -euo pipefail
CONN="${PGCONN:-postgresql://sabeel:sabeel@localhost:5432/sabeel_quran}"

echo "Replaces the bundled sample seed with the full quran text (6236 ayahs)"
echo "from the public quran.com API (v4) and rebuilds surah metadata."
echo "Requires: curl, jq, psql. Target: $CONN"
read -r -p "Continue? [y/N] " confirm
[ "$confirm" = "y" ] || exit 0

psql "$CONN" -c "truncate ayahs, surahs restart identity;"

curl -s "https://api.quran.com/api/v4/chapters?language=en" | jq -c '.chapters[]' | while read -r ch; do
  id=$(jq -r .id <<<"$ch")
  name_ar=$(jq -r .name_arabic <<<"$ch" | sed "s/'/''/g")
  name_en=$(jq -r .name_simple <<<"$ch" | sed "s/'/''/g")
  translit=$(jq -r .translated_name.name <<<"$ch" | sed "s/'/''/g")
  rev=$(jq -r .revelation_place <<<"$ch")
  count=$(jq -r .verses_count <<<"$ch")
  page=$(jq -r '.pages[0]' <<<"$ch")
  if [ "$rev" = "makkah" ]; then rtype="MAKKI"; else rtype="MADANI"; fi
  psql "$CONN" -c "insert into surahs (id, name_ar, name_en, transliteration, revelation_type, ayah_count, start_page) values ($id, '$name_ar', '$name_en', '$translit', '$rtype', $count, $page);"
done

for chapter in $(seq 1 114); do
  page=1
  while :; do
    resp=$(curl -s "https://api.quran.com/api/v4/verses/by_chapter/$chapter?language=en&words=false&fields=text_uthmani,text_imlaei,page_number,juz_number,hizb_number&per_page=50&page=$page")
    n=$(jq '.verses | length' <<<"$resp")
    [ "$n" = "0" ] && break
    jq -c '.verses[]' <<<"$resp" | while read -r v; do
      verse_number=$(jq -r .verse_number <<<"$v")
      uth=$(jq -r .text_uthmani <<<"$v" | sed "s/'/''/g")
      simple=$(jq -r .text_imlaei <<<"$v" | sed "s/'/''/g")
      pg=$(jq -r .page_number <<<"$v")
      jz=$(jq -r .juz_number <<<"$v")
      hz=$(jq -r .hizb_number <<<"$v")
      psql "$CONN" -c "insert into ayahs (id, surah_id, ayah_number, text_uthmani, text_simple, page, juz, hizb) values ((select coalesce(max(id),0)+1 from ayahs), $chapter, $verse_number, '$uth', '$simple', $pg, $jz, $hz);"
    done
    page=$((page+1))
  done
  echo "chapter $chapter done"
done

psql "$CONN" -c "update surahs s set start_juz = (select juz from ayahs a where a.surah_id = s.id and a.ayah_number = 1);"
echo "full seed complete"

echo "verifying import integrity"
SURAHS=$(psql "$CONN" -tAc "select count(*) from surahs;")
AYAHS=$(psql "$CONN" -tAc "select count(*) from ayahs;")
BAD_META=$(psql "$CONN" -tAc "select count(*) from ayahs where page is null or juz is null;")
echo "surahs=$SURAHS ayahs=$AYAHS rows_missing_page_or_juz=$BAD_META"
if [ "$SURAHS" != "114" ] || [ "$AYAHS" != "6236" ] || [ "$BAD_META" != "0" ]; then
  echo "IMPORT INCOMPLETE - expected 114 surahs and 6236 ayahs with full page/juz metadata" >&2
  exit 1
fi
echo "import verified: 114 surahs, 6236 ayahs, page/juz metadata complete"
