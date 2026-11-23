import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { countTopics, peekPreparedBank, warmPreparedBank } from '../utils/questionBank';
import { getSettings, getFreshQuestionMeta } from '../utils/settingsCache';

/**
 * Fan bo'yicha { [topicId]: bazadagi savollar soni } — lokal savol keshi +
 * serverdagi `settings/questionMeta` sinxronligi bilan.
 * Agar foydalanuvchi yangi `dbVersion` chiqqanidan keyin hali /test ga kirmagan bo'lsa,
 * eski IndexedDB keshi o'rniga darhol serverdagi yangi `questionMeta[cat].topics` qaytariladi.
 */
const totalsMemo = new Map(); // cat → { version, totals }

export function useTopicTotals(cat) {
  const [totals, setTotals] = useState(() => totalsMemo.get(cat)?.totals || {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [localVer, verDoc] = await Promise.all([
          localforage.getItem(`version_v2_${cat}`),
          getSettings('version', { scope: 'session', ttlMs: null }).catch(() => null),
        ]);
        const remoteVer = verDoc?.dbVersion || 0;
        const effectiveVer = remoteVer > 0 ? remoteVer : localVer;

        const memo = totalsMemo.get(cat);
        if (memo && memo.version === effectiveVer && Object.keys(memo.totals || {}).length > 0) {
          if (!cancelled) setTotals(memo.totals);
          return;
        }

        // Lokal kesh yangi dbVersion bilan mos bo'lmasa yoki mavjud bo'lmasa — server meta'sini olamiz
        const localIsFresh = !remoteVer || (localVer && String(localVer) === String(remoteVer));
        if (localIsFresh) {
          const bank = peekPreparedBank({ cat, version: localVer });
          const rawList = bank || await localforage.getItem(`bundle_v2_${cat}`);
          if (Array.isArray(rawList) && rawList.length > 0) {
            const out = countTopics(rawList, cat);
            totalsMemo.set(cat, { version: effectiveVer, totals: out });
            if (!bank) warmPreparedBank({ cat, version: localVer }, rawList);
            if (!cancelled) setTotals(out);
            return;
          }
        }

        const qm = await getFreshQuestionMeta().catch(() => null);
        const serverTopics = qm?.[cat]?.topics;
        if (serverTopics && typeof serverTopics === 'object' && Object.keys(serverTopics).length > 0) {
          totalsMemo.set(cat, { version: effectiveVer, totals: serverTopics });
          if (!cancelled) setTotals(serverTopics);
          return;
        }

        // Zaxira: server `topics` yo'q bo'lsa lokal keshga tushamiz
        const bank = peekPreparedBank({ cat, version: localVer });
        const rawList = bank || await localforage.getItem(`bundle_v2_${cat}`);
        if (Array.isArray(rawList) && rawList.length > 0) {
          const out = countTopics(rawList, cat);
          totalsMemo.set(cat, { version: effectiveVer, totals: out });
          if (!bank) warmPreparedBank({ cat, version: localVer }, rawList);
          if (!cancelled) setTotals(out);
        } else if (!cancelled) {
          setTotals({});
        }
      } catch {
        /* kesh yo'q — teng og'irlik ishlatiladi */
      }
    })();
    return () => { cancelled = true; };
  }, [cat]);

  return totals;
}

export default useTopicTotals;
