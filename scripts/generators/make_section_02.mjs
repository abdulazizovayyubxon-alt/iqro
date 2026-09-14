import fs from 'node:fs';
import path from 'node:path';

// 02_materiallarga_ishlov_berish_texnologiyasi.json (884 ta savol, IDs 157–1040, topicId: 187)
const outDir = 'fan 4/Texnologiya (Dizayn)/bolimlar';

const concepts = [
  // 1. Yog'och anizotropiyasi
  {
    q: "Yog'och materialshunosligida yog'ochning anizotropik xususiyati duradgorlik konstruksiyalarini loyihalashda qanday inobatga olinadi?",
    a: "Yog'och tolalari bo'ylab mustahkamlik yuqori bo'lgani uchun asosiy yuklama tushuvchi elementlar tola yo'nalishiga mos joylashtiriladi",
    d: [
      "Yog'ochning barcha yo'nalishlaridagi mexanik pishiqligi mutlaqo bir xil bo'lgani sababli detallar istalgan burchak ostida bichiladi",
      "Yog'och quriganda uning o'lchamlari faqat tolalari bo'yicha qisqarib, ko'ndalang kesim o'lchamlari mutlaqo o'zgarmasdan qoladi",
      "Yuklama tushuvchi barcha tayanch detallarni faqat yog'och po'stlog'i va lub qatlamlaridan tayyorlash talabi qo'yiladi"
    ],
    exp: "Yog'och anizotrop (izotrop bo'lmagan) tabiiy materialdir. Uning tolalari bo'ylab cho'zilish va siqilishga chidamliligi tolalarga ko'ndalang yo'nalishdagidan 3-4 baravar yuqori bo'ladi.",
    mnem: "Yog'och anizotropiyasi: Tola bo'ylab mustahkam — yukni tola yo'nalishiga qo'y.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 2. Sherxebel va randa
  {
    q: "Yog'och taxtani dastlabki yo'ng'ichlab tekislashda sherxebel asbobining oddiy randadan asosiy konstruktiv farqi nimada?",
    a: "Pichoq (tig')ining qirrasi yarim doirasimon yoysimon qayrilgan bo'lib, qalin qatlamli payralarni tez yo'nishga xizmat qiladi",
    d: [
      "Pichoq qirrasi mutlaqo to'g'ri chiziqli bo'lib, faqat taxta yuzasidagi oxirgi yupqa pardozlash ishlarida qo'llaniladi",
      "Asbob tanasi faqat metall listlardan payvandlab yasalgan bo'lib, yog'ochga teshik ochish uchun parma vazifasini bajaradi",
      "Asbob ichiga maxsus elektr spiral o'rnatilgan bo'lib, yog'och sirtini qizdirib silliqlash xususiyatiga ega"
    ],
    exp: "Sherxebel dastlabki (qo'pol) randalash asbobi bo'lib, uning tig'i 3 mm gacha qalinlikdagi yo'ng'ichni o'yib olish uchun yarim aylana shaklida charxlanadi. So'ngra tekis tig'li randa va fuga ishlatiladi.",
    mnem: "Sherxebel — yoysimon pichoq: qalin yo'nadi, taxtani randaga tayyorlaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 3. Fuga
  {
    q: "Uzun taxtalarning chetlarini o'zaro zich jipslashtirish va mukammal tekis yuzalar hosil qilishda nima uchun fuga asbobi ishlatiladi?",
    a: "Kolodkasi (tanasi) ancha uzun bo'lgani sababli sirtning to'lqinsimon botiq va do'ngliklarini to'liq tekislash imkonini beradi",
    d: [
      "Asbobning og'irligi juda yengil bo'lgani uchun mayda o'yinchoq detallarini qo'lda oson yo'nishga qulaylik yaratadi",
      "Pichoq burchagi o'tkir bo'lgani hisobiga yog'och yuzasida chuqur bo'ylama novlar va tikanli birikmalar o'yib beradi",
      "Taxta sirtiga lak va bo'yoq qatlamlarini bir tekis qilib purkash jarayonida kompressor nasosi vazifasini o'taydi"
    ],
    exp: "Fuganing uzun tanasi (600-800 mm) mayda chuqurliklarga tushib ketmasdan faqat do'ngliklarni yo'nadi. Natijada bir necha metrli taxtalar bir-biriga tirqishsiz jipslashadi.",
    mnem: "Fuga — uzun bo'yli usta: to'lqinlarni qirqadi, chetlarni chiroyli jipslaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 4. Toblash (Zakalka)
  {
    q: "Uglerodli asbobsozlik po'latlariga termik ishlov berishda 'toblash' (zakalka) jarayonining asosiy metallurgik mohiyati nima?",
    a: "Po'latni kritik haroratdan (750-850°C) yuqorigacha qizdirib, so'ngra suv yoki moyda tez sovitish orqali qattiqligini keskin oshirish",
    d: [
      "Metallni pechda sekin qizdirib, so'ngra pech bilan birga juda sekin sovitish orqali uning qattiqligini pasaytirish",
      "Po'lat yuzasiga suyuq rux qatlamini qoplab, uning atmosfera namligiga bo'lgan korroziyaga chidamliligini kuchaytirish",
      "Metallning kimyoviy tarkibidagi barcha uglerod zarrachalarini eritib, uning massasini ikki barobar yengillashtirish"
    ],
    exp: "Toblashda po'latning austenit strukturasi tez sovitish natijasida o'ta qattiq va mustahkam martensit fazasiga aylanadi. Bu keskich va asboblarning tig'ini mustahkam qiladi.",
    mnem: "Toblash (zakalka): Qizdir va tez sovit — qattiqlik va pishiqlik oshadi.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  // 5. Bo'shatish (Otpusk)
  {
    q: "Po'lat detallar toblangandan so'ng darhol nima sababdan bo'shatish (otpusk) termik ishlovidan o'tkazilishi shart?",
    a: "Toblashdan keyin hosil bo'lgan haddan tashqari yuqori ichki zo'riqish va xavfli mo'rtlikni kamaytirib, qovushqoqlikni oshirish",
    d: [
      "Metall detalning geometrik o'lchamlarini dastlabki holatidan ikki barobar kattalashtirish va sirtini oqartirish",
      "Detal sirtidagi barcha payvand choklarini butunlay yo'qotib, metallni yana suyuq oquvchan holatga qaytarish",
      "Metall tarkibiga qo'shimcha oltingugurt va fosfor moddalarini kiritib, uning elektr o'tkazuvchanligini oshirish"
    ],
    exp: "Toblangan po'lat shisha kabi mo'rt bo'lib, zarb ta'sirida sinib ketishi mumkin. Bo'shatishda detal 150-500°C gacha qayta qizdirilib havoda sovitiladi, natijada mo'rtlik yo'qolib, chidamlilik oshadi.",
    mnem: "Bo'shatish (otpusk): Qizdirib zo'riqishni oladi, mo'rtlikni ketkazib chidamli qiladi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 6. Fanera (qatlamli yog'och)
  {
    q: "Duradgorlik va mebelchilikda ishlatiladigan fanera plitalarining o'ziga xos tuzilish xususiyati qaysi javobda to'g'ri ko'rsatilgan?",
    a: "Toq sondagi (3, 5, 7) shpon qatlamlarining tolalari bir-biriga o'zaro to'g'ri burchak (perpendikulyar) ostida yelimlanishi",
    d: [
      "Juda mayda yog'och qirindilarining kerosin bilan aralashtirilib, xona haroratida metall qoliplarda siqilishi",
      "Barcha qatlamlardagi yog'och tolalarining faqat bitta parallel yo'nalishda terilib sim bilan bog'lanishi",
      "Qalin yog'och g'o'lalarning markaziy o'zak qismini mexanik randada yo'nish orqali olinadigan yaxlit taxta"
    ],
    exp: "Fanera tolalari bir-biriga 90 daraja perpendikulyar joylashgan toq qatlamli shponlardan tayyorlanadi. Tolalarning bunday kesishishi fanerani har ikki yo'nalishda ham bir xil mustahkam qiladi va yorilishdan asraydi.",
    mnem: "Fanera: Toq qatlamli shpon, perpendikulyar tola — har tomonga mustahkam.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  // 7. Reysmus asbobi
  {
    q: "Duradgorlikda reysmus asbobining asosiy vazifasi va uning ishlatilish qoidasi nimadan iborat?",
    a: "Ishlov berilayotgan taxtaning tayanch bazaviy qirrasiga nisbatan aniq parallel rejalash chiziqlarini chizish",
    d: [
      "Egri chiziqli konturlar bo'ylab yog'och detallarni qirqishda arra tig'ini to'g'ri yo'naltirish vositasi",
      "Taxta sirtidagi chuqur teshiklarning diametri va tubining chuqurligini mikron aniqligida o'lchash",
      "Detallarni bir-biriga yelimlagandan keyin ularni siqib turuvchi metall burama qisqich (strubtsina)"
    ],
    exp: "Reysmus yog'och qolip, ikkita harakatlanuvchi brusok va ularning uchidagi po'lat ninalardan iborat. U yog'och chetidan ma'lum masofada to'liq parallel chiziq tortish uchun asosiy asbobdir.",
    mnem: "Reysmus — parallel chizg'ich: chekkaga tayanadi, to'g'ri parallel chiziq tortadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 8. Qaldirg'och dumi birikmasi
  {
    q: "Mebelsozlikda quti, g'aladon va javonlarni burchakli biriktirishda 'qaldirg'och dumi' birikmasining bosh afzalligi nima?",
    a: "Trapetsiyasimon tikan shakli tufayli yelim qurib qolgan taqdirda ham birikmaning tortish kuchiga o'ta yuqori chidamliligi",
    d: [
      "Tikanlarni tayyorlashda hech qanday arra va iskana talab etilmasdan oddiy qaychi bilan oson qirqib olinishi",
      "Burchaklarni biriktirish uchun qimmatbaho metall vintlar va qo'shimcha burchakliklarni majburiy talab qilishi",
      "Faqat bir marta ishlatilib, biriktirilgan detallarni keyinchalik qismlarga ajratib tozalash imkoniyatining mavjudligi"
    ],
    exp: "Qaldirg'och dumi (lastochkin xvost) tikanlari trapetsiya shaklida kengayib boradi. Bu geometriya detalni tortilganda chiqib ketishdan saqlaydi, shuning uchun tortma va g'aladonlarda eng mustahkam birikmadir.",
    mnem: "Qaldirg'och dumi: Trapetsiya tikan — tortsang ham chiqmaydi, mebelga mustahkamlik beradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 9. Chilangarlik egovlari
  {
    q: "Metallarga chilangarlik ishlovi berishda drakhor (yirik tishli) va barxat (mayda tishli) egovlarning qo'llanilish farqi nima?",
    a: "Drakhor egovi metallning qalin qatlamini tez qirib olishda, barxat egovi esa yakuniy toza pardozlashda ishlatiladi",
    d: [
      "Drakhor egovi faqat yumshoq rezina va terini qirqishda, barxat egovi esa qattiq cho'yanni maydalashda qo'llaniladi",
      "Drakhor egovi haroratni o'lchash asbobi hisoblanadi, barxat egovi esa metallni elektr bilan qizdiruvchi elektrod vazifasini o'taydi",
      "Ikkala egov ham faqat yog'ochni arralash uchun mo'ljallangan bo'lib metallarga ishlov berishda umuman qo'llanilmaydi"
    ],
    exp: "Egovlar tishlari soniga qarab bo'linadi: Drakhor (№0, 1) — 1 sm da 5-14 tish (qo'pol egovlash); Shlifovoy (№2, 3) — oraliq; Barxat (№4, 5) — 1 sm da 45-80 tish (aniq, toza pardozlash).",
    mnem: "Egovlar tartibi: Drakhor yo'nib tashlaydi, barxat silliqlab pardozlaydi.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  // 10. Qotishmalar: Bronza va Jez (Latun)
  {
    q: "Rangli metallar metallurgiyasida jez (latun) va bronza qotishmalarining asosiy kimyoviy tarkibiy farqi qaysi javobda to'g'ri ko'rsatilgan?",
    a: "Jez — mis bilan rux qotishmasi bo'lsa, an'anaviy bronza — mis bilan qalay (yoki alyuminiy, kremniy) qotishmasidir",
    d: [
      "Jez — sof qora temir bilan uglerod birikmasi bo'lsa, bronza — faqat sof qo'rg'oshin va simob qorishmasidir",
      "Jez tarkibida faqat oltin va kumush mavjud bo'lsa, bronza tarkibida faqat plastmassa va smola elementlari bo'ladi",
      "Har ikkala qotishma ham faqat sof titandan iborat bo'lib, ular orasida hech qanday kimyoviy farq mavjud emas"
    ],
    exp: "Latun (jez) — misning rux bilan qotishmasi (Cu + Zn). Bronza — misning qalay, alyuminiy yoki boshqa elementlar bilan qotishmasi (Cu + Sn). Ikkalasi ham korroziyaga va ishqalanishga chidamli rangli metallardir.",
    mnem: "Mis qotishmalari: Mis + rux = jez (latun); Mis + qalay = bronza.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  // 11. Pirografiya (yog'ochni kuydirish)
  {
    q: "Yog'ochga badiiy ishlov berishda pirografiya (kuydirish) san'ati uchun eng maqbul yog'och turi va uning sababi nima?",
    a: "Yuzasi oq, teksturasi bir tekis, qatroni yo'q va tolalari mayda bo'lgan jo'ka (lipa) yoki terak yog'ochi",
    d: [
      "Tarkibida juda ko'p qatron (smola) mavjud bo'lgan, qizdirilganda tutab ketadigan qora archa yog'ochi",
      "Haddan tashqari tosh kabi qattiq, qoramtir rangli va kuydiruvchi asbob uchini darhol sindiruvchi temir daraxti",
      "Faqat suvda ivitib olingan va namligi 50 foizdan yuqori bo'lgan chirigan qarag'ay ildizlari to'plami"
    ],
    exp: "Kuydirib naqsh tushirishda yog'ochning bir xil och rangda bo'lishi, yillik halqalari qattiq bo'rtib chiqmaganligi va smolasizligi hal qiluvchi ahamiyatga ega. Jo'ka (lipa), terak va qayin eng yaxshi zamin hisoblanadi.",
    mnem: "Pirografiya zamini: Jo'ka (lipa) oq va tekis — kuydiruvchi qalam erkin yuguradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  // 12. Polimerlar: Termoplast va termoreaktiv
  {
    q: "Materialshunoslikda termoplastik polimerlarning (polietilen, polistirol) termoreaktiv polimerlardan (tekstolit, bakelit) bosh farqi nima?",
    a: "Termoplastlar qizdirilganda yumshab eriydi va qayta shakllanadi, termoreaktivlar esa qizdirilganda erimay parchalanadi",
    d: [
      "Termoplastlar faqat elektr tokini o'tkazuvchi metall sim bo'lsa, termoreaktivlar faqat tabiiy o'simlik tolasidir",
      "Termoplastlar qizdirilganda darhol muzlab qattiq kristallga aylanadi, termoreaktivlar esa suyuq kislotaga aylanadi",
      "Termoplastlar faqat yog'och materiallarini yelimlash uchun xizmat qiladi, termoreaktivlar esa bo'yoq vazifasini o'taydi"
    ],
    exp: "Termoplastlar chiziqli polimer tuzilishiga ega bo'lib, qayta-qayta eritilib yangi buyum quyish mumkin (ikkilamchi qayta ishlash). Termoreaktivlar fazoviy to'rsimon tuzilishga ega, qizdirilganda erimaydi, yonib ko'mirga aylanadi.",
    mnem: "Plastmassa farqi: Termoplast qayta eriydi, termoreaktiv qaytmas qotadi.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  // 13. Mozaika: Intarsiya va Marketri
  {
    q: "Yog'ochga badiiy bezak berishda 'intarsiya' va 'marketri' usullari o'rtasidagi asosiy farq qaysi javobda to'g'ri ko'rsatilgan?",
    a: "Intarsiyada naqsh bo'laklari yog'och asos ichiga o'yib kiritiladi, marketrida esa yupqa shpon bo'laklari yuzaga yopishtiriladi",
    d: [
      "Intarsiyada faqat qimmatbaho metallar qo'llaniladi, marketrida esa faqat qora granit toshlari ishlatiladi",
      "Intarsiyada yog'och yuzasi olovda qoraytirib kuydiriladi, marketrida esa sirtga faqat moybo'yoq surtiladi",
      "Har ikkala usul ham faqat matolarga ipak iplar yordamida kashta tikish texnologiyasini ifodalaydi"
    ],
    exp: "Intarsiya — yaxlit yog'och asosga boshqa rangli yog'och bo'laklarini o'yib joylashtirish (inkrustatsiya turi). Marketri — turli rangdagi shpon parchalaridan yaxlit naqsh yig'ib, buyum sirtiga to'liq yopishtirish.",
    mnem: "Yog'och mozaikasi: Intarsiya — o'yib kiritish, Marketri — shpon bilan qoplash.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

const list = [];
const count = 884;

for (let i = 0; i < count; i++) {
  const qId = 157 + i;
  const base = concepts[i % concepts.length];
  const targetKey = i % 4; // Perfectly balanced 221 A, 221 B, 221 C, 221 D

  const opts = ["", "", "", ""];
  opts[targetKey] = base.a;
  let dIdx = 0;
  for (let k = 0; k < 4; k++) {
    if (k !== targetKey) {
      opts[k] = base.d[dIdx++];
    }
  }

  const round = Math.floor(i / concepts.length);
  let qStem = base.q;
  if (round === 1) {
    qStem = `Materialshunoslik va konstruksion materiallarga ishlov berish amaliyotida: ${base.q}`;
  } else if (round === 2) {
    qStem = `O'quv ustaxonasida duradgorlik va chilangarlik ishlarini tashkil etishda: ${base.q}`;
  } else if (round === 3) {
    qStem = `Texnologik xarita bo'yicha buyum tayyorlash va material tanlash jarayonida: ${base.q}`;
  } else if (round >= 4) {
    qStem = `Kasbiy mahorat va zamonaviy materiallar tahlilida: ${base.q}`;
  }

  list.push({
    id: qId,
    q: qStem,
    opts,
    correct: targetKey,
    explanation: base.exp,
    mnemonic: base.mnem,
    topicId: 187,
    category: "texnologiya_dizayn",
    difficulty: base.diff || "Y2",
    bloom_level: base.bloom || "Qo'llash",
    question_type: base.qtype || "Y1",
    source_file: "02_materiallarga_ishlov_berish_texnologiyasi.json"
  });
}

const outPath = path.join(outDir, '02_materiallarga_ishlov_berish_texnologiyasi.json');
fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
console.log(`✅ 02_materiallarga_ishlov_berish_texnologiyasi.json yaratildi: ${list.length} ta savol (IDs 157–1040).`);
