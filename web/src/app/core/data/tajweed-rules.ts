export interface TajweedRule {
  key: string;
  en: string;
  ar: string;
  descEn: string;
  descAr: string;
  color: string;
}

export const TAJWEED_RULES: TajweedRule[] = [
  { key: 'ham_wasl', en: 'Hamzat al-wasl', ar: 'همزة الوصل', descEn: 'A connecting alif that is pronounced when starting a word and dropped when reading on from the previous word.', descAr: 'همزة تنطق عند الابتداء بالكلمة وتسقط عند وصلها بما قبلها.', color: '#6b7280' },
  { key: 'laam_shamsiyah', en: 'Lam shamsiyyah', ar: 'اللام الشمسية', descEn: 'The lam of "al" is not pronounced and the next letter is doubled.', descAr: 'لام التعريف لا تنطق ويشدد الحرف الذي بعدها.', color: '#6b7280' },
  { key: 'slnt', en: 'Silent letter', ar: 'حرف لا ينطق', descEn: 'A written letter that is not pronounced.', descAr: 'حرف مكتوب لا ينطق به.', color: '#6b7280' },
  { key: 'madda_normal', en: 'Natural madd (2 counts)', ar: 'المد الطبيعي', descEn: 'A natural prolongation of alif, waw or ya for two counts.', descAr: 'مد الألف أو الواو أو الياء بمقدار حركتين.', color: '#e07b00' },
  { key: 'madda_permissible', en: 'Permissible madd (2, 4 or 6 counts)', ar: 'المد الجائز', descEn: 'A prolongation that may be read at different lengths, depending on the recitation.', descAr: 'مد يجوز فيه عدة مقادير حسب القراءة، ومنه المنفصل والعارض للسكون.', color: '#e07b00' },
  { key: 'madda_necessary', en: 'Necessary madd (6 counts)', ar: 'المد اللازم', descEn: 'A prolongation of six counts before a permanent sukun or shaddah.', descAr: 'مد بمقدار ست حركات قبل سكون أو شدة أصلية.', color: '#d40000' },
  { key: 'madda_obligatory', en: 'Obligatory madd (4 to 5 counts)', ar: 'المد الواجب المتصل', descEn: 'A prolongation when a hamzah follows in the same word.', descAr: 'مد يأتي بعده همزة في نفس الكلمة.', color: '#d40000' },
  { key: 'qalqalah', en: 'Qalqalah', ar: 'القلقلة', descEn: 'An echo or bounce on the letters qaf, ta, ba, jim and dal when they carry a sukun.', descAr: 'اهتزاز الصوت عند النطق بحروف قطب جد إذا كانت ساكنة.', color: '#1d4ed8' },
  { key: 'ghunnah', en: 'Ghunnah', ar: 'الغنة', descEn: 'A nasal sound held for two counts on a noon or meem with shaddah.', descAr: 'صوت يخرج من الخيشوم مقدار حركتين مع النون والميم المشددتين.', color: '#0d8a3f' },
  { key: 'idgham_ghunnah', en: 'Idgham with ghunnah', ar: 'الإدغام بغنة', descEn: 'A noon sakinah or tanwin merges into ya, noon, meem or waw with a nasal sound.', descAr: 'إدخال النون الساكنة أو التنوين في حروف (ينمو) مع الغنة.', color: '#0d8a3f' },
  { key: 'idgham_wo_ghunnah', en: 'Idgham without ghunnah', ar: 'الإدغام بغير غنة', descEn: 'A noon sakinah or tanwin merges into lam or ra without a nasal sound.', descAr: 'إدخال النون الساكنة أو التنوين في اللام والراء بدون غنة.', color: '#0d8a3f' },
  { key: 'idgham_shafawi', en: 'Idgham shafawi', ar: 'الإدغام الشفوي', descEn: 'A meem sakinah merges into a following meem with ghunnah.', descAr: 'إدغام الميم الساكنة في ميم بعدها مع الغنة.', color: '#0d8a3f' },
  { key: 'idgham_mutajanisayn', en: 'Idgham of similar-origin letters', ar: 'إدغام المتجانسين', descEn: 'Two letters from the same articulation point meet, the first sakin and the second voweled, and are merged.', descAr: 'التقاء حرفين متحدين في المخرج مختلفين في الصفة، الأول ساكن، فيدغم.', color: '#0d8a3f' },
  { key: 'idgham_mutaqaribayn', en: 'Idgham of close-origin letters', ar: 'إدغام المتقاربين', descEn: 'Two letters with close articulation points meet and are merged.', descAr: 'التقاء حرفين متقاربين في المخرج، الأول ساكن، فيدغم.', color: '#0d8a3f' },
  { key: 'ikhfa', en: 'Ikhfa', ar: 'الإخفاء', descEn: 'A noon sakinah or tanwin is hidden with a light nasal sound before fifteen specific letters.', descAr: 'نطق النون الساكنة أو التنوين بصفة بين الإظهار والإدغام مع غنة قبل خمسة عشر حرفا.', color: '#7c3aed' },
  { key: 'ikhfa_shafawi', en: 'Ikhfa shafawi', ar: 'الإخفاء الشفوي', descEn: 'A meem sakinah is hidden with ghunnah before the letter ba.', descAr: 'إخفاء الميم الساكنة مع الغنة إذا جاء بعدها حرف الباء.', color: '#7c3aed' },
  { key: 'iqlab', en: 'Iqlab', ar: 'الإقلاب', descEn: 'A noon sakinah or tanwin turns into a meem with ghunnah before the letter ba.', descAr: 'قلب النون الساكنة أو التنوين ميما مع الغنة إذا جاء بعدهما حرف الباء.', color: '#7c3aed' },
  { key: 'tafkheem', en: 'Heavy letter', ar: 'التفخيم', descEn: 'A letter pronounced with a full, heavy sound.', descAr: 'نطق الحرف بصوت مفخم.', color: '#b91c1c' }
];

export interface TajweedHit {
  rule: TajweedRule;
  words: string[];
}

export function analyzeTajweed(html: string): TajweedHit[] {
  const found = new Map<string, string[]>();
  const re = /<tajweed class="?([\w]+)"?>([^<]*)<\/tajweed>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const list = found.get(m[1]) ?? [];
    if (m[2].trim() && !list.includes(m[2]) && list.length < 6) list.push(m[2]);
    found.set(m[1], list);
  }
  const hits: TajweedHit[] = [];
  for (const rule of TAJWEED_RULES) {
    const w = found.get(rule.key);
    if (w) hits.push({ rule, words: w });
  }
  return hits;
}
