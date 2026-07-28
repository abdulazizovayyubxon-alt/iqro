import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { readContract, writeContract, CONTRACT_EVENT } from '../services/studyContract';

/**
 * useStudyContract — o'quv shartnomasini o'qish/yozish (services/studyContract.js).
 *
 * @returns {{ toifa, dailyMinutes, targetScore, targetIsCustom, update }}
 *   update(patch) — { toifa?, dailyMinutes?, targetScore? }
 */
export const useStudyContract = () => {
  const { user } = useAuth();
  const [contract, setContract] = useState(readContract);

  useEffect(() => {
    const sync = () => setContract(readContract());
    window.addEventListener(CONTRACT_EVENT, sync);
    window.addEventListener('storage', sync);  // boshqa tab
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener(CONTRACT_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const update = useCallback(
    (patch) => setContract(writeContract(patch, user?.uid)),
    [user?.uid]
  );

  return { ...contract, update };
};

export default useStudyContract;
