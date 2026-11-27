package com.sabeel.notification.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class NotificationTemplates {
    public static final String EN = "en";
    public static final String AR = "ar";

    @Value("${notification.app-base-url:http://localhost:4200}")
    private String appBaseUrl = "http://localhost:4200";

    public record Content(String title, String body) {
    }

    private static final Map<String, String> PRAYERS_AR = Map.of(
            "fajr", "الفجر", "sunrise", "الشروق", "dhuhr", "الظهر", "asr", "العصر",
            "maghrib", "المغرب", "isha", "العشاء");

    private static final Map<String, String> AZKAR_AR = Map.of(
            "morning", "الصباح", "evening", "المساء", "after_prayer", "بعد الصلاة", "sleep", "النوم");

    public static String normalize(String language) {
        return language != null && language.toLowerCase().startsWith(AR) ? AR : EN;
    }

    public Content emailVerification(String language, String name, String token) {
        if (AR.equals(normalize(language))) {
            return new Content("فعّل حسابك في سبيل",
                    "السلام عليكم " + name + "،\n\nمرحباً بك في سبيل. فعّل بريدك الإلكتروني بهذا الرمز:\n\n" + token
                            + "\n\nتنتهي صلاحية الرمز خلال 24 ساعة.");
        }
        return new Content("Verify your Sabeel account",
                "Assalamu alaikum " + name + ",\n\nWelcome to Sabeel. Verify your email with this token:\n\n" + token
                        + "\n\nThe token expires in 24 hours.");
    }

    public Content passwordReset(String language, String token) {
        String base = appBaseUrl == null ? "" : appBaseUrl.trim().replaceAll("/+$", "");
        String link = base + "/reset-password?token=" + token;
        if (AR.equals(normalize(language))) {
            return new Content("إعادة تعيين كلمة مرور سبيل",
                    "لإعادة تعيين كلمة المرور اضغط على الرابط التالي (صالح لمدة 30 دقيقة):\n\n" + link
                            + "\n\nأو افتح صفحة إعادة التعيين والصق هذا الرمز:\n\n" + token
                            + "\n\nإذا لم تطلب ذلك فتجاهل هذه الرسالة.");
        }
        return new Content("Reset your Sabeel password",
                "To reset your password, open this link (valid 30 minutes):\n\n" + link
                        + "\n\nOr open the reset page and paste this code:\n\n" + token
                        + "\n\nIf you did not ask for this, ignore this email.");
    }

    public Content memorizationTask(String language, String date, int surahId, int fromAyah, int toAyah) {
        if (AR.equals(normalize(language))) {
            return new Content("مهمة حفظ اليوم جاهزة",
                    "مهمة يوم " + date + ": سورة " + SurahNames.name(surahId, true)
                            + "، الآيات " + fromAyah + "-" + toAyah + ".");
        }
        return new Content("Today's memorization is ready",
                "Task for " + date + ": surah " + surahId + ", ayahs " + fromAyah + "-" + toAyah + ".");
    }

    public Content revisionDue(String language, int itemCount) {
        if (AR.equals(normalize(language))) {
            return new Content("حان وقت المراجعة", "لديك " + itemCount + " من المقاطع المحفوظة المستحقة للمراجعة اليوم.");
        }
        return new Content("Revision is due",
                "You have " + itemCount + " memorized range(s) due for revision today.");
    }

    public Content prayerReminder(String language, String prayer) {
        if (AR.equals(normalize(language))) {
            String name = PRAYERS_AR.getOrDefault(prayer.toLowerCase(), prayer);
            return new Content("حان وقت صلاة " + name, "حان الآن وقت صلاة " + name + ". تقبّل الله صلاتك.");
        }
        return new Content("Time for " + prayer, "It's " + prayer + " time. May Allah accept your prayer.");
    }

    public Content azkarReminder(String language, String categoryCode) {
        boolean evening = "EVENING".equals(categoryCode);
        if (AR.equals(normalize(language))) {
            String label = evening ? AZKAR_AR.get("evening") : AZKAR_AR.get("morning");
            return new Content("أذكار " + label, "لا تنسَ أذكار " + label + " اليوم.");
        }
        String label = evening ? "evening" : "morning";
        return new Content("Your " + label + " azkar", "Don't forget your " + label + " azkar today.");
    }

    public Content streakMilestone(String language, int days, String categoryCode) {
        if (AR.equals(normalize(language))) {
            String label = AZKAR_AR.getOrDefault(categoryCode.toLowerCase(), categoryCode.toLowerCase().replace('_', ' '));
            return new Content("ما شاء الله، " + days + " أيام متتالية",
                    "حافظت على أذكار " + label + " لمدة " + days + " أيام متتالية. واصل!");
        }
        return new Content("MashaAllah, " + days + " days in a row",
                "You kept your " + categoryCode.toLowerCase().replace('_', ' ') + " azkar for " + days
                        + " days straight. Keep going!");
    }

    public Content achievement(String language) {
        if (AR.equals(normalize(language))) {
            return new Content("ما شاء الله، إنجاز جديد", "أكملت محطة جديدة في رحلة الحفظ. واصل!");
        }
        return new Content("MashaAllah, milestone reached", "You completed a memorization milestone. Keep going!");
    }

    public Content coursePublished(String language, String title) {
        if (AR.equals(normalize(language))) {
            return new Content("دورتك منشورة الآن", "الدورة \"" + title + "\" أصبحت منشورة وظاهرة للطلاب.");
        }
        return new Content("Your course is live", "\"" + title + "\" is now published and visible to students.");
    }

    public Content enrollment(String language, String title) {
        if (AR.equals(normalize(language))) {
            return new Content("تم التسجيل في دورة جديدة", "انضممت إلى \"" + title + "\". بسم الله، نتمنى لك تعلماً موفقاً!");
        }
        return new Content("Enrolled in a new course", "You joined \"" + title + "\". Bismillah, happy learning!");
    }

    public Content recitationResult(String language, double accuracy, int mistakes) {
        if (AR.equals(normalize(language))) {
            return new Content("نتيجة تقييم التلاوة جاهزة",
                    "حققت تلاوتك دقة " + accuracy + "% مع " + mistakes + " من الأخطاء. اضغط لمراجعة التفاصيل.");
        }
        return new Content("Recitation evaluation ready",
                "Your recitation scored " + accuracy + "% accuracy with " + mistakes
                        + " mistake(s). Tap to review the details.");
    }

    public Content badgeAwarded(String language, String title, String titleAr) {
        if (AR.equals(normalize(language))) {
            String name = titleAr == null || titleAr.isBlank() ? title : titleAr;
            return new Content("وسام جديد: " + name, "ما شاء الله، حصلت على وسام \"" + name + "\".");
        }
        return new Content("New badge: " + title, "MashaAllah, you earned the \"" + title + "\" badge.");
    }
}
