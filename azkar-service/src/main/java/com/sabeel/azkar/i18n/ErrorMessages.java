package com.sabeel.azkar.i18n;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ErrorMessages {
    public static final String EN = "en";
    public static final String AR = "ar";

    private record Rule(Pattern pattern, String template) {
        Rule(String regex, String template) {
            this(Pattern.compile(regex), template);
        }
    }

    private static final Map<String, String> EXACT = Map.ofEntries(
            Map.entry("email already registered", "البريد الإلكتروني مسجّل بالفعل"),
            Map.entry("invalid verification token", "رمز التحقق غير صالح"),
            Map.entry("verification token expired or already used", "رمز التحقق منتهي الصلاحية أو مستخدم من قبل"),
            Map.entry("invalid credentials", "بيانات الدخول غير صحيحة"),
            Map.entry("invalid refresh token", "رمز التحديث غير صالح"),
            Map.entry("refresh token reuse detected; all sessions revoked", "تم اكتشاف إعادة استخدام رمز التحديث، وتم إنهاء جميع الجلسات"),
            Map.entry("refresh token expired", "انتهت صلاحية رمز التحديث"),
            Map.entry("invalid reset token", "رمز إعادة التعيين غير صالح"),
            Map.entry("reset token expired or already used", "رمز إعادة التعيين منتهي الصلاحية أو مستخدم من قبل"),
            Map.entry("user not found", "المستخدم غير موجود"),
            Map.entry("unknown tasbeeh phrase", "عبارة التسبيح غير معروفة"),
            Map.entry("endsAt must be after startsAt", "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء"),
            Map.entry("challenge not found", "التحدي غير موجود"),
            Map.entry("challenge is not active", "التحدي غير نشط"),
            Map.entry("no circle with that invite code", "لا توجد حلقة بهذا الرمز"),
            Map.entry("circle not found", "الحلقة غير موجودة"),
            Map.entry("course not found", "الدورة غير موجودة"),
            Map.entry("cannot add lessons to an archived course", "لا يمكن إضافة دروس إلى دورة مؤرشفة"),
            Map.entry("only a draft course can be published", "لا يمكن نشر إلا الدورة التي في حالة مسودة"),
            Map.entry("a course needs at least one lesson before publishing", "يجب أن تحتوي الدورة على درس واحد على الأقل قبل النشر"),
            Map.entry("enrollment not found", "التسجيل غير موجود"),
            Map.entry("lesson not found in this course", "الدرس غير موجود في هذه الدورة"),
            Map.entry("enroll in the course before rating it", "سجّل في الدورة قبل تقييمها"),
            Map.entry("starting surah must be before target surah", "يجب أن تكون سورة البداية قبل سورة الهدف"),
            Map.entry("starting ayah out of range for surah", "آية البداية خارج نطاق السورة"),
            Map.entry("plan not found", "الخطة غير موجودة"),
            Map.entry("completed plan cannot change status", "لا يمكن تغيير حالة خطة مكتملة"),
            Map.entry("task not found", "المهمة غير موجودة"),
            Map.entry("notification not found", "الإشعار غير موجود"),
            Map.entry("asrFactor must be 1 (standard) or 2 (Hanafi)", "يجب أن تكون قيمة asrFactor إما 1 (الجمهور) أو 2 (الحنفي)"),
            Map.entry("no prayer settings saved; PUT /api/v1/prayer/settings first", "لا توجد إعدادات صلاة محفوظة، احفظها أولاً عبر PUT /api/v1/prayer/settings"),
            Map.entry("lat and lng are required until settings are saved", "خط العرض وخط الطول مطلوبان إلى أن يتم حفظ الإعدادات"),
            Map.entry("ayah not found", "الآية غير موجودة"),
            Map.entry("reciter not found", "القارئ غير موجود"),
            Map.entry("bookmark not found", "العلامة المرجعية غير موجودة"),
            Map.entry("no reading state yet", "لا يوجد موضع قراءة محفوظ بعد"),
            Map.entry("invalid ayah range", "نطاق الآيات غير صالح"),
            Map.entry("provide an audioUrl or a transcript", "أرسل رابط صوت أو نصاً مكتوباً للتلاوة"),
            Map.entry("evaluation job not found", "طلب التقييم غير موجود"),
            Map.entry("revision item not found", "عنصر المراجعة غير موجود"),
            Map.entry("profile not found", "الملف الشخصي غير موجود"),
            Map.entry("preferences not found", "التفضيلات غير موجودة"),
            Map.entry("device token not found", "رمز الجهاز غير موجود"),
            Map.entry("audio URL is not a valid URI", "رابط الصوت ليس عنواناً صالحاً"),
            Map.entry("audio URL must be http or https", "يجب أن يبدأ رابط الصوت بـ http أو https"),
            Map.entry("audio URL has no host", "رابط الصوت لا يحتوي على اسم مضيف"),
            Map.entry("audio URL host cannot be resolved", "تعذّر الوصول إلى مضيف رابط الصوت"),
            Map.entry("audio URL host resolves to a non-public address", "مضيف رابط الصوت يشير إلى عنوان غير عام"),
            Map.entry("redirect without location", "إعادة توجيه بدون عنوان وجهة"),
            Map.entry("audio download was empty", "ملف الصوت المحمَّل فارغ"),
            Map.entry("audio download exceeded 3 redirects", "تجاوز تحميل الصوت 3 عمليات إعادة توجيه"),
            Map.entry("validation failed", "فشل التحقق من صحة البيانات"),
            Map.entry("unexpected error", "حدث خطأ غير متوقع"),
            Map.entry("invalid or expired token", "الرمز غير صالح أو منتهي الصلاحية"),
            Map.entry("missing bearer token", "رمز الدخول مفقود"));

    private static final List<Rule> RULES = List.of(
            new Rule("^unknown timezone '(.*)'$", "المنطقة الزمنية '$1' غير معروفة"),
            new Rule("^unknown azkar category (.*)$", "فئة الأذكار غير معروفة: $1"),
            new Rule("^unknown azkar item (.*)$", "الذكر غير معروف: $1"),
            new Rule("^unknown metric '(.*)'; one of (.*)$", "المقياس '$1' غير معروف، القيم المتاحة: $2"),
            new Rule("^unknown category '(.*)'; one of (.*)$", "التصنيف '$1' غير معروف، القيم المتاحة: $2"),
            new Rule("^unknown method '(.*)'; one of (.*)$", "الطريقة '$1' غير معروفة، القيم المتاحة: $2"),
            new Rule("^unknown reciter (.*)$", "القارئ غير معروف: $1"),
            new Rule("^unknown surah (.*)$", "السورة غير معروفة: $1"),
            new Rule("^no full-surah audio for reciter (.*)$", "لا يوجد تسجيل كامل للسورة للقارئ $1"),
            new Rule("^audio download returned HTTP (.*)$", "رد تحميل الصوت برمز HTTP $1"),
            new Rule("^audio exceeds the (.*) byte limit$", "حجم الصوت يتجاوز الحد المسموح ($1 بايت)"),
            new Rule("^audio download failed: (.*)$", "فشل تحميل الصوت: $1"),
            new Rule("(?s)^Prayer times are unavailable for latitude (.*) on (.*) with method (.*?): .*$", "أوقات الصلاة غير متاحة عند خط العرض $1 بتاريخ $2 بطريقة $3 لأن الشمس لا تبلغ الزاوية المطلوبة، ولم يُنفّذ تعديل خطوط العرض العالية في هذه النسخة، فتحقق من الأوقات لدى جهة دينية محلية"));

    private static final Map<String, String> TITLES = Map.ofEntries(
            Map.entry("Bad Request", "طلب غير صالح"),
            Map.entry("Unauthorized", "غير مصرّح"),
            Map.entry("Forbidden", "ممنوع"),
            Map.entry("Not Found", "غير موجود"),
            Map.entry("Conflict", "تعارض"),
            Map.entry("Unprocessable Entity", "تعذّر معالجة الطلب"),
            Map.entry("Internal Server Error", "خطأ داخلي في الخادم"),
            Map.entry("Validation Failed", "فشل التحقق من البيانات"),
            Map.entry("invalid audio source", "مصدر الصوت غير صالح"));

    private ErrorMessages() {
    }

    public static String language(Locale locale) {
        return locale != null && AR.equalsIgnoreCase(locale.getLanguage()) ? AR : EN;
    }

    public static String translate(String message, Locale locale) {
        if (message == null || !AR.equals(language(locale))) {
            return message;
        }
        String exact = EXACT.get(message);
        if (exact != null) {
            return exact;
        }
        for (Rule rule : RULES) {
            Matcher matcher = rule.pattern().matcher(message);
            if (matcher.matches()) {
                String result = rule.template();
                for (int i = matcher.groupCount(); i >= 1; i--) {
                    result = result.replace("$" + i, matcher.group(i));
                }
                return result;
            }
        }
        return message;
    }

    public static String title(String title, Locale locale) {
        if (title == null || !AR.equals(language(locale))) {
            return title;
        }
        return TITLES.getOrDefault(title, title);
    }

    public static boolean hasArabic(String message) {
        return EXACT.containsKey(message) || RULES.stream().anyMatch(r -> r.pattern().matcher(message).matches());
    }
}
