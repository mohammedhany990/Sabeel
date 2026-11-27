export interface QuizQuestion {
  q: string;
  qAr: string;
  options: string[];
  optionsAr: string[];
  answer: number;
}

export interface ProphetStory {
  id: string;
  name: string;
  nameAr: string;
  title: string;
  titleAr: string;
  story: string;
  storyAr: string;
  quiz: QuizQuestion[];
}

export const PROPHET_STORIES: ProphetStory[] = [
  {
    id: 'adam',
    name: 'Adam',
    nameAr: 'آدم',
    title: 'The first human',
    titleAr: 'أول البشر',
    story: 'Allah created Adam with His own hands and honored him above many creations, breathing into him of His spirit and teaching him the names of all things. The angels prostrated before him by Allah\u2019s command, except Iblis who refused out of pride. Adam and his wife Hawwa lived in Paradise, and when Satan whispered to them and they ate from the forbidden tree, they repented sincerely and Allah accepted their repentance. Adam became the first prophet, guiding his children to worship Allah alone.',
    storyAr: 'خلق الله آدم بيده وكرّمه على كثير من خلقه، ونفخ فيه من روحه، وعلّمه أسماء كل شيء. وسجد له الملائكة أمرًا من الله إلا إبليس أبى استكبارًا. وعاش آدم وحواء في الجنة، فلما وسوس لهما الشيطان وأكلا من الشجرة المنهي عنها، تابا توبة صادقة فتاب الله عليهما. وكان آدم أول نبي يهدي بنيه إلى عبادة الله وحده.',
    quiz: [
      { q: 'Who refused to prostrate before Adam?', qAr: 'من أبى السجود لآدم؟', options: ['Jibril', 'Iblis', 'Mika\u2019il'], optionsAr: ['جبريل', 'إبليس', 'ميكائيل'], answer: 1 },
      { q: 'What did Adam and Hawwa do after eating from the tree?', qAr: 'ماذا فعل آدم وحواء بعد الأكل من الشجرة؟', options: ['They despaired', 'They repented', 'They hid from people'], optionsAr: ['يأسوا', 'تابوا', 'اختبأوا من الناس'], answer: 1 },
      { q: 'What did Allah teach Adam?', qAr: 'ماذا علّم الله آدم؟', options: ['The names of all things', 'Farming', 'Writing'], optionsAr: ['أسماء كل شيء', 'الزراعة', 'الكتابة'], answer: 0 },
      { q: 'Who was Adam\u2019s wife?', qAr: 'من زوجة آدم؟', options: ['Sarah', 'Hajar', 'Hawwa'], optionsAr: ['سارة', 'هاجر', 'حواء'], answer: 2 },
      { q: 'Adam is considered the first what?', qAr: 'يُعدّ آدم أول ماذا؟', options: ['King', 'Prophet', 'Angel'], optionsAr: ['ملك', 'نبي', 'ملك من الملائكة'], answer: 1 }
    ]
  },
  {
    id: 'nuh',
    name: 'Nuh (Noah)',
    nameAr: 'نوح',
    title: 'The ark',
    titleAr: 'السفينة',
    story: 'Nuh called his people to worship Allah alone for nine hundred and fifty years, but only a few believed. Allah commanded him to build an ark, and the people mocked him. When the great flood came, Allah saved Nuh and the believers and pairs of every creature in the ark, while the disbelievers drowned. The ark came to rest on Mount Judi, and Nuh\u2019s story remains a lesson in patience and steadfastness.',
    storyAr: 'دعا نوح قومه إلى عبادة الله وحده تسعمائة وخمسين سنة، فما آمن معه إلا قليل. وأمره الله أن يصنع السفينة، وكان قومه يسخرون منه. فلما جاء الطوفان العظيم، نجّى الله نوحًا والمؤمنين وأزواجًا من كل زوجين في السفينة، وأغرق المكذبين. واستوت السفينة على جبل الجودي، وبقيت قصة نوح عبرة في الصبر والثبات.',
    quiz: [
      { q: 'How long did Nuh call his people?', qAr: 'كم دعا نوح قومه؟', options: ['950 years', '100 years', '40 years'], optionsAr: ['950 سنة', '100 سنة', '40 سنة'], answer: 0 },
      { q: 'What did Allah command Nuh to build?', qAr: 'بماذا أمر الله نوحًا؟', options: ['A palace', 'An ark', 'A tower'], optionsAr: ['بناء قصر', 'بناء السفينة', 'بناء برج'], answer: 1 },
      { q: 'Where did the ark come to rest?', qAr: 'أين استوت السفينة؟', options: ['Mount Sinai', 'Mount Judi', 'Mount Arafat'], optionsAr: ['جبل سيناء', 'جبل الجودي', 'جبل عرفات'], answer: 1 },
      { q: 'Who was saved with Nuh?', qAr: 'من نجا مع نوح؟', options: ['All his people', 'The believers', 'The kings'], optionsAr: ['كل قومه', 'المؤمنون', 'الملوك'], answer: 1 },
      { q: 'What did the people do when Nuh built the ark?', qAr: 'ماذا فعل القوم حين صنع نوح السفينة؟', options: ['Helped him', 'Mocked him', 'Believed him'], optionsAr: ['ساعدوه', 'سخروا منه', 'آمنوا به'], answer: 1 }
    ]
  },
  {
    id: 'ibrahim',
    name: 'Ibrahim (Abraham)',
    nameAr: 'إبراهيم',
    title: 'The friend of Allah',
    titleAr: 'خليل الله',
    story: 'Ibrahim grew up among idol worshippers but reasoned his way to the truth: the stars, the moon, and the sun all set, so he turned to the Lord of the worlds. He smashed the idols and was thrown into a great fire, which Allah made cool and peaceful upon him. He was tested with the command to sacrifice his son Ismail, and both submitted, so Allah ransomed the son with a great sacrifice. Ibrahim and Ismail raised the foundations of the Kaaba, and his legacy of pure monotheism endures in the Hajj and in every prayer.',
    storyAr: 'نشأ إبراهيم بين قوم يعبدون الأصنام، فهداه الله بالنظر في الكون: النجوم والقمر والشمس كلها آفلة، فوجّه وجهه لرب العالمين. وكسر الأصنام فألقي في النار العظيمة، فجعلها الله بردًا وسلامًا عليه. وابتُلي بذبح ابنه إسماعيل فسلّما كلاهما، فافتدى الله ابنه بذبح عظيم. ورفع إبراهيم وإسماعيل قواعد الكعبة، وبقي إرثه في التوحيد في الحج وفي كل صلاة.',
    quiz: [
      { q: 'What did Allah make the fire for Ibrahim?', qAr: 'بماذا جعل الله النار لإبراهيم؟', options: ['Hotter', 'Cool and peaceful', 'Smoke only'], optionsAr: ['أشد حرارة', 'بردًا وسلامًا', 'دخانًا فقط'], answer: 1 },
      { q: 'Which son was Ibrahim commanded to sacrifice?', qAr: 'أي ابن أُمر إبراهيم بذبحه؟', options: ['Ishaq', 'Ismail', 'Ya\u2019qub'], optionsAr: ['إسحاق', 'إسماعيل', 'يعقوب'], answer: 1 },
      { q: 'What did Ibrahim and Ismail raise together?', qAr: 'ماذا رفع إبراهيم وإسماعيل معًا؟', options: ['A tower', 'The foundations of the Kaaba', 'A city wall'], optionsAr: ['برجًا', 'قواعد الكعبة', 'سور مدينة'], answer: 1 },
      { q: 'What did Ibrahim smash?', qAr: 'ماذا كسر إبراهيم؟', options: ['The idols', 'The ark', 'The tablets'], optionsAr: ['الأصنام', 'السفينة', 'الألواح'], answer: 0 },
      { q: 'What title is Ibrahim known by?', qAr: 'بأي لقب يُعرف إبراهيم؟', options: ['Kalimullah', 'Khalilullah', 'Ruhullah'], optionsAr: ['كليم الله', 'خليل الله', 'روح الله'], answer: 1 }
    ]
  },
  {
    id: 'musa',
    name: 'Musa (Moses)',
    nameAr: 'موسى',
    title: 'The one Allah spoke to',
    titleAr: 'كليم الله',
    story: 'Musa was born when Pharaoh ordered the killing of every newborn boy, so his mother placed him in a basket on the river and Allah returned him to her to be raised in Pharaoh\u2019s own house. Allah spoke to him directly at the sacred valley and sent him to Pharaoh with his brother Harun. By Allah\u2019s command Musa struck the sea with his staff and it split, saving the Children of Israel and drowning Pharaoh\u2019s army. He received the Torah and stood firm through his people\u2019s trials.',
    storyAr: 'وُلد موسى وفرعون يذبح كل مولود ذكر، فأوحى الله لأمه أن تضعه في تابوت في اليم، فردّه الله إليها ليُربّى في بيت فرعون نفسه. وكلّمه الله تكليمًا في الواد المقدس، وأرسله إلى فرعون مع أخيه هارون. وبأمر الله ضرب موسى البحر بعصاه فانفلق، فنجّى الله بني إسرائيل وأغرق جيش فرعون. وأوتي موسى التوراة وثبت على ابتلاءات قومه.',
    quiz: [
      { q: 'Where was baby Musa placed?', qAr: 'أين وُضع موسى وهو رضيع؟', options: ['In a cave', 'In a basket on the river', 'In the desert'], optionsAr: ['في غار', 'في تابوت في النهر', 'في الصحراء'], answer: 1 },
      { q: 'Who was Musa\u2019s brother?', qAr: 'من أخو موسى؟', options: ['Harun', 'Yusuf', 'Dawud'], optionsAr: ['هارون', 'يوسف', 'داود'], answer: 0 },
      { q: 'What happened when Musa struck the sea?', qAr: 'ماذا حدث حين ضرب موسى البحر؟', options: ['It rose', 'It split', 'It froze'], optionsAr: ['ارتفع', 'انفلق', 'تجمّد'], answer: 1 },
      { q: 'Which book was given to Musa?', qAr: 'أي كتاب أوتي موسى؟', options: ['Zabur', 'Injil', 'Torah'], optionsAr: ['الزبور', 'الإنجيل', 'التوراة'], answer: 2 },
      { q: 'Who raised Musa in his palace?', qAr: 'من ربّى موسى في قصره؟', options: ['Pharaoh', 'His uncle', 'Shu\u2019ayb'], optionsAr: ['فرعون', 'عمه', 'شعيب'], answer: 0 }
    ]
  },
  {
    id: 'isa',
    name: 'Isa (Jesus)',
    nameAr: 'عيسى',
    title: 'The Messiah',
    titleAr: 'المسيح',
    story: 'Isa son of Maryam was born by a miracle without a father, and he spoke in the cradle defending his mother\u2019s honor. Allah gave him the Injil and supported him with miracles: healing the blind and the leper and raising the dead by Allah\u2019s permission. He called the Children of Israel to worship Allah alone. Allah raised him to Himself before his enemies could harm him, and he will return before the end of time to establish justice.',
    storyAr: 'وُلد عيسى ابن مريم بمعجزة من غير أب، وتكلّم في المهد مدافعًا عن براءة أمه. وأعطاه الله الإنجيل وأيّده بالمعجزات: يبرئ الأعمى والأبرص ويحيي الموتى بإذن الله. ودعا بني إسرائيل إلى عبادة الله وحده. ورفعه الله إليه قبل أن ينال منه أعداؤه، وسينزل قبل آخر الزمان فيقيم العدل.',
    quiz: [
      { q: 'Who was Isa\u2019s mother?', qAr: 'من أم عيسى؟', options: ['Asiya', 'Maryam', 'Hawwa'], optionsAr: ['آسية', 'مريم', 'حواء'], answer: 1 },
      { q: 'When did Isa first speak?', qAr: 'متى تكلّم عيسى أول مرة؟', options: ['In the cradle', 'At age twelve', 'At age thirty'], optionsAr: ['في المهد', 'في الثانية عشرة', 'في الثلاثين'], answer: 0 },
      { q: 'Which book was given to Isa?', qAr: 'أي كتاب أوتي عيسى؟', options: ['Torah', 'Zabur', 'Injil'], optionsAr: ['التوراة', 'الزبور', 'الإنجيل'], answer: 2 },
      { q: 'What happened to Isa at the end of his mission?', qAr: 'ماذا حدث لعيسى في نهاية رسالته؟', options: ['He was killed', 'Allah raised him to Himself', 'He hid in a cave'], optionsAr: ['قُتل', 'رفعه الله إليه', 'اختبأ في غار'], answer: 1 },
      { q: 'By whose permission did Isa perform miracles?', qAr: 'بإذن من كان يجري المعجزات على يد عيسى؟', options: ['His own power', 'Allah\u2019s permission', 'The angels'], optionsAr: ['بقدرته الذاتية', 'بإذن الله', 'بإذن الملائكة'], answer: 1 }
    ]
  },
  {
    id: 'muhammad',
    name: 'Muhammad',
    nameAr: 'محمد',
    title: 'The final messenger',
    titleAr: 'خاتم المرسلين',
    story: 'Muhammad was born in Makkah, an orphan known as the trustworthy one. At forty, revelation came to him in the cave of Hira through Jibril, and he called people to worship Allah alone despite persecution. He migrated to Madinah, where the first Muslim community flourished, and within years the Quran was completed and Islam spread across Arabia. He taught mercy, justice, and brotherhood, and delivered the Farewell Sermon before passing away in Madinah, leaving the Quran and his Sunnah as guidance for all humanity.',
    storyAr: 'وُلد محمد ﷺ في مكة يتيمًا، وعُرف بالصادق الأمين. وفي الأربعين نزل عليه الوحي في غار حراء عن طريق جبريل، فدعا الناس إلى عبادة الله وحده رغم الأذى. وهاجر إلى المدينة حيث قامت أول دولة للمسلمين، وفي سنوات اكتمل القرآن وانتشر الإسلام في الجزيرة. وعلّم الرحمة والعدل والأخوة، وألقى خطبة الوداع قبل أن يتوفى في المدينة، تاركًا القرآن وسنته هدى للبشرية.',
    quiz: [
      { q: 'Where was Muhammad born?', qAr: 'أين وُلد محمد ﷺ؟', options: ['Madinah', 'Makkah', 'Taif'], optionsAr: ['المدينة', 'مكة', 'الطائف'], answer: 1 },
      { q: 'Where did revelation first come to him?', qAr: 'أين نزل عليه الوحي أول مرة؟', options: ['Cave of Hira', 'Mount Arafat', 'The Kaaba'], optionsAr: ['غار حراء', 'جبل عرفات', 'الكعبة'], answer: 0 },
      { q: 'Which angel brought the revelation?', qAr: 'أي مَلَك نزل بالوحي؟', options: ['Mika\u2019il', 'Israfil', 'Jibril'], optionsAr: ['ميكائيل', 'إسرافيل', 'جبريل'], answer: 2 },
      { q: 'To which city did he migrate?', qAr: 'إلى أي مدينة هاجر؟', options: ['Taif', 'Madinah', 'Jerusalem'], optionsAr: ['الطائف', 'المدينة', 'القدس'], answer: 1 },
      { q: 'What is Muhammad called as the last prophet?', qAr: 'بماذا يُلقّب محمد ﷺ كآخر الأنبياء؟', options: ['Khalilullah', 'Seal of the prophets', 'Kalimullah'], optionsAr: ['خليل الله', 'خاتم الأنبياء', 'كليم الله'], answer: 1 }
    ]
  }
];
