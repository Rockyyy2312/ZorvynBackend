import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, Target, Lightbulb, FileText,
  LogOut, TrendingUp, Bot, Activity, Repeat2, Shield, Trophy
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../common/Logo';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
      { to: '/transactions', label: 'Transactions',   icon: ReceiptText },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/budget',   label: 'Budget Planner',   icon: Target },
      { to: '/goals',    label: 'Savings Goals',    icon: Trophy },
      { to: '/insights', label: 'Smart Insights',   icon: Lightbulb },
      { to: '/reports',  label: 'Reports & Export', icon: FileText },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { to: '/health',        label: 'Health Score',   icon: Shield },
      { to: '/forecast',      label: 'Cash Forecast',  icon: Activity },
      { to: '/subscriptions', label: 'Subscriptions',  icon: Repeat2 },
      { to: '/ai-advisor',    label: 'AI Advisor',     icon: Bot },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ padding: '0px 10px 10px' }}>
          <Logo variant="compact" size="sm" />
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <span className="sidebar-section-title">{group.label}</span>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon className="sidebar-link-icon" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">{getInitials(user.name)}</div>
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{user.name}</p>
                <span className="sidebar-user-role">{user.role}</span>
              </div>
            </div>
          )}
          <button onClick={logout} className="sidebar-link"
            style={{ width: '100%', marginTop: '8px', background: 'transparent' }}>
            <LogOut className="sidebar-link-icon" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
