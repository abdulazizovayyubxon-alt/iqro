import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. Garmonik tebranish tenglamasi
  (qId, idx, target) => {
    const list = [
      { A: 0.1, omega: 5, T: 1.26, nu: 0.8 },
      { A: 0.2, omega: 10, T: 0.63, nu: 1.59 },
      { A: 0.05, omega: 2, T: 3.14, nu: 0.32 },
      { A: 0.15, omega: 4, T: 1.57, nu: 0.64 }
    ];
    const itm = list[idx % list.length];
    const q = `Jismning to'g'ri chiziqli garmonik tebranish harakati x(t) = ${itm.A}*cos(${itm.omega}*t) (m) qonuniyat bo'yicha yuz bermoqda. Ushbu tebranma harakatning amplitudasi (A) va siklik chastotasi (ω) qanday qiymatga ega? (#${qId})`;
    const correct = `Tebranish amplitudasi A = ${itm.A} m ga, siklik chastotasi esa ω = ${itm.omega} rad/s ga teng bo'ladi`;
    const distractors = [
      `Tebranish amplitudasi A = ${itm.A * 2} m ga, siklik chastotasi esa ω = ${itm.omega + 3} rad/s ga teng bo'ladi`,
      `Tebranish amplitudasi A = ${itm.A} m ga, siklik chastotasi esa ω = ${(itm.omega / 2).toFixed(1)} rad/s ga teng bo'ladi`,
      `Tebranish amplitudasi A = ${(itm.A / 2).toFixed(3)} m ga, siklik chastotasi esa ω = ${itm.omega * 2} rad/s ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Garmonik tebranish tenglamasi (Turdiyev N.Sh., Fizika 11-sinf): x(t) = A*cos(ωt + φ_0). Kosinus oldidagi ko'paytuvchi amplituda A = ${itm.A} m, t oldidagi koeffitsiyent esa siklik chastota ω = ${itm.omega} rad/s dir. Davr T = 2π/ω.`,
      mnemonic: "Garmonik tebranish: Kosinus oldi amplituda, t yonidagi koeffitsiyent siklik chastotadir har damda.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 2. Matematik mayatnik davri
  (qId, idx, target) => {
    const list = [
      { text: "mayatnik ipining uzunligi l to'rt barobarga oshirilsa", res: "tebranish davri T kvadrat ildiz ostida aynan 2 marta ortadi" },
      { text: "mayatnik yerdan Oygacha olib chiqilsa (g_Oy = g_Yer / 6)", res: "erkin tushish tezlanishi kamaygani uchun davr √6 marta ortadi" },
      { text: "mayatnik yukining massasi m 3 marta orttirilsa", res: "davr massaga bog'liq bo'lmagani uchun mutlaqo o'zgarmas qoladi" },
      { text: "mayatnik ipining uzunligi 9 marta qisqartirilsa", res: "tebranish davri T to'g'ri hisob-kitobda 3 marta kamayadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Matematik mayatnikning tebranish davri formulasiga (T = 2π*√(l/g)) ko'ra, agar ${itm.text}, mayatnikning tebranish davri qanday o'zgaradi? (#${qId})`;
    const correct = `Mayatnik qonuniyatiga ko'ra, ${itm.res}`;
    const distractors = [
      `Mayatnik qonuniyatiga ko'ra, tebranish davri ko'rsatilgan miqdorga to'g'ridan-to'g'ri chiziqli proporsional ravishda o'zgaradi`,
      `Mayatnik qonuniyatiga ko'ra, tebranish davri tebranish burchagi amplitudasiga qarab ixtiyoriy tarzda yo'qoladi`,
      `Mayatnik qonuniyatiga ko'ra, mayatnik darhol to'xtab faqat kinetik energiyasi hisobiga harakatini davom ettiradi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Matematik mayatnik (Turdiyev N.Sh., Fizika 11-sinf): T = 2π*√(l/g). Davr ip uzunligi kvadrat ildiziga to'g'ri, g ning kvadrat ildiziga teskari proporsional. Mayatnik davri yuk massasiga va tebranish amplitudasiga (kichik burchaklarda) bog'liq emas.`,
      mnemonic: "Matematik mayatnik: Ipi cho'zilsa davr o'sar, yuk massasi esa tebranish davriga mutlaq ta'sir qilmas.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 3. Prujinali mayatnik davri
  (qId, idx, target) => {
    const list = [
      { text: "yuk massasi m 4 marta orttirilib, prujina bikrligi o'zgarmasa", res: "tebranish davri T kvadrat ildiz hisobiga 2 marta ortadi" },
      { text: "prujina bikrligi k 4 marta oshirilib, massa o'zgarmas saqlansa", res: "tebranish davri T teskari proporsional holda 2 marta kamayadi" },
      { text: "yuk massasi ham, prujina bikrligi ham baravar 2 marta oshirilsa", res: "nisbat o'zgarmagani sababli tebranish davri doimiy saqlanadi" },
      { text: "prujinali mayatnik Yer sirtidan tortishishsiz kosmik fazoga olib chiqilsa", res: "davr og'irlik kuchiga bog'liq bo'lmagani uchun o'zgarmas qolaveradi" }
    ];
    const itm = list[idx % list.length];
    const q = `Prujinali mayatnikning garmonik tebranish davri formulasiga (T = 2π*√(m/k)) muvofiq, agar ${itm.text}, tebranish davri qanday qiymat oladi? (#${qId})`;
    const correct = `Prujina tebranish qonuniga binoan, ${itm.res}`;
    const distractors = [
      `Prujina tebranish qonuniga binoan, tebranish davri kvadratik tarzda to'rt barobarga oshib ketadi`,
      `Prujina tebranish qonuniga binoan, tebranish davri faqat tebranish amplitudasining kattaligiga qarab belgilanadi`,
      `Prujina tebranish qonuniga binoan, mayatnik prujinasi darhol elastikligini yo'qotib tebranmasdan qotib qoladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Prujinali mayatnik (Turdiyev N.Sh., Fizika 11-sinf): T = 2π*√(m/k). Tebranish davri yuk massasining kvadrat ildiziga to'g'ri, prujina bikrligining kvadrat ildiziga teskari proporsional. Gravitatsiya maydoniga (g ga) bog'liq emas.`,
      mnemonic: "Prujinali mayatnik: m bo'lingan k ildiz ostida — massa ortsa sekinlashar, qattiq prujina tez tebratar.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 4. Tebranish energiyasi
  (qId, idx, target) => {
    const list = [
      { text: "muvozanat vaziyatidan o'tayotgan paytda (x = 0)", res: "potensial energiya nolga teng, kinetik energiya esa maksimal qiymatga yetadi" },
      { text: "maksimal chetlanish (amplituda) nuqtasida (x = A)", res: "tezlik nol bo'lgani uchun kinetik energiya nol, potensial energiya maksimal bo'ladi" },
      { text: "tebranish amplitudasi A ikki marta orttirilsa", res: "to'liq mexanik energiya E = kA²/2 formulaga binoan 4 marta ortadi" },
      { text: "siljish x = A / √2 bo'lgan vaqt momentida", res: "kinetik energiya bilan potensial energiya o'zaro tenglashadi (E_k = E_p)" }
    ];
    const itm = list[idx % list.length];
    const q = `Garmonik tebranayotgan mexanik tizimda energiya saqlanishi va aylanishi jarayonida, agar ${itm.text}, energiyaning holati qanday bo'ladi? (#${qId})`;
    const correct = `Energiyaning saqlanish qonuniga ko'ra, ${itm.res}`;
    const distractors = [
      `Energiyaning saqlanish qonuniga ko'ra, har doim butun mexanik energiya ichki issiqlik energiyasiga aylanadi`,
      `Energiyaning saqlanish qonuniga ko'ra, umumiy energiya vaqt o'tishi bilan o'z-o'zidan nolga tushib qoladi`,
      `Energiyaning saqlanish qonuniga ko'ra, potensial energiya har qanday nuqtada doimiy kinetikdan ustun turadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Tebranish energiyasi (Chernoutsan A.I., Fizikadan masalalar to'plami): to'liq mexanik energiya E = E_k + E_p = m*v²/2 + k*x²/2 = k*A²/2 = const. Muvozanatda v = v_max, x = 0 (E_k = max, E_p = 0); amplituda nuqtasida v = 0, x = A (E_k = 0, E_p = max).`,
      mnemonic: "Tebranish energiyasi: O'rtada kinetik toshadi, chekkada potensial oshadi; yig'indisi esa o'zgarmas yashaydi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 5. Rezonans hodisasi
  (qId, idx, target) => {
    const list = [
      { text: "tashqi davriy kuch chastotasi tizimning xususiy tebranish chastotasiga tenglashganda", res: "majburiy tebranishlar amplitudasi keskin ravishda ortib ketadi" },
      { text: "ko'prikdan harbiy qism qadam tashlab saf bilan o'tayotganda", res: "qadamlar chastotasi ko'prik chastotasiga to'g'ri kelib xavfli rezonans tug'dirishi mumkin" },
      { text: "akustik rezonatorda tovush to'lqini havo ustuni xususiy chastotasiga mos tushganda", res: "tovushning intensivligi va qattiqligi favqulodda kuchayishi kuzatiladi" },
      { text: "avtomobil g'ildiraklarining aylanish chastotasi kuzovning xususiy chastotasi bilan ustma-ust tushganda", res: "mashina korpusida kuchli tebranish va larzaga kelish hosil bo'ladi" }
    ];
    const itm = list[idx % list.length];
    const q = `Fizikada majburiy tebranishlar va rezonans hodisasi shartiga asosan, agar ${itm.text}, qanday asosiy natija yuzaga keladi? (#${qId})`;
    const correct = `Rezonans qoidasiga muvofiq, ${itm.res}`;
    const distractors = [
      `Rezonans qoidasiga muvofiq, tebranishlar darhol so'nib tebranish davri butunlay to'xtaydi`,
      `Rezonans qoidasiga muvofiq, tizimning chastotasi bir lahzada cheksizlikka qarab ortib ketadi`,
      `Rezonans qoidasiga muvofiq, to'lqinning tezligi ikki barobarga kamayib muhit o'zgaradi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Rezonans (Turdiyev N.Sh., Fizika 11-sinf): majburiy tebranishlar amplitudasi tashqi kuch chastotasi tizimning xususiy chastotasiga yaqinlashganda (ν_tashqi ≈ ν_0) keskin ortadi. Amplitudaning maksimal qiymati muhitdagi ishqalanish va qarshilikka bog'liq.`,
      mnemonic: "Rezonans: Ikki chastota topishsa bir-birin, amplituda sakrar cho'qqiga ochib kuch sirlarin.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 6. To'lqin uzunligi va tezligi
  (qId, idx, target) => {
    const list = [
      { v: 340, nu: 170, lambda: 2 },
      { v: 1480, nu: 740, lambda: 2 },
      { v: 5000, nu: 1000, lambda: 5 },
      { v: 340, nu: 680, lambda: 0.5 }
    ];
    const itm = list[idx % list.length];
    const q = `Muhitda tarqalayotgan elastik to'lqinning tarqalish tezligi v = ${itm.v} m/s va tebranish chastotasi ν = ${itm.nu} Hz ga teng. Ushbu to'lqinning fazoviy to'lqin uzunligi (λ) qanchaga teng bo'ladi? (#${qId})`;
    const correct = `To'lqin uzunligi λ = ${itm.lambda} m ga teng bo'ladi`;
    const distractors = [
      `To'lqin uzunligi λ = ${(itm.lambda * 2).toFixed(1)} m ga teng bo'ladi`,
      `To'lqin uzunligi λ = ${(itm.lambda / 2).toFixed(2)} m ga teng bo'ladi`,
      `To'lqin uzunligi λ = ${(itm.lambda + 1.5).toFixed(1)} m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `To'lqin kinemetikasi (Turdiyev N.Sh., Fizika 11-sinf): to'lqin tezligi v = λ * ν = λ / T. Bundan to'lqin uzunligi λ = v / ν = ${itm.v} / ${itm.nu} = ${itm.lambda} m. Bir muhitdan ikkinchisiga o'tganda chastota o'zgarmaydi, tezlik va to'lqin uzunligi o'zgaradi.`,
      mnemonic: "To'lqin formulasi: Tezlik bu lambda ko'paytir chastota — muhit almashganda chastota qolar mustahkam o'z joyida.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 7. Tovushning balandligi, qattiqligi va tembri
  (qId, idx, target) => {
    const list = [
      { xus: "tovush to'lqinining tebranish chastotasi (ν)", natija: "tovushning musiqiy balandligi (ton) belgilanadi" },
      { xus: "tovush to'lqinining tebranish amplitudasi (A)", natija: "tovushning eshitilish qattiqligi (baland/pastligi) belgilanadi" },
      { xus: "tovushning qo'shimcha garmonikalari (obertonlar to'plami)", natija: "turli cholg'ularni ajratuvchi tovushning o'ziga xos tembri hosil bo'ladi" },
      { xus: "havo haroratining ko'tarilishi", natija: "havodagi tovush to'lqinining tarqalish tezligi ortadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Akustika fanida tovush to'lqinlarining fizik va fiziologik xususiyatlari o'rtasidagi bog'liqlikka ko'ra, ${itm.xus} orqali qanday xususiyat belgilanadi? (#${qId})`;
    const correct = `Akustika qoidasiga muvofiq, u orqali ${itm.natija}`;
    const distractors = [
      `Akustika qoidasiga muvofiq, u orqali tovushning faqat tarqalish yo'nalishidagi qutblanish tekisligi belgilanadi`,
      `Akustika qoidasiga muvofiq, u orqali tovushning vakuumda tarqalish qobiliyati vujudga keladi`,
      `Akustika qoidasiga muvofiq, u orqali barcha molekulalarning massalari ko'payishi yuzaga chiqadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Akustika asoslari (Turdiyev N.Sh., Fizika 11-sinf): chastota tovush balandligini, amplituda qattiqligini, garmonik tarkib (obertonlar) esa tembrni belgilaydi. Tovush bo'ylama to'lqin bo'lib, vakuumda tarqalmaydi.`,
      mnemonic: "Akustika uchligi: Chastota balandlikni, amplituda qattiqlikni, obertonlar esa sehrli tembrni berur.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 8. Tomson formulasi (tebranish konturi)
  (qId, idx, target) => {
    const list = [
      { text: "g'altak induktivligi L 4 marta orttirilib, kondensator sig'imi C o'zgarmasa", res: "konturning erkin tebranish davri T aynan 2 marta ortadi" },
      { text: "kondensator sig'imi C 9 marta kamaytirilsa", res: "konturning erkin tebranish davri T to'g'ri hisobda 3 marta kamayadi" },
      { text: "induktivlik 2 marta, sig'im ham 2 marta oshirilsa", res: "konturning erkin tebranish davri T kvadrat ildiz hisobiga 2 marta ortadi" },
      { text: "tebranish konturining tebranish chastotasini 2 marta oshirish uchun", res: "LC ko'paytmasini 4 marta kamaytirish talab etiladi" }
    ];
    const itm = list[idx % list.length];
    const q = `Elektromagnit tebranishlar yuz beruvchi ideal yopiq tebranish konturida Tomson formulasiga (T = 2π*√(L*C)) ko'ra, agar ${itm.text}, tebranish parametrlari qanday o'zgaradi? (#${qId})`;
    const correct = `Tomson qonuniyatiga muvofiq, ${itm.res}`;
    const distractors = [
      `Tomson qonuniyatiga muvofiq, tebranish davri ko'rsatilgan miqdorga to'g'ridan-to'g'ri chiziqli proporsional o'zgaradi`,
      `Tomson qonuniyatiga muvofiq, konturda tebranishlar bir zumda to'xtab faqat doimiy tok oqib qoladi`,
      `Tomson qonuniyatiga muvofiq, induktivlik va sig'im parametrlarining davrga mutlaqo aloqasi yo'qdir`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Tomson formulasi (Turdiyev N.Sh., Fizika 11-sinf): T = 2π*√(L*C), chastota ν = 1 / (2π*√(LC)). Erkin elektromagnit tebranishlar davri induktivlik va sig'im ko'paytmasining kvadrat ildiziga to'g'ri proporsionaldir.`,
      mnemonic: "Tomson formulasi: 2 pi ildiz LC — elektromagnit tebranish davrini bilar har bir fizikchi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 9. O'zgaruvchan tok va transformator
  (qId, idx, target) => {
    const list = [
      { U1: 220, N1: 1100, N2: 50, U2: 10 },
      { U1: 220, N1: 880, N2: 80, U2: 20 },
      { U1: 220, N1: 440, N2: 24, U2: 12 },
      { U1: 10000, N1: 5000, N2: 110, U2: 220 }
    ];
    const itm = list[idx % list.length];
    const q = `Pasaytiruvchi transformatorning birlamchi cho'lg'ami N_1 = ${itm.N1} ta o'ramdan, ikkilamchi cho'lg'ami esa N_2 = ${itm.N2} ta o'ramdan iborat. Birlamchi cho'lg'amga U_1 = ${itm.U1} V o'zgaruvchan kuchlanish berilganda, ikkilamchi cho'lg'am chiqishidagi U_2 kuchlanish qanchaga teng bo'ladi? (#${qId})`;
    const correct = `Ikkilamchi cho'lg'am chiqishidagi kuchlanish U_2 = ${itm.U2} V ga teng bo'ladi`;
    const distractors = [
      `Ikkilamchi cho'lg'am chiqishidagi kuchlanish U_2 = ${itm.U2 * 2} V ga teng bo'ladi`,
      `Ikkilamchi cho'lg'am chiqishidagi kuchlanish U_2 = ${(itm.U2 / 2).toFixed(1)} V ga teng bo'ladi`,
      `Ikkilamchi cho'lg'am chiqishidagi kuchlanish U_2 = ${itm.U2 + 15} V ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Transformator formulasi (Turdiyev N.Sh., Fizika 11-sinf): U_1 / U_2 = N_1 / N_2 = k. Bundan U_2 = U_1 * (N_2 / N_1) = ${itm.U1} * (${itm.N2} / ${itm.N1}) = ${itm.U2} V. Transformator faqat o'zgaruvchan tokda ishlaydi, chastotani o'zgartirmaydi.`,
      mnemonic: "Transformator: O'ramlar nisbati kuchlanish nisbatiga teng, o'zgarmas tokda esa transformator jimgina kutar keng.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 10. Aks-sado va exolokatsiya
  (qId, idx, target) => {
    const list = [
      { v: 340, t: 2, s: 340 },
      { v: 340, t: 4, s: 680 },
      { v: 1500, t: 2, s: 1500 },
      { v: 1500, t: 0.4, s: 300 }
    ];
    const itm = list[idx % list.length];
    const q = `Qoya (yoki dengiz tubi) tomon chiqarilgan tovush signali to'siqdan qaytib, t = ${itm.t} s dan so'ng yana qayd qilindi. Tovushning ushbu muhitdagi tarqalish tezligi v = ${itm.v} m/s bo'lsa, to'siqqacha bo'lgan masofa (s) qancha? (#${qId})`;
    const correct = `To'siqqacha bo'lgan masofa s = ${itm.s} m ga teng bo'ladi`;
    const distractors = [
      `To'siqqacha bo'lgan masofa s = ${itm.s * 2} m ga teng bo'ladi`,
      `To'siqqacha bo'lgan masofa s = ${itm.s / 2} m ga teng bo'ladi`,
      `To'siqqacha bo'lgan masofa s = ${itm.s + 120} m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Exolokatsiya va aks-sado (Turdiyev N.Sh., Fizika 11-sinf): tovush to'siqqacha borib va qaytib 2s masofani bosib o'tadi: 2s = v * t => s = (v * t) / 2 = (${itm.v} * ${itm.t}) / 2 = ${itm.s} m.`,
      mnemonic: "Exolokatsiya: Tovush borib qaytar, masofani topish uchun v*t ni ikkiga bo'lish kifoyadir.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  }
];

// Generate exactly 260 questions (IDs 989–1248, topicId 180)
createQuestionBankFizika('04_tebranish_va_tolqinlar.json', 180, 989, 260, templates);
