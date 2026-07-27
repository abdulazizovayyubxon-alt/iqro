import { useState, useEffect } from 'react';
import { getTheory, getTheoryFallback } from '../data/theory';

/**
 * useTheory — mavzuning nazariy materiali.
 *
 * Birinchi renderda darhol ZAXIRA (eski `theoryHint`) qaytadi, keyin
 * strukturaviy material yuklanib almashadi. Shu sababli sekin tarmoqda ham
 * bo'sh ekran ko'rinmaydi — matn bor, u boyiydi.
 *
 * @param {number|null} topicId
 * @returns {{ theory: object, loading: boolean }}
 */
export const useTheory = (topicId) => {
  const [theory, setTheory] = useState(() =>
    (topicId == null || topicId < 0 ? null : getTheoryFallback(topicId)));
  const [loading, setLoading] = useState(topicId != null && topicId >= 0);

  useEffect(() => {
    if (topicId == null || topicId < 0) {
      setTheory(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setTheory(getTheoryFallback(topicId));
    setLoading(true);
    getTheory(topicId).then(t => {
      if (cancelled) return;
      setTheory(t);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [topicId]);

  return { theory, loading };
};

export default useTheory;
