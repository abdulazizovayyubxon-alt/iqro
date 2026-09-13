/**
 * «Tez orada» fanlar uchun muddat matni. ComingSoonNotice kartasi ham,
 * onboarding'dagi fan ro'yxati ham AYNI satrni ko'rsatishi uchun yagona joy.
 */
import { COMING_SOON_UNTIL } from '../data/mockData';

const DAY_MS = 24 * 60 * 60 * 1000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * «10 kun ichida (23-sentabrgacha)»; muddat kuni kelgan yoki o'tib ketgan
 * bo'lsa «tez kunlarda» — eskirgan va'da ko'rsatilmaydi.
 * Kunlar Toshkent kalendari bo'yicha sanaladi, qurilma soat mintaqasiga bog'liq emas.
 *
 * @param {Function} t      i18next `t`
 * @param {number}   now    hozirgi vaqt, ms (testlar uchun)
 * @param {string}   until  'YYYY-MM-DD'
 */
export function comingSoonWhen(t, now = Date.now(), until = COMING_SOON_UNTIL) {
  const [y, m, d] = until.split('-').map(Number);
  const local = new Date(now + TASHKENT_OFFSET_MS);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const days = Math.round((Date.UTC(y, m - 1, d) - today) / DAY_MS);
  if (days <= 0) return t('comingSoon.soon');
  const months = t('comingSoon.months', { returnObjects: true });
  const month = Array.isArray(months) ? months[m - 1] : '';
  return t('comingSoon.within', { days, date: t('comingSoon.date', { day: d, month }) });
}
