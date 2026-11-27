# Text sources, licenses and versions

Sabeel ships text from two primary sources. Every text is stored and shown unmodified. The app keeps its pages free of source notes: a single footer line links to tanzil.net and to the in-app Sources page. Every source, version and license is listed in this file.

## Quran text: Tanzil Project

- File: `quran-service/src/main/resources/quran/tanzil-simple-clean.txt` plus the Uthmani text, loaded at first start.
- License: Creative Commons Attribution 3.0 (https://tanzil.net/docs/text_license). The text must not be changed. The footer credit and the Sources page link to tanzil.net.

## Tafsir, translation and word meanings: QuranEnc.com

Bundled in `quran-service/src/main/resources/quran/editions/`, fetched by `platform/tools/fetch_editions.py` from the QuranEnc API. `editions.json` records key, version, publisher, source page and retrieval date.

| Key | What it is | Version | Retrieved |
| --- | --- | --- | --- |
| arabic_moyassar | At-Tafsir Al-Muyassar, King Fahd Complex | 1.0.1 | 2026-11-26 |
| arabic_mokhtasar | Al-Mukhtasar in Interpreting the Noble Quran, Tafsir Center for Quranic Studies | 1.0.0 | 2026-11-26 |
| arabic_saadi | Tayseer al-Kareem ar-Rahman (As-Saadi) | 1.0.0 | 2026-11-26 |
| arabic_seraj | As-Siraj fi Bayan Gharib al-Quran (word meanings) | 1.0.0 | 2026-11-26 |
| english_rwwad | English translation, Rowwad Translation Center (with IslamHouse.com and partners) | 1.0.21 | 2026-11-26 |

Terms read at https://quranenc.com/ne/home/contact_us (Terms and Policies): content may be downloaded and republished if it is not modified, added to or reduced; the publisher and QuranEnc.com are named; the version number is stated; transcript info stays with the text; notes on a translation are reported to QuranEnc; the latest version is kept; and no inappropriate advertising is shown beside it.

How Sabeel follows them: text is stored byte for byte as returned by the API (footnotes included); the publisher, version and QuranEnc.com are named here and on the Sources page, which links to each edition and to the terms; no advertising exists in the app.

### What is not verified

- The terms were read from the QuranEnc page on the retrieval date. No written permission from QuranEnc or the individual publishers was requested. If the terms change, the data must be refreshed or removed.
- Keeping "the latest version" is a manual step: rerun `python3 platform/tools/fetch_editions.py`, review the version numbers, update `editions.json` entries if the script's version table is stale, and rebuild.
- The version numbers come from the QuranEnc listing pages. They were checked once.
- Notifying QuranEnc about errors in a text is a manual step.

### Not included, on purpose

- Ibn Kathir and any other tafsir whose license could not be verified.
- Datasets on third-party aggregators whose per-edition license is not stated.
- Tanzil translations: their terms limit use and redistribution of the list, so they are not bundled.
- Recitation audio: none is bundled. Audio base URLs are configured by the operator (see the README). The bundled adhan recordings are listed below.

## Endpoints

- `GET /api/v1/quran/editions` lists the editions with version and source.
- `GET /api/v1/quran/editions/{key}/{surah}/{ayah}` returns the entries covering the ayah. Tafsir entries can cover a range of ayahs.

## Mushaf page text and tajweed colors: Quran Foundation API

The mushaf pages fetch Uthmani text with tajweed markup per page from api.quran.com (Quran Foundation), https://api.quran.com/api/v4/. The page-by-page layout and tajweed coloring come from that API. The app also reads the page number of a verse from it to open the right page.

## Reciter audio

Reciter audio is streamed from third-party hosts (everyayah.com and quranicaudio.com) and is never copied or rehosted by this project. Per-reciter license notes are in docs/PRODUCTION-READINESS.md, item 18.

## Adhan recordings

| File | Recording | Source | License |
| --- | --- | --- | --- |
| madina.mp3, aqsa.mp3, alafasy.mp3 | Madinah, Al-Aqsa, Mishary Alafasy | Internet Archive item "(mp3) Collection Adzan of world" by JpnMuslim, https://archive.org/details/Mp3CollectionAdzan | CC BY-NC-ND 4.0, included unmodified at the project owner's decision; credit to the collection and its uploader |
| beautiful.mp3 | Adhan by Adam-synagda | https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg | CC0 1.0, converted from Ogg to 64 kbps mono MP3 |
| azan.mp3 | Adhan by Andrewler | https://commons.wikimedia.org/wiki/File:Azan.ogg | CC BY-SA 4.0, converted from Ogg to 64 kbps mono MP3; this file stays under CC BY-SA 4.0 |
| tobar.mp3, tobar-fajr.mp3 | Sheikh Nasr al-Din Tobar, general and Fajr adhan | Supplied directly by the project owner | Not from a separately licensed source. Trimmed, denoised and loudness-normalized; tobar.mp3 also has its opening cut to start at the takbir |

## Duas

The masnoon duas follow Hisn al-Muslim (Fortress of the Muslim). Istikhara duas cite Sahih al-Bukhari 1162.
