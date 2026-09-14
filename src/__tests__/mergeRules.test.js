import { describe, it, expect } from 'vitest';
import { mergePartnerSets, mergeActiveCategory } from '../utils/mergeRules';

/**
 * X-2 BANDI — haftalik diagnostika natijasining yo'qolishi.
 *
 * Bu testlarning har biri REAL ma'lumot yo'qotilishini qo'riqlaydi, sintaksis
 * emas. Eng muhimi — «faqat lokalda bor» holati: aynan shunda oflayn yechilgan
 * to'plam natijasi bulut nusxasi bilan bosib ketilardi, ustoz hisobotida odam
 * «yechmagan» bo'lib ko'rinardi va keyingi hafta ochilmay qolardi.
 */

const natija = (correct, doneAt) => ({ correct, answered: 50, doneAt });

describe('mergePartnerSets', () => {
  it('faqat LOKALDA bor natijani saqlaydi (X-2 ning o\'zagi)', () => {
    const out = mergePartnerSets({}, { h1: natija(42, '2026-08-16T10:00:00.000Z') });
    expect(out.h1.correct).toBe(42);
  });

  it('faqat bulutda bor natijani saqlaydi', () => {
    const out = mergePartnerSets({ h1: natija(30, '2026-08-15T10:00:00.000Z') }, {});
    expect(out.h1.correct).toBe(30);
  });

  it('turli to\'plamlarni birlashtiradi, birortasini yo\'qotmaydi', () => {
    const out = mergePartnerSets(
      { h1: natija(30, '2026-08-10T10:00:00.000Z') },
      { h2: natija(45, '2026-08-16T10:00:00.000Z') },
    );
    expect(Object.keys(out).sort()).toEqual(['h1', 'h2']);
  });

  it('ziddiyatda ERTAROQ urinish g\'olib — birinchi urinish o\'zgarmaydi', () => {
    // Ikki qurilmada yechilgan: ustoz BIRINCHI urinishning haqiqiy raqamini
    // ko'rishi kerak, «to'g'irlangan» ikkinchisini emas.
    const out = mergePartnerSets(
      { h1: natija(48, '2026-08-16T12:00:00.000Z') },   // keyingi, yuqori ball
      { h1: natija(31, '2026-08-16T09:00:00.000Z') },   // birinchi, past ball
    );
    expect(out.h1.correct).toBe(31);
  });

  it('ziddiyat yo\'nalishga bog\'liq emas (simmetrik)', () => {
    const erta = natija(31, '2026-08-16T09:00:00.000Z');
    const kech = natija(48, '2026-08-16T12:00:00.000Z');
    expect(mergePartnerSets({ h1: erta }, { h1: kech }).h1.correct).toBe(31);
    expect(mergePartnerSets({ h1: kech }, { h1: erta }).h1.correct).toBe(31);
  });

  it('doneAt yo\'q eski yozuvda — vaqti ma\'lumi ustun', () => {
    const eski = { correct: 20, answered: 50 };               // doneAt yo'q
    const yangi = natija(35, '2026-08-16T09:00:00.000Z');
    expect(mergePartnerSets({ h1: eski }, { h1: yangi }).h1.correct).toBe(35);
    expect(mergePartnerSets({ h1: yangi }, { h1: eski }).h1.correct).toBe(35);
  });

  it('ikkalasi ham bo\'sh/yo\'q bo\'lsa null — mavjud maydonga tegilmaydi', () => {
    // null qaytishi muhim: AppContext shunda `merged.partnerSets` ga UMUMAN
    // tegmaydi. Aks holda bo'sh `{}` yozib, bulutdagi holatni o'chirardi.
    expect(mergePartnerSets(undefined, undefined)).toBeNull();
    expect(mergePartnerSets({}, {})).toBeNull();
  });
});

/**
 * 2026-09-14 — tanlangan fan sahifa yangilangach Informatikaga qaytardi.
 *
 * Bulut sekin yoziladi (30 s debounce, kvota tugasa umuman yozilmaydi), lokal
 * zaxira esa darhol. Ilgari birlashtirishda bulut so'zsiz g'olib edi — ya'ni
 * bulutda qolib ketgan eski fan har yangilanishda foydalanuvchining yangi
 * tanlovini bosib ketardi.
 */
const tanlov = (activeCategory, activeCategoryAt) => ({ activeCategory, activeCategoryAt });

describe('mergeActiveCategory', () => {
  it('bulut orqada qolsa LOKALDAGI yangi tanlov saqlanadi (xatoning o\'zagi)', () => {
    const out = mergeActiveCategory(tanlov('info', 1000), tanlov('chqbt', 2000));
    expect(out.activeCategory).toBe('chqbt');
    expect(out.activeCategoryAt).toBe(2000);
  });

  it('boshqa qurilmada keyinroq tanlangan fan bulutdan keladi', () => {
    const out = mergeActiveCategory(tanlov('tarix', 5000), tanlov('chqbt', 2000));
    expect(out.activeCategory).toBe('tarix');
    expect(out.activeCategoryAt).toBe(5000);
  });

  it('tuzatishdan oldingi yozuvlar (ikkalasida vaqt yo\'q) — lokal g\'olib', () => {
    // Aynan shikoyat qilingan holat: bulutda eski «info», shu qurilmada esa
    // keyin tanlangan fan. Yangilanishdan keyin qayta tanlash shart bo'lmasin.
    const out = mergeActiveCategory({ activeCategory: 'info' }, { activeCategory: 'chqbt' });
    expect(out.activeCategory).toBe('chqbt');
    expect(out.activeCategoryAt).toBeNull();
  });

  it('vaqti bor tanlov vaqtsiz eski yozuvdan ustun — qaysi tomonda bo\'lmasin', () => {
    expect(mergeActiveCategory(tanlov('tarix', 5000), { activeCategory: 'chqbt' }).activeCategory).toBe('tarix');
    expect(mergeActiveCategory({ activeCategory: 'info' }, tanlov('chqbt', 2000)).activeCategory).toBe('chqbt');
  });

  it('fan faqat bir tomonda bo\'lsa — o\'sha olinadi', () => {
    expect(mergeActiveCategory({}, { activeCategory: 'art' }).activeCategory).toBe('art');
    expect(mergeActiveCategory({ activeCategory: 'art' }, {}).activeCategory).toBe('art');
  });

  it('hech birida fan yo\'q — null, maydonga tegilmaydi', () => {
    expect(mergeActiveCategory({}, {})).toBeNull();
    expect(mergeActiveCategory(undefined, undefined)).toBeNull();
  });
});
