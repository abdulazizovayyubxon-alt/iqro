import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, 'fan', 'boshlangich');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const blocks = [
  {
    block: "001-010",
    topic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
    questions: [
      {
        id: 1,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y1",
        bloom_level: "Bilish",
        source_construct: "Alifbodagi harf va tovush munosabati",
        requires_image: false,
        question: "O'zbek lotin alifbosida nechta harf va nechta harfiy belgi mavjud?",
        options: {
          A: "29 ta harf, 1 ta harfiy belgi",
          B: "28 ta harf, 1 ta harfiy belgi (tutuq belgisi)",
          C: "26 ta harf, 3 ta harfiy belgi",
          D: "30 ta harf, 2 ta harfiy belgi"
        },
        answer: "B",
        explanation: "O'zbek lotin alifbosi 29 ta birlikdan iborat bo'lib, ulardan 28 tasi harf, 1 tasi esa harfiy belgi (tutuq belgisi - apostrof) hisoblanadi."
      },
      {
        id: 2,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y1",
        bloom_level: "Bilish",
        source_construct: "Unli tovushlarning asosiy xususiyatlari",
        requires_image: false,
        question: "Unli tovushlarning asosiy xususiyati to'g'ri ko'rsatilgan javobni aniqlang.",
        options: {
          A: "Havo oqimining to'siqqa uchrab chiqishi natijasida hosil bo'ladi va faqat shovqindan iborat.",
          B: "Havo oqimining nutq a'zolarida hech qanday to'siqqa uchramay, erkin chiqishi natijasida hosil bo'ladi, ton (ovoz)dan iborat bo'lib, bo'g'in hosil qiladi.",
          C: "Faqat shovqindan iborat bo'lib, bo'g'in hosil qila olmaydi.",
          D: "Ovoz va shovqinning ishtirokiga ko'ra jarangli va jarangsizga bo'linadi."
        },
        answer: "B",
        explanation: "Unli tovushlar talaffuz etilganda havo oqimi og'iz bo'shlig'ida to'siqqa uchramaydi, ovoz (ton)dan iborat bo'ladi va o'zbek tilida bo'g'in hosil qiluvchi asosiy vositadir."
      },
      {
        id: 3,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y1",
        bloom_level: "Bilish",
        source_construct: "Undosh tovushlarning guruhlanishi",
        requires_image: false,
        question: "Undosh tovushlar ovoz va shovqinning ishtirokiga ko'ra qanday guruhlarga bo'linadi?",
        options: {
          A: "Cho'ziq va qisqa undoshlar",
          B: "Jarangli va jarangsiz undoshlar",
          C: "Yumshoq va qattiq unlilar",
          D: "Old va orqa qator undoshlar"
        },
        answer: "B",
        explanation: "Undosh tovushlar ovoz va shovqinning ishtirokiga ko'ra jarangli va jarangsiz undoshlarga bo'linadi."
      },
      {
        id: 4,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Tovush va harf nisbatini aniqlash",
        requires_image: false,
        question: "Berilgan so'zlardan tarkibida undosh tovushlar soni unli tovushlar sonidan roppa-rosa ikki barobar ko'p bo'lgan so'zni toping.",
        options: {
          A: "Qalam",
          B: "Maktab",
          C: "Sinf",
          D: "Uy"
        },
        answer: "B",
        explanation: "'Maktab' so'zida unlilar soni 2 ta (a, a), undoshlar soni 4 ta (m, k, t, b). Undoshlar unlilardan 2 marta ko'p. 'Qalam'da 2 unli va 3 undosh. 'Sinf'da 1 unli va 3 undosh. 'Uy'da 1 unli va 1 undosh."
      },
      {
        id: 5,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Harfiy birikmalar va tovush nisbati",
        requires_image: false,
        question: "Qaysi so'zda harflar soni tovushlar sonidan ko'p?",
        options: {
          A: "Maktab",
          B: "Singil",
          C: "Qalam",
          D: "Kitob"
        },
        answer: "B",
        explanation: "'Singil' so'zida 'ng' harflar birikmasi til orqa burun undoshi [ŋ] tovushini ifodalagani sababli, 6 ta harfga (s, i, n, g, i, l) 5 ta tovush to'g'ri keladi."
      },
      {
        id: 6,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Faqat unlidan iborat bo'g'inlarni aniqlash",
        requires_image: false,
        question: "Quyidagi gapda tarkibida faqat unli tovushlar ishtirok etgan bo'g'in mavjud so'zni aniqlang: 'Oila - muqaddas vatan'.",
        options: {
          A: "Oila",
          B: "muqaddas",
          C: "vatan",
          D: "bunday so'z yo'q"
        },
        answer: "A",
        explanation: "'Oila' so'zi bo'g'inlarga ajratilganda 'O-i-la' shaklida bo'ladi. Birinchi bo'g'in 'O' va ikkinchi bo'g'in 'i' faqat unli tovushdan iborat bo'g'inlardir."
      },
      {
        id: 7,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Unli va undosh nisbati",
        requires_image: false,
        question: "'Jaholat' so'zidagi unli va undosh tovushlar soni nisbati qanday?",
        options: {
          A: "3 ta unli, 4 ta undosh",
          B: "2 ta unli, 5 ta undosh",
          C: "4 ta unli, 3 ta undosh",
          D: "3 ta unli, 3 ta undosh"
        },
        answer: "A",
        explanation: "'Jaholat' so'zida unlilar: a, o, a (3 ta); undoshlar: j, h, l, t (4 ta). Demak, 3 ta unli, 4 ta undosh bor."
      },
      {
        id: 8,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y3",
        bloom_level: "Mulohaza qilish",
        source_construct: "Harf va tovush nomuvofiqligini lingvistik asoslash",
        requires_image: false,
        question: "O'qituvchi o'quvchilarga 'Har doim ham harflar soni tovushlar soniga teng bo'lavermaydi' qoidasini tushuntirdi. Quyidagi qaysi so'zlar juftligi bu qoidani tasdiqlaydi?",
        options: {
          A: "Maktab, Daftar",
          B: "Bahor, Quyosh",
          C: "Ko'ngil, E'lon",
          D: "Gul, O'rik"
        },
        answer: "C",
        explanation: "'Ko'ngil' so'zida 'ng' birikmasi bitta tovushni ifodalaydi (6 harf, 5 tovush). 'E'lon' so'zida tutuq belgisi (') harfiy belgi bo'lib, alohida tovush bildirmaydi (5 harf, 4 tovush). Ikkala so'zda ham harflar soni tovushlar sonidan ko'p."
      },
      {
        id: 9,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y3",
        bloom_level: "Mulohaza qilish",
        source_construct: "Tovush va harf qoidalarini tanqidiy tahlil qilish",
        requires_image: false,
        question: "Quyidagi mulohazalardan qaysilari to'g'ri?\n1. Nutq tovushlari yozuvda harflar bilan ifodalanadi.\n2. O'zbek tilidagi barcha harflar faqat bitta tovushni ifodalaydi.\n3. Tutuq belgisi alifboda harf hisoblanmaydi, u harfiy belgi.\n4. 'o`' va 'g`' harflari tarkibidagi belgi tutuq belgisi bilan bir xil vazifani bajaradi.",
        options: {
          A: "1, 3",
          B: "2, 4",
          C: "1, 2, 3",
          D: "3, 4"
        },
        answer: "A",
        explanation: "1 (tovushlar harflar bilan yoziladi) va 3 (tutuq belgisi harf emas, belgi) to'g'ri. 2 noto'g'ri (chunki 'e', 'yo' kabi harflar yoki harfiy birikmalar turli vazifaga ega). 4 noto'g'ri (o' va g' dagi belgilar harf shakllantiruvchi, tutuq belgisi esa alohida funksional belgi)."
      },
      {
        id: 10,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
        difficulty: "Y3",
        bloom_level: "Mulohaza qilish",
        source_construct: "Yozma va og'zaki nutqdagi harf-tovush farqlarini tahlil qilish",
        requires_image: false,
        question: "Yozuvda tovush va harf munosabatini o'rganuvchi o'quvchi quyidagi jadvalni tuzdi. Jadvaldagi qaysi so'zda xatolikka yo'l qo'yilgan?\nA) So'z: 'Daraxt' | Harflar: 6 | Tovushlar: 6\nB) So'z: 'Lola' | Harflar: 4 | Tovushlar: 4\nC) So'z: 'E'lon' | Harflar: 5 | Tovushlar: 5\nD) So'z: 'Piyoda' | Harflar: 6 | Tovushlar: 7",
        options: {
          A: "A qatorda",
          B: "B qatorda",
          C: "C qatorda",
          D: "D qatorda"
        },
        answer: "C",
        explanation: "'E'lon' so'zida harflar soni 5 ta (e, ', l, o, n) bo'lsa-da, tutuq belgisi mustaqil tovush ifodalamagani uchun tovushlar soni 4 ta (e, l, o, n) bo'ladi. C variantida xatolik mavjud."
      }
    ]
  },
  {
    block: "011-020",
    topic: "Jarangli va jarangsiz undosh tovushlar",
    questions: [
      {
        id: 11,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y1",
        bloom_level: "Bilish",
        source_construct: "Jarangli va jarangsiz undoshlarning farqi",
        requires_image: false,
        question: "O'zbek tilida jarangli va jarangsiz undoshlar qanday farqlanadi?",
        options: {
          A: "Tovush paychalarining tebranishi (ovozi) ishtirokiga ko'ra",
          B: "Talaffuz o'rniga ko'ra",
          C: "Talaffuz usuliga ko'ra",
          D: "Bo'g'in hosil qilish xususiyatiga ko'ra"
        },
        answer: "A",
        explanation: "Jarangli undoshlar talaffuzida un paychalari tebranib, ovoz va shovqin ishtirok etadi. Jarangsizlarda esa un paychalari tebranmaydi, faqat shovqindan iborat bo'ladi."
      },
      {
        id: 12,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y1",
        bloom_level: "Bilish",
        source_construct: "Jarangli undoshlarni aniqlash",
        requires_image: false,
        question: "Quyidagi undoshlardan qaysi biri jarangli undosh hisoblanadi va uning jarangsiz jufti mavjud?",
        options: {
          A: "L",
          B: "V",
          C: "M",
          D: "N"
        },
        answer: "B",
        explanation: "'V' jarangli undosh bo'lib, uning jarangsiz jufti 'F'dir. 'L', 'M', 'N' esa sonor undoshlar bo'lib, ularning jarangsiz jufti yo'q."
      },
      {
        id: 13,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y1",
        bloom_level: "Bilish",
        source_construct: "Jarangli jufti yo'q jarangsiz undoshlar",
        requires_image: false,
        question: "O'zbek adabiy tilida qaysi jarangsiz undosh tovushning jarangli jufti yo'q?",
        options: {
          A: "Sh",
          B: "Ch",
          C: "H",
          D: "P"
        },
        answer: "C",
        explanation: "'H' (bo'g'iz undoshi) jarangsiz undosh bo'lib, uning jarangli jufti mavjud emas. Qolganlarining jufti bor (P-B, Ch-J, Sh-J)."
      },
      {
        id: 14,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Faqat jarangli undoshli so'zlarni topish",
        requires_image: false,
        question: "Tarkibida faqat jarangli undoshlar ishtirok etgan so'zni aniqlang.",
        options: {
          A: "Kitob",
          B: "Bahor",
          C: "Daryo",
          D: "Paxta"
        },
        answer: "C",
        explanation: "'Daryo' so'zidagi undoshlar: 'd', 'r', 'y' bo'lib, barchasi jarangli. 'Kitob'da k, t (jarangsiz), 'Bahor'da h (jarangsiz), 'Paxta'da p, x, t (jarangsiz) undoshlari bor."
      },
      {
        id: 15,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Jarangli undoshlarning jarangsizlashuvi",
        requires_image: false,
        question: "Berilgan so'zlardan qaysi birining oxiridagi jarangli undosh nutqda jarangsizlashib talaffuz etiladi?",
        options: {
          A: "Kitob",
          B: "Barg",
          C: "Obod",
          D: "Barcha javoblar to'g'ri"
        },
        answer: "D",
        explanation: "O'zbek tili talaffuz me'yorlariga ko'ra, so'z oxirida kelgan jarangli undoshlar (b, d, g, z) jarangsizlashib [p, t, k, s] tarzida talaffuz qilinadi: Kitob -> [Kitop], Barg -> [Bark], Obod -> [Obot]."
      },
      {
        id: 16,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Jarangsiz undoshlar sonini hisoblash",
        requires_image: false,
        question: "Quyidagi gapda jarangsiz undoshlar sonini aniqlang: 'Toshkent - go'zal shahar.'",
        options: {
          A: "4 ta",
          B: "5 ta",
          C: "6 ta",
          D: "7 ta"
        },
        answer: "C",
        explanation: "Gapdagi jarangsiz undoshlar: T, sh, k, t (Toshkent so'zida) va sh, h (shahar so'zida). Jami 6 ta jarangsiz undosh mavjud."
      },
      {
        id: 17,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y2",
        bloom_level: "Qo‘llash",
        source_construct: "Jarangli undoshlarning mos jarangsizini topish",
        requires_image: false,
        question: "'Baland' so'zi oxiridagi jarangli undosh qaysi jarangsiz undosh tovushga almashib talaffuz etiladi?",
        options: {
          A: "[p]",
          B: "[t]",
          C: "[k]",
          D: "[s]"
        },
        answer: "B",
        explanation: "'Baland' so'zi 'd' jarangli undoshi bilan tugaydi. Og'zaki nutqda so'z oxiridagi 'd' uning jarangsiz jufti bo'lgan [t] tovushiga almashib talaffuz etiladi: [balant]."
      },
      {
        id: 18,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y3",
        bloom_level: "Mulohaza qilish",
        source_construct: "Undoshlar juftligini tekshirish va tahlil qilish",
        requires_image: false,
        question: "O'quvchi jarangli va jarangsiz undoshlar juftligi jadvalini tuzdi. Ushbu juftliklardan qaysi birida xatolikka yo'l qo'yilgan?\n1. b - p\n2. d - t\n3. g - k\n4. z - s\n5. j - ch\n6. g' - x",
        options: {
          A: "4-juftlikda",
          B: "5-juftlikda",
          C: "6-juftlikda",
          D: "Barcha juftliklar to'g'ri"
        },
        answer: "C",
        explanation: "'g'' jarangli undoshining jarangsiz jufti 'q' tovushidir. 'x' ning jarangli jufti esa 'g'' emas, balki til orqa 'g'' tovushining jufti emas. Shuning uchun 6-juftlik xato."
      },
      {
        id: 19,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y3",
        bloom_level: "Mulohaza qilish",
        source_construct: "Jarangli undoshlar imlo muammolarini hal etish",
        requires_image: false,
        question: "So'z oxirida jarangli undoshlarning jarangsizlashishi hodisasi imloviy xatolarga sabab bo'ladi. Buni bartaraf etish va so'z oxiridagi harfni aniqlash uchun qaysi grammatik qoidadan foydalaniladi?",
        options: {
          A: "So'zga unli bilan boshlanadigan qo'shimcha qo'shib tekshiriladi.",
          B: "So'zga undosh bilan boshlanadigan qo'shimcha qo'shiladi.",
          C: "So'z bo'g'inlarga ajratiladi.",
          D: "So'zning oxirgi tovushi tushirib yoziladi."
        },
        answer: "A",
        explanation: "So'z oxiridagi jarangli undoshni aniqlash uchun unli bilan boshlanadigan qo'shimcha qo'shiladi (kitob + i = kitobi, barg + i = bargi). Bunda jarangli undosh o'z holini saqlab talaffuz etiladi va imlosi aniq bo'ladi."
      },
      {
        id: 20,
        subject: "Boshlang‘ich ta’lim",
        topic: "Ona tili",
        subtopic: "Jarangli va jarangsiz undosh tovushlar",
        difficulty: "Y3",
        bloom_level: "Mulohaza qilish",
        source_construct: "Undoshlar guruhining fonetik tahlili",
        requires_image: false,
        question: "Quyidagi so'zlar guruhini tahlil qiling: 'qop, xat, soch, po'kak'. Ushbu so'zlar uchun umumiy bo'lgan fonetik xususiyat qaysi javobda to'g'ri ko'rsatilgan?",
        options: {
          A: "Barcha so'zlarda kamida bitta jarangli undosh ishtirok etgan.",
          B: "Ushbu so'zlarning barchasida faqat jarangsiz undoshlar qatnashgan.",
          C: "Barcha so'zlar unli tovush bilan boshlangan.",
          D: "So'zlarda faqat portlovchi undoshlar mavjud."
        },
        answer: "B",
        explanation: "'qop' (q, p), 'xat' (x, t), 'soch' (s, ch), 'po'kak' (p, k, k) so'zlaridagi barcha undoshlar jarangsiz undoshlar hisoblanadi. Shuning uchun bu so'zlarda faqat jarangsiz undoshlar ishtirok etgan."
      }
    ]
  }
];

// Write the two blocks to separate files
const block1 = {
  block: "001-010",
  topic: "Alifbo, harf va tovush tushunchalari, unli va undosh tovushlar",
  questions: blocks[0].questions
};

const block2 = {
  block: "011-020", // wait, block 2 corresponds to Questions 11-20 (Block 002)
  topic: "Jarangli va jarangsiz undosh tovushlar",
  questions: blocks[1].questions
};

// Fix the block field to reflect the standard requested naming format:
// Block 001: 001-010.json -> block field: "001-010"
// Block 002: 011-020.json -> block field: "011-020"
fs.writeFileSync(path.join(outputDir, '001-010.json'), JSON.stringify(block1, null, 2), 'utf8');
fs.writeFileSync(path.join(outputDir, '011-020.json'), JSON.stringify(block2, null, 2), 'utf8');

console.log("✅ Written first two blocks (001-010 and 011-020).");
