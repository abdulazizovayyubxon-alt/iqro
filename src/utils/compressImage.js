/**
 * Rasmni yuklashdan oldin siqish — ADMIN UX AUDIT 2026-08-18, K-5 BAND.
 *
 * MUAMMO: metodist rasmni PDF'dan yoki telefon kamerasidan oladi va u
 * O'ZGARISHSIZ Storage'ga ketardi — 4 MB lik fayl savol ichida. Buni keyin
 * HAR BIR foydalanuvchi mobil internetda yuklab olardi.
 *
 * YECHIM: brauzerning o'zida canvas orqali kichraytirish va WebP ga o'tkazish.
 * Odatda 4 MB → ~120 KB, ko'z bilan farqi sezilmaydi.
 *
 * WebP ni qo'llab-quvvatlamaydigan brauzer (juda eski Safari) JPEG oladi:
 * `toBlob` null qaytarsa yoki tur mos kelmasa — asl fayl o'zgarishsiz ketadi,
 * ya'ni siqish YIQILSA HAM rasm yuklanadi.
 */

// 1200px — savol rasmi uchun yetarli: ilovada u eng katta holatda ~700px
// kenglikda ko'rsatiladi, retina ekran uchun ikki barobar zaxira qoladi.
const MAX_EDGE = 1200;
const QUALITY = 0.85;

export const compressImage = (file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) =>
  new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) { resolve(file); return; }
    // GIF — animatsiya bo'lishi mumkin, canvas uni birinchi kadrga aylantiradi.
    if (file.type === 'image/gif') { resolve(file); return; }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      // Allaqachon kichik va yengil bo'lsa — tegmaymiz.
      if (scale === 1 && file.size < 300 * 1024) { resolve(file); return; }

      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          // Siqilgani KATTAROQ chiqsa (kichik PNG'larda bo'ladi) — aslini olamiz.
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], 'q.webp', { type: 'image/webp' }));
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
