import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. Kulon qonuni
  (qId, idx, target) => {
    const list = [
      { text: "har bir zaryad miqdori 2 marta orttirilib, ular orasidagi masofa 2 marta qisqartirilsa", res: "o'zaro ta'sir Kulon kuchi 16 marta ortadi" },
      { text: "zaryadlar miqdori o'zgarmay, oradagi masofa 3 marta oshirilsa", res: "o'zaro ta'sir kuchi kvadratik tarzda 9 marta kamayadi" },
      { text: "bitta zaryad 3 marta orttirilib, masofa o'zgarmas saqlansa", res: "o'zaro ta'sir kuchi to'g'ri proporsional 3 marta ortadi" },
      { text: "zaryadlar vakuumdan dielektrik singdiruvchanligi ε = 4 bo'lgan kerosin muhitiga o'tkazilsa", res: "o'zaro ta'sir kuchi aynan 4 marta kamayadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Nuqtaviy zaryadlarning vakuumdagi o'zaro ta'siri haqidagi Kulon qonuniga (F = k*|q_1*q_2|/r²) ko'ra, agar ${itm.text}, ularning o'zaro ta'sir kuchi qanday o'zgaradi? (#${qId})`;
    const correct = `Kulon qonuniyatiga asosan, ${itm.res}`;
    const distractors = [
      `Kulon qonuniyatiga asosan, o'zaro ta'sir kuchi hech qanday o'zgarishsiz o'zgarmas qolaveradi`,
      `Kulon qonuniyatiga asosan, o'zaro ta'sir kuchi ko'rsatilgan miqdorga faqat chiziqli ravishda bog'liq bo'ladi`,
      `Kulon qonuniyatiga asosan, zaryadlar ishorasiga qarab kuch nolga tenglashib mutlaqo yo'qoladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Kulon qonuni (Turdiyev N.Sh., Fizika 10-sinf): F = k * |q_1 * q_2| / (ε * r²). Ta'sir kuchi zaryadlar ko'paytmasiga to'g'ri, masofa kvadratiga teskari, muhit dielektrik singdiruvchanligiga teskari proporsionaldir.`,
      mnemonic: "Kulon kuchi: Zaryadlar ko'paytmasi kuch beradi, oradagi masofa kvadrati kuchni sindiradi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 2. Maydon kuchlanganligi va potensiallar farqi
  (qId, idx, target) => {
    const list = [
      { U: 200, d: 0.05, E: 4000 },
      { U: 120, d: 0.02, E: 6000 },
      { U: 300, d: 0.1, E: 3000 },
      { U: 500, d: 0.05, E: 10000 }
    ];
    const itm = list[idx % list.length];
    const q = `Bir jinsli elektrostatik maydonda joylashgan ikkita nuqta orasidagi potensiallar farqi (kuchlanish) U = ${itm.U} V ga, kuch chiziqlari bo'ylab ular orasidagi masofa esa d = ${itm.d} m ga teng. Ushbu bir jinsli maydon kuchlanganligi (E) qanchaga teng? (#${qId})`;
    const correct = `Maydon kuchlanganligi E = ${itm.E} V/m (yoki N/C) ga teng bo'ladi`;
    const distractors = [
      `Maydon kuchlanganligi E = ${itm.E + 1200} V/m ga teng bo'ladi`,
      `Maydon kuchlanganligi E = ${itm.E - 1000} V/m ga teng bo'ladi`,
      `Maydon kuchlanganligi E = ${itm.E + 2500} V/m ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Elektrostatik maydon kuchlanganligi va potensial bog'liqligi (Tursunmetov K.A., Fizika 10-sinf): bir jinsli maydonda E = U / d = ${itm.U} / ${itm.d} = ${itm.E} V/m.`,
      mnemonic: "Kuchlanganlik siri: Kuchlanishni masofaga bo'lsang bas, maydonning kuchlanganligi chiqadi darhol.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 3. Maydonning zaryadni ko'chirishdagi ishi
  (qId, idx, target) => {
    const list = [
      { q_val: 2, U: 50, A: 100 },
      { q_val: 4, U: 25, A: 100 },
      { q_val: 5, U: 40, A: 200 },
      { q_val: 3, U: 60, A: 180 }
    ];
    const itm = list[idx % list.length];
    const q = `Potensiallar farqi U = ${itm.U} V bo'lgan elektr maydonining ikki nuqtasi orasida q = ${itm.q_val} mC (milliKulon) zaryad ko'chirilganda, elektrostatik maydon kuchlari qanday mexanik ish (A) bajaradi? (#${qId})`;
    const correct = `Maydon kuchlari bajargan ish A = ${itm.A} mJ (0.${String(itm.A).padStart(3, '0')} J) ga teng`;
    const distractors = [
      `Maydon kuchlari bajargan ish A = ${itm.A + 50} mJ ga teng bo'ladi`,
      `Maydon kuchlari bajargan ish A = ${itm.A - 30} mJ ga teng bo'ladi`,
      `Maydon kuchlari bajargan ish A = ${itm.A + 120} mJ ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Maydon ishi formulasi (Chernoutsan A.I., Fizikadan masalalar to'plami): A = q * U = (${itm.q_val} * 10^-3 C) * ${itm.U} V = ${itm.A / 1000} J = ${itm.A} mJ.`,
      mnemonic: "Elektr ishi: Zaryadni ko'paytir kuchlanishga — olingan natija aylanur maydonning sof ishiga.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 4. Yassi kondensator sig'imi
  (qId, idx, target) => {
    const list = [
      { text: "plastinkalari orasidagi masofa d ikki barobarga qisqartirilsa", res: "kondensator elektr sig'imi 2 marta ortadi" },
      { text: "plastinkalarining yuzi S uch barobarga kattalashtirilsa", res: "kondensator elektr sig'imi to'g'ri proporsional 3 marta ortadi" },
      { text: "plastinkalari orasiga dielektrik singdiruvchanligi ε = 5 bo'lgan kerosin quyilsa", res: "kondensator elektr sig'imi aynan 5 marta ortadi" },
      { text: "plastinkalar orasidagi masofa 4 marta orttirilib, yuzi 2 marta kamaytirilsa", res: "kondensator elektr sig'imi 8 marta kamayadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Yassi kondensatorning elektr sig'imi formulasiga (C = ε*ε_0*S / d) ko'ra, agar ${itm.text}, uning elektr sig'imi qanday o'zgaradi? (#${qId})`;
    const correct = `Sig'im qonuniyatiga ko'ra, ${itm.res}`;
    const distractors = [
      `Sig'im qonuniyatiga ko'ra, kondensator sig'imi mutlaqo o'zgarmas bo'lib zaryadga qarab belgilanadi`,
      `Sig'im qonuniyatiga ko'ra, kondensator sig'imi ko'rsatilgan o'zgarishga teskari tarzda kamayadi`,
      `Sig'im qonuniyatiga ko'ra, kondensator sig'imi faqat tashqi zanjirdagi kuchlanishga bog'liq bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yassi kondensator sig'imi (Turdiyev N.Sh., Fizika 10-sinf): C = ε * ε_0 * S / d. Sig'im sirt yuziga va dielektrik singdiruvchanlikka to'g'ri, plastinkalar orasidagi masofaga esa teskari proporsionaldir.`,
      mnemonic: "Kondensator sig'imi: Yuza va dielektrik sig'imni oshirar, masofa uzoqlashsa sig'im kamayar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 5. Kondensatorlarning ulanishi
  (qId, idx, target) => {
    const list = [
      { C1: 6, C2: 3, Cp: 9, Ck: 2 },
      { C1: 4, C2: 4, Cp: 8, Ck: 2 },
      { C1: 12, C2: 6, Cp: 18, Ck: 4 },
      { C1: 10, C2: 10, Cp: 20, Ck: 5 }
    ];
    const itm = list[idx % list.length];
    const q = `Elektr sig'imlari C_1 = ${itm.C1} μF va C_2 = ${itm.C2} μF bo'lgan ikkita kondensator parallel va ketma-ket ulanganda, batareyaning umumiy ekvivalent sig'imlari (C_parallel va C_ketma_ket) qanday bo'ladi? (#${qId})`;
    const correct = `Parallel ulanganda ${itm.Cp} μF ga, ketma-ket ulanganda esa ${itm.Ck} μF ga teng bo'ladi`;
    const distractors = [
      `Parallel ulanganda ${itm.Ck} μF ga, ketma-ket ulanganda esa ${itm.Cp} μF ga teng bo'ladi`,
      `Parallel ulanganda ${itm.Cp + 4} μF ga, ketma-ket ulanganda esa ${itm.Ck - 1} μF ga teng bo'ladi`,
      `Parallel ulanganda ${itm.Cp - 3} μF ga, ketma-ket ulanganda esa ${itm.Ck + 3} μF ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Kondensatorlar batareyasi (Rimkevich A.P., Fizikadan masalalar to'plami): parallel ulanganda sig'imlar qo'shiladi: C_par = C_1 + C_2 = ${itm.C1} + ${itm.C2} = ${itm.Cp} μF. Ketma-ket ulanganda: 1/C_ket = 1/C_1 + 1/C_2 => C_ket = (C_1*C_2)/(C_1 + C_2) = (${itm.C1}*${itm.C2})/(${itm.C1}+${itm.C2}) = ${itm.Ck} μF.`,
      mnemonic: "Kondensator ulanishi: Parallel bo'lsa sig'imlar qo'shilib o'sar, ketma-ket bo'lsa qarshilikdek kamayar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 6. Zaryadlangan kondensator energiyasi
  (qId, idx, target) => {
    const list = [
      { C: 20, U: 100, W: 0.1 },
      { C: 10, U: 200, W: 0.2 },
      { C: 50, U: 40, W: 0.04 },
      { C: 40, U: 50, W: 0.05 }
    ];
    const itm = list[idx % list.length];
    const q = `Elektr sig'imi C = ${itm.C} μF bo'lgan kondensator U = ${itm.U} V kuchlanishgacha zaryadlandi. Kondensatorning elektr maydonida to'plangan energiya (W) qanchaga teng? (#${qId})`;
    const correct = `Kondensator elektr maydoni energiyasi W = ${itm.W} J ga teng bo'ladi`;
    const distractors = [
      `Kondensator elektr maydoni energiyasi W = ${itm.W * 2} J ga teng bo'ladi`,
      `Kondensator elektr maydoni energiyasi W = ${itm.W / 2} J ga teng bo'ladi`,
      `Kondensator elektr maydoni energiyasi W = ${(itm.W * 1.5).toFixed(2)} J ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Kondensator energiyasi (Turdiyev N.Sh., Fizika 10-sinf): W = (C * U²) / 2 = (${itm.C} * 10⁻⁶ * ${itm.U * itm.U}) / 2 = ${itm.W} J.`,
      mnemonic: "Kondensator energiyasi: C ko'paytir U kvadrat bo'lingan ikki — maydondagi energiya shudir bildingki.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 7. O'tkazgich qarshiligi va cho'zilishi
  (qId, idx, target) => {
    const list = [
      { n: 2, R_ortish: 4 },
      { n: 3, R_ortish: 9 },
      { n: 4, R_ortish: 16 },
      { n: 5, R_ortish: 25 }
    ];
    const itm = list[idx % list.length];
    const q = `Bir jinsli silindrsimon metall sim hajmini o'zgartirmasdan tekis cho'zilib, uning uzunligi l dastlabkiga nisbatan ${itm.n} marta oshirildi. Simning elektr qarshiligi (R) necha marta ortadi? (#${qId})`;
    const correct = `Sim hajmi saqlangani uchun uning elektr qarshiligi ${itm.R_ortish} marta ortadi`;
    const distractors = [
      `Sim uzunligi oshgani sababli uning elektr qarshiligi faqat ${itm.n} marta ortadi`,
      `Sim kesimi o'zgargani hisobiga uning elektr qarshiligi ${itm.n * 2} marta ortadi`,
      `Sim moddasi o'zgarmagani uchun uning elektr qarshiligi butunlay o'zgarmas qoladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `O'tkazgich qarshiligi (Tursunmetov K.A., Fizika 10-sinf): R = ρ*l/S. Sim hajmi V = l*S = const. Agar uzunlik ${itm.n} marta ortsa, ko'ndalang kesim yuzi S ham ${itm.n} marta kamayadi. Natijada qarshilik ${itm.n} * ${itm.n} = ${itm.R_ortish} marta ortadi.`,
      mnemonic: "Simni cho'zish: Uzunlik n marta ortsa yuza n marta torayur, qarshilik n kvadrat marta o'sib qolur.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 8. O'tkazgichlarni parallel va ketma-ket ulash
  (qId, idx, target) => {
    const list = [
      { R1: 6, R2: 3, Rp: 2, Rk: 9 },
      { R1: 12, R2: 4, Rp: 3, Rk: 16 },
      { R1: 10, R2: 10, Rp: 5, Rk: 20 },
      { R1: 8, R2: 8, Rp: 4, Rk: 16 }
    ];
    const itm = list[idx % list.length];
    const q = `Qarshiliklari R_1 = ${itm.R1} Om va R_2 = ${itm.R2} Om bo'lgan ikkita rezistor parallel va ketma-ket ulanganda, hosil bo'lgan zanjir qismining umumiy ekvivalent qarshiliklari (R_parallel va R_ketma_ket) mos ravishda qanday bo'ladi? (#${qId})`;
    const correct = `Parallel ulanganda ${itm.Rp} Om ga, ketma-ket ulanganda esa ${itm.Rk} Om ga teng bo'ladi`;
    const distractors = [
      `Parallel ulanganda ${itm.Rk} Om ga, ketma-ket ulanganda esa ${itm.Rp} Om ga teng bo'ladi`,
      `Parallel ulanganda ${itm.Rp + 2} Om ga, ketma-ket ulanganda esa ${itm.Rk - 4} Om ga teng bo'ladi`,
      `Parallel ulanganda ${itm.Rp - 1} Om ga, ketma-ket ulanganda esa ${itm.Rk + 5} Om ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Rezistorlar ulanishi (Turdiyev N.Sh., Fizika 10-sinf): ketma-ket ulanganda R_k = R_1 + R_2 = ${itm.R1} + ${itm.R2} = ${itm.Rk} Om. Parallel ulanganda 1/R_p = 1/R_1 + 1/R_2 => R_p = (R_1*R_2)/(R_1+R_2) = (${itm.R1}*${itm.R2})/(${itm.R1}+${itm.R2}) = ${itm.Rp} Om.`,
      mnemonic: "Rezistorlar: Ketma-ket bo'lsa qarshiliklar jamlanadi, parallel bo'lsa tok bo'linib oqim yengillashadi.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 9. To'liq zanjir uchun Om qonuni
  (qId, idx, target) => {
    const list = [
      { E_val: 12, r: 1, R: 5, I: 2, U: 10 },
      { E_val: 24, r: 2, R: 10, I: 2, U: 20 },
      { E_val: 15, r: 0.5, R: 4.5, I: 3, U: 13.5 },
      { E_val: 36, r: 3, R: 9, I: 3, U: 27 }
    ];
    const itm = list[idx % list.length];
    const q = `Elektr yurituvchi kuchi E = ${itm.E_val} V va ichki qarshiligi r = ${itm.r} Om bo'lgan tok manbaiga R = ${itm.R} Om qarshilikli tashqi iste'molchi ulandi. Zanjirdagi tok kuchi (I) va tashqi zanjirdagi kuchlanish tushishi (U) qanday bo'ladi? (#${qId})`;
    const correct = `Zanjirdagi tok kuchi ${itm.I} A ga, tashqi klemmalardagi kuchlanish esa ${itm.U} V ga teng bo'ladi`;
    const distractors = [
      `Zanjirdagi tok kuchi ${itm.I + 1} A ga, tashqi klemmalardagi kuchlanish esa ${itm.U - 4} V ga teng bo'ladi`,
      `Zanjirdagi tok kuchi ${itm.I - 0.5} A ga, tashqi klemmalardagi kuchlanish esa ${itm.U + 3} V ga teng bo'ladi`,
      `Zanjirdagi tok kuchi ${itm.I + 2} A ga, tashqi klemmalardagi kuchlanish esa ${itm.U + 6} V ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `To'liq zanjir uchun Om qonuni (Tursunmetov K.A., Fizika 10-sinf): I = E / (R + r) = ${itm.E_val} / (${itm.R} + ${itm.r}) = ${itm.I} A. Tashqi kuchlanish U = I * R = ${itm.I} * ${itm.R} = ${itm.U} V (yoki U = E - I*r).`,
      mnemonic: "To'liq zanjir Om qonuni: EYuK bo'lingan umumiy qarshilik — tok kuchi aniqlanur shu on bexato.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 10. Joul-Lens qonuni va elektr quvvati
  (qId, idx, target) => {
    const list = [
      { I: 2, R: 10, t: 5, Q: 200, P: 40 },
      { I: 3, R: 20, t: 10, Q: 1800, P: 180 },
      { I: 5, R: 4, t: 6, Q: 600, P: 100 },
      { I: 4, R: 5, t: 10, Q: 800, P: 80 }
    ];
    const itm = list[idx % list.length];
    const q = `Qarshiligi R = ${itm.R} Om bo'lgan o'tkazgichdan I = ${itm.I} A o'zgarmas tok t = ${itm.t} s davomida o'tdi. O'tkazgichda ajralib chiqqan issiqlik miqdori (Q) va tokning iste'mol quvvati (P) qanday bo'ladi? (#${qId})`;
    const correct = `Ajralgan issiqlik ${itm.Q} J ga, tok quvvati esa ${itm.P} W ga teng bo'ladi`;
    const distractors = [
      `Ajralgan issiqlik ${itm.Q + 150} J ga, tok quvvati esa ${itm.P - 10} W ga teng bo'ladi`,
      `Ajralgan issiqlik ${itm.Q - 120} J ga, tok quvvati esa ${itm.P + 20} W ga teng bo'ladi`,
      `Ajralgan issiqlik ${itm.Q + 300} J ga, tok quvvati esa ${itm.P + 40} W ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Joul-Lens qonuni (Turdiyev N.Sh., Fizika 10-sinf): quvvat P = I² * R = ${itm.I * itm.I} * ${itm.R} = ${itm.P} W. Ajralgan issiqlik Q = P * t = I² * R * t = ${itm.P} * ${itm.t} = ${itm.Q} J.`,
      mnemonic: "Joul-Lens qonuni: I kvadrat R t issiqlik manbai, tok kuchaygan sari qiziydi o'tkazgich simi.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 11. Amper kuchi va chap qo'l qoidasi
  (qId, idx, target) => {
    const list = [
      { B: 0.5, I: 4, L: 0.2, alpha: 90, F: 0.4 },
      { B: 0.2, I: 5, L: 0.5, alpha: 90, F: 0.5 },
      { B: 0.8, I: 2, L: 0.25, alpha: 90, F: 0.4 },
      { B: 1.0, I: 3, L: 0.1, alpha: 90, F: 0.3 }
    ];
    const itm = list[idx % list.length];
    const q = `Bir jinsli magnit maydon induksiyasi B = ${itm.B} Tl bo'lib, unga induksiya chiziqlariga perpendikulyar ravishda uzunligi L = ${itm.L} m bo'lgan to'g'ri o'tkazgich joylashtirilgan. O'tkazgichdan I = ${itm.I} A tok oqayotgan bo'lsa, unga ta'sir qiluvchi Amper kuchi (F_A) qanday bo'ladi? (#${qId})`;
    const correct = `O'tkazgichga ta'sir qiluvchi Amper kuchi F_A = ${itm.F} N ga teng bo'ladi`;
    const distractors = [
      `O'tkazgichga ta'sir qiluvchi Amper kuchi F_A = ${(itm.F * 2).toFixed(1)} N ga teng bo'ladi`,
      `O'tkazgichga ta'sir qiluvchi Amper kuchi F_A = ${(itm.F / 2).toFixed(2)} N ga teng bo'ladi`,
      `O'tkazgichga ta'sir qiluvchi Amper kuchi F_A = ${(itm.F * 1.5).toFixed(2)} N ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Amper kuchi (Tursunmetov K.A., Fizika 10-sinf): F_A = I * B * L * sinα. sin(90°) = 1 bo'lgani uchun F_A = ${itm.I} * ${itm.B} * ${itm.L} = ${itm.F} N. Yo'nalishi chap qo'l qoidasi bilan aniqlanadi.`,
      mnemonic: "Amper kuchi: I B L sinα — kaftga kelsa B, to'rtta barmoq tokni ko'rsatar, bosh barmoq kuch tomon intilar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 12. Lorens kuchi va zarrachaning aylanishi
  (qId, idx, target) => {
    const list = [
      { text: "zarrachaning tezligi 2 marta oshirilsa", res: "aylanma trayektoriya radiusi R to'g'ri proporsional 2 marta ortadi" },
      { text: "magnit maydon induksiyasi B 2 marta kuchaytirilsa", res: "aylanma trayektoriya radiusi R teskari proporsional 2 marta kamayadi" },
      { text: "zarrachaning tezligi oshirilsa ham uning aylanish davri T", res: "tezlikka mutlaqo bog'liq bo'lmasdan o'zgarmas saqlanib qolaveradi" },
      { text: "zarracha maydon induksiya chiziqlari bo'ylab (α = 0°) harakatlansa", res: "unga ta'sir qiluvchi Lorens kuchi nolga teng bo'lib tekis to'g'ri chiziqli harakatlanadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Zaryadlangan zarracha bir jinsli magnit maydoniga uning kuch chiziqlariga perpendikulyar ravishda uchib kirib aylanma harakat qilayotganda, agar ${itm.text}, qanday hodisa yuz beradi? (#${qId})`;
    const correct = `Lorens kuchi qonuniga ko'ra, ${itm.res}`;
    const distractors = [
      `Lorens kuchi qonuniga ko'ra, zarracha bir zumda to'xtab magnit qutblariga yopishib harakatini butunlay to'xtatadi`,
      `Lorens kuchi qonuniga ko'ra, zarracha kinetik energiyasi cheksiz ortib tashqariga tekis tezlanuvchan otilib ketadi`,
      `Lorens kuchi qonuniga ko'ra, trayektoriya radiusi harakat davomida faqat zarracha massasining zichligiga bog'liq bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Lorens kuchi va harakat (Turdiyev N.Sh., Fizika 10-sinf): F_L = q*v*B. Markazga intilma kuch m*v²/R = q*v*B dan trayektoriya radiusi R = m*v / (q*B). Aylanish davri T = 2πm / (q*B) tezlikka bog'liq emas (siklotron prinsipi).`,
      mnemonic: "Lorens kuchi: q v B sinα zaryadni buradi, davr esa tezlikdan ozod bo'lib turadi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 13. Elektromagnit induksiya (Faradey qonuni)
  (qId, idx, target) => {
    const list = [
      { dPhi: 0.6, dt: 0.2, N: 100, E: 300 },
      { dPhi: 0.4, dt: 0.1, N: 50, E: 200 },
      { dPhi: 0.5, dt: 0.25, N: 200, E: 400 },
      { dPhi: 0.8, dt: 0.4, N: 150, E: 300 }
    ];
    const itm = list[idx % list.length];
    const q = `N = ${itm.N} ta o'ramdan iborat g'altakni kesib o'tuvchi magnit oqimi Δt = ${itm.dt} s vaqt ichida ΔФ = ${itm.dPhi} Vb (veber) ga tekis o'zgardi. Faradeyning elektromagnit induksiya qonuniga ko'ra, g'altakda hosil bo'lgan induksiya EYuK ning moduli qanday bo'ladi? (#${qId})`;
    const correct = `G'altakda hosil bo'lgan induksiya EYuK qiymati E_i = ${itm.E} V ga teng bo'ladi`;
    const distractors = [
      `G'altakda hosil bo'lgan induksiya EYuK qiymati E_i = ${itm.E + 100} V ga teng bo'ladi`,
      `G'altakda hosil bo'lgan induksiya EYuK qiymati E_i = ${itm.E - 80} V ga teng bo'ladi`,
      `G'altakda hosil bo'lgan induksiya EYuK qiymati E_i = ${itm.E + 220} V ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Faradey induksiya qonuni (Tursunmetov K.A., Fizika 10-sinf): E_i = -N * (ΔФ / Δt). Moduli |E_i| = ${itm.N} * (${itm.dPhi} / ${itm.dt}) = ${itm.N} * ${itm.dPhi / itm.dt} = ${itm.E} V. Manfiy ishora Lens qoidasini (induksion tok o'zini tug'dirgan sababga qarshi yo'nalishini) bildiradi.`,
      mnemonic: "Faradey qonuni: Oqim qancha tez o'zgarsa induksiya shuncha kuchayar, o'ramlar soni ko'payib EYuK ni oshirar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 14. O'zinduksiya va g'altak energiyasi
  (qId, idx, target) => {
    const list = [
      { L: 0.2, I: 4, W: 1.6 },
      { L: 0.5, I: 2, W: 1.0 },
      { L: 0.1, I: 6, W: 1.8 },
      { L: 0.4, I: 5, W: 5.0 }
    ];
    const itm = list[idx % list.length];
    const q = `Induktivligi L = ${itm.L} Hn (genri) bo'lgan g'altakdan I = ${itm.I} A doimiy tok oqmoqda. Ushbu g'altakning magnit maydonida to'plangan energiya (W) qanchaga teng bo'ladi? (#${qId})`;
    const correct = `G'altak magnit maydoni energiyasi W = ${itm.W} J ga teng bo'ladi`;
    const distractors = [
      `G'altak magnit maydoni energiyasi W = ${(itm.W * 2).toFixed(1)} J ga teng bo'ladi`,
      `G'altak magnit maydoni energiyasi W = ${(itm.W / 2).toFixed(1)} J ga teng bo'ladi`,
      `G'altak magnit maydoni energiyasi W = ${(itm.W + 1.2).toFixed(1)} J ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Magnit maydon energiyasi (Turdiyev N.Sh., Fizika 10-sinf): W = (L * I²) / 2 = (${itm.L} * ${itm.I * itm.I}) / 2 = ${itm.W} J.`,
      mnemonic: "G'altak energiyasi: L ko'paytir I kvadrat bo'lingan ikki — g'altak magnit quvvati shudir aniqki.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  }
];

// Generate exactly 364 questions (IDs 625–988, topicId 179)
createQuestionBankFizika('03_elektrodinamika_asoslari.json', 179, 625, 364, templates);
