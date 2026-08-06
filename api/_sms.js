/**
 * ════════════════════════════════════════════════════════════
 *  api/_sms.js — SMS yuborish qatlami (provayderdan mustaqil)
 * ════════════════════════════════════════════════════════════
 *
 *  DIQQAT: fayl nomi `_` bilan boshlanadi — Vercel bunday fayllarni
 *  serverless funksiya DEB HISOBLAMAYDI (Hobby rejasidagi 12 funksiya
 *  chegarasiga kirmaydi). `api/_shared.js` bilan bir xil naqsh.
 *
 *  NIMA UCHUN SMS KERAK
 *  ────────────────────
 *  Play build'da sotuv UI'si yo'q (anti-steering: narx, to'lov tugmasi va
 *  havola yashirilgan — qarang `src/components/PremiumModal.jsx`). Demak
 *  foydalanuvchi Pro'ni QAYERDAN olishini ILOVADAN TASHQARIDA bilishi kerak.
 *  SMS aynan shu kanal: Google Play qoidalari ilova ICHIDAGI oqimga tegishli,
 *  o'z foydalanuvchingiz bilan ilovadan tashqarida aloqa qilish cheklanmagan.
 *  Shuning uchun bu yerdagi matnlarda Telegram havolasi bo'lishi MUMKIN —
 *  ilova ichida esa mumkin emas.
 *
 *  IKKI QULF (deny by default)
 *  ───────────────────────────
 *   1. `SMS_ENABLED` aynan `'1'` bo'lmasa — hech narsa yuborilmaydi.
 *   2. Provayder kaliti sozlanmagan bo'lsa — `log` provayderiga tushadi
 *      (konsolga yozadi, pul sarflamaydi).
 *  Ya'ni env'ni tasodifan yarim sozlab qo'yish real SMS toshqiniga olib
 *  kelmaydi.
 *
 *  ENV
 *  ───
 *   SMS_ENABLED        '1' bo'lsa haqiqiy yuborish yoqiladi
 *   SMS_PROVIDER       'eskiz' | 'playmobile' | 'log'   (default: 'log')
 *   SMS_CONTACT        matnlardagi aloqa manzili (default 't.me/zehinuz')
 *   ESKIZ_EMAIL        Eskiz kabinet emaili
 *   ESKIZ_PASSWORD     Eskiz kabinet paroli
 *   ESKIZ_FROM         nick/alfa-nom (default '4546' — Eskiz sinov nomeri)
 *   PLAYMOBILE_LOGIN / PLAYMOBILE_PASSWORD / PLAYMOBILE_ORIGINATOR
 *
 *  ⚠️ ESKIZ SHABLON QOIDASI — ENG KO'P UCHRAYDIGAN TUZOQ
 *  Eskiz ixtiyoriy matnni yubormaydi: har bir matn OLDINDAN kabinetda
 *  shablon sifatida tasdiqlanishi kerak, aks holda so'rov `status: 'waiting'`
 *  da qotib qoladi yoki rad etiladi. Quyidagi TEXT'lardagi uchala matnni
 *  o'zgartirsangiz, Eskiz kabinetida ham yangilang.
 * ════════════════════════════════════════════════════════════
 */

const ESKIZ_BASE = 'https://notify.eskiz.uz/api';
const PLAYMOBILE_URL = 'https://send.smsxabar.uz/broker-api/send';

const CONTACT = process.env.SMS_CONTACT || 't.me/zehinuz';

// ── Matnlar ──────────────────────────────────────────────────────────────
//
// Uchala matn ham ASCII: GSM-7 kodlashda 160 belgi bitta SMS, UCS-2 da esa
// atigi 70. O'zbek tipografiyasidagi `ʻ` (U+02BB) GSM-7 da YO'Q — bitta shu
// belgi butun xabarni UCS-2 ga o'tkazib, narxni ikki barobar oshiradi.
// Shuning uchun matnlar ataylab apostrofsiz yozilgan va `asciiFold()` dan
// o'tkaziladi.
export const TEXT = {
  // Ro'yxatdan o'tgandan 1 kun keyin — kanalni tanishtirish
  welcome: () =>
    `Zehin: xush kelibsiz. Tayyorgarlik rejangiz ochiq. Pro obuna va promokod uchun: ${CONTACT}`,
  // Sinov muddati ertaga tugaydi
  trialEnd: () =>
    `Zehin: sinov muddatingiz ertaga tugaydi. Pro obuna uchun yozing: ${CONTACT}`,
  // Pro obuna endigina tugadi (win-back)
  expired: () =>
    `Zehin: Pro obunangiz tugadi. Uzaytirish uchun yozing: ${CONTACT}`,
};

// ── Telefon raqamini normallashtirish ────────────────────────────────────
/**
 * `users/{uid}.phone` ro'yxatdan o'tishda 12 xonali `998XXXXXXXXX` ko'rinishida
 * yoziladi (AuthContext.jsx `signInWithPhone`), lekin eski hujjatlarda `+`,
 * probel yoki qavs uchrashi mumkin. Provayderlar toza raqam kutadi.
 *
 * @returns {string|null} `998XXXXXXXXX` yoki null (yaroqsiz)
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  // `8` yoki `+998` variantlari: 9 xonali lokal raqamga prefiks qo'shamiz
  if (d.length === 9) d = `998${d}`;
  if (d.length !== 12) return null;
  if (!d.startsWith('998')) return null;
  // O'zbekistonda operator kodi 9 dan boshlanadigan 2 xonali blok (90..99, 33, 88, 77, 20)
  return d;
}

// ── GSM-7 xavfsizligi ────────────────────────────────────────────────────
const FOLD = {
  'ʻ': "'", 'ʼ': "'", '‘': "'", '’': "'", '`': "'", '´': "'",
  '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', ' ': ' ',
};

// Naqsh FOLD kalitlaridan QURILADI, qo'lda yozilmaydi. Ikki foydasi bor:
// jadvalga yangi belgi qo'shilganda regexni yangilash esdan chiqmaydi, va
// uzilmas probel (U+00A0) kabi ko'rinmas belgilar regex LITERALIGA tushmaydi
// (eslint `no-irregular-whitespace` aynan shuni taqiqlaydi — chunki bunday
// belgi muharrirda oddiy probeldan farq qilmaydi va jimgina buzadi).
const FOLD_RE = new RegExp(`[${Object.keys(FOLD).join('')}]`, 'g');

/** Tipografik belgilarni ASCII ga tushirish — UCS-2 ga o'tib ketmaslik uchun */
export function asciiFold(text) {
  return String(text)
    .replace(FOLD_RE, (c) => FOLD[c] ?? c)
    // Qolgan GSM-7 ga kirmaydigan har qanday belgi (kirill, emoji, ...) —
    // ularni O'CHIRMAYMIZ, chunki matn ma'nosi buzilishi mumkin. Faqat
    // segments() ularni hisobga oladi va narx oshgani ko'rinadi.
    .trim();
}

/** Xabar necha SMS bo'lib ketishini hisoblash (xarajatni ko'rish uchun) */
export function segments(text) {
  const s = asciiFold(text);
  // eslint-disable-next-line no-control-regex
  const isGsm7 = /^[\x00-\x7F]*$/.test(s);
  const single = isGsm7 ? 160 : 70;
  const multi = isGsm7 ? 153 : 67;
  if (s.length <= single) return 1;
  return Math.ceil(s.length / multi);
}

// ── Provayder tanlash ────────────────────────────────────────────────────
/**
 * Haqiqiy yuborish yoqilganmi. `SMS_ENABLED !== '1'` bo'lsa butun qatlam
 * `log` rejimida ishlaydi: oqim to'liq bajariladi, Firestore bayroqlari ham
 * qo'yiladi, faqat provayderga so'rov ketmaydi.
 */
export function isSmsEnabled() {
  return process.env.SMS_ENABLED === '1';
}

export function activeProvider() {
  if (!isSmsEnabled()) return 'log';
  const p = (process.env.SMS_PROVIDER || 'log').toLowerCase();
  if (p === 'eskiz') {
    return process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD ? 'eskiz' : 'log';
  }
  if (p === 'playmobile') {
    return process.env.PLAYMOBILE_LOGIN && process.env.PLAYMOBILE_PASSWORD ? 'playmobile' : 'log';
  }
  return 'log';
}

// ── Eskiz ────────────────────────────────────────────────────────────────
// Token ~30 kun amal qiladi. Lambda "issiq" turganda qayta login qilmaslik
// uchun modul doirasida keshlanadi; sovuq startda bir marta olinadi.
let eskizToken = null;
let eskizTokenAt = 0;
const TOKEN_TTL_MS = 20 * 24 * 3600 * 1000; // 20 kun — 30 kunlik muddatdan xavfsiz zaxira

async function eskizLogin(force = false) {
  if (!force && eskizToken && Date.now() - eskizTokenAt < TOKEN_TTL_MS) return eskizToken;
  const r = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ESKIZ_EMAIL,
      password: process.env.ESKIZ_PASSWORD,
    }),
  });
  if (!r.ok) throw new Error(`eskiz login ${r.status}`);
  const j = await r.json();
  const token = j?.data?.token;
  if (!token) throw new Error('eskiz login: token yo\'q');
  eskizToken = token;
  eskizTokenAt = Date.now();
  return token;
}

async function eskizSend(phone, text) {
  // 401 bo'lsa token eskirgan — bir marta qayta login qilib takrorlaymiz.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await eskizLogin(attempt > 0);
    const r = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: phone,
        message: text,
        from: process.env.ESKIZ_FROM || '4546',
      }),
    });
    if (r.status === 401 && attempt === 0) continue;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `eskiz ${r.status}: ${j?.message || ''}`.trim() };
    return { ok: true, id: j?.id ? String(j.id) : null };
  }
  return { ok: false, error: 'eskiz: auth' };
}

// ── Play Mobile ──────────────────────────────────────────────────────────
async function playmobileSend(phone, text) {
  const auth = Buffer.from(
    `${process.env.PLAYMOBILE_LOGIN}:${process.env.PLAYMOBILE_PASSWORD}`
  ).toString('base64');
  const messageId = `zehin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const r = await fetch(PLAYMOBILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      messages: [{
        recipient: phone,
        'message-id': messageId,
        sms: {
          originator: process.env.PLAYMOBILE_ORIGINATOR || '3700',
          content: { text },
        },
      }],
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    return { ok: false, error: `playmobile ${r.status}: ${body.slice(0, 120)}` };
  }
  return { ok: true, id: messageId };
}

// ── Umumiy yuborish ──────────────────────────────────────────────────────
/**
 * Bitta SMS yuborish. HECH QACHON tashlamaydi — natijani obyekt qilib
 * qaytaradi, chunki chaqiruvchi cron bitta xato tufayli to'xtamasligi kerak.
 *
 * @returns {Promise<{ok:boolean, id?:string|null, error?:string, provider:string}>}
 */
export async function sendSms(rawPhone, rawText) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: 'bad_phone', provider: 'none' };

  const text = asciiFold(rawText);
  if (!text) return { ok: false, error: 'empty_text', provider: 'none' };

  const provider = activeProvider();
  try {
    if (provider === 'eskiz') return { ...(await eskizSend(phone, text)), provider };
    if (provider === 'playmobile') return { ...(await playmobileSend(phone, text)), provider };
    // `log` — quruq rejim. Yuborilmaydi, lekin oqim to'liq sinaladi.
    console.log(`[sms:log] ${phone} (${segments(text)} sms) ${text}`);
    return { ok: true, id: null, provider: 'log' };
  } catch (e) {
    return { ok: false, error: `${provider}: ${e.message}`, provider };
  }
}

/**
 * Navbatni cheklangan parallellik bilan yuborish.
 *
 * Nima uchun parallellik kerak: Vercel funksiyasining vaqti cheklangan
 * (Hobby'da default 10s). Ketma-ket 200 ta HTTP so'rov timeout'ga tushardi.
 * Nima uchun CHEKLANGAN: provayder tomonidan rate-limit yeb qolmaslik uchun.
 *
 * @param {Array<{phone:string, text:string, uid?:string}>} queue
 * @param {{concurrency?:number, onSent?:Function}} opts
 *        onSent(item, result) — muvaffaqiyatli yuborilgach chaqiriladi
 *        (Firestore bayrog'ini shu yerda qo'yamiz — faqat haqiqatan ketgan bo'lsa).
 */
export async function sendQueue(queue, { concurrency = 8, onSent = null } = {}) {
  const out = { sent: 0, failed: 0, errors: [], provider: activeProvider() };
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      const res = await sendSms(item.phone, item.text);
      if (res.ok) {
        out.sent++;
        if (onSent) {
          try {
            await onSent(item, res);
          } catch (e) {
            // Bayroq yozilmadi — SMS esa ketdi. Xatoni ko'rsatamiz, chunki
            // keyingi ishga tushishda TAKROR yuborilishi mumkin.
            out.errors.push(`flag ${item.uid || item.phone}: ${e.message}`);
          }
        }
      } else {
        out.failed++;
        if (out.errors.length < 20) out.errors.push(`${item.uid || item.phone}: ${res.error}`);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, worker)
  );
  return out;
}
