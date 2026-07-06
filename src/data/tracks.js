// Akademik yutuqlar tizimi — "Metrika → Daraja" konversiyasi.
// 6 ta yo'nalish (track), har birida 3 daraja: Izlanuvchi → Mutaxassis → Ekspert.
// Xom raqamlar Statistika bo'limida qoladi; bu yerda faqat sifat darajasi ko'rsatiladi.
//
// Barcha compute() funksiyalari SOF: faqat state'dan o'qiydi, hech narsa yozmaydi.
// Darajalar MONOTON — reconcileAchievements() saqlangan tier'dan pastga tushirmaydi.
import { Target, Layers, ClipboardCheck, LayoutGrid, CalendarCheck, Timer } from 'lucide-react';
import { TOPICS } from './mockData';

// Yo'nalish vaznlari — Akademik Mahorat Indeksi (AMI, 0-100) uchun
export const TRACK_WEIGHTS = {
  aniqlik: 25,
  chuqurlik: 20,
  sinov: 20,
  qamrov: 15,
  barqarorlik: 10,
  samaradorlik: 10
};

// Daraja bosag'alari
const ANIQLIK_TIERS = [
  { n: 50, acc: 70 },
  { n: 150, acc: 85 },
  { n: 300, acc: 93 }
];
const CHUQURLIK_TIERS = [1, 3, 6];        // ≥90% aniqlik va ≥30 savol bilan o'zlashtirilgan bo'limlar
const SINOV_TIERS = [2, 5, 10];           // ketma-ket 90%+ natijali testlar (10+ savollik)
const QAMROV_TIERS = [40, 70, 100];       // faol fan bo'limlarining % ida amaliyot (har birida 10+ savol)
const BARQARORLIK_TIERS = [7, 15, 30];    // kunlik maqsad uzluksiz kunlari
const SAMARADORLIK_TIERS = [100, 300, 600]; // savol soni (o'rt. <45s va ≥80% aniqlik sharti bilan)

export const MASTERY_MIN_ANSWERED = 30;   // chuqurlik: bo'lim o'zlashtirilgan hisoblanishi uchun
export const MASTERY_MIN_ACC = 90;
export const COVERAGE_MIN_ANSWERED = 10;  // qamrov: bo'lim "amaliyot qilingan" hisoblanishi uchun
export const EXAM_MIN_QUESTIONS = 10;     // sinov: test "imtihon" hisoblanishi uchun minimal savol
export const SPEED_MAX_AVG = 45;          // samaradorlik: o'rtacha soniya chegarasi
export const SPEED_MIN_ACC = 80;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ── Pasport darajasidagi yagona unvon (AMI shkalasining tabiiy davomi) ───
// Formula o'zidan chegara beradi: bitta yo'nalish o'z tier bosag'asiga endi
// yetganda score = tier/3, ya'ni barcha yo'nalishlar bir xil bo'lganda
// tier1 ~= 33, tier2 ~= 67. Shu sababli bu qat'iy raqamlar emas — AMI
// formulasining o'zidan kelib chiqadigan tabiiy davomiylik.
export const UNVON_AMI_THRESHOLDS = [33, 67]; // [Mutaxassis bosagi, Ekspert bosagi]

// Har doim 1,2 yoki 3 qaytaradi — pasport unvoni hech qachon "boshlanmagan" bo'lmaydi,
// hamma "Izlanuvchi"dan boshlaydi (tracks.tier1/tier2/tier3 kalitlari bilan mos).
export function unvonTierFromAmi(ami) {
  if (ami >= UNVON_AMI_THRESHOLDS[1]) return 3;
  if (ami >= UNVON_AMI_THRESHOLDS[0]) return 2;
  return 1;
}

// n/acc juftligi bosag'alar ro'yxatidan qaysi darajaga yetganini aniqlaydi
const tierFromPairs = (n, acc, tiers) => {
  let tier = 0;
  tiers.forEach((t, i) => { if (n >= t.n && acc >= t.acc) tier = i + 1; });
  return tier;
};

const tierFromCount = (count, tiers) => {
  let tier = 0;
  tiers.forEach((t, i) => { if (count >= t) tier = i + 1; });
  return tier;
};

// ── Yo'nalishlar ro'yxati ────────────────────────────────────────────────
export const TRACKS = [
  {
    id: 'aniqlik',
    icon: Target,
    // Eng yaxshi fan bo'yicha: hajm + aniqlik birgalikda
    compute(state) {
      let tier = 0;
      let progress = 0;
      Object.values(state.stats || {}).forEach(cat => {
        const n = cat?.totalAnswered || 0;
        const acc = n > 0 ? (cat.totalCorrect / n) * 100 : 0;
        const catTier = tierFromPairs(n, acc, ANIQLIK_TIERS);
        tier = Math.max(tier, catTier);
        const next = ANIQLIK_TIERS[Math.min(catTier, 2)];
        progress = Math.max(progress, clamp01(Math.min(n / next.n, acc / next.acc)));
      });
      return { tier, progress };
    }
  },
  {
    id: 'chuqurlik',
    icon: Layers,
    // ≥90% aniqlik va yetarli hajm bilan o'zlashtirilgan bo'limlar soni
    compute(state) {
      const mastered = Object.values(state.topicStats || {}).filter(ts => {
        const n = ts?.answered || 0;
        return n >= MASTERY_MIN_ANSWERED && (ts.correct / n) * 100 >= MASTERY_MIN_ACC;
      }).length;
      const tier = tierFromCount(mastered, CHUQURLIK_TIERS);
      const next = CHUQURLIK_TIERS[Math.min(tier, 2)];
      return { tier, progress: clamp01(mastered / next) };
    }
  },
  {
    id: 'sinov',
    icon: ClipboardCheck,
    // Ketma-ket 90%+ natijali testlar zanjiri (examStreak90 hisoblagichi)
    compute(state) {
      const s = state.examStreak90 || 0;
      const tier = tierFromCount(s, SINOV_TIERS);
      const next = SINOV_TIERS[Math.min(tier, 2)];
      return { tier, progress: clamp01(s / next) };
    }
  },
  {
    id: 'qamrov',
    icon: LayoutGrid,
    // Faol fan bo'limlarining necha foizida amaliyot qilingan
    compute(state) {
      const cat = state.activeCategory;
      const catTopics = TOPICS.filter(t =>
        Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
      );
      if (catTopics.length === 0) return { tier: 0, progress: 0 };
      const practiced = catTopics.filter(t =>
        (state.topicStats?.[t.id]?.answered || 0) >= COVERAGE_MIN_ANSWERED
      ).length;
      const pct = (practiced / catTopics.length) * 100;
      const tier = tierFromCount(pct, QAMROV_TIERS);
      const next = QAMROV_TIERS[Math.min(tier, 2)];
      return { tier, progress: clamp01(pct / next) };
    }
  },
  {
    id: 'barqarorlik',
    icon: CalendarCheck,
    // Kunlik maqsad uzluksizligi
    compute(state) {
      const s = state.dailyStreak || 0;
      const tier = tierFromCount(s, BARQARORLIK_TIERS);
      const next = BARQARORLIK_TIERS[Math.min(tier, 2)];
      return { tier, progress: clamp01(s / next) };
    }
  },
  {
    id: 'samaradorlik',
    icon: Timer,
    // Tezlik + aniqlik birgalikda: o'rt. <45s va ≥80% aniqlik, hajm bosqichlari bilan
    compute(state) {
      const tq = state.timeStats?.totalQuestions || 0;
      const tt = state.timeStats?.totalTime || 0;
      const avg = tq > 0 ? tt / tq : 0;
      const answered = Object.values(state.stats || {}).reduce((s, c) => s + (c?.totalAnswered || 0), 0);
      const correct = Object.values(state.stats || {}).reduce((s, c) => s + (c?.totalCorrect || 0), 0);
      const acc = answered > 0 ? (correct / answered) * 100 : 0;
      const qualifies = avg > 0 && avg < SPEED_MAX_AVG && acc >= SPEED_MIN_ACC;
      const tier = qualifies ? tierFromCount(tq, SAMARADORLIK_TIERS) : 0;
      const next = SAMARADORLIK_TIERS[Math.min(tier, 2)];
      const speedFactor = avg <= 0 ? 0 : avg < SPEED_MAX_AVG ? 1 : SPEED_MAX_AVG / avg;
      const progress = clamp01(Math.min(tq / next, speedFactor, acc / SPEED_MIN_ACC));
      return { tier, progress };
    }
  }
];

// ── Saqlangan yutuqlar bilan solishtirish ────────────────────────────────
// state       — joriy AppContext holati (metrikalar manbai)
// stored      — state.achievements (oldingi { ami, unvonTier, tracks } yoki undefined)
// Qaytaradi:
//   achievements — saqlash uchun yangi obyekt (tier monoton, earnedAt sanalari bilan)
//   gained       — shu chaqiruvda YANGI olingan track darajalari (KICHIK — faqat Bell)
//   gainedUnvon  — shu chaqiruvda unvon oshgan bo'lsa {tier} (KATTA — toast + Bell)
//   live         — UI uchun: { [id]: { tier, progress } }
export function reconcileAchievements(state, stored) {
  const prevTracks = stored?.tracks || {};
  const tracksOut = {};
  const live = {};
  const gained = [];
  let ami = 0;

  for (const tr of TRACKS) {
    let computed = { tier: 0, progress: 0 };
    try { computed = tr.compute(state); } catch { /* metrika buzilgan — 0 daraja */ }

    const prevTier = prevTracks[tr.id]?.tier || 0;
    const earnedAt = { ...(prevTracks[tr.id]?.earnedAt || {}) };
    const mergedTier = Math.max(computed.tier, prevTier);

    if (computed.tier > prevTier) {
      for (let lv = prevTier + 1; lv <= computed.tier; lv++) {
        if (!earnedAt[lv]) earnedAt[lv] = Date.now();
        gained.push({ trackId: tr.id, tier: lv });
      }
    }

    tracksOut[tr.id] = { tier: mergedTier, earnedAt };
    live[tr.id] = { tier: mergedTier, progress: computed.progress };
    const score = mergedTier >= 3 ? 1 : clamp01((mergedTier + computed.progress) / 3);
    ami += TRACK_WEIGHTS[tr.id] * score;
  }

  ami = Math.round(ami);

  // Pasport unvoni — AMI'dan hisoblanadi, monoton (pastga tushmaydi).
  const prevUnvonTier = stored?.unvonTier || 1;
  const mergedUnvonTier = Math.max(unvonTierFromAmi(ami), prevUnvonTier);
  const gainedUnvon = mergedUnvonTier > prevUnvonTier ? { tier: mergedUnvonTier } : null;
  const unvonSince = gainedUnvon ? Date.now() : (stored?.unvonSince || null);

  return {
    achievements: { ami, unvonTier: mergedUnvonTier, unvonSince, tracks: tracksOut },
    gained,
    gainedUnvon,
    live
  };
}
