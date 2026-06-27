import { useAuth } from '../../hooks/useAuth';

export default function RoleGate({ allowedRoles, fallback = null, children }) {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return fallback;
  }

  return children;
}
