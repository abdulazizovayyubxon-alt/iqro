import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import '../../pages/ProfilePage.css';

const GUIDE_PANELS = [
  {
    title: "🚀 IQRO o'zi qanday platforma?",
    body: "IQRO — attestatsiya va sertifikatlash imtihonlariga tayyorlanish uchun mo'ljallangan zamonaviy platforma. Bizda minglab testlar bazasi bo'lib, ular haqiqiy imtihon standartlariga mos keladi. Siz bu yerda o'z bilimingizni tekshirishingiz va xatolar ustida tizimli ishlashingiz mumkin."
  },
  {
    title: "🧠 \"Takrorlash\" bo'limi qanday ishlaydi?",
    body: null, // JSX quyida
  },
  {
    title: "🏆 Reyting va XP nima?",
    body: null,
  },
  {
    title: "🎁 Do'stlarni taklif qilish",
    body: null,
  },
];

/** Foydalanish qo'llanmasi (yig'iladigan panellar) */
export default function GuideModal({ onClose, showToast }) {
  const [activePanel, setActivePanel] = useState(null);

  const panelBodies = [
    GUIDE_PANELS[0].body,
    (<>Biz <strong>"Spaced Repetition" (Oraliq takrorlash)</strong> algoritmidan foydalanamiz. Testda xato qilgan yoki qiynalgan savollaringiz darhol sizga ko'rinmaydi. Algoritm ularni xotirangizdan o'chib ketishiga yaqin qolganda aynan qulay vaqtda hisoblab sizga qayta ko'rsatadi. Shu sababli bilimingiz doimiy yodda qoladi!</>),
    (<>Siz to'g'ri ishlagan har bir test uchun <strong>XP (Tajriba ochkosi)</strong> olasiz. Ketma-ket kunlar davomida kirib o'qisangiz (Streak), olingan ochkolar hajmi ortib boradi. Shuningdek, tizimli o'qisangiz Respublika bo'yicha Reytingingiz ko'tariladi va turli nishonlar olasiz.</>),
    (<>Tizimda <strong>50/50 Chegirma</strong> tizimi ishlaydi. Siz do'stingizga maxsus havolangizni yuborasiz. U shu orqali ro'yxatdan o'tsa 50% chegirmaga ega bo'ladi. U to'lov qilgach, <strong>Siz ham o'z navbatdagi to'lovingiz uchun juda katta chegirma yutib olasiz!</strong></>),
  ];

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: '24px' }}
      >
        <div
          className="pp-modal-title"
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', cursor: 'pointer' }}
          onClick={() => {
            // Secret trigger for testing Ambassador Modal
            localStorage.setItem('force_ambassador', '1');
            localStorage.removeItem('iqro_ambassador_thanks');
            showToast('Admin: Ambassador test yuborildi. Sahifani yangilang!', 'success');
          }}
        >
          <span style={{ fontSize: 24 }}>📖</span> Foydalanish qo'llanmasi
        </div>

        <div className="pp-policy-scroll" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {GUIDE_PANELS.map((panel, i) => (
            <div key={i} style={{ background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setActivePanel(p => p === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              >
                {panel.title}
                <ChevronRight size={16} style={{ transform: activePanel === i ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s', flexShrink: 0 }} />
              </button>
              {activePanel === i && (
                <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {panelBodies[i]}
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '20px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Tushunarli 🤝
        </button>
      </motion.div>
    </div>
  );
}
