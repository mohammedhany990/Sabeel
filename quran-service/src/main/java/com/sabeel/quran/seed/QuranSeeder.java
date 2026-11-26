package com.sabeel.quran.seed;

import com.sabeel.quran.domain.Ayah;
import com.sabeel.quran.domain.Reciter;
import com.sabeel.quran.domain.Surah;
import com.sabeel.quran.repository.AyahRepository;
import com.sabeel.quran.repository.ReciterRepository;
import com.sabeel.quran.repository.SurahRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class QuranSeeder implements CommandLineRunner {
    private final SurahRepository surahRepository;
    private final AyahRepository ayahRepository;
    private final ReciterRepository reciterRepository;

    @Value("${quran.seed.mode:full}")
    private String seedMode;

    @Override
    @Transactional
    public void run(String... args) {
        boolean full = !"sample".equalsIgnoreCase(seedMode);
        if (surahRepository.count() > 0) {
            if (full && ayahRepository.count() < FullQuranLoader.EXPECTED_AYAHS) {
                log.info("replacing the sample quran data with the full text");
                ayahRepository.deleteAllInBatch();
                surahRepository.deleteAllInBatch();
                seedFull();
            }
            return;
        }
        if (full) {
            log.info("seeding the full quran text and reciters");
            seedFull();
        } else {
            log.info("seeding sample quran data and reciters");
            seedSurahs();
            seedAyahs();
        }
        seedReciters();
    }

    private void seedFull() {
        FullQuranLoader.Loaded loaded = new FullQuranLoader().load();
        surahRepository.saveAll(loaded.surahs());
        ayahRepository.saveAll(loaded.ayahs());
    }

    private void seedSurahs() {
        surahRepository.saveAll(List.of(
                surah(1, "الفاتحة", "Al-Fatihah", "The Opener", "MAKKI", 7, 1, 1),
                surah(2, "البقرة", "Al-Baqarah", "The Cow", "MADANI", 286, 2, 1),
                surah(112, "الإخلاص", "Al-Ikhlas", "The Sincerity", "MAKKI", 4, 604, 30),
                surah(113, "الفلق", "Al-Falaq", "The Daybreak", "MAKKI", 5, 604, 30),
                surah(114, "الناس", "An-Nas", "Mankind", "MAKKI", 6, 604, 30)));
    }

    private Surah surah(int id, String ar, String en, String translit, String type, int count, int page, int juz) {
        return Surah.builder().id(id).nameAr(ar).nameEn(en).transliteration(translit)
                .revelationType(type).ayahCount(count).startPage(page).startJuz(juz).build();
    }

    private void seedAyahs() {
        int[][] meta = {
                {1, 1, 1, 1, 1}, {2, 1, 2, 1, 1}, {3, 1, 3, 1, 1}, {4, 1, 4, 1, 1}, {5, 1, 5, 1, 1}, {6, 1, 6, 1, 1}, {7, 1, 7, 1, 1},
                {8, 2, 1, 2, 1}, {9, 2, 2, 2, 1}, {10, 2, 3, 2, 1}, {11, 2, 4, 2, 1}, {12, 2, 5, 3, 1},
                {6220, 112, 1, 604, 30}, {6221, 112, 2, 604, 30}, {6222, 112, 3, 604, 30}, {6223, 112, 4, 604, 30},
                {6224, 113, 1, 604, 30}, {6225, 113, 2, 604, 30}, {6226, 113, 3, 604, 30}, {6227, 113, 4, 604, 30}, {6228, 113, 5, 604, 30},
                {6229, 114, 1, 604, 30}, {6230, 114, 2, 604, 30}, {6231, 114, 3, 604, 30}, {6232, 114, 4, 604, 30}, {6233, 114, 5, 604, 30}, {6234, 114, 6, 604, 30}};
        String[][] texts = {
                {"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "بسم الله الرحمن الرحيم"},
                {"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "الحمد لله رب العالمين"},
                {"الرَّحْمَٰنِ الرَّحِيمِ", "الرحمن الرحيم"},
                {"مَالِكِ يَوْمِ الدِّينِ", "مالك يوم الدين"},
                {"إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", "إياك نعبد وإياك نستعين"},
                {"اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", "اهدنا الصراط المستقيم"},
                {"صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرَ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", "صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين"},
                {"الم", "الم"},
                {"ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ", "ذلك الكتاب لا ريب فيه هدى للمتقين"},
                {"الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ", "الذين يؤمنون بالغيب ويقيمون الصلاة ومما رزقناهم ينفقون"},
                {"وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ", "والذين يؤمنون بما أنزل إليك وما أنزل من قبلك وبالآخرة هم يوقنون"},
                {"أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ", "أولئك على هدى من ربهم وأولئك هم المفلحون"},
                {"قُلْ هُوَ اللَّهُ أَحَدٌ", "قل هو الله أحد"},
                {"اللَّهُ الصَّمَدُ", "الله الصمد"},
                {"لَمْ يَلِدْ وَلَمْ يُولَدْ", "لم يلد ولم يولد"},
                {"وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", "ولم يكن له كفوا أحد"},
                {"قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", "قل أعوذ برب الفلق"},
                {"مِن شَرِّ مَا خَلَقَ", "من شر ما خلق"},
                {"وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", "ومن شر غاسق إذا وقب"},
                {"وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", "ومن شر النفاثات في العقد"},
                {"وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ", "ومن شر حاسد إذا حسد"},
                {"قُلْ أَعُوذُ بِرَبِّ النَّاسِ", "قل أعوذ برب الناس"},
                {"مَلِكِ النَّاسِ", "ملك الناس"},
                {"إِلَٰهِ النَّاسِ", "إله الناس"},
                {"مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", "من شر الوسواس الخناس"},
                {"الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", "الذي يوسوس في صدور الناس"},
                {"مِنَ الْجِنَّةِ وَالنَّاسِ", "من الجنة والناس"}};
        for (int i = 0; i < meta.length; i++) {
            ayahRepository.save(Ayah.builder()
                    .id(meta[i][0]).surahId(meta[i][1]).ayahNumber(meta[i][2])
                    .textUthmani(texts[i][0]).textSimple(texts[i][1])
                    .page(meta[i][3]).juz(meta[i][4]).hizb(meta[i][4] == 30 ? 60 : 1)
                    .build());
        }
    }

    private void seedReciters() {
        reciterRepository.saveAll(List.of(
                reciter("مشاري راشد العفاسي", "Mishary Rashid Alafasy", "Kuwait", "Murattal", "https://everyayah.com/data/Alafasy_128kbps", "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee"),
                reciter("محمود خليل الحصري", "Mahmoud Khalil Al-Husary", "Egypt", "Murattal", "https://everyayah.com/data/Husary_128kbps", "https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree"),
                reciter("عبد الباسط عبد الصمد", "Abdul Basit Abdus Samad", "Egypt", "Murattal", "https://everyayah.com/data/Abdul_Basit_Murattal_64kbps", "https://download.quranicaudio.com/quran/abdul_basit_murattal"),
                reciter("محمد صديق المنشاوي", "Mohamed Siddiq Al-Minshawi", "Egypt", "Murattal", "https://everyayah.com/data/Minshawy_Murattal_128kbps", "https://download.quranicaudio.com/quran/muhammad_siddeeq_al-minshaawee"),
                reciter("عبد الرحمن السديس", "Abdul Rahman Al-Sudais", "Saudi Arabia", "Murattal", "https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps", "https://download.quranicaudio.com/quran/abdurrahmaan_as-sudays")));
    }

    private Reciter reciter(String ar, String en, String country, String style, String baseUrl, String fullBaseUrl) {
        return Reciter.builder().nameAr(ar).nameEn(en).country(country).style(style)
                .audioBaseUrl(baseUrl).fullAudioBaseUrl(fullBaseUrl).build();
    }
}
