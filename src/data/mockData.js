import React from 'react';
import { BATCH_SIZE } from '../config';
import {
  Medal, ClipboardList, Target, Map, Shield, HeartPulse, GraduationCap, Palette, PaintBucket, LandPlot, Image as ImageIcon, Ruler, Settings, Home, BookOpen, Activity, Baby, Laptop, Smile, PenTool, Award,
  Compass, Scroll, Hourglass, Globe, Heart, Swords, Trophy, Flame, Calculator, Sun, Cpu, Code, Network, FileText, Binary, Monitor, Wifi, MessageSquare, Scale, Users, ClipboardList as ClipboardIcon
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TOPICS — mavzular ro'yxati (statik, ~2KB)
// Savollar endi Firestore'dan yuklanadi, bu yerda faqat metadata
// ══════════════════════════════════════════════════════════════

const chqbtTopics = [
  { id: 0, name: "Harbiy xizmat asoslari", icon: React.createElement(Medal, { size: 20 }), day: 1, category: 'chqbt',
    theoryHint: "📌 Harbiy xizmatning huquqiy asoslari. O'zbekiston Konstitutsiyasida mudofaa va harbiy xizmat bo'yicha belgilangan huquq hamda majburiyatlar. O'zbekiston Respublikasining Mudofaa doktrinasi, 'Umumharbiy majburiyat va harbiy xizmat to'g'risida'gi qonun va fuqarolarning harbiy xizmatni o'tash tartibi." },
  { id: 1, name: "Umumharbiy nizomlar", icon: React.createElement(ClipboardList, { size: 20 }), day: 2, category: 'chqbt',
    theoryHint: "📌 O'zbekiston Qurolli Kuchlarining 4 ta asosiy nizomi: Ichki xizmat, Intizomiy, Garnizon va qorovullik xizmatlari hamda Saf nizomi. Ularning mazmun-mohiyati, harbiy unvonlar, navbatchilik va qorovullik xizmatlarini tashkil etish, safda harakatlanish qoidalari." },
  { id: 2, name: "Otish tayyorgarligi", icon: React.createElement(Target, { size: 20 }), day: 4, category: 'chqbt',
    theoryHint: "📌 Qurol to'g'risidagi qonunchilik asoslari. O'qotar qurollar (AK-74, PM, pnevmatik qurollar) tuzilishi, ishlash prinsiplari va jangovar xususiyatlari. Otish hodisasi va uning davrlari, ichki va tashqi ballistika, qurollarni qismlarga ajratish hamda yig'ish qoidalari, texnika xavfsizligi." },
  { id: 3, name: "Taktik tayyorgarlik", icon: React.createElement(Map, { size: 20 }), day: 5, category: 'chqbt',
    theoryHint: "📌 Zamonaviy umumqo'shin jangi asoslari va askarning jangdagi harakatlari. Harbiy topografiya: gorizont tomonlarini aniqlash, azimut bo'yicha harakatlanish, xaritani o'qish hamda xaritasiz mo'ljal olish. Jangovar guruh tarkibi, qurollanishi va uning jangovar imkoniyatlari." },
  { id: 4, name: "Fuqaro muhofazasi", icon: React.createElement(Shield, { size: 20 }), day: 6, category: 'chqbt',
    theoryHint: "📌 Favqulodda vaziyatlar (tabiiy, texnogen, ekologik) turlari va FV vaqtidagi harakatlanish tartibi. Ommaviy qirg'in qurollari (yadroviy, kimyoviy, biologik) va ulardan himoyalanish usullari. Shaxsiy va jamoaviy himoya vositalari (GP-7, himoya kiyimlari)." },
  { id: 5, name: "Tibbiy bilim asoslari", icon: React.createElement(HeartPulse, { size: 20 }), day: 7, category: 'chqbt',
    theoryHint: "📌 Birinchi yordam ko'rsatish qoidalari. Qon ketish turlari va ularni to'xtatish usullari (jgut, bosuvchi bog'lam qo'yish). Jarohatlar va suyak sinishi belgilari, shina qo'yish. Kuyish darajalari, is gazidan zaharlanishda birinchi yordam va yuqumli kasalliklarning oldini olish." },
  { id: 6, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 8, category: 'chqbt',
    theoryHint: "📌 Pedagogika, didaktika va yosh psixologiyasi asoslari. Dars turlari va ularni rejalashtirish, sinfni samarali boshqarish. Sinf rahbarining huquq va majburiyatlari, sinf hujjatlarini yuritish tartibi, pedagogik etika va ota-onalar bilan hamkorlik." }
];

const artTopics = [
  { id: 7, name: "Tasviriy san'at asoslari", icon: React.createElement(Palette, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Tasviriy san’at turlari va janrlari (rangtasvir, grafika, haykaltaroshlik, me'morchilik). Rangshunoslik asoslari: iliq va sovuq ranglar, axromatik va xromatik ranglar, asosiy va hosila ranglarni aralashtirish. Natyurmort, portret, manzara, marina, maishiy va tarixiy janrlarni tahlil qilish." },
  { id: 8, name: "Amaliy bezak san'ati", icon: React.createElement(PaintBucket, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Xalq amaliy bezak san’ati turlari (ganchkorlik, yog'och o'ymakorligi, zargarlik, kulolchilik, koshinchilik). Naqsh elementlari, 10 ta eng mashhur gul naqshlari, hududiy xalq amaliy san'ati maktablari va o'zbek ustalari ijodi tahlili." },
  { id: 9, name: "Me'morlik va Miniatyura", icon: React.createElement(LandPlot, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Me’morlik (arxitektura) tarixi va turlari, qadimiy va zamonaviy memorchilik san'ati va taniqli me'morlar asarlari. Sharq miniatyura san’ati va miniatyura maktablarining (Toshkent, Buxoro, Samarqand, Hirot) o'ziga xosligi va buyuk namoyandalari." },
  { id: 10, name: "Dizayn va Zamonaviy san'at", icon: React.createElement(ImageIcon, { size: 20 }), day: 10, category: 'art',
    theoryHint: "📌 Dizayn san’ati turlari va yo'nalishlari (interyer, eksteryer, libos, landshaft, avtomobil). Zamonaviy tasviriy san'at turlari va texnikalari (Fluid-art, Pop-art, monotipiya, klyaksografiya, grezayl, strit-art va grafiti)." },
  { id: 11, name: "Grafik savodxonlik", icon: React.createElement(Ruler, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Chizmachilik asoslari: formatlar, standartlar, masshtablar, chiziq turlari va chizmada o'lcham qo'yish qoidalari. Proyeksiyalash usullari (markaziy va parallel), aksonometrik proyeksiyalar (frontal dimetrik va izometrik), ko'rinishlar, kesim va qirqim turlari." },
  { id: 12, name: "Mashinasozlik chizmalari", icon: React.createElement(Settings, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Ajraladigan va ajralmaydigan detallar birikmalari (boltli, shpilkali, payvand). Rezbalar va ularni chizmalarda tasvirlash hamda belgilash qoidalari. Oddiy yig‘ish chizmalarini o‘qish, tahlil qilish va detallashtirish." },
  { id: 13, name: "Qurilish chizmalari", icon: React.createElement(Home, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Qurilish chizmalarini o'qish xususiyatlari, chizma elementlarini farqlash. Bino plani, fasadlari va qirqim chizmalarining tahlili. Qurilish chizmalarida qo'llaniladigan shartli belgilar va o'lchamlar qo'yish." },
  { id: 14, name: "Pedagogik mahorat", icon: React.createElement(BookOpen, { size: 20 }), day: 11, category: 'art',
    theoryHint: "📌 Tasviriy san’at fani o'qitish metodikasi, dars turlari, tuzilishi va ularni rejalashtirish. Didaktika tamoyillari (onglilik, ko'rgazmalilik, tizimlilik). O'qituvchining kasbiy standarti, etika qoidalari va hamkorlik faoliyati." }
];

const tarixTopics = [
  { id: 15, name: "O'zbekiston tarixi I", icon: React.createElement(Compass, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 O‘zbekiston tarixining qadimgi va ilk o'rta asrlar (IV–XIII asrlar) davri. Qadimgi insonlar, dinlar (zardushtiylik), Buyuk ipak yo'li. Ilk o'rta asrlarda yer egaligi, ijtimoiy tabaqalar va Somoniylar, Qoraxoniylar, Xorazmshohlar davlatlari." },
  { id: 16, name: "O'zbekiston tarixi II", icon: React.createElement(Shield, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 XIII–XV asrlar davri: Mo'g'ullar istilosi va unga qarshi kurash (Jaloliddin Manguberdi). Amir Temur va Temuriylar saltanatining tashkil topishi, boshqaruv tizimi, harbiy yurishlar va ilm-fan, madaniyat rivoji." },
  { id: 17, name: "O'zbekiston tarixi III", icon: React.createElement(Scroll, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 XVI–XIX asrning birinchi yarmi: Buxoro, Xiva va Qo'qon xonliklarining tashkil topishi. Davlat boshqaruvi, yer egaligi turlari, soliqlar, madaniy hayot va diplomatik aloqalar." },
  { id: 18, name: "O'zbekiston tarixi IV", icon: React.createElement(Map, { size: 20 }), day: 14, category: 'tarix',
    theoryHint: "📌 XIX asrning ikkinchi yarmi – mustaqillik davri: Chor Rossiyasi istilosi, jadidchilik harakati, sho'rolar mustamlakachiligi va qatag'onlar. Mustaqillikka erishish jarayoni, siyosiy, iqtisodiy va madaniy islohotlar, tashqi siyosat." },
  { id: 19, name: "Jahon tarixi I", icon: React.createElement(Hourglass, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Qadimgi dunyo va oʻrta asrlar (V–XV asrlar) jahon tarixi. Qadimgi sivilizatsiyalar (Misr, Bobil, Rim, Yunoniston). Oʻrta asrlarda Yevropa, Osiyo (Xitoy, Hindiston), Amerika va Afrika xalqlari hayoti, feodalizm va hukmdorlar." },
  { id: 20, name: "Jahon tarixi II", icon: React.createElement(Compass, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Jahon tarixining yangi davri (XVI–XX asr boshlari). Buyuk geografik kashfiyotlar, sanoat to'ntarishi, burjua inqiloblari. Yevropa, Amerika, Osiyo va Afrika mamlakatlarining siyosiy va iqtisodiy rivojlanishi." },
  { id: 21, name: "Jahon tarixi III", icon: React.createElement(Globe, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Jahonning eng yangi tarixi (XX–XXI asrlar). Birinchi va Ikkinchi jahon urushlari. Sovuq urush davri, mustamlakachilik tizimining yemirilishi. Globallashuv va hozirgi dunyoning dolzarb xalqaro muammolari." },
  { id: 22, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 15, category: 'tarix',
    theoryHint: "📌 Tarix o‘qitish metodikasi va dars turlari. Pedagogika va psixologiya asoslari, ta'lim texnologiyalari (loyihaviy, muammoli ta'lim). O'qituvchining kasb standarti va muloqot etikasi." }
];

const sportTopics = [
  { id: 23, name: "Fiziologiya va Sog'lom hayot", icon: React.createElement(HeartPulse, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Sport fiziologiyasi va sog'lom turmush tarzi. Jismoniy yuklamalarga moslashish, mushak, nafas olish va yurak-qon tomir tizimining jismoniy tarbiyadagi ahamiyati hamda funksiyalari." },
  { id: 24, name: "Gimnastika qoidalari", icon: React.createElement(Activity, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Gimnastika turlari, mashqlarning bajarilish texnikasi va qoidalari. Gimnastika mashg'ulotlarida metodik yondashuv, xavfsizlik va yuzaga keladigan xatolarni tahlil qilish." },
  { id: 25, name: "Harakatli o'yinlar", icon: React.createElement(Smile, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Harakatli o'yinlarning turlari va metodikasi. Bolalarning jismoniy sifatlarini (tezkorlik, chaqqonlik, kuch) rivojlantirishda o'yinlar roli va ularni yosh guruhlariga ko'ra rejalashtirish." },
  { id: 26, name: "Yengil atletika va Suzish", icon: React.createElement(Flame, { size: 20 }), day: 18, category: 'sport',
    theoryHint: "📌 Yengil atletika turlari (yugurish, sakrash, uloqtirish) va suzish uslublari (krol, brass, chalqancha). Musobaqa qoidalari, mashqlar texnikasi va ularni o'rgatish metodikasi." },
  { id: 27, name: "Kurash va Taktika", icon: React.createElement(Swords, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Kurash turlari (dzyudo, erkin kurash, milliy kurash) va ularning qoidalari. Jangovar texnik va taktik usullar, raqib harakatlarini tahlil qilish va amaliyotda qo'llash." },
  { id: 28, name: "Futbol va Voleybol", icon: React.createElement(Target, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Futbol va voleybol o'yinlari turlari, texnikasi va taktikasi. O'yin qoidalari, hakamlik asoslari, jamoa o'yinlarida taktik sxemalarni qo'llash va xatolarni tahlil qilish." },
  { id: 29, name: "Basketbol, Gandbol, Shaxmat", icon: React.createElement(Trophy, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Basketbol, gandbol va shaxmat-shashka o'yinlarining qoidalari va taktikasi. Musobaqalarni tashkil etish, sport inshootlari turlari va ulardan xavfsiz foydalanish qoidalari." },
  { id: 30, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 19, category: 'sport',
    theoryHint: "📌 Jismoniy tarbiya o'qitish metodikasi, dars rejalashtirish va tashkil etish. Umumiy pedagogika va yosh psixologiyasi, kasbiy standart va hamkorlik etikasini bilish." }
];

const boshlangichTopics = [
  { id: 31, name: "Imlo va Uslubiyat", icon: React.createElement(PenTool, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 Boshlang'ich sinflarda ona tili o'qitish: talaffuz va imlo qoidalari, bosh harflarni yozish, so'zlarni qo'shib/ajratib yozish. Tinish belgilari (punktuatsiya) va gap bo'laklarining kontekstdagi vazifalari." },
  { id: 32, name: "Lingvistik tahlil", icon: React.createElement(BookOpen, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 Ona tilidan fonetik, leksik, morfemik (so'z tarkibi) va morfologik (so'z turkumlari) tahlil o'tkazish, gap bo'laklarining sintaktik tahlili." },
  { id: 33, name: "O'qish va Adabiyot", icon: React.createElement(Heart, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 O'qish savodxonligi: badiiy matn tahlili (nasr), voqealar ketma-ketligi, qahramonlar obrazlari. O'zbek va jahon bolalar adabiyoti, xalq og'zaki ijodi va she'riy namunalar." },
  { id: 34, name: "Sonlar va Algebra", icon: React.createElement(Calculator, { size: 20 }), day: 22, category: 'boshlangich',
    theoryHint: "📌 Boshlang'ich matematika: natural, butun va kasr sonlar ustida amallar, sonlarni taqqoslash. Formula va tenglamalar tuzish, oddiy matnli masalalarni yechish va tahlil qilish." },
  { id: 35, name: "Geometriya va Mantiq", icon: React.createElement(Ruler, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Geometrik shakllar, perimetr va yuza hisoblash, o'lchov birliklarini aylantirish. Mantiqiy kombinatorika masalalari, ma'lumotlar bilan ishlash (jadvallar, diagrammalar, grafiklar)." },
  { id: 36, name: "Geografiya va Biologiya", icon: React.createElement(Sun, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Tabiiy fanlar: litosfera, gidrosfera va atmosfera qatlamlari, O'zbekiston iqlimi va resurslari. Landshaftlar, tirik organizmlarning tuzilishi va biologik jarayonlar (ozuqa zanjiri)." },
  { id: 37, name: "Fizika, Kimyo va Tarbiya", icon: React.createElement(Globe, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Moddaning agregat holatlari, agregat o'zgarishlar (erish, muzlash, bug'lanish). Fizik va kimyoviy xossalar. Boshlang'ich sinf tarbiya fanining maqsadlari va tarbiya turlari." },
  { id: 38, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 23, category: 'boshlangich',
    theoryHint: "📌 Boshlang'ich ta'lim metodikasi, dars rejalashtirish va sinfni boshqarish. Bolalar psixologiyasi va didaktika asoslari, kasb standarti va ota-onalar bilan hamkorlik." }
];

const infoTopics = [
  { id: 39, name: "Raqamli madaniyat", icon: React.createElement(Laptop, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Axborot va axborot jarayonlari, axborotni kodlash va o'lchov birliklari. Raqamli muhitda axloq, mualliflik huquqi va axborot xavfsizligi asoslari (zararli dasturlar va fishing)." },
  { id: 40, name: "Ofis dasturlari va VB", icon: React.createElement(FileText, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Kompyuterning texnik va dasturiy ta'minoti. MS Word, MS Excel (formulalar, diagrammalar, filtrlar) va MS PowerPoint dasturlarida ishlash. MS Access ma'lumotlar bazasi va SQL so'rovlari." },
  { id: 41, name: "Mantiq va Sanoq tizimi", icon: React.createElement(Binary, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Mantiqiy mulohazalar, mantiqiy amallar, rostlik jadvallari va mantiqiy sxemalar. Pozitsiyali sanoq sistemalari (2-lik, 8-lik, 10-lik, 16-lik) va ularda arifmetik amallar bajarish." },
  { id: 42, name: "Algoritmlash va Scratch", icon: React.createElement(Cpu, { size: 20 }), day: 26, category: 'info',
    theoryHint: "📌 Algoritm turlari (chiziqli, tarmoqlanuvchi, takrorlanuvchi), blok-sxemalar va psevdokod. Scratch vizual dasturlash muhitida bloklar, o'zgaruvchilar va spraytlar bilan ishlash." },
  { id: 43, name: "Python va JS dasturlash", icon: React.createElement(Code, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Python va JavaScript tillari sintaksisi. O'zgaruvchilar, shart operatorlari, sikllar, funksiyalar va massivlar bilan ishlash, oddiy dasturiy kodlar tahlili va natijasini aniqlash." },
  { id: 44, name: "Grafika va Veb-dizayn", icon: React.createElement(Monitor, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Rastrli va vektorli grafika. Rasm tahrirlash (Photoshop, Paint). HTML tilida teglari va atributlar (matn, rasm, ro'yxat, jadval, formalar) hamda CSS yordamida veb-sahifalarni bezash." },
  { id: 45, name: "Tarmoqlar va Xavfsizlik", icon: React.createElement(Wifi, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Kompyuter tarmoqlari turlari, tarmoq topologiyalari. IP manzillash, tarmoq maskasi va tarmoq manzillarini hisoblash. Elektron hukumat xizmatlari va freelance platformalarida ishlash." },
  { id: 46, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 27, category: 'info',
    theoryHint: "📌 Informatika o'qitish metodikasi, dars rejalashtirish va baholash. AKT texnologiyalarini darsga joriy qilish, kasbiy standart va xavfsiz rivojlantiruvchi ta'lim muhiti." }
];

const mttTopics = [
  { id: 47, name: "Pedagogika va Rivojlanish", icon: React.createElement(Baby, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Maktabgacha pedagogika asoslari va bola rivojlanishi. Jismoniy, psixik va ijtimoiy rivojlanish bosqichlari, shaxs shakllanishiga ta'sir qiluvchi omillar va tarbiyachiga qo'yiladigan talablar." },
  { id: 48, name: "Tarbiyalash turlari", icon: React.createElement(Heart, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Maktabgacha yoshdagi bolalarni aqliy, axloqiy, estetik, iqtisodiy, huquqiy va ekologik tarbiyalash. Bolalar mehnatining asosiy turlari va ularni amaliyotda to'g'ri tashkil qilish." },
  { id: 49, name: "Nutq va Sensor tarbiya", icon: React.createElement(MessageSquare, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Bolalar nutqini o'stirish, sensor tarbiya va matematik tasavvurlarni shakllantirish metodikasi. Badiiy adabiyot bilan tanishtirish, savodga o'rgatish va lug'at boyligini oshirish." },
  { id: 50, name: "Matematika va Tasviriy", icon: React.createElement(Palette, { size: 20 }), day: 30, category: 'mtt',
    theoryHint: "📌 Elementar matematik tasavvurlar va tasviriy faoliyat turlari (rasm chizish, loy/plastilin, applikatsiya, qurish-yasash). Sahnalashtirish va ijodiy faoliyatni tashkil qilish." },
  { id: 51, name: "O'yin va Rivojlanish muhiti", icon: React.createElement(Smile, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 O'yin – maktabgacha yoshdagi bolalarning yetakchi faoliyati. O'yin turlari (syujet-rolli, didaktik, harakatli) va guruhlarda rivojlantiruvchi ta'limiy muhitni loyihalash." },
  { id: 52, name: "Me'yoriy-huquqiy asoslar", icon: React.createElement(FileText, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 'Maktabgacha ta'lim va tarbiya to'g'risida'gi qonun, davlat talablari va 'Ilk qadam' davlat dasturi mazmuni. Bolalar hayoti va salomatligini muhofaza qilish, zo'ravonlikdan himoya." },
  { id: 53, name: "Bolalar xaritasi", icon: React.createElement(Map, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 Bolalarning rivojlanish darajasini (jismoniy, kognitiv, nutq, ijtimoiy-emotsional) kuzatish, qayd etish va 'bola rivojlanish xaritasi'ni to'g'ri yuritish, baholash qoidalari." },
  { id: 54, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 31, category: 'mtt',
    theoryHint: "📌 Pedagogik-psixologik kompetensiyalar, pedagogik etika, nutq va muloqot madaniyati. Rivojlantiruvchi ta'lim muhiti, innovatsion texnologiyalardan foydalanish va ota-onalar bilan hamkorlik." }
];

const tilTopics = [
  { id: 55, name: "Matn tahlili va Savodxonlik", icon: React.createElement(BookOpen, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 Ilmiy-ommabop matnlarni o'qib tushunish, fakt va fikrni farqlash, ma'lumotlarni taqqoslash va xulosalash. Matn qismlari o'rtasidagi mantiqiy bog'liqliklar va xronologiya tahlili." },
  { id: 56, name: "Imlo va Punktuatsiya", icon: React.createElement(PenTool, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 Ona tili imlo qoidalari: talaffuz va imlo tafovutlari, bosh harflarni yozish, so'zlarni qo'shib/ajratib/chiziqcha bilan yozish, fonetik o'zgarishlar. Tinish belgilarining to'g'ri qo'llanilishi." },
  { id: 57, name: "Uslubiyat va Nutq", icon: React.createElement(MessageSquare, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 So'z va qo'shimchalarning kontekstdagi ma'nosi va uslubiy vazifalari. Nutq uslublari (so'zlashuv, rasmiy, ilmiy, publitsistik, badiiy). Nutqiy vaziyatlarga mos nutq namunalarini tanlash." },
  { id: 58, name: "Til nazariyasi", icon: React.createElement(Ruler, { size: 20 }), day: 34, category: 'til',
    theoryHint: "📌 Lisoniy birliklarni fonetik, leksik, morfemik (so'z tarkibi), morfologik (so'z turkumlari) va sintaktik (so'z birikmasi va gap tahlili) me'yorlar asosida chuqur lingvistik tahlil qilish." },
  { id: 59, name: "Badiiy matn va Adabiyot", icon: React.createElement(FileText, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 Badiiy matn (nasriy, dramatik) tahlili, muallif uslubini, asarning umumiy mazmuni va tagma'nolarini aniqlash. Asar qahramonlarining ruhiy holati va kechinmalarini baholash." },
  { id: 60, name: "Milliy adabiyot tarixi", icon: React.createElement(Scroll, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 O'zbek xalq og'zaki ijodi va milliy adabiyot tarixi. Mumtoz adabiyot namoyandalari (Navoiy, Bobur va b.) va XX asr jadid adabiyoti, yangi o'zbek she'riyati, nasri va dramaturgiyasi." },
  { id: 61, name: "Jahon adabiyoti tarixi", icon: React.createElement(Globe, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 Jahon adabiyoti tarixidagi eng mashhur epik, lirik va dramatik asarlar tahlili. Mumtoz lirika janri, vazni (aruz, barmoq) va qofiya tizimi, badiiy san'atlarni aniqlash va farqlash." },
  { id: 62, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 35, category: 'til',
    theoryHint: "📌 Ona tili va adabiyot o'qitish metodikasi, ta'lim texnologiyalari. Umumiy pedagogika, didaktika va yosh psixologiyasi. O'qituvchining kasb standarti, etika va hamkorlik faoliyati." }
];

const mttRahbarTopics = [
  { id: 63, name: "Pedagogika va Rivojlanish", icon: React.createElement(Baby, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 Maktabgacha pedagogika va bolaning yosh/individual rivojlanish bosqichlari. O'yin muhitini yaratish, axloqiy, aqliy, jismoniy va estetik tarbiya turlarini boshqarish va nazorat qilish." },
  { id: 64, name: "Tarbiyaviy yo'nalishlar", icon: React.createElement(Heart, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 Tarbiyaviy va ta'limiy jarayonlarni rejalashtirish, tahlil qilish hamda metodik rahbarlik qilish. Tarbiyachi, musiqa rahbari, defektologlar faoliyatini metodik jihatdan muvofiqlashtirish." },
  { id: 65, name: "Metodik rahbarlik", icon: React.createElement(ClipboardList, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 MTTda ta'lim-tarbiya jarayonlariga metodik rahbarlik qilish, tarbiyachilarga metodik maslahat va ko'rsatmalar berish, ilg'or pedagogik tajribalarni ommalashtirish texnologiyalari." },
  { id: 66, name: "Xodimlar boshqaruvi", icon: React.createElement(Users, { size: 20 }), day: 38, category: 'mtt_rahbar',
    theoryHint: "📌 Pedagog kadrlar kompetentligini oshirish, kasbiy standart talablarini joriy etish, pedagogik kengashlar, seminarlar va treninglarni tashkil qilish, uzluksiz malaka oshirish monitoringi." },
  { id: 67, name: "Me'yoriy-huquqiy asoslar", icon: React.createElement(Scale, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 Maktabgacha ta'limga oid qonunlar, davlat standartlari, 'Ilk qadam' dasturi talablari. Bolalarni zo'ravonlikdan himoya qilish, ularning hayoti va sog'lig'ini muhofaza qilish qoidalari." },
  { id: 68, name: "Kuzatuv kengashi", icon: React.createElement(Shield, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 MTTda jamoatchilik boshqaruvi va Kuzatuv kengashi faoliyatini tashkil etish. Ekologik ta'lim-tarbiyani rivojlantirish va inklyuziv ta'lim (alohida ehtiyojli bolalar) jarayonini boshqarish." },
  { id: 69, name: "Hujjatlar va Muhit", icon: React.createElement(Award, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 MTTning yillik ish rejasini tuzish va ijrosini ta'minlash, pedagoglar ish hujjatlarini yuritish tartibi, bola rivojlanish kuzatuv xaritalari hamda guruhlarda rivojlantiruvchi ta'lim muhitini tashkil qilish." },
  { id: 70, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 39, category: 'mtt_rahbar',
    theoryHint: "📌 Rahbar xodimning pedagogik-psixologik kompetensiyalari, boshqaruv etika qoidalari, pedagogik dizayn va bolalar rivojlanish dinamikasini metodik qo'llab-quvvatlash va baholash." }
];

const nemisTopics = [
  { id: 71, name: "Nemis tili: Ilmiy-ommabop matn tushunish", icon: React.createElement(BookOpen, { size: 20 }), day: 42, category: 'nemis',
    theoryHint: "📌 Standart nemis tilida yozilgan ilmiy-ommabop matnlarni (gazeta, jurnal yoki internet maqolalari) o'qib tushunish, asosiy g'oyani aniqlash va kontekstdan so'z ma'nosini topish." },
  { id: 72, name: "Nemis tili: Voqeaband matn tushunish", icon: React.createElement(Compass, { size: 20 }), day: 42, category: 'nemis',
    theoryHint: "📌 Nemis tilidagi badiiy va real voqeaband matnlarni o'qib tushunish, voqealar ketma-ketligini va qahramonlar obrazlarini tahlil qilish." },
  { id: 73, name: "Nemis tili: Matn yaxlitligi va tuzilishi", icon: React.createElement(Scroll, { size: 20 }), day: 42, category: 'nemis',
    theoryHint: "📌 Matnning umumiy yaxlitligi va qismlari (kirish, rivojlantirish, xulosa) o'rtasidagi mantiqiy bog'liqliklar hamda bog'lovchilarni tahlil qilish." },
  { id: 74, name: "Nemis tili: Grammatika", icon: React.createElement(Ruler, { size: 20 }), day: 42, category: 'nemis',
    theoryHint: "📌 Nemis tili grammatikasi, kelishiklar, fe'l zamonlari (Präteritum, Perfekt, Plusquamperfekt), Passiv, Konjunktiv II, nisbiy gaplar va sintaktik o'zgarishlar." },
  { id: 75, name: "Nemis tili: Leksika", icon: React.createElement(PenTool, { size: 20 }), day: 43, category: 'nemis',
    theoryHint: "📌 So'z boyligi, so'z yasalishi (Suffixe, Präfixe), sinonimlar, o'xshash so'zlarni farqlash hamda kollokatsiyalar (Fraktal fe'llar, Nomen-Verb-Verbindungen)." },
  { id: 76, name: "Nemis tili: Pragmatika", icon: React.createElement(MessageSquare, { size: 20 }), day: 43, category: 'nemis',
    theoryHint: "📌 Turli nutqiy vaziyatlarga mos keladigan og'zaki yoki yozma nutq andozalari, suhbat strategiyalari va ijtimoiy-madaniy til normalari." },
  { id: 77, name: "Nemis tili: Kasbiy standartlar", icon: React.createElement(Scale, { size: 20 }), day: 43, category: 'nemis',
    theoryHint: "📌 Nemis tili o'qituvchisining kasbiy standarti, o'quv darslarini rejalashtirish, xavfsiz rivojlantiruvchi ta'lim muhitini yaratish hamda baholash mezonlari." },
  { id: 78, name: "Nemis tili: Pedagogika va sinf boshqaruvi", icon: React.createElement(Award, { size: 20 }), day: 43, category: 'nemis',
    theoryHint: "📌 Sinfni boshqarish usullari, o'qitish didaktikasi va pedagogik muloqot etikasini malaka sinovlarida va konkret keys vaziyatlarida qo'llash." },
  { id: 79, name: "Nemis tili: O'qitish metodikasi", icon: React.createElement(GraduationCap, { size: 20 }), day: 43, category: 'nemis',
    theoryHint: "📌 Nemis tilini chet tili sifatida o'qitish metodikasi (DaF), ta'lim metodlari (PPP, TBLT, CLIL, Guided Discovery, ALM) va zamonaviy yondashuvlar." }
];

export const SUBJECTS = [
  { id: 'chqbt', name: "CHQBT", icon: Medal, desc: "Harbiy bilimlar, Konstitutsiya va birinchi yordam" },
  { id: 'art', name: "Tasviriy San'at", icon: Palette, desc: "Chizmachilik va san'at tarixi" },
  { id: 'tarix', name: "Tarix", icon: BookOpen, desc: "O'zbekiston va Jahon tarixi, pedagogik mahorat" },
  { id: 'sport', name: "Jismoniy Tarbiya", icon: Activity, desc: "Sport nazariyasi va metodikasi" },
  { id: 'boshlangich', name: "Boshlang'ich Ta'lim", icon: Baby, desc: "Ona tili, matematika, tabiiy fanlar, metodika" },
  { id: 'info', name: "Informatika va AT", icon: Laptop, desc: "Kompyuter tizimlari, algoritmlash va dasturlash" },
  { id: 'mtt', name: "MTT Tarbiyachilari", icon: Smile, desc: "Maktabgacha ta'lim pedagogikasi va metodikasi" },
  { id: 'mtt_rahbar', name: "MTT Dir. O'rinbosari", icon: Award, desc: "Metodik rahbarlik, me'yoriy hujjatlar va boshqaruv" },
  { id: 'til', name: "Ona Tili va Adabiyot", icon: PenTool, desc: "Til qoidalari, adabiyot tarixi va tahlili" },
  { id: 'nemis', name: "Nemis Tili", icon: Globe, desc: "Til qoidalari, o'qib tushunish, pragmatika va metodika" }
];

export const TOPICS = [...chqbtTopics, ...artTopics, ...tarixTopics, ...sportTopics, ...boshlangichTopics, ...infoTopics, ...mttTopics, ...mttRahbarTopics, ...tilTopics, ...nemisTopics];

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
