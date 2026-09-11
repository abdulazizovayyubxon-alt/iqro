import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { countTopics, peekPreparedBank, warmPreparedBank } from '../utils/questionBank';

/**
 * Fan bo'yicha { [topicId]: bazadagi savollar soni } — lokal savol keshidan.
 * Kesh bo'lmasa bo'sh obyekt qaytadi (chaqiruvchi teng og'irlikka o'tadi).
 * AchievementsPage'dagi bir xil mantiq shu yerga yig'ilgan.
 *
 * ⚠️ 2026-09-11 — Bosh sahifa HAR ochilganda 3.25 MB lik paket IndexedDB'dan
 * qayta o'qilardi (kompyuterda 17–22 ms, telefonda ~100 ms), faqat sanash
 * uchun. Endi natija fan+versiya bo'yicha xotirada qoladi; paket faqat
 * birinchi marta o'qiladi va o'sha nusxa Test/Imtihon uchun bo'sh vaqtda
 * oldindan tayyorlab qo'yiladi (utils/questionBank.js).
 */
const totalsMemo = new Map(); // cat → { version, totals }

export function useTopicTotals(cat) {
  const [totals, setTotals] = useState(() => totalsMemo.get(cat)?.totals || {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const version = await localforage.getItem(`version_v2_${cat}`);
        const memo = totalsMemo.get(cat);
        if (memo && memo.version === version) {
          if (!cancelled) setTotals(memo.totals);
          return;
        }
        const bank = peekPreparedBank({ cat, version });
        const rawList = bank || await localforage.getItem(`bundle_v2_${cat}`);
        if (!Array.isArray(rawList)) return;
        const out = countTopics(rawList, cat);
        totalsMemo.set(cat, { version, totals: out });
        // Sahifadan tez chiqib ketilsa ham tayyorlash davom etadi — aynan
        // o'sha holatda (Bosh → darhol Test) u eng kerakli.
        if (!bank) warmPreparedBank({ cat, version }, rawList);
        if (!cancelled) setTotals(out);
      } catch {
        /* kesh yo'q — teng og'irlik ishlatiladi */
      }
    })();
    return () => { cancelled = true; };
  }, [cat]);

  return totals;
}

export default useTopicTotals;
