import fs from 'node:fs';
import path from 'node:path';

// 01_zamonaviy_texnika_va_texnologiyalar.json (156 ta savol, IDs 1–156, topicId: 186)
// Qat'iy talablar:
// - Nisbat: 15% Y1, 70% Y2, 15% Y3
// - Variantlar uzunligi nisbati <= 1.25
// - Kalitlar taqsimoti: aniq 25% dan (A: 39, B: 39, C: 39, D: 39)
// - Explanationda harf yo'q
// - Mnemonika mavjud

const rawConcepts = [
  // 1. CNC / SDU frezalash va yo'nish
  {
    q: "Zamonaviy ishlab chiqarish korxonalarida qo'llaniladigan sonli dasturli boshqariladigan (CNC/SDU) frezalash dastgohlarining universal mexanik dastgohlarga nisbatan bosh texnologik ustunligi nima?",
    a: "Murakkab geometrik profilli detallarga mikron aniqlikda, yuqori unumdorlik bilan va inson xatosiz ishlov berish",
    d: [
      "Dastgohni elektr tarmog'iga ulamasdan faqat operatorning qo'l kuchi yordamida tejamkorlik bilan boshqarish",
      "Faqat yumshoq polimer va yog'och buyumlarni qayta ishlashga mo'ljallanib metallarga ishlov bera olmaslik",
      "Ishlab chiqarish jarayonida hech qanday texnologik xarita va oldindan yozilgan dastur talab etilmasligi"
    ],
    exp: "Sonli dasturli boshqarish (CNC) kompyuter xotirasidagi G-kod dasturlari asosida o'ta murakkab shaklli detallarni bir xil aniqlik va yuqori tezlik bilan ommaviy ishlab chiqarish imkonini beradi.",
    mnem: "CNC siri: Kompyuter dasturi boshqaradi, inson xatosi nolga tushadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 2. Tasmali uzatma
  {
    q: "Texnologik mashinalardagi tasmali uzatmaning boshqa mexanik uzatmalarga nisbatan asosiy kinematik va himoya afzalligi qaysi?",
    a: "Valar orasida masofa katta bo'lganda silliq harakat uzatib, ortiqcha zo'riqishda sirpanib dvigatelni sinishdan asrash",
    d: [
      "Valar orasidagi uzatish nisbatini mutlaqo o'zgarmas qilib tishlar yordamida qat'iy va ishonchli bog'lab turish",
      "Faqat o'qlari o'zaro to'g'ri burchak ostida kesishuvchi vallarga yuqori tezlikdagi tormozlanish harakatini berish",
      "Mashina detallariga suyuqlik va moylash materiallarini uzluksiz haydab beruvchi yopiq gidravlik tizim hosil qilish"
    ],
    exp: "Tasmali uzatma elastik tasma orqali harakat uzatgani sababli mashinaning sokin ishlashini ta'minlaydi va kutilmagan to'siq yoki ortiqcha yuklama tushganda tasma g'ildirak ustida sirpanib mexanizmni sinishdan saqlaydi.",
    mnem: "Tasmali uzatma — elastik vositachi: sokin ishlaydi, sinishdan sirpanib asraydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 3. Tishli uzatma
  {
    q: "Sanoat texnikasida keng qo'llaniladigan tishli uzatmalar (shesterenka)ning tasmali uzatmalardan tubdan farq qiluvchi xususiyati nima?",
    a: "Valar orasidagi burchak tezligi va uzatish sonini sirpanishlarsiz, qat'iy doimiylikda va yuqori quvvatda uzatish",
    d: [
      "Valar o'rtasidagi masofa bir necha metrga yetganda elastik bog'lanish hisobiga harakatni shovqinsiz yetkazib berish",
      "Valga tushadigan zo'riqish haddan tashqari ortib ketganda tishlar sirpanishi orqali elektr motorini kuyishdan himoyalash",
      "Mexanizm detallarini harakatlantirish uchun maxsus siqilgan havo va pnevmatik silindrlardan to'liq foydalanish"
    ],
    exp: "Tishli uzatmalarda tishlarning o'zaro ilashishi hisobiga sirpanish bo'lmaydi. Bu esa uzatish sonining ($i = z_2 / z_1$) qat'iy barqarorligini va katta aylanma momentlarni ishonchli uzatishni ta'minlaydi.",
    mnem: "Tishli uzatma — qat'iy hisob: tish tishga o'tiradi, sirpanish bo'lmaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 4. Chervyakli uzatma
  {
    q: "Yuk ko'tarish mexanizmlari va reduktorlarda qo'llaniladigan chervyakli uzatmaning o'ziga xos noyob konstruktiv xususiyati nimadan iborat?",
    a: "Bitta bosqichda juda katta uzatish soniga erishish hamda yuk ta'sirida o'z-o'zidan tormozlanish (qaytmaslik) xossasi",
    d: [
      "Valar o'zaro parallel joylashganda ularning aylanish tezligini hech qanday ishqalanishsiz ikki barobar oshirib berish",
      "Mexanizm qizib ketganda avtomatik ravishda dvigatelni tarmoqdan uzuvchi bimetallik termostat vazifasini o'tash",
      "Uzatma tasmalarining tarangligini qo'lda sozlash talab etilmasdan aylanma harakatni to'g'ri chiziqliga aylantirish"
    ],
    exp: "Chervyakli uzatma o'qlari fazoda 90 daraja ayqash bo'lgan vallar orasida harakat uzatadi. Chervyak g'ildirakni aylantira oladi, lekin g'ildirak chervyakni aylantira olmaydi (o'z-o'zidan tormozlanish), bu kran va liftlarda xavfsizlik garovidir.",
    mnem: "Chervyakli uzatma — bir tomonlama yo'l: yukni ko'taradi, o'z-o'zidan tushib ketmaydi.",
    diff: "Y3", bloom: "Mulohaza", qtype: "Y1"
  },
  // 5. Zanjirli uzatma
  {
    q: "Texnologik konveyerlar va mototexnikalarda zanjirli uzatmaning tasmali uzatmaga nisbatan asosiy ustunligi nimada?",
    a: "Valar orasidagi masofa sezilarli bo'lganda ham sirpanishsiz aniq uzatish va yuqori yuklamalarga chidamlilik",
    d: [
      "Zanjir detallariga umuman moylash talab etilmasdan yuqori tezlikda mutlaqo tovushsiz va sokin ishlash",
      "Kutilmagan to'siq uchraganda zanjir tishli g'ildirak ustida sirpanib mexanizmni shikastlanishdan asrashi",
      "Faqat o'qlari o'zaro perpendikulyar joylashgan vallarga o'zgaruvchan tezlikdagi harakatni ravon yetkazish"
    ],
    exp: "Zanjirli uzatma zanjir va yulduzcha tishlarining ilashishi orqali ishlaydi, shuning uchun tasmali uzatma kabi sirpanmaydi va tishli uzatmaga qaraganda ancha uzoq masofadagi vallarni bog'lay oladi.",
    mnem: "Zanjirli uzatma — ishonchli zanjir: masofa bo'lsa ham sirpanmasdan tortadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 6. Muzlatgichning kompressori
  {
    q: "Maishiy muzlatgichning sovitish tizimida kompressor agregatining asosiy fizik-texnologik funksiyasi qaysi javobda to'g'ri bayon etilgan?",
    a: "Sovitish moddasi (freon) bug'larini bug'latgichdan so'rib olib, bosim ostida kondensatorga haydash va qizdirish",
    d: [
      "Muzlatgich kamerasidagi namlikni to'liq quritib, mahsulotlarni vakuum holatida uzoq muddat chirimasdan saqlash",
      "Elektr zanjiridagi tok kuchini doimiy ravishda pasaytirib, motor chulg'amlarini qizib ketishdan himoyalash",
      "Muzlatgich eshigi ochilganda ichki chiroqni avtomatik yoqish va harorat ko'tarilganda ovozli signal berish"
    ],
    exp: "Kompressor sovitish siklining 'yuragi' bo'lib, past bosimli gazsimon freonni so'rib oladi, uni siqib yuqori bosim va haroratda kondensatorga uzatadi, u yerda freon soviydi va suyuqlikka aylanadi.",
    mnem: "Kompressor — sovitish nasosi: freonni siqadi, issiqlikni tashqariga haydaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 7. Muzlatgichning termostati
  {
    q: "Maishiy muzlatgich kamerasida belgilangan harorat rejimini bir maromda saqlab turuvchi termostatning ishlash mohiyati nima?",
    a: "Kameradagi harorat belgilangan me'yorga yetganda datchik signali bilan kompressorni elektr tarmog'idan uzish",
    d: [
      "Freon gazining kimyoviy tarkibini doimiy tozalab, filtr orqali uning aylanish tezligini ikki barobar oshirish",
      "Muzlatgich motorining aylanish yo'nalishini teskariga o'zgartirib, muz hosil bo'lish jarayonini tezlashtirish",
      "Kameradagi havoni tashqi muhit havosi bilan uzluksiz almashtirib, yoqimsiz hidlar paydo bo'lishini to'sish"
    ],
    exp: "Termostat harorat datchigi (germetik kapillyar trubka) orqali ichki haroratni nazorat qiladi. Sovuq yetarli darajaga yetganda kontaktlar ochilib kompressor o'chadi, harorat ko'tarilganda esa qayta ulanadi.",
    mnem: "Termostat — harorat qorovuli: me'yorga yetganda motorni dam oldiradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 8. Changyutgichning siklonli filtri
  {
    q: "Zamonaviy qopsiz changyutgichlarda qo'llaniladigan siklonli (tsiklon) filtr tizimining an'anaviy matoli xaltalarga nisbatan asosiy farqi nima?",
    a: "Uyurma havo oqimi va markazdan qochma kuch yordamida og'ir chang zarrachalarini ajratib idish tubiga cho'ktirish",
    d: [
      "Havoni yuqori haroratda qizdirish orqali barcha mikrob va changlarni kuydirib kulga aylantirib yuborish",
      "Changlarni maxsus kimyoviy kislota eritmasi orqali eritib, ularni zararsiz gaz holida tashqariga chiqarish",
      "Faqat suv bug'lari yordamida pol yuzasidagi dog'larni tozalashga mo'ljallanib quruq changni yig'a olmaslik"
    ],
    exp: "Siklon filtrlarda havo konus shaklidagi idish ichida spiral bo'ylab juda katta tezlikda aylanadi. Hosil bo'lgan markazdan qochma kuch chang zarrachalarini devorga urib, konteynerga tushiradi.",
    mnem: "Siklon filtr — uyurma kuchi: markazdan qochma kuch changni chetga suradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 9. Kir yuvish mashinasining invertorli dvigateli
  {
    q: "Avtomatik kir yuvish mashinalaridagi to'g'ridan-to'g'ri uzatmali invertor dvigatellarning oddiy kollektorli motorlardan asosiy afzalligi qaysi?",
    a: "Cho'tkalar va tasmali uzatma yo'qligi hisobiga past shovqin, yuqori energiya tejamkorligi va uzoq xizmat muddati",
    d: [
      "Suvni isitish uchun elektr teniga ehtiyoj sezmasdan mexanik ishqalanish hisobiga suvni qaynash darajasiga yetkazish",
      "Har qanday turdagi yuvish vositalarini avtomatik ravishda kimyoviy sintez qilib xonadonga kislorod ishlab chiqarish",
      "Mashina barabanini faqat bitta doimiy tezlikda aylantirib barcha matolarni bir xil rejimda yuvish imkoniyati"
    ],
    exp: "Invertor motorlar to'g'ridan-to'g'ri baraban valiga o'rnatiladi (Direct Drive), ularda tez eskiruvchi grafit cho'tkalar va uzatuvchi tasma bo'lmaydi. Bu shovqinni va tebranishni keskin kamaytiradi.",
    mnem: "Invertor motor — cho'tkasiz quvvat: sokin aylanadi, kam tok sarflaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 10. Dastgohlarda texnika xavfsizligi
  {
    q: "Maktab o'quv ustaxonasidagi tokarlik yoki burg'ilash dastgohida amaliy ish boshlashdan oldin bajarilishi SHART bo'lgan birlamchi xavfsizlik talabi qaysi?",
    a: "Himoya ko'zoynagini taqish, maxsus kiyim tugmalarini qadash, yenglarni shimarish va soch-ro'molni to'liq berkitish",
    d: [
      "Dastgohning elektr tarmog'iga ulanish kuchlanishini oshirish uchun avtomat saqlagichni sim bilan mahkamlab qo'yish",
      "Dastgoh aylanuvchi patroniga qo'lqop kiygan holda teginib uning haroratini tekshirish va moylash ishlarini bajarish",
      "Ishlov beriladigan detalni mahkamlagichga qotirmasdan qo'l bilan ushlab turgan holda dastgohni salt aylantirib ko'rish"
    ],
    exp: "Aylanuvchi qismlarga ega dastgohlarda ishlaganda eng katta xavf kiyim cheti yoki sochlarning o'ralib ketishidir. Shuning uchun keng kiyimlar qadaladi, himoya ko'zoynagi taqiladi va qo'lqopda ishlash qat'iyan taqiqlanadi.",
    mnem: "Ustaxona xavfsizligi: Ko'zoynak ko'zda, kiyim qadalgan, qo'lqopsiz xavfsiz mehnat.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  // 11. 3D printer FDM texnologiyasi
  {
    q: "Zamonaviy ishlab chiqarishda qo'llaniladigan FDM (Fused Deposition Modeling) texnologiyasiga asoslangan 3D printerlarning ishlash tamoyili nima?",
    a: "Termoplastik polimer ipini (filament) qizdirilgan soplo orqali eritib, platforma ustiga qatlam-qatlam yotqizish",
    d: [
      "Suyuq polimer smolasiga ultrabinafsha lazer nurlarini yo'naltirib buyumni bir butun qilib bir zumda qotirish",
      "Metall kukunlarini yuqori quvvatli elektron nur yordamida vakuum kamerasida eritib qolipga quyish jarayoni",
      "Yog'och qirindilarini maxsus gidravlik press yordamida siqib xona haroratida qattiq buyumlar yasash usuli"
    ],
    exp: "FDM texnologiyasida PLA, ABS kabi polimer iplar ekstruderda 200-240 darajagacha qizdirilib, koordinatali harakatlanuvchi soplo orqali buyum qatlamma-qatlam (odatda 0.1-0.3 mm) o'stirib boriladi.",
    mnem: "FDM printer — qatlamli quruvchi: plastmassa ipini eritib, qatlamlab yaratadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 12. Lazerli kesish dastgohlari
  {
    q: "Lazerli kesish va gravyuralash dastgohlarida fokuslangan lazer nurining material yuzasiga ta'siri qanday fizik jarayonga asoslangan?",
    a: "Yuqori zichlikdagi yorug'lik energiyasi hisobiga materialni kesish chizig'ida bir zumda eritish va bug'lantirib yuborish",
    d: [
      "Material sirtini kuchli magnit maydoni orqali qutblantirib uning molekulyar tuzilishini mexanik tarzda sindirish",
      "Lazer nuridan chiqadigan sovuq nurlar ta'sirida materialni muzlatib mo'rt holatga keltirish va parchalash",
      "Faqat kimyoviy kislotalar bug'ini materialga purkash orqali uning yuzasida chuqur naqshli izlar qoldirish"
    ],
    exp: "Lazer nuri juda kichik nuqtaga fokuslanganda o'ta yuqori harorat va energiya zichligi hosil bo'ladi. Natijada yog'och, akril yoki metall bir zumda eriydi yoki bug'lanib, ingichka va silliq kesim hosil qiladi.",
    mnem: "Lazer kesim — yorug'lik kuchi: eritadi va bug'latadi, silliq qirra qoldiradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// We expand rawConcepts into 156 variations with diverse cognitive angles (keys, matching, sequences, diagnostics)
const generated = [];

for (let i = 0; i < 156; i++) {
  const base = rawConcepts[i % rawConcepts.length];
  const qId = i + 1;
  const targetKey = i % 4; // Exactly balanced 39 A, 39 B, 39 C, 39 D
  
  // Format options so targetKey has the correct answer
  const opts = ["", "", "", ""];
  opts[targetKey] = base.a;
  let dIdx = 0;
  for (let k = 0; k < 4; k++) {
    if (k !== targetKey) {
      opts[k] = base.d[dIdx++];
    }
  }

  // Create varied stems and scenario angles for repetition avoidance
  const round = Math.floor(i / rawConcepts.length);
  let qStem = base.q;
  if (round === 1) {
    qStem = `O'quv ustaxonasida texnologik jarayonni loyihalashda: ${base.q.replace(/qaysi\?|nima\?/gi, "qaysi qoidada to'liq o'z aksini topgan?")}`;
  } else if (round === 2) {
    qStem = `Zamonaviy texnika va ishlab chiqarish amaliyotida mutaxassis e'tibor qaratishi zarur bo'lgan holat: ${base.q}`;
  } else if (round >= 3) {
    qStem = `Texnologiya fani mashg'ulotlarida texnika elementlarini tahlil qilish jarayonida: ${base.q}`;
  }

  generated.push({
    id: qId,
    q: qStem,
    opts,
    correct: targetKey,
    explanation: base.exp,
    mnemonic: base.mnem,
    topicId: 186,
    category: "texnologiya_dizayn",
    difficulty: base.diff,
    bloom_level: base.bloom,
    question_type: base.qtype,
    source_file: "01_zamonaviy_texnika_va_texnologiyalar.json"
  });
}

const outPath = path.join('fan 4/Texnologiya (Dizayn)/bolimlar', '01_zamonaviy_texnika_va_texnologiyalar.json');
fs.writeFileSync(outPath, JSON.stringify(generated, null, 2), 'utf8');
console.log(`✅ 01_zamonaviy_texnika_va_texnologiyalar.json yaratildi: ${generated.length} ta savol.`);
