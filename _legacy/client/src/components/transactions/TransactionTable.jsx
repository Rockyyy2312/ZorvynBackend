import { ArrowUpRight, ArrowDownRight, Edit3, Trash2, ClipboardList } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import EmptyState from '../common/EmptyState';

export default function TransactionTable({ 
  transactions = [], 
  isAdmin = false, 
  onEdit = () => {}, 
  onDelete = () => {} 
}) {
  if (transactions.length === 0) {
    return <EmptyState title="No transactions found" description="Try adjusting your filter search criteria." icon={ClipboardList} />;
  }

  // Compute page totals
  const pageIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const pageExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const pageNet     = pageIncome - pageExpense;

  return (
    <div className="table-container glass-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Notes</th>
            {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx._id}>
              <td>
                <span className={`badge badge-${tx.type}`}>
                  {tx.type === 'income' ? (
                    <ArrowUpRight size={14} style={{ marginRight: '2px' }} />
                  ) : (
                    <ArrowDownRight size={14} style={{ marginRight: '2px' }} />
                  )}
                  {tx.type}
                </span>
              </td>
              <td style={{ fontWeight: 500 }}>{tx.category}</td>
              <td className={tx.type === 'income' ? 'badge-income' : 'badge-expense'} style={{ fontWeight: 600 }}>
                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
              </td>
              <td>{formatDate(tx.date)}</td>
              <td style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{tx.notes || '—'}</td>
              
              {isAdmin && (
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => onEdit(tx)}
                      title="Edit Transaction"
                      style={{ padding: '4px' }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => onDelete(tx._id)}
                      title="Delete Transaction"
                      style={{ padding: '4px', color: 'var(--color-expense)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {/* Page totals footer */}
        <tfoot>
          <tr className="txn-totals-row">
            <td colSpan={2} style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Page Totals
            </td>
            <td colSpan={isAdmin ? 4 : 3}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-income)', fontWeight: 700 }}>
                  <ArrowUpRight size={12} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                  Income: {formatCurrency(pageIncome)}
                </span>
                <span style={{ color: 'var(--color-expense)', fontWeight: 700 }}>
                  <ArrowDownRight size={12} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                  Expense: {formatCurrency(pageExpense)}
                </span>
                <span style={{ color: pageNet >= 0 ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: 800 }}>
                  Net: {formatCurrency(pageNet)}
                </span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
