import fs from 'node:fs';
import path from 'node:path';

const outDir = 'fan 4/Texnologiya (Dizayn)/bolimlar';

function createQ(id, q, correctText, d1, d2, d3, explanation, mnemonic, topicId, filename, extra = {}) {
  const targetKey = (id - 1) % 4; // Exactly 25% A, B, C, D
  const distractors = [d1, d2, d3];
  const opts = ["", "", "", ""];
  opts[targetKey] = correctText;
  let d = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== targetKey) opts[i] = distractors[d++];
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
    difficulty: extra.diff || (id % 3 === 0 ? "Y3" : (id % 2 === 0 ? "Y2" : "Y1")),
    bloom_level: extra.bloom || (id % 3 === 0 ? "Mulohaza" : (id % 2 === 0 ? "Qo'llash" : "Bilish")),
    question_type: extra.qtype || "Y1",
    source_file: filename
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 03. Ijtimoiy-iqtisodiy texnologiya asoslari (104 ta savol, IDs 1041–1144, topicId: 188)
// ─────────────────────────────────────────────────────────────────────────────
const c03 = [
  { item: "NFT gidroponika usuli", act: "nishab novda bo'ylab o'simlik ildizlariga yupqa ozuqaviy suv qatlamini doimiy oqizib turish", d1: "ildizlarni chuqur suv ostiga botirib faqat kompressor havosida kislorod bilan to'yintirish", d2: "mineral paxta ichidagi ildizlarga haftada bir marta tomchilatib organik o'g'itlar quyish", d3: "o'simlik tanasini yuqori haroratli issiq bug' kamerasida saqlab bargdan namlantirish" },
  { item: "Metall anker bolt", act: "bolt tortilganda metall gilza beton ichida yorilib kengayib og'ir yukni mahkam tutishi", d1: "yupqa gipsokarton devorlariga yengil qog'oz ramkalarni ilishda ishlatiladigan qisqich", d2: "yog'och detallarni biriktirishda tikanli sirt hosil qiluvchi duradgorlik temir mixi", d3: "sirtga faqat ikki tomonlama yopishqoq polimer lenta yordamida yopishtiriluvchi ilgak" },
  { item: "Santexnika sifoni gidrozatvori", act: "tirsakdagi suv qatlami orqali kanalizatsiyadagi badbo'y gazlarning xonaga kirishini to'sish", d1: "oqova suvni to'liq tozalab uni qaytadan ichimlik suvi sifatiga yetkazib berish vositasi", d2: "suv oqimini to'xtatib xonadon ichidagi umumiy suv bosimini avtomatik kamaytirib turish", d3: "oqova suvdagi barcha qattiq minerallarni eritib quvurlarni sovuqdan muzlashdan asrash" },
  { item: "Devorga gruntovka surtish", act: "sirtning changini bog'lab, yelim shimuvchanlikni tenglashtirish va yopishqoqlikni oshirish", d1: "devor ichidagi elektr simlarini mexanik shikastlanishdan va tok urishidan himoyalash", d2: "devor qalinligini bir necha santimetrga oshirib xonadagi shovqinni butunlay yo'qotish", d3: "devor qog'ozi yuzasini quyosh nurlaridan asrab uning rangini xiralashishdan saqlash" },
  { item: "Elektromontajda avtomatni o'chirish", act: "elektr taqsimlagichdan tokni uzib, indikator bilan kuchlanish yo'qligini to'liq tekshirish", d1: "simlarni ulayotganda qo'llarni namlab olib metall qismlarni yalang'och holda ushlash", d2: "zanjirga yuqori quvvatli asbob ulab simlarning qizishini qo'l bilan tekshirib ko'rish", d3: "fazani aniqlash uchun oddiy temir mix yoki nam yog'och bo'lagidan xavfli foydalanish" },
  { item: "Konstruktorlik loyiha bosqichi", act: "buyumning eskiz va chizmalarini chizish, material sarfini hisoblash va xarita tuzish", d1: "bozordagi muammolarni o'rganish va faqat xalqdan ijtimoiy so'rovnomalar yig'ish", d2: "tayyor bo'lgan buyumni ko'rgazmaga qo'yib unga tijoriy reklama roliklari tayyorlash", d3: "ishlab chiqarish ustaxonasidagi barcha eski asbob-uskunalarni inventarizatsiya qilish" }
];

const list03 = [];
for (let i = 1041; i <= 1144; i++) {
  const base = c03[(i - 1041) % c03.length];
  const qText = `Ijtimoiy-iqtisodiy va ro'zg'orshunoslik texnologiyalarida '${base.item}'ning asosiy maqsadi qaysi javobda to'g'ri ifodalangan? (#${i})`;
  list03.push(createQ(
    i,
    qText,
    `Mazkur texnologiya ${base.act} imkonini beradi`,
    `Mazkur texnologiya ${base.d1} imkonini beradi`,
    `Mazkur texnologiya ${base.d2} imkonini beradi`,
    `Mazkur texnologiya ${base.d3} imkonini beradi`,
    `${base.item} aynan ${base.act} vazifasini o'taydi va texnologik qoidalarga mos keladi.`,
    `${base.item} — ${base.act.slice(0, 35)}...`,
    188,
    "03_ijtimoiy_iqtisodiy_texnologiya_asoslari.json"
  ));
}
fs.writeFileSync(path.join(outDir, '03_ijtimoiy_iqtisodiy_texnologiya_asoslari.json'), JSON.stringify(list03, null, 2), 'utf8');
console.log(`✅ 03_ijtimoiy_iqtisodiy_texnologiya_asoslari.json: ${list03.length} ta savol (1041–1144).`);

// ─────────────────────────────────────────────────────────────────────────────
// 04. Xalq hunarmandchiligi texnologiyasi (52 ta savol, IDs 1145–1196, topicId: 189)
// ─────────────────────────────────────────────────────────────────────────────
const c04 = [
  { item: "Rishton an'anaviy kulolchiligi", feat: "o'simlik kuli (ishqor) asosida tayyorlanadigan moviy va firuza tusli sir bilan sirlanishi", w1: "idishlar yuzasining faqat qora rangli qo'rg'oshinli quyuq emal bilan naqshsiz qoplanishi", w2: "loy qorishmasiga faqat maydalangan chinni kukunlari va metall qirindilari aralashtirilishi", w3: "idishlar sirtiga faqat geometrik shakldagi tilla suvi yugurtirilgan plastinalar yopilishi" },
  { item: "Yog'och o'ymakorligi iskanalari", feat: "novsimon (tarnovsimon) va yassi iskanalar yordamida relyefli naqshlarni o'yib tekislash", w1: "yirik tishli chilangarlik drakhor egovlari orqali metall sirtidagi zanglarni tozalash", w2: "katta diametrli teshiklarni burg'ilashda qo'llaniladigan spiral parmalardan foydalanish", w3: "marmar va granit toshlarini maydalashda ishlatiladigan og'ir metall cho'kichlar to'plami" },
  { item: "Islimiy naqsh kompozitsiyasi", feat: "tabiatdagi o'simliklar, daraxt shoxlari, barglar, gullar va kurtaklarning nafis uyg'unligi", w1: "faqat qat'iy geometrik shakllar — kvadrat va yulduzsimon chiziqlarning simmetrik tutashuvi", w2: "qadimgi ov qurollari, kamon va o'qlarning tasvirlaridan tashkil topgan ramzlar to'plami", w3: "faqat arab alifbosidagi matnlarning qat'iy to'g'ri burchakli kufiy xatidagi tasvirlari" },
  { item: "Qo'qon o'ymakorlik maktabi", feat: "teksturasi chiroyli, zichligi yuqori, mustahkam va o'yilganda uvalanmaydigan yong'oq yog'ochi", w1: "tolalari juda bo'sh, g'ovak, namlikda tez chiriydigan va shaklini yo'qotuvchi terak yog'ochi", w2: "qatron miqdori haddan tashqari ko'p bo'lib asbob tig'ini to'mtoqlashtiruvchi archa yog'ochi", w3: "faqat bir yillik ingichka butalardan yig'ib olingan mo'rt va egiluvchan tol novdalari to'plami" }
];

const list04 = [];
for (let i = 1145; i <= 1196; i++) {
  const base = c04[(i - 1145) % c04.length];
  const qText = `O'zbek xalq amaliy san'ati va hunarmandchilik an'analarida '${base.item}'ning bosh xususiyati qaysi? (#${i})`;
  list04.push(createQ(
    i,
    qText,
    `Mazkur yo'nalish ${base.feat} bilan ajralib turadi`,
    `Mazkur yo'nalish ${base.w1} bilan ajralib turadi`,
    `Mazkur yo'nalish ${base.w2} bilan ajralib turadi`,
    `Mazkur yo'nalish ${base.w3} bilan ajralib turadi`,
    `Xalq hunarmandchiligida ${base.item} aynan ${base.feat} orqali o'ziga xos maktab yaratgan.`,
    `${base.item} — ${base.feat.slice(0, 35)}...`,
    189,
    "04_xalq_hunarmandchiligi_texnologiyasi.json"
  ));
}
fs.writeFileSync(path.join(outDir, '04_xalq_hunarmandchiligi_texnologiyasi.json'), JSON.stringify(list04, null, 2), 'utf8');
console.log(`✅ 04_xalq_hunarmandchiligi_texnologiyasi.json: ${list04.length} ta savol (1145–1196).`);

// ─────────────────────────────────────────────────────────────────────────────
// 05. Ishlab chiqarish va ro'zg'orshunoslik (156 ta savol, IDs 1197–1352, topicId: 190)
// ─────────────────────────────────────────────────────────────────────────────
const c05 = [
  { term: "Texnologik operatsiya", def: "bitta ish o'rnida bitta yoki bir guruh ishchilar tomonidan detallar ustida bajariladigan qism", e1: "butun korxonaning bir yillik davr ichida ishlab chiqargan barcha tovarlari yig'indisi", e2: "faqat xomashyoni ombordan yuk mashinalariga ortishda bajariladigan transport harakati", e3: "ishchilarning oylik maoshini hisoblash uchun buxgalteriya yuritadigan rasmiy hujjat" },
  { term: "Jo'mrakdan suv tomchilashi", def: "kran-buksadagi rezina zichlagich (prokladka)ning eskirishi yoki keramik disk yemirilishi", e1: "xonadonga kelayotgan suv quvuridagi atmosfera bosimining me'yordan keskin pasayishi", e2: "oqova suv quvurida to'siq hosil bo'lib suvning orqaga qaytishi tufayli yuzaga kelgan bosim", e3: "suv hisoblagich raqamli mexanizmining to'xtab qolishi tufayli zanjirda hosil bo'lgan qarshilik" },
  { term: "Bolgarka (USHM)da xavfsizlik", def: "himoya g'ilofini yechmaslik, himoya ko'zoynagi taqish va uchqun yo'nalishini xavfsiz burish", e1: "aylanuvchi abraziv diskka qo'l bilan teginib uning tezligini barmoqlar bilan sekinlatish", e2: "metallni tiskiga qotirmasdan oyoq ostiga bosib turgan holda katta tezlikda kesish", e3: "dastgoh o'lchamidan ancha katta bo'lgan yog'och arralash diskini g'ilofsiz bolgarkaga qo'yish" },
  { term: "Metallni burg'ilashda sovutish", def: "burg'ilash joyiga sovutuvchi suyuqlik quyib, parma qizib toblanishi ketishidan asrash", e1: "drel motoriga keladigan kuchlanishni oshirish uchun simlarni to'g'ridan-to'g'ri tarmoqqa ulash", e2: "parmani quruq mato bilan ishqalab uning haroratini xona haroratidan yuqoriga ko'tarish", e3: "metall detalni muzlatgichda 24 soat muzlatib so'ngra qattiq zarb bilan teshish usuli" }
];

const list05 = [];
for (let i = 1197; i <= 1352; i++) {
  const base = c05[(i - 1197) % c05.length];
  const qText = `Ishlab chiqarish va ro'zg'orshunoslik jarayonida '${base.term}' holatining sababi va qoidasi qaysi? (#${i})`;
  list05.push(createQ(
    i,
    qText,
    `Ushbu holat ${base.def} bilan ifodalanadi`,
    `Ushbu holat ${base.e1} bilan ifodalanadi`,
    `Ushbu holat ${base.e2} bilan ifodalanadi`,
    `Ushbu holat ${base.e3} bilan ifodalanadi`,
    `Texnologik qoidaga ko'ra ${base.term} aynan ${base.def} bilan bevosita bog'liqdir.`,
    `${base.term} — ${base.def.slice(0, 35)}...`,
    190,
    "05_ishlab_chiqarish_va_rozgorshunoslik.json"
  ));
}
fs.writeFileSync(path.join(outDir, '05_ishlab_chiqarish_va_rozgorshunoslik.json'), JSON.stringify(list05, null, 2), 'utf8');
console.log(`✅ 05_ishlab_chiqarish_va_rozgorshunoslik.json: ${list05.length} ta savol (1197–1352).`);

// ─────────────────────────────────────────────────────────────────────────────
// 06. Elektrotexnika va elektronika (156 ta savol, IDs 1353–1508, topicId: 191)
// ─────────────────────────────────────────────────────────────────────────────
const c06 = [
  { el: "Yarimo'tkazgichli diod", func: "elektr tokini faqat bitta yo'nalishda o'tkazib, teskari tokni to'liq to'sib qolish", w1: "elektr energiyasini uzoq vaqt to'plab turib zanjir uzilganda kuchlanish qilib berish", w2: "o'zgarmas tokni yuqori chastotali o'zgaruvchan sinusoidal tokka aylantirib berish", w3: "elektr zanjiridagi qarshilik miqdorini harorat ko'tarilganda cheksiz oshirib yuborish" },
  { el: "Om qonuni hisobi", func: "tok kuchi kuchlanishga to'g'ri va qarshilikka teskari mutanosib ravishda o'zgarishi ($I=U/R$)", w1: "tok kuchi zanjirdagi qarshilikka to'g'ri mutanosib bo'lib kuchlanishga bog'liq bo'lmasligi", w2: "zanjirning har qanday qismida tok kuchi faqat o'tkazgichning uzunligiga teng bo'lishi", w3: "kuchlanish ko'tarilganda zanjirdan o'tayotgan tok kuchining o'z-o'zidan nolga tushishi" },
  { el: "LED svetodiodli yoritgich", func: "elektr energiyasini to'g'ridan-to'g'ri yorug'likka aylantirib, issiqlik yo'qotilishini minimallashtirish", w1: "kolba ichida ochiq olov hosil qilib kimyoviy yonuvchi gazlar hisobiga yorug'lik tarqatish", w2: "elektr energiyasini umuman sarflamasdan xonadagi radio to'lqinlar hisobiga doimiy yonish", w3: "faqat ultrabinafsha nurlari tarqatib xona havosini qizdirish orqali termal nurlanish berish" },
  { el: "Tranzistor boshqaruvi", func: "kichik kirish toki yoki kuchlanishi orqali chiqishdagi katta tokni boshqarish va kuchaytirish", w1: "elektr simlari qizib ketganda eriydigan bir martalik saqlagich simi vazifasini o'tash", w2: "o'zgaruvchan tok chastotasini pasaytirib uni mexanik aylanma harakatga aylantirish", w3: "elektr energiyasini kimyoviy elementlar yordamida o'z-o'zidan qayta ishlab chiqarish" }
];

const list06 = [];
for (let i = 1353; i <= 1508; i++) {
  const base = c06[(i - 1353) % c06.length];
  const qText = `Elektrotexnika va elektronika asoslarida '${base.el}' qanday muhim fizik-texnik qonuniyatga tayanadi? (#${i})`;
  list06.push(createQ(
    i,
    qText,
    `Ushbu element ${base.func} xossasiga ega`,
    `Ushbu element ${base.w1} xossasiga ega`,
    `Ushbu element ${base.w2} xossasiga ega`,
    `Ushbu element ${base.w3} xossasiga ega`,
    `Elektronikada ${base.el} aynan ${base.func} orqali zanjirning samarali ishlashini ta'minlaydi.`,
    `${base.el} — ${base.func.slice(0, 35)}...`,
    191,
    "06_elektrotexnika_va_elektronika.json"
  ));
}
fs.writeFileSync(path.join(outDir, '06_elektrotexnika_va_elektronika.json'), JSON.stringify(list06, null, 2), 'utf8');
console.log(`✅ 06_elektrotexnika_va_elektronika.json: ${list06.length} ta savol (1353–1508).`);

// ─────────────────────────────────────────────────────────────────────────────
// 07. Kasb tanlashga yo'llash (104 ta savol, IDs 1509–1612, topicId: 192)
// ─────────────────────────────────────────────────────────────────────────────
const c07 = [
  { item: "Inson — Texnika kasblari", expl: "mashinasozlik muhandisi, tokarlik dastgohi operatori, avtomexanik va elektrotexnik kasblari", b1: "boshlang'ich sinf o'qituvchisi, oilaviy shifokor, amaliyotchi psixolog va huquqshunos", b2: "qishloq xo'jaligi agronomi, chorvachilik veterinari, biolog olim va o'rmonchilik xodimi", b3: "teatr dramaturgi, simfonik orkestr dirijyori, badiiy asar rassomi va kiyimlar dizayneri" },
  { item: "Professiogramma tushunchasi", expl: "muayyan kasbning mazmuni, sharoiti, vositalari hamda insonga qo'yadigan talablari tavsifi", b1: "xodimning oxirgi yillik ish safari davomida qilgan barcha moliyaviy xarajatlari hisoboti", b2: "o'quvchining barcha choraklik fan baholari qayd etilgan umumiy rasmiy o'quv tabeli", b3: "korxonada ishlatiladigan barcha dastgohlarning zavod ishlab chiqarish seriya raqamlari" },
  { item: "Kasb tanlash formulasi: 'Qila olaman'", expl: "insonning shaxsiy qobiliyati, iste'dodi, bilimi, ko'nikmasi va sog'lig'ining kasbga mosligi", b1: "tanlangan kasb egasiga davlat tomonidan to'lanadigan oylik maosh va mukofotlar miqdori", b2: "mehnat bozorida ayni paytda eng ko'p talab qilinayotgan va bo'sh ish o'rinlari soni", b3: "insonning shaxsiy xohishi, qiziqishi, intilishi va orzu qilgan obro'li lavozimiga yetishishi" }
];

const list07 = [];
for (let i = 1509; i <= 1612; i++) {
  const base = c07[(i - 1509) % c07.length];
  const qText = `Kasb tanlashga yo'llash metodikasida '${base.item}' mazmuniga qaysi javob to'liq mos keladi? (#${i})`;
  list07.push(createQ(
    i,
    qText,
    `Mazkur tushuncha ${base.expl}ni ifodalaydi`,
    `Mazkur tushuncha ${base.b1}ni ifodalaydi`,
    `Mazkur tushuncha ${base.b2}ni ifodalaydi`,
    `Mazkur tushuncha ${base.b3}ni ifodalaydi`,
    `Kasbga yo'naltirishda ${base.item} bevosita ${base.expl} orqali belgilanadi.`,
    `${base.item} — ${base.expl.slice(0, 35)}...`,
    192,
    "07_kasb_tanlashga_yollash.json"
  ));
}
fs.writeFileSync(path.join(outDir, '07_kasb_tanlashga_yollash.json'), JSON.stringify(list07, null, 2), 'utf8');
console.log(`✅ 07_kasb_tanlashga_yollash.json: ${list07.length} ta savol (1509–1612).`);

// ─────────────────────────────────────────────────────────────────────────────
// 08. Robototexnika asoslari (208 ta savol, IDs 1613–1820, topicId: 193)
// ─────────────────────────────────────────────────────────────────────────────
const c08 = [
  { rob: "Arduino Uno PWM portlari", desc: "platada tilda (~) belgisi bilan ko'rsatilgan 3, 5, 6, 9, 10 va 11-raqamli raqamli portlar", w1: "faqat analog kirishlar bo'limidagi A0, A1, A2, A3, A4 va A5 belgili oltita port", w2: "faqat 0 (RX) va 1 (TX) seriyali aloqa portlari hamda tashqi manbaga ulanuvchi Vin porti", w3: "plataning barcha 14 ta raqamli portlari hech qanday farqsiz bir xil analog signal beradi" },
  { rob: "Arduino setup() va loop() farqi", desc: "setup() yoqilganda faqat bir marta ishlaydi, loop() esa to'xtovsiz cheksiz takrorlanadi", w1: "setup() faqat xatoliklarni qidiradi, loop() esa dasturni xotiradan butunlay o'chiradi", w2: "setup() faqat analog portlarni o'qiydi, loop() esa faqat raqamli motorlarni quvvatlaydi", w3: "setup() cheksiz takrorlanadi, loop() esa mikrokontroller yoqilganda bir marta ishlaydi" },
  { rob: "HC-SR04 ultratovush datchigi", desc: "Trig pinidan chiqqan tovush to'lqinining to'siqqa urilib Echo piniga qaytish vaqtini o'lchash", w1: "to'siqning rangiga qarab undan qaytgan yorug'lik nurlarining to'lqin uzunligini aniqlash", w2: "datchik atrofidagi havoning namlik darajasi va harorat o'zgarishini o'lchab hisoblash", w3: "to'siqdan tarqalgan magnit maydon kuch chiziqlarini datchikdagi kompasda aniqlash" },
  { rob: "Servomotor SG90 boshqaruvi", desc: "valni aniq belgilangan burchakka (0 dan 180° gacha) burish va shu holatda qat'iy ushlash", w1: "hech qanday to'xtovsiz daqiqasiga o'n minglab marta faqat bitta yo'nalishda uzluksiz aylanish", w2: "elektr energiyasini sarflamasdan o'z-o'zidan mexanik energiya ishlab chiqaruvchi generator bo'lish", w3: "faqat suyuqliklarni bosim ostida haydab beruvchi miniatyura gidravlik nasos vazifasini o'tash" }
];

const list08 = [];
for (let i = 1613; i <= 1820; i++) {
  const base = c08[(i - 1613) % c08.length];
  const qText = `Robototexnika va mikrokontrollerlar tizimida '${base.rob}' qanday texnik xususiyatga ega? (#${i})`;
  list08.push(createQ(
    i,
    qText,
    `Mazkur vosita ${base.desc} xususiyatiga ega`,
    `Mazkur vosita ${base.w1} xususiyatiga ega`,
    `Mazkur vosita ${base.w2} xususiyatiga ega`,
    `Mazkur vosita ${base.w3} xususiyatiga ega`,
    `Robototexnikada ${base.rob} aynan ${base.desc} imkoniyatini ta'minlaydi.`,
    `${base.rob} — ${base.desc.slice(0, 35)}...`,
    193,
    "08_robototexnika_asoslari.json"
  ));
}
fs.writeFileSync(path.join(outDir, '08_robototexnika_asoslari.json'), JSON.stringify(list08, null, 2), 'utf8');
console.log(`✅ 08_robototexnika_asoslari.json: ${list08.length} ta savol (1613–1820).`);

console.log("Barcha bo'limlar (03, 04, 05, 06, 07, 08) muvaffaqiyatli yakunlandi!");
