import { useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const PALETTE = ['#10B981','#6366f1','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6','#ef4444'];

export default function BudgetCard({ budget, spent, onEdit, onDelete }) {
  const pct = Math.min((spent / budget.limit) * 100, 100);
  const remaining = budget.limit - spent;
  const statusClass = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'safe';
  const statusColor = pct >= 90 ? 'var(--color-expense)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-income)';

  return (
    <div className="budget-card glass-card animate-fade-in">
      <div className="budget-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="budget-color-dot" style={{ background: budget.color }} />
          <div>
            <p className="budget-card-title">{budget.category}</p>
            <p className="budget-card-period">{budget.period} budget</p>
          </div>
        </div>
        <div className="budget-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(budget)} style={{ padding: '4px' }}>
            <Edit3 size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(budget.id)}
            style={{ padding: '4px', color: 'var(--color-expense)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="budget-amounts">
        <span className="budget-spent">{formatCurrency(spent)}</span>
        <span className="budget-limit">of {formatCurrency(budget.limit)}</span>
      </div>

      <div className="budget-progress-bar-track">
        <div
          className={`budget-progress-bar-fill ${statusClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="budget-footer">
        <span className="budget-pct" style={{ color: statusColor }}>{pct.toFixed(0)}% used</span>
        <span className="budget-remaining">
          {remaining >= 0
            ? `${formatCurrency(remaining)} left`
            : <span style={{ color: 'var(--color-expense)' }}>{formatCurrency(Math.abs(remaining))} over!</span>}
        </span>
      </div>
    </div>
  );
}
