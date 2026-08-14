import { useAuth } from '../context/AuthContext';
import { useAdmin } from './useAdmin';

/**
 * usePartner — Foydalanuvchida Hamkor (Partner/Ustoz) huquqi borligini tekshirish.
 */
export const usePartner = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const authResolved = !!user?._firebaseUser;

  const isPartner = !!user && authResolved && (
    isAdmin ||
    user.role === 'partner' ||
    user.role === 'mentor' ||
    Boolean(user.partnerCode)
  );

  const partnerCode = user?.partnerCode || null;

  return { isPartner, partnerCode, isAdmin };
};
