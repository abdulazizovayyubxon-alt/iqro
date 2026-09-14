import fs from 'node:fs';
import path from 'node:path';
import { createQuestionBankServis, balanceOptions } from './generator_core_servis.mjs';

const templates = [
  // 1. Kollagen va glyutin
  (qId, idx, target) => {
        const variants = [
      "mol go'shti yoki qo'y go'shtini",
      "parranda yoki mol go'shtini",
      "mol go'shtining to'sh qismini",
      "uy hayvonlari go'shtining son qismini"
    ];
    const v = variants[idx % variants.length];
    const q = `Pazandachilikda ${v} uzoq vaqt suvda qaynatib yoki dimlab pishirish jarayonida biriktiruvchi to'qima oqsili hisoblangan kollagen qanday asosiy fizik-kimyoviy o'zgarishga uchraydi? (#${qId})`;
    const correct = "Kollagen nam issiqlik ta'sirida eruvchan glyutinga aylanib, go'sht tolalari orasidagi bog'liqlikni bo'shashtiradi va go'shtning yumshashini ta'minlaydi";
    const distractors = [
      "Kollagen tolalari qizdirilganda yanada qattiqlashib, suv o'tkazmaydigan po'latdek mustahkam kristall panjaraga aylanadi va to'qimalarni qotiradi",
      "Kollagen bir lahzada havoga bug'lanib ketadi va go'sht tarkibida faqat sof yog' moddasi qoladi hamda oqsil miqdori butunlay nolga tenglashadi",
      "Kollagen faqat tuz ta'sirida erib ketadi, issiqlik harorati esa go'sht to'qimalarining qattiqligini o'zgartirmasdan asl holida saqlab qoladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Mo'minova M.N. ('Ovqat tayyorlash texnologiyasi', 2014): 60°C dan yuqori nam haroratda erimaydigan kollagen eruvchan modda — glyutinga aylanadi, bu go'shtni yumshatadi.",
      mnemonic: "Kollagen siri: Qaynasa kollagen aylanar glyutinga — yumshar go'sht tolalari har bir tishlamda.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 2. Blanchirlash
  (qId, idx, target) => {
        const vegList = ["sabzi va gulkaramni", "yashil no'xat va ismaloqni", "pomidor va bulg'or qalampirini", "olma va nok bo'laklarini"];
    const veg = vegList[idx % vegList.length];
    const q = `Konservalash va pazandachilik texnologiyasida ${veg} qaynoq suvda yoki bug'da 1–3 daqiqa davomida blanchirlash (chala pishirish)ning asosiy texnologik vazifasi nima? (#${qId})`;
    const correct = "Oziq-ovqat xomashyosidagi oksidlovchi fermentlar faolligini to'xtatish, tabiiy rangni saqlab qolish va mikroblar sonini keskin kamaytirish";
    const distractors = [
      "Mahsulot tarkibidagi barcha qand va vitaminlarni eritib chiqarib yuborish orqali uning kaloriyadorligini butunlay nol darajaga tushirish",
      "Mahsulotni to'liq qovurilgan holatga keltirish va uning yuzasida qalin qarsildoq qobiq hosil qilib yog' shimdirishni ta'minlash",
      "Sabzavotlarning po'stlog'ini qattiqlashtirish va ularni uzoq yillar davomida hech qanday haroratsiz xona sharoitida saqlanishini ta'minlash"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Blanchirlash — xomashyoni 1-3 daqiqa qaynoq suvda ushlab fermentlarni inaktivatsiya qilish (to'xtatish), rang va vitaminlarni saqlash usulidir.",
      mnemonic: "Blanchirlash: Qaynoq suvda bir lahza — ferment o'char, rang qolar toza.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 3. Passirlash
  (qId, idx, target) => {
        const list = ["piyoz va sabzini", "ildizmevali sabzavotlar va tomat pastasini", "oq ildizlar (petrushka, selderey) va piyozni", "pomidor pyuresi va maydalangan sabzini"];
    const itm = list[idx % list.length];
    const q = `Suyuq va quyuq taomlar tayyorlashda ${itm} 110–120°C haroratda yog' bilan passirlash jarayonining bosh pazandachilik maqsadi nimadan iborat? (#${qId})`;
    const correct = "Sabzavotlardagi xushbo'y efir moylari va bo'yovchi moddalarni (karotinoidlarni) yog'da eritib, taomga yoqimli rang va boy ta'm berish";
    const distractors = [
      "Sabzavotlarni to'liq qoraytirib kuydirish orqali ulardan achchiq uglerod ta'mini ajratib olish va sho'rvaga quyuq qora rang kiritish",
      "Sabzavotlardagi barcha yog' kislotalarini parchalab, ularni quruq kukun holatiga keltirish va taomning suyuqlik qismini quyultirish",
      "Faqat suvda eruvchan tuzlarni yo'qotish va sabzavotlarning hajmini o'n barobarga kattalashtirib pishishini tezlashtirish jarayonidir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Mo'minova (2014): Passirlashda sabzi va piyozdagi karotin hamda efir moylari yog'da eriydi, bu esa taomning rangi va xushbo'yligini oshiradi.",
      mnemonic: "Passirlash qoidasi: Yog'da erir karotin va xushbo'y moy — taom bo'lar tillarang, xushbo'y va boy.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 4. Oshxona sanitariyasi va markirovka
  (qId, idx, target) => {
        const items = [
      { board: "'XG' va 'PG'", meaning: "Xom go'sht va Pishgan go'sht", code: "go'sht mahsulotlari" },
      { board: "'XB' va 'PB'", meaning: "Xom baliq va Pishgan baliq", code: "baliq mahsulotlari" },
      { board: "'XS' va 'PS'", meaning: "Xom sabzavot va Pishgan sabzavot", code: "sabzavot mahsulotlari" },
      { board: "'G' va 'S'", meaning: "Go'sht va Sabzavot", code: "umumiy oziq-ovqat" }
    ];
    const cur = items[idx % items.length];
    const q = `Umumiy ovqatlanish korxonalari va maktab oshxonalarida kesish anjomlari (xontaxtalar va pichoqlar)dagi ${cur.board} markirovkasining qat'iy sanitariya talabi nimaga qaratilgan? (#${qId})`;
    const correct = "Tayyor pishgan mahsulotlarga xom ashyodagi patogen bakteriyalar va gelmint tuxumlari o'tishi (ikkilamchi zararlanish)ning oldini olish";
    const distractors = [
      "Faqat oshpazlarning qaysi xontaxta qimmatroq va yangiroq ekanligini hisoblab borishini ta'minlash uchun inventar raqami sifatida qo'llash",
      "Xontaxtalarni faqat rangiga qarab estetik bezash va oshxona dizaynining zamonaviy ko'rinishda bo'lishini ta'minlash maqsadida kiritilgan",
      "Pichoqlarning tig'i o'tmaslashib qolmasligi uchun ularni faqat yumshoq materiallar ustida ishlatishni nazorat qilish talabidir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Sanitariya qoidalariga ko'ra, xom va pishgan mahsulotlar alohida markirovkalangan xontaxtalarda ishlanishi shart (ikkilamchi infeksiyani oldini olish).",
      mnemonic: "Xontaxta belgisi: Xom va pishgan ajralsin — xavfsiz taom ta'minlansin.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 5. Sutni pasterizatsiya va sterilizatsiya qilish
  (qId, idx, target) => {
        const q = `Sutni qayta ishlash texnologiyasida pasterizatsiya va sterilizatsiya jarayonlarining o'rtasidagi asosiy texnologik va mikrobiologik farq nimadan iborat? (#${qId})`;
    const correct = "Pasterizatsiyada sut 63–85°C da qizdirilib faqat vegetativ mikroblar yo'qotiladi, sterilizatsiyada esa 100°C dan yuqori haroratda barcha sporalar ham o'ldiriladi";
    const distractors = [
      "Pasterizatsiyada sut faqat qattiq muzlatiladi, sterilizatsiyada esa sutga ko'p miqdorda kimyoviy konservantlar va osh tuzi eritmasi aralashtirib beriladi",
      "Pasterizatsiya sutning yog'lilik darajasini sun'iy oshiradi, sterilizatsiya esa sut tarkibidagi barcha oqsil va kazein moddalarini butunlay parchalaydi",
      "Har ikkala usul ham sutni bir xil 40°C da isitish bo'lib, ular faqat ishlatiladigan idishlarning o'lchami va quyilish tezligiga qarab bir-biridan farqlanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Pasterizatsiya (63-85°C) patogen bakteriyalarni o'ldiradi lekin sporalarni qoldiradi. Sterilizatsiya (120-140°C) sporalarni ham yo'qotib, mahsulotni uzoq muddat saqlaydi.",
      mnemonic: "Pasterizatsiya — yumshoq issiqlik; Sterilizatsiya — to'liq mikrobsiz tozalik.",
      question_type: "Y1",
      bloom_level: "Tahlil"
    };
  },

  // 6. Tuxum sifati va pishirish
  (qId, idx, target) => {
        const modes = [
      { name: "chala pishgan (vsmyatku)", time: "3–3.5 daqiqa", desc: "oqsil yarim quyuq, sariq esa butunlay suyuq" },
      { name: "xaltachasimon (v meshochek)", time: "4.5–5 daqiqa", desc: "oqsil to'liq quyuq, sariq esa yarim suyuq" },
      { name: "qattiq pishgan (vkrutuyu)", time: "8–10 daqiqa", desc: "oqsil va sariq butunlay qotgan" }
    ];
    const m = modes[idx % modes.length];
    const q = `Pazandachilik qoidalariga asosan, qaynayotgan suvda ${m.name} tuxum pishirish uchun qancha vaqt talab etiladi va uning konsistensiyasi qanday bo'ladi? (#${qId})`;
    const correct = `Qaynayotgan suvda ${m.time} qaynatiladi; natijada ${m.desc} holatda bo'ladi`;
    const distractors = [
      "Qaynayotgan suvda 25–30 daqiqa qaynatiladi; natijada tuxum butunlay erib sho'rvaga aylanadi va qobig'i yumshaydi",
      "Qaynayotgan suvda atigi 10 soniya tutiladi; natijada tuxumning harorati mutlaqo o'zgarmasdan muzdek holatda qoladi",
      "Tuxumni suvga solmasdan faqat quruq tovada 1 soat davomida qizdirish orqali xuddi shu konsistensiyaga erishiladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Tuxum pishirish me'yori: Chala (vsmyatku) — 3-3.5 daqiqa; Xaltacha (v meshochek) — 4.5-5 daqiqa; Qattiq (vkrutuyu) — 8-10 daqiqa.",
      mnemonic: "Tuxum pishishi: 3 daqiqa chala, 5 daqiqa xalta, 8 daqiqa qattiq bo'lib chiqar har galda.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 7. Tuxum yangiligini tekshirish
  (qId, idx, target) => {
        const q = `Oshxonada tovuq tuxumining yangiligini tekshirish uchun 10 foizli osh tuzi eritmasiga solinganda yangi (yaroqli) tuxum qanday holatni namoyon etadi? (#${qId})`;
    const correct = "Yangi tuxum idish tubiga gorizontal holatda cho'kadi, chunki uning havo kamerasi (puga) juda kichik bo'ladi";
    const distractors = [
      "Yangi tuxum darhol suv yuzasiga qalqib chiqadi va uning po'stlog'i tuz ta'sirida to'q ko'k rangga kiradi",
      "Yangi tuxum suv o'rtasida tik turib aylanadi va uning ichidagi oqsil qobig'i erib butunlay yo'qolib ketadi",
      "Yangi tuxum darhol yorilib, ichidagi sariq modda tuzli suvga aralashib bir xil eritmaga aylanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Tuxum eskigan sari namlik bug'lanib, havo kamerasi (puga) kattalashadi. Yangi tuxum og'ir bo'lib tubga cho'kadi, aynigan tuxum esa yuzaga qalqiydi.",
      mnemonic: "Tuxum sinovi: Tubga cho'ksa — yangi dur, suv yuzida — ayniydur.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 8. Kleykovina va un xususiyatlari
  (qId, idx, target) => {
        const q = `Bug'doy unining non va qandolatchilik mahsulotlari tayyorlashdagi texnologik sifatini belgilovchi xom kleykovina (oqsil)ning vazifasi nimadan iborat? (#${qId})`;
    const correct = "Gliadin va glyutenin oqsillari suvda bo'kib elastik karkas hosil qiladi, bu esa xamirning cho'ziluvchanligi va g'ovakligini ta'minlaydi";
    const distractors = [
      "Kleykovina un tarkibidagi barcha yog'larni parchalab, xamirni suv kabi oquvchan suyuqlikka aylantirish uchun xizmat qiladi",
      "Kleykovina faqat unning oppoq rangini saqlaydi, xamirning elastikligi va hajmi oshishiga hech qanday amaliy ta'sir ko'rsatmaydi",
      "Kleykovina xamirturushning ko'payishini butunlay to'xtatadi va nonning qotib toshdek mustahkam bo'lib chiqishini ta'minlaydi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Kleykovina — un oqsillari (gliadin va glyutenin). U suvni shimib elastik to'r (karkas) hosil qiladi, gazni ushlab nonni g'ovak qiladi.",
      mnemonic: "Kleykovina karkasi: Oqsil bo'kib to'r qurar — xamir ko'tarilib g'ovak bo'lar.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 9. Xamirturushli xamir bijg'ishi
  (qId, idx, target) => {
        const q = `Xamirturushli (achitqili) xamir tayyorlashda xamirning qorilishidan to pishirishgacha bo'lgan jarayonda xamirturush zamburug'lari qanday optimal haroratda eng faol rivojlanadi? (#${qId})`;
    const correct = "28–32°C optimal haroratda; bunda zamburug'lar qandni parchalab karbonat angidrid (CO2) va spirt hosil qiladi";
    const distractors = [
      "0–4°C muzdek haroratda; bunda zamburug'lar qotib qoladi va xamirning hajmi o'z-o'zidan portlash darajasida kengayadi",
      "75–85°C qaynoq haroratda; bunda zamburug'lar butunlay qaynaydi va kraxmal bir soniyada shakarga aylanadi",
      "Faqat 100°C qaynoq suv bug'ida; past haroratlarda xamirturush mutlaqo biologik reaksiyaga kirisha olmaydi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Achitqi zamburug'lari uchun eng qulay harorat 28-32°C. 50°C dan yuqorida ular nobud bo'ladi, 10°C dan pastda esa faoliyati to'xtaydi.",
      mnemonic: "Xamirturush harorati: 30 daraja issiqlik — xamirturushga shodlik; oshib ketar xamir toshib, g'ovak-g'ovak qovushib.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 10. Palov tayyorlash texnologiyasi
  (qId, idx, target) => {
        const stages = [
      "zirvak pishirish (go'sht, piyoz va sabzini qovurib, suv solib mildiratib qaynatish)",
      "guruchni solish va suvini torttirish (guruchni tekislab, baland olovda suvini bug'latish)",
      "palovni damlash (guruchni gumbaz qilib yig'ib, qopqoq bilan zich yopish)",
      "yog'ni dog'lash (o'simlik yog'ini qizdirib, oq tutun chiqquncha qizdirish)"
    ];
    const stg = stages[idx % stages.length];
    const q = `O'zbek milliy pazandachiligida Farg'ona (an'anaviy) usulida palov tayyorlashda ${stg} bosqichining to'g'ri texnologik qoidasi qaysi javobda ko'rsatilgan? (#${qId})`;
    const correct = "Zirvak sust olovda mildiratib qaynatiladi, guruch esa qaynoq suvda oldindan ivitilib, damlashda o'z bug'ida to'liq pishishi ta'minlanadi";
    const distractors = [
      "Zirvak qaynagan zahoti darhol muzdek suv solinadi va guruch yuvilmasdan qozonga to'kilib qattiq olovda qoraytirib kuydirilishi lozim",
      "Palov tayyorlashda suv mutlaqo ishlatilmaydi, faqat toza paxta yog'ining o'zida guruch to'liq qovurib yumshatiladi deb hisoblanadi",
      "Guruch solingandan keyin qozon darhol muzlatgichga qo'yiladi va sovuq muhitda o'z-o'zidan dimlanib pishishi ta'minlanishi shartdir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Palov texnologiyasi: Yog'ni dog'lash -> Go'sht, piyoz, sabzini qovurish -> Zirvakni mildiratib qaynatish -> Guruchni solib suvini torttirish -> Damlash.",
      mnemonic: "Palov siri: Dog'langan yog', mildiragan zirvak, toza ivitilgan guruch — dasturxon ko'rki palov har yerda yutuq.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 11. Dukkaklilarni pishirish
  (qId, idx, target) => {
        const beans = ["loviya va no'xatni", "mosh va yasmiqni", "quruq oq loviyani", "no'xat donalarini"];
    const b = beans[idx % beans.length];
    const q = `Pazandachilikda ${b} pishirishdan oldin sovuq suvda 5–8 soat davomida ivitib qo'yishning asosiy texnologik sababi nima? (#${qId})`;
    const correct = "Donlar hujayra to'qimalarining suv shimib bo'kishi natijasida pishish vaqtini qisqartirish va bir tekis yumshashini ta'minlash";
    const distractors = [
      "Dukkaklilar tarkibidagi barcha oqsillar va kraxmallarni butunlay yuvib tashlab, donlarda faqat qattiq po'stlog'ini qoldirish",
      "Donlarning rangini qoraytirib, ularni xona haroratida o'z-o'zidan fermentatsiyaga uchratib spirtli ichimlikka aylantirish jarayoni",
      "Faqat donlarning og'irligini sun'iy ravishda yuz barobarga oshirish va ularni xom holda iste'mol qilishga moslashtirishdir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Dukkaklilar (loviya, no'xat) qattiq qobiqqa ega. Ularni sovuq suvda ivitish pishish muddatini 2 barobarga qisqartiradi va shaklini saqlaydi.",
      mnemonic: "Dukkakli don: Ivitsang agar sovuq suvda — tez pishar yumshab taomda.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 12. Baliqqa ishlov berish
  (qId, idx, target) => {
        const fishList = ["tangaqli chuchuk suv balig'iga (zog'ora, oq amur)", "sudak va laqqa balig'iga", "dengiz balig'i filesiga", "yirik zog'ora balig'iga"];
    const f = fishList[idx % fishList.length];
    const q = `Oshxonada ${f} dastlabki ishlov berish (tozalash va yarimtayyor mahsulot tayyorlash) jarayonining to'g'ri texnologik ketma-ketligi qaysi qatorda berilgan? (#${qId})`;
    const correct = "Tangachalarini dumidan boshiga qarab tozalash -> Qorin qismini yorib ichki a'zolarini va jabralarini olib tashlash -> Yuvish va bo'laklarga bo'lish";
    const distractors = [
      "Avval baliqni bo'laklarga bo'lib pishirish -> So'ngra qaynoq sho'rva ichida tangachalarini va qorin ichki a'zolarini tozalab ajratib olish",
      "Baliqni mutlaqo tozalamasdan to'g'ridan-to'g'ri unga bulab qovurish -> Pishgach likopchada ichki a'zolarini ajratib tashlash jarayoni",
      "Faqat dumini kesib tashlash -> Baliqni butunligicha muzlatkichga qo'yib tangachalari va qorin pardasi bilan birga dasturxonga tortish"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Baliqqa dastlabki ishlov: Tangachalarini tozalash -> Jabralarini va ichaklarini olib tashlash -> Qora pardasini tozalab yuvish -> Porsiyalarga bo'lish.",
      mnemonic: "Baliq tozalash: Dumdan boshga tangacha, ichak-jabra ketguncha; sovuq suvda chayilsa, shirin taom pishguncha.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 13. Qatlama xamir
  (qId, idx, target) => {
        const q = `Qandolatchilikda qatlama (sloyonoe) xamir tayyorlashda xamir qatlamlari orasiga yog' surtib qayta-qayta buklash va sovutish jarayonining fizik mohiyati nima? (#${qId})`;
    const correct = "Xamir va yog' qatlamlarining bir-biriga qorishib ketmasligi; pishganda suv bug'lanib yog'li qatlamlarni itarib, qat-qat g'ovak struktura hosil qilishi";
    const distractors = [
      "Yog'ni xamirga to'liq qorishtirib suyuq holga keltirish va xamirning qalinligini bir santimetrga kamaytirib pishiq qilib qotirish vazifasi",
      "Xamir tarkibidagi barcha namlikni to'liq yo'qotib, uni quruq shisha kabi mo'rt va qattiq monolit holatga keltirish uchun talab etiladi",
      "Faqat pechdagi olov haroratini pasaytirish va xamirning tagiga olishini to'xtatish maqsadida yuzasiga qalin yog' surtish usulidir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Qatlama xamirda yog' qatlamlari xamirni ajratib turadi. Pishishda xamirdagi suv bug'ga aylanib qatlamlarni ko'taradi, natijada qat-qat xamir hosil bo'ladi.",
      mnemonic: "Qatlama xamir: Qat-qat xamir, qat-qat yog' — bug' ko'tarar varaq-varaq, bo'lar barra va chiroq.",
      question_type: "Y1",
      bloom_level: "Tahlil"
    };
  },

  // 14. Dasturxon tuzash va stoldagi asboblar
  (qId, idx, target) => {
        const q = `Klassik stol servirovkasi qoidalariga ko'ra, asosiy taom likopchasining o'ng va chap tomonlariga oshxona anjomlari qanday to'g'ri tartibda joylashtiriladi? (#${qId})`;
    const correct = "O'ng tomonga: pichoqlar (tig'i likopchaga qaratib) va osh qoshiq; Chap tomonga: vilkalar (tishlari yuqoriga qaratib)";
    const distractors = [
      "O'ng tomonga: barcha vilkalar (tishlari pastga qaratib qo'yiladi); Chap tomonga: faqat choy qoshiqlar va desert likopchalari",
      "Barcha pichoq va vilkalar likopchaning ustiga xoch shaklida ustma-ust taxlab qo'yiladi va salfetka bilan o'rab beriladi",
      "Chap tomonga pichoqlar (tig'i tashqariga qaratib qo'yiladi); O'ng tomonga esa faqat qog'oz salfetkalar va suv stakanlari joylanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Servirovka qoidasi: Vilka chapda (tishlari tepaga), pichoq o'ngda (tig'i likopchaga), qoshiq o'ngda joylashadi.",
      mnemonic: "Asboblar joyi: Chapda vilka, o'ngda pichoq — dasturxonimiz ozoda, qalbimiz quvnoq.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 15. Konservalashda botulizm xavfi
  (qId, idx, target) => {
        const q = `Uy sharoitida sabzavot va go'sht mahsulotlarini konservalashda hayot uchun o'ta xavfli hisoblangan botulizm intoksikatsiyasining oldini olishning bosh sharti nima? (#${qId})`;
    const correct = "Clostridium botulinum sporalari faqat 120°C dan yuqori haroratda yoki yetarli kislotali (pH < 4.6) muhitda nobud bo'lishini hisobga olib qat'iy rejimga amal qilish";
    const distractors = [
      "Mahsulotlarni faqat sovuq oqava suvda 10 daqiqa yuvish va ularni qopqog'i ochiq bankalarda to'g'ridan-to'g'ri quyosh nuri ostida qoldirish talabi",
      "Bankaga ko'p miqdorda shakar solish, chunki shakar moddasi barcha anaerob bakteriyalarni bir soniyada butunlay yo'qotadi deb qarash",
      "Konservani tayyorlab bo'lgach, uni xona burchagida qorong'i joyda hech qanday issiqlik bermasdan ochiq havoda uzoq muddat saqlash"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Botulizm qo'zg'atuvchisi anaerob bakteriya bo'lib, uning sporalari 100°C da o'lmaydi (120°C talab qilinadi). Kislotali muhit (sirka) ularning rivojlanishiga yo'l qo'ymaydi.",
      mnemonic: "Botulizm xavfi: Kislorodsiz joyda unar botulizm — yuqori harorat va kislota unga to'siq.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 16. Choy damlash texnologiyasi
  (qId, idx, target) => {
        const teaTypes = [
      { type: "ko'k choy", temp: "80–85°C", time: "4–5 daqiqa" },
      { type: "qora choy", temp: "95–100°C", time: "3–5 daqiqa" },
      { type: "ko'k choy (95-sonli)", temp: "80–85°C", time: "5–6 daqiqa" },
      { type: "efir moyli dorivor giyohli choy", temp: "90°C", time: "7–10 daqiqa" }
    ];
    const t = teaTypes[idx % teaTypes.length];
    const q = `Milliy mehmondo'stlik va pazandachilik qoidalariga muvofiq, chinni choynakda ${t.type} damlashning to'g'ri texnologik jarayoni qaysi javobda ko'rsatilgan? (#${qId})`;
    const correct = `Choynakni qaynoq suv bilan chayqab qizdirish -> Quruq choy solish -> Qaynoq suv quyib ustini salfetka bilan yopib ${t.time} dam yedirish -> 3 marta qaytarish`;
    const distractors = [
      "Choynakka muzdek suv solib, quruq choyni olov ustida 20 daqiqa davomida qattiq qaynatish va darhol stakanlarga quyib berish usuli",
      "Choy barglarini qo'lda ezib chang holatiga keltirish va ustidan sovuq sut quyib muzlatgichda 1 soat davomida tindirish usulidir",
      "Choynakka suv quymasdan faqat quruq choy barglarini shamollatish va mehmonlarga quruq kukun holatida uzatish qoidasi hisoblanadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Choy damlash: Choynakni chayqab qizdirish -> Choy solish -> 1/3 suv quyib tindirish -> To'ldirish va 3 marta qaytarish (loyqa chiqmasligi va ta'mi bir tekis bo'lishi uchun).",
      mnemonic: "Choy damlash: Choynakni qizdir, dam yedir asta — uch bor qaytarib uzat piyolada dildan havasda.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  }
];

export function generateSection01() {
  const count = 520;
  const startId = 1;
  const topicId = 196;
  const sectionName = '01_oziq_ovqat_texnologiyasi_va_pazandachilik.json';
  
  createQuestionBankServis(sectionName, topicId, startId, count, templates);
}

generateSection01();
