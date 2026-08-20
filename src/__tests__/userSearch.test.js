import { describe, it, expect } from 'vitest';
import { normalizeSearch, userHaystack, matchesUserSearch } from '../utils/userSearch';

// ════════════════════════════════════════════════════════════════════════
//  Admin panelidagi foydalanuvchi qidiruvi.
//
//  BU TESTNING KELIB CHIQISHI (2026-08-20): admin panelda «Omonov» deb
//  qidirilganda «mavjud emas» chiqardi, holbuki bazada uchta Omonov bor edi.
//  Sabab ikkitasi edi:
//    1) server qidiruvida `displayName` bo'yicha so'rov UMUMAN yo'q edi;
//    2) mijozdagi filtr butun matnni bitta bo'lak deb solishtirardi.
//  Pastdagi testlar shu ikki holatning qaytib kelishini qo'riqlaydi.
// ════════════════════════════════════════════════════════════════════════

// Bazadagi haqiqiy shaklga mos namunalar (AuthContext.jsx: displayName —
// «Familiya Ism» tartibida, phone — 12 xonali «998…»).
const omonovAziz    = { id: 'u1', displayName: 'Omonov Aziz',      phone: '998901234567', email: '998901234567@iqro.uz', shortId: 'A0001' };
const omonovaDilnoza = { id: 'u2', displayName: 'Omonova Dilnoza', phone: '998912345678', email: '998912345678@iqro.uz', shortId: 'B0002' };
const azizOmonov    = { id: 'u3', displayName: 'Aziz Omonov',      phone: '998933456789', email: '998933456789@iqro.uz', shortId: 'C0003' };
const qoraevSardor  = { id: 'u4', displayName: "Qo'raev Sardor",   phone: '998944567890', email: '998944567890@iqro.uz', shortId: 'D0004' };

const hamma = [omonovAziz, omonovaDilnoza, azizOmonov, qoraevSardor];
const topilganlar = (term) => hamma.filter(u => matchesUserSearch(u, term)).map(u => u.id);

describe('matchesUserSearch — asosiy holat (bug reproduksiyasi)', () => {
  it('«Omonov» uchta Omonovni ham topadi — ism tartibidan qat\'i nazar', () => {
    expect(topilganlar('Omonov')).toEqual(['u1', 'u2', 'u3']);
  });

  it('«omon» — chala yozilgan familiya ham hammasini topadi', () => {
    // Foydalanuvchi aynan shuni so'radi: "omon deb yozsam hamma omonov chiqsin"
    expect(topilganlar('omon')).toEqual(['u1', 'u2', 'u3']);
  });

  it('registr ahamiyatsiz', () => {
    expect(topilganlar('OMONOV')).toEqual(['u1', 'u2', 'u3']);
    expect(topilganlar('oMoNoV')).toEqual(['u1', 'u2', 'u3']);
  });

  it('bo\'lmagan familiya HECH KIMNI topmaydi — soxta-ijobiy bo\'lmasin', () => {
    expect(topilganlar('Karimov')).toEqual([]);
  });
});

describe('matchesUserSearch — so\'z tartibi', () => {
  it('«aziz omonov» ikkala yozuv tartibini ham topadi', () => {
    // AVVAL BUZUQ EDI: butun matn bitta bo'lak sifatida solishtirilardi,
    // shuning uchun «aziz omonov» → «Omonov Aziz» ni topmasdi.
    expect(topilganlar('aziz omonov')).toEqual(['u1', 'u3']);
  });

  it('«omonov aziz» ham xuddi shu natijani beradi', () => {
    expect(topilganlar('omonov aziz')).toEqual(['u1', 'u3']);
  });

  it('ortiqcha bo\'shliqlar natijani buzmaydi', () => {
    expect(topilganlar('   omonov    aziz  ')).toEqual(['u1', 'u3']);
  });

  it('har bir so\'z topilishi SHART (VA mantiqi, YOKI emas)', () => {
    // «omonov sardor» — bunday odam yo'q: Sardor Qo'raev, Omonov emas.
    // YOKI mantiqida bu 4 kishini qaytarardi va qidiruv ma'nosini yo'qotardi.
    expect(topilganlar('omonov sardor')).toEqual([]);
  });
});

describe('matchesUserSearch — telefon raqami', () => {
  it('to\'liq raqam bilan topiladi', () => {
    expect(topilganlar('998901234567')).toEqual(['u1']);
  });

  it('998 PREFIKSISIZ ham topiladi', () => {
    // AVVAL BUZUQ EDI: bazada raqam «998901234567», admin esa odatda
    // «901234567» deb yozadi — hech narsa topilmasdi.
    expect(topilganlar('901234567')).toEqual(['u1']);
  });

  it('raqamning bir qismi bilan ham topiladi', () => {
    expect(topilganlar('9012345')).toEqual(['u1']);
  });

  it('formatlangan raqam (bo\'shliq/qavs/chiziqcha) ham ishlaydi', () => {
    // `+998 90 123-45-67` → so'zlarga bo'linadi, har bo'lak haystack ichida bor
    expect(topilganlar('998 90 123 45 67')).toEqual(['u1']);
  });

  it('phoneNumber maydoni (eski hisoblar) ham qidiriladi', () => {
    const eski = { id: 'u9', displayName: 'Eski Hisob', phoneNumber: '998995556677' };
    expect(matchesUserSearch(eski, '995556677')).toBe(true);
  });
});

describe('matchesUserSearch — qisqa ID va email', () => {
  it('shortId bo\'yicha topiladi (registrga qaramay)', () => {
    expect(topilganlar('a0001')).toEqual(['u1']);
    expect(topilganlar('A0001')).toEqual(['u1']);
  });

  it('email bo\'yicha topiladi', () => {
    expect(topilganlar('998912345678@iqro.uz')).toEqual(['u2']);
  });
});

describe('normalizeSearch — apostrof va registr', () => {
  it('apostrofning barcha ko\'rinishi bir xil qiymatga keladi', () => {
    const variantlar = ["Qo'raev", 'Qoʻraev', 'Qo‘raev', 'Qo’raev', 'Qoʼraev'];
    const natija = variantlar.map(normalizeSearch);
    expect(new Set(natija).size).toBe(1);
    expect(natija[0]).toBe("qo'raev");
  });

  it('turli apostrof bilan yozilgan familiya topiladi', () => {
    // Admin klaviaturada oddiy ' bosadi, bazada esa ʻ bo'lishi mumkin.
    expect(matchesUserSearch({ displayName: 'Qoʻraev Sardor' }, "qo'raev")).toBe(true);
    expect(matchesUserSearch({ displayName: "Qo'raev Sardor" }, 'qoʻraev')).toBe(true);
  });
});

describe('chegaraviy holatlar — qidiruv hech qachon yiqilmasin', () => {
  it('bo\'sh qidiruv HAMMANI qaytaradi (filtr o\'chirilgan holat)', () => {
    expect(topilganlar('')).toEqual(['u1', 'u2', 'u3', 'u4']);
    expect(topilganlar('   ')).toEqual(['u1', 'u2', 'u3', 'u4']);
  });

  it('maydonlari yo\'q hujjat xato bermaydi', () => {
    // Bazada chala hujjatlar bor (displayName yoki phone yo'q) — qidiruv
    // ular ustida YIQILMASLIGI kerak, aks holda butun ro'yxat ko'rinmay qoladi.
    expect(() => matchesUserSearch({}, 'omonov')).not.toThrow();
    expect(matchesUserSearch({}, 'omonov')).toBe(false);
    expect(matchesUserSearch(null, 'omonov')).toBe(false);
    expect(matchesUserSearch(undefined, 'omonov')).toBe(false);
  });

  it('null/undefined qidiruv matni HAMMANI qaytaradi', () => {
    expect(matchesUserSearch(omonovAziz, null)).toBe(true);
    expect(matchesUserSearch(omonovAziz, undefined)).toBe(true);
  });

  it('userHaystack telefonni ikki ko\'rinishda saqlaydi', () => {
    const hay = userHaystack(omonovAziz);
    expect(hay).toContain('998901234567');
    expect(hay).toContain('901234567');
  });
});
