import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. MKT asosiy tenglamasi
  (qId, idx, target) => {
    const list = [
      { text: "molekulalar konsentratsiyasi 2 marta orttirilib, o'rtacha kvadratik tezligi 2 marta kamaytirilsa", res: "ideal gaz bosimi 2 marta kamayadi" },
      { text: "molekulalar konsentratsiyasi 3 marta orttirilib, ularning o'rtacha kinetik energiyasi o'zgarmasa", res: "ideal gaz bosimi to'g'ri proporsional 3 marta ortadi" },
      { text: "molekulalarning o'rtacha kvadratik tezligi 3 marta ortib, konsentratsiyasi o'zgarmas saqlansa", res: "ideal gaz bosimi kvadratik bog'liqlikda 9 marta ortadi" },
      { text: "gaz hajmi izotermik ravishda 4 marta siqilib konsentratsiyasi 4 marta oshirilsa", res: "gazning idish devoriga bosimi aynan 4 marta ortadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Molekulyar-kinetik nazariyaning asosiy tenglamasiga (p = 1/3*n*m_0*v² = 2/3*n*E_k) muvofiq, agar ${itm.text}, idishdagi gaz bosimi qanday o'zgaradi? (#${qId})`;
    const correct = `MKT tenglamasi asosida tahlil qilinsa, ${itm.res}`;
    const distractors = [
      `MKT tenglamasi asosida tahlil qilinsa, gaz bosimi hech qanday o'zgarishsiz qat'iy saqlanib qoladi`,
      `MKT tenglamasi asosida tahlil qilinsa, gaz bosimi ko'rsatilgan parametrga teskari tarzda o'zgaradi`,
      `MKT tenglamasi asosida tahlil qilinsa, gaz bosimi har doim faqat haroratga chiziqli bog'liq bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `MKT asosiy tenglamasi (Turdiyev N.Sh., Fizika 10-sinf): p = (1/3)*n*m_0*<v²> = (2/3)*n*<E_k>. Bosim konsentratsiyaga to'g'ri, tezlik kvadratiga to'g'ri proporsionaldir.`,
      mnemonic: "MKT tenglamasi: Bosim bu — molekulalar urishi; konsentratsiya va tezlik kvadratining ko'paytmasi.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 2. O'rtacha kinetik energiya va harorat
  (qId, idx, target) => {
    const list = [
      { T1: 300, T2: 600, n: 2 },
      { T1: 200, T2: 800, n: 4 },
      { T1: 250, T2: 750, n: 3 },
      { T1: 350, T2: 700, n: 2 }
    ];
    const itm = list[idx % list.length];
    const q = `Yopiq idishdagi bir atomli ideal gazning mutlaq harorati T_1 = ${itm.T1} K dan T_2 = ${itm.T2} K gacha qizdirildi. Bunda gaz molekulalarining ilgarilanma harakat o'rtacha kinetik energiyasi (E_k) qanday o'zgaradi? (#${qId})`;
    const correct = `Molekulalarning o'rtacha kinetik energiyasi to'g'ri proporsional ravishda ${itm.n} marta ortadi`;
    const distractors = [
      `Molekulalarning o'rtacha kinetik energiyasi harorat kvadratiga mos holda ${itm.n*itm.n} marta ortadi`,
      `Molekulalarning o'rtacha kinetik energiyasi kvadrat ildiz ostida faqat √${itm.n} marta ortadi`,
      `Molekulalarning o'rtacha kinetik energiyasi o'zgarmas saqlanib faqat molekulalar soni ortadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Molekulalarning kinetik energiyasi (Tursunmetov K.A., Fizika 10-sinf): <E_k> = (3/2)*k*T. Kinetik energiya mutlaq haroratga to'g'ri proporsional. Harorat ${itm.T2}/${itm.T1} = ${itm.n} marta oshgani uchun energiya ham ${itm.n} marta ortadi.`,
      mnemonic: "Harorat va energiya: Mutlaq harorat ortsa shuncha marta o'sar kinetik energiya baravar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 3. Mendeleyev-Klapeyron tenglamasi
  (qId, idx, target) => {
    const list = [
      { m: 32, M: 32, T: 300, V: 0.0249, p: 100000, gaz: "kislorod (O₂)" },
      { m: 4, M: 4, T: 300, V: 0.0249, p: 100000, gaz: "geliy (He)" },
      { m: 28, M: 28, T: 300, V: 0.0249, p: 100000, gaz: "azot (N₂)" },
      { m: 2, M: 2, T: 300, V: 0.0249, p: 100000, gaz: "vodorod (H₂)" }
    ];
    const itm = list[idx % list.length];
    const q = `Idishda massasi m = ${itm.m} g bo'lgan ${itm.gaz} gazi T = ${itm.T} K haroratda va V = 24.9 l (0.0249 m³) hajmda saqlanmoqda. Gazning molyar massasi M = ${itm.M} g/mol va universal gaz doimiysi R = 8.31 J/(mol*K) bo'lsa, gazning idish devoriga ko'rsatadigan bosimi (p) qanchaga teng? (#${qId})`;
    const correct = `Gazning idish devoriga ko'rsatadigan bosimi aynan 100 kPa (10⁵ Pa) ga teng bo'ladi`;
    const distractors = [
      `Gazning idish devoriga ko'rsatadigan bosimi taxminan 200 kPa (2*10⁵ Pa) ga teng bo'ladi`,
      `Gazning idish devoriga ko'rsatadigan bosimi atigi 50 kPa (0.5*10⁵ Pa) ga teng bo'ladi`,
      `Gazning idish devoriga ko'rsatadigan bosimi deyarli 400 kPa (4*10⁵ Pa) ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Mendeleyev-Klapeyron tenglamasi (Turdiyev N.Sh., Fizika 10-sinf): p*V = (m/M)*R*T. Modda miqdori ν = m/M = 1 mol. p = (ν*R*T)/V = (1 * 8.31 * 300) / 0.0249 = 2493 / 0.0249 = 100 000 Pa = 100 kPa.`,
      mnemonic: "Mendeleyev-Klapeyron: pV barobar m bo'lingan M ko'paytirilgan RT — gazlarning bosh shohi tenglama.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 4. Izotermik jarayon (Boyl-Mariott)
  (qId, idx, target) => {
    const list = [
      { p1: 100, V1: 6, V2: 2, p2: 300 },
      { p1: 150, V1: 4, V2: 2, p2: 300 },
      { p1: 200, V1: 8, V2: 4, p2: 400 },
      { p1: 120, V1: 5, V2: 2, p2: 300 }
    ];
    const itm = list[idx % list.length];
    const q = `O'zgarmas haroratda (T = const) saqlanayotgan ideal gazning boshlang'ich bosimi p_1 = ${itm.p1} kPa va hajmi V_1 = ${itm.V1} litr edi. Gaz porshen yordamida izotermik siqilib, uning hajmi V_2 = ${itm.V2} litrga keltirilsa, gazning yangi p_2 bosimi qanday bo'ladi? (#${qId})`;
    const correct = `Izotermik jarayonda gaz bosimi ortib, yangi qiymati ${itm.p2} kPa ga teng bo'ladi`;
    const distractors = [
      `Izotermik jarayonda gaz bosimi kamayib, yangi qiymati ${itm.p2 - 100} kPa ga teng bo'ladi`,
      `Izotermik jarayonda gaz bosimi o'zgarmas qolib, uning qiymati ${itm.p1} kPa bo'ladi`,
      `Izotermik jarayonda gaz bosimi birdaniga sakrab, uning qiymati ${itm.p2 + 200} kPa bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Boyl-Mariott qonuni (Tursunmetov K.A., Fizika 10-sinf): T = const bo'lganda p_1*V_1 = p_2*V_2. Bundan p_2 = (p_1*V_1)/V_2 = (${itm.p1} * ${itm.V1}) / ${itm.V2} = ${itm.p2} kPa.`,
      mnemonic: "Boyl-Mariott: Harorat o'zgarmasa p bilan V ko'paytmasi doimiy turar qotib.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 5. Izobarik jarayon (Gey-Lyussak)
  (qId, idx, target) => {
    const list = [
      { V1: 2, T1: 300, T2: 600, V2: 4 },
      { V1: 3, T1: 250, T2: 500, V2: 6 },
      { V1: 4, T1: 300, T2: 450, V2: 6 },
      { V1: 5, T1: 200, T2: 400, V2: 10 }
    ];
    const itm = list[idx % list.length];
    const q = `O'zgarmas bosimda (p = const) turgan gazning boshlang'ich hajmi V_1 = ${itm.V1} m³ va harorati T_1 = ${itm.T1} K ga teng. Gaz izobarik qizdirilib, harorati T_2 = ${itm.T2} K ga yetkazilganda, uning oxirgi V_2 hajmi qanchaga yetadi? (#${qId})`;
    const correct = `Izobarik qizdirish natijasida gazning oxirgi hajmi ${itm.V2} m³ ga teng bo'ladi`;
    const distractors = [
      `Izobarik qizdirish natijasida gazning oxirgi hajmi ${itm.V2 + 2} m³ ga teng bo'ladi`,
      `Izobarik qizdirish natijasida gazning oxirgi hajmi ${itm.V2 - 1} m³ ga teng bo'ladi`,
      `Izobarik qizdirish natijasida gazning oxirgi hajmi ${itm.V2 + 4} m³ ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Gey-Lyussak qonuni (Turdiyev N.Sh., Fizika 10-sinf): p = const bo'lganda V_1 / T_1 = V_2 / T_2. Shuning uchun V_2 = V_1 * (T_2 / T_1) = ${itm.V1} * (${itm.T2} / ${itm.T1}) = ${itm.V2} m³.`,
      mnemonic: "Gey-Lyussak: Bosim bir xil bo'lganda hajm harorat bilan birga qadam tashlaydi.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 6. Izoxorik jarayon (Sharl)
  (qId, idx, target) => {
    const list = [
      { p1: 100, T1: 250, T2: 500, p2: 200 },
      { p1: 150, T1: 300, T2: 600, p2: 300 },
      { p1: 80, T1: 200, T2: 500, p2: 200 },
      { p1: 120, T1: 300, T2: 450, p2: 180 }
    ];
    const itm = list[idx % list.length];
    const q = `Qattiq berk idishda (V = const) saqlanayotgan gazning boshlang'ich bosimi p_1 = ${itm.p1} kPa va harorati T_1 = ${itm.T1} K edi. Gaz izoxorik qizdirilib, uning harorati T_2 = ${itm.T2} K ga ko'tarilsa, idishdagi oxirgi gaz bosimi p_2 qanday qiymat oladi? (#${qId})`;
    const correct = `Izoxorik jarayon qonuniyatiga ko'ra, oxirgi bosim ${itm.p2} kPa ga teng bo'ladi`;
    const distractors = [
      `Izoxorik jarayon qonuniyatiga ko'ra, oxirgi bosim ${itm.p2 + 80} kPa ga teng bo'ladi`,
      `Izoxorik jarayon qonuniyatiga ko'ra, oxirgi bosim ${itm.p2 - 60} kPa ga teng bo'ladi`,
      `Izoxorik jarayon qonuniyatiga ko'ra, oxirgi bosim ${itm.p2 + 140} kPa ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Sharl qonuni (Tursunmetov K.A., Fizika 10-sinf): V = const bo'lganda p_1 / T_1 = p_2 / T_2. Bundan p_2 = p_1 * (T_2 / T_1) = ${itm.p1} * (${itm.T2} / ${itm.T1}) = ${itm.p2} kPa.`,
      mnemonic: "Sharl qonuni: Hajm o'zgarmas bo'lsa qizdirgan sari bosim mutlaq haroratga ergashur.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 7. Termodinamikaning 1-qonuni
  (qId, idx, target) => {
    const list = [
      { Q: 500, A: 200, dU: 300 },
      { Q: 800, A: 350, dU: 450 },
      { Q: 600, A: 250, dU: 350 },
      { Q: 1000, A: 400, dU: 600 }
    ];
    const itm = list[idx % list.length];
    const q = `Tizimga tashqaridan Q = ${itm.Q} J issiqlik miqdori berildi. Bunda gaz tashqi kuchlarga qarshi A = ${itm.A} J mexanik ish bajardi. Termodinamikaning birinchi qonuniga ko'ra, gazning ichki energiyasining o'zgarishi (ΔU) qanchaga teng bo'ladi? (#${qId})`;
    const correct = `Gaz ichki energiyasining ortishi ΔU = ${itm.dU} J ga teng bo'ladi`;
    const distractors = [
      `Gaz ichki energiyasining ortishi ΔU = ${itm.dU + 150} J ga teng bo'ladi`,
      `Gaz ichki energiyasining ortishi ΔU = ${itm.dU - 120} J ga teng bo'ladi`,
      `Gaz ichki energiyasining ortishi ΔU = ${itm.dU + 250} J ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Termodinamikaning 1-qonuni (Turdiyev N.Sh., Fizika 10-sinf): tizimga berilgan issiqlik uning ichki energiyasini oshirishga va tashqi kuchlarga qarshi ish bajarishga sarflanadi: Q = ΔU + A. Demak, ΔU = Q - A = ${itm.Q} - ${itm.A} = ${itm.dU} J.`,
      mnemonic: "Termodinamika 1-qonuni: Kirgan issiqlik ikkiga bo'linar — bir qismi ichki quvvat, bir qismi ishga aylanar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 8. Adiabatik jarayon xususiyatlari
  (qId, idx, target) => {
    const list = [
      { text: "tashqi muhit bilan mutlaqo issiqlik almashinuvisiz (Q = 0) amalga oshadi", corr: "gaz bajargan ish uning ichki energiyasining kamayishi hisobiga (A = -ΔU) ro'y beradi" },
      { text: "gaz juda tez kengayganda tashqi kuchlarga qarshi ish bajaradi", corr: "tizim ichki energiyasi kamayib, gazning harorati sezilarli darajada soviydi" },
      { text: "tashqi kuchlar gaz ustida musbat ish bajarganda (tez siqilishda)", corr: "gazning ichki energiyasi ortib, uning harorati va bosimi keskin ko'tariladi" },
      { text: "pV diagrammada adiabata grafigi izoterma grafigiga solishtirilganda", corr: "adiabata egri chizig'i izotermaga qaraganda tikroq tushishi bilan farqlanadi" }
    ];
    const itm = list[idx % list.length];
    const q = `Termodinamikada adiabatik jarayon yuz berayotganda, ya'ni agar ${itm.text}, qanday asosiy fizik hodisa kuzatiladi? (#${qId})`;
    const correct = `Termodinamika qonuniga binoan, ${itm.corr}`;
    const distractors = [
      `Termodinamika qonuniga binoan, gaz harorati mutlaqo o'zgarmas holatda saqlanib uning ichki energiyasi butun jarayon davomida doimiy qoladi`,
      `Termodinamika qonuniga binoan, tizimning tashqi kuchlarga qarshi bajargan mexanik ishi har qanday vaziyatda nolga tenglashadi`,
      `Termodinamika qonuniga binoan, butun berilgan tashqi issiqlik miqdori faqat idish devorlarini isitishga sarflanib boshqa ish bajarilmaydi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Adiabatik jarayon (Tursunmetov K.A., Fizika 10-sinf): Q = 0 bo'lgani uchun ΔU + A = 0, ya'ni A = -ΔU. Kengayishda ish ichki energiya hisobiga bajariladi va gaz soviydi. Siqilishda harorat ko'tariladi (masalan, dizel dvigatelida yonilg'i aralashmasining alangasi).`,
      mnemonic: "Adiabata siri: Issiqlik kirmas-chiqmas, kengaysa sovir, qisilsa yonar o'tdek lovullab.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 9. Karno sikli va ideal dvigatel FIK
  (qId, idx, target) => {
    const list = [
      { T_is: 600, T_sov: 300, eta: 50 },
      { T_is: 500, T_sov: 300, eta: 40 },
      { T_is: 800, T_sov: 400, eta: 50 },
      { T_is: 1000, T_sov: 300, eta: 70 }
    ];
    const itm = list[idx % list.length];
    const q = `Ideal issiqlik dvigatelida isitkichning mutlaq harorati T_1 = ${itm.T_is} K, sovutkichning harorati esa T_2 = ${itm.T_sov} K ga teng. Karno sikli bo'yicha ishlaydigan ushbu dvigatelning maksimal foydali ish koeffitsiyenti (FIK, η) necha foizni tashkil etadi? (#${qId})`;
    const correct = `Dvigatelning maksimal foydali ish koeffitsiyenti ${itm.eta}% ga teng bo'ladi`;
    const distractors = [
      `Dvigatelning maksimal foydali ish koeffitsiyenti ${itm.eta + 15}% ga teng bo'ladi`,
      `Dvigatelning maksimal foydali ish koeffitsiyenti ${itm.eta - 15}% ga teng bo'ladi`,
      `Dvigatelning maksimal foydali ish koeffitsiyenti ${itm.eta + 25}% ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Karno formulasi (Turdiyev N.Sh., Fizika 10-sinf): ideal issiqlik mashinasi FIK η = (T_1 - T_2) / T_1 = (${itm.T_is} - ${itm.T_sov}) / ${itm.T_is} = ${itm.eta / 100} = ${itm.eta}%. Real dvigatellarning FIK har doim bu qiymatdan kichik bo'ladi.`,
      mnemonic: "Karno FIK: Isitkichdan sovutkich ayirib isitkichga bo'l, chiqadi ideal mashina qudrati shul.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 10. Jismni isitishda issiqlik miqdori (Q = cmΔT)
  (qId, idx, target) => {
    const list = [
      { m: 2, c: 4200, dT: 10, Q: 84000, modda: "suv" },
      { m: 5, c: 460, dT: 20, Q: 46000, modda: "temir bo'lagi" },
      { m: 3, c: 920, dT: 15, Q: 41400, modda: "alyuminiy quyma" },
      { m: 4, c: 380, dT: 25, Q: 38000, modda: "mis plastinka" }
    ];
    const itm = list[idx % list.length];
    const q = `Massasi m = ${itm.m} kg bo'lgan ${itm.modda} haroratini ΔT = ${itm.dT} °C ga qizdirish uchun qancha issiqlik miqdori sarflanadi (moddaning solishtirma issiqlik sig'imi c = ${itm.c} J/(kg*°C))? (#${qId})`;
    const correct = `Moddani isitish uchun sarflanadigan issiqlik miqdori ${itm.Q / 1000} kJ (${itm.Q} J) ga teng`;
    const distractors = [
      `Moddani isitish uchun sarflanadigan issiqlik miqdori ${(itm.Q + 12000) / 1000} kJ ga teng`,
      `Moddani isitish uchun sarflanadigan issiqlik miqdori ${(itm.Q - 14000) / 1000} kJ ga teng`,
      `Moddani isitish uchun sarflanadigan issiqlik miqdori ${(itm.Q + 28000) / 1000} kJ ga teng`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Isitish issiqligi formulasi (Chernoutsan A.I., Fizikadan masalalar to'plami): Q = c * m * ΔT = ${itm.c} * ${itm.m} * ${itm.dT} = ${itm.Q} J = ${itm.Q / 1000} kJ.`,
      mnemonic: "Isitish qoidasi: c ko'paytir m ko'paytir delta T — isitish sarfi topilar oson va tezki.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 11. Erish va qotish (Q = λm)
  (qId, idx, target) => {
    const list = [
      { m: 2, lambda: 334000, Q: 668, modda: "0°C dagi muzni" },
      { m: 0.5, lambda: 334000, Q: 167, modda: "0°C dagi qorni" },
      { m: 3, lambda: 205000, Q: 615, modda: "erish haroratidagi misni" },
      { m: 10, lambda: 25000, Q: 250, modda: "erish haroratidagi qo'rg'oshinni" }
    ];
    const itm = list[idx % list.length];
    const q = `Massasi m = ${itm.m} kg bo'lgan ${itm.modda} to'liq eritish uchun qancha issiqlik miqdori talab etiladi (moddaning solishtirma erish issiqligi λ = ${itm.lambda} J/kg)? (#${qId})`;
    const correct = `Moddani to'liq eritish uchun ${itm.Q} kJ (${itm.Q * 1000} J) issiqlik talab etiladi`;
    const distractors = [
      `Moddani to'liq eritish uchun ${itm.Q + 120} kJ (${(itm.Q + 120) * 1000} J) issiqlik talab etiladi`,
      `Moddani to'liq eritish uchun ${itm.Q - 90} kJ (${(itm.Q - 90) * 1000} J) issiqlik talab etiladi`,
      `Moddani to'liq eritish uchun ${itm.Q + 240} kJ (${(itm.Q + 240) * 1000} J) issiqlik talab etiladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Faza o'tishi va erish issiqligi (Turdiyev N.Sh., Fizika 10-sinf): erish haroratidagi jismni eritish uchun sarflanadigan issiqlik Q = λ * m = ${itm.lambda} * ${itm.m} = ${itm.Q * 1000} J = ${itm.Q} kJ. Erish davomida harorat o'zgarmaydi.`,
      mnemonic: "Erish siri: Q barobar lyambda m — kristall panjara buzilar, ammo harorat qo'zg'almas eriguncha tamom.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 12. Havoning nisbiy namligi
  (qId, idx, target) => {
    const list = [
      { p: 1.2, p0: 2.4, phi: 50 },
      { p: 1.8, p0: 2.4, phi: 75 },
      { p: 1.6, p0: 2.0, phi: 80 },
      { p: 1.5, p0: 2.5, phi: 60 }
    ];
    const itm = list[idx % list.length];
    const q = `Xonadagi suv bug'ining partsial bosimi p = ${itm.p} kPa ga, shu haroratdagi to'yingan suv bug'ining bosimi esa p_0 = ${itm.p0} kPa ga teng. Xonadagi havoning nisbiy namligi (φ) necha foizni tashkil qiladi? (#${qId})`;
    const correct = `Havoning nisbiy namligi φ = ${itm.phi}% ga teng bo'ladi`;
    const distractors = [
      `Havoning nisbiy namligi φ = ${itm.phi + 15}% ga teng bo'ladi`,
      `Havoning nisbiy namligi φ = ${itm.phi - 20}% ga teng bo'ladi`,
      `Havoning nisbiy namligi φ = ${itm.phi + 25}% ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Havoning nisbiy namligi (Toshxonova, Mexanika va molekulyar fizika praktikum): φ = (p / p_0) * 100% = (${itm.p} / ${itm.p0}) * 100% = ${itm.phi}%. Nisbiy namlik 100% ga yetganda bug' to'yingan holatga keladi va shudring tusha boshlaydi.`,
      mnemonic: "Nisbiy namlik: Partsial bosimni to'yinganiga bo'l, yuzga ko'paytirib foizini ko'r.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 13. Sirt taranglik kuchi
  (qId, idx, target) => {
    const list = [
      { sigma: 0.073, L: 0.2, F: 0.0146, text: "suv yuzasida suzib yurgan L = 0.2 m uzunlikdagi simga" },
      { sigma: 0.04, L: 0.1, F: 0.004, text: "sovun pardasidagi L = 0.1 m uzunlikdagi harakatchan to'siqqa" },
      { sigma: 0.073, L: 0.1, F: 0.0073, text: "suvga botirilgan L = 0.1 m li yupqa plastinka qirrasiga" },
      { sigma: 0.022, L: 0.2, F: 0.0044, text: "spirt yuzasidagi L = 0.2 m li chiziq bo'ylab" }
    ];
    const itm = list[idx % list.length];
    const q = `Sirt taranglik koeffitsiyenti σ = ${itm.sigma} N/m bo'lgan suyuqlikda ${itm.text} ta'sir qiluvchi sirt taranglik kuchi (F_sirt = σ*L) qanday qiymatga ega bo'ladi? (#${qId})`;
    const correct = `Sirt taranglik kuchining qiymati aynan ${itm.F} N ga teng bo'ladi`;
    const distractors = [
      `Sirt taranglik kuchining qiymati taxminan ${(itm.F * 2).toFixed(4)} N ga teng bo'ladi`,
      `Sirt taranglik kuchining qiymati atigi ${(itm.F / 2).toFixed(4)} N ga teng bo'ladi`,
      `Sirt taranglik kuchining qiymati deyarli ${(itm.F * 1.5).toFixed(4)} N ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Sirt taranglik hodisasi (Tursunmetov K.A., Fizika 10-sinf): sirt taranglik kuchi F = σ * L = ${itm.sigma} * ${itm.L} = ${itm.F} N. Sirt taranglik suyuqlik erkin sirtini minimal holatga keltirishga intiladi (tomchilarning sharsimon bo'lishi).`,
      mnemonic: "Sirt taranglik: sigma ko'paytir L — sirtni siqib parda tortar, tomchini sharga aylantirar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  }
];

// Generate exactly 260 questions (IDs 365–624, topicId 178)
createQuestionBankFizika('02_molekulyar_fizika_va_issiqlik.json', 178, 365, 260, templates);
