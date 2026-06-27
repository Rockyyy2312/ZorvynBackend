import { useState } from 'react';
import { X, CheckCheck, Trash2, Plus, BellRing } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { toast } from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function AddAlertForm({ onAdd, onClose }) {
  const [name, setName]           = useState('');
  const [type, setType]           = useState('transaction_amount');
  const [threshold, setThreshold] = useState('');
  const [category, setCategory]   = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !threshold || isNaN(threshold) || parseFloat(threshold) <= 0) {
      toast.error('Enter valid alert name and threshold amount');
      return;
    }
    onAdd({ name: name.trim(), type, threshold, category });
    toast.success('Alert rule created!');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', margin: '12px 20px' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>New Alert Rule</p>
      <input className="form-input" placeholder="Alert name (e.g. Large Transaction)" style={{ fontSize: '0.875rem' }}
        value={name} onChange={e => setName(e.target.value)} />
      <select className="form-select" style={{ fontSize: '0.875rem' }} value={type} onChange={e => setType(e.target.value)}>
        <option value="transaction_amount">Transaction exceeds amount</option>
      </select>
      <input type="number" className="form-input" placeholder="Threshold amount (₹)" style={{ fontSize: '0.875rem' }}
        value={threshold} onChange={e => setThreshold(e.target.value)} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Create Alert</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

export default function NotificationDrawer({ onClose }) {
  const { notifications, alertRules, markRead, markAllRead, clearAll, addAlertRule, deleteAlertRule, toggleAlertRule } = useNotifications();
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [tab, setTab] = useState('notifs'); // 'notifs' | 'alerts'

  return (
    <>
      <div className="notif-drawer-overlay" onClick={onClose} />
      <div className="notif-drawer">
        {/* Header */}
        <div className="notif-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BellRing size={20} style={{ color: 'var(--accent-primary)' }} />
            <span className="notif-drawer-title">Notifications</span>
          </div>
          <div className="notif-drawer-actions">
            <button className="btn btn-ghost btn-sm" onClick={markAllRead} title="Mark all read">
              <CheckCheck size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={clearAll} title="Clear all"
              style={{ color: 'var(--color-expense)' }}>
              <Trash2 size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {[['notifs','Notifications'],['alerts','Alert Rules']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px', fontSize: '0.8125rem', fontWeight: 600,
              background: 'transparent', color: tab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all var(--transition-fast)'
            }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'notifs' ? (
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <BellRing size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => markRead(n.id)}>
                  <div className="notif-item-header">
                    <span className={`notif-dot ${n.type}`} />
                    <span className="notif-item-title">{n.title}</span>
                  </div>
                  <p className="notif-item-message">{n.message}</p>
                  <p className="notif-item-time">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{alertRules.length} active rules</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddAlert(v => !v)}>
                <Plus size={14} /> Add Rule
              </button>
            </div>

            {showAddAlert && (
              <AddAlertForm onAdd={addAlertRule} onClose={() => setShowAddAlert(false)} />
            )}

            <div className="alert-rules-section">
              {alertRules.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>
                  No alert rules yet. Add one above.
                </p>
              ) : (
                alertRules.map(rule => (
                  <div key={rule.id} className="alert-rule-item">
                    <div style={{ flex: 1 }}>
                      <p className="alert-rule-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</p>
                      <p className="alert-rule-label" style={{ fontSize: '0.75rem' }}>
                        Threshold: ₹{rule.threshold.toLocaleString('en-IN')}
                      </p>
                    </div>
                    {/* Toggle switch */}
                    <label className="toggle-switch">
                      <input type="checkbox" checked={rule.active} onChange={() => toggleAlertRule(rule.id)} />
                      <span className="toggle-slider" />
                    </label>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteAlertRule(rule.id)}
                      style={{ padding: '4px', color: 'var(--color-expense)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
