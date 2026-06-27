import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

export default function SummaryCards({ summary = {} }) {
  const { totalIncome = 0, totalExpense = 0, netBalance = 0 } = summary;

  const cardData = [
    {
      title: 'Total Income',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      classType: 'income',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      classType: 'expense',
    },
    {
      title: 'Net Balance',
      value: formatCurrency(netBalance),
      icon: Wallet,
      classType: 'balance',
    }
  ];

  return (
    <div className="summary-cards animate-fade-in-up">
      {cardData.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className={`summary-card glass-card ${card.classType}`}>
            <div className="summary-card-header">
              <span className="summary-card-label">{card.title}</span>
              <div className={`summary-card-icon ${card.classType}`}>
                <Icon size={20} />
              </div>
            </div>
            <div className="summary-card-value">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
