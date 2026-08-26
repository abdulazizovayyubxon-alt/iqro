import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// vitest node muhitida ishlaydi (jsdom yo'q) — saqlashni o'zimiz taqlid qilamiz.
// Bu ayni paytda xizmatning "saqlash bloklangan" tarmog'ini ham sinaydi.
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    _map: map,
  };
}

let localStore;
let sessionStore;

beforeEach(async () => {
  localStore = makeStorage();
  sessionStore = makeStorage();
  globalThis.localStorage = localStore;
  globalThis.window = { sessionStorage: sessionStore };
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.localStorage;
  delete globalThis.window;
});

const load = () => import('../services/interrupts.js');

describe('interrupts — jimlik', () => {
  it('yangi holat jim emas', async () => {
    const { isSnoozed } = await load();
    expect(isSnoozed('update')).toBe(false);
  });

  it('jimlik muddat ichida ushlab turadi', async () => {
    const { snooze, isSnoozed, HOUR } = await load();
    snooze('update', 6 * HOUR);
    expect(isSnoozed('update')).toBe(true);
  });

  it('muddat tugagach jimlik yopiladi', async () => {
    vi.useFakeTimers();
    const { snooze, isSnoozed, HOUR } = await load();
    snooze('update', 6 * HOUR);
    vi.advanceTimersByTime(6 * HOUR + 1000);
    expect(isSnoozed('update')).toBe(false);
  });

  it('jimlik holatlar orasida aralashmaydi', async () => {
    const { snooze, isSnoozed, DAY } = await load();
    snooze('subscription', DAY);
    expect(isSnoozed('subscription')).toBe(true);
    expect(isSnoozed('push')).toBe(false);
  });

  it('clearSnooze jimlikni bekor qiladi', async () => {
    const { snooze, clearSnooze, isSnoozed, DAY } = await load();
    snooze('push', 3 * DAY);
    clearSnooze('push');
    expect(isSnoozed('push')).toBe(false);
  });

  it('buzuq qiymat jim emas deb qaraladi', async () => {
    localStore.setItem('zehin_intr_push_until', 'axlat');
    const { isSnoozed } = await load();
    expect(isSnoozed('push')).toBe(false);
  });
});

describe('interrupts — so\'rov soni', () => {
  it('noldan boshlanadi va ortadi', async () => {
    const { askCount, bumpAsk } = await load();
    expect(askCount('push')).toBe(0);
    bumpAsk('push');
    bumpAsk('push');
    expect(askCount('push')).toBe(2);
  });

  it('har holat o\'z sanoqchisiga ega', async () => {
    const { askCount, bumpAsk } = await load();
    bumpAsk('push');
    expect(askCount('install')).toBe(0);
  });
});

describe('interrupts — sessiya chegarasi', () => {
  it('boshida bo\'sh', async () => {
    const { shownThisSession } = await load();
    expect(shownThisSession()).toBe(false);
  });

  it('belgilangach true qaytaradi', async () => {
    const { shownThisSession, markShownThisSession } = await load();
    markShownThisSession();
    expect(shownThisSession()).toBe(true);
  });

  it('sessionStorage ishlatiladi — localStorage emas', async () => {
    // localStorage'da qolsa chegara kunlab saqlanib, oyna boshqa chiqmasdi
    const { markShownThisSession } = await load();
    markShownThisSession();
    expect(sessionStore._map.size).toBe(1);
    expect(localStore._map.size).toBe(0);
  });
});

describe('interrupts — saqlash bloklangan holat', () => {
  it('localStorage otilsa ham qulamaydi', async () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('bloklangan'); },
      setItem: () => { throw new Error('bloklangan'); },
      removeItem: () => { throw new Error('bloklangan'); },
    };
    const { isSnoozed, snooze, askCount, bumpAsk } = await load();
    expect(() => snooze('push', 1000)).not.toThrow();
    expect(isSnoozed('push')).toBe(false);
    expect(() => bumpAsk('push')).not.toThrow();
    expect(askCount('push')).toBe(0);
  });
});

describe('interrupts — msUntilTomorrow', () => {
  it('bugun ichida qoladi va kamida bir soat', async () => {
    const { msUntilTomorrow, HOUR, DAY } = await load();
    const ms = msUntilTomorrow();
    expect(ms).toBeGreaterThanOrEqual(HOUR);
    expect(ms).toBeLessThanOrEqual(DAY);
  });

  it('yarim tunga yaqin ham kamida bir soat beradi', async () => {
    vi.useFakeTimers();
    const almostMidnight = new Date();
    almostMidnight.setHours(23, 59, 0, 0);
    vi.setSystemTime(almostMidnight);
    const { msUntilTomorrow, HOUR } = await load();
    // Aks holda oyna yarim tundan keyin darrov qaytib chiqardi
    expect(msUntilTomorrow()).toBeGreaterThanOrEqual(HOUR);
  });
});

describe('interrupts — tg_channel taklifi', () => {
  it('tg_channel jimlik va so\'rov sanog\'i to\'g\'ri ishlaydi', async () => {
    const { isSnoozed, snooze, askCount, bumpAsk, DAY } = await load();
    expect(askCount('tg_channel')).toBe(0);
    expect(isSnoozed('tg_channel')).toBe(false);

    bumpAsk('tg_channel');
    expect(askCount('tg_channel')).toBe(1);

    snooze('tg_channel', 7 * DAY);
    expect(isSnoozed('tg_channel')).toBe(true);
  });
});

