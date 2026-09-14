import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. Quyosh tizimi sayyoralarining tasnifi
  (qId, idx, target) => {
    const list = [
      { guruh: "Yer guruhi sayyoralari (Merkuriy, Venera, Yer, Mars)", xususiyat: "qattiq toshli qobiqqa, yuqori o'rtacha zichlikka va kam sonli tabiiy yo'ldoshlarga ega bo'ladi" },
      { guruh: "gigant sayyoralar (Yupiter, Saturn, Uran, Neptun)", xususiyat: "asosan gaz va suyuq vodorod-geliydan iborat bo'lib, katta hajm, halqalar va ko'plab yo'ldoshlarga ega" },
      { guruh: "mitti sayyoralar (masalan, Pluton, Serera, Erida)", xususiyat: "o'z gravitatsiyasi bilan dumaloq shakl olgan, ammo o'z orbitasi atrofini boshqa jismlardan tozalay olmagan" },
      { guruh: "asteroidlar asosiy kamari", xususiyat: "Mars va Yupiter orbitalari oralig'idagi fazoda Quyosh atrofida aylanuvchi tosh qoldiqlardan iborat" }
    ];
    const itm = list[idx % list.length];
    const q = `Quyosh tizimi osmon jismlarining zamonaviy astronomik tasnifiga ko'ra, agar ${itm.guruh} o'rganilsa, ular qanday umumiy fizik xususiyatga ega? (#${qId})`;
    const correct = `Astronomik tasnifga muvofiq, ular ${itm.xususiyat}`;
    const distractors = [
      `Astronomik tasnifga muvofiq, ular faqat sof muz kristallaridan tashkil topgan bo'lib gravitatsiya kuchiga ega emas`,
      `Astronomik tasnifga muvofiq, ular Quyosh atrofida emas, balki to'g'ridan-to'g'ri Yer atrofida doimiy aylanadi`,
      `Astronomik tasnifga muvofiq, ular Quyosh bilan bir xil massaga ega bo'lib yulduzlararo termoyadro sintezini amalga oshiradi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Quyosh tizimi tuzilishi (Mamadazimov M., Astronomiya 11-sinf): 8 ta asosiy sayyora ikki guruhga bo'linadi: Yer guruhi (qattiq sirtli, zich) va Gigant sayyoralar (gaz-suyuqlik, katta hajm, kam zichlik). Mars va Yupiter oralig'ida asteroidlar kamari joylashgan.`,
      mnemonic: "Sayyoralar oilasi: To'rttasi toshdek mustahkam Yer guruhi, to'rttasi gazli bahaybat gigantlar ulushi.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 2. Yerning harakati va fasllar
  (qId, idx, target) => {
    const list = [
      { hodisa: "Yerning o'z o'qi atrofida g'arbdan sharqqa sutkalik aylanishi", oqibat: "kun va tunning muntazam almashinishiga hamda osmon jismlarining ko'rinma harakatiga sabab bo'ladi" },
      { hodisa: "Yer o'qining orbita tekisligiga 66.5° (perpendikulyarga 23.5°) og'maligi va Quyosh atrofida aylanishi", oqibat: "yil davomida fasllarning qonuniy almashinishiga va kun-tun uzunligi o'zgarishiga olib keladi" },
      { hodisa: "21-mart va 23-sentyabr kunlari (bahorgi va kuzgi tengkunlik)", oqibat: "quyosh nurlari ekvatorga tik tushib butun Yer yuzida kun va tun davomiyligi 12 soatdan tenglashadi" },
      { hodisa: "22-iyun kuni (yozgi quyosh turishi)", oqibat: "shimoliy yarimsharda eng uzun kun va eng qisqa tun kuzatilib shimoliy qutbda qutb kuni hukm suradi" }
    ];
    const itm = list[idx % list.length];
    const q = `Yerning fazodagi astronomik harakatlari va ularning geografik-iqlimiy oqibatlari tahlil qilinganda, ${itm.hodisa} nimaga olib keladi? (#${qId})`;
    const correct = `Astronomiya qonuniyatiga ko'ra, u ${itm.oqibat}`;
    const distractors = [
      `Astronomiya qonuniyatiga ko'ra, u Yer gravitatsiyasining to'xtab qolishiga va magnit maydon yo'qolishiga sabab bo'ladi`,
      `Astronomiya qonuniyatiga ko'ra, u Oyning fazalarini birdaniga o'zgartirib Quyosh massasini kamaytiradi`,
      `Astronomiya qonuniyatiga ko'ra, u Yer orbitasining doiraviy shakldan uchburchak shaklga o'tishiga majbur qiladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yerning harakati (Mamadazimov M., Astronomiya 11-sinf): sutkalik aylanish kun va tunni vujudga keltiradi. Orbita tekisligiga og'ish (23.5°) va yillik aylanish esa fasllar almashinuvini keltirib chiqaradi. 21-mart va 23-sentyabr — tengkunlik kunlaridir.`,
      mnemonic: "Yer harakati: O'z o'qi kun-tun berar, Quyosh atrofida esa to'rt fasl navbati bilan kelar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 3. Oy fazalari va tutilishlar
  (qId, idx, target) => {
    const list = [
      { jarayon: "yangi oy fazasida Oy Yer bilan Quyosh o'rtasida bir to'g'ri chiziqda joylashganda", oqibat: "Oy soyasi Yer sirtiga tushib Quyosh tutilishi hodisasi yuz berishi mumkin bo'ladi" },
      { jarayon: "to'lin oy fazasida Yer Quyosh bilan Oy o'rtasida bir to'g'ri chiziqda bo'lganda", oqibat: "Oy Yerning soyasiga kirib Oy tutilishi hodisasi kuzatiladi" },
      { jarayon: "Oyning o'z o'qi atrofida aylanish davri uning Yer atrofida aylanish davriga teng bo'lgani sababli", oqibat: "Yerda yashovchi kuzatuvchilar doimo Oyning faqat bir tomonini (yarmini) ko'radilar" },
      { jarayon: "Oy fazalarining to'liq almashinish sinodik davri", oqibat: "taxminan 29.5 sutkani (bir qamariy oyni) tashkil etadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Oyning Quyosh va Yerga nisbatan fazoviy joylashuvi hamda tutilishlar mexanizmiga asosan, agar ${itm.jarayon}, qanday astronomik hodisa yuzaga keladi? (#${qId})`;
    const correct = `Osmon mexanikasi qoidasiga ko'ra, ${itm.oqibat}`;
    const distractors = [
      `Osmon mexanikasi qoidasiga ko'ra, Oy orbitasi birdaniga Yer sirtiga qulab tushish xavfini tug'diradi`,
      `Osmon mexanikasi qoidasiga ko'ra, Quyosh o'z nurlanishini to'xtatib mutlaq qorong'ilik boshlanadi`,
      `Osmon mexanikasi qoidasiga ko'ra, barcha to'lqinlar fazoda tarqalish o'rniga faqat Oy kraterlarida yutiladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Oy fazalari va tutilishlar (Mamadazimov M., Astronomiya 11-sinf): Quyosh tutilishi — yangi oyda Oy Quyoshni to'sganda. Oy tutilishi — to'lin oyda Oy Yer soyasiga kirganda. Oy o'z o'qi va Yer atrofida bir xil davrda (27.3 sutka) aylangani uchun bizga doim bir tomoni ko'rinadi.`,
      mnemonic: "Oy sirlari: Oy o'rtaga tushsa Quyosh tutilur, Yer o'rtada tursa Oy tutilur; bir tomonini ko'rsatib doim jim aylanur.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 4. Kepler qonunlari
  (qId, idx, target) => {
    const list = [
      { qonun: "Keplerning 1-qonuniga binoan", mazmun: "barcha sayyoralar Quyosh atrofida fokuslaridan birida Quyosh joylashgan ellipslar bo'ylab harakatlanadi" },
      { qonun: "Keplerning 2-qonuniga (yuzalar qonuniga) binoan", mazmun: "sayyoraning radius-vektori teng vaqtlar ichida teng yuzalarni chizib perigeliyda tezroq, afeliyda sekinroq harakatlanadi" },
      { qonun: "Keplerning 3-qonuniga binoan", mazmun: "sayyoralarning aylanish davrlari kvadratlari orbitalari katta yarim o'qlari kublariga proporsionaldir (T₁²/T₂² = a₁³/a₂³)" },
      { qonun: "sayyora Quyoshga eng yaqin kelgan nuqtasi (perigeliy)da harakatlanganda", mazmun: "uning orbital harakat tezligi maksimal qiymatga erishadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Osmon mexanikasi asoschilari I.Kepler qonunlari va sayyoralar harakati qonuniyatlariga asosan, ${itm.qonun} qaysi fundamental qoida tasdiqlanadi? (#${qId})`;
    const correct = `Kepler ta'limotiga binoan, ${itm.mazmun}`;
    const distractors = [
      `Kepler ta'limotiga binoan, barcha sayyoralar Quyosh atrofida to'g'ri burchakli uchburchak va kvadratik orbitalar bo'ylab harakatlanadi`,
      `Kepler ta'limotiga binoan, barcha sayyoralar bir xil doimiy chiziqli tezlik bilan harakatlanib Quyoshga yaqinlashganda ham tezlashmaydi`,
      `Kepler ta'limotiga binoan, sayyoralarning Quyosh atrofida aylanish davrlari ularning radiuslariga teskari proporsional holda taqsimlanadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Kepler qonunlari (Mamadazimov M., Astronomiya 11-sinf): 1-qonun: orbita ellips, Quyosh bir fokusda. 2-qonun: yuzalar tezligi o'zgarmas (perigeliyda v_max, afeliyda v_min). 3-qonun: T_1²/T_2² = a_1³/a_2³. Nyuton buni butun olam tortishish qonunidan keltirib chiqargan.`,
      mnemonic: "Kepler qonunlari: Birinchisi ellips der, ikkinchisi yuzalar teng der, uchinchisi davr kvadrati masofa kubiga teng der.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 5. Quyoshning ichki tuzilishi va energiyasi
  (qId, idx, target) => {
    const list = [
      { qatlam: "Quyoshning markaziy yadrosi (harorati ≈ 15 million Kelvin)", vazifa: "vodorod yadrolarining geliyga aylanishi bo'yicha termoyadro sintez reaksiyalari boradigan va Quyosh energiyasi tug'iladigan hududdir" },
      { qatlam: "fotosfera qatlami (harorati ≈ 6000 K)", vazifa: "biz ko'radigan Quyoshning yorqin nurlanuvchi sirti bo'lib unda quyosh dog'lari va mash'allari paydo bo'ladi" },
      { qatlam: "Quyosh toji (tashqi atmosferasi)", vazifa: "to'la Quyosh tutilishi paytida kumushrang nurlanuvchi toj ko'rinishida namoyon bo'ladigan o'ta qizigan plazmadir" },
      { qatlam: "quyosh faolligining asosiy sikli", vazifa: "taxminan 11 yillik davriy takrorlanishga ega bo'lib Yer magnitosferasida magnit bo'ronlarini keltirib chiqaradi" }
    ];
    const itm = list[idx % list.length];
    const q = `Quyosh fizikasi va uning tuzilishi tadqiq etilganda, agar ${itm.qatlam} ko'rib chiqilsa, u qanday muhim fizik vazifani bajaradi? (#${qId})`;
    const correct = `Astrofizika ma'lumotlariga ko'ra, u ${itm.vazifa}`;
    const distractors = [
      `Astrofizika ma'lumotlariga ko'ra, u Quyoshning muzlab qolgan tashqi po'stlog'i bo'lib kosmik changlarni yutish va sovitish vazifasini bajaradi`,
      `Astrofizika ma'lumotlariga ko'ra, u og'ir metallarni qazib olish uchun foydalaniladigan qattiq mineral jinslar to'plangan ichki qatlamidir`,
      `Astrofizika ma'lumotlariga ko'ra, u faqat kometalar dumidan hosil bo'ladigan sun'iy gaz bulutining nurlanishini o'zida saqlovchi bo'shliqdir`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Quyosh fizikasi (Mamadazimov M., Astronomiya 11-sinf): energiya manbai — markaziy yadroda vodorodning geliyga aylanishi (termoyadro reaksiyasi: 4p -> ⁴He + 2e⁺ + 2ν + 26.7 MeV). Fotosfera — sirt (6000 K). Quyosh faolligi 11 yillik siklga ega.`,
      mnemonic: "Quyosh yuragi: Markazda termoyadro yonar tinmay, fotosfera nurlatadi olamni erinmay.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 6. Yulduzlar spektri va evolyutsiyasi
  (qId, idx, target) => {
    const list = [
      { yulduz: "bizning Quyosh yulduzining spektral sinfi va turi", tarif: "sariq mitti yulduz bo'lib G spektral sinfiga va fotosfera harorati taxminan 6000 K ga mansubdir" },
      { yulduz: "massasi Quyosh massasiga yaqin yulduzlarning umri oxiridagi evolyutsion yakuni", tarif: "qizil gigant bosqichidan o'tib tashqi qobiqni tashlagach oq mitti yulduzga aylanadi" },
      { yulduz: "massasi juda katta (Quyoshdan 10-20 marta katta) yulduzlarning yakuni", tarif: "o'ta yangi yulduz chaqnashi orqali portlab neytron yulduz yoki qora tuynuk hosil qiladi" },
      { yulduz: "yulduzlarning spektral ketma-ketligi (Gershprung-Rassel)", tarif: "O, B, A, F, G, K, M tartibida haroratning kamayishi bo'yicha ko'kdan qizilgacha joylashadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Yulduzlar astrofizikasi va Gershprung-Rassel diagrammasi asosida yulduzlar evolyutsiyasi tahlil qilinganda, agar ${itm.yulduz} o'rganilsa, qanday ilmiy ta'rif to'g'ri bo'ladi? (#${qId})`;
    const correct = `Yulduzlar evolyutsiyasi nazariyasiga ko'ra, ${itm.tarif}`;
    const distractors = [
      `Yulduzlar evolyutsiyasi nazariyasiga ko'ra, barcha yulduzlar million yildan keyin o'z-o'zidan sovuq toshli sayyoraga aylanib sovib qoladi`,
      `Yulduzlar evolyutsiyasi nazariyasiga ko'ra, yulduzlarning harorati va nurlanish spektri faqat ularning yerdan uzoqligiga qarab o'zgaradi`,
      `Yulduzlar evolyutsiyasi nazariyasiga ko'ra, yulduzlar o'z energiyasini faqat tashqi fazodagi qora materiya nurlarini yutish orqali to'playdi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yulduzlar evolyutsiyasi (Mamadazimov M., Astronomiya 11-sinf): yulduzlar gaz-chang tumanliklaridan tug'iladi. Yulduz massasiga qarab evolyutsiya yo'li belgilanadi: o'rtacha yulduzlar -> oq mitti; massiv yulduzlar -> o'ta yangi portlashi -> neytron yulduz (pulsar) yoki qora tuynuk.`,
      mnemonic: "Yulduzlar spektri: O, B, A, F, G, K, M — eng qaynoq ko'kdan boshlab, qizil sovuqqa qadar saflangan jam.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 7. Galaktikamiz va Koinotning kengayishi
  (qId, idx, target) => {
    const list = [
      { mavzu: "biz yashayotgan Somon yo'li galaktikasi shakli va tuzilishi", xulosa: "markazida qora tuynuk mavjud bo'lgan, diametri 100 ming yorug'lik yili atrofidagi spiral galaktikadir" },
      { mavzu: "E.Xabbl tomonidan kashf etilgan uzoq galaktikalar harakati qonuni (v = H*r)", xulosa: "galaktikalar bizdan qancha uzoqda bo'lsa, ularning uzoqlashish tezligi shuncha katta bo'lib Koinot kengayayotganini bildiradi" },
      { mavzu: "uzoq galaktikalar spektrlarida spektral chiziqlarning qizil tomonga siljishi (Doppler effekti)", xulosa: "galaktikalarning bizdan uzoqlashayotganligini va fazo fazoviy kengayishda ekanligini to'liq isbotlaydi" },
      { mavzu: "zamonaviy kosmologiyaning 'Katta portlash' (Big Bang) modeli", xulosa: "Koinot bundan taxminan 13.8 milliard yil avval o'ta zich va qaynoq singular holatdan kengaya boshlaganini tasdiqlaydi" }
    ];
    const itm = list[idx % list.length];
    const q = `Zamonaviy kosmologiya va galaktikalar astronomiyasi ma'lumotlariga asosan, agar ${itm.mavzu} tahlil etilsa, qanday muhim ilmiy xulosa kelib chiqadi? (#${qId})`;
    const correct = `Kosmologik qonuniyatlarga ko'ra, u ${itm.xulosa}`;
    const distractors = [
      `Kosmologik qonuniyatlarga ko'ra, u butun Koinotning o'lchamlari doimo qisqarib yagona markaziy nuqtaga qarab tortilib borayotganini ko'rsatadi`,
      `Kosmologik qonuniyatlarga ko'ra, u barcha galaktikalar Somon yo'li atrofida qat'iy doiraviy trayektoriya bo'ylab o'zgarmas tezlikda aylanadi`,
      `Kosmologik qonuniyatlarga ko'ra, u koinotda yulduzlar va galaktikalar orasidagi fazoviy masofa hech qachon o'zgarmasligini qat'iy isbotlaydi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Kengayuvchi Koinot (Mamadazimov M., Astronomiya 11-sinf): Xabbl qonuni v = H * r (H ≈ 70 km/(s*Mpk)). Galaktikalar spektridagi qizilga siljish Koinotning kengayishini isbotlaydi. Koinotning yoshi taxminan 13.8 mlrd yil.`,
      mnemonic: "Xabbl qonuni: Qizilga siljisa spektr — galaktika qochadi, Koinot kengayib borar, har soniya yangi sir ochadi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  }
];

// Generate exactly 104 questions (IDs 1717–1820, topicId 183)
createQuestionBankFizika('07_astronomiya.json', 183, 1717, 104, templates);
