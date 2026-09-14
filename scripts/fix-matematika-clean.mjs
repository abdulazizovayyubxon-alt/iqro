import fs from 'node:fs';
import path from 'node:path';

const ovFile = 'fan 4/_app/overrides/matematika.json';
const overrides = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, 'utf8')) : {};
const mat = JSON.parse(fs.readFileSync('fan 4/_app/matematika.json', 'utf8'));

// Convert existing keys to clean integer strings without leading zeros
const cleanedOverrides = {};
for (const [k, v] of Object.entries(overrides)) {
  const intKey = String(parseInt(k, 10));
  cleanedOverrides[intKey] = v;
}

let fixedAllAbove = 0;
let fixedHighRatio = 0;
let fixedTraps = 0;

// Specific hand-crafted fixes for the 13 trap questions
const trapFixes = {
  "507": [
    "Ushbu tengsizlik faqat x = 3 nuqtada qat'iy tenglik sifatida o'rinli bo'ladi",
    "Ushbu tengsizlik faqat [2, 4] oraliqdagi simmetrik nuqtalarda o'rinli bo'ladi",
    "Ushbu tengsizlik aniqlanish sohasidagi barcha x ∈ [1, 5] larda o'rinli bo'ladi",
    "Ushbu tengsizlik ildiz osti manfiy bo'lmaslik shartiga ko'ra yechimga ega emas"
  ],
  "1908": [
    "Dastlabki yillarda o'rganilgan barcha amaliy qoidalarni keyingi bosqichlarda o'zgarishsiz aynan takrorlash",
    "Boshlang'ich sinflarda o'tilgan tushunchalarni umumlashtirmasdan, bevosita yuqori bosqich formulasiga o'tish",
    "Mavzularning nazariy asoslarini faqat bitiruvchi sinfda bitta umumlashtiruvchi kurs sifatida jamlash",
    "Tushunchalarni har bir sinf bosqichida qaytadan, ammo yanada chuqurroq va kengroq darajada o'rganish"
  ],
  "2085": [
    "Mantiqiy, fazoviy, algoritmik va tanqidiy fikrlash hamda intellektual salohiyatni o'stirishga",
    "Standart shablon formulalar yordamida arifmetik hisoblash amallarini tezkorlik bilan bajarishga",
    "Nazariy qoidalar va ta'riflarni darslikdagi matn asosida xatosiz yoddan ifodalab berishga",
    "Doskada ko'rsatilgan tayyor hisob-kitob namunalarini daftarga namunali tartibda ko'chirib olishga"
  ],
  "2099": [
    "Murakkab gipotetik xulosalar chiqarish va aksiomatik mulohazalarni mustaqil isbotlash",
    "To'liq mavhum va aksiomatik deduktiv usullar yordamida xulosalarni mantiqiy asoslash",
    "Ko'rgazmali-obrazli va amaliy-harakatli fikrlash orqali tushunchalarni idrok qilish",
    "Belgilar tizimi va simvolik formulalar bilan bevosita abstrakt darajada mantiqiy ishlash"
  ],
  "2135": [
    "O'quvchilarda amaliy tajriba orqali mustaqil qoida yaratish ko'nikmasini shakllantirish",
    "Kichik yoshdagi o'quvchilarga tushunchalarni ko'rgazmali misollar vositasida tanishtirish",
    "O'quv vaqtini tejash va umumiy qoidadan xususiy holatlarga mantiqiy qat'iylik bilan o'tish",
    "Mavzuni tushuntirishda faqat tarixiy ma'lumotlar va empirik kuzatishlarga tayanish"
  ],
  "2201": [
    "Tanqidiy fikrlash, shartlarning to'liqligi va zaruriyligini mustaqil tahlil qilish ko'nikmasi",
    "Masalada berilgan barcha sonli ma'lumotlarni ketma-ket qo'shish va ko'paytirish ko'nikmasi",
    "Berilgan topshiriqni murakkab deb hisoblab, uni yechishdan butunlay voz kechish odati",
    "Har qanday masalada o'qituvchi beradigan tayyor ko'rsatmalarni kutib turish ko'nikmasi"
  ],
  "2397": [
    "Tayyor javob bermasdan, yo'naltiruvchi mantiqiy savollar berib o'quvchini haqiqatga mustaqil olib borish",
    "O'quvchilar xatoga yo'l qo'yganda darsni to'xtatib, to'g'ri formulani to'g'ridan-to'g'ri diktovka qilish",
    "Doskaga tayyor yechimni to'liq yozib qo'yib, o'quvchilardan tahlilsiz ko'chirib olishni talab etish",
    "O'quvchilar aytgan har qanday fikrni to'g'ri deb qabul qilib, xatolarni metodik muhokama qilmaslik"
  ],
  "2474": [
    "Geometrik shakllar yuzasi faqat standart to'rtburchak va uchburchak formulalariga tayanishi haqidagi qarashni",
    "O'z-o'ziga o'xshashlik, cheksiz rekursiv jarayonlar va tartibsizlik ichidagi qat'iy matematik qonuniyatni",
    "Fraktal tuzilmalarning amaliy hayot va tabiat bilan bog'liq bo'lmagan mavhum grafik tasvir ekanligini",
    "Rekursiv funksiyalar va algoritmlarning zamonaviy dasturlashda qo'llanilmaydigan nazariy usul ekanligini"
  ],
  "2497": [
    "O'quvchi mustaqil bajara olmaydigan, lekin o'qituvchi yordamida muvaffaqiyatli yechishi mumkin bo'lgan murakkablikda bo'lishi",
    "O'quvchi hech qanday qiyinchiliksiz mustaqil yechadigan, o'rganib qolgan odatiy arifmetik misollar darajasida bo'lishi",
    "O'quvchining yosh xususiyatlari va aqliy tayyorgarligi darajasidan yuqori bo'lgan o'ta murakkab savollardan iborat bo'lishi",
    "O'quvchilarning shaxsiy o'rganish tezligini inobatga olmagan holda umumiy o'rtacha talablar bilan cheklangan bo'lishi"
  ],
  "2552": [
    "Shaxsiy natijaga erishish uchun individual ishlash va guruhdoshlar bilan o'zaro hamkorlikdan chetlanish ko'nikmasini",
    "O'qituvchining har bir ko'rsatmasini so'zsiz bajarish va o'zining shaxsiy matematik qarashlarini bildirmaslik odatini",
    "Sinfda belgilangan intizom talablariga befarq bo'lish va o'quv qoidalariga rioya qilmaslik tendensiyasini",
    "O'z fikrini erkin ifoda etish, matematik mulohazalarni mustaqil himoya qilish va hamkorlikda qaror topish malakasini"
  ],
  "2561": [
    "Mumkin bo'lgan intizomsizlik va qiyinchiliklarni oldindan ko'ra bilib qoidalar o'rnatadi, reaktiv esa faqat sodir bo'lgach jazolaydi",
    "Reaktiv o'qituvchi muammolarni oldindan rejalashtiradi, proaktiv o'qituvchi esa faqat yuzaga kelgan hodisani bartaraf etadi",
    "Proaktiv o'qituvchi doimiy ravishda dars konspektiga tayanadi, reaktiv esa sinfdagi vaziyatga qarab o'quv rejasini o'zgartiradi",
    "Har ikkala o'qituvchi toifasi ham sinf muhitini boshqarishda bir xil an'anaviy ma'muriy jazo choralaridan foydalanadi"
  ],
  "2587": [
    "Dars jarayonida yangi metodik tushuntirish bermasdan, odatiy darslik misollarini tezkor yechib ko'rsatishida",
    "Faqat o'quvchilar bilan ishlashga qaratilib, taklif etilgan hamkasblar bilan kasbiy muloqot qilmasligida",
    "O'zining mualliflik metodik tizimini boshqa hamkasblariga amaliy faoliyat orqali o'rgatish va modellashtirishda",
    "O'qituvchining shaxsiy yutuqlari va pedagogik unvonlari to'g'risida axborot berish bilan chegaralanishida"
  ],
  "2590": [
    "Darsdagi muammolar o'z-o'zidan ijobiy hal bo'lishiga ishonib, metodik tayyorgarlik ko'rishni orqaga surish",
    "Har bir o'quvchining ichki ijobiy imkoniyatlari mavjudligiga va to'g'ri yondashuvda u albatta rivojlanishiga ishonish",
    "O'quvchilarning barcha noto'g'ri xatti-harakatlarini tahlil qilmasdan, ularni shartsiz qo'llab-quvvatlash",
    "O'zlashtirishi past bo'lgan o'quvchilar o'rniga faqat qobiliyatli o'quvchilar bilan ishlashni afzal ko'rish"
  ]
};

// Apply trap fixes
for (const [idStr, newOpts] of Object.entries(trapFixes)) {
  cleanedOverrides[idStr] = { opts: newOpts };
  fixedTraps++;
}

// Specific fixes for remaining ratio > 1.18 items
const ratioFixes = {
  "72": [
    "Ko'paytmaning qiymati $2$ soniga teng",
    "Ko'paytmaning qiymati $1$ soniga teng",
    "Ko'paytmaning qiymati $\\sqrt{2}$ ga teng",
    "Ko'paytmaning qiymati $\\sqrt[3]{2}$ ga teng"
  ],
  "127": [
    "Faqat $3$ va $5$ sonlariga bo'linadi (karrali)",
    "Bir vaqtning o'zida $5, 11, 13$ sonlariga bo'linadi",
    "Bir vaqtning o'zida $3, 7, 31$ sonlariga bo'linadi",
    "Faqat $7$ va $13$ sonlariga bo'linadi (karrali)"
  ],
  "173": [
    "Tenglama $1$ ta to'rt karrali haqiqiy ildizga ega",
    "Tenglama $4$ ta turli haqiqiy ildizga ega bo'ladi",
    "Tenglama $2$ ta turli haqiqiy ildizga ega bo'ladi",
    "Tenglama birorta ham haqiqiy ildizga ega emas"
  ],
  "201": [
    "Kvadratik ko'paytuvchilardan biri $x^2 - \\sqrt{2}x + 1$",
    "Kvadratik ko'paytuvchilardan biri $x^2 - 2x + 1$ ifoda",
    "Kvadratik ko'paytuvchilardan biri $x^2 + 1$ bo'ladi",
    "Kvadratik ko'paytuvchilardan biri $x^2 - x + 1$ ifoda"
  ],
  "206": [
    "$P(a) = 0$ va $P'(a) = 0$ bo'lib, yuqori hosilasi nol emas",
    "$P(a) = 0$, $P'(a) = 0$, $P''(a) = 0$ va $P'''(a) \\neq 0$",
    "$P(a) = 0$, $P'''(a) = 0$ va qolgan hosilalar ixtiyoriy",
    "$P(a) = 0$ va $P'(a) \\neq 0$ sharti bajarilishi kerak"
  ],
  "222": [
    "Tenglama aynan $7$ ta haqiqiy ildizga ega",
    "Tenglama aynan $1$ ta haqiqiy ildizga ega",
    "Tenglama aynan $3$ ta haqiqiy ildizga ega",
    "Tenglama birorta ham haqiqiy ildizga ega emas"
  ],
  "264": [
    "Kvadratlar yig'indisi $F_n^2 + F_{n+1}^2$ ifodaga teng",
    "Kvadratlar yig'indisi $F_{n+1}^2 - 1$ ifodaga teng",
    "Kvadratlar yig'indisi $F_{2n}$ umumiy ifodaga teng",
    "Kvadratlar yig'indisi $F_n F_{n+1}$ ko'paytmaga teng"
  ],
  "315": [
    "O'sish oraliqlari faqat $[2, +\\infty)$ yarim to'g'ri chiziq",
    "O'sish oraliqlari $[-2, 0) \\cup (0, 2]$ oraliqlar birlashmasi",
    "O'sish oraliqlari $(-\\infty, -2] \\cup [2, +\\infty)$ to'plam",
    "O'sish oraliqlari $(-\\infty, 0) \\cup (0, +\\infty)$ to'plam"
  ],
  "316": [
    "Tenglama birorta ham haqiqiy ildizga ega emas",
    "Tenglama aynan $5$ ta haqiqiy ildizga ega bo'ladi",
    "Tenglama aynan $3$ ta haqiqiy ildizga ega bo'ladi",
    "Tenglama aynan $1$ ta haqiqiy ildizga ega bo'ladi"
  ],
  "354": [
    "Hosila aynan $3$ ta turli haqiqiy ildizga ega",
    "Hosila aynan $2$ ta turli haqiqiy ildizga ega",
    "Hosila aynan $1$ ta karrali haqiqiy ildizga ega",
    "Hosila birorta ham haqiqiy ildizga ega emas"
  ],
  "358": [
    "Ekvivalent ifoda $x^2$ kattalikka teng bo'ladi",
    "Ekvivalent ifoda $\\frac{x^2}{2}$ kattalikka teng bo'ladi",
    "Ekvivalent ifoda $x$ kattalikka teng bo'ladi",
    "Ekvivalent ifoda $\\frac{x^2}{4}$ kattalikka teng bo'ladi"
  ],
  "424": [
    "Tengsizlik hech qanday butun sonli yechimga ega emas",
    "Tengsizlikning butun yechimlari soni $2$ taga teng bo'ladi",
    "Tengsizlikning butun yechimlari soni $3$ taga teng bo'ladi",
    "Tengsizlikning butun yechimlari soni faqat $1$ ta ($x = 4$)"
  ],
  "512": [
    "Tenglamaning ikkita ildizi mavjud bo'lib, yig'indisi $2$ ga teng",
    "Tenglamaning yagona ildizi mavjud bo'lib, qiymati $x = -1$ bo'ladi",
    "Tenglama manfiy ildiz osti sababli haqiqiy ildizlarga ega emas",
    "Tenglamaning yagona ildizi mavjud bo'lib, yig'indisi $1$ ga teng"
  ],
  "539": [
    "Tenglamaning yagona haqiqiy ildizi $x = 2$ soniga teng",
    "Tenglamaning yagona haqiqiy ildizi $x = 1$ soniga teng",
    "Tenglamaning yagona haqiqiy ildizi $x = \\log_3 6.25$ ga teng",
    "Tenglamaning yagona haqiqiy ildizi $x = 0$ soniga teng"
  ],
  "573": [
    "Yechimlar to'plami $(\\frac{1+\\sqrt{5}}{2}, +\\infty)$ oraliqdan iborat",
    "Yechimlar to'plami $(1, +\\infty)$ oraliqdagi barcha sonlardan iborat",
    "Yechimlar to'plami $(1, 2)$ oraliqdagi barcha sonlardan iborat bo'ladi",
    "Ushbu tengsizlik birorta ham haqiqiy sonli yechimlar to'plamiga ega emas"
  ],
  "894": [
    "Limit qiymati $\\frac{1}{4}$ ga teng bo'ladi",
    "Limit qiymati $\\frac{1}{2}$ ga teng bo'ladi",
    "Limit qiymati $1$ soniga teng bo'ladi",
    "Limit qiymati $2$ soniga teng bo'ladi"
  ],
  "895": [
    "Limit natijasi $\\frac{2}{3}$ kasrga teng",
    "Limit natijasi $3$ butun songa teng",
    "Limit natijasi $\\frac{3}{2}$ kasrga teng",
    "Limit natijasi $6$ butun songa teng"
  ],
  "931": [
    "$x = -3$ da 2-tur uzilish, $x = 3$ da 1-tur uzilish mavjud",
    "$x = -3$ da 1-tur uzilish, $x = 3$ da 1-tur uzilish mavjud",
    "$x = -3$ da 1-tur uzilish, $x = 3$ da 2-tur uzilish mavjud",
    "$x = -3$ da 2-tur uzilish, $x = 3$ da 2-tur uzilish mavjud"
  ],
  "938": [
    "Hosila qiymati $\\frac{\\sqrt{3}}{3}$ ga teng bo'ladi",
    "Hosila qiymati $\\frac{2\\sqrt{3}}{3}$ ga teng bo'ladi",
    "Hosila qiymati $2\\sqrt{3}$ ga teng bo'ladi",
    "Hosila qiymati $\\sqrt{3}$ ga teng bo'ladi"
  ]
};

for (const [idStr, newOpts] of Object.entries(ratioFixes)) {
  cleanedOverrides[idStr] = { opts: newOpts };
  fixedHighRatio++;
}

mat.forEach(q => {
  const srcId = String(parseInt(q.docId.replace('matematika_', ''), 10));
  let opts = cleanedOverrides[srcId]?.opts ? [...cleanedOverrides[srcId].opts] : [...q.opts];
  let changed = false;
  opts = opts.map(opt => {
    if (/\bmutlaqo to'g'ri\b/i.test(opt)) {
      changed = true;
      return opt.replace(/\bmutlaqo to'g'ri\b/gi, "to'g'ri");
    }
    return opt;
  });
  if (changed) {
    cleanedOverrides[srcId] = { opts };
    fixedTraps++;
  }
});

fs.writeFileSync(ovFile, JSON.stringify(cleanedOverrides, null, 2) + '\n', 'utf8');
console.log(`✅ Matematika to'liq sozlandi:`);
console.log(`   - Jami overrides: ${Object.keys(cleanedOverrides).length}`);
console.log(`   - Traplar tuzatildi: ${fixedTraps}`);
console.log(`   - Ratio nomutanosibliklari tuzatildi: ${fixedHighRatio}`);
