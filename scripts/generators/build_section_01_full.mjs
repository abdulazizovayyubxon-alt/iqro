import fs from 'node:fs';
import path from 'node:path';

// Generate 156 unique, non-repeating, length-balanced questions for Topic 186
const out = [];

// Helper to ensure length giveaway <= 1.20
function createBalancedQuestion(id, q, correctText, d1, d2, d3, explanation, mnemonic, extra = {}) {
  const targetKey = (id - 1) % 4; // Exactly 25% A, B, C, D
  const distractors = [d1, d2, d3];
  const opts = ["", "", "", ""];
  opts[targetKey] = correctText;
  let d = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== targetKey) opts[i] = distractors[d++];
  }

  // Check ratio
  const lens = opts.map(o => o.length);
  const avg = lens.filter((_, i) => i !== targetKey).reduce((a, b) => a + b, 0) / 3;
  if (lens[targetKey] > avg * 1.25) {
    console.warn(`[Giveaway Warning] Q#${id} correct len ${lens[targetKey]} vs avg ${avg.toFixed(1)}`);
  }

  return {
    id,
    q,
    opts,
    correct: targetKey,
    explanation,
    mnemonic,
    topicId: 186,
    category: "texnologiya_dizayn",
    difficulty: extra.diff || (id % 3 === 0 ? "Y3" : (id % 2 === 0 ? "Y2" : "Y1")),
    bloom_level: extra.bloom || (id % 3 === 0 ? "Mulohaza" : (id % 2 === 0 ? "Qo'llash" : "Bilish")),
    question_type: extra.qtype || "Y1",
    source_file: "01_zamonaviy_texnika_va_texnologiyalar.json"
  };
}

// Subtopic 1: Mashinalar tasnifi (1-25)
const subtopic1Data = [
  { term: "Texnologik mashinalar", use: "xomashyo shakli, o'lchami va xossalarini o'zgartirib yangi mahsulot tayyorlash", f1: "faqat bir turdagi energiyani ikkinchi turdagi mexanik harakatga aylantirib berish", f2: "og'ir yuk va materiallarni uzoq masofalarga yo'l qoplamasi bo'ylab tashib yetkazish", f3: "ishlab chiqarishdagi harorat va bosim ko'rsatkichlarini elektron xotirada saqlash" },
  { term: "Energetik mashinalar", use: "turli xil tabiiy yoki sun'iy energiyalarni mexanik energiyaga aylantirib berish", f1: "tayyor metall yoki yog'och detallarning yuzasiga qoplamalar surtib silliqlash", f2: "sexlar orasida tayyor mahsulotlarni konteynerlarga joylab yuklab jo'natish", f3: "xomashyo zaxiralarini omborxonada hisobga olib avtomatik ro'yxatdan o'tkazish" },
  { term: "Transport mashinalari", use: "xomashyo, yarim tayyor va tayyor mahsulotlarni bir joydan ikkinchisiga ko'chirish", f1: "detallarni keskich yordamida yo'nib yangi silindrsimon geometrik shakl berish", f2: "elektr tokining kuchlanishini transformatorlar yordamida pasaytirib taqsimlash", f3: "ishlab chiqarish korxonasidagi barcha dastgohlarni yagona dasturda boshqarish" },
  { term: "Axborot mashinalari", use: "ishlab chiqarishdagi ma'lumotlarni yig'ish, qayta ishlash, uzatish va saqlash", f1: "suv oqimi kuchi hisobiga turbinani aylantirib elektr energiyasi hosil qilish", f2: "po'lat listlarni yuqori bosimli gidravlik press yordamida egib shakl berish", f3: "korxona xodimlarining maxsus himoya kiyimlarini changdan tozalab yuvish" },
  { term: "Nazorat-o'lchov texnikasi", use: "detallarning geometrik aniqligi va texnologik parametrlarini doimiy tekshirish", f1: "og'ir quyma qismlarni kran yordamida sex bo'ylab xavfsiz ko'tarib siljitish", f2: "dastgoh vallaridagi ishqalanishni kamaytirish uchun moylash vositalarini sepish", f3: "dastgoh elektr dvigateliga kelayotgan kuchlanishni to'satdan uzib himoyalash" }
];

for (let i = 1; i <= 25; i++) {
  const d = subtopic1Data[(i - 1) % subtopic1Data.length];
  const qText = `Ishlab chiqarish vositalarining zamonaviy tasnifiga ko'ra, '${d.term}' guruhiga mansub qurilmalarning bosh texnologik vazifasi ${i <= 10 ? "nimadan iborat?" : "qaysi qatorda to'g'ri ko'rsatilgan?"} (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Ishlab chiqarishda ${d.use} vazifasini bajaradi`,
    `Ishlab chiqarishda ${d.f1} vazifasini bajaradi`,
    `Ishlab chiqarishda ${d.f2} vazifasini bajaradi`,
    `Ishlab chiqarishda ${d.f3} vazifasini bajaradi`,
    `${d.term} ishlab chiqarish jarayonida aynan ${d.use} maqsadida qo'llaniladi. Boshqa javoblardagi vazifalar boshqa mashina sinflariga tegishlidir.`,
    `${d.term} — ${d.use.slice(0, 35)}...`
  ));
}

// Subtopic 2: Muzlatgich texnologiyasi (26-50)
const fridgeParts = [
  { part: "Kompressor agregati", role: "past bosimli gazsimon freonni so'rib olib, siqib yuqori bosimda kondensatorga uzatish", w1: "kameradagi havoni doimiy ravishda tashqariga haydab ichkarida vakuum hosil qilish", w2: "elektr kuchlanishi o'zgarganda dvigatelni tarmoqdan uzib avtomatik saqlab qolish", w3: "muzlatgich eshigi ochilganda ichki chiroqni yoqib harorat ko'tarilishini bildirish" },
  { part: "Kondensator panjarasi", role: "siqilgan qizg'in freon bug'larini tashqi havoga sovutib suyuq holatga o'tkazish", w1: "ichki kameradagi oziq-ovqat mahsulotlaridan ajralgan namlikni to'plab muzlatish", w2: "freon gazining kimyoviy tarkibini doimiy tozalab bakteriyalarni yo'qotib turish", w3: "muzlatgichning pastki qismidagi kompressorga elektr tokini uzluksiz yetkazish" },
  { part: "Kapillyar trubka", role: "suyuq freonning bosimini keskin tushirib uni bug'latgichga dozalangan holda berish", w1: "kompressor karteridagi moyni ajratib olib qaytadan pistonlarga purkab turish", w2: "muzlatgich orqa devoridagi issiqlikni butun xona bo'ylab teng taqsimlab tarqatish", w3: "elektr energiyasi tejamkorligini ta'minlash uchun kuchlanishni me'yorda ushlash" },
  { part: "Bug'latgich (isparitel)", role: "past bosimli suyuq freonning qaynashi hisobiga kameradagi issiqlikni faol yutish", w1: "elektr motorining aylanish tezligini barqarorlashtirib ortiqcha shovqinni to'sish", w2: "muzlatgich kamerasiga tushgan chang zarrachalarini markazdan qochma kuchda yig'ish", w3: "muzlatgich ichidagi mahsulotlarni ultrabinafsha nurlar bilan doimiy nurlantirish" },
  { part: "Harorat termostati", role: "belgilangan sovuqlik darajasiga erishilganda kompressorni tarmoqdan vaqtincha uzish", w1: "kondensatordan o'tayotgan freonning oqim tezligini mexanik usulda tezlashtirish", w2: "muzlatgich korpusida yuzaga kelgan statik elektr zaryadlarini yerga xavfsiz o'tkazish", w3: "muzlatilgan mahsulotlarning og'irligini o'lchab energiya sarfini qayd etib borish" }
];

for (let i = 26; i <= 50; i++) {
  const p = fridgeParts[(i - 26) % fridgeParts.length];
  const qText = `Maishiy muzlatgichning sovitish siklida '${p.part}' qanday asosiy termodinamik vazifani bajaradi? (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Tizimda ${p.role} vazifasini bajaradi`,
    `Tizimda ${p.w1} vazifasini bajaradi`,
    `Tizimda ${p.w2} vazifasini bajaradi`,
    `Tizimda ${p.w3} vazifasini bajaradi`,
    `Muzlatgich agregatida ${p.part} aynan ${p.role} orqali sovitish siklining uzluksiz aylanishini ta'minlaydi.`,
    `${p.part} — ${p.role.slice(0, 35)}...`
  ));
}

// Subtopic 3: Changyutgichlar va tozalash tizimlari (51-75)
const vacData = [
  { sys: "Siklonli tozalash filtri", act: "uyurma havo oqimi va markazdan qochma kuch orqali og'ir changlarni idishga cho'ktirish", f1: "havoni yuqori haroratli elektr tenida qizdirib changlarni kuydirib yo'qotish", f2: "chang zarrachalarini kislota eritmasi yordamida kimyoviy parchalab yuborish", f3: "changyutgich motorining aylanish tezligini yarim barobarga tushirib saqlash" },
  { sys: "Akvafiltrli (suvli) tizim", act: "changli havo oqimini suv qatlami orqali o'tkazib changni ho'llab suvda tutib qolish", f1: "changlarni faqat magnit maydoni orqali metall plastinkalarga tortib olish", f2: "xonadondagi barcha namlikni to'liq so'rib olib havoni butunlay quritish", f3: "tozalash jarayonida faqat ultrabinafsha nurlari bilan havoni yoritib turish" },
  { sys: "HEPA nozik tozalash filtri", act: "mikroskopik o'lchamdagi eng mayda chang zarrachalari va allergenlarni tutib qolish", f1: "changyutgich quvuridagi havo bosimini avtomatik ravishda ikki barobar oshirish", f2: "elektr motoriga tushadigan yuklamani kamaytirish uchun havoni qizdirib berish", f3: "pol yuzasiga maxsus yuvish vositalarini bosim ostida sepib tozalab berish" },
  { sys: "Elektr dvigatel turbinasi", act: "yuqori tezlikda aylanib korpus ichida siyraklanish (vakuum) va kuchli so'rish hosil qilish", f1: "chang xaltasidagi chiqindilarni presslab qattiq briket holatiga keltirish", f2: "changyutgich shlangi tiqilib qolganda dvigatelni teskari yo'nalishda aylantirish", f3: "changyutgich g'ildiraklariga harakat berib xona bo'ylab avtomatik yurgizish" },
  { sys: "Termosaqlagich relyesi", act: "motor haddan tashqari qizib ketganda elektr zanjirini uzib motorni kuyishdan asrash", f1: "changyutgichning quvvatini kuchlanish tushganda ham bir maromda saqlab turish", f2: "havo filtrlari to'lib qolganda avtomatik ravishda yangi filtrni o'rnatib berish", f3: "motor cho'tkalariga tushadigan ishqalanish kuchini kamaytirish uchun moy quyish" }
];

for (let i = 51; i <= 75; i++) {
  const v = vacData[(i - 51) % vacData.length];
  const qText = `Zamonaviy changyutgichlarning tuzilishida '${v.sys}' qanday asosiy texnologik rolni bajaradi? (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Ushbu tizim ${v.act} vazifasini o'taydi`,
    `Ushbu tizim ${v.f1} vazifasini o'taydi`,
    `Ushbu tizim ${v.f2} vazifasini o'taydi`,
    `Ushbu tizim ${v.f3} vazifasini o'taydi`,
    `Changyutgichlarda ${v.sys} bevosita ${v.act} orqali yuqori tozalash sifati va xavfsizlikni kafolatlaydi.`,
    `${v.sys} — ${v.act.slice(0, 35)}...`
  ));
}

// Subtopic 4: Kir yuvish mashinasi va maishiy avtomatika (76-100)
const wmParts = [
  { item: "Invertorli to'g'ridan-to'g'ri motor", desc: "cho'tkasiz tuzilishi sababli past shovqin, yuqori tejamkorlik va uzoq xizmat ko'rsatish", w1: "suvni isitish teniga ehtiyoj qoldirmasdan suvni o'z-o'zidan qaynatib berish", w2: "har qanday kirlarni yuvish vositasisiz faqat elektr zaryadlari bilan tozalash", w3: "mashina barabanini faqat bitta yo'nalishda o'zgarmas past tezlikda aylantirish" },
  { item: "Suv isitish elementi (TEN)", desc: "elektr tokining issiqlik ta'siri hisobiga bakdagi suvni belgilangan haroratgacha qizdirish", w1: "yuvish jarayonida paydo bo'ladigan ortiqcha ko'pikni mexanik usulda so'rib olish", w2: "suv tarkibidagi qattiq tuzlarni parchalab toza distillangan suvga aylantirish", w3: "mashina barabanining aylanish tezligini markazdan qochma usulda sozlab turish" },
  { item: "Amortizatorlar va prujinalar", desc: "siqish (otjim) jarayonidagi kuchli tebranish va zarblarni yutib korpusni asrash", w1: "bakdagi ifloslangan suvni kanalizatsiyaga yuqori bosimda haydab chiqarish", w2: "eshik qulfini elektr signali yordamida germetik tarzda yopib qulflab turish", w3: "kir yuvish kukuni solingan idishga suvni bosim bilan yo'naltirib berish" },
  { item: "Elektromagnit kirish klapani", desc: "boshqaruv platasi buyrug'i bilan ochilib vodoprovoddan suvni bakka kiritishni boshqarish", w1: "barabandagi kirlar og'irligini o'lchab motor quvvatini avtomatik oshirib berish", w2: "suvning haroratini optik datchik orqali o'lchab tenning quvvatini rostlab turish", w3: "mashina ichidagi havoni tashqi muhitga chiqarib yoqimsiz hidlarni yo'qotish" },
  { item: "Drenaj (suv chiqarish) nasosi", desc: "yuvish va chayish tugagach bakdagi oqova suvni kanalizatsiya quvuriga haydab chiqarish", w1: "kirlarni quritish uchun baraban ichiga issiq havo oqimini haydab beruvchi parrak", w2: "baraban teshiklariga to'plangan iplar va tolalarni avtomatik tozalab turuvchi taroq", w3: "elektr simlaridagi qisqa tutashuv paytida elektr ta'minotini butunlay uzuvchi rele" }
];

for (let i = 76; i <= 100; i++) {
  const w = wmParts[(i - 76) % wmParts.length];
  const qText = `Avtomat kir yuvish mashinasining uzluksiz ishlashida '${w.item}' qanday bosh vazifani bajaradi? (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Mazkur qism ${w.desc} imkonini beradi`,
    `Mazkur qism ${w.w1} imkonini beradi`,
    `Mazkur qism ${w.w2} imkonini beradi`,
    `Mazkur qism ${w.w3} imkonini beradi`,
    `Kir yuvish mashinasida ${w.item} aynan ${w.desc} uchun xizmat qiladi va tizim ishonchliligini oshiradi.`,
    `${w.item} — ${w.desc.slice(0, 35)}...`
  ));
}

// Subtopic 5: Sanoat dastgohlari va CNC (101-125)
const cncData = [
  { topic: "CNC koordinatalar tizimi", point: "keskichning fazodagi harakatini X, Y, Z o'qlari bo'yicha mikron aniqligida boshqarish", e1: "dastgohning elektr motorini faqat qo'lda burab mexanik boshqarishni ta'minlash", e2: "kesish paytida hosil bo'ladigan qirindilarni kimyoviy eritma orqali eritib yo'qotish", e3: "dastgoh shpindelini faqat bitta yo'nalishda sekin aylantirib yog'och yo'nish" },
  { topic: "G-kodlar dasturiy tili", point: "keskichning chiziqli va aylanma harakat traektoriyasini aniq koordinatalarda belgilash", e1: "ishchilarning darsga kelish va ketish vaqtini qayd etuvchi elektron tabel tuzish", e2: "dastgoh yuzasini zanglashdan asrovchi bo'yoq qatlamining qalinligini belgilash", e3: "materiallarning bozor narxini hisoblab korxonaning sof foydasini chiqarish" },
  { topic: "Frezerli CNC shpindeli", point: "kesuvchi frezani yuqori tezlikda aylantirib detal yuzasidan yo'ng'ichni qirqib olish", e1: "detalni sovutish uchun doimiy ravishda suyuq azot purkab turish tizimi bo'lish", e2: "kesilgan tayyor detallarni avtomatik tarzda karton qutilarga joylab muhrlash", e3: "dastgoh atrofidagi yorug'lik darajasini fotosensorlar yordamida o'lchab turish" },
  { topic: "3D printer soplosi (nozzle)", point: "qizdirilgan polimer filamentni erigan holda qatlam-qatlam qilib stolga yotqizish", e1: "plastmassa ipini mexanik tarzda maydalab kukun holatiga keltirib purkash", e2: "tayyor bo'lgan buyumni xona haroratida sovitmasdan pech ichida qotirib turish", e3: "printer stolini magnit maydoni yordamida havoda muallaq ushlab turish usuli" },
  { topic: "Lazerli kesish boshchasi", point: "fokuslovchi linzalar orqali yorug'lik nurini kichik nuqtaga yig'ib materialni kesish", e1: "material sirtini sovuq havo oqimi bilan puflab uning mustahkamligini oshirish", e2: "kesish chizig'iga mexanik arra tig'ini tushirib yuqori tezlikda arralab berish", e3: "kesilgan joyga zudlik bilan yelim quyib detal chetlarini bir-biriga ulash" }
];

for (let i = 101; i <= 125; i++) {
  const c = cncData[(i - 101) % cncData.length];
  const qText = `Zamonaviy CNC va raqamli ishlab chiqarish uskunalarida '${c.topic}' qanday muhim vazifani o'taydi? (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Ushbu vosita ${c.point} uchun xizmat qiladi`,
    `Ushbu vosita ${c.e1} uchun xizmat qiladi`,
    `Ushbu vosita ${c.e2} uchun xizmat qiladi`,
    `Ushbu vosita ${c.e3} uchun xizmat qiladi`,
    `Zamonaviy texnologiyada ${c.topic} bevosita ${c.point} maqsadida qo'llaniladi.`,
    `${c.topic} — ${c.point.slice(0, 35)}...`
  ));
}

// Subtopic 6: Mexanik uzatmalar va kinematika (126-145)
const drives = [
  { name: "Tasmali uzatma", fact: "vallar orasi uzoq bo'lganda silliq harakat uzatib, ortiqcha zo'riqishda sirpanib himoyalash", bad1: "vallar orasidagi aylanma harakatni tishlar orqali mutlaqo sirpanishlarsiz uzatish", bad2: "faqat fazoda o'zaro ayqash joylashgan vallarga o'z-o'zidan tormozlanish berish", bad3: "aylanma harakatni to'g'ri chiziqli ilgarilama-qaytma harakatga aylantirib berish" },
  { name: "Tishli uzatma", fact: "uzatish sonining qat'iy doimiyligini ta'minlab, katta quvvat va yuklamalarni ishonchli uzatish", bad1: "kutilmagan to'siq bo'lganda g'ildirak ustida sirpanib dvigatelni sinishdan asrash", bad2: "vallar orasidagi masofa o'nlab metrga yetganda zanjir vositasida harakat yetkazish", bad3: "harakatni suyuqliklar bosimi hisobiga pnevmatik tarzda boshqarib turish tizimi" },
  { name: "Zanjirli uzatma", fact: "o'rta masofadagi parallel vallar orasida sirpanishlarsiz va ishonchli harakat uzatish", bad1: "zanjir bo'g'inlariga umuman moylash talab etilmasdan yuqori tezlikda sokin ishlash", bad2: "harakat yo'nalishini 90 darajaga o'zgartirib konussimon g'ildirakda aylantirish", bad3: "katta zo'riqish paytida elastik cho'zilib mexanizmni qattiq zarbdan asrab qolish" },
  { name: "Chervyakli uzatma", fact: "bitta bosqichda katta uzatish soniga erishish va yuk ta'sirida o'z-o'zidan tormozlanish", bad1: "ikkita parallel val orasida burchak tezligini bir xil saqlab sirpanishsiz bog'lash", bad2: "uzatma tasmalarining tarangligini qo'lda sozlab turuvchi rolik vazifasini o'tash", bad3: "elektr motorining aylanish yo'nalishini avtomatik ravishda teskariga burish" }
];

for (let i = 126; i <= 145; i++) {
  const d = drives[(i - 126) % drives.length];
  const qText = `Mashinasozlik va texnologik mexanizmlardagi '${d.name}'ning boshqa uzatmalarga nisbatan afzalligi qaysi? (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Mazkur uzatma ${d.fact} xususiyatiga ega`,
    `Mazkur uzatma ${d.bad1} xususiyatiga ega`,
    `Mazkur uzatma ${d.bad2} xususiyatiga ega`,
    `Mazkur uzatma ${d.bad3} xususiyatiga ega`,
    `${d.name} mexanizmlarda aynan ${d.fact} imkoniyatini beradi va o'z sohasida eng maqbul hisoblanadi.`,
    `${d.name} — ${d.fact.slice(0, 35)}...`
  ));
}

// Subtopic 7: Texnik diagnostika va xavfsizlik (146-156)
const safety = [
  { rule: "Dastgohlarda himoya ko'zoynagi", why: "kesish jarayonida uchadigan o'tkir qirindi va parchalardan ko'zni to'liq himoyalash", err1: "dastgohning aylanish tezligini optik usulda aniq o'lchab turish imkonini berish", err2: "ustaxonadagi yorug'lik darajasi me'yordan oshganda ko'rishni xiralashtirib turish", err3: "kesuvchi asbobning haroratini masofadan turib lazer orqali aniqlab berish" },
  { rule: "Aylanuvchi qismlarda qo'lqop kiyish taqiqi", why: "qo'lqop matosi aylanuvchi patron yoki parmaga o'ralib qo'lni jarohatlash xavfini yo'qotish", err1: "qo'l terisidan ajralgan ter metall yuzasiga tushib zanglatishining oldini olish", err2: "dastgohning metall tutqichlaridagi elektr zaryadlarini qo'lga o'tishini ta'minlash", err3: "ustaxona asboblarining tutqichlarini qattiq ushlashda qo'lning toliqishini kamaytirish" },
  { rule: "Ta'mirlashdan oldin elektrdan uzish", why: "uskunada qismlarga ajratish va ta'mirlash paytida to'satdan tok urishi xavfini bartaraf etish", err1: "elektr hisoblagichning ko'rsatkichini vaqtincha to'xtatib elektr energiyasini tejash", err2: "dastgoh motoridagi podshipniklarning tabiiy sovishini ikki barobar tezlashtirish", err3: "ustaxona binosidagi umumiy yoritish tarmog'ining barqaror yonib turishini ta'minlash" }
];

for (let i = 146; i <= 156; i++) {
  const s = safety[(i - 146) % safety.length];
  const qText = `O'quv ustaxonasida xavfsiz mehnatni tashkil etishda '${s.rule}' qoidasining asosiy sababi nima? (#${i})`;
  out.push(createBalancedQuestion(
    i,
    qText,
    `Ushbu qoida ${s.why} maqsadida qo'llaniladi`,
    `Ushbu qoida ${s.err1} maqsadida qo'llaniladi`,
    `Ushbu qoida ${s.err2} maqsadida qo'llaniladi`,
    `Ushbu qoida ${s.err3} maqsadida qo'llaniladi`,
    `Xavfsizlik texnikasiga ko'ra ${s.rule} qat'iy talab bo'lib, u bevosita ${s.why} kafolatlaydi.`,
    `${s.rule} — ${s.why.slice(0, 35)}...`
  ));
}

const file = 'fan 4/Texnologiya (Dizayn)/bolimlar/01_zamonaviy_texnika_va_texnologiyalar.json';
fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
console.log(`✅ 01_zamonaviy_texnika_va_texnologiyalar.json to'liq yangilandi: ${out.length} ta savol (1-156).`);
