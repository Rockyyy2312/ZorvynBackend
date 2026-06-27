import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../notifications/NotificationBell';
import NotificationDrawer from '../notifications/NotificationDrawer';
import ThemeSelector from './ThemeSelector';

export default function Topbar({ onMenuOpen }) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="app-topbar">
        <div className="topbar-left">
          <button className="menu-toggle" onClick={onMenuOpen} aria-label="Toggle Navigation">
            <Menu size={20} />
          </button>
          <span className="topbar-greeting">
            Hello, <strong>{user?.name || 'User'}</strong>
          </span>
        </div>

        <div className="topbar-right">
          {user && (
            <span className={`badge badge-${user.role}`}>
              {user.role}
            </span>
          )}
          <ThemeSelector />
          <NotificationBell onClick={() => setDrawerOpen(true)} />
        </div>
      </header>

      {drawerOpen && (
        <NotificationDrawer onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
