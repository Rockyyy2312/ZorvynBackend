import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function MonthlyTrendChart({ data = [] }) {
  const { theme } = useTheme(); // Subscribes to theme to force re-render

  const getThemeColor = (varName, fallback) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  };

  const incomeColor = getThemeColor('--color-income', '#10B981');
  const incomeBg = getThemeColor('--color-income-bg', 'rgba(16, 185, 129, 0.08)');
  const expenseColor = getThemeColor('--color-expense', '#EF4444');
  const expenseBg = getThemeColor('--color-expense-bg', 'rgba(239, 68, 68, 0.08)');
  const balanceColor = getThemeColor('--color-balance', '#6366f1');
  const balanceBg = getThemeColor('--color-balance-bg', 'rgba(99, 102, 241, 0.08)');

  const textPrimary = getThemeColor('--text-primary', '#f1f5f9');
  const textSecondary = getThemeColor('--text-secondary', '#94a3b8');
  const textMuted = getThemeColor('--text-muted', '#64748b');
  const borderSubtle = getThemeColor('--border-subtle', 'rgba(255, 255, 255, 0.03)');
  const borderMedium = getThemeColor('--border-medium', 'rgba(255, 255, 255, 0.08)');
  const bgSecondary = getThemeColor('--bg-secondary', '#111827');

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const labels = data.map(item => `${monthNames[item.month - 1]} ${item.year}`);
  const incomeData = data.map(item => item.totalIncome);
  const expenseData = data.map(item => item.totalExpense);
  const netData = data.map(item => item.netBalance);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: incomeData,
        borderColor: incomeColor,
        backgroundColor: incomeBg,
        fill: true,
        tension: 0.45,
        borderWidth: 3,
        pointBackgroundColor: incomeColor,
        pointBorderColor: 'rgba(255,255,255,0.1)',
        pointRadius: 4,
        pointHoverRadius: 8,
      },
      {
        label: 'Expense',
        data: expenseData,
        borderColor: expenseColor,
        backgroundColor: expenseBg,
        fill: true,
        tension: 0.45,
        borderWidth: 3,
        pointBackgroundColor: expenseColor,
        pointBorderColor: 'rgba(255,255,255,0.1)',
        pointRadius: 4,
        pointHoverRadius: 8,
      },
      {
        label: 'Net Balance',
        data: netData,
        borderColor: balanceColor,
        backgroundColor: balanceBg,
        fill: true,
        tension: 0.45,
        borderWidth: 3,
        pointBackgroundColor: balanceColor,
        pointBorderColor: 'rgba(255,255,255,0.1)',
        pointRadius: 4,
        pointHoverRadius: 8,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textSecondary,
          font: {
            family: 'Inter',
            size: 11
          },
          usePointStyle: true,
          boxWidth: 6
        }
      },
      tooltip: {
        backgroundColor: bgSecondary,
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: borderMedium,
        borderWidth: 1,
        padding: 12,
        titleFont: {
          family: 'Inter',
          weight: 'bold'
        },
        bodyFont: {
          family: 'Inter'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: borderSubtle,
        },
        ticks: {
          color: textMuted,
          font: {
            family: 'Inter',
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: borderSubtle,
        },
        ticks: {
          color: textMuted,
          font: {
            family: 'Inter',
            size: 10
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '320px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
