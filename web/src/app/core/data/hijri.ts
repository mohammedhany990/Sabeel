export interface HijriDate {
  day: number;
  month: number;
  year: number;
}

const ISLAMIC_EPOCH = 1948439;

export function hijriFromGregorian(d: Date): HijriDate {
  const days = Math.floor(d.getTime() / 86400000) + 2440588;
  let l = days - ISLAMIC_EPOCH + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

export function hijriMonthLength(month: number, year: number): number {
  const jd1 = hijriToJd(year, month, 1);
  const jd2 = month === 12 ? hijriToJd(year + 1, 1, 1) : hijriToJd(year, month + 1, 1);
  return jd2 - jd1;
}

function hijriToJd(year: number, month: number, day: number): number {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    ISLAMIC_EPOCH - 1
  );
}

export function gregorianFromHijri(year: number, month: number, day: number): Date {
  const jd = hijriToJd(year, month, day);
  return new Date((jd - 2440588) * 86400000);
}

export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhirah',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
];

export const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

export interface Occasion {
  month: number;
  day: number;
  en: string;
  ar: string;
  fasting: boolean;
}

export const OCCASIONS: Occasion[] = [
  { month: 1, day: 1, en: 'Islamic New Year', ar: 'رأس السنة الهجرية', fasting: false },
  { month: 1, day: 9, en: 'Day of Tasu\u2019a (recommended fast)', ar: 'يوم تاسوعاء (صيام مستحب)', fasting: true },
  { month: 1, day: 10, en: 'Day of Ashura (recommended fast)', ar: 'يوم عاشوراء (صيام مستحب)', fasting: true },
  { month: 3, day: 12, en: 'Mawlid al-Nabi', ar: 'المولد النبوي', fasting: false },
  { month: 7, day: 27, en: 'Isra and Mi\u2019raj', ar: 'الإسراء والمعراج', fasting: false },
  { month: 8, day: 15, en: 'Mid-Sha\u2019ban', ar: 'ليلة النصف من شعبان', fasting: true },
  { month: 9, day: 1, en: 'Start of Ramadan', ar: 'بداية رمضان', fasting: true },
  { month: 9, day: 27, en: 'Laylat al-Qadr (sought in the last ten nights)', ar: 'ليلة القدر (تُتحرّى في العشر الأواخر)', fasting: false },
  { month: 10, day: 1, en: 'Eid al-Fitr', ar: 'عيد الفطر', fasting: false },
  { month: 12, day: 9, en: 'Day of Arafah (recommended fast for non-pilgrims)', ar: 'يوم عرفة (صيام مستحب لغير الحاج)', fasting: true },
  { month: 12, day: 10, en: 'Eid al-Adha', ar: 'عيد الأضحى', fasting: false }
];

export function upcomingOccasions(from: HijriDate, count = 4): (Occasion & { daysAway: number; date: Date })[] {
  const out: (Occasion & { daysAway: number; date: Date })[] = [];
  for (let yearOff = 0; yearOff <= 1 && out.length < count; yearOff++) {
    for (const o of OCCASIONS) {
      const d = gregorianFromHijri(from.year + yearOff, o.month, o.day);
      const daysAway = Math.round((d.getTime() - gregorianFromHijri(from.year, from.month, from.day).getTime()) / 86400000);
      if (daysAway >= 0) out.push({ ...o, daysAway, date: d });
    }
  }
  out.sort((a, b) => a.daysAway - b.daysAway);
  return out.slice(0, count);
}
