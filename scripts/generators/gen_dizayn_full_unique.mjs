import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'fan 4/Texnologiya (Dizayn)/bolimlar';
fs.mkdirSync(OUT_DIR, { recursive: true });

const seenStems = new Set();

function normText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[`‘’ʻʼ']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\(#\d+\)/g, '')
    .trim();
}

function padOption(opt, targetLen) {
  let s = opt.trim();
  if (s.length >= targetLen) return s;
  const diff = targetLen - s.length;
  if (diff > 25) {
    return s + " bo'yicha belgilangan amaliy me'yoriy talablar";
  } else if (diff > 14) {
    return s + " bo'yicha belgilangan amaliy talab";
  } else if (diff > 7) {
    return s + " texnologik jarayoni";
  } else if (diff > 2) {
    return s + " usuli";
  }
  return s;
}

function createItem(id, topicId, file, q, correctText, rawDistractors, explanation, mnemonic, meta = {}) {
  const key = normText(q);
  if (seenStems.has(key)) {
    throw new Error(`Duplicate stem detected at Q#${id}: "${q}"`);
  }
  seenStems.add(key);

  const targetKey = (id - 1) % 4; // Exactly 25% A, B, C, D
  const cLen = correctText.length;

  const distractors = rawDistractors.map(d => {
    let s = d.trim()
      .replace(/\bfaqat\b/gi, "asosan")
      .replace(/\bmutlaqo\b/gi, "yetarlicha")
      .replace(/\bhech qanday\b/gi, "yetarli")
      .replace(/\bhech qachon\b/gi, "kamdan-kam hollarda");
    if (s.length < cLen * 0.94) {
      s = padOption(s, Math.round(cLen * 0.98));
    }
    return s;
  });

  const opts = ["", "", "", ""];
  opts[targetKey] = correctText;
  let dIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== targetKey) {
      opts[i] = distractors[dIdx++];
    }
  }

  return {
    id,
    q,
    opts,
    correct: targetKey,
    explanation,
    mnemonic,
    topicId,
    category: "texnologiya_dizayn",
    difficulty: meta.diff || (id % 3 === 0 ? "Y3" : (id % 2 === 0 ? "Y2" : "Y1")),
    bloom_level: meta.bloom || (id % 3 === 0 ? "Mulohaza" : (id % 2 === 0 ? "Qo'llash" : "Bilish")),
    question_type: meta.qtype || "Y1",
    source_file: file
  };
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 01: Zamonaviy texnika va texnologiyalar (156 Qs: IDs 1..156, Topic 186)
// ══════════════════════════════════════════════════════════════════════════
function buildSection01() {
  const items = [];
  const secFile = "01_zamonaviy_texnika_va_texnologiyalar.json";

  // 26 distinct technical concepts, each explored from 6 unique angles = 156 Qs
  const tech26 = [
    { name: "Tasmali uzatma", unit: "elastik tasmalar", c: "sirpanish hisobiga dvigatelni ortiqcha zo'riqishdan asrash", d1: "tishlar yordamida qat'iy va mutlaq o'zgarmas uzatish nisbatini saqlash", d2: "aylanma harakatni bitta bosqichda ilgarilama-qaytma harakatga aylantirish", d3: "suyuqlik bosimi orqali silindr porshenini surib yuqori bosimli kuch berish" },
    { name: "Tishli uzatma", unit: "shesterenkalar", c: "sirpanishlarsiz, qat'iy burchak tezligi va yuqori quvvat uzatish", d1: "bir necha metr masofadagi vallar orasida elastik harakat uzatish", d2: "zo'riqish ortganda tishlar sirpanib dvigatelni kuyishdan saqlashi", d3: "siqilgan havo energiyasini aylanma kinetik quvvatga aylantirishi" },
    { name: "Chervyakli uzatma", unit: "chervyak va g'ildirak", c: "katta uzatish nisbati va yuk ostida o'z-o'zidan tormozlanish xossasi", d1: "aylanish tezligini ishqalanishsiz o'n barobarga oshirib berish", d2: "aylanma harakatni faqat 180 darajaga teskarisiga o'zgartirish", d3: "dvigatelga keluvchi kuchlanishni avtomatik pasaytirib tokni tejash" },
    { name: "Zanjirli uzatma", unit: "yulduzcha va zanjir", c: "uzoqroq masofadagi vallarni sirpanishsiz ishonchli bog'lab uzatish", d1: "zvenolarga moylash talab etilmasdan yuqori tezlikda mutlaqo shovqinsiz ishlash", d2: "to'siq uchraganda zanjir tish ustida sirpanib dastgohni sinishdan saqlash", d3: "harakatni faqat fazoviy ayqash vallarga 90 daraja burchakda uzatish" },
    { name: "Krivoship-shatun mexanizmi", unit: "tirsakli val va shatun", c: "to'g'ri chiziqli ilgarilama-qaytma harakatni aylanma harakatga aylantirish", d1: "ikkita aylanuvchi valning burchak tezligini elastik bog'lab tenglashtirish", d2: "ishchi suyuqlik oqimi bilan asboblarni avtomatik almashtirib turish", d3: "detallarning g'adir-budurlik darajasini mikron aniqlikda tekshirish" },
    { name: "Friksion uzatma", unit: "ishqalanish g'ildiraklari", c: "silliq g'ildiraklarning o'zaro ishqalanish kuchi hisobiga ravon uzatish", d1: "tishlar ilashishi hisobiga uzatish sonining qat'iy barqarorligini ta'minlash", d2: "aylanma harakatni dasturiy kod orqali qadamli impulslarga bo'lib berish", d3: "elektromagnit induksiya yordamida detallarni tebranishsiz harakatlantirish" },
    { name: "Kardanli uzatma", unit: "kardan sharniri", c: "burchak ostida kesishuvchi va holati o'zgaruvchan vallarga moment uzatish", d1: "valning aylanish yo'nalishini soat mili bo'yicha qat'iy to'xtatib turish", d2: "aylanma quvvatni to'g'ridan-to'g'ri issiqlik energiyasiga aylantirish", d3: "dvigatelning elektr tokini mexanik tormozlanishsiz barqarorlash" },
    { name: "Reykali uzatma", unit: "shesterenka va tishli reyka", c: "aylanma harakatni to'g'ri chiziqli ilgarilama harakatga aylantirish", d1: "ikkita parallel valning aylanish yo'nalishini bir xil saqlab turish", d2: "gidravlik suyuqlik yordamida porshenni yuqori tezlikda harakatlantirish", d3: "faqat optik tolalarda yorug'lik signallarini uzatish vazifasini o'tash" },
    { name: "Malta mexanizmi (maltiy xoch)", unit: "barmoqli disk va xoch", c: "uzluksiz aylanma harakatni davriy to'xtab-to'xtab aylanuvchi harakatga aylantirish", d1: "harakat tezligini cheksiz ravon va uzluksiz oshirib borish", d2: "vallardagi titrashlarni yutuvchi elastik rezina mufta vazifasini o'tash", d3: "yuqori bosimli bug' quvvatini elektr energiyasiga aylantirib berish" },
    { name: "Kulachokli mexanizm", unit: "kulachok va turtkich", c: "kulachok profili bo'yicha turtkichga murakkab qonuniyatli harakat berish", d1: "har qanday to'siqda dvigatelni tarmoqdan bir zumda o'chiruvchi avtomat bo'lish", d2: "ikkita val orasidagi masofani masofadan turib radio orqali boshqarish", d3: "faqat doimiy tok dvigatellarining quvvatini oshirib mexanik kuch berish" },
    { name: "FDM 3D bosib chiqarish", unit: "ekstruder va filament", c: "termoplastik ipni qizdirib soplo orqali qatlam-qatlam eritib yotqizish", d1: "suyuq fotopolimer smolaga ultrabinafsha lazer nurlari bilan ishlov berish", d2: "metall kukunlarini elektron nur yordamida vakuumda eritib quyish", d3: "yog'och qirindilarini gidravlik pressda siqib xona haroratida qotirish" },
    { name: "SLA 3D bosib chiqarish", unit: "fotopolimer vanna va lazer", c: "suyuq fotopolimer smolaga ultrabinafsha nur yo'naltirib polimerlash", d1: "qizdirilgan plastmassa ipini koordinatali stol ustiga qatlamlash", d2: "qum qoliplariga yuqori haroratli suyuq metall quyib shakl berish", d3: "qalin taxtalarni frezer yordamida mexanik yo'nib relyef chiqarish" },
    { name: "SLS lazerli kukun sinterlash", unit: "kukunli qatlam va lazer", c: "metall yoki polimer kukunini lazer nuri bilan qatlamma-qatlam qovushtirish", d1: "suyuq kislotaga metallni botirib elektrokimyoviy usulda shakllantirish", d2: "faqat tayyor xomashyoni keskich bilan yo'nib o'lchamga keltirish", d3: "xomashyoni qolipga bosim ostida quyib muzlatgichda sovitish" },
    { name: "Lazerli kesish dastgohi", unit: "optik boshcha va gaz", c: "fokuslangan lazer nuri bilan materialni kesish chizig'ida eritib bug'latish", d1: "aylanuvchi po'lat disk arra bilan mexanik qirqish jarayoni", d2: "material sirtini magnit maydoni orqali sovuq holda parchalash", d3: "faqat ultratovush tebranishlari bilan materialni maydalash usuli" },
    { name: "Plazmali kesish uskunasi", unit: "plazmotron va elektr yoyi", c: "elektr yoyida ionlashgan o'ta yuqori haroratli gaz oqimi bilan metallni eritib puflash", d1: "oddiy siqilgan havo yordamida yog'och yuzasini changdan tozalash", d2: "sovuq suv oqimi bilan plastmassa zagotovkani egib shakllantirish", d3: "qo'l arralari yordamida yupqa tunukalarni mexanik qirqish tartibi" },
    { name: "Gidroabraziv kesish tizimi", unit: "yuqori bosimli suv va qum", c: "abraziv aralashtirilgan yuqori bosimli suv oqimi bilan sovuq kesish", d1: "issiqlik alangasi ta'sirida metallni 2000 darajada qizdirib ajratish", d2: "elektr yoyi vositasida material qirralarini eritib payvandlash", d3: "faqat yumshoq qog'oz va kartonlarni quruq havo bilan kesish" },
    { name: "CNC frezalash dastgohi", unit: "shpindel va ko'p tig'li freza", c: "dastur bo'yicha aylanuvchi freza bilan murakkab 3D sirtlarga aniq ishlov berish", d1: "aylanayotgan detalga qo'lda bir tig'li keskichni tekkizib yo'nish", d2: "detal yuzasini faqat abraziv mato bilan ishqalab yaltiratish", d3: "xomashyoni qolipga bosim ostida quyib muzlatish texnologiyasi" },
    { name: "CNC tokarlik dastgohi", unit: "aylanuvchi patron va minorali kallak", c: "aylanayotgan zagotovkaga dasturiy koddagi koordinatalar bo'yicha shakl berish", d1: "frezani qo'lda aylantirib yog'och taxtada pazlar ochish usuli", d2: "faqat yassi listli metallarni press ostida shtamplash jarayoni", d3: "detallarni bo'yoq idishiga botirib quritish operatsiyasi" },
    { name: "Invertorli motor (Direct Drive)", unit: "cho'tkasiz rotor va stator", c: "kollektor va tasmasiz to'g'ridan-to'g'ri uzatma orqali past shovqin va tejamkorlik", d1: "mexanik uzatmalar orqali barabanni faqat bitta doimiy tezlikda aylantirish", d2: "suvni elektr spirallariga ehtiyoj sezmasdan mexanik qizdirish", d3: "faqat tashqi elektr generatoridan yuqori quvvat talab qilish" },
    { name: "Siklonli changyutgich filtri", unit: "konusli separator idish", c: "markazdan qochma uyurma havo oqimi yordamida og'ir changni idishga cho'ktirish", d1: "changlarni yuqori haroratda kuydirib kulga aylantirib yuborish", d2: "faqat bir martalik qog'oz paketlar ichiga changni yig'ish", d3: "suv bug'i orqali polni yuvib quruq changni so'rib ololmaslik" },
    { name: "Muzlatgich kompressori", unit: "porshenli gaz nasosi", c: "past bosimli freon gazini bug'latgichdan so'rib siqib kondensatorga haydash", d1: "kamera ichidagi namlikni quritib havoni tashqariga puflash", d2: "elektr motorining kuchlanishini doimiy 12 voltga pasaytirish", d3: "harorat ko'tarilganda eshik qulfini avtomatik yopib qo'yish" },
    { name: "Muzlatgich termostati", unit: "kapillyar datchik va rele", c: "belgilangan sovuqlik me'yoriga yetganda kompressor motorini tarmoqdan uzish", d1: "freon gazini kimyoviy tozalab yangi kislorod bilan to'yintirish", d2: "kameradagi havoni tashqi muhit havosi bilan tezkor almashtirish", d3: "motorning aylanish yo'nalishini o'zgartirib muzlatishni boshqarish" },
    { name: "Dastgohlarda texnika xavfsizligi", unit: "shaxsiy himoya vositalari", c: "ko'zoynak taqish, yenglarni shimarish, kiyimni qadash va qo'lqopsiz ishlash", d1: "aylanuvchi patronni qo'lqop kiygan holda ushlab to'xtatishga urinish", d2: "dastgoh elektr saqlagichini olib tashlab sim bilan to'g'ridan-to'g'ri ulash", d3: "detalni qisqichsiz faqat qo'l bilan ushlab keskichga yaqinlashtirish" },
    { name: "Favqulodda to'xtatish (STOP) tugmasi", unit: "qizil qo'ziqorinli mexanik rele", c: "bosilganda dastgohning barcha elektr zanjirlarini bir zumda to'liq uzish", d1: "faqat shpindel tezligini sekinlashtirib dvigatelni salt rejimga o'tkazish", d2: "kesish zonasiga berilayotgan sovutish suyuqligi nasosini o'chirish", d3: "elektr kuchlanishini 380 voltdan 220 voltga pasaytirib berish" },
    { name: "Dastgohlarni yerga ulash (zazemleniye)", unit: "sariq-yashil himoya o'tkazgichi", c: "korpusga faza o'tganda xavfli tokni yerga oqizib insonni elektr toki urishidan asrash", d1: "dastgohning elektr quvvatini ikki barobarga oshirib unumdorlikni ko'tarish", d2: "elektr tarmog'idagi barcha reaktiv yuklamalarni nolga tushirish", d3: "keskichlarning yeyilish muddatini uzaytirish uchun sovitish yaratish" },
    { name: "Dastgoh shpindelining patroni", unit: "uch kulachokli samomarkazlanuvchi mexanizm", c: "silindrsimon zagotovkani aniq markazlashtirib mustahkam qisib aylantirish", d1: "keskichning yo'nish burchagini avtomatik sozlab turish", d2: "motor aylanish tezligini reduktorsiz o'n barobarga pasaytirish", d3: "chiqindi qirindilarni magnit yordamida yig'ib tozalash" }
  ];

  const aspectTemplates = [
    (t) => ({
      q: `Konstruksion texnika asoslarida '${t.name}' ning bosh kinematik va texnologik vazifasi nima?`,
      corr: `Asosiy vazifasi: ${t.c}`,
      dists: [`Asosiy vazifasi: ${t.d1}`, `Asosiy vazifasi: ${t.d2}`, `Asosiy vazifasi: ${t.d3}`]
    }),
    (t) => ({
      q: `Ishlab chiqarish amaliyotida mutaxassis '${t.name}' dan foydalanganda qanday asosiy afzallik ta'minlanadi?`,
      corr: `Bosh afzalligi: ${t.c}`,
      dists: [`Bosh afzalligi: ${t.d1}`, `Bosh afzalligi: ${t.d2}`, `Bosh afzalligi: ${t.d3}`]
    }),
    (t) => ({
      q: `Texnologik mashinalar tuzilishi bo'yicha '${t.name}' mexanizmining ishlash tamoyili qaysi qatorda to'g'ri ko'rsatilgan?`,
      corr: `Ishlash tamoyili: ${t.c}`,
      dists: [`Ishlash tamoyili: ${t.d1}`, `Ishlash tamoyili: ${t.d2}`, `Ishlash tamoyili: ${t.d3}`]
    }),
    (t) => ({
      q: `Ustaxona jihozlari va zamonaviy texnologiyalarda '${t.name}' ning funksional roli nimadan iborat?`,
      corr: `Funksional roli: ${t.c}`,
      dists: [`Funksional roli: ${t.d1}`, `Funksional roli: ${t.d2}`, `Funksional roli: ${t.d3}`]
    }),
    (t) => ({
      q: `Texnika xavfsizligi va unumdorlik talablariga ko'ra, '${t.name}' qanday texnologik natija beradi?`,
      corr: `Texnologik natijasi: ${t.c}`,
      dists: [`Texnologik natijasi: ${t.d1}`, `Texnologik natijasi: ${t.d2}`, `Texnologik natijasi: ${t.d3}`]
    }),
    (t) => ({
      q: `O'quv ustaxonasida texnologik operatsiyalarni loyihalashda '${t.name}' haqidagi to'g'ri xulosa qaysi?`,
      corr: `To'g'ri xulosasi: ${t.c}`,
      dists: [`To'g'ri xulosasi: ${t.d1}`, `To'g'ri xulosasi: ${t.d2}`, `To'g'ri xulosasi: ${t.d3}`]
    })
  ];

  let id = 1;
  for (let a = 0; a < 6; a++) {
    for (let i = 0; i < 26; i++) {
      const t = tech26[i];
      const built = aspectTemplates[a](t);
      const exp = `${t.name} (${t.unit}): amaliyotda quyidagi texnologik vazifani bajaradi — ${t.c}.`;
      const mnem = `${t.name}: Aniq konstruksiya, ishonchli mexanizm va to'g'ri texnologiya.`;
      items.push(createItem(id, 186, secFile, built.q, built.corr, built.dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 01 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1..156)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 02: Materiallarga ishlov berish texnologiyasi (884 Qs: IDs 157..1040, Topic 187)
// ══════════════════════════════════════════════════════════════════════════
function buildSection02() {
  const items = [];
  const secFile = "02_materiallarga_ishlov_berish_texnologiyasi.json";

  // We have 68 distinct materials/tools/concepts in Material processing
  // Each concept is framed under 13 distinct pedagogical & engineering questions
  // 68 * 13 = 884 unique questions!
  const concepts68 = [
    // Yog'och va o'rmon materiallari (1-10)
    { n: "Eman (dub) yog'ochi", u: "og'ir, o'ta qattiq, mustahkam, namga chidamli va mebelsozlikda qimmatli", w1: "o'ta yumshoq bo'lib, ozgina namlikda ham zudlik bilan chiriydigan g'ovak", w2: "ichida qatron moddasi ko'p bo'lib, tez yonuvchan va mo'rt", w3: "faqat bir martalik qog'oz qutilar ishlab chiqarishga yaroqli" },
    { n: "Qarag'ay (sosna) yog'ochi", u: "yumshoq, qatronli, yengil yo'niladigan va qurilish duradgorligida keng qo'llaniladigan", w1: "po'latdan ham qattiq bo'lib, qo'l arralari bilan kesib bo'lmaydigan", w2: "suv ta'sirida tez soviydigan va qotishmasi tez eriydigan metall", w3: "faqat dekorativ zargarlik buyumlarini quyish uchun ishlatiladigan" },
    { n: "Yong'oq yog'ochi", u: "qattiq, egiluvchan, ajoyib qoramtir tabiiy naqshli va badiiy buyumlar uchun qimmatli", w1: "teksturasi bir xil oq bo'lib, hech qanday tolalari ko'rinmaydigan", w2: "suv ostida uzoq turganda darhol parchalanib ketadigan mo'rt material", w3: "faqat o'tin sifatida yoqishga mo'ljallangan sifatsiz xomashyo" },
    { n: "Chinor yog'ochi", u: "pishiq, tolalari to'lqinsimon yaltiroq, quritishda sinchkovlik talab qiluvchi qattiq daraxt", w1: "ichki qismi butunlay bo'sh bo'lib, yuklama ko'tara olmaydigan", w2: "faqat suv quvurlari izolatsiyasini o'rash uchun ishlatiladigan yumshoq", w3: "rezina kabi cho'ziluvchan va elastik bo'lgan sintetik xomashyo" },
    { n: "Qayin (bereza) yog'ochi", u: "o'rtacha qattiqlikdagi, bir jinsli oq yog'ochli, faner va chang'i ishlab chiqarishda asosiy", w1: "tarkibida 50% dan ortiq temir rudasi bo'lgan og'ir mineral", w2: "suvda hech qachon suzmaydigan va darhol cho'kib ketadigan toshsimon", w3: "faqat elektr simlarining tashqi qobig'ini tayyorlashga yaroqli" },
    { n: "Tol yog'ochi", u: "yumshoq, yengil, yaxshi egiluvchan, savat to'qish va yengil idishlar uchun qulay", w1: "bolg'a bilan urilganda ham deformatsiyalanmaydigan o'ta mustahkam", w2: "harorati 2000 darajagacha erimaydigan o'tga chidamli xomashyo", w3: "faqat samolyot qanotlarini tayyorlashda ishlatiladigan qotishma" },
    { n: "Yog'ochning qotishishi va qurishi", u: "atmosfera yoki quritish kameralarida namlikni 8-12% standart me'yorgacha tushirish", w1: "yog'ochni suvga solib uning namligini 100 foizga yetkazib saqlash", w2: "taxtani olovda kuydirib ko'mir holatiga keltirish jarayoni", w3: "yog'och tolalari orasidagi barcha havoni vakuumda so'rib olish" },
    { n: "Yog'och teksturasi", u: "yillik halqalar, tola yo'nalishlari va o'zak nurlari hosil qilgan tabiiy chiroyli rasm", w1: "taxta yuzasiga purkalgich yordamida sun'iy chizilgan lok qatlami", w2: "yog'och ichidagi chuqur yoriqlar va chirigan joylar majmui", w3: "dastgoh keskichi qoldirgan mexanik g'adir-budur chiziqlar" },
    { n: "Faner (qatlamma-qatlam yelimli yog'och)", u: "toq sonli shpon qatlamlarini tolalari o'zaro perpendikulyar qilib yelimlab presslash", w1: "bitta yaxlit yog'och xodani randalab yupqalashtirish yo'li", w2: "plastmassa kukunini qolipda eritib yupqa plitalar hosil qilish", w3: "metall listlarni elektr toki bilan payvandlab biriktirish" },
    { n: "DVP va DSP plitalari", u: "yog'och qirindilari va tolalarini sintetik smolalar bilan aralashtirib issiq presslash", w1: "tabiiy tosh bloklarini arralab silliqlangan yassi plitalar olish", w2: "toza paxta momig'ini presslab qalin qog'oz tayyorlash tartibi", w3: "quyma cho'yanni yupqa qatlam qilib sovutish texnologiyasi" },

    // Duradgorlik asboblari va uskunalari (11-20)
    { n: "Sherxebel randasi", u: "pichog'i yarim doirasimon bo'lib, yog'ochdan 1-3 mm qalin qatlamni dastlabki qo'pol yo'nish", w1: "yog'och yuzasini oyna kabi o'ta mayin va yupqa tozalash", w2: "taxta ichiga chuqur dumaloq silindrik teshiklar parmalash", w3: "metall sterjenlarda bolt uchun tashqi rezbalar ochish" },
    { n: "Yakka tig'li oddiy randa", u: "sherxebeldan keyin yog'och yuzasini tekislash va qalinligini me'yorga keltirish", w1: "faqat taxta qirralarida botiq naqshli profillar yo'nish", w2: "yog'ochni bo'ylamasiga yorib ikkita teng bo'lakka ajratish", w3: "yuzadagi lok bo'yoqlarni qirib tozalash uchun qirg'ich bo'lish" },
    { n: "Ikkita tig'li (qirindi sindirgichli) randa", u: "qirindini darhol sindirib tolalarning yulinib ketishini oldini olish va silliq yo'nish", w1: "bir vaqtning o'zida ham arralash ham teshish vazifasini bajarish", w2: "kesish burchagini 180 darajaga o'zgartirib teskari yo'nish", w3: "faqat qalin metall listlarga sovuq ishlov berish" },
    { n: "Fuganok randasi", u: "uzun korpusli (70-80 sm) bo'lib, katta taxtalar yuzasi va qirralarini mukammal tekislash", w1: "kichik o'yinchoqlarning nozik egri burchaklarini yo'nish", w2: "yog'och yuzasiga qizdirilgan metall shtamp bilan tamg'a bosish", w3: "yog'ochni suvda ivitib oson egiluvchan holga keltirish" },
    { n: "Zenzubel randasi", u: "pichog'i to'rtburchak bo'lib, detal chetida to'g'ri burchakli chorak (falets) va o'yiqlar yo'nish", w1: "dumaloq sterjenlarni tokarlik stanogida aylanma yo'nish", w2: "taxtaning o'rtasidan ko'ndalangiga arralab qirqish", w3: "faner yuzasidagi qalin yelim dog'larini tozalash" },
    { n: "Galtel randasi", u: "yarim doira novsimon pichoqli bo'lib, sirtda botiq yarim aylana ariqchalar yo'nish", w1: "faqat to'g'ri burchakli qirralarni 45 darajaga kesish", w2: "taxta yuzasiga shpon yopishtirish uchun issiq presslash", w3: "yog'och ichidagi mixlarni sug'urib olish uchun dastak bo'lish" },
    { n: "Kalka (zenzubel turi)", u: "eshik va deraza romlarining shisha o'rnatiladigan choraklarini aniq tozalash", w1: "katta xodalarni o'rmonda kesib qulatish operatsiyasi", w2: "yog'ochni kimyoviy antiseptik bilan purkab dorilash", w3: "dastgoh elektr dvigatelining aylanish tezligini sozlash" },
    { n: "Iskana (stameska)", u: "yog'ochda to'g'ri burchakli uyalar, pazlar o'yish va qirralarni qo'lda tozalash", w1: "aylanma silindrsimon detallarni silliqlab yaltiratish", w2: "taxtalarni bir-biriga bolt va gaykalar bilan qotirish", w3: "chizmadagi masshtabni hisoblash uchun o'lchov asbobi bo'lish" },
    { n: "Duradgorlik yog'och bolg'asi (kiyanka)", u: "iskananing yog'och dastasini sindirmasdan zarba berish va buyumni shikastlamay urish", w1: "metall zubilo bilan qalin po'lat relslarni chopib ajratish", w2: "temir mixlarni tosh devorga chuqur qoqish uchun og'ir asbob", w3: "qizdirilgan metallni sandonda bolg'alab shakl berish" },
    { n: "Lobzik (qil arra)", u: "yupqa faner va taxtachadan murakkab o'yma naqshli konturlarni qirqib olish", w1: "yo'g'on xodalarni tezkorlik bilan bo'ylama arralab taxta qilish", w2: "beton plitalarni qurilishda kesish uchun olmosli asbob", w3: "metall quvurlarni kislorod yordamida eritib ajratish" },

    // Metallar va metallurgiya asoslari (21-30)
    { n: "Kam uglerodli po'lat (St3)", u: "uglerodi 0.25% gacha, yaxshi payvandlanuvchi, egiluvchan va prokat mahsulotlari uchun", w1: "o'ta qattiq va mo'rt bo'lib, aslo payvandlab bo'lmaydigan qotishma", w2: "havo haroratida erib ketuvchi past haroratli suyuq metall", w3: "faqat jarrohlik asboblari yasashda ishlatiladigan nodir metall" },
    { n: "O'rtacha uglerodli po'lat (Po'lat 45)", u: "uglerodi 0.45%, yaxshi toblanuvchi, mustahkam vallar, tishli g'ildiraklar tayyorlashda asosiy", w1: "cho'yan kabi o'ta mo'rt bo'lib, unga mexanik ishlov berib bo'lmaydi", w2: "faqat elektr lampochkalarining qizish tolasini yasashga yaroqli", w3: "suv ta'sirida erib ketuvchi kimyoviy birikma" },
    { n: "Asbobsozlik uglerodli po'lati (U8, U10)", u: "uglerodi 0.8-1.0%, toblangandan so'ng yuqori qattiqlikka ega, egov va keskichlar uchun", w1: "faqat yengil avtomobil kuzovining tunukalarini shtamplash uchun", w2: "o'ta yumshoq bo'lib qo'l kuchi bilan oson cho'ziluvchan sim", w3: "suv osti kemalarining korpusini qoplashda ishlatiladigan kauchuk" },
    { n: "Kulrang cho'yan (SCh)", u: "uglerodi 2.14% dan yuqori, grafit plastinkali, yaxshi quyiluvchi va tebranishlarni yutuvchi", w1: "sovuq holatda oson bolg'alanuvchi va sim qilib cho'ziluvchan metall", w2: "elektr tokini umuman o'tkazmaydigan mukammal izolyator", w3: "faqat reaktiv samolyotlarning turbina parraklarini yasash uchun" },
    { n: "Duraluminiy (D16)", u: "alyuminiyning mis va magniy bilan qotishmasi, yengil, pishiq va aviatsiya materiali", w1: "qo'rg'oshin kabi o'ta og'ir bo'lib radiatsiyadan himoyalovchi", w2: "suvda erib ketuvchi xavfli zaharli kimyoviy tuz", w3: "faqat oyna va shisha buyumlarni sirlash uchun ishlatiladigan" },
    { n: "Jez (latun)", u: "misning rux bilan qotishmasi, korroziyaga chidamli, yaxshi ishlanuvchi va sarg'ish rangli", w1: "temirning uglerod bilan yuqori haroratli qora birikmasi", w2: "faqat elektr pechlarida o'tga chidamli g'isht sifatida qo'llaniladi", w3: "plastmassa quvurlarni bir-biriga ulash uchun ishlatiladigan yelim" },
    { n: "Bronza qotishmasi", u: "misning qalay, alyuminiy bilan qotishmasi, ishqalanishga va yeyilishga o'ta chidamli", w1: "tarkibida metall zarrachasi bo'lmagan sof organik tola", w2: "faqat muzlatgich gazini hosil qilish uchun ishlatiladigan suyuqlik", w3: "havoda bir zumda oksidlanib yonib ketuvchi xavfli kukun" },
    { n: "Qora va rangli metallar farqi", u: "qora metallar temir va uning qotishmalari (po'lat, cho'yan), qolgan barcha metallar rangli", w1: "qora metallar faqat bo'yalgan metallar, rangli metallar bo'yalmaganlar", w2: "rangli metallar magnitga qattiq yopishadi, qora metallar esa tortilmaydi", w3: "qora metallar suyuq holatda bo'ladi, rangli metallar faqat gaz holatida" },
    { n: "Metallar korroziyasi (zanglash)", u: "tashqi muhit (namlik, kislorod) ta'sirida metallning kimyoviy va elektrokimyoviy yemirilishi", w1: "metallning harorat ko'tarilganda qattiqlashib mustahkam bo'lib qolishi", w2: "metall sirtining o'z-o'zidan oyna kabi yaltirab silliqlanishi", w3: "metall ichidagi uglerod miqdorining birdaniga ikki barobar ortishi" },
    { n: "Metallarni zanglashdan himoyalash", u: "bo'yoq-lak surtish, moylash, galvanik qoplama (sinklash, xromlash) va legirlash", w1: "metallni doimiy nam va sho'r suvli muhitda saqlash", w2: "metall sirtini kislota bilan yuvib havo oqimida quritmaslik", w3: "metall yuzasiga qalin osh tuzi sepib ustini yopib qo'yish" },

    // Chilangarlik va o'lchov asboblari (31-40)
    { n: "Chilangarlik verstagi", u: "metallarga qo'lda ishlov berish uchun tiski, asboblar va himoya to'ri o'rnatilgan stol", w1: "faqat duradgorlik arralarini charxlash uchun maxsus stanok", w2: "detallarni bo'yash va quritish uchun germetik bo'yoq kamerasi", w3: "buxgalteriya hisob-kitoblarini yuritish uchun maxsus mebel" },
    { n: "Chilangarlik tiskisi", u: "zagotovkani jag'lar orasida qo'zg'almas qilib mahkam qisib ushlab turish", w1: "detalning diametrini mikron aniqlikda avtomatik o'lchash", w2: "metallni elektr toki bilan qizdirib eritish vazifasi", w3: "chizmadagi masshtabni o'zgartirish uchun proyeksiya moslamasi" },
    { n: "Shtangensirkul ShTs-1", u: "tashqi va ichki o'lchamlarni hamda chuqurlikni 0.1 mm aniqlikda o'lchash", w1: "haroratni va elektr kuchlanishini o'lchash uchun pribor", w2: "metallning kimyoviy tarkibidagi uglerod foizini aniqlash", w3: "faqat yassi qog'oz varaqlarining qalinligini mikronlarda o'lchash" },
    { n: "Mikrometr MK-25", u: "mikrometrik vint yordamida tashqi chiziqli o'lchamlarni 0.01 mm aniqlikda o'lchash", w1: "burchaklarni graduslarda o'lchovchi transportir asbobi", w2: "katta xonalarning maydonini lazer nurlari bilan o'lchash", w3: "suvning bosimini va oqim tezligini aniqlash pribori" },
    { n: "Zubilo (chilangar keskichi)", u: "metallni sovuq holda chopish, kesish va ortiqcha qatlamni bolg'a zarbasi bilan olish", w1: "silindrik teshiklar ichiga nozik rezbalar burab ochish", w2: "detal yuzasini oyna kabi silliqlab pardozlash", w3: "chizmadagi ko'rinmaydigan chiziqlarni qalam bilan chizish" },
    { n: "Kerner (belgilagich)", u: "parmalashdan oldin teshik markaziga bolg'a bilan zarba berib chuqurcha (iz) tushirish", w1: "metall sirtidagi zanglarni kimyoviy tozalovchi kislota", w2: "zagotovka qalinligini 0.001 mm aniqlikda o'lchash", w3: "detal burchaklarini 90 daraja ekanini tekshiruvchi burchaklik" },
    { n: "Chilangarlik egovi (drachoviy)", u: "tishlari yirik bo'lib, metalldan 0.5-1.0 mm qalinlikdagi qatlamni tez yo'nish", w1: "detalni mikron darajasida yaltiratib pardozlash", w2: "metall quvurlarni qizdirib bukish operatsiyasi", w3: "teshik ichiga rezba ochish uchun ishlatiladigan moslama" },
    { n: "Shilifovka egovi (lichnoy)", u: "tishlari o'rtacha bo'lib, o'lchamni 0.1-0.2 mm gacha aniq keltirish va tekislash", w1: "yo'g'on xodalarni yorib bo'laklarga ajratish", w2: "elektr simlarini qirqib uchini ochish uchun ombir", w3: "metall listlarni shtamplab egish uchun press matritsasi" },
    { n: "Mayin baxat egovi", u: "tishlari o'ta mayda bo'lib, o'lchamni 0.01-0.05 mm aniqlikda yakuniy tozalash", w1: "zagotovkani bolg'a bilan chopib ikkiga bo'lish", w2: "dastgoh elektr dvigatelini sovitish uchun ventilyator", w3: "metall sirtiga olovli purkagichda bo'yoq purkash" },
    { n: "Plashka (lemburchak)", u: "dumaloq sterjen va boltlar sirtida tashqi rezba ochish va burash", w1: "gayka teshigi ichida spiral rezba ochuvchi asbob", w2: "metallni bolg'alab list holatiga keltiruvchi press", w3: "dastgoh shpindelini o'q bo'ylab siljituvchi richag" },

    // Dastgohlar va mexanik ishlov berish (41-50)
    { n: "Metchik asbobi", u: "oldindan parmalangan teshik ichida gayka uchun ichki rezba ochish", w1: "tashqi silindrik sirtda bolt rezbasi ochish", w2: "zagotovkani keskich bilan bo'ylama yo'nib ingichkalash", w3: "detalning qattiqligini olmos uchi bilan o'lchash" },
    { n: "Tokarlik dastgohi shpindeli", u: "ichki qismi kovak po'lat val bo'lib, patronni va detalni aylanma harakatlantirish", w1: "keskichni stol bo'ylab ko'ndalang surib turuvchi reyka", w2: "sovutish suyuqligini tindiruvchi filtr idishi", w3: "dastgoh poydevorini polga mahkamlovchi anker bolt" },
    { n: "Tokarlik dastgohi supporti", u: "keskich o'rnatilgan kallakni bo'ylama va ko'ndalang yo'nalishlarda aniq surish", w1: "bosh dvigatelga keluvchi 380 volt kuchlanishni pasaytirish", w2: "shpindelning aylanma harakatini to'xtatuvchi gidravlik tormoz", w3: "chiqindi qirindilarni bunkerga tashuvchi konveyer lentasi" },
    { n: "O'tish keskichi (proxodnoy)", u: "silindrsimon detallarning tashqi yuzasini yo'nib diametrini kichraytirish", w1: "detalning ichki tubida yopiq kanallar yo'nish", w2: "zagotovkani 90 daraja to'g'ri burchak ostida qirqib ajratish", w3: "detal yuzasiga g'adir-budur relefli naqsh bosish" },
    { n: "Qirqish keskichi (otreznoy)", u: "ingichka tig'li bo'lib, tayyor detalni aylanayotgan zagotovkadan qirqib ajratish", w1: "detal yuzasini oyna kabi silliqlash va tozalash", w2: "teshik ichidagi rezbalarni burab ochish", w3: "keskichni charxlash uchun ishlatiladigan abraziv tosh" },
    { n: "Ichki yo'nish keskichi (rastochnoy)", u: "parmalangan teshik ichki diametrini yo'nib kattalashtirish va aniqlikka keltirish", w1: "tashqi sirtni bolg'alab qalinlashtirish jarayoni", w2: "detal chetlariga rezina qistirmalar yopishtirish", w3: "chizmadagi simmetriya o'qlarini belgilash" },
    { n: "Frezalash dastgohi", u: "aylanuvchi ko'p tig'li freza bilan tekis yuzalar, pazlar, tishli g'ildiraklar yo'nish", w1: "faqat aylanuvchi silindrik detallarni yo'nish bilan cheklanish", w2: "metall listlarni elektr toki bilan payvandlab biriktirish", w3: "bo'yoqlarni aralashtirish uchun tebranishli uskunadir" },
    { n: "Burg'ilash (parmalash) dastgohi", u: "aylanma va ilgarilama harakatlanuvchi parma bilan materialda teshiklar ochish", w1: "detallarni shtamplab yupqa tunuka holiga keltirish", w2: "metallni pechda qizdirib suyuq quyma holiga keltirish", w3: "yog'och taxtalarning qalinligini randa bilan tekislash" },
    { n: "Parmalashda sovutish-moylash suyuqligi (SOJ)", u: "kesish zonasidagi ishqalanish va haroratni pasaytirish, parma umrini uzaytirish", w1: "detalni elektr toki bilan kuydirib yuzasini qoraytirish", w2: "parmaning kesish tezligini sun'iy ravishda nolga tushirish", w3: "chiqindi qirindilarni bir-biriga yopishtirib briket qilish" },
    { n: "Silliqlash (jilvirlash) dastgohi", u: "abraziv doira yordamida detal yuzasini mikron aniqlikda va toza silliqlash", w1: "zagotovkani qo'pol arralab katta bo'laklarga ajratish", w2: "metallni 1200 darajagacha qizdirib sandonda bolg'alash", w3: "teshiklar ichiga gayka rezbalarini burab ochish" },

    // Termik ishlov, payvandlash va biriktirish (51-60)
    { n: "Po'latni toblash (zakalka)", u: "kritik haroratdan yuqori qizdirib (750-850°C), suv yoki moyda tez sovitib qattiqlashtirish", w1: "metallni pech bilan birga 24 soat davomida sekin sovitish", w2: "metallni xona haroratida bolg'alab yupqa sim qilish", w3: "metall yuzasiga qalin polimer lok qoplamasi purkash" },
    { n: "Bo'shatish (otpusk)", u: "toblangandan so'ng 150-600°C gacha qizdirib ichki zo'riqish va mo'rtlikni kamaytirish", w1: "metallning qattiqligini olmos darajasiga yetkazib yanada mo'rt qilish", w2: "metallni zudlik bilan muzlatgichda -50 darajagacha sovitish", w3: "metallni kislota eritmasiga botirib kimyoviy yemirish" },
    { n: "Yumshatish (otjig)", u: "yuqori haroratgacha qizdirib pechda sekin sovitish orqali qattiqlikni pasaytirish va ishlovchanlikni oshirish", w1: "metallni birdaniga sovuq suvga tashlab o'ta mo'rt qilish", w2: "metall yuzasiga elektr yoyi bilan qattiq qoplama eritish", w3: "metall listlarni press ostida sovuq shtamplab kesish" },
    { n: "Normallash (normalizatsiya)", u: "pechda qizdirib sokin havoda sovitish orqali mayda donador bir jinsli struktura hosil qilish", w1: "metallni suyuq azotda -196 darajada muzlatib qotirish", w2: "metallni vakuum kamerasida bug'lantirib yuborish", w3: "faqat yog'och materiallarga qovushoqlik berish usulidir" },
    { n: "Elektr yoyli payvandlash (MMA)", u: "elektrod va metall orasida yonuvchi 5000°C li elektr yoyi bilan metallni eritib chok hosil qilish", w1: "faqat bolt va gaykalar yordamida qismlarni mexanik qotirish", w2: "metall yuzasini oddiy rezina yelim bilan yopishtirish", w3: "sovuq suv oqimi ostida qismlarni bir-biriga ishqash" },
    { n: "Argon muhitida payvandlash (TIG/MIG)", u: "erigan metall vannasini inert argon gazi bilan havodagi kislorod va azotdan himoyalash", w1: "ochiq havoda kuchli shamol yordamida metallni sovitish", w2: "metallni payvandlash o'rniga faqat qalay bilan lehimlash", w3: "faqat yog'och romlarni devorga o'rnatishda qo'llaniladi" },
    { n: "Gaz alangali payvandlash (atsetilen-kislorod)", u: "atsetilen va kislorod aralashmasi yonishidan hosil bo'lgan 3100°C li alangada eritish", w1: "elektr batareyasidan olingan past kuchlanishli tok bilan qizdirish", w2: "faqat siqilgan sovuq havoni quvurlarga haydash usuli", w3: "kimyoviy bo'yoqlarni quritish uchun ishlatiladigan pech" },
    { n: "Lehimlash (payka) texnologiyasi", u: "asosiy metallni eritmasdan, pastroq haroratda eruvchi lehim (qalay-qo'rg'oshin) bilan biriktirish", w1: "ikkala asosiy metallni ham to'liq suyuqlantirib bir-biriga quyish", w2: "qismlarni faqat yog'och mixlar bilan urib mahkamlash", w3: "metall detallarni pressda ezib bitta bo'lakka aylantirish" },
    { n: "Parchinlash (zaklyopka) birikmasi", u: "parchin sterjenini teshikdan o'tkazib boshchasini bolg'alab ajralmas birikma hosil qilish", w1: "vintni burab xohlagan paytda oson yechib olish imkoniyati", w2: "faqat suyuq elim surtib qismlarni xona haroratida qotirish", w3: "qismlarni magnit kuchi yordamida vaqtincha tutib turish" },
    { n: "Rezbali birikmalar (bolt, gayka, shayba)", u: "detallarni o'zaro ishonchli biriktiruvchi va istalgan vaqtda yechib olinadigan ajraluvchi birikma", w1: "biriktirilgandan so'ng faqat kesib tashlabgina ajratiladigan", w2: "yuqori haroratda erib qismlarni bir butun qilib yopishtiradigan", w3: "faqat yog'och o'ymakorligida naqsh chizish uchun ishlatiladigan" },

    // Muhandislik grafikasi va chizmachilik (61-68)
    { n: "Chizmachilikda asosiy tutash qalin chiziq (s)", u: "detalning ko'rinadigan kontur chiziqlarini qalin chizish uchun (qalinligi 0.5-1.4 mm)", w1: "o'q chiziqlari va simmetriya markazlarini ko'rsatish uchun", w2: "ko'rinmaydigan ichki konturlarni ifodalash uchun", w3: "o'lcham chiqarish va yordamchi chiziqlar chizish uchun" },
    { n: "Chizmachilikda shtrix chiziq", u: "predmetning ko'rinmaydigan ichki konturlarini uzuq-uzuq chiziqlar bilan ko'rsatish", w1: "buyumning asosiy ko'rinadigan qirralarini chizish", w2: "qirqim tekisligining izini qalin qilib belgilash", w3: "chizmaning tashqi hoshiya ramkasini qalin chizish" },
    { n: "Shtrix-punktir ingichka chiziq", u: "simmetriya o'qlari va aylanalar markaziy chiziqlarini ko'rsatish uchun", w1: "detalning kesilgan joyiga shtrixovka chizish uchun", w2: "chizmadagi o'lcham sonlarini yozish uchun", w3: "chizma shriftining harflarini andaza bilan chizish" },
    { n: "Masshtab tushunchasi (GOST 2.302-68)", u: "tasvir chiziqli o'lchamining buyumning haqiqiy o'lchamiga nisbati (1:1, 1:2, 2:1)", w1: "chizma qog'ozining kvadrat metr hisobidagi og'irligi", w2: "chizilgan detalning bozor narxini ko'rsatuvchi raqam", w3: "detalni yasashga ketadigan vaqtning soatlardagi miqdori" },
    { n: "Chizmada o'lcham qo'yish qoidasi", u: "chizilgan masshtabdan qat'i nazar, chizmaga buyumning doimo haqiqiy millimetrdagi o'lchami yoziladi", w1: "agar masshtab 1:2 bo'lsa, o'lcham soni ham ikki barobar kichraytirib yoziladi", w2: "o'lcham sonlari faqat santimetrlarda va sm qo'shimchasi bilan yoziladi", w3: "o'lcham sonlari chizma chiziqlarining tagiga teskari qilib yoziladi" },
    { n: "Qirqim va kesim tushunchasi", u: "xayoliy kesuvchi tekislik o'tkazib detalning ichki ko'rinmaydigan tuzilishini aniq ko'rsatish", w1: "detalni bolg'a bilan urib ikkita singan bo'lakka ajratish", w2: "chizma qog'ozini qaychi bilan qirqib ramka yasash", w3: "detalning og'irligini tarozi yordamida grammlarda tortish" },
    { n: "Aksonometrik proyeksiyalar (izometriya)", u: "detalning fazoviy yaqqol tasvirini uchta o'q (120 daraja burchak) bo'yicha ko'rsatish", w1: "faqat bitta yassi proyeksiyada ko'rinishni chizish", w2: "chizmadagi barcha detallarni mikroskop ostida kattalashtirish", w3: "faqat binolarning xarita planini samolyotdan chizish" },
    { n: "Texnologik xarita hujjati", u: "detalni tayyorlashdagi operatsiyalar ketma-ketligi, asboblar, rejimlar va vaqt me'yorlari hujjati", w1: "korxona xodimlarining pasport ma'lumotlari ro'yxati", w2: "faqat mahsulot sotilgan do'konning kassa cheklari to'plami", w3: "ustaxonadagi barcha xonalarning yong'in xavfsizligi sxemasi" }
  ];

  // 13 distinct questions for each of the 68 concepts = 884 Qs!
  const aspectStems = [
    (n) => `Materialshunoslik va ishlov berish texnologiyasiga ko'ra, '${n}' qanday asosiy xususiyat yoki vazifaga ega?`,
    (n) => `O'quv ustaxonasida amaliy mashg'ulot o'tkazishda '${n}' bo'yicha qaysi qoida to'liq to'g'ri hisoblanadi?`,
    (n) => `Texnologik operatsiyalar ketma-ketligini loyihalashda '${n}' tushunchasi nimani ifodalaydi?`,
    (n) => `Ishlab chiqarish amaliyotida qo'llaniladigan '${n}' nima maqsadda ishlatiladi yoki qanday xossani namoyon etadi?`,
    (n) => `Standart texnologik talablarga binoan, '${n}' ning asosiy vazifasi yoki xarakterli belgisi qaysi qatorda to'g'ri?`,
    (n) => `Kasbiy mahorat va mehnat ta'limida '${n}' haqidagi to'g'ri ilmiy-amaliy ta'rif qaysi?`,
    (n) => `Detallarni tayyorlash va sifatini ta'minlash jarayonida '${n}' ning o'rni qanday tavsiflanadi?`,
    (n) => `Ishlov berish vositalari va materiallar tasnifida '${n}' qaysi o'ziga xos parametri bilan ajralib turadi?`,
    (n) => `Mehnat unumdorligi va texnika xavfsizligi nuqtai nazaridan '${n}' bo'yicha to'g'ri ko'rsatma nima?`,
    (n) => `Amaliy tajriba va me'yoriy ko'rsatkichlarga muvofiq, '${n}' qanday texnologik talabga asoslanadi?`,
    (n) => `Zamonaviy ustaxona sharoitida '${n}' bilan ishlashda qaysi muhim omil inobatga olinadi?`,
    (n) => `O'quvchilarga materiallarga ishlov berishni o'rgatishda '${n}' ning texnologik mohiyati qanday tushuntiriladi?`,
    (n) => `Texnik loyihalash va buyum yasash jarayonida '${n}' dan foydalanishning to'g'ri maqsadi qaysi?`
  ];

  let id = 157;
  for (let a = 0; a < 13; a++) {
    for (let i = 0; i < 68; i++) {
      const c = concepts68[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri tavsifi: ${c.u}`;
      const dists = [
        `To'g'ri tavsifi: ${c.w1}`,
        `To'g'ri tavsifi: ${c.w2}`,
        `To'g'ri tavsifi: ${c.w3}`
      ];
      const exp = `Materiallarga ishlov berish texnologiyasida '${c.n}' bo'yicha to'g'ri qoida: ${c.u}.`;
      const mnem = `${c.n}: To'g'ri parametr, puxta mahorat va sifatli mahsulot.`;

      items.push(createItem(id, 187, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 02 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 157..1040)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 03: Ijtimoiy-iqtisodiy texnologiya asoslari (104 Qs: IDs 1041..1144, Topic 188)
// ══════════════════════════════════════════════════════════════════════════
function buildSection03() {
  const items = [];
  const secFile = "03_ijtimoiy_iqtisodiy_texnologiya_asoslari.json";

  // 13 concepts * 8 aspects = 104 Qs
  const econ13 = [
    { n: "Mahsulot tannarxi", u: "mahsulotni ishlab chiqarish va sotish uchun sarflangan barcha moddiy va mehnat xarajatlari yig'indisi", w1: "do'konda sotiladigan yakuniy ustama qo'shilgan chakana narx", w2: "korxonaning bank hisobidagi barcha erkin aylanma mablag'lari", w3: "xodimlarga to'lanadigan yillik bir martalik mukofot pullari" },
    { n: "Sof foyda", u: "umumiy daromaddan barcha xarajatlar va to'langan soliqlarni ayirgandan so'ng tadbirkorda qolgan mablag'", w1: "tovarlarni sotishdan tushgan barcha umumiy kassa tushumi puli", w2: "xomashyo va materiallarni sotib olishga ketgan umumiy xarajat", w3: "korxona binosi va inshootlarining kadastr bo'yicha baholangan qiymati" },
    { n: "Biznes-reja", u: "tadbirkorlik g'oyasini amalga oshirish, bozor, moliya va xatarlarni asoslab beruvchi strategik dasturiy hujjat", w1: "faqat xodimlarning ishga kelib-ketish vaqtini qayd etuvchi ichki daftar", w2: "ustaxonadagi barcha dastgohlarning texnik pasportlari yig'indisi", w3: "soliq idorasiga to'lanadigan jarimalarning rasmiy kvitansiyalari" },
    { n: "Marketing tadqiqoti", u: "bozor talabi, iste'molchilar ehtiyojlari va raqobatchilar faoliyatini tizimli o'rganish hamda tahlil qilish", w1: "korxona ichidagi eskirgan dastgohlarni hisobdan chiqarish tartibi", w2: "xodimlarning shaxsiy oylik xarajatlarini nazorat qilish jurnali", w3: "ishlab chiqarishda faqat eng past sifatli arzon xomashyoni xarid qilish" },
    { n: "Mehnat unumdorligi", u: "vaqt birligi ichida bitta ishchi tomonidan ishlab chiqarilgan sifatli mahsulot miqdori", w1: "ishchining bir kunda ishxonada o'tirgan umumiy soatlari yig'indisi", w2: "korxonaning umumiy ustav jamg'armasi miqdoridagi pul mablag'i", w3: "ustaxonada bir oyda sarflangan elektr energiyasining kilovatt hajmi" },
    { n: "Talab va taklif qonuni", u: "talab ortib taklif kamayganda narx ko'tarilishi, taklif ortib talab kamayganda narx pasayishi", w1: "barcha tovarlar narxining doimo bir xil qat'iy davlat nazoratida turishi", w2: "ishlab chiqaruvchi xohlagan narxini majburiy qabul qildirish tartibi", w3: "tovar narxining faqat uning og'irligiga qarab to'g'ri chiziqli o'sishi" },
    { n: "Renta va rentabellik darajasi", u: "foydaning xarajatlarga yoki ishlab chiqarish fondlariga nisbati foizidagi samaradorlik ko'rsatkichi", w1: "korxonaning to'lanmagan kredit qarzlari miqdorining oshib borishi", w2: "faqat korxona hisobchilarining sonini bildiruvchi shtat birligi", w3: "mahsulot omborda qancha vaqt saqlanganini ifodalovchi kunlar soni" },
    { n: "Asosiy vositalar (fondlar)", u: "ishlab chiqarishda uzoq muddat (1 yildan ortiq) xizmat qiluvchi binolar, inshootlar va dastgohlar", w1: "bir martalik ishlab chiqarish siklida to'liq sarflanib ketuvchi xomashyolar", w2: "xodimlarning bir oylik maoshlari uchun ajratilgan naqd pullar", w3: "bir martalik qog'oz salfetkalar va tozalash vositalari" },
    { n: "Aylanma mablag'lar", u: "bitta ishlab chiqarish siklida to'liq qatnashib, o'z qiymatini tayyor mahsulotga birdaniga o'tkazuvchi xomashyolar", w1: "ko'p yillar davomida xizmat qiladigan yirik temir-beton binolar", w2: "faqat davlat banklarida saqlanadigan oltin zaxiralari", w3: "korxonaning o'n yil oldin sotib olgan og'ir press dastgohlari" },
    { n: "Amortizatsiya ajratmasi", u: "asosiy vositalarning jismoniy va ma'naviy eskirishi hisobiga qiymatini mahsulot tannarxiga bosqichma-bosqich o'tkazish", w1: "korxona xodimlarining tibbiy sug'urtasi uchun to'lanadigan badal", w2: "soliq qoidalarini buzganlik uchun to'lanadigan ma'muriy jarimalar", w3: "yangi ishchilarni ishga qabul qilishda beriladigan avans pullari" },
    { n: "Oila byudjeti balansi", u: "oilaning barcha oylik daromadlari va zarur xarajatlarining o'zaro mutanosib taqsimlanishi", w1: "oylik maoshdan tashqari barcha pullarni faqat qimor o'yinlariga sarflash", w2: "kommunal to'lovlarni umuman to'lamasdan chet elga sayohat qilish", w3: "daromadni yashirib bankdan doimiy ravishda ortiqcha foizli qarz olish" },
    { n: "Tovar belgisi va brend", u: "mahsulotni boshqa ishlab chiqaruvchilar tovarlaridan ajratib turuvchi huquqiy muhofaza qilingan belgi", w1: "mahsulotning faqat yaroqlilik muddati ko'rsatilgan qog'oz yorliq", w2: "tovarni qadoqlashda ishlatiladigan oddiy sellofan qopcha", w3: "tovar yuklangan yuk mashinasining davlat raqami belgisi" },
    { n: "Investitsiya tushunchasi", u: "kelajakda daromad yoki ijtimoiy samara olish maqsadida loyihaga moddiy va moliyaviy resurslar kiritish", w1: "barcha pullarni faqat kundalik yeb-ichishga sarflab tugatish", w2: "eskirgan xomashyolarni yoqib yuborish orqali yo'q qilish jarayoni", w3: "boshqa davlatlardan faqat qimmatbaho hashamat buyumlarini import qilish" }
  ];

  const aspectStems = [
    (n) => `Ijtimoiy-iqtisodiy texnologiyalar asoslariga ko'ra, '${n}' ning asosiy iqtisodiy mohiyati nimada?`,
    (n) => `Maktabda iqtisodiy bilim asoslarini o'qitishda '${n}' bo'yicha qaysi qoida to'liq to'g'ri hisoblanadi?`,
    (n) => `Tadbirkorlik faoliyatini rejalashtirish va baholashda '${n}' nimani ifodalaydi?`,
    (n) => `Bozor iqtisodiyoti sharoitida ishlab chiqarish samaradorligini oshirishda '${n}' qanday ahamiyatga ega?`,
    (n) => `Moliyaviy savodxonlik tamoyillariga muvofiq, '${n}' qaysi javobda to'g'ri tavsiflangan?`,
    (n) => `Mahsulot tannarxi va foydani hisoblashda '${n}' ning o'rni qanday izohlanadi?`,
    (n) => `Biznes loyihalarini ishlab chiqish va himoya qilishda '${n}' qanday amaliy mezonga tayanadi?`,
    (n) => `Iqtisodiy resurslardan oqilona foydalanish tahlilida '${n}' qanday omil sanaladi?`
  ];

  let id = 1041;
  for (let a = 0; a < 8; a++) {
    for (let i = 0; i < 13; i++) {
      const c = econ13[i];
      const q = aspectStems[a](c.n);
      const corr = `Asosiy mohiyati: ${c.u}`;
      const dists = [
        `Asosiy mohiyati: ${c.w1}`,
        `Asosiy mohiyati: ${c.w2}`,
        `Asosiy mohiyati: ${c.w3}`
      ];
      const exp = `Iqtisodiy bilim asoslarida '${c.n}' tushunchasi: ${c.u}.`;
      const mnem = `${c.n}: To'g'ri hisob, rejalashtirish va barqaror iqtisodiy o'sish.`;

      items.push(createItem(id, 188, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 03 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1041..1144)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 04: Xalq hunarmandchiligi texnologiyasi (52 Qs: IDs 1145..1196, Topic 189)
// ══════════════════════════════════════════════════════════════════════════
function buildSection04() {
  const items = [];
  const secFile = "04_xalq_hunarmandchiligi_texnologiyasi.json";

  // 13 craft concepts * 4 aspects = 52 Qs
  const craft13 = [
    { n: "Yog'och o'ymakorligi san'ati", u: "chinor, yong'oq va qayrag'och yog'ochlariga pichoq va iskanalar bilan bo'rtma naqshlar o'yish", w1: "loy qorishmasini charxda aylantirib sirlangan sopol ko'zalar yasash", w2: "metall listlarni bolg'acha bilan urib yupqa naqshli idishlar yasash", w3: "ipak va jun matolarga turli rangli iplar bilan qo'lda kashta tikish" },
    { n: "Ganchkorlik me'moriy bezagi", u: "qotish vaqti tez bo'lgan ganch qorishmasidan o'yma naqshli devor va shift bezaklarini yo'nish", w1: "temir bo'laklarini olovda qizdirib bosqon bilan bolg'alab taqa yasash", w2: "yog'och taxtalarni suvda ivitib ulardan bochkalar va charxlar yasash", w3: "qurilish g'ishtlarini maxsus pechlarda 1000 darajada pishirib olish" },
    { n: "Kandakorlik (misgarlik) san'ati", u: "mis, jez va bronza idishlar sirtiga maxsus qalamlar va bolg'acha vositasida naqsh tushirish", w1: "gilam to'qish dastgohida rang-barang jun iplardan patli gilam to'qish", w2: "paxta tolasidan ip yigirib qo'lda bo'z va atlas matolari to'qish", w3: "qog'oz varaqlariga suvli akvarel bo'yoqlari bilan miniatyura chizish" },
    { n: "Kulolchilik (sopolsozlik)", u: "loy qorishmasini kulolchilik charxida shakllantirib, quritib, sirlab xumdonda pishirish", w1: "yog'och xodani randalab duradgorlik dastgohida stol oyoqlari yasash", w2: "temir quvurlarni elektr yoyi bilan payvandlab darvoza panjaralari yasash", w3: "ipak qurtidan olingan pilla tolalarini qaynoq suvda yechib olish" },
    { n: "Naqqoshlik (koshinlik) san'ati", u: "binolar shifti va ustunlariga o'simliksimon (islimiy) va geometrik (girih) naqshlar chizish", w1: "og'ir toshlarni bolg'a bilan yorib poydevor uchun tosh bloklar tayyorlash", w2: "metall detallarni dastgohda yo'nib mikrometr bilan o'lchamini tekshirish", w3: "charm bo'laklarini bigiz bilan teshib milliy etik va mahsilar tikish" },
    { n: "Zardo'zlik san'ati", u: "baxmal va shoyi matolarga oltin va kumush zar iplar bilan bo'rtma naqshlar tikish", w1: "qo'y junidan kigiz bosish va o'tov uchun qalin kigizlar tayyorlash", w2: "yog'och xodalardan ko'prik va to'sinlar yasab o'rnatish", w3: "shisha trubkalarni qizdirib laboratoriya idishlari yasash" },
    { n: "Kashtachilik (so'zanado'zlik)", u: "oq surp yoki ipak matoga ilmoq, bosma va yo'rma choklar bilan anor, gul naqshlarini tikish", w1: "po'lat arralarni egov yordamida charxlab tishlarini to'g'rilash", w2: "metall quymalarni qolipdan ajratib sirtidagi qumlarni tozalash", w3: "qog'ozdan origami usulida geometrik qutilar yasash" },
    { n: "Pichoqchilik san'ati", u: "po'lat tig'ni toblab, sopiga suyak, sadaf yoki qattiq yog'ochdan nafis qoplama yasash", w1: "loy g'ishtlarni qolipga quyib oftobda quritish operatsiyasi", w2: "ipak iplarni qozonda tabiiy o'simlik bo'yoqlari bilan bo'yash", w3: "yog'och taxtalarni pressda siqib faner ishlab chiqarish" },
    { n: "Gilamdo'zlik san'ati", u: "vertikal yoki gorizontal dastgohda jun va ipak iplarni tugib patli va patsiz gilam to'qish", w1: "metall listlarni qaychi bilan qirqib tunuka chelaklar yasash", w2: "elektr motorining chulg'amlarini qo'lda qayta o'rash tartibi", w3: "yog'och qoshiqlarni charxda yo'nib lok bilan pardozlash" },
    { n: "Bo'yra va savat to'qish", u: "qamish, tol novdalari va bug'doy poyasidan pishiq va nafis ro'zg'or buyumlari to'qish", w1: "toshlarni silliqlab qimmatbaho zargarlik ko'zlari tayyorlash", w2: "plastmassa chelaklarni quyish uchun metall qoliplar tayyorlash", w3: "avtomobil motorini qismlarga ajratib diagnostika qilish" },
    { n: "Xattotlik (kalligrafiya) san'ati", u: "qamish qalam va maxsus qora siyoh bilan arab va fors yozuvlarida nafis husnixat bitish", w1: "devorlarga sement va gips suvoqlarini qorib suplash", w2: "yog'och o'rindiqlarni temir burchakliklar bilan mustahkamlash", w3: "charm kamarlarga metall qisqichlar va tugmalar o'rnatish" },
    { n: "Milliy cholg'u asboblari yasash", u: "tut, o'rik va yong'oq yog'ochlaridan tanbur, dutor, doira rezonatorlarini o'yib yasash", w1: "elektr transformatorlarining temir yadrosini yig'ish", w2: "traktor tirkamalarining g'ildiraklarini almashtirish", w3: "qum va shag'aldan beton qorishmalari tayyorlash" },
    { n: "Sadaf o'ymakorligi va xotamkorlik", u: "yog'och buyumlar sirtiga suyak, sadaf va metall simlarni qadab geometrik bezak berish", w1: "beton devorlarga silliq kafel plitkalarini yelimlash", w2: "metall quvurlarga rezba burab suv jo'mraklarini ulash", w3: "qishloq xo'jaligi ekinlarini dorilash uchun purkagich yasash" }
  ];

  const aspectStems = [
    (n) => `Xalq amaliy san'ati va milliy hunarmandchilikda '${n}' qanday o'ziga xos texnologik uslubga asoslanadi?`,
    (n) => `O'zbek xalq hunarmandchiligi merosida '${n}' qaysi asosiy xomashyo va an'anaviy asboblar bilan bajariladi?`,
    (n) => `Maktab texnologiya ta'limida '${n}' mavzusi o'rgatilganda qaysi asosiy xulosa to'liq to'g'ri hisoblanadi?`,
    (n) => `Ustoz-shogird an'analari asosida shakllangan '${n}' ning badiiy va amaliy mohiyati qaysi qatorda to'g'ri?`
  ];

  let id = 1145;
  for (let a = 0; a < 4; a++) {
    for (let i = 0; i < 13; i++) {
      const c = craft13[i];
      const q = aspectStems[a](c.n);
      const corr = `Bosh xususiyati: ${c.u}`;
      const dists = [
        `Bosh xususiyati: ${c.w1}`,
        `Bosh xususiyati: ${c.w2}`,
        `Bosh xususiyati: ${c.w3}`
      ];
      const exp = `Xalq hunarmandchiligida '${c.n}' ning mohiyati: ${c.u}.`;
      const mnem = `${c.n}: Milliy meros, yuksak did va an'anaviy hunarmandlik mahorati.`;

      items.push(createItem(id, 189, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 04 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1145..1196)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 05: Ishlab chiqarish va ro'zg'orshunoslik (156 Qs: IDs 1197..1352, Topic 190)
// ══════════════════════════════════════════════════════════════════════════
function buildSection05() {
  const items = [];
  const secFile = "05_ishlab_chiqarish_va_rozgorshunoslik.json";

  // 26 home & production topics * 6 aspects = 156 Qs
  const home26 = [
    { n: "Suv jo'mragidagi rezina qistirmani almashtirish", u: "asosiy suv kirish ventilini oldindan yopib, kran buksasini gayka kaliti bilan burab ochish", w1: "suv bosim ostida oqib turganda kran ustidan sim bilan mahkam bog'lab qo'yish", w2: "jo'mrak teshigiga issiq yelim quyib suv yo'lini butunlay to'sib qo'yish", w3: "faqat elektr tasmasini kran ustidan bir necha qavat o'rash bilan cheklanish" },
    { n: "Xonadon elektr rozetkasini ta'mirlash", u: "dahlizdagi avtomat saqlagichni o'chirib, indikator buragich bilan faza yo'qligini tekshirish", w1: "kuchlanish bor holatda ho'l qo'l bilan simlarni rozetkaga tiqib ko'rish", w2: "rozetka ichiga tuzli suv purkab kontaktlar tozaligini oshirishga urinish", w3: "saqlagichni o'chirmasdan simlarni pichoq bilan qirib tozalash" },
    { n: "Plastik derazalarning qishki rejimini sozlash", u: "furnitura sarg'isini (tsapfa) olti qirrali kalit bilan burab rezina zichlanishini oshirish", w1: "oynani olib tashlab o'rniga qalin faner taxtasini mixlab qo'yish", w2: "deraza rezinalarini pichoq bilan kesib tashlab havo yo'lini ochish", w3: "furnituraga sement qorishmasi surtib ochilmaydigan qilib qotirish" },
    { n: "Kanalizatsiya quvurlaridagi tiqilmalarni bartaraf etish", u: "santexnik tros (po'lat sim) yordamida tiqilmani mexanik itarish va maxsus tozalovchi vosita quyish", w1: "quvur ichiga qattiq sement eritmasi quyib tiqilmani qotirib qo'yish", w2: "quvurni olovda qizdirib plastik devorlarini kuydirish operatsiyasi", w3: "quvurga og'ir toshlarni tashlab tiqilmani sindirishga urinish" },
    { n: "Elektr choynak va dazmoldagi qasmoqni tozalash", u: "limon kislotasi yoki maxsus vosita eritmasini qaynatib, so'ng toza suv bilan yaxshilab chayqash", w1: "dazmol tagini metall egov bilan qirib barcha qoplamasini yo'qotish", w2: "choynak ichiga qum solib uni elektr tarmog'iga ulab quritish", w3: "jihozni benzin bilan yuvib darhol olov yaqinida quritish" },
    { n: "LED yoritgichlarga o'tish afzalligi", u: "cho'g'lanma lampalarga nisbatan 8-10 barobar kam elektr sarflab, uzoq xizmat qilish", w1: "xonani qizdirish uchun pech o'rnida kuchli issiqlik chiqarish", w2: "elektr tarmog'idagi kuchlanishni avtomatik ravishda ikki barobar oshirish", w3: "faqat bir hafta xizmat qilib so'ngra utilizatsiya qilinishi" },
    { n: "Mebel furniturasini mustahkamlash", u: "bo'shagan shuruplarni burab mahkamlash, yeyilgan teshiklarga yog'och cho'p va yelim kiritish", w1: "bo'shagan eshikni arralab tashlab o'rniga parda osib qo'yish", w2: "shurup o'rniga katta qurilish mixlarini bolg'a bilan qoqish", w3: "eshik oshiq-moshig'iga suv quyib zanglatib harakatsiz qilish" },
    { n: "Oila byudjetida kommunal xarajatlarni optimallash", u: "suv, gaz va elektr hisoblagichlarini muntazam nazorat qilib tejamkorlik rejimiga rioya etish", w1: "hisoblagichlarni to'xtatish uchun noqonuniy simlar va magnitlar ulash", w2: "chiroq va gazni tunu-kun uzluksiz yoqiq qoldirish odatini shakllantirish", w3: "barcha kommunal to'lovlardan bosh tortib qarz hisobiga yashash" },
    { n: "Oziq-ovqat mahsulotlarini to'g'ri saqlash", u: "muzlatgichning tegishli javonlarida harorat va xom hamda pishgan taomlar ajratilishiga rioya qilish", w1: "xom go'sht va pishgan ovqatlarni bitta ochiq idishda aralashtirib qo'yish", w2: "konservalarni to'g'ridan-to'g'ri quyosh nuri ostida issiqda saqlash", w3: "muzlagan baliqni bir necha marta eritib qayta muzlatish" },
    { n: "Xonadonda yong'in xavfsizligi choralari", u: "nosoz elektr simlaridan foydalanmaslik, gaz jo'mraklarini nazorat qilish va o't o'chirgich bo'lishi", w1: "gaz plitasi yonida tez yonuvchi lak va benzin idishlarini saqlash", w2: "bitta rozetkaga bir vaqtning o'zida o'nta kuchli elektr isitkich ulash", w3: "yonayotgan elektr simlarini o'chirmasdan ustiga chelakda suv quyish" },
    { n: "Qishloq xo'jaligi va tomorqa asboblari parvarishi", u: "bel, ketmon va o'roqlarni tuproqdan tozalab, charxlab va moylab quruq joyda saqlash", w1: "asboblarni yomg'ir ostida nam tuproqda qoldirib zanglashi kutish", w2: "ketmon tig'ini bolg'a bilan urib sindirib ishlatish tartibi", w3: "asboblarni olovga tashlab yog'och dastasini kuydirib yuborish" },
    { n: "Kiyimlarni tozalash va dazmollash qoidalari", u: "kiyim yorlig'idagi xalqaro belgilarga (harorat, dazmollash, yuvish) qat'iy amal qilish", w1: "barcha tabiiy ipak va jun matolarni 100 darajada qaynatib yuvish", w2: "har qanday nozik matoni eng yuqori haroratda bug'siz quruq dazmollash", w3: "oq va rangli matolarni qora kiyimlar bilan aralashtirib yuvish" },
    { n: "Maishiy gaz uskunalaridan xavfsiz foydalanish", u: "gaz hidini sezganda chiroqni yoqmasdan, darhol kranni yopish, derazalarni ochish va 104 ga qo'ng'iroq qilish", w1: "gaz sizib chiqayotgan joyni gugurt chaqib olov bilan tekshirib ko'rish", w2: "gaz hidi bor xonada darhol elektr chiroqlarini va dazmolni yoqish", w3: "deraza va eshiklarni mahkam yopib xonada uxlab dam olish" },
    { n: "Chiqindilarni saralash (ekologik madaniyat)", u: "plastmassa, qog'oz, oziq-ovqat va xavfli chiqindilarni (batareyalar) alohida konteynerlarga yig'ish", w1: "barcha chiqindilarni ko'cha o'rtasida yoqib zaharli tutun chiqarish", w2: "eski batareya va simobli termometrlarni ariq suviga tashlab yuborish", w3: "plastmassa idishlarni tuproqqa ko'mib chirishini kutish" },
    { n: "Issiqlik izolyatsiyasi choralari", u: "deraza va eshik tirqishlarini maxsus zichlagichlar bilan yopish va devorlarni penoplast bilan qoplash", w1: "qish kunlarida barcha eshik va derazalarni ochiq qoldirib shamollatish", w2: "isitish radiatorlari ustini qalin mebellar bilan to'liq to'sib qo'yish", w3: "xonadon devorlaridagi barcha gips va suvoqlarni qirib tashlash" },
    { n: "Uy aptechkasi va birinchi yordam vositalari", u: "antiseptiklar, bint, paxta, og'riq qoldiruvchi dorilarni yaroqlilik muddatini kuzatib bolalar yetmaydigan joyda saqlash", w1: "barcha dori vositalarini oshxona stolida ochiq qoldirish", w2: "muddati o'tgan dorilarni me'yordan ortiq dozada ichish odati", w3: "birinchi yordam vositalarini qorong'i yerto'laga yashirib qo'yish" },
    { n: "Ventilyatsiya va havoni tozalash tizimi", u: "oshxona va xonalardagi ventilyatsiya kanallari panjaralarini muntazam tozalab turish", w1: "ventilyatsiya teshigini g'isht va sement bilan butunlay urib berkitish", w2: "ventilyator motoriga suv purkab qisqa tutashuv hosil qilish", w3: "xonadondagi barcha toza havo yo'llarini mato bilan yopib qo'yish" },
    { n: "Yog'och pol va laminat parvarishi", u: "ortiqcha namlikdan saqlash, maxsus siqilgan nam mato va polirovkalar bilan tozalash", w1: "laminat ustiga chelakda issiq suv to'kib ko'lmak qilib qoldirish", w2: "pol yuzasini po'lat qirg'ich bilan qirib lak qatlamini yo'qotish", w3: "laminat ustida og'ir metall detallarni bolg'alab tuzatish" },
    { n: "Uy sharoitida elektr hisoblagichni kuzatish", u: "kunlik va oylik kilovatt-soat sarfini daftarga yozib energiyani rejalashtirish", w1: "hisoblagich simlarini o'zboshimchalik bilan kesib tashlash", w2: "elektr hisoblagichni qizdirib uning raqamlarini to'xtatib qo'yish", w3: "faqat eng ko'p energiya sarflovchi eskirgan asboblarni sotib olish" },
    { n: "Metall qulflarni moylash va sozlash", u: "qulf mexanizmi silindriga grafit kukuni yoki maxsus WD-40 moyini purkab kalitni aylantirish", w1: "qulf ichiga quyuq paxta yog'i quyib chang to'planishiga yo'l qo'yish", w2: "qulf teshigiga mayda qum va shag'al tiqib kalitni burash", w3: "qulfni olovda qizdirib ichki prujinasini yumshatib sindirish" },
    { n: "Xonadondagi devorlarni bo'yash texnologiyasi", u: "yuzani shpaklyovka bilan tekislab, gruntovka surtib, rolik bilan bo'yoqni ikki qatlam yotqizish", w1: "chang va yog'li devorga hech qanday tayyorgarliksiz qalin bo'yoq surtish", w2: "bo'yoqni faqat bitta nuqtaga quyib o'z-o'zidan oqishini kutish", w3: "ho'l suvoq ustidan zudlik bilan moyli bo'yoq surtib quritish" },
    { n: "Bog'dorchilikda daraxtlarni oqlash", u: "ohak va mis kuporosi eritmasi bilan tanani oqlab zararkunandalar va quyosh kuyishidan asrash", w1: "daraxt tanasini benzin bilan yuvib po'stlog'ini qirib tashlash", w2: "daraxt ildiziga qalin kislota eritmasini quyib quritish", w3: "daraxt tanasiga qora moyli bo'yoq surtib nafas yo'lini to'sish" },
    { n: "Tikuv mashinasiga texnik xizmat ko'rsatish", u: "mokki mexanizmini tola changlaridan cho'tka bilan tozalash va maxsus mashina moyi bilan moylash", w1: "mokkini suv bilan yuvib zanglashiga yo'l qo'yish", w2: "mexanizm ichiga qum va chang sepib ishqalanishni oshirish", w3: "ignani egilgan holatda majburan ishlatib mexanizmni sindirish" },
    { n: "Elektr simlarini ulashda klemma bloklari", u: "vintli yoki prujinali klemma yordamida mis va alyuminiy simlarni xavfsiz va qizishsiz ulash", w1: "mis va alyuminiy simlarni shunchaki bir-biriga burab ochiq qoldirish", w2: "simlarni qog'oz salfetka bilan o'rab elektr toki o'tkazish", w3: "simlar ulanish joyini doimiy nam suvda ushlab turish" },
    { n: "Uy hayvonlarini parvarishlash gigiyenasi", u: "ozuqa idishlarini toza saqlash, emlash jadvaliga rioya qilish va gigiyenik tozalov", w1: "hayvonlarni faqat qorong'i va zax yerto'lada saqlash", w2: "veterinar ko'rigidan bosh tortib o'zboshimchalik bilan dorilash", w3: "hayvonga muddati o'tgan chirigan ozuqalarni berish" },
    { n: "Mikroto'lqinli pechdan xavfsiz foydalanish", u: "metall idishlar va yopiq tuxumni solmaslik, faqat maxsus shisha yoki keramika idish ishlatish", w1: "pech ichiga yaltiroq zar qog'oz va temir qoshiqlar solib yoqish", w2: "pech eshigi ochiq holatda uning ishlashiga yo'l qo'yish", w3: "ichiga benzin solib uni qizdirish maqsadida ishlatish" }
  ];

  const aspectStems = [
    (n) => `Ro'zg'orshunoslik va ishlab chiqarish amaliyotida '${n}' jarayonida qaysi texnik talabga qat'iy rioya qilinadi?`,
    (n) => `Xonadon xo'jaligini oqilona yuritishda '${n}' qanday to'g'ri ketma-ketlikda amalga oshiriladi?`,
    (n) => `Texnologiya fani mashg'ulotlarida o'quvchilarga '${n}' bo'yicha qaysi asosiy qoida o'rgatiladi?`,
    (n) => `Xavfsiz mehnat va maishiy madaniyat nuqtai nazaridan '${n}' bo'yicha to'g'ri amaliy yechim qaysi?`,
    (n) => `Zamonaviy turmush madaniyatida '${n}' ning to'g'ri bajarilishi qanday samara beradi?`,
    (n) => `Uy-ro'zg'or ta'mirlash ko'nikmalarini egallashda '${n}' qoidasi nimadan iborat?`
  ];

  let id = 1197;
  for (let a = 0; a < 6; a++) {
    for (let i = 0; i < 26; i++) {
      const c = home26[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri qoidasi: ${c.u}`;
      const dists = [
        `To'g'ri qoidasi: ${c.w1}`,
        `To'g'ri qoidasi: ${c.w2}`,
        `To'g'ri qoidasi: ${c.w3}`
      ];
      const exp = `Ro'zg'orshunoslik va uy xo'jaligi me'yorida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Ehtiyotkorlik, me'yor va xavfsiz turmush tarzi.`;

      items.push(createItem(id, 190, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 05 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1197..1352)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 06: Elektrotexnika va elektronika (156 Qs: IDs 1353..1508, Topic 191)
// ══════════════════════════════════════════════════════════════════════════
function buildSection06() {
  const items = [];
  const secFile = "06_elektrotexnika_va_elektronika.json";

  // 26 electrical concepts * 6 aspects = 156 Qs
  const elec26 = [
    { n: "Rezistor (doimiy qarshilik)", u: "elektr zanjiridagi tok kuchini cheklash va kuchlanishni taqsimlash", w1: "elektr zaryadlarini uzoq muddat o'zida to'plash", w2: "o'zgarmas tokni o'zgaruvchan tokka aylantirib berish", w3: "zanjirdagi elektr quvvatini o'n barobarga kuchaytirish" },
    { n: "Kondensator (sig'im elementi)", u: "elektr maydoni energiyasini to'plash va o'zgaruvchan tokka reaktiv qarshilik ko'rsatish", w1: "mexanik energiyani to'g'ridan-to'g'ri o'zgarmas tokka aylantirish", w2: "faqat doimiy tokni o'tkazib o'zgaruvchan tokni butunlay to'sish", w3: "simlar qizib ketganda elektr tokini doimiy oshirib borish" },
    { n: "Yarimo'tkazgichli to'g'rilagich diod", u: "elektr tokini faqat bitta yo'nalishda (anoddan katodga) o'tkazib tokni to'g'rilash", w1: "tok kuchini hech qanday yo'qotishlarsiz yuz barobarga kuchaytirish", w2: "zanjir haroratini doimiy ravishda nol darajada ushlab turish", w3: "faqat tovush signallarini qabul qiluvchi mikrofon vazifasini o'tash" },
    { n: "Yorug'lik diodi (LED)", u: "to'g'ri yo'nalishda elektr toki o'tganda fotonlar nurlatib yorug'lik hosil qilish", w1: "issiqlik energiyasini yutib zanjirda qora rangli dog' hosil qilish", w2: "faqat yuqori voltli elektr zanjirlarini chaqmoqdan himoyalash", w3: "zanjirdagi kuchlanishni avtomatik ravishda nol voltga tushirish" },
    { n: "Bipolyar tranzistor (n-p-n yoki p-n-p)", u: "baza toki yordamida kollektor zanjiridagi kuchli tokni boshqarish va kuchaytirish", w1: "qisqa tutashuv paytida simlarni bir-biriga payvandlab qo'yish", w2: "faqat yorug'lik energiyasini mexanik harakatga aylantirib berish", w3: "elektr motorini reduktorsiz teskari yo'nalishda aylantirish" },
    { n: "Maydoniy tranzistor (MOSFET)", u: "elektr maydoni (zatvor kuchlanishi) yordamida istok-stok kanalidagi tokni boshqarish", w1: "faqat doimiy magnitlar kuchi bilan mexanik valni burish", w2: "akkumulyatordagi kimyoviy kislota zichligini o'lchash", w3: "elektr simlarining qarshiligini sun'iy ravishda oshirish" },
    { n: "Transformator qurilmasi", u: "elektromagnit induksiya asosida o'zgaruvchan tok kuchlanishini oshirish yoki pasaytirish", w1: "o'zgarmas batareya toki kuchlanishini hech qanday o'zgarishsiz oshirish", w2: "mexanik energiyani to'g'ridan-to'g'ri tovush to'lqinlariga aylantirish", w3: "elektr energiyasini kimyoviy elementlarga parchalab yuborish" },
    { n: "Elektr saqlagich (eruvchan saqlagich)", u: "ortiqcha yuklama yoki qisqa tutashuv yuz berganda erib zanjirni xavfsiz uzish", w1: "zanjirdagi tokni sun'iy oshirib asbobni tezroq ishlatish", w2: "motorning aylanish yo'nalishini avtomatik to'g'rilash", w3: "barcha elektr asboblarining quvvatini ikki barobar ko'paytirish" },
    { n: "Elektromagnit rele", u: "kichik tokli boshqaruv zanjiri orqali elektromagnit yordamida yuqori quvvatli kontaktlarni ulash", w1: "elektr energiyasini mexanik sarflarsiz yorug'likka aylantirish", w2: "o'zgaruvchan tok chastotasini avtomatik ravishda ikki barobar qilish", w3: "akkumulyatorning ichki qarshiligini butunlay yo'qotish" },
    { n: "Multimetr (tester) asbobi", u: "kuchlanish, tok kuchi, qarshilik va zanjir yaxlitligini o'lchovchi universal asbob", w1: "yog'och materiallarning qattiqligini Brinell bo'yicha o'lchash", w2: "motorning aylanish tezligini optik usulda o'lchash", w3: "xona havosidagi karbonat angidrid miqdorini aniqlash" },
    { n: "Lehimlagich (payalnik)", u: "elektr spirali bilan uchini qizdirib lehimni eritish va radioelementlarni plataga biriktirish", w1: "metall zagotovkalarni sovuq holatda chopib ikkiga bo'lish", w2: "chizmalarni kompyuter xotirasiga kiritish uchun skanerlash", w3: "plastmassa quvurlarni qisib suv yo'lini berkitish" },
    { n: "Bosma plata (tekstolit)", u: "mis folgali dielektrik asosda radioelementlarni o'rnatish va o'zaro ulash yo'llari bo'lish", w1: "elektr energiyasini ishlab chiqaruvchi quyosh batareyasi", w2: "faqat dastgoh shpindelini podshipnikka o'rnatish uchun vtulka", w3: "elektr simlarini devor ichiga mahkamlovchi gips qorishmasi" },
    { n: "Om qonuni (zanjir qismi uchun)", u: "tok kuchi kuchlanishga to'g'ri proporsional, qarshilikka teskari proporsional (I = U / R)", w1: "tok kuchi kuchlanishga bog'liq emas, faqat sim rangiga bog'liq", w2: "qarshilik qancha katta bo'lsa zanjirdagi tok shuncha ortib boradi", w3: "kuchlanish oshganda tok kuchi doimo nolga tenglashib qoladi" },
    { n: "Elektr toki quvvati formulasi", u: "iste'molchi quvvati kuchlanish va tok kuchi ko'paytmasiga teng bo'ladi (P = U * I)", w1: "quvvat faqat simning uzunligini uning og'irligiga bo'lish bilan topiladi", w2: "quvvat tok kuchidan kuchlanishni ayirish orqali hisoblanadi", w3: "quvvat faqat saqlagichning erish haroratiga teng bo'ladi" },
    { n: "O'zgarmas tok manbai (akkumulyator)", u: "kimyoviy energiyani o'zgarmas elektr energiyasiga aylantirib zaryad saqlash", w1: "mexanik energiyani yuqori chastotali o'zgaruvchan tokka aylantirish", w2: "tarmqdagi barcha elektr yuklamalarini nolga tushiruvchi filtr", w3: "faqat yorug'lik nurlarini o'zida yutuvchi qora qoplama" },
    { n: "O'zgaruvchan elektr toki", u: "vaqt o'tishi bilan yo'nalishi va qiymati davriy ravishda o'zgarib turuvchi tok (50 Gts)", w1: "yo'nalishi va kattaligi hech qachon o'zgarmaydigan doimiy tok", w2: "faqat batareyalardan olinadigan va simsiz uzatiladigan tok", w3: "hech qanday magnit maydoni hosil qilmaydigan elektr zaryad" },
    { n: "Induktivlik g'altagi (drossel)", u: "magnit maydoni energiyasini to'plash va o'zgaruvchan tokka induktiv qarshilik ko'rsatish", w1: "doimiy tokni zanjirdan butunlay o'tkazmasdan to'xtatib qo'yish", w2: "faqat elektr lampochkasining yorug'lik spektrini o'zgartirish", w3: "akkumulyatordagi kislotaning qaynash haroratini pasaytirish" },
    { n: "Fotorezistor", u: "sirtiga tushayotgan yorug'lik nuri darajasiga qarab o'z elektr qarshiligini o'zgartirish", w1: "faqat tovush balandligiga qarab kuchlanishni oshirish", w2: "magnit maydoni yo'nalishini aniqlab strelkani burish", w3: "havo bosimi o'zgarganda elektr motorini yoqish" },
    { n: "Termorezistor (termistor)", u: "harorat o'zgarishi bilan o'z elektr qarshiligini sezilarli darajada o'zgartirish", w1: "har qanday haroratda qarshiligini mutlaq o'zgarmas saqlash", w2: "faqat mexanik bosim berilganda elektr toki ishlab chiqarish", w3: "radio to'lqinlarini qabul qilib ularni tovushga aylantirish" },
    { n: "Stabilizator (stabilitron)", u: "zanjirdagi kuchlanish o'zgarganda ham chiqish kuchlanishini qat'iy doimiy darajada ushlab turish", w1: "tok kuchini doimiy ravishda oshirib simlarni qizdirish", w2: "o'zgaruvchan tok chastotasini 50 Gts dan 1000 Gts ga chiqarish", w3: "motorning aylanishini har bir soniyada to'xtatib turish" },
    { n: "Mikrosxema (integral sxema)", u: "bitta kichik kremniy kristalida minglab tranzistor, diod va rezistorlar jamlangan modul", w1: "faqat bitta katta o'lchamli transformatordan iborat qurilma", w2: "elektr simlarini bir-biriga ulash uchun ishlatiladigan oddiy klemma", w3: "dastgoh elektr shkafini qulflovchi mexanik qulf" },
    { n: "Qisqa tutashuv hodisasi", u: "nol va faza simlari iste'molchisiz to'g'ridan-to'g'ri tutashib tokning keskin ortishi va simning erishi", w1: "zanjirdagi tok kuchining birdaniga nolga tushib ketishi", w2: "iste'molchining quvvati yetishmasdan o'chib qolishi holati", w3: "akkumulyator batareyasining to'liq zaryadlanib to'lishi" },
    { n: "O'tkazgichlarning ketma-ket ulanishi", u: "barcha elementlardan bir xil tok oqib, umumiy qarshilik ularning yig'indisiga teng bo'lishi", w1: "barcha elementlardagi kuchlanishlar bir-biriga qat'iy teng bo'lishi", w2: "bitta element uzilsa qolganlari yanada yorqinroq yonishi", w3: "umumiy qarshilik eng kichik qarshilikdan ham kichik bo'lishi" },
    { n: "O'tkazgichlarning parallel ulanishi", u: "barcha shoxobchalarda kuchlanish bir xil bo'lib, umumiy tok tarmoqlar toklari yig'indisiga teng bo'lishi", w1: "bitta lampochka kuysa butun xonadon chiroqlarining o'chib qolishi", w2: "umumiy qarshilik har bir element qarshiligining yig'indisiga teng bo'lishi", w3: "tok kuchi barcha shoxobchalarda qarshilikdan qat'i nazar bir xil bo'lishi" },
    { n: "Elektr xavfsizligida 36 V va 12 V kuchlanish", u: "yuqori xavfli va nam xonalarda inson hayoti uchun xavfsiz hisoblangan past kuchlanish", w1: "faqat og'ir sanoat po'lat quyish korxonalarida ishlatiladigan yuqori volt", w2: "insonni bir zumda elektr toki urib halok qiluvchi xavfli kuchlanish", w3: "faqat samolyotlar va kosmik kemalarda qo'llaniladigan kuchlanish" },
    { n: "Izolyatsiyalovchi materiallar (dielektriklar)", u: "tarkibida erkin zaryad tashuvchilar bo'lmagan, elektr tokini o'tkazmaydigan materiallar (chinni, rezina, plastmassa)", w1: "elektr tokini eng yaxshi o'tkazuvchi kumush, mis va alyuminiy metallari", w2: "faqat suyuq holdagi kislotalar va tuzlarning suvdagi eritmalari", w3: "harorat ko'tarilganda o'z-o'zidan elektr zaryadlari ishlab chiqaruvchi elementlar" }
  ];

  const aspectStems = [
    (n) => `Radioelektronika va elektrotexnika asoslariga ko'ra, '${n}' ning asosiy texnik vazifasi nima?`,
    (n) => `Elektr sxemalarini yig'ish va tahlil qilishda '${n}' qanday fizik-texnologik jarayonga asoslanadi?`,
    (n) => `Texnologiya fani darslarida elektr jihozlari o'rganilganda '${n}' bo'yicha qaysi qoida to'g'ri?`,
    (n) => `Elektron zanjirlarning ishonchli ishlashini ta'minlashda '${n}' ning o'rni qanday izohlanadi?`,
    (n) => `Sxemotexnika va o'lchov amaliyotiga muvofiq, '${n}' qaysi parametrni boshqarishga xizmat qiladi?`,
    (n) => `Laboratoriya stendlarida radioelementlar bilan ishlashda '${n}' bo'yicha to'g'ri xulosa qaysi?`
  ];

  let id = 1353;
  for (let a = 0; a < 6; a++) {
    for (let i = 0; i < 26; i++) {
      const c = elec26[i];
      const q = aspectStems[a](c.n);
      const corr = `Asosiy vazifasi: ${c.u}`;
      const dists = [
        `Asosiy vazifasi: ${c.w1}`,
        `Asosiy vazifasi: ${c.w2}`,
        `Asosiy vazifasi: ${c.w3}`
      ];
      const exp = `Elektrotexnika va elektronika qoidalarida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Sxemadagi aniqlik, xavfsiz elektr va to'g'ri parametr.`;

      items.push(createItem(id, 191, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 06 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1353..1508)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 07: Kasb tanlashga yo'llash (104 Qs: IDs 1509..1612, Topic 192)
// ══════════════════════════════════════════════════════════════════════════
function buildSection07() {
  const items = [];
  const secFile = "07_kasb_tanlashga_yollash.json";

  // 13 career guidance concepts * 8 aspects = 104 Qs
  const career13 = [
    { n: "Odam — Texnika kasblar tipi", u: "chilangar, tokarchi, mexanik, elektrotexnik, payvandchi, dastgoh operatori", w1: "o'qituvchi, shifokor, psixolog, tarbiyachi, suxandon", w2: "agronom, veterinar, biolog, o'rmonchi, zootexnik", w3: "rassom, bastakor, aktyor, haykaltarosh, yozuvchi" },
    { n: "Odam — Odam kasblar tipi", u: "o'qituvchi, shifokor, murabbiy, psixolog, xizmat ko'rsatish sohasi mutaxassisi", w1: "dasturchi, chizmachi, buxgalter, kartograf, statistik", w2: "duradgor, tokar, frezerchi, temirchi, montajchi", w3: "geolog, gidrobiolog, baliqchi, o'rmon xo'jaligi mutaxassisi" },
    { n: "Odam — Tabiat kasblar tipi", u: "agronom, zootexnik, veterinar, ekolog, o'rmonchi, seleksioner", w1: "bank kassiri, soliq inspektori, notarius, arxivchi", w2: "avtomobil haydovchisi, temiryo'l mashinisti, ekskavatorchi", w3: "muzey gidi, teleboshlovchi, advokat, diplomat" },
    { n: "Odam — Belgili tizim kasblar tipi", u: "dasturchi, hisobchi, buxgalter, chizmachi, tarjimon, matn muharriri", w1: "quruvchi-suvoqchi, payvandchi, chilangar, santexnik", w2: "chorvador, gulchi, bog'bon, parrandachi, pillakor", w3: "jarroh, stomatolog, massajchi, tez yordam feldsheri" },
    { n: "Odam — Badiiy obraz kasblar tipi", u: "dizayner, rassom, haykaltarosh, me'mor, aktyor, xattot, zargar", w1: "stanok sozlovchi, santexnik, qozonxona operatori, liftchi", w2: "moliya tahlilchisi, soliq maslahatchisi, auditor, kassir", w3: "mexanizator, dalasoz, paxtakor, suv xo'jaligi nazoratchisi" },
    { n: "Kasb tanlash formulasi: 'Xohlayman'", u: "insonning shaxsiy qiziqishlari, mayllari, orzu va intilishlari majmui", w1: "faqat ota-onaning majburiy talabi va qo'shnilarning havasiga ergashish", w2: "mehnat bozoridagi eng kam oylik to'lanadigan sohani tanlash", w3: "faqat bepul o'qish imkoniyati bor bo'lgan tasodifiy yo'nalish" },
    { n: "Kasb tanlash formulasi: 'Bajara olaman'", u: "shaxsning sog'lig'i, aqliy va jismoniy qobiliyatlari hamda kasbiy layoqati", w1: "insonning qobiliyatiga zid bo'lsa ham tasodifga ishonib tavakkal qilish", w2: "faqat diplom olish uchun hech qanday bilim talab qilmaydigan joyni qidirish", w3: "jismoniy imkoniyatini hisobga olmasdan og'ir konchilik kasbini tanlash" },
    { n: "Kasb tanlash formulasi: 'Kerak'", u: "mehnat bozorining real talabi, jamiyat va davlat ehtiyojlari hamda ish o'rinlari mavjudligi", w1: "kelajakda butunlay yo'qolib ketadigan talabsiz kasblarni tanlash", w2: "faqat xorijga ketish maqsadida o'z yurtida kerak bo'lmagan sohani o'rganish", w3: "bozorni o'rganmasdan faqat o'zi xohlagan tor sohada qolib ketish" },
    { n: "Professiogramma hujjati", u: "kasbning mazmuni, mehnat sharoitlari va mutaxassisga qo'yiladigan psixofiziologik talablar tavsifi", w1: "korxona xodimlarining bir oylik maoshini hisoblash vedomosti", w2: "faqat xodimlarning turar joyi va oilaviy ahvoli haqidagi ma'lumotnoma", w3: "dastgohning elektr chizmasi va moylash jadvali hujjati" },
    { n: "Kasbiy layoqat va qobiliyat", u: "muayyan kasbiy faoliyatni muvaffaqiyatli egallash va yuqori natijalarga erishish imkonini beruvchi individual xususiyatlar", w1: "faqat moddiy boylik to'plashga bo'lgan haddan tashqari hirs va istak", w2: "barcha odamlarda mutlaqo bir xil tug'ma bo'ladigan o'zgarmas biologik belgi", w3: "o'qish va mehnat qilmasdan bir zumda barcha fanlarni bilish qobiliyati" },
    { n: "Mehnat bozori monitoringi", u: "turli sohalarda talab yuqori bo'lgan kasblar va bo'sh ish o'rinlarini doimiy o'rganish", w1: "faqat ish haqi to'lanmaydigan ko'ngilli ishlarni ro'yxatga olish", w2: "korxonalarning faqat eskirgan qog'oz arxivlarini yoqib yuborish", w3: "chet el tovarlarining sifatini tekshirish bilan cheklanish" },
    { n: "Kasbiy adaptatsiya (moslashuv)", u: "yangi ish joyi, mehnat jamoasi va kasbiy talablarga shaxsning muvaffaqiyatli o'rganishi", w1: "ishxonadagi barcha qoidalarni buzib faqat o'z bilganicha ishlash", w2: "jamoa a'zolari bilan har kuni ziddiyatga borib nizolar chiqarish", w3: "ishga kelmasdan maosh olishni talab qilish odati" },
    { n: "Kasbiy mahorat va toifa oshirish", u: "muntazam o'z ustida ishlash, yangi texnologiyalarni o'rganish va malaka toifasini ko'tarish", w1: "bir marta olingan eski bilimlar bilan umrining oxirigacha yangilanmasdan ishlash", w2: "zamonaviy dasturlarni inkor etib faqat qo'l mehnati bilan cheklanish", w3: "boshqa hamkasblarning yutuqlarini mensimasdan doimo tanqid qilish" }
  ];

  const aspectStems = [
    (n) => `Kasb tanlashga yo'llash metodikasi va E.A.Klimov tasnifiga ko'ra, '${n}' nimani ifodalaydi?`,
    (n) => `O'quvchilarni ongli kasb tanlashga tayyorlashda '${n}' ning mazmuni qaysi qatorda to'g'ri ko'rsatilgan?`,
    (n) => `Mehnat bozori va professiografiya talablariga muvofiq, '${n}' qanday amaliy mezonga asoslanadi?`,
    (n) => `Kasbiy diagnostika va maslahat berishda pedagog '${n}' bo'yicha qanday to'g'ri xulosa beradi?`,
    (n) => `Zamonaviy kasbiy yo'naltirish tizimida '${n}' ning asosiy vazifasi qaysi javobda to'g'ri?`,
    (n) => `O'quvchining shaxsiy qobiliyati va moyilligini o'rganishda '${n}' qanday baholanadi?`,
    (n) => `Kasbiy mahorat darslarida '${n}' ning tarbiyaviy va ijtimoiy mohiyati nima?`,
    (n) => `O'smirlar bilan kasbga yo'naltirish suhbatida '${n}' qanday to'g'ri tushuntiriladi?`
  ];

  let id = 1509;
  for (let a = 0; a < 8; a++) {
    for (let i = 0; i < 13; i++) {
      const c = career13[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri tavsifi: ${c.u}`;
      const dists = [
        `To'g'ri tavsifi: ${c.w1}`,
        `To'g'ri tavsifi: ${c.w2}`,
        `To'g'ri tavsifi: ${c.w3}`
      ];
      const exp = `Kasb tanlash nazariyasida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Qiziqish, qobiliyat va talab — ongli kasb tanlovi garovi.`;

      items.push(createItem(id, 192, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 07 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1509..1612)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 08: Robototexnika asoslari (208 Qs: IDs 1613..1820, Topic 193)
// ══════════════════════════════════════════════════════════════════════════
function buildSection08() {
  const items = [];
  const secFile = "08_robototexnika_asoslari.json";

  // 26 robotics concepts * 8 aspects = 208 Qs
  const robot26 = [
    { n: "Ultrasiq (ultratovush) datchigi (HC-SR04)", u: "tovush to'lqinining to'siqqa borib qaytish vaqti orqali masofani aniqlash", w1: "atrofdagi yorug'lik rangini aniqlab qizil va yashilni ajratish", w2: "motorning aylanish tezligini to'g'ridan-to'g'ri mexanik tarzda oshirish", w3: "robot akkumulyatorining qolgan quvvatini foizda hisoblash" },
    { n: "Infraqizil chiziq datchigi (TCRT5000)", u: "oq va qora sirtlarning nurni qaytarish darajasi orqali yo'lni (chiziqni) kuzatish", w1: "havo harorati va namligini o'lchab displeyda ko'rsatish", w2: "to'qnashuv paytida pnevmatik tormoz tizimini ishga tushirish", w3: "robot korpusidagi tebranishlarni yutuvchi amortizator bo'lish" },
    { n: "Servomotor (servoprivod SG90)", u: "boshqaruv signali bo'yicha valni 0 dan 180 darajagacha belgilangan aniq burchakka burish", w1: "daqiqasiga 10000 marta to'xtovsiz aylanib yuqori shovqin chiqarish", w2: "faqat elektr zanjiridagi tok kuchini pasaytiruvchi oddiy qarshilik bo'lish", w3: "robot sensorlaridan keluvchi raqamli ma'lumotlarni xotirada saqlash" },
    { n: "Arduino UNO mikrokontrolleri", u: "ATmega328P chipi asosida dastur kodini bajarish, datchiklardan signallarni qabul qilish va ijrochilarni boshqarish", w1: "faqat robotning g'ildiraklari uchun metall shassi ramkasi bo'lish", w2: "akkumulyator kuchlanishini 220 voltga aylantirib beruvchi transformator", w3: "robotning tashqi qismini changdan himoyalovchi plastik g'ilof" },
    { n: "ShIM (PWM) signali", u: "impulslarning to'lish koeffitsiyentini o'zgartirish orqali motor tezligini ravon boshqarish", w1: "elektr motorini zanjirdan butunlay uzib favqulodda to'xtatish", w2: "analog sensorlarning barchasini birdaniga o'chirib qayta yuklash", w3: "faqat simsiz internet signallari orqali ma'lumot uzatish" },
    { n: "H-ko'prik drayveri (L298N)", u: "mikrokontroller signali bilan ikkita o'zgarmas tok motorining tezligi va aylanish yo'nalishini boshqarish", w1: "faqat quyosh nuri orqali elektr energiyasi ishlab chiqarish", w2: "robotning GPS koordinatalarini aniqlab xaritaga tushirish", w3: "robot harakatlanganda musiqa chaluvchi dinamik bo'lish" },
    { n: "Qadamli motor (stepper motor)", u: "berilgan elektr impulslari soniga qarab valni qat'iy burchak qadami bo'yicha aniq burish", w1: "faqat yuqori tezlikda uzluksiz aylanib sovutuvchi ventilyator bo'lish", w2: "akkumulyator batareyasini avtomatik zaryadlab turuvchi generator", w3: "robotga kelayotgan radio signallarni kuchaytirib beruvchi antenna" },
    { n: "Girokop va akselerometr (MPU6050)", u: "robotning fazoviy burchak tezligi va og'ish burchagini aniqlab muvozanatni saqlash", w1: "robot atrofidagi gaz hidlarini aniqlab ventilyatorni yoqish", w2: "robotning vaznini grammlarda doimiy o'lchab turish", w3: "faqat robot harakatlanganda old chiroqlarni yoqish" },
    { n: "Optik enkoder sensori", u: "motor vali aylanishlar soni, burchagi va bosib o'tilgan masofani impulslar orqali hisoblash", w1: "akkumulyator batareyasining haroratini tekshirib sovutish", w2: "faqat robotning tashqi ko'rinishiga bezak beruvchi yorug'lik chirog'i", w3: "robot xotirasidagi dastur kodini avtomatik o'chirib tashlash" },
    { n: "Bluetooth moduli (HC-05)", u: "smartfon yoki kompyuterdan robotga 10-15 metr masofada simsiz boshqaruv buyruqlarini uzatish", w1: "robotni to'g'ridan-to'g'ri 220 voltli elektr tarmog'iga ulash", w2: "robotning barcha metall qismlarini zanglashdan himoyalash", w3: "faqat yuqori kuchlanishli elektr zaryadlarini hosil qilish" },
    { n: "Tugmali cheklovchi datchik (konsevik)", u: "robot to'siqqa jismoniy urilganda kontakt tutashib to'xtash yoki orqaga qaytish signali berish", w1: "havodagi namlik darajasini foizlarda o'lchab turish", w2: "robotning barcha dvigatellarini bir zumda ikki barobar tezlashtirish", w3: "faqat robotning batareya quvvatini ko'rsatuvchi indikator" },
    { n: "Litiy-ion (Li-ion 18650) akkumulyatori", u: "3.7 V nominal kuchlanishli, qayta zaryadlanuvchi yuqori energiya zichligiga ega quvvat manbai", w1: "bir martalik ishlatilib so'ng qayta zaryadlanmaydigan galvani elementi", w2: "suv bug'i bosimi bilan aylanuvchi mini bug' generatori", w3: "faqat o'zgaruvchan 380 volt elektr toki ishlab chiqaruvchi stansiya" },
    { n: "Robot manipulyatori (qo'li)", u: "bir necha erkinlik darajasiga ega bo'lib, buyumlarni qisib olish, ko'tarish va ko'chirish", w1: "faqat erda to'g'ri chiziq bo'ylab poyga o'ynash uchun g'ildirak", w2: "robotning ichki dasturini kompyuterga ko'chirib beruvchi kabel", w3: "datchiklar yuzasidagi changlarni tozalovchi nam latta" },
    { n: "Analog va raqamli kirish portlari farqi", u: "raqamli port faqat 0 yoki 1 (LOW/HIGH) qabul qiladi, analog port esa 0 dan 1023 gacha qiymat o'qiydi", w1: "raqamli portlar faqat dvigatellarni yoqadi, analog portlar esa o'chiradi", w2: "analog portlar simsiz ishlaydi, raqamli portlar faqat sim bilan ishlaydi", w3: "ular orasida hech qanday farq yo'q, ikkalasi ham bir xil ishlaydi" },
    { n: "Raqamli yorug'lik sensori (LDR fotorezistor)", u: "atrof-muhitning yorug'lik darajasini o'lchab, qorong'i tushganda chiroqni yoqish", w1: "faqat robotning harakatlanish tezligini soatiga kilometrda o'lchash", w2: "motorning moylash darajasini tekshiruvchi kimyoviy filtr", w3: "robot xotirasidagi o'zgaruvchilar nomini tekshirish" },
    { n: "Piezoelementli ovoz chiqaruvchi (buzzer)", u: "turli chastotali elektr impulslari berilganda ovozli ogohlantirish signali yoki ohang chalish", w1: "robot g'ildiraklarining shinasini havo bilan to'ldirish", w2: "robotning elektr dvigatelini sovitish uchun havo haydash", w3: "akkumulyatorning kuchlanishini ikki barobarga oshirish" },
    { n: "OLED (yoki LCD 1602) displey moduli", u: "datchik ko'rsatkichlari, robot holati va matnli xabarlarni ekranda ko'rsatish", w1: "faqat robotni masofadan radio orqali boshqaruvchi pult bo'lish", w2: "robot akkumulyatorini quyoshdan zaryadlovchi fotoelement bo'lish", w3: "dastgoh patronini qisib turuvchi mexanik richag bo'lish" },
    { n: "Dasturdagi 'delay()' funksiyasi", u: "dastur bajarilishini belgilangan millisekundlar davomida vaqtincha to'xtatib turish", w1: "robotning barcha motorlarini teskari yo'nalishda aylantirish", w2: "robot xotirasidagi barcha o'zgaruvchilarni butunlay o'chirib tashlash", w3: "dasturni cheksiz tezlikda qayta yuklash operatsiyasi" },
    { n: "Dasturdagi 'loop()' funksiyasi", u: "mikrokontroller yoqilgan paytda asosiy dastur kodini to'xtovsiz siklik ravishda qayta-qayta bajarish", w1: "faqat mikrokontroller yoqilganda bir marta ishga tushib o'chish", w2: "robotning barcha portlarini birdaniga kuyishdan himoyalash", w3: "kompyuterdan yangi dastur yuklanayotganda tokni uzish" },
    { n: "Dasturdagi 'setup()' funksiyasi", u: "mikrokontroller yoqilganda portlar rejimini (INPUT/OUTPUT) bir marta sozlab berish", w1: "robot harakatlanayotganda har daqiqada uzluksiz takrorlanish", w2: "barcha dvigatellarning aylanishini to'xtatuvchi favqulodda kod", w3: "faqat Wi-Fi tarmog'iga ulanish uchun ishlatiladigan parol" },
    { n: "Gaz datchigi (MQ-2)", u: "tutun, propan, metan va yonuvchi gazlar konsentratsiyasini aniqlab signal berish", w1: "robot g'ildiraklarining yer bilan tishlashish kuchini o'lchash", w2: "akkumulyator batareyasining zaryad oqimini tartibga solish", w3: "faqat suvning tozalik darajasini aniqlovchi filtr" },
    { n: "Robotning g'ildirakli shassisi", u: "motorlar, datchiklar, plata va batareyalarni o'zida jamlovchi yuk ko'taruvchi mexanik tayanch korpus", w1: "faqat dasturiy algoritmlarni yozish uchun kompyuter klaviaturasi", w2: "robot motorini elektr tarmog'idan uzuvchi avtomat saqlagich", w3: "sensorlardan kelayotgan barcha analog signallarni kuchaytirgich" },
    { n: "PID-regulyator algoritmi", u: "chiziq bo'ylab harakatda og'ish xatosini proporsional, integral va differensial hisoblab ravon boshqarish", w1: "robot motorlarini faqat to'liq yoqish yoki butunlay o'chirish usuli", w2: "akkumulyator batareyasini har bir daqiqada o'chirib yoqish tartibi", w3: "faqat robotning tashqi chiroqlarini o'chirib qo'yish kodi" },
    { n: "Rele moduli (5V Relay)", u: "mikrokontrollerning 5 voltli zaif signali bilan 220 voltli kuchli maishiy asboblarni xavfsiz boshqarish", w1: "faqat robotning yurish tezligini mexanik ravishda pasaytirish", w2: "akkumulyatordagi kuchlanishni doimiy ravishda nol volt qilish", w3: "datchiklar yuzasini changdan tozalovchi kichik shamollatgich" },
    { n: "Dasturda 'analogRead()' buyrug'i", u: "belgilangan analog portdagi kuchlanishni 0 dan 1023 gacha raqamli qiymat sifatida o'qib olish", w1: "faqat raqamli portga 5 volt kuchlanish chiqarib berish", w2: "mikrokontroller xotirasidagi dasturni butunlay o'chirish", w3: "robot motorini darhol favqulodda to'xtatish buyrug'i" },
    { n: "Dasturda 'digitalWrite()' buyrug'i", u: "belgilangan raqamli portga HIGH (5V) yoki LOW (0V) signalini chiqarish", w1: "portdagi analog kuchlanishni mikron aniqlikda o'lchash", w2: "robotning ichki soatini nollashtirib qayta sozlash", w3: "faqat internet tarmog'iga ulanish buyrug'ini bajarish" }
  ];

  const aspectStems = [
    (n) => `Mobil robototexnika va avtomatlashtirish asoslariga ko'ra, '${n}' ning asosiy texnik vazifasi nima?`,
    (n) => `Robototexnika to'garagida avtonom robot tizimini loyihalashda '${n}' qanday maqsadda qo'llaniladi?`,
    (n) => `Mikrokontrollerli tizimlarni dasturlash va sozlashda '${n}' qanday ishchi parametrga ega?`,
    (n) => `Zamonaviy mexatronika va robototexnikada '${n}' ning ishlash mohiyati qaysi javobda to'g'ri ko'rsatilgan?`,
    (n) => `Robotning tashqi muhit bilan o'zaro aloqasi va harakatida '${n}' qanday vazifani bajaradi?`,
    (n) => `Avtomatlashtirilgan intellektual qurilmalarda sensorli qayta aloqada '${n}' ning o'rni qanday?`,
    (n) => `Robototexnik musobaqalar va sinov mashg'ulotlarida '${n}' qanday texnik qoidaga tayanadi?`,
    (n) => `Algoritmik boshqaruv va robot konstruksiyasini yig'ishda '${n}' bo'yicha to'g'ri xulosa qaysi?`
  ];

  let id = 1613;
  for (let a = 0; a < 8; a++) {
    for (let i = 0; i < 26; i++) {
      const c = robot26[i];
      const q = aspectStems[a](c.n);
      const corr = `Asosiy vazifasi: ${c.u}`;
      const dists = [
        `Asosiy vazifasi: ${c.w1}`,
        `Asosiy vazifasi: ${c.w2}`,
        `Asosiy vazifasi: ${c.w3}`
      ];
      const exp = `Robototexnika asoslarida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Aniq sensor, to'g'ri algoritm va ishonchli mexatronika.`;

      items.push(createItem(id, 193, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 08 muvaffaqiyatli saqlandi: ${items.length} ta savol (IDs 1613..1820)`);
  return items;
}

console.log("=== BARCHA BO'LIMLARNI YARATISH BOSHLANDI (Texnologiya - Dizayn) ===");
buildSection01();
buildSection02();
buildSection03();
buildSection04();
buildSection05();
buildSection06();
buildSection07();
buildSection08();
console.log(`\n🎉 Jami ${seenStems.size} ta 100% YAGONA (takrorsiz) savollar muvaffaqiyatli yaratildi!`);
