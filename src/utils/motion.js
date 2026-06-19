/**
 * motion.js — harakat (animatsiya) yordamchilari.
 * Foydalanuvchi tizimda "Reduce Motion" yoqqan bo'lsa, og'ir/bezakli
 * effektlarni (masalan confetti) o'tkazib yuboramiz.
 */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
