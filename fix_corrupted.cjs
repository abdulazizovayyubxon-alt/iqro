/**
 * questions_1.js dagi buzilgan (corrupted) savollarni to'g'ri savollar bilan almashtiradi
 * Lines 310-358 (0-indexed: 309-357)
 */
const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src', 'data', 'questions_1.js');
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

// Yangi to'g'ri savollar
const newQuestions = `{
    q: "Qurolli kuchlardagi intizomiy jazo tizimining asosida qanday tushuncha yotadi?",
    opts: ["A) Jismoniy zarar yetkazish", "B) Xatosini tushunib e'tirof etishi va kelajakda qoidani mustahkam saqlashi uchun tarbiyaviy pedagogik ta'sir ko'rsatish", "C) Moddiy zarar undirib olish", "D) Xizmatdan butunlay chetlatish"],
    correct: 1,
    explanation: "Intizomiy jazo faqat jazolash uchun emas, balki harbiy xizmatchining xatosini anglab, kelajakda qoidaga rioya qilishini mustahkamlash uchun tarbiyaviy ta'sir ko'rsatishdir.",
      mnemonic: "Nizom - bu harbiy tartib asosi."
  },
{
    q: "Umumharbiy nizomlar bo'yicha harbiy xizmatchining shaxsiy ishi (avtobiografiyasi) qaysi hujjatda to'liq saqlanadi?",
    opts: ["A) Siyosiy qaydnoma", "B) Komandir buyrug'i va xizmat guvohnomasi", "C) Bilet va yo'llanma", "D) Shaxsiy ish yuritish hujjati (harbiy bileti va shaxsiy varaqasi)"],
    correct: 3,
    explanation: "Harbiy bilet va shaxsiy varaqasi harbiy xizmatchining butun xizmat tarixini, unvonlarini, mukofotlarini va boshqa barcha muhim ma'lumotlarni rasmiy tarzda saqlaydi.",
      mnemonic: "Kalit so'zga e'tibor bering va javobni vizuallashtiring."
  },
{
    q: "Harbiy qo'shin turlari safda bo'lganida harbiy xizmatchi qurol bilan qanday tekshiruv tartibiga rioya qilishi kerak?",
    opts: ["A) Faqat tashqi ko'rinishini tekshirish", "B) Qurolning tozaligi, bo'shligi va yaroqliligini to'liq tekshirish, o'qlarning xavfsiz holatini nazorat qilish", "C) Tarbiychiga topshirish va kuzatish", "D) Qurolni qo'ldan qo'ymasdan kutish"],
    correct: 1,
    explanation: "Safda qurol tekshiruvi nizomga ko'ra qurolning tozaligi, ishga yaroqliligi va o'qlarning xavfsiz holatda ekanligini to'liq nazorat qilishni talab qiladi.",
      mnemonic: "Kalit so'zga e'tibor bering va javobni vizuallashtiring."
  },
{
    q: "Soqchiga postda turganda shubhali shaxsga nisbatan qanday tartibda ogohlantirish beriladi?",
    opts: ["A) 'To'xta, kim kelyapti' deb so'raydi", "B) 'Stoy, kim idyot?', keyin 'Stoy, nazad!' — javob bermasa ogohlantirish o'qi, bo'ysunmasa nishonga olish!", "C) Qurolning tugmasini bosadi va keyingi qadam bog'liq", "D) To'xtash buyrug'i berib, telefon orqali qo'ng'iroq qiladi"],
    correct: 1,
    explanation: "Soqchi postida shubhali shaxsni to'xtatish uchun avval og'zaki buyruq beradi ('Stoy, kim idyot?'), javob olinmasa ogohlantirish o'qi otadi, bo'ysunmasa nishonga olish huquqiga ega.",
      mnemonic: "Kalit so'zga e'tibor bering va javobni vizuallashtiring."
  },
{
    q: "Harbiy xizmatchilarning tashqi ko'rinishi (soch va soqol) bo'yicha saf ko'rigida qanday talab qo'yiladi?",
    opts: ["A) Soch va qalin soqol qo'yish taqiqlangan, yuz toza bo'lishi shart", "B) Mo'ylov bo'lmasa bo'lmasligiga ustav qoida qilmagan", "C) Tishlarning oppoq qilib tozalashiga e'tibor qaratiladi", "D) Baland bo'yliligiga ruxsat faqat yuqori unvonlilar beradi"],
    correct: 0,
    explanation: "Ustav harbiylarning kiyimi, boshi va butunlay soqol va mo'ylovlarining gigienik va askariy qoidasiga ko'ra muntazam toza qirilishini talab qilib, qat'iy tartibga soladi.",
      mnemonic: "Kalit so'zga e'tibor bering va javobni vizuallashtiring."
  },
{
    q: "Buyruq berishning nizomiy tartibi bo'yicha joriy buyruq xato ekanligi aniqlansa nima qilinadi?",
    opts: ["A) Ixtiyoriy ravishda hech narsa aytilmaydi", "B) Buyruq bajarilgandan so'ng boshliqqa xato haqida hisobot beriladi va xato tuzatiladi", "C) Qurol qo'ldan chiqariladi", "D) O'xshash buyruq qaytadan berilguniga qadar kutiladi"],
    correct: 1,
    explanation: "Buyruq xato berilganida ham avval bajariladi, keyin boshliqqa hisobot beriladi va xatoni tuzatish uchun yangi buyruq chiqariladi — bu nizomiy tartib hisoblanadi.",
      mnemonic: "Kalit so'zga e'tibor bering va javobni vizuallashtiring."
  },`;

// Lines 310-358 (1-indexed) = array indices 309-357
const before = lines.slice(0, 309);  // 1-309
const after = lines.slice(358);      // 359+

const newContent = [...before, ...newQuestions.split('\n'), ...after].join('\n');
fs.writeFileSync(filepath, newContent, 'utf8');

console.log('✅ 6 ta buzilgan savol muvaffaqiyatli almashtirildi!');
console.log('Oldingi qatorlar: 310-358');
console.log('Yangi savollar soni: 6 ta');
