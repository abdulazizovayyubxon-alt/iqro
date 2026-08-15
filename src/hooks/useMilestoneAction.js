// Keyingi bosqich CTA'sini AYNAN mos harakatga ulaydi.
//
// NEGA HOOK: bir xil «Boshlash» tugmasi to'rtta joyda bor (Yutuqlar sahifasi,
// test natijasi, imtihon natijasi, bosh sahifa). Marshrut mantig'i har birida
// takrorlansa, ular vaqt o'tib bir-biridan uzoqlashadi — shuning uchun
// harakat TURI `tracks.js` da (sof ma'lumot), marshrut esa shu yerda
// (yagona joy) hal qilinadi.
//
// `onBlocked` — bepul limit tekshiruvi. `true` qaytarsa harakat ochilmaydi
// (sahifaning o'zi premium oynasini ko'rsatadi).
import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export function useMilestoneAction(onBlocked) {
  const { updateState } = useContext(AppContext);
  const navigate = useNavigate();

  return useCallback((milestone) => {
    if (onBlocked && onBlocked() === true) return;

    const action = milestone?.action || { type: 'test', topicId: milestone?.topicId ?? null };

    switch (action.type) {
      case 'exam':
        // To'liq sinov imtihoni — ExamPage sessiyani o'zi tuzadi
        navigate('/exam');
        break;
      case 'mistakes':
        updateState({ topicId: -1, testMode: 'mistakes' });
        navigate('/test');
        break;
      case 'review':
        navigate('/review');
        break;
      case 'test':
      default:
        updateState({ topicId: action.topicId ?? -1, testMode: 'exam' });
        navigate('/test');
    }
  }, [navigate, updateState, onBlocked]);
}

export default useMilestoneAction;
