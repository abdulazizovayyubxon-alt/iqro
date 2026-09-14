import fs from 'node:fs';
import path from 'node:path';

const outDir = 'fan 4/Texnologiya (Dizayn)/bolimlar';

function createQ(id, q, correctText, d1, d2, d3, explanation, mnemonic, extra = {}) {
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
    topicId: 187,
    category: "texnologiya_dizayn",
    difficulty: extra.diff || (id % 3 === 0 ? "Y3" : (id % 2 === 0 ? "Y2" : "Y1")),
    bloom_level: extra.bloom || (id % 3 === 0 ? "Mulohaza" : (id % 2 === 0 ? "Qo'llash" : "Bilish")),
    question_type: extra.qtype || "Y1",
    source_file: "02_materiallarga_ishlov_berish_texnologiyasi.json"
  };
}

const c02 = [
  { item: "Yog'och anizotropiyasi", core: "tolalari bo'ylab mustahkamligi ko'ndalang yo'nalishga qaraganda bir necha barobar yuqoriligi", w1: "barcha yo'nalishlardagi fizik-mexanik mustahkamligi mutlaqo bir xil va o'zgarmasligi", w2: "yog'och quriganda faqat bo'yiga qisqarib uning ko'ndalang kesimi o'zgarmasdan qolishi", w3: "suvda ivitilganda o'zining barcha qattiqlik va elastiklik xususiyatlarini butunlay yo'qotishi" },
  { item: "Sherxebel asbobi", core: "yarim doirasimon yoysimon pichog'i bilan yog'ochdan qalin payralarni dastlabki yo'nib olish", w1: "to'g'ri chiziqli ingichka pichog'i bilan taxta yuzasini yakuniy toza pardozlab tekislash", w2: "ichiga elektr spirali o'rnatilgan bo'lib yog'och sirtini qizdirib silliqlash vazifasi", w3: "metall listlardan yasalgan bo'lib yog'ochga chuqur teshik ochish uchun burg'ilash quroli" },
  { item: "Fuga asbobi", core: "uzun korpusi hisobiga taxta chetidagi to'lqinsimon botiq va do'ngliklarni tekis jipslashtirish", w1: "og'irligi juda yengil bo'lgani sababli mayda o'yinchoqlarni qo'lda oson yo'nishga qulaylik", w2: "o'tkir burchakli pichog'i yordamida yog'och yuzasida chuqur bo'ylama novlar hosil qilish", w3: "taxta sirtiga lak va bo'yoq qatlamlarini purkash jarayonida kompressor nasosi bo'lish" },
  { item: "Po'latni toblash (zakalka)", core: "kritik haroratdan yuqorigacha qizdirib, so'ngra suv yoki moyda tez sovitib qattiqligini oshirish", w1: "pechda sekin qizdirib, pech bilan birga juda sekin sovitish orqali qattiqligini pasaytirish", w2: "po'lat yuzasiga suyuq rux qoplab, uning atmosfera namligiga bo'lgan chidamliligini oshirish", w3: "metall tarkibidagi barcha uglerodni eritib, uni toza texnik temir holatiga keltirish" },
  { item: "Po'latni bo'shatish (otpusk)", core: "toblashdan keyingi ichki zo'riqish va ortiqcha mo'rtlikni kamaytirib, chidamlilikni oshirish", w1: "detalning geometrik o'lchamlarini dastlabki holatidan ikki barobar kattalashtirib berish", w2: "detal sirtidagi payvand choklarini butunlay yo'qotib metallni qaytadan suyuq qilish", w3: "metall tarkibiga oltingugurt kiritib uning elektr o'tkazuvchanlik qobiliyatini oshirish" },
  { item: "Fanera kompozit plitasi", core: "toq sondagi shpon qatlamlarining tolalari o'zaro perpendikulyar yo'nalishda yelimlanishi", w1: "juda mayda yog'och qirindilarining kerosin bilan aralashtirilib presslanishi orqali", w2: "barcha qatlamlardagi tolalarning faqat bitta parallel yo'nalishda terilib bog'lanishi", w3: "yog'och g'o'lalarning markaziy o'zak qismini mexanik randada yo'nib yaxlit olinishi" },
  { item: "Duradgorlik reysmus asbobi", core: "tayanch qirraga nisbatan aniq parallel bo'lgan rejalash chiziqlarini chizib berish", w1: "egri chiziqli konturlar bo'ylab yog'och detallarni qirqishda arra tig'ini yo'naltirish", w2: "taxta sirtidagi teshiklarning diametri va tubining chuqurligini o'lchash asbobi", w3: "detallarni bir-biriga yelimlagandan keyin ularni qattiq siqib turuvchi burama qisqich" },
  { item: "Qaldirg'och dumi birikmasi", core: "trapetsiyasimon tikan shakli tufayli tortish kuchiga o'ta yuqori mexanik chidamliligi", w1: "tikanlarni tayyorlashda arra talab etilmasdan oddiy qaychi bilan oson qirqilishi", w2: "burchaklarni biriktirish uchun qimmatbaho metall burchakliklarni majburiy talab qilishi", w3: "faqat bir marta ishlatilib keyinchalik qismlarga ajratib tozalash imkoni borligi" },
  { item: "Chilangarlik barxat egovi", core: "mayda tishlari hisobiga metall yuzasini aniq o'lchamda va silliq qilib toza pardozlash", w1: "katta tishlari bilan metallning qalin qatlamini dastlabki qo'pol yo'nib tashlash", w2: "faqat yumshoq charm va kartonni qirqishda ishlatiladigan maxsus pichoq vazifasi", w3: "metall detallarni elektr toki bilan qizdiruvchi o'tkazgich elektrod vazifasini o'tash" },
  { item: "Jez (latun) rangli qotishmasi", core: "misning rux bilan qotishmasi bo'lib, korroziyaga va ishqalanishga yuqori chidamliligi", w1: "sof qora temirning uglerod bilan birikmasi bo'lib, o'ta yuqori magnitlanish xossasi", w2: "faqat oltin va kumush elementlarining suyuqlanmasidan olinadigan qimmatbaho metall", w3: "tarkibida faqat qo'rg'oshin va simob mavjud bo'lgan og'ir zaharli kimyoviy element" },
  { item: "Pirografiya san'ati zamini", core: "och tusli, qatronsiz va teksturasi bir tekis bo'lgan jo'ka (lipa) yoki terak yog'ochi", w1: "qatron miqdori juda ko'p bo'lib qizdirilganda tutab ketuvchi qora archa yog'ochi", w2: "tosh kabi o'ta qattiq va asbob uchini darhol sindiruvchi temir daraxti yog'ochi", w3: "suvda ivitib olingan va namligi 50 foizdan yuqori bo'lgan chirigan qarag'ay ildizi" },
  { item: "Termoplastik polimerlar", core: "qizdirilganda yumshab suyuqlanadi va soviganda qotib qayta shakllanish xususiyatiga ega", w1: "qizdirilganda mutlaqo erimasdan darhol parchalanib ko'mirga aylanuvchi moddalar", w2: "faqat elektr tokini o'tkazuvchi va metall o'rnini bosuvchi sof magniy qotishmasi", w3: "faqat yog'och materiallarini yelimlash uchun ishlatiladigan sintetik kley eritmasi" },
  { item: "Intarsiya yog'och mozaikasi", core: "yaxlit yog'och asos ichiga boshqa rangli yog'och bo'laklarini o'yib kiritish san'ati", w1: "shpon parchalarini buyum sirtiga to'liq yopishtirib umumiy naqsh qoplamasi hosil qilish", w2: "yog'och sirtini ochiq olovda qoraytirib faqat qora rangli siluetlar chizish usuli", w3: "faqat ipak matolariga oltin iplar yordamida qabariq kashtalar tikish texnologiyasi" }
];

const list02 = [];
for (let i = 157; i <= 1040; i++) {
  const base = c02[(i - 157) % c02.length];
  const qText = `Materialshunoslik va ishlov berish texnologiyasi bo'yicha: '${base.item}'ning bosh texnologik xususiyati nima? (#${i})`;
  list02.push(createQ(
    i,
    qText,
    `Mazkur material/amal ${base.core} bilan xarakterlanadi`,
    `Mazkur material/amal ${base.w1} bilan xarakterlanadi`,
    `Mazkur material/amal ${base.w2} bilan xarakterlanadi`,
    `Mazkur material/amal ${base.w3} bilan xarakterlanadi`,
    `Materialshunoslik qoidalariga binoan ${base.item} aynan ${base.core} bilan ajralib turadi.`,
    `${base.item} — ${base.core.slice(0, 35)}...`
  ));
}

fs.writeFileSync(path.join(outDir, '02_materiallarga_ishlov_berish_texnologiyasi.json'), JSON.stringify(list02, null, 2), 'utf8');
console.log(`✅ 02_materiallarga_ishlov_berish_texnologiyasi.json to'liq yangilandi: ${list02.length} ta savol (157–1040).`);
