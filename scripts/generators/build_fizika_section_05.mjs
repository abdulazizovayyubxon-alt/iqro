import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. Yorug'likning qaytishi va tekis ko'zgu
  (qId, idx, target) => {
    const list = [
      { alpha: 30, beta: 30, burchak: 60 },
      { alpha: 45, beta: 45, burchak: 90 },
      { alpha: 60, beta: 60, burchak: 120 },
      { alpha: 20, beta: 20, burchak: 40 }
    ];
    const itm = list[idx % list.length];
    const q = `Tekis ko'zguga tushayotgan yorug'lik nuri bilan sirtga o'tkazilgan perpendikulyar (normal) orasidagi tushish burchagi α = ${itm.alpha}° ga teng. Yorug'likning qaytish burchagi (β) va tushayotgan nur bilan qaytgan nur orasidagi umumiy burchak qanday bo'ladi? (#${qId})`;
    const correct = `Qaytish burchagi ${itm.beta}° ga, nurlar orasidagi umumiy burchak esa ${itm.burchak}° ga teng bo'ladi`;
    const distractors = [
      `Qaytish burchagi ${itm.beta + 15}° ga, nurlar orasidagi umumiy burchak esa ${itm.burchak - 10}° ga teng bo'ladi`,
      `Qaytish burchagi ${itm.beta - 10}° ga, nurlar orasidagi umumiy burchak esa ${itm.burchak + 20}° ga teng bo'ladi`,
      `Qaytish burchagi ${itm.beta + 20}° ga, nurlar orasidagi umumiy burchak esa ${itm.burchak + 30}° ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yorug'likning qaytish qonuni (Begimqulov, Fizika 11-sinf): tushish burchagi qaytish burchagiga teng: α = β = ${itm.alpha}°. Tushgan va qaytgan nurlar orasidagi umumiy burchak γ = α + β = 2α = ${itm.burchak}° dir.`,
      mnemonic: "Qaytish qonuni: Tushgan burchak qaytganga tengdir mudom, normal bilan o'lchanur burchak tamom.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 2. Sinish qonuni (Snellius)
  (qId, idx, target) => {
    const list = [
      { muhit1: "havodan", muhit2: "shishaga (n = 1.5)", tezlik: "1.5 marta kamayadi, nur normalga qarab og'adi" },
      { muhit1: "suvdan (n = 1.33)", muhit2: "havoga", tezlik: "ortadi, nur normaldan uzoqlashadi" },
      { muhit1: "havodan", muhit2: "olmosga (n = 2.42)", tezlik: "2.42 marta keskin kamayadi, nur normalga kuchli yaqinlashadi" },
      { muhit1: "shishadan", muhit2: "suvga", tezlik: "ortadi, nur normaldan qisman uzoqlashadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Yorug'lik nuri optik zichligi turlicha bo'lgan ikki shaffof muhit chegarasidan, ya'ni ${itm.muhit1} ${itm.muhit2} o'tganda, sinish qonuniga (Snellius qonuni) ko'ra yorug'lik tezligi va nurning og'ishi qanday bo'ladi? (#${qId})`;
    const correct = `Optika qonuniga muvofiq, yorug'lik tezligi ${itm.tezlik}`;
    const distractors = [
      `Optika qonuniga muvofiq, yorug'lik tezligi mutlaqo o'zgarmaydi va nurning yo'nalishi to'g'ri chiziqli qoladi`,
      `Optika qonuniga muvofiq, yorug'lik chastotasi ikki barobar ortib fotonlar massasi ko'payadi`,
      `Optika qonuniga muvofiq, yorug'lik nuri butunlay to'xtab muhit chegarasida to'liq yutilib ketadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Sinish qonuni (Turdiyev N.Sh., Fizika 11-sinf): sinα / sinβ = n_2 / n_1 = v_1 / v_2. Optik zichroq muhitga (n kattaroq) o'tganda tezlik kamayadi va nur normalga yaqinlashadi (sinish burchagi kichiklashadi). Chastota o'zgarmaydi.`,
      mnemonic: "Sinish qonuni: Zich muhitda nur sekinlab normalga qarab egilar, siyrak muhitga chiqqanda esa erkin kengayib ketilar.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 3. To'la ichki qaytish va optik tolalar
  (qId, idx, target) => {
    const list = [
      { text: "nur optik zichroq muhitdan optik siyrakroq muhitga (masalan, shishadan havoga) o'tayotganda", shart: "tushish burchagi chegaraviy burchakdan katta (α > α_0) bo'lishi talab etiladi" },
      { text: "zamonaviy yuqori tezlikdagi internet optik tolali aloqa kabellarida signal uzatishda", shart: "yorug'lik tola devorlaridan ketma-ket to'la ichki qaytishi hisobiga signal yo'qotishsiz uzatiladi" },
      { text: "suv-havo chegarasida to'la ichki qaytishning chegaraviy burchagi hisoblanganda", shart: "sinα_0 = 1/n formulaga asosan suv uchun chegaraviy burchak taxminan 48.6° ga teng bo'ladi" },
      { text: "olmosning yorug'likda nihoyatda chiroyli jilolanishi va tovlanishining asosiy sababi", shart: "olmosning sindirish ko'rsatkichi juda katta (n ≈ 2.42) bo'lib to'la ichki qaytish burchagi kichikligidadir" }
    ];
    const itm = list[idx % list.length];
    const q = `Geometrik va to'lqin optikasida to'la ichki qaytish hodisasiga oid holatda, agar ${itm.text}, qanday qonuniyat o'rinli bo'ladi? (#${qId})`;
    const correct = `To'la ichki qaytish qonuniga binoan, ${itm.shart}`;
    const distractors = [
      `To'la ichki qaytish qonuniga binoan, yorug'lik nuri faqat vertikal tushgandagina to'la ichki qaytish yuz beradi`,
      `To'la ichki qaytish qonuniga binoan, sinish burchagi doimo nolga tenglashib nur butunlay so'nib qoladi`,
      `To'la ichki qaytish qonuniga binoan, barcha to'lqinlar fazoda tarqalish o'rniga faqat issiqlikka aylanadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `To'la ichki qaytish (Olmasova, Optika, atom va yadro fizikasi): nur zich muhitdan siyrak muhitga o'tayotganda tushish burchagi sinα_0 = n_2/n_1 shartni qanoatlantirsa, ikkinchi muhitga nur o'tmaydi va 100% qaytadi. Bu optik tolali aloqa asosidir.`,
      mnemonic: "To'la ichki qaytish: Zichdan siyrakka o'tsa nur, chegaraviy burchakdan oshsa to'la qaytish hosil bo'lur.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 4. Yupqa linza formulasi va optik kuch
  (qId, idx, target) => {
    const list = [
      { F: 0.2, D: 5 },
      { F: 0.5, D: 2 },
      { F: 0.1, D: 10 },
      { F: 0.25, D: 4 }
    ];
    const itm = list[idx % list.length];
    const q = `Yig'uvchi yupqa shisha linzaning fokus masofasi F = ${itm.F} m ga teng. Ushbu linzaning optik kuchi (D) qancha dioptriyani tashkil etadi? (#${qId})`;
    const correct = `Linzaning optik kuchi D = +${itm.D} dptr (dioptriya) ga teng bo'ladi`;
    const distractors = [
      `Linzaning optik kuchi D = +${itm.D * 2} dptr ga teng bo'ladi`,
      `Linzaning optik kuchi D = -${itm.D} dptr ga teng bo'ladi`,
      `Linzaning optik kuchi D = +${(itm.D / 2).toFixed(1)} dptr ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Optik kuch formulasi (Turdiyev N.Sh., Fizika 11-sinf): linzaning optik kuchi D = 1 / F = 1 / ${itm.F} = +${itm.D} dptr. Yig'uvchi linzada D > 0, sochuvchi linzada D < 0 bo'ladi.`,
      mnemonic: "Optik kuch: D barobar bir bo'lingan F — fokus metrda o'lchanur, natija dioptriya deb atalur.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 5. Yig'uvchi linzada tasvir hosil bo'lishi
  (qId, idx, target) => {
    const list = [
      { joy: "d > 2F (ikkilangan fokusdan tashqarida)", tasvir: "haqiqiy, to'ntarilgan va kichraygan tasvir hosil bo'ladi (fotoapparat prinsipi)" },
      { joy: "d = 2F (aynan ikkilangan fokus ustida)", tasvir: "haqiqiy, to'ntarilgan va buyumning o'ziga teng o'lchamdagi tasvir olinadi" },
      { joy: "F < d < 2F (fokus bilan ikkilangan fokus orasida)", tasvir: "haqiqiy, to'ntarilgan va kattalashtirilgan tasvir hosil bo'ladi (proyektor prinsipi)" },
      { joy: "d < F (linza bilan bosh fokus orasida)", tasvir: "mavhum, to'g'ri va kattalashtirilgan tasvir hosil bo'ladi (lupa prinsipi)" }
    ];
    const itm = list[idx % list.length];
    const q = `Yig'uvchi linza bosh optik o'qida yorug'lik manbai (buyum) ${itm.joy} joylashtirilsa, linzada qanday tasvir hosil bo'ladi? (#${qId})`;
    const correct = `Geometrik optika qoidasiga ko'ra, ${itm.tasvir}`;
    const distractors = [
      `Geometrik optika qoidasiga ko'ra, har doim faqat mavhum va cheksiz kichraygan tasvir yuzaga keladi`,
      `Geometrik optika qoidasiga ko'ra, tasvir linzaning ichida qolib ekranda hech narsa ko'rinmaydi`,
      `Geometrik optika qoidasiga ko'ra, tasvir o'lchami buyum masofasiga mutlaqo bog'liq bo'lmasdan bir xil qoladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Linzada tasvir yasash (Turdiyev N.Sh., Fizika 11-sinf): 1/F = 1/d + 1/f formulaga asosan d > 2F bo'lsa f < 2F (kichraygan); d = 2F bo'lsa f = 2F (teng); F < d < 2F bo'lsa f > 2F (kattalashgan); d < F bo'lsa f < 0 (mavhum, to'g'ri, lupa).`,
      mnemonic: "Linzada tasvir: Ikkilangan fokusdan narida kichrayar, fokus ichiga kirsang lupa bo'lib kattarar.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 6. Linzada chiziqli kattalashtirish
  (qId, idx, target) => {
    const list = [
      { d: 0.3, f: 0.6, Gamma: 2 },
      { d: 0.2, f: 0.8, Gamma: 4 },
      { d: 0.4, f: 1.2, Gamma: 3 },
      { d: 0.5, f: 0.5, Gamma: 1 }
    ];
    const itm = list[idx % list.length];
    const q = `Yupqa yig'uvchi linzadan buyumgacha bo'lgan masofa d = ${itm.d} m, hosil bo'lgan haqiqiy tasvirgacha bo'lgan masofa esa f = ${itm.f} m ga teng. Linzaning chiziqli kattalashtirishi (Γ) qanchaga teng? (#${qId})`;
    const correct = `Linzaning chiziqli kattalashtirishi Γ = ${itm.Gamma} ga teng bo'ladi`;
    const distractors = [
      `Linzaning chiziqli kattalashtirishi Γ = ${itm.Gamma + 2} ga teng bo'ladi`,
      `Linzaning chiziqli kattalashtirishi Γ = ${(itm.Gamma / 2).toFixed(1)} ga teng bo'ladi`,
      `Linzaning chiziqli kattalashtirishi Γ = ${itm.Gamma + 1.5} ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Linzaning kattalashtirishi (Chernoutsan A.I., Fizikadan masalalar to'plami): chiziqli kattalashtirish Γ = f / d = H / h = ${itm.f} / ${itm.d} = ${itm.Gamma}. Bu tasvir balandligi buyum balandligidan ${itm.Gamma} marta katta ekanligini bildiradi.`,
      mnemonic: "Kattalashtirish: f bo'lingan d — tasvir masofasini buyum masofasiga bo'lsang kattalashtirish unar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 7. Ko'rish nuqsonlari va ularni tuzatish
  (qId, idx, target) => {
    const list = [
      { nuqson: "yaqindan ko'rish (miopiya) nuqsonida tasvir to'r parda oldida hosil bo'ladi", tuzatish: "sochuvchi (manfiy optik kuchli, D < 0) linzali ko'zoynak taqish tavsiya etiladi" },
      { nuqson: "uzoqdan ko'rish (gipermetropiya) nuqsonida tasvir to'r parda orqasida hosil bo'ladi", tuzatish: "yig'uvchi (musbat optik kuchli, D > 0) linzali ko'zoynak taqish tavsiya etiladi" },
      { nuqson: "normal ko'z uchun eng yaxshi ko'rish masofasi d_0", tuzatish: "taxminan 25 cm (0.25 m) ga teng deb qabul qilingan" },
      { nuqson: "ko'z gavharining egrilik radiusini o'zgartirib turli masofadagi buyumlarni aniq ko'rish xususiyati", tuzatish: "ko'zning akkomodatsiyasi deb ataladi" }
    ];
    const itm = list[idx % list.length];
    const q = `Odam ko'zining optik tuzilishi va ko'rish nuqsonlari biologik-fizik tahliliga ko'ra, agar ${itm.nuqson}, qanday tibbiy-fizik qoida qo'llaniladi? (#${qId})`;
    const correct = `Fizik qoidaga muvofiq, ${itm.tuzatish}`;
    const distractors = [
      `Fizik qoidaga muvofiq, ko'zoynak taqish taqiqlanib faqat tekis ko'zgudan foydalanish buyuriladi`,
      `Fizik qoidaga muvofiq, nur intensivligini cheksiz oshiruvchi prizmalar o'rnatilishi lozim`,
      `Fizik qoidaga muvofiq, ko'z gavharining optik kuchini nolga tushirish talab qilinadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Ko'z optikasi (Turdiyev N.Sh., Fizika 11-sinf): miopiyada ko'zning optik kuchi ortiqcha bo'lib tasvir to'r parda oldiga tushadi, uni sochuvchi linza (D < 0) orqaga suradi. Gipermetropiyada esa yig'uvchi linza (D > 0) nurlarni to'r pardaga yig'adi.`,
      mnemonic: "Ko'zoynak siri: Yaqindan ko'rarga sochuvchi dori, uzoqdan ko'rarga yig'uvchi linza yori.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 8. Yorug'lik dispersiyasi
  (qId, idx, target) => {
    const list = [
      { text: "oq yorug'lik shisha prizmadan o'tganda rangdor spektrga ajralishi", res: "shishaning sindirish ko'rsatkichi yorug'lik to'lqin uzunligiga (chastotasiga) bog'liqligi sabablidir" },
      { text: "spektrda eng ko'p og'uvchi qism binafsha nurlar ekanligi", res: "binafsha nurning chastotasi eng katta, shisha muhitidagi tarqalish tezligi eng kichikligidandir" },
      { text: "spektrda eng kam og'uvchi qism qizil nurlar ekanligi", res: "qizil nurning to'lqin uzunligi eng uzun bo'lib muhitdagi sindirish ko'rsatkichi eng kichikligidandir" },
      { text: "tabiatda yomg'irdan keyin kamalak hosil bo'lishi", res: "quyosh nurining suv tomchilarida sinishi, to'la ichki qaytishi va dispersiyalanishi natijasidir" }
    ];
    const itm = list[idx % list.length];
    const q = `Nyuton tomonidan kashf etilgan yorug'lik dispersiyasi hodisasi tahlil qilinganda, agar ${itm.text}, buning asosiy fizik sababi nima? (#${qId})`;
    const correct = `Dispersiya qonuniyatiga ko'ra, ${itm.res}`;
    const distractors = [
      `Dispersiya qonuniyatiga ko'ra, oq nur fotonlarining massasi shisha prizmada kimyoviy parchalanishga uchrab yangi ranglar hosil qiladi`,
      `Dispersiya qonuniyatiga ko'ra, faqat prizma shishasining bo'yoq moddalari yorug'lik nurlariga o'tib qolishi hisobiga spektr yuzaga keladi`,
      `Dispersiya qonuniyatiga ko'ra, havoning harorati prizma ichida keskin sovib ketishi va bosimning o'zgarishi bilan to'liq izohlanadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yorug'lik dispersiyasi (Olmasova, Optika): n = f(λ). Qizil nur uchun to'lqin uzunligi eng katta (λ ≈ 760 nm), sindirish ko'rsatkichi n eng kichik va og'ish minimal. Binafsha nur uchun (λ ≈ 400 nm) n eng katta, og'ish maksimaldir.`,
      mnemonic: "Dispersiya: Qizildan binafshagacha yetti rang kamalak, to'lqin uzunligi kamaygan sari og'ish oshar behad tezrak.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 9. Interferensiya shartlari
  (qId, idx, target) => {
    const list = [
      { shart: "optik yo'llar farqi to'lqin uzunligining butun soniga teng bo'lsa (Δd = k*λ)", natija: "tebranishlar bir xil fazada qo'shilib interferensiya maksimumi (yorug' yo'l) hosil bo'ladi" },
      { shart: "optik yo'llar farqi yarim to'lqin uzunligining toq soniga teng bo'lsa (Δd = (2k+1)*λ/2)", natija: "tebranishlar qarama-qarshi fazada kelib bir-birini so'ndiradi va interferensiya minimumi (qora yo'l) yuzaga keladi" },
      { shart: "interferensiya manbalari kogerent bo'lishi uchun", natija: "manbalarning chastotasi bir xil va fazalar farqi vaqt o'tishi bilan o'zgarmas bo'lishi shart" },
      { shart: "sovun pufaklarida va suv ustidagi neft dog'larida kamalakdek tovlanish", shart_nom: "yupqa shaffof pardalarning ustki va pastki sirtidan qaytgan nurlar interferensiyasi natijasidir" }
    ];
    const itm = list[idx % list.length];
    const q = `To'lqin optikasida kogerent yorug'lik to'lqinlarining interferensiyasi hodisasiga ko'ra, agar ${itm.shart}, qanday muhim natija o'rinli bo'ladi? (#${qId})`;
    const correct = `Interferensiya qonuniga binoan, ${itm.natija || itm.shart_nom}`;
    const distractors = [
      `Interferensiya qonuniga binoan, to'lqinlar bir-biriga urilib geometrik optika qonunlarini butunlay yo'q qiladi`,
      `Interferensiya qonuniga binoan, yorug'lik tezligi vakuumdagidan ham yuqori qiymatga sakrab o'tib ketadi`,
      `Interferensiya qonuniga binoan, har qanday ikki chiroq nuri qo'shilganda har doim qorong'ilik paydo bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Interferensiya (Turdiyev N.Sh., Fizika 11-sinf): kogerent to'lqinlar qo'shilganda: maksimum sharti Δd = k*λ (k = 0, 1, 2...), minimum sharti Δd = (2k+1)*λ/2. Barqaror manzara faqat kogerent to'lqinlarda hosil bo'ladi.`,
      mnemonic: "Interferensiya: Butun to'lqin kelsa yorug'lik porlar, yarim to'lqin toq kelsa qorong'i so'ndirar.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 10. Difraksion panjara
  (qId, idx, target) => {
    const list = [
      { d: 2e-6, k: 1, lambda: 500e-9, sin_phi: 0.25 },
      { d: 4e-6, k: 2, lambda: 500e-9, sin_phi: 0.25 },
      { d: 2e-6, k: 2, lambda: 600e-9, sin_phi: 0.6 },
      { d: 1e-6, k: 1, lambda: 500e-9, sin_phi: 0.5 }
    ];
    const itm = list[idx % list.length];
    const q = `Panjara doimiysi d = ${itm.d * 1e6} μm (mikrometr) bo'lgan difraksion panjaraga to'lqin uzunligi λ = ${itm.lambda * 1e9} nm bo'lgan monoxromatik yorug'lik nuri tik tushmoqda. Difraksion panjara formulasiga (d*sinφ = k*λ) ko'ra, k = ${itm.k}-tartibli difraksiya bosh maksimumi kuzatiladigan burchak sinusi (sinφ) qanchaga teng? (#${qId})`;
    const correct = `Bosh maksimum kuzatiladigan burchak sinusi sinφ = ${itm.sin_phi} ga teng bo'ladi`;
    const distractors = [
      `Bosh maksimum kuzatiladigan burchak sinusi sinφ = ${(itm.sin_phi * 2).toFixed(2)} ga teng bo'ladi`,
      `Bosh maksimum kuzatiladigan burchak sinusi sinφ = ${(itm.sin_phi / 2).toFixed(3)} ga teng bo'ladi`,
      `Bosh maksimum kuzatiladigan burchak sinusi sinφ = ${(itm.sin_phi + 0.35).toFixed(2)} ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Difraksion panjara (Turdiyev N.Sh., Fizika 11-sinf): d * sinφ = k * λ formulaga asosan sinφ = (k * λ) / d = (${itm.k} * ${itm.lambda}) / ${itm.d} = ${itm.sin_phi}. Maksimal tartib k_max ≤ d / λ.`,
      mnemonic: "Difraksion panjara: d sin phi barobar k lambda — panjara orqali nur o'tib chiroyli spektr taratar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  }
];

// Generate exactly 260 questions (IDs 1249–1508, topicId 181)
createQuestionBankFizika('05_optika.json', 181, 1249, 260, templates);
