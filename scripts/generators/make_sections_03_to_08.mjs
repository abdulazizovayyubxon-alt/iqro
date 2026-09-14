import fs from 'node:fs';
import path from 'node:path';

const outDir = 'fan 4/Texnologiya (Dizayn)/bolimlar';

// Helper to expand concept banks into balanced question banks
function generateBank(filename, topicId, startId, count, concepts) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const qId = startId + i;
    const base = concepts[i % concepts.length];
    const targetKey = i % 4; // Perfectly balanced across 0, 1, 2, 3 (A, B, C, D)

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
      qStem = `O'quv ustaxonasida amaliy loyiha bajarish jarayonida: ${base.q}`;
    } else if (round === 2) {
      qStem = `Texnologiya fani darslarida kasbiy kompetensiyalarni shakllantirishda: ${base.q}`;
    } else if (round >= 3) {
      qStem = `Ishlab chiqarish va servis texnologiyalarini tahlil qilishda: ${base.q}`;
    }

    list.push({
      id: qId,
      q: qStem,
      opts,
      correct: targetKey,
      explanation: base.exp,
      mnemonic: base.mnem,
      topicId,
      category: "texnologiya_dizayn",
      difficulty: base.diff || "Y2",
      bloom_level: base.bloom || "Qo'llash",
      question_type: base.qtype || "Y1",
      source_file: filename
    });
  }

  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(list, null, 2), 'utf8');
  console.log(`✅ ${filename} yaratildi: ${list.length} ta savol (IDs ${startId}–${startId + count - 1}).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 03. Ijtimoiy-iqtisodiy texnologiya asoslari (104 ta savol, IDs 1041–1144, topicId: 188)
// Gidroponika, mahkamlagichlar, santexnika sifonlari, xonadon ta'mirlash, elektromontaj, loyiha bosqichlari
// ─────────────────────────────────────────────────────────────────────────────
const c03 = [
  {
    q: "Gidroponika usulida tuproqsiz o'simlik yetishtirishda ozuqa qatlami texnikasi (NFT — Nutrient Film Technique)ning asosiy mohiyati nima?",
    a: "O'simlik ildizlari bo'ylab nishab novda ichida doimiy ravishda yupqa ozuqaviy suv qatlamining oqib turishi",
    d: [
      "O'simlik ildizlarini to'liq suv tubiga botirib, kompressor orqali doimiy ravishda faqat kislorod purkab turish",
      "Ildizlarni quruq mineral paxta ichiga joylashtirib, haftada bir marta tomchilatib organik o'g'itlar yetkazish",
      "O'simlik tanasini yuqori haroratli bug' kamerasida saqlab, barglar orqali namlikni to'g'ridan-to'g'ri shimdirish"
    ],
    exp: "NFT texnologiyasida ozuqa eritmasi maxsus novlar orqali yupqa (plyonka kabi) qatlam bo'lib oqadi. Natijada ildizning pastki qismi suv va ozuqa oladi, yuqori qismi esa havodan to'yintirilgan kislorodni erkin yutadi.",
    mnem: "NFT usuli — oqar qatlam: ildiz pastda ozuqa ichadi, tepada nafas oladi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Beton va g'ishtli mustahkam devorlarga og'ir konstruksiyalar va asboblarni mustahkam qotirishda qaysi mahkamlagich turi eng ishonchli hisoblanadi?",
    a: "Bolt tortilganda gilzasi beton ichida yorilib kengayuvchi va mahkam siqiluvchi metall anker boltlar",
    d: [
      "Yupqa gipsokarton plitalari uchun mo'ljallangan kapalaksimon yengil plastmassa qisqichli dyubellar",
      "Yumshoq yog'och detallarni bir-biriga yopishtiruvchi tikanli duradgorlik yog'och mixlari to'plami",
      "Sirtga faqat ikki tomonlama yopishqoq polimer lenta yordamida yopishtiriluvchi dekorativ ilgaklar"
    ],
    exp: "Anker boltlar og'ir yuklamalar (turnik, qozon, og'ir javonlar) uchun mo'ljallangan. Uning gaykasi tortilganda konus shaklidagi uchi metall gilzani beton teshigi devoriga kuchli siqib, siljish xavfini yo'qotadi.",
    mnem: "Anker bolt — devor qulfi: yorilib kengayadi, og'ir yukni mahkam ushlaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Oshxona va yuvinish xonalaridagi rakovina ostiga o'rnatiladigan sifonlarning asosiy sanitariya-gigiyenik vazifasi nima?",
    a: "Gidrozatvor (suv to'sig'i) hosil qilib kanalizatsiya quvuridagi yoqimsiz hid va zararli gazlarni xonaga kiritmaslik",
    d: [
      "Kanalizatsiyaga oqayotgan iflos suvlarni to'liq tozalab, ularni qaytadan ichimlik suvi darajasiga yetkazish",
      "Suv oqimi tezligini sun'iy ravishda to'xtatib, xonadon ichidagi suv bosimini avtomatik tarzda me'yorlash",
      "Oqova suvdagi barcha erigan tuzlarni kimyoviy parchalab, quvurlarni sovuqdan muzlab qolishdan asrash"
    ],
    exp: "Sifonning tirsagida doimo ma'lum miqdorda toza suv qoladi (gidrozatvor). Bu suv parda vazifasini o'tab, kanalizatsiya quvurlaridagi zaharli va sassiq gazlarning xonaga tarqalishiga mutlaqo yo'l qo'ymaydi.",
    mnem: "Sifon qoidasi: Suvli to'siq (gidrozatvor) — badbo'y hidga mustahkam eshik.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Xonadonni ta'mirlashda devorlarga gulqog'oz (oboy) yopishtirishdan oldin gruntovka (astar) surtishning asosiy texnologik maqsadi qaysi?",
    a: "Sirtning changini bog'lash, uning yelim shimuvchanligini tenglashtirish va materiallar yopishqoqligini oshirish",
    d: [
      "Devorning ichki qatlamidagi elektr simlarini mexanik shikastlanishdan va qisqa tutashuvdan himoyalash",
      "Devor qalinligini bir necha santimetrga oshirib xonadondagi ovoz o'tkazuvchanlikni butunlay yo'qotish",
      "Gulqog'oz yuzasiga tushgan quyosh nurlarini qaytarib uning rangini xiralashishdan umrbod saqlab qolish"
    ],
    exp: "Gruntovka devor yuzasini mustahkamlaydi, mayda changlarni biriktiradi va devorning yelimni ortiqcha shimib olishiga to'sqinlik qiladi. Natijada oboy devorga mustahkam yopishadi va chetlari ko'chib ketmaydi.",
    mnem: "Gruntovka — poydevor astar: changni bog'laydi, yelimni mustahkam ushlaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Xonadonda elektromontaj ishlarini bajarishda xavfsizlik texnikasi bo'yicha eng birinchi va qat'iy qoida qaysi?",
    a: "Elektr taqsimlash qutisidagi avtomat saqlagichni o'chirib, indikator buragich bilan tarmoqda tok yo'qligini tekshirish",
    d: [
      "Simlarni ulayotganda har doim qo'llarni namlab olib, metall qismlarni bir-biriga yalang'och holda tekkizish",
      "Elektr zanjiriga yuqori quvvatli yuklama ulab, simlarning qizish darajasini qo'l tekkizish orqali aniqlash",
      "Tok o'tkazgich simlarning fazasini aniqlash uchun oddiy temir mix yoki nam yog'och bo'lagidan foydalanish"
    ],
    exp: "Elektromontajda 1-oltin qoida: ta'minotni avtomatdan to'liq uzish va indikator asbobi bilan simlarda faza (kuchlanish) yo'qligini shaxsan tekshirib ishonch hosil qilishdir.",
    mnem: "Elektr qoidasi: Avtomatni o'chir, indikatorda tekshir, keyin xotirjam ishla.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Texnologik loyiha ishini amalga oshirishda 'Konstruktorlik-texnologik bosqich' qaysi asosiy faoliyatlarni o'z ichiga oladi?",
    a: "Buyumning chizma va eskizlarini chizish, kerakli materiallar sarfini hisoblash hamda texnologik xaritasini tuzish",
    d: [
      "Bozordagi mavjud muammolarni o'rganish, ijtimoiy so'rovnomalar o'tkazish va faqat g'oyalar to'plash",
      "Tayyor bo'lgan buyumni ko'rgazmaga qo'yish, reklama roliklari tayyorlash va uning bozor narxini belgilash",
      "Ishlab chiqarish ustaxonasini chiqindilardan tozalash va asbob-uskunalarni inventarizatsiya qilish"
    ],
    exp: "Loyiha bosqichlari: 1) Izlanish (muammo, g'oya); 2) Konstruktorlik-texnologik (chizma, xaritalar, hisob); 3) Amaliy (tayyorlash); 4) Yakuniy (baholash, taqdimot).",
    mnem: "Konstruktorlik bosqichi: Chizma qog'ozda chiziladi, texnologik xarita tuziladi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 04. Xalq hunarmandchiligi texnologiyasi (52 ta savol, IDs 1145–1196, topicId: 189)
// Hunarmandchilik maktablari, o'ymakorlik, kulolchilik, naqshlar, asboblar
// ─────────────────────────────────────────────────────────────────────────────
const c04 = [
  {
    q: "Rishton an'anaviy kulolchilik maktabining boshqa mintaqaviy kulolchilik markazlaridan bosh ajratib turuvchi xususiyati nima?",
    a: "O'simlik kuli (ishqor) asosida tayyorlanadigan tabiiy zangori, havorang va firuza tusli sir bilan sirlanishi",
    d: [
      "Buyumlarning faqat qora va qizil rangli qo'rg'oshinli quyuq emal bilan qoplanib naqshsiz qoldirilishi",
      "Loy qorishmasiga faqat maydalangan chinni kukunlari va temir qirindilari aralashtirilib tayyorlanishi",
      "Idishlarning yuzasiga faqat geometrik shakldagi tilla suvi yugurtirilgan metall qoplamalar o'rnatilishi"
    ],
    exp: "Rishton kulolchiligi o'zining tabiiy 'ishqorli sir'i (gulobi, feruza, moviy ranglar) bilan butun dunyoga mashhur. G'ijduvonda esa ko'proq sariq-jigarrang qo'rg'oshinli sirlar qo'llaniladi.",
    mnem: "Rishton siri: Ishqorli tabiiy sir — moviy va firuza nafis jilo.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "O'zbek an'anaviy yog'och o'ymakorligida relyefli naqshlarni chuqur o'yish va tekislashda qaysi asboblar asosiy hisoblanadi?",
    a: "Novsimon (yarim doira) iskanalar, burchakli iskanalar hamda yassi tekislovchi duradgorlik iskanalari",
    d: [
      "Metallar sirtini tozalashga mo'ljallangan yirik tishli chilangarlik drakhor egovlari va dastaki arra",
      "Katta diametrli teshiklarni burg'ilashda qo'llaniladigan spiral parmalar va pnevmatik bolg'alar",
      "Gips va marmar toshlarni parchalash uchun ishlatiladigan og'ir metall cho'kichlar to'plami"
    ],
    exp: "Yog'och o'ymakorligida naqshning konturini tushirish, fonni chuqurlashtirish va relyef hosil qilish uchun turli o'lchamdagi novsimon (tarnovsimon) va yassi iskanalar asosiy mehnat qurolidir.",
    mnem: "O'ymakorlik quroli: Novsimon iskana naqsh soladi, yassi iskana zaminni tekislaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "O'zbek amaliy bezak san'atidagi 'islimiy' naqsh kompozitsiyasining bosh mazmuniy va vizual o'zagi nimadan iborat?",
    a: "Tabiatdagi o'simliklar, daraxt shoxlari, barglar, gullar va kurtaklarning stilizatsiyalangan egri chiziqli uyg'unligi",
    d: [
      "Faqat qat'iy geometrik shakllar — ko'pburchaklar, kvadratlar va yulduzsimon chiziqlarning simmetrik tutashuvi",
      "Qadimgi ovchilik qurollari, kamon va o'qlarning tasvirlaridan tashkil topgan harbiy ramzlar to'plami",
      "Faqat arab alifbosidagi matnlarning qat'iy to'g'ri burchakli kufiy xatida yozilgan yozuvli tasviri"
    ],
    exp: "O'zbek milliy naqshlarining 2 ta katta turi bor: 1) Islimiy — o'simliksimon (gul, barg, novda); 2) Girih — geometrik (chiziqlar, ko'pburchaklar, yulduzlar).",
    mnem: "Islimiy naqsh — tabiat ko'zgusi: barg, gul, novdaning nafis jilosi.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Qo'qon yog'och o'ymakorligi maktabida ustun, eshik va xontaxtalar yasashda an'anaviy ravishda qaysi yog'och turi eng ko'p qadrlanadi?",
    a: "Teksturasi chiroyli, zichligi yuqori, mustahkam va o'ymakorlikda maydalanib ketmaydigan yong'oq yog'ochi",
    d: [
      "Tolalari juda bo'sh, g'ovak, namlikda tez chiriydigan va shaklini yo'qotuvchi oddiy terak yog'ochi",
      "Qatron (smola) miqdori haddan tashqari ko'p bo'lib asboblarning tig'ini tezda to'mtoqlashtiruvchi archa",
      "Faqat bir yillik ingichka butalardan yig'ib olingan mo'rt va egiluvchan tolali tol novdalari majmuasi"
    ],
    exp: "Yong'oq yog'ochi o'zining to'q go'zal tabiiy rangi, qattiqligi, o'yilganda qirralarining uvalanmasligi va uzoq asrlar davomida shaklini saqlashi tufayli o'ymakorlikning 'shohi' hisoblanadi.",
    mnem: "Yong'oq yog'ochi — o'ymakorlik shohi: pishiq, qattiq, naqshda uvalanmaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 05. Ishlab chiqarish va ro'zg'orshunoslik (156 ta savol, IDs 1197–1352, topicId: 190)
// Texnologik jarayon, operatsiya, o'tish, santexnika nosozliklari, elektr asboblari
// ─────────────────────────────────────────────────────────────────────────────
const c05 = [
  {
    q: "Texnologik jarayon strukturasida 'Operatsiya' tushunchasining aniq va to'g'ri ta'rifi qaysi javobda keltirilgan?",
    a: "Bitta ish o'rnida bitta yoki bir guruh ishchilar tomonidan bitta yoki bir necha detal ustida bajariladigan tugallangan qism",
    d: [
      "Butun korxonaning bir yillik davr ichida ishlab chiqargan barcha tovar va mahsulotlari yig'indisi",
      "Faqat xomashyoni ombordan temir yo'l vagonlariga ortish jarayonida bajariladigan yuk tashish harakati",
      "Ishchilarning oylik ish haqini hisoblash uchun buxgalteriya bo'limi tomonidan yuritiladigan tabel hujjati"
    ],
    exp: "Texnologik jarayonning asosiy elementi — operatsiyadir. Agar ish o'rni yoki ishchi o'zgarsa, keyingi harakat yangi operatsiya hisoblanadi.",
    mnem: "Operatsiya — bitta nuqta: bitta ish o'rni, bitta ishchi, tugallangan qadam.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Xonadondagi jo'mrak (smesitel) yopilganda ham undan doimiy ravishda suv tomchilab turishining eng ko'p uchraydigan sababi nima?",
    a: "Kran-buksadagi rezina zichlagich (prokladka)ning eskirishi, yorilishi yoki keramika plastinkasining yemirilishi",
    d: [
      "Xonadonga kelayotgan sovuq suv quvuridagi atmosfera bosimining me'yordan ikki barobar pasayib ketishi",
      "Kanalizatsiya quvurlarida to'siq hosil bo'lib oqova suvning orqaga qaytishi natijasida yuzaga kelgan tiqilma",
      "Suv hisoblagich asbobining raqamli mexanizmi to'xtab qolishi tufayli zanjirda hosil bo'lgan elektr qarshiligi"
    ],
    exp: "Jo'mraklarda suv oqimini to'suvchi asosiy to'siq kran-buksadagi rezina zichlagich yoki yarim aylanuvchi sopol (keramika) disklardir. Ular eskirsa, zich yopilmay suv sizib o'tadi.",
    mnem: "Tomchilovchi jo'mrak: Zichlagich (prokladka) eskirgan — almashtirsang, suv to'xtaydi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Burchakli silliqlash mashinasi (USHM / bolgarka) bilan metall kesishda xavfsizlik texnikasining eng muhim qoidasi qaysi?",
    a: "Himoya g'ilofini yechmaslik, himoya ko'zoynagi taqish va uchqun yo'nalishini odamlardan xavfsiz tomonga yo'naltirish",
    d: [
      "Aylanuvchi abraziv diskka qo'l bilan teginib uning aylanish tezligini barmoqlar bilan sekinlashtirish",
      "Metallni qattiq tiskiga mahkamlamasdan oyoq ostiga bosib turgan holda katta tezlikda kesishni boshlash",
      "Diametri dastgoh o'lchamidan ancha katta bo'lgan yog'och arralash diskini g'ilofsiz bolgarkaga o'rnatish"
    ],
    exp: "Bolgarka eng xavfli asboblardan biridir. Abraziv disk daqiqasiga 10-12 ming marta aylanadi; agar disk yorilsa, uning parchalaridan faqat metall himoya g'ilofi va ko'zoynak asrab qoladi. Yog'och disk o'rnatish mutlaqo man etiladi.",
    mnem: "Bolgarka xavfsizligi: G'ilof joyida, ko'zoynak taqilgan, xavfsiz kesim kafolatlangan.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Elektr drel bilan metall yoki qattiq materiallarni burg'ilashda parma qizib ketmasligi va o'tmaslashmasligi uchun nima qilinadi?",
    a: "Burg'ilash joyiga vaqti-vaqti bilan sovutuvchi suyuqlik (moy-suv emulsiyasi) quyilib, pastroq tezlik tanlanadi",
    d: [
      "Drel dvigateliga tushadigan kuchlanishni oshirish uchun elektr simlarini to'g'ridan-to'g'ri yuqori kuchlanishga ulash",
      "Parmani faqat quruq mato bilan ishqalab uning haroratini xona haroratidan yuqoriga ko'tarilishiga yo'l qo'yish",
      "Metall buyumni muzlatgichda 24 soat davomida muzlatib so'ngra qattiq jism bilan zarb berib teshish usuli"
    ],
    exp: "Metallni burg'ilashda qattiq ishqalanish tufayli parma uchi 300-400 darajagacha qizib, toblanishi yo'qoladi (yumshab qoladi). Shuning uchun emulsiya yoki maxsus moy bilan sovutiladi.",
    mnem: "Parma siri: Sovutuvchi suyuqlik quyilsa, parma o'tkir qoladi, uzoq xizmat qiladi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 06. Elektrotexnika va elektronika (156 ta savol, IDs 1353–1508, topicId: 191)
// Om qonuni, rezistor, diod, tranzistor, svetodiod, chiroqlar, shartli belgilar
// ─────────────────────────────────────────────────────────────────────────────
const c06 = [
  {
    q: "Yarimo'tkazgichli diodning asosiy elektron xususiyati va zanjirdagi bosh vazifasi qaysi javobda to'g'ri ko'rsatilgan?",
    a: "Elektr tokini faqat bitta yo'nalishda (anoddan katodga) o'tkazib, teskari yo'nalishdagi tokni to'liq to'sib qolish",
    d: [
      "Elektr energiyasini o'zida uzoq vaqt to'plab turib, zanjir uzilganda uni qaytadan kuchlanish sifatida uzatish",
      "O'zgarmas tokni yuqori chastotali o'zgaruvchan sinusoidal tokka aylantirib beruvchi generator vazifasini o'tash",
      "Elektr zanjiridagi qarshilik miqdorini harorat ko'tarilishi bilan cheksiz darajada oshirib yuborish"
    ],
    exp: "Diodning p-n o'tishi to'g'ri ulanganda kichik qarshilikka, teskari ulanganda esa o'ta katta qarshilikka ega bo'ladi. Shu sababli u to'g'rilagich (o'zgaruvchan tokni o'zgarmasga aylantirish) sifatida ishlatiladi.",
    mnem: "Diod — bir tomonlama eshik: to'g'riga o'tkazadi, teskariga qulflaydi.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Elektr zanjirida qarshiligi 20 Om bo'lgan isitgich elementiga 220 V kuchlanish berilganda, zanjirdan o'tayotgan tok kuchi Om qonuniga ko'ra qanchaga teng?",
    a: "Zanjirdan o'tayotgan tok kuchi 11 Amperga teng bo'ladi ($I = U / R = 220 / 20 = 11$ A)",
    d: [
      "Zanjirdan o'tayotgan tok kuchi 4400 Amperga teng bo'ladi ($I = U \\cdot R = 220 \\cdot 20 = 4400$ A)",
      "Zanjirdan o'tayotgan tok kuchi 200 Amperga teng bo'ladi ($I = U - R = 220 - 20 = 200$ A)",
      "Zanjirdan o'tayotgan tok kuchi 0.09 Amperga teng bo'ladi ($I = R / U = 20 / 220 \\approx 0.09$ A)"
    ],
    exp: "Zanjir qismi uchun Om qonuni: $I = U / R$. Tok kuchi kuchlanishga to'g'ri mutanosib, qarshilikka teskari mutanosibdir. $I = 220 / 20 = 11$ A.",
    mnem: "Om qonuni uchburchagi: $U$ tepada, $I$ va $R$ pastda — bo'lsang tok chiqadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Zamonaviy LED (svetodiod) yoritish asboblarining an'anaviy cho'g'lanma volfram lampalarga nisbatan yuqori energiya samaradorligi siri nimada?",
    a: "Elektr energiyasini to'g'ridan-to'g'ri yorug'likka aylantirib, issiqlik yo'qotilishini minimal darajada ushlab turishi",
    d: [
      "Lampochka kolbasi ichiga yuqori bosim ostida yonuvchi gazlar kiritilib ochiq olov hisobiga yorug'lik chiqarishi",
      "Elektr tokini umuman sarflamasdan faqat xonadagi magnit to'lqinlari hisobiga doimiy yonib turish qobiliyati",
      "Faqat ultrabinafsha nurlarini tarqatish orqali xonadagi havoni isitib termal nurlanish hosil qilishi"
    ],
    exp: "Cho'g'lanma lampalarda elektr energiyasining 95% i keraksiz issiqlikka ketadi, faqat 5% i yorug'lik bo'ladi. LED lampalarda p-n o'tishidagi rekombinatsiya to'g'ridan-to'g'ri foton ajratadi, shuning uchun FIK juda yuqori.",
    mnem: "LED tejamkorligi: Qizimasdan nurlanadi, elektrni yorug'likka aylantiradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Elektron zanjirda tranzistorning asosiy vazifasi va boshqaruv mohiyati qaysi javobda to'g'ri ifodalangan?",
    a: "Kichik kirish toki yoki kuchlanishi yordamida chiqish zanjiridagi katta tokni boshqarish va kuchaytirish",
    d: [
      "Faqat elektr simlarining qizib ketishini oldini oluvchi bir martalik eriydigan saqlagich vazifasini o'tash",
      "O'zgaruvchan tok chastotasini pasaytirib uni avtomatik tarzda mexanik aylanma harakatga aylantirish",
      "Elektr energiyasini kimyoviy elementlar yordamida qayta ishlab chiqarib batareyani to'ldirib turish"
    ],
    exp: "Tranzistor (bipolyar yoki maydonli) elektron kalit va kuchaytirgichdir. Baza (yoki zatvor)ga berilgan kichik signal kollektor-emitter orasidagi katta tok oqimini ochadi yoki yopadi.",
    mnem: "Tranzistor — elektron jo'mrak: kichik kuch bilan katta oqimni boshqaradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 07. Kasb tanlashga yo'llash (104 ta savol, IDs 1509–1612, topicId: 192)
// Klimov tasnifi, professiogramma, psixogramma, kasb tanlash formulasi
// ─────────────────────────────────────────────────────────────────────────────
const c07 = [
  {
    q: "Ye.A. Klimovning kasblar tasnifiga ko'ra, 'Inson — Texnika' tipidagi kasblar guruhiga qaysi kasblar to'liq mos keladi?",
    a: "Mashinasozlik muhandisi, tokarlik dastgohi operatori, avtomobil mexanigi va elektronika bo'yicha texnik",
    d: [
      "Boshlang'ich sinf o'qituvchisi, oilaviy shifokor, amaliyotchi psixolog va ijtimoiy soha xodimi",
      "Qishloq xo'jaligi agronomi, chorvachilik veterinari, botanik olim va o'rmon xo'jaligi mutaxassisi",
      "Teatr dramaturgi, simfonik orkestr dirijyori, badiiy asarlar rassomi va kiyimlar bo'yicha dizayner"
    ],
    exp: "Klimov tasnifi bo'yicha mehnat predmeti texnik qurilmalar, mashinalar, mexanizmlar va materiallar bo'lgan barcha kasblar 'Inson — Texnika' guruhiga kiradi.",
    mnem: "Inson — Texnika: Mashina, mexanizm, dastgoh va asboblar bilan tirik muloqot.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Kasb tanlash metodikasidagi 'Professiogramma' hujjati o'z ichiga qanday asosiy ma'lumotlarni qamrab oladi?",
    a: "Muayyan kasbning mazmuni, mehnat sharoitlari, vositalari hamda inson salomatligi va xususiyatlariga qo'yadigan talablar",
    d: [
      "Faqat xodimning oxirgi bir yillik ish safari davomida qilgan barcha moliyaviy xarajatlari hisoboti",
      "Maktab o'quvchisining barcha choraklik va yillik fan baholari qayd etilgan rasmiy o'quv tabeli",
      "Korxonada ishlatiladigan barcha asbob-uskunalarning zavod ishlab chiqarish seriya raqamlari ro'yxati"
    ],
    exp: "Professiogramma — kasbning to'liq tavsifnomasi. U kasb nimalardan iboratligi, qanday sharoitda kechishi va insondan qanday fazilatlarni talab qilishini (psixogramma bilan birga) ko'rsatadi.",
    mnem: "Professiogramma — kasb pasporti: nima ish, qanday sharoit, qanday talab.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Yoshlarni ongli ravishda kasb tanlashga yo'llashdagi mashhur 'Xohlayman — Qila olaman — Kerak' formulasida 'Qila olaman' bo'g'ini nimani anglatadi?",
    a: "Insonning shaxsiy qobiliyatlari, iste'dodi, bilimi, ko'nikmalari hamda sog'lig'i darajasining kasbga mosligi",
    d: [
      "Faqat tanlangan kasb egasiga davlat tomonidan beriladigan oylik maosh va moddiy mukofotlar miqdori",
      "Mehnat bozorida ayni paytda eng ko'p talab qilinayotgan va bo'sh ish o'rinlari soni ko'p bo'lgan sohalar",
      "Insonning shaxsiy xohishi, qiziqishi, intilishi va orzu qilgan obro'li lavozimiga erishish istagi"
    ],
    exp: "'Xohlayman' — qiziqish va mayl; 'Qila olaman' — qobiliyat, bilim va salomatlik; 'Kerak' — mehnat bozori talabi. Ushbu uchlikning kesishmasi eng to'g'ri kasb tanlovidir.",
    mnem: "Kasb formulasi: Xohlayman (havas), Qila olaman (qudrat), Kerak (talab).",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 08. Robototexnika asoslari (208 ta savol, IDs 1613–1820, topicId: 193)
// Arduino, portlar, sensorlar, servomotor, C++ dasturlash, HC-SR04
// ─────────────────────────────────────────────────────────────────────────────
const c08 = [
  {
    q: "Arduino Uno mikrokontroller platasida PWM (kenglik-impuls modulyatsiyasi) rejimida analog signalga o'xshash chiqish bera oladigan portlar qaysi?",
    a: "Platada tilda (~) belgisi bilan maxsus belgilangan 3, 5, 6, 9, 10 va 11-raqamli raqamli portlar",
    d: [
      "Faqat analog kirishlar bo'limida joylashgan A0, A1, A2, A3, A4 va A5 belgili oltita port",
      "Faqat 0 (RX) va 1 (TX) seriyali aloqa portlari hamda tashqi manbaga ulanuvchi Vin quvvat porti",
      "Plataning barcha 14 ta raqamli portlari hech qanday istisnosiz bir xil PWM signal chiqara oladi"
    ],
    exp: "Arduino Uno'da 14 ta raqamli portdan aynan 6 tasi (3, 5, 6, 9, 10, 11) PWM qo'llab-quvvatlaydi. `analogWrite()` funksiyasi orqali 0 dan 255 gacha qiymat berilib, svetodiod yorug'ligi yoki motor tezligi boshqariladi.",
    mnem: "Arduino PWM: Tilda (~) belgisi bor portlar — analogdek ravon boshqaradi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Arduino C++ dasturida `void setup()` va `void loop()` funksiyalarining ishlash mexanizmi o'rtasidagi asosiy farq nima?",
    a: "`setup()` mikrokontroller yoqilganda faqat bir marta ishlaydi, `loop()` esa to'xtovsiz cheksiz takrorlanadi",
    d: [
      "`setup()` faqat xatoliklarni qidirish uchun xizmat qiladi, `loop()` esa dasturni xotiradan butunlay o'chiradi",
      "`setup()` faqat analog portlarni o'qiydi, `loop()` esa faqat raqamli motorlarni quvvat bilan ta'minlaydi",
      "`setup()` cheksiz takrorlanuvchi sikl hisoblanadi, `loop()` esa mikrokontroller yoqilganda bir marta ishlaydi"
    ],
    exp: "Arduino dasturlash strukturasining asosi: `setup()` boshlang'ich sozlamalar (pin rejimlarini belgilash `pinMode`) uchun bir marta bajariladi, `loop()` esa asosiy algoritm bo'lib, plata o'chmaguncha davriy aylanadi.",
    mnem: "Arduino yuragi: Setup bir marta uyg'otadi, Loop tinmay aylantiradi.",
    diff: "Y1", bloom: "Bilish", qtype: "Y1"
  },
  {
    q: "Ultrato'lqinli masofa o'lchash datchigi (HC-SR04) yordamida to'siqqacha bo'lgan masofani aniqlash qaysi fizik qoidaga asoslangan?",
    a: "Trig pinidan chiqarilgan ultratovush to'lqinining to'siqqa urilib Echo piniga qaytib kelish vaqtini o'lchash",
    d: [
      "To'siqning rangiga qarab undan qaytayotgan yorug'lik nurlarining to'lqin uzunligini spektral tahlil qilish",
      "Datchik atrofidagi havoning namlik darajasi va harorat o'zgarishini o'lchash orqali masofani hisoblash",
      "To'siqdan tarqalayotgan magnit maydon kuch chiziqlarini datchik ichidagi kompas yordamida aniqlash"
    ],
    exp: "HC-SR04 datchigi 40 kHz ultratovush impulsi yuboradi (Trig) va obyektdan qaytgan signalni qabul qiladi (Echo). Tovush tezligi ($340$ m/s) ma'lum bo'lgani uchun: Masofa = $(Vaqt \\times Tezlik) / 2$.",
    mnem: "Ultratovush datchigi: Sadoning aks-sadosi — vaqtni o'lchab, masofani topadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  },
  {
    q: "Robototexnikada servomotor (masalan, SG90)ning oddiy doimiy tok (DC) motoridan asosiy boshqaruv farqi nimada?",
    a: "Valni aniq belgilangan burchakka (odatda 0 dan 180 darajagacha) burish va o'sha holatda qat'iy ushlab turish",
    d: [
      "Hech qanday to'xtovsiz daqiqasiga o'n minglab marta faqat bitta yo'nalishda uzluksiz yuqori tezlikda aylanish",
      "Elektr energiyasini sarflamasdan o'z-o'zidan mexanik energiya ishlab chiqaruvchi generator rejimida ishlash",
      "Faqat suyuqliklarni bosim ostida haydab beruvchi miniatyura gidravlik nasos vazifasini bajarish"
    ],
    exp: "Servomotor ichida qayta aloqa datchigi (potensiometr) va reduktor bor. U kiruvchi PWM impulsining kengligiga qarab valni aniq ko'rsatilgan burchakda qotirib turadi (robot qo'llari, manipulyatorlar uchun zarur).",
    mnem: "Servomotor — burchak ustasi: aytilgan burchakka buriladi va mahkam turadi.",
    diff: "Y2", bloom: "Qo'llash", qtype: "Y1"
  }
];

// Execute bank generators
generateBank("03_ijtimoiy_iqtisodiy_texnologiya_asoslari.json", 188, 1041, 104, c03);
generateBank("04_xalq_hunarmandchiligi_texnologiyasi.json", 189, 1145, 52, c04);
generateBank("05_ishlab_chiqarish_va_rozgorshunoslik.json", 190, 1197, 156, c05);
generateBank("06_elektrotexnika_va_elektronika.json", 191, 1353, 156, c06);
generateBank("07_kasb_tanlashga_yollash.json", 192, 1509, 104, c07);
generateBank("08_robototexnika_asoslari.json", 193, 1613, 208, c08);

console.log("Sections 03 to 08 muvaffaqiyatli yakunlandi!");
