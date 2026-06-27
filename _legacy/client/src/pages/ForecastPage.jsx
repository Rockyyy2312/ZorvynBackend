import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Info, RefreshCw, Sliders } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import api from '../api/axios';
import { buildForecast } from '../utils/forecastUtils';
import { formatCurrency } from '../utils/formatCurrency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ForecastPage() {
  const [monthly, setMonthly]   = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [incomeAdj, setIncomeAdj] = useState(0); // -30 to +30
  const [expenseAdj, setExpenseAdj] = useState(0);

  const MOCK_MONTHLY_TRENDS = [
    { year: 2026, month: 1, totalIncome: 45000, totalExpense: 32000, netBalance: 13000 },
    { year: 2026, month: 2, totalIncome: 48000, totalExpense: 35000, netBalance: 13000 },
    { year: 2026, month: 3, totalIncome: 51000, totalExpense: 34000, netBalance: 17000 },
    { year: 2026, month: 4, totalIncome: 50000, totalExpense: 38000, netBalance: 12000 },
    { year: 2026, month: 5, totalIncome: 55000, totalExpense: 36000, netBalance: 19000 },
    { year: 2026, month: 6, totalIncome: 58000, totalExpense: 39000, netBalance: 19000 },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/monthly');
      const mon = res.data.data || [];
      setMonthly(mon);
      setIsDemo(false);
      setForecast(buildForecast(mon, 3));
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setMonthly(MOCK_MONTHLY_TRENDS);
    setForecast(buildForecast(MOCK_MONTHLY_TRENDS, 3));
    setIsDemo(true);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner fullPage />;

  if ((!forecast || forecast.insufficient) && !isDemo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Cash Flow Forecast</h1>
            <p className="page-subtitle">Predict your next 3 months using statistical regression</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Activity size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Not enough data to forecast</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px', marginBottom: '24px' }}>
            Add at least 3 months of transactions to generate a reliable forecast.
          </p>
          <button className="btn btn-primary" onClick={handleLoadDemo} style={{ margin: '0 auto' }}>
            💡 Preview with Demo Data
          </button>
        </div>
      </div>
    );
  }

  const { theme } = useTheme();

  const getThemeColor = (varName, fallback) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  };

  const textPrimary = getThemeColor('--text-primary', '#f1f5f9');
  const textSecondary = getThemeColor('--text-secondary', '#94a3b8');
  const textMuted = getThemeColor('--text-muted', '#64748b');
  const borderSubtle = getThemeColor('--border-subtle', 'rgba(255,255,255,0.04)');
  const borderMedium = getThemeColor('--border-medium', 'rgba(255,255,255,0.1)');
  const bgSecondary = getThemeColor('--bg-secondary', '#111827');

  const incomeColor = getThemeColor('--color-income', '#10B981');
  const incomeBg = getThemeColor('--color-income-bg', 'rgba(16,185,129,0.1)');
  const expenseColor = getThemeColor('--color-expense', '#ef4444');
  const expenseBg = getThemeColor('--color-expense-bg', 'rgba(239,68,68,0.08)');

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textSecondary, font: { family: 'Inter', size: 12 }, boxWidth: 12, padding: 16 },
      },
      tooltip: {
        backgroundColor: bgSecondary,
        borderColor: borderMedium,
        borderWidth: 1,
        titleColor: textPrimary,
        bodyColor: textSecondary,
        padding: 12,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ₹${(ctx.raw || 0).toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      x: {
        grid:  { color: borderSubtle },
        ticks: { color: textMuted, font: { family: 'Inter', size: 11 } },
      },
      y: {
        grid:  { color: borderSubtle },
        ticks: {
          color: textMuted,
          font: { family: 'Inter', size: 11 },
          callback: v => `₹${(v / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  const { summary, confidence, futureLabels, buildScenario, chartData } = forecast;
  const scenario = buildScenario(incomeAdj, expenseAdj);
  const nextScenario = scenario[0];

  const confidenceColor = confidence >= 70 ? 'var(--color-income)' : confidence >= 50 ? 'var(--color-warning)' : 'var(--color-expense)';

  const dynamicChartData = chartData ? {
    ...chartData,
    datasets: chartData.datasets.map(dataset => {
      const isIncome = dataset.label.toLowerCase().includes('income');
      const isExpense = dataset.label.toLowerCase().includes('expense');
      const primaryColor = isIncome ? incomeColor : expenseColor;
      const bgColor = isIncome ? incomeBg : expenseBg;

      return {
        ...dataset,
        borderColor: primaryColor,
        backgroundColor: bgColor,
        pointBackgroundColor: primaryColor
      };
    })
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Cash Flow Forecast</h1>
            {isDemo && (
              <span style={{ fontSize: '0.6875rem', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)' }}>
                DEMO MODE
              </span>
            )}
          </div>
          <p className="page-subtitle">
            {isDemo 
              ? 'Previewing cash flow models using simulated transaction trends'
              : `Statistical prediction for next 3 months based on ${monthly.length} months of data`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isDemo && (
            <button className="btn btn-secondary" onClick={fetchData}>
              Reset to My Data
            </button>
          )}
          <button className="btn btn-secondary" onClick={isDemo ? handleLoadDemo : fetchData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="forecast-cards animate-fade-in">
        {[
          { label: 'Next Month Income',  val: summary.nextIncome,  color: 'var(--color-income)',  icon: TrendingUp,   bg: 'rgba(16,185,129,0.08)'  },
          { label: 'Next Month Expense', val: summary.nextExpense, color: 'var(--color-expense)', icon: TrendingDown, bg: 'rgba(239,68,68,0.08)'   },
          { label: 'Predicted Net',      val: summary.nextNet,     color: summary.nextNet >= 0 ? 'var(--color-income)' : 'var(--color-expense)', icon: Activity, bg: 'rgba(99,102,241,0.08)' },
          { label: 'Forecast Confidence', val: null, color: confidenceColor, icon: Info, bg: 'rgba(245,158,11,0.08)' },
        ].map((c, i) => (
          <div key={i} className="forecast-card glass-card" style={{ borderColor: `${c.color}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p className="forecast-card-label">{c.label}</p>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.icon size={14} style={{ color: c.color }} />
              </div>
            </div>
            {c.val !== null ? (
              <p className="forecast-card-value" style={{ color: c.color }}>{formatCurrency(c.val)}</p>
            ) : (
              <>
                <p className="forecast-card-value" style={{ color: c.color }}>{confidence}%</p>
                <div className="forecast-confidence">
                  Model R² = {(confidence/100).toFixed(2)}
                </div>
              </>
            )}
            <p className="forecast-card-sub">{forecast.summary.trend === 'improving' ? '↗ Trend: Improving' : '↘ Trend: Declining'}</p>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Income vs Expense Forecast</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Dashed lines show predicted values · Triangles mark forecast points
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {futureLabels.map(l => (
              <span key={l} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontWeight: 600 }}>
                {l} ★
              </span>
            ))}
          </div>
        </div>
        <div style={{ height: '360px' }}>
          <Line data={dynamicChartData} options={chartOptions} />
        </div>
      </div>

      {/* Scenario Simulator */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} style={{ color: 'var(--accent-primary)' }} />
          What-If Scenario Simulator
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Adjust sliders to see how income/expense changes would affect your next month's net balance
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Income slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="scenario-slider-label">
              <span>Income change</span>
              <span>{incomeAdj > 0 ? '+' : ''}{incomeAdj}%</span>
            </div>
            <input type="range" min="-30" max="30" step="5"
              value={incomeAdj} onChange={e => setIncomeAdj(Number(e.target.value))} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Adjusted income: <strong style={{ color: 'var(--color-income)' }}>{formatCurrency(Math.round(summary.nextIncome * (1 + incomeAdj/100)))}</strong>
            </p>
          </div>

          {/* Expense slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="scenario-slider-label">
              <span>Expense change</span>
              <span>{expenseAdj > 0 ? '+' : ''}{expenseAdj}%</span>
            </div>
            <input type="range" min="-30" max="30" step="5"
              value={expenseAdj} onChange={e => setExpenseAdj(Number(e.target.value))} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Adjusted expense: <strong style={{ color: 'var(--color-expense)' }}>{formatCurrency(Math.round(summary.nextExpense * (1 + expenseAdj/100)))}</strong>
            </p>
          </div>
        </div>

        {/* Scenario result */}
        {nextScenario && (
          <div style={{ marginTop: '24px', padding: '16px', borderRadius: 'var(--radius-md)', background: nextScenario.scenarioNet >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${nextScenario.scenarioNet >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Scenario Net Balance (Next Month)</p>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: nextScenario.scenarioNet >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
              {formatCurrency(nextScenario.scenarioNet)}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              vs baseline: {formatCurrency(summary.nextNet)} ({nextScenario.scenarioNet - summary.nextNet >= 0 ? '+' : ''}{formatCurrency(nextScenario.scenarioNet - summary.nextNet)})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
