import { useState, useEffect } from 'react';
import { Plus, Target, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBudget } from '../hooks/useBudget';
import api from '../api/axios';
import BudgetCard from '../components/budget/BudgetCard';
import BudgetModal from '../components/budget/BudgetModal';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { SkeletonCard } from '../components/common/Skeletons';

export default function BudgetPage() {
  const { budgets, addBudget, updateBudget, deleteBudget, getSpentAmount, loading: budgetLoading } = useBudget();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch all transactions (high limit to cover current period)
      const res = await api.get('/transactions', { params: { limit: '500', page: '1' } });
      setTransactions(res.data.data || []);
    } catch {
      toast.error('Failed to load transaction data for budget calculation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleCreate = async (data) => {
    try {
      await addBudget(data);
      toast.success(`Budget for "${data.category}" created!`);
    } catch {
      // Error is handled by context
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateBudget(editTarget.id, data);
      toast.success(`Budget updated!`);
      setEditTarget(null);
    } catch {
      // Error is handled by context
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDeleteAction = async () => {
    if (!deleteId) return;
    try {
      await deleteBudget(deleteId);
      toast.success('Budget deleted');
    } catch {
      // Error is handled by context
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (budget) => { setEditTarget(budget); setModalOpen(true); };
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };

  // Compute total overview
  const totalLimit   = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent   = budgets.reduce((s, b) => s + getSpentAmount(b, transactions), 0);
  const overBudget   = budgets.filter(b => getSpentAmount(b, transactions) > b.limit).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget Planner</h1>
          <p className="page-subtitle">Set spending limits and track progress in real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchTransactions} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Budget
          </button>
        </div>
      </div>

      {/* Overview summary strip */}
      {budgets.length > 0 && (
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', overflow: 'hidden' }}>
          {[
            { label: 'Total Budget', value: `₹${totalLimit.toLocaleString('en-IN')}`, color: 'var(--color-balance)' },
            { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, color: totalSpent > totalLimit ? 'var(--color-expense)' : 'var(--color-income)' },
            { label: 'Over-budget Categories', value: overBudget, color: overBudget > 0 ? 'var(--color-expense)' : 'var(--color-income)' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '20px 24px', background: 'var(--bg-glass)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{item.label}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading || budgetLoading ? <SkeletonCard count={3} /> : (
        budgets.length === 0 ? (
          <EmptyState
            title="No budgets yet"
            description="Create your first budget to start tracking spending limits."
            icon={Target}
          />
        ) : (
          <div className="budget-grid animate-fade-in">
            {budgets.map(budget => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                spent={getSpentAmount(budget, transactions)}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={editTarget ? handleUpdate : handleCreate}
        budget={editTarget}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteId(null); }}
        onConfirm={confirmDeleteAction}
        title="Delete Budget"
        message="This will permanently remove this budget category. Are you sure?"
        confirmText="Delete Budget"
        variant="danger"
      />
    </div>
  );
}
