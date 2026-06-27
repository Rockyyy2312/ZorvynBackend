import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

export default function CategoryChart({ categories = [], type = 'expense' }) {
  const { theme } = useTheme(); // Subscribes to theme changes

  const getThemeColor = (varName, fallback) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  };

  const chartColors = [
    getThemeColor('--chart-1', '#10B981'),
    getThemeColor('--chart-2', '#6366f1'),
    getThemeColor('--chart-3', '#f59e0b'),
    getThemeColor('--chart-4', '#ef4444'),
    getThemeColor('--chart-5', '#ec4899')
  ];

  const textPrimary = getThemeColor('--text-primary', '#f1f5f9');
  const textSecondary = getThemeColor('--text-secondary', '#94a3b8');
  const borderMedium = getThemeColor('--border-medium', 'rgba(255, 255, 255, 0.08)');
  const bgSecondary = getThemeColor('--bg-secondary', '#111827');

  // Filter and map category items
  const filteredData = categories.slice(0, 5); // display top 5 categories
  const labels = filteredData.map(item => item.category);
  const amounts = filteredData.map(item => item.amount);

  const chartData = {
    labels,
    datasets: [
      {
        data: amounts,
        backgroundColor: chartColors,
        borderColor: bgSecondary,
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textSecondary,
          font: {
            family: 'Inter',
            size: 11
          },
          usePointStyle: true,
          boxWidth: 6,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: bgSecondary,
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: borderMedium,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.raw !== undefined) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.raw);
            }
            return label;
          }
        }
      }
    },
    cutout: '70%'
  };

  return (
    <div style={{ height: '240px', width: '100%' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
