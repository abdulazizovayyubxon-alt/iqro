import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { ADMIN_EMAILS } from '../config';

// ════════════════════════════════════════════════════════════════════════
//  AUDIT 2026-09-02 (2), A-2 — ADMIN RO'YXATI UCH JOYDA YASHAYDI.
//
//  Uchalasini bitta faylga yig'ib bo'lMAYDI, chunki ular UCH XIL joyga
//  deploy bo'ladi:
//
//    1. `src/config.js`     — mijoz paketi (Vercel, main'ga push)
//    2. `api/_shared.js`    — serverless funksiyalar (Vercel, main'ga push)
//    3. `firestore.rules`   — Firebase (ALOHIDA `firebase deploy`), hech
//                             narsani import qila olmaydi
//
//  Nomuvofiqlik JIMGINA ikki xil nosozlik beradi:
//    (a) `config.js` dan olib tashlab `rules` da qoldirsangiz — o'sha odam
//        admin panelni ko'rmaydi, LEKIN bazaga to'liq yozish huquqini
//        SAQLAB QOLADI. Bu xavfsizlik nuqsoni;
//    (b) teskarisida — admin panelni ko'radi, har amali permission-denied
//        bilan yiqiladi.
//
//  Shuning uchun mosligi shu test bilan qulflanadi. Test yiqilsa — uchala
//  joyni tenglashtiring VA `firebase deploy --only firestore:rules` qiling.
// ════════════════════════════════════════════════════════════════════════

const read = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/** `firestore.rules` dagi `isAdmin()` ichidagi qat'iy emaillar. */
const emailsFromRules = () => {
  const src = read('firestore.rules');
  const fn = src.match(/function isAdmin\(\)\s*\{([\s\S]*?)\n\s{4}\}/);
  if (!fn) throw new Error("firestore.rules dagi isAdmin() topilmadi");
  return [...fn[1].matchAll(/request\.auth\.token\.email\s*==\s*'([^']+)'/g)].map((m) => m[1]);
};

/** `api/_shared.js` dagi PLATFORM_ADMIN_EMAILS massivi. */
const emailsFromShared = () => {
  const src = read('api/_shared.js');
  const arr = src.match(/export const PLATFORM_ADMIN_EMAILS\s*=\s*\[([\s\S]*?)\]/);
  if (!arr) throw new Error("api/_shared.js dagi PLATFORM_ADMIN_EMAILS topilmadi");
  return [...arr[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

const sorted = (list) => [...list].sort();

describe('admin emaillari uchala manbada bir xil', () => {
  it('ro‘yxat bo‘sh emas va shakli to‘g‘ri', () => {
    expect(ADMIN_EMAILS.length).toBeGreaterThan(0);
    ADMIN_EMAILS.forEach((e) => expect(e).toMatch(/^[^\s@]+@[^\s@]+$/));
  });

  it('src/config.js ↔ firestore.rules', () => {
    // Yiqilsa: rules'da qolgan email bazaga to'liq yozish huquqini beradi.
    expect(sorted(emailsFromRules())).toEqual(sorted(ADMIN_EMAILS));
  });

  it('src/config.js ↔ api/_shared.js', () => {
    expect(sorted(emailsFromShared())).toEqual(sorted(ADMIN_EMAILS));
  });
});

describe('api/ da mustaqil nusxa qolmagan', () => {
  // A-2 gacha notify-admin.js, partner.js va school.js har biri o'z
  // ro'yxatini e'lon qilardi. Endi hammasi `_shared.js` dan oladi.
  const files = ['api/notify-admin.js', 'api/partner.js', 'api/school.js'];

  it.each(files)('%s emaillarni qatorda yozmaydi', (f) => {
    const src = read(f);
    ADMIN_EMAILS.forEach((email) => {
      expect(src, `${f} ichida "${email}" qatori bor — _shared.js dan import qiling`)
        .not.toContain(email);
    });
  });

  it.each(files)('%s _shared.js dan PLATFORM_ADMIN_EMAILS oladi', (f) => {
    expect(read(f)).toMatch(/import \{[^}]*PLATFORM_ADMIN_EMAILS[^}]*\} from '\.\/_shared\.js'/);
  });
});
