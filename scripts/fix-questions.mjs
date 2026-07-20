#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// fix-questions.mjs — Savollar bazasini LLM bilan korrektura qilish.
//
// Har bir fanning savollarini 15 tadan batch qilib LLM'ga yuboradi,
// imloviy/terminologik tuzatish patch'larini oladi, qattiq validatsiyadan
// o'tkazib faylga merge qiladi va o'zgarishlar hisobotini yozadi.
//
// PROVIDERLAR (.env dan avtomatik tanlanadi):
//   • pipeline — Cerebras (PIPELINE_API_BASE/KEY/MODEL, kalitlar vergul bilan,
//     429 bo'lsa keyingi kalitga o'zi o'tadi). Standart: shu.
//   • gemini   — agar GEMINI_API_KEY "AIza" bilan boshlansa (Google Search
//     grounding bilan). --provider gemini deb majburlash ham mumkin.
//
// IKKI BOSQICHLI TEKSHIRUV (pipeline'da standart yoqilgan):
//   Har batch 2 marta yuboriladi; faqat IKKALA natijada ham aynan bir xil
//   chiqqan tuzatishlar qabul qilinadi. Farqlilar hisobotga "qo'lda ko'ring"
//   bo'lib tushadi. O'chirish: --single
//
// FOYDALANISH:
//   node scripts/fix-questions.mjs chqbt --fs             # FIRESTORE'dagi jonli bazani tekshirish (asosiy rejim!)
//   node scripts/fix-questions.mjs chqbt --fs --dry-run   # Firestore o'qiladi, lekin yozilmaydi
//   node scripts/fix-questions.mjs chqbt                  # lokal src/data/questions_chqbt.json
//   node scripts/fix-questions.mjs chqbt --limit 2        # faqat dastlabki 2 batch (sinov)
//   node scripts/fix-questions.mjs tarix --fs --single    # har batch 1 marta (tezroq)
//
// FIRESTORE REJIMI (--fs):
//   .env dagi ADMIN_EMAIL/ADMIN_PASSWORD bilan kiradi, 'questions'
//   kolleksiyasidan category==<fan> hujjatlarni oladi, tekshiradi va
//   TUZATILGANLARINI JOYIDA yangilaydi (hujjat ID o'zgarmaydi, faqat
//   q/opts/explanation maydonlari). Yozishdan oldin to'liq zaxira dump
//   src/data/firestore_backup_<fan>_<vaqt>.json ga saqlanadi.
//
// OPSIYALAR:
//   --provider <pipeline|gemini>  Majburiy provider tanlash
//   --model <nom>   Model nomi (standart: .env'dagi PIPELINE_API_MODEL)
//   --batch <N>     Batch hajmi (standart: 15, oshirish tavsiya etilmaydi)
//   --delay <ms>    Batchlar orasidagi pauza (standart: pipeline 800, gemini 2000)
//   --limit <N>     Faqat N ta batch (sinov uchun)
//   --dry-run       Savollar fayliga yozmaydi (hisobot baribir yoziladi)
//   --single        Ikki bosqichli tekshiruvni o'chiradi
//   --fresh         Oldingi checkpoint'ni tashlab, boshidan boshlaydi
//
// Xavfsizlik kafolatlari:
//   • "correct", "topicId", "category" maydonlari API'ga umuman yuborilmaydi —
//     jismonan buzilishi mumkin emas.
//   • Variantlar soni yoki harf prefiksi ("A)") o'zgargan patch rad etiladi.
//   • Ishga tushishda avtomatik .bak zaxira nusxa yaratiladi.
//   • Checkpoint fayli bor — uzilib qolsa, qayta ishga tushirilganda davom etadi.
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// ── Fan → rasmiy manbalar xaritasi ────────────────────────────────────────
// Yangi fan qo'shganda shu yerga manbalar blokini yozing.
const FAN_SOURCES = {
  chqbt: {
    title: "CHQBT (Chaqiruvga qadar boshlang'ich tayyorgarlik / harbiy tayyorgarlik)",
    sources: [
      "O'zbekiston Respublikasi Qurolli Kuchlarining Ichki xizmat nizomi",
      "Garnizon va qorovul xizmatlari nizomi",
      "Intizomiy nizom va Safar nizomi",
      "\"Harbiy majburiyat va harbiy xizmat to'g'risida\"gi O'zbekiston Respublikasi qonuni",
      "O'zbekiston Respublikasi Konstitutsiyasi (2023-yilgi yangi tahriri)",
      "Amaldagi CHQBT maktab darsligi (10–11-sinf)",
    ],
  },
  tarix: {
    title: "O'zbekiston tarixi va Jahon tarixi",
    sources: [
      "O'zbekiston tarixi akademik nashrlari (O'zR FA Tarix instituti)",
      "Amaldagi 5–11-sinf Tarix darsliklari",
      "O'zbekiston milliy ensiklopediyasi",
      "Tarixiy shaxslar va joy nomlarining rasmiy o'zbekcha yozilishi",
    ],
  },
  ona_tili: {
    title: "Ona tili (o'zbek tili va adabiyoti)",
    sources: [
      "\"O'zbek tilining imlo lug'ati\" (amaldagi rasmiy nashr)",
      "O'zbek tilining izohli lug'ati",
      "Amaldagi 5–11-sinf Ona tili darsliklari",
      "O'zbek tili grammatikasi akademik nashrlari",
    ],
  },
  til: {
    title: "Ona tili va adabiyot (o'zbek tili)",
    sources: [
      "\"O'zbek tilining imlo lug'ati\" (amaldagi rasmiy nashr)",
      "O'zbek tilining izohli lug'ati",
      "Amaldagi 5–11-sinf Ona tili va Adabiyot darsliklari",
      "Adabiyotshunoslik atamalari lug'ati",
    ],
  },
  info: {
    title: "Informatika va axborot texnologiyalari",
    sources: [
      "Amaldagi 5–11-sinf Informatika darsliklari",
      "IT atamalarining o'zbekcha rasmiy muqobillari lug'ati",
      "Dasturlash va kompyuter savodxonligi bo'yicha rasmiy o'quv qo'llanmalar",
    ],
  },
  art: {
    title: "San'at (musiqa va tasviriy san'at)",
    sources: [
      "Amaldagi Musiqa madaniyati va Tasviriy san'at darsliklari",
      "San'atshunoslik atamalari lug'ati",
      "O'zbekiston milliy ensiklopediyasi (san'at bo'limlari)",
    ],
  },
  geografiya: {
    title: "Geografiya",
    sources: [
      "Amaldagi 5–11-sinf Geografiya darsliklari",
      "Geografik nomlar (toponimlar)ning rasmiy o'zbekcha yozilishi",
      "O'zbekiston milliy atlasi",
    ],
  },
  biologiya: {
    title: "Biologiya",
    sources: [
      "Amaldagi 5–11-sinf Biologiya darsliklari",
      "Biologik atamalar lug'ati, lotincha nomlarning rasmiy transkripsiyasi",
    ],
  },
  boshlangich: {
    title: "Boshlang'ich ta'lim (boshlang'ich sinf o'qituvchisi)",
    sources: [
      "Amaldagi 1–4-sinf darsliklari va o'qituvchi metodik qo'llanmalari",
      "Boshlang'ich ta'lim davlat ta'lim standarti (DTS)",
      "Pedagogika va metodika atamalari lug'ati",
    ],
  },
  sport: {
    title: "Jismoniy tarbiya (sport)",
    sources: [
      "Amaldagi Jismoniy tarbiya darsliklari va o'quv dasturi",
      "Sport turlari qoidalarining rasmiy o'zbekcha atamalari",
      "Jismoniy tarbiya va sport terminlari lug'ati",
    ],
  },
  mtt: {
    title: "Maktabgacha ta'lim (tarbiyachi)",
    sources: [
      "\"Ilk qadam\" davlat o'quv dasturi",
      "Maktabgacha ta'lim va tarbiyaning davlat standarti",
      "Maktabgacha pedagogika va rivojlanish psixologiyasi darsliklari",
    ],
  },
  mtt_rahbar: {
    title: "Maktabgacha ta'lim tashkiloti rahbari",
    sources: [
      "\"Ilk qadam\" davlat o'quv dasturi",
      "Maktabgacha ta'limga oid amaldagi qonun va me'yoriy hujjatlar (lex.uz)",
      "Ta'lim menejmenti bo'yicha rasmiy qo'llanmalar",
    ],
  },
  mtt_logoped: {
    title: "Logoped (maktabgacha ta'lim)",
    sources: [
      "Logopediya darsliklari va defektologiya atamalari lug'ati",
      "Nutq buzilishlari klassifikatsiyasining rasmiy o'zbekcha atamalari",
      "\"Ilk qadam\" davlat o'quv dasturi",
    ],
  },
  mtt_psixolog: {
    title: "Psixolog (maktabgacha ta'lim)",
    sources: [
      "Psixologiya darsliklari va psixologik atamalar lug'ati",
      "Yosh davrlari psixologiyasi akademik nashrlari",
      "Maktabgacha ta'lim psixologik xizmati me'yoriy hujjatlari",
    ],
  },
  kimyo: {
    title: "Kimyo",
    sources: [
      "Amaldagi 7–11-sinf Kimyo darsliklari",
      "Kimyoviy element, birikma va atamalarning rasmiy o'zbekcha nomlari (IUPAC transkripsiyasi)",
      "\"O'zbek tilining imlo lug'ati\" (amaldagi rasmiy nashr)",
    ],
  },
  // DIQQAT: rus_tili va ingliz banklarida MUTAXASSISLIK savollari rus/ingliz tilida.
  // Bu skript FAQAT o'zbek imlosi uchun — ularni tekshirishda --topics bilan
  // faqat O'ZBEKCHA pedagogika/kasb mavzularini bering (rus: 127,128 | ingliz: 135,136).
  rus_tili: {
    title: "Rus tili (RKI) — pedagogika va kasb standarti bloki (o'zbekcha)",
    sources: [
      "Pedagogika va metodika atamalarining rasmiy o'zbekcha shakllari",
      "Umumiy o'rta ta'lim maktab o'qituvchisi kasb standarti",
      "\"O'zbek tilining imlo lug'ati\" (amaldagi rasmiy nashr)",
    ],
  },
  ingliz: {
    title: "Ingliz tili — pedagogika va kasb standarti bloki (o'zbekcha)",
    sources: [
      "Pedagogika va metodika atamalarining rasmiy o'zbekcha shakllari",
      "Umumiy o'rta ta'lim maktab o'qituvchisi kasb standarti",
      "\"O'zbek tilining imlo lug'ati\" (amaldagi rasmiy nashr)",
    ],
  },
};

const DEFAULT_SOURCES = (fan) => ({
  title: fan,
  sources: [
    `Amaldagi ${fan} fani maktab/kollej darsliklari`,
    `${fan} faniga oid rasmiy terminologik lug'atlar va akademik manbalar`,
  ],
});

// ── Til-ogoh system prompt (--lang en|ru) ─────────────────────────────────
// Ingliz/rus tili banklarida MUTAXASSISLIK savollari o'z tilida. Ularni o'zbek
// imlo korrektoriga berish mumkin emas. Bu yerdagi ASOSIY XAVF: til fanida
// xatolarning KO'PI ATAYLAB qo'yilgan (xatoni top, bo'sh joyni to'ldir,
// noto'g'ri distraktor). LLM ularni "tuzatsa" — savol yo'q bo'ladi.
// Shu sababli prompt o'ta konservativ va faqat MEXANIK nuqsonlarga qaratilgan.
const LANG_PROMPTS = {
  en: (title) => `You are a meticulous copy-editor proofreading multiple-choice TEST QUESTIONS
that are used to certify ENGLISH LANGUAGE TEACHERS. Input is a JSON array:
{ "i": <index>, "q": "<question>", "opts": ["A) ...", "B) ...", "C) ...", "D) ..."], "explanation": "<explanation>" }

SUBJECT: ${title}

⚠️ CRITICAL — THE LANGUAGE ITSELF IS THE SUBJECT BEING TESTED.
In this question bank, incorrect English is very often INTENTIONAL. You must NOT
"repair" it. NEVER touch:
- Sentences the student is asked to correct, analyse, or find an error in.
- Gap-fill blanks in any form: "___", "____", "(  )", "I ___ (live) in Tashkent".
  Never fill a blank. Never remove the parenthetical cue word.
- Distractor options that are deliberately wrong (wrong tense, wrong collocation,
  wrong word choice) — they are wrong ON PURPOSE. Only the framing may be edited.
- Reading passages quoted in the question. Treat quoted text as immutable.
- Any text inside quotation marks, single or double.
If a question asks "find the mistake", "choose the correct form", "identify the
error", "which sentence is grammatically incorrect" — return NO patch for it.

WHAT YOU MAY FIX (mechanical defects only):
- Obvious typos in the Uzbek/English FRAMING text that is not under examination
  (e.g. "Whcih of the following" → "Which of the following").
- Doubled words ("the the"), missing space between words ("isa" → "is a" ONLY
  when unambiguous), stray control characters, broken encoding artifacts.
- Missing terminal punctuation in the explanation.
- Mojibake / non-Latin characters that clearly do not belong.

CONSERVATISM RULE: If you are not 100% certain a defect is mechanical and
unintentional, return NO patch for that question. A wrong "fix" is far worse than
leaving a typo. When unsure, put "unverified: <word>" in the "fix" field and leave
the text unchanged.

BATCH LIMIT: at most 15 questions per request. If more arrive, edit nothing and
return only: { "error": "Batch limiti oshdi: N ta savol keldi, maksimum 15 ta. Bo'lib yuboring." }

HARD RULES:
1. Never reorder, add, or remove options — the correct answer is bound to the index.
2. Keep each option's leading "A) ", "B) ", "C) ", "D) " prefix exactly as-is. If the
   option uses another format (e.g. "1-A, 2-B"), preserve that format exactly.
3. The meaning and the correct answer must not change in any way.
4. Do not swap quote or apostrophe CHARACTERS (' ' " " ' ") — leave them as they are.
5. Do not "improve" correct text. No rewording, no synonyms, no restructuring.
6. Do not change "i".

RESPONSE FORMAT: return patches ONLY for questions with a real mechanical defect.
Valid JSON array, no markdown fences, no preamble:
[
  { "i": 12, "q": "<fixed>", "opts": ["A) ...", "B) ...", "C) ...", "D) ..."], "explanation": "<fixed>", "fix": "<what was fixed>" }
]
Omit unchanged fields. Return [] if the batch is clean.`,

  ru: (title) => `Вы — внимательный литературный редактор-корректор. Вы вычитываете
тестовые вопросы, по которым аттестуют УЧИТЕЛЕЙ РУССКОГО ЯЗЫКА. На вход приходит
JSON-массив:
{ "i": <номер>, "q": "<вопрос>", "opts": ["A) ...", "B) ...", "C) ...", "D) ..."], "explanation": "<пояснение>" }

ПРЕДМЕТ: ${title}

⚠️ ГЛАВНОЕ — ПРОВЕРЯЕТСЯ САМ ЯЗЫК.
В этом банке вопросов неправильное написание очень часто СДЕЛАНО НАМЕРЕННО.
Исправлять его НЕЛЬЗЯ. Никогда не трогайте:
- Предложения, в которых ученик должен найти или исправить ошибку.
- Пропуски любого вида: «___», «(  )», «Он ___ (идти) в школу». Не заполняйте
  пропуск и не убирайте подсказку в скобках.
- Неверные варианты-дистракторы (ошибочное ударение, падеж, вид глагола) — они
  ошибочны СПЕЦИАЛЬНО.
- Цитируемые тексты и отрывки. Текст в кавычках считайте неприкосновенным.
Если вопрос звучит как «найдите ошибку», «укажите верный вариант», «в каком слове
допущена ошибка» — не возвращайте патч для него.

ЧТО МОЖНО ИСПРАВЛЯТЬ (только механические дефекты):
- Явные опечатки в обрамляющем тексте, который не является предметом проверки.
- Удвоенные слова («в в»), отсутствие пробела между словами, служебные символы,
  артефакты кодировки (мохибаке), посторонние иероглифы.
- Отсутствующий знак в конце пояснения.
- Замена «e» на «ё» НЕ делается — это не ошибка.

ПРАВИЛО ОСТОРОЖНОСТИ: если вы не уверены на 100 %, что дефект механический и
непреднамеренный, не возвращайте патч. Неверная «правка» гораздо хуже опечатки.
При сомнении впишите в поле "fix" строку «не проверено: <слово>», а текст оставьте
без изменений.

ОГРАНИЧЕНИЕ ПАКЕТА: не более 15 вопросов за запрос. Если пришло больше — ничего не
редактируйте и верните только:
{ "error": "Batch limiti oshdi: N ta savol keldi, maksimum 15 ta. Bo'lib yuboring." }

СТРОГИЕ ПРАВИЛА:
1. Не меняйте порядок вариантов, не добавляйте и не удаляйте их — правильный ответ
   привязан к индексу.
2. Сохраняйте префиксы «A) », «B) », «C) », «D) » в точности. Если формат другой
   (например «1-А, 2-Б»), сохраните его как есть.
3. Смысл и правильный ответ не должны измениться.
4. Не заменяйте типы кавычек и апострофов — оставьте как есть.
5. Не «улучшайте» верный текст: без синонимов и перестроения фраз.
6. Не меняйте "i".

ФОРМАТ ОТВЕТА: патчи ТОЛЬКО для вопросов с реальным механическим дефектом.
Валидный JSON-массив, без markdown, без вступления:
[
  { "i": 12, "q": "<исправлено>", "opts": ["A) ...", "B) ...", "C) ...", "D) ..."], "explanation": "<исправлено>", "fix": "<что исправлено>" }
]
Неизменённые поля не включайте. Если пакет чистый — верните [].`,
};

const LANG_TITLES = {
  ingliz: { en: 'English language teacher certification — Reading, Grammar, Vocabulary, Pragmatics' },
  rus_tili: { ru: 'Аттестация учителей русского языка — чтение, лексика, морфология, синтаксис' },
};

// ── System prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(fanInfo, { search }) {
  const searchBlock = search
    ? `INTERNETDAN TEKSHIRISH: Sizda Google Search imkoniyati bor. Undan quyidagicha
foydalaning:
- Savolda qonun, nizom, kodeks yoki rasmiy hujjat nomi uchrasa — uning aniq
  rasmiy nomini lex.uz (O'zbekiston qonunchilik bazasi) orqali tekshiring.
- Fan terminining to'g'ri imlosi yoki rasmiy shakliga ishonchingiz komil
  bo'lmasa — amaldagi darsliklar va yuqoridagi manbalardan qidirib aniqlang.
- Qidirib ham tasdiqlay olmasangiz — TAXMIN QILMANG: so'zni asl holida
  qoldiring va "fix" maydonida "tekshirilmadi: <so'z>" deb belgilang.`
    : `KONSERVATIVLIK (juda muhim): Sizda internetga kirish yo'q. Shuning uchun
FAQAT 100% ishonchingiz komil bo'lgan tuzatishlarni qiling:
- Shubhasiz imlo xatolari: "ximoya"→"himoya", "fukaro"→"fuqaro",
  "Konstututsiya"→"Konstitutsiya", "mudofa"→"mudofaa", "xarbiy"→"harbiy".
- Aniq punktuatsiya xatolari.
- Terminning to'g'ri shakliga ozgina bo'lsa ham shubhangiz bo'lsa — TEGMANG,
  so'zni asl holida qoldiring va "fix" maydonida "tekshirilmadi: <so'z>" deb
  belgilang. Noto'g'ri "tuzatish" — tuzatmaslikdan yomonroq.`;

  return `Siz o'zbek tili imlosi, punktuatsiyasi va fan terminologiyasi bo'yicha professional
muharrir-metodistsiz. Sizga o'zbek tilidagi test savollari JSON massiv ko'rinishida
keladi. Har bir element strukturasi:
{ "i": <tartib raqami>, "q": "<savol matni>", "opts": ["A) ...", "B) ...", "C) ...", "D) ..."], "explanation": "<izoh>" }

FAN: ${fanInfo.title}

RASMIY MANBALAR (terminlarni faqat shularga moslang):
${fanInfo.sources.map((s) => `- ${s}`).join('\n')}

${searchBlock}

ANIQ XATOLAR LUG'ATI (shu so'zlar uchrasa, ALBATTA tuzating — qo'shimchalari
bilan birga; faqat butun so'z/o'zak mos kelganda):
- ximoya → himoya (ximoyasi → himoyasi, ximoyachi → himoyachi)
- xarbiy → harbiy
- fukaro → fuqaro, fuqoro → fuqaro (barcha shakllari: fukarolik/fuqorolik → fuqarolik)
- mudofa → mudofaa ("mudofaa" allaqachon to'g'ri — tegmang)
- Konstututsiya / Konstitutsya → Konstitutsiya
- muxim → muhim, xujjat → hujjat, xuquq → huquq, xukumat → hukumat
- shaxar → shahar, raxbar → rahbar, jarox(a)t → jarohat
DIQQAT: "xizmat", "xavf", "xalq", "xabar", "axborot" kabi so'zlar X bilan
TO'G'RI yoziladi — ularni H ga o'girmang. Shubhada bo'lsangiz — tegmang.

VAZIFA: Har bir savolning "q", "opts" va "explanation" maydonlarini imloviy,
grammatik, uslubiy va terminologik xatolardan tozalash (korrektura).
Ish tartibi — har savolni IKKI bosqichda ko'ring:
1-bosqich: imlo va punktuatsiya (harf xatolari, tutuq belgisi, chiziqcha,
tinish belgilari).
2-bosqich: terminologiya (atamalar rasmiy manbalardagi shaklga mosmi).

BATCH CHEKLOVI: Bitta so'rovda ko'pi bilan 15 ta savol qabul qilinadi. Agar
so'rovda 15 tadan ortiq savol kelsa, HECH NARSANI tahrir qilmang va faqat
quyidagi JSON qaytaring:
{ "error": "Batch limiti oshdi: N ta savol keldi, maksimum 15 ta. Bo'lib yuboring." }

QAT'IY QOIDALAR:
1. Variantlar TARTIBINI o'zgartirmang va birontasini olib tashlamang yoki
   qo'shmang — to'g'ri javob indeksga bog'langan.
2. Har bir variant boshidagi "A) ", "B) ", "C) ", "D) " prefiksini aynan
   o'z joyida, o'z ko'rinishida qoldiring. Agar variant boshqa formatda bo'lsa
   (masalan moslashtirish savoli: "1-A, 2-B..."), o'sha formatni aynan saqlang.
3. Savolning ilmiy ma'nosi va to'g'ri javob mutlaqo o'zgarmasin.
4. Apostrof va tirnoq BELGILARINING turini almashtirmang (‘ ni ' ga yoki
   aksincha o'girmang) — qanday turgan bo'lsa shunday qoldiring. Faqat harf
   xatosini tuzating (masalan: "ximoya" → "himoya", "fukaro" → "fuqaro").
   Yangi apostrof qo'shish zarur bo'lsa (masalan "qumondon" → "qo‘mondon"),
   o'sha savol matnida ishlatilgan apostrof belgisining aynan o'zini ishlating.
5. Xato bo'lmagan matnni "yaxshilab" qayta yozmang. Sinonimga almashtirmang,
   gapni qayta qurmang — faqat aniq xato bo'lsagina tuzating. Gap tuzilishiga
   faqat u chindan g'aliz yoki tushunarsiz bo'lgandagina tegining.
6. "i" qiymatini o'zgartirmang.

JAVOB FORMATI: FAQAT xatosi topilgan savollar uchun patch qaytaring.
Javob valid JSON massiv bo'lsin, markdown teglarsiz, hech qanday kirish so'zisiz:
[
  {
    "i": 12,
    "q": "<tuzatilgan savol matni>",
    "opts": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "explanation": "<tuzatilgan izoh>",
    "fix": "<nima tuzatilgani: masalan: q: ximoya→himoya; B: Konstututsiya→Konstitutsiya>"
  }
]
O'zgarmagan maydonni patchga kiritmang. Batchda xato topilmasa [] qaytaring.`;
}

// ── CLI argumentlarni o'qish ──────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    fan: null, provider: null, model: null, batch: 15, delay: null,
    limit: Infinity, dryRun: false, single: false, fresh: false, reasoning: null, fs: false,
    topics: null, // --topics 127,128 → faqat shu topicId'lar (til fanlarida o'zbekcha ped/kasb bloki uchun)
    lang: null,   // --lang en|ru → mutaxassislik bloki o'z tilida tekshiriladi (LANG_PROMPTS)
  };
  const rest = argv.slice(2);
  for (let k = 0; k < rest.length; k++) {
    const a = rest[k];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--single') args.single = true;
    else if (a === '--fresh') args.fresh = true;
    else if (a === '--fs' || a === '--firestore') args.fs = true;
    else if (a === '--provider') args.provider = rest[++k];
    else if (a === '--model') args.model = rest[++k];
    else if (a === '--reasoning') args.reasoning = rest[++k];
    else if (a === '--batch') args.batch = Math.min(15, parseInt(rest[++k], 10) || 15);
    else if (a === '--delay') args.delay = parseInt(rest[++k], 10) || 800;
    else if (a === '--limit') args.limit = parseInt(rest[++k], 10) || Infinity;
    else if (a === '--topics') args.topics = new Set(String(rest[++k] || '').split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isInteger));
    else if (a === '--lang') args.lang = String(rest[++k] || '').trim().toLowerCase();
    else if (!a.startsWith('--') && !args.fan) args.fan = a;
  }
  return args;
}

// ── Provider sozlamalari ──────────────────────────────────────────────────
function resolveProvider(args) {
  const gemKey = (process.env.GEMINI_API_KEY || '').trim();
  const pipeBase = (process.env.PIPELINE_API_BASE || '').trim();
  const pipeKeys = (process.env.PIPELINE_API_KEY || '').split(',').map((s) => s.trim()).filter(Boolean);
  const pipeModel = (process.env.PIPELINE_API_MODEL || '').trim();

  let name = args.provider;
  if (!name) name = gemKey.startsWith('AIza') ? 'gemini' : 'pipeline';

  if (name === 'gemini') {
    if (!gemKey) throw new Error('.env faylida GEMINI_API_KEY yo\'q');
    return {
      name: 'gemini', model: args.model || 'gemini-2.5-pro', search: true,
      keys: [gemKey], delay: args.delay ?? 2000,
      double: !args.single && false, // Gemini kuchli + grounding bor — 1 o'tish yetarli
    };
  }
  if (!pipeBase || !pipeKeys.length || !(args.model || pipeModel)) {
    throw new Error('.env faylida PIPELINE_API_BASE / PIPELINE_API_KEY / PIPELINE_API_MODEL to\'liq emas');
  }
  return {
    name: 'pipeline', base: pipeBase, model: args.model || pipeModel, search: false,
    keys: pipeKeys, delay: args.delay ?? 800,
    double: !args.single, // GLM o'zbekchada zaifroq — 2 o'tish standart
    // Cerebras bepul tarifda jami 8192 token/so'rov — reasoning'ni o'chirmasak
    // model "o'ylash"ga hamma tokenni sarflab, javob yozishga joy qolmaydi.
    // 'off' qiymati parametrni umuman yubormaydi (reasoning'siz modellar uchun).
    reasoning: args.reasoning ?? ((process.env.PIPELINE_REASONING || '').trim() || 'none'),
  };
}

// ── Firestore'dan yuklash ─────────────────────────────────────────────────
async function loadFromFirestore(fan, topics = null) {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error(".env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q (--fs rejimi uchun kerak)");
  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
  console.log(`🔐 ${email} bilan Firestore'ga kirilmoqda...`);
  await signInWithEmailAndPassword(getAuth(app), email, password);
  const db = getFirestore(app);
  const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', fan)));
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, data: d.data() }));
  // --topics: faqat berilgan mavzular (til fanlarida o'zbekcha ped/kasb blokini ajratish uchun —
  // rus/ingliz mutaxassislik savollari o'z tilida, o'zbek imlo korrektorига berilmasligi kerak).
  if (topics && topics.size) {
    const before = rows.length;
    for (let i = rows.length - 1; i >= 0; i--) if (!topics.has(rows[i].data.topicId)) rows.splice(i, 1);
    console.log(`🔎 --topics filtri: ${before} → ${rows.length} ta savol (mavzular: ${[...topics].join(', ')})`);
  }
  rows.sort((a, b) => (a.id < b.id ? -1 : 1)); // barqaror tartib (checkpoint uchun)
  return { db, docIds: rows.map((r) => r.id), questions: rows.map((r) => r.data) };
}

// ── API chaqiruvlari (429/5xx: kalit aylantirish + qayta urinish) ─────────
const RETRY_DELAYS = [5000, 15000, 30000, 60000];
let keyCursor = 0;

async function callLLM(provider, systemPrompt, userText) {
  const maxAttempts = Math.max(provider.keys.length * 2, RETRY_DELAYS.length + 1);
  let backoffIdx = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = provider.keys[keyCursor % provider.keys.length];
    try {
      if (provider.name === 'gemini') return await callGemini(provider, key, systemPrompt, userText);
      return await callOpenAI(provider, key, systemPrompt, userText);
    } catch (e) {
      const status = e.httpStatus || 0;
      if (status === 401 || status === 403) {
        keyCursor++; // yaroqsiz kalit — keyingisiga o'tamiz
        console.log(`    🔑 Kalit rad etildi (HTTP ${status}) — keyingi kalitga o'tamiz`);
        continue;
      }
      if (status === 429 || status >= 500) {
        keyCursor++;
        if (keyCursor % provider.keys.length === 0) {
          // Barcha kalitlar aylanib chiqildi — kutamiz
          const wait = RETRY_DELAYS[Math.min(backoffIdx++, RETRY_DELAYS.length - 1)];
          console.log(`    ⏳ HTTP ${status} — barcha kalitlar band, ${wait / 1000}s kutamiz...`);
          await sleep(wait);
        }
        continue;
      }
      throw e;
    }
  }
  throw new Error('Barcha kalitlar va urinishlar tugadi');
}

async function callGemini(provider, apiKey, systemPrompt, userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 32768 },
  };
  if (provider.search) body.tools = [{ google_search: {} }];
  else body.generationConfig.responseMimeType = 'application/json';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`Gemini HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    err.httpStatus = res.status;
    throw err;
  }
  const data = await res.json();
  const cand = data.candidates?.[0];
  if (!cand) throw new Error(`Gemini javob bermadi: ${data.promptFeedback?.blockReason || 'bo\'sh'}`);
  if (cand.finishReason === 'MAX_TOKENS') throw new Error('Javob token limitida kesildi');
  const text = (cand.content?.parts || []).map((p) => p.text || '').join('');
  if (!text.trim()) throw new Error('Gemini bo\'sh matn qaytardi');
  return text;
}

async function callOpenAI(provider, apiKey, systemPrompt, userText) {
  const res = await fetch(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      max_tokens: 8000,
      ...(provider.reasoning && provider.reasoning !== 'off' ? { reasoning_effort: provider.reasoning } : {}),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
    }),
  });
  if (!res.ok) {
    const err = new Error(`API HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    err.httpStatus = res.status;
    throw err;
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (data.choices?.[0]?.finish_reason === 'length') throw new Error('Javob token limitida kesildi (reasoning juda uzun)');
  const text = (msg?.content || '').trim();
  if (!text) throw new Error('Model bo\'sh javob qaytardi');
  return text;
}

// ── Javobdan JSON ajratish (himoyalangan) ─────────────────────────────────
function extractJson(text) {
  let t = text.trim();
  t = t.replace(/<think>[\s\S]*?<\/think>/g, ''); // reasoning teglar bo'lsa
  t = t.replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(t); } catch { /* pastda qidiramiz */ }
  // Har bir [ yoki { dan boshlab balanslangan blokni sinab ko'ramiz
  for (let s = 0; s < t.length; s++) {
    const open = t[s];
    if (open !== '[' && open !== '{') continue;
    const close = open === '[' ? ']' : '}';
    let depth = 0, inStr = false, esc = false;
    for (let k = s; k < t.length; k++) {
      const ch = t[k];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(t.slice(s, k + 1)); } catch { break; }
        }
      }
    }
  }
  throw new Error('Javobda yaroqli JSON topilmadi');
}

// ── Patch validatsiyasi: maydon-ma-maydon ─────────────────────────────────
function validatePatch(patch, original) {
  const out = { fields: {}, rejected: [], suspicious: [] };
  const lenOk = (oldS, newS) => {
    const r = newS.length / Math.max(oldS.length, 1);
    return r >= 0.4 && r <= 2.5;
  };

  if (typeof patch.q === 'string' && patch.q.trim() && patch.q !== original.q) {
    if (lenOk(original.q, patch.q)) out.fields.q = patch.q;
    else out.rejected.push(`q: uzunlik keskin o'zgargan (${original.q.length}→${patch.q.length}) — qo'lda ko'ring`);
  }

  if (Array.isArray(patch.opts)) {
    if (patch.opts.length !== original.opts.length) {
      out.rejected.push(`opts: soni mos emas (asl ${original.opts.length}, patch ${patch.opts.length})`);
    } else {
      let ok = true;
      for (let k = 0; k < patch.opts.length; k++) {
        const o = original.opts[k], p = patch.opts[k];
        if (typeof p !== 'string' || !p.trim()) { out.rejected.push(`opts[${k}]: bo'sh yoki matn emas`); ok = false; break; }
        const m = o.match(/^([A-E])\)/i);
        if (m && !p.trim().toUpperCase().startsWith(m[1].toUpperCase() + ')')) {
          out.rejected.push(`opts[${k}]: "${m[1]})" prefiksi yo'qolgan`); ok = false; break;
        }
        if (!lenOk(o, p)) { out.rejected.push(`opts[${k}]: uzunlik keskin o'zgargan — qo'lda ko'ring`); ok = false; break; }
      }
      if (ok && patch.opts.some((p, k) => p !== original.opts[k])) out.fields.opts = patch.opts;
    }
  }

  if (typeof patch.explanation === 'string' && patch.explanation.trim()
      && typeof original.explanation === 'string' && patch.explanation !== original.explanation) {
    if (lenOk(original.explanation, patch.explanation)) out.fields.explanation = patch.explanation;
    else out.rejected.push(`explanation: uzunlik keskin o'zgargan — qo'lda ko'ring`);
  }

  if (typeof patch.fix === 'string' && /tekshirilmadi/i.test(patch.fix)) {
    out.suspicious.push(patch.fix);
  }
  return out;
}

// ── Ikki o'tish natijalarini kesishtirish ─────────────────────────────────
// Faqat ikkala o'tishda ham AYNAN bir xil chiqqan maydon tuzatishlari qoladi.
function intersectRuns(map1, map2, errors, batchNo) {
  const agreed = [];
  const allIdx = new Set([...map1.keys(), ...map2.keys()]);
  for (const i of allIdx) {
    const a = map1.get(i), b = map2.get(i);
    if (!a || !b) {
      const one = a || b;
      errors.push({ batch: batchNo, i, msg: `Ikki o'tishning bittasidagina topildi — qo'lda ko'ring${one.fix ? ` (izoh: ${one.fix})` : ''}` });
      continue;
    }
    const fields = {};
    const diffs = [];
    for (const f of ['q', 'opts', 'explanation']) {
      const va = a.fields[f], vb = b.fields[f];
      if (va === undefined && vb === undefined) continue;
      const same = f === 'opts'
        ? Array.isArray(va) && Array.isArray(vb) && va.length === vb.length && va.every((x, k) => x === vb[k])
        : va === vb;
      if (same) fields[f] = va;
      else diffs.push(f);
    }
    if (diffs.length) errors.push({ batch: batchNo, i, msg: `Ikki o'tish kelishmadi (${diffs.join(', ')}) — qo'lda ko'ring` });
    if (Object.keys(fields).length) agreed.push({ i, fields, fix: a.fix || b.fix || '' });
  }
  return agreed;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

// ── Asosiy oqim ───────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);
  if (!args.fan) {
    console.log('Foydalanish: node scripts/fix-questions.mjs <fan> [--dry-run] [--limit N] [--single] [--fresh]');
    console.log('Mavjud fanlar (src/data/questions_*.json):');
    for (const f of fs.readdirSync('src/data').filter((f) => /^questions_[a-z_]+\.json$/.test(f))) {
      console.log('  •', f.replace(/^questions_|\.json$/g, ''));
    }
    process.exit(1);
  }

  const provider = resolveProvider(args);

  // ── Manba: Firestore yoki lokal JSON ────────────────────────────────────
  let questions, dataFile = null, docIds = null, fbDb = null;
  if (args.fs) {
    const fb = await loadFromFirestore(args.fan, args.topics);
    questions = fb.questions; docIds = fb.docIds; fbDb = fb.db;
    if (!questions.length) { console.error(`❌ Firestore'da '${args.fan}' kategoriyasida savol topilmadi`); process.exit(1); }
  } else {
    dataFile = path.join('src', 'data', `questions_${args.fan}.json`);
    if (!fs.existsSync(dataFile)) { console.error(`❌ Fayl topilmadi: ${dataFile}`); process.exit(1); }
    questions = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }

  const fanInfo = FAN_SOURCES[args.fan] || DEFAULT_SOURCES(args.fan);
  let systemPrompt;
  if (args.lang) {
    if (!LANG_PROMPTS[args.lang]) {
      console.error(`❌ --lang ${args.lang} qo'llab-quvvatlanmaydi. Mavjud: ${Object.keys(LANG_PROMPTS).join(', ')}`);
      process.exit(1);
    }
    const title = LANG_TITLES[args.fan]?.[args.lang] || fanInfo.title;
    systemPrompt = LANG_PROMPTS[args.lang](title);
    fanInfo.title = `${title} [--lang ${args.lang}]`;
  } else {
    systemPrompt = buildSystemPrompt(fanInfo, { search: provider.search });
  }
  const totalBatches = Math.ceil(questions.length / args.batch);

  console.log(`\n📚 Fan: ${fanInfo.title}`);
  console.log(`📄 Manba: ${args.fs ? `Firestore 'questions' (category=${args.fan})` : dataFile} — ${questions.length} savol, ${totalBatches} batch (${args.batch} tadan)`);
  console.log(`🤖 Provider: ${provider.name} | model: ${provider.model} | kalitlar: ${provider.keys.length} ta${provider.reasoning ? ` | reasoning: ${provider.reasoning}` : ''}`);
  console.log(`🛡️  Ikki bosqichli tekshiruv: ${provider.double ? 'YOQILGAN (har batch 2 marta)' : "o'chirilgan"} | ${args.dryRun ? 'DRY-RUN (fayl o\'zgarmaydi)' : 'JONLI rejim'}\n`);

  // Checkpoint — uzilishdan keyin davom etish uchun
  const cpFile = path.join('src', 'data', `.fix-progress-${args.fs ? 'fs-' : ''}${args.fan}.json`);
  let checkpoint = { batchSize: args.batch, model: provider.model, batches: {} };
  if (args.fs) checkpoint.idList = docIds;
  if (!args.fresh && fs.existsSync(cpFile)) {
    const cp = JSON.parse(fs.readFileSync(cpFile, 'utf8'));
    if (cp.batchSize === args.batch) {
      // Firestore rejimida hujjatlar tartibi checkpoint'dagi ro'yxatga qat'iy bog'lanadi,
      // aks holda oradagi qo'shilgan/o'chirilgan savol indekslarni surib yuboradi.
      if (args.fs && Array.isArray(cp.idList)) {
        const byId = new Map(docIds.map((id, k) => [id, questions[k]]));
        const missing = cp.idList.filter((id) => !byId.has(id));
        if (missing.length) {
          console.error(`❌ Checkpoint'dagi ${missing.length} ta hujjat Firestore'da endi yo'q — --fresh bilan boshidan boshlang.`);
          process.exit(1);
        }
        docIds = cp.idList;
        questions = cp.idList.map((id) => byId.get(id));
      }
      checkpoint = cp;
      const done = Object.keys(cp.batches).length;
      if (done) console.log(`♻️  Checkpoint topildi: ${done} batch avval qilingan, davom etamiz (boshidan boshlash uchun --fresh)\n`);
    } else {
      console.log(`⚠️  Checkpoint batch hajmi mos emas (${cp.batchSize}≠${args.batch}) — e'tiborsiz qoldiriladi\n`);
    }
  }

  // Zaxira nusxa (mavjud .bak-... konvensiyasiga mos)
  if (!args.dryRun) {
    if (args.fs) {
      const bak = path.join('src', 'data', `firestore_backup_${args.fan}_${ts()}.json`);
      fs.writeFileSync(bak, JSON.stringify(questions.map((q, k) => ({ __docId: docIds[k], ...q })), null, 2));
      console.log(`💾 Zaxira (Firestore dump): ${bak}\n`);
    } else {
      const bak = dataFile.replace(/\.json$/, `.bak-${ts()}.json`);
      fs.copyFileSync(dataFile, bak);
      console.log(`💾 Zaxira: ${bak}\n`);
    }
  }

  const report = [];
  const errors = [];
  let batchesRun = 0;

  for (let start = 0; start < questions.length; start += args.batch) {
    const batchNo = Math.floor(start / args.batch) + 1;
    if (checkpoint.batches[start]) continue; // avval qilingan
    if (batchesRun >= args.limit) { console.log(`\n⏸  --limit ${args.limit} ga yetdik, to'xtadik. Davom etish: shu buyruqni qayta bering.`); break; }
    batchesRun++;

    const slice = questions.slice(start, start + args.batch);

    process.stdout.write(`Batch ${batchNo}/${totalBatches} (savol ${start}–${start + slice.length - 1})... `);
    try {
      // Slice'ni qayta ishlaydi; javob token byudjetiga sig'masa o'zini ikkiga bo'ladi
      const processSlice = async (sStart, sQs) => {
        const payload = sQs.map((q, k) => {
          const item = { i: sStart + k, q: q.q, opts: q.opts };
          if (typeof q.explanation === 'string' && q.explanation.trim()) item.explanation = q.explanation;
          return item;
        });
        const userText = `Quyidagi savollarni tekshiring:\n${JSON.stringify(payload, null, 1)}`;

        // Bitta o'tishni bajarib, validatsiyadan o'tgan patch'lar xaritasini qaytaradi
        const runOnce = async () => {
          const raw = await callLLM(provider, systemPrompt, userText);
          const parsed = extractJson(raw);
          if (parsed && !Array.isArray(parsed) && parsed.error) throw new Error(`Model rad etdi: ${parsed.error}`);
          if (!Array.isArray(parsed)) throw new Error('Javob massiv emas');
          const map = new Map();
          for (const p of parsed) {
            if (!Number.isInteger(p.i) || p.i < sStart || p.i >= sStart + sQs.length) {
              errors.push({ batch: batchNo, msg: `Indeks chegaradan tashqarida: i=${p.i}` });
              continue;
            }
            const v = validatePatch(p, questions[p.i]);
            if (v.rejected.length) errors.push({ batch: batchNo, i: p.i, msg: v.rejected.join('; '), fix: p.fix });
            if (v.suspicious.length) errors.push({ batch: batchNo, i: p.i, msg: `Model tekshira olmadi: ${v.suspicious.join('; ')}` });
            if (Object.keys(v.fields).length) map.set(p.i, { fields: v.fields, fix: p.fix || '' });
          }
          return map;
        };

        try {
          if (provider.double) {
            const map1 = await runOnce();
            const map2 = await runOnce();
            return intersectRuns(map1, map2, errors, batchNo);
          }
          const map1 = await runOnce();
          return [...map1.entries()].map(([i, v]) => ({ i, fields: v.fields, fix: v.fix }));
        } catch (e) {
          if (/token limitida kesildi/.test(e.message) && sQs.length > 3) {
            const mid = Math.ceil(sQs.length / 2);
            process.stdout.write(`✂️ ${sQs.length}→${mid}+${sQs.length - mid} `);
            const left = await processSlice(sStart, sQs.slice(0, mid));
            const right = await processSlice(sStart + mid, sQs.slice(mid));
            return left.concat(right);
          }
          throw e;
        }
      };

      const validPatches = await processSlice(start, slice);
      if (args.fs) for (const p of validPatches) p.docId = docIds[p.i];

      checkpoint.batches[start] = validPatches;
      fs.writeFileSync(cpFile, JSON.stringify(checkpoint, null, 2));
      console.log(`✅ ${validPatches.length} ta tuzatish`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
      errors.push({ batch: batchNo, msg: e.message });
      // Bu batch checkpoint'ga yozilmaydi — keyingi ishga tushirishda qayta urinadi
    }
    if (start + args.batch < questions.length) await sleep(provider.delay);
  }

  // ── Patch'larni qo'llash ────────────────────────────────────────────────
  const allPatches = Object.values(checkpoint.batches).flat().sort((a, b) => a.i - b.i);
  let applied = 0;
  for (const p of allPatches) {
    const q = questions[p.i];
    const before = { q: q.q, opts: [...q.opts], explanation: q.explanation };
    if (p.fields.q) q.q = p.fields.q;
    if (p.fields.opts) q.opts = p.fields.opts;
    if (p.fields.explanation) q.explanation = p.fields.explanation;
    applied++;
    report.push({ i: p.i, docId: p.docId, before, after: { q: q.q, opts: q.opts, explanation: q.explanation }, fields: Object.keys(p.fields), fix: p.fix });
  }

  if (!args.dryRun && applied > 0) {
    if (args.fs) {
      // Firestore hujjatlarini joyida yangilash (ID saqlanadi, faqat diff maydonlar)
      let ok = 0, fail = 0;
      for (const p of allPatches) {
        const id = p.docId;
        if (!id) { fail++; errors.push({ batch: '-', i: p.i, msg: 'docId topilmadi — yangilanmadi' }); continue; }
        try {
          await updateDoc(doc(fbDb, 'questions', id), p.fields);
          ok++;
        } catch (e) {
          fail++;
          errors.push({ batch: '-', i: p.i, msg: `Firestore yozish xatosi [${id}]: ${e.message}` });
        }
      }
      console.log(`\n✍️  Firestore yangilandi: ${ok} ta hujjat${fail ? ` | ❌ ${fail} ta xato` : ''}`);
    } else {
      fs.writeFileSync(dataFile, JSON.stringify(questions, null, 2) + '\n');
      console.log(`\n✍️  ${dataFile} yangilandi (${applied} savol tuzatildi)`);
    }
  } else if (args.dryRun) {
    console.log(`\n🔍 DRY-RUN: ${applied} savolga tuzatish topildi, fayl o'zgartirilmadi`);
  } else {
    console.log('\n✨ Tuzatish topilmadi — fayl toza');
  }

  // ── Hisobot ─────────────────────────────────────────────────────────────
  if (report.length || errors.length) {
    const reportFile = path.join('src', 'data', `fix_report_${args.fan}_${ts()}.md`);
    const lines = [
      `# Korrektura hisoboti — ${fanInfo.title}`,
      ``,
      `- Sana: ${new Date().toISOString()}`,
      `- Provider: ${provider.name} | model: ${provider.model} | ikki o'tish: ${provider.double ? 'ha' : "yo'q"} | rejim: ${args.dryRun ? 'dry-run' : 'jonli'}`,
      `- Jami savol: ${questions.length} | Tuzatilgan: ${applied} | Xato/ogohlantirish: ${errors.length}`,
      ``,
    ];
    for (const r of report) {
      lines.push(`## Savol #${r.i}${r.docId ? ` [doc ${r.docId}]` : ''}${r.fix ? ` — ${r.fix}` : ''}`);
      if (r.fields.includes('q')) lines.push(`- **q (eski):** ${r.before.q}`, `- **q (yangi):** ${r.after.q}`);
      if (r.fields.includes('opts')) {
        for (let k = 0; k < r.before.opts.length; k++) {
          if (r.before.opts[k] !== r.after.opts[k]) lines.push(`- **opts[${k}] (eski):** ${r.before.opts[k]}`, `- **opts[${k}] (yangi):** ${r.after.opts[k]}`);
        }
      }
      if (r.fields.includes('explanation')) lines.push(`- **izoh (eski):** ${r.before.explanation}`, `- **izoh (yangi):** ${r.after.explanation}`);
      lines.push('');
    }
    if (errors.length) {
      lines.push(`## ⚠️ Xatolar va qo'lda ko'rish kerak bo'lganlar`, ``);
      for (const e of errors) lines.push(`- Batch ${e.batch}${e.i != null ? `, savol #${e.i}` : ''}: ${e.msg}${e.fix ? ` (model izohi: ${e.fix})` : ''}`);
      lines.push('');
    }
    fs.writeFileSync(reportFile, lines.join('\n'), 'utf8');
    console.log(`📋 Hisobot: ${reportFile}`);
  }

  // Hammasi tugagan bo'lsa checkpoint'ni tozalaymiz
  const allDone = Object.keys(checkpoint.batches).length >= totalBatches;
  if (allDone && !args.dryRun) {
    if (fs.existsSync(cpFile)) fs.unlinkSync(cpFile);
    console.log('🧹 Checkpoint tozalandi — fan to\'liq tekshirildi.');
  } else if (!allDone) {
    const remaining = totalBatches - Object.keys(checkpoint.batches).length;
    console.log(`ℹ️  ${remaining} batch qoldi — davom etish uchun shu buyruqni qayta bering.`);
  }
  if (args.fs) {
    console.log("\n👀 O'zgarishlar hisobot faylida. Kerak bo'lsa zaxira dump'dan tiklash mumkin.");
  } else {
    console.log('\n👀 O\'zgarishlarni ko\'rish: git diff ' + dataFile.replace(/\\/g, '/'));
  }
  process.exit(0); // Firestore ulanishi event loop'ni ushlab turmasligi uchun
}

main().catch((e) => { console.error('\n💥 Kutilmagan xato:', e.message); process.exit(1); });
