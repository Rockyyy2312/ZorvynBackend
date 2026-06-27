import { useState, useEffect } from 'react';
import { Calendar, DollarSign, RefreshCw, Repeat2, AlertCircle, Plus, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { detectRecurring, computeBurnSummary } from '../utils/recurringUtils';
import { formatCurrency } from '../utils/formatCurrency';
import { SkeletonCard } from '../components/common/Skeletons';
import ConfirmDialog from '../components/common/ConfirmDialog';

const MANUAL_SUB_KEY = 'nexo_manual_subscriptions';

function daysUntil(date) {
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Due now';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

function SubscriptionCard({ sub }) {
  const urgency = (new Date(sub.nextDate) - new Date()) / (1000 * 60 * 60 * 24);
  const urgencyColor = urgency <= 3 ? 'var(--color-expense)' : urgency <= 7 ? 'var(--color-warning)' : 'var(--text-muted)';

  return (
    <div className="subscription-card glass-card animate-fade-in">
      <span className="subscription-confidence">{sub.confidence}% match</span>

      <div className="subscription-card-top">
        <div className="subscription-icon" style={{ background: 'var(--bg-tertiary)' }}>
          {sub.icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="subscription-name">{sub.category}</p>
          <p className="subscription-category">{sub.occurrences}× detected · {sub.frequency}</p>
        </div>
      </div>

      <p className="subscription-amount">{formatCurrency(sub.amount)}</p>
      <p className="subscription-frequency">per {sub.frequency === 'bi-weekly' ? '2 weeks' : sub.frequency.replace('ly', '')}
        {sub.frequency !== 'monthly' && (
          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
            · ≈ {formatCurrency(sub.monthlyEquivalent)}/month
          </span>
        )}
      </p>

      <div className="subscription-next-date">
        <Calendar size={13} style={{ color: urgencyColor, flexShrink: 0 }} />
        <span style={{ color: urgencyColor, fontWeight: 600 }}>
          {daysUntil(sub.nextDate)}
        </span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {new Date(sub.nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Mini bar: proportion of monthly burn */}
      <div style={{ marginTop: '12px', height: '3px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
        <div style={{ height: '100%', width: `${Math.min(sub.confidence, 100)}%`, borderRadius: 'var(--radius-full)', background: 'var(--accent-primary)' }} />
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [manualSubs, setManualSubs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MANUAL_SUB_KEY)) || []; } catch { return []; }
  });
  const [burn, setBurn]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [isDemo, setIsDemo]               = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const MOCK_SUBSCRIPTIONS = [
    {
      id: 'sub-netflix',
      category: 'Netflix',
      icon: '🎬',
      confidence: 98,
      amount: 649,
      frequency: 'monthly',
      occurrences: 4,
      monthlyEquivalent: 649,
      nextDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: 'sub-spotify',
      category: 'Spotify',
      icon: '🎵',
      confidence: 95,
      amount: 119,
      frequency: 'monthly',
      occurrences: 5,
      monthlyEquivalent: 119,
      nextDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
    {
      id: 'sub-aws',
      category: 'AWS Cloud',
      icon: '💻',
      confidence: 90,
      amount: 2450,
      frequency: 'monthly',
      occurrences: 3,
      monthlyEquivalent: 2450,
      nextDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18).toISOString(),
    },
    {
      id: 'sub-gym',
      category: 'Gym Membership',
      icon: '💪',
      confidence: 85,
      amount: 1500,
      frequency: 'monthly',
      occurrences: 6,
      monthlyEquivalent: 1500,
      nextDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
    }
  ];

  const fetchAndDetect = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions', { params: { limit: '500', page: '1' } });
      const txs = res.data.data || [];
      const detected = detectRecurring(txs);
      setSubscriptions(detected);
      setBurn(computeBurnSummary(detected));
      setIsDemo(false);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setSubscriptions(MOCK_SUBSCRIPTIONS);
    setBurn(computeBurnSummary(MOCK_SUBSCRIPTIONS));
    setIsDemo(true);
  };

  useEffect(() => { fetchAndDetect(); }, []);

  // Persist manual subs
  useEffect(() => {
    localStorage.setItem(MANUAL_SUB_KEY, JSON.stringify(manualSubs));
  }, [manualSubs]);

  // Combine detected + manual
  const allSubscriptions = [...subscriptions, ...manualSubs];

  // Recompute burn whenever combined list changes
  useEffect(() => {
    if (allSubscriptions.length > 0) {
      setBurn(computeBurnSummary(allSubscriptions));
    }
  }, [subscriptions, manualSubs]);

  const handleAddManual = (sub) => {
    setManualSubs(prev => [...prev, sub]);
  };

  const handleRemoveManual = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmRemove = () => {
    setManualSubs(prev => prev.filter(s => s.id !== deleteId));
    setDeleteId(null);
  };

  if (loading) return <SkeletonCard count={4} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Subscription Tracker</h1>
            {isDemo && (
              <span style={{ fontSize: '0.6875rem', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)' }}>
                DEMO MODE
              </span>
            )}
          </div>
          <p className="page-subtitle">
            {isDemo 
              ? 'Previewing subscription tracking models with simulated data patterns'
              : 'Auto-detected recurring payments from your transaction history'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isDemo && (
            <button className="btn btn-secondary" onClick={fetchAndDetect}>
              Reset to My Data
            </button>
          )}
          <button className="btn btn-secondary" onClick={isDemo ? handleLoadDemo : fetchAndDetect}>
            <RefreshCw size={16} /> Re-scan
          </button>
          <button className="btn btn-primary" onClick={() => setManualModalOpen(true)}>
            <Plus size={16} /> Add Manually
          </button>
        </div>
      </div>

      {/* Burn Summary Banner */}
      {burn && (
        <div className="glass-card">
          <div className="subscription-burn-banner">
            {[
              { label: 'Detected Subscriptions',   val: burn.count,                          color: 'var(--color-balance)', icon: Repeat2 },
              { label: 'Monthly Subscription Burn', val: formatCurrency(burn.monthlyTotal),   color: 'var(--color-expense)', icon: DollarSign },
              { label: 'Yearly Subscription Burn',  val: formatCurrency(burn.yearlyTotal),    color: 'var(--color-expense)', icon: DollarSign },
              { label: 'Due in Next 30 Days',        val: burn.upcoming.length + ' payments', color: burn.upcoming.length > 0 ? 'var(--color-warning)' : 'var(--color-income)', icon: Calendar },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <s.icon size={14} style={{ color: s.color }} />
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Upcoming charges strip */}
          {burn.upcoming.length > 0 && (
            <div style={{ padding: '0 24px 20px' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />
                Upcoming in next 30 days
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {burn.upcoming.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span>{s.icon}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{s.category}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600 }}>{formatCurrency(s.amount)} · {daysUntil(s.nextDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards grid */}
      {allSubscriptions.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Repeat2 size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No recurring payments detected</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px', marginBottom: '24px' }}>
            Add more transactions (at least 2+ months in the same category) for the detector to find patterns, or add one manually.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleLoadDemo} style={{ margin: '0 auto' }}>
              💡 Preview with Demo Data
            </button>
            <button className="btn btn-secondary" onClick={() => setManualModalOpen(true)}>
              <Plus size={14} /> Add Manually
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Found <strong style={{ color: 'var(--text-primary)' }}>{allSubscriptions.length}</strong> recurring payment pattern{allSubscriptions.length !== 1 ? 's' : ''}
            {manualSubs.length > 0 && <span> ({manualSubs.length} added manually)</span>}
            — sorted by monthly cost
          </p>
          <div className="subscription-cards-grid">
            {allSubscriptions.map(sub => (
              <div key={sub.id} style={{ position: 'relative' }}>
                <SubscriptionCard sub={sub} />
                {sub.isManual && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemoveManual(sub.id)}
                    style={{ position: 'absolute', top: 8, right: 8, padding: '4px', color: 'var(--color-expense)' }}
                    title="Remove manual subscription"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <ManualSubModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={handleAddManual}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteId(null); }}
        onConfirm={confirmRemove}
        title="Remove Subscription"
        message="Remove this manually added subscription from your tracker?"
        confirmText="Remove"
        variant="warning"
      />
    </div>
  );
}

function ManualSubModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDate, setNextDate] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🎬');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !amount || !nextDate) {
      toast.error('Please fill in all fields');
      return;
    }

    const monthlyEquivalent =
      frequency === 'weekly' ? parseFloat(amount) * 4.33 :
      frequency === 'bi-weekly' ? parseFloat(amount) * 2.16 :
      frequency === 'yearly' ? parseFloat(amount) / 12 :
      parseFloat(amount);

    onSubmit({
      id: `manual-${Date.now()}`,
      category: name,
      icon: categoryEmoji,
      confidence: 100,
      amount: parseFloat(amount),
      frequency,
      occurrences: 1,
      monthlyEquivalent,
      nextDate: new Date(nextDate).toISOString(),
      isManual: true,
    });

    // Reset fields
    setName('');
    setAmount('');
    setFrequency('monthly');
    setNextDate('');
    setCategoryEmoji('🎬');
    onClose();
    toast.success('Subscription added manually');
  };

  const emojis = ['🎬', '🎵', '💻', '💪', '🏠', '⚡', '🏥', '🚗', '🛍️', '📦', '🍔', '✈️'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="confirm-dialog"
        style={{ maxWidth: '450px', textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 className="confirm-dialog-title" style={{ margin: 0 }}>Add Subscription Manually</h3>
          <button className="confirm-dialog-close" onClick={onClose} style={{ top: '16px', right: '16px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>Subscription Name</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g. Netflix, Gym, Office rent"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>Amount</label>
              <input
                type="number"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="1"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>Frequency</label>
              <select
                className="form-input"
                style={{ width: '100%' }}
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>Next Payment Date</label>
            <input
              type="date"
              className="form-input"
              style={{ width: '100%' }}
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>Icon / Emoji</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
              {emojis.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setCategoryEmoji(e)}
                  style={{
                    background: categoryEmoji === e ? 'var(--accent-primary)' : 'transparent',
                    fontSize: '1.25rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Subscription</button>
          </div>
        </form>
      </div>
    </div>
  );
}
