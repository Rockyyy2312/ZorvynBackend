import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationBell({ onClick }) {
  const { unreadCount } = useNotifications();

  return (
    <button className="notif-bell-btn" onClick={onClick} aria-label="Notifications" title="Open Notifications">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="notif-badge">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
