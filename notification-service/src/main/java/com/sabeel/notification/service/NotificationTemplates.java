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

    @Value("${notification.support-email:}")
    private String supportEmail = "";

    public record Content(String title, String body, String html) {
        public Content(String title, String body) {
            this(title, body, null);
        }
    }

    private static final Map<String, String> PRAYERS_AR = Map.of(
            "fajr", "الفجر", "sunrise", "الشروق", "dhuhr", "الظهر", "asr", "العصر",
            "maghrib", "المغرب", "isha", "العشاء");

    private static final Map<String, String> AZKAR_AR = Map.of(
            "morning", "الصباح", "evening", "المساء", "after_prayer", "بعد الصلاة", "sleep", "النوم");

    public static String normalize(String language) {
        return language != null && language.toLowerCase().startsWith(AR) ? AR : EN;
    }

    private String support() {
        String v = supportEmail == null ? "" : supportEmail.trim();
        return v.matches("[^\\s@<>\"']+@[^\\s@<>\"']+\\.[^\\s@<>\"']+") ? v : "";
    }

    private String supportText(boolean ar) {
        String v = support();
        if (v.isEmpty()) {
            return "";
        }
        return (ar ? "\n\nللمساعدة راسلنا على: " : "\n\nQuestions? Write to ") + v;
    }

    private String base() {
        return appBaseUrl == null ? "" : appBaseUrl.trim().replaceAll("/+$", "");
    }

    public Content emailVerification(String language, String name, String token) {
        String link = base() + "/verify-email?token=" + token;
        if (AR.equals(normalize(language))) {
            String text = "السلام عليكم " + name + "،\n\nمرحباً بك في سبيل. فعّل بريدك الإلكتروني من الرابط التالي (صالح لمدة 24 ساعة):\n\n"
                    + link + "\n\nإذا لم تنشئ حساباً في سبيل فتجاهل هذه الرسالة." + supportText(true);
            return new Content("فعّل حسابك في سبيل", text, EmailLayout.action(true, "فعّل حسابك",
                    "السلام عليكم " + name + "،", "مرحباً بك في سبيل. اضغط الزر لتفعيل بريدك الإلكتروني والبدء.",
                    "تفعيل البريد", link, "الرابط صالح لمدة 24 ساعة. إذا لم تنشئ حساباً في سبيل فتجاهل هذه الرسالة.",
                    "سبيل · احفظ. راجع. اتلُ. وارتقِ.", "للمساعدة:", support()));
        }
        String text = "Assalamu alaikum " + name + ",\n\nWelcome to Sabeel. Verify your email with this link (valid 24 hours):\n\n"
                + link + "\n\nIf you did not create a Sabeel account, ignore this email." + supportText(false);
        return new Content("Verify your Sabeel account", text, EmailLayout.action(false, "Verify your email",
                "Assalamu alaikum " + name + ",", "Welcome to Sabeel. Tap the button to verify your email and get started.",
                "Verify email", link, "This link is valid for 24 hours. If you did not create a Sabeel account, ignore this email.",
                "Sabeel · Memorize. Revise. Recite. Grow.", "Questions?", support()));
    }

    public Content passwordReset(String language, String token) {
        String link = base() + "/reset-password?token=" + token;
        if (AR.equals(normalize(language))) {
            String text = "لإعادة تعيين كلمة المرور افتح الرابط التالي (صالح لمدة 30 دقيقة):\n\n" + link
                    + "\n\nإذا لم تطلب ذلك فتجاهل هذه الرسالة." + supportText(true);
            return new Content("إعادة تعيين كلمة مرور سبيل", text, EmailLayout.action(true, "إعادة تعيين كلمة المرور",
                    "السلام عليكم،", "وصلنا طلب لإعادة تعيين كلمة مرور حسابك في سبيل. اضغط الزر لاختيار كلمة مرور جديدة.",
                    "إعادة تعيين كلمة المرور", link,
                    "الرابط صالح لمدة 30 دقيقة. إذا لم تطلب ذلك فتجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.",
                    "سبيل · احفظ. راجع. اتلُ. وارتقِ.", "للمساعدة:", support()));
        }
        String text = "To reset your password, open this link (valid 30 minutes):\n\n" + link
                + "\n\nIf you did not ask for this, ignore this email." + supportText(false);
        return new Content("Reset your Sabeel password", text, EmailLayout.action(false, "Reset your password",
                "Assalamu alaikum,", "We got a request to reset the password of your Sabeel account. Tap the button to choose a new one.",
                "Reset password", link,
                "This link is valid for 30 minutes. If you did not ask for this, ignore this email and your password stays the same.",
                "Sabeel · Memorize. Revise. Recite. Grow.", "Questions?", support()));
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
