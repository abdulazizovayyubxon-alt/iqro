import React from 'react';
import { Shield } from 'lucide-react';
import ModalShell from './ModalShell';

/** Maxfiylik siyosati (statik matn) */
export default function PrivacyModal({ onClose }) {
  return (
    <ModalShell onClose={onClose} maxWidth={500} style={{ padding: '24px' }}>
      <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={22} style={{ color: 'var(--blue)' }} /> Maxfiylik Siyosati
      </div>
      <div style={{
        maxHeight: '320px',
        overflowY: 'auto',
        fontSize: '13px',
        lineHeight: '1.6',
        color: 'var(--text2)',
        margin: '16px 0',
        paddingRight: '8px',
        borderBottom: '1px solid var(--border)'
      }} className="pp-policy-scroll">
        <p style={{ marginBottom: '12px' }}><strong>1. Umumiy qoidalar</strong><br />
          Ushbu Maxfiylik Siyosati IQRO platformasi foydalanuvchilarining shaxsiy ma'lumotlarini yig'ish, saqlash va himoya qilish tartibini belgilaydi. Biz foydalanuvchilarimizning maxfiyligini hurmat qilamiz va ma'lumotlar xavfsizligini ta'minlashga mas'uliyat bilan yondashamiz.</p>

        <p style={{ marginBottom: '12px' }}><strong>2. Yig'iladigan ma'lumotlar</strong><br />
          Platformadan ro'yxatdan o'tish va foydalanish davomida quyidagi shaxsiy ma'lumotlar to'planishi mumkin:
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          <li>Ism va familiya;</li>
          <li>Telefon raqami;</li>
          <li>Tanlangan o'quv fanlari, maqsadlar va imtihon sanasi;</li>
          <li>Ilovadan foydalanish va test natijalari statistikasi.</li>
        </ul>

        <p style={{ marginBottom: '12px' }}><strong>3. Ma'lumotlardan foydalanish maqsadi</strong><br />
          Siz taqdim etgan ma'lumotlar quyidagi maqsadlarda ishlatiladi:
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          <li>O'quv jarayonini shaxsiylashtirish va fanga mos yuklash ekranlarini ko'rsatish;</li>
          <li>Premium obuna va to'lovlarni boshqarish;</li>
          <li>Do'stlarni taklif etish (referral) dasturini to'g'ri ishlashini ta'minlash va chegirmalarni hisoblash;</li>
          <li>Platforma barqarorligini tahlil qilish va xatoliklarni bartaraf etish.</li>
        </ul>

        <p style={{ marginBottom: '12px' }}><strong>4. Ma'lumotlar xavfsizligi va himoyasi</strong><br />
          Foydalanuvchilarning ma'lumotlari Firebase xavfsizlik qoidalari orqali himoyalangan va begona shaxslarga taqdim etilmaydi. Shaxsiy ma'lumotlar uchinchi shaxslarga sotilmaydi yoki ijaraga berilmaydi.</p>

        <p style={{ marginBottom: '12px' }}><strong>5. Aloqa va murojaat</strong><br />
          Maxfiylik siyosati bo'yicha savollaringiz yoki takliflaringiz bo'lsa, platformaning qo'llab-quvvatlash xizmati yoki admin paneli orqali murojaat qilishingiz mumkin.</p>
      </div>
      <button
        onClick={onClose}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          background: 'var(--blue)',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'opacity 0.2s'
        }}
      >
        Tushunarli 🤝
      </button>
    </ModalShell>
  );
}
