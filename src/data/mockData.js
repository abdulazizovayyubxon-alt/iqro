import React from 'react';
import {
  Medal, ClipboardList, Target, Map, Shield, HeartPulse, GraduationCap, Palette, PaintBucket, LandPlot, Image as ImageIcon, Ruler, Settings, Home, BookOpen, Activity, Baby, Laptop, Smile, PenTool, Award,
  Compass, Scroll, Hourglass, Globe, Heart, Swords, Trophy, Flame, Calculator, Sun, Cpu, Code, FileText, Binary, Monitor, Wifi, MessageSquare, Scale, Users,
  Microscope, Brain, Mountain, Leaf, Dna, Ear,
  FlaskConical, Atom, Beaker, TestTube2, TestTubes, Languages, Type, SpellCheck, MessagesSquare, BookA, BookText, Puzzle, Feather, Combine,
  Waves, Dumbbell,
  Sigma, SquareFunction, Dices, TrendingUp, Triangle, Box, HandHeart, Flag, Smartphone, Lightbulb, Briefcase, Sprout, Handshake,
  ClipboardCheck, Mic, Accessibility, BadgeCheck, Cog, Thermometer, Zap, Eye, Orbit, Hammer, Wrench, Factory, Bot, ChefHat, Scissors,
  Music, Coins, Landmark, Sparkles, Volume2
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

// ── MTT jismoniy tarbiya yo'riqchisi (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
// Mutaxassislik 35 ta (7 mazmun sohasi) + kasb standarti 5 ta + pedagogik mahorat 10 ta.
const mttJismoniyTopics = [
  { id: 137, name: "Valeologiya va sog'lom turmush tarzi", subtitle: "Sog'lom odatlar, yuklama dozasi va xavfsizlik", icon: React.createElement(HeartPulse, { size: 20 }), day: 1, category: 'mtt_jismoniy',
    theoryHint: "📌 Sog'lom turmush tarzi asoslari va uni MTT kun tartibiga integratsiya qilish; 2–7 yoshli bola organizmining xususiyatlari, jismoniy sifatlar, yuklamani dozalash, chiniqtirish, mashg'ulot xavfsizligi va birinchi yordam." },
  { id: 138, name: "Gimnastika turlari va qoidalari", subtitle: "Saf mashqlari, maxsus qadamlar, akrobatika va snaryadlar", icon: React.createElement(Activity, { size: 20 }), day: 1, category: 'mtt_jismoniy',
    theoryHint: "📌 Gimnastikaning asosiy turlari va farqlari; saf hamda umumrivojlantiruvchi mashqlar, maxsus qadamlar, akrobatika elementlari, snaryadlarda mashq, sug'urta qoidalari va mashqni o'rgatish metodikasi." },
  { id: 139, name: "Harakatli o'yinlar", subtitle: "Tasnifi, yosh guruhlariga moslash va milliy o'yinlar", icon: React.createElement(Smile, { size: 20 }), day: 2, category: 'mtt_jismoniy',
    theoryHint: "📌 Harakatli o'yinlar tasnifi va vazifalari; o'yinni yosh guruhiga (kichik, o'rta, katta, maktabga tayyorlov) moslashtirish, o'tkazish metodikasi, milliy o'yinlar hamda ular orqali jismoniy sifatlarni rivojlantirish." },
  { id: 140, name: "Yengil atletika turlari va qoidalari", subtitle: "Yurish, yugurish, sakrash va uloqtirish texnikasi", icon: React.createElement(Flame, { size: 20 }), day: 2, category: 'mtt_jismoniy',
    theoryHint: "📌 Yengil atletika turlari; yurish va yugurish (sprint bosqichlari, o'rta va uzoq masofa), sakrash hamda uloqtirish texnikasi, tipik xatolarni tahlil qilish va musobaqa qoidalarini qo'llash." },
  { id: 141, name: "Suzish turlari va qoidalari", subtitle: "Krol, brass, batterflyay va suvda xavfsizlik", icon: React.createElement(Waves, { size: 20 }), day: 3, category: 'mtt_jismoniy',
    theoryHint: "📌 Suzish usullari (krol, chalqancha krol, brass, batterflyay) va qoidalari; harakat texnikasi fazalari, maktabgacha yoshda suvga o'rgatish bosqichlari, suvda xavfsizlik va cho'kishda birinchi yordam." },
  { id: 142, name: "Sport o'yinlari turlari va qoidalari", subtitle: "Futbol, voleybol, basketbol, gandbol, shaxmat", icon: React.createElement(Trophy, { size: 20 }), day: 3, category: 'mtt_jismoniy',
    theoryHint: "📌 Sport o'yinlari (futbol, voleybol, basketbol, gandbol, shaxmat-shashka) maydoni, qoidalari, texnika va taktika elementlari; hakamlik hamda ularning elementlarini maktabgacha yoshda o'rgatish." },
  { id: 143, name: "Sport inshootlari", subtitle: "Turlari, o'lchamlari, jihozlash va xavfsizlik", icon: React.createElement(LandPlot, { size: 20 }), day: 4, category: 'mtt_jismoniy',
    theoryHint: "📌 Sport inshootlari tasnifi va toifalari, maydon, zal hamda havza o'lchamlari; jihozlash, foydalanish qoidalari, texnika xavfsizligi va mavjud sharoitni tahlil qilib samaradorlikni baholash." },
  { id: 144, name: "Kasb standarti", subtitle: "MTT pedagogi kasbiy standarti va mehnat vazifalari", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'mtt_jismoniy',
    theoryHint: "📌 MTT pedagogining kasbiy standarti: umumiy qoidalar, bilim-ko'nikma-malaka talablari, mehnat vazifalari, baholanadigan ko'rsatkichlar hamda faoliyat natijalarini tahlil qilish." },
  { id: 145, name: "Pedagogik mahorat", subtitle: "Pedagogika, «Ilk qadam» dasturi va metodik savodxonlik", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'mtt_jismoniy',
    theoryHint: "📌 Pedagogik-psixologik kompetensiyalar, «Ilk qadam» dasturi va bolalar rivojlanishini qo'llab-quvvatlash, pedagogik jarayonni loyihalash hamda innovatsion ta'lim texnologiyalari." }
];

// ── Maktab fanlarining kasb standarti va pedagogik mahorat bo'limlari uchun
// umumiy nazariy izoh: spetsifikatsiyalarning 2-jadvali hamma fanda bir xil,
// faqat «fan o'qitish metodikasi» qatori farq qiladi.
const KASB_STANDARTI_HINT = "📌 Pedagogning kasbiy standarti: o'quv jarayonini rejalashtirish, ta'lim samaradorligini ta'minlash, o'zlashtirishni baholash va qayta aloqa, tarbiyaviy faoliyat, xavfsiz rivojlantiruvchi ta'lim muhiti, o'z-o'zini rivojlantirish hamda hamkasblar va ota-onalar bilan hamkorlik.";
const pedMahoratHint = (metodika) => `📌 Pedagogika, didaktika, tarbiya va yosh psixologiyasi asoslari; didaktik tamoyillar; dars turlari, darsni rejalashtirish va sinfni boshqarish; sinf rahbari faoliyati, pedagogik etika va qobiliyatlar; ta'lim texnologiyalari hamda ${metodika}.`;

// ── Matematika (test spetsifikatsiyasi 2026: 50 savol, 120 daqiqa) ──
const matematikaTopics = [
  { id: 146, name: "Sonlar va amallar", subtitle: "Ratsional sonlar, darajalar, ildizlar, EKUB va EKUK", icon: React.createElement(Calculator, { size: 20 }), day: 1, category: 'matematika',
    theoryHint: "📌 Natural, butun va ratsional sonlar ustida amallar; kasrlar va aralash sonlarni soddalashtirish; daraja va ildiz qatnashgan ifodalar; sonlarning bo'linish xossalari, EKUB va EKUK ga doir masalalar." },
  { id: 147, name: "Algebra va funksiyalar", subtitle: "Ifodalar, progressiyalar, tenglama va tengsizliklar", icon: React.createElement(SquareFunction, { size: 20 }), day: 1, category: 'matematika',
    theoryHint: "📌 Algebraik ifodalarni soddalashtirish va ko'paytuvchilarga ajratish, Bezu teoremasi; matnli masalaga matematik model tuzish; arifmetik, geometrik va cheksiz kamayuvchi geometrik progressiya; chiziqli, kvadrat, ratsional, irratsional, ko'rsatkichli, logarifmik va trigonometrik tenglama va tengsizliklar, sistemalar hamda parametrli tenglamalar." },
  { id: 148, name: "Statistika va ehtimollik", subtitle: "Kombinatorika, Bernulli va Beys formulalari, Nyuton binomi", icon: React.createElement(Dices, { size: 20 }), day: 2, category: 'matematika',
    theoryHint: "📌 To'plamlar va kombinatorika asoslari; ehtimollar nazariyasi: to'la ehtimollik, Bernulli va Beys formulalari; Nyuton binomi va binomial koeffitsiyentlar yordamida yoyilmaning umumiy hadini topish." },
  { id: 149, name: "Matematik analiz asoslari", subtitle: "Limit, uzluksizlik, hosila va integral tatbiqlari", icon: React.createElement(TrendingUp, { size: 20 }), day: 2, category: 'matematika',
    theoryHint: "📌 Funksiya limiti va uzluksizligi; hosila olish qoidalari va hosila yordamida funksiyani tekshirish; boshlang'ich funksiya, asosiy integrallash qoidalari va C o'zgarmasning ma'nosi; hosila va aniq integralning geometrik hamda amaliy tatbiqlari." },
  { id: 150, name: "Planimetriya", subtitle: "Burchaklar, uchburchak, to'rtburchaklar va muntazam ko'pburchaklar", icon: React.createElement(Triangle, { size: 20 }), day: 3, category: 'matematika',
    theoryHint: "📌 Geometrik aksioma va teoremalar; vertikal, qo'shni va parallel to'g'ri chiziqlar hosil qilgan burchaklar; parallelogramm, romb va trapetsiya xossalari; uchburchak elementlari, sinuslar va kosinuslar teoremalari; muntazam ko'pburchakka ichki va tashqi chizilgan aylanalar." },
  { id: 151, name: "Stereometriya", subtitle: "Vektorlar, prizma, piramida, silindr va konus", icon: React.createElement(Box, { size: 20 }), day: 3, category: 'matematika',
    theoryHint: "📌 Tekislik va fazodagi vektorlar, skalyar ko'paytma, parallellik va perpendikulyarlik shartlari; prizma, piramida, silindr va konusning elementlari, sirt yuzi va hajmi; kesim va proyeksiyalar; bir nechta jismdan tuzilgan kombinatsion shakllar." },
  { id: 152, name: "Kasb standarti", subtitle: "Matematika o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'matematika',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 153, name: "Pedagogik mahorat", subtitle: "Matematika o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'matematika',
    theoryHint: pedMahoratHint("matematika o'qitish metodikasi") }
];

// ── Tarbiya (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const tarbiyaTopics = [
  { id: 154, name: "Insonning ma'naviy va axloqiy qadriyatlari", subtitle: "Milliy va umuminsoniy qadriyatlar, muomala madaniyati", icon: React.createElement(Heart, { size: 20 }), day: 1, category: 'tarbiya',
    theoryHint: "📌 Milliy va umuminsoniy qadriyatlar, go'zal fazilatlar, muomala va muloqot madaniyati; «men insonman» tamoyillari; to'g'ri va noto'g'ri xatti-harakatlarni ajratish, tenglik, haqqoniylik va etiket qoidalarini vaziyatda qo'llash." },
  { id: 155, name: "Fuqarolik hissi", subtitle: "Vatanparvarlik, daxldorlik, fuqarolik huquq va burchlari", icon: React.createElement(Flag, { size: 20 }), day: 1, category: 'tarbiya',
    theoryHint: "📌 Vatanparvarlik, fuqarolik hissi va daxldorlik; fuqarolik huquq va burchlarini farqlash; faol fuqarolik darajalari; qonun va mas'uliyatli xulq; Konstitutsiya va «Bola huquqlarining kafolatlari to'g'risida»gi qonun." },
  { id: 156, name: "Yashashdan maqsad — munosib hayot", subtitle: "Oilaviy qadriyatlar, muvaffaqiyat omillari, vaqtni boshqarish", icon: React.createElement(Sun, { size: 20 }), day: 1, category: 'tarbiya',
    theoryHint: "📌 Munosib hayot mezonlari, muvaffaqiyatga erishish omillari va vaqtni samarali taqsimlash; baxtiyorlik tuyg'usi; oilaviy qadriyatlar va oliy maqsad; sabab-oqibat bog'liqligini tahlil qilib xulosa chiqarish." },
  { id: 157, name: "O'z-o'zini anglash va rivojlanish", subtitle: "Hissiyotlarni boshqarish, tanqidiy fikrlash, sog'lom turmush", icon: React.createElement(Brain, { size: 20 }), day: 2, category: 'tarbiya',
    theoryHint: "📌 Hissiyotlarni farqlash va qiyin vaziyatda boshqarish; shaxsiy va jamiyatdagi o'zgarishlarni tanqidiy fikrlash asosida tahlil qilish; sog'lom turmush tarzi, to'g'ri ovqatlanish va salomatlikka tahdidlar." },
  { id: 158, name: "Inson va jamiyat", subtitle: "Jamiyat, mahalla, oila, din, madaniyat va huquqiy me'yorlar", icon: React.createElement(Users, { size: 20 }), day: 2, category: 'tarbiya',
    theoryHint: "📌 Jamiyat, mahalla, oila, din va madaniyat tushunchalari hamda vazifalarini farqlash; huquqiy me'yorlarni aniqlash; turli ijtimoiy vaziyatlarning yechimi va izchil xulosa." },
  { id: 159, name: "Ijtimoiy tarmoq: imkoniyat va tahdidlar", subtitle: "Raqamli odob, axborot xavfsizligi va ogohlik", icon: React.createElement(Smartphone, { size: 20 }), day: 2, category: 'tarbiya',
    theoryHint: "📌 Ijtimoiy tarmoqlarning imkoniyat va tahdidlari; global tarmoqda xavfsizlik va odob-axloq; soxta va ishonchli axborotni farqlash; shaxsiy ma'lumotlarni himoya qilish va ogohlik talablari." },
  { id: 160, name: "Ilm-ma'rifat va innovatsiya", subtitle: "Liderlik, SMART maqsad va tanqidiy fikrlash", icon: React.createElement(Lightbulb, { size: 20 }), day: 3, category: 'tarbiya',
    theoryHint: "📌 Ilm-ma'rifatning shaxs va jamiyat taraqqiyotidagi o'rni; innovatsion va liderlik yondashuvlari; maqsadga erishishni «SMART» texnologiyasi asosida tahlil qilish; tanqidiy fikrlash va ilmiy asoslangan xulosa." },
  { id: 161, name: "Tadbirkorlik asoslari", subtitle: "Tadbirkorlik, frilanserlik, moliyaviy va vaqt resurslari", icon: React.createElement(Briefcase, { size: 20 }), day: 3, category: 'tarbiya',
    theoryHint: "📌 Tadbirkorlik va frilanserlik tushunchalarini farqlash; moliyaviy va vaqt resurslarini boshqarish; g'oya va boylikdan foydalanish mezonlari; shaxsiy rivojlanish ko'nikmalari." },
  { id: 162, name: "Ekologik tarbiya", subtitle: "Tabiat va inson, tabiiy resurslardan oqilona foydalanish", icon: React.createElement(Sprout, { size: 20 }), day: 3, category: 'tarbiya',
    theoryHint: "📌 Tabiat va inson o'rtasidagi bog'liqlik; tabiiy resurslar turlari va ulardan oqilona foydalanish tamoyillari; ekologik muammolar va ularning to'g'ri yechimi." },
  { id: 163, name: "Tinch va xotirjam yashash baxti", subtitle: "Hamkorlik, bag'rikenglik va millatlararo hamjihatlik", icon: React.createElement(Handshake, { size: 20 }), day: 4, category: 'tarbiya',
    theoryHint: "📌 Hamkorlik, bag'rikenglik va millatlararo hamjihatlik tushunchalari; millatlararo totuvlikka oid huquqiy me'yorlar; millatlararo muloqot odobi va hayotiy vaziyatlarda to'g'ri yechim." },
  { id: 164, name: "Jamoaviy munosabatlar", subtitle: "Ziddiyatlar va yechimlar, o'zaro yordam, jamoada ishlash", icon: React.createElement(MessagesSquare, { size: 20 }), day: 4, category: 'tarbiya',
    theoryHint: "📌 Jamoaviy munosabatlar va ijtimoiy ko'nikmalar; ziddiyatlarni bartaraf etishning maqbul yo'llari; jamoada ishlash; oiladagi munosabatlar va ziddiyatlarning oldini olish." },
  { id: 165, name: "Kasb standarti", subtitle: "Tarbiya o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'tarbiya',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 166, name: "Pedagogik mahorat", subtitle: "Tarbiya fanini o'qitish metodikasi va didaktika", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'tarbiya',
    theoryHint: pedMahoratHint("Tarbiya fanini o'qitish metodikasi") }
];

// ── Pedagogik mahorat va kasb standarti — maktab va MTT pedagoglari uchun UMUMIY fan
// (15 savol, 30 daqiqa; imtihon faqat shu blokdan iborat — config.examTotal).
// Bo'limlar `audience` bo'yicha ikki yo'nalishga bo'lingan: 'mtt' (167–176, MTT
// spetsifikatsiyasi) va 'school' (204–207, maktab fanlari spetsifikatsiyalaridagi
// 36–50-savollar bloki). Foydalanuvchiga faqat o'z yo'nalishi ko'rinadi — data/pedAudience.
const pedmahoratTopics = [
  { id: 167, name: "Qonunchilik va me'yoriy asoslar", subtitle: "Ta'lim va maktabgacha ta'lim to'g'risidagi qonunlar", icon: React.createElement(FileText, { size: 20 }), day: 1, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 «Ta'lim to'g'risida»gi va «Maktabgacha ta'lim va tarbiya to'g'risida»gi qonunlar: ta'lim sohasidagi davlat siyosati tamoyillari, ta'lim olish huquqi, inklyuziv ta'lim, ta'lim turlari hamda pedagog va tarbiyalanuvchining huquq va majburiyatlari." },
  { id: 168, name: "Davlat standarti va «Ilk qadam»", subtitle: "MTT davlat standarti (VM 802) va davlat o'quv dasturi", icon: React.createElement(ClipboardCheck, { size: 20 }), day: 1, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 Maktabgacha ta'lim va tarbiyaning davlat standarti (VM 802-son qarori) talablari; «Ilk qadam» davlat o'quv dasturining maqsad va tamoyillari, rivojlanish sohalari va kutilayotgan natijalar." },
  { id: 169, name: "Yosh davrlari va bola psixologiyasi", subtitle: "0–7 yosh rivojlanish bosqichlari va yosh xususiyatlari", icon: React.createElement(Baby, { size: 20 }), day: 1, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 0–7 yosh davrida bolaning jismoniy, kognitiv, nutq va ijtimoiy-emotsional rivojlanish bosqichlari; yosh xususiyatlari, yetakchi faoliyat turlari va psixik jarayonlar rivoji." },
  { id: 170, name: "Pedagogik texnika va nutq madaniyati", subtitle: "Ovoz, nafas, diksiya, mimika va nutq odobi", icon: React.createElement(Mic, { size: 20 }), day: 2, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 Pedagogik texnika elementlari: nafas va ovoz, diksiya, mimika va pantomimika; pedagog nutqining madaniyati, ifodaliligi va to'g'riligi; o'zini boshqarish va emotsional holatni nazorat qilish." },
  { id: 171, name: "Pedagogik muloqot va kasb etikasi", subtitle: "Muloqot uslublari, pedagogik takt va odob", icon: React.createElement(MessageSquare, { size: 20 }), day: 2, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 Pedagogik muloqot uslublari va bosqichlari; pedagogik takt, nazokat va odob; kasb etikasi qoidalari; bolalar, ota-onalar va hamkasblar bilan samarali muloqot, nizoli vaziyatlarni hal etish." },
  { id: 172, name: "Bolaga yo'naltirilgan ta'lim va muhit", subtitle: "Rivojlantiruvchi muhit va differensial yondashuv", icon: React.createElement(HandHeart, { size: 20 }), day: 2, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 Bolaga yo'naltirilgan va differensial yondashuv mantig'i; bolaning qiziqish va ehtiyojlari asosida ta'lim; rivojlantiruvchi ta'lim muhiti va markazlarni loyihalashning tayanch shartlari." },
  { id: 173, name: "O'yinli texnologiyalar va faoliyatlar", subtitle: "Syujet-rolli va didaktik o'yinlar, konstruksiyalash", icon: React.createElement(Puzzle, { size: 20 }), day: 3, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 O'yin — maktabgacha yoshdagi bolaning yetakchi faoliyati; syujet-rolli, didaktik va harakatli o'yinlar; o'yin asosida o'qitish; qurish-konstruksiyalash, tasviriy va dizayn faoliyatini tashkil etish." },
  { id: 174, name: "Innovatsion metodlar va pedagogik dizayn", subtitle: "Loyiha, muammoli va hamkorlikdagi ta'lim, loyihalash", icon: React.createElement(Lightbulb, { size: 20 }), day: 3, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 Innovatsion pedagogik texnologiyalar (loyihaga asoslangan, muammoli, hamkorlikdagi, interfaol ta'lim); pedagogik jarayonni loyihalash: model–loyiha–amaliyot ketma-ketligi va pedagogik dizayn turlari; raqamli ta'lim vositalari." },
  { id: 175, name: "Rivojlanishni kuzatish va inklyuziv ta'lim", subtitle: "Kuzatuv, rivojlanish xaritasi, alohida ehtiyojli bolalar", icon: React.createElement(Accessibility, { size: 20 }), day: 3, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 Oraliq va yakuniy kuzatishning maqsad va tamoyillari, «rivojlanish xaritasi» vazifasi; bola rivojlanish dinamikasini baholash; inklyuziv ta'lim, individual ta'lim dasturi va alohida ta'lim ehtiyojli bolalar bilan ishlash." },
  { id: 176, name: "Pedagogning kasbiy standarti va rivojlanishi", subtitle: "MTT pedagogi kasbiy standarti (VM 423), malaka oshirish", icon: React.createElement(BadgeCheck, { size: 20 }), day: 4, category: 'pedmahorat', audience: 'mtt',
    theoryHint: "📌 MTT pedagogining kasbiy standarti (VM 423-son qarori): umumiy qoidalar, bilim-ko'nikma-malaka talablari, mehnat vazifalari va baholanadigan ko'rsatkichlar; uzluksiz kasbiy rivojlanish, portfolio va attestatsiya." },
  // Maktab yo'nalishi (204–207): maktab fanlari spetsifikatsiyalaridagi 36–50-savollar bloki
  { id: 204, name: "Kasb standarti: o'qituvchi mehnat vazifalari", subtitle: "Rejalashtirish, samaradorlik, baholash, tarbiya, xavfsiz muhit, hamkorlik", icon: React.createElement(ClipboardList, { size: 20 }), day: 1, category: 'pedmahorat', audience: 'school',
    theoryHint: "📌 Umumiy o'rta ta'lim maktabi o'qituvchisining kasb standarti: 2 ta umumlashtirilgan va 7 ta mehnat vazifasi — o'quv jarayonini rejalashtirish, ta'lim samaradorligini ta'minlash, o'zlashtirishni baholash va qayta aloqa, tarbiyaviy faoliyat, xavfsiz rivojlantiruvchi muhit, o'z-o'zini rivojlantirish va hamkorlik; mehnat harakatlari, zarur ko'nikma va bilimlar." },
  { id: 205, name: "Didaktika: tamoyillar, metodlar va dars turlari", subtitle: "Ta'lim tamoyillari, metodlari, dars turlari va Blum taksonomiyasi", icon: React.createElement(BookOpen, { size: 20 }), day: 2, category: 'pedmahorat', audience: 'school',
    theoryHint: "📌 Didaktik tamoyillar (onglilik va faollik, ko'rgazmalilik, tizimlilik, ilmiylik, tushunarlilik, nazariya va amaliyot birligi); ta'lim metodlari va shakllari; dars turlari va tuzilishi; dars maqsadlari va Blum taksonomiyasi; pedagogik paradigmalar." },
  { id: 206, name: "Tarbiya va sinfni boshqarish", subtitle: "Tarbiya turlari va metodlari, sinf rahbari, pedagogik vaziyatlar", icon: React.createElement(Users, { size: 20 }), day: 3, category: 'pedmahorat', audience: 'school',
    theoryHint: "📌 Tarbiya turlari, tamoyillari va metodlari; sinfni boshqarish uslublari (avtoritar, demokratik, liberal); sinf rahbari faoliyati va ota-onalar bilan hamkorlik shakllari; nizo, bulling va murakkab pedagogik vaziyatlarda to'g'ri yo'l tutish." },
  { id: 207, name: "Pedagogik mahorat va ta'lim texnologiyalari", subtitle: "Pedagogik qobiliyat, takt, texnika, nutq va interfaol metodlar", icon: React.createElement(Lightbulb, { size: 20 }), day: 4, category: 'pedmahorat', audience: 'school',
    theoryHint: "📌 Pedagogik qobiliyat turlari (didaktik, akademik, perseptiv, avtoritar, kommunikativ va boshq.), pedagogik takt, texnika, etika va nutq madaniyati; ta'lim texnologiyalari (muammoli, loyiha, interfaol, modulli, integratsion) va interfaol metodlar, ularning afzallik va kamchiliklari." }
];

// ── Fizika (test spetsifikatsiyasi 2026: 50 savol, 120 daqiqa) — savollar tez orada ──
const fizikaTopics = [
  { id: 177, name: "Mexanika", subtitle: "Kinematika, dinamika, energiya, impuls va muvozanat", icon: React.createElement(Cog, { size: 20 }), day: 1, category: 'fizika',
    theoryHint: "📌 Kinematika: yo'l, tezlik, tezlanish va grafiklar; dinamika: Nyuton qonunlari va kuchlar; ish, energiya, quvvat, impuls va saqlanish qonunlari; aylanma harakat elementlari, moment va muvozanat turlari." },
  { id: 178, name: "Molekulyar fizika va issiqlik", subtitle: "Ideal gaz, izojarayonlar, issiqlik miqdori", icon: React.createElement(Thermometer, { size: 20 }), day: 1, category: 'fizika',
    theoryHint: "📌 Temperatura, issiqlik miqdori, issiqlik sig'imi va faza o'zgarishlari (Q = cmΔT, Q = λm, Q = Lm); ideal gaz holat tenglamasi, izojarayonlar va pV-diagramma; ichki energiya, ish va issiqlik uzatish turlari." },
  { id: 179, name: "Elektrodinamika asoslari", subtitle: "Om qonuni, zanjirlar, magnit maydon va induksiya", icon: React.createElement(Zap, { size: 20 }), day: 2, category: 'fizika',
    theoryHint: "📌 Elektr zaryad, maydon, kuchlanish, tok kuchi va qarshilik, Om qonuni; ketma-ket va parallel ulash, quvvat va energiya; magnit maydon, Lorens va Amper kuchlari; elektromagnit induksiya; o'lchov asboblari." },
  { id: 180, name: "Tebranish va to'lqinlar", subtitle: "Mayatniklar, to'lqinlar, tovush va rezonans", icon: React.createElement(Waves, { size: 20 }), day: 2, category: 'fizika',
    theoryHint: "📌 Tebranish kattaliklari (A, T, ν, ω), prujinali va matematik mayatnik; to'lqin uzunligi, tezligi va chastotasi, bo'ylama va ko'ndalang to'lqinlar, interferensiya va rezonans; tovushning balandligi, qattiqligi va tezligi." },
  { id: 181, name: "Optika", subtitle: "Qaytish va sinish qonunlari, linzalar va tasvir", icon: React.createElement(Eye, { size: 20 }), day: 3, category: 'fizika',
    theoryHint: "📌 Yorug'likning qaytishi va sinishi, sinish qonuni; linza, fokus masofa va optik kuch, linza formulasi va kattalashtirish; ko'rinma chuqurlik, prizma, nurlar yo'li hamda haqiqiy va mavhum tasvir." },
  { id: 182, name: "Atom va yadro fizikasi", subtitle: "Kvant tushunchalari, radioaktivlik, E = mc²", icon: React.createElement(Atom, { size: 20 }), day: 3, category: 'fizika',
    theoryHint: "📌 Atom tuzilishi va kvant tushunchalari; α, β va γ-nurlanishlar, yarim yemirilish davri va yadro reaksiyalari; massa va energiya bog'lanishi (E = mc²); nurlanishdan himoyalanish va xavfsizlik." },
  { id: 183, name: "Astronomiya", subtitle: "Yer harakati, Oy fazalari va Quyosh tizimi", icon: React.createElement(Orbit, { size: 20 }), day: 3, category: 'fizika',
    theoryHint: "📌 Yerning sutkalik va yillik harakati, kun va tun, fasllar almashinuvi; Oy fazalari va ko'rinma harakatlar; Quyosh tizimi va uning asosiy obyektlari." },
  { id: 184, name: "Kasb standarti", subtitle: "Fizika o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'fizika',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 185, name: "Pedagogik mahorat", subtitle: "Fizika o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'fizika',
    theoryHint: pedMahoratHint("fizika o'qitish metodikasi") }
];

// ── Texnologiya: texnologiya va dizayn yo'nalishi (spetsifikatsiya 2026: 50 savol, 90 daqiqa) — tez orada ──
const texnologiyaDizaynTopics = [
  { id: 186, name: "Zamonaviy texnika va texnologiyalar", subtitle: "Texnika turlari, maishiy va sanoat texnikasi", icon: React.createElement(Cpu, { size: 20 }), day: 1, category: 'texnologiya_dizayn',
    theoryHint: "📌 Texnika va texnologiyalarga oid asosiy tushunchalar, turlari va qo'llanilish sohalari; maishiy texnikaning ishlash tamoyillari; maishiy va sanoat texnikasini farqlash, konstruktiv elementlar tahlili." },
  { id: 187, name: "Materiallarga ishlov berish texnologiyasi", subtitle: "Yog'och, metall, kompozit; kesish, pardozlash, 3D", icon: React.createElement(Hammer, { size: 20 }), day: 1, category: 'texnologiya_dizayn',
    theoryHint: "📌 Yog'och, metall va kompozit materiallarning turlari va xossalari; rejalash, kesish, qirqish, teshish, egish, to'g'rilash, kavsharlash, biriktirish va pardozlash; yog'ochni kuydirish, mozaika va 3D ishlov berish; asbob-uskunalar va buyum tayyorlash jarayoni." },
  { id: 188, name: "Ijtimoiy-iqtisodiy texnologiya asoslari", subtitle: "Gidroponika, ta'mirlash, elektromontaj, loyiha ishi", icon: React.createElement(Wrench, { size: 20 }), day: 2, category: 'texnologiya_dizayn',
    theoryHint: "📌 Gidroponika usullari; mahkamlagich va sifon turlari; xonadonni ta'mirlash usullari (kosmetik, kapital) va kichik ta'mirlash; elektromontaj asbob-uskunalari; loyiha ishi bosqichlari va ularning mazmuni." },
  { id: 189, name: "Xalq hunarmandchiligi texnologiyasi", subtitle: "Hunarmandchilik maktablari va asbob-uskunalari", icon: React.createElement(PaintBucket, { size: 20 }), day: 2, category: 'texnologiya_dizayn',
    theoryHint: "📌 Xalq hunarmandchiligining rivojlanish tarixi va turlari, hunarmandchilik maktablarining ish usullari; asbob-uskunalar va materiallar; xalq hunarmandchiligi asosida buyum tayyorlash." },
  { id: 190, name: "Ishlab chiqarish va ro'zg'orshunoslik", subtitle: "Texnologik jarayon, santexnika, qo'l elektr asboblari", icon: React.createElement(Factory, { size: 20 }), day: 2, category: 'texnologiya_dizayn',
    theoryHint: "📌 O'zbekistondagi ishlab chiqarish turlari; texnologik jarayon tushunchasi va strukturasi; suv ta'minoti va kanalizatsiya elementlari, santexnika nosozliklari; qo'l elektr asboblari va maishiy texnikadagi kichik nosozliklarni bartaraf etish." },
  { id: 191, name: "Elektrotexnika va elektronika", subtitle: "Elektron komponentlar, yoritish, avtomatika", icon: React.createElement(Zap, { size: 20 }), day: 3, category: 'texnologiya_dizayn',
    theoryHint: "📌 Elektrotexnika va elektronikaning asosiy tushuncha va elementlari; elektron komponentlarning shartli belgilari; elektr yoritish asboblari turlari; avtomatika va avtomatik qurilmalar; raqamli hisoblash qurilmalari." },
  { id: 192, name: "Kasb tanlashga yo'llash", subtitle: "Kasblar tasnifi, professiogramma va kasbga moslik", icon: React.createElement(Compass, { size: 20 }), day: 3, category: 'texnologiya_dizayn',
    theoryHint: "📌 Kasblarni turli tasniflar asosida guruhlash, mehnat turlarini tahlil qilish; kasb tanlashda qiziqish, mayl va qobiliyatning ahamiyati; kasbga yaroqlilik va moslik; professiogramma va kasb tanlash varaqasi." },
  { id: 193, name: "Robototexnika asoslari", subtitle: "Arduino platasi, dasturlash va robot komponentlari", icon: React.createElement(Bot, { size: 20 }), day: 3, category: 'texnologiya_dizayn',
    theoryHint: "📌 Arduino mikrokontroller platasining asosiy qismlari va vazifalari; platani ishga tushirish va asosiy dasturlarni yozish; texnik imkoniyatlarni loyihalarda qo'llash; robotlarning asosiy komponentlari va turlari." },
  { id: 194, name: "Kasb standarti", subtitle: "Texnologiya o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'texnologiya_dizayn',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 195, name: "Pedagogik mahorat", subtitle: "Texnologiya ta'limi metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'texnologiya_dizayn',
    theoryHint: pedMahoratHint("texnologiya ta'limi metodikasi") }
];

// ── Texnologiya: servis xizmati yo'nalishi (spetsifikatsiya 2026: 50 savol, 90 daqiqa) — tez orada ──
const texnologiyaServisTopics = [
  { id: 196, name: "Oziq-ovqat texnologiyasi va pazandachilik", subtitle: "Mahsulotlarga ishlov berish, taomlar, dasturxon odobi", icon: React.createElement(ChefHat, { size: 20 }), day: 1, category: 'texnologiya_servis',
    theoryHint: "📌 Oziq-ovqat xom ashyosining tarkibi va oziqaviy qiymati; issiqlik ishlovi usullari, sovitish, muzlatish va saqlash; sanitariya-gigiyena talablari; issiq va yaxna ichimliklar, quyuq va suyuq taomlar, shirinliklar, salatlar; taomlarni bezash va dasturxon tuzash odobi." },
  { id: 197, name: "Materiallarga ishlov berish va tikuvchilik", subtitle: "Gazlamalar, choklar, bichish va tikuv mashinalari", icon: React.createElement(Scissors, { size: 20 }), day: 1, category: 'texnologiya_servis',
    theoryHint: "📌 Tolalar va iplarning tarkibi va turlari; gazlamalarning to'qilish usullari (polotno, sarja, atlas, satin); qo'l choklari va tikuv choklari; tikuv mashinalari tuzilishi va sozlash; o'lchov olish, andoza va bichish; issiqlik-namlik ishlovi, kiyim detallari va furnitura." },
  { id: 198, name: "Xalq hunarmandchiligi texnologiyasi", subtitle: "Milliy naqshlar, ramziy bezaklar va asbob-uskunalar", icon: React.createElement(PaintBucket, { size: 20 }), day: 2, category: 'texnologiya_servis',
    theoryHint: "📌 Milliy hunarmandchilik turlari, milliy naqshlar va ramziy bezaklar ma'nosi; hunarmandchilik asbob-uskunalari va vazifasi; xalq hunarmandchiligi asosida buyum tayyorlash jarayoni." },
  { id: 199, name: "Ishlab chiqarish va ro'zg'orshunoslik", subtitle: "Texnologik jarayon, santexnika va maishiy texnika", icon: React.createElement(Factory, { size: 20 }), day: 2, category: 'texnologiya_servis',
    theoryHint: "📌 O'zbekistondagi ishlab chiqarish turlari; texnologik jarayon strukturasi; suv ta'minoti va kanalizatsiya tizimi, quvur turlari; maishiy texnikadagi kichik nosozliklar; kir yuvish mashinasi turlari, tuzilishi va xavfsizlik texnikasi." },
  { id: 200, name: "Kasb tanlashga yo'llash", subtitle: "Kasblar tasnifi, professiogramma va kasbga moslik", icon: React.createElement(Compass, { size: 20 }), day: 3, category: 'texnologiya_servis',
    theoryHint: "📌 Kasblarni turli tasniflar asosida guruhlash, mehnat turlarini tahlil qilish; kasb tanlashda qiziqish, mayl va qobiliyatning ahamiyati; kasbga yaroqlilik va moslik; professiogramma va kasb tanlash varaqasi." },
  { id: 201, name: "Robototexnika asoslari", subtitle: "Arduino platasi, dasturlash va robot komponentlari", icon: React.createElement(Bot, { size: 20 }), day: 3, category: 'texnologiya_servis',
    theoryHint: "📌 Arduino mikrokontroller platasining asosiy qismlari va vazifalari; platani ishga tushirish va asosiy dasturlarni yozish; texnik imkoniyatlarni loyihalarda qo'llash; robotlarning asosiy komponentlari va turlari." },
  { id: 202, name: "Kasb standarti", subtitle: "Texnologiya o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'texnologiya_servis',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 203, name: "Pedagogik mahorat", subtitle: "Texnologiya ta'limi metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'texnologiya_servis',
    theoryHint: pedMahoratHint("texnologiya ta'limi metodikasi") }
];

// group: 'school' (umumiy o'rta ta'lim, 9 fan) | 'mtt' (maktabgacha ta'lim, 4 fan)
// Fan tanlash UI shu guruhlar bo'yicha ajratiladi (README Variant B).
// comingSoon: true — fan ro'yxatda ko'rinadi, lekin savollari hali joylanmagan:
// test/imtihon o'rniga «tez orada» kartasi chiqadi (components/ComingSoonNotice).

// ── Davlat va huquq asoslari (spetsifikatsiya 2026: 50 savol, 90 daqiqa) ──
const huquqTopics = [
  { id: 212, name: "Shaxs, jamiyat, davlat va huquq", subtitle: "Davlat va huquq nazariyasi, jamiyat, davlat shakli va funksiyalari", icon: React.createElement(Scale, { size: 20 }), day: 1, category: 'huquq',
    theoryHint: "📌 Davlat va huquq nazariyasi: shaxs, jamiyat va davlat munosabatlari; davlat shakli (boshqaruv, tuzilish, siyosiy rejim); davlat funksiyalari va mexanizmi; huquq tizimi, huquqiy ong va madaniyat; huquqbuzarlik va yuridik javobgarlik asoslari." },
  { id: 213, name: "Konstitutsiyaviy huquq asoslari", subtitle: "Konstitutsiya tamoyillari, inson huquqlari, davlat hokimiyati tizimi", icon: React.createElement(FileText, { size: 20 }), day: 1, category: 'huquq',
    theoryHint: "📌 O‘zbekiston Respublikasi Konstitutsiyasi (Yangi tahrir): asosiy prinsiplar, inson va fuqarolarning asosiy huquqlari, erkinliklari va burchlari; jamiyat va shaxs; ma’muriy-hududiy tuzilish; davlat hokimiyatining tashkil etilishi (Oliy Majlis, Prezident, Vazirlar Mahkamasi, Sud hokimiyati, Mahalliy davlat hokimiyati, Saylov tizimi)." },
  { id: 214, name: "Xalqaro huquq asoslari", subtitle: "Xalqaro huquq tamoyillari, xalqaro shartnomalar, BMT va inson huquqlari", icon: React.createElement(Globe, { size: 20 }), day: 2, category: 'huquq',
    theoryHint: "📌 Xalqaro huquq asoslari: xalqaro huquqning asosiy tamoyillari va manbalari; xalqaro tashkilotlar (BMT va uning tuzilmalari); inson huquqlari umumjahon deklaratsiyasi va xalqaro paktlar; O‘zbekistonning xalqaro shartnomalari." },
  { id: 215, name: "Ma’muriy huquq asoslari", subtitle: "Ma’muriy javobgarlik, ma’muriy huquqbuzarliklar va jazo choralari", icon: React.createElement(Shield, { size: 20 }), day: 2, category: 'huquq',
    theoryHint: "📌 Ma’muriy huquq va Ma’muriy javobgarlik to‘g‘risidagi kodeks: ma’muriy huquqbuzarlik tushunchasi va tarkibi; ma’muriy jazo turlari va ularni qo‘llash qoidalari; ma’muriy javobgarlikdan ozod qilish asoslari; ma’muriy organlar vakolatlari." },
  { id: 216, name: "Fuqarolik huquqi asoslari", subtitle: "Fuqarolik muomalasi, bitimlar, mulk huquqi, majburiyatlar va meros", icon: React.createElement(Handshake, { size: 20 }), day: 2, category: 'huquq',
    theoryHint: "📌 O‘zbekiston Respublikasi Fuqarolik kodeksi: jismoniy va yuridik shaxslar, huquq layoqati va muomala layoqati; bitimlar va shartnomalar; mulk huquqi va ashyoviy huquqlar; majburiyat huquqi; da’vo muddati; meros huquqi asoslari." },
  { id: 217, name: "Mehnat huquqi asoslari", subtitle: "Mehnat shartnomasi, ish vaqti, dam olish vaqti, intizomiy javobgarlik", icon: React.createElement(Briefcase, { size: 20 }), day: 3, category: 'huquq',
    theoryHint: "📌 O‘zbekiston Respublikasining Mehnat kodeksi (Yangi tahrir): mehnat shartnomasini tuzish, o‘zgartirish va bekor qilish asoslari; ish vaqti va dam olish vaqti me’yorlari; mehnatga haq to‘lash; intizomiy jazo choralari; mehnat nizolarini hal etish." },
  { id: 218, name: "Oila huquqi asoslari", subtitle: "Nikoh tuzish va bekor qilish, er-xotin va ota-ona huquq-majburiyatlari, aliment", icon: React.createElement(Heart, { size: 20 }), day: 3, category: 'huquq',
    theoryHint: "📌 O‘zbekiston Respublikasining Oila kodeksi: nikoh tuzish shartlari va tartibi; nikohni bekor qilish; er-xotinning mulkiy va shaxsiy nomulkiy huquqlari; ota-ona va bolalarning o‘zaro huquq va majburiyatlari; aliment majburiyatlari; vasiylik va homiylik." },
  { id: 219, name: "Jinoyat va jinoyat-protsessual huquqi", subtitle: "Jinoyat tarkibi, jazolar, jinoiy javobgarlik, tergov va sud jarayoni", icon: React.createElement(Swords, { size: 20 }), day: 3, category: 'huquq',
    theoryHint: "📌 Jinoyat kodeksi va Jinoyat-protsessual kodeksi: jinoyat tushunchasi va tarkibi elementlari; jinoiy javobgarlik yoshi; jazo turlari va tizimi; javobgarlikni yengillashtiruvchi va og‘irlashtiruvchi holatlar; jinoyat-protsessual shakllari, dalillar, tergov va sud muhokamasi prinsiplari." },
  { id: 220, name: "Ekologiya huquqi asoslari", subtitle: "Tabiatni muhofaza qilish, tabiiy resurslardan foydalanish, ekologik nazorat", icon: React.createElement(Leaf, { size: 20 }), day: 4, category: 'huquq',
    theoryHint: "📌 Ekologiya va atrof-muhitni muhofaza qilish to‘g‘risidagi qonunchilik: fuqarolarning ekologik huquq va majburiyatlari; tabiiy boyliklardan oqilona foydalanish; ekologik ekspertiza va nazorat; ekologik huquqbuzarliklar uchun yuridik javobgarlik." },
  { id: 221, name: "Kasb standarti", subtitle: "Huquq o‘qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'huquq',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 222, name: "Pedagogik mahorat", subtitle: "Huquq o‘qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'huquq',
    theoryHint: pedMahoratHint("davlat va huquq asoslarini o'qitish metodikasi") }
];

// ── Musiqa madaniyati (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const musiqaTopics = [
  { id: 223, name: "Musiqa savodi", subtitle: "Tovushlar, oktavalar, alteratsiya, intervallar va tonalliklar", icon: React.createElement(Music, { size: 20 }), day: 1, category: 'musiqa',
    theoryHint: "📌 Musiqa savodi va elementar nazariya: tovush xususiyatlari, oktavalar va harfiy tizim (C, D, E, F, G, A, H); alteratsiya belgilari va engarmonizm; tovush cho'zimlari, pauzalar, ligalar; kalitlar (skripka, bas); dinamik belgilar, templar; intervallar, lad pog'onalari va parallel tonalliklar." },
  { id: 224, name: "Cholg‘u asboblari", subtitle: "O'zbek milliy va jahon mumtoz cholg'ulari, registrlari", icon: React.createElement(Volume2, { size: 20 }), day: 2, category: 'musiqa',
    theoryHint: "📌 Musiqa cholg'ulari: o'zbek milliy cholg'ulari (dutor, tanbur, g'ijjak, nay, chang, karnay, doira, nog'ora); jahon simfonik orkestri cholg'ulari; cholg'ular guruhlari (torli, damli, zarbli), ularning registri va tembri." },
  { id: 225, name: "Musiqiy janrlar", subtitle: "Vokal, instrumental, mumtoz va zamonaviy musiqa janrlari", icon: React.createElement(Sparkles, { size: 20 }), day: 2, category: 'musiqa',
    theoryHint: "📌 Musiqiy janrlar va shakllar: vokal va instrumental janrlar; opera, balet, simfoniya, konsert, sonata, poema, syuita, kantata, oratoriya; o'zbek an'anaviy va zamonaviy estrada musiqasi janrlari hamda ularning xususiyatlari." },
  { id: 226, name: "Raqs san’ati", subtitle: "O'zbek milliy xalq raqslari va zamonaviy raqs san'ati", icon: React.createElement(Sparkles, { size: 20 }), day: 3, category: 'musiqa',
    theoryHint: "📌 O'zbek xalq raqs san'ati: milliy raqs maktablari (Farg'ona, Buxoro, Xorazm raqslari), ularning harakat va plastik xususiyatlari; xalq bayramlari raqslari; zamonaviy sahna va o'zbek mumtoz raqs san'ati ustalari ijodi." },
  { id: 227, name: "Maqom san’ati", subtitle: "Shashmaqom, Xorazm va Farg'ona-Toshkent maqom yo'llari", icon: React.createElement(BookOpen, { size: 20 }), day: 3, category: 'musiqa',
    theoryHint: "📌 Maqom san'ati: Shashmaqom tizimi (Buzruk, Rost, Navo, Dugoh, Segoh, Iroq), uning mushkilot va nasr bo'limlari; Xorazm va Farg'ona-Toshkent maqom yo'llari; maqom sho'balari, usullari va buyuk ustoz maqomchilar merosi." },
  { id: 228, name: "Dirijorlik va xor san’ati", subtitle: "Dirijorlik sxemalari, taktirovanie va xor partiturasi", icon: React.createElement(Activity, { size: 20 }), day: 3, category: 'musiqa',
    theoryHint: "📌 Dirijorlik texnikasi va xor san'ati: dirijorlik sxemalari (2/4, 3/4, 4/4, 6/8 o'lchovlar), boshlash va to'xtatish usullari; xor turlari, xordagi ovoz diapazonlari (soprano, alt, tenor, bas), xor partiturasini o'qish va tahlil qilish." },
  { id: 229, name: "Kasb standarti", subtitle: "Musiqa o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'musiqa',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 230, name: "Pedagogik mahorat", subtitle: "Musiqa o'qitish metodikasi va didaktika asoslari", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'musiqa',
    theoryHint: pedMahoratHint("musiqa madaniyatini o'qitish metodikasi") }
];

// ── Iqtisodiy bilim asoslari (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const iqtisodTopics = [
  { id: 231, name: "Iqtisodiyotga kirish va bozor munosabatlari", subtitle: "Tanlov, muqobil qiymat, cheklanganlik, pul va bozor tizimi", icon: React.createElement(Coins, { size: 20 }), day: 1, category: 'iqtisod',
    theoryHint: "📌 Iqtisodiyot asoslari: cheklangan resurslar va cheksiz ehtiyojlar, tanlov va muqobil qiymat; ishlab chiqarish omillari (yer, mehnat, kapital, tadbirkorlik); iqtisodiy tizimlar (an'anaviy, ma'muriy, bozor, aralash); pulning mohiyati, turlari va funksiyalari; bozor turlari." },
  { id: 232, name: "Oila va uy xo‘jaliklari iqtisodiyoti", subtitle: "Oila byudjeti, daromad va xarajat, jamg'arish va sug'urta", icon: React.createElement(Home, { size: 20 }), day: 1, category: 'iqtisod',
    theoryHint: "📌 Oila iqtisodiyoti: oila byudjeti, nominal va real daromadlar; iste'mol xarajatlari; jamg'arma va investitsiya; mulk va xususiylashtirish; sug'urta tizimi hamda iste'molchilarning huquqlarini himoya qilish to'g'risidagi qonunchilik." },
  { id: 233, name: "Talab, taklif va bozor raqobati", subtitle: "Talab va taklif qonuni, muvozanat narxi, elastiklik, monopoliya", icon: React.createElement(TrendingUp, { size: 20 }), day: 2, category: 'iqtisod',
    theoryHint: "📌 Bozor mexanizmi: talab va taklif qonunlari, ularga ta'sir etuvchi narxli va narxsiz omillar; bozor muvozanati va muvozanat narxi; talab va taklifning narx bo'yicha elastikligi; bozor raqobati turlari (mukammal, monopolistik, oligopoliya, toza monopoliya)." },
  { id: 234, name: "Soliq tizimi, byudjet va tadbirkorlik faoliyati", subtitle: "Soliqlar, biznes reja, xarajatlar, foyda va investitsiyalar", icon: React.createElement(Landmark, { size: 20 }), day: 2, category: 'iqtisod',
    theoryHint: "📌 Tadbirkorlik va soliqlar: tadbirkorlik shakllari (YATT, MCHJ, AJ), biznes reja tuzish; firmaning doimiy va o'zgaruvchan xarajatlari, yalpi daromad va sof foyda; soliq tizimi va soliq turlari (to'g'ridan-to'g'ri, egri soliqlar); bank kreditlari va innovatsion faoliyat." },
  { id: 235, name: "Davlat va iqtisodiyot, iqtisodiy o‘sish", subtitle: "Davlat byudjeti, Markaziy bank, YaIM va makroiqtisodiy ko'rsatkichlar", icon: React.createElement(FileText, { size: 20 }), day: 3, category: 'iqtisod',
    theoryHint: "📌 Davlatning iqtisodiy roli: davlat byudjeti daromadlari va xarajatlari, byudjet profitsiti va taqchilligi; Markaziy bank va monetar-kredit siyosati; makroiqtisodiy ko'rsatkichlar (YaIM, YaMH, milliy daromad); iqtisodiy o'sish omillari va O'zbekiston iqtisodiy salohiyati." },
  { id: 236, name: "Inflyatsiya, mehnat bozori va jahon iqtisodiyoti", subtitle: "Inflyatsiya, ishsizlik, valyuta kursi va xalqaro savdo", icon: React.createElement(Globe, { size: 20 }), day: 3, category: 'iqtisod',
    theoryHint: "📌 Makroiqtisodiy muammolar va xalqaro munosabatlar: inflyatsiya turlari va sabablari; mehnat bozori, ishchi kuchi va ishsizlik turlari (friksion, tarkibiy, siklik); xalqaro savdo, proteksionizm, eksport va import; valyuta kursi va jahon iqtisodiyoti muammolari." },
  { id: 237, name: "Kasb standarti", subtitle: "Iqtisodiyot fani o'qituvchisi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'iqtisod',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 238, name: "Pedagogik mahorat", subtitle: "Iqtisodiy bilim asoslarini o'qitish metodikasi", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'iqtisod',
    theoryHint: pedMahoratHint("iqtisodiy bilim asoslarini o'qitish metodikasi") }
];


// ── Maktab logopediyasi (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const maktabLogopedTopics = [
  { id: 239, name: "Tovush talaffuzi buzilishlari (disslaliya)", subtitle: "Mexanik va funksional disslaliya, tovushlarni nutqqa qo'yish", icon: React.createElement(Mic, { size: 20 }), day: 1, category: 'maktab_logoped',
    theoryHint: "📌 Disslaliya nutq nuqsoni: mexanik va funksional disslaliya turlari (oddiy va murakkab); rotatsizm, lambdatsizm, sigmatizm, kappatsizm; tovushlarni nutqqa qo'yish, avtomatlashtirish va differensiatsiya qilish bosqichlari; artikulyatsion mashqlar." },
  { id: 240, name: "Neyrogen va motor nutq buzilishlari", subtitle: "Afaziya, dizartriya shakllari va korreksion ish tizimi", icon: React.createElement(Brain, { size: 20 }), day: 1, category: 'maktab_logoped',
    theoryHint: "📌 Neyrogen va motor nutq buzilishlari: afaziya (motor, sensor, amnestik) sabablari va nutqni tiklash metodlari; dizartriya shakllari (bulbar, psevdobulbar, subkortikal, miyacha); artikulyatsiya a'zolari spastikasi, parezi va logopedik massaj usullari." },
  { id: 241, name: "Nutqning ritm, ravonligi va ovoz rezonansi", subtitle: "Duduqlanish, tonik-klonik spazmlar, ochiq va yopiq rinolaliya", icon: React.createElement(Activity, { size: 20 }), day: 2, category: 'maktab_logoped',
    theoryHint: "📌 Ritm, ravonlik va ovoz buzilishlari: duduqlanish etiologiyasi va simptomatikasi, tonik, klonik va aralash talvasalar; logoritmika va diafragmal nafas mashqlari; rinolaliya (ochiq, yopiq, organik, funksional), burun rezonansini bartaraf etish." },
  { id: 242, name: "Nutqning umumiy rivojlanmaganligi (alaliya, NUR)", subtitle: "Motor va sensor alaliya, NUR 1-4 darajalari korreksiyasi", icon: React.createElement(MessageSquare, { size: 20 }), day: 2, category: 'maktab_logoped',
    theoryHint: "📌 Nutqning umumiy rivojlanmaganligi: motor va sensor alaliya mexanizmlari, Broka va Vernike zonalari shikastlanishi; maktab yoshidagi bolalarda NUR 1, 2, 3 va 4-darajalari xususiyatlari; fonematik idrok, so'z boyligi va grammatik qurilishni rivojlantirish." },
  { id: 243, name: "Yozma nutq va o‘qish buzilishlari", subtitle: "Disgrafiya va disleksiya turlari, maktabda korreksion yordam", icon: React.createElement(PenTool, { size: 20 }), day: 3, category: 'maktab_logoped',
    theoryHint: "📌 Yozma nutq buzilishlari: disgrafiya turlari (akustik, optik, motor, agrammatik, fonematik tahlil buzilishi); disleksiya (fonematik, semantik, optik, mnestik); maktab o'quvchilarida xatolarni tahlil qilish, korreksion diktant va mashg'ulotlar tizimi." },
  { id: 244, name: "Kasb standarti", subtitle: "Maktab logopedi kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'maktab_logoped',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 245, name: "Pedagogik mahorat", subtitle: "Logopedik korreksiya metodikasi va pedagogika", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'maktab_logoped',
    theoryHint: pedMahoratHint("maktab logopediyasi va korreksion metodika") }
];

// ── Defektologiya (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const defektologiyaTopics = [
  { id: 246, name: "Defektologiya nazariyasi va rivojlanish anomaliyalari", subtitle: "Birlamchi va ikkilamchi nuqson, kompensatsiya, maxsus ta'lim", icon: React.createElement(Accessibility, { size: 20 }), day: 1, category: 'defektologiya',
    theoryHint: "📌 Maxsus pedagogika nazariyasi: defektologiyaning predmeti, maqsadi va tamoyillari; L.S.Vygotskiyning rivojlanish anomaliyalari nazariyasi (birlamchi va ikkilamchi nuqson); biologik va ijtimoiy omillar; kompensatsiya va reabilitatsiya mexanizmlari." },
  { id: 247, name: "Oligofrenopedagogika va aqliy zaiflik", subtitle: "Intellekt buzilishlari, aqliy zaiflik darajalari va korreksiya", icon: React.createElement(Brain, { size: 20 }), day: 1, category: 'defektologiya',
    theoryHint: "📌 Oligofrenopedagogika asoslari: aqliy zaiflik tushunchasi va etiologiyasi; Xalqaro kasalliklar tasnifi (XKT-10) bo'yicha darajalari (yengil, o'rtacha, og'ir, chuqur); bilish jarayonlari (diqqat, xotira, tafakkur) xususiyatlari; maxsus yordamchi ta'lim metodikasi." },
  { id: 248, name: "Maxsus ta'limda logopediya va harakat buzilishlari", subtitle: "Anomaliyalardagi nutq nuqsonlari, bolalar serebral falaji (BSF)", icon: React.createElement(Target, { size: 20 }), day: 2, category: 'defektologiya',
    theoryHint: "📌 Harakat va nutq buzilishlari korreksiyasi: BSF shakllari (spastik diplegiya, gemiparetik, giperkinetik, atonik-astatik); tayanch-harakat a'zolarini reabilitatsiya qilish; aqliy va harakat nuqsoni bor bolalarda nutq rivojlanishi va logopedik yordam." },
  { id: 249, name: "Surdopedagogika va eshitish nuqsonlari", subtitle: "Kar va zaif eshituvchi bolalar, daktilologiya va imo-ishora", icon: React.createElement(Ear, { size: 20 }), day: 2, category: 'defektologiya',
    theoryHint: "📌 Surdopedagogika: eshitish nuqsonlari tasnifi (karlik va zaif eshituvchanlik darajalari); audiometriya asoslari; daktilologiya va imo-ishora nutqi; talaffuzga o'rgatish, labdan o'qish ko'nikmasi; eshitish apparatlari va koxlear implantatsiyadan keyingi reabilitatsiya." },
  { id: 250, name: "Tiflopedagogika va ko‘rish nuqsonlari", subtitle: "Ko'r va zaif ko'ruvchi bolalar, Brayl yozuvi, fazoda mo'ljal", icon: React.createElement(Eye, { size: 20 }), day: 3, category: 'defektologiya',
    theoryHint: "📌 Tiflopedagogika: ko'rish analizatori buzilishlari (ko'rlik, zaif ko'rish, strabizm, ambliopiya); L.Brayl relyefli-nuqtali yozuv tizimi; ko'rish nuqsoni bor bolalarni fazoda mo'ljal olishga o'rgatish; maxsus tiflouskunalar va ko'rish gigiyenasi." },
  { id: 251, name: "Autizm (RDA) va ruhiy rivojlanishi kechikkan (RRK) bolalar", subtitle: "Erta autizm sindromi, hissiy-irodaviy soha, RRK korreksiyasi", icon: React.createElement(Sparkles, { size: 20 }), day: 3, category: 'defektologiya',
    theoryHint: "📌 Autizm va RRK korreksiyasi: erta bolalik autizmi (RDA / ASD) belgilari, stereotipik harakatlar, ijtimoiy muloqot yetishmovchiligi, ABA-terapiya elementlari; RRK etiologik turlari (K.S.Lebedinskaya tasnifi), hissiy-irodaviy yetishmovchilik va korreksion ta'lim." },
  { id: 252, name: "Kasb standarti", subtitle: "Defektolog (maxsus pedagog) kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'defektologiya',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 253, name: "Pedagogik mahorat", subtitle: "Maxsus pedagogika va inklyuziv ta'lim didaktikasi", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'defektologiya',
    theoryHint: pedMahoratHint("defektologiya va maxsus pedagogika metodikasi") }
];

// ── MTT Musiqa rahbari (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const mttMusiqaTopics = [
  { id: 254, name: "Musiqa elementar nazariyasi va garmoniya", subtitle: "Tovushlar, ladlar, tonallik, intervallar, akkordlar, dinamika", icon: React.createElement(Music, { size: 20 }), day: 1, category: 'mtt_musiqa',
    theoryHint: "📌 Elementar musiqa nazariyasi: tovushqator, pog'onalar, oktavali tizim, alteratsiya va engarmonizm; nota yozuvi, skripka va bas kalitlari, cho'zim va pauzalar; metr va ritm, musiqiy templar, major va minor ladlari, tonalliklarning kvinta davrasi, interval va akkordlar tuzilishi." },
  { id: 255, name: "O‘zbek va jahon musiqa tarixi, folklor", subtitle: "Bolalar folklori, milliy cholg'ular, maqom va kompozitorlar", icon: React.createElement(Sparkles, { size: 20 }), day: 2, category: 'mtt_musiqa',
    theoryHint: "📌 Musiqa tarixi va folklor: o'zbek xalq musiqa ijodi, bolalar folklor qo'shiqlari («Alla», «Lola», «Boychechak»), milliy cholg'ular; o'zbek maqom san'ati va hududiy an'analari; o'zbek va jahon bolalar kompozitorlari (M.Leviyev, S.Yudakov, D.Omonullayeva, Chaykovskiy, Motsart)." },
  { id: 256, name: "Maktabgacha musiqa ta'limi metodikasi («Ilk qadam»)", subtitle: "Musiqa tinglash, kuylash, ritmika, cholg'u chalish, bayramlar", icon: React.createElement(Baby, { size: 20 }), day: 3, category: 'mtt_musiqa',
    theoryHint: "📌 «Ilk qadam» davlat dasturi va MTTda musiqa o'qitish metodikasi: musiqiy idrok va tinglash; bolalar ovoz apparati gigiyenasi va kuylash malakalari; musiqali-ritmik harakatlar va sahnalashtirish; bolalar cholg'u asboblarida jo'r bo'lish; bayram tadbirlarini rejalashtirish va o'tkazish." },
  { id: 257, name: "Kasb standarti", subtitle: "MTT musiqa rahbari kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'mtt_musiqa',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 258, name: "Pedagogik mahorat", subtitle: "Maktabgacha yoshdagi bolalarni musiqiy tarbiyalash metodikasi", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'mtt_musiqa',
    theoryHint: pedMahoratHint("maktabgacha ta'limda musiqa tarbiyasi va pedagogik mahorat") }
];

// ── Maktab psixologi (test spetsifikatsiyasi 2026: 50 savol, 90 daqiqa) ──
const maktabPsixologTopics = [
  { id: 259, name: "Rivojlanish psixologiyasi va umumiy qonuniyatlar", subtitle: "Ontogenez psixologiyasi, psixik taraqqiyot omillari va metodlar", icon: React.createElement(Brain, { size: 20 }), day: 1, category: 'maktab_psixolog',
    theoryHint: "📌 Ontogenez psixologiyasi: yosh davrlari psixologiyasining maqsad va vazifalari; psixik taraqqiyot qonuniyatlari, biologik va ijtimoiy omillar, faoliyat va muloqot yetakchiligi; psixologik tadqiqot metodlari (kuzatish, eksperiment, test, suhbat, sotsiometriya)." },
  { id: 260, name: "Oila psixologiyasi va ota-onalar bilan ishlash", subtitle: "Oilaviy munosabatlar, krizislar, tarbiya uslublari, konsultatsiya", icon: React.createElement(Heart, { size: 20 }), day: 1, category: 'maktab_psixolog',
    theoryHint: "📌 Oila psixologiyasi: oilaning psixologik funksiyalari, nikoh krizislari va ularni bartaraf etish; ota-onalarning tarbiya uslublari (avtoritar, demokratik, gipoproteksiya, giperproteksiya) va uning shaxs rivojiga ta'siri; ota-onalar bilan psixologik konsultatsiya va oilaviy psixodiagnostika." },
  { id: 261, name: "Hayotiy davrlar va ontogenez inqirozlari", subtitle: "Yoshni davrlashtirish mezonlari va kritik inqiroz davrlari", icon: React.createElement(Hourglass, { size: 20 }), day: 2, category: 'maktab_psixolog',
    theoryHint: "📌 Yosh inqirozlari va davrlashtirish: psixik rivojlanish bosqichlari (Vygotskiy, Elkonin, Erikson konsepsiyalari); yosh inqirozlari mohiyati (chaqaloqlik, 1 yosh, 3 yosh, 7 yosh, o'smirlik inqirozlari); barqaror va kritik davrlar munosabati hamda inqirozlarni psixologik yengish yo'llari." },
  { id: 262, name: "Inklyuziv ta'lim psixologiyasi va maxsus ehtiyojlar", subtitle: "Alohida ehtiyojli bolalar, ijtimoiy moslashuv, sinfda empatiya", icon: React.createElement(Accessibility, { size: 20 }), day: 2, category: 'maktab_psixolog',
    theoryHint: "📌 Inklyuziv ta'lim psixologiyasi: umumta'lim maktabida inklyuziv muhit yaratish; jismoniy va aqliy imkoniyati cheklangan o'quvchilarning psixologik xususiyatlari; tengdoshlari bilan ijobiy munosabatlarni shakllantirish, autistik spektr buzilishi bor bolalar bilan ishlash va ota-onalarga tavsiyalar." },
  { id: 263, name: "Maktab o‘quvchilari yosh psixologiyasi va deviant xulq", subtitle: "Kichik maktab, o'smirlik, 'kattalik hissi', suitsid va qoidabuzarlik", icon: React.createElement(Users, { size: 20 }), day: 3, category: 'maktab_psixolog',
    theoryHint: "📌 Yosh psixologiyasi va deviant xulq-atvor: kichik maktab yoshida bilish jarayonlari va o'quv motivatsiyasi; o'smirlik davrida anatomik-fiziologik o'zgarishlar, aksentuatsiya turlari, 'kattalik hissi' va shaxsiy krizislar; deviant xulq, suitsidal xatti-harakatlar va zo'ravonlik profilaktikasi; ilk o'spirinlik davri." },
  { id: 264, name: "Kasb psixologiyasi va kasbga yo‘naltirish", subtitle: "Kasb tanlash motivatsiyasi, moslashuv, kasbiy diagnostika", icon: React.createElement(Briefcase, { size: 20 }), day: 3, category: 'maktab_psixolog',
    theoryHint: "📌 Kasb psixologiyasi: kasb tanlashning psixologik mexanizmlari, kasbiy motivatsiya va yaroqlilik; maktabda kasbga yo'naltirish ishlari va kasbiy diagnostika metodikalari (Klimov DDO, Golland testi); kasbiy moslashuv, emotsional yonish va mehnat jamoasidagi nizolarni boshqarish." },
  { id: 265, name: "Kasb standarti", subtitle: "Amaliyotchi psixolog kasb standarti", icon: React.createElement(Scale, { size: 20 }), day: 4, category: 'maktab_psixolog',
    theoryHint: KASB_STANDARTI_HINT },
  { id: 266, name: "Pedagogik mahorat", subtitle: "Maktab psixologik xizmati metodikasi va treninglar", icon: React.createElement(GraduationCap, { size: 20 }), day: 4, category: 'maktab_psixolog',
    theoryHint: pedMahoratHint("amaliy psixologik xizmat metodikasi va trening faoliyati") }
];

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
  { id: 'ingliz', name: "Ingliz tili", icon: BookA, group: 'school', desc: "Reading, grammar, vocabulary, pragmatics va ELT metodika" },
  { id: 'mtt_jismoniy', name: "MTT Jismoniy Tarbiya", icon: Dumbbell, group: 'mtt', desc: "Gimnastika, harakatli o'yinlar, sport turlari va MTT metodikasi" },
  { id: 'matematika', name: "Matematika", icon: Sigma, group: 'school', desc: "Algebra, ehtimollik, matematik analiz, geometriya va metodika" },
  { id: 'tarbiya', name: "Tarbiya", icon: HandHeart, group: 'school', desc: "Ma'naviy qadriyatlar, fuqarolik, jamiyat, ekologiya va metodika" },
  { id: 'pedmahorat', name: "Pedagogik mahorat va kasb standarti", icon: BadgeCheck, group: 'common', desc: "Maktab va MTT pedagoglari: kasb standarti, didaktika, pedagogik texnika va «Ilk qadam»" },
  { id: 'fizika', name: "Fizika", icon: Atom, group: 'school', desc: "Mexanika, issiqlik, elektrodinamika, optika, astronomiya va metodika" },
  { id: 'texnologiya_dizayn', name: "Texnologiya (dizayn)", icon: Hammer, group: 'school', desc: "Materiallarga ishlov berish, elektrotexnika, robototexnika va metodika" },
  { id: 'texnologiya_servis', name: "Texnologiya (servis)", icon: Scissors, group: 'school', desc: "Pazandachilik, tikuvchilik, hunarmandchilik, robototexnika va metodika" },
  { id: 'huquq', name: "Davlat va huquq asoslari", icon: Scale, group: 'school', desc: "Konstitutsiya, davlat nazariyasi, sohaviy huquqlar va metodika", testMode: true },
  { id: 'musiqa', name: "Musiqa madaniyati", icon: Music, group: 'school', desc: "Musiqa savodi, cholg'u, janrlar, maqom, xor va metodika", testMode: true },
  { id: 'iqtisod', name: "Iqtisodiy bilim asoslari", icon: Coins, group: 'school', desc: "Bozor iqtisodiyoti, talab va taklif, soliqlar, moliya va metodika", testMode: true },
  { id: 'maktab_logoped', name: "Maktab logopediyasi", icon: Mic, group: 'school', desc: "Disslaliya, dizartriya, alaliya, disgrafiya, disleksiya va logopedik korreksiya", testMode: true },
  { id: 'defektologiya', name: "Defektologiya", icon: Accessibility, group: 'school', desc: "Oligofrenopedagogika, surdopedagogika, tiflopedagogika, autizm va maxsus metodika", testMode: true },
  { id: 'mtt_musiqa', name: "MTT Musiqa rahbari", icon: Sparkles, group: 'mtt', desc: "Musiqa nazariyasi, xalq ijodi, «Ilk qadam» musiqa ta'limi va metodika", testMode: true },
  { id: 'maktab_psixolog', name: "Maktab psixologi", icon: Brain, group: 'school', desc: "Rivojlanish, oila, inklyuziv, yosh davrlari, kasb psixologiyasi va metodika", testMode: true }
];

// «Tez orada» fanlari uchun va'da qilingan muddat (2026-09-13 dan 10 kun) va
// shu vaqtgacha taklif qilinadigan fan. Sana o'tib ketsa karta «tez kunlarda»
// deydi — eskirgan sana ko'rsatilmaydi. Savollar joylangach fandan
// `comingSoon` bayrog'ini olib tashlash kifoya.
export const COMING_SOON_UNTIL = '2026-09-23';
export const COMING_SOON_SUGGESTED_SUBJECT = 'pedmahorat';
export const isComingSoon = (category) => SUBJECTS.some(s => s.id === category && s.comingSoon);
export const isTestModeSubject = (category) => SUBJECTS.some(s => s.id === category && s.testMode);

// Foydalanuvchiga aytiladigan «necha fan bor» raqami. Ulashish matni,
// do'stni taklif qilish xabari va qo'llanma shu yerdan oladi — ro'yxatga fan
// qo'shilishi bilan matnlar o'zi to'g'rilanadi (ilgari ular qo'lda yozilgani
// uchun qo'llanmada 17 fan davrida ham «16 ta fan» deb turardi).
// Savollari hali yo'q («tez orada») fanlar sanalmaydi — bu raqam va'da.
export const SUBJECT_COUNT = SUBJECTS.filter(s => !s.comingSoon).length;

export const TOPICS = [...chqbtTopics, ...artTopics, ...tarixTopics, ...sportTopics, ...boshlangichTopics, ...infoTopics, ...mttTopics, ...mttRahbarTopics, ...tilTopics, ...biologiyaTopics, ...geografiyaTopics, ...mttLogopedTopics, ...mttPsixologTopics, ...kimyoTopics, ...rusTiliTopics, ...inglizTopics, ...mttJismoniyTopics, ...matematikaTopics, ...tarbiyaTopics, ...pedmahoratTopics, ...fizikaTopics, ...texnologiyaDizaynTopics, ...texnologiyaServisTopics, ...huquqTopics, ...musiqaTopics, ...iqtisodTopics, ...maktabLogopedTopics, ...defektologiyaTopics, ...mttMusiqaTopics, ...maktabPsixologTopics];

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
