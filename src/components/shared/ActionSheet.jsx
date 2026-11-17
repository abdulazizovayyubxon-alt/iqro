/**
 * ActionSheet — "kechiktirsa bo'ladigan majburiy e'tibor" oynasi.
 *
 * Tizim boshlaydigan, bitta aniq harakati bor va foydalanuvchi keyinga
 * surishi mumkin bo'lgan xabarlar uchun YAGONA ko'rinish. Kim, qachon va
 * qaysi navbatda ko'rsatilishini InterruptHost hal qiladi — bu komponent
 * faqat chizadi.
 *
 * Uslub SmartBottomSheet bilan bir xil (tanish naqsh), balandligi kontentga
 * qarab ~ekranning yarmi. Yopish ✕ yuqori o'ng burchakda.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ZehinMark } from './BrandLogo';
import useModalA11y from '../../hooks/useModalA11y';
import { useModalBackButton } from '../profile/useModalBackButton';

const CSS = `
@keyframes as_spin { to { transform: rotate(360deg); } }
`;

// Telegram fonidagi yengil qog'oz-samolyot va geometrik naqsh (SVG pattern)
const TG_PATTERN_BG = `url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 88 88' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230284C7' stroke-opacity='0.11' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 20l14-5-4 14-4-5-6-4z'/%3E%3Ccircle cx='66' cy='22' r='4.5'/%3E%3Cpath d='M52 60l15-6-5 15-4-5-6-4z'/%3E%3Cpolygon points='22,64 29,60 27,68'/%3E%3Ccircle cx='12' cy='46' r='2.5'/%3E%3Ccircle cx='76' cy='48' r='2'/%3E%3C/g%3E%3C/svg%3E")`;

function formatCurrentTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function renderBulletLine(item, index) {
  const text = String(item || '');
  const spaceIdx = text.indexOf(' ');
  const hasPrefix = spaceIdx > 0 && spaceIdx <= 4;
  const emoji = hasPrefix ? text.slice(0, spaceIdx) : null;
  const content = hasPrefix ? text.slice(spaceIdx + 1) : text;

  return (
    <div
      key={index}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 'var(--fs-md)',
        lineHeight: 1.45,
        color: 'var(--text)',
        fontWeight: 500,
      }}
    >
      {emoji && (
        <span aria-hidden="true" style={{ flexShrink: 0, lineHeight: 1.4 }}>
          {emoji}
        </span>
      )}
      <span>{content}</span>
    </div>
  );
}

export default function ActionSheet({
  open,
  icon: Icon,
  title,
  body,
  primaryLabel,
  busyLabel,
  secondaryLabel,
  neverLabel,
  onNever,
  variant = 'default',
  channelSub,
  leadBefore,
  leadHighlight,
  leadAfter,
  bullets,
  busy = false,
  onPrimary,
  onDismiss,
}) {
  const { t } = useTranslation();
  // Harakat bajarilayotganda Escape/tashqi bosish oynani yopmasin
  const ref = useModalA11y(open, busy ? () => {} : onDismiss);
  // Android «orqaga» — Escape bilan bir xil xulq (band bo'lsa yopilmaydi)
  useModalBackButton(open, busy ? () => {} : onDismiss);

  const isTelegram = variant === 'telegram';
  // Oyna ochilgan lahzadagi joriy vaqt — jonli xabar taassurotini beradi
  const timeStamp = useMemo(() => (open ? formatCurrentTime() : ''), [open]);

  return (
    <>
      <style>{CSS}</style>

      {/* ⚠️ AnimatePresence bolalari TO'G'RIDAN-TO'G'RI motion elementlar bo'lishi
          va HAR BIRIDA `key` turishi SHART. Ilgari ikkalasi bitta Fragment ichida
          kalitsiz edi — chiqish animatsiyasi tugagach AnimatePresence ularni
          DOM'dan OLIB TASHLAMASDI. Natijada yopilgan oynaning overlay'i
          `opacity:0` bilan ekranda qolib, BUTUN ILOVANI bosib bo'lmay qolardi. */}
      <AnimatePresence>
        {open && (
          /* Overlay */
          <motion.div
            key="as-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onDismiss}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)', zIndex: 1000,
            }}
          />
        )}

        {open && (
          /* Oyna */
          <motion.div
            key="as-sheet"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={isTelegram ? { opacity: 0, scale: 0.94, x: '-50%', y: '-48%' } : { y: '100%', x: '-50%' }}
            animate={isTelegram ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { y: 0, x: '-50%' }}
            exit={isTelegram ? { opacity: 0, scale: 0.94, x: '-50%', y: '-48%' } : { y: '100%', x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            style={isTelegram ? {
              position: 'fixed', top: '50%', left: '50%',
              width: 'calc(100% - 28px)', maxWidth: '420px',
              background: 'var(--bg2)', borderRadius: '24px',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--sh-lg)', zIndex: 1001,
              display: 'flex', flexDirection: 'column',
              maxHeight: '90vh', overflowY: 'auto',
              outline: 'none',
            } : {
              position: 'fixed', bottom: 0, left: '50%', width: '100%', maxWidth: '700px',
              background: 'var(--bg2)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              border: '1px solid var(--glass-border)', borderBottom: 'none',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', zIndex: 1001,
              display: 'flex', flexDirection: 'column',
              // Kontent qisqa — qat'iy 50vh bo'lsa yarmi bo'sh turadi. minHeight
              // oynaga "jiddiy" hajm beradi, kontent undan oshsa o'zi kengayadi.
              minHeight: '44vh', maxHeight: '86vh', overflowY: 'auto',
              padding: '10px 22px calc(22px + env(safe-area-inset-bottom))',
              outline: 'none',
            }}
          >
            {isTelegram ? (
              <>
                {/* Yuqori kanal sarlavhasi */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px 12px', gap: 12, flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: '#FFFFFF',
                      border: '1px solid rgba(18, 48, 90, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'var(--sh-sm)',
                    }}>
                      <ZehinMark size={34} variant="light" />
                    </span>
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <div style={{
                        fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)',
                        lineHeight: 1.2,
                      }}>
                        Zehin
                      </div>
                      <div style={{
                        fontSize: 'var(--fs-sm)', color: 'var(--text3)',
                        lineHeight: 1.3, marginTop: 2,
                      }}>
                        {channelSub}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onDismiss}
                    disabled={busy}
                    aria-label={t('common.close')}
                    style={{
                      background: 'none', border: 'none',
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text3)', cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? 0.4 : 1,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Telegram patternli konteyner */}
                <div style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  backgroundImage: `${TG_PATTERN_BG}, linear-gradient(180deg, rgba(56, 189, 248, 0.14) 0%, rgba(14, 165, 233, 0.08) 100%)`,
                  borderRadius: 20,
                  margin: '0 10px',
                  padding: 12,
                }}>
                  {/* Xabar kartochkasi */}
                  <div style={{
                    position: 'relative',
                    borderRadius: 16,
                    background: 'var(--surface)',
                    overflow: 'hidden',
                    boxShadow: 'var(--sh-md)',
                    border: '1px solid var(--border)',
                  }}>
                    {/* Illyustratsiyali ko'k banner */}
                    <div style={{
                      position: 'relative',
                      height: 112,
                      background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                      overflow: 'hidden',
                    }}>
                      <svg
                        viewBox="0 0 380 112"
                        width="100%"
                        height="100%"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        style={{ display: 'block' }}
                      >
                        {/* Bulutlar */}
                        <ellipse cx="48" cy="24" rx="44" ry="16" fill="rgba(255,255,255,0.22)" />
                        <ellipse cx="192" cy="14" rx="52" ry="14" fill="rgba(255,255,255,0.16)" />
                        <ellipse cx="145" cy="100" rx="56" ry="18" fill="rgba(255,255,255,0.14)" />

                        {/* Yulduzchalar */}
                        <path d="M98 68l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5z" fill="rgba(255,255,255,0.9)" />
                        <path d="M276 26l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="rgba(255,255,255,0.85)" />
                        <circle cx="154" cy="30" r="2.2" fill="rgba(255,255,255,0.75)" />
                        <circle cx="332" cy="34" r="2" fill="rgba(255,255,255,0.7)" />

                        {/* Parvoz trayektoriyasi */}
                        <path
                          d="M-6 58 Q74 88 158 72 T262 62"
                          fill="none"
                          stroke="rgba(255,255,255,0.85)"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeDasharray="5 6"
                        />
                        <path
                          d="M298 44 Q336 18 378 8"
                          fill="none"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray="4 6"
                        />

                        {/* Qog'oz samolyotcha */}
                        <g transform="translate(260, 48) rotate(-14)">
                          <path d="M0 9L24 0L17 20L11 13L0 9Z" fill="#FFFFFF" />
                          <path d="M11 13L24 0L13 17L11 13Z" fill="#BAE6FD" />
                        </g>
                      </svg>
                    </div>

                    {/* Banner chegarasidan biroz chiqib turgan Zehin belgisi */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: 76,
                        zIndex: 2,
                        filter: 'drop-shadow(0 6px 14px rgba(15, 27, 45, 0.24))',
                      }}
                    >
                      <ZehinMark size={54} variant="navy" />
                    </div>

                    {/* Xabar matni bloki */}
                    <div style={{
                      padding: '18px 16px 12px',
                      textAlign: 'left',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      <h3 style={{
                        fontSize: 'var(--fs-xl)',
                        fontWeight: 800,
                        color: 'var(--text)',
                        margin: '0 0 8px',
                        paddingRight: 60,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.25,
                      }}>
                        {title}
                      </h3>

                      <p style={{
                        fontSize: 'var(--fs-base)',
                        color: 'var(--text2)',
                        margin: 0,
                        lineHeight: 1.55,
                      }}>
                        {(leadBefore || leadHighlight || leadAfter) ? (
                          <>
                            {leadBefore}
                            {leadHighlight && (
                              <span style={{
                                background: 'rgba(42, 171, 238, 0.16)',
                                color: 'var(--text)',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 6,
                                boxDecorationBreak: 'clone',
                                WebkitBoxDecorationBreak: 'clone',
                              }}>
                                {leadHighlight}
                              </span>
                            )}
                            {leadAfter}
                          </>
                        ) : body}
                      </p>

                      {Array.isArray(bullets) && bullets.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          marginTop: 12,
                        }}>
                          {bullets.map(renderBulletLine)}
                        </div>
                      )}

                      <div style={{
                        textAlign: 'right',
                        marginTop: 8,
                        fontSize: 'var(--fs-sm)',
                        color: 'var(--text3)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {timeStamp}
                      </div>
                    </div>
                  </div>

                  {/* Telegram asosiy tugma */}
                  <button
                    onClick={onPrimary}
                    disabled={busy}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', minHeight: 48, marginTop: 10, borderRadius: 14, border: 'none',
                      background: 'linear-gradient(180deg, #2AABEE 0%, #229ED9 100%)',
                      color: '#fff',
                      boxShadow: '0 6px 16px rgba(42, 171, 238, 0.28)',
                      fontFamily: 'inherit', fontSize: 'var(--fs-btn)', fontWeight: 800,
                      cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
                      transition: 'opacity 0.18s',
                    }}
                  >
                    <Send
                      size={17}
                      style={busy ? { animation: 'as_spin 0.9s linear infinite' } : undefined}
                    />
                    {busy ? (busyLabel || primaryLabel) : primaryLabel}
                  </button>
                </div>

                {/* Pastki ikki bosqichli rad etish qismi */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '10px 16px 14px', flexShrink: 0,
                }}>
                  <button
                    onClick={onDismiss}
                    disabled={busy}
                    style={{
                      minHeight: 38, padding: '6px 10px', borderRadius: 10,
                      background: 'none', border: 'none', color: 'var(--text3)',
                      fontFamily: 'inherit', fontSize: 'var(--fs-md)', fontWeight: 600,
                      cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1,
                    }}
                  >
                    {secondaryLabel || t('interrupts.later')}
                  </button>

                  {onNever && (
                    <>
                      <span aria-hidden="true" style={{ color: 'var(--text3)', opacity: 0.55 }}>•</span>
                      <button
                        onClick={onNever}
                        disabled={busy}
                        style={{
                          minHeight: 38, padding: '6px 10px', borderRadius: 10,
                          background: 'none', border: 'none', color: 'var(--text3)',
                          fontFamily: 'inherit', fontSize: 'var(--fs-md)', fontWeight: 600,
                          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1,
                        }}
                      >
                        {neverLabel || t('interrupts.never')}
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Tortish chizig'i */}
                <div style={{
                  width: 40, height: 4, borderRadius: 99, background: 'var(--border)',
                  margin: '0 auto 4px', flexShrink: 0,
                }} />

                {/* Yopish — yuqori o'ng burchak */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                  <button
                    onClick={onDismiss}
                    disabled={busy}
                    aria-label={t('common.close')}
                    style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      width: 40, height: 40, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text2)', cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? 0.4 : 1,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Markaziy blok */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', textAlign: 'center', gap: 14, padding: '10px 0 26px',
                }}>
                  <span style={{
                    width: 64, height: 64, borderRadius: 20, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--blue-bg)', color: 'var(--accent)',
                  }}>
                    <Icon size={30} strokeWidth={2} />
                  </span>

                  <h3 style={{
                    fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--text)',
                    margin: 0, letterSpacing: '-0.01em',
                  }}>
                    {title}
                  </h3>

                  <p style={{
                    fontSize: 'var(--fs-base)', color: 'var(--text2)', margin: 0,
                    lineHeight: 1.55, maxWidth: 420,
                  }}>
                    {body}
                  </p>
                </div>

                {/* Tugmalar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={onPrimary}
                    disabled={busy}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                      width: '100%', minHeight: 52, borderRadius: 15, border: 'none',
                      background: 'var(--cta)', color: '#fff',
                      fontFamily: 'inherit', fontSize: 'var(--fs-lg)', fontWeight: 800,
                      cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
                      transition: 'opacity 0.18s',
                    }}
                  >
                    <Icon
                      size={17}
                      style={busy ? { animation: 'as_spin 0.9s linear infinite' } : undefined}
                    />
                    {busy ? (busyLabel || primaryLabel) : primaryLabel}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <button
                      onClick={onDismiss}
                      disabled={busy}
                      style={{
                        flex: onNever ? undefined : 1,
                        minHeight: 44, padding: '0 12px', borderRadius: 15,
                        background: 'none', border: 'none', color: 'var(--text3)',
                        fontFamily: 'inherit', fontSize: 'var(--fs-md)', fontWeight: 700,
                        cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1,
                      }}
                    >
                      {secondaryLabel || t('interrupts.later')}
                    </button>
                    {onNever && (
                      <>
                        <span aria-hidden="true" style={{ color: 'var(--text3)', opacity: 0.55 }}>•</span>
                        <button
                          onClick={onNever}
                          disabled={busy}
                          style={{
                            minHeight: 44, padding: '0 12px', borderRadius: 15,
                            background: 'none', border: 'none', color: 'var(--text3)',
                            fontFamily: 'inherit', fontSize: 'var(--fs-md)', fontWeight: 700,
                            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1,
                          }}
                        >
                          {neverLabel || t('interrupts.never')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
