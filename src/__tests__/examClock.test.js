import { describe, it, expect } from 'vitest';
import {
  deadlineFromSession,
  sessionHasTime,
  sessionSecondsLeft,
  secondsUntil,
  formatExamTime,
  shouldFinalizeExpired,
  STALE_SESSION_MS,
} from '../utils/examClock';

// Barcha testlar `now` ni ATAYLAB in'ektsiya qiladi: vaqtga bog'liq test
// CI'da tasodifiy yiqilmasligi kerak.
const NOW = 1_800_000_000_000; // qat'iy epoch nuqta

describe('deadlineFromSession — yangi format', () => {
  it('deadlineMs bor bo\'lsa uni o\'zini qaytaradi', () => {
    const s = { deadlineMs: NOW + 5000 };
    expect(deadlineFromSession(s, NOW)).toBe(NOW + 5000);
  });

  it('deadlineMs allaqachon o\'tgan bo\'lsa ham o\'zini qaytaradi (tekshiruv alohida)', () => {
    const s = { deadlineMs: NOW - 60_000 };
    expect(deadlineFromSession(s, NOW)).toBe(NOW - 60_000);
  });

  it('deadlineMs `timeLeft` dan USTUN turadi (ikkalasi bo\'lsa)', () => {
    // Migratsiya davrida ikkala maydon ham bo'lishi mumkin: yangi format g'olib.
    const s = { deadlineMs: NOW + 1000, timeLeft: 5400 };
    expect(deadlineFromSession(s, NOW)).toBe(NOW + 1000);
  });
});

describe('deadlineFromSession — eski format (migratsiya)', () => {
  it('timeLeft ni hozirgi vaqtga qo\'shadi', () => {
    // 2026-08-17 dan oldin saqlangan sessiya: 45 daqiqa qolgan edi
    const s = { timeLeft: 2700 };
    expect(deadlineFromSession(s, NOW)).toBe(NOW + 2_700_000);
  });

  it('eski sessiya vaqti YO\'QOLMAYDI (migratsiya asosiy sharti)', () => {
    const s = { timeLeft: 5400 }; // 90 daqiqa
    const d = deadlineFromSession(s, NOW);
    expect(sessionSecondsLeft({ deadlineMs: d }, NOW)).toBe(5400);
  });

  it('timeLeft = 0 yoki manfiy bo\'lsa null', () => {
    expect(deadlineFromSession({ timeLeft: 0 }, NOW)).toBeNull();
    expect(deadlineFromSession({ timeLeft: -10 }, NOW)).toBeNull();
  });

  it('buzuq/bo\'sh sessiyada null (yiqilmaydi)', () => {
    expect(deadlineFromSession(null, NOW)).toBeNull();
    expect(deadlineFromSession(undefined, NOW)).toBeNull();
    expect(deadlineFromSession({}, NOW)).toBeNull();
    expect(deadlineFromSession({ timeLeft: 'salom' }, NOW)).toBeNull();
    expect(deadlineFromSession({ deadlineMs: NaN }, NOW)).toBeNull();
    expect(deadlineFromSession({ deadlineMs: null, timeLeft: null }, NOW)).toBeNull();
  });
});

describe('sessionHasTime — tiklashga arziydimi', () => {
  it('vaqt qolgan sessiya tiklanadi', () => {
    expect(sessionHasTime({ deadlineMs: NOW + 1000 }, NOW)).toBe(true);
  });

  it('vaqti TUGAGAN sessiya tiklanmaydi', () => {
    // Muhim: aks holda foydalanuvchi ochilgan zahoti avto-yakunlanadigan
    // imtihonga tushib qolardi.
    expect(sessionHasTime({ deadlineMs: NOW - 1 }, NOW)).toBe(false);
    expect(sessionHasTime({ deadlineMs: NOW }, NOW)).toBe(false);
  });

  it('uzun uzilishdan keyin vaqt HAQIQATAN yo\'qoladi (sovg\'a yo\'q)', () => {
    // Bu tuzatishning mag'zi: deadline mutlaq nuqta, shuning uchun ilova
    // yopiq turgan vaqt ham imtihon vaqtidan ketadi.
    const s = { deadlineMs: NOW + 600_000 }; // 10 daqiqa qolgan
    const twentyMinLater = NOW + 1_200_000;
    expect(sessionHasTime(s, twentyMinLater)).toBe(false);
    expect(sessionSecondsLeft(s, twentyMinLater)).toBe(0);
  });

  it('bo\'sh sessiyada false', () => {
    expect(sessionHasTime(null, NOW)).toBe(false);
    expect(sessionHasTime({}, NOW)).toBe(false);
  });
});

describe('sessionSecondsLeft — kartochkada ko\'rsatiladigan son', () => {
  it('deadline\'dan hozirgi vaqtga nisbatan hisoblanadi', () => {
    const s = { deadlineMs: NOW + 125_000 };
    expect(sessionSecondsLeft(s, NOW)).toBe(125);
  });

  it('kartochka ochiq turgan vaqt ham hisobga olinadi', () => {
    const s = { deadlineMs: NOW + 300_000 }; // 5 daqiqa
    expect(sessionSecondsLeft(s, NOW)).toBe(300);
    expect(sessionSecondsLeft(s, NOW + 60_000)).toBe(240); // 1 daqiqa o'tdi
  });

  it('hech qachon manfiy bo\'lmaydi', () => {
    expect(sessionSecondsLeft({ deadlineMs: NOW - 999_999 }, NOW)).toBe(0);
  });
});

describe('secondsUntil', () => {
  it('qolgan soniyani yaxlitlab qaytaradi', () => {
    expect(secondsUntil(NOW + 1499, NOW)).toBe(1);
    expect(secondsUntil(NOW + 1500, NOW)).toBe(2);
  });

  it('o\'tgan deadline va yaroqsiz qiymatda 0', () => {
    expect(secondsUntil(NOW - 5000, NOW)).toBe(0);
    expect(secondsUntil(null, NOW)).toBe(0);
    expect(secondsUntil(undefined, NOW)).toBe(0);
    expect(secondsUntil(NaN, NOW)).toBe(0);
  });
});

describe('formatExamTime', () => {
  it('bir soatdan kam — mm:ss', () => {
    expect(formatExamTime(0)).toBe('00:00');
    expect(formatExamTime(59)).toBe('00:59');
    expect(formatExamTime(600)).toBe('10:00');
    expect(formatExamTime(3599)).toBe('59:59');
  });

  it('bir soat va ko\'p — hh:mm:ss', () => {
    expect(formatExamTime(3600)).toBe('01:00:00');
    expect(formatExamTime(5400)).toBe('01:30:00');  // standart imtihon
    expect(formatExamTime(7200)).toBe('02:00:00');  // boshlangich/info/bio/kimyo
    expect(formatExamTime(6300)).toBe('01:45:00');  // til/rus/ingliz
  });

  it('manfiy va yaroqsiz qiymat 00:00 (imtihonda "-01:23" chiqmaydi)', () => {
    expect(formatExamTime(-5)).toBe('00:00');
    expect(formatExamTime(null)).toBe('00:00');
    expect(formatExamTime(undefined)).toBe('00:00');
    expect(formatExamTime(NaN)).toBe('00:00');
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  X-4 BANDI — muddati o'tgan sessiya YO'QOTILMAYDI, yakunlanadi.
//
//  Bu testlar aniq bir foydalanuvchi zararini qo'riqlaydi: 45 ta javob berilgan
//  imtihon telefon quvvati tugagani sababli izsiz yo'qolardi.
// ════════════════════════════════════════════════════════════════════════════

describe('shouldFinalizeExpired', () => {
  const bilanJavob = (n) => Object.fromEntries(
    Array.from({ length: n }, (_, i) => [i, 1])
  );

  it('vaqti QOLGAN sessiya yakunlanmaydi — u davom ettiriladi', () => {
    const s = { deadlineMs: NOW + 60_000, answers: bilanJavob(10), savedAt: NOW - 1000 };
    expect(shouldFinalizeExpired(s, NOW)).toBe(false);
  });

  it('muddati o\'tgan va javoblari bor — YAKUNLANADI (asosiy holat)', () => {
    // Telefon quvvati tugadi, 10 daqiqadan keyin ochildi.
    const s = {
      deadlineMs: NOW - 10 * 60_000,
      answers: bilanJavob(45),
      savedAt: NOW - 11 * 60_000,
    };
    expect(shouldFinalizeExpired(s, NOW)).toBe(true);
  });

  it('javob YO\'Q bo\'lsa yakunlanmaydi — saqlaydigan narsa yo\'q', () => {
    // Aks holda foydalanuvchi sababsiz 0 ballik natija ekranini ko'rardi.
    const s = { deadlineMs: NOW - 60_000, answers: {}, savedAt: NOW - 120_000 };
    expect(shouldFinalizeExpired(s, NOW)).toBe(false);
  });

  it('7 kundan eski sessiya yakunlanmaydi', () => {
    const s = {
      deadlineMs: NOW - 8 * 86_400_000,
      answers: bilanJavob(45),
      savedAt: NOW - 8 * 86_400_000,
    };
    expect(shouldFinalizeExpired(s, NOW)).toBe(false);
  });

  it('roppa-rosa 7 kunlik chegara — HALI yakunlanadi (inklyuziv)', () => {
    const s = {
      deadlineMs: NOW - STALE_SESSION_MS,
      answers: bilanJavob(3),
      savedAt: NOW - STALE_SESSION_MS,
    };
    expect(shouldFinalizeExpired(s, NOW)).toBe(true);
  });

  it('`savedAt` yo\'q eski yozuvda deadline zaxira sifatida ishlatiladi', () => {
    const s = { deadlineMs: NOW - 60_000, answers: bilanJavob(5) };
    expect(shouldFinalizeExpired(s, NOW)).toBe(true);
  });

  it('sessiya yo\'q / vaqt maydoni yo\'q — yakunlanmaydi', () => {
    expect(shouldFinalizeExpired(null, NOW)).toBe(false);
    expect(shouldFinalizeExpired({ answers: bilanJavob(5) }, NOW)).toBe(false);
  });

  it('eski `timeLeft` formatidagi tugagan sessiya ham yakunlanadi', () => {
    // Migratsiya: `timeLeft: 0` → deadline yo'q, lekin javoblar bor.
    // `deadlineFromSession` 0 uchun null qaytaradi, demak `savedAt` hal qiladi.
    const s = { timeLeft: 0, answers: bilanJavob(20), savedAt: NOW - 60_000 };
    expect(shouldFinalizeExpired(s, NOW)).toBe(true);
  });
});
