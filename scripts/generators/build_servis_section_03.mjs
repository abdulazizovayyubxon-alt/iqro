import fs from 'node:fs';
import path from 'node:path';
import { createQuestionBankServis, balanceOptions } from './generator_core_servis.mjs';

const templates = [
  // 1. Zardo'zlik: Zaminduzi va Gulduzi
  (qId, idx, target) => {
        const styles = [
      { name: "Zaminduzi uslubi", desc: "gazlamaning butun maydoni (zamini) birorta ham ochiq joy qoldirilmasdan oltin va kumush iplar bilan to'liq qoplab tikilishi" },
      { name: "Gulduzi uslubi", desc: "oldindan maxsus qalin qog'oz yoki kartondan qirqib olingan naqshlar ustidan zar iplarni qabartma shaklda terib tikish" },
      { name: "Puxlitah (aralash) uslubi", desc: "ham zaminduzi, ham gulduzi usullarini bir xil kompozitsiyada mahorat bilan uyg'unlashtirib qo'llash" }
    ];
    const s = styles[idx % styles.length];
    const q = `Buxoro an'anaviy zardo'zlik san'atida keng qo'llaniladigan '${s.name}'ning bosh texnologik xususiyati nima hisoblanadi? (#${qId})`;
    const correct = `Ushbu uslubning bosh xususiyati ${s.desc} hisoblanadi`;
    const distractors = [
      "Ushbu uslubning bosh xususiyati gazlamani faqat to'q qora rangga bo'yab, ustiga hech qanday ip qadamasdan faqat yelim surtib jilo berish amaliyotidir",
      "Ushbu uslubning bosh xususiyati faqat jun tolalarni qo'lda ezib pishiq kigiz bosish va xona poliga to'shash uchun mo'ljallangan qalin buyum tayyorlashdir",
      "Ushbu uslubning bosh xususiyati yupqa metall plastinkalarni mayda mixlar yordamida matoga qoqib mahkamlash va zargarlik buyumi yasash operatsiyasidir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Buxoro zardo'zligi: Zaminduzi — mato zaminini butunlay zar bilan to'ldirish; Gulduzi — karton andaza ustidan qabartma zar tikish.",
      mnemonic: "Zardo'zlik uslubi: Zamin to'lsa — zaminduzi, gul qabarsa — gulduzi; Buxoroning zar san'ati jahonga mashhur o'zi.",
      question_type: "Y1",
      bloom_level: "Bilish"
    };
  },

  // 2. Milliy kashtachilik maktablari: Shahrisabz va Iroqi chok
  (qId, idx, target) => {
        const schools = [
      { name: "Shahrisabz kashtachilik maktabining", feature: "hisoblama 'Iroqi' (yarim xochsimon) chok usulida mayda aniq katakchalar bo'yicha gilamdek qalin to'qilishi" },
      { name: "Samarqand kashtachilik maktabining", feature: "yirik qizil doirasimon naqshlar (oftob, koinot rozetkalari) va quyuq to'q binafsharang fon bilan ajralib turishi" },
      { name: "Toshkent kashtachilik maktabining ('Palak' kompozitsiyasi)", feature: "qizil yoki oq bo'z mato ustiga o'yilgan yirik yulduzsimon quyosh doiralarining to'liq qoplab tikilishi" },
      { name: "Nurota kashtachilik maktabining", feature: "och rangli tabiiy mato ustiga nihoyatda nafis, mayin gul va yaproq naqshlarining pastel tuslarda tushirilishi" }
    ];
    const sc = schools[idx % schools.length];
    const q = `O'zbek xalq amaliy san'atida ${sc.name} eng mashhur va o'ziga xos kompozitsion jihati qaysi javobda to'g'ri ko'rsatilgan? (#${qId})`;
    const correct = `Ushbu maktabning o'ziga xosligi ${sc.feature} hisoblanadi`;
    const distractors = [
      "Ushbu maktabning o'ziga xosligi faqat qora rangli qalin charm ustiga po'lat simlar va mixlar qadab maxsus chavandozlik egar-jabdug'ini bezashdan iboratdir",
      "Ushbu maktabning o'ziga xosligi gazlamaga hech qanday naqsh chizmasdan uni faqat qaynoq tuzli suvda yuvib quritish va tekis taxlash amaliyoti hisoblanadi",
      "Ushbu maktabning o'ziga xosligi faqat rangli shisha idishlarni bo'yoq bilan bo'yash va ularga yaltiroq qog'oz gullarni yopishtirish san'ati sanaladi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Shahrisabz — hisoblama iroqi choki; Toshkent — oydek palaklar; Nurota — nozik tabiiy nafis gullar; Samarqand — yirik quyosh doiralari.",
      mnemonic: "Kashtachilik maktablari: Shahrisabzda iroqi, Toshkentda quyosh palak — har viloyat kashtasi o'ziga xos bir bezak.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  },

  // 3. Kashtachilik choklari: Bosma va Yo'rma
  (qId, idx, target) => {
        const stitches = [
      { name: "Bosma chok", desc: "naqsh maydonini (gul yaproqlari, mevalar) bir tekis zich iplar bilan to'liq qoplab tikish va ustidan mayda baxyalar bilan mahkamlash" },
      { name: "Yo'rma chok", desc: "ilgaksifat igna (biz) yoki oddiy igna yordamida bir-biriga ulanib ketuvchi zanjirsimon halqalar tizimini hosil qilish" },
      { name: "Xomdo'zi chok", desc: "oddiy ilgarilanma baxyalar orqali naqsh konturini yoki yengil o'tish chiziqlarini chizishdek yuritish" },
      { name: "Iroqi chok", desc: "matoning bo'ylama va ko'ndalang iplarini sanab, to'g'ri burchakli xochsimon geometrik qoplamalar hosil qilish" }
    ];
    const st = stitches[idx % stitches.length];
    const q = `Milliy kashtachilik texnologiyasida '${st.name}' usulining to'g'ri bajarilish qoidasi va amaliy vazifasi nima? (#${qId})`;
    const correct = `Ushbu chokda ${st.desc} ta'minlanadi`;
    const distractors = [
      "Ushbu chokda mato maxsus qaynoq o'simlik moyiga botirib olinadi va hech qanday ip ishlatmasdan ochiq havoda quritib qo'yiladi deb qaraladi",
      "Ushbu chok faqat og'ir metall buyumlarni payvandlashda qo'llaniladi va to'qimachilik amaliyotida mutlaqo foydalanilmaydigan chok hisoblanadi",
      "Ushbu chokda matoning barcha iplari qaychi bilan qirqib sug'urib olinadi va detalning markaziy qismida katta ochiq bo'shliq hosil qilinadi"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Bosma — gul yuzasini zich qoplash; Yo'rma — zanjirli zangori halqalar; Iroqi — sanama xoch choki; Xomdo'zi — chizma baxyalar.",
      mnemonic: "Kashta choklari: Bosma to'ldirar gulni, yo'rma zanjirlar yo'lni — sanama iroqi choki quvontirar ko'ngilni.",
      question_type: "Y1",
      bloom_level: "Qo'llash"
    };
  },

  // 4. Milliy naqshlar ramzi: Bodom, Qalampir, Anor
  (qId, idx, target) => {
        const symbols = [
      { name: "Bodom nusxa (kalgai) naqshi", meaning: "hayot, uyg'onish, omonlik, uzoq umr va donolik ramzi hisoblanadi" },
      { name: "Qalampir nusxa naqshi", meaning: "yovuz niyatlar, yomon ko'z va balolardan asrovchi himoya tumori ramzi hisoblanadi" },
      { name: "Anor va anor guli naqshi", meaning: "to'kin-sochinlik, farovonlik, serfarzandlik va barakali turmush ramzi hisoblanadi" },
      { name: "Oftob (quyosh) naqshi", meaning: "koinot nuri, issiqlik, hayotbaxsh energiya va adolat tantanasi ramzi hisoblanadi" }
    ];
    const sm = symbols[idx % symbols.length];
    const q = `O'zbek xalq amaliy san'ati va bezaklarida chuqur falsafiy ma'noga ega bo'lgan '${sm.name}' qanday ramziy ma'noni ifodalaydi? (#${qId})`;
    const correct = `Xalq tushunchasida bu naqsh ${sm.meaning}`;
    const distractors = [
      "Xalq tushunchasida bu naqsh faqat uy egalarining qancha qarzga ega ekanligini bildiruvchi tijoriy belgi sanaladi",
      "Xalq tushunchasida bu naqsh faqat poyabzal ishlab chiqaruvchi zavodlarning texnik tamg'asi sifatida tushuniladi",
      "Xalq tushunchasida bu naqsh faqat xonadon eshigining qulflanganligini ko'rsatuvchi ogohlantiruvchi belgidir"
    ];
    return {
      q,
      opts: balanceOptions(correct, distractors, target),
      correct: target,
      explanation: "Milliy naqshlar ramziyoti: Bodom — hayot va aql; Qalampir — ko'z-nazardan saqlash; Anor — to'kinlik va baraka; Oftob — koinot va yorug'lik.",
      mnemonic: "Naqshlar ma'nosi: Bodom — hayot, qalampir — tumor, anor — baraka va to'kin diyor.",
      question_type: "Y1",
      bloom_level: "Tushunish"
    };
  }
];

export function generateSection03() {
  const count = 156;
  const startId = 1353;
  const topicId = 198;
  const sectionName = '03_xalq_hunarmandchiligi_texnologiyasi.json';
  
  createQuestionBankServis(sectionName, topicId, startId, count, templates);
}

generateSection03();
