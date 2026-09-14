import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. Tekis tezlanuvchan harakatda tezlik va yo'l
  (qId, idx, target) => {
    const list = [
      { v0: 10, a: 2, t: 4, s: 56, v: 18 },
      { v0: 5, a: 3, t: 6, s: 84, v: 23 },
      { v0: 12, a: 4, t: 5, s: 110, v: 32 },
      { v0: 8, a: 2.5, t: 4, s: 52, v: 18 },
      { v0: 15, a: 2, t: 5, s: 100, v: 25 },
      { v0: 6, a: 4, t: 3, s: 36, v: 18 }
    ];
    const itm = list[idx % list.length];
    const q = `To'g'ri chiziqli tekis tezlanuvchan harakat qilayotgan jismning boshlang'ich tezligi v_0 = ${itm.v0} m/s va tezlanishi a = ${itm.a} m/s² ga teng. Harakat boshlangandan t = ${itm.t} s o'tgach, jismning erishgan oxirgi tezligi (v) va bosib o'tgan masofasi (s) qanday qiymatga ega bo'ladi? (#${qId})`;
    const correct = `Oxirgi tezlik ${itm.v} m/s ga, jism bosib o'tgan masofa esa ${itm.s} m ga teng bo'ladi`;
    const distractors = [
      `Oxirgi tezlik ${itm.v + 4} m/s ga, jism bosib o'tgan masofa esa ${itm.s - 12} m ga teng bo'ladi`,
      `Oxirgi tezlik ${itm.v - 3} m/s ga, jism bosib o'tgan masofa esa ${itm.s + 16} m ga teng bo'ladi`,
      `Oxirgi tezlik ${itm.v + 6} m/s ga, jism bosib o'tgan masofa esa ${itm.s + 20} m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Tekis tezlanuvchan harakat kinematikasi (Tursunmetov K.A., Fizika 10-sinf): oxirgi tezlik v = v_0 + a*t = ${itm.v0} + ${itm.a}*${itm.t} = ${itm.v} m/s. Bosib o'tilgan yo'l s = v_0*t + a*t²/2 = ${itm.v0}*${itm.t} + (${itm.a}*${itm.t*itm.t})/2 = ${itm.s} m.`,
      mnemonic: "Tezlanuvchan harakat: Tezlik o'sar har soniyada a marta, yo'l esa kvadratik ko'payar vaqt bilan qatorda.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 2. Tormozlanish yo'li va vaqti
  (qId, idx, target) => {
    const list = [
      { v0: 20, mu: 0.2, g: 10, t: 10, s: 100 },
      { v0: 30, mu: 0.5, g: 10, t: 6, s: 90 },
      { v0: 15, mu: 0.3, g: 10, t: 5, s: 37.5 },
      { v0: 25, mu: 0.25, g: 10, t: 10, s: 125 }
    ];
    const itm = list[idx % list.length];
    const q = `Gorizontal tekis asfalt yo'lda v_0 = ${itm.v0} m/s tezlikda ketayotgan avtomobil to'liq tormoz berdi. G'ildirak va yo'l orasidagi sirpanish ishqalanish koeffitsiyenti μ = ${itm.mu} va g = ${itm.g} m/s² bo'lsa, to'liq to'xtashgacha ketgan vaqt (t) va tormoz yo'li (s) qancha bo'ladi? (#${qId})`;
    const correct = `To'xtash vaqti ${itm.t} s ga, to'liq tormoz yo'li esa ${itm.s} m ga teng bo'ladi`;
    const distractors = [
      `To'xtash vaqti ${itm.t + 2} s ga, to'liq tormoz yo'li esa ${itm.s - 15} m ga teng bo'ladi`,
      `To'xtash vaqti ${itm.t - 2} s ga, to'liq tormoz yo'li esa ${itm.s + 25} m ga teng bo'ladi`,
      `To'xtash vaqti ${itm.t + 4} s ga, to'liq tormoz yo'li esa ${itm.s + 35} m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Tormozlanish dinamikasi (Turdiyev N.Sh., Fizika 10-sinf): tormoz tezlanishi a = μ*g = ${itm.mu}*${itm.g} = ${itm.mu*itm.g} m/s². To'xtash vaqti t = v_0 / a = ${itm.v0} / ${itm.mu*itm.g} = ${itm.t} s. Tormoz yo'li s = v_0² / (2a) = ${itm.v0*itm.v0} / (2*${itm.mu*itm.g}) = ${itm.s} m.`,
      mnemonic: "Tormoz qonuni: Tezlik kvadratik yo'lni belgilaydi, ishqalanish tezlanishi vaqtni qisqartiradi.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 3. Vertikal yuqoriga uloqtirilgan jism
  (qId, idx, target) => {
    const list = [
      { v0: 20, g: 10, h: 20, t: 4 },
      { v0: 30, g: 10, h: 45, t: 6 },
      { v0: 40, g: 10, h: 80, t: 8 },
      { v0: 50, g: 10, h: 125, t: 10 }
    ];
    const itm = list[idx % list.length];
    const q = `Yer sirtidan vertikal yuqoriga v_0 = ${itm.v0} m/s boshlang'ich tezlik bilan jism uloqtirildi. Havoning qarshilik kuchi hisobga olinmasa (g = 10 m/s²), jismning maksimal ko'tarilish balandligi (h_max) va uning yana yerga qaytib tushishidagi umumiy parvoz vaqti (t_parvoz) qanday bo'ladi? (#${qId})`;
    const correct = `Maksimal balandlik ${itm.h} m ga, umumiy parvoz vaqti esa ${itm.t} s ga teng bo'ladi`;
    const distractors = [
      `Maksimal balandlik ${itm.h + 15} m ga, umumiy parvoz vaqti esa ${itm.t - 1} s ga teng bo'ladi`,
      `Maksimal balandlik ${itm.h - 10} m ga, umumiy parvoz vaqti esa ${itm.t + 2} s ga teng bo'ladi`,
      `Maksimal balandlik ${itm.h + 25} m ga, umumiy parvoz vaqti esa ${itm.t + 3} s ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Erkin tushish va ko'tarilish kinematikasi (Chernoutsan A.I., Fizikadan masalalar to'plami): ko'tarilish vaqti t_k = v_0 / g = ${itm.v0}/10 = ${itm.t/2} s, umumiy parvoz vaqti t = 2*t_k = ${itm.t} s. Maksimal ko'tarilish balandligi h_max = v_0² / (2g) = ${itm.v0*itm.v0} / 20 = ${itm.h} m.`,
      mnemonic: "Vertikal parvoz: Chiqqan vaqti tushganiga teng, eng cho'qqida tezlik nol bo'lib qolar behad keng.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 4. Gorizontal otilgan jism
  (qId, idx, target) => {
    const list = [
      { h: 20, v0: 15, g: 10, t: 2, L: 30 },
      { h: 45, v0: 20, g: 10, t: 3, L: 60 },
      { h: 80, v0: 25, g: 10, t: 4, L: 100 },
      { h: 20, v0: 10, g: 10, t: 2, L: 20 }
    ];
    const itm = list[idx % list.length];
    const q = `Balandligi h = ${itm.h} m bo'lgan minoradan jism gorizontal yo'nalishda v_0 = ${itm.v0} m/s tezlik bilan otildi. Havo qarshiligi inobatga olinmaganda (g = 10 m/s²), jismning tushish vaqti (t) va minoraning poydevoridan tushgan nuqtagacha bo'lgan gorizontal masofa (uchish uzoqligi L) qanday bo'ladi? (#${qId})`;
    const correct = `Tushish vaqti ${itm.t} s ga, gorizontal uchish uzoqligi esa ${itm.L} m ga teng bo'ladi`;
    const distractors = [
      `Tushish vaqti ${itm.t + 1} s ga, gorizontal uchish uzoqligi esa ${itm.L - 10} m ga teng bo'ladi`,
      `Tushish vaqti ${itm.t - 0.5} s ga, gorizontal uchish uzoqligi esa ${itm.L + 15} m ga teng bo'ladi`,
      `Tushish vaqti ${itm.t + 1.5} s ga, gorizontal uchish uzoqligi esa ${itm.L + 25} m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Gorizontal otilgan jism harakati (Tursunmetov K.A., Fizika 10-sinf): vertikal yo'nalishda tushish vaqti t = √(2h/g) = √(2*${itm.h}/10) = ${itm.t} s. Gorizontal yo'nalishda tezlik o'zgarmaydi, uchish uzoqligi L = v_0*t = ${itm.v0}*${itm.t} = ${itm.L} m.`,
      mnemonic: "Gorizontal uloqtirish: Pastga erkin tushar, yonga tekis uchar — ikki harakat birgalikda parabolani quchar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 5. Aylanma harakatda tezlanish va burchak tezligi
  (qId, idx, target) => {
    const list = [
      { R: 0.5, v: 2, omega: 4, an: 8 },
      { R: 0.2, v: 4, omega: 20, an: 80 },
      { R: 1.0, v: 5, omega: 5, an: 25 },
      { R: 2.0, v: 6, omega: 3, an: 18 }
    ];
    const itm = list[idx % list.length];
    const q = `Radiusi R = ${itm.R} m bo'lgan aylanma trayektoriya bo'ylab jism o'zgarmas v = ${itm.v} m/s chiziqli tezlik bilan tekis aylanmoqda. Jismning burchak tezligi (ω) va uning markazga intilma tezlanishi (a_n) mos ravishda qanday qiymatlarni qabul qiladi? (#${qId})`;
    const correct = `Burchak tezligi ${itm.omega} rad/s ga, markazga intilma tezlanish esa ${itm.an} m/s² ga teng`;
    const distractors = [
      `Burchak tezligi ${itm.omega + 2} rad/s ga, markazga intilma tezlanish esa ${itm.an - 4} m/s² ga teng`,
      `Burchak tezligi ${itm.omega - 1} rad/s ga, markazga intilma tezlanish esa ${itm.an + 6} m/s² ga teng`,
      `Burchak tezligi ${itm.omega + 5} rad/s ga, markazga intilma tezlanish esa ${itm.an + 12} m/s² ga teng`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Aylanma harakat kinematikasi (Turdiyev N.Sh., Fizika 10-sinf): burchak tezlik ω = v / R = ${itm.v} / ${itm.R} = ${itm.omega} rad/s. Markazga intilma tezlanish a_n = v² / R = ${itm.v*itm.v} / ${itm.R} = ${itm.an} m/s² (yoki a_n = ω²*R).`,
      mnemonic: "Aylana harakati: Burchak tezligi v bo'lingan R, markazga intilma esa v kvadrat bo'lingan R deb bilgin.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 6. Nyutonning 2-qonuni va bog'langan yuklar
  (qId, idx, target) => {
    const list = [
      { m1: 3, m2: 2, g: 10, a: 2, T: 24 },
      { m1: 4, m2: 1, g: 10, a: 6, T: 16 },
      { m1: 7, m2: 3, g: 10, a: 4, T: 42 },
      { m1: 6, m2: 4, g: 10, a: 2, T: 48 }
    ];
    const itm = list[idx % list.length];
    const q = `Qo'zg'almas yengil blok orqali o'tkazilgan cho'zilmas ipning ikki uchiga m_1 = ${itm.m1} kg va m_2 = ${itm.m2} kg massali yuklar osilgan (m_1 > m_2). Ishqalanish va blok massasi hisobga olinmaganda (g = 10 m/s²), yuklarning harakat tezlanishi (a) va ipning taranglik kuchi (T) qanday aniqlanadi? (#${qId})`;
    const correct = `Yuklar tezlanishi ${itm.a} m/s² ga, ipning taranglik kuchi esa ${itm.T} N ga teng bo'ladi`;
    const distractors = [
      `Yuklar tezlanishi ${itm.a + 1} m/s² ga, ipning taranglik kuchi esa ${itm.T - 6} N ga teng bo'ladi`,
      `Yuklar tezlanishi ${itm.a - 0.5} m/s² ga, ipning taranglik kuchi esa ${itm.T + 8} N ga teng bo'ladi`,
      `Yuklar tezlanishi ${itm.a + 2} m/s² ga, ipning taranglik kuchi esa ${itm.T + 12} N ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Atvud mashinasi dinamikasi (Rimkevich A.P., Fizikadan masalalar to'plami): tezlanish a = (m_1 - m_2)*g / (m_1 + m_2) = (${itm.m1} - ${itm.m2})*10 / (${itm.m1} + ${itm.m2}) = ${itm.a} m/s². Ipning tarangligi T = 2*m_1*m_2*g / (m_1 + m_2) = ${itm.T} N.`,
      mnemonic: "Bog'langan yuklar: Massalar ayirmasi tortadi, yig'indisi qarshilik qiladi, tezlanish shu nisbatdan hosil bo'ladi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 7. Qiya tekislik bo'ylab harakat
  (qId, idx, target) => {
    const list = [
      { alpha: 30, mu: 0.2, g: 10, sinA: 0.5, cosA: 0.866, a: 3.27 },
      { alpha: 45, mu: 0.1, g: 10, sinA: 0.707, cosA: 0.707, a: 6.36 },
      { alpha: 30, mu: 0.1, g: 10, sinA: 0.5, cosA: 0.866, a: 4.13 },
      { alpha: 60, mu: 0.2, g: 10, sinA: 0.866, cosA: 0.5, a: 7.66 }
    ];
    const itm = list[idx % list.length];
    const q = `Gorizont bilan α = ${itm.alpha}° burchak tashkil etuvchi qiya tekislikdan jism o'z og'irligi ta'sirida sirpanib tushmoqda. Jism bilan sirt orasidagi sirpanish ishqalanish koeffitsiyenti μ = ${itm.mu} ga teng bo'lsa, jismning pastga tushish tezlanishi qanday ifodalanadi? (#${qId})`;
    const correct = `Jism tezlanishi a = g*(sinα - μ*cosα) ifodasi orqali hisoblanadi va uning qiymati taxminan ${itm.a} m/s² bo'ladi`;
    const distractors = [
      `Jism tezlanishi a = g*(cosα - μ*sinα) ifodasi orqali hisoblanadi va uning qiymati taxminan ${itm.a + 2} m/s² bo'ladi`,
      `Jism tezlanishi a = g*(sinα + μ*cosα) ifodasi orqali hisoblanadi va uning qiymati taxminan ${itm.a - 1.5} m/s² bo'ladi`,
      `Jism tezlanishi a = g*tgα / (1 + μ) ifodasi orqali hisoblanadi va uning qiymati taxminan ${itm.a + 3.2} m/s² bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Qiya tekislik dinamikasi (Tursunmetov K.A., Fizika 10-sinf): tekislik bo'ylab tortuvchi kuch mg*sinα, ishqalanish kuchi F_ishq = μ*N = μ*mg*cosα. Nyutonning 2-qonuniga ko'ra: m*a = mg*sinα - μ*mg*cosα, bundan a = g*(sinα - μ*cosα).`,
      mnemonic: "Qiya tekislik: sinα pastga tortadi, ishqalanish μ*cosα esa harakatga qarshi to'siq bo'ladi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 8. Butun olam tortishish qonuni va kosmik tezlik
  (qId, idx, target) => {
    const list = [
      { text: "sayyora sirtidan balandlikka ko'tarilgan sari erkin tushish tezlanishi", res: "markazgacha bo'lgan masofaning kvadratiga teskari proporsional ravishda kamayadi" },
      { text: "sayyora radiusi 2 marta ortib, massasi o'zgarmas qolsa, birinchi kosmik tezlik", res: "√2 marta kamayib, sayyora atrofida aylanish tezligi sezilarli pasayadi" },
      { text: "sayyoraning massasi 4 marta ortib, radiusi o'zgarmasa, sirtidagi og'irlik kuchi", res: "to'g'ri proporsional ravishda aynan 4 marta ortishga uchraydi" },
      { text: "sayyorani butunlay tark etish uchun zarur bo'lgan ikkinchi kosmik tezlik", res: "birinchi kosmik tezlikdan qat'iy ravishda aynan √2 marta katta bo'ladi" }
    ];
    const itm = list[idx % list.length];
    const q = `Gravitatsiya qonunlari va kosmik fazoda sun'iy yo'ldoshlar harakatiga asosan, ${itm.text} qanday o'zgarishga uchraydi? (#${qId})`;
    const correct = `Fizik qonuniyatlarga ko'ra, u ${itm.res}`;
    const distractors = [
      `Fizik qonuniyatlarga ko'ra, u masofaga to'g'ri proporsional ravishda cheksiz ortib boraveradi`,
      `Fizik qonuniyatlarga ko'ra, u o'zgarmas qolib hech qanday geometrik parametrlarga bog'liq bo'lmaydi`,
      `Fizik qonuniyatlarga ko'ra, u faqat atmosferaning zichligiga bog'liq ravishda chiziqli kamayadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Gravitatsiya va kosmik harakat (Turdiyev N.Sh., Fizika 10-sinf): F = G*M*m / R², g = G*M / R². Birinchi kosmik tezlik v_1 = √(G*M/R), ikkinchi kosmik tezlik v_2 = √(2)*v_1 = √(2G*M/R).`,
      mnemonic: "Kosmik tezliklar: Birinchi tezlik doira qurar, ikkinchisi √2 ga ko'payib quyosh tomon yo'l olar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 9. Prujinalarning ketma-ket va parallel ulanishi
  (qId, idx, target) => {
    const list = [
      { k1: 100, k2: 100, kp: 200, kk: 50 },
      { k1: 200, k2: 200, kp: 400, kk: 100 },
      { k1: 300, k2: 600, kp: 900, kk: 200 },
      { k1: 400, k2: 400, kp: 800, kk: 200 }
    ];
    const itm = list[idx % list.length];
    const q = `Bikrligi k_1 = ${itm.k1} N/m va k_2 = ${itm.k2} N/m bo'lgan ikkita elastik prujina o'zaro parallel va ketma-ket ulanganda, hosil bo'lgan prujinalar tizimining umumiy ekvivalent bikrliklari (k_parallel va k_ketma_ket) mos ravishda qanday bo'ladi? (#${qId})`;
    const correct = `Parallel ulanganda ${itm.kp} N/m ga, ketma-ket ulanganda esa ${itm.kk} N/m ga teng bo'ladi`;
    const distractors = [
      `Parallel ulanganda ${itm.kk} N/m ga, ketma-ket ulanganda esa ${itm.kp} N/m ga teng bo'ladi`,
      `Parallel ulanganda ${itm.kp + 100} N/m ga, ketma-ket ulanganda esa ${itm.kk - 20} N/m ga teng bo'ladi`,
      `Parallel ulanganda ${itm.kp - 50} N/m ga, ketma-ket ulanganda esa ${itm.kk + 40} N/m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Guk qonuni va prujinalar ulanishi (Rimkevich A.P., Fizikadan masalalar to'plami): parallel ulanganda bikrliklar qo'shiladi: k_par = k_1 + k_2 = ${itm.k1} + ${itm.k2} = ${itm.kp} N/m. Ketma-ket ulanganda: 1/k_ket = 1/k_1 + 1/k_2 => k_ket = (k_1*k_2)/(k_1 + k_2) = ${itm.kk} N/m.`,
      mnemonic: "Prujina qoidasi: Parallel bo'lsa kuchayib qo'shilar, ketma-ket bo'lsa yumshab bikrlik kamayar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 10. Impulsning saqlanish qonuni va reaktiv harakat
  (qId, idx, target) => {
    const list = [
      { m1: 2, v1: 3, m2: 1, v2: 0, u: 2 },
      { m1: 4, v1: 5, m2: 6, v2: 0, u: 2 },
      { m1: 3, v1: 4, m2: 1, v2: 0, u: 3 },
      { m1: 5, v1: 6, m2: 5, v2: 0, u: 3 }
    ];
    const itm = list[idx % list.length];
    const q = `Silliq gorizontal muz ustida m_1 = ${itm.m1} kg massali aravacha v_1 = ${itm.v1} m/s tezlik bilan harakatlanib, tinch turgan m_2 = ${itm.m2} kg massali ikkinchi aravacha bilan mutlaq noelastik to'qnashdi. To'qnashuvdan so'ng aravachalar birgalikda qanday u umumiy tezlik bilan harakatlanadi? (#${qId})`;
    const correct = `To'qnashuvdan so'ng birlashgan aravachalar tezligi ${itm.u} m/s ga teng bo'ladi`;
    const distractors = [
      `To'qnashuvdan so'ng birlashgan aravachalar tezligi ${itm.u + 1.5} m/s ga teng bo'ladi`,
      `To'qnashuvdan so'ng birlashgan aravachalar tezligi ${itm.u - 0.8} m/s ga teng bo'ladi`,
      `To'qnashuvdan so'ng birlashgan aravachalar tezligi ${itm.u + 2.4} m/s ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Impulsning saqlanish qonuni (Tursunmetov K.A., Fizika 10-sinf): yopiq tizim uchun m_1*v_1 + m_2*v_2 = (m_1 + m_2)*u. Boshlang'ich impuls p = ${itm.m1}*${itm.v1} + 0 = ${itm.m1*itm.v1} kg*m/s. Umumiy massa M = ${itm.m1} + ${itm.m2} = ${itm.m1+itm.m2} kg. Shunda u = p / M = ${itm.u} m/s.`,
      mnemonic: "Noelastik to'qnashuv: Impulslar jamlanar, massalar qo'shilar, umumiy tezlik kamayib birga intilar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 11. Mexanik ish va quvvat
  (qId, idx, target) => {
    const list = [
      { F: 50, s: 20, t: 10, A: 1000, P: 100 },
      { F: 120, s: 15, t: 6, A: 1800, P: 300 },
      { F: 200, s: 10, t: 5, A: 2000, P: 400 },
      { F: 80, s: 25, t: 8, A: 2000, P: 250 }
    ];
    const itm = list[idx % list.length];
    const q = `Jismga gorizontal yo'nalishda F = ${itm.F} N o'zgarmas kuch ta'sir etib, uni o'z yo'nalishi bo'ylab s = ${itm.s} m masofaga t = ${itm.t} s davomida tekis siljitdi. Ushbu jarayonda kuch bajargan mexanik ish (A) va uning o'rtacha quvvati (P) qanday bo'ladi? (#${qId})`;
    const correct = `Bajarilgan ish ${itm.A} J ga, o'rtacha quvvat esa ${itm.P} W ga teng bo'ladi`;
    const distractors = [
      `Bajarilgan ish ${itm.A + 200} J ga, o'rtacha quvvat esa ${itm.P - 25} W ga teng bo'ladi`,
      `Bajarilgan ish ${itm.A - 300} J ga, o'rtacha quvvat esa ${itm.P + 50} W ga teng bo'ladi`,
      `Bajarilgan ish ${itm.A + 500} J ga, o'rtacha quvvat esa ${itm.P + 80} W ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Mexanik ish va quvvat (Turdiyev N.Sh., Fizika 10-sinf): kuch yo'nalishida bajarilgan ish A = F*s = ${itm.F}*${itm.s} = ${itm.A} J. Quvvat P = A / t = ${itm.A} / ${itm.t} = ${itm.P} W.`,
      mnemonic: "Ish va quvvat: Kuch ko'paytirilgan yo'l bu ish bo'lur, ishni vaqtga bo'lsang quvvat unib chiqar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 12. Mexanik energiyaning saqlanishi
  (qId, idx, target) => {
    const list = [
      { m: 2, h: 5, g: 10, Ep: 100, v: 10 },
      { m: 1, h: 20, g: 10, Ep: 200, v: 20 },
      { m: 0.5, h: 45, g: 10, Ep: 225, v: 30 },
      { m: 4, h: 5, g: 10, Ep: 200, v: 10 }
    ];
    const itm = list[idx % list.length];
    const q = `Massasi m = ${itm.m} kg bo'lgan jism h = ${itm.h} m balandlikdan boshlang'ich tezliksiz erkin tushmoqda. Havo qarshiligi hisobga olinmaganda (g = 10 m/s²), jismning boshlang'ich potensial energiyasi (E_p) va yerga urilish paytidagi tezligi (v) qanday bo'ladi? (#${qId})`;
    const correct = `Boshlang'ich potensial energiya ${itm.Ep} J ga, yerga urilish tezligi esa ${itm.v} m/s ga teng`;
    const distractors = [
      `Boshlang'ich potensial energiya ${itm.Ep + 50} J ga, yerga urilish tezligi esa ${itm.v - 3} m/s ga teng`,
      `Boshlang'ich potensial energiya ${itm.Ep - 40} J ga, yerga urilish tezligi esa ${itm.v + 4} m/s ga teng`,
      `Boshlang'ich potensial energiya ${itm.Ep + 80} J ga, yerga urilish tezligi esa ${itm.v + 6} m/s ga teng`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Energiyaning saqlanish qonuni (Tursunmetov K.A., Fizika 10-sinf): boshlang'ich potensial energiya E_p = m*g*h = ${itm.m}*10*${itm.h} = ${itm.Ep} J. Butun potensial energiya yerga urilishda kinetik energiyaga aylanadi: m*g*h = m*v²/2 => v = √(2gh) = √(2*10*${itm.h}) = ${itm.v} m/s.`,
      mnemonic: "Energiyaning saqlanishi: Balandlikda potensial, pastda kinetik; yo'qolmas energiya, o'zgarar doimiy va tirik.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 13. Richag va momentlar qoidasi
  (qId, idx, target) => {
    const list = [
      { d1: 0.2, d2: 0.8, F1: 200, F2: 50 },
      { d1: 0.1, d2: 0.5, F1: 150, F2: 30 },
      { d1: 0.3, d2: 0.9, F1: 120, F2: 40 },
      { d1: 0.25, d2: 1.0, F1: 240, F2: 60 }
    ];
    const itm = list[idx % list.length];
    const q = `Vaznsiz richagning tayanch nuqtasidan yelkalarigacha bo'lgan masofalar d_1 = ${itm.d1} m va d_2 = ${itm.d2} m ga teng. Birinchi yelkaga F_1 = ${itm.F1} N kuch qo'yilgan bo'lsa, richag gorizontal muvozanatda turishi uchun ikkinchi yelkaga qanday F_2 kuch qo'yilishi shart? (#${qId})`;
    const correct = `Richag muvozanatda bo'lishi uchun ikkinchi yelkaga ${itm.F2} N kuch qo'yilishi lozim`;
    const distractors = [
      `Richag muvozanatda bo'lishi uchun ikkinchi yelkaga ${itm.F2 + 15} N kuch qo'yilishi lozim`,
      `Richag muvozanatda bo'lishi uchun ikkinchi yelkaga ${itm.F2 - 10} N kuch qo'yilishi lozim`,
      `Richag muvozanatda bo'lishi uchun ikkinchi yelkaga ${itm.F2 + 30} N kuch qo'yilishi lozim`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Statika va momentlar qoidasi (Chernoutsan A.I., Fizikadan masalalar to'plami): richag muvozanat sharti F_1*d_1 = F_2*d_2. Bundan F_2 = (F_1*d_1) / d_2 = (${itm.F1}*${itm.d1}) / ${itm.d2} = ${itm.F2} N. Richag kuchdan ${itm.d2/itm.d1} marta yutuq beradi.`,
      mnemonic: "Richag oltin qoidasi: Yelkasi uzun bo'lgan joyda kuch kam sarflanur, kuchdan qancha yutsang yo'ldan shuncha yutqazilur.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 14. Gidravlik press va Paskal qonuni
  (qId, idx, target) => {
    const list = [
      { S1: 10, S2: 200, F1: 50, F2: 1000, k: 20 },
      { S1: 5, S2: 250, F1: 40, F2: 2000, k: 50 },
      { S1: 20, S2: 400, F1: 100, F2: 2000, k: 20 },
      { S1: 8, S2: 320, F1: 60, F2: 2400, k: 40 }
    ];
    const itm = list[idx % list.length];
    const q = `Gidravlik pressning kichik porsheni yuzi S_1 = ${itm.S1} cm², katta porsheni yuzi esa S_2 = ${itm.S2} cm² ga teng. Kichik porshenga F_1 = ${itm.F1} N kuch bilan ta'sir etilganda, katta porshen tomonidan hosil qilinadigan F_2 kuch va pressning kuchdan beradigan yutug'i (k) qanday bo'ladi? (#${qId})`;
    const correct = `Katta porshendagi kuch ${itm.F2} N ga teng bo'lib, press kuchdan ${itm.k} marta yutuq beradi`;
    const distractors = [
      `Katta porshendagi kuch ${itm.F2 + 300} N ga teng bo'lib, press kuchdan ${itm.k + 5} marta yutuq beradi`,
      `Katta porshendagi kuch ${itm.F2 - 400} N ga teng bo'lib, press kuchdan ${itm.k - 8} marta yutuq beradi`,
      `Katta porshendagi kuch ${itm.F2 + 600} N ga teng bo'lib, press kuchdan ${itm.k + 12} marta yutuq beradi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Paskal qonuni va gidravlik press (Turdiyev N.Sh., Fizika 10-sinf): p = F_1/S_1 = F_2/S_2. Kuchdan yutuq k = S_2/S_1 = ${itm.S2}/${itm.S1} = ${itm.k}. Katta porshendagi kuch F_2 = F_1 * (S_2/S_1) = ${itm.F1} * ${itm.k} = ${itm.F2} N.`,
      mnemonic: "Gidravlik press: Suyuqlik bosimni teng uzatar har yonga, yuzalar nisbati kuch berar katta polvonga.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 15. Arximed kuchi va suzish sharti
  (qId, idx, target) => {
    const list = [
      { V: 0.004, rho_s: 1000, g: 10, FA: 40, rho_j: 600, text: "yog'och bo'lagi" },
      { V: 0.002, rho_s: 1000, g: 10, FA: 20, rho_j: 800, text: "parafin parchasi" },
      { V: 0.005, rho_s: 1000, g: 10, FA: 50, rho_j: 500, text: "quruq qarag'ay yog'ochi" },
      { V: 0.001, rho_s: 1030, g: 10, FA: 10.3, rho_j: 920, text: "muz bo'lagi" }
    ];
    const itm = list[idx % list.length];
    const q = `Hajmi V = ${itm.V} m³ bo'lgan ${itm.text} zichligi ρ = ${itm.rho_s} kg/m³ bo'lgan suvga to'liq botirilganda, unga ta'sir qiluvchi gidrostatik itaruvchi Arximed kuchi (F_A) qanchaga teng bo'ladi (g = 10 m/s²)? (#${qId})`;
    const correct = `Suyuqlik tomonidan jismga ta'sir etuvchi Arximed kuchi ${itm.FA} N ga teng bo'ladi`;
    const distractors = [
      `Suyuqlik tomonidan jismga ta'sir etuvchi Arximed kuchi ${itm.FA + 8} N ga teng bo'ladi`,
      `Suyuqlik tomonidan jismga ta'sir etuvchi Arximed kuchi ${itm.FA - 6} N ga teng bo'ladi`,
      `Suyuqlik tomonidan jismga ta'sir etuvchi Arximed kuchi ${itm.FA + 14} N ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Arximed qonuni (Toshxonova, Mexanika va molekulyar fizika praktikum): jismga ta'sir etuvchi itarish kuchi F_A = ρ_suyuqlik * g * V_jism = ${itm.rho_s} * 10 * ${itm.V} = ${itm.FA} N. Jismning zichligi suvnikidan kichik bo'lsa, u qisman botib suzadi.`,
      mnemonic: "Arximed kuchi: Siqib chiqarilgan suyuqlik og'irligiga teng itaruvchi kuch, zichliklar solishtirilib hal etilur suzish.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 16. Bernulli tenglamasi va uzluksizlik qonuni
  (qId, idx, target) => {
    const list = [
      { r_nisbat: 2, S_nisbat: 4, v1: 2, v2: 8 },
      { r_nisbat: 3, S_nisbat: 9, v1: 1, v2: 9 },
      { r_nisbat: 2, S_nisbat: 4, v1: 3, v2: 12 },
      { r_nisbat: 4, S_nisbat: 16, v1: 0.5, v2: 8 }
    ];
    const itm = list[idx % list.length];
    const q = `Gorizontal quvurdan oqayotgan ideal siqilmas suyuqlik oqimida quvur radiusi ${itm.r_nisbat} marta toraygan tor qismga o'tganda, oqimning kesim yuzi (S) va oqish tezligi (v) qanday mutanosiblikda o'zgaradi? (#${qId})`;
    const correct = `Kesim yuzi ${itm.S_nisbat} marta kamayadi, oqim tezligi esa uzluksizlik qonuniga ko'ra ${itm.S_nisbat} marta ortadi`;
    const distractors = [
      `Kesim yuzi ${itm.r_nisbat} marta kamayadi, oqim tezligi esa uzluksizlik qonuniga ko'ra faqat ${itm.r_nisbat} marta ortadi`,
      `Kesim yuzi ${itm.S_nisbat} marta ortadi, oqim tezligi esa bosimning ortishi hisobiga ${itm.S_nisbat} marta kamayadi`,
      `Kesim yuzi ${itm.r_nisbat} marta ortadi, oqim tezligi esa quvurning butun uzunligida mutlaqo o'zgarmas saqlanib qoladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Gidrodinamika va uzluksizlik tenglamasi (Turdiyev N.Sh., Fizika 10-sinf): kesim yuzi S = π*R². Radius ${itm.r_nisbat} marta kamaysa, yuza ${itm.S_nisbat} marta kamayadi. S_1*v_1 = S_2*v_2 bo'lgani sababli, tor qismda tezlik ${itm.S_nisbat} marta ortadi. Bernulli tenglamasiga ko'ra bu sohada statik bosim kamayadi.`,
      mnemonic: "Uzluksizlik qoidasi: Quvur qancha tor bo'lsa tezlik shuncha shoshilar, tezlik oshgan tor joyda statik bosim bosilar.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  }
];

// Generate exactly 364 questions (IDs 1–364, topicId 177)
createQuestionBankFizika('01_mexanika.json', 177, 1, 364, templates);
