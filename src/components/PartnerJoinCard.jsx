import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Handshake, Gift, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  getPendingPromoCode,
  clearPendingPromoCode,
  snoozePromoCard,
  isPromoCardSnoozed,
  fetchPromoInfo,
  redeemPromo,
  PROMO_ERRORS,
} from '../services/promo';

/**
 * PartnerJoinCard — hamkor havolasi (`?promo=KOD`) bilan kelgan foydalanuvchidan
 * guruhga qo'shilishni SO'RAYDIGAN karta.
 *
 * Nega kod jimgina qo'llanmaydi (havola bosilgan-ku, degan savolga javob):
 *  · hamkor kodi ism, ID va test natijalarini guruh ustoziga ochadi — bu
 *    haqda foydalanuvchi ogohlantirilishi shart;
 *  · `redemptions` yozuvi qaytarilmaydi (guruhdan chiqish yo'li yo'q), ya'ni
 *    boshqa chatga tashlangan havolani tasodifan bosish umrbod natija berardi;
 *  · `percent` kod keyingi chegirmani bloklaydi.
 * Shuning uchun: havola kodni OLIB KELADI, qo'shilishni foydalanuvchi bir
 * bosish bilan TASDIQLAYDI. Qo'lda kiritish (Referral sahifasi, PremiumModal)
 * o'z joyida qoladi — kodni og'zaki olganlar uchun.
 */
export default function PartnerJoinCard() {
  const { t } = useTranslation();
  const { user, updateUserData } = useAuth();
  const { showToast } = useContext(ToastContext);

  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const code = getPendingPromoCode();
    if (!code || isPromoCardSnoozed()) return;

    let cancelled = false;
    (async () => {
      const res = await fetchPromoInfo(code);
      if (cancelled) return;

      if (!res.ok) {
        // Tarmoq/sessiya xatosida kod SAQLANADI — keyingi ochilishda yana
        // urinamiz. Qolgan xatolar (kod yo'q, format buzuq) qaytarilmas, shu
        // sababli kodni tozalaymiz: aks holda karta har kirganda so'ralib,
        // serverga befoyda so'rov yog'dirardi.
        if (res.error !== 'network' && res.error !== 'unauthorized') clearPendingPromoCode();
        return;
      }
      // Allaqachon ishlatilgan yoki kod yopilgan bo'lsa karta ko'rsatilmaydi —
      // «Qo'shilaman» baribir xatoga urilardi.
      if (res.alreadyUsed || !res.usable) {
        clearPendingPromoCode();
        return;
      }
      setInfo({ ...res, code });
    })();

    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleJoin = async () => {
    if (busy || !info) return;
    setBusy(true);
    const res = await redeemPromo(info.code);
    setBusy(false);

    if (res.ok) {
      clearPendingPromoCode();
      if (res.type === 'days' || res.type === 'team') {
        // Muddatni Firestore kuzatuvini kutmasdan yangilaymiz — foydalanuvchi
        // «qo'shildim» degan javobni darhol ko'radi (ReferralPage bilan bir xil).
        const base = user?.premiumExpire && new Date(user.premiumExpire) > new Date()
          ? new Date(user.premiumExpire) : new Date();
        const newExpire = new Date(base.getTime() + Number(res.value) * 86400000).toISOString();
        updateUserData({ isPremium: true, isTruePremium: true, premiumExpire: newExpire, trialStatus: 'premium' });
      }
      showToast(t('partnerJoin.joined'), 'success');
      setInfo(null);
      return;
    }

    showToast(PROMO_ERRORS[res.error] || t('partnerJoin.joinFailed'), 'error');
    // Qayta urinish foyda bermaydigan xatolarda kartani yopamiz
    if (['already_used', 'not_found', 'limit_reached', 'expired', 'inactive', 'invalid_promo'].includes(res.error)) {
      clearPendingPromoCode();
      setInfo(null);
    }
  };

  const handleLater = () => {
    snoozePromoCard(); // kod saqlanadi, karta ertaga yana chiqadi
    setInfo(null);
  };

  if (!info) return null;

  const partnerName = info.partnerName || info.campaign || null;
  const reward = info.type === 'percent'
    ? t('partnerJoin.rewardPercent', { value: info.value })
    : t('partnerJoin.rewardDays', { count: info.value });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel"
      style={{
        padding: '16px 18px',
        marginBottom: 14,
        borderRadius: 16,
        border: '1.5px solid rgba(14,151,224,0.30)',
        background: 'rgba(14,151,224,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'var(--blue-bg)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Handshake size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
            {partnerName
              ? t('partnerJoin.title', { name: partnerName })
              : t('partnerJoin.titleNoName')}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 3 }}>
            {t('partnerJoin.viaLink', { code: info.code })}
          </div>
        </div>
      </div>

      {/* Nima olasiz / ustoz nimani ko'radi — ikkalasi ham OCHIQ aytiladi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <Gift size={15} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.45 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{t('partnerJoin.youGet')}:</span> {reward}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <Eye size={15} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.45 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{t('partnerJoin.teacherSees')}:</span> {t('partnerJoin.sharedData')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={handleJoin}
          disabled={busy}
          style={{
            flex: '1 1 160px', padding: '11px 18px', borderRadius: 12,
            background: 'var(--cta)', color: '#fff', border: 'none',
            fontSize: 'var(--fs-base)', fontWeight: 700, fontFamily: 'inherit',
            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? t('common.loading') : t('partnerJoin.join')}
        </button>
        <button
          onClick={handleLater}
          disabled={busy}
          style={{
            flex: '0 1 auto', padding: '11px 18px', borderRadius: 12,
            background: 'transparent', color: 'var(--text3)',
            border: '1.5px solid var(--border)',
            fontSize: 'var(--fs-base)', fontWeight: 600, fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {t('partnerJoin.later')}
        </button>
      </div>
    </motion.div>
  );
}
