import { describe, it, expect } from 'vitest';
import { SUBJECTS, TOPICS, isComingSoon, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Qolgan 5 ta yangi fan platforma integratsiyasi', () => {
  const NEW_SUBJECTS = [
    { id: 'iqtisod', name: 'Iqtisodiy bilim asoslari', group: 'school', topicRange: [231, 238], topicCount: 8 },
    { id: 'maktab_logoped', name: 'Maktab logopediyasi', group: 'school', topicRange: [239, 245], topicCount: 7 },
    { id: 'defektologiya', name: 'Defektologiya', group: 'school', topicRange: [246, 253], topicCount: 8 },
    { id: 'mtt_musiqa', name: 'MTT Musiqa rahbari', group: 'mtt', topicRange: [254, 258], topicCount: 5 },
    { id: 'maktab_psixolog', name: 'Maktab psixologi', group: 'school', topicRange: [259, 266], topicCount: 8 }
  ];

  it.each(NEW_SUBJECTS)('$name ($id) SUBJECTS ro\'yxatida to\'g\'ri parametrlar va testMode bayrog\'i bilan mavjud', ({ id, name, group }) => {
    const s = SUBJECTS.find(sub => sub.id === id);
    expect(s).toBeDefined();
    expect(s.name).toBe(name);
    expect(s.group).toBe(group);
    expect(s.testMode).toBe(true);
    expect(isTestModeSubject(id)).toBe(true);
    expect(isComingSoon(id)).toBe(false);
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

  it('bog\'cha musiqa rahbari va bog\'cha logopedi faqat MTT guruhida turadi, maktabga kirmaydi', () => {
    const mttIds = ['mtt', 'mtt_rahbar', 'mtt_logoped', 'mtt_psixolog', 'mtt_jismoniy', 'mtt_musiqa'];
    const mttMusiqa = SUBJECTS.find(s => s.id === 'mtt_musiqa');
    const mttLogoped = SUBJECTS.find(s => s.id === 'mtt_logoped');
    expect(mttMusiqa).toBeDefined();
    expect(mttMusiqa.group).toBe('mtt');
    expect(mttLogoped).toBeDefined();
    expect(mttLogoped.group).toBe('mtt');

    // Maktab fanlarida MTT yo'nalishi bo'lmasligi kerak
    const schoolSubjects = SUBJECTS.filter(s => s.group === 'school');
    expect(schoolSubjects.some(s => s.id === 'mtt_logoped')).toBe(false);
    expect(schoolSubjects.some(s => s.id.startsWith('mtt'))).toBe(false);

    // MTT guruhida barcha 6 ta MTT fani mavjud
    const mttSubjects = SUBJECTS.filter(s => s.group === 'mtt');
    expect(mttSubjects.map(s => s.id).sort()).toEqual(mttIds.sort());

    // Maktab logopediyasi esa maktab guruhida mavjud
    const maktabLogoped = SUBJECTS.find(s => s.id === 'maktab_logoped');
    expect(maktabLogoped).toBeDefined();
    expect(maktabLogoped.group).toBe('school');
  });
});
