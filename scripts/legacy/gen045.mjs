import { writeFileSync } from 'fs';

const data = [
  {
    id: 1, soha: "5. Fuqaro muhofazasi", subtopic: "FM ta'rifi va qonuni",
    difficulty: "Y1", cognitive: "Bilish", qtype: "single",
    question: "\"Fuqaro muhofazasi to'g'risida\"gi Qonun qachon qabul qilingan?",
    options: { A: "1992-yil 8-dekabr", B: "2000-yil 26-may", C: "2001-yil 11-may", D: "2002-yil 12-dekabr" },
    answer: "B",
    explanation: "\"Fuqaro muhofazasi to'g'risida\"gi Qonun 2000-yil 26-mayda qabul qilingan.",
    mnemonic: "FM qonuni: 2000 -> 26-may",
    source: "10-sinf §20, 66-bet"
  },
  {
    id: 2, soha: "5. Fuqaro muhofazasi", subtopic: "FM ta'rifi",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "O'qituvchi 'Fuqaro muhofazasi nima?' deb so'radi. To'g'ri ta'rifni toping.",
    options: {
      A: "Aholini tinchlik davrida tabiiy ofatlardan himoya qilish chora-tadbirlari",
      B: "Harbiy harakatlar olib borish vaqtida yoki shu harakatlar oqibatida yuzaga keladigan xavflardan aholini, hududlarni, moddiy va madaniy boyliklarni muhofaza qilish maqsadida davlat tomonidan o'tkaziladigan tadbirlar tizimi",
      C: "Qurolli Kuchlarning aholini qo'riqlash tizimi",
      D: "Favqulodda vaziyatlar vazirligining tinchlik davridagi faoliyati"
    },
    answer: "B",
    explanation: "FM - harbiy harakatlar olib borish vaqtida yoki shu harakatlar oqibatida yuzaga keladigan xavflardan O'zR aholisini, hududlarini, moddiy va madaniy boyliklarini muhofaza qilish maqsadida davlat tomonidan o'tkaziladigan tadbirlar tizimi.",
    mnemonic: "FM = HARBIY HARAKATLAR xavfi + AHOLI + HUDUD + BOYLIKLAR muhofazasi",
    source: "10-sinf §20, 66-bet"
  },
  {
    id: 3, soha: "5. Fuqaro muhofazasi", subtopic: "FM tuzilmalari",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Maktabda fuqaro muhofazasi tuzilmasini tashkil etish vazifasi kim zimmasiga yuklatilgan?",
    options: {
      A: "Mudofaa vazirligiga",
      B: "Maktab direktori (muassasa rahbari)",
      C: "Mahalla qo'mitasiga",
      D: "Tuman hokimligiga"
    },
    answer: "B",
    explanation: "VMning 2017-yil 9-iyundagi 369-sonli qaroriga asosan ta'lim tashkilotlarida FM tuzilmalarini tashkil etish vazifasi muassasa rahbari zimmasiga yuklatilgan.",
    mnemonic: "FM tuzilma tashkiloti = muassasa RAHBARI zimmasida",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 4, soha: "5. Fuqaro muhofazasi", subtopic: "FM tuzilmalari ta'rifi",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Fuqaro muhofazasi tuzilmalari qanday tuzilmalar deb ataladi?",
    options: {
      A: "Davlat harbiy qo'shinlari",
      B: "Belgilangan FM tadbirlarini bajarish uchun tashkilot o'z xodimlaridan tashkil etadigan shtatdan tashqari tuzilmalar",
      C: "Faqat ixtisoslashgan qutqaruv guruhlari",
      D: "Maxsus o'qitilgan harbiy xizmatchilar guruhi"
    },
    answer: "B",
    explanation: "FM tuzilmalari - belgilangan fuqaro muhofazasi tadbirlarini bajarish uchun tashkilot o'z xodimlaridan tashkil etadigan shtatdan tashqari tuzilmalar.",
    mnemonic: "FM tuzilma = SHTATDAN TASHQARI + o'z xodimlardan",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 5, soha: "5. Fuqaro muhofazasi", subtopic: "FM qutqaruv komandasi",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Favqulodda vaziyatda to'g'ridan qutqaruv ishlarini olib boradigan FM tuzilmasi qanday nomlanadi?",
    options: {
      A: "Kuzatuv guruhi",
      B: "Qutqaruv komandasi (guruhi)",
      C: "Aloqa komandasi",
      D: "Tibbiy qo'mitasi"
    },
    answer: "B",
    explanation: "Qutqaruv komandasi (guruhi) qutqaruv ishlarini olib boradi.",
    mnemonic: "Qutqaruv ishlari -> QUTQARUV KOMANDASI (guruhi)",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 6, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — o'rgatish",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "FM ning birinchi asosiy vazifalaridan biri nima?",
    options: {
      A: "Harbiy texnikani zahirada saqlash",
      B: "Aholini harbiy harakatlar xavflaridan himoyalanish usullariga o'rgatish",
      C: "Chegara qo'shinlarini kuchaytirish",
      D: "Mudofaa byudjetini rejalashtirish"
    },
    answer: "B",
    explanation: "FM vazifalari orasida: aholini harbiy harakatlar olib borish vaqtida yoki shu harakatlar oqibatida yuzaga keladigan xavflardan himoyalanish usullariga o'rgatish.",
    mnemonic: "FM 1-vazifa: AHOLINI himoyalanish usullariga O'RGATISH",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 7, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — evakuatsiya",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "FM vazifalari ichida aholini xavfsiz joylarga olib chiqishga oid qaysi vazifa bor?",
    options: {
      A: "Boshqaruv tizimini tashkil qilish",
      B: "Aholini, moddiy va madaniy boyliklarni xavfsiz joylarga evakuatsiya qilish",
      C: "Mudofaa harbiy tuzilmalar shayligini ta'minlash",
      D: "Radiatsion kuzatuv olib borish"
    },
    answer: "B",
    explanation: "FM vazifalari: aholini, moddiy va madaniy boyliklarni xavfsiz joylarga evakuatsiya qilish.",
    mnemonic: "FM evakuatsiya: AHOLI + moddiy va madaniy BOYLIKLAR -> XAVFSIZ joylar",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 8, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — radiatsion nazorat",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "FM ning qaysi vazifasi radiatsion, kimyoviy va biologik xavflarni kuzatishga tegishli?",
    options: {
      A: "Boshqaruv tizimini tashkil etish",
      B: "Radiatsion, kimyoviy va biologik vaziyat ustidan kuzatish va laboratoriya nazoratini olib borish",
      C: "Aholini evakuatsiya qilish",
      D: "Jamoat tartibini saqlash"
    },
    answer: "B",
    explanation: "FM vazifalari: radiatsion, kimyoviy va biologik vaziyat ustidan kuzatish va laboratoriya nazoratini olib borish.",
    mnemonic: "RKB: Radiatsion + Kimyoviy + Biologik -> KUZATISH + LABORATORIYA",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 9, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — boshqaruv tizimi",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "FM vazifalari ichida aloqa va xabar berish bilan bog'liq vazifa qanday ifodalangan?",
    options: {
      A: "Aholini radio orqali xabardor qilish",
      B: "Boshqaruv, xabar berish va aloqa tizimlarini tashkil qilish, rivojlantirish va doimiy shay holatda saqlab turish",
      C: "Fuqaro muhofazasi harbiy tuzilmalari shayligini ta'minlash",
      D: "Shoshilinch qutqaruv ishlarini o'tkazish"
    },
    answer: "B",
    explanation: "FM vazifalari: boshqaruv, xabar berish va aloqa tizimlarini tashkil qilish, rivojlantirish va doimiy shay holatda saqlab turish.",
    mnemonic: "FM aloqa: BOSHQARUV + XABAR BERISH + ALOQA tizimi -> shay holatda",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 10, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — tartib saqlash",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Harbiy harakatlar oqibatida zarar ko'rgan hududlarda FM ning maxsus vazifasi qanday?",
    options: {
      A: "Harbiy xizmatchilarni joylashtirish",
      B: "Jamoat tartibini yo'lga qo'yish va saqlab turish",
      C: "Evakuatsiya punktlarini tashkil qilish",
      D: "Aholini tibbiy yordam bilan ta'minlash"
    },
    answer: "B",
    explanation: "FM vazifalari: harbiy harakatlar olib borish vaqtida yoki shu harakatlar oqibatida zarar ko'rgan hududlarda jamoat tartibini yo'lga qo'yish va saqlab turish.",
    mnemonic: "Zarar ko'rgan hudud -> JAMOAT TARTIB yo'lga qo'yish + saqlash",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 11, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — texnogen",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Texnogen xususiyatli favqulodda vaziyatlar nima?",
    options: {
      A: "Tabiiy hodisalar (zilzila, sel, suv toshqini) sabab bo'lgan vaziyatlar",
      B: "Insonlarning ishlab chiqarish yoki xo'jalik faoliyati bilan bog'liq bo'lgan halokat (avariya)lar",
      C: "Ekologik ifloslanish natijasida yuzaga kelgan vaziyatlar",
      D: "Harbiy harakatlar oqibatida kelib chiqqan vaziyatlar"
    },
    answer: "B",
    explanation: "Texnogen xususiyatli FV - insonlarning ishlab chiqarish yoki xo'jalik faoliyati bilan bog'liq bo'lgan halokat (avariya)lar.",
    mnemonic: "Texnogen = INSONLAR faoliyati + ISHLAB CHIQARISH + halokat",
    source: "10-sinf §21, 69-bet"
  },
  {
    id: 12, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — texnogen avariya",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Sementxona yaqinidagi kimyoviy zavod portladi va zaharli moddalar hududga tarqaldi. Bu qanday turdagi FV?",
    options: {
      A: "Tabiiy xususiyatli",
      B: "Ekologik xususiyatli",
      C: "Texnogen xususiyatli — kimyoviy xavfli obyektdagi avariya",
      D: "Biologik xususiyatli"
    },
    answer: "C",
    explanation: "Kimyoviy xavfli obyektlardagi avariyalar texnogen xususiyatli FV turiga kiradi — zaharli moddalarning avariya holatida otilib chiqishi.",
    mnemonic: "Kimyoviy zavod avariya -> TEXNOGEN (kimyoviy xavfli obyekt)",
    source: "10-sinf §21, 70-bet"
  },
  {
    id: 13, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — transport avariya",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Yengil poisd bilan avtobus to'qnashdi, ko'plab jabrlanuvchilar bor va atrof zaharli modda bilan ifloslanmoqda. Bu qanday turdagi FV hisoblanadi?",
    options: {
      A: "Ekologik xususiyatli",
      B: "Tabiiy xususiyatli",
      C: "Texnogen — transport avariyasi",
      D: "Biologik xususiyatli"
    },
    answer: "C",
    explanation: "Yo'l-transport hodisalari, shu jumladan KTKZM (kuchli ta'sir ko'rsatuvchi zaharli modda) tarqatgan avariyalar texnogen transport halokatlariga kiradi.",
    mnemonic: "Transport + Zararli modda -> TEXNOGEN transport avariya",
    source: "10-sinf §21, 69-bet"
  },
  {
    id: 14, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — tabiiy",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Tog' qo'porilib, qishloq qisman ko'milib ketdi. Bu qanday turdagi FV?",
    options: {
      A: "Texnogen — gidrotexnik halokat",
      B: "Tabiiy — geologik xavfli hodisa (yer ko'chishi, tog' o'pirilishi)",
      C: "Ekologik xususiyatli",
      D: "Texnogen — kon-ruda sanoati avariyasi"
    },
    answer: "B",
    explanation: "Yer ko'chishlari, tog' o'pirilishlari va boshqa xavfli geologik hodisalar tabiiy xususiyatli FV turiga kiradi.",
    mnemonic: "Tog' o'pirilishi -> TABIIY geologik xavfli hodisa",
    source: "10-sinf §21, 71-bet"
  },
  {
    id: 15, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — zilzila",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Zilzila qaysi turdagi FV ga kiradi?",
    options: { A: "Texnogen", B: "Ekologik", C: "Tabiiy — geologik", D: "Biologik" },
    answer: "C",
    explanation: "Zilzilalar — insonlar o'limiga sabab bo'lgan, binolar, texnologik asbob-uskunalar va infratuzilmaning buzilishiga olib kelgan — tabiiy xususiyatli, geologik xavfli hodisalar.",
    mnemonic: "Zilzila -> TABIIY + GEOLOGIK",
    source: "10-sinf §21, 71-bet"
  },
  {
    id: 16, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — epizootiya",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Viloyatda hayvonlarning ommaviy kasallanishi yoki nobud bo'lishi kuzatildi. Bu qanday hodisa?",
    options: { A: "Epidemiya", B: "Epizootiya", C: "Epifitotiya", D: "Pandemiya" },
    answer: "B",
    explanation: "Epizootiya - hayvonlarning ommaviy kasallanishi yoki nobud bo'lishi. Epidemiya - odamlarning, epifitotiya - o'simliklarning ommaviy nobud bo'lishi.",
    mnemonic: "Epi-ZOO-tiya = HAYVONLAR (zoo); epi-FITO-tiya = O'SIMLIK (phyto); EPIDEMIYA = ODAMLAR",
    source: "10-sinf §21, 72-bet"
  },
  {
    id: 17, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — epidemiya ta'rifi",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Epidemiya nima va qachon e'lon qilinadi?",
    options: {
      A: "Bir aholi punktida 10 kishi va undan ortiq kasallangan",
      B: "Alohida xavfli infeksiyalarga tegishli bo'lmagan, yuqish manbai yoki omili bir xil bo'lgan odamlarning guruh bo'lib kasallanishi (bir aholi punktida 50 kishi va undan ortiq)",
      C: "Butun mamlakat miqyosida tarqalgan kasallik",
      D: "Faqat bolalar orasida kuzatiladigan kasallik"
    },
    answer: "B",
    explanation: "Epidemiya: alohida xavfli infeksiyalarga tegishli bo'lmagan, yuqish manbai bitta yoki yuqish omili bir xil bo'lgan odamlarning guruh bo'lib yuqumli kasallanishi (bir aholi punktida 50 kishi va undan ortiq).",
    mnemonic: "Epidemiya = bir punktda 50+ KISHI, bir xil manba/omil",
    source: "10-sinf §21, 72-bet"
  },
  {
    id: 18, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — ekologik",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Tuproq sanoat tufayli kelib chiqqan toksikantlar bilan ifloslanmoqda. Bu qanday xususiyatli FV?",
    options: {
      A: "Texnogen",
      B: "Tabiiy",
      C: "Ekologik — quruqlik holatining o'zgarishi",
      D: "Biologik"
    },
    answer: "C",
    explanation: "Tuproq va yerosti suvlarining sanoat tufayli kelib chiqqan toksikantlar bilan ifloslanishi ekologik xususiyatli FV ga — quruqlik (tuproq, yerosti) holatining o'zgarishi bilan bog'liq vaziyatlarga kiradi.",
    mnemonic: "Tuproq ifloslanish -> EKOLOGIK (quruqlik holati o'zgarishi)",
    source: "10-sinf §21, 73-bet"
  },
  {
    id: 19, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — ekologik atmosfera",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Shahar atrofida havoning oltingugurt dioksid bilan yuqori darajada ifloslanishi kuzatilmoqda. Bu qanday xususiyatli FV?",
    options: {
      A: "Texnogen — kimyoviy avariya",
      B: "Ekologik — atmosfera (havo muhiti) tarkibi va xossalari o'zgarishi",
      C: "Tabiiy — gidrometeorologik",
      D: "Biologik"
    },
    answer: "B",
    explanation: "Havoning zararli moddalar bilan yuqori darajada ifloslanishi ekologik xususiyatli FV ga — atmosfera (havo muhiti) tarkibi va xossalari o'zgarishi bilan bog'liq vaziyatlarga kiradi.",
    mnemonic: "Havo ifloslanishi (doimiy) -> EKOLOGIK (atmosfera o'zgarishi)",
    source: "10-sinf §21, 73-bet"
  },
  {
    id: 20, soha: "5. Fuqaro muhofazasi", subtopic: "FV xabar berish — signal",
    difficulty: "Y1", cognitive: "Bilish", qtype: "single",
    question: "Aholiga FV haqida xabar berishda ishlatiladigan asosiy shartli signal qanday nomlanadi?",
    options: {
      A: "Xatar signali",
      B: "Diqqat hammaga signali",
      C: "Evakuatsiya signali",
      D: "Tashqariga chiqma signali"
    },
    answer: "B",
    explanation: "Aholiga xabar berish shartli 'Diqqat hammaga!' signali (ruporlar, elektrosirenalar, ovoz chiqaruvchi karnay vositalar va boshqa usullar) orqali yetkaziladi.",
    mnemonic: "Asosiy signal: DIQQAT HAMMAGA!",
    source: "10-sinf §22, 74-bet"
  },
  {
    id: 21, soha: "5. Fuqaro muhofazasi", subtopic: "FV xabar berish — vositalar",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Diqqat hammaga signali qanday vositalar orqali uzatiladi?",
    options: {
      A: "Faqat radio va televideniye orqali",
      B: "Ruporlar, elektrosirenalar, ovoz chiqaruvchi karnay vositalar va boshqa usullar orqali",
      C: "Faqat mobil telefonlar orqali SMS",
      D: "Faqat internet orqali"
    },
    answer: "B",
    explanation: "Diqqat hammaga signali ruporlar, elektrosirenalar, ovoz chiqaruvchi karnay vositalar va boshqa usullardan foydalaniladi.",
    mnemonic: "Signal vositalari: RUPOR + SIRENA + KARNAY + boshqalar",
    source: "10-sinf §22, 74-bet"
  },
  {
    id: 22, soha: "5. Fuqaro muhofazasi", subtopic: "FV xabar berish — harakat tartibi A",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Diqqat hammaga signalini eshitgandan so'ng aholi birinchi navbatda nima qilishi kerak?",
    options: {
      A: "Darhol evakuatsiya punktiga borish",
      B: "Televideniye, radiokanallar va internet tarmoqlarni kuzatish",
      C: "Gazniqob kiyish",
      D: "Panohgohga yashirinish"
    },
    answer: "B",
    explanation: "Xabar bo'yicha harakat tartibi: ogohlantirish signalidan so'ng televideniye, radiokanallar va internet tarmoqlarni kuzatish.",
    mnemonic: "Signal -> Avval TV + RADIO + INTERNET kuzatish",
    source: "10-sinf §22, 75-bet"
  },
  {
    id: 23, soha: "5. Fuqaro muhofazasi", subtopic: "FV xabar berish — harakat tartibi B",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "FV paytida mutaxassislar ko'rsatmalariga muvofiq qanday kayfiyatda harakat qilish kerak?",
    options: {
      A: "Tezroq qaror qabul qilish uchun xavotir bilan harakat qilish",
      B: "Ko'rsatma va tavsiyalariga muvofiq xavotirga tushmasdan, tinchlikni saqlagan holda",
      C: "Faqat maxsus ma'lumot kelguncha kutish",
      D: "Mustaqil ravishda barcha qarorlarni qabul qilish"
    },
    answer: "B",
    explanation: "Harakat tartibi: mutaxassislar tomonidan berilgan ko'rsatma va tavsiyalariga muvofiq xavotirga tushmay, tinchlikni saqlagan holda harakat qilish.",
    mnemonic: "FV harakat: xavotirSIZ + TINCHlikni saqlash + ko'rsatmalarga MUVOFIQ",
    source: "10-sinf §22, 75-bet"
  },
  {
    id: 24, soha: "5. Fuqaro muhofazasi", subtopic: "FV xabar berish — aholi xabardorlik",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Aholiga xabar berish deganda nimani tushuniladi?",
    options: {
      A: "Harbiy holat e'lon qilish",
      B: "Sodir bo'lishi mumkin bo'lgan zilzila, suv bosishi yoki boshqa tabiiy ofatlar, yuz bergan avariya, halokatlar to'g'risida ogohlantirish signali orqali xabar berish",
      C: "Harbiy chaqiruv to'g'risida e'lon qilish",
      D: "Favqulodda holat rejimini joriy etish"
    },
    answer: "B",
    explanation: "Aholiga xabar berish - sodir bo'lishi mumkin bo'lgan zilzila, suv bosishi yoki boshqa tabiiy ofatlar, yuz bergan avariya, halokatlar to'g'risida ogohlantirish signali orqali xabar berish.",
    mnemonic: "Xabar berish = OGOHLANTIRISH signali orqali FV to'g'risida",
    source: "10-sinf §22, 74-bet"
  },
  {
    id: 25, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — ta'rif",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Aholi evakuatsiyasi nima?",
    options: {
      A: "Aholini maxsus kasb-hunarga o'rgatish",
      B: "FV yuz bergan joydan aholini olib chiqib ketish va xavfsiz hududlarga joylashtirish bo'yicha o'tkaziladigan tadbirlar majmui",
      C: "Tibbiy yordam ko'rsatish tadbirlari",
      D: "Aholini harbiy xizmatga tayyorlash"
    },
    answer: "B",
    explanation: "Aholi evakuatsiyasi - FV yuz bergan joydan aholini olib chiqib ketish va oldindan tayyorlab qo'yilgan hamda hayotiy faoliyat sharoitlari yaratilgan xavfsiz hududlarga ularni joylashtirish bo'yicha o'tkaziladigan tadbirlar majmui.",
    mnemonic: "Evakuatsiya = FV joydan OLib CHIQ + XAVFSIZ hudud + JOYLASHTIRISH",
    source: "10-sinf §22, 75-bet"
  },
  {
    id: 26, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — usullari",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Evakuatsiya qanday usullarda o'tkazilishi mumkin?",
    options: {
      A: "Faqat transport vositalari bilan",
      B: "Transportda, piyoda yoki aralash usullarda",
      C: "Faqat piyoda",
      D: "Faqat dengiz transporti bilan"
    },
    answer: "B",
    explanation: "Evakuatsiya transportda, piyoda yoki aralash usullarda o'tkazilishi mumkin.",
    mnemonic: "Evakuatsiya usuli: TRANSPORT + PIYODA + ARALASH",
    source: "10-sinf §22, 75-bet"
  },
  {
    id: 27, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — turlari",
    difficulty: "Y3", cognitive: "Mulohaza", qtype: "single",
    question: "Evakuatsiyaning qaysi turi maqsadga ko'ra to'g'ri ko'rsatilgan?",
    options: {
      A: "Faqat shoshilinch va rejalashtirilgan",
      B: "Avvaldan rejalashtirilgan va shoshilinch; umumiy va qisman; lokal, mahalliy va hududiy",
      C: "Faqat umumiy va qisman",
      D: "Faqat avvaldan rejalashtirilgan va umumiy"
    },
    answer: "B",
    explanation: "Evakuatsiyaning turlari: avvaldan rejalashtirilgan va shoshilinch; umumiy va qisman; lokal, mahalliy va hududiy.",
    mnemonic: "Evakuatsiya turlari: REJA/SHOSHILINCH + UMUMIY/QISMAN + LOKAL/MAHALLIY/HUDUDIY",
    source: "10-sinf §22, 75-bet"
  },
  {
    id: 28, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — tamoyillar",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "Evakuatsiya qanday tamoyillar asosida amalga oshiriladi?",
    options: {
      A: "Harbiy va fuqarolik tamoyili",
      B: "Hududiy, ishlab chiqarish va ishlab chiqarish-hududiy tamoyili",
      C: "Shoshilinch va rejalashtirilgan tamoyil",
      D: "Individual va guruhiy tamoyil"
    },
    answer: "B",
    explanation: "Evakuatsiya hududiy, ishlab chiqarish va ishlab chiqarish-hududiy tamoyili asosida amalga oshiriladi.",
    mnemonic: "Evakuatsiya tamoyili: HUDUDIY + ISHLAB CHIQARISH + ISHLAB CHIQARISH-HUDUDIY",
    source: "10-sinf §22, 75-bet"
  },
  {
    id: 29, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — hududiy tamoyil",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Qaysi holatda hududiy tamoyil asosida evakuatsiya amalga oshiriladi?",
    options: {
      A: "Faqat tashkilot xodimlari evakuatsiya qilinganda",
      B: "Halokatli suv toshqinlari, dovul, zilzila, kimyoviy avariyalardan so'ng — barcha aholi yashash joylaridan olib chiqilganda",
      C: "Oila a'zolari bilan birgalikda ko'chishda",
      D: "Faqat bolalar va ayollar evakuatsiya qilinganda"
    },
    answer: "B",
    explanation: "Hududiy tamoyil asosida: barcha aholi yashash joylaridan olib chiqib ketiladi. Halokatli suv toshqinlari, dovul, zilzila, kimyoviy avariyalardan so'ng.",
    mnemonic: "Hududiy tamoyil = BARCHA AHOLI yashash joyidan ko'chadi (sel, dovul, zilzila, kimyo avariya)",
    source: "10-sinf §22, 76-bet"
  },
  {
    id: 30, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — ishlab chiqarish tamoyili",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Korxona xodimi Vohid evakuatsiya qilindi, lekin oilasi qoldi. Bu qanday tamoyil asosida amalga oshirildi?",
    options: {
      A: "Hududiy tamoyil",
      B: "Ishlab chiqarish tamoyili (oila a'zolari birgalikda ko'chirilmaydi)",
      C: "Ishlab chiqarish-hududiy tamoyil",
      D: "Individual tamoyil"
    },
    answer: "B",
    explanation: "Ishlab chiqarish tamoyili asosida korxona, muassasalarning xodimlari evakuatsiya qilinadi, lekin oila a'zolari ular bilan birgalikda ko'chirilmaydi.",
    mnemonic: "Ishlab chiqarish tamoyili = XODIM ko'chadi + oila QOLADi",
    source: "10-sinf §22, 76-bet"
  },
  {
    id: 31, soha: "5. Fuqaro muhofazasi", subtopic: "Evakuatsiya — ishlab chiqarish-hududiy",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "Shaharda evakuatsiya e'lon qilindi. Zavod ishchisi Jasur xotini va bolalari bilan birgalikda ko'chirildi. Bu qanday tamoyil?",
    options: {
      A: "Faqat hududiy tamoyil",
      B: "Faqat ishlab chiqarish tamoyili",
      C: "Ishlab chiqarish-hududiy tamoyil",
      D: "Shoshilinch evakuatsiya tamoyili"
    },
    answer: "C",
    explanation: "Ishchi-xizmatchilar oila a'zolari bilan birgalikda ko'chiriladigan bo'lsa, ishlab chiqarish-hududiy tamoyili asosida ish ko'riladi.",
    mnemonic: "Ishchi + OILA birgalikda = ISHLAB CHIQARISH-HUDUDIY tamoyil",
    source: "10-sinf §22, 76-bet"
  },
  {
    id: 32, soha: "5. Fuqaro muhofazasi", subtopic: "FM tuzilmalar — mustaqil ish",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "FM tuzilmalari o'z vazifalarini qanday bajaradi?",
    options: {
      A: "Faqat harbiy qo'mondonlik buyrug'i bilan",
      B: "Mustaqil yoki qutqaruv xizmatlari va tuzilmalari, harbiy davrda joylardagi harbiy qo'mondonlik organlari bilan hamkorlikda",
      C: "Faqat FVV vazirligi rahbarligida",
      D: "Faqat Prezident farmoni asosida"
    },
    answer: "B",
    explanation: "FM tuzilmalari FM tadbirlarini mustaqil yoki qutqaruv xizmatlari va qutqaruv tuzilmalari, shuningdek harbiy davrda joylardagi harbiy qo'mondonlik organlari bilan hamkorlikda bajaradi.",
    mnemonic: "FM tuzilma: MUSTAQIL yoki qutqaruv tuzilmalari bilan HAMKORLIKDA",
    source: "10-sinf §20, 68-bet"
  },
  {
    id: 33, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — xalq xo'jaligi barqarorligi",
    difficulty: "Y2", cognitive: "Bilish", qtype: "single",
    question: "FM vazifalari orasida iqtisodiy barqarorlikka doir qaysi vazifa bor?",
    options: {
      A: "Harbiy sanoatni rivojlantirish",
      B: "Xalq xo'jaligi obyektlarining barqaror ishlashini ta'minlash yuzasidan tadbirlar kompleksini o'tkazish",
      C: "Chet el investitsiyalarini jalb etish",
      D: "Qishloq xo'jaligi mahsulotlari zahirasini to'plash"
    },
    answer: "B",
    explanation: "FM vazifalari: xalq xo'jaligi obyektlarining barqaror ishlashini ta'minlash yuzasidan tadbirlar kompleksini o'tkazish.",
    mnemonic: "FM iqtisod: XALQ XO'JALIGI barqaror ishlashi -> tadbirlar KOMPLEKSI",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 34, soha: "5. Fuqaro muhofazasi", subtopic: "FM vazifalari — qutqaruv",
    difficulty: "Y1", cognitive: "Bilish", qtype: "single",
    question: "FM ning shoshilinch amalga oshiriladigan asosiy faoliyatidan biri qanday nomlanadi?",
    options: {
      A: "Evakuatsiya rejalari",
      B: "Qutqaruv va boshqa kechiktirib bo'lmaydigan ishlarni o'tkazish",
      C: "Himoya tuzilmalarini qurish",
      D: "Aholi ro'yxatini yangilash"
    },
    answer: "B",
    explanation: "FM vazifalari: qutqaruv va boshqa kechiktirib bo'lmaydigan ishlarni o'tkazish.",
    mnemonic: "FM shoshilinch vazifa: QUTQARUV + kechiktirib bo'lmaydigan ISHLAR",
    source: "10-sinf §20, 67-bet"
  },
  {
    id: 35, soha: "5. Fuqaro muhofazasi", subtopic: "FV turlari — sel hodisasi",
    difficulty: "Y2", cognitive: "Qo'llash", qtype: "single",
    question: "1998-yilda Farg'onadagi Shohimardon qishlog'iga sel keldi. Bu qanday turdagi FV?",
    options: {
      A: "Texnogen — gidravlik avariya",
      B: "Tabiiy — gidrometeorologik (sel)",
      C: "Ekologik — gidrosfera holatining o'zgarishi",
      D: "Texnogen — suv ombori buzilishi"
    },
    answer: "B",
    explanation: "Sel gidrometeorologik xavfli hodisalarga kiradi — tabiiy xususiyatli FV. Shohimardon selida 52 ta xo'jalik, 36 ta dam olish maskani, 4 ta bolalar oromgohi ko'chirildi.",
    mnemonic: "Sel -> TABIIY + GIDROMETEOROLOGIK xavfli hodisa",
    source: "10-sinf §22, 76-bet"
  }
];

const out = "fan/chqbt_yangi/045_fv_ta'rif_vazifalari.json";
writeFileSync(out, JSON.stringify(data, null, 2), 'utf8');

// Verify
import { readFileSync } from 'fs';
const check = JSON.parse(readFileSync(out, 'utf8'));
console.log(`VALID: ${check.length} savol yozildi`);
