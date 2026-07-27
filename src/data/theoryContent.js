/**
 * theoryContent.js — mavzular bo'yicha strukturaviy konspektlar.
 *
 * Ma'lumotning o'zi qo'shni `theoryContent.json` faylida turadi. Nega ajratildi:
 * matnlar o'zbekcha apostrofga to'la (`o'`, `g'`, `to'g'risida`), ularni JS
 * manba kodiga DASTURIY yozish qochirish xatolariga olib keladi. JSON esa
 * mashina uchun xavfsiz — `pipeline/ingest-theory.mjs` aynan shu faylni
 * yangilaydi, bu modul faqat uni ochib beradi.
 *
 * ⚠️ BU MODUL DINAMIK YUKLANADI (`theory.js` → `loadTheoryContent`). Uni
 * boshqa joydan statik `import` qilmang — aks holda butun matn asosiy
 * paketga tushib, ilovaning ochilish tezligi pasayadi.
 *
 * TO'LDIRISH TARTIBI (128 mavzu):
 *   1. node pipeline/make-theory-prompts.mjs --topic 0
 *      → pipeline/inbox/theory/topic-0.txt (bepul web LLM'ga qo'yiladi)
 *   2. LLM javobini pipeline/inbox/theory/topic-0.json ga saqlang
 *   3. node pipeline/ingest-theory.mjs
 *      → tekshiradi va theoryContent.json ni yangilaydi
 *
 * ⚠️ SIFAT: bu material attestatsiyaga tayyorlanayotgan o'qituvchi o'qiydi.
 * Har bir mavzu SOHA MUTAXASSISI tomonidan tasdiqlanishi shart — generatsiya
 * qilingan matn to'g'ridan-to'g'ri ishlab chiqarishga chiqmasin.
 *
 * Yozilmagan mavzu muammo emas: `theory.js` `mockData.theoryHint` ni zaxira
 * sifatida ishlatadi va bo'lim `legacy` belgisini oladi.
 *
 * Shakl: { [topicId]: { summary, keyPoints:[{t,d}], mustKnow:[], mistakes:[], mnemonics:[], source, updatedAt } }
 */
import content from './theoryContent.json';

export const THEORY = content;

export default THEORY;
