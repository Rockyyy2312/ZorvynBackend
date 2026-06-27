import { ArrowUpRight, ArrowDownRight, ClipboardList } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import EmptyState from '../common/EmptyState';

export default function RecentTransactions({ transactions = [] }) {
  if (transactions.length === 0) {
    return <EmptyState title="No transactions yet" description="All recent transactions will appear here." icon={ClipboardList} />;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Notes</th>
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
              <td style={{ fontSize: '0.8125rem', opacity: 0.8 }}>
                {tx.notes || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
