import { describe, it, expect } from 'vitest';
import { SUBJECTS, TOPICS, isComingSoon } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Qolgan 6 ta yangi fan platforma integratsiyasi', () => {
  const NEW_SUBJECTS = [
    { id: 'musiqa', name: 'Musiqa madaniyati', group: 'school', topicRange: [223, 230], topicCount: 8 },
    { id: 'iqtisod', name: 'Iqtisodiy bilim asoslari', group: 'school', topicRange: [231, 238], topicCount: 8 },
    { id: 'maktab_logoped', name: 'Maktab logopediyasi', group: 'school', topicRange: [239, 245], topicCount: 7 },
    { id: 'defektologiya', name: 'Defektologiya', group: 'school', topicRange: [246, 253], topicCount: 8 },
    { id: 'mtt_musiqa', name: 'MTT Musiqa rahbari', group: 'mtt', topicRange: [254, 258], topicCount: 5 },
    { id: 'maktab_psixolog', name: 'Maktab psixologiyasi', group: 'school', topicRange: [259, 266], topicCount: 8 }
  ];

  it.each(NEW_SUBJECTS)('$name ($id) SUBJECTS ro\'yxatida to\'g\'ri parametrlar va comingSoon bayrog\'i bilan mavjud', ({ id, name, group }) => {
    const s = SUBJECTS.find(sub => sub.id === id);
    expect(s).toBeDefined();
    expect(s.name).toBe(name);
    expect(s.group).toBe(group);
    expect(s.comingSoon).toBe(true);
    expect(isComingSoon(id)).toBe(true);
    expect(s.desc).toBeTruthy();
    expect(s.icon).toBeDefined();
  });

  it.each(NEW_SUBJECTS)('$name ($id) uchun bo\'limlar soni va ID oralig\'i spetsifikatsiyaga 100% mos', ({ id, topicRange, topicCount }) => {
    const topics = TOPICS.filter(t => t.category === id);
    expect(topics.length).toBe(topicCount);
    const ids = topics.map(t => t.id);
    const [start, end] = topicRange;
    const expectedIds = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    expect(ids).toEqual(expectedIds);
  });

  it('butun platformada barcha TOPICS id\'lari mutlaqo yagona (dublikatlar 0)', () => {
    const allIds = TOPICS.map(t => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it.each(NEW_SUBJECTS)('$name ($id) barcha mavzularida batafsil nazariy ko\'rsatma (theoryHint) mavjud', ({ id }) => {
    const topics = TOPICS.filter(t => t.category === id);
    for (const t of topics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it.each(NEW_SUBJECTS)('$name ($id) blueprint taqsimoti jami 50 savolni qoplaydi', ({ id }) => {
    const topics = TOPICS.filter(t => t.category === id);
    const ids = topics.map(t => t.id);
    expect(hasBlueprint(ids)).toBe(true);
    const total = ids.reduce((sum, tid) => sum + EXAM_BLUEPRINT[tid], 0);
    expect(total).toBe(50);
    expect(total).toBe(examTotal(id));
  });

  it.each(NEW_SUBJECTS)('$name ($id) mutaxassislik bloki 35 ta, pedagogik bloki (kasb standarti 5 + ped mahorat 10) 15 ta savol beradi', ({ id }) => {
    const topics = TOPICS.filter(t => t.category === id);
    const ids = topics.map(t => t.id);
    const specIds = ids.filter(tid => !isPedBlockTopic(tid));
    const pedIds = ids.filter(isPedBlockTopic);

    const specTotal = specIds.reduce((sum, tid) => sum + EXAM_BLUEPRINT[tid], 0);
    const pedTotal = pedIds.reduce((sum, tid) => sum + EXAM_BLUEPRINT[tid], 0);

    expect(specTotal).toBe(35);
    expect(pedTotal).toBe(15);
    expect(pedIds.length).toBe(2);
    expect(EXAM_BLUEPRINT[pedIds[0]]).toBe(5);
    expect(EXAM_BLUEPRINT[pedIds[1]]).toBe(10);
  });

  it.each(NEW_SUBJECTS)('$name ($id) imtihon davomiyligi 90 daqiqa', ({ id }) => {
    expect(examDurationMin(id)).toBe(90);
  });

  it.each(NEW_SUBJECTS)('$name ($id) pedagogik yo\'nalishi o\'z guruhiga mos', ({ id, group }) => {
    expect(audienceOfSubject(id)).toBe(group);
  });

  it.each(NEW_SUBJECTS)('$name ($id) barcha tillarda (uz, ru, en) onboarding ma\'lumotlariga ega', ({ id }) => {
    expect(uz.onboarding.subjects[id]?.title).toBeTruthy();
    expect(uz.onboarding.subjects[id]?.desc).toBeTruthy();
    expect(ru.onboarding.subjects[id]?.title).toBeTruthy();
    expect(ru.onboarding.subjects[id]?.desc).toBeTruthy();
    expect(en.onboarding.subjects[id]?.title).toBeTruthy();
    expect(en.onboarding.subjects[id]?.desc).toBeTruthy();
  });
});
