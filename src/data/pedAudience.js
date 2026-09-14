/**
 * pedAudience — «Pedagogik mahorat va kasb standarti» (`pedmahorat`) UMUMIY
 * fanining yo'nalishi: maktab o'qituvchisi ('school') yoki MTT pedagogi ('mtt').
 *
 * NEGA: attestatsiyada bu blok ikkala guruhda bir xil tuzilgan — 10 ta
 * pedagogik mahorat + 5 ta kasb standarti = 15 savol. Mazmuni esa farq qiladi:
 * maktabda o'qituvchi kasb standarti, didaktika, sinfni boshqarish; MTT'da
 * «Ilk qadam», 0–7 yosh, MTT pedagogi standarti. Fan bitta — bo'limlari
 * (mockData `audience` maydoni) va imtihon tuzilishi yo'nalishga qarab olinadi.
 *
 * Yo'nalish qayerdan (ustuvorlik bo'yicha):
 *   1) foydalanuvchining o'zi tanlagani (localStorage, hisob bo'yicha alohida);
 *   2) profildagi fan guruhi: MTT fani → 'mtt', maktab fani → 'school';
 *   3) 'school' — profil fani pedmahorat'ning o'zi yoki yo'q bo'lsa.
 *
 * React'dan tashqarida (DiagnosticsEngine, tracks.js) `getPedAudience()`,
 * komponentlarda `usePedAudience()` — tanlov o'zgarsa qayta chiziladi.
 */
import { useSyncExternalStore } from 'react';
import { SUBJECTS, TOPICS } from './mockData';

export const PED_CATEGORY = 'pedmahorat';
export const PED_AUDIENCES = ['school', 'mtt'];

let uid = null;
let profileSubject = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const storageKey = () => `zehin_ped_audience_${uid || 'anon'}`;

const readStored = () => {
  try {
    const v = localStorage.getItem(storageKey());
    return PED_AUDIENCES.includes(v) ? v : null;
  } catch {
    return null; // private rejim yoki thumbnail — profil/standartga tushadi
  }
};

/** Fan guruhidan yo'nalish: MTT fani → 'mtt', maktab fani → 'school', aks holda null. */
export const audienceOfSubject = (subjectId) => {
  const s = SUBJECTS.find((x) => x.id === subjectId);
  if (!s || s.id === PED_CATEGORY) return null;
  return s.group === 'mtt' ? 'mtt' : s.group === 'school' ? 'school' : null;
};

export const getPedAudience = () => readStored() || audienceOfSubject(profileSubject) || 'school';

/** Foydalanuvchi yo'nalishni o'zi tanlaganmi (aks holda profil yoki standart). */
export const isPedAudienceChosen = () => readStored() !== null;

export function setPedAudience(audience) {
  if (!PED_AUDIENCES.includes(audience)) return;
  try { localStorage.setItem(storageKey(), audience); } catch { /* saqlanmaydi, lekin joriy seans ishlaydi */ }
  emit();
}

/** Joriy hisob va uning profil fani — AppContext foydalanuvchi yuklanganda beradi. */
export function setPedUser(nextUid, subjectId) {
  const nextSubject = subjectId && subjectId !== 'multi' ? subjectId : null;
  if (uid === (nextUid || null) && profileSubject === nextSubject) return;
  uid = nextUid || null;
  profileSubject = nextSubject;
  emit();
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const usePedAudience = () => useSyncExternalStore(subscribe, getPedAudience, getPedAudience);

const inCategory = (topic, cat) =>
  Array.isArray(topic.category) ? topic.category.includes(cat) : topic.category === cat;

/**
 * Fanning foydalanuvchiga KO'RINADIGAN bo'limlari: pedmahorat'da faqat joriy
 * yo'nalishniki, boshqa fanlarda hammasi. Statistika tarixi yoki admin kabi
 * BARCHA bo'limlar kerak joyda `TOPICS` ni to'g'ridan-to'g'ri ishlating.
 */
export const topicsOfCategory = (cat, audience = getPedAudience()) =>
  TOPICS.filter((t) => inCategory(t, cat) && (cat !== PED_CATEGORY || !t.audience || t.audience === audience));
