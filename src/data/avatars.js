/**
 * avatars.js — Tayyor avatarlar reyestri (DINAMIK)
 *
 * src/assets/avatars/ ichidagi BARCHA .webp fayllar Vite tomonidan avtomatik
 * aniqlanadi. Boshqaruv soniyalar ichida:
 *   • QO'SHISH    — shu papkaga yangi .webp fayl tashlang
 *   • O'CHIRISH   — faylni o'chiring
 *   • TARTIB      — fayl nomi bo'yicha (teacher-01, teacher-02, ...)
 * Kodga tegish shart emas. (Yangi to'plamni scratch/avatars_crop.cjs qayta yaratadi.)
 */

const modules = import.meta.glob('../assets/avatars/*.webp', { eager: true, import: 'default' });

// [{ id: 'teacher-01', url: '/assets/teacher-01-<hash>.webp' }, ...] — nom bo'yicha tartiblangan
export const AVATARS = Object.entries(modules)
  .map(([path, url]) => ({ id: path.split('/').pop().replace(/\.webp$/, ''), url }))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

const BY_ID = Object.fromEntries(AVATARS.map(a => [a.id, a.url]));

/** avatarId -> URL (topilmasa null) */
export const avatarUrl = (id) => (id ? BY_ID[id] || null : null);

/**
 * Foydalanuvchi ma'lumotidan ko'rsatiladigan avatar URL'i.
 * Ustuvorlik: tanlangan tayyor avatar > eski yuklangan/Google rasmi > null (harf).
 */
export const resolveAvatar = (u) => avatarUrl(u?.avatarId) || u?.photoURL || null;
