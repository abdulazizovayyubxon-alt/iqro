/**
 * questionRequests — "Ko'proq savol kerak" so'rovi (tirik halqa).
 *
 * Foydalanuvchi savoli bo'lmagan/kam bo'lgan bo'limda "savol kerak" deb so'rov
 * yuboradi → Firestore `questionRequests` kolleksiyasi. Admin "So'rovlar" tabida
 * eng ko'p so'ralgan mavzularni ko'rib, savol qo'shgach foydalanuvchiga
 * bildirishnoma yuboradi.
 *
 * Spam oldini olish: bir foydalanuvchi bir mavzu uchun bir marta so'raydi
 * (localStorage'da belgilanadi — objections'dagi sentObjectionIds naqshi kabi).
 */
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AnalyticsEvents } from './analytics';

const sentKey = (uid) => `questionReq_${uid}`;
const reqKey = (category, topicId) => `${category}:${topicId ?? -1}`;

// Foydalanuvchi avval so'rov yuborgan (category, topicId) kalitlari ro'yxati
export function getSentRequests(uid) {
  if (!uid) return [];
  try {
    return JSON.parse(localStorage.getItem(sentKey(uid)) || '[]');
  } catch {
    return [];
  }
}

// Shu foydalanuvchi shu mavzu uchun allaqachon so'rov yuborganmi?
export function hasRequested(uid, category, topicId) {
  if (!uid) return false;
  return getSentRequests(uid).includes(reqKey(category, topicId));
}

/**
 * So'rov yuborish. Natija: { ok, reason? }.
 *   reason: 'auth' | 'duplicate' | 'error'
 */
export async function submitQuestionRequest(user, { category, categoryName, topicId, topicName }) {
  if (!user) return { ok: false, reason: 'auth' };

  const key = reqKey(category, topicId);
  const sent = getSentRequests(user.uid);
  if (sent.includes(key)) return { ok: false, reason: 'duplicate' };

  try {
    await addDoc(collection(db, 'questionRequests'), {
      uid: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || '',
      category: category || '',
      categoryName: categoryName || category || '',
      topicId: topicId ?? -1,
      topicName: topicName || 'Aralash',
      fulfilled: false,
      date: new Date().toLocaleString(),
      timestamp: new Date(),
    });

    localStorage.setItem(sentKey(user.uid), JSON.stringify([...sent, key]));
    AnalyticsEvents.questionRequest(topicName || categoryName || category || '');
    return { ok: true };
  } catch (e) {
    console.error('questionRequest write error:', e);
    return { ok: false, reason: 'error' };
  }
}
