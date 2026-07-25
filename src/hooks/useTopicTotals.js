import { useState, useEffect } from 'react';
import localforage from 'localforage';

/**
 * Fan bo'yicha { [topicId]: bazadagi savollar soni } — lokal savol keshidan.
 * Kesh bo'lmasa bo'sh obyekt qaytadi (chaqiruvchi teng og'irlikka o'tadi).
 * AchievementsPage'dagi bir xil mantiq shu yerga yig'ilgan.
 */
export function useTopicTotals(cat) {
  const [totals, setTotals] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawList = await localforage.getItem(`bundle_v2_${cat}`);
        if (cancelled || !Array.isArray(rawList)) return;
        const out = {};
        rawList.forEach(q => {
          if (q.category === cat) out[q.topicId] = (out[q.topicId] || 0) + 1;
        });
        setTotals(out);
      } catch {
        /* kesh yo'q — teng og'irlik ishlatiladi */
      }
    })();
    return () => { cancelled = true; };
  }, [cat]);

  return totals;
}

export default useTopicTotals;
