import { describe, it, expect } from 'vitest';
import {
  classifyLead,
  extractCleanPhone,
  formatPrettyPhone,
  buildLeadPitch,
} from '../utils/salesLeads';
import {
  matchesAnnouncementAudience,
  buildAnnouncementItems,
  describeAudience,
} from '../utils/announcements';

const NOW = new Date('2026-11-25T12:00:00.000Z').getTime();
const isoDaysFromNow = (days) => new Date(NOW + days * 86400000).toISOString();

describe('salesLeads — telefon va lid tasnifi', () => {
  it('eski hisoblarda telefonni @iqro.uz login emailidan ham tiklaydi', () => {
    expect(extractCleanPhone({ email: '998901234567@iqro.uz' })).toBe('998901234567');
    expect(extractCleanPhone({ phone: '90 123-45-67' })).toBe('998901234567');
    expect(formatPrettyPhone('998901234567')).toBe('+998 90 123-45-67');
  });

  it('admin, hamkor, maktab va muddati uzoq Pro obunachilarni lid ro‘yxatidan chiqaradi', () => {
    expect(classifyLead({ id: 'u1', role: 'admin', createdAt: isoDaysFromNow(-8) }, null, NOW)).toBeNull();
    expect(classifyLead({ id: 'u2', role: 'partner', createdAt: isoDaysFromNow(-8) }, null, NOW)).toBeNull();
    expect(classifyLead({ id: 'u3', schoolId: 'sch_1', createdAt: isoDaysFromNow(-8) }, null, NOW)).toBeNull();
    expect(classifyLead({
      id: 'u4',
      isPremium: true,
      premiumExpire: isoDaysFromNow(45),
    }, { totalAnswered: 200 }, NOW)).toBeNull();
  });

  it('promo-kod kiritib hali to‘lamagan foydalanuvchini eng yuqori ustuvorlikda (promo_pending) ajratadi', () => {
    const lead = classifyLead({
      id: 'u_promo',
      displayName: 'Aziza Karimova',
      email: '998931112233@iqro.uz',
      subject: 'matematika',
      createdAt: isoDaysFromNow(-8),
      promoDiscount: { code: 'ZEHIN25', percent: 25, expiresAt: isoDaysFromNow(20) },
    }, {
      totalAnswered: 80,
      totalCorrect: 64,
      lastActiveAt: isoDaysFromNow(-0.5),
    }, NOW);

    expect(lead).not.toBeNull();
    expect(lead.primarySegment).toBe('promo_pending');
    expect(lead.promoCode).toBe('ZEHIN25');
    expect(lead.accuracy).toBe(80);
    expect(lead.heatScore).toBeGreaterThanOrEqual(80);

    const pitch = buildLeadPitch(lead, 'Matematika');
    expect(pitch).toContain('Aziza ustoz');
    expect(pitch).toContain('ZEHIN25');
    expect(pitch).toContain('-25%');
  });

  it('Pro muddati ≤7 kunda tugaydigan obunachini expiring_pro sifatida oladi', () => {
    const lead = classifyLead({
      id: 'u_exp',
      displayName: 'Sardor Aliyev',
      phone: '998997776655',
      isPremium: true,
      premiumExpire: isoDaysFromNow(3),
    }, { totalAnswered: 120, totalCorrect: 90 }, NOW);

    expect(lead).not.toBeNull();
    expect(lead.primarySegment).toBe('expiring_pro');
    expect(lead.proDaysLeft).toBe(3);
    expect(buildLeadPitch(lead, 'Tarix')).toContain('3 kun qoldi');
  });

  it('8–10 kunlik urgency oynasidagi ustozni urgency sifatida tasniflaydi', () => {
    const lead = classifyLead({
      id: 'u_urg',
      displayName: 'Dilnoza',
      createdAt: isoDaysFromNow(-8.5),
      referredBy: 'ref_1',
      referralDiscount: 50,
    }, { totalAnswered: 40, totalCorrect: 30 }, NOW);

    expect(lead).not.toBeNull();
    expect(lead.primarySegment).toBe('urgency');
    expect(lead.referralPct).toBe(50);
    expect(buildLeadPitch(lead, 'Ona tili')).toContain('-50%');
  });
});

describe('announcements — segmentlangan auditoriya filtri', () => {
  it('oddiy (auditoriyasiz) e’lon barcha foydalanuvchilarga ko‘rinadi va snapshot formatini o‘zgartirmaydi', () => {
    const items = buildAnnouncementItems([
      { id: 'a1', title: 'Umumiy', message: 'Salom', type: 'info', date: '2026-11-25T10:00:00.000Z', targetUser: 'all' },
    ]);
    expect(items[0]).toEqual({
      id: 'a1',
      title: 'Umumiy',
      message: 'Salom',
      type: 'info',
      date: '2026-11-25T10:00:00.000Z',
    });
    expect(matchesAnnouncementAudience(items[0], null, NOW)).toBe(true);
  });

  it('fan bo‘yicha e’lon faqat o‘sha fan ustoziga mos keladi', () => {
    const notif = {
      id: 's1',
      title: 'Matematika yangiligi',
      date: '2026-11-25T10:00:00.000Z',
      audience: { mode: 'subject', subject: 'matematika' },
    };
    expect(matchesAnnouncementAudience(notif, null, NOW)).toBe(false);
    expect(matchesAnnouncementAudience(notif, { userDoc: { subject: 'matematika', isPremium: false } }, NOW)).toBe(true);
    expect(matchesAnnouncementAudience(notif, { userDoc: { subject: 'tarix', isPremium: false } }, NOW)).toBe(false);
    expect(describeAudience(notif.audience, () => 'Matematika')).toBe('📘 Fan: Matematika');
  });

  it('non_pro, pro va expiring_pro segmentlarini to‘g‘ri ajratadi', () => {
    const proProfile = { userDoc: { isPremium: true, premiumExpire: isoDaysFromNow(30), createdAt: isoDaysFromNow(-60) } };
    const expiringProProfile = { userDoc: { isPremium: true, premiumExpire: isoDaysFromNow(4), createdAt: isoDaysFromNow(-60) } };
    const freeProfile = { userDoc: { isPremium: false, createdAt: isoDaysFromNow(-4) } };

    expect(matchesAnnouncementAudience({ audience: { mode: 'non_pro' } }, freeProfile, NOW)).toBe(true);
    expect(matchesAnnouncementAudience({ audience: { mode: 'non_pro' } }, proProfile, NOW)).toBe(false);

    expect(matchesAnnouncementAudience({ audience: { mode: 'pro' } }, proProfile, NOW)).toBe(true);
    expect(matchesAnnouncementAudience({ audience: { mode: 'pro' } }, freeProfile, NOW)).toBe(false);

    expect(matchesAnnouncementAudience({ audience: { mode: 'expiring_pro' } }, expiringProProfile, NOW)).toBe(true);
    expect(matchesAnnouncementAudience({ audience: { mode: 'expiring_pro' } }, proProfile, NOW)).toBe(false);
  });
});
