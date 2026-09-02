import { describe, it, expect } from 'vitest';
import { decideLeaderboardSource } from '../utils/leaderboardSnapshot';

// ════════════════════════════════════════════════════════════════════════
//  AUDIT 2026-09-02, K-2 — DAVR ALMASHISH OYNASI.
//
//  Hafta Toshkent vaqti bilan DUSHANBA 00:00 da almashadi, cron esa suratni
//  14:00 da yozadi. Oradagi 14 soatda surat sog'lom, lekin davri eski.
//  Ilgari shu oynada har foydalanuvchi jonli so'rovga (50 o'qish) tushardi —
//  ertalabki cho'qqida bu Spark rejasining 50 000 lik kunlik o'qish limitini
//  ~1000 foydalanuvchida tugatardi. Cron ham o'sha kvotaga bog'liq, ya'ni
//  ertasi kuni surat yozilmay halqa o'zini o'zi quvvatlardi.
//
//  Pastdagi testlar yangi xulqni qulflaydi: davr almashganda jonli so'rovga
//  TUSHILMAYDI. Kimdir keyinchalik «bo'sh taxta» ni jonli so'rov bilan
//  «tuzatmoqchi» bo'lsa, shu testlar yiqiladi.
// ════════════════════════════════════════════════════════════════════════

const MAX_AGE = 26 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 2, 9, 0, 0); // 2026-09-02 09:00 UTC

const rows = [{ id: 'a', name: 'A', score: 10 }];

/** Sog'lom surat: `updatedAt` yangi, uchala taxta ham bor. */
const snapshot = (over = {}) => ({
  updatedAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(), // 2 soat oldin
  weekId: '2026_W36',
  monthId: '2026_M09',
  boards: { all: rows, weekly: rows, monthly: rows },
  ...over,
});

const decide = (over = {}) => decideLeaderboardSource({
  data: snapshot(),
  boardType: 'weekly',
  weekId: '2026_W36',
  monthId: '2026_M09',
  now: NOW,
  maxAgeMs: MAX_AGE,
  ...over,
});

describe('surat ishlatiladigan holat (1 o‘qish)', () => {
  it('davri mos va yangi bo‘lsa — suratdan olinadi', () => {
    const d = decide();
    expect(d.source).toBe('snapshot');
    expect(d.rows).toEqual(rows);
    expect(d.updatedAt).toBe(snapshot().updatedAt);
  });

  it('umumiy taxta davrga BOG‘LIQ EMAS — eski weekId ham to‘sqinlik qilmaydi', () => {
    const d = decide({ boardType: 'all', data: snapshot({ weekId: '2026_W35' }) });
    expect(d.source).toBe('snapshot');
  });

  it('26 soatlik oynaning chekkasi hali yaroqli', () => {
    const data = snapshot({ updatedAt: new Date(NOW - MAX_AGE).toISOString() });
    expect(decide({ data }).source).toBe('snapshot');
  });
});

describe('K-2: davr almashgan — jonli so‘rovga TUSHILMAYDI', () => {
  it('haftalik taxta: surat o‘tgan haftaniki bo‘lsa periodPending', () => {
    const d = decide({ data: snapshot({ weekId: '2026_W35' }) });
    expect(d.source).toBe('periodPending');
    expect(d.rows).toBeNull();
  });

  it('oylik taxta: surat o‘tgan oyniki bo‘lsa periodPending', () => {
    const d = decide({
      boardType: 'monthly',
      data: snapshot({ monthId: '2026_M08' }),
    });
    expect(d.source).toBe('periodPending');
  });

  it('⚠️ ENG MUHIMI: davr almashganda «live» QAYTMAYDI', () => {
    // Aynan shu qator 50 ta o'qishni to'sadi. O'zgartirmang.
    const d = decide({ data: snapshot({ weekId: '2026_W35' }) });
    expect(d.source).not.toBe('live');
  });
});

describe('jonli so‘rov FAQAT surat ishonchsiz bo‘lganda', () => {
  it('surat umuman yo‘q', () => {
    expect(decide({ data: null }).source).toBe('live');
  });

  it('taxta massivi yo‘q (buzuq hujjat)', () => {
    expect(decide({ data: snapshot({ boards: {} }) }).source).toBe('live');
  });

  it('surat 26 soatdan eski — cron buzilgan, xavfsizlik to‘ri ishlaydi', () => {
    const data = snapshot({ updatedAt: new Date(NOW - MAX_AGE - 1000).toISOString() });
    expect(decide({ data }).source).toBe('live');
  });

  it('`updatedAt` yo‘q — yosh aniqlanmaydi, ishonmaymiz', () => {
    const data = snapshot();
    delete data.updatedAt;
    expect(decide({ data }).source).toBe('live');
  });

  it('`updatedAt` buzuq matn — Infinity yosh, jonli so‘rov', () => {
    expect(decide({ data: snapshot({ updatedAt: 'kecha' }) }).source).toBe('live');
  });
});

describe('chegara holatlari', () => {
  it('qurilma soati orqada: surat «kelajakdan» bo‘lsa ham yaroqli', () => {
    // Manfiy yosh — eskirgan deb hisoblamaymiz, aks holda soati noto'g'ri
    // qurilmalar hammasi 50 ta o'qishga tushardi.
    const data = snapshot({ updatedAt: new Date(NOW + 60 * 60 * 1000).toISOString() });
    expect(decide({ data }).source).toBe('snapshot');
  });

  it('bo‘sh taxta ham HAQIQIY javob — jonli so‘rovga tushirmaydi', () => {
    // Yangi hafta boshida cron ishlagan bo'lsa taxta bo'sh bo'lishi TABIIY:
    // hali hech kim ball yig'magan. Buni «surat yo'q» deb talqin qilsak,
    // dushanba 14:00 dan keyin ham 50 ta o'qish ketaverardi.
    const data = snapshot({ boards: { all: [], weekly: [], monthly: [] } });
    const d = decide({ data });
    expect(d.source).toBe('snapshot');
    expect(d.rows).toEqual([]);
  });
});
