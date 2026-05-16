import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS } from '../config';

export const useAdmin = () => {
  const { user } = useAuth();
  // Email ro'yxatda bo'lsa YOKI bazada role: 'admin' bo'lsa
  const isAdmin = user && (ADMIN_EMAILS.includes(user.email) || user.role === 'admin');
  return { isAdmin };
};
