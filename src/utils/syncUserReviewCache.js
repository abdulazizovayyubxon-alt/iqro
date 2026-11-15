import localforage from 'localforage';
import { auth } from '../firebase';
import { getSettings } from './settingsCache';
import { processQuestionsOnTheFly } from './questionFixer';
import { questionKey, isHeavyCard } from '../engine/SmartQuestionEngine';
import { mistakeKey, pruneMistakes } from '../engine/mistakeQueue';
import { TOPICS } from '../data/mockData';
import { topicsOfCategory } from '../data/pedAudience';
import { MAX_MISTAKES_SAVED } from '../config';

/**
 * Savol matnini eski va yangi tahrirlar o'rtasida solishtirish uchun
 * yumshatilgan (loose) kalitga keltiradi.
 * Bu `id` saqlanmagan eski `spacedCards` va `mistakes` yozuvlarini ham
 * tahrirlangan yangi savolga 100% bog'lash imkonini beradi.
 */
export function looseQuestionKey(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/\s*\(\s*savol\s+kodi\s*:\s*#[a-z0-9_-]+\s*\)/gi, '')
    .replace(/\s*\(1\s*sm\s*da\s*\d+\s*metr(?:\s*=\s*\d+\s*km)?\)/gi, '')
    .replace(/\b52-modda/gi, '64-modda')
    .replace(/fevral\s*[-–]\s*mart\s+oylar/gi, 'mart – aprel oylar')
    .replace(/o'rtoq\s+kapitan/gi, 'hurmatli kapitan')
    .replace(/«o'rtoq\s+ofitserlar!»/gi, '«ofitser janoblari!»')
    .replace(/«diqqat!»\s*(?:ya'ni\s*smirno\s*)?komandasi/gi, '«rostlan!» komandasi')
    .replace(/«diqqat!»\s*ya'ni\s*smirno/gi, '«rostlan!»')
    .replace(/\brota\s+dnevalniysi\b/gi, "bo'linma bo'yicha posbon")
    .replace(/\bkunlik\s+navbatchi\s*\(dnevalniy\)/gi, "bo'linma bo'yicha posbon")
    .replace(/\bdnevalniylar\b/gi, "bo'linma bo'yicha posbonlar")
    .replace(/\bdnevalniy\b/gi, "bo'linma bo'yicha posbon")
    .replace(/\brazvodyashchiy\b/gi, 'tarqatuvchi')
    .replace(/\brazvodyashiy\b/gi, 'tarqatuvchi')
    .replace(/\bstroevoy\s+shag\b/gi, 'shaxdam qadam (saf qadami)')
    .replace(/(^|[\s«"(])45\s*mm\b/g, '$15,45 mm')
    .replace(/(^|[\s«"(])62\s*mm\b/g, '$17,62 mm')
    .replace(/[^a-z0-9\u0400-\u04ff']/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tanlangan fan uchun eng so'nggi savollar paketini (`bundle_v2_${category}`)
 * `settings/version.dbVersion` asosida yuklaydi va ekranga tayyor (`processQuestionsOnTheFly`)
 * savollar ro'yxati hamda qidiruv xarita (Map)larini qaytaradi.
 */
export async function loadFreshCategoryBank(category) {
  if (!category) return { ready: false, list: [], byId: new Map(), byKey: new Map(), byLoose: new Map() };

  const cacheKey = `bundle_v2_${category}`;
  const versionKey = `version_v2_${category}`;
  const vData = (await getSettings('version', { scope: 'session', ttlMs: null }).catch(() => null)) || { dbVersion: 0 };
  const remoteVer = vData.dbVersion || 0;
  const localVer = await localforage.getItem(versionKey);
  let cached = await localforage.getItem(cacheKey);

  if ((!Array.isArray(cached) || cached.length === 0 || (remoteVer > 0 && localVer !== remoteVer)) && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/get-questions?category=${encodeURIComponent(category)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fresh = await res.json();
        if (Array.isArray(fresh) && fresh.length > 0) {
          cached = fresh;
          await localforage.setItem(cacheKey, fresh);
          if (remoteVer > 0) await localforage.setItem(versionKey, remoteVer);
        }
      }
    } catch (_) {
      /* tarmoq xatosida mavjud keshdan foydalaniladi */
    }
  }

  if (!Array.isArray(cached) || cached.length === 0) {
    return { ready: false, list: [], byId: new Map(), byKey: new Map(), byLoose: new Map() };
  }

  const categoryQuestions = cached.filter(q => !q.category || q.category === category);
  const cleaned = processQuestionsOnTheFly(categoryQuestions);
  const byId = new Map();
  const byKey = new Map();
  const byLoose = new Map();

  for (const bq of cleaned) {
    if (!bq) continue;
    if (bq.id) byId.set(bq.id, bq);
    if (bq.q) {
      byKey.set(questionKey(bq), bq);
      const lk = looseQuestionKey(bq.q);
      if (lk && !byLoose.has(lk)) byLoose.set(lk, bq);
    }
  }

  return {
    ready: cleaned.length > 0,
    list: cleaned,
    byId,
    byKey,
    byLoose,
  };
}

/**
 * Foydalanuvchining `spacedCards` (Takrorlash) va `stats[category].mistakes`
 * (Xatolar daftari / Xatolar ustida ishlash) ro'yxatlarini yangilangan savollar
 * bazasi bilan sinxronlaydi:
 *   1) Savol matni, variantlari, to'g'ri javobi yoki izohi o'zgargan bo'lsa —
 *      yangi tahrirga va yangi `qHash` ga o'tkazadi.
 *   2) Bazadan butunlay olib tashlangan yoki almashtirilgan (va `id` ga ega bo'lmagan)
 *      eski savollarni navbatdan tozalaydi, shunda foydalanuvchi hech qachon
 *      eski/xato savolni qayta ko'rmaydi.
 */
export function reconcileReviewDataWithBank(category, state, bank) {
  if (!bank?.ready || !state) {
    return {
      changed: false,
      spacedCards: state?.spacedCards || [],
      mistakes: state?.stats?.[category]?.mistakes || [],
    };
  }

  const { byId, byKey, byLoose } = bank;
  const validTopicIds = new Set(topicsOfCategory(category).map(t => t.id));
  for (const tp of TOPICS) {
    const matchCat = Array.isArray(tp.category) ? tp.category.includes(category) : tp.category === category;
    if (matchCat) validTopicIds.add(tp.id);
  }

  let spacedChanged = false;
  const nextSpacedCards = [];
  const seenSpacedHashes = new Set();

  for (const c of state.spacedCards || []) {
    if (!c) continue;
    // Boshqa fan kartasi yoki tanasi yo'q «yengil» karta — o'zgarishsiz qoladi
    if (!validTopicIds.has(c.topicId) || !isHeavyCard(c)) {
      nextSpacedCards.push(c);
      continue;
    }

    const fresh =
      (c.id && byId.get(c.id)) ||
      byKey.get(c.q ? questionKey(c) : c.qHash) ||
      (c.qHash && byKey.get(c.qHash)) ||
      (c.q && byLoose.get(looseQuestionKey(c.q)));

    if (!fresh) {
      // Ushbu fanga tegishli og'ir karta yangi bazada umuman yo'q (eski/almashtirilgan savol) —
      // Takrorlash menyusida eski savol chiqmasligi uchun olib tashlaymiz.
      spacedChanged = true;
      continue;
    }

    const freshHash = questionKey(fresh);
    if (seenSpacedHashes.has(freshHash)) {
      spacedChanged = true;
      continue;
    }
    seenSpacedHashes.add(freshHash);

    const optsSame =
      Array.isArray(c.opts) &&
      Array.isArray(fresh.opts) &&
      c.opts.length === fresh.opts.length &&
      c.opts.every((o, i) => o === fresh.opts[i]);

    const needsUpdate =
      c.id !== fresh.id ||
      c.q !== fresh.q ||
      c.qHash !== freshHash ||
      c.correct !== fresh.correct ||
      (fresh.explanation && c.explanation !== fresh.explanation) ||
      !optsSame;

    if (needsUpdate) {
      spacedChanged = true;
      nextSpacedCards.push({
        ...c,
        ...(fresh.id ? { id: fresh.id } : {}),
        qHash: freshHash,
        topicId: fresh.topicId ?? c.topicId,
        q: fresh.q,
        opts: fresh.opts,
        correct: fresh.correct,
        explanation: fresh.explanation || c.explanation,
        ...(fresh.image !== undefined ? { image: fresh.image } : {}),
        ...(fresh.isHtml !== undefined ? { isHtml: fresh.isHtml } : {}),
      });
    } else {
      nextSpacedCards.push(c);
    }
  }

  let mistakesChanged = false;
  const rawMistakes = state?.stats?.[category]?.mistakes || [];
  const nextMistakesRaw = [];
  const seenMistakeHashes = new Set();

  for (const m of rawMistakes) {
    if (!m) continue;
    const fresh =
      (m.id && byId.get(m.id)) ||
      byKey.get(mistakeKey(m)) ||
      (m.qHash && byKey.get(m.qHash)) ||
      (m.question && byLoose.get(looseQuestionKey(m.question)));

    if (!fresh) {
      // Yangi bazada mavjud bo'lmagan eski xato savol — Xatolar daftaridan tozalaymiz
      mistakesChanged = true;
      continue;
    }

    const freshHash = questionKey(fresh);
    if (seenMistakeHashes.has(freshHash)) {
      mistakesChanged = true;
      continue;
    }
    seenMistakeHashes.add(freshHash);

    const freshCorrectText = fresh.opts?.[fresh.correct] ?? m.correct;
    const freshTopicName = TOPICS.find(t => t.id === (fresh.topicId ?? m.topicId))?.name || m.topic || 'Aralash';
    const optsSame =
      Array.isArray(m.opts) &&
      Array.isArray(fresh.opts) &&
      m.opts.length === fresh.opts.length &&
      m.opts.every((o, i) => o === fresh.opts[i]);

    const needsUpdate =
      m.id !== fresh.id ||
      m.question !== fresh.q ||
      m.qHash !== freshHash ||
      m.correct !== freshCorrectText ||
      (fresh.explanation && m.explanation !== fresh.explanation) ||
      !optsSame;

    if (needsUpdate) {
      mistakesChanged = true;
      nextMistakesRaw.push({
        ...m,
        ...(fresh.id ? { id: fresh.id } : {}),
        qHash: freshHash,
        topic: freshTopicName,
        topicId: fresh.topicId ?? m.topicId,
        question: fresh.q,
        opts: fresh.opts,
        correct: freshCorrectText,
        explanation: fresh.explanation || m.explanation,
        ...(fresh.mnemonic ? { mnemonic: fresh.mnemonic } : {}),
      });
    } else {
      nextMistakesRaw.push(m);
    }
  }

  const nextMistakes = mistakesChanged ? pruneMistakes(nextMistakesRaw, MAX_MISTAKES_SAVED) : rawMistakes;

  return {
    changed: spacedChanged || mistakesChanged,
    spacedChanged,
    mistakesChanged,
    spacedCards: spacedChanged ? nextSpacedCards : state.spacedCards || [],
    mistakes: nextMistakes,
  };
}
