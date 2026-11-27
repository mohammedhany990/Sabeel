export interface Dua {
  ar: string;
  en: string;
  ref: string;
}

export interface DuaCategory {
  id: string;
  en: string;
  arName: string;
  duas: Dua[];
}

export const DUA_CATEGORIES: DuaCategory[] = [
  {
    id: 'waking',
    en: 'On waking up',
    arName: 'عند الاستيقاظ',
    duas: [
      { ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', en: 'Praise be to Allah who gave us life after He took it, and to Him is the resurrection.', ref: 'Al-Bukhari 6313' },
      { ar: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ', en: 'None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is over all things able. Glory be to Allah, praise be to Allah, none has the right to be worshipped but Allah, Allah is the Greatest, and there is no might nor power except with Allah, the Most High, the Magnificent.', ref: 'Al-Bukhari 1154' }
    ]
  },
  {
    id: 'sleeping',
    en: 'Before sleeping',
    arName: 'عند النوم',
    duas: [
      { ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', en: 'In Your name, O Allah, I die and I live.', ref: 'Al-Bukhari 6324' },
      { ar: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', en: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.', ref: 'Abu Dawud 5045' },
      { ar: 'اللَّهُمَّ بِاسْمِكَ عَلَى جَنْبِي، اللَّهُمَّ اغْفِرْ لِي ذَنْبِي، وَأَخْسِئْ شَيْطَانِي، وَفُكَّ رِهَانِي، وَاجْعَلْنِي فِي النَّدِيِّ الْأَعْلَى', en: 'O Allah, in Your name I lie on my side. O Allah, forgive my sin, drive away my devil, free my pledge, and place me in the highest assembly.', ref: 'Abu Dawud 5054' }
    ]
  },
  {
    id: 'home',
    en: 'Entering and leaving home',
    arName: 'دخول المنزل والخروج منه',
    duas: [
      { ar: 'بِسْمِ اللهِ، تَوَكَّلْتُ عَلَى اللهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ', en: 'In the name of Allah, I trust in Allah, and there is no might nor power except with Allah. (When leaving home)', ref: 'Abu Dawud 5095' },
      { ar: 'بِسْمِ اللهِ وَلَجْنَا، وَبِسْمِ اللهِ خَرَجْنَا، وَعَلَى اللهِ رَبِّنَا تَوَكَّلْنَا', en: 'In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we rely. (When entering home)', ref: 'Abu Dawud 5096' }
    ]
  },
  {
    id: 'mosque',
    en: 'Going to the mosque',
    arName: 'الذهاب إلى المسجد',
    duas: [
      { ar: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا', en: 'O Allah, place light in my heart, light on my tongue, light in my hearing, and light in my sight.', ref: 'Al-Bukhari 6316' },
      { ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', en: 'O Allah, I ask You of Your bounty. (When entering)', ref: 'Muslim 713' },
      { ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الشَّيْطَانِ الرَّجِيمِ', en: 'O Allah, I seek refuge in You from the accursed devil.', ref: 'Al-Bukhari 6117' }
    ]
  },
  {
    id: 'eating',
    en: 'Before and after eating',
    arName: 'قبل الطعام وبعده',
    duas: [
      { ar: 'بِسْمِ اللهِ وَعَلَى بَرَكَةِ اللهِ', en: 'In the name of Allah and with the blessings of Allah.', ref: 'Abu Dawud 3767' },
      { ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', en: 'Praise be to Allah who fed us, gave us drink, and made us Muslims.', ref: 'At-Tirmidhi 3457' }
    ]
  },
  {
    id: 'travel',
    en: 'Traveling',
    arName: 'السفر',
    duas: [
      { ar: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', en: 'Glory be to Him who subjected this to us, and we could never have accomplished it ourselves, and indeed to our Lord we will return.', ref: 'Az-Zukhruf 13-14, Muslim 1342' },
      { ar: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى', en: 'O Allah, we ask You in this journey of ours for righteousness and piety, and for deeds that please You.', ref: 'Muslim 1342' }
    ]
  },
  {
    id: 'istikhara',
    en: 'Istikhara (seeking guidance)',
    arName: 'الاستخارة',
    duas: [
      { ar: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ', en: 'O Allah, I seek Your guidance by Your knowledge, and I seek ability by Your power, and I ask You of Your great bounty. You have power and I have none, You know and I do not, and You are the Knower of the unseen. Pray two voluntary rakahs first, then say this dua.', ref: 'Sahih al-Bukhari 1162' },
      { ar: 'اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ', en: 'O Allah, if You know that this matter is good for me in my religion, my livelihood and the outcome of my affairs, then decree it for me, make it easy for me, and bless me in it. If You know that this matter is bad for me in my religion, my livelihood and the outcome of my affairs, then turn it away from me and turn me away from it, and decree for me the good wherever it is, then make me content with it. Name the matter where the dua says "this matter".', ref: 'Sahih al-Bukhari 1162' }
    ]
  },
  {
    id: 'distress',
    en: 'In distress and worry',
    arName: 'عند الكرب والهم',
    duas: [
      { ar: 'لَا إِلَهَ إِلَّا اللهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ', en: 'None has the right to be worshipped but Allah, the Magnificent, the Forbearing. None has the right to be worshipped but Allah, Lord of the Magnificent Throne. None has the right to be worshipped but Allah, Lord of the heavens, Lord of the earth, and Lord of the Noble Throne.', ref: 'Al-Bukhari 6346' },
      { ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', en: 'O Allah, I seek refuge in You from worry and grief, from incapacity and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by men.', ref: 'Al-Bukhari 6369' }
    ]
  },
  {
    id: 'forgiveness',
    en: 'Seeking forgiveness',
    arName: 'الاستغفار',
    duas: [
      { ar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', en: 'O Allah, You are my Lord, none has the right to be worshipped but You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You. (Sayyid al-Istighfar)', ref: 'Al-Bukhari 6306' },
      { ar: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ', en: 'My Lord, forgive me and accept my repentance; indeed You are the Acceptor of repentance, the Merciful.', ref: 'Abu Dawud 1516' }
    ]
  }
];
