import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import localforage from 'localforage';
import { MAX_MISTAKES_SAVED, EXAM_GOAL_SCORE, BATCH_SIZE } from '../config';
import { computeDiagnostics, avgSecondsPerQuestion } from '../engine/DiagnosticsEngine';
import { MAX_SPACED_CARDS, questionKey } from '../engine/SmartQuestionEngine';
import { readContract, questionsForMinutes } from '../services/studyContract';
import { mergePartnerSets } from '../utils/mergeRules';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import { reconcileAchievements, EXAM_MIN_QUESTIONS } from '../data/tracks';
import { reconcileMilestones, MILESTONE_UNITS } from '../data/milestones';
import { AnalyticsEvents } from '../services/analytics';
import i18n from '../i18n';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteField,
  collection,
  addDoc
} from "firebase/firestore";

export const AppContext = createContext();

// Helper to get ISO-8601 week number (YYYY_Www)
export const getWeekId = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}_W${String(weekNo).padStart(2, '0')}`;
};

// Helper to get month ID (YYYY_MM)
export const getMonthId = (date = new Date()) => {
  return `${date.getFullYear()}_M${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// ── Kunlik streak + bepul avtomatik "muzlatish" (freeze/restore) ──────────
// 1 kun o'tkazib yuborilsa, muzlatish zaxirasi streakni avtomatik saqlaydi —
// foydalanuvchi qaytib kelganda zanjir uzilmaydi (bepul, avtomatik tiklash).
export const STREAK_FREEZE_START = 2;     // boshlang'ich zaxira
export const STREAK_FREEZE_MAX = 3;       // maksimal zaxira
export const STREAK_FREEZE_MILESTONE = 7; // har 7 kunlik bosqichda +1 zaxira

// ── Ball tizimi ──────────────────────────────────────────────────────────
// Yangi savol to'g'ri — 2 ball; spaced repetition bo'yicha vaqti kelgan
// takror to'g'ri — 1 ball; vaqti kelmagan takror — 0 (farmingdan himoya);
// kunlik maqsad kunida birinchi marta bajarilganda — +5 bonus.
export const POINTS_NEW_CORRECT = 2;
export const POINTS_DUE_REVIEW = 1;
export const DAILY_GOAL_BONUS = 5;

// ── Yutuq mukofoti (oqibat) ──────────────────────────────────────────────
// Ilgari daraja olinishi HECH NARSA bermasdi: na ball, na zaxira, na kirish —
// faqat bildirishnoma. Ya'ni "harakat → yutuq → foyda" zanjiri yarmida uzilardi.
// Endi har bir yangi yo'nalish darajasi ball VA bitta muzlatish zaxirasi beradi
// (zaxira ataylab: u aynan zanjirni saqlashga ketadi, ya'ni mukofot keyingi
// harakatga qaytadi). Pasport unvoni kamdan-kam oshadi — u kattaroq ball oladi.
//
// Ball miqdori firestore.rules dagi delta chegarasiga (javob o'sishi × 2 + 5000)
// bemalol sig'adi: bir sessiyada eng ko'pi 6×25 + 100 = 250.
export const TIER_REWARD_POINTS = 25;
export const UNVON_REWARD_POINTS = 100;

// ── Tarix (tendensiya va faollik kalendari) ──────────────────────────────
// Ikkalasi ham qat'iy cheklangan: bulutdagi hujjat cheksiz o'smasligi kerak.
export const READINESS_HISTORY_WEEKS = 12;  // ~3 oylik tendensiya — sparkline uchun yetarli
export const ACTIVE_DAYS_KEPT = 21;         // 3 hafta — haftalik panjara + zaxira

// Ikki toDateString() qiymati orasidagi to'liq kun farqi
const dayDiff = (fromStr, toStr) => {
  const a = new Date(fromStr); const b = new Date(toStr);
  if (isNaN(a) || isNaN(b)) return Infinity;
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

// Maqsad bajarilganda kunlik streakni yangilaydi. Aynan 1 kun o'tkazib yuborilgan
// bo'lsa (diff === 2) va zaxira bo'lsa — muzlatishni sarflab streakni davom ettiradi.
const advanceDailyStreak = (prev, today, dgCompleted) => {
  let dailyStreak = prev.dailyStreak || 0;
  let lastGoalDate = prev.lastGoalDate;
  let streakFreezes = prev.streakFreezes ?? STREAK_FREEZE_START;
  let streakFrozenDate = prev.streakFrozenDate || null;

  if (dgCompleted && lastGoalDate !== today) {
    if (!lastGoalDate) {
      dailyStreak = 1;
    } else {
      const diff = dayDiff(lastGoalDate, today);
      if (diff === 1) {
        dailyStreak += 1;
      } else if (diff === 2 && streakFreezes > 0) {
        streakFreezes -= 1;          // aynan 1 kun o'tkazildi → muzlatish ishlaydi
        streakFrozenDate = today;
        dailyStreak += 1;
      } else {
        dailyStreak = 1;             // 2+ kun yoki zaxira yo'q → qaytadan boshlanadi
      }
    }
    lastGoalDate = today;

    // Har 7 kunlik bosqichda zaxira to'ldiriladi (cap bilan)
    if (dailyStreak > 0 && dailyStreak % STREAK_FREEZE_MILESTONE === 0) {
      streakFreezes = Math.min(STREAK_FREEZE_MAX, streakFreezes + 1);
    }
  }
  return { dailyStreak, lastGoalDate, streakFreezes, streakFrozenDate };
};

const buildDefaultCatStats = () => ({
  totalAnswered: 0,
  totalCorrect: 0,
  streak: 0,
  maxStreak: 0,
  mistakes: []
});

const buildDefaultState = () => {
  const weekId = getWeekId();
  const monthId = getMonthId();
  return {
    totalScore: 0,
    streak: 0,
    maxStreak: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    topicStats: {},
    mistakes: [],
    sessionStart: Date.now(),
    studyMinutes: 0,
    activeCategory: 'chqbt',
    topicId: -1,      // Tanlangan mavzu ID (-1 = barchasi)
    topicSubset: null, // Aralash mashq uchun bo'limlar to'plami (reja «mixed» qadami)
    testMode: 'exam',  // Test rejimi: 'exam' | 'flashcard' | 'mistakes'
    stats: {
      chqbt: buildDefaultCatStats(),
      art: buildDefaultCatStats()
    },
    dailyGoal: {
      date: new Date().toDateString(),
      answered: 0,
      target: 20,
      completed: false
    },
    dailyStreak: 0,
    lastGoalDate: null,
    streakFreezes: STREAK_FREEZE_START,
    streakFrozenDate: null,
    goalDaysTotal: 0,      // kunlik maqsad bajarilgan KUNLAR soni (zanjir uzilsa ham saqlanadi)
    correctRun: 0,         // hozirgi uzluksiz to'g'ri javoblar zanjiri
    maxCorrectRun: 0,      // eng uzun zanjir (shaxsiy rekord)
    milestones: {},        // shaxsiy marralar: { [id]: { level, earnedAt } } — milestones.js
    readiness: {},         // fan bo'yicha tayyorlik: { [cat]: { score, knowledge, margin, confidence, answered, updatedAt } }
    readinessHistory: {},  // tendensiya: { [cat]: [{ w: weekId, s: score, k: knowledge }] } — oxirgi 12 hafta
    activeDays: [],        // faollik kalendari: [{ d: toDateString, a: javoblar, g: maqsad bajarilgani }] — oxirgi 21 kun
    lastActiveAt: null,    // oxirgi natija topshirilgan vaqt (maktab hisoboti uchun)
    spacedCards: [],
    customMnemonics: {},
    repetitionLimit: 0,
    timeStats: { totalTime: 0, totalQuestions: 0 },
    nightQuestions: 0,
    earlyQuestions: 0,
    perfectExamsCount: 0,
    examStreak90: 0,                        // ketma-ket 90%+ natijali testlar (sinov yo'nalishi)
    achievements: { ami: 0, unvonTier: 1, unvonSince: null, tracks: {} }, // akademik yutuqlar: daraja + unvon (tracks.js)
    amiWeekly: { weekId, startAmi: 0 },     // haftalik AMI o'sishi uchun boshlang'ich nuqta (AmiCard «+N shu hafta»)
    [`weekly_${weekId}`]: 0,
    [`monthly_${monthId}`]: 0
  };
};

// ────────────────────────────────────────────────────────
// XAVFSIZ localStorage kalit nomini yaratish
// Har bir foydalanuvchining ma'lumotlari alohida saqlanadi
// ────────────────────────────────────────────────────────
const getUserStateKey = (uid) => `iqro_state_${uid}`;

// Shu foydalanuvchining lokal zaxirasini o'qish (localStorage + localforage zaxirasi)
const loadLocalBackup = async (uid) => {
  const userKey = getUserStateKey(uid);
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // localStorage xatosi — localforage ga o'tamiz
  }
  try {
    const forageVal = await localforage.getItem(userKey);
    if (forageVal) {
      const parsed = typeof forageVal === 'string' ? JSON.parse(forageVal) : forageVal;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // localforage xatosi
  }
  return null;
};

// Bulut va lokal zaxirani birlashtirish — qurilma almashganda "last-write-wins"
// hisoblagichlarni o'chirib yubormasligi uchun monoton qiymatlar bo'yicha max() olinadi.
// resetAt guard: ataylab reset qilingan statistikani eski lokal nusxa "tiriltirmasligi" kerak.
//
// ═══════════════════════════════════════════════════════════════════════════
//  ⚠️ QOIDA — YANGI STATE MAYDONI QO'SHSANGIZ, SHU YERGA HAM QOIDA YOZING.
//
//  Funksiya `merged = { ...cloud }` bilan boshlanadi. Ya'ni bu yerda ATAYLAB
//  ishlov berilmagan HAR QANDAY maydon uchun bulut nusxasi so'zsiz g'olib
//  bo'ladi — oflayn qilingan ish jimgina yo'qoladi. Bu xato allaqachon
//  IKKI MARTA sodir bo'lgan: T-15 (`spacedCards`) va X-2 (`partnerSets`).
//
//  Qoidani tanlash:
//    · hisoblagich (faqat o'sadi) ......... Math.max()
//    · to'plam/ro'yxat .................... union + ziddiyat qoidasi
//    · hodisa yozuvi (o'zgarmas) .......... union + eng ERTA vaqt g'olib
//    · vaqt kesimidagi baho ............... yangiroq `updatedAt` g'olib
//  Nozik qoidalar `utils/mergeRules.js` da, testi bilan.
// ═══════════════════════════════════════════════════════════════════════════
const mergeCloudAndLocal = (cloud, local) => {
  if (!local) return cloud;
  if (cloud.resetAt && (local.savedAt || 0) < cloud.resetAt) return cloud;

  const merged = { ...cloud };

  ['totalScore', 'totalAnswered', 'totalCorrect', 'maxStreak', 'studyMinutes', 'dailyStreak', 'nightQuestions', 'earlyQuestions', 'perfectExamsCount', 'examStreak90', 'goalDaysTotal', 'maxCorrectRun']
    .forEach(k => { merged[k] = Math.max(cloud[k] || 0, local[k] || 0); });

  Object.keys(local).forEach(k => {
    if (k.startsWith('weekly_') || k.startsWith('monthly_')) {
      merged[k] = Math.max(cloud[k] || 0, local[k] || 0);
    }
  });

  const catIds = new Set([...Object.keys(cloud.stats || {}), ...Object.keys(local.stats || {})]);
  merged.stats = {};
  catIds.forEach(cat => {
    const c = (cloud.stats || {})[cat] || buildDefaultCatStats();
    const l = (local.stats || {})[cat] || buildDefaultCatStats();
    // Xatolar savol matni bo'yicha union qilinadi
    const seen = new Set();
    const mistakes = [...(c.mistakes || []), ...(l.mistakes || [])].filter(m => {
      const key = m?.question || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    while (mistakes.length > MAX_MISTAKES_SAVED) mistakes.shift();
    merged.stats[cat] = {
      ...c,
      totalAnswered: Math.max(c.totalAnswered || 0, l.totalAnswered || 0),
      totalCorrect: Math.max(c.totalCorrect || 0, l.totalCorrect || 0),
      maxStreak: Math.max(c.maxStreak || 0, l.maxStreak || 0),
      mistakes
    };
  });

  const topicIds = new Set([...Object.keys(cloud.topicStats || {}), ...Object.keys(local.topicStats || {})]);
  merged.topicStats = {};
  topicIds.forEach(t => {
    const c = (cloud.topicStats || {})[t] || { answered: 0, correct: 0 };
    const l = (local.topicStats || {})[t] || { answered: 0, correct: 0 };
    merged.topicStats[t] = {
      answered: Math.max(c.answered || 0, l.answered || 0),
      correct: Math.max(c.correct || 0, l.correct || 0),
      // Vaqt/yangilik maydonlari ham monoton max() bilan — hisoblagichlar
      // bilan bir xil qoida, qurilma almashganda hech narsa yo'qolmaydi
      timeSum: Math.max(c.timeSum || 0, l.timeSum || 0),
      fast: Math.max(c.fast || 0, l.fast || 0),
      lastAt: Math.max(c.lastAt || 0, l.lastAt || 0)
    };
  });

  merged.timeStats = {
    totalTime: Math.max(cloud.timeStats?.totalTime || 0, local.timeStats?.totalTime || 0),
    totalQuestions: Math.max(cloud.timeStats?.totalQuestions || 0, local.timeStats?.totalQuestions || 0)
  };

  // ⚠️ AUDIT 2026-08-17, X-2 BAND — `partnerSets` BIRLASHTIRILMASDI.
  // `merged = {...cloud}` tufayli bulut nusxasi butunlay g'olib edi, ya'ni
  // haftalik diagnostika natijasi FAQAT lokal zaxirada qolgan bo'lsa
  // jimgina yo'qolardi. Real ssenariy:
  //   o'qituvchi maktabda, internet zaif → to'plamni yechadi (42/50) →
  //   natija localStorage'ga tushadi, bulutga YETMAYDI → ilovani yopadi →
  //   ertasiga ochadi → bulutdagi bo'sh `partnerSets` g'olib bo'ladi.
  // Oqibati IKKI KARRA: ustoz hisobotida bu odam "yechmagan" bo'lib
  // ko'rinadi VA keyingi hafta ochilmay qoladi — bu yozuv qulfni ochadigan
  // kalit ham (ExamPage.jsx: «Shu yozuv AYNI PAYTDA keyingi haftani
  // ochadigan kalit ham»).
  //
  // Bu T-15 (`spacedCards`) bilan AYNI SINFDAGI xato: `partnerSets` keyinroq
  // qo'shilgani uchun merge qoidasi yozilmay qolgan.
  //
  // Qoida `utils/mergeRules.js` da — sof funksiya, testi bilan.
  const mergedSets = mergePartnerSets(cloud.partnerSets, local.partnerSets);
  if (mergedSets) merged.partnerSets = mergedSets;

  // ⚠️ AUDIT 2026-08-06, T-15 BAND — `spacedCards` va `customMnemonics`
  // BIRLASHTIRILMASDI: `merged = {...cloud}` tufayli bulut nusxasi g'olib edi.
  // Natijada hisoblagichlar max() bilan saqlanib qolgan holda, oflayn sessiyada
  // olingan takrorlash (SRS) progressi jimgina yo'qolardi — nomuvofiq xatti-harakat.
  //
  // Kartalar qHash bo'yicha union qilinadi, ziddiyatda OXIRGI KO'RILGANI g'olib
  // (`lastReview` kattaroq) — bu SRS uchun to'g'ri semantika. Ro'yxat eng yangi
  // ko'rilgan MAX_SPACED_CARDS ta karta bilan cheklanadi (SmartQuestionEngine
  // bilan bir xil chegara); ilgari kesish kiritilish tartibida bo'lib, bugun
  // takrorlangan eski karta tushib qolishi mumkin edi.
  // Kalit matndan qayta hisoblanadi (T-7): bulutdagi karta eski 100-belgilik
  // kalitda, lokali esa yangi xeshda bo'lsa ham, ular BITTA karta deb tanilishi
  // va ikkiga bo'linib ketmasligi kerak.
  const cardByHash = new Map();
  for (const c of [...(cloud.spacedCards || []), ...(local.spacedCards || [])]) {
    const key = c?.q ? questionKey(c) : c?.qHash;
    if (!key) continue;
    const prev = cardByHash.get(key);
    if (!prev || (c.lastReview || 0) >= (prev.lastReview || 0)) cardByHash.set(key, c);
  }
  merged.spacedCards = [...cardByHash.values()]
    .sort((a, b) => (a.lastReview || 0) - (b.lastReview || 0))
    .slice(-MAX_SPACED_CARDS);

  // Mnemonika — matn, vaqt belgisi yo'q. Shuning uchun ziddiyatda BULUT g'olib
  // (umumiy manba), lokalda bor-u bulutda yo'q kalitlar esa saqlanadi. Bu yo'l
  // hech qachon ma'lumot YO'QOTMAYDI: hozirgi holatda lokal kalit butunlay
  // tashlab yuborilardi.
  merged.customMnemonics = { ...(local.customMnemonics || {}), ...(cloud.customMnemonics || {}) };

  // Tendensiya — hafta bo'yicha union. Ikkala nusxada ham bir hafta bo'lsa
  // ko'proq javobli (ya'ni kechroq yozilgan) nuqta ustun: hafta ichida raqam
  // faqat o'sadi yoki aniqlashadi, orqaga qaytmaydi.
  const histCats = new Set([
    ...Object.keys(cloud.readinessHistory || {}),
    ...Object.keys(local.readinessHistory || {}),
  ]);
  merged.readinessHistory = {};
  histCats.forEach(cat => {
    const byWeek = new Map();
    [...((cloud.readinessHistory || {})[cat] || []), ...((local.readinessHistory || {})[cat] || [])]
      .forEach(p => {
        if (!p?.w) return;
        const cur = byWeek.get(p.w);
        if (!cur || (p.s || 0) >= (cur.s || 0)) byWeek.set(p.w, p);
      });
    const list = [...byWeek.values()].sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));
    while (list.length > READINESS_HISTORY_WEEKS) list.shift();
    merged.readinessHistory[cat] = list;
  });

  // Faollik kalendari — kun bo'yicha union, ko'proq javobli yozuv ustun
  const byDay = new Map();
  [...(cloud.activeDays || []), ...(local.activeDays || [])].forEach(x => {
    if (!x?.d) return;
    const cur = byDay.get(x.d);
    if (!cur || (x.a || 0) >= (cur.a || 0)) byDay.set(x.d, x);
  });
  const mergedDays = [...byDay.values()].sort((a, b) => new Date(a.d) - new Date(b.d));
  while (mergedDays.length > ACTIVE_DAYS_KEPT) mergedDays.shift();
  merged.activeDays = mergedDays;

  // Yutuqlar: daraja monoton (max), earnedAt esa eng birinchi sana saqlanadi
  const cTracks = cloud.achievements?.tracks || {};
  const lTracks = local.achievements?.tracks || {};
  const trackIds = new Set([...Object.keys(cTracks), ...Object.keys(lTracks)]);
  const mergedTracks = {};
  trackIds.forEach(id => {
    const c = cTracks[id] || {};
    const l = lTracks[id] || {};
    const earnedAt = {};
    new Set([...Object.keys(c.earnedAt || {}), ...Object.keys(l.earnedAt || {})]).forEach(lv => {
      const cv = (c.earnedAt || {})[lv];
      const lvv = (l.earnedAt || {})[lv];
      earnedAt[lv] = cv && lvv ? Math.min(cv, lvv) : (cv || lvv);
    });
    mergedTracks[id] = { tier: Math.max(c.tier || 0, l.tier || 0), earnedAt };
  });
  const cUnvonTier = cloud.achievements?.unvonTier || 1;
  const lUnvonTier = local.achievements?.unvonTier || 1;
  merged.achievements = {
    ami: Math.max(cloud.achievements?.ami || 0, local.achievements?.ami || 0),
    unvonTier: Math.max(cUnvonTier, lUnvonTier),
    unvonSince: cUnvonTier >= lUnvonTier ? (cloud.achievements?.unvonSince || null) : (local.achievements?.unvonSince || null),
    tracks: mergedTracks
  };

  // Tayyorlik: har fan uchun YANGIROQ yozuv g'olib (o'rtacha olish ma'nosiz —
  // bu vaqt kesimidagi baho, hisoblagich emas)
  const cR = cloud.readiness || {};
  const lR = local.readiness || {};
  merged.readiness = { ...cR };
  Object.entries(lR).forEach(([k, v]) => {
    const c = cR[k];
    if (!c || (v?.updatedAt || '') > (c.updatedAt || '')) merged.readiness[k] = v;
  });
  merged.lastActiveAt = (local.lastActiveAt || '') > (cloud.lastActiveAt || '')
    ? local.lastActiveAt : cloud.lastActiveAt;

  // Shaxsiy marralar: daraja monoton (max), earnedAt eng birinchi sana
  const cMs = cloud.milestones || {};
  const lMs = local.milestones || {};
  const msIds = new Set([...Object.keys(cMs), ...Object.keys(lMs)]);
  const mergedMilestones = {};
  msIds.forEach(id => {
    const c = cMs[id] || {};
    const l = lMs[id] || {};
    const earnedAt = {};
    new Set([...Object.keys(c.earnedAt || {}), ...Object.keys(l.earnedAt || {})]).forEach(lv => {
      const cv = (c.earnedAt || {})[lv];
      const lvv = (l.earnedAt || {})[lv];
      earnedAt[lv] = cv && lvv ? Math.min(cv, lvv) : (cv || lvv);
    });
    mergedMilestones[id] = { level: Math.max(c.level || 0, l.level || 0), earnedAt };
  });
  merged.milestones = mergedMilestones;

  // Haftalik AMI boshlang'ich nuqtasi: yangiroq hafta g'olib; bir xil hafta —
  // kichik startAmi olinadi (ikki qurilmadagi o'sish to'liq ko'rinishi uchun).
  const cW = cloud.amiWeekly, lW = local.amiWeekly;
  const mergedAmiWeekly = cW && lW
    ? (cW.weekId === lW.weekId
      ? { weekId: cW.weekId, startAmi: Math.min(cW.startAmi || 0, lW.startAmi || 0) }
      : ((cW.weekId || '') > (lW.weekId || '') ? cW : lW))
    : (cW || lW);
  if (mergedAmiWeekly) merged.amiWeekly = mergedAmiWeekly;

  return merged;
};

// Eski foydalanuvchi uchun jim backfill: mavjud statistikadan darajalarni hisoblab
// achievements'ni to'ldiradi. gained E'TIBORSIZ qoldiriladi — migratsiya paytida
// ilgari qozonilgan yutuqlar uchun bildirishnoma yog'ilib ketmasligi kerak.
const withAchievements = (stateObj) => {
  const { achievements } = reconcileAchievements(stateObj, stateObj.achievements);
  const { milestones } = reconcileMilestones(stateObj, stateObj.milestones);
  return { ...stateObj, achievements, milestones };
};

// Firestore `undefined` qiymatni qabul qilmaydi — agar saqlanadigan obyektda
// (masalan spacedCards/mistakes ichida correct:undefined) bironta undefined bo'lsa,
// setDoc BUTUN yozuvni rad etadi va xato jim yutiladi → bulutga ball yozilmaydi,
// reyting 0 turadi. Shu sababli yozishdan oldin undefined'larni chuqur tozalaymiz.
// deleteField()/FieldValue kabi maxsus sentinel obyektlarga TEGMAYMIZ
// (faqat oddiy obyekt/massivga kiramiz — ularning constructor === Object emas).
const stripUndefined = (value) => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
};

// Firestore'ga yozishdan oldin tayyorlash: leaderboard maydonlari,
// vaqtinchalik kalitlar va eski davr (weekly_/monthly_) kalitlarini tozalash.
// Eski kalitlar deleteField() bilan hujjatdan ham o'chiriladi — aks holda doc cheksiz o'sadi.
// ── Foydalanuvchi faolligini `users/{uid}` ga belgilash ─────────────────────
//
// NEGA ALOHIDA YOZUV: `lastActiveAt` state ichida ham bor, lekin u
// `userStats/{uid}` ga tushadi. Admin paneli esa foydalanuvchilar ro'yxatini
// `users` kolleksiyasidan oladi — ya'ni "oxirgi faollik" ustuni HECH QACHON
// to'lmasdi (2026-08-14 auditi). Ikkalasini bitta kolleksiyaga yig'ish
// mumkin emas: `userStats` reyting uchun hammaga ochiq, `users` esa faqat
// egasi va adminga ko'rinadi (maxfiylik chegarasi).
//
// NARXI: KUNIGA BIR YOZUV. `writeCloudNow` har 3 soniyada chaqirilishi mumkin,
// shuning uchun kun bo'yicha localStorage qulfi qo'yiladi — aks holda faol
// foydalanuvchi bir seansda o'nlab ortiqcha yozuv qilardi (bepul rejada
// kunlik yozuv limiti 20 000).
const ACTIVITY_PING_KEY = (uid) => `zehin_active_ping_${uid}`;

const touchUserActivity = (uid) => {
  if (!uid) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(ACTIVITY_PING_KEY(uid)) === today) return;
    localStorage.setItem(ACTIVITY_PING_KEY(uid), today);
  } catch {
    // localStorage yopiq (private rejim) — qulfsiz davom etamiz, yozuv
    // baribir seansiga bir necha marta bo'ladi, kvota uchun xavfli emas.
  }
  // `updateDoc` ATAYLAB: hujjat yo'q bo'lsa `setDoc(merge)` uni YARATISHGA
  // urinardi va firestore.rules dagi `create` shartiga (role == 'user')
  // tushib rad etilardi. Xato jimgina yutiladi — bu ikkinchi darajali metrika,
  // uning sababli test yakuni saqlanmay qolmasligi kerak.
  updateDoc(doc(db, 'users', uid), { lastActiveAt: new Date().toISOString() })
    .catch(() => {});
};

const prepareStatsForSave = (stateObj, currentUser) => {
  const statsToSave = { ...stateObj };
  const currentName = currentUser.displayName || stateObj.displayName || currentUser.email?.split('@')[0] || '';
  statsToSave.displayName = currentName;
  statsToSave.userName = currentName;
  statsToSave.photoURL = currentUser.photoURL || stateObj.photoURL || null;
  statsToSave.avatarId = currentUser.avatarId || stateObj.avatarId || null;
  delete statsToSave.topicId;
  delete statsToSave.testMode;
  delete statsToSave.savedAt;

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const keep = new Set([
    `weekly_${getWeekId()}`,
    `weekly_${getWeekId(new Date(Date.now() - 7 * 86400000))}`,
    `monthly_${getMonthId()}`,
    `monthly_${getMonthId(prevMonth)}`
  ]);
  Object.keys(statsToSave).forEach(k => {
    if ((k.startsWith('weekly_') || k.startsWith('monthly_')) && !keep.has(k)) {
      statsToSave[k] = deleteField();
    }
  });
  // undefined'larni tozalaymiz (deleteField sentinellariga tegmaydi)
  return stripUndefined(statsToSave);
};

export const AppProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [state, setState] = useState(buildDefaultState);
  const [cloudSynced, setCloudSynced] = useState(false);
  const prevUserRef = useRef(null);
  // Foydalanuvchi shu sessiyada fanni O'ZI tanlagan bo'lsa — shu yerda turadi.
  // Sekin yuklangan statistika (loadUserStats) bu tanlovni bosib ketmasligi kerak:
  // onboardingda fan tanlash bulutdan javob kelishidan oldin bo'lishi mumkin.
  const chosenCategoryRef = useRef(null);
  // Har doim joriy user qiymatini saqlaymiz (stale closure muammosini hal qilish uchun)
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  // Oxirgi commit qilingan holat — `batchCommitResults` uni SINXRON o'qiydi (T-22).
  // Render paytida yozish — standart "latest ref" naqshi.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── 1. Foydalanuvchi kirishi/chiqishida statistikani yuklash ───
  useEffect(() => {
    // Foydalanuvchi o'zgarganda (yoki chiqqanda) — darhol state tozalash
    const prevUid = prevUserRef.current;
    const newUid = user?.uid || null;

    if (prevUid !== newUid) {
      // Foydalanuvchi o'zgardi — darhol default state ga o'tkazish
      setState(buildDefaultState());
      setCloudSynced(false);
      chosenCategoryRef.current = null;
      prevUserRef.current = newUid;
    }

    if (!user) {
      return;
    }

    // Faol fan qaysi manbadan olinadi (ustuvorlik bo'yicha):
    //   1) shu sessiyada foydalanuvchi o'zi tanlagan fan — hech qachon bosilmaydi
    //      (onboardingda fan tanlash shu yuklashdan oldin bo'lishi mumkin);
    //   2) statistikada saqlangan fan (oldingi tanlov);
    //   3) profildagi o'qituvchilik fani — onboarding uni users/{uid}.subject ga
    //      yozadi, ya'ni debounce tugashidan oldin ilova yopilsa ham tanlov
    //      yo'qolmaydi (aks holda ilova default 'chqbt' bilan ochilardi).
    // Foydalanuvchi keyin fanni almashtirsa, (2) ishlaydi va tanlovi qayta yozilmaydi.
    const profileSubject = user.subject && user.subject !== 'multi' ? user.subject : null;
    const seedCategory = (loaded, savedCategory) => {
      const cat = chosenCategoryRef.current || savedCategory || profileSubject;
      return cat ? { ...loaded, activeCategory: cat } : loaded;
    };

    // ⚠️ AUDIT 2026-08-06, T-2 BAND — hisob almashish poygasi.
    // Quyidagi yuklash ASYNC, effekt esa `user?.uid` o'zgarganda qayta ishga
    // tushadi. Avval bekor qilish mexanizmi YO'Q edi: A chiqib B kirsa va A ning
    // `getDoc` javobi hali yo'lda bo'lsa, u kech kelib A ning ma'lumotini
    // state'ga yozardi. 2-effekt esa uni `userStats/B` ga va
    // `localStorage.iqro_state_B` ga saqlardi — B ning statistikasi A niki bilan
    // almashardi. mergeCloudAndLocal monoton max() qilgani uchun buni orqaga
    // qaytarib bo'lmasdi. Sekin tarmoqda yoki umumiy qurilmada real holat.
    //
    // `cancelled` — effekt cleanup'ida yoqiladi, ya'ni uid o'zgargan zahoti
    // eski so'rovning HAMMA yon ta'siri to'siladi.
    let cancelled = false;
    const uid = user.uid;

    // Foydalanuvchi statistikasini Firestore'dan yuklash
    const loadUserStats = async () => {
      // Lokal zaxira UID bilan izolyatsiyalangan — faqat SHU foydalanuvchiniki bo'lishi mumkin
      const backup = await loadLocalBackup(uid);
      if (cancelled) return;
      // Har `setState` shu guard orqali o'tadi — kech kelgan javob hech qachon
      // boshqa foydalanuvchining holatini bosmaydi.
      const applyState = (next) => { if (!cancelled) setState(next); };
      try {
        const statRef = doc(db, 'userStats', uid);
        const snap = await getDoc(statRef);
        if (cancelled) return;
        if (snap.exists()) {
          // Bulut + lokal zaxira: hisoblagichlar max() bo'yicha birlashtiriladi,
          // shunda bulutga yetib bormagan oxirgi sessiya natijalari yo'qolmaydi
          const data = mergeCloudAndLocal(snap.data(), backup);
          applyState(() => withAchievements(seedCategory({
            ...buildDefaultState(),
            ...data,
            stats: data.stats || { chqbt: buildDefaultCatStats(), art: buildDefaultCatStats() },
            topicStats: data.topicStats || {},
            customMnemonics: data.customMnemonics || {},
            timeStats: data.timeStats || { totalTime: 0, totalQuestions: 0 }
          }, data.activeCategory)));
        } else if (backup) {
          // Bulutda hujjat yo'q, lekin shu UID ning lokal zaxirasi bor — undan tiklash
          const { savedAt, ...localState } = backup;
          applyState(withAchievements(seedCategory({ ...buildDefaultState(), ...localState }, localState.activeCategory)));
        } else {
          // Yangi foydalanuvchi — toza holat bilan boshlash
          applyState(seedCategory(buildDefaultState(), null));
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Foydalanuvchi statistikasini yuklashda xatolik:', err);
        // Oflayn/xatolikda default o'rniga lokal zaxiradan tiklash
        if (backup) {
          const { savedAt, ...localState } = backup;
          applyState(withAchievements(seedCategory({ ...buildDefaultState(), ...localState }, localState.activeCategory)));
        } else {
          applyState(seedCategory(buildDefaultState(), null));
        }
      }
      // cloudSynced 2-effektning saqlash ruxsatini ochadi — bekor qilingan
      // yuklashda uni YOQMAYMIZ, aks holda eski holat bulutga yozilardi.
      if (!cancelled) setCloudSynced(true);
    };

    loadUserStats();
    return () => { cancelled = true; };
    // Faqat UID o'zgarganda (kirish/chiqish) qayta yuklaymiz — onAuthStateChanged
    // token yangilanishi yoki tab fokusi tufayli bir xil user uchun YANGI obyekt
    // qaytarishi mumkin. Butun `user` obyektiga bog'lansak, bu har safar
    // Firestore'dan qayta yozib, joriy testdagi topicId/testMode'ni (ular bulutga
    // saqlanmaydi) defaultga qaytarib, test yechilayotganda 1-bo'limga otib ketardi.
  }, [user?.uid]);

  // ─── 2. Statistika o'zgarganda Firestore'ga saqlash (DEBOUNCED) ───
  // Har o'zgarishda emas, 3 soniya kutib, oxirgi holatni bir marta yozadi.
  // Bu test paytida ~50 ta write o'rniga 2-3 ta write qiladi.
  const saveTimerRef = useRef(null);
  const localTimerRef = useRef(null);
  const flushSaveRef = useRef(null);
  // X-1: bulutga yozuv tasdiqlanmagan bo'lsa `true` turadi
  const pendingCloudRef = useRef(false);
  const retryCloudRef = useRef(null);

  useEffect(() => {
    if (!user || !cloudSynced) return;

    // User-ga tegishli localStorage va localforage ga saqlash (offline dual-backup)
    // XAVFSIZLIK: kalit nomi user UID bilan izolyatsiya qilingan
    // savedAt — resetAt guard uchun (mergeCloudAndLocal)
    const userKey = getUserStateKey(user.uid);

    // ⚠️ AUDIT 2026-08-06, T-6 BAND — bu yozuv ilgari HAR state o'zgarishida
    // SINXRON bajarilardi. `state` esa o'lchov bo'yicha ~250 KB (spacedCards
    // savolning to'liq nusxasini saqlaydi), ya'ni `JSON.stringify` asosiy oqimni
    // har safar bloklardi. SmartReviewPage har javobda `updateState` chaqiradi —
    // demak takror sessiyasida bu har javobda takrorlanardi (jank manbai).
    // Endi lokal nusxa ham debounce bilan yoziladi; ilova fonga o'tganda esa
    // pastdagi `flushAll` uni darhol yozib qo'yadi, ya'ni himoya darajasi tushmaydi.
    const writeLocalNow = () => {
      localTimerRef.current = null;
      const serialized = JSON.stringify({ ...state, savedAt: Date.now() });
      try { localStorage.setItem(userKey, serialized); } catch (e) { console.warn('LocalStorage save error:', e); }
      localforage.setItem(userKey, serialized).catch(() => {});
    };

    // ⚠️ AUDIT 2026-08-17, X-1 BAND — bu yozuv `.catch(console.error)` bilan
    // tugardi: muvaffaqiyat TEKSHIRILMASDI va qayta urinish YO'Q edi.
    // Firestore keshi ataylab XOTIRADA (`firebase.js` — IndexedDB nosozliklari
    // sababli), demak SDK ning kutilayotgan yozuvlar navbati ham xotirada:
    // ilova yopilsa u yo'qoladi. Ya'ni «oflayn yozuv keyin o'zi ketadi» degan
    // kafolat YO'Q.
    //
    // Ikki qatlamli himoya qo'yildi:
    //   1) `pendingCloudRef` — yozuv tasdiqlanmaguncha yoqilgan turadi va
    //      pastdagi effekt tarmoq qaytganda / ilova ko'rinadigan bo'lganda
    //      qayta uradi. `merge: true` bilan takroriy yozuv idempotent.
    //   2) Ilova baribir yopilib ketsa — lokal zaxira va `mergeCloudAndLocal`
    //      keyingi kirishda tiklaydi (shu sababli merge qoidalari MUHIM).
    const writeCloudNow = () => {
      saveTimerRef.current = null;
      const statRef = doc(db, 'userStats', user.uid);
      const uidAtWrite = user.uid;
      pendingCloudRef.current = true;
      setDoc(statRef, prepareStatsForSave(state, user), { merge: true })
        .then(() => {
          // Hisob almashgan bo'lsa bu javob eskirgan — bayroqqa tegmaymiz.
          if (userRef.current?.uid === uidAtWrite) pendingCloudRef.current = false;
        })
        .catch(err => {
          // Bayroq YOQILGAN qoladi → qayta urinish effekti ko'taradi.
          console.error('userStats yozilmadi (qayta uriniladi):', err);
        });
      touchUserActivity(user.uid);
    };
    retryCloudRef.current = writeCloudNow;

    // Ikkala kutilayotgan yozuvni ham darhol bajaradi (visibilitychange uchun)
    flushSaveRef.current = () => {
      if (localTimerRef.current) { clearTimeout(localTimerRef.current); writeLocalNow(); }
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); writeCloudNow(); }
    };

    // Lokal zaxira — qisqa debounce (qulash/yopilishdan himoya tez bo'lishi kerak)
    clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(writeLocalNow, 600);

    // Firestore ga debounced yozish — 3 soniya kutib
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(writeCloudNow, 3000);

    return () => {
      clearTimeout(localTimerRef.current);
      clearTimeout(saveTimerRef.current);
    };
  }, [state, user, cloudSynced]);

  // ─── 2b. Ilova yopilayotganda kutilayotgan yozuvni DARHOL bajarish ───
  // Mobil PWA foydalanuvchilari ilovani debounce tugashidan oldin yopadi —
  // oxirgi natijalar yo'qolmasligi uchun IKKALA yozuvni ham flush qilamiz.
  //
  // ⚠️ AUDIT 2026-08-17, X-1 BAND — `pagehide` QO'SHILDI. `visibilitychange`
  // ko'p holatni qoplaydi, lekin iOS Safari/PWA da ilova bfcache'ga tushganda
  // yoki tizim uni o'ldirganda u ISHONCHLI EMAS — `pagehide` esa shu yo'lda
  // ham yonadi. Ikkalasi birga: `flushSaveRef` idempotent (kutilayotgan
  // taymer bo'lmasa hech nima qilmaydi), shuning uchun ikki marta yonishi zararsiz.
  useEffect(() => {
    const flush = () => flushSaveRef.current?.();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // ─── 2c. Tasdiqlanmagan bulut yozuvini QAYTA URINISH (X-1) ───
  // Avval yozuv bir marta yuborilib, natijasi umuman tekshirilmasdi. Endi
  // tasdiqlanmagan yozuv uchta signalda qayta uriniladi: tarmoq qaytganda,
  // ilova ko'rinadigan bo'lganda va davriy (backoff'siz — yozuv idempotent
  // va daqiqada bir marta, ya'ni arzon).
  useEffect(() => {
    const retry = () => {
      if (!pendingCloudRef.current) return;
      // `navigator.onLine === false` — ishonchli "yo'q" signali. `true` esa
      // kafolat emas (Wi-Fi bor, internet yo'q), shuning uchun unga tayanmaymiz:
      // urinib ko'ramiz, muvaffaqiyatsiz bo'lsa bayroq yoqilgan qoladi.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      retryCloudRef.current?.();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') retry(); };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', onVisible);
    const iv = setInterval(retry, 60_000);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(iv);
    };
  }, []);

  // useCallback — T-17: funksiya identifikatori barqaror bo'lmasa, pastdagi
  // `useMemo` har renderda baribir yangi qiymat yasardi.
  const updateState = useCallback((updates) => {
    // Fan tanlovi ref'da ham belgilanadi — keyinroq kelgan bulut javobi uni
    // bosib ketmasligi uchun (loadUserStats → seedCategory).
    if (updates.activeCategory) chosenCategoryRef.current = updates.activeCategory;
    return setState(prev => {
      // Fan almashtirilganda tanlangan mavzuni tiklaymiz — eski fanning mavzu IDsi
      // yangi fanda mavjud bo'lmaydi va savollar bo'sh "Mavzu tayyorlanmoqda"
      // holatiga tushib qolardi. Agar chaqiruvchi topicId ni o'zi bersa (masalan
      // SmartBottomSheet), uni buzmaymiz.
      if (
        updates.activeCategory &&
        updates.activeCategory !== prev.activeCategory &&
        updates.topicId === undefined
      ) {
        return { ...prev, ...updates, topicId: -1 };
      }
      return { ...prev, ...updates };
    });
  }, []);

  // ─── batchCommitResults: Test yakunida natijalarni BIR MARTA saqlash ───
  // TestPage test tugaganda har savol uchun alohida emas, shu funksiyani bir marta
  // chaqiradi. Bu Firestore write'larni drastik kamaytiradi (50 write → 1 write).
  const batchCommitResults = useCallback((results) => {
    let snapshot = null;
    let earnedOut = 0; // UI ga qaytariladi ("+N ball" ko'rsatish uchun)
    let gainedOut = []; // shu sessiyada YANGI olingan track darajalari (kichik — faqat Bell)
    let gainedUnvonOut = null; // shu sessiyada unvon oshgan bo'lsa (katta — toast + Bell)
    let gainedMilestonesOut = []; // shu sessiyada olingan shaxsiy marralar (Bell)
    let amiDeltaOut = 0; // shu sessiyada AMI necha ballga o'zgargani (natija ekrani uchun)
    let rewardPointsOut = 0;   // yutuq uchun berilgan qo'shimcha ball (natija ekrani)
    let rewardFreezesOut = 0;  // yutuq uchun berilgan muzlatish zaxirasi (natija ekrani)
    // Telemetriya (retention) — hodisalar updater TASHQARISIDA yuboriladi
    let goalJustDoneOut = false; // kunlik maqsad AYNAN shu sessiyada yopildi
    let streakBrokenOut = 0;     // zanjir 1 ga qaytdi — yo'qotilgan uzunlik
    let freezeUsedOut = false;   // muzlatish zaxirasi aynan bugun sarflandi

    // ⚠️ AUDIT 2026-08-06, T-22 BAND — bu hisob ilgari `setState(prev => ...)`
    // UPDATER'i ichida bajarilardi, natija esa (`snapshot`, `earnedOut`, yutuqlar)
    // updater'dan KEYIN o'qilardi. Bu React'ning KAFOLATLANMAGAN "eager state"
    // optimizatsiyasiga tayanardi: AppProvider fiber'ida kutilayotgan yangilanish
    // bo'lsa, React updater'ni sinxron chaqirmaydi va o'zgaruvchilar `null`/0
    // bo'lib qolardi → foydalanuvchiga "+0 ball", yutuq bildirishnomalari
    // yozilmasdi, darhol saqlash bajarilmasdi.
    // Endi hisob SOF funksiya sifatida oxirgi holat ustida bir marta bajariladi
    // va `setState` ga tayyor QIYMAT beriladi — xatti-harakat deterministik.
    const computeNext = (prev) => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();

      // Topic stats yangilash — har mavzu o'z ulushi bo'yicha (aralash test/imtihonda
      // ham har bo'lim alohida hisoblanadi, summarizeTestResults'dagi topicDeltas orqali)
      const newTopicStats = { ...prev.topicStats };
      const commitNow = Date.now();
      for (const [tid, delta] of Object.entries(results.topicDeltas || {})) {
        const ts = newTopicStats[tid] || { answered: 0, correct: 0 };
        newTopicStats[tid] = {
          answered: ts.answered + delta.answered,
          correct: ts.correct + delta.correct,
          // Vaqt signali — DiagnosticsEngine shoshilinch javoblar ulushidan
          // bahoning ishonch oralig'ini kengaytiradi
          timeSum: (ts.timeSum || 0) + (delta.timeSum || 0),
          fast: (ts.fast || 0) + (delta.fast || 0),
          // Oxirgi mashq vaqti — dalilning «yangiligi» (freshness) uchun.
          // 0 = noma'lum (eski ma'lumot): bunday bo'lim jazolanmaydi.
          lastAt: commitNow
        };
      }

      // Xatolarni birlashtirish
      const newMistakes = [...catStats.mistakes, ...results.newMistakes];
      while (newMistakes.length > MAX_MISTAKES_SAVED) newMistakes.shift();

      // Kunlik maqsad
      const today = new Date().toDateString();
      // Bonus uchun: maqsad bugun ALLAQACHON bajarilgan bo'lsa, qayta bonus berilmaydi
      const wasCompletedToday = prev.dailyGoal?.date === today && !!prev.dailyGoal?.completed;
      // Kunlik norma o'quv shartnomasidan: onboardingda «kuniga 30 daqiqa»
      // degan odamning normasi 20 ta savol emas. Norma kuniga BIR MARTA
      // belgilanadi — byudjet kun o'rtasida o'zgarsa, bugungi maqsad (va u
      // bilan zanjir) qayta hisoblanib ketmaydi.
      const dg = prev.dailyGoal?.date === today
        ? { ...prev.dailyGoal, answered: (prev.dailyGoal.answered || 0) + results.totalAnswered }
        : {
            date: today,
            answered: results.totalAnswered,
            target: questionsForMinutes(readContract().dailyMinutes, avgSecondsPerQuestion(prev)),
            completed: false,
          };
      if (!dg.completed && dg.answered >= dg.target) dg.completed = true;

      // Kunlik streak
      const { dailyStreak, lastGoalDate, streakFreezes, streakFrozenDate } = advanceDailyStreak(prev, today, dg.completed);

      // Telemetriya uchun capture — `gainedOut` bilan bir xil naqsh: shu yerda
      // faqat QIYMAT olinadi, hodisaning o'zi updater tashqarisida yuboriladi
      // (StrictMode updater'ni ikki marta chaqiradi — hodisa takrorlanmasin).
      goalJustDoneOut = dg.completed && !wasCompletedToday;
      streakBrokenOut = goalJustDoneOut && dailyStreak === 1 && (prev.dailyStreak || 0) > 1
        ? prev.dailyStreak
        : 0;
      freezeUsedOut = streakFrozenDate === today && prev.streakFrozenDate !== today;

      // Streak
      const newStreak = results.wrongCount > 0 ? 0 : catStats.streak + results.correctCount;
      const newMaxStreak = Math.max(catStats.maxStreak, newStreak);

      // Ketma-ket to'g'ri javoblar zanjiri («zanjir» marrasi) — sessiyalar
      // orasida uziladi emas: oldingi zanjir sessiya boshidagi zanjirga ulanadi.
      const prevRun = prev.correctRun || 0;
      const leadingRun = results.leadingRun ?? 0;
      const trailingRun = results.trailingRun ?? 0;
      const sessionAnswered = results.totalAnswered || 0;
      const allCorrect = sessionAnswered > 0 && results.wrongCount === 0;
      // Bitta ham javob berilmagan sessiya (masalan imtihon taymeri bo'sh ekranda
      // tugadi) zanjirni UZMAYDI — aks holda ilovani ochib qo'yishning o'zi
      // shaxsiy rekordni nolga tushirardi.
      const correctRun = sessionAnswered === 0
        ? prevRun
        : (allCorrect ? prevRun + sessionAnswered : trailingRun);
      const maxCorrectRun = Math.max(
        prev.maxCorrectRun || 0,
        prevRun + leadingRun,              // oldingi zanjirning davomi
        results.maxRunInSession || 0,      // sessiya ichidagi eng uzun zanjir
        correctRun
      );

      // Kunlik maqsad bajarilgan KUNLAR soni — zanjir uzilsa ham saqlanadi
      const goalDaysTotal = (prev.goalDaysTotal || 0) + (dg.completed && !wasCompletedToday ? 1 : 0);

      // Vaqt statistikasi (Time Analytics)
      const sessionTime = results.sessionTime || 0;
      const sessionQuestions = results.totalAnswered || 0;
      const currentTimeStats = prev.timeStats || { totalTime: 0, totalQuestions: 0 };

      const weekId = getWeekId();
      const monthId = getMonthId();
      const currentWeeklyScore = prev[`weekly_${weekId}`] || 0;
      const currentMonthlyScore = prev[`monthly_${monthId}`] || 0;

      // Ball hisoblash: yangi savol — 2, vaqti kelgan takror — 1,
      // kunlik maqsad shu sessiyada birinchi marta bajarilsa — +5 bonus
      const goalBonus = dg.completed && !wasCompletedToday ? DAILY_GOAL_BONUS : 0;
      const earnedPoints =
        (results.newCorrectCount || 0) * POINTS_NEW_CORRECT +
        (results.dueReviewCorrectCount || 0) * POINTS_DUE_REVIEW +
        goalBonus;

      // Night owl / Early bird / Perfect exam metrics
      const currentHour = new Date().getHours();
      let nightQuestionsAdded = 0;
      let earlyQuestionsAdded = 0;
      if (currentHour >= 0 && currentHour < 5) {
        nightQuestionsAdded = results.totalAnswered || 0;
      } else if (currentHour >= 5 && currentHour < 8) {
        earlyQuestionsAdded = results.totalAnswered || 0;
      }
      let perfectExamAdded = 0;
      if (results.totalAnswered >= 20 && results.wrongCount === 0 && results.correctCount === results.totalAnswered) {
        perfectExamAdded = 1;
      }

      // Sinov yo'nalishi (tracks.js): 10+ savollik sessiya "imtihon" hisoblanadi.
      // 90%+ natija zanjirni davom ettiradi, undan past natija uzadi.
      let examStreak90 = prev.examStreak90 || 0;
      if ((results.totalAnswered || 0) >= EXAM_MIN_QUESTIONS) {
        examStreak90 = results.correctCount / results.totalAnswered >= 0.9 ? examStreak90 + 1 : 0;
      }

      const newState = {
        ...prev,
        totalScore: (prev.totalScore || 0) + earnedPoints,
        [`weekly_${weekId}`]: currentWeeklyScore + earnedPoints,
        [`monthly_${monthId}`]: currentMonthlyScore + earnedPoints,
        totalAnswered: prev.totalAnswered + results.totalAnswered,
        totalCorrect: prev.totalCorrect + results.correctCount,
        nightQuestions: (prev.nightQuestions || 0) + nightQuestionsAdded,
        earlyQuestions: (prev.earlyQuestions || 0) + earlyQuestionsAdded,
        perfectExamsCount: (prev.perfectExamsCount || 0) + perfectExamAdded,
        examStreak90,
        topicStats: newTopicStats,
        dailyGoal: dg,
        dailyStreak,
        lastGoalDate,
        streakFreezes,
        streakFrozenDate,
        goalDaysTotal,
        correctRun,
        maxCorrectRun,
        spacedCards: results.updatedSpacedCards || prev.spacedCards,
        timeStats: {
          totalTime: currentTimeStats.totalTime + sessionTime,
          totalQuestions: currentTimeStats.totalQuestions + sessionQuestions
        },
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            totalAnswered: catStats.totalAnswered + results.totalAnswered,
            totalCorrect: catStats.totalCorrect + results.correctCount,
            streak: newStreak,
            maxStreak: newMaxStreak,
            mistakes: newMistakes
          }
        }
      };

      // Akademik darajalarni qayta baholash — yangi metrikalar asosida (sof hisob).
      // gained faqat capture qilinadi; bildirishnoma yon ta'siri updater TASHQARISIDA.
      const prevAmi = prev.achievements?.ami || 0;
      const { achievements, gained, gainedUnvon } = reconcileAchievements(newState, prev.achievements);
      newState.achievements = achievements;
      gainedOut = gained;
      gainedUnvonOut = gainedUnvon;
      amiDeltaOut = achievements.ami - prevAmi;

      // ── Yutuq mukofoti ────────────────────────────────────────────────
      // Daraja MONOTON bo'lgani uchun (reconcileAchievements pastga tushirmaydi)
      // `gained` bir darajani faqat BIR MARTA qaytaradi — mukofot ham bir marta
      // beriladi, qayta hisoblash yoki qurilma almashtirish uni takrorlamaydi.
      // Muzlatish zaxirasi cap bilan: mukofot zaxirani cheksiz to'plash yo'liga
      // aylanmasligi kerak.
      if (gained.length > 0 || gainedUnvon) {
        rewardPointsOut = gained.length * TIER_REWARD_POINTS + (gainedUnvon ? UNVON_REWARD_POINTS : 0);
        newState.totalScore += rewardPointsOut;
        newState[`weekly_${weekId}`] += rewardPointsOut;
        newState[`monthly_${monthId}`] += rewardPointsOut;

        if (gained.length > 0) {
          const before = newState.streakFreezes || 0;
          newState.streakFreezes = Math.min(STREAK_FREEZE_MAX, before + gained.length);
          rewardFreezesOut = newState.streakFreezes - before;  // cap tufayli 0 bo'lishi mumkin
        }
      }

      // Shaxsiy marralar — AMI'ga ta'sir qilmaydi (milestones.js izohiga qarang)
      const ms = reconcileMilestones(newState, prev.milestones);
      newState.milestones = ms.milestones;
      gainedMilestonesOut = ms.gained;

      // Tayyorlik darajasi — bulutga saqlanadi (maktab hisoboti shu maydonni o'qiydi).
      // ATAYIN topicTotals BERILMAYDI: og'irliklar lokal savol keshiga bog'liq
      // bo'lsa, bir xil natijali ikki o'qituvchi turli ball olishi mumkin edi.
      // Ulashiladigan raqam qurilmaga bog'liq bo'lmagan og'irlikda hisoblanadi:
      // spetsifikatsiyasi bor fanda RASMIY taqsimot (examBlueprint), aks holda
      // teng og'irlik. Blueprint statik bo'lgani uchun bu qoidani buzmaydi —
      // aksincha, UI'dagi raqam bilan bulutdagisi endi bir xil chiqadi.
      // goalScore ATAYIN shaxsiy maqsad EMAS, umumiy standart: pastda faqat
      // maqsaddan mustaqil maydonlar (score/knowledge/margin/confidence)
      // saqlanadi, maktab hisoboti esa taqqoslanadigan bo'lib qolishi kerak.
      const shared = computeDiagnostics(newState, {
        goalScore: EXAM_GOAL_SCORE,
        examQuestions: BATCH_SIZE,
      });
      newState.readiness = {
        ...(prev.readiness || {}),
        [cat]: {
          score: shared.readiness,
          // Taxmin ulushi ajratilgan bilim va bahoning xatolik chegarasi —
          // maktab hisobotida «77% lekin ±17» ni ajrata olish uchun
          knowledge: shared.knowledge,
          margin: shared.margin,
          confidence: Math.round(shared.confidence * 100),
          answered: shared.answered,
          updatedAt: new Date().toISOString(),
        },
      };

      // Tendensiya — HAFTASIGA bitta nuqta (oxirgi qiymat haftani ifodalaydi).
      // Har testdan keyin nuqta qo'shilsa, ro'yxat tez to'lib ketardi va
      // grafik «kun ichidagi shovqin»ni ko'rsatardi, o'sishni emas.
      const catHistory = [...((prev.readinessHistory || {})[cat] || [])];
      const lastPoint = catHistory[catHistory.length - 1];
      const point = { w: weekId, s: shared.readiness, k: shared.knowledge };
      if (lastPoint?.w === weekId) catHistory[catHistory.length - 1] = point;
      else catHistory.push(point);
      while (catHistory.length > READINESS_HISTORY_WEEKS) catHistory.shift();
      newState.readinessHistory = { ...(prev.readinessHistory || {}), [cat]: catHistory };

      // Faollik kalendari — haftalik panjara uchun (kun, javoblar soni, maqsad)
      const days = [...(prev.activeDays || [])];
      const todayIdx = days.findIndex(x => x.d === today);
      const todayEntry = { d: today, a: dg.answered, g: !!dg.completed };
      if (todayIdx >= 0) days[todayIdx] = todayEntry;
      else days.push(todayEntry);
      while (days.length > ACTIVE_DAYS_KEPT) days.shift();
      newState.activeDays = days;

      newState.lastActiveAt = new Date().toISOString();

      // Haftalik AMI o'sishi: hafta almashganda commit-dan OLDINGI AMI
      // boshlang'ich nuqta qilib yoziladi.
      newState.amiWeekly = prev.amiWeekly?.weekId === weekId
        ? prev.amiWeekly
        : { weekId, startAmi: prevAmi };

      snapshot = newState; // sof hisob — faqat hisoblaydi va natijani capture qiladi
      earnedOut = earnedPoints + rewardPointsOut; // "+N ball" yutuq mukofotini ham o'z ichiga oladi
      return newState;
    };

    setState(computeNext(stateRef.current));

    // ── Retention telemetriyasi ───────────────────────────────────────────
    // Firestore yozuvidan OLDIN va `currentUser` tekshiruvidan oldin turadi:
    // hodisalar hisobga bog'liq emas va mehmon sessiyasi ham o'lchanishi kerak.
    if (snapshot && goalJustDoneOut) {
      AnalyticsEvents.goalCompleted(snapshot.dailyGoal?.target || 0, snapshot.dailyStreak || 0);
      AnalyticsEvents.streakDay(snapshot.dailyStreak || 0);
      if (streakBrokenOut > 0) AnalyticsEvents.streakBroken(streakBrokenOut);
      if (freezeUsedOut) AnalyticsEvents.freezeUsed(snapshot.streakFreezes || 0);
    }

    // Yon ta'sir (Firestore yozuvi) setState updater'idan TASHQARIDA bajariladi —
    // React 18 StrictMode updater'ni ikki marta chaqirganda dublikat write bo'lmaydi.
    // Natija debounce kutmasdan darhol saqlanadi (test yakunida yo'qolmasligi uchun).
    if (!snapshot) return { earnedPoints: earnedOut, amiDelta: amiDeltaOut, gained: gainedOut, gainedUnvon: gainedUnvonOut, gainedMilestones: gainedMilestonesOut, rewardPoints: rewardPointsOut, rewardFreezes: rewardFreezesOut };
    const currentUser = userRef.current;
    if (!currentUser) return { earnedPoints: earnedOut, amiDelta: amiDeltaOut, gained: gainedOut, gainedUnvon: gainedUnvonOut, gainedMilestones: gainedMilestonesOut, rewardPoints: rewardPointsOut, rewardFreezes: rewardFreezesOut };
    const statRef = doc(db, 'userStats', currentUser.uid);
    setDoc(statRef, prepareStatsForSave(snapshot, currentUser), { merge: true }).catch(err => {
      console.error('Natijalarni saqlashda xatolik:', err);
      showToast('Natijalar vaqtincha saqlanmadi. Internet aloqasini tekshiring.', 'error');
    });

    // ── Savol statistikasi uchun xom yozuv (ADMIN UX AUDIT 2026-08-18, A-1) ──
    //
    // NEGA ALOHIDA HUJJAT: buni `userStats` ichiga qo'shsa hujjat cheksiz
    // o'sardi (1 MB chegarasi) va har saqlashda butun jurnal qayta yozilardi.
    // Alohida hujjat — sessiyaga BITTA yozuv; cron uni agregatlab o'chiradi,
    // ya'ni kolleksiya doim kichik qoladi.
    //
    // NARXI: kuniga 200 ta test = 200 ta yozuv (bepul kunlik chegara 20 000).
    // Javoblar soniga bog'liq EMAS — 50 savollik imtihon ham 1 ta yozuv.
    //
    // Xato asosiy oqimni to'xtatmaydi: statistika yo'qolsa foydalanuvchi
    // buni sezmaydi, natijasi esa yuqorida allaqachon saqlangan.
    const answerLog = results.answerLog;
    if (Array.isArray(answerLog) && answerLog.length > 0) {
      addDoc(collection(db, 'answerEvents'), {
        uid: currentUser.uid,
        category: snapshot.activeCategory || null,
        log: answerLog,
        createdAt: new Date().toISOString(),
      }).catch(err => {
        // Jimgina — bu telemetriya, foydalanuvchi ishiga aloqasi yo'q.
        console.warn('answerEvents yozilmadi (statistika):', err?.message || err);
      });
    }

    // Ikki darajali sokin bildirishnoma (achievements-tracks-v2 dizayni):
    // KICHIK (bitta yo'nalish tier'i oshdi) — faqat Bell'ga, toast YO'Q (chalg'itmaslik uchun).
    // KATTA (pasport unvoni o'zgardi) — toast + Bell, akademik/passiv ohangda.
    // addDoc xatosi asosiy oqimga ta'sir qilmaydi (masalan, rules hali deploy qilinmagan bo'lsa).
    if (gainedOut.length > 0) {
      gainedOut.forEach(g => {
        addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
          type: 'achievement',
          trackId: g.trackId,
          tier: g.tier,
          title: i18n.t('tracks.notifTitle'),
          message: i18n.t('tracks.notifBody', {
            track: i18n.t(`tracks.${g.trackId}.name`),
            tier: i18n.t(`tracks.tier${g.tier}`)
          }),
          date: new Date().toISOString(),
          read: false
        }).catch(err => console.warn('Yutuq bildirishnomasi yozilmadi:', err?.code || err));
      });
    }
    // Shaxsiy marralar — faqat Bell (toast YO'Q). Marralar odat qatlami bo'lgani
    // uchun tez-tez qo'lga kiritiladi; toast bo'lsa ekran bildirishnomaga to'lardi.
    if (gainedMilestonesOut.length > 0) {
      gainedMilestonesOut.forEach(g => {
        addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
          type: 'milestone',
          milestoneId: g.milestoneId,
          level: g.level,
          title: i18n.t('milestones.notifTitle'),
          message: i18n.t('milestones.notifBody', {
            name: i18n.t(`milestones.${g.milestoneId}.name`),
            target: g.target,
            unit: i18n.t(`milestones.unit.${MILESTONE_UNITS[g.milestoneId] || 'q'}`)
          }),
          date: new Date().toISOString(),
          read: false
        }).catch(err => console.warn('Marra bildirishnomasi yozilmadi:', err?.code || err));
      });
    }
    if (gainedUnvonOut) {
      const unvonLabel = i18n.t(`tracks.tier${gainedUnvonOut.tier}`);
      showToast(i18n.t('tracks.unvonToast', { unvon: unvonLabel }), 'success');
      addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        type: 'unvon',
        tier: gainedUnvonOut.tier,
        title: i18n.t('tracks.unvonNotifTitle'),
        message: i18n.t('tracks.unvonNotifBody', { unvon: unvonLabel }),
        date: new Date().toISOString(),
        read: false
      }).catch(err => console.warn('Unvon bildirishnomasi yozilmadi:', err?.code || err));
    }
    return { earnedPoints: earnedOut, amiDelta: amiDeltaOut, gained: gainedOut, gainedUnvon: gainedUnvonOut, gainedMilestones: gainedMilestonesOut, rewardPoints: rewardPointsOut, rewardFreezes: rewardFreezesOut };
  }, [showToast]);

  // Shaxsiy mnemonika saqlash
  const saveCustomMnemonic = useCallback((qHash, text) => {
    setState(prev => ({
      ...prev,
      customMnemonics: {
        ...(prev.customMnemonics || {}),
        [qHash]: text
      }
    }));
  }, []);

  // ─── Statistikani reset qilish ───
  /**
   * completeDailyPlan — bugungi o'quv rejasi to'liq bajarilganini qayd etadi.
   *
   * MUAMMO: kunlik maqsad faqat SAVOL SONI bilan yopilardi (`answered >= target`),
   * savollar esa faqat TestPage/ExamPage'dan keladi. Rejadagi «takror navbatini
   * yopish» (/review) va «xatolar ustida ishlash» (/errors) qadamlari esa
   * `batchCommitResults` ni umuman chaqirmaydi. Ya'ni foydalanuvchi rejani
   * to'liq bajarsa ham zanjiri uzilishi mumkin edi — reja bo'yicha ishlagani
   * uchun JAZOLANARDI.
   *
   * AMI uchun alohida kod kerak emas: `barqarorlik` treki `dailyStreak` dan
   * hisoblanadi (data/tracks.js), demak zanjir o'sishi AMI'ni o'zi ko'taradi.
   *
   * Idempotent: kuniga faqat bir marta ta'sir qiladi (React StrictMode
   * updater'ni ikki marta chaqirsa ham xavfsiz).
   */
  // useCallback SHART: useDailyPlan buni effect dep-massivida ishlatadi,
  // har renderda yangi funksiya bo'lsa effect keraksiz qayta ishga tushardi.
  const completeDailyPlan = useCallback(() => {
    let snapshot = null;
    // Telemetriya — batchCommitResults bilan bir xil naqsh
    let streakBroken = 0;
    let freezeUsed = false;
    setState(prev => {
      const today = new Date().toDateString();
      // Bugun allaqachon yopilgan — hech narsa o'zgarmaydi
      if (prev.dailyGoal?.date === today && prev.dailyGoal?.completed) return prev;

      const dg = prev.dailyGoal?.date === today
        ? { ...prev.dailyGoal, completed: true }
        : {
            date: today,
            answered: 0,
            target: questionsForMinutes(readContract().dailyMinutes, avgSecondsPerQuestion(prev)),
            completed: true,
          };

      const streak = advanceDailyStreak(prev, today, true);

      streakBroken = streak.dailyStreak === 1 && (prev.dailyStreak || 0) > 1 ? prev.dailyStreak : 0;
      freezeUsed = streak.streakFrozenDate === today && prev.streakFrozenDate !== today;

      const days = [...(prev.activeDays || [])];
      const idx = days.findIndex(x => x.d === today);
      const entry = { d: today, a: dg.answered, g: true };
      if (idx >= 0) days[idx] = entry; else days.push(entry);
      while (days.length > ACTIVE_DAYS_KEPT) days.shift();

      const next = {
        ...prev,
        dailyGoal: dg,
        dailyStreak: streak.dailyStreak,
        lastGoalDate: streak.lastGoalDate,
        streakFreezes: streak.streakFreezes,
        streakFrozenDate: streak.streakFrozenDate,
        goalDaysTotal: (prev.goalDaysTotal || 0) + 1,
        activeDays: days,
        lastActiveAt: new Date().toISOString(),
      };

      // Zanjir o'sgani `barqarorlik` bosqichini oshirgan bo'lishi mumkin
      const { achievements } = reconcileAchievements(next, prev.achievements);
      next.achievements = achievements;

      snapshot = next;
      return next;
    });

    // Yon ta'sirlar updater'dan TASHQARIDA — StrictMode dublikat yozmasin.
    // `snapshot` null bo'lsa maqsad bugun allaqachon yopilgan edi (erta return).
    if (snapshot) {
      AnalyticsEvents.goalCompleted(snapshot.dailyGoal?.target || 0, snapshot.dailyStreak || 0);
      AnalyticsEvents.streakDay(snapshot.dailyStreak || 0);
      if (streakBroken > 0) AnalyticsEvents.streakBroken(streakBroken);
      if (freezeUsed) AnalyticsEvents.freezeUsed(snapshot.streakFreezes || 0);
    }

    const currentUser = userRef.current;
    if (snapshot && currentUser) {
      setDoc(doc(db, 'userStats', currentUser.uid), prepareStatsForSave(snapshot, currentUser), { merge: true })
        .catch(err => console.error('Reja holatini saqlashda xatolik:', err));
    }
  }, []);

  const resetStats = useCallback(async () => {
    // resetAt — boshqa qurilmadagi eski lokal zaxira resetni "bekor qilmasligi" uchun guard
    const fresh = { ...buildDefaultState(), resetAt: Date.now() };
    setState(fresh);
    if (user) {
      // User-specific localStorage ni tozalash
      localStorage.removeItem(getUserStateKey(user.uid));
      await setDoc(doc(db, 'userStats', user.uid), fresh, { merge: false });
    }
    showToast("Statistika tozalandi", 'info');
  }, [user, showToast]);

  // ─── Xatolarni o'chirish va tozalash ───
  const deleteMistake = useCallback((questionText) => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();
      const newMistakes = catStats.mistakes.filter(m => m.question !== questionText);
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            mistakes: newMistakes
          }
        }
      };
    });
  }, []);

  const clearMistakes = useCallback(() => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            mistakes: []
          }
        }
      };
    });
  }, []);

  // ⚠️ AUDIT 2026-08-06, T-17 BAND — context qiymati har renderda YANGI obyekt
  // sifatida yasalardi. `useMemo` bilan u endi faqat haqiqiy bog'liqlik
  // o'zgarganda yangilanadi (masalan AuthContext'dan `user` obyekti yangilanib,
  // lekin statistika o'zgarmagan holatda ortiqcha qayta render bo'lmaydi).
  //
  // DIQQAT — bu TO'LIQ yechim emas: `state` o'zgarganda qiymat baribir
  // yangilanadi va React barcha iste'molchilarni qayta render qiladi, hatto
  // ular faqat funksiyalardan foydalansa ham. To'liq yechim — context'ni ikkiga
  // bo'lish (holat / amallar), lekin u barcha iste'molchilarga tegadi va
  // alohida ish sifatida rejalashtirilishi kerak.
  const contextValue = React.useMemo(() => ({
    state,
    updateState,
    batchCommitResults,
    completeDailyPlan,
    resetStats,
    deleteMistake,
    clearMistakes,
    saveCustomMnemonic,
    cloudSynced
  }), [state, updateState, batchCommitResults, completeDailyPlan, resetStats, deleteMistake, clearMistakes, saveCustomMnemonic, cloudSynced]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
