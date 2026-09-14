import { describe, it, expect } from 'vitest';
import { SUBJECTS, TOPICS, SUBJECT_COUNT, isComingSoon, COMING_SOON_SUGGESTED_SUBJECT } from '../data/mockData';
import { topicsOfCategory, audienceOfSubject, PED_AUDIENCES } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import { comingSoonWhen } from '../utils/comingSoon';
import uz from '../i18n/locales/uz.json';

// fan 4 (2026-09-13): uchtasi savollari bilan, uchtasi «tez orada»
const FAN4 = ['matematika', 'tarbiya', 'pedmahorat', 'fizika', 'texnologiya_dizayn', 'texnologiya_servis'];
const COMING_SOON = [];

const topicsOf = (cat) => TOPICS.filter(t => t.category === cat);

describe('fan 4 — fanlar, bo\'limlar va rasmiy taqsimot', () => {
  it('bo\'lim id\'lari takrorlanmaydi va har bo\'lim ro\'yxatdagi fanga tegishli', () => {
    const ids = TOPICS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const subjectIds = new Set(SUBJECTS.map(s => s.id));
    for (const t of TOPICS) expect(subjectIds.has(t.category)).toBe(true);
  });

  // pedmahorat umumiy fan: taqsimot har yo'nalish (maktab / MTT) bo'yicha alohida tekshiriladi
  const cases = FAN4.flatMap(cat => (cat === 'pedmahorat'
    ? PED_AUDIENCES.map(aud => [`${cat}/${aud}`, topicsOfCategory(cat, aud)])
    : [[cat, topicsOf(cat)]]));

  it.each(cases)('%s: taqsimot hamma bo\'limni qoplaydi va imtihon hajmiga teng', (label, topics) => {
    const cat = label.split('/')[0];
    const ids = topics.map(t => t.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(hasBlueprint(ids)).toBe(true);
    expect(ids.reduce((s, id) => s + EXAM_BLUEPRINT[id], 0)).toBe(examTotal(cat));
    // Oxirgi blok — kasb standarti + pedagogik mahorat — hamma joyda 15 ta
    expect(ids.filter(isPedBlockTopic).reduce((s, id) => s + EXAM_BLUEPRINT[id], 0)).toBe(15);
  });

  it('pedmahorat — ikki yo\'nalish bo\'limlari kesishmaydi va birgalikda fanni to\'liq qoplaydi', () => {
    const school = topicsOfCategory('pedmahorat', 'school').map(t => t.id);
    const mtt = topicsOfCategory('pedmahorat', 'mtt').map(t => t.id);
    expect(school).toEqual([204, 205, 206, 207]);
    expect(mtt).toEqual([167, 168, 169, 170, 171, 172, 173, 174, 175, 176]);
    expect(topicsOf('pedmahorat').length).toBe(school.length + mtt.length);
    // boshqa fanlarda yo'nalish filtri hech narsani o'zgartirmaydi
    expect(topicsOfCategory('matematika', 'mtt').length).toBe(topicsOf('matematika').length);
  });

  it('yo\'nalish standarti profil fani guruhidan olinadi', () => {
    expect(audienceOfSubject('mtt')).toBe('mtt');
    expect(audienceOfSubject('mtt_logoped')).toBe('mtt');
    expect(audienceOfSubject('fizika')).toBe('school');
    expect(audienceOfSubject('pedmahorat')).toBe(null);
    expect(audienceOfSubject(undefined)).toBe(null);
  });

  it('pedmahorat — 15 savol / 30 daqiqa, qolganlari spetsifikatsiyadagi hajm', () => {
    expect(examTotal('pedmahorat')).toBe(15);
    expect(examDurationMin('pedmahorat')).toBe(30);
    expect(examTotal('matematika')).toBe(50);
    expect(examDurationMin('matematika')).toBe(120);
    expect(examDurationMin('fizika')).toBe(120);
    expect(examDurationMin('tarbiya')).toBe(90);
  });

  it('«tez orada» fanlar fan soniga kirmaydi; taklif qilinadigan fanda savol bor', () => {
    expect(COMING_SOON.every(isComingSoon)).toBe(true);
    expect(isComingSoon('matematika')).toBe(false);
    expect(isComingSoon(COMING_SOON_SUGGESTED_SUBJECT)).toBe(false);
    expect(SUBJECT_COUNT).toBe(SUBJECTS.length - COMING_SOON.length);
  });

  it('har fanning onboarding matni bor', () => {
    for (const s of SUBJECTS) expect(uz.onboarding.subjects[s.id]?.title).toBeTruthy();
  });
});

// i18next `t` ning kichik o'rinbosari: kalit yo'li + {{param}} almashtirish
const makeT = (dict) => (key, opts = {}) => {
  const val = key.split('.').reduce((o, k) => o?.[k], dict);
  if (opts.returnObjects) return val;
  return String(val).replace(/\{\{(\w+)\}\}/g, (_, k) => opts[k]);
};
const t = makeT(uz);

describe('comingSoonWhen', () => {
  it('muddatdan 10 kun oldin — kun va sana bilan', () => {
    // 2026-09-13 18:30 Toshkent = 13:30 UTC
    expect(comingSoonWhen(t, Date.UTC(2026, 8, 13, 13, 30), '2026-09-23')).toBe('10 kun ichida (23‑sentabrgacha)');
  });

  it('kun Toshkent yarim tunida almashadi (UTC hali oldingi kunda bo\'lsa ham)', () => {
    // 2026-09-14 00:30 Toshkent = 2026-09-13 19:30 UTC
    expect(comingSoonWhen(t, Date.UTC(2026, 8, 13, 19, 30), '2026-09-23')).toBe('9 kun ichida (23‑sentabrgacha)');
  });

  it('muddat kuni va undan keyin eskirgan sana ko\'rsatilmaydi', () => {
    expect(comingSoonWhen(t, Date.UTC(2026, 8, 23, 6, 0), '2026-09-23')).toBe('tez kunlarda');
    expect(comingSoonWhen(t, Date.UTC(2026, 9, 1, 6, 0), '2026-09-23')).toBe('tez kunlarda');
  });
});
