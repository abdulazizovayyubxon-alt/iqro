import fs from 'node:fs';
import path from 'node:path';
import { createQuestionBankServis, balanceOptions } from './generator_core_servis.mjs';

const templates = [
  // 1. To'qimachilik tolalari: Paxta va zig'ir
  (qId, idx, target) => {
        const plantFibers = [
      "paxta (g'o'za) tolasining",
      "zig'ir (flaks) poyasi tolasining",
      "tabiiy o'simlik tolalari guruhining",
      "paxta va zig'ir xomashyosining"
    ];
    const pf = plantFibers[idx % plantFibers.length];
    const q = `To'qimachilik materialshunosligida ${pf} kimyoviy tarkibining asosiy qismini (95–98% gacha) qaysi tabiiy yuqori molekulyar polimer modda tashkil etadi? (#${qId})`;
    const correct = "Sellyuloza (kletchatka) polimeri bo'lib, uning yuqori gigroskopikligi va 180–200°C issiqlikka yaxshi chidamliligini ta'minlaydi";
    const distractors = [
      "Keratin oqsili bo'lib, u faqat hayvonlarning jun qoplamida uchraydi va olov ta'sirida kuygan pat hidini chiqaradi",
      "Fibroin va seritsin oqsillari bo'lib, ular faqat ipak qurti pallasidan ajratib olinadigan tabiiy ipak moddasidir",
      "Sintetik neft mahsuloti bo'lgan poliamid birikmasi bo'lib, u hech qanday namlik shimmaslik xossasiga ega moddadir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Ismatullayeva X.Z. ('Maxsus materialshunoslik', 2007): O'simlik tolalari (paxta, zig'ir) 95-98% sellyulozadan iborat. Jun — keratin, ipak esa fibroin oqsilidir.",
      mnemonic: "Tolalar asosi: Paxta-zig'irda sellyuloza, junda keratin — har tolaning o'z o'rni va o'z xossasi bor muayyan.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 2. Jun va ipak tolalari
  (qId, idx, target) => {
        const animalFibers = [
      { name: "tabiiy jun tolasining", comp: "keratin oqsili bo'lib, yuqori elastiklik va past issiqlik o'tkazuvchanlikka ega" },
      { name: "tut ipak qurti pallasidan olinadigan tabiiy ipak tolasining", comp: "fibroin va seritsin oqsillari bo'lib, mayinlik va olijanob tovlanish beradi" },
      { name: "qo'y juni tolalari majmuining", comp: "keratin moddasi bo'lib, o'zida ko'p miqdorda havo saqlab tanani isitadi" },
      { name: "tabiiy ipak ipining", comp: "fibroin oqsili bo'lib, nihoyatda pishiqlik va yengil vazn bilan ajralib turadi" }
    ];
    const af = animalFibers[idx % animalFibers.length];
    const q = `Kelib chiqishi hayvonot olamiga mansub bo'lgan ${af.name} kimyoviy asosi va uning gazlamaga beradigan bosh xossasi nima? (#${qId})`;
    const correct = `Uning kimyoviy asosi ${af.comp} hisoblanadi`;
    const distractors = [
      "Uning kimyoviy asosi sof noorganik asbest minerali bo'lib, u hech qachon cho'zilmaydigan qattiq tosh tolasi hisoblanadi",
      "Uning kimyoviy asosi o'simlik kletchatkasi bo'lib, u namlanganda o'zining mustahkamligini yuz barobar yo'qotadi",
      "Uning kimyoviy asosi sof kauchuk polimeri bo'lib, u faqat rezina mahsulotlari tayyorlash uchun xizmat qiladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Hayvon tolalari (jun, ipak) oqsildan iborat. Jun — keratin (issiq saqlaydi), ipak — fibroin va seritsin (mustahkam va mayin).",
      mnemonic: "Hayvon tolasi: Jun va ipak oqsil boyligi — mayinlik va issiqlikning sofligi.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 3. Kimyoviy tolalar: Sun'iy va sintetik
  (qId, idx, target) => {
        const q = `To'qimachilik sanoatida sun'iy tolalar (viskoza, atsetat) bilan sintetik tolalar (kapron, lavsan, nitron) o'rtasidagi asosiy xomashyo va texnologik farq qaysi javobda to'g'ri ifodalangan? (#${qId})`;
    const correct = "Sun'iy tolalar tabiiy polimer (yog'och sellyulozasi)ni kimyoviy qayta ishlashdan olinadi, sintetik tolalar esa neft va gaz mahsulotlarini sintezlash orqali olinadi";
    const distractors = [
      "Sun'iy tolalar to'g'ridan-to'g'ri qo'y junidan qirqib olinadi, sintetik tolalar esa faqat paxta chigitidan mexanik ajratib olinadigan tolalardir",
      "Sun'iy tolalar hech qachon kiyim uchun ishlatilmaydi, sintetik tolalar esa faqat oziq-ovqat mahsulotlarini o'rash qopchalarida qo'llaniladi",
      "Har ikkala tola ham bir xil tog' jinslarini yuqori haroratda eritib hosil qilinadigan mineral shisha tolalari hisoblanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Sun'iy tolalar — tabiiy polimer (sellyuloza)dan kimyoviy yo'l bilan (viskoza). Sintetik tolalar — neft va gazdan sintez qilingan (kapron, lavsan).",
      mnemonic: "Kimyoviy tolalar: Yog'ochdan viskoza sun'iy tola, neftdan kapron sintetik mo'jiza qola.",
      question_type: "Y1",
      bloom_level: "Tahlil"
    };
  },

  // 4. Gazlama o'rilishlari: Polotno, Sarja, Satin
  (qId, idx, target) => {
        const weaves = [
      { name: "Polotno o'rilishi (oddiy o'rilish)", desc: "o'rish va arqoq iplarining 1:1 nisbatda shaxmat tartibida navbatlashishi, har ikki tomonining bir xil tekis bo'lishi" },
      { name: "Sarja o'rilishi (diagonal to'qima)", desc: "gazlama yuzasida 45 gradus burchak ostida qiya reliesf chiziqlar (chandiqlar) hosil bo'lishi va yuqori egiluvchanligi" },
      { name: "Satin o'rilishi (atlas to'qimasi)", desc: "uzun iplarning yuzada erkin qalqib turishi natijasida yuzaning nihoyatda silliq, mayin va jozibador yaltiroq bo'lishi" }
    ];
    const w = weaves[idx % weaves.length];
    const q = `Gazlamalarning bosh to'qilish turlaridan biri hisoblangan ${w.name}ning o'ziga xos tuzilishi va tashqi ko'rinishi qaysi qatorda to'g'ri ko'rsatilgan? (#${qId})`;
    const correct = `Ushbu to'qimada ${w.desc} ta'minlanadi`;
    const distractors = [
      "Ushbu to'qimada faqat bitta ipdan zanjirli trikotaj ilgaklari hosil qilinadi va gazlama chetlari doimo dumaloq o'ralib qoladi",
      "Ushbu to'qimada iplar to'qilmasdan faqat yelim yordamida bir-biriga yopishtiriladi va qalin qattiq karton hosil qilinadi",
      "Ushbu to'qimada gazlamaning eni va bo'yi bo'ylab barcha iplar bo'shatib yuboriladi va to'r parda holatiga keltiriladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Polotno — 1:1 o'rilish (sitets, zig'ir). Sarja — diagonal chiziqli to'qima (kostyumbop, jinsi). Satin/atlas — silliq yaltiroq o'rilish.",
      mnemonic: "O'rilishlar: Polotno — tekis shaxmat, sarja — diagonal qat, satin — yaltiroq hilqat.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 5. Gazlama o'rish va arqoq iplari
  (qId, idx, target) => {
        const q = `Tikuvchilikda gazlamaning o'rish (asosiy, bo'ylama) ipi yo'nalishini arqoq (ko'ndalang) ipidan aniq ajratib olishning qat'iy belgilari qaysi javobda to'g'ri ko'rsatilgan? (#${qId})`;
    const correct = "O'rish ipi doimo gazlama cheti (kromka) bo'ylab yo'nalgan bo'ladi, qattiq tortilgan, kam cho'ziluvchan va cho'zib tortilganda jarangdor tovush beradi";
    const distractors = [
      "O'rish ipi gazlama eni bo'ylab qisqa o'tadi, nihoyatda qalin va bo'sh buralgan bo'lib, tortilganda bir zumda cho'zilib ketadi",
      "O'rish ipi doimo spiral shaklida aylanma harakat qiladi va faqat gazlamaning teskari tomonidagina ko'zga tashlanadi",
      "Gazlamada o'rish va arqoq iplarining hech qanday farqi yo'q, ikkalasi ham bir xil qalinlikda va erkin holatda joylashadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "O'rish ipi — bo'ylama (kromka bo'ylab), tarang, pishiq, kam cho'ziladi. Arqoq ipi — ko'ndalang, bo'shroq, ko'proq cho'ziluvchan.",
      mnemonic: "O'rish ipi: Kromka bo'ylab o'rish o'tar, pishiq turib qomat tutar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 6. Bichishga tayyorlash va dekatirlash
  (qId, idx, target) => {
        const q = `Kiyim tikishdan oldin gazlamani bichish stoliga to'shashdan avval amalga oshiriladigan dekatirlash operatsiyasining asosiy texnologik maqsadi nima? (#${qId})`;
    const correct = "Gazlamani namlab va issiq dazmol bilan ishlov berish orqali kiyim tayyor bo'lgandan keyin yuvilganda kirishib (kichrayib) qolishining oldini olish";
    const distractors = [
      "Gazlamaning barcha to'qilgan iplarini eritib yuborish orqali matoni yupqa shaffof sellofan plyonkaga aylantirish amaliyoti",
      "Gazlamaning rangini butunlay o'chirib, uni oppoq holatga keltirish va keyinchalik boshqa kimyoviy bo'yoqlar bilan bo'yash jarayoni",
      "Faqat gazlamaning enini ikki barobar sun'iy ravishda kengaytirish va andazalarni kattaroq hajmda bichish uchun xizmat qiladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Dekatirlash — gazlamani bichishdan oldin namlab-isitib dazmollash. Bu matoni oldindan kirishtirib, tayyor kiyim shaklini buzilmasligini kafolatlaydi.",
      mnemonic: "Dekatirlash siri: Dazmol bilan namlab olgin — kiyim kirishib qolmasin keyin.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 7. Tikuv mashinasi igna mexanizmi va chok hosil bo'lishi
  (qId, idx, target) => {
        const q = `Mokili chok hosil qiluvchi universal tikuv mashinasida igna o'zining eng quyi holatidan 1.5–2.0 mm yuqoriga ko'tarilganda qanday muhim texnologik hodisa ro'y beradi? (#${qId})`;
    const correct = "Ustki ip bo'shashib igna ko'zi ustida halqa (petlya) hosil qiladi va aylanuvchi moki burni ushbu halqani ishonchli ilib oladi";
    const distractors = [
      "Mato surish tishlari orqaga qarab harakatlanadi va matoni butunlay igna tagidan yirtib tashqariga chiqarib yuboradi",
      "Mashina motorining aylanishi butunlay to'xtaydi va g'altakdagi barcha ip avtomatik ravishda tashqariga otilib chiqadi",
      "Igna sterjeni o'z o'qi atrofida to'liq 360 gradusga aylanib, matoning ustiga beshta tugma qadashni yakunlaydi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Truxanova A.T. (1996): Igna eng quyi o'lik nuqtadan 1.5-2 mm ko'tarilganda ip halqasi hosil bo'ladi, moki burni bu halqani ilib olib moki chokini hosil qiladi.",
      mnemonic: "Moki choki: Igna ko'tarilar ikki millimetr — moki ilib ketar ipni bir zumda ter.",
      question_type: "Y1",
      bloom_level: "Tahlil"
    };
  },

  // 8. Tikuv mashinasidagi nosozliklar
  (qId, idx, target) => {
        const faults = [
      { name: "ustki ipning tez-tez uzilishi", cause: "ustki ipning me'yordan ortiq tarangligi, ignaning noto'g'ri o'rnatilganligi yoki ip sifatining pastligi" },
      { name: "mashinaning chok tashlab ketishi (propusk stezhka)", cause: "ignaning egilganligi, o'tmaslashganligi yoki igna va moki burni orasidagi oraliqning me'yordan ortib ketishi" },
      { name: "matoning baxya yuritilganda g'ijimlanib yig'ilib qolishi", cause: "ustki va ostki iplar tarangligining haddan tashqari qattiqligi yoki tepki bosimining noto'g'ri sozlanishi" },
      { name: "mashina ignasining sinib ketishi", cause: "matoni qo'l bilan zo'riqib tortish, ignaning qalin matoga nisbatan nozikligi yoki tepkining bo'shab qolishi" }
    ];
    const f = faults[idx % faults.length];
    const q = `Tikuv mashinasida ishlash jarayonida yuzaga keladigan ${f.name} nosozligining asosiy texnik sababi nima hisoblanadi? (#${qId})`;
    const correct = `Ushbu nosozlikning bosh sababi ${f.cause} hisoblanadi`;
    const distractors = [
      "Ushbu nosozlikning bosh sababi faqat xonadagi elektr chirog'ining o'chib-yonishi va havoning namlik ko'rsatkichi ekanligi bilan izohlanadi",
      "Ushbu nosozlikning bosh sababi matoga faqat tabiiy ipak tolalari aralashtirilgani va uning sirg'anchiq silliq yuzaga egaligidir",
      "Ushbu nosozlikning bosh sababi tikuv mashinasi stolining yog'och qoplamasidan tayyorlanganligi va uning tebranishi deb hisoblanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Gaipova N. (2016): Ip uzilishi — taranglik; chok tashlash — igna nuqsoni yoki moki oralig'i; g'ijimlanish — ortiqcha tortish; igna sinishi — matoni tortish yoki nozik igna.",
      mnemonic: "Mashina sozlash: Ip uzilsa — taranglikni bo'shat, chok tashlasa — ignangni yangila va sozlat.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 9. Qo'l choklari terminologiyasi
  (qId, idx, target) => {
        const handTerms = [
      { name: "Ko'klash (smetyvanie)", desc: "ikki yoki undan ortiq kiyim detallarini keyinchalik mashinada tikish uchun vaqtincha biriktirish (baxya uzunligi 0.7–1.5 sm)" },
      { name: "Qavash (nametyvanie)", desc: "kichik detalni (cho'ntak, ko'krak qoplamasi) kattaroq asosiy detal ustiga qo'yib vaqtincha biriktirish" },
      { name: "Yo'rmash (obmetyvanie)", desc: "kiyim detallari qirqim chetlarining to'kilib ketishini oldini olish uchun maxsus qo'l yoki overlok choklari bilan qoplash" },
      { name: "Ko'chirib tikish (silki)", desc: "bichilgan juft detallarning biridagi bo'r chiziqlari va belgilarni ikkinchi detalga aniq simmetrik ko'chirish" }
    ];
    const ht = handTerms[idx % handTerms.length];
    const q = `Tikuvchilik texnologiyasida qo'lda bajariladigan '${ht.name}' operatsiyasining to'g'ri texnologik mazmuni qaysi javobda berilgan? (#${qId})`;
    const correct = `Bu jarayon ${ht.desc} operatsiyasidir`;
    const distractors = [
      "Bu jarayon kiyim detallarini qaynoq suvda ikki soat davomida qaynatib ularning o'lchamini kichraytirish va zichlashtirish jarayonidir",
      "Bu jarayon kiyimning yuzasiga qalin yog'li bo'yoqlar surtib rasmlar chizish va matoga yangicha rang berish san'ati hisoblanadi",
      "Bu jarayon faqat kiyim tugmalarini og'ir temir bolg'a bilan urib matoga qisib mahkamlash amaliyoti deb hisoblanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Tikuvchilik atamalari: Ko'klash — detallarni vaqtincha biriktirish; Qavash — ustma-ust qo'yib qadash; Yo'rmash — chetini to'kilishdan saqlash; Silki — belgilarni ko'chirish.",
      mnemonic: "Qo'l choklari: Ko'klash — vaqtincha bog'lar, yo'rmash — chetni saqlar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 10. Antropometrik o'lchov olish
  (qId, idx, target) => {
        const measures = [
      { code: "Sk (Ko'krak yarim aylanasi)", desc: "ko'krakning eng bo'rtib chiqqan nuqtalari va kurak suyagi orqali o'lchanib, kiyim o'lchami (razmer)ni belgilaydi" },
      { code: "Sb (Bel yarim aylanasi)", desc: "gavdaning eng ingichka bel chizig'i bo'ylab gorizontal o'lchanadi va yubka, shim kamarini hisoblashda asos bo'ladi" },
      { code: "Ss (Son yarim aylanasi)", desc: "dumba sohasining eng bo'rtib chiqqan nuqtalari orqali gorizontal o'lchanib, yubka va shim kengligini ta'minlaydi" },
      { code: "Dto (Orqa uzunligi bel chizig'igacha)", desc: "yettinchi bo'yin umurtqasidan boshlab orqa bo'ylab bel tasmasigacha bo'lgan masofani aniqlaydi" }
    ];
    const m = measures[idx % measures.length];
    const q = `Inson qomatidan o'lchov olishda '${m.code}' o'lchovining to'g'ri olinish qoidasi va konstruksiyalashdagi vazifasi nima? (#${qId})`;
    const correct = `Ushbu o'lchov ${m.desc} uchun xizmat qiladi`;
    const distractors = [
      "Ushbu o'lchov oyoq panjasining tovonidan barmog'igacha uzunligini aniqlash va poyabzal qolipini yasash uchun xizmat qiladi",
      "Ushbu o'lchov faqat qishki bosh kiyimining kengligini hisoblash va quloqchinlar o'rnini to'g'ri belgilashga yo'naltirilgan amaliyotdir",
      "Ushbu o'lchov qo'l barmoqlarining uzunligini o'lchab charm qo'lqop bichishda qo'llaniladigan yagona bosh mezon hisoblanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Tashpulatov S.Sh. (2013): Sk — kiyim razmerini belgilovchi asosiy o'lchov. Aylanma o'lchovlar simmetriya tufayli yarim hajmda yoziladi.",
      mnemonic: "O'lchov olish: Ko'krak aylanasi razmerni aytar, bel va son aylanasi kenglikni qaytar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 11. Issiqlik-namlik ishlovi (UTOP) terminlari
  (qId, idx, target) => {
        const utopTerms = [
      { name: "Razutyujivanie (Yoyib dazmollash)", desc: "detallarning birlashtirilgan chok haqlarini ikki tomonga ayirib, dazmol bilan tekislab ochish" },
      { name: "Zazutyujivanie (Yotqizib dazmollash)", desc: "ikkala chok haqini bir tomonga qaratib yotqizgan holda dazmollab qotirish" },
      { name: "Otyajka (Cho'zish)", desc: "detalning ayrim qirqim qismlarini dazmol va bug' yordamida cho'zib, kerakli egri chiziqli shaklga keltirish" },
      { name: "Sutyujka (Qisqartirish / cho'ktirish)", desc: "detalning to'lqinsimon bo'shashgan qirqim chetini issiqlik va namlik bilan qisqartirib, qomat shakliga moslash" }
    ];
    const ut = utopTerms[idx % utopTerms.length];
    const q = `Tikuvchilikda issiqlik-namlik bilan ishlov berish (dazmollash) tizimidagi '${ut.name}' atamasi qanday operatsiyani anglatadi? (#${qId})`;
    const correct = `Bu amal ${ut.desc} operatsiyasini bildiradi`;
    const distractors = [
      "Bu amal kiyimni to'liq maxsus sovutgichga joylab uning barcha choklarini muzlatish orqali qotirish jarayonini bildiradi",
      "Bu amal kiyim yuzasidagi ifloslangan dog'larni benzin va spirt eritmasi bilan tozalab ketkazish amaliyoti hisoblanadi",
      "Bu amal faqat kiyim detallarini katta qaychi bilan o'lchovsiz qirqib tashlash operatsiyasi sifatida ifodalanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "UTOP operatsiyalari: Razutyujivanie — ikki tomonga yoyish; Zazutyujivanie — bir tomonga yotqizish; Sutyujka — qisqartirish; Otyajka — cho'zish.",
      mnemonic: "UTOP qoidasi: Yoyilsa razutyujit, yotqizilsa zazutyujit — qomatga mos kiyim har ko'zga quvonch qujit.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 12. Dazmollash harorati
  (qId, idx, target) => {
        const ironTemps = [
      { fabric: "paxta va zig'ir gazlamalari", temp: "180–200°C", note: "mo'l namlash orqali to'g'ridan-to'g'ri issiq dazmol bilan" },
      { fabric: "tabiiy jun gazlamalari", temp: "140–160°C", note: "ho'llangan maxsus doka (proutyujilnik) orqali ehtiyotkorlik bilan" },
      { fabric: "tabiiy ipak matolari", temp: "120–140°C", note: "suv purkamasdan quruq holda yoki teskari tomonidan" },
      { fabric: "kapron va neylon sintetik matolari", temp: "100–120°C", note: "past haroratda erib ketishining qat'iy oldini olgan holda" }
    ];
    const it = ironTemps[idx % ironTemps.length];
    const q = `Tikuvchilikda ${it.fabric}ga issiqlik-namlik ishlovi berishda dazmol tagligining ruxsat etilgan optimal harorati va ishlov qoidasi qanday bo'ladi? (#${qId})`;
    const correct = `Harorat ${it.temp} oralig'ida bo'lib, ${it.note} dazmollash talab etiladi`;
    const distractors = [
      "Harorat 350–400°C oralig'ida bo'lib, mato qizarguncha to'g'ridan-to'g'ri ochiq olovda qizdirish talab etiladi",
      "Harorat mutlaqo 0°C dan oshmasligi kerak va faqat quruq sovuq temir parchasini bosib turish lozim",
      "Harorat barcha turdagi matolarda bir xil 250°C bo'lib, hech qanday xususiyatlar hisobga olinmaydi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Dazmol harorati: Paxta/zig'ir — 180-200°C; Jun — 140-160°C (doka bilan); Ipak — 120-140°C (suvsiz); Sintetika — 100-120°C.",
      mnemonic: "Dazmol me'yori: Paxta baland olovda yayrar, ipak va jun ehtiyotkorlik poylar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 13. Andaza tayyorlash va chok haqlari
  (qId, idx, target) => {
        const q = `Kiyim andazalari bo'yicha gazlamani bichish jarayonida kiyim detallarining yon choklari hamda etak qismini bukish uchun qoldiriladigan standart chok haqlari (pripusk) qancha bo'lishi kerak? (#${qId})`;
    const correct = "Yon choklar uchun 1.5–2.0 sm, buyum etagini bukish uchun esa 3.0–4.0 sm miqdorida texnologik chok haqi qoldiriladi";
    const distractors = [
      "Yon choklar uchun 10–15 sm, buyum etagi uchun esa yarim metr miqdorida ortiqcha mato qoldirish talab etiladi",
      "Chok haqi mutlaqo qoldirilmaydi, andaza chizig'ining ustidan qat'iy tekis qirqib olinadi deb hisoblanadi",
      "Faqat 1 millimetr chok haqi qoldiriladi va detallar bir-biriga yelimlanib yopishtiriladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Gaipova N. (2016): Bichishda yon choklarga 1.5-2 sm, yeng va bo'yin o'miziga 1 sm, pastki etakni bukishga 3-4 sm haqi qoldiriladi.",
      mnemonic: "Chok haqi: Yonga ikki santimetr, etakka to'rt — libos keng-mo'l tushar ko'ngil to'rt.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 14. Qotirma materiallar (Dublerin va flizelin)
  (qId, idx, target) => {
        const q = `Zamonaviy kiyim ishlab chiqarishda yoqa, manjet, cho'ntak qopqog'i va bortlarga qat'iy shakl va pishiqlik berish uchun qo'llaniladigan dublerin va flizelin qotirma materiallarining o'zaro farqi nima? (#${qId})`;
    const correct = "Dublerin to'qilgan gazlama asosiga ega bo'lib elastik va pishiqdir, flizelin esa to'qilmagan yelimli qog'ozsimon qoplama hisoblanadi";
    const distractors = [
      "Dublerin faqat shisha tolasidan tayyorlanadi, flizelin esa sof metall folgadan yasalgan og'ir qotirma hisoblanadi",
      "Dublerin kiyimning faqat astari uchun ishlatiladi, flizelin esa kiyimning tashqi ko'rinishida bezak sifatida qo'yiladi",
      "Har ikkala material ham faqat suvda eriydigan kraxmalli kukun bo'lib, mato ustiga cho'tka bilan surtiladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Dublerin — to'qilgan mato asosidagi yelimli qotirma (elastik, pishiq). Flizelin — to'qilmagan sintetik yelimli material.",
      mnemonic: "Qotirma turlari: Dublerin to'qima mato, flizelin to'qilmagan qatlam — shakl berar kiyimga har dam.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 15. Molniya taqilmalari
  (qId, idx, target) => {
        const zips = [
      { name: "yashirin (potaynaya) molniya", desc: "tishlari mato buklamasining ichki tomoniga yashiringan bo'lib, o'ng tomondan faqat ingichka chok ko'rinadi" },
      { name: "spiral (kapron) molniya", desc: "tishlari elastik sintetik spiral tasmadan iborat bo'lib, yengil ko'ylak va yubkalarda qulay harakatlanadi" },
      { name: "traktor molniya", desc: "alohida quyilgan yirik plastik tishlarga ega bo'lib, sport va qalin ustki kiyimlarda yuqori mustahkamlik beradi" }
    ];
    const z = zips[idx % zips.length];
    const q = `Tikuvchilik buyumlari dizayni va texnologiyasida '${z.name}' taqilmasining o'ziga xos tuzilishi va qo'llanish sohasi qaysi javobda to'g'ri ko'rsatilgan? (#${qId})`;
    const correct = `Ushbu taqilmada ${z.desc} ta'minlanadi`;
    const distractors = [
      "Ushbu taqilmada tishlar o'rniga faqat qalin magnit kukunlari sepilgan bo'lib, kiyimni faqat bir marta yopish imkonini beradi deb qaraladi",
      "Ushbu taqilma faqat poyabzal tagcharmini mixlab mahkamlash uchun ishlatiladi va kiyimlarga mutlaqo taqilmaydigan furnitura hisoblanadi",
      "Ushbu taqilma kiyimning ichiga o'rnatilmaydi, faqat belbog' bog'ichi sifatida qo'lda tugun qilib bog'lab qo'yiladigan mato hisoblanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Molniya turlari: Yashirin — ayollar ko'ylak va yubkalarida (tish ko'rinmaydi); Spiral — universal yengil kiyimlarda; Traktor — sport va kurtkalarda.",
      mnemonic: "Molniya tanlash: Ko'ylakka yashirin molniya, kurtkaga traktor zo'r — qulay va mustahkam taqilma bo'lar ko'r.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 16. Tikuv choklari: Yoyma va Bosma chok
  (qId, idx, target) => {
        const seams = [
      { name: "yoyma chok (shov vrazutyujku)", desc: "detallar mashinada tikilgach, chok haqlari ikki tomonga ayirib yoyilgan holda dazmollanadi" },
      { name: "bosma chok (shov vzazutyujku)", desc: "detallar tikilgach, ikkala chok haqi bir tomonga qaratib yotqizilib dazmollanadi va ustidan bezak choki yuritiladi" },
      { name: "qo'shaloq (fransuzcha / ichki) chok", desc: "avval detallar teskari tomonidan, so'ng o'nglab ichkariga olib tikilib, qirqim chetlari chok ichida to'liq berkitiladi" }
    ];
    const s = seams[idx % seams.length];
    const q = `Mashina choklarining asosiy guruhlaridan biri hisoblangan '${s.name}'ning to'g'ri bajarilish usuli qaysi javobda ko'rsatilgan? (#${qId})`;
    const correct = `Ushbu chokda ${s.desc}`;
    const distractors = [
      "Ushbu chokda detallar tikuv mashinasida tikilmaydi, faqat igna bilan bir marta teshilib ip o'tkazmasdan qoldiriladi",
      "Ushbu chokda gazlamaning barcha qirqim chetlari ochiq olovda kuydirilib bir-biriga eritib qattiq yopishtirilishi lozim",
      "Ushbu chok faqat kiyimning ichki cho'ntagi orasidagi paxta momig'ini ushlab turish uchun qo'lda vaqtincha qaviladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Mashina choklari: Yoyma chok — haqlari ikki tomonga; Bosma chok — haqlari bir tomonga; Qo'shaloq chok — qirqimlari ichkariga berkitilgan (ichki kiyim va yupqa matolar uchun).",
      mnemonic: "Chok bajarilishi: Yoyma chokda kenglik ochar, qo'shaloq chokda qirqim qochmas qabar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  }
];

export function generateSection02() {
  const count = 832;
  const startId = 521;
  const topicId = 197;
  const sectionName = '02_materiallarga_ishlov_berish_va_tikuvchilik.json';
  
  createQuestionBankServis(sectionName, topicId, startId, count, templates);
}

generateSection02();
