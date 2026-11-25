import { effectiveReferralDiscount } from '../../api/_referralDiscount.js';

const FREE_TRIAL_DAYS = 7;
const URGENCY_DAYS = 3;

export function computeLeadTrialStatus(data, nowMs = Date.now()) {
  if (!data || typeof data !== 'object') {
    return { status: 'expired', daysLeft: 0 };
  }
  const now = new Date(nowMs);
  if (data.isPremium) {
    if (data.premiumExpire) {
      const exp = toJsDate(data.premiumExpire);
      if (exp && exp.getTime() > nowMs) {
        return { status: 'premium', daysLeft: Math.ceil((exp.getTime() - nowMs) / 86400000) };
      }
    } else {
      return { status: 'premium', daysLeft: 0 };
    }
  }
  if (data.referredBy && data.freeMonthExpire) {
    const freeEnd = toJsDate(data.freeMonthExpire);
    if (freeEnd && freeEnd.getTime() > nowMs) {
      return { status: 'premium', daysLeft: Math.ceil((freeEnd.getTime() - nowMs) / 86400000) };
    }
  }
  const createdAt = toJsDate(data.createdAt);
  if (!createdAt) return { status: 'expired', daysLeft: 0 };

  const daysSinceReg = Math.floor((nowMs - createdAt.getTime()) / 86400000);
  const effDiscount = effectiveReferralDiscount(data, now);
  if (daysSinceReg < FREE_TRIAL_DAYS) {
    return { status: 'trial', daysLeft: FREE_TRIAL_DAYS - daysSinceReg, discountPercent: effDiscount };
  }
  if (daysSinceReg < FREE_TRIAL_DAYS + URGENCY_DAYS) {
    return { status: 'urgency', daysLeft: 0, discountPercent: effDiscount };
  }
  return { status: 'expired', daysLeft: 0, discountPercent: effDiscount };
}

export const LEAD_SEGMENTS = {
  promo_pending: {
    key: 'promo_pending',
    label: "Promo kiritgan (to'lamagan)",
    shortLabel: '🎟️ Promo kutmoqda',
    chip: 'admin-chip--amber',
    baseScore: 62,
  },
  urgency: {
    key: 'urgency',
    label: 'Sinov / chegirma tugamoqda',
    shortLabel: '🔥 Sinov tugamoqda',
    chip: 'admin-chip--red',
    baseScore: 52,
  },
  expiring_pro: {
    key: 'expiring_pro',
    label: 'Pro 7 kunda tugaydi',
    shortLabel: '⏳ Pro tugamoqda',
    chip: 'admin-chip--blue',
    baseScore: 54,
  },
  expired_pro: {
    key: 'expired_pro',
    label: 'Sobiq Pro (qaytarish)',
    shortLabel: '🔄 Sobiq Pro',
    chip: 'admin-chip--muted',
    baseScore: 44,
  },
  active_free: {
    key: 'active_free',
    label: 'Faol bepul ustoz',
    shortLabel: '⚡ Faol bepul',
    chip: 'admin-chip--green',
    baseScore: 36,
  },
};

export const CRM_STATUSES = [
  { key: 'new', label: '🆕 Yangi', chip: 'admin-chip--blue' },
  { key: 'contacted', label: "📞 Bog'lanildi", chip: 'admin-chip--amber' },
  { key: 'thinking', label: "🤔 O'ylayapti", chip: 'admin-chip--muted' },
  { key: 'won', label: '✅ Sotildi', chip: 'admin-chip--green' },
  { key: 'lost', label: '❌ Rad etdi', chip: 'admin-chip--red' },
];

export function toJsDate(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val?.seconds ? val.seconds * 1000 : val);
  return Number.isNaN(d?.getTime?.()) ? null : d;
}

/**
 * Foydalanuvchi hujjatidan 998XXXXXXXXX telefon raqamini ajratib oladi.
 * Login modeli `998XXXXXXXXX@iqro.uz` bo'lgani uchun `phone` maydoni bo'sh
 * eski hisoblarda ham raqamni emaildan aniq tiklash mumkin.
 */
export function extractCleanPhone(u = {}) {
  const candidates = [
    u.phone,
    u.phoneNumber,
    typeof u.email === 'string' && u.email.endsWith('@iqro.uz') ? u.email.split('@')[0] : '',
  ];
  for (const raw of candidates) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('998')) return digits;
    if (digits.length === 9) return `998${digits}`;
  }
  return null;
}

export function formatPrettyPhone(digits) {
  if (!digits || digits.length !== 12) return digits || '—';
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
}

/**
 * Foydalanuvchi + statistika hujjatidan sotuv lidini tasniflaydi va
 * "issiqlik" ballini (0..100) hisoblaydi.
 * Admin, hamkor, maktab korporativ a'zosi yoki muddati uzoq (>7 kun) Pro
 * obunachilar sotuv ro'yxatiga kiritilmaydi (`null` qaytadi).
 */
export function classifyLead(u, st = null, nowMs = Date.now()) {
  if (!u || typeof u !== 'object' || !u.id) return null;
  if (u.role === 'admin' || u.role === 'partner') return null;
  if (u.schoolId) return null;

  const now = new Date(nowMs);
  const trial = computeLeadTrialStatus(u, nowMs);
  const expDate = toJsDate(u.premiumExpire);
  const createdDate = toJsDate(u.createdAt);
  const lastActiveDate = toJsDate(st?.lastActiveAt || u.lastActiveAt);

  const isActivePro = trial.status === 'premium';
  const proDaysLeft = isActivePro
    ? (expDate ? Math.ceil((expDate.getTime() - nowMs) / 86400000) : null)
    : null;

  // Muddatsiz yoki tugashiga >7 kun bor faol Pro — hozircha sotuv lidi emas
  if (isActivePro && (proDaysLeft === null || proDaysLeft > 7)) {
    return null;
  }

  const promoObj = u.promoDiscount;
  const promoExpMs = promoObj?.expiresAt ? new Date(promoObj.expiresAt).getTime() : NaN;
  const hasActivePromo = Boolean(
    promoObj?.percent > 0 && (Number.isNaN(promoExpMs) || promoExpMs > nowMs)
  );

  const referralPct = effectiveReferralDiscount(u, now);
  const referralBonus = Math.max(0, Number(u.referralBonus) || 0);
  const totalAnswered = Math.max(0, Number(st?.totalAnswered) || 0);
  const totalCorrect = Math.max(0, Number(st?.totalCorrect) || 0);
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const lastActiveDays = lastActiveDate ? Math.max(0, Math.floor((nowMs - lastActiveDate.getTime()) / 86400000)) : null;
  const regDays = createdDate ? Math.max(0, Math.floor((nowMs - createdDate.getTime()) / 86400000)) : null;

  const hadProBefore = !isActivePro && Boolean(
    (u.isPremium && expDate && expDate.getTime() <= nowMs)
    || u.premiumPlan === 'expired'
    || u.premiumSince
  );

  const segments = [];
  if (!isActivePro && hasActivePromo) segments.push('promo_pending');
  if (isActivePro && proDaysLeft !== null && proDaysLeft <= 7) segments.push('expiring_pro');
  if (!isActivePro && (trial.status === 'urgency' || (trial.status === 'trial' && trial.daysLeft <= 3))) {
    segments.push('urgency');
  }
  if (hadProBefore) segments.push('expired_pro');
  if (!isActivePro && ((lastActiveDays !== null && lastActiveDays <= 3 && totalAnswered >= 5) || totalAnswered >= 20)) {
    segments.push('active_free');
  }

  if (segments.length === 0) return null;

  const primarySegment = segments[0];
  const segMeta = LEAD_SEGMENTS[primarySegment];
  const phone = extractCleanPhone(u);

  // Issiqlik balli (0..100): niyat + faollik + yangilik + aloqa imkoni
  let score = segMeta.baseScore;
  score += Math.min(22, Math.floor(totalAnswered / 8));
  if (lastActiveDays !== null) {
    if (lastActiveDays <= 1) score += 12;
    else if (lastActiveDays <= 3) score += 7;
    else if (lastActiveDays <= 7) score += 3;
  }
  if (phone) score += 5;
  if (referralPct > 0 || referralBonus > 0 || hasActivePromo) score += 6;
  const heatScore = Math.min(99, Math.max(10, score));

  return {
    id: u.id,
    user: u,
    displayName: u.displayName || '—',
    shortId: u.shortId || null,
    phone,
    prettyPhone: formatPrettyPhone(phone),
    email: u.email || null,
    subject: u.subject || null,
    teacherCategory: u.teacherCategory || null,
    segments,
    primarySegment,
    segmentLabel: segMeta.shortLabel,
    segmentChip: segMeta.chip,
    heatScore,
    totalAnswered,
    accuracy,
    lastActiveDate,
    lastActiveDays,
    regDays,
    trialStatus: trial.status,
    trialDaysLeft: trial.daysLeft,
    proDaysLeft,
    promoCode: hasActivePromo ? promoObj.code : null,
    promoPercent: hasActivePromo ? Number(promoObj.percent) : 0,
    referralPct,
    referralBonus,
    crmStatus: u.crmStatus || 'new',
    crmNote: u.crmNote || '',
    crmContactedAt: u.crmContactedAt || null,
  };
}

function cleanTeacherFirstName(rawName) {
  const s = String(rawName || '').trim();
  if (!s || s === '—' || s.includes('@') || /^\+?\d+$/.test(s)) return 'ustoz';
  return `${s.split(/\s+/)[0]} ustoz`;
}

/**
 * Lid segmentiga moslashtirilgan tayyor, samimiy sotuv xabarini yaratadi
 * (Telegram / qo'ng'iroq / ilova ichidagi shaxsiy xabar uchun).
 */
export function buildLeadPitch(lead, subjectLabel = '') {
  const greet = `Assalomu alaykum, ${cleanTeacherFirstName(lead?.displayName)}!`;
  const subjPart = subjectLabel ? ` ${subjectLabel} fanidan` : '';
  const solvedPart = lead?.totalAnswered >= 10
    ? ` Platformada${subjPart} ${lead.totalAnswered} ta attestatsiya savolini ishlab ko'rgansiz${lead.accuracy !== null ? ` (aniqlik ${lead.accuracy}%)` : ''}.`
    : subjPart ? ` Zehin platformasida${subjPart} attestatsiyaga tayyorlanyapsiz.` : '';

  if (lead?.primarySegment === 'promo_pending' && lead.promoCode) {
    return `${greet}${solvedPart}\n\nHisobingizda «${lead.promoCode}» promokodi orqali -${lead.promoPercent}% chegirma faol turibdi, lekin Pro obuna hali yakunlanmagan ekan. Chegirma kuyib ketmasdan faollashtirib beraylikmi? Savollaringiz bo'lsa yozing, darhol yordam beraman.`;
  }

  if (lead?.primarySegment === 'expiring_pro') {
    return `${greet}${solvedPart}\n\nZehin Pro obunangiz tugashiga ${lead.proDaysLeft ?? 1} kun qoldi. Tayyorgarlik va kunlik takrorlash zanjiringiz uzilib qolmasligi uchun obunani hozir qulay tarifda uzaytirib beraylikmi?`;
  }

  if (lead?.primarySegment === 'expired_pro') {
    return `${greet}${solvedPart}\n\nZehin Pro obunangiz muddati yakunlangan ekan. Faningiz bo'yicha yangi savollar va nazariy konspektlar qo'shildi — attestatsiyagacha tayyorgarlikni davom ettirish uchun Pro obunani qaytadan yoqib beraylikmi?`;
  }

  if (lead?.primarySegment === 'urgency') {
    const discNote = lead.referralPct > 0
      ? ` Sizda hozir do'st taklifi orqali -${lead.referralPct}% maxsus chegirma ham bor!`
      : lead.referralBonus > 0
        ? ` Hisobingizda ${lead.referralBonus.toLocaleString('uz-UZ')} so'm bonus mavjud!`
        : '';
    return `${greet}${solvedPart}\n\nBepul sinov davringiz yakunlanmoqda.${discNote} Barcha mavzular, xatolar ustida ishlash va 100 ballik real imtihon simulyatori yopilib qolmasligi uchun Pro obunani ulab beraylikmi?`;
  }

  const bonusHint = lead?.referralPct > 0
    ? ` Hozir hisobingizda -${lead.referralPct}% chegirma ham faol.`
    : lead?.referralBonus > 0
      ? ` Hisobingizdagi ${lead.referralBonus.toLocaleString('uz-UZ')} so'm bonusni to'lovdan ayirib beramiz.`
      : '';
  return `${greet}${solvedPart}\n\nAttestatsiyada yuqori ball olish uchun barcha bo'limlar, ilmiy izohlar va xatolar tahlilini to'liq ochuvchi Zehin Pro obunasini ulashga yordam beraymi?${bonusHint}`;
}
