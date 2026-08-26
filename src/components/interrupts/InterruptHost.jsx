/**
 * InterruptHost — tizim boshlaydigan oynalar NAVBATI.
 *
 * MUAMMO: "kechiktirsa bo'ladigan e'tibor" naqshi bir nechta joyda kerak
 * (obuna tugashi, yangilanish, zanjir xavfi, push ruxsati, o'rnatish). Har biri
 * mustaqil chiqsa, foydalanuvchi ilovani ochganda ketma-ket 3 ta oyna uradi va
 * refleks bilan ✕ bosadigan bo'lib qoladi — HAMMASINING kuchi yo'qoladi.
 *
 * QOIDALAR (uchalasi ham shu yerda, tarqoq emas):
 *   1. Test/imtihon/takrorlash sahifasida HECH QANDAY oyna chiqmaydi. Ba'zi
 *      harakatlar sahifani qayta yuklaydi yoki boshqa sahifaga olib o'tadi —
 *      jarayon o'rtasida bu boshlangan testni yo'q qilardi.
 *   2. Bir ochilishda FAQAT BITTA oyna. Qolganlari keyingi safarga suriladi.
 *   3. Ustuvorlik pastdagi ro'yxat tartibida: birinchi mos kelgani g'olib.
 *
 * Yangi holat qo'shish = INTERRUPTS massiviga bitta obyekt qo'shish.
 */

import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, RefreshCw, Flame, Bell, Smartphone, Send } from 'lucide-react';

import ActionSheet from '../shared/ActionSheet';
import { AppContext } from '../../context/AppContext';
import { ToastContext } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { isPlayBuild, CHANNEL_URL } from '../../config';
import { pushPermission, enablePush } from '../../services/push';
import { canInstall, promptInstall, isStandalone, onInstallAvailability } from '../../services/installPrompt';
import {
  isSnoozed, snooze, askCount, bumpAsk,
  shownThisSession, markShownThisSession, msUntilTomorrow,
  HOUR, DAY,
} from '../../services/interrupts';

// Yangilash sahifani qayta yuklaydi, obuna/zanjir esa boshqa sahifaga o'tkazadi
const BLOCKED_ROUTES = ['/test', '/exam', '/review'];

// Zanjir oynasi faqat kechqurun — kun davomida "bugun bajarmadingiz" deyish
// erta va bezovta, kechqurun esa bu haqiqiy oxirgi imkoniyat eslatmasi.
const STREAK_HOUR = 18;
// Qisqa zanjirni yo'qotish og'riqli emas — 3 kundan boshlab eslatamiz
const STREAK_MIN = 3;

// Push ruxsati bir martalik imkoniyat: brauzer so'roviga "yo'q" desa qaytarib
// bo'lmaydi. Shuning uchun avval O'ZIMIZ tushuntiramiz va uch martadan ortiq
// so'ramaymiz — aks holda bezovtalik ruxsatni butunlay yo'qotadi.
const PUSH_MAX_ASKS = 3;
// Ilovani endigina ochgan odamga eslatma taklif qilish ma'nosiz — avval
// foydani ko'rsin. Eng kamida shuncha savol javoblangan bo'lishi kerak.
const PUSH_MIN_ANSWERED = 10;

// Telegram kanal taklifi:
// Kamida 5 ta savol ishlagan bo'lishi kerak.
// 3 xil matn rotatsiyasi va 7 kun -> 10 kun -> 20 kun oraliqli ko'rsatuv (1 oyda max 3 marta).
const TG_MIN_ANSWERED = 5;
const TG_MAX_ASKS = 3;
const TG_INTERVALS = [7 * DAY, 10 * DAY, 20 * DAY];

// ── Jim tabletka (yangilanish kechiktirilganda tepada qoladi) ─────────────────

const PILL_CSS = `
@keyframes ih_slideIn {
  from { opacity: 0; transform: translateY(-40px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
`;

const PILL = {
  wrapper: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 999, display: 'flex', justifyContent: 'center',
    pointerEvents: 'none', width: '100%',
  },
  card: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
    padding: '12px 24px', borderRadius: '99px',
    fontSize: 'var(--fs-md)', fontWeight: 600,
    background: 'rgba(14, 151, 224, 0.97)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    animation: 'ih_slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    pointerEvents: 'auto', maxWidth: '90vw', textAlign: 'center',
  },
  btn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 14px', borderRadius: '99px',
    background: '#fff', color: '#0B79B8', border: 'none',
    fontSize: 'var(--fs-sm)', fontWeight: 800, cursor: 'pointer',
    flexShrink: 0, fontFamily: 'inherit',
  },
};

export default function InterruptHost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { state } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { updateReady, applyUpdate, applying } = useAppUpdate();

  const [busy, setBusy] = useState(false);
  const [installable, setInstallable] = useState(canInstall);
  // `current` — ko'rsatilayotgan holat, `open` — oynaning ochiqligi. Ikkalasi
  // ALOHIDA: yopilish animatsiyasi davomida kontent hali kerak bo'ladi.
  const [current, setCurrent] = useState(null);
  const [open, setOpen] = useState(false);
  // Sessiya chegarasi bir marta qo'llanadi. Shu ref bo'lmasa tanlov qayta
  // hisoblanganda `shownThisSession()` allaqachon true bo'lib, endigina
  // ochilgan oyna keyingi renderda o'zi yopilib qolardi.
  const pickedRef = React.useRef(false);

  // `beforeinstallprompt` React'dan oldin otilishi mumkin — xizmat uni ushlab
  // turadi, biz shunchaki holat o'zgarishini kuzatamiz
  useEffect(() => onInstallAvailability(setInstallable), []);

  const inBlockedRoute = BLOCKED_ROUTES.some((p) => location.pathname.startsWith(p));

  // ── Shartlar uchun hisoblangan qiymatlar ───────────────────────────────────

  const daysToExpiry = useMemo(() => {
    if (!user?.premiumExpire) return null;
    const exp = new Date(user.premiumExpire).getTime();
    if (Number.isNaN(exp)) return null;
    return Math.ceil((exp - Date.now()) / DAY);
  }, [user?.premiumExpire]);

  const totalAnswered = useMemo(() => {
    const stats = state?.topicStats || {};
    return Object.values(stats).reduce((sum, ts) => sum + (ts?.answered || 0), 0);
  }, [state?.topicStats]);

  const goalDoneToday = state?.dailyGoal?.date === new Date().toDateString()
    && !!state?.dailyGoal?.completed;

  // Obuna oynasining IKKI holati. Matn qaysi shart ishlaganiga qarab tanlanadi —
  // `isTruePremium` ga qarab bo'lmaydi: muddati tugagan, lekin bayrog'i hali
  // tozalanmagan hisobda "tugayapti · 0 kun qoldi" degan g'alati matn chiqardi.
  const subExpiringSoon = !!user?.isTruePremium && daysToExpiry !== null
    && daysToExpiry >= 0 && daysToExpiry <= 3;
  const subLapsed = user?.trialStatus === 'urgency' || user?.trialStatus === 'expired';

  // ── Holatlar — USTUVORLIK TARTIBIDA ────────────────────────────────────────

  const INTERRUPTS = useMemo(() => [
    // 1. Obuna — daromadga eng yaqin nuqta.
    // ⚠️ Play build'da CHIQMAYDI: ilova ichidan tashqi to'lovga yo'naltirish
    // Google Play anti-steering siyosatiga ziddir (config.js izohiga qarang).
    {
      id: 'subscription',
      show: () => !isPlayBuild() && (subLapsed || subExpiringSoon),
      snoozeMs: () => (user?.trialStatus === 'expired' ? 3 * DAY : DAY),
      icon: Crown,
      title: () => (subExpiringSoon
        ? t('interrupts.sub.titleSoon')
        : t('interrupts.sub.titleEnded')),
      body: () => (subExpiringSoon
        ? t('interrupts.sub.bodySoon', { days: Math.max(0, daysToExpiry ?? 0) })
        : t('interrupts.sub.bodyEnded')),
      cta: () => t('interrupts.sub.cta'),
      run: () => { navigate('/premium'); },
    },

    // 2. Ilova yangilanishi
    {
      id: 'update',
      show: () => updateReady,
      snoozeMs: () => 6 * HOUR,
      icon: RefreshCw,
      title: () => t('interrupts.update.title'),
      body: () => t('interrupts.update.body'),
      cta: () => t('interrupts.update.cta'),
      busyLabel: () => t('interrupts.update.busy'),
      run: () => { applyUpdate(); return 'keep-open'; },
    },

    // 3. Zanjir bugun uziladi
    {
      id: 'streak',
      show: () => (state?.dailyStreak || 0) >= STREAK_MIN
        && !goalDoneToday
        && new Date().getHours() >= STREAK_HOUR,
      snoozeMs: () => msUntilTomorrow(),
      icon: Flame,
      title: () => t('interrupts.streak.title', { days: state?.dailyStreak || 0 }),
      body: () => t('interrupts.streak.body', {
        left: Math.max(1, (state?.dailyGoal?.target || 20) - (state?.dailyGoal?.answered || 0)),
      }),
      cta: () => t('interrupts.streak.cta'),
      run: () => { navigate('/test'); },
    },

    // 4. Telegram kanal taklifi — 3 xil matn rotatsiyasi va 7d -> 10d -> 20d oraliqli ko'rsatuv
    {
      id: 'tg_channel',
      show: () => totalAnswered >= TG_MIN_ANSWERED
        && askCount('tg_channel') < TG_MAX_ASKS,
      snoozeMs: () => {
        const count = askCount('tg_channel');
        const idx = Math.max(0, Math.min(count - 1, TG_INTERVALS.length - 1));
        return TG_INTERVALS[idx] || (20 * DAY);
      },
      icon: Send,
      title: () => {
        const v = Math.max(0, askCount('tg_channel') - 1) % 3;
        return t(`interrupts.tg.v${v}.title`);
      },
      body: () => {
        const v = Math.max(0, askCount('tg_channel') - 1) % 3;
        return t(`interrupts.tg.v${v}.body`);
      },
      cta: () => {
        const v = Math.max(0, askCount('tg_channel') - 1) % 3;
        return t(`interrupts.tg.v${v}.cta`);
      },
      onShow: () => bumpAsk('tg_channel'),
      run: () => {
        if (typeof window !== 'undefined') {
          window.open(CHANNEL_URL, '_blank', 'noopener,noreferrer');
        }
      },
    },

    // 5. Push ruxsati — avval tushuntirish, keyin brauzer so'rovi
    {
      id: 'push',
      show: () => pushPermission() === 'default'
        && totalAnswered >= PUSH_MIN_ANSWERED
        && askCount('push') < PUSH_MAX_ASKS,
      snoozeMs: () => 3 * DAY,
      icon: Bell,
      title: () => t('interrupts.push.title'),
      body: () => t('interrupts.push.body'),
      cta: () => t('interrupts.push.cta'),
      busyLabel: () => t('interrupts.push.busy'),
      onShow: () => bumpAsk('push'),
      run: async () => {
        // Brauzer so'rovi AYNAN shu yerda — foydalanuvchi rozi bo'lgandan keyin.
        // Rad etsa ham qayta so'ramaymiz: ruxsat 'denied' bo'lib qoladi va
        // show() sharti o'zi yopiladi.
        //
        // ⚠️ 2026-08-19: natija ilgari UMUMAN o'qilmasdi — yoqish yiqilsa
        // oyna shunchaki yopilardi va foydalanuvchi ham, biz ham buni
        // bilmasdik. Endi kamida xabar chiqadi (sabab `pushLastError`
        // maydonida ham qoladi, services/push.js).
        const res = await enablePush(user);
        if (!res?.ok && res?.reason !== 'denied') {
          showToast(t('settings.toasts.pushError') + (res?.detail ? ` (${res.detail})` : ''), 'error');
        }
      },
    },

    // 6. Ilovani o'rnatish taklifi
    {
      id: 'install',
      show: () => installable && !isStandalone(),
      snoozeMs: () => 7 * DAY,
      icon: Smartphone,
      title: () => t('interrupts.install.title'),
      body: () => t('interrupts.install.body'),
      cta: () => t('interrupts.install.cta'),
      run: async () => { await promptInstall(); },
    },
  ], [t, navigate, user, daysToExpiry, subLapsed, subExpiringSoon, updateReady, applyUpdate,
      state?.dailyStreak, state?.dailyGoal, goalDoneToday, totalAnswered, installable, showToast]);

  // ── G'olibni tanlash ───────────────────────────────────────────────────────

  // Bir marta tanlaymiz: birinchi mos kelgan holat g'olib bo'ladi va dastur
  // yopilgunicha shu qoladi. Shart bajarilmasa (masalan test sahifasidamiz)
  // effekt keyinroq — sahifa almashganda yoki yangilanish kelganda — qayta uradi.
  useEffect(() => {
    if (pickedRef.current || !user || inBlockedRoute || shownThisSession()) return;

    const next = INTERRUPTS.find((it) => !isSnoozed(it.id) && it.show());
    if (!next) return;

    pickedRef.current = true;
    markShownThisSession();
    next.onShow?.();
    setCurrent(next);
    setOpen(true);
  }, [INTERRUPTS, user, inBlockedRoute]);

  // Oyna ochiq turganda foydalanuvchi testni boshlab yuborsa — darhol yopamiz
  useEffect(() => {
    if (inBlockedRoute) setOpen(false);
  }, [inBlockedRoute]);

  const handlePrimary = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    try {
      const result = await current.run();
      // 'keep-open' — sahifa qayta yuklanadi, oyna spinner bilan turaveradi
      if (result === 'keep-open') return;
    } catch { /* harakat bajarilmadi — oyna baribir yopiladi */ }
    snooze(current.id, current.snoozeMs());
    setBusy(false);
    setOpen(false);
  }, [current]);

  const handleDismiss = useCallback(() => {
    if (!current) return;
    snooze(current.id, current.snoozeMs());
    setOpen(false);
  }, [current]);

  // Yangilanish oynasi chiqmagan bo'lsa (kechiktirilgan yoki sessiya chegarasi)
  // — jim tabletka qoladi, ya'ni taklif yo'qolmaydi, xohlasa o'zi bosadi.
  const showPill = updateReady && !inBlockedRoute && !(open && current?.id === 'update');

  return (
    <>
      {current && (
        <ActionSheet
          open={open}
          icon={current.icon}
          title={current.title()}
          body={current.body()}
          primaryLabel={current.cta()}
          busyLabel={current.busyLabel?.()}
          busy={busy || applying}
          onPrimary={handlePrimary}
          onDismiss={handleDismiss}
        />
      )}

      {showPill && (
        <>
          <style>{PILL_CSS}</style>
          <div style={PILL.wrapper}>
            <div style={PILL.card}>
              <span style={{ flex: 1, lineHeight: 1.5 }}>{t('offline.updateReady')}</span>
              <button style={PILL.btn} onClick={applyUpdate} disabled={applying}>
                <RefreshCw size={12} />
                {t('offline.update')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
