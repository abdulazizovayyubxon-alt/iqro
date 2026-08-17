import { describe, it, expect } from 'vitest';
import { mergePartnerSets } from '../utils/mergeRules';

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
