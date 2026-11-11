import { describe, it, expect } from 'vitest';
import { resolveAvatar, avatarUrl, AVATARS } from '../data/avatars';

describe('Avatar Resolution System', () => {
  it('AVATARS royxati mavjud va har birida id va url bor', () => {
    expect(AVATARS.length).toBeGreaterThan(30);
    expect(AVATARS[0]).toHaveProperty('id');
    expect(AVATARS[0]).toHaveProperty('url');
  });

  it('avatarUrl mavjud id uchun url qaytaradi, bolmasa null', () => {
    expect(avatarUrl('teacher-01')).toBeTruthy();
    expect(avatarUrl('mavjud_emas_id')).toBeNull();
    expect(avatarUrl(null)).toBeNull();
  });

  it('resolveAvatar: user.avatarId mavjud bolganda togri url qaytaradi', () => {
    const user = { avatarId: 'teacher-01' };
    expect(resolveAvatar(user)).toBe(avatarUrl('teacher-01'));
  });

  it('resolveAvatar: user.avatarId null, lekin userDoc.avatarId bolganda togri url qaytaradi', () => {
    const user = { uid: 'user_1', avatarId: null };
    const userDoc = { avatarId: 'teacher-05' };
    expect(resolveAvatar(user, userDoc)).toBe(avatarUrl('teacher-05'));
  });

  it('resolveAvatar: avatarId yoq, lekin userDoc.photoURL bolganda photoURL qaytaradi', () => {
    const user = { uid: 'user_1' };
    const userDoc = { photoURL: 'https://example.com/custom-photo.jpg' };
    expect(resolveAvatar(user, userDoc)).toBe('https://example.com/custom-photo.jpg');
  });

  it('resolveAvatar: user.photoURL bolganda undan foydalanadi', () => {
    const user = { photoURL: 'https://example.com/google-photo.jpg' };
    expect(resolveAvatar(user)).toBe('https://example.com/google-photo.jpg');
  });

  it('resolveAvatar: ikkalasida ham rasm yoq bolganda null qaytaradi (harf korinishi uchun)', () => {
    const user = { uid: 'user_1' };
    const userDoc = { displayName: 'Ayyubxon' };
    expect(resolveAvatar(user, userDoc)).toBeNull();
    expect(resolveAvatar(null)).toBeNull();
  });
});
