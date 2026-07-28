import React from 'react';
import {
  Medal, ClipboardList, Target, Map, Shield, HeartPulse, GraduationCap, Palette, PaintBucket, LandPlot, Image as ImageIcon, Ruler, Settings, Home, BookOpen, Activity, Baby, Laptop, Smile, PenTool, Award,
  Compass, Scroll, Hourglass, Globe, Heart, Swords, Trophy, Flame, Calculator, Sun, Cpu, Code, FileText, Binary, Monitor, Wifi, MessageSquare, Scale, Users,
  Microscope, Brain, Mountain, Leaf, Dna, Ear,
  FlaskConical, Atom, Beaker, TestTube2, TestTubes, Languages, Type, SpellCheck, MessagesSquare, BookA, BookText, Puzzle, Feather, Combine
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TOPICS — mavzular ro'yxati (statik, ~2KB)
// Savollar endi Firestore'dan yuklanadi, bu yerda faqat metadata
// ══════════════════════════════════════════════════════════════

const chqbtTopics = [
  { id: 0, name: "Harbiy xizmat asoslari", subtitle: "Konstitutsiya, Mudofaa doktrinasi, Harbiy burch", icon: React.createElement(Medal, { size: 20 }), day: 1, category: 'chqbt',
    theoryHint: "📌 Harbiy xizmatning huquqiy asoslari. O'zbekiston Konstitutsiyasida mudofaa va harbiy xizmat bo'yicha belgilangan huquq hamda majburiyatlar. O'zbekiston Respublikasining Mudofaa doktrinasi, 'Umumharbiy majburiyat va harbiy xizmat to'g'risida'gi qonun va fuqarolarning harbiy xizmatni o'tash tartibi." },
  { id: 1, name: "Umumharbiy nizomlar", subtitle: "Ichki xizmat, Intizomiy, Garnizon va Saf nizomlari", icon: React.createElement(ClipboardList, { size: 20 }), day: 2, category: 'chqbt',
    theoryHint: "📌 O'zbekiston Qurolli Kuchlarining 4 ta asosiy nizomi: Ichki xizmat, Intizomiy, Garnizon va qorovullik xizmatlari hamda Saf nizomi. Ularning mazmun-mohiyati, harbiy unvonlar, navbatchilik va qorovullik xizmatlarini tashkil etish, safda harakatlanish qoidalari." },
  { id: 2, name: "Otish tayyorgarligi", subtitle: "AK-74, PM, ballistika, qurol tuzilishi va TTT", icon: React.createElement(Target, { size: 20 }), day: 4, category: 'chqbt',
    theoryHint: "📌 Qurol to'g'risidagi qonunchilik asoslari. O'qotar qurollar (AK-74, PM, pnevmatik qurollar) tuzilishi, ishlash prinsiplari va jangovar xususiyatlari. Otish hodisasi va uning davrlari, ichki va tashqi ballistika, qurollarni qismlarga ajratish hamda yig'ish qoidalari, texnika xavfsizligi." },
  { id: 3, name: "Taktik tayyorgarlik", subtitle: "Umumqo'shin jangi, topografiya, azimut va jangovar guruh", icon: React.createElement(Map, { size: 20 }), day: 5, category: 'chqbt',
    theoryHint: "📌 Zamonaviy umumqo'shin jangi asoslari va askarning jangdagi harakatlari. Harbiy topografiya: gorizont tomonlarini aniqlash, azimut bo'yicha harakatlanish, xaritani o'qish hamda xaritasiz mo'ljal olish. Jangovar guruh tarkibi, qurollanishi va uning jangovar imkoniyatlari." },
  { id: 4, name: "Fuqaro muhofazasi", subtitle: "Favqulodda vaziyatlar, OQQ va himoya vositalari", icon: React.createElement(Shield, { size: 20 }), day: 6, category: 'chqbt',
    theoryHint: "📌 Favqulodda vaziyatlar (tabiiy, texnogen, ekologik) turlari va FV vaqtidagi harakatlanish tartibi. Ommaviy qirg'in qurollari (yadroviy, kimyoviy, biologik) va ulardan himoyalanish usullari. Shaxsiy va jamoaviy himoya vositalari (GP-7, himoya kiyimlari)." },
  { id: 5, name: "Tibbiy bilim asoslari", subtitle: "Birinchi yordam, qon to'xtatish, shina va kuyish", icon: React.createElement(HeartPulse, { size: 20 }), day: 7, category: 'chqbt',
    theoryHint: "📌 Birinchi yordam ko'rsatish qoidalari. Qon ketish turlari va ularni to'xtatish usullari (jgut, bosuvchi bog'lam qo'yish). Jarohatlar va suyak sinishi belgilari, shina qo'yish. Kuyish darajalari, is gazidan zaharlanishda birinchi yordam va yuqumli kasalliklarning oldini olish." },
  { id: 6, name: "Pedagogik mahorat", subtitle: "CHQBT o'qitish metodikasi va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 8, category: 'chqbt',
    theoryHint: "📌 Pedagogika, didaktika va yosh psixologiyasi asoslari. Dars turlari va ularni rejalashtirish, sinfni samarali boshqarish. Sinf rahbarining huquq va majburiyatlari, sinf hujjatlarini yuritish tartibi, pedagogik etika va ota-onalar bilan hamkorlik." }
];

const artTopics = [
  { id: 7, name: "Tasviriy san'at asoslari", subtitle: "Rangtasvir, grafika, haykaltaroshlik va rangshunoslik", icon: React.createElement(Palette, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Tasviriy san’at turlari va janrlari (rangtasvir, grafika, haykaltaroshlik, me'morchilik). Rangshunoslik asoslari: iliq va sovuq ranglar, axromatik va xromatik ranglar, asosiy va hosila ranglarni aralashtirish. Natyurmort, portret, manzara, marina, maishiy va tarixiy janrlarni tahlil qilish." },
  { id: 8, name: "Amaliy bezak san'ati", subtitle: "Ganchkorlik, o'ymakorlik, kulolchilik va naqshlar", icon: React.createElement(PaintBucket, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Xalq amaliy bezak san’ati turlari (ganchkorlik, yog'och o'ymakorligi, zargarlik, kulolchilik, koshinchilik). Naqsh elementlari, 10 ta eng mashhur gul naqshlari, hududiy xalq amaliy san'ati maktablari va o'zbek ustalari ijodi tahlili." },
  { id: 9, name: "Me'morlik va Miniatyura", subtitle: "Arxitektura tarixi va Sharq miniatyura maktablari", icon: React.createElement(LandPlot, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Me’morlik (arxitektura) tarixi va turlari, qadimiy va zamonaviy memorchilik san'ati va taniqli me'morlar asarlari. Sharq miniatyura san’ati va miniatyura maktablarining (Toshkent, Buxoro, Samarqand, Hirot) o'ziga xosligi va buyuk namoyandalari." },
  { id: 10, name: "Dizayn va Zamonaviy san'at", subtitle: "Interyer/eksteryer dizayni va zamonaviy texnikalar", icon: React.createElement(ImageIcon, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Dizayn san’ati turlari va yo'nalishlari (interyer, eksteryer, libos, landshaft, avtomobil). Zamonaviy tasviriy san'at turlari va texnikalari (Fluid-art, Pop-art, monotipiya, klyaksografiya, grezayl, strit-art va grafiti)." },
  { id: 11, name: "Grafik savodxonlik", subtitle: "Chizmachilik formatlari, masshtab, proyeksiyalar va kesimlar", icon: React.createElement(Ruler, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Chizmachilik asoslari: formatlar, standartlar, masshtablar, chiziq turlari va chizmada o'lcham qo'yish qoidalari. Proyeksiyalash usullari (markaziy va parallel), aksonometrik proyeksiyalar (frontal dimetrik va izometrik), ko'rinishlar, kesim va qirqim turlari." },
  { id: 12, name: "Mashinasozlik chizmalari", subtitle: "Boltli/payvand birikmalar, rezbalar va yig'ish chizmalari", icon: React.createElement(Settings, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Ajraladigan va ajralmaydigan detallar birikmalari (boltli, shpilkali, payvand). Rezbalar va ularni chizmalarda tasvirlash hamda belgilash qoidalari. Oddiy yig‘ish chizmalarini o‘qish, tahlil qilish va detallashtirish." },
  { id: 13, name: "Qurilish chizmalari", subtitle: "Bino plani, fasad, qirqimlar va shartli belgilar", icon: React.createElement(Home, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Qurilish chizmalarini o'qish xususiyatlari, chizma elementlarini farqlash. Bino plani, fasadlari va qirqim chizmalarining tahlili. Qurilish chizmalarida qo'llaniladigan shartli belgilar va o'lchamlar qo'yish." },
  { id: 14, name: "Pedagogik mahorat", subtitle: "San'at o'qitish metodikasi va kasb standarti", icon: React.createElement(BookOpen, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Tasviriy san’at fani o'qitish metodikasi, dars turlari, tuzilishi va ularni rejalashtirish. Didaktika tamoyillari (onglilik, ko'rgazmalilik, tizimlilik). O'qituvchining kasbiy standarti, etika qoidalari va hamkorlik faoliyati." }
];

const tarixTopics = [
  { id: 15, name: "O'zbekiston tarixi I", subtitle: "Eng qadimgi davrdan XIII asrgacha (Qadimgi davr, IV–XIII asrlar)", icon: React.createElement(Compass, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 O‘zbekiston tarixining qadimgi va ilk o'rta asrlar (IV–XIII asrlar) davri. Qadimgi insonlar, dinlar (zardushtiylik), Buyuk ipak yo'li. Ilk o'rta asrlarda yer egaligi, ijtimoiy tabaqalar va Somoniylar, Qoraxoniylar, Xorazmshohlar davlatlari." },
  { id: 16, name: "O'zbekiston tarixi II", subtitle: "XIII–XV asrlar (Mo'g'ullar istilosi, Amir Temur va Temuriylar)", icon: React.createElement(Shield, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 XIII–XV asrlar davri: Mo'g'ullar istilosi va unga qarshi kurash (Jaloliddin Manguberdi). Amir Temur va Temuriylar saltanatining tashkil topishi, boshqaruv tizimi, harbiy yurishlar va ilm-fan, madaniyat rivoji." },
  { id: 17, name: "O'zbekiston tarixi III", subtitle: "XVI–XIX asr 1-yarmi (Buxoro, Xiva, Qo'qon xonliklari)", icon: React.createElement(Scroll, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 XVI–XIX asrning birinchi yarmi: Buxoro, Xiva va Qo'qon xonliklarining tashkil topishi. Davlat boshqaruvi, yer egaligi turlari, soliqlar, madaniy hayot va diplomatik aloqalar." },
  { id: 18, name: "O'zbekiston tarixi IV", subtitle: "XIX asr 2-yarmi – Mustaqillik (Chor Rossiyasi, Jadidchilik, SSRI)", icon: React.createElement(Map, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 XIX asrning ikkinchi yarmi – mustaqillik davri: Chor Rossiyasi istilosi, jadidchilik harakati, sho'rolar mustamlakachiligi va qatag'onlar. Mustaqillikka erishish jarayoni, siyosiy, iqtisodiy va madaniy islohotlar, tashqi siyosat." },
  { id: 19, name: "Jahon tarixi I", subtitle: "Eng qadimgi davrdan XV asrgacha (Qadimgi dunyo va O'rta asrlar)", icon: React.createElement(Hourglass, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Qadimgi dunyo va oʻrta asrlar (V–XV asrlar) jahon tarixi. Qadimgi sivilizatsiyalar (Misr, Bobil, Rim, Yunoniston). Oʻrta asrlarda Yevropa, Osiyo (Xitoy, Hindiston), Amerika va Afrika xalqlari hayoti, feodalizm va hukmdorlar." },
  { id: 20, name: "Jahon tarixi II", subtitle: "XVI asr – XX asr boshlari (Yangi davr, Sanoat to'ntarishi)", icon: React.createElement(Compass, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Jahon tarixining yangi davri (XVI–XX asr boshlari). Buyuk geografik kashfiyotlar, sanoat to'ntarishi, burjua inqiloblari. Yevropa, Amerika, Osiyo va Afrika mamlakatlarining siyosiy va iqtisodiy rivojlanishi." },
  { id: 21, name: "Jahon tarixi III", subtitle: "XX–XXI asrlar (Eng yangi tarix, Jahon urushlari, Globallashuv)", icon: React.createElement(Globe, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Jahonning eng yangi tarixi (XX–XXI asrlar). Birinchi va Ikkinchi jahon urushlari. Sovuq urush davri, mustamlakachilik tizimining yemirilishi. Globallashuv va hozirgi dunyoning dolzarb xalqaro muammolari." },
  { id: 22, name: "Pedagogik mahorat", subtitle: "Tarix o'qitish metodikasi, dars rejalashtirish va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Tarix o‘qitish metodikasi va dars turlari. Pedagogika va psixologiya asoslari, ta'lim texnologiyalari (loyihaviy, muammoli ta'lim). O'qituvchining kasb standarti va muloqot etikasi." }
];

const sportTopics = [
  { id: 23, name: "Fiziologiya va Sog'lom hayot", subtitle: "Sport fiziologiyasi, jismoniy yuklama va sog'lom turmush", icon: React.createElement(HeartPulse, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Sport fiziologiyasi va sog'lom turmush tarzi. Jismoniy yuklamalarga moslashish, mushak, nafas olish va yurak-qon tomir tizimining jismoniy tarbiyadagi ahamiyati hamda funksiyalari." },
  { id: 24, name: "Gimnastika qoidalari", subtitle: "Gimnastika mashqlari texnikasi, metodikasi va xavfsizlik", icon: React.createElement(Activity, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Gimnastika turlari, mashqlarning bajarilish texnikasi va qoidalari. Gimnastika mashg'ulotlarida metodik yondashuv, xavfsizlik va yuzaga keladigan xatolarni tahlil qilish." },
  { id: 25, name: "Harakatli o'yinlar", subtitle: "Yosh guruhlari bo'yicha harakatli o'yinlar va metodika", icon: React.createElement(Smile, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Harakatli o'yinlarning turlari va metodikasi. Bolalarning jismoniy sifatlarini (tezkorlik, chaqqonlik, kuch) rivojlantirishda o'yinlar roli va ularni yosh guruhlariga ko'ra rejalashtirish." },
  { id: 26, name: "Yengil atletika va Suzish", subtitle: "Yugurish, sakrash, uloqtirish va suzish uslublari", icon: React.createElement(Flame, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Yengil atletika turlari (yugurish, sakrash, uloqtirish) va suzish uslublari (krol, brass, chalqancha). Musobaqa qoidalari, mashqlar texnikasi va ularni o'rgatish metodikasi." },
  { id: 27, name: "Kurash va Taktika", subtitle: "Milliy kurash, dzyudo, erkin kurash va jangovar taktikalar", icon: React.createElement(Swords, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Kurash turlari (dzyudo, erkin kurash, milliy kurash) va ularning qoidalari. Jangovar texnik va taktik usullar, raqib harakatlarini tahlil qilish va amaliyotda qo'llash." },
  { id: 28, name: "Futbol va Voleybol", subtitle: "O'yin qoidalari, hakamlik, texnika va taktik sxemalar", icon: React.createElement(Target, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Futbol va voleybol o'yinlari turlari, texnikasi va taktikasi. O'yin qoidalari, hakamlik asoslari, jamoa o'yinlarida taktik sxemalarni qo'llash va xatolarni tahlil qilish." },
  { id: 29, name: "Basketbol, Gandbol, Shaxmat", subtitle: "O'yin qoidalari, shaxmat-shashka va sport inshootlari", icon: React.createElement(Trophy, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Basketbol, gandbol va shaxmat-shashka o'yinlarining qoidalari va taktikasi. Musobaqalarni tashkil etish, sport inshootlari turlari va ulardan xavfsiz foydalanish qoidalari." },
  { id: 30, name: "Pedagogik mahorat", subtitle: "Jismoniy tarbiya o'qitish metodikasi va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Jismoniy tarbiya o'qitish metodikasi, dars rejalashtirish va tashkil etish. Umumiy pedagogika va yosh psixologiyasi, kasbiy standart va hamkorlik etikasini bilish." }
];

const boshlangichTopics = [
  { id: 31, name: "Imlo va Uslubiyat", subtitle: "Talaffuz, imlo, bosh harflar, punktuatsiya va gap bo'laklari", icon: React.createElement(PenTool, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 Boshlang'ich sinflarda ona tili o'qitish: talaffuz va imlo qoidalari, bosh harflarni yozish, so'zlarni qo'shib/ajratib yozish. Tinish belgilari (punktuatsiya) va gap bo'laklarining kontekstdagi vazifalari." },
  { id: 32, name: "Lingvistik tahlil", subtitle: "Fonetik, leksik, morfemik va morfologik tahlil", icon: React.createElement(BookOpen, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 Ona tilidan fonetik, leksik, morfemik (so'z tarkibi) va morfologik (so'z turkumlari) tahlil o'tkazish, gap bo'laklarining sintaktik tahlili." },
  { id: 33, name: "O'qish va Adabiyot", subtitle: "Matn tahlili, o'zbek va jahon bolalar adabiyoti, folklor", icon: React.createElement(Heart, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 O'qish savodxonligi: badiiy matn tahlili (nasr), voqealar ketma-ketligi, qahramonlar obrazlari. O'zbek va jahon bolalar adabiyoti, xalq og'zaki ijodi va she'riy namunalar." },
  { id: 34, name: "Sonlar va Algebra", subtitle: "Natural/butun/kasr sonlar, tenglamalar va matnli masalalar", icon: React.createElement(Calculator, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 Boshlang'ich matematika: natural, butun va kasr sonlar ustida amallar, sonlarni taqqoslash. Formula va tenglamalar tuzish, oddiy matnli masalalarni yechish va tahlil qilish." },
  { id: 35, name: "Geometriya va Mantiq", subtitle: "Geometrik shakllar, perimetr/yuza va diagrammalar", icon: React.createElement(Ruler, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Geometrik shakllar, perimetr va yuza hisoblash, o'lchov birliklarini aylantirish. Mantiqiy kombinatorika masalalari, ma'lumotlar bilan ishlash (jadvallar, diagrammalar, grafiklar)." },
  { id: 36, name: "Geografiya va Biologiya", subtitle: "Litosfera, gidrosfera, atmosfera va tirik organizmlar", icon: React.createElement(Sun, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Tabiiy fanlar: litosfera, gidrosfera va atmosfera qatlamlari, O'zbekiston iqlimi va resurslari. Landshaftlar, tirik organizmlarning tuzilishi va biologik jarayonlar (ozuqa zanjiri)." },
  { id: 37, name: "Fizika, Kimyo va Tarbiya", subtitle: "Agregat holatlar, fizik-kimyoviy hodisalar va Tarbiya fani", icon: React.createElement(Globe, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Moddaning agregat holatlari, agregat o'zgarishlar (erish, muzlash, bug'lanish). Fizik va kimyoviy xossalar. Boshlang'ich sinf tarbiya fanining maqsadlari va tarbiya turlari." },
  { id: 38, name: "Pedagogik mahorat", subtitle: "Boshlang'ich ta'lim metodikasi va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Boshlang'ich ta'lim metodikasi, dars rejalashtirish va sinfni boshqarish. Bolalar psixologiyasi va didaktika asoslari, kasb standarti va ota-onalar bilan hamkorlik." }
];

const infoTopics = [
  { id: 39, name: "Raqamli madaniyat", subtitle: "Axborot jarayonlari, kodlash, kiberxavfsizlik va mualliflik", icon: React.createElement(Laptop, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Axborot va axborot jarayonlari, axborotni kodlash va o'lchov birliklari. Raqamli muhitda axloq, mualliflik huquqi va axborot xavfsizligi asoslari (zararli dasturlar va fishing)." },
  { id: 40, name: "Ofis dasturlari va VB", subtitle: "MS Word, MS Excel, PowerPoint, Access va SQL so'rovlari", icon: React.createElement(FileText, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Kompyuterning texnik va dasturiy ta'minoti. MS Word, MS Excel (formulalar, diagrammalar, filtrlar) va MS PowerPoint dasturlarida ishlash. MS Access ma'lumotlar bazasi va SQL so'rovlari." },
  { id: 41, name: "Mantiq va Sanoq tizimi", subtitle: "Mantiqiy amallar, rostlik jadvallari va sanoq sistemalari (2,8,10,16)", icon: React.createElement(Binary, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Mantiqiy mulohazalar, mantiqiy amallar, rostlik jadvallari va mantiqiy sxemalar. Pozitsiyali sanoq sistemalari (2-lik, 8-lik, 10-lik, 16-lik) va ularda arifmetik amallar bajarish." },
  { id: 42, name: "Algoritmlash va Scratch", subtitle: "Blok-sxemalar, algoritmlar va Scratch vizual dasturlash", icon: React.createElement(Cpu, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Algoritm turlari (chiziqli, tarmoqlanuvchi, takrorlanuvchi), blok-sxemalar va psevdokod. Scratch vizual dasturlash muhitida bloklar, o'zgaruvchilar va spraytlar bilan ishlash." },
  { id: 43, name: "Python va JS dasturlash", subtitle: "Python/JS sintaksisi, o'zgaruvchilar, sikllar va massivlar", icon: React.createElement(Code, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Python va JavaScript tillari sintaksisi. O'zgaruvchilar, shart operatorlari, sikllar, funksiyalar va massivlar bilan ishlash, oddiy dasturiy kodlar tahlili va natijasini aniqlash." },
  { id: 44, name: "Grafika va Veb-dizayn", subtitle: "Rastr/vektor grafika, HTML5 teglari va CSS3 stillari", icon: React.createElement(Monitor, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Rastrli va vektorli grafika. Rasm tahrirlash (Photoshop, Paint). HTML tilida teglari va atributlar (matn, rasm, ro'yxat, jadval, formalar) hamda CSS yordamida veb-sahifalarni bezash." },
  { id: 45, name: "Tarmoqlar va Xavfsizlik", subtitle: "IP manzillash, tarmoq topologiyalari va elektron xizmatlar", icon: React.createElement(Wifi, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Kompyuter tarmoqlari turlari, tarmoq topologiyalari. IP manzillash, tarmoq maskasi va tarmoq manzillarini hisoblash. Elektron hukumat xizmatlari va freelance platformalarida ishlash." },
  { id: 46, name: "Pedagogik mahorat", subtitle: "Informatika o'qitish metodikasi va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Informatika o'qitish metodikasi, dars rejalashtirish va baholash. AKT texnologiyalarini darsga joriy qilish, kasbiy standart va xavfsiz rivojlantiruvchi ta'lim muhiti." }
];

const mttTopics = [
  { id: 47, name: "Pedagogika va Rivojlanish", subtitle: "Maktabgacha pedagogika, bolaning psixik/jismoniy rivojlanishi", icon: React.createElement(Baby, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Maktabgacha pedagogika asoslari va bola rivojlanishi. Jismoniy, psixik va ijtimoiy rivojlanish bosqichlari, shaxs shakllanishiga ta'sir qiluvchi omillar va tarbiyachiga qo'yiladigan talablar." },
  { id: 48, name: "Tarbiyalash turlari", subtitle: "Aqliy, axloqiy, estetik, ekologik tarbiya va bolalar mehnati", icon: React.createElement(Heart, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Maktabgacha yoshdagi bolalarni aqliy, axloqiy, estetik, iqtisodiy, huquqiy va ekologik tarbiyalash. Bolalar mehnatining asosiy turlari va ularni amaliyotda to'g'ri tashkil qilish." },
  { id: 49, name: "Nutq va Sensor tarbiya", subtitle: "Nutq o'stirish, lug'at boyitish va sensor rivojlantirish", icon: React.createElement(MessageSquare, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Bolalar nutqini o'stirish, sensor tarbiya va matematik tasavvurlarni shakllantirish metodikasi. Badiiy adabiyot bilan tanishtirish, savodga o'rgatish va lug'at boyligini oshirish." },
  { id: 50, name: "Matematika va Tasviriy", subtitle: "Elementar matematik tasavvurlar va rasm/applikatsiya/yasash", icon: React.createElement(Palette, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Elementar matematik tasavvurlar va tasviriy faoliyat turlari (rasm chizish, loy/plastilin, applikatsiya, qurish-yasash). Sahnalashtirish va ijodiy faoliyatni tashkil qilish." },
  { id: 51, name: "O'yin va Rivojlanish muhiti", subtitle: "Syujet-rolli va didaktik o'yinlar, rivojlantiruvchi ta'lim muhiti", icon: React.createElement(Smile, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 O'yin – maktabgacha yoshdagi bolalarning yetakchi faoliyati. O'yin turlari (syujet-rolli, didaktik, harakatli) va guruhlarda rivojlantiruvchi ta'limiy muhitni loyihalash." },
  { id: 52, name: "Me'yoriy-huquqiy asoslar", subtitle: "'Ilk qadam' dasturi, MTT qonunlari va bolalar muhofazasi", icon: React.createElement(FileText, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 'Maktabgacha ta'lim va tarbiya to'g'risida'gi qonun, davlat talablari va 'Ilk qadam' davlat dasturi mazmuni. Bolalar hayoti va salomatligini muhofaza qilish, zo'ravonlikdan himoya." },
  { id: 53, name: "Bolalar xaritasi", subtitle: "Bola rivojlanish xaritasini yuritish va kuzatuv metodikasi", icon: React.createElement(Map, { size: 31 }), day: 31, category: 'mtt',
    theoryHint: "📌 Bolalarning rivojlanish darajasini (jismoniy, kognitiv, nutq, ijtimoiy-emotsional) kuzatish, qayd etish va 'bola rivojlanish xaritasi'ni to'g'ri yuritish, baholash qoidalari." },
  { id: 54, name: "Pedagogik mahorat", subtitle: "Maktabgacha ta'lim metodikasi va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 Pedagogik-psixologik kompetensiyalar, pedagogik etika, nutq va muloqot madaniyati. Rivojlantiruvchi ta'lim muhiti, innovatsion texnologiyalardan foydalanish va ota-onalar bilan hamkorlik." }
];

const tilTopics = [
  { id: 55, name: "Matn tahlili va Savodxonlik", subtitle: "Ilmiy-ommabop matn, fakt/fikr farqlash va xulosalash", icon: React.createElement(BookOpen, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 Ilmiy-ommabop matnlarni o'qib tushunish, fakt va fikrni farqlash, ma'lumotlarni taqqoslash va xulosalash. Matn qismlari o'rtasidagi mantiqiy bog'liqliklar va xronologiya tahlili." },
  { id: 56, name: "Imlo va Punktuatsiya", subtitle: "Imlo qoidalari, fonetik o'zgarishlar va tinish belgilari", icon: React.createElement(PenTool, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 Ona tili imlo qoidalari: talaffuz va imlo tafovutlari, bosh harflarni yozish, so'zlarni qo'shib/ajratib/chiziqcha bilan yozish, fonetik o'zgarishlar. Tinish belgilarining to'g'ri qo'llanilishi." },
  { id: 57, name: "Uslubiyat va Nutq", subtitle: "Nutq uslublari (so'zlashuv, rasmiy, ilmiy, badiiy) va uslubiy vazifalar", icon: React.createElement(MessageSquare, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 So'z va qo'shimchalarning kontekstdagi ma'nosi va uslubiy vazifalari. Nutq uslublari (so'zlashuv, rasmiy, ilmiy, publitsistik, badiiy). Nutqiy vaziyatlarga mos nutq namunalarini tanlash." },
  { id: 58, name: "Til nazariyasi", subtitle: "Fonetika, leksikologiya, morfologiya va sintaksis tahlili", icon: React.createElement(Ruler, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 Lisoniy birliklarni fonetik, leksik, morfemik (so'z tarkibi), morfologik (so'z turkumlari) va sintaktik (so'z birikmasi va gap tahlili) me'yorlar asosida chuqur lingvistik tahlil qilish." },
  { id: 59, name: "Badiiy matn va Adabiyot", subtitle: "Nasr/dramatik matn tahlili, g'oya va qahramonlar ruhiyati", icon: React.createElement(FileText, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 Badiiy matn (nasriy, dramatik) tahlili, muallif uslubini, asarning umumiy mazmuni va tagma'nolarini aniqlash. Asar qahramonlarining ruhiy holati va kechinmalarini baholash." },
  { id: 60, name: "Milliy adabiyot tarixi", subtitle: "Folklor, mumtoz adabiyot (Navoiy, Bobur) va Jadid adabiyoti", icon: React.createElement(Scroll, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 O'zbek xalq og'zaki ijodi va milliy adabiyot tarixi. Mumtoz adabiyot namoyandalari (Navoiy, Bobur va b.) va XX asr jadid adabiyoti, yangi o'zbek she'riyati, nasri va dramaturgiyasi." },
  { id: 61, name: "Jahon adabiyoti tarixi", subtitle: "Jahon adabiyoti shedevrlari, aruz/barmoq vaznlari va badiiy san'atlar", icon: React.createElement(Globe, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 Jahon adabiyoti tarixidagi eng mashhur epik, lirik va dramatik asarlar tahlili. Mumtoz lirika janri, vazni (aruz, barmoq) va qofiya tizimi, badiiy san'atlarni aniqlash va farqlash." },
  { id: 62, name: "Pedagogik mahorat", subtitle: "Ona tili va adabiyot o'qitish metodikasi va kasb standarti", icon: React.createElement(GraduationCap, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 Ona tili va adabiyot o'qitish metodikasi, ta'lim texnologiyalari. Umumiy pedagogika, didaktika va yosh psixologiyasi. O'qituvchining kasb standarti, etika va hamkorlik faoliyati." }
];

const mttRahbarTopics = [
  { id: 63, name: "Pedagogika va Rivojlanish", subtitle: "Maktabgacha yoshdagi bolalar rivojlanishini boshqarish", icon: React.createElement(Baby, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 Maktabgacha pedagogika va bolaning yosh/individual rivojlanish bosqichlari. O'yin muhitini yaratish, axloqiy, aqliy, jismoniy va estetik tarbiya turlarini boshqarish va nazorat qilish." },
  { id: 64, name: "Tarbiyaviy yo'nalishlar", subtitle: "Ta'lim-tarbiya jarayonini rejalashtirish va muvofiqlashtirish", icon: React.createElement(Heart, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 Tarbiyaviy va ta'limiy jarayonlarni rejalashtirish, tahlil qilish hamda metodik rahbarlik qilish. Tarbiyachi, musiqa rahbari, defektologlar faoliyatini metodik jihatdan muvofiqlashtirish." },
  { id: 65, name: "Metodik rahbarlik", subtitle: "Tarbiyachilarga metodik maslahat va innovatsiyalarni joriy etish", icon: React.createElement(ClipboardList, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 MTTda ta'lim-tarbiya jarayonlariga metodik rahbarlik qilish, tarbiyachilarga metodik maslahat va ko'rsatmalar berish, ilg'or pedagogik tajribalarni ommalashtirish texnologiyalari." },
  { id: 66, name: "Xodimlar boshqaruvi", subtitle: "Pedagoglar malakasini oshirish va kasb standartlari monitoringi", icon: React.createElement(Users, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 Pedagog kadrlar kompetentligini oshirish, kasbiy standart talablarini joriy etish, pedagogik kengashlar, seminarlar va treninglarni tashkil qilish, uzluksiz malaka oshirish monitoringi." },
  { id: 67, name: "Me'yoriy-huquqiy asoslar", subtitle: "MTT qonunchiligi, 'Ilk qadam' va bolalar salomatligi muhofazasi", icon: React.createElement(Scale, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 Maktabgacha ta'limga oid qonunlar, davlat standartlari, 'Ilk qadam' dasturi talablari. Bolalarni zo'ravonlikdan himoya qilish, ularning hayoti va sog'lig'ini muhofaza qilish qoidalari." },
  { id: 68, name: "Kuzatuv kengashi", subtitle: "Jamoatchilik boshqaruvi, Kuzatuv kengashi va inklyuziv ta'lim", icon: React.createElement(Shield, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 MTTda jamoatchilik boshqaruvi va Kuzatuv kengashi faoliyatini tashkil etish. Ekologik ta'lim-tarbiyani rivojlantirish va inklyuziv ta'lim (alohida ehtiyojli bolalar) jarayonini boshqarish." },
  { id: 69, name: "Hujjatlar va Muhit", subtitle: "MTT yillik ish rejasi, hujjatlar va ta'limiy rivojlantiruvchi muhit", icon: React.createElement(Award, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 MTTning yillik ish rejasini tuzish va ijrosini ta'minlash, pedagoglar ish hujjatlarini yuritish tartibi, bola rivojlanish kuzatuv xaritalari hamda guruhlarda rivojlantiruvchi ta'lim muhitini tashkil qilish." },
  { id: 70, name: "Pedagogik mahorat", subtitle: "Boshqaruv kompetensiyasi, etika va pedagogik dizayn", icon: React.createElement(GraduationCap, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 Rahbar xodimning pedagogik-psixologik kompetensiyalari, boshqaruv etika qoidalari, pedagogik dizayn va bolalar rivojlanish dinamikasini metodik qo'llab-quvvatlash va baholash." }
];

// ── Biologiya (test spetsifikatsiyasi 2026: 50 savol, 120 daqiqa) ──
const biologiyaTopics = [
  { id: 80, name: "Biologiya asoslari va tiriklikning xilma-xilligi", subtitle: "Tiriklik darajalari va organizmlar guruhlari tasnifi", icon: React.createElement(Microscope, { size: 20 }), day: 1, category: 'biologiya',
    theoryHint: "📌 Biologik hodisa va jarayonlarni boshqa fanlar bilan bog'liq holda tushunish, tiriklik darajalari, tirik organizmlar guruhlarini belgilari bo'yicha farqlash, tabiiy jarayonlarni tahlil qilish." },
  { id: 81, name: "Hujayra biologiyasi", subtitle: "Organoidlar, fotosintez, nafas olish, DNK va biosintez", icon: React.createElement(Dna, { size: 20 }), day: 1, category: 'biologiya',
    theoryHint: "📌 Organik va anorganik moddalar, hujayra tuzilmalari va organoidlari funksiyasi, moddalar almashinuvi (fotosintez, nafas olish), DNK tuzilishi va irsiy axborot bosqichlari." },
  { id: 82, name: "Organizmlar biologiyasi", subtitle: "O'simlik, hayvon va inson anatomiyasi hamda fiziologiyasi", icon: React.createElement(Leaf, { size: 20 }), day: 1, category: 'biologiya',
    theoryHint: "📌 Organizmlar tuzilishi, hayot faoliyati, ko'payishi va rivojlanishi; o'simlik, hayvon va inson organizmi sistemalari hamda ularning funksiyalarini taqqoslash." },
  { id: 83, name: "Genetika va evolyutsiya", subtitle: "Mendel qonunlari, genetik masalalar va tabiiy tanlanish", icon: React.createElement(Activity, { size: 20 }), day: 2, category: 'biologiya',
    theoryHint: "📌 Irsiyat va o'zgaruvchanlik qonuniyatlari, Mendel qonunlari, genetik masalalar yechish, evolyutsion ta'limot, tabiiy tanlanish va turlarning kelib chiqishi." },
  { id: 84, name: "Ekosistema va biosfera darajasi", subtitle: "Oziq zanjiri, biotsenoz va ekologik muammolar", icon: React.createElement(Sun, { size: 20 }), day: 2, category: 'biologiya',
    theoryHint: "📌 Hayotning ekosistema va biosfera darajasi, oziq zanjirlari, moddalar va energiya aylanishi, populyatsiya, biotsenoz hamda ekologik muammolar." },
  { id: 85, name: "Kasb standarti", subtitle: "Biologiya o'qituvchisining kasbiy kompetensiyalari", icon: React.createElement(Scale, { size: 20 }), day: 2, category: 'biologiya',
    theoryHint: "📌 Biologiya o'qituvchisining kasb standarti talablari, o'quv jarayonini tashkil etish va baholash mezonlari." },
  { id: 86, name: "Pedagogik mahorat", subtitle: "Biologiya o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 2, category: 'biologiya',
    theoryHint: "📌 Pedagogika, didaktika va psixologiya asoslari, dars turlari va rejalashtirish, sinfni boshqarish hamda pedagogik etika." }
];

// ── Geografiya (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const geografiyaTopics = [
  { id: 87, name: "Geografiyaning boshlang'ich kursi", subtitle: "Litosfera, gidrosfera, atmosfera, plan va xaritalar", icon: React.createElement(Globe, { size: 20 }), day: 1, category: 'geografiya',
    theoryHint: "📌 Geografik qobiq, litosfera, atmosfera, gidrosfera, plan va xarita, geografik koordinatalar hamda boshlang'ich geografik tushunchalar." },
  { id: 88, name: "Materiklar va okeanlar tabiiy geografiyasi", subtitle: "Materiklar relyefi, iqlimi, ichki suvlari va organik dunyosi", icon: React.createElement(Map, { size: 20 }), day: 1, category: 'geografiya',
    theoryHint: "📌 Materiklar va okeanlarning tabiiy geografik o'rni, relyefi, iqlimi, ichki suvlari, tabiat zonalari va organik dunyosi." },
  { id: 89, name: "O'rta Osiyo va O'zbekiston tabiiy geografiyasi", subtitle: "Relyef, foydali qazilmalar, iqlim va ichki suvlar", icon: React.createElement(Mountain, { size: 20 }), day: 1, category: 'geografiya',
    theoryHint: "📌 O'rta Osiyo va O'zbekistonning geografik o'rni, relyefi, foydali qazilmalari, iqlimi, ichki suvlari, tuproq, o'simlik va hayvonot dunyosi." },
  { id: 90, name: "O'zbekiston iqtisodiy va ijtimoiy geografiyasi", subtitle: "Aholi, sanoat, qishloq xo'jaligi va iqtisodiy rayonlar", icon: React.createElement(LandPlot, { size: 20 }), day: 2, category: 'geografiya',
    theoryHint: "📌 O'zbekiston aholisi, mehnat resurslari, sanoat, qishloq xo'jaligi tarmoqlari, transport va iqtisodiy rayonlar." },
  { id: 91, name: "Jahon iqtisodiy va ijtimoiy geografiyasi", subtitle: "Siyosiy xarita, jahon xo'jaligi va tabiiy resurslar", icon: React.createElement(Compass, { size: 20 }), day: 2, category: 'geografiya',
    theoryHint: "📌 Dunyoning siyosiy xaritasi, jahon aholisi va xo'jaligi, tabiiy resurslar geografiyasi, mintaqalar va davlatlar iqtisodiyoti." },
  { id: 92, name: "Amaliy geografiya", subtitle: "Geoekologiya, tabiatdan foydalanish va atrof-muhit muhofazasi", icon: React.createElement(Ruler, { size: 20 }), day: 2, category: 'geografiya',
    theoryHint: "📌 Jamiyat va tabiat o'rtasidagi munosabatlar, geoekologik muammolar, tabiatdan oqilona foydalanish va atrof-muhit muhofazasi." },
  { id: 93, name: "Geografik masala va topshiriqlar", subtitle: "Masshtab, vaqt mintaqalari, bosim va harorat masalalari", icon: React.createElement(Calculator, { size: 20 }), day: 3, category: 'geografiya',
    theoryHint: "📌 Masshtab, vaqt mintaqalari, mutlaq va nisbiy balandlik, harorat va bosim, aholi zichligi kabi geografik masala va misollarni yechish." },
  { id: 94, name: "Geografik grafik materiallar", subtitle: "Xaritalar, profillar, diagrammalar va jadvallar tahlili", icon: React.createElement(FileText, { size: 20 }), day: 3, category: 'geografiya',
    theoryHint: "📌 Xarita, diagramma, jadval, profil va boshqa grafik materiallarni o'qish, tahlil qilish va ulardan ma'lumot olish." },
  { id: 95, name: "Kasb standarti", subtitle: "Geografiya o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 3, category: 'geografiya',
    theoryHint: "📌 Geografiya o'qituvchisining kasb standarti talablari, o'quv jarayonini tashkil etish va baholash mezonlari." },
  { id: 96, name: "Pedagogik mahorat", subtitle: "Geografiya o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 3, category: 'geografiya',
    theoryHint: "📌 Pedagogika, didaktika va psixologiya asoslari, dars turlari va rejalashtirish, sinfni boshqarish hamda pedagogik etika." }
];

// ── MTT Logopedi (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const mttLogopedTopics = [
  { id: 97, name: "Tovush talaffuzi buzilishlari", subtitle: "Dislaliya, tovush nuqsonlari va korreksiyasi", icon: React.createElement(MessageSquare, { size: 20 }), day: 1, category: 'mtt_logoped',
    theoryHint: "📌 Tovush talaffuzidagi nuqsonlar (dislaliya), ularning turlari, sabablari, aniqlash va tuzatish (korreksiya) usullari." },
  { id: 98, name: "Markaziy (neyrogen) nutq buzilishlari", subtitle: "Afaziya, dizartriya va asab tizimi nuqsonlari", icon: React.createElement(Brain, { size: 20 }), day: 1, category: 'mtt_logoped',
    theoryHint: "📌 Markaziy asab tizimi shikastlanishi bilan bog'liq nutq buzilishlari (afaziya, dizartriya), ularning belgilari va korreksion ishlar." },
  { id: 99, name: "Motor nutq buzilishlari", subtitle: "Artikulyatsiya apparati va harakat nutqi mashqlari", icon: React.createElement(Ear, { size: 20 }), day: 1, category: 'mtt_logoped',
    theoryHint: "📌 Nutqning harakat (motor) tomonidagi buzilishlar, artikulyatsion apparat faoliyati va ularni rivojlantirish mashqlari." },
  { id: 100, name: "Nutqning ritm va ravonligi buzilishlari", subtitle: "Duduqlanish (zaiklik) va nutq ravonligi profilaktikasi", icon: React.createElement(Activity, { size: 20 }), day: 2, category: 'mtt_logoped',
    theoryHint: "📌 Duduqlanish (zaiklik) va nutq ravonligining boshqa buzilishlari, ularning sabablari, profilaktikasi va korreksiyasi." },
  { id: 101, name: "Tovush talaffuzi va ovoz rezonansi buzilishlari", subtitle: "Rinolaliya, ovoz nuqsonlari va logopedik korreksiya", icon: React.createElement(MessageSquare, { size: 20 }), day: 2, category: 'mtt_logoped',
    theoryHint: "📌 Ovoz va rezonans (rinolaliya) buzilishlari, ularning anatomik-fiziologik sabablari va logopedik korreksiya yo'llari." },
  { id: 102, name: "Nutqning umumiy rivojlanmaganligi", subtitle: "NUR darajalari va leksik-grammatik rivojlantirish", icon: React.createElement(Heart, { size: 20 }), day: 2, category: 'mtt_logoped',
    theoryHint: "📌 Nutqning umumiy rivojlanmaganligi (NUR) darajalari, leksik-grammatik va fonetik tomonlarini rivojlantirish bo'yicha ishlar." },
  { id: 103, name: "Yozma nutq buzilishlari", subtitle: "Disgrafiya va disleksiyani aniqlash hamda tuzatish", icon: React.createElement(PenTool, { size: 20 }), day: 3, category: 'mtt_logoped',
    theoryHint: "📌 Disgrafiya va disleksiya — yozish va o'qish buzilishlari, ularning turlari, aniqlash va tuzatish metodikasi." },
  { id: 104, name: "O'qish va yozish bilan bog'liq buzilishlar", subtitle: "Savod o'rgatishga tayyorlash va korreksion mashqlar", icon: React.createElement(BookOpen, { size: 20 }), day: 3, category: 'mtt_logoped',
    theoryHint: "📌 O'qish va yozish ko'nikmalari shakllanishidagi buzilishlar, savod o'rgatishga tayyorgarlik va korreksion mashg'ulotlar." },
  { id: 105, name: "Kasb standarti", subtitle: "Logoped kasb standarti va baholash mezonlari", icon: React.createElement(Scale, { size: 20 }), day: 3, category: 'mtt_logoped',
    theoryHint: "📌 Logoped mutaxassisining kasb standarti talablari, faoliyatni tashkil etish va baholash mezonlari." },
  { id: 106, name: "Pedagogik mahorat", subtitle: "Logopedik mashg'ulotlar metodikasi va psixologiya", icon: React.createElement(GraduationCap, { size: 20 }), day: 3, category: 'mtt_logoped',
    theoryHint: "📌 Maktabgacha pedagogika, didaktika va psixologiya asoslari, mashg'ulotlarni rejalashtirish hamda pedagogik etika." }
];

// ── MTT Psixologi (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const mttPsixologTopics = [
  { id: 107, name: "Psixologiya maqsadi, vazifalari va metodlari", subtitle: "Yosh psixologiyasi va tadqiqot metodlari", icon: React.createElement(Brain, { size: 20 }), day: 1, category: 'mtt_psixolog',
    theoryHint: "📌 Yosh (ontogenez) psixologiyasi fanining maqsadi, vazifalari, asosiy tushunchalari va tadqiqot metodlari." },
  { id: 108, name: "Oila psixologiyasi", subtitle: "Oilaviy munosabatlar va ota-onalar bilan ishlash", icon: React.createElement(Heart, { size: 20 }), day: 1, category: 'mtt_psixolog',
    theoryHint: "📌 Oila va oilaviy munosabatlar psixologiyasi, bola tarbiyasida oilaning roli hamda ota-onalar bilan ishlash." },
  { id: 109, name: "Hayotiy davrlar va rivojlanish bosqichlari", subtitle: "Yosh davrlari va yetakchi faoliyat turlari", icon: React.createElement(Hourglass, { size: 20 }), day: 1, category: 'mtt_psixolog',
    theoryHint: "📌 Inson hayotining yosh davrlari, har bir bosqichdagi psixik rivojlanish qonuniyatlari va yetakchi faoliyat turlari." },
  { id: 110, name: "Inklyuziv ta'lim", subtitle: "Alohida ehtiyojli bolalar bilan ishlash va korreksion ta'lim", icon: React.createElement(Users, { size: 20 }), day: 2, category: 'mtt_psixolog',
    theoryHint: "📌 Inklyuziv ta'lim tamoyillari, alohida ehtiyojli bolalar bilan ishlash, korreksion-rivojlantiruvchi mashg'ulotlar." },
  { id: 111, name: "Yosh psixologiyasi", subtitle: "Idrok, diqqat, xotira, tafakkur va emotsional soha", icon: React.createElement(Smile, { size: 20 }), day: 2, category: 'mtt_psixolog',
    theoryHint: "📌 Maktabgacha yoshdagi bolalar psixik jarayonlari (idrok, diqqat, xotira, tafakkur, nutq), shaxs va emotsional-irodaviy soha rivojlanishi." },
  { id: 112, name: "Kasb standarti", subtitle: "Psixolog kasb standarti va kasbiy etika", icon: React.createElement(Scale, { size: 20 }), day: 3, category: 'mtt_psixolog',
    theoryHint: "📌 Psixolog mutaxassisining kasb standarti talablari, faoliyatni tashkil etish va baholash mezonlari." },
  { id: 113, name: "Pedagogik mahorat", subtitle: "Psixologik konsultatsiya va mashg'ulotlar metodikasi", icon: React.createElement(GraduationCap, { size: 20 }), day: 3, category: 'mtt_psixolog',
    theoryHint: "📌 Maktabgacha pedagogika, didaktika asoslari, mashg'ulotlarni rejalashtirish hamda pedagogik etika va muloqot." }
];

// ── Kimyo (test spetsifikatsiyasi 2026: 50 savol, 120 daqiqa) ──
const kimyoTopics = [
  { id: 114, name: "Umumiy kimyo", subtitle: "Atom tuzilishi, davriy qonun, eritmalar, elektroliz va kinetika", icon: React.createElement(Atom, { size: 20 }), day: 1, category: 'kimyo',
    theoryHint: "📌 Atom-molekula ta'limoti, davriy qonun va atom tuzilishi; elektrolitik dissotsiatsiya, eritmalar, elektroliz, gidroliz, oksidlanish-qaytarilish reaksiyalari; kimyoviy kinetika, muvozanat va termodinamika asoslari." },
  { id: 115, name: "Anorganik kimyo", subtitle: "Oksidlar, kislotalar, tuzlar, metallar va metallmaslar", icon: React.createElement(FlaskConical, { size: 20 }), day: 1, category: 'kimyo',
    theoryHint: "📌 Anorganik birikmalarning muhim sinflari (oksidlar, asoslar, kislotalar, tuzlar) va genetik bog'lanishlari; metallar (I-A, II-A, III-A, Cu, Fe, Cr, Mn) hamda metallmaslarning olinishi va xossalari." },
  { id: 116, name: "Organik kimyo: uglevodorodlar", subtitle: "Alkanlar, alkenlar, alkinlar va aromatik birikmalar", icon: React.createElement(Beaker, { size: 20 }), day: 2, category: 'kimyo',
    theoryHint: "📌 Organik kimyo tuzilish nazariyasi, izomeriya, IUPAC nomenklaturasi; alkanlar, alkenlar, alkadiyenlar, alkinlar, sikloalkanlar va aromatik uglevodorodlarning tuzilishi, olinishi va xossalari." },
  { id: 117, name: "Organik kimyo: kislorodli va azotli birikmalar", subtitle: "Spirtlar, kislotalar, uglevodlar, oqsillar va polimerlar", icon: React.createElement(TestTube2, { size: 20 }), day: 2, category: 'kimyo',
    theoryHint: "📌 Spirtlar, fenollar, aldegidlar, ketonlar, karbon kislotalar, efirlar, yog'lar, uglevodlar; aminlar, aminokislotalar, oqsillar hamda polimerlar, kauchuk va tolalarning tuzilishi va xossalari." },
  { id: 118, name: "Laboratoriya mashg'ulotlari", subtitle: "Kimyoviy tajribalar, sifat reaksiyalari va jihozlar", icon: React.createElement(TestTubes, { size: 20 }), day: 3, category: 'kimyo',
    theoryHint: "📌 Kimyo laboratoriya jihozlari va ulardan foydalanish tartibi; anorganik va organik birikmalarning olinishi hamda ularga xos sifat reaksiyalari va kimyoviy tajribalar." },
  { id: 119, name: "Kasb standarti", subtitle: "Kimyo o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 3, category: 'kimyo',
    theoryHint: "📌 Kimyo o'qituvchisining kasb standarti talablari, o'quv jarayonini rejalashtirish, ta'lim samaradorligi va baholash mezonlari." },
  { id: 120, name: "Pedagogik mahorat", subtitle: "Kimyo o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 3, category: 'kimyo',
    theoryHint: "📌 Pedagogika, didaktika va psixologiya asoslari, kimyo o'qitish metodikasi, dars turlari va rejalashtirish, sinfni boshqarish hamda pedagogik etika." }
];

// ── Rus tili — RKI (test spetsifikatsiyasi 2026: 50 savol, 105 daqiqa) ──
const rusTiliTopics = [
  { id: 121, name: "O'qish savodxonligi", subtitle: "Matnni o'qib tushunish, fakt/fikr va ko'chma ma'nolar", icon: React.createElement(BookText, { size: 20 }), day: 1, category: 'rus_tili',
    theoryHint: "📌 Badiiy, publitsistik va ilmiy matnlarni o'qib tushunish va talqin qilish; fakt va fikrni farqlash, matnni tahlil qilish va xulosa chiqarish, so'zning to'g'ri va ko'chma ma'nosini ajratish." },
  { id: 122, name: "San'at asarini talqin qilish", subtitle: "Tasviriy san'at, kino, teatr va adabiyot taqqosi", icon: React.createElement(Palette, { size: 20 }), day: 1, category: 'rus_tili',
    theoryHint: "📌 Tasviriy san'at asarini g'oyaviy-mavzuviy jihatdan tahlil qilish, adabiyot va boshqa san'at turlari (rangtasvir, musiqa, teatr, kino) bilan taqqoslash, rassom niyatini anglash." },
  { id: 123, name: "Leksika, orfoepiya va so'z tarkibi", subtitle: "Omonimlar, urg'u, talaffuz hamda so'z yasalishi", icon: React.createElement(SpellCheck, { size: 20 }), day: 2, category: 'rus_tili',
    theoryHint: "📌 Omonim, paronim, sinonim, antonim va frazeologizmlar; urg'u va talaffuz (orfoepiya) normalari; so'z tarkibi va so'z yasalishi usullari." },
  { id: 124, name: "Morfologiya va orfografiya", subtitle: "So'z turkumlari va orfografiya tamoyillari", icon: React.createElement(Type, { size: 20 }), day: 2, category: 'rus_tili',
    theoryHint: "📌 Mustaqil va yordamchi so'z turkumlari hamda ularning morfologik belgilari; rus orfografiyasi tamoyillari, o'zakda undosh va unlilar imlosi." },
  { id: 125, name: "Sintaksis va punktuatsiya", subtitle: "Sodda/qo'shma gaplar va tinish belgilari", icon: React.createElement(Puzzle, { size: 20 }), day: 3, category: 'rus_tili',
    theoryHint: "📌 So'z birikmasi va bog'lanish turlari (kelishuv, boshqaruv, bitishuv); sodda va qo'shma gaplar (BSP, SSP, SPP) tuzilishi hamda ularda tinish belgilari." },
  { id: 126, name: "Til nazariyasi va lingvistik tahlil", subtitle: "Lingvistik tahlil va adabiy til normalari", icon: React.createElement(Feather, { size: 20 }), day: 3, category: 'rus_tili',
    theoryHint: "📌 Matnni fonetik, leksik, morfem, morfologik va sintaktik normalar asosida lingvistik tahlil qilish; zamonaviy rus adabiy tili normalarini qo'llash." },
  { id: 127, name: "Kasb standarti", subtitle: "Rus tili o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'rus_tili',
    theoryHint: "📌 Rus tili o'qituvchisining kasb standarti talablari, o'quv jarayonini rejalashtirish, ta'lim samaradorligi va baholash mezonlari." },
  { id: 128, name: "Pedagogik mahorat", subtitle: "RKI o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'rus_tili',
    theoryHint: "📌 Pedagogika, didaktika va psixologiya asoslari, rus tilini o'qitish metodikasi, dars turlari va rejalashtirish, sinfni boshqarish hamda pedagogik etika." }
];

// ── Ingliz tili (test spetsifikatsiyasi 2026: 50 savol, 105 daqiqa) ──
const inglizTopics = [
  { id: 129, name: "Reading: ilmiy-ommabop matn", subtitle: "Academic text comprehension, main ideas & inference", icon: React.createElement(BookOpen, { size: 20 }), day: 1, category: 'ingliz',
    theoryHint: "📌 Ilmiy-ommabop matnning asosiy g'oyasi, maqsadi, auditoriyasi va muallif pozitsiyasini aniqlash; ochiq va yashirin ma'lumotlarni anglash, fakt va fikrni farqlash, leksik birliklar ma'nosini kontekstdan tushunish." },
  { id: 130, name: "Reading: voqeaband matn", subtitle: "Narrative text analysis, detail extraction & chronology", icon: React.createElement(BookText, { size: 20 }), day: 1, category: 'ingliz',
    theoryHint: "📌 Voqeaband matnning asosiy g'oyasi, muhim detallari va yashirin ma'lumotlarini tushunish; voqealar ketma-ketligini va ishtirokchilarini aniqlash, leksik birliklar ma'nosini kontekstdan anglash." },
  { id: 131, name: "Reading: matn yaxlitligi", subtitle: "Text cohesion, coherence & logical connectors", icon: React.createElement(Combine, { size: 20 }), day: 2, category: 'ingliz',
    theoryHint: "📌 Matnning mazmuniy birligi va yaxlitligini tushunish; gap yoki xat boshi tartibini tiklash, matn qismlari o'rtasidagi mantiqiy va diskursiv bog'lanishlarni (sabab-oqibat, qarama-qarshilik, ketma-ketlik) aniqlash." },
  { id: 132, name: "Grammatika", subtitle: "Grammar structures, error identification & transformations", icon: React.createElement(Type, { size: 20 }), day: 2, category: 'ingliz',
    theoryHint: "📌 Grammatik strukturaning nomi va qo'llanilishini aniqlash; kontekstga mos grammatik birlik tanlash, grammatik xatoni topish va tushuntirish, gaplarni grammatik transformatsiya qilish." },
  { id: 133, name: "Leksika (Vocabulary)", subtitle: "Contextual vocabulary, collocations & word formation", icon: React.createElement(SpellCheck, { size: 20 }), day: 3, category: 'ingliz',
    theoryHint: "📌 Kontekstga mos leksik birlik va sinonim tanlash; so'z yasalishi, ma'nosi yaqin so'zlarni (say/tell/speak/talk) farqlash, leksik xato va kollokatsiya nomuvofiqligini aniqlash." },
  { id: 134, name: "Pragmatika", subtitle: "Pragmatic competence, communicative intention & register", icon: React.createElement(MessagesSquare, { size: 20 }), day: 3, category: 'ingliz',
    theoryHint: "📌 Vaziyatga mos nutq namunasini tanlash; ko'zda tutilgan ma'noni (literal, ironic, exaggerated) anglash, ijtimoiy-kommunikativ moslikni baholash, muloqot strategiyasi va niyatni aniqlash." },
  { id: 135, name: "Kasb standarti", subtitle: "EFL Teacher Professional Standards", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'ingliz',
    theoryHint: "📌 Ingliz tili o'qituvchisining kasb standarti talablari, o'quv jarayonini rejalashtirish, ta'lim samaradorligi va baholash mezonlari." },
  { id: 136, name: "Pedagogik mahorat va ELT", subtitle: "ELT Methodologies (TBLT, PPP, CLIL, CLT) & lesson planning", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'ingliz',
    theoryHint: "📌 Pedagogika asoslari va ingliz tili o'qitish metodikasi hamda yondashuvlar (Structural, TBLT, PPP, Lexical, Communicative, CLIL, Grammar-Translation); dars rejalashtirish va sinfni boshqarish." }
];

// group: 'school' (umumiy o'rta ta'lim, 9 fan) | 'mtt' (maktabgacha ta'lim, 4 fan)
// Fan tanlash UI shu guruhlar bo'yicha ajratiladi (README Variant B).
export const SUBJECTS = [
  { id: 'chqbt', name: "CHQBT", icon: Medal, group: 'school', desc: "Harbiy bilimlar, Konstitutsiya va birinchi yordam" },
  { id: 'art', name: "Tasviriy San'at", icon: Palette, group: 'school', desc: "Chizmachilik va san'at tarixi" },
  { id: 'tarix', name: "Tarix", icon: BookOpen, group: 'school', desc: "O'zbekiston va Jahon tarixi, pedagogik mahorat" },
  { id: 'sport', name: "Jismoniy Tarbiya", icon: Activity, group: 'school', desc: "Sport nazariyasi va metodikasi" },
  { id: 'boshlangich', name: "Boshlang'ich Ta'lim", icon: Baby, group: 'school', desc: "Ona tili, matematika, tabiiy fanlar, metodika" },
  { id: 'info', name: "Informatika va AT", icon: Laptop, group: 'school', desc: "Kompyuter tizimlari, algoritmlash va dasturlash" },
  { id: 'mtt', name: "MTT Tarbiyachilari", icon: Smile, group: 'mtt', desc: "Maktabgacha ta'lim pedagogikasi va metodikasi" },
  { id: 'mtt_rahbar', name: "MTT Dir. O'rinbosari", icon: Award, group: 'mtt', desc: "Metodik rahbarlik, me'yoriy hujjatlar va boshqaruv" },
  { id: 'til', name: "Ona Tili va Adabiyot", icon: PenTool, group: 'school', desc: "Til qoidalari, adabiyot tarixi va tahlili" },
  { id: 'biologiya', name: "Biologiya", icon: Microscope, group: 'school', desc: "Hujayra, organizmlar, genetika, ekologiya va metodika" },
  { id: 'geografiya', name: "Geografiya", icon: Globe, group: 'school', desc: "Tabiiy va iqtisodiy geografiya, xaritashunoslik va metodika" },
  { id: 'mtt_logoped', name: "MTT Logopedi", icon: MessageSquare, group: 'mtt', desc: "Nutq buzilishlari, korreksiya va logopedik metodika" },
  { id: 'mtt_psixolog', name: "MTT Psixologi", icon: Brain, group: 'mtt', desc: "Yosh psixologiyasi, oila, inklyuziv ta'lim va metodika" },
  { id: 'kimyo', name: "Kimyo", icon: FlaskConical, group: 'school', desc: "Umumiy, anorganik, organik kimyo va metodika" },
  { id: 'rus_tili', name: "Rus tili", icon: Languages, group: 'school', desc: "RKI: matn tahlili, grammatika, leksika va metodika" },
  { id: 'ingliz', name: "Ingliz tili", icon: BookA, group: 'school', desc: "Reading, grammar, vocabulary, pragmatics va ELT metodika" }
];

export const TOPICS = [...chqbtTopics, ...artTopics, ...tarixTopics, ...sportTopics, ...boshlangichTopics, ...infoTopics, ...mttTopics, ...mttRahbarTopics, ...tilTopics, ...biologiyaTopics, ...geografiyaTopics, ...mttLogopedTopics, ...mttPsixologTopics, ...kimyoTopics, ...rusTiliTopics, ...inglizTopics];

export const SCHEDULE = [
  { day: 1, date: "2 May", topic: "Harbiy xizmat asoslari", tests: 8, goal: "Konstitutsiya, Mudofaa doktrinasi", topicId: 0 },
  { day: 2, date: "3 May", topic: "Nizomlar: Ichki xizmat + Intizomiy", tests: 8, goal: "2 nizomni o'rganish va farqlash", topicId: 1 },
  { day: 3, date: "4 May", topic: "Nizomlar: Garnizon + Saf", tests: 8, goal: "Qolgan 2 nizom + takrorlash", topicId: 1 },
  { day: 4, date: "5 May", topic: "Otish tayyorgarligi", tests: 50, goal: "Kalashnikov, Qurol qonuni, Ballistika, Moddiy qism va TTT", topicId: 2 },
  { day: 5, date: "6 May", topic: "Taktik tayyorgarlik", tests: 13, goal: "Topografiya, azimut, jangovar guruh", topicId: 3 },
  { day: 6, date: "7 May", topic: "Fuqaro muhofazasi", tests: 15, goal: "FV turlari, OQQ, Zilzila, Ko'chki, KTEZM va yong'in xavfsizligi", topicId: 4 },
  { day: 7, date: "8 May", topic: "Tibbiy bilim asoslari", tests: 17, goal: "Birinchi yordam, jarohat va sinish turlari, kuyish darajalari, zaharli hasharotlar", topicId: 5 },
  { day: 8, date: "9 May", topic: "Pedagogik mahorat (1)", tests: 10, goal: "Paradigmalar, dars turlari", topicId: 6 },
  { day: 9, date: "10 May", topic: "Pedagogik mahorat (2)", tests: 10, goal: "Sinf rahbari, etika, metodika", topicId: 6 },
  { day: 10, date: "11 May", topic: "Tasviriy san'at va Chizmachilik", tests: 5, goal: "Ranglar, standartlar, perspektiva", topicId: 7 },
  { day: 11, date: "12 May", topic: "Umumiy takrorlash", tests: 50, goal: "Barcha bo'limlar — aralash test", topicId: -1 },
  { day: 12, date: "13 May", topic: "Imtihon kuni", tests: 0, goal: "Muvaffaqiyatlar!", topicId: -1 }
];
