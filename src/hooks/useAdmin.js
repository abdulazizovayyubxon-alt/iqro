import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS } from '../config';

export const useAdmin = () => {
  const { user } = useAuth();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);
  return { isAdmin };
};
