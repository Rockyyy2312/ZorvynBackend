import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function IncomeExpenseBar({ data = [] }) {
  const { theme } = useTheme(); // Consume theme to force re-render

  const getThemeColor = (varName, fallback) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  };

  const incomeColor = getThemeColor('--color-income', '#10B981');
  const expenseColor = getThemeColor('--color-expense', '#EF4444');
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

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: incomeData,
        backgroundColor: incomeColor,
        borderRadius: 16,
      },
      {
        label: 'Expense',
        data: expenseData,
        backgroundColor: expenseColor,
        borderRadius: 16,
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
        padding: 12
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
      <Bar data={chartData} options={options} />
    </div>
  );
}
