import { createQuestionBankFizika, balanceOptions } from './generator_core_fizika.mjs';

const templates = [
  // 1. Foton energiyasi va impulsi
  (qId, idx, target) => {
    const list = [
      { text: "yorug'lik to'lqinining tebranish chastotasi ν ikki marta oshirilsa", res: "har bir fotonning energiyasi E = h*ν to'g'ri proporsional 2 marta ortadi" },
      { text: "yorug'likning to'lqin uzunligi λ ikki barobarga qisqartirilsa", res: "fotonning impulsi p = h/λ va uning energiyasi aynan 2 marta ortadi" },
      { text: "monoxromatik yorug'lik nurining nurlanish intensivligi 3 marta oshirilsa", res: "fotonlar soni 3 marta ko'payadi, ammo har bir foton energiyasi o'zgarmaydi" },
      { text: "fotonning tinchlikdagi massasi m_0 haqida gap ketganda", res: "foton harakatda mavjud bo'lib uning tinchlikdagi massasi mutlaqo nolga tengdir" }
    ];
    const itm = list[idx % list.length];
    const q = `Kvant optikasi qonunlariga va Plank-Eynshteyn gipotezasiga asosan, agar ${itm.text}, fotonning qanday parametri kuzatiladi? (#${qId})`;
    const correct = `Kvant fizikasi qoidasiga ko'ra, ${itm.res}`;
    const distractors = [
      `Kvant fizikasi qoidasiga ko'ra, fotonning energiyasi har doim faqat muhitning dielektrik singdiruvchanligiga bog'liq bo'ladi`,
      `Kvant fizikasi qoidasiga ko'ra, fotonlar darhol o'z tezligini nolga tushirib elektronlarga aylanadi`,
      `Kvant fizikasi qoidasiga ko'ra, foton impulsi har qanday o'zgarishda butunlay o'zgarmas saqlanib qolaveradi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Foton xossalari (Olmasova, Optika, atom va yadro fizikasi): foton energiyasi E = h*ν = h*c/λ, impulsi p = h/λ = E/c. Fotonning tinchlikdagi massasi nolga teng (m_0 = 0), u faqat yorug'lik tezligida harakatlanadi.`,
      mnemonic: "Foton siri: Chastotasi kuch berur, to'lqin uzunligi impulsni qisar; tinch holati yo'q uning, yorug'likdek uchar.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 2. Fotoeffekt uchun Eynshteyn tenglamasi
  (qId, idx, target) => {
    const list = [
      { h_nu: 5.0, A: 2.0, Ek: 3.0 },
      { h_nu: 4.5, A: 1.5, Ek: 3.0 },
      { h_nu: 6.0, A: 2.5, Ek: 3.5 },
      { h_nu: 3.8, A: 1.8, Ek: 2.0 }
    ];
    const itm = list[idx % list.length];
    const q = `Metall sirtiga energiyasi h*ν = ${itm.h_nu} eV bo'lgan fotonlar oqimi tushmoqda. Ushbu metalldan elektronlarning chiqish ishi A = ${itm.A} eV ga teng bo'lsa, Eynshteyn tenglamasiga ko'ra urib chiqarilgan fotoelektronlarning maksimal kinetik energiyasi (E_k_max) qancha bo'ladi? (#${qId})`;
    const correct = `Fotoelektronlarning maksimal kinetik energiyasi ${itm.Ek} eV ga teng bo'ladi`;
    const distractors = [
      `Fotoelektronlarning maksimal kinetik energiyasi ${(itm.Ek + 1.5).toFixed(1)} eV ga teng bo'ladi`,
      `Fotoelektronlarning maksimal kinetik energiyasi ${(itm.Ek - 1.0).toFixed(1)} eV ga teng bo'ladi`,
      `Fotoelektronlarning maksimal kinetik energiyasi ${(itm.Ek + 2.5).toFixed(1)} eV ga teng bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Eynshteynning fotoeffekt tenglamasi (Turdiyev N.Sh., Fizika 11-sinf): h*ν = A + E_k_max. Bundan E_k_max = h*ν - A = ${itm.h_nu} - ${itm.A} = ${itm.Ek} eV. Tormozlovchi kuchlanish e*U_t = E_k_max.`,
      mnemonic: "Eynshteyn tenglamasi: Foton berar energiyasin, bir qismi chiqish ishi bo'lar, qolgani esa uchgan elektronning tezligiga aylanar.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 3. Fotoeffektning qizil chegarasi
  (qId, idx, target) => {
    const list = [
      { text: "tushayotgan nurning to'lqin uzunligi qizil chegaradan katta bo'lsa (λ > λ_0)", res: "nurlanish intensivligi qancha kuchli bo'lmasin fotoeffekt hodisasi mutlaqo yuz bermaydi" },
      { text: "tushayotgan nurning chastotasi qizil chegaraga teng bo'lsa (ν = ν_0)", res: "elektronlar sirtga chiqadi, ammo ularning maksimal kinetik energiyasi nolga teng bo'ladi" },
      { text: "tushayotgan nurning chastotasi oshirilganda (ν > ν_0)", res: "fotoelektronlarning maksimal kinetik energiyasi va ularning uchib chiqish tezligi ortadi" },
      { text: "qizil chegara to'lqin uzunligini hisoblash formulasi qaralganda", res: "u λ_0 = (h*c) / A ifodasi orqali moddaning chiqish ishiga teskari proporsional topiladi" }
    ];
    const itm = list[idx % list.length];
    const q = `Fotoeffektning qizil chegarasi (minimal chastotasi ν_0 yoki maksimal to'lqin uzunligi λ_0) bo'yicha tahlil qilinganda, agar ${itm.text}, qanday fizik qonuniyat tasdiqlanadi? (#${qId})`;
    const correct = `Stoletov va Eynshteyn qonuniga ko'ra, ${itm.res}`;
    const distractors = [
      `Stoletov va Eynshteyn qonuniga ko'ra, to'lqin uzunligi oshishi bilan fotoelektronlar soni cheksiz ko'payadi`,
      `Stoletov va Eynshteyn qonuniga ko'ra, fotonlar metall ichida to'planib qisqa tutashuv hosil qiladi`,
      `Stoletov va Eynshteyn qonuniga ko'ra, har qanday nurlanish ta'sirida chiqish ishi o'z-o'zidan nolga tushadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Fotoeffektning qizil chegarasi (Olmasova, Optika): h*ν_0 = A, bundan ν_0 = A/h va λ_0 = hc/A. Agar λ > λ_0 (chastota ν < ν_0) bo'lsa, foton energiyasi chiqish ishidan kichik bo'lib, yorug'lik qanchalik yorug' bo'lmasin fotoeffekt sodir bo'lmaydi.`,
      mnemonic: "Qizil chegara: Chiqish ishidan oshmasa foton, fotoeffekt bo'lmas hatto quyosh nuri tushsa ham ravon.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 4. Rezerford tajribasi va Bor postulatlari
  (qId, idx, target) => {
    const list = [
      { hodisa: "Rezerford tajribasida alfa zarrachalarning oltin folgadan sochilishida ayrim zarrachalar 90° dan katta burchakka qaytishi", sabab: "atomning deyarli butun massasi va musbat zaryadi markazdagi juda kichik o'lchamli yadroda to'planganini isbotladi" },
      { hodisa: "Borning birinchi postulati (statsionar holatlar postulati)", sabab: "atom statsionar holatlarda nur tarqatmaydi va nurlanish faqat bir statsionar sathdan ikkinchisiga o'tganda yuz beradi" },
      { hodisa: "Borning ikkinchi postulati (nurlanish chastotasi qoidasi)", sabab: "elektron E_n sathdan E_m sathga sakraganda chiqarilgan foton energiyasi h*ν = E_n - E_m tenglik bilan aniqlanadi" },
      { hodisa: "vodorod atomi spektrida chiziqli nurlanish spektrlarining hosil bo'lishi", sabab: "atomdagi energetik sathlarning diskret (kvantlangan) xarakterga ega ekanligi bilan tushuntiriladi" }
    ];
    const itm = list[idx % list.length];
    const q = `Atom tuzilishi va kvant nazariyasi rivojlanish tarixida, agar ${itm.hodisa} tahlil etilsa, bu qanday muhim fizik xulosa beradi? (#${qId})`;
    const correct = `Atom fizikasi qoidalariga ko'ra, u ${itm.sabab}`;
    const distractors = [
      `Atom fizikasi qoidalariga ko'ra, u atomning uzluksiz ravishda doimiy nurlanib energiyasini tezda yo'qotishini tasdiqlaydi`,
      `Atom fizikasi qoidalariga ko'ra, u elektronlarning yadroga tushib ketishi va atomlarning yemirilishini ko'rsatadi`,
      `Atom fizikasi qoidalariga ko'ra, u atom ichida faqat gravitatsion tortishish kuchlari hukmronligini bildiradi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Rezerford va Bor nazariyalari (Turdiyev N.Sh., Fizika 11-sinf): Rezerford yadro borligini kashf etdi. Bor esa klassik elektrodinamika ziddiyatini yechish uchun kvant postulatlarini kiritdi: atom statsionar sathlarda nur sochmalik va kvantlar orqali o'tish qiladi.`,
      mnemonic: "Bor postulatlari: Statsionar orbitada nur sochilmas, sathlar farqi esa foton bo'lib nurlanar beqiyos.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 5. Yadro tarkibi: protonlar va neytronlar
  (qId, idx, target) => {
    const list = [
      { nom: "Uran-238 (²³⁸₉₂U)", Z: 92, A: 238, N: 146 },
      { nom: "Uran-235 (²³⁵₉₂U)", Z: 92, A: 235, N: 143 },
      { nom: "Rontegiy-226 (Radium ²²⁶₈₈Ra)", Z: 88, A: 226, N: 138 },
      { nom: "Uglerod-14 (¹⁴₆C)", Z: 6, A: 14, N: 8 }
    ];
    const itm = list[idx % list.length];
    const q = `${itm.nom} izotopi yadrosining tarkibida nechta proton (Z), nechta neytron (N) va jami nechta nuklon (massa soni A) mavjud bo'ladi? (#${qId})`;
    const correct = `Yadroda ${itm.Z} ta proton, ${itm.N} ta neytron va jami ${itm.A} ta nuklon mavjud bo'ladi`;
    const distractors = [
      `Yadroda ${itm.N} ta proton, ${itm.Z} ta neytron va jami ${itm.A} ta nuklon mavjud bo'ladi`,
      `Yadroda ${itm.Z} ta proton, ${itm.N + 4} ta neytron va jami ${itm.A + 4} ta nuklon mavjud bo'ladi`,
      `Yadroda ${itm.Z - 2} ta proton, ${itm.N + 2} ta neytron va jami ${itm.A} ta nuklon mavjud bo'ladi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yadro tarkibi (Muminov, Atom yadrosi va zarralar fizikasi): yadro zaryad soni Z protonlar soniga, massa soni A nuklonlar umumiy soniga teng. Neytronlar soni N = A - Z = ${itm.A} - ${itm.Z} = ${itm.N} ta.`,
      mnemonic: "Yadro tarkibi: Z — zaryad va proton, A — nuklonlar jamlagan; A dan Z ni ayirsang neytron soni qolgan.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 6. Massa nuqsoni va bog'lanish energiyasi
  (qId, idx, target) => {
    const list = [
      { text: "erkin proton va neytronlar birlashib atom yadrosini hosil qilganda", res: "yadro massasi uni tashkil etgan alohida nuklonlar massalari yig'indisidan kichik bo'ladi (massa nuqsoni)" },
      { text: "massa nuqsoni Δm hosil bo'lishi jarayonida ajralib chiqadigan energiya", res: "Eynshteynning E = Δm*c² formulasiga ko'ra yadroning to'liq bog'lanish energiyasini tashkil etadi" },
      { text: "yadroning mustahkamligi va barqarorlik darajasi baholanganda", res: "solishtirma bog'lanish energiyasi (bitta nuklonga to'g'ri keluvchi energiya E_bog'/A) asosiy mezon hisoblanadi" },
      { text: "solishtirma bog'lanish energiyasi eng katta bo'lgan (≈ 8.8 MeV/nuklon) elementlar", res: "Mendeleyev davriy sistemasining o'rtasida joylashgan temir va nikel guruhi elementlaridir" }
    ];
    const itm = list[idx % list.length];
    const q = `Yadro fizikasi va yadroviy o'zaro ta'sir qonuniyatlariga asosan, agar ${itm.text}, qanday muhim xulosa to'g'ri hisoblanadi? (#${qId})`;
    const correct = `Yadro energetikasi qoidasiga ko'ra, ${itm.res}`;
    const distractors = [
      `Yadro energetikasi qoidasiga ko'ra, yadro massasi har doim alohida nuklonlar massasidan ikki barobar og'ir bo'lib chiqadi`,
      `Yadro energetikasi qoidasiga ko'ra, yadro hosil bo'lishida energiya ajralmasdan balki butunlay yutiladi`,
      `Yadro energetikasi qoidasiga ko'ra, barcha elementlarning solishtirma bog'lanish energiyasi mutlaqo bir xil qiymatga ega`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Yadro bog'lanish energiyasi (Muminov, Atom yadrosi va zarralar fizikasi): Δm = Z*m_p + N*m_n - M_yadro. Bog'lanish energiyasi E_bog' = Δm * c². Eng barqaror yadrolar Fe-56 atrofida (8.8 MeV/nuklon).`,
      mnemonic: "Bog'lanish energiyasi: Nuklonlar birikib yadro qurganda massa kamayib qudratli energiya to'kilur.",
      question_type: "Y1",
      bloom_level: "Mulohaza"
    };
  },

  // 7. Alfa va beta yemirilish
  (qId, idx, target) => {
    const list = [
      { tur: "alfa (α) yemirilish yuz berganda (geliy yadrosi ⁴₂He ajralishi)", ozgarish: "hosil bo'lgan yangi element davriy sistemada chapga 2 katak siljiydi, massasi 4 birlikka kamayadi" },
      { tur: "beta-minus (β⁻) yemirilish yuz berganda (elektron ⁰₋₁e ajralishi)", ozgarish: "yangi element davriy sistemada o'ngga 1 katak siljiydi, massa soni esa o'zgarmasdan saqlanadi" },
      { tur: "gamma (γ) nurlanish ajralib chiqqanda", ozgarish: "yuqori chastotali elektromagnit to'lqin tarqaladi, yadro tarkibi (Z va A) esa o'zgarmaydi" },
      { tur: "yadroda neytronning protonga aylanishi natijasida", ozgarish: "elektron va elektron antineytrino ajralib chiqib beta-minus nurlanish ro'y beradi" }
    ];
    const itm = list[idx % list.length];
    const q = `Radioaktiv yemirilish qonunlari va Soddi-Fayans siljish qoidalariga ko'ra, atom yadrosida ${itm.tur}, qanday o'zgarish sodir bo'ladi? (#${qId})`;
    const correct = `Siljish qoidasiga binoan, ${itm.ozgarish}`;
    const distractors = [
      `Siljish qoidasiga binoan, yangi element davriy sistemada birdaniga o'nta katak orqaga siljib ketadi`,
      `Siljish qoidasiga binoan, elementning barcha elektronlari bir lahzada yo'qolib yadro neytrallashadi`,
      `Siljish qoidasiga binoan, element butunlay barqaror bo'lib qolib hech qanday nurlanish qoldirmaydi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Siljish qoidalari (Turdiyev N.Sh., Fizika 11-sinf): α-yemirilish: ᴬ_Z X -> ᴬ⁻⁴_{Z-2} Y + ⁴_2 He (chapga 2 katak). β⁻-yemirilish: ᴬ_Z X -> ᴬ_{Z+1} Y + ⁰_{-1} e + ṽ (o'ngga 1 katak). γ-nurlanishda faqat energiya sathi o'zgaradi.`,
      mnemonic: "Siljish qoidasi: Alfa ketsa chapga 2, massadan 4 kamayar; beta ketsa o'ngga 1, massasi o'zgarmas qolar.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 8. Yarim yemirilish davri
  (qId, idx, target) => {
    const list = [
      { T: 5, t: 15, marta: 8 },
      { T: 10, t: 20, marta: 4 },
      { T: 3, t: 12, marta: 16 },
      { T: 8, t: 24, marta: 8 }
    ];
    const itm = list[idx % list.length];
    const q = `Radioaktiv izotopning yarim yemirilish davri T = ${itm.T} sutkaga teng. Vaqt o'tib t = ${itm.t} sutka o'tgach, ushbu preparatdagi yemirilmay qolgan radioaktiv yadrolar soni dastlabkisiga nisbatan necha marta kamayadi? (#${qId})`;
    const correct = `Yemirilmay qolgan yadrolar soni dastlabkisiga nisbatan ${itm.marta} marta kamayadi`;
    const distractors = [
      `Yemirilmay qolgan yadrolar soni dastlabkisiga nisbatan ${itm.marta * 2} marta kamayadi`,
      `Yemirilmay qolgan yadrolar soni dastlabkisiga nisbatan ${itm.marta / 2} marta kamayadi`,
      `Yemirilmay qolgan yadrolar soni dastlabkisiga nisbatan ${itm.marta + 6} marta kamayadi`
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: `Radioaktiv yemirilish qonuni (Muminov, Atom yadrosi va zarralar fizikasi): N = N_0 * 2^(-t/T). Yemirilish davrlari soni n = t / T = ${itm.t} / ${itm.T} = ${Math.log2(itm.marta)}. Yadrolar soni 2^n = 2^${Math.log2(itm.marta)} = ${itm.marta} marta kamayadi.`,
      mnemonic: "Yarim yemirilish: Har bir T o'tganda ikki barobar kamayur, n davrda esa ikki darajasi n marta ozayur.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  }
];

// Generate exactly 208 questions (IDs 1509–1716, topicId 182)
createQuestionBankFizika('06_atom_va_yadro_fizikasi.json', 182, 1509, 208, templates);
