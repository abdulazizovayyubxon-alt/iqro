/**
 * examBlueprint — attestatsiya imtihonining RASMIY tuzilishi.
 *
 * Har bo'limdan imtihonda nechta savol tushishi. Manba: Pedagogik mahorat va
 * xalqaro baholash ilmiy-amaliy markazining 2026-yilgi fan spetsifikatsiyalari
 * (`fan/spes/` papkasidagi PDF'lar, III bo'lim «Baholash qamrovi»).
 *
 * NEGA KERAK: `DiagnosticsEngine` ilgari bo'lim og'irligini BAZADAGI savollar
 * sonidan olardi — ya'ni model bizning savol bazamizni imtihon tuzilishi deb
 * qabul qilardi. Bazada tarix bo'limida 3000, tibbiyot bo'limida 400 savol
 * bo'lsa ham, imtihonda ikkalasidan 4 tadan tushishi mumkin. Endi og'irlik
 * rasmiy hujjatdan olinadi.
 *
 * QO'SHIMCHA FOYDA: bu raqamlar STATIK — qurilmaga bog'liq emas. Shuning
 * uchun bulutga yoziladigan `readiness[cat]` har bir o'qituvchida bir xil
 * qoidada hisoblanadi (avval bu «og'irlik bermaslik» bilan ta'minlanardi).
 *
 * ⚠️ TAQSIMLANGAN BAHOLAR: ilovadagi ba'zi bo'limlar spetsifikatsiyaning
 * bitta mazmun sohasini ikkiga bo'ladi (spetsifikatsiya u yerda ichki
 * taqsimot bermaydi). Bunday hollarda soha savollari teng yoki mazmun
 * hajmiga qarab bo'lingan — quyida `~` bilan belgilangan. Har fanning
 * mutaxassislik yig'indisi 35 ta, kasb standarti 5 ta, pedagogik mahorat
 * 10 ta — jami 50 ta bo'lib qoladi.
 *
 * YANGILASH: yangi yil spetsifikatsiyasi chiqqanda shu fayl qayta ko'riladi.
 * Bo'lim raqamlari `mockData.js` dagi TOPICS id'lariga mos.
 */

/** Rasmiy imtihondagi jami savollar soni (barcha fanda bir xil). */
export const EXAM_TOTAL_QUESTIONS = 50;

/**
 * { [topicId]: rasmiy imtihondagi savollar soni }
 * Bo'sh qoldirilgan bo'lim = ma'lumot yo'q (zaxira mantiq ishlaydi).
 */
export const EXAM_BLUEPRINT = {
  // ── CHQBT (0–6) · «ЧҚБТ т.pdf» ────────────────────────────────────────
  0: 8,    // Harbiy xizmat asoslari        (1–8)
  1: 8,    // Umumharbiy nizomlar           (9–16)
  2: 7,    // Otish tayyorgarligi           (17–23)
  3: 4,    // Taktik tayyorgarlik           (24–27)
  4: 4,    // Fuqaro muhofazasi             (28–31)
  5: 4,    // Tibbiy bilim asoslari         (32–35)
  6: 15,   // Pedagogik mahorat + kasb standarti (36–50)

  // ── Tasviriy san'at (7–14) · «Тасвирий санъат ва чизмачилик т.pdf» ────
  7: 10,   // Tasviriy san'at asoslari      (1–10)
  8: 3,    // Amaliy bezak san'ati          (11–13)
  9: 4,    // Me'morlik (14–15) + Miniatyura (16–17)
  10: 3,   // Dizayn (18) + Zamonaviy san'at (19–20)
  11: 7,   // Grafik savodxonlik            (21–27)
  12: 4,   // Mashinasozlik chizmalari      (28–31)
  13: 4,   // Qurilish chizmalari           (32–35)
  14: 15,  // Pedagogik mahorat + kasb standarti

  // ── Tarix (15–22) · «Тарих т.pdf» ─────────────────────────────────────
  15: 5,   // O'zb. qadimgi (1–2) + IV–XIII (3–5)
  16: 4,   // O'zb. XIII–XV                 (6–9)
  17: 3,   // O'zb. XVI–XIX                 (10–12)
  18: 6,   // O'zb. XIX 2-yarmi (13–15) + mustaqillik (16–18)
  19: 9,   // Jahon: qadimgi (19–20) + o'rta asrlar (21–27)
  20: 3,   // Jahon: yangi davr             (28–30)
  21: 5,   // Jahon: eng yangi tarix        (31–35)
  22: 15,  // Pedagogik mahorat + kasb standarti

  // ── Jismoniy tarbiya (23–30) · «Jismoniy tarbiya spets-yasi.pdf» ──────
  23: 2,   // Sport fiziologiyasi va sog'lom turmush (1–2)
  24: 6,   // Gimnastika                    (3–8)
  25: 3,   // Harakatli o'yinlar            (9–11)
  26: 5,   // Yengil atletika (12–15) + suzish (18)
  27: 2,   // Kurash                        (16–17)
  28: 5,   // ~Sport o'yinlari (19–30) dan futbol va voleybol ulushi
  29: 12,  // ~Sport o'yinlari qolgani (basketbol/gandbol/shaxmat) + sport inshootlari (31–35)
  30: 15,  // Pedagogik mahorat + kasb standarti

  // ── Boshlang'ich ta'lim (31–38) · «Бошланғич таълим ўзбек я.pdf» ──────
  31: 4,   // Tildan amaliy foydalanish     (1–4)
  32: 3,   // Til nazariyasi va lingvistik tahlil (5–7)
  33: 9,   // Matnni o'qib tushunish (8–9) + badiiy matn (10–14) + she'riy asarlar (15–16)
  34: 5,   // Sonlar va amallar (17–19) + algebraik mulohaza (20–21)
  35: 4,   // Geometriya (22–23) + ehtimollik va ma'lumotlar (24–25)
  36: 5,   // Quyosh sistemasi (26–27) + hayotiy tizimlar (28–30)
  37: 5,   // Modda (31) + fizik xossalar (32) + tarbiya (33–35)
  38: 15,  // Pedagogik mahorat + kasb standarti

  // ── Informatika va AT (39–46) · «Информатика ва АТ т.pdf» ─────────────
  39: 3,   // Axborot va raqamli savodxonlik asoslari (1–3)
  40: 7,   // Kompyuter tizimlari va dasturiy muhit (4–10)
  41: 4,   // ~Mantiqiy fikrlash va algoritmlash (11–18) dan mantiq/sanoq ulushi
  42: 4,   // ~O'sha sohadan algoritmlash/Scratch ulushi
  43: 8,   // Dasturlash va ma'lumotlar bilan ishlash (19–26)
  44: 5,   // Grafika va veb-texnologiyalar (27–31)
  45: 4,   // Tarmoqlar (32–33) + axborot xavfsizligi va raqamli xizmatlar (34–35)
  46: 15,  // Pedagogik mahorat + kasb standarti

  // ── MTT tarbiyachi (47–54) · «МТТ тарбиячи педагоглари я.pdf» ─────────
  47: 5,   // Tarbiya jarayoni: mazmuni va tamoyillari
  48: 6,   // Tarbiya turlari
  49: 3,   // ~Ta'lim va tarbiya jarayoni (6) dan nutq/sensor ulushi
  50: 3,   // ~O'sha sohadan matematika/tasviriy ulushi
  51: 6,   // O'yin (2) + rivojlantiruvchi muhit (4)
  52: 5,   // Normativ-huquqiy asoslar va tizim talablari
  53: 7,   // Kompetensiyaviy yondashuv (4) + rivojlanishni kuzatish (3)
  54: 15,  // Pedagogik mahorat + kasb standarti

  // ── Ona tili va adabiyot (55–62) · «Она тили ва адабиёт.pdf» ──────────
  55: 5,   // O'qish savodxonligi           (1–5)
  56: 4,   // ~Tildan amaliy foydalanish (6–13) dan imlo/punktuatsiya ulushi
  57: 4,   // ~O'sha sohadan uslubiyat/nutq ulushi
  58: 7,   // Til nazariyasi va lingvistik tahlil (14–20)
  59: 7,   // Badiiy matn tahlili (21–25) + adabiyot nazariyasi (34–35)
  60: 4,   // ~Adabiyot tarixi (26–33) dan milliy adabiyot ulushi
  61: 4,   // ~O'sha sohadan jahon adabiyoti ulushi
  62: 15,  // Pedagogik mahorat + kasb standarti

  // ── MTT rahbar (63–70) · «МТТ директор ўринбосари.pdf» ────────────────
  63: 7,   // Maktabgacha pedagogika asoslari (1–7)
  64: 3,   // ~Ta'lim-tarbiyaviy jarayon metodikasi va metodik rahbarlik (6) dan
  65: 3,   // ~o'sha sohaning ikkinchi yarmi
  66: 7,   // Boshqaruv, pedagogik mahorat va innovatsion faoliyat
  67: 5,   // ~Normativ-huquqiy asoslar (8) dan qonun/DTS/himoya ulushi
  68: 3,   // ~O'sha sohadan kuzatuv kengashi/ekologik/inklyuziv ulushi
  69: 7,   // Rejalashtirish, hujjatchilik, monitoring va ta'lim sifati
  70: 15,  // Pedagogik mahorat + kasb standarti

  // ── Biologiya (80–86) · «Биология т.pdf» ──────────────────────────────
  80: 5,   // Biologiya fani asoslari       (1–5)
  81: 7,   // Hujayra biologiyasi           (6–12)
  82: 10,  // Organizmlar biologiyasi       (13–22)
  83: 8,   // Genetika va evolyutsiya       (23–30)
  84: 5,   // Ekosistema va biosfera        (31–35)
  85: 5,   // Kasb standarti                (36–40)
  86: 10,  // Pedagogik mahorat             (41–50)

  // ── Geografiya (87–96) · «География т.pdf» ────────────────────────────
  87: 5,   // Geografiyaning boshlang'ich kursi (1–5)
  88: 6,   // Materiklar va okeanlar        (6–11)
  89: 5,   // O'rta Osiyo va O'zbekiston tabiiy geografiyasi (12–16)
  90: 5,   // O'zbekiston iqtisodiy va ijtimoiy geografiyasi (17–21)
  91: 6,   // Jahon iqtisodiy va ijtimoiy geografiyasi (22–27)
  92: 2,   // Amaliy geografiya             (28–29)
  93: 3,   // Geografik masala va topshiriqlar (30–32)
  94: 3,   // Grafik materiallar            (33–35)
  95: 5,   // Kasb standarti                (36–40)
  96: 10,  // Pedagogik mahorat             (41–50)

  // ── MTT logoped (97–106) · «МТТ логопедия я.pdf» ──────────────────────
  97: 5,   // Tovush talaffuzi buzilishlari (1–5)
  98: 3,   // Markaziy (neyrogen) nutq buzilishlari (6–8)
  99: 5,   // Motor nutq buzilishlari       (9–13)
  100: 5,  // Nutqning ritm va ravonligi    (14–18)
  101: 5,  // Tovush talaffuzi va ovoz rezonansi (19–23)
  102: 4,  // Nutqning umumiy rivojlanmaganligi (24–27)
  103: 4,  // Yozma nutq buzilishlari       (28–31)
  104: 4,  // O'qish va yozish buzilishlari (32–35)
  105: 5,  // Kasb standarti                (36–40)
  106: 10, // Pedagogik mahorat             (41–50)

  // ── MTT psixolog (107–113) · «МТТ психологлари я.pdf» ─────────────────
  107: 3,  // Psixologiya maqsadi va metodlari (1–3)
  108: 5,  // Oila psixologiyasi            (4–8)
  109: 5,  // Hayotiy davrlar va rivojlanish bosqichlari (9–13)
  110: 4,  // Inklyuziv ta'lim              (14–17)
  111: 18, // Yosh psixologiyasi            (18–35)
  112: 5,  // Kasb standarti                (36–40)
  113: 10, // Pedagogik mahorat             (41–50)

  // ── Kimyo (114–120) · «Кимё т.pdf» ────────────────────────────────────
  114: 13, // Umumiy kimyo                  (1–13)
  115: 7,  // Anorganik kimyo               (14–20)
  116: 6,  // ~Organik kimyo (21–32) dan uglevodorodlar ulushi
  117: 6,  // ~O'sha sohadan kislorodli/azotli birikmalar ulushi
  118: 3,  // Laboratoriya mashg'ulotlari   (33–35)
  119: 5,  // Kasb standarti                (36–40)
  120: 10, // Pedagogik mahorat             (41–50)

  // ── Rus tili (121–128) · «Рус тили миллий я.pdf» ──────────────────────
  121: 6,  // Читательская грамотность      (1–6)
  122: 1,  // Интерпретация произведения искусства (7)
  123: 5,  // Лексика (3) + орфоэпия (1) + состав слова (1)
  124: 9,  // Морфология и орфография (8) + правописание в корне (1)
  125: 9,  // Синтаксис и пунктуация        (22–30)
  126: 5,  // Теория языка и лингвистический анализ (31–35)
  127: 5,  // Kasb standarti                (36–40)
  128: 10, // Pedagogik mahorat             (41–50)

  // ── Ingliz tili (129–136) · «Инглиз тили я.pdf» ───────────────────────
  129: 6,  // Reading: ilmiy-ommabop matn
  130: 5,  // Reading: voqeaband matn
  131: 4,  // Reading: matn yaxlitligi
  132: 7,  // Grammatika
  133: 7,  // Leksika
  134: 6,  // Pragmatika
  135: 5,  // Kasb standarti                (36–40)
  136: 10, // Pedagogik mahorat va ELT      (41–50)

  // ── MTT jismoniy tarbiya (137–145) · «МТТ Жисмония тарбия йўриқчиси.pdf» ──
  137: 3,  // Valeologiya (sog'lom turmush tarzi asoslari) (1–3)
  138: 5,  // Gimnastika turlari va qoidalari              (4–8)
  139: 5,  // Harakatli o'yinlar                           (9–13)
  140: 5,  // Yengil atletika turlari va qoidalari         (14–18)
  141: 3,  // Suzish turlari va qoidalari                  (19–21)
  142: 10, // Sport o'yinlari turlari va qoidalari         (22–31)
  143: 4,  // Sport inshootlari                            (32–35)
  144: 5,  // Kasb standarti                               (36–40)
  145: 10, // Pedagogik mahorat                            (41–50)
};

/**
 * Rasmiy imtihonning OXIRGI BLOKI — kasb standarti (5) + pedagogik mahorat (10).
 *
 * Spetsifikatsiyada bu 15 savol har doim 36–50-o'rinlarda keladi, ya'ni avval
 * 35 ta mutaxassislik savoli, keyin shu blok. Ba'zi fanlarda ikkala qism
 * `mockData.js` da bitta bo'lim (masalan, «Pedagogik mahorat» — 15 savol),
 * ba'zilarida alohida ikki bo'lim («Kasb standarti» 5 + «Pedagogik mahorat» 10).
 *
 * Bo'lim NOMIGA emas, ID'ga tayanamiz: nom tarjima qilinishi yoki
 * o'zgartirilishi mumkin, id esa savol bazasiga bog'langan.
 */
export const PED_BLOCK_TOTAL = 15;

export const PED_BLOCK_TOPIC_IDS = new Set([
  6,          // CHQBT
  14,         // Tasviriy san'at
  22,         // Tarix
  30,         // Jismoniy tarbiya
  38,         // Boshlang'ich ta'lim
  46,         // Informatika va AT
  54,         // MTT tarbiyachi
  62,         // Ona tili va adabiyot
  70,         // MTT rahbar
  85, 86,     // Biologiya
  95, 96,     // Geografiya
  105, 106,   // MTT logoped
  112, 113,   // MTT psixolog
  119, 120,   // Kimyo
  127, 128,   // Rus tili
  135, 136,   // Ingliz tili
  144, 145    // MTT jismoniy tarbiya
]);

/** Bo'lim imtihonning oxirgi 15 talik blokiga kiradimi? */
export const isPedBlockTopic = (topicId) => PED_BLOCK_TOPIC_IDS.has(topicId);

/**
 * Fanning BARCHA bo'limlari uchun rasmiy raqam bormi?
 *
 * Aralashtirib bo'lmaydi: rasmiy raqamlar 2–18 oralig'ida, bazadagi savol
 * soni esa minglab. Bittasi yetishmasa butun fan zaxira mantiqqa o'tadi,
 * aks holda o'sha bo'lim og'irligi yuzlab marta katta chiqib ketardi.
 */
export const hasBlueprint = (topicIds) =>
  topicIds.length > 0 && topicIds.every(id => EXAM_BLUEPRINT[id] > 0);
