/**
 * BottomNav.jsx — mobil pastki navigatsiya (brend varianti 1a).
 *
 * Panel markazida «Imtihon» FAB turadi — logo belgisidan ilhomlangan (azure
 * doira + 45° buklama), panelning yuqori qirrasi esa undan o'yilib qochadi.
 * Yon tablarda faol holat: ikonka ustidagi 26×3 azure chiziq (framer-motion
 * `layoutId` bilan siljiydi) + yorliq vazni 800. Eski binafsha «pill» va
 * `--grad-primary` ishlatilmaydi.
 *
 * Panel FONI shu komponent ichida (SVG) chiziladi — index.css'dagi
 * `.bottom-nav` faqat ko'rsatish/yashirish bilan shug'ullanadi. Aks holda
 * o'yiq ustiga tekis fon tushib, kesik ko'rinmay qolardi.
 *
 * Geometriya: panel 82px + safe-area, o'yiq 130px keng va 24px chuqur,
 * FAB paneldan 28px tepaga chiqib turadi.
 */
import React, { useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import {
  Home, PenTool, Brain, Trophy, GraduationCap
} from 'lucide-react';
import { prefersReducedMotion } from '../utils/motion';
import { dueCardCount } from '../engine/SmartQuestionEngine';

// Yon tablar — markaz Imtihon FAB uchun bo'sh qoladi
const SIDE_TABS = [
  { id: 'home',        path: '/dashboard',   icon: Home },
  { id: 'test',        path: '/test',        icon: PenTool },
  { id: 'review',      path: '/review',      icon: Brain },
  { id: 'leaderboard', path: '/leaderboard', icon: Trophy },
];
const EXAM = { id: 'exam', path: '/exam', icon: GraduationCap };

const NOTCH_W = 130;  // o'yiq kengligi
const BAR_H = 82;     // panel balandligi (safe-area ustiga qo'shiladi)
const TOP = 22;       // FAB paneldan tepaga chiqadigan qism (SVG ichidagi ofset)

// Faol chiziq sakramasin: harakat kamaytirilgan bo'lsa darhol ko'chadi.
// Modul darajasida — har renderda yangi obyekt `NavTab` memo'sini buzardi.
const BAR_SPRING = { type: 'spring', stiffness: 420, damping: 32 };
const BAR_INSTANT = { duration: 0 };

// ⚠️ 2026-09-10 — TAB ENDI BottomNav ICHIDA E'LON QILINMAYDI.
// Ilgari `const Tab = ({ tab }) => ...` render funksiyasi ichida turardi:
// har renderda React uchun YANGI komponent turi paydo bo'lib, to'rtala tugma
// DOM'dan o'chirilib qaytadan yasalardi. BottomNav esa AppContext'ning HAR
// yangilanishida (har javob, har `updateState`) render bo'ladi. Oqibati:
// barmoq tugmaga tekkan paytda yangilanish kelsa `click` yangi tugmaga
// yetmay yutilardi (panel «qotgan»dek), `layoutId` chizig'i esa har safar
// qayta mount bo'lib framer-motion layout o'lchovini qayta bajarardi.
const NavTab = React.memo(function NavTab({ tab, isActive, badge, label, onSelect, barTransition }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      style={styles.tab}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <motion.div
          layoutId="zehinNavBar"
          style={styles.activeBar}
          transition={barTransition}
        />
      )}
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <Icon
          size={23}
          strokeWidth={2.3}
          style={{ color: isActive ? 'var(--accent)' : 'var(--text2)', transition: 'color 0.2s' }}
        />
        {badge && <span style={styles.badge}>{badge}</span>}
      </span>
      <span style={{
        fontSize: 'var(--fs-micro)', lineHeight: 1,
        fontWeight: isActive ? 800 : 700,
        color: isActive ? 'var(--accent)' : 'var(--text2)',
        transition: 'color 0.2s',
      }}>
        {label}
      </span>
    </button>
  );
});

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { state } = useContext(AppContext);

  const dueCount = dueCardCount(state.spacedCards);
  const activeId = [...SIDE_TABS, EXAM].find(tab => location.pathname === tab.path)?.id || '';
  const barTransition = prefersReducedMotion() ? BAR_INSTANT : BAR_SPRING;

  // ⚠️ 2026-09-10 — «Test» tabi endi holatga TEGMAYDI.
  // Ilgari u har bosilganda `topicId: -1, testMode: 'exam'` yozardi. TestPage
  // esa aynan shu ikki qiymat o'zgarganda hovuzni qaytadan yig'ib javoblarni
  // nolga tushiradi, sessiyani tiklash ham ikkalasi mos kelishini talab qiladi:
  //   · test o'rtasida «Test» qayta bosilsa — javoblar o'chib, test barcha
  //     bo'limlar to'plamidan qaytadan boshlanardi;
  //   · Bosh sahifada tanlangan bo'lim «Test»ga o'tishda bekor bo'lardi;
  //   · bo'lim testidan chiqib «Test» orqali qaytilsa — sessiya tiklanmasdi.
  // Desktop Sidebar hech qachon bunday qilmagan — endi ikkalasi bir xil.
  //
  // Faol tab qayta bosilsa `navigate` ham chaqirilmaydi: har bosish tarixga
  // takroriy yozuv qo'shib, «orqaga»ni bir necha marta bosishga majbur qilardi.
  // O'rniga sahifa tepaga suriladi (mobil tab-bar odati).
  const go = useCallback((tab) => {
    if (location.pathname === tab.path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(tab.path);
  }, [navigate, location.pathname]);

  const renderTab = (tab) => (
    <NavTab
      key={tab.id}
      tab={tab}
      isActive={tab.id === activeId}
      badge={tab.id === 'review' && dueCount > 0 ? dueCount : null}
      label={t(`nav.${tab.id}`)}
      onSelect={go}
      barTransition={barTransition}
    />
  );

  return (
    <nav className="bottom-nav" style={styles.nav}>
      {/* Panel foni: chap tekis + markazda o'yiq + o'ng tekis.
          O'yiq SVG'si cho'zilmaydi (aks holda burchak radiusi buziladi),
          shuning uchun safe-area zonasi ostida alohida to'ldiruvchi turadi. */}
      <div style={styles.bgLayer} aria-hidden="true">
        <div style={{ ...styles.bgSide, left: 0, right: `calc(50% + ${NOTCH_W / 2 - 0.5}px)` }} />
        <div style={{ ...styles.bgSide, right: 0, left: `calc(50% + ${NOTCH_W / 2 - 0.5}px)` }} />
        <svg
          width={NOTCH_W}
          height={BAR_H + TOP}
          viewBox={`0 0 ${NOTCH_W} ${BAR_H + TOP}`}
          style={styles.notch}
          fill="none"
        >
          <path
            d={`M0 ${TOP} C21 ${TOP} 25 ${TOP + 24} 65 ${TOP + 24} C105 ${TOP + 24} 109 ${TOP} ${NOTCH_W} ${TOP} V${BAR_H + TOP} H0 Z`}
            fill="var(--bg2)"
          />
        </svg>
        {/* Safe-area (iOS «home indicator») zonasi — o'yiq ostidagi bo'shliq */}
        <div style={styles.notchFoot} />
      </div>

      {/* Markaz — Imtihon FAB (logo belgisi: azure doira + 45° buklama) */}
      <button
        type="button"
        onClick={() => go(EXAM)}
        style={styles.fabWrap}
        aria-current={activeId === 'exam' ? 'page' : undefined}
      >
        <span style={styles.fab}>
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill="#0E97E0" />
            <g transform="rotate(45 24 24)">
              <path d="M48 24 A24 24 0 0 1 24 48 Q43.5 40.5 42 30.5 Q41.3 24 48 24 Z" fill="#0B79B8" />
              <path d="M48 24 Q41.3 24 42 30.5 Q44 40.5 32.9 47.9 Q46.5 40.5 48 24 Z" fill="#2FA9EA" />
            </g>
          </svg>
          <GraduationCap size={26} strokeWidth={2.1} color="#fff" style={{ position: 'relative' }} />
        </span>
        <span style={{ fontSize: 'var(--fs-micro)', lineHeight: 1, fontWeight: 800, color: 'var(--accent)' }}>
          {t('nav.exam')}
        </span>
      </button>

      <div style={styles.row}>
        {renderTab(SIDE_TABS[0])}
        {renderTab(SIDE_TABS[1])}
        <div />
        {renderTab(SIDE_TABS[2])}
        {renderTab(SIDE_TABS[3])}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000,
    // Balandlik safe-area bilan BIRGA: box-sizing global border-box bo'lgani
    // uchun padding berilsa panel ichi siqilib qolardi.
    height: `calc(${BAR_H}px + env(safe-area-inset-bottom, 0px))`,
  },
  bgLayer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, top: -TOP,
    filter: 'drop-shadow(0 -6px 18px rgba(15, 27, 45, 0.10))',
    pointerEvents: 'none',
  },
  bgSide: { position: 'absolute', top: TOP, bottom: 0, background: 'var(--bg2)' },
  notch: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0 },
  notchFoot: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    width: NOTCH_W, top: BAR_H + TOP, bottom: 0, background: 'var(--bg2)',
  },
  fabWrap: {
    position: 'absolute', left: '50%', top: -28, transform: 'translateX(-50%)',
    // Teginish zonasi markaz ustunining to'liq eni va panel tagigacha —
    // doira bilan yorliq tepada qoladi (flex-start). Ilgari FAB ostidagi
    // 30px bosilmasdi.
    width: NOTCH_W - 34, height: BAR_H + 28,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 5,
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
    zIndex: 2,
  },
  fab: {
    width: 64, height: 64, position: 'relative',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    filter: 'drop-shadow(0 10px 22px rgba(14, 151, 224, 0.42))',
  },
  row: {
    // Tablar safe-area ustida turadi (home indicator ostiga tushmaydi)
    position: 'absolute', left: 0, right: 0, top: 0, height: BAR_H,
    display: 'grid', gridTemplateColumns: `1fr 1fr ${NOTCH_W - 34}px 1fr 1fr`,
    // stretch — tugma ustunning TO'LIQ balandligini egallaydi. Ilgari
    // `center` + `minHeight: 48` bilan 82px panelning faqat 48px'i bosilardi:
    // ikonka ustidagi va yorliq ostidagi teginish hech narsa qilmasdi.
    alignItems: 'stretch',
  },
  tab: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
    // Pastki 10px ilgari `row`da edi — kontent o'z joyida qoladi
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '0 0 10px',
  },
  activeBar: {
    // Tugma endi panel tepasidan boshlanadi (ilgari 12px pastda edi) —
    // chiziq ko'rinishda o'sha joyda qolishi uchun 12 − 2 = 10
    position: 'absolute', top: 10, width: 26, height: 3, borderRadius: 99,
    background: 'var(--accent)',
  },
  badge: {
    position: 'absolute', top: -5, right: -9,
    background: 'var(--red)', color: '#fff',
    fontSize: 'var(--fs-nano)', fontWeight: 800,
    borderRadius: 6, padding: '1px 4px', minWidth: 14, textAlign: 'center',
  },
};
