/**
 * parse-partner-docx.mjs — hamkor ustoz yuborgan Word faylini savol JSON'iga
 * o'giradi.
 *
 * Fayl tuzilishi (ustozning odatiy formati):
 *   N-test. <sarlavha>
 *   <1..4 bandlar>
 *   a) ... b) ... c) ... d) ...
 *   Javob variantlari: A) 1-a, 2-b... B) ... C) ... D) ...
 *
 * Word'dan ko'chirilgan matnda bandlar orasida NOL KENGLIKDAGI belgi (​)
 * turadi — aynan shu ajratgich sifatida ishlatiladi, chunki oddiy qator uzilishi
 * ko'p joyda yo'q (hamma narsa bitta uzun qatorga yopishib chiqadi).
 *
 * Rasmli testlar bu skript bilan CHIQMAYDI — ular qo'lda yoziladi
 * (build-partner-composite.mjs bilan birlashtirilgan rasm biriktiriladi).
 */
import mammoth from 'mammoth';
import { writeFileSync } from 'node:fs';

const DOCX = process.argv[2];
const OUT = process.argv[3];
const KEY = (process.argv[4] || '').trim().split(/\s+/); // "B D B A ..."

const ZW = /​/g;

const raw = (await mammoth.extractRawText({ path: DOCX })).value;
// Nol kenglikdagi belgini qator uzilishiga aylantiramiz — bandlar ajralsin
const text = raw.replace(ZW, '\n').replace(/\r/g, '');

// "14-test" ba'zan "1<zw>4-test" bo'lib kelgan — yuqorida \n ga aylandi,
// shuning uchun raqam ichidagi uzilishni qaytarib yopishtiramiz.
const glued = text.replace(/(\d)\n(\d\s*-\s*test)/gi, '$1$2');

// Test boshlanishlari
const marks = [...glued.matchAll(/(\d{1,2})\s*-\s*test\b\.?:?/gi)]
  .map(m => ({ n: +m[1], i: m.index }));

const blocks = [];
for (let k = 0; k < marks.length; k++) {
  const start = marks[k].i;
  const end = k + 1 < marks.length ? marks[k + 1].i : glued.length;
  blocks.push({ n: marks[k].n, body: glued.slice(start, end) });
}

const clean = (s) => s.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();

// Ustoz matnni LaTeX aralash yozgan — Word'dan xom holda chiqadi.
// Ilovada `\rightarrow` yoki `3^\circ` ko'rinib qolmasligi kerak.
const latex = (s) => s
  .replace(/\\rightarrow/g, '→')
  .replace(/\^\\circ/g, '°')
  .replace(/\\text\{([^}]*)\}/g, '$1')
  .replace(/\\ /g, ' ')
  .replace(/\s{2,}/g, ' ');

/**
 * Savol matnini o'qiladigan holatga keltiradi:
 *  · a) b) c) d) ro'yxati bitta uzun qatorga yopishib chiqadi — ajratamiz;
 *  · bandlar ba'zan raqamsiz, ba'zan NOTO'G'RI raqamlangan (sarlavhaning
 *    o'ziga "1." tushib, bandlar 2 dan boshlanadi) — qaytadan raqamlaymiz,
 *    chunki javob variantlari aynan 1..N ga murojaat qiladi.
 */
function tuzat(savol) {
  let s = latex(savol);

  // a) b) c) d) ro'yxati bitta qatorga yopishib chiqadi: "...mo'ljallangana)
  // Limbdan...". Oddiy `\b([a-d])\)` bu yerda ISHLAMAYDI — belgidan oldin harf
  // turgani uchun so'z chegarasi yo'q. Teskarisiga qat'iyroq shart qo'ysak
  // ("oldida harf bo'lmasin") esa "(okop, transheya)," kabi matnlar YOLG'ON
  // mos keladi. Shuning uchun belgilarni KETMA-KET qidiramiz: a) dan keyin
  // b), undan keyin c) … — tartib doim shunday bo'ladi.
  // ⚠️ Birinchi "a)" ni ko'r-ko'rona olib bo'lmaydi: band matnining o'zida
  // "Yonishlarda (kuyishda)" kabi qavs yopilishi bor va u ham "a)" ga o'xshaydi.
  // Shuning uchun a) ning BARCHA joylashuvi yig'iladi va ulardan ENG OXIRGISI
  // tanlanadi — ro'yxat doim savol oxirida turadi.
  const nomzod = [];
  for (let i = s.indexOf('a)'); i !== -1; i = s.indexOf('a)', i + 1)) nomzod.push(i);
  let boshi = -1;
  for (let k = nomzod.length - 1; k >= 0; k--) {
    if (s.indexOf('b)', nomzod[k] + 1) > 0) { boshi = nomzod[k]; break; }
  }
  if (boshi >= 0) {
    let pos = boshi;
    s = s.slice(0, boshi) + '\n' + s.slice(boshi);
    pos += 1;
    for (const L of ['b', 'c', 'd', 'e']) {
      const at = s.indexOf(`${L})`, pos + 1);
      if (at < 0) break;
      s = s.slice(0, at) + '\n' + s.slice(at);
      pos = at + 1;
    }
  }
  const lines = s.split('\n').map(x => x.trim()).filter(Boolean);

  const firstOpt = lines.findIndex(l => /^[a-d]\)/.test(l));
  if (firstOpt < 1) return lines.join('\n');

  const sarlavha = lines[0].replace(/^\d{1,2}\s*[.)]\s*/, '');
  const bandlar = lines.slice(1, firstOpt).map(l => l.replace(/^\d{1,2}\s*[.)]\s*/, ''));
  const javoblar = lines.slice(firstOpt);

  return [
    sarlavha,
    ...bandlar.map((b, i) => `${i + 1}. ${b}`),
    '',
    'Mos keluvchi javoblar:',
    ...javoblar,
  ].join('\n');
}

const out = [];
const muammo = [];

for (const b of blocks) {
  // Variantlar qismini ajratamiz
  const vi = b.body.search(/Javob\s*variantlari\s*:?/i);
  if (vi < 0) { muammo.push(`${b.n}: "Javob variantlari" topilmadi`); continue; }

  const savol = clean(b.body.slice(0, vi).replace(/^\d{1,2}\s*-\s*test\b\.?:?/i, '').trim());
  const varQism = b.body.slice(vi).replace(/Javob\s*variantlari\s*:?/i, '');

  // A) ... B) ... C) ... D) — yopishib kelgan bo'lsa ham ajraladi
  const opts = [];
  const re = /([A-D])\)\s*([^]*?)(?=(?:[A-D]\)|$))/g;
  let m;
  while ((m = re.exec(varQism)) !== null) {
    const t = latex(clean(m[2]).replace(/\n/g, ' ')).trim();
    if (t) opts.push(`${m[1]}) ${t}`);
  }

  if (opts.length < 2) { muammo.push(`${b.n}: variant soni ${opts.length}`); continue; }

  const kalit = KEY[b.n - 1];
  const idx = kalit ? 'ABCD'.indexOf(kalit) : -1;
  if (idx < 0 || idx >= opts.length) {
    muammo.push(`${b.n}: kalit "${kalit}" variantlarga tushmadi (${opts.length} ta)`);
  }

  out.push({ n: b.n, q: tuzat(savol), opts, correct: idx >= 0 && idx < opts.length ? idx : null });
}

writeFileSync(OUT, JSON.stringify({ questions: out }, null, 2));
console.log(`Ajratildi: ${out.length} ta test`);
console.log(`Variant soni 4 emas: ${out.filter(q => q.opts.length !== 4).map(q => q.n + '(' + q.opts.length + ')').join(', ') || 'yo\'q'}`);
console.log(`Muammoli: ${muammo.length ? '\n  ' + muammo.join('\n  ') : 'yo\'q'}`);
