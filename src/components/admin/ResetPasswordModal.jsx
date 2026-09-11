import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Copy, Check } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { buildResetPasswordMessage } from '../../utils/resetPasswordMessage';

/**
 * ResetPasswordModal — admin bergan vaqtinchalik parol oynasi.
 *
 * Bu oyna — parolni ko'rishning YAGONA imkoniyati: Firebase parolni xeshlab
 * saqlaydi, ya'ni uni qaytadan o'qib bo'lmaydi. Yopilgandan keyin qolgan
 * yo'l — qaytadan tiklash. Shuning uchun yopish tugmasi ataylab «Yozib
 * oldim» deyiladi.
 *
 * 2026-09-11: parol bilan birga Telegramga TAYYOR XABAR ko'chiriladi —
 * ilgari admin ko'rsatmani har safar qo'lda yozardi. Matn mantiqi testga
 * olingan modulda (utils/resetPasswordMessage.js). Oyna AdminPage.jsx dan
 * shu sababli ajratildi: u 6400 qatorlik va login'siz ochilmaydi.
 *
 * Xabar TAHRIRLANMAYDI (Pro oynasidan farqi): u Telegramga qo'yiladi, kerak
 * bo'lsa o'sha yerda o'zgartiriladi. Panelda tahrirlash esa parolning o'zini
 * tasodifan buzib yuborish imkonini berardi.
 */
export default function ResetPasswordModal({ name, password, rawName, phone, email, onClose, showToast }) {
  const dialogRef = useModalA11y(true, onClose);

  // Buferda HOZIR nima turibdi: 'password' | 'message' | null. Ikki alohida
  // bayroq emas — xabar ko'chirilgach parol tugmasi «Ko'chirildi» deb
  // yolg'on gapirmasligi kerak (bufer endi xabar bilan almashgan).
  const [copied, setCopied] = useState(null);

  const message = useMemo(
    () => buildResetPasswordMessage({ name: rawName, phone, email, password }),
    [rawName, phone, email, password],
  );

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      // HTTPS bo'lmagan muhitda clipboard API yo'q — matn oynada ko'rinib
      // turibdi, admin qo'lda belgilab ko'chiradi.
      setCopied(null);
      showToast(what === 'message'
        ? "Ko'chirib bo'lmadi — xabarni qo'lda belgilab oling"
        : "Ko'chirib bo'lmadi — parolni qo'lda belgilab oling", 'error');
    }
  };

  return (
    <div className="admin-modal-overlay">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Vaqtinchalik parol"
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="admin-modal-panel admin-modal-panel--md"
        // Xabar qo'shilgach oyna past ekranda (noutbuk, 768px) 85vh dan oshadi.
        style={{ overflowY: 'auto' }}
      >
        <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          <KeyRound size={18} style={{ color: 'var(--amber)', verticalAlign: '-3px', marginRight: 6 }} />
          Vaqtinchalik parol
        </h3>
        <p className="admin-info-text" style={{ marginTop: 4, marginBottom: 16 }}>
          <strong style={{ color: 'var(--text)' }}>{name}</strong> uchun yangi parol o'rnatildi.
        </p>

        {/* `textTransform: none` — SHART. `.admin-input--code` matnni KATTA
            HARFGA aylantiradi (u promokodlar uchun yozilgan), parol esa
            registrga sezgir: ekranda `K7pQ…` ni `K7PQ…` deb ko'rgan admin
            uni telefonda xato aytib berardi. */}
        <div className="admin-row--tight" style={{ marginBottom: 16 }}>
          <input
            className="admin-input admin-input--code"
            value={password}
            readOnly
            onFocus={e => e.target.select()}
            aria-label="Vaqtinchalik parol"
            style={{
              textTransform: 'none',
              fontSize: 'var(--fs-3xl)',
              letterSpacing: '2px',
              textAlign: 'center',
            }}
          />
          {/* Faqat ikonka: matnli tugma mobilda parol maydonini siqib, uning
              BOSHINI kesib qo'yardi (375px da `S4NR…` → `4NR…`). Asosiy
              ko'chirish tugmasi endi pastda — «Xabarni ko'chirish». */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => copy('password', password)}
            aria-label={copied === 'password' ? "Parol ko'chirildi" : "Parolni ko'chirish"}
            title={copied === 'password' ? "Parol ko'chirildi" : "Parolni ko'chirish"}
            style={{ width: 52, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {copied === 'password'
              ? <Check size={18} style={{ color: 'var(--green)' }} />
              : <Copy size={18} />}
          </button>
        </div>

        <label className="admin-label" htmlFor="reset-pw-message">Telegram uchun tayyor xabar</label>
        {/* `flexShrink: 0` — panel flex-ustun; textarea o'z ichida aylanadigan
            element bo'lgani uchun past ekranda 0 balandlikkacha siqilardi. */}
        <textarea
          id="reset-pw-message"
          className="admin-input"
          rows={7}
          value={message}
          readOnly
          onFocus={e => e.target.select()}
          style={{ marginTop: 6, resize: 'vertical', lineHeight: 1.45, fontSize: 'var(--fs-md)', flexShrink: 0 }}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => copy('message', message)}
          style={{
            marginTop: 8, width: '100%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {copied === 'message' ? <Check size={16} /> : <Copy size={16} />}
          {copied === 'message' ? "Ko'chirildi — Telegramga qo'ying" : "Xabarni ko'chirish"}
        </button>

        <div className="admin-info-box" style={{ marginTop: 14, flexShrink: 0 }}>
          <div className="admin-info-title">⚠️ Bu oyna bir marta ko'rsatiladi</div>
          <div className="admin-info-text">
            Parol hech qayerda saqlanmaydi — yopilgandan keyin uni qayta ko'rib bo'lmaydi
            (kerak bo'lsa qaytadan tiklaysiz). Ochiq qolgan seanslari uzildi.
          </div>
        </div>

        <div className="admin-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Yozib oldim</button>
        </div>
      </motion.div>
    </div>
  );
}
