import { describe, it, expect } from 'vitest';
import {
  normalizeSearch, userHaystack, matchesUserSearch,
  buildUserSearchTokens, serverSearchKey, SEARCH_TOKEN_MAX, SEARCH_TOKEN_CAP,
} from '../utils/userSearch';

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

// ════════════════════════════════════════════════════════════════════════
//  SERVER INDEKSI — `searchTokens`
//
//  KELIB CHIQISHI (2026-08-29): baza 502 hisobga yetdi, admin paneli esa
//  eng yangi 500 tasini yuklab, qidiruvni SHU ro'yxat ichida qilardi.
//  Ya'ni qidiruvning ishonchliligi ro'yxat chegarasiga bog'lanib qolgan
//  edi — 2 000 hisobda «topilmadi» hech narsani anglatmay qo'yardi.
//  Endi prefikslar hujjatning o'zida saqlanadi va Firestore
//  `array-contains` bilan izlaydi.
//
//  Pastdagi testlar SHARTNOMANI qo'riqlaydi: yozuvchi tomon
//  (`buildUserSearchTokens`, AuthContext/ProfileDrawer/SettingsPage) va
//  o'qiydigan tomon (`serverSearchKey`, AdminPage) bir xil kalitni
//  hisoblashi SHART. Ular ajralib qolsa qidiruv jimgina 0 natija beradi —
//  xato ham chiqmaydi, faqat "bunday odam yo'q" degan yolg'on javob.
// ════════════════════════════════════════════════════════════════════════

/** Hujjat shu matn bo'yicha SERVERDA topiladimi — panelning aynan mantig'i. */
const serverTopadi = (u, term) => {
  const key = serverSearchKey(term);
  if (!key) return false;                               // so'rov yuborilmaydi
  if (!buildUserSearchTokens(u).includes(key)) return false; // array-contains
  return matchesUserSearch(u, term);                    // natijani qayta filtrlash
};

describe('buildUserSearchTokens — ism ichidagi HAR BIR so\'z indekslanadi', () => {
  // Foydalanuvchi xabaridagi aynan holat: ism birinchi, familiya ikkinchi.
  const oyxon = { displayName: 'Oyxon Abdulazizova', shortId: 'A0002', email: '998901234567@iqro.uz' };

  it('familiya ikkinchi so\'z bo\'lsa ham u bo\'yicha topiladi', () => {
    // AVVALGI YECHIM SHU YERDA YIQILARDI: `displayName >= 'abdulaziz'`
    // prefiks so'rovi faqat BIRINCHI so'zga qaraydi, ya'ni bu odam
    // «abdulaziz» bo'yicha umuman topilmasdi.
    expect(serverTopadi(oyxon, 'abdulaziz')).toBe(true);
  });

  it('ism (birinchi so\'z) bo\'yicha ham topiladi', () => {
    expect(serverTopadi(oyxon, 'oyxon')).toBe(true);
  });

  it('to\'liq familiya bo\'yicha topiladi', () => {
    expect(serverTopadi(oyxon, 'Abdulazizova')).toBe(true);
  });

  it('ikki so\'zli qidiruv — tartibidan qat\'i nazar', () => {
    expect(serverTopadi(oyxon, 'abdulazizova oyxon')).toBe(true);
    expect(serverTopadi(oyxon, 'oyxon abdulazizova')).toBe(true);
  });

  it('registr ahamiyatsiz', () => {
    expect(serverTopadi(oyxon, 'ABDULAZIZOVA')).toBe(true);
    expect(serverTopadi(oyxon, 'aBdUlAz')).toBe(true);
  });

  it('qisqa ID bo\'yicha topiladi — harfli va harfsiz', () => {
    expect(serverTopadi(oyxon, 'A0002')).toBe(true);
    expect(serverTopadi(oyxon, '0002')).toBe(true);
  });

  it('telefon (soxta email ichidan) bo\'yicha topiladi', () => {
    expect(serverTopadi(oyxon, '998901234567')).toBe(true);
  });

  it('BOSHQA odam topilmaydi — soxta-ijobiy bo\'lmasin', () => {
    expect(serverTopadi(oyxon, 'karimov')).toBe(false);
    // Ikkinchi so'z mos kelmasa — natija filtrlanib tashlanadi
    expect(serverTopadi(oyxon, 'abdulazizova sardor')).toBe(false);
  });
});

describe('buildUserSearchTokens — apostrof va chala hujjatlar', () => {
  it('apostrofli familiya apostrofsiz ham topiladi (va aksincha)', () => {
    const u = { displayName: 'Qoʻraev Sardor' };
    expect(serverTopadi(u, 'qoraev')).toBe(true);
    expect(serverTopadi(u, "qo'raev")).toBe(true);
  });

  it('maydonlari yo\'q hujjat xato bermaydi', () => {
    expect(() => buildUserSearchTokens({})).not.toThrow();
    expect(buildUserSearchTokens({})).toEqual([]);
    expect(buildUserSearchTokens(null)).toEqual([]);
    expect(buildUserSearchTokens(undefined)).toEqual([]);
  });

  it('tokenlar takrorlanmaydi va chegaradan oshmaydi', () => {
    const u = { displayName: 'Abdurahmonov Abdurahmon Abdurahmonovich', shortId: 'ZZ9999', email: 'abdurahmonov@gmail.com' };
    const t = buildUserSearchTokens(u);
    expect(new Set(t).size).toBe(t.length);
    expect(t.length).toBeLessThanOrEqual(SEARCH_TOKEN_CAP);
  });
});

describe('serverSearchKey — kvota qo\'riqchisi', () => {
  it('juda qisqa matn uchun so\'rov YUBORILMAYDI', () => {
    // Bir harfli so'rov bazadan tasodifiy 30 kishini keltirardi: foyda
    // yo'q, o'qish esa sarflangan. `null` — "so'rov qilma" signali.
    expect(serverSearchKey('a')).toBeNull();
    expect(serverSearchKey('')).toBeNull();
    expect(serverSearchKey('   ')).toBeNull();
    expect(serverSearchKey(null)).toBeNull();
  });

  it('qisqa RAQAM ham so\'rov qilmaydi — «998» butun bazaga mos kelardi', () => {
    expect(serverSearchKey('99')).toBeNull();
    expect(serverSearchKey('998')).toBeNull();
    expect(serverSearchKey('9989')).toBe('9989');
  });

  it('eng UZUN so\'z tanlanadi — u eng kam natija, ya\'ni eng kam o\'qish', () => {
    expect(serverSearchKey('oyxon abdulazizova')).toBe('abdulazizova');
    expect(serverSearchKey('abdulazizova oyxon')).toBe('abdulazizova');
  });

  it('uzun so\'z token uzunligigacha KESILADI', () => {
    // Bu ikki tomonning shartnomasi: hujjatdagi eng uzun token ham
    // SEARCH_TOKEN_MAX. Kesilmasa, uzun familiyalar hech qachon
    // topilmasdi — va buni hech qanday xato ko'rsatmasdi.
    const key = serverSearchKey('abdurahmonovich');
    expect(key).toHaveLength(SEARCH_TOKEN_MAX);
    expect(buildUserSearchTokens({ displayName: 'Abdurahmonovich Aziz' })).toContain(key);
  });
});
