export interface TasbihPreset {
  id: string;
  ar: string;
  en: string;
  target: number;
}

export const TASBIH_PRESETS: TasbihPreset[] = [
  { id: 'subhanallah', ar: 'سُبْحَانَ الله', en: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', ar: 'الْحَمْدُ لِلَّه', en: 'Praise be to Allah', target: 33 },
  { id: 'allahu-akbar', ar: 'اللهُ أَكْبَر', en: 'Allah is the Greatest', target: 34 },
  { id: 'la-ilaha', ar: 'لَا إِلَهَ إِلَّا الله', en: 'There is no god but Allah', target: 100 },
  { id: 'astaghfirullah', ar: 'أَسْتَغْفِرُ الله', en: 'I seek Allah\u2019s forgiveness', target: 100 },
  { id: 'subhanallah-wabihamdih', ar: 'سُبْحَانَ اللهِ وَبِحَمْدِه', en: 'Glory and praise be to Allah', target: 100 },
  { id: 'salat-alanabi', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّد', en: 'O Allah, send blessings upon Muhammad', target: 100 },
  { id: 'hawqala', ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِالله', en: 'There is no might nor power except with Allah', target: 100 }
];

export const TASBIH_TARGETS = [33, 100, 500, 1000];
