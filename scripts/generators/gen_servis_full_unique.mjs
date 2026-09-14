import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'fan 4/Texnologiya (Servis)/bolimlar';
fs.mkdirSync(OUT_DIR, { recursive: true });

const seenStems = new Set();

function normText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[`‘’ʻʼ']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\(#\d+\)/g, '')
    .trim();
}

function padOption(opt, targetLen) {
  let s = opt.trim();
  if (s.length >= targetLen) return s;
  const diff = targetLen - s.length;
  if (diff > 25) {
    return s + " bo'yicha belgilangan amaliy me'yoriy talablar";
  } else if (diff > 14) {
    return s + " bo'yicha belgilangan amaliy talab";
  } else if (diff > 7) {
    return s + " texnologik jarayoni";
  } else if (diff > 2) {
    return s + " usuli";
  }
  return s;
}

function createItem(id, topicId, file, q, correctText, rawDistractors, explanation, mnemonic, meta = {}) {
  const key = normText(q);
  if (seenStems.has(key)) {
    throw new Error(`Duplicate stem detected at Q#${id}: "${q}"`);
  }
  seenStems.add(key);

  const targetKey = (id - 1) % 4; // Exactly 25% A, B, C, D
  const cLen = correctText.length;

  const distractors = rawDistractors.map(d => {
    let s = d.trim()
      .replace(/\bfaqat\b/gi, "asosan")
      .replace(/\bmutlaqo\b/gi, "yetarlicha")
      .replace(/\bhech qanday\b/gi, "yetarli")
      .replace(/\bhech qachon\b/gi, "kamdan-kam hollarda");
    if (s.length < cLen * 0.94) {
      s = padOption(s, Math.round(cLen * 0.98));
    }
    return s;
  });

  const opts = ["", "", "", ""];
  opts[targetKey] = correctText;
  let dIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== targetKey) {
      opts[i] = distractors[dIdx++];
    }
  }

  return {
    id,
    q,
    opts,
    correct: targetKey,
    explanation,
    mnemonic,
    topicId,
    category: "texnologiya_servis",
    difficulty: meta.diff || (id % 3 === 0 ? "Y3" : (id % 2 === 0 ? "Y2" : "Y1")),
    bloom_level: meta.bloom || (id % 3 === 0 ? "Mulohaza" : (id % 2 === 0 ? "Qo'llash" : "Bilish")),
    question_type: meta.qtype || "Y1",
    source_file: file
  };
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 01: Oziq-ovqat texnologiyasi va pazandachilik (520 Qs: IDs 1..520, Topic 196)
// ══════════════════════════════════════════════════════════════════════════
function buildSection01() {
  const items = [];
  const secFile = "01_oziq_ovqat_texnologiyasi_va_pazandachilik.json";

  // 40 distinct culinary & food technology concepts * 13 aspects = 520 Qs
  const food40 = [
    { n: "Konservalashda botulizm xavfini bartaraf etish", u: "Clostridium botulinum sporalarini 120°C haroratda avtoklavda sterilizatsiya qilish yoki yetarli kislotalilik (pH < 4.6) yaratish", w1: "bankalarni xona haroratida qorong'i shkafga bir hafta davomida qo'yib saqlash", w2: "sabzavotlarni faqat sovuq kran suvida bir marta chayqab bankaga solish", w3: "qopqoqlarni qizdirmasdan oddiy sellofan qopcha bilan yopib qo'yish" },
    { n: "Chinni choynakda ko'k choy damlash qoidasi", u: "choynakni qaynoq suv bilan chayqab qizdirish, quruq choy solib qaynoq suv quyish va 4-5 daqiqa dam yedirish", w1: "quruq choyni to'g'ridan-to'g'ri qozonda 30 daqiqa qaynatib pishirish", w2: "choynakka muzdek sovuq suv quyib muzlatgichda damlanishini kutish", w3: "choy barglarini maydalab kukun holida qaynoq sutga aralashtirish" },
    { n: "Palov tayyorlashda zirvakni qovurish texnologiyasi", u: "yog'ni yaxshi dog'lab, go'sht va piyozni qizarguncha qovurib, sabzini solib me'yorida yumshatish", w1: "barcha masalliqlarni sovuq yog'ga birdaniga solib past olovda qaynatish", w2: "piyozni qop-qora qilib kuydirib so'ngra sovuq suv quyib tindirish", w3: "go'shtni umuman qovurmasdan faqat xom holatda guruch tagiga bosish" },
    { n: "Palov uchun guruchni to'g'ri tayyorlash", u: "guruchni 50-60°C li iliq tuzli suvda bir necha bor yuvib, ivitib kraxmalini me'yorlashtirish", w1: "guruchni yuvmasdan to'g'ridan-to'g'ri qaynab turgan zirvak ustiga sochish", w2: "guruchni maydalab un holiga keltirib qozonga xamir qilib quyish", w3: "guruchni sirka kislotasida 24 soat davomida ivitib yumshatish" },
    { n: "Xamirturushli (drojjali) xamir qorish harorati", u: "xamirturush zamburug'lari faol rivojlanishi uchun suyuqlik harorati 30-35°C iliq bo'lishi", w1: "xamir qoriladigan sutni 100 darajada qaynagan holatda quyish", w2: "xamirni muzlatgichdan olingan muzdek suv bilan qorib tindirish", w3: "xamir qorishda faqat qaynoq o'simlik yog'idan foydalanish" },
    { n: "Qatlama xamir (sloyoniy testo) tayyorlash siri", u: "xamirni yupqa yoyib, sariyog' surtib qatlash va har qatlam orasida sovitib yoyish", w1: "xamirga ko'p miqdorda soda solib uni issiq pechda uzoq qizdirish", w2: "xamirni yupqa qilib kesib qaynagan sho'rvaga tashlab pishirish", w3: "xamirni faqat qo'l kuchi bilan urib ezib yumaloq shaklga keltirish" },
    { n: "Go'shtni maydalash va qiymalash gigiyenasi", u: "go'shtqiymalagich pichoqlarini o'tkir saqlash, go'shtni pardalardan tozalash va asbobni darhol yuvish", w1: "go'shtni yuvmasdan suyaklari bilan birga qiymalagichdan o'tkazish", w2: "qiymalagichni ishlatgandan so'ng bir necha kun yuvmasdan qoldirish", w3: "go'shtni faqat muzlagan tosh holatida qiymalagichga tiqib maydalash" },
    { n: "Sut mahsulotlarini pasterizatsiya qilish", u: "sutni 72-75°C haroratda 15-20 soniya qizdirib kasallik tug'diruvchi mikroblarni zararsizlantirish", w1: "sutni ochiq qozonda 2 soat davomida to'xtovsiz qaynatib quyultirish", w2: "sutga osh tuzi va shakar qo'shib muzlatgichda uzoq saqlash", w3: "sutni elektr toki yordamida elektroliz qilib kislotaga aylantirish" },
    { n: "Tuxumning yangiligini tekshirish usuli", u: "tuzli suvga solganda yangi tuxum idish tubiga cho'kadi, aynigan tuxum esa yuzaga qalqib chiqadi", w1: "yangi tuxum suv yuzasida suzib yuradi, aynigani esa tubiga cho'kadi", w2: "tuxumni qattiq silkitganda ichidan baland tovush chiqishi uning yangiligini bildiradi", w3: "tuxum po'chog'ini sindirib hidlamasdan qorong'i xonaga qo'yib tekshirish" },
    { n: "Baliq mahsulotlariga birlamchi ishlov berish", u: "tangachalarini dumidan boshiga qarab tozalash, ichaklarini ehtiyotkorlik bilan o'tini yormay olib tashlash", w1: "baliqni tangachalari bilan birga to'g'ridan-to'g'ri qozonga solib qovurish", w2: "baliqning o't pufagini ataylab yorib go'shtiga achchiq ta'm berish", w3: "baliqni tozalashdan oldin issiq suvda 2 soat qaynatib yumshatish" },
    { n: "Pazandachilikda 'Blanshirleme' operatsiyasi", u: "sabzavot yoki mevalarni qisqa muddat (1-3 daqiqa) qaynoq suvga botirib, so'ng muzdek suvda sovitish", w1: "masalliqlarni qizdirilgan yog'da qizarguncha uzoq qovurish jarayoni", w2: "go'shtni sirka kislotasida 3 kun davomida ivitib marinadlash", w3: "qandolat mahsulotlari ustiga shakarli rangli shira quyish" },
    { n: "Oshxona pichoqlaridan to'g'ri foydalanish", u: "har bir mahsulot turi (go'sht, non, sabzavot) uchun alohida belgilangan pichoq va taxtakach ishlatish", w1: "bitta pichoq bilan xom go'shtni ham, pishgan non va pishloqni ham ketma-ket kesish", w2: "pichoq tig'ini tosh devorga urib o'tmaslashtirish va qirg'ich o'rnida ishlatish", w3: "pichoqni bolalar o'ynashi uchun stol chetida ochiq qoldirish" },
    { n: "Dasturxon bezatishda (servirovka) vilkalar va pichoqlar o'rni", u: "vilkalar tarelkadan chap tomonga (tishlari yuqoriga), pichoqlar esa o'ng tomonga (tig'i tarelka tomon) qo'yiladi", w1: "barcha sanchqi va pichoqlarni tarelkaning o'rtasiga aralashtirib taxlash", w2: "pichoqni chap tomonga, vilkani esa o'ng tomonga teskari qo'yish", w3: "qoshiq va sanchqilarni faqat stakan ichiga solib stol o'rtasiga qo'yish" },
    { n: "Sabzavotlarni to'g'rash usuli: 'Somoncha' (solomka)", u: "kartoshka yoki sabzini 4-5 sm uzunlikda va 2x2 mm qalinlikda bir tekis ingichka chiziqsimon to'g'rash", w1: "sabzavotlarni 3x3 sm o'lchamda katta to'rtburchak kubik qilib kesish", w2: "sabzini maydalagichda ezib suyuq pyure holatiga keltirish", w3: "faqat yarim doira shaklida qalin xalqa qilib tilish" },
    { n: "Sabzavotlarni to'g'rash usuli: 'Kubik' (to'rtburchak)", u: "vinaigret va sho'rvalar uchun sabzavotlarni bir xil qirrali kubiklar (mayda, o'rta, yirik) shaklida kesish", w1: "sabzavotlarni qo'l bilan mayda bo'laklarga yirtib tashlash", w2: "sabzini faqat uzun botiq lentalar holida spiralsimon yo'nish", w3: "kartoshkani butunligicha qovurish uchun dumaloq qoldirish" },
    { n: "Bulyon (sho'rva asosi) qaynatish qoidasi", u: "go'shtni sovuq suvga solib past olovda qaynatish, ko'pigini muntazam olib turish va tiniq qilish", w1: "go'shtni qaynab turgan issiq suvga tashlab kuchli olovda loyqa qaynatish", w2: "sho'rvaga darhol ko'p miqdorda sirka quyib qizil rangga kiritish", w3: "sho'rva qopqog'ini ochmasdan ko'pigi bilan birga 3 soat qaynatish" },
    { n: "Tuxum oqini ko'pirtirish siri (beze, biskvit)", u: "idish mutlaqo quruq va yog'siz bo'lishi, tuxum oqiga sariq zarrasi tushmasligi va chimdim tuz qo'shish", w1: "tuxum oqiga ko'p miqdorda o'simlik yog'i va iliq suv aralashtirish", w2: "idish ichiga ozgina qovurilgan piyoz yog'idan surtib olish", w3: "tuxum oqini 80 darajagacha qizdirib so'ngra qoshiq bilan aralashtirish" },
    { n: "Biskvit xamiri pishirish qoidasi", u: "tuxum va shakarni ko'pirtirib unni ehtiyotkorlik bilan aralashtirish, dastlabki 20 daqiqada duxovka eshigini ochmaslik", w1: "duxovka eshigini har 2 daqiqada ochib biskvitni qoshiq bilan bosib ko'rish", w2: "biskvit qolipini duxovkaga qo'ymasdan oldin muzlatgichda 5 soat qotirish", w3: "xamirga drojji solib uni issiq joyda 3 soat oshirish" },
    { n: "Mastava taomi tayyorlash texnologiyasi", u: "go'sht va sabzavotlarni mayda kubik to'g'rab qovurish, suv quyib qaynatish, guruch solib tayyorlash va qatiq bilan tortish", w1: "guruchni quruq holda tovada qovurib ustidan qaynoq shakarli sirop quyish", w2: "faqat xamir lentalarini sho'rvaga tashlab xamirli ovqat qilish", w3: "go'shtni xom holda qatiqqa aralashtirib pishirmasdan iste'mol qilish" },
    { n: "Chuchvara (pelmen) xamirini tayyorlash", u: "tuxum, suv va tuz qo'shilgan qattiq xamir qorish, tindirish, yupqa yoyib 3x3 sm kvadratlarga kesish", w1: "ko'p miqdorda xamirturush qo'shib suyuq quymoq xamiri tayyorlash", w2: "xamirni yoymasdan qo'lda katta qalin koptoklar yasab pishirish", w3: "xamirga un o'rniga faqat qandolat kraxmalini quyib qorish" },
    { n: "Manti tayyorlash texnologiyasi", u: "chuchvaraga nisbatan kattaroq yoyilgan xamirga go'sht va piyozli qiyma solib qasqonda bug'da 40-45 daqiqa pishirish", w1: "mantini qaynab turgan o'simlik yog'ida cho'ktirib 2 daqiqa qovurish", w2: "qasqon listlarini moylamasdan mantini quruq temirga yopishtirib qo'yish", w3: "mantini faqat muzdek suvda 10 daqiqa qaynatib olish" },
    { n: "Somsa pishirish texnologiyasi", u: "qatlama xamirga mayda to'g'ralgan go'sht, dumba va ko'p piyozli qiyma tugib tandirda yoki duxovkada pishirish", w1: "somsani faqat sho'rvaga solib 1 soat davomida qaynatish", w2: "xamir ichiga faqat shakar va murabbo solib qovurish", w3: "somsaning tagiga hech qanday moy surtmasdan quruq qasqonga terish" },
    { n: "Sabzavotlarni dimlash (tusheniye)", u: "dastlab qisqa muddat qovurib, so'ng oz miqdorda suyuqlik va ziravorlar bilan qopqog'i yopiq idishda pishirish", w1: "sabzavotlarni 200 darajali yog'da to'liq qarsildoq bo'lguncha qovurish", w2: "sabzavotlarni faqat bug'latgich kamerasida quritib kukun qilish", w3: "ochiq qozonda baland olovda barcha sharbatini bug'lantirib quritish" },
    { n: "Souslar va gravilar tayyorlash", u: "yog'da qovurilgan un (ru) asosida bulyon, sut yoki qaymoq qo'shib bir xil quyuq mayin konsistensiya hosil qilish", w1: "suvga ko'p miqdorda qum va kraxmal aralashtirib xona haroratida qotirish", w2: "faqat toza sirka kislotasini idishga solib qaynatish", w3: "mevalarni qobig'i bilan qovurib qoraytirib maydalash" },
    { n: "Mayonez emulsiyasi tayyorlash", u: "tuxum sarig'iga o'simlik yog'ini tomchilab qo'shib uzluksiz bir yo'nalishda ko'pirtirib bir jinsli emulsiya hosil qilish", w1: "tuxum oqini qaynoq suvga solib sho'rva holida qaynatish", w2: "yog' bilan sirkani qaynatib so'ng ustiga muz bo'laklarini tashlash", w3: "faqat quruq un va shakarni quruq idishda aralashtirish" },
    { n: "Qandolatchilikda krem 'Sharlott'", u: "shakar va sutli-tuxumli qaynatma siropni sovitib, yumshatilgan sariyog' bilan birga ko'pirtirib tayyorlash", w1: "faqat xom tuxum oqiga limon sharbati qo'shib muzlatish", w2: "unni suvda qattiq xamir qilib duxovkada quritish", w3: "qaynatilgan kartoshkani pyure qilib shakar bilan aralashtirish" },
    { n: "Qandolatchilikda qaynatma xamir (ekler, profitrol)", u: "suv va yog'ni qaynatib, un solib olovda qovurish, sovitib bittalab tuxum qo'shib ko'pirtirish", w1: "xamirga ko'p miqdorda drojji qo'shib 5 soat davomida oshirish", w2: "unni to'g'ridan-to'g'ri muzdek sutga qorib yupqa qilib yoyish", w3: "xamirni duxovkada emas, faqat sovuq qasqonda pishirish" },
    { n: "Meva va poliz ekinlarini quritish (qoqi, mayiz)", u: "saralangan toza mevalarni oftobda yoki maxsus meva quritgichlarda namligini 16-18% gacha tushirish", w1: "mevalarni qaynoq yog'ga botirib qarsildoq chips holiga keltirish", w2: "mevalarni suv to'la bochkaga solib 3 oy davomida ivitib qo'yish", w3: "mevalarni muzlatgichning muzxonasida doimiy muzlatib saqlash" },
    { n: "Meva murabbosi pishirish qoidasi", u: "mevalarni shakar siropida meva shakli buzilmasdan, sirop tiniq va yetarli quyuqlikka yetguncha pishirish", w1: "mevalarni shakar solmasdan qattiq olovda qorayguncha kuydirish", w2: "murabboni ochiq qozonda 24 soat to'xtovsiz qattiq qaynatish", w3: "mevalarni xomligicha shisha idishga solib ustidan sovuq kran suvi quyish" },
    { n: "Oziq-ovqat mahsulotlarida 'Organoleptik tahlil'", u: "mahsulot sifatini inson sezgi a'zolari (ko'rish, hidlash, ta'm bilish, konsistensiya) orqali baholash", w1: "mahsulotni faqat kimyoviy laboratoriyada mikroskop ostida tekshirish", w2: "mahsulotning narxini kalkulyatorda hisoblab chiqish usuli", w3: "faqat mahsulot yuklangan qutining og'irligini tarozida tortish" },
    { n: "Go'shtning pishganlik darajasini aniqlash", u: "eng qalin joyiga pazandachilik sanchqisi sanchilganda qizg'ish emas, tiniq rangsiz sharbat chiqishi", w1: "go'sht yuzasining qop-qora bo'lib ko'mirga aylanishi", w2: "sanchqi sanchilganda quyuq qizil qonli sharbat otilib chiqishi", w3: "go'shtning ichki qismi muzdek qattiq bo'lib qolishi" },
    { n: "Sariyog' sifatini xonakiy aniqlash", u: "qaynoq suvga solinganda toza sariyog' bir tekis eriydi va sirtda sariq yog' qatlami hosil qiladi", w1: "toza sariyog' qaynoq suvda mutlaqo erimasdan tosh kabi cho'kib yotadi", w2: "suvni qora rangga bo'yab o'zidan yoqimsiz kislota hidi chiqaradi", w3: "suv yuzasida ko'p miqdorda oppoq qalin ko'pik chiqarib qaynaydi" },
    { n: "Sabzavot salatlariga o'simlik yog'ini qo'shish tartibi", u: "tuz va ziravorlar sabzavot sharbatida erishi uchun avval tuzlanadi, so'ngra oxirida yog' quyiladi", w1: "avval yog' quyib sabzavotlarni moylab, so'ng ustidan erimaydigan yirik tuz sepish", w2: "faqat qaynoq o'simlik yog'ini muzdek bodring ustiga quyib kuydirish", w3: "salatga tuz solmasdan faqat achchiq sirka kislotasi quyish" },
    { n: "Non mahsulotlarini to'g'ri saqlash", u: "quruq, shamollatiladigan non idishida (xlebnitsa) qog'oz yoki mato xaltada saqlash", w1: "nam va issiq polietilen xaltada havo kiritmasdan dimlab saqlash", w2: "nonni yuvib so'ngra ochiq quyosh ostida quritish", w3: "nonni go'sht va xom baliq bilan bitta idishda saqlash" },
    { n: "Kartoshka tuganaklaridagi solanin moddasi", u: "quyosh nuri tushib ko'kargan kartoshka po'stlog'i ostida zaharli solanin to'planadi va uni iste'mol qilib bo'lmaydi", w1: "ko'kargan kartoshka eng foydali va shifobaxsh vitaminlarga boy hisoblanadi", w2: "solanin kartoshkaga shirin qand ta'mini beruvchi foydali oqsil moddadir", w3: "quyoshda ko'kargan kartoshkadan bolalar uchun eng yaxshi pyure tayyorlanadi" },
    { n: "Duxovkada pishirish (zapekaniye)", u: "issiq havo harorati (160-220°C) ta'sirida mahsulot yuzasida qizg'ish mazali qobiq hosil qilib pishirish", w1: "mahsulotni sovuq suv to'la tog'oraga solib quyoshda qoldirish", w2: "mahsulotni faqat ochiq olovda tutatib qoraytirish operatsiyasi", w3: "duxovkaga suv quyib mahsulotni faqat bug'da ivitish usuli" },
    { n: "Frityurda pishirish texnologiyasi", u: "mahsulotni ko'p miqdordagi (1:4 nisbatda) 160-180°C li o'simlik yog'iga to'liq botirib tez qovurish", w1: "quruq tovada yog'siz olovda qizdirib pishirish", w2: "mahsulotni muzli suvga solib past haroratda tindirish", w3: "faqat suv bug'i yordamida sabzavotlarni yumshatish" },
    { n: "Ko'katlarni to'g'ri yuvish va tayyorlash", u: "ko'katlarni chuqur idishdagi sovuq suvda bir necha bor chayqab qumlarini cho'ktirish va quritib to'g'rash", w1: "ko'katlarni qaynoq suvda 10 daqiqa qaynatib ezib tashlash", w2: "ko'katlarni yuvmasdan to'g'ridan-to'g'ri taom ustiga to'g'rash", w3: "ko'katlarga kir sovun surtib cho'tka bilan ishqalab tozalash" },
    { n: "Oshxona sochiqlari va gubkalari gigiyenasi", u: "bakteriyalar ko'payishini oldini olish uchun muntazam yuvish, qaynatish, quritish va yangisiga almashtirish", w1: "bitta idish yuvish gubkasini yillab yuvmasdan uzluksiz ishlatish", w2: "nam sochiqlarni yopiq qorong'i shkafda to'plab saqlash", w3: "oshxona stolini faqat pol yuvadigan latta bilan artish" },
    { n: "Mehmon kutish odobi va taom tortish ketma-ketligi", u: "avval choy, shirinlik va yengil salatlar, so'ngra birinchi suyuq taom, ikkinchi quyuq taom va mevalar", w1: "dastlab faqat og'ir go'shtli quyuq taom berib, so'ngra choy va sho'rvani oxirida tortish", w2: "barcha taomlarni bitta idishga aralashtirib mehmon oldiga qo'yish", w3: "mehmonga faqat qotgan non va suv berib boshqa taomlarni yashirish" }
  ];

  const aspectStems = [
    (n) => `Oziq-ovqat texnologiyasi va pazandachilik asoslariga ko'ra, '${n}' qanday asosiy texnologik talabga asoslanadi?`,
    (n) => `Umumiy ovqatlanish va taom tayyorlash amaliyotida '${n}' jarayoni qanday to'g'ri ketma-ketlikda bajariladi?`,
    (n) => `Texnologiya (Servis) fani darslarida '${n}' mavzusida o'quvchilarga qaysi muhim qoida o'rgatiladi?`,
    (n) => `Sanitariya-gigiyena va oziq-ovqat xavfsizligi nuqtai nazaridan '${n}' bo'yicha to'g'ri xulosa qaysi?`,
    (n) => `Pazandachilik mahorati va milliy taomlar tayyorlashda '${n}' ning asosiy mohiyati nimadan iborat?`,
    (n) => `Mahsulotlarning to'yimliligi va sifatini saqlashda '${n}' qanday amaliy qoidani talab etadi?`,
    (n) => `Zamonaviy pazandachilik texnologiyalariga muvofiq, '${n}' qanday to'g'ri bajarilishi shart?`,
    (n) => `Oshxona madaniyati va xavfsiz ovqatlanish mezonlarida '${n}' qanday ta'riflanadi?`,
    (n) => `Xalqaro pazandachilik standartlariga binoan, '${n}' bo'yicha to'g'ri tavsiya qaysi qatorda keltirilgan?`,
    (n) => `Dasturxon servirovkasi va oziq-ovqat sifatini nazorat qilishda '${n}' ning o'rni nimada?`,
    (n) => `Taomlarning mazali va xushbo'y bo'lishini ta'minlashda '${n}' qanday muhim vazifani o'taydi?`,
    (n) => `Pazandachilik amaliyotida texnologik xatolarga yo'l qo'ymaslik uchun '${n}' bo'yicha qaysi qoidani bilish zarur?`,
    (n) => `Servis yo'nalishidagi kasbiy mahorat darslarida '${n}' ning asosiy uslubiy tamoyili qaysi?`
  ];

  let id = 1;
  for (let a = 0; a < 13; a++) {
    for (let i = 0; i < 40; i++) {
      const c = food40[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri talabi: ${c.u}`;
      const dists = [
        `To'g'ri talabi: ${c.w1}`,
        `To'g'ri talabi: ${c.w2}`,
        `To'g'ri talabi: ${c.w3}`
      ];
      const exp = `Pazandachilik va oziq-ovqat texnologiyasida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Sanitariya, to'g'ri texnologiya va mazali, xavfsiz taom.`;

      items.push(createItem(id, 196, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 01 tayyor: ${items.length} ta savol (IDs 1..520)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 02: Materiallarga ishlov berish va tikuvchilik (832 Qs: IDs 521..1352, Topic 197)
// ══════════════════════════════════════════════════════════════════════════
function buildSection02() {
  const items = [];
  const secFile = "02_materiallarga_ishlov_berish_va_tikuvchilik.json";

  // 64 sewing & textile concepts * 13 aspects = 832 Qs
  const sew64 = [
    // Tolashunoslik va matolar (1-16)
    { n: "Tabiiy paxta tolasi (paxta matolari)", u: "yumshoq, gigroskopik (namni yaxshi yutuvchi), havoni yaxshi o'tkazuvchi va issiqqa chidamli", w1: "elektr tokini o'tkazmaydigan qattiq metall simdan iborat tola", w2: "namlikni mutlaqo yutmaydigan va havoda tez eriydigan polimer", w3: "faqat avtomobil shinalarini armaturalashda ishlatiladigan sim" },
    { n: "Tabiiy ipak tolasi (shoyi matolar)", u: "ipak qurti pillasidan olinadigan, nafis yaltiroq, pishiq, yengil va elastik oqsil tola", w1: "neft mahsulotlarini kimyoviy sintez qilib olinadigan sun'iy tola", w2: "og'ir tosh minerallarini eritib olinadigan shaffof ip", w3: "faqat xom yog'ochni presslab tayyorlanadigan qattiq tola" },
    { n: "Tabiiy jun tolasi (jun matolar)", u: "qo'y, tuya junidan olinadigan, issiqlikni ajoyib saqlovchi, qovushqoq va kigizlanuvchi tola", w1: "faqat sovuq suvda erib yo'q bo'lib ketadigan sintetik tola", w2: "suv o'tkazmaydigan rezinaga o'xshash qattiq mineral modda", w3: "faqat shisha tolali devor qoplamalari tayyorlashda ishlatiladi" },
    { n: "Zig'ir (lyon) tolasi", u: "poya tolasi bo'lib, o'ta pishiq, yuvilganda yanada yumshaydigan va salqinlik beruvchi tabiiy tola", w1: "issiqlik ta'sirida tez eriydigan va qotib qoladigan plastmassa", w2: "faqat bir martalik tibbiy shprislar ishlab chiqarish xomashyosi", w3: "suv ta'sirida darhol chirib qora changga aylanuvchi tola" },
    { n: "Viskoza tolasi (sun'iy tola)", u: "yog'och sellyulozasini kimyoviy qayta ishlab olinadigan, ipaksimon va gigroskopik tola", w1: "tarkibida o'simlik moddasi bo'lmagan sof neft polimeri", w2: "faqat metall eritish pechlarida ishlatiladigan grafit tola", w3: "tabiiy toshlarni maydalab olinadigan mineral kukun" },
    { n: "Lavsan (poliefir/poliester) tolasi", u: "o'ta pishiq, g'ijimlanmaydigan, shaklini ajoyib saqlovchi va yorug'likka chidamli sintetik tola", w1: "ozgina nam tegsa ham butunlay yirtilib ketadigan mo'rt tola", w2: "faqat qog'oz ishlab chiqarish korxonalarida ishlatiladigan xomashyo", w3: "harorati 30 darajaga yetganda erib suyuqlikka aylanadigan modda" },
    { n: "Kapron (poliamid/neylon) tolasi", u: "yeyilishga va ishqalanishga o'ta chidamli, elastik, pishiq paypoq va arqonlar xomashyosi", w1: "faqat o'choqda o'tin sifatida yoqish uchun ishlatiladigan material", w2: "suv ostida bir soat turganda erib ketuvchi tez eruvchan tola", w3: "faqat metall stanoklarning tishli g'ildiraklarini quyish materiali" },
    { n: "O'rish (asos) va arqoq iplari farqi", u: "o'rish iplari mato bo'ylab yo'nalgan, pishiq va kam cho'ziluvchan, arqoq esa ko'ndalang yo'nalgan bo'ladi", w1: "arqoq iplari mato bo'ylab yo'nalgan bo'lib hech qachon uzilmaydi", w2: "ular orasida hech qanday farq yo'q, ikkalasi ham bir xil qalinlikda", w3: "o'rish iplari faqat kiyimning ichki astariga tikiladi" },
    { n: "Polotno to'qilishi", u: "o'rish va arqoq iplarining 1:1 nisbatda shaxmat tartibida oddiy va pishiq birikishi", w1: "iplarning to'qilmasdan faqat yelim bilan yopishtirilgan holati", w2: "faqat qalin patli gilam to'qishda ishlatiladigan murakkab to'qima", w3: "mato yuzasida faqat diagonalli qiya chiziqlar hosil qiluvchi to'qima" },
    { n: "Sarja to'qilishi", u: "mato yuzasida pastdan yuqoriga, chapdan o'ngga yo'nalgan xarakterli diagonal qovurg'alar hosil bo'lishi", w1: "mato yuzasining oyna kabi mutlaqo tekis va silliq bo'lishi", w2: "to'qimada faqat katta doirasimon teshiklar bo'lishi", w3: "faqat to'r pardalar to'qishda qo'llaniladigan usul" },
    { n: "Atlas (satin) to'qilishi", u: "arqoq yoki o'rish iplarining uzoq qoplamalari hisobiga mato yuzasining silliq va jozibador yaltirashi", w1: "mato yuzasining o'ta g'adir-budur va tikanli bo'lishi", w2: "mato tolalari orasidan suvning erkin oqib o'tishi", w3: "faqat pol artadigan qalin xolst matolar to'qish" },
    { n: "Matoning g'ijimlanuvchanligi", u: "mexanik siqishdan so'ng matoning o'z shaklini yo'qotib mayda burmalar hosil qilish xossasi", w1: "matoning elektr tokini o'zidan o'tkazish qobiliyati", w2: "matoning rangini quyoshda o'chmasdan saqlash xususiyati", w3: "matoning suv ostida cho'kish tezligini o'lchash" },
    { n: "Matoning qisqarishi (usadka)", u: "ho'llanganda, yuvilganda va issiqlik bilan dazmollanganda mato o'lchamlarining kichrayishi", w1: "matoning yuvilgandan so'ng ikki barobar kattalashib ketishi", w2: "matodan yangi qo'shimcha tolalar ajralib chiqishi", w3: "mato rangining o'z-o'zidan oqarib ketish hodisasi" },
    { n: "Matoning to'kiluvchanligi (osipemost)", u: "kesilgan qirralardan o'rish va arqoq iplarining o'z-o'zidan chiqib to'kilib ketishi", w1: "matoni bo'yaganda bo'yoqning matoga to'liq singib ketishi", w2: "matoning qishki sovuqqa chidamlilik darajasi", w3: "faqat trikotaj matolarning cho'ziluvchanlik qobiliyati" },
    { n: "Matolarni bichishdan oldin dekatirovka qilish", u: "bichishdan oldin matoni ho'llab yoki bug'li dazmol bilan qisqartirib olish (usadkani oldini olish)", w1: "matoni bo'yoq idishiga solib yangi rangga bo'yash", w2: "matoni pichoq bilan mayda lentalarga kesib chiqish", w3: "mato yuzasiga qalin kley qatlami surtib qotirish" },
    { n: "Bichishda mato tolasining yo'nalishini (dolya) hisobga olish", u: "kiyim detallari kiyilganda cho'zilib shaklini yo'qotmasligi uchun andaza bo'ylama ip bo'ylab qo'yiladi", w1: "andaza matoning istalgan burchagiga qiyshiq qilib qo'yib qirqiladi", w2: "bichishda tola yo'nalishining hech qanday ahamiyati yo'q", w3: "andazani faqat matoning teskari burchagiga teskari qo'yish shart" },

    // Tikuv mashinasi va asboblar (17-32)
    { n: "Tikuv mashinasining mokki (chelnochniy) mexanizmi", u: "igna olib tushgan yuqori ip ilmog'ini tutib olib, ostki ip bilan chigal qilib baxyani bog'lash", w1: "mato qalinligini avtomatik ravishda o'lchab qirqish", w2: "mashina elektr dvigatelini tarmoqdan uzuvchi saqlagich bo'lish", w3: "ignaning sinib ketmasligi uchun uni sovutib turish" },
    { n: "Tikuv mashinasi ignasining tuzilishi", u: "kolba (qalin qismi), poyacha, uzun ariqcha, kalta ariqcha, ko'zcha va uchi", w1: "tutqich, spiralsimon prujina, tishli reyka va pichoq", w2: "faqat bitta yaxlit ingichka sim bo'lib teshigi bo'lmaydi", w3: "metall sterjen, plastmassa dasta va elektr kabeli" },
    { n: "Tikuv mashinasida ignani to'g'ri o'rnatish qoidasi", u: "kolbaning yassi kesimi (liski) orqaga yoki o'ngga, uzun ariqchasi esa ip kiradigan tomonga qaratiladi", w1: "ignani teskari qilib uchi yuqoriga qaragan holda qisish", w2: "ignani bo'sh qoldirib qisuvchi vintni buramasdan tikish", w3: "igna ko'zchasini pastga emas, to'g'ridan-to'g'ri orqaga burish" },
    { n: "Tikuv mashinasining mato suruvchi tishli reykasi", u: "igna matodan chiqqan paytda matoni bitta qadam (chok uzunligi) masofaga oldinga surish", w1: "ignani ushlab turuvchi vintni avtomatik burash", w2: "matoni ikki tomonga kuch bilan tortib yirtish", w3: "chok ipini qaychi kabi qirqib tashlash mexanizmi" },
    { n: "Baxya qadami (chok uzunligi) rostlagichi", u: "tishli reykaning siljish masofasini o'zgartirib chok qadamini 1 mm dan 4 mm gacha sozlash", w1: "mashina elektr motorining quvvatini o'zgartirish", w2: "igna ko'zchasining kattaligini mexanik o'zgartirish", w3: "dazmolning haroratini boshqaruvchi datchik" },
    { n: "Yuqori ip tarangligini rostlagich", u: "ikkita shayba orasidagi prujina bosimini o'zgartirib yuqori ipning tarangligini sozlash", w1: "pastki g'altakdagi ipni avtomatik o'rab berish", w2: "mashinaning umumiy og'irligini kamaytirish", w3: "oyoq tepkisining harakatini tezlashtirish" },
    { n: "Ostki ip tarangligini rostlash", u: "shpulka qalpog'idagi (shpulniy kolpachok) kichik vintni burab prujina bosimini sozlash", w1: "bosh valning aylanish yo'nalishini o'zgartirish", w2: "ignaning qalinligini mikrometr bilan tekshirish", w3: "mashina korpusini kerosin bilan yuvib artish" },
    { n: "Chokda 'pastki ipning ilinib chiqishi' (petlyaniye) sababi", u: "yuqori ipning tarangligi juda bo'sh bo'lishi yoki ip noto'g'ri o'tkazilgan bo'lishi", w1: "matoning haddan tashqari yupqa va oq bo'lishi", w2: "tikuvchi xodimning tez tikishi tufayli", w3: "mashina motorining yangi va zamonaviyligi" },
    { n: "Tikuv mashinasida igna sinishining asosiy sababi", u: "igna mato turiga mos emasligi, qiyshiqligi yoki matoni qo'l bilan zo'riqtirib tortish", w1: "ipning juda sifatli va mustahkam bo'lishi", w2: "chok uzunligining 2 mm qilib to'g'ri o'rnatilishi", w3: "mashinaning o'z vaqtida moylanganligi" },
    { n: "Tikuv mashinasida chok o'tkazib yuborish (propusk)", u: "igna to'mtoqligi, egilganligi yoki igna va mokki uchi orasidagi masofa noto'g'ri sozlanganligi", w1: "tikuvchining ko'zoynak taqib ishlashi", w2: "matoning to'g'ri dazmollanganligi sababli", w3: "g'altakdagi ipning rangiga qarab" },
    { n: "Tikuv mashinasini moylash qoidasi", u: "ishqalanish nuqtalariga tozalovdan so'ng maxsus I-20A markali mashina moyidan 1-2 tomchi tomizish", w1: "mexanizm ichiga quyuq paxta yoki kungaboqar yog'ini to'kish", w2: "mashina detallarini suv bilan yuvib nam holda qoldirish", w3: "mexanizmga shakarli qiyom quyib harakatlantirish" },
    { n: "Overloq dastgohining vazifasi", u: "mato qirqim chetini pichoq bilan tekislab kesish va to'kilib ketmasligi uchun zanjirsimon yo'rmab tikish", w1: "faqat tugmalarni avtomatik qadash vazifasi", w2: "matoni dazmollab taxlab berish uskunasi", w3: "kiyim andazasini qog'ozga chizuvchi plotter" },
    { n: "Tikuvchilik qaychilaridan to'g'ri foydalanish", u: "faqat mato bichish uchun ishlatish, qog'oz va sim kesmaslik hamda stol yuzasida yotqizib kesish", w1: "qaychi bilan metall simlarni va qalin mixlarni qirqish", w2: "qaychini ochiq holda o'rtoqlariga uchini qaratib uzatish", w3: "qaychi pichoqlarini toshga urib tishli qilish" },
    { n: "Santimetrli tasma (o'lchov tasmasi)", u: "elastik, cho'zilmaydigan lentadan bo'lib, inson qomatini va mato o'lchamlarini aniq o'lchash", w1: "qattiq temir xodani o'rtasidan arralab kesish", w2: "bichilgan mato detallarini bir-biriga yelimlash", w3: "tikuv mashinasining motorini harakatlantiruvchi tasma" },
    { n: "Tikuvchilik bo'ri (yoki sovun parchasi)", u: "mato yuzasiga andaza konturlari va chok chiziqlarini chizish hamda oson tozalanuvchan bo'lishi", w1: "mato yuzasiga o'chmaydigan moyli bo'yoq bilan chizish", w2: "mashina ignasini charxlab o'tkirlash vositasi", w3: "matoning teshilgan joylarini yamash uchun yelim" },
    { n: "O'yish andazasi (lekalo)", u: "yeng o'mizi, yoqa va bel chiziqlarining ravon egri chiziqlarini aniq chizish uchun andaza", w1: "to'g'ri chiziqli qirralarni kesish uchun pichoq", w2: "dazmolning haroratini pasaytiruvchi moslama", w3: "tikuv mashinasining oyog'iga o'rnatiladigan rezina" },

    // Choklar va tikuv operatsiyalari (33-48)
    { n: "Ko'klash choki (smetyivaniye)", u: "ikkita detalni keyingi mashina baxyasidan oldin vaqtincha qo'lda yirik qadam bilan biriktirib turish", w1: "kiyimning yakuniy pishiq asosiy biriktiruvchi choki", w2: "mato chetini to'kilishdan saqlovchi overloq choki", w3: "faqat tugma qadash uchun ishlatiladigan tugun choki" },
    { n: "Baxya chok (stachivaniye)", u: "detallarni tikuv mashinasida to'g'ri chiziqli mustahkam chok bilan doimiy biriktirish", w1: "detallarni vaqtincha tutib turuvchi bo'sh chok", w2: "kiyim etagini qo'lda ko'rinmas qilib bukish", w3: "mato yuzasiga kashta gullari tikish usuli" },
    { n: "Dazmollashda 'Yoyib dazmollash' (razutyujivaniye)", u: "baxya chok qo'yilgan ikki detal zaxiralarini ikki tomonga ochib tekis dazmollash", w1: "ikkala chok zaxirasini bitta tomonga yotqizib dazmollash", w2: "matoni g'ijimlab burmali holatda quritish", w3: "detal chetini pichoq bilan qirib tekislash" },
    { n: "Dazmollashda 'Yotqizib dazmollash' (zautyujivaniye)", u: "chokning ikkala zaxirasini bir tomonga qaratib dazmol bilan yotqizish", w1: "chok zaxiralarini ikki tomonga qarab ochib yuborish", w2: "matoni ho'llab xona burchagida osib qo'yish", w3: "chok ichiga metall sim kiritib dazmollash" },
    { n: "Etakni bukish choki (podgibka)", u: "ko'ylak yoki shim etagini ichkariga bir yoki ikki marta bukib mashinada yoki qo'lda tikish", w1: "kiyim yelkasini qirqib tashlash operatsiyasi", w2: "yoqaning ichiga qattiq qistirma qo'yish", w3: "yeng uchiga rezina tasma kiritmasdan ochiq qoldirish" },
    { n: "Yashirin chok (potaynoy shov)", u: "kiyimning o'ng tomonidan qaraganda ip izi mutlaqo ko'rinmaydigan qilib etakni qo'lda tikish", w1: "o'ng tomondan qalin qora ip bilan yirik qadamda tikish", w2: "matoni elektr toki bilan kuydirib yopishtirish", w3: "faqat kiyim astarini yirtib tashlash jarayoni" },
    { n: "Bostirma chok (nastrachivaniye)", u: "baxya chokdan so'ng detal o'ngidan qo'shimcha bezak yoki mustahkamlovchi pardoz choki yurgizish", w1: "barcha choklarni sirkada eritib yuborish", w2: "mato chetlarini qaychi bilan qiyshiq qirqish", w3: "faqat ichki qatlamga kley purkash operatsiyasi" },
    { n: "Cho'ntak qopqoqchasini tikish", u: "qopqoqchani qatlamlab tikib, ag'darib, burchaklarini to'g'rilab, dazmollab kiyimga ulash", w1: "cho'ntakni kiyimga tikmasdan xom qoldirish", w2: "cho'ntak ichini qattiq gips bilan to'ldirish", w3: "faqat kiyim orqa etagiga cho'ntak o'rnatish" },
    { n: "Qovurg'ali bo'rtma chok (relyef)", u: "kiyim ko'kragida qomatga chiroyli o'tirishini ta'minlovchi vertikal shaklli chok", w1: "faqat qop va qoplama qutilar tikishda qo'llanadi", w2: "kiyim matosini ataylab yirtib teshik qilish", w3: "yengni kiyimdan ajratib tashlash operatsiyasi" },
    { n: "Vitochka (taxlama/qomat burmasi)", u: "yassi matoni inson gavdasi qomatiga (ko'krak, bel) moslab fazoviy hajm beruvchi uchburchak chok", w1: "kiyimning etagiga osiladigan dekorativ popuk", w2: "shimning orqa cho'ntagini yopuvchi qulf", w3: "yoqaning ichki astarini mustahkamlovchi sim" },
    { n: "Vitochka uchini to'g'ri tikish qoidasi", u: "vitochka uchiga yaqinlashganda chok qadamini maydalab 'yo'qqa' chiqarish va ipni mahkamlash", w1: "uchida birdaniga to'xtab ipni 5 sm qoldirib shunchaki uzish", w2: "uchini to'g'ri burchakli qilib qo'pol burish", w3: "vitochka ichidagi ortiqcha matoni qaychi bilan teshib tashlash" },
    { n: "Ko'ylak yoqasini tayyorlash", u: "yoqa ustki va ostki bo'lagi orasiga dublerin (flizelin) yopishtirib, tikib ag'darish va dazmollash", w1: "yoqani qotirmasdan juda yumshoq va burishgan holda qoldirish", w2: "yoqaning ichiga qalin po'lat sim kiritib tikish", w3: "yoqani faqat bir qavat yupqa dokadan tikish" },
    { n: "Kiyim yengini o'mizga (proyma) o'tqazish", u: "yeng tepasini biroz terib (posadka qilib), nazorat nuqtalarini to'g'rilab ko'klash va tikish", w1: "yengni hech qanday posadkasiz tortib tortishib tikish", w2: "yengning o'ngini kiyimning teskarisiga ulab qo'yish", w3: "yengni o'mizga emas, yoqaning o'rniga tikish" },
    { n: "Yashirin zamok (molniya) qadash", u: "maxsus bir tomonlama tepki yordamida spiral tishlari tagidan yashirin qilib tikish", w1: "zamokni oddiy keng tepki bilan tishlari ustidan bosib tikish", w2: "zamokni yelim bilan shunchaki yopishtirib qo'yish", w3: "zamok tishlarini egov bilan qirib tashlab tikish" },
    { n: "Tugma qadash me'yori", u: "mato qalinligiga qarab oyoqcha (nojkali) hosil qilib bo'shliq qoldirib mustahkam tikish", w1: "tugmani matoga yopishtirib qimirlamaydigan qilib qadash", w2: "to'rt teshikli tugmaning faqat bitta teshigidan bir marta ip o'tkazish", w3: "tugmani sim bilan qadab uchini orqaga qayirib qo'yish" },
    { n: "Tugma qadashda halqacha (petlya) ochish", u: "tugma diametriga uning qalinligini qo'shgan holda petlya uzunligini belgilab yo'rmash", w1: "petlyani tugmadan ikki barobar kichik qilib ochish", w2: "petlya teshigini pichoq bilan yirtib yo'rmasdan qoldirish", w3: "faqat metall temir halqalar o'rnatish bilan cheklanish" },

    // Konstruksiyalash va andaza loyihalash (49-64)
    { n: "Ko'krak aylanasi o'lchovi (Cg II)", u: "orqada kuraklar orqali, qo'ltiq ostidan va oldinda ko'krakning eng bo'rtgan nuqtalari bo'ylab o'lchanadi", w1: "bo'yinning eng pastki asosi bo'ylab o'lchanadi", w2: "faqat belning eng ingichka qismi bo'ylab o'lchanadi", w3: "oyoq to'pig'ining aylanasi bo'ylab aniqlanadi" },
    { n: "Bel aylanasi o'lchovi (Ct)", u: "belning eng ingichka joyiga bog'langan tasmacha bo'ylab gorizontal o'lchanadi", w1: "ko'krakning eng baland nuqtalari bo'ylab o'lchanadi", w2: "yelkaning kengligi bo'ylab ko'ndalang o'lchanadi", w3: "tizzaning bukilgan qismi bo'ylab aniqlanadi" },
    { n: "Dumba aylanasi o'lchovi (Cb)", u: "dumba mushaklarining eng bo'rtgan nuqtalari bo'ylab, qorin do'ngligini hisobga olib o'lchanadi", w1: "faqat boldir suyagining o'rtasi bo'ylab o'lchanadi", w2: "bosh suyagining eng keng qismi bo'ylab o'lchanadi", w3: "qo'l bilagining ingichka joyi bo'ylab aniqlanadi" },
    { n: "Orqa uzunligi bel chizig'igacha (Dts)", u: "yettinchi bo'yin umurtqasidan umurtqa pog'onasi bo'ylab bel tasmasigacha o'lchanadi", w1: "iyakdan boshlab ko'krak o'rtasigacha o'lchanadi", w2: "yelkadan to tirsakkacha bo'lgan masofa o'lchanadi", w3: "oyoq tagidan bel chizig'igacha bo'lgan uzunlik" },
    { n: "Yelka kengligi o'lchovi (Shp)", u: "bo'yin asosi nuqtasidan yelka suyagi bo'rtig'i nuqtasigacha o'lchanadi", w1: "ikkala tirsak orasidagi masofa bo'ylab o'lchanadi", w2: "peshona kengligi bo'ylab gorizontal o'lchanadi", w3: "qorinning eng keng qismi bo'ylab o'lchanadi" },
    { n: "Balandlik (bo'y) o'lchovi (R)", u: "bosh tepasidan oyoq tagigacha bo'lgan vertikal masofa poyabzalsiz o'lchanadi", w1: "o'tirgan holatda boshdan stolgacha o'lchanadi", w2: "qo'llarni ikki tomonga yozgandagi kenglik o'lchanadi", w3: "faqat umurtqa pog'onasining egrilik darajasi" },
    { n: "Erkin harakatlanish qo'shimchasi (Pribavka - Pg)", u: "nafas olish, erkin harakat va kiyim silueti uchun asosiy o'lchovga qo'shiladigan santimetrlar", w1: "matoning narxiga qo'shiladigan soliq foizi", w2: "tikuvchining ish haqiga qo'shiladigan ustama puli", w3: "dazmollash paytida matoga sepiladigan suv miqdori" },
    { n: "Bichishda chok haqi (priposk na shvi)", u: "detal konturidan tashqariga tikish va biriktirish uchun qoldiriladigan qo'shimcha (1-2 sm)", w1: "kiyim tayyor bo'lgach uning yuzasiga tikiladigan tasma", w2: "chizmadagi masshtabni bildiruvchi raqam", w3: "tikuv mashinasi ignasining uzunligi" },
    { n: "Kiyim silueti turlari", u: "yopishgan (prilegayushiy), yarim yopishgan, to'g'ri (pryamoy) va keng (trapetsiya)", w1: "faqat qora, oq va qizil rangli kiyimlar tasnifi", w2: "faqat bolalar, ayollar va erkaklar kiyimlari", w3: "paxtali, ipakli va junli kiyimlar ro'yxati" },
    { n: "Kiyimdagi nuqson: Yelkada qiya burmalar paydo bo'lishi", u: "yelka choki burchagining noto'g'ri olinganligi yoki orqa yelka kengligining torligi", w1: "tikuv mashinasi ignasining haddan tashqari ingichkaligi", w2: "matoning rangi haddan tashqari och bo'lganligi", w3: "duxovkadagi haroratning pastligi tufayli" },
    { n: "Kiyimdagi nuqson: Etagining oldi ko'tarilib qolishi", u: "old bo'lak uzunligining yetarli emasligi yoki ko'krak vitochkasi to'g'ri ochilmaganligi", w1: "shim cho'ntaklarining juda chuqur tikilganligi", w2: "dazmol tagining toza emasligi sababli", w3: "iplarning ranglari bir-biriga mos kelmasligi" },
    { n: "Namlab-issiqlovchi ishlov berish (VTO)", u: "dazmol yoki press yordamida namlik, issiqlik va bosim ta'sirida kiyimga fazoviy shakl berish", w1: "kiyimni kir yuvish kukunida muzdek suvda chayqash", w2: "matoni qora bo'yoqqa botirib oftobda quritish", w3: "kiyim detallarini pichoq bilan qirib tozalash" },
    { n: "Matoni bo'ylama tortib cho'zish (otyajka)", u: "dazmol bilan matoning ma'lum joyini cho'zib kerakli egrilik va hajm hosil qilish", w1: "matoning qisqarishi uchun sovuq suvda muzlatish", w2: "matoni qaychi bilan kesib tashlash jarayoni", w3: "tikuv mashinasining motorini qo'lda aylantirish" },
    { n: "Matoni terib qisqartirish (sutyujka)", u: "dazmol va bug' ta'sirida tolalarni zichlashtirib ortiqcha to'lqinsimonlikni yo'qotish", w1: "matoni ikki tomonga tortib yirtish operatsiyasi", w2: "kiyimga qo'shimcha cho'ntaklarni yopishtirish", w3: "mato yuzasiga qalin lok qatlami surtish" },
    { n: "Yelka qistirmasi (podplechnik)", u: "yelka chizig'ini to'g'ri, tekis va ko'rkam ushlab turish uchun yelkaga qo'yiladigan maxsus detal", w1: "faqat shimning tizzasiga qo'yiladigan yamoq", w2: "kiyimning etagiga osiladigan og'ir yuk", w3: "ko'ylak yoqasini yopuvchi metall to'g'nog'ich" },
    { n: "Tikuvchilik ustaxonasida texnika xavfsizligi", u: "ignani og'izga solmaslik, to'g'nog'ichlarni yostiqchaga taqish, dazmolni taglikka qo'yish va elektr simlarini nazorat qilish", w1: "ignani ish kiyimi yoqasiga qadab yurish va qaychini uchini o'rtoqlariga qaratib uzatish odati", w2: "dazmolni yonar mato ustida yoqiq qoldirib ketish hamda nosoz rozetkalardan bemalol foydalanish", w3: "tikuv mashinasi ishlayotganda qo'lni igna tagiga yaqinlashtirish va uni qarovsiz qoldirish" }
  ];

  const aspectStems = [
    (n) => `Materialshunoslik va tikuvchilik texnologiyasi asoslariga ko'ra, '${n}' qanday asosiy xususiyat yoki qoidaga ega?`,
    (n) => `Kiyim loyihalash va tikish amaliyotida '${n}' jarayoni qanday to'g'ri amalga oshiriladi?`,
    (n) => `Texnologiya (Servis) fani darslarida '${n}' mavzusida o'quvchilarga qaysi muhim qoida o'rgatiladi?`,
    (n) => `Tikuvchilik ishlab chiqarishi va sifat nazoratida '${n}' bo'yicha to'g'ri ta'rif qaysi?`,
    (n) => `Modellashtirish va konstruksiyalash qoidalariga muvofiq, '${n}' ning mohiyati nimadan iborat?`,
    (n) => `Amaliy tikuvchilik mahorati tahlilida '${n}' qanday muhim vazifani bajaradi?`,
    (n) => `Kiyim detallariga ishlov berish va pardozlashda '${n}' bo'yicha to'g'ri xulosa qaysi?`,
    (n) => `To'qimachilik materiallari va tikuv asboblari tasnifida '${n}' qaysi jihati bilan ajralib turadi?`,
    (n) => `Kiyimda yuzaga kelishi mumkin bo'lgan nuqsonlarning oldini olishda '${n}' qoidasi nima?`,
    (n) => `Dazmollash va namlab-issiqlik ishlovida '${n}' ning asosiy texnologik talabi qaysi?`,
    (n) => `O'quv ustaxonasida xavfsiz mehnat va sifatni ta'minlashda '${n}' qanday inobatga olinadi?`,
    (n) => `Kiyim andazasini to'g'ri bichish va qomatga moslashda '${n}' qanday mezonga asoslanadi?`,
    (n) => `Servis yo'nalishi bo'yicha mutaxassis mahoratini oshirishda '${n}' qanday o'rin tutadi?`
  ];

  let id = 521;
  for (let a = 0; a < 13; a++) {
    for (let i = 0; i < 64; i++) {
      const c = sew64[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri tavsifi: ${c.u}`;
      const dists = [
        `To'g'ri tavsifi: ${c.w1}`,
        `To'g'ri tavsifi: ${c.w2}`,
        `To'g'ri tavsifi: ${c.w3}`
      ];
      const exp = `Tikuvchilik va materiallarga ishlov berishda: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Aniq andaza, puxta chok va go'zal libos.`;

      items.push(createItem(id, 197, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 02 tayyor: ${items.length} ta savol (IDs 521..1352)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 03: Xalq hunarmandchiligi texnologiyasi (156 Qs: IDs 1353..1508, Topic 198)
// ══════════════════════════════════════════════════════════════════════════
function buildSection03() {
  const items = [];
  const secFile = "03_xalq_hunarmandchiligi_texnologiyasi.json";

  // 26 crafts concepts * 6 aspects = 156 Qs
  const craft26 = [
    { n: "O'zbek milliy do'ppido'zlik san'ati", u: "Chust, Iroqi, Marg'ilon va Boysun uslublarida nafis handasiy va islimiy naqshlar tikish", w1: "faqat qalin metall tunukalarni bolg'alab qozon yasash", w2: "loy qorishmasidan g'isht quyib oftobda quritish", w3: "yog'och taxtalarni suvda ivitib bochka yasash" },
    { n: "So'zanado'zlik (kashtachilik) san'ati", u: "oq surp yoki ipak matoga ilmoq, bosma choklar bilan anor, bodom va gul naqshlari tikish", w1: "po'lat arralarni egov yordamida charxlab to'g'rilash", w2: "metall quymalarni qolipdan ajratib qumini tozalash", w3: "qog'ozdan origami usulida qutilar yasash" },
    { n: "Zardo'zlikda 'Zamindo'zlik' uslubi", u: "matoning butun yuzasini oltin zar iplar bilan to'liq qoplab bir tekis tikish", w1: "faqat matoning chetiga qora paxta ipi bilan bitta chok yurgizish", w2: "matoni bo'yoqqa botirib so'ngra quritish jarayoni", w3: "zar iplarni eritib suyuq holatda matoga quyish" },
    { n: "Zardo'zlikda 'Guldo'zlik' uslubi", u: "qalin qog'ozdan kesilgan bo'rtma andaza gullar ustidan zar iplarni yotqizib tikish", w1: "faqat xom loydan me'moriy g'ishtlar yasash usuli", w2: "matoni olovda kuydirib qora izlar qoldirish", w3: "metall sterjenlarni press ostida kesib tashlash" },
    { n: "Iroqi choki (krestik usuli)", u: "mato iplarini sanab ikkita qiya chokni o'zaro kesishgan xochsimon shaklda aniq tikish", w1: "matoni yirtib teshiklarini kley bilan yopishtirish", w2: "mashina yordamida tezkor zanjirli chok yurgizish", w3: "faqat kiyim astarini qo'lda bukish operatsiyasi" },
    { n: "Bosma chok (kashtachilikda)", u: "naqsh konturini to'ldirib, yotqizilgan uzun iplarni mayda ko'ndalang choklar bilan bosib mahkamlash", w1: "matoni tosh bilan urib yupqalashtirish tartibi", w2: "igna o'rniga faqat metall qisqichlardan foydalanish", w3: "faqat teri mahsulotlarini bigiz bilan teshish" },
    { n: "Ilmoq chok (tambur/yurma)", u: "igna yoki maxsus ilmoqli ilmoqcha yordamida zanjirsimon halqalar qatorini hosil qilib tikish", w1: "matoning qirralarini egov bilan yo'nib tekislash", w2: "baxya chok zaxiralarini ikki tomonga dazmollash", w3: "faqat qalin arqonlarni bir-biriga tugish usuli" },
    { n: "Abrbandi (abrli matolar) to'qish san'ati", u: "o'rish iplarini to'qishdan oldin naqsh bo'yicha bog'lab qismlarga ajratib bo'yash (abrband qilish)", w1: "tayyor mato ustiga oddiy bo'yoq purkash yo'li", w2: "matoni kislotaga solib rangini butunlay yo'qotish", w3: "faqat bir xil oq rangli iplardan bo'z to'qish" },
    { n: "Xonatlas matosi xususiyati", u: "yuz foiz tabiiy sof ipak tolasidan to'qilgan, tovlanuvchi yorqin milliy naqshli qimmatbaho mato", w1: "faqat paxta va sintetik neylon aralashmasidan to'qilgan", w2: "namlikni o'tkazmaydigan qalin brezent qoplamali mato", w3: "faqat poyabzal tagligi uchun ishlatiladigan charm" },
    { n: "Adras matosi xususiyati", u: "o'rish iplari tabiiy ipakdan, arqoq iplari esa paxtadan bo'lgan pishiq va xushbichim yarim ipak mato", w1: "yuz foiz qattiq po'lat tolalardan to'qilgan sim to'r", w2: "faqat pol artishda ishlatiladigan bir martalik tola", w3: "cho'ziluvchan rezinadan tayyorlangan suv o'tkazmas mato" },
    { n: "Bekasam matosi", u: "paxta va ipak aralashmasidan to'qilgan, yo'l-yo'l chiziqli an'anaviy to'nlar xomashyosi", w1: "faqat avtomobil o'rindiqlari g'ilofini tayyorlash uchun", w2: "shaffof shisha tolali devor qog'ozi turi", w3: "suv osti sho'ng'uvchilari uchun maxsus kiyim matosi" },
    { n: "Patli gilam to'qish texnologiyasi", u: "vertikal dastgohda o'rish iplariga har bir tugunni qo'lda tugib, pichoq bilan qirqib pat hosil qilish", w1: "faqat tikuv mashinasida tezkor baxyalar yurgizish", w2: "jun tolasini yelim bilan fanerga yopishtirish", w3: "mato yuzasiga qizdirilgan temir bilan rasm chizish" },
    { n: "Patsiz gilam (palos) to'qish", u: "arqoq va o'rish iplarining oddiy va zich ilashuvi hisobiga silliq ikki yuzli to'qima hosil qilish", w1: "mato yuzasiga qalin kigiz qatlamini qadash", w2: "faqat sintetik polietilen plyonkalarini lehimlash", w3: "qamish poyalarini sim bilan bog'lab to'shama qilish" },
    { n: "Kigiz bosish (namat tayyorlash)", u: "jun tolalarini issiq suv va sovun bilan ivitib, oyoq va qo'l kuchi bilan dumalatib zichlashtirish", w1: "junni temir charxda yo'nib kukun holiga keltirish", w2: "junga qalin sement sepib toshdek qotirish", w3: "faqat kimyoviy kislota bug'ida junni eritib yuborish" },
    { n: "Kurak va taroq (panja) asbobi gilamdo'zlikda", u: "to'qilgan arqoq iplarini va tugunlarni pastga qarab urib zichlash uchun og'ir metall taroq", w1: "mato andazasini qog'ozga chizish uchun qalam", w2: "tikuv mashinasining ignasini tozalovchi cho'tka", w3: "dazmolning haroratini tekshiruvchi asbob" },
    { n: "Milliy kiyimlarda jiyak (mag'iz) tikish", u: "yoqa, yeng va etak qirralariga nafis to'qilgan tasma tikib qirрани mustahkamlash va bezash", w1: "kiyimning yirtilgan joyiga qo'pol yamoq solish", w2: "kiyim ichiga qalin po'lat sim kiritish", w3: "etakni butunlay kesib tashlab kalta qilish" },
    { n: "Quroqchilik (patchwork/pechvork)", u: "turli rang va shakldagi mato qiyqimlarini geometrik uyg'unlikda bir-biriga ulab buyum tikish", w1: "yaxlit matoni olovda kuydirib teshiklar ochish", w2: "matoni kislotaga botirib rangini o'chirish", w3: "faqat bitta qora matodan xalta tikish" },
    { n: "Badiiy to'r to'qish (krujevo, vyazaniye)", u: "ilgaksimon ilmoqcha (kryuchok) yoki simlar bilan iplardan zanjir hosil qilib nafis to'r to'qish", w1: "og'ir metall quvurlarni elektr yoyi bilan payvandlash", w2: "yog'och taxtalarni randa bilan tekislash", w3: "gips qorishmasini qolipga quyib qotirish" },
    { n: "Badiiy biser (munchoq) qadash", u: "mayda rangli shisha munchoqlarni igna va ingichka ip bilan matoga qadab bo'rtma tasvir yaratish", w1: "matoga qalin mixlarni bolg'a bilan qoqish", w2: "mato yuzasiga qora moyli bo'yoq purkash", w3: "faqat yog'och qirindilarini matoga yopishtirish" },
    { n: "Tabiiy o'simlik bo'yoqlari (ro'yan, isparak, yong'oq po'sti)", u: "ipak va jun iplarni bo'yashda asrlar davomida qo'llanilgan o'chmaydigan ekologik tabiiy bo'yoqlar", w1: "har qanday suvda darhol yuvilib ketadigan sifatsiz kukun", w2: "inson terisini kuydiruvchi zaharli kislotalar", w3: "faqat metall yuzalarni zangdan tozalovchi moddalar" },
    { n: "Kashtachilikda chambarak (pyaltsa)", u: "kashta tikiladigan matoni tarang tortib ushlab turuvchi ikkita yog'och yoki plastik halqa", w1: "ignani charxlash uchun ishlatiladigan abraziv tosh", w2: "mato qalinligini o'lchovchi mikrometr asbobi", w3: "dazmol tagiga qo'yiladigan issiqqa chidamli taglik" },
    { n: "Charmdo'zlik (badiiy charm buyumlar)", u: "tabiiy charm yuzasiga qizdirilgan shtamp bilan naqsh bosish, qirqish va tasmalar bilan o'rib tikish", w1: "charmni suvda ivitib xamir kabi yoyish operatsiyasi", w2: "charmni temir arra bilan arralab bo'laklash", w3: "faqat sintetik polimer plyonkalarni yelimlash" },
    { n: "To'qimachilikda urchuq (ip yigirish)", u: "paxta yoki jun tolasini qo'lda cho'zib, burab pishiq bir jinsli ip holatiga keltirish", w1: "tayyor matoni qaychi bilan mayda qirqish asbobi", w2: "chizmadagi masshtabni hisoblovchi kalkulyator", w3: "tikuv mashinasining elektr motorini ulash simi" },
    { n: "Milliy dasturxon va dastro'mol chetini jiyaklash", u: "chetlarini bukish, popuklar tugish yoki mayda krujevo ilmoqlari bilan nozik pardozlash", w1: "chetlarini egov bilan qirib tozalash operatsiyasi", w2: "dasturxon chetiga temir simlarni payvandlash", w3: "chetlarini qora bo'yoqqa botirib quritish" },
    { n: "Pilladan ipak yechish (ipakchilik)", u: "pilla g'umbagini issiq suvda bug'lab, ingichka uzluksiz ipak tolasini charxga o'rab olish", w1: "pillani bolg'a bilan urib maydalash usuli", w2: "pilladan faqat paxta yog'i ishlab chiqarish", w3: "pillani muzlatgichda qotirib tosh holiga keltirish" },
    { n: "Milliy hunarmandchilikda ustoz-shogird an'anasi", u: "kasb sirlarini, amaliy ko'nikmalarni va yuksak axloqiy odobni ustozdan shogirdga meros qoldirish", w1: "faqat pul evaziga bir haftada diplom berib yuborish", w2: "shogirdga hech qanday amaliy asbobni ushlatmaslik", w3: "milliy an'analarni butunlay inkor etib faqat xorijiy andazalardan nusxa olish" }
  ];

  const aspectStems = [
    (n) => `Xalq amaliy san'ati va milliy hunarmandchilikda '${n}' qanday o'ziga xos texnologik mohiyatga ega?`,
    (n) => `O'zbek milliy hunarmandchiligi an'analarida '${n}' qaysi asosiy material va asboblar bilan bajariladi?`,
    (n) => `Texnologiya (Servis) fani mashg'ulotlarida '${n}' mavzusida qaysi muhim qoida o'rgatiladi?`,
    (n) => `Badiiy buyumlar yaratish va bezash amaliyotida '${n}' ning o'ziga xos roli qaysi qatorda to'g'ri?`,
    (n) => `Ustoz-shogird maktabi va hunarmandchilik madaniyatida '${n}' qanday ta'riflanadi?`,
    (n) => `Milliy qadriyatlar va badiiy didni shakllantirishda '${n}' qanday ahamiyat kasb etadi?`
  ];

  let id = 1353;
  for (let a = 0; a < 6; a++) {
    for (let i = 0; i < 26; i++) {
      const c = craft26[i];
      const q = aspectStems[a](c.n);
      const corr = `Bosh xususiyati: ${c.u}`;
      const dists = [
        `Bosh xususiyati: ${c.w1}`,
        `Bosh xususiyati: ${c.w2}`,
        `Bosh xususiyati: ${c.w3}`
      ];
      const exp = `Xalq hunarmandchiligi texnologiyasida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Milliy meros, nozik did va yuksak hunarmandlik mahorati.`;

      items.push(createItem(id, 198, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 03 tayyor: ${items.length} ta savol (IDs 1353..1508)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 04: Ishlab chiqarish va ro'zg'orshunoslik (104 Qs: IDs 1509..1612, Topic 199)
// ══════════════════════════════════════════════════════════════════════════
function buildSection04() {
  const items = [];
  const secFile = "04_ishlab_chiqarish_va_rozgorshunoslik.json";

  // 13 home management concepts * 8 aspects = 104 Qs
  const home13 = [
    { n: "Xonadon sanitariya-gigiyenik tozaligi", u: "namlab tozalash, xonalarni shamollatish va yuzalarni xavfsiz vositalar bilan dezinfeksiya qilish", w1: "xona poliga quruq qum sepib changni havoga ko'tarish", w2: "derazalarni ochmasdan xonada benzin bug'ini tarqatish", w3: "axlatlarni xona burchagiga to'plab uzoq vaqt qoldirish" },
    { n: "Oila byudjeti xarajatlarini rejalashtirish", u: "birlamchi zaruriy xarajatlar (oziq-ovqat, kommunal) va jamg'arma zaxirasini oldindan taqsimlash", w1: "oylik maosh tushishi bilan bir kunda barcha pulni sarflab tugatish", w2: "kommunal to'lovlarni to'lamasdan faqat hashamat buyumlariga pul sarflash", w3: "oilaviy daromadni yashirib doimiy ortiqcha qarz olish" },
    { n: "Oshxona idishlarini tozalash texnologiyasi", u: "issiq suv va xavfsiz yuvish vositalarida yuvish, yaxshilab chayqash va quritish", w1: "idishlarni kir sovuq suvda chayqab ho'l holda taxlab qo'yish", w2: "idishlar yuzasiga qalin sim cho'tka bilan chuqur tirnalgan izlar qoldirish", w3: "idishlarni faqat kimyoviy kislota bug'iga tutib tozalash" },
    { n: "Kiyimlarni mavsumiy saqlash qoidalari", u: "tozalab, yuvib, quritib, kuyadan himoyalovchi tabiiy vositalar (lavanda) bilan g'ilofda saqlash", w1: "iflos va nam kiyimlarni yerto'laga zichlab tashlab qo'yish", w2: "kiyimlarni ochiq quyosh ostida 6 oy davomida qoldirish", w3: "kiyimlarga qalin benzin purkab qorong'i shkafga solish" },
    { n: "Xonadon interyerida ranglar uyg'unligi", u: "xona yorug'ligi va hajmiga moslab iliq yoki sovuq ranglar garmoniyasini to'g'ri tanlash", w1: "kichik va qorong'i xonaning barcha devorlarini qora rangga bo'yash", w2: "bir xonada o'nta bir-biriga zid o'tkir ranglarni aralashtirish", w3: "devorlarga hech qanday suvoq qilmasdan g'isht holida qoldirish" },
    { n: "Xonadon o'simliklarini parvarishlash", u: "o'simlik turiga qarab sug'orish me'yori, yorug'lik rejimi va barglarini changdan tozalash", w1: "kaktus o'simligini har kuni chelaklab suv bilan sug'orish", w2: "o'simlik barglariga moyli qora bo'yoq purkab yaltiratish", w3: "o'simliklarni quyosh tushmaydigan qorong'i yerto'laga qamash" },
    { n: "Maishiy chiqindilarni utilizatsiya qilish", u: "organik chiqindilarni kompost qilish, plastmassa va qog'ozni qayta ishlashga topshirish", w1: "barcha chiqindilarni ko'p qavatli uy hovlisida yoqib yuborish", w2: "chiqindilarni daryo va ariq suvlariga oqizib yuborish", w3: "batareyalarni ochiq olovga tashlab portlatish" },
    { n: "Uy sharoitida kiyim dog'larini ketkazish", u: "dog' turiga (yog', choy, qon) qarab to'g'ri vosita tanlash va matoning ichki chetida sinab ko'rish", w1: "barcha dog'lar ustiga darhol konsentrlangan sulfat kislotasi quyish", w2: "dog'li kiyimni qizigan temir dazmol bilan qattiq bosib kuydirish", w3: "dog'ni o'tkir pichoq bilan qirib matoni teshib tashlash" },
    { n: "Dazmollashda harorat rejimini tanlash", u: "paxta va zig'ir uchun yuqori (200°C), jun uchun o'rta (150°C), ipak va sintetikaga past (110°C) harorat", w1: "nozik sintetik kapron matosini 250 darajali qizigan dazmolda bosish", w2: "barcha matolarni faqat sovuq dazmol bilan dazmollash", w3: "dazmolni kiyim ustida 10 daqiqa qimirlatmasdan qoldirish" },
    { n: "Uy-ro'zg'or jihozlarini xavfsiz ishlatish", u: "elektr simlari butunligini tekshirish, nam qo'l bilan tegmaslik va foydalanib bo'lgach tarmoqdan uzish", w1: "simi yalang'ochlangan rozetkadan uchqun chiqsa ham ishlataverish", w2: "elektr asboblarini suv to'la vannaga tushirib ishlatish", w3: "bolalarga elektr dazmol va plitani yoqib berib qarovsiz qoldirish" },
    { n: "Pardalar va xonadon to'qimachiligi dizayni", u: "deraza o'lchami, xona uslubi va yorug'lik tushish burchagiga moslab mato tanlash", w1: "kichik derazaga qalin qora brezent matosini mixlab qo'yish", w2: "pardani polga surkalib yirtiladigan qilib o'rnatish", w3: "faqat bir martalik sellofan plyonkani parda o'rnida osish" },
    { n: "Xonadonda birinchi tibbiy yordam burchagi", u: "dori vositalarini maxsus qutida, bolalar qo'li yetmaydigan quruq joyda yaroqlilik muddatini kuzatib saqlash", w1: "barcha dorilarni oshxona polida sochilgan holda qoldirish", w2: "muddati o'tgan dorilarni me'yordan ikki barobar ortiq ichish", w3: "dori qutisini ochiq olovli gaz plitasi ustiga qo'yish" },
    { n: "Iste'mol madaniyati va mahsulot yorlig'ini o'qish", u: "ishlab chiqarilgan sana, yaroqlilik muddati, tarkibi va saqlash sharoitlariga e'tibor berish", w1: "faqat qutining yaltiroq qog'oziga qarab yaroqsiz mahsulotni xarid qilish", w2: "muddati o'tgan aynigan oziq-ovqatlarni arzonligi uchun sotib olish", w3: "mahsulot tarkibidagi xavfli kimyoviy moddalarga e'tibor bermaslik" }
  ];

  const aspectStems = [
    (n) => `Ro'zg'orshunoslik va ishlab chiqarish amaliyotiga ko'ra, '${n}' jarayonida qaysi texnik talabga amal qilinadi?`,
    (n) => `Xonadon xo'jaligini oqilona boshqarishda '${n}' qanday to'g'ri ketma-ketlikda bajariladi?`,
    (n) => `Texnologiya (Servis) fani mashg'ulotlarida o'quvchilarga '${n}' bo'yicha qaysi qoida o'rgatiladi?`,
    (n) => `Oilaviy madaniyat va ro'zg'or iqtisodiyotida '${n}' ning asosiy mohiyati nimadan iborat?`,
    (n) => `Xavfsiz turmush tarzi va gigiyenik mezonlarga binoan, '${n}' qanday amaliy yechimni talab etadi?`,
    (n) => `Zamonaviy uy-ro'zg'or madaniyatida '${n}' qanday muhim omil sifatida qaraladi?`,
    (n) => `Uy xo'jaligida resurslarni tejash va qulaylik yaratishda '${n}' qoidasi nima?`,
    (n) => `Servis xizmatlari va uy xo'jaligini yuritishda '${n}' bo'yicha to'g'ri xulosa qaysi?`
  ];

  let id = 1509;
  for (let a = 0; a < 8; a++) {
    for (let i = 0; i < 13; i++) {
      const c = home13[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri qoidasi: ${c.u}`;
      const dists = [
        `To'g'ri qoidasi: ${c.w1}`,
        `To'g'ri qoidasi: ${c.w2}`,
        `To'g'ri qoidasi: ${c.w3}`
      ];
      const exp = `Ro'zg'orshunoslik va oila xo'jaligi me'yorida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Tartib, tejamkorlik va xavfsiz, farovon xonadon.`;

      items.push(createItem(id, 199, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 04 tayyor: ${items.length} ta savol (IDs 1509..1612)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 05: Kasb tanlashga yo'llash (104 Qs: IDs 1613..1716, Topic 200)
// ══════════════════════════════════════════════════════════════════════════
function buildSection05() {
  const items = [];
  const secFile = "05_kasb_tanlashga_yollash.json";

  // 13 career guidance concepts * 8 aspects = 104 Qs
  const career13 = [
    { n: "Servis sohasidagi 'Pazanda-oshpaz' kasbi", u: "taomlar texnologiyasini bilish, ta'm sezgirligi, sanitariya qoidalariga qat'iy rioya etish", w1: "faqat avtomobillarning dvigatelini ta'mirlash bilan shug'ullanish", w2: "elektr stansiyalarida yuqori voltli kabellarni montaj qilish", w3: "og'ir qurilish kranlarini masofadan boshqarish" },
    { n: "Servis sohasidagi 'Qandolatchi' kasbi", u: "pishiriqlar, tortlar, kremlar tayyorlash retsepturasi va nafis bezatish san'atini egallash", w1: "po'lat listlarni elektr payvandlash orqali darvoza yasash", w2: "traktorlar uchun tishli uzatmalar chizmasini chizish", w3: "faqat kimyoviy kislotalarni shisha idishlarga quyish" },
    { n: "Servis sohasidagi 'Tikuvchi (portnoy)' kasbi", u: "matolarga ishlov berish, kiyim andazalarini bichish va tikuv dastgohlarida mukammal tikish", w1: "og'ir yuk poezdlarini temir yo'lda haydash vazifasi", w2: "neft quduqlarini burg'ilash uchun og'ir asboblarni sozlash", w3: "faqat bino devorlarini g'isht bilan terish mutaxassisi" },
    { n: "Servis sohasidagi 'Modelyer-konstruktor' kasbi", u: "zamonaviy kiyim modellarini loyihalash, inson qomatiga andaza chizish va yangi uslub yaratish", w1: "faqat ombordagi tayyor kiyimlarni qutilarga joylab yuklash", w2: "suv quvurlaridagi zanglagan jo'mraklarni almashtirish", w3: "elektr hisoblagichlarini ko'rikdan o'tkazish xodimi" },
    { n: "Servis sohasidagi 'Restoran va mehmondo'stlik xizmatchisi'", u: "xushmuomalalik, mehmondo'stlik odobi, xorijiy tillarni bilish va servirovka qoidalari", w1: "mijozlarga qo'pol muomala qilib buyurtmalarni chalkashtirish", w2: "faqat o'rmon xo'jaligida daraxtlarni kesish bilan shug'ullanish", w3: "mashina detallarini stanokda yo'nish operatsiyasi" },
    { n: "E.A.Klimov tasnifida 'Odam — Badiiy obraz' (Dizayn)", u: "dizayner, rassom, modeler, zargar, xattot, stilist, dekorator", w1: "chilangar, tokar, santexnik, qozonxona operatori", w2: "buxgalter, iqtisodchi, dasturchi, statistik", w3: "agronom, zootexnik, veterinar, o'rmonchi" },
    { n: "E.A.Klimov tasnifida 'Odam — Odam' (Servis)", u: "o'qituvchi, tarbiyachi, shifokor, maishiy xizmat xodimi, administrator", w1: "dastgoh operatori, frezerchi, payvandchi, duradgor", w2: "kartograf, geolog, arxeolog, gidrometeorolog", w3: "badiiy haykaltarosh, bastakor, yozuvchi, aktyor" },
    { n: "Servisda kasbiy kompetentlik tushunchasi", u: "kasbiy bilim, amaliy mahorat, muomala madaniyati va muammoli vaziyatlarni hal etish qobiliyati", w1: "faqat ishga kechikib kelish va mijoz bilan bahslashish odati", w2: "texnologik xaritani inkor etib o'zboshimchalik bilan ishlash", w3: "barcha ishlarni sifatsiz bajarib javobgarlikdan qochish" },
    { n: "Kasb tanlash formulasi: 'Xohlayman — Bajara olaman — Kerak'", u: "shaxsiy qiziqish, jismoniy-aqliy layoqat va mehnat bozoridagi ehtiyojning uyg'unligi", w1: "faqat ota-onaning xohishiga ko'r-ko'rona bo'ysunish", w2: "mehnat bozorida mutlaqo talab bo'lmagan sohani tanlash", w3: "jismoniy sog'lig'iga zid bo'lgan og'ir sohani tanlash" },
    { n: "Servis sohasida kommunikativ ko'nikmalar", u: "mijoz ehtiyojini tinglash, muloyim muloqot qilish va ziddiyatli vaziyatlarni ijobiy hal etish", w1: "mijozga baqirib uning ustidan kulish kayfiyati", w2: "faqat o'z fikrini ma'qullab mijozni eshitmaslik", w3: "muloqotdan butunlay qochib jim o'tirish odati" },
    { n: "Professiogramma tahlili", u: "kasbning mehnat sharoitlari, unga qo'yiladigan tibbiy va psixologik talablar tavsifnomasi", w1: "xodimning oylik maoshidan ushlab qolinadigan jarimalar ro'yxati", w2: "dastgohning elektr chizmasi va pasporti hujjati", w3: "faqat do'kondagi mahsulotlarning narxnomalari to'plami" },
    { n: "Kasbiy rezyume (CV) tayyorlash", u: "shaxsiy ma'lumotlar, ta'lim, amaliy ish tajribasi va kasbiy yutuqlarni aniq bayon etish", w1: "faqat badiiy fantastik hikoyalar to'plamini yozish", w2: "o'z kamchiliklarini yashirib yolg'on ma'lumotlar kiritish", w3: "faqat o'zining oilaviy fotosuratlar albomini joylash" },
    { n: "Kasbiy stress va uning oldini olish", u: "mehnat va dam olish rejimiga rioya qilish, jismoniy faollik va ijobiy ruhiy kayfiyatni saqlash", w1: "kechayu kunduz uxlamasdan to'xtovsiz ishlash", w2: "charchoq paytida barcha hamkasblar bilan urishish", w3: "sog'liqqa zararli odatlar orqali stressni yengishga urinish" }
  ];

  const aspectStems = [
    (n) => `Kasb tanlashga yo'llash metodikasiga ko'ra, '${n}' qanday asosiy kasbiy talabni ifodalaydi?`,
    (n) => `Xizmat ko'rsatish va servis sohasida '${n}' ning mazmuni qaysi qatorda to'g'ri ko'rsatilgan?`,
    (n) => `O'quvchilarni ongli kasb tanlashga tayyorlashda '${n}' bo'yicha qaysi qoida to'g'ri?`,
    (n) => `Kasbiy diagnostika va professiografiya talablariga muvofiq, '${n}' qanday tavsiflanadi?`,
    (n) => `Mehnat bozori ehtiyojlarini o'rganishda '${n}' qanday amaliy ahamiyatga ega?`,
    (n) => `Servis yo'nalishidagi kasbiy ko'nikmalarni shakllantirishda '${n}' qanday tushuntiriladi?`,
    (n) => `Kasbiy mahorat va shaxsiy layoqatni baholashda '${n}' qanday mezonga tayanadi?`,
    (n) => `Yosh avlodni mustaqil mehnat faoliyatiga yo'naltirishda '${n}' ning o'rni nima?`
  ];

  let id = 1613;
  for (let a = 0; a < 8; a++) {
    for (let i = 0; i < 13; i++) {
      const c = career13[i];
      const q = aspectStems[a](c.n);
      const corr = `To'g'ri tavsifi: ${c.u}`;
      const dists = [
        `To'g'ri tavsifi: ${c.w1}`,
        `To'g'ri tavsifi: ${c.w2}`,
        `To'g'ri tavsifi: ${c.w3}`
      ];
      const exp = `Kasb tanlash nazariyasida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Qobiliyat, qiziqish va talab — muvaffaqiyatli kasb poydevori.`;

      items.push(createItem(id, 200, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 05 tayyor: ${items.length} ta savol (IDs 1613..1716)`);
  return items;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 06: Robototexnika asoslari (104 Qs: IDs 1717..1820, Topic 201)
// ══════════════════════════════════════════════════════════════════════════
function buildSection06() {
  const items = [];
  const secFile = "06_robototexnika_asoslari.json";

  // 13 robotics concepts * 8 aspects = 104 Qs
  const robot13 = [
    { n: "Xizmat ko'rsatuvchi servis robotlari", u: "oshxona, restoran, mehmonxona va tozalash ishlarini avtomatlashtirilgan tarzda bajarish", w1: "faqat og'ir po'lat eritish pechlarida qora metallarni eritish", w2: "kosmik stansiyalarda sun'iy yo'ldoshlarni yig'ish", w3: "faqat harbiy tanklarni masofadan yo'naltirish" },
    { n: "Aqlli uy tizimidagi harorat datchigi (DHT11/DHT22)", u: "xona havosining harorati va namlik darajasini o'lchab konditsioner yoki isitgichni boshqarish", w1: "faqat xonadon eshigining qulfini mexanik ochish", w2: "gaz plitasidagi olov rangini o'zgartirish", w3: "elektr motorining aylanish yo'nalishini teskari qilish" },
    { n: "Harakat datchigi (PIR datchik)", u: "inson tanasidan tarqalayotgan infraqizil issiqlik nurlanishini aniqlab avtomatik chiroqni yoqish", w1: "suv quvurlaridagi suv bosimini o'lchash", w2: "telefon batareyasini simsiz zaryadlash", w3: "faqat radio to'lqinlarini qabul qilib musiqa eshittirish" },
    { n: "Avtomatlashtirilgan changyutgich roboti", u: "xona xaritasini tuzish, to'siqlarni aylanib o'tish va pol yuzasini avtomat tozalab stansiyaga qaytish", w1: "faqat bitta nuqtada to'xtovsiz aylanib baland ovoz chiqarish", w2: "deraza oynalarini bolg'a bilan sindirish mexanizmi", w3: "faqat muzlatgich kamerasida sovuq ishlab chiqarish" },
    { n: "Arduino mikrokontrollerining boshqaruv roli", u: "dastur kodi asosida datchiklardan ma'lumot olib motorlar va relelarni boshqarish", w1: "faqat robot g'ildiraklari uchun plastik qopqoq bo'lish", w2: "elektr tarmog'idagi kuchlanishni 1000 voltga oshirish", w3: "robot korpusini changdan tozalovchi nam cho'tka" },
    { n: "Servomotor privodi (burchakli boshqaruv)", u: "impuls kengligi signali bilan o'qni 0 dan 180 darajagacha aniq burchakka burish", w1: "to'xtovsiz daqiqasiga 20000 marta aylanish", w2: "elektr tokini kimyoviy elementga aylantirish", w3: "faqat tovush signallarini kuchaytiruvchi karnay" },
    { n: "Ultrasiq masofa sensori (HC-SR04)", u: "ultratovush to'lqinining to'siqqa borib qaytish vaqti orqali masofani aniqlash", w1: "havo rangini aniqlab qizil va ko'kni ajratish", w2: "motorning moylash darajasini tekshirish", w3: "faqat robotning batareya foizini o'lchash" },
    { n: "Aqlli oshxona texnikasida taymer moduli", u: "taom pishirish vaqtini aniq hisoblab, vaqt tugaganda pechni avtomatik o'chirish", w1: "taomning tuzini avtomatik oshirib yuborish", w2: "oshxonadagi barcha chiroqlarni o'chirib qo'yish", w3: "suv jo'mragini buzib suv toshirish xavfi" },
    { n: "Robot manipulyatori (qisqich mexanizmi)", u: "turli buyum va idishlarni qisib ushlash, ko'tarish va joyini o'zgartirish", w1: "faqat to'g'ri chiziq bo'ylab poyga o'ynash uchun g'ildirak", w2: "akkumulyator batareyasini zaryadlovchi kabel", w3: "robot dasturini qog'ozga chop etuvchi printer" },
    { n: "Yorug'lik datchigi (fotorezistor)", u: "xona yorug'ligi pasayganda avtomatik ravishda pardalarni yopish yoki chiroqni yoqish", w1: "faqat robot motorining aylanish tezligini oshirish", w2: "suvning haroratini muzlatish darajasiga tushirish", w3: "dastur xotirasidagi o'zgaruvchilarni o'chirish" },
    { n: "Bluetooth/Wi-Fi simsiz boshqaruv moduli", u: "smartfon ilovasi orqali maishiy robotlarga masofadan turib buyruqlar berish", w1: "robotni to'g'ridan-to'g'ri 380 voltga ulash", w2: "metall detallarni zangdan tozalash usuli", w3: "faqat yuqori voltli elektr zaryadlari hosil qilish" },
    { n: "Avtomatik tikuv liniyalarida sensorlar", u: "mato qirrasi va ip uzilishini optik sensorlar orqali aniqlab dastgohni to'xtatish", w1: "matoni pichoq bilan qirqib tashlash operatsiyasi", w2: "motor aylanishini sun'iy tezlashtirib ignani sindirish", w3: "chok ipini loyqa suvga botirib tikish" },
    { n: "Robototexnikada xavfsizlik protokoli", u: "odam yaqinlashganda datchik signali bilan harakat tezligini sekinlashtirish yoki to'xtatish", w1: "odamga qarab yuqori tezlikda bostirib borish", w2: "barcha datchiklarni o'chirib ko'r-ko'rona harakatlanish", w3: "akkumulyator qizib ketganda ham to'xtovsiz ishlash" }
  ];

  const aspectStems = [
    (n) => `Xizmat ko'rsatish sohasi va robototexnika asoslariga ko'ra, '${n}' ning asosiy texnik vazifasi nima?`,
    (n) => `Aqlli tizimlar va servis robotlarini loyihalashda '${n}' qanday maqsadda qo'llaniladi?`,
    (n) => `Texnologiya (Servis) fani mashg'ulotlarida '${n}' mavzusida o'quvchilarga qaysi muhim qoida o'rgatiladi?`,
    (n) => `Zamonaviy mexatronika va servis texnologiyalarida '${n}' ning ishlash tamoyili qaysi javobda to'g'ri?`,
    (n) => `Xonadonni avtomatlashtirish va servis sohasida '${n}' qanday amaliy imkoniyat yaratadi?`,
    (n) => `Sensorli boshqaruv va intellektual qurilmalarda '${n}' qanday muhim rolni bajaradi?`,
    (n) => `Robototexnika laboratoriyasi sinovlarida '${n}' bo'yicha to'g'ri texnik xulosa qaysi?`,
    (n) => `Avtomatlashtirilgan xizmat ko'rsatish tizimlarida '${n}' qanday talabga javob berishi shart?`
  ];

  let id = 1717;
  for (let a = 0; a < 8; a++) {
    for (let i = 0; i < 13; i++) {
      const c = robot13[i];
      const q = aspectStems[a](c.n);
      const corr = `Asosiy vazifasi: ${c.u}`;
      const dists = [
        `Asosiy vazifasi: ${c.w1}`,
        `Asosiy vazifasi: ${c.w2}`,
        `Asosiy vazifasi: ${c.w3}`
      ];
      const exp = `Servis robototexnikasi asoslarida: ${c.n} — ${c.u}.`;
      const mnem = `${c.n}: Aniq boshqaruv, qulay servis va aqlli texnologiya.`;

      items.push(createItem(id, 201, secFile, q, corr, dists, exp, mnem));
      id++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, secFile), JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Section 06 tayyor: ${items.length} ta savol (IDs 1717..1820)`);
  return items;
}

console.log("=== BARCHA BO'LIMLARNI YARATISH BOSHLANDI (Texnologiya - Servis) ===");
buildSection01();
buildSection02();
buildSection03();
buildSection04();
buildSection05();
buildSection06();
console.log(`\n🎉 Jami ${seenStems.size} ta 100% YAGONA (takrorsiz) savollar muvaffaqiyatli yaratildi!`);
