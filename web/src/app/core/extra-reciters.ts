import { Reciter } from './models';

export interface ExtraReciter extends Reciter {
  ayahBase: string;
  extra: true;
}

const pad = (n: number) => String(n).padStart(3, '0');

export const EXTRA_RECITERS: ExtraReciter[] = [
  {
    id: 9001,
    nameAr: 'محمود خليل الحصري',
    nameEn: 'Mahmoud Khalil Al-Husary',
    country: 'Egypt',
    countryAr: 'مصر',
    style: 'Muallim (teacher)',
    styleAr: 'معلم',
    ayahBase: 'https://everyayah.com/data/Husary_Muallim_128kbps',
    extra: true
  },
  {
    id: 9002,
    nameAr: 'محمد صديق المنشاوي',
    nameEn: 'Mohamed Siddiq Al-Minshawi',
    country: 'Egypt',
    countryAr: 'مصر',
    style: 'Muallim (teacher)',
    styleAr: 'معلم',
    ayahBase: 'https://everyayah.com/data/Minshawy_Teacher_128kbps',
    extra: true
  }
];

export function mergeReciters(list: Reciter[]): Reciter[] {
  const have = new Set(list.map((r) => r.nameEn + '|' + r.style));
  return [...list, ...EXTRA_RECITERS.filter((e) => !have.has(e.nameEn + '|' + e.style))];
}

export function extraOf(id: number): ExtraReciter | undefined {
  return EXTRA_RECITERS.find((e) => e.id === id);
}

export function extraAyahUrl(e: ExtraReciter, surah: number, ayah: number): string {
  return `${e.ayahBase}/${pad(surah)}${pad(ayah)}.mp3`;
}
