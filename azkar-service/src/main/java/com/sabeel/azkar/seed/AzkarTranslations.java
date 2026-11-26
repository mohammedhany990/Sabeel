package com.sabeel.azkar.seed;

import java.util.Map;

public final class AzkarTranslations {
    private static final String KURSI = "Ayat al-Kursi: Allah! There is no god but He, the Ever-Living, the Self-Sustaining. "
            + "Neither drowsiness nor sleep overtakes Him. (Al-Baqarah 2:255)";
    private static final String IKHLAS = "Surat Al-Ikhlas: Say, \"He is Allah, the One, Allah, the Eternal Refuge...\"";
    private static final String FALAQ = "Surat Al-Falaq: Say, \"I seek refuge in the Lord of daybreak...\"";
    private static final String NAS = "Surat An-Nas: Say, \"I seek refuge in the Lord of mankind...\"";
    private static final String ISTIGHFAR = "Sayyid al-Istighfar: O Allah, You are my Lord. There is no god but You. "
            + "You created me and I am Your servant, and I keep Your covenant and promise as best I can...";

    private static final Map<String, String> TEXT_EN = Map.ofEntries(
            Map.entry("MORNING:1", KURSI),
            Map.entry("MORNING:2", IKHLAS),
            Map.entry("MORNING:3", FALAQ),
            Map.entry("MORNING:4", NAS),
            Map.entry("MORNING:5", "We have entered the morning and the whole dominion belongs to Allah. All praise is for Allah. "
                    + "There is no god but Allah alone, with no partner."),
            Map.entry("MORNING:6", ISTIGHFAR),
            Map.entry("MORNING:7", "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, "
                    + "and He is the All-Hearing, the All-Knowing."),
            Map.entry("MORNING:8", "Glory be to Allah and praise Him."),
            Map.entry("EVENING:1", KURSI),
            Map.entry("EVENING:2", IKHLAS),
            Map.entry("EVENING:3", FALAQ),
            Map.entry("EVENING:4", NAS),
            Map.entry("EVENING:5", "We have entered the evening and the whole dominion belongs to Allah. All praise is for Allah. "
                    + "There is no god but Allah alone, with no partner."),
            Map.entry("EVENING:6", ISTIGHFAR),
            Map.entry("EVENING:7", "I seek refuge in the perfect words of Allah from the evil of what He has created."),
            Map.entry("AFTER_PRAYER:1", "I seek Allah's forgiveness (three times). O Allah, You are Peace and from You comes peace. "
                    + "Blessed are You, O Possessor of majesty and honor."),
            Map.entry("AFTER_PRAYER:2", "Glory be to Allah."),
            Map.entry("AFTER_PRAYER:3", "All praise is for Allah."),
            Map.entry("AFTER_PRAYER:4", "Allah is the Greatest."),
            Map.entry("AFTER_PRAYER:5", KURSI),
            Map.entry("AFTER_PRAYER:6", "There is no god but Allah alone, with no partner. His is the dominion and His is the praise, "
                    + "and He has power over all things."),
            Map.entry("SLEEP:1", KURSI),
            Map.entry("SLEEP:2", "Surat Al-Ikhlas and the two Mu'awwidhat (Al-Falaq and An-Nas)."),
            Map.entry("SLEEP:3", "In Your name, O Allah, I die and I live."),
            Map.entry("SLEEP:4", "O Allah, protect me from Your punishment on the day You resurrect Your servants."),
            Map.entry("SLEEP:5", "Glory be to Allah (33 times), all praise is for Allah (33 times), Allah is the Greatest (34 times)."));

    private static final Map<String, String> REFERENCE_AR = Map.of(
            "Bukhari", "البخاري",
            "Muslim", "مسلم",
            "An-Nasa'i", "النسائي",
            "Abu Dawud, Tirmidhi", "أبو داود والترمذي",
            "Bukhari, Muslim", "البخاري ومسلم",
            "Al-Baqarah 2:255", "سورة البقرة، الآية 255",
            "Quran 112", "سورة الإخلاص",
            "Quran 113", "سورة الفلق",
            "Quran 114", "سورة الناس");

    private AzkarTranslations() {
    }

    public static String textEn(String categoryCode, int sortOrder) {
        return TEXT_EN.get(categoryCode + ":" + sortOrder);
    }

    public static String referenceAr(String reference) {
        return reference == null ? null : REFERENCE_AR.get(reference);
    }
}
