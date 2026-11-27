package com.sabeel.notification.service;

public final class EmailLayout {
    private static final String FONT_LTR = "'Segoe UI',Helvetica,Arial,sans-serif";
    private static final String FONT_RTL = "'Segoe UI',Tahoma,'Noto Naskh Arabic',Arial,sans-serif";

    private EmailLayout() {
    }

    public static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    public static String action(boolean rtl, String heading, String greeting, String intro, String buttonLabel,
                                String url, String note, String footer, String supportLabel, String supportEmail) {
        String dir = rtl ? "rtl" : "ltr";
        String align = rtl ? "right" : "left";
        String font = rtl ? FONT_RTL : FONT_LTR;
        String brand = rtl ? "سبيل" : "Sabeel";
        String verse = "إِنَّ هَٰذَا ٱلْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ";
        StringBuilder h = new StringBuilder(3000);
        h.append("<!DOCTYPE html><html lang=\"").append(rtl ? "ar" : "en").append("\">")
                .append("<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
                .append("<meta name=\"color-scheme\" content=\"light only\"><title>").append(escape(heading)).append("</title></head>")
                .append("<body style=\"margin:0;padding:0;background-color:#04181a;\">")
                .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#04181a\" style=\"background-color:#04181a;\"><tr><td align=\"center\" style=\"padding:32px 12px;\">")
                .append("<table role=\"presentation\" width=\"560\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:100%;max-width:560px;\">")
                .append("<tr><td align=\"center\" style=\"padding:0 0 18px 0;font-family:").append(font)
                .append(";font-size:28px;line-height:34px;color:#e2c275;font-weight:600;letter-spacing:1px;\">&#10022;&nbsp;").append(brand).append("</td></tr>")
                .append("<tr><td bgcolor=\"#0b2f2c\" dir=\"").append(dir).append("\" style=\"background-color:#0b2f2c;border:1px solid #1f5a4d;border-radius:16px;padding:32px 28px;text-align:")
                .append(align).append(";font-family:").append(font).append(";\">")
                .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" dir=\"").append(dir).append("\">")
                .append("<tr><td style=\"font-family:").append(font).append(";font-size:22px;line-height:30px;font-weight:700;color:#f4ead0;text-align:").append(align)
                .append(";padding-bottom:14px;\">").append(escape(heading)).append("</td></tr>")
                .append("<tr><td style=\"font-family:").append(font).append(";font-size:15px;line-height:24px;color:#cfe3dc;text-align:").append(align)
                .append(";padding-bottom:6px;\">").append(escape(greeting)).append("</td></tr>")
                .append("<tr><td style=\"font-family:").append(font).append(";font-size:15px;line-height:24px;color:#cfe3dc;text-align:").append(align)
                .append(";padding-bottom:24px;\">").append(escape(intro)).append("</td></tr>")
                .append("<tr><td align=\"center\" style=\"padding-bottom:24px;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>")
                .append("<td align=\"center\" bgcolor=\"#e2c275\" style=\"background-color:#e2c275;border-radius:10px;\">")
                .append("<a href=\"").append(escape(url)).append("\" target=\"_blank\" style=\"display:inline-block;padding:14px 36px;font-family:").append(font)
                .append(";font-size:16px;line-height:20px;font-weight:700;color:#1b1405;text-decoration:none;border-radius:10px;\">")
                .append(escape(buttonLabel)).append("</a></td></tr></table></td></tr>")
                .append("<tr><td style=\"font-family:").append(font).append(";font-size:13px;line-height:20px;color:#8fb3a8;text-align:").append(align)
                .append(";border-top:1px solid #1f5a4d;padding-top:16px;\">").append(escape(note)).append("</td></tr>")
                .append("</table></td></tr>")
                .append("<tr><td align=\"center\" dir=\"rtl\" style=\"padding:22px 8px 4px 8px;font-family:'Amiri','Noto Naskh Arabic',Tahoma,serif;font-size:18px;line-height:30px;color:#c9a95f;\">")
                .append(verse).append("</td></tr>")
                .append("<tr><td align=\"center\" dir=\"").append(dir).append("\" style=\"padding:4px 8px 0 8px;font-family:").append(font).append(";font-size:12px;line-height:18px;color:#6f9488;\">")
                .append(escape(footer));
        if (supportEmail != null && !supportEmail.isBlank()) {
            h.append("<br>").append(escape(supportLabel)).append(" <a href=\"mailto:").append(escape(supportEmail))
                    .append("\" style=\"color:#c9a95f;text-decoration:underline;\">").append(escape(supportEmail)).append("</a>");
        }
        h.append("</td></tr>")
                .append("</table></td></tr></table></body></html>");
        return h.toString();
    }
}
