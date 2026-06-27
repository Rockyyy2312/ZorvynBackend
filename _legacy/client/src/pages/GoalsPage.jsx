import { useState, useEffect } from 'react';
import {
  Target, Plus, Trash2, Edit3, TrendingUp, Calendar, CheckCircle2,
  CircleDollarSign, RefreshCw, X, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/formatCurrency';
import ConfirmDialog from '../components/common/ConfirmDialog';

const STORAGE_KEY = 'nexo_goals';

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

const COLORS = ['#34d399', '#6366f1', '#f59e0b', '#ec4899', '#38bdf8', '#a78bfa', '#fb923c'];
const ICONS = ['🎯', '🏠', '🚗', '✈️', '💻', '🎓', '💍', '🏋️', '📱', '💰'];

function GoalModal({ isOpen, onClose, onSubmit, goal }) {
  const [form, setForm] = useState({ name: '', target: '', deadline: '', icon: '🎯', color: '#34d399', saved: '' });

  useEffect(() => {
    if (goal) {
      setForm({
        name: goal.name,
        target: String(goal.target),
        deadline: goal.deadline?.split('T')[0] || '',
        icon: goal.icon || '🎯',
        color: goal.color || '#34d399',
        saved: String(goal.saved || 0),
      });
    } else {
      setForm({ name: '', target: '', deadline: '', icon: '🎯', color: '#34d399', saved: '0' });
    }
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.target) return;
    onSubmit({
      name: form.name.trim(),
      target: parseFloat(form.target),
      deadline: form.deadline || null,
      icon: form.icon,
      color: form.color,
      saved: parseFloat(form.saved) || 0,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{goal ? 'Edit Goal' : 'New Savings Goal'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Goal Name</label>
            <input className="form-input" placeholder="e.g. Emergency Fund" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Target Amount (₹)</label>
              <input className="form-input" type="number" min="1" placeholder="50000" value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Already Saved (₹)</label>
              <input className="form-input" type="number" min="0" placeholder="0" value={form.saved}
                onChange={e => setForm(f => ({ ...f, saved: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Deadline (optional)</label>
            <input className="form-input" type="date" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ICONS.map(ico => (
                <button type="button" key={ico} onClick={() => setForm(f => ({ ...f, icon: ico }))}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)', fontSize: '1.1rem',
                    background: form.icon === ico ? 'var(--accent-primary-bg)' : 'var(--bg-tertiary)',
                    border: `1px solid ${form.icon === ico ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {ico}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    boxShadow: form.color === c ? `0 0 12px ${c}80` : 'none',
                  }} />
              ))}
            </div>
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
            {goal ? 'Update Goal' : 'Create Goal'}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onAddSavings }) {
  const pct = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
  const isComplete = pct >= 100;
  const remaining = Math.max(goal.target - goal.saved, 0);

  const daysLeft = goal.deadline
    ? Math.max(0, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const monthlyNeeded = daysLeft && daysLeft > 0 && remaining > 0
    ? remaining / (daysLeft / 30)
    : null;

  return (
    <div className="goal-card glass-card animate-fade-in">
      {isComplete && <div className="goal-confetti">✨</div>}

      <div className="goal-card-top">
        <div className="goal-icon" style={{ background: `${goal.color}20`, color: goal.color }}>
          {goal.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="goal-name">{goal.name}</p>
          {goal.deadline && (
            <p className="goal-deadline">
              <Calendar size={11} /> {daysLeft !== null ? `${daysLeft} days left` : 'No deadline'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)} style={{ padding: '4px' }}>
            <Edit3 size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(goal.id)}
            style={{ padding: '4px', color: 'var(--color-expense)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="goal-progress-section">
        <div className="goal-amounts">
          <span className="goal-saved" style={{ color: goal.color }}>
            {formatCurrency(goal.saved)}
          </span>
          <span className="goal-target">of {formatCurrency(goal.target)}</span>
        </div>

        <div className="goal-progress-track">
          <div className="goal-progress-fill" style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
            boxShadow: `0 0 12px ${goal.color}60`,
          }} />
        </div>

        <div className="goal-pct-row">
          <span className="goal-pct" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
          {remaining > 0 && (
            <span className="goal-remaining">{formatCurrency(remaining)} to go</span>
          )}
          {isComplete && (
            <span style={{ color: 'var(--color-income)', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Goal reached!
            </span>
          )}
        </div>
      </div>

      {monthlyNeeded && !isComplete && (
        <div className="goal-monthly-hint">
          <Sparkles size={12} />
          Save ~{formatCurrency(Math.ceil(monthlyNeeded))}/month to hit your target
        </div>
      )}

      {!isComplete && (
        <button className="btn btn-secondary btn-sm goal-add-savings-btn"
          onClick={() => onAddSavings(goal)}>
          <Plus size={14} /> Add Savings
        </button>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState(loadGoals);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { saveGoals(goals); }, [goals]);

  const handleCreate = (data) => {
    setGoals(prev => [...prev, { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
    toast.success(`Goal "${data.name}" created!`);
  };

  const handleUpdate = (data) => {
    setGoals(prev => prev.map(g => g.id === editTarget.id ? { ...g, ...data } : g));
    toast.success('Goal updated!');
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setGoals(prev => prev.filter(g => g.id !== deleteId));
    toast.success('Goal deleted');
    setDeleteId(null);
  };

  const handleAddSavings = (goal) => {
    const amount = prompt('Enter amount to add to savings:');
    if (!amount || isNaN(amount)) return;
    setGoals(prev => prev.map(g =>
      g.id === goal.id ? { ...g, saved: g.saved + parseFloat(amount) } : g
    ));
    toast.success(`Added ${formatCurrency(parseFloat(amount))} to "${goal.name}"`);
  };

  const openEdit = (goal) => { setEditTarget(goal); setModalOpen(true); };
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };

  // Summary
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved  = goals.reduce((s, g) => s + g.saved, 0);
  const completed   = goals.filter(g => g.saved >= g.target).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">Set targets and track your progress towards financial milestones</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Summary strip */}
      {goals.length > 0 && (
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', overflow: 'hidden' }}>
          {[
            { label: 'Total Goals', value: goals.length, color: 'var(--color-balance)' },
            { label: 'Total Target', value: formatCurrency(totalTarget), color: 'var(--accent-primary)' },
            { label: 'Total Saved', value: formatCurrency(totalSaved), color: 'var(--color-income)' },
            { label: 'Completed', value: completed, color: completed > 0 ? 'var(--color-income)' : 'var(--text-muted)' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '16px 20px', background: 'var(--bg-glass)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>{item.label}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Goals grid */}
      {goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No savings goals yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px', marginBottom: '24px' }}>
            Create your first goal to start tracking your savings progress.
          </p>
          <button className="btn btn-primary" onClick={openCreate} style={{ margin: '0 auto' }}>
            <Plus size={16} /> Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddSavings={handleAddSavings}
            />
          ))}
        </div>
      )}

      <GoalModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={editTarget ? handleUpdate : handleCreate}
        goal={editTarget}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Goal"
        message="This will permanently remove this savings goal. This action cannot be undone."
        confirmText="Delete Goal"
        variant="danger"
      />
    </div>
  );
}
