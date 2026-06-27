import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, RefreshCw, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, CreditCard, Wallet, TrendingUp,
  TrendingDown, ChevronRight, MoreVertical, Send, Plus,
  Zap, CircleDollarSign, Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart';
import CategoryChart from '../components/charts/CategoryChart';
import IncomeExpenseBar from '../components/charts/IncomeExpenseBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

/* ─── Virtual card colours (rotated stacked deck) ─── */
const CARD_THEMES = [
  { bg: 'linear-gradient(135deg, #a8edaf 0%, #c5f082 50%, #e8f87c 100%)', text: '#1a2e0a', label: '#2d4a10' },
  { bg: 'linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fbbf24 100%)', text: '#fff', label: 'rgba(255,255,255,0.75)' },
  { bg: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 60%, #c4b5fd 100%)', text: '#fff', label: 'rgba(255,255,255,0.75)' },
];

const SUB_ICONS = {
  default: '💳', iCloud: '🍎', Discord: '🎮', Telegram: '✈️', Netflix: '🎬', Spotify: '🎵', YouTube: '▶️'
};

function VirtualCardsPanel() {
  const navigate = useNavigate();
  const [active, setActive] = useState(2);
  return (
    <div className="eth-right-panel">
      {/* Stacked cards */}
      <div className="eth-cards-header">
        <div>
          <span className="eth-panel-title">My Cards</span>
          <span className="eth-cards-count">3</span>
        </div>
        <button className="eth-add-btn" onClick={() => navigate('/transactions?action=add&type=expense')}><Plus size={14} /> Add</button>
      </div>

      <div className="eth-card-stack">
        {CARD_THEMES.map((theme, i) => (
          <div
            key={i}
            className={`eth-virtual-card ${i === active ? 'eth-card-front' : i === active - 1 ? 'eth-card-mid' : 'eth-card-back'}`}
            style={{ background: theme.bg }}
            onClick={() => setActive(i)}
          >
            {i === active && (
              <>
                <div className="eth-card-logo" style={{ color: theme.label }}>
                  <CreditCard size={18} /> <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>VISA</span>
                </div>
                <div className="eth-card-number" style={{ color: theme.text }}>
                  4156 6727 1439 6902
                </div>
                <div className="eth-card-meta" style={{ color: theme.label }}>
                  <span>Nexo User</span>
                  <span>07/28</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Subscriptions */}
      <div className="eth-subscriptions">
        <div className="eth-sub-header">
          <span className="eth-panel-title">Subscriptions</span>
          <button className="eth-manage-btn" onClick={() => navigate('/subscriptions')}>Manage <ChevronRight size={12} /></button>
        </div>
        <div className="eth-sub-icons-row">
          {['🍎', '🎵', '🏀', '✈️', '🎮'].map((ico, i) => (
            <div key={i} className="eth-sub-icon-bubble">{ico}</div>
          ))}
        </div>
        {[
          { name: 'iCloud', next: 'Next 15 July', price: '$2.99', ico: '🍎' },
          { name: 'Discord Nitro', next: 'Next 19 July', price: '$8.99', ico: '🎮' },
          { name: 'Telegram', next: 'Next 04 August', price: '$4.99', ico: '✈️' },
        ].map((sub, i) => (
          <div key={i} className="eth-sub-row">
            <div className="eth-sub-icon">{sub.ico}</div>
            <div className="eth-sub-info">
              <span className="eth-sub-name">{sub.name}</span>
              <span className="eth-sub-next">{sub.next}</span>
            </div>
            <span className="eth-sub-price">{sub.price}</span>
            <button className="eth-sub-dots"><MoreVertical size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isViewer = user?.role === 'viewer';

  const fetchDashboardData = async (isRefetch = false) => {
    if (isRefetch) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      if (isViewer) {
        const [summaryRes, recentRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/recent')
        ]);
        setSummary(summaryRes.data);
        setRecent(recentRes.data.data);
      } else {
        const overviewRes = await api.get('/dashboard/overview');
        const { summary, categories, monthly, recent } = overviewRes.data.data;
        setSummary(summary);
        setRecent(recent);
        setMonthlyTrends(monthly);
        setCategories(categories.expense || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [user?.role]);

  if (loading) return <LoadingSpinner fullPage />;

  const { totalIncome = 0, totalExpense = 0, netBalance = 0 } = summary || {};

  const incomeChange = totalIncome > 0 ? '+15.7%' : '0%';
  const expenseChange = totalExpense > 0 ? '-10.7%' : '0%';

  return (
    <div className="eth-dashboard animate-fade-in">

      {/* ── Page title ── */}
      <div className="eth-dash-title-row">
        <div>
          <h1 className="eth-dash-h1">My Dashboard</h1>
          <p className="eth-dash-subtitle">Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋</p>
        </div>
        <button
          className="eth-refresh-btn"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="eth-error-bar">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main 2-col layout ── */}
      <div className="eth-main-grid">

        {/* ════ LEFT COLUMN ════ */}
        <div className="eth-left-col">

          {/* ── Row 1: Hero balance + Income/Expense ── */}
          <div className="eth-row1">

            {/* Total Balance Hero Card */}
            <div className="eth-balance-hero">
              <div className="eth-balance-hero-bg" />
              <div className="eth-balance-hero-content">
                <p className="eth-balance-label">Total balance</p>
                <div className="eth-balance-amount">
                  <span>{formatCurrency(netBalance)}</span>
                </div>
                <p className="eth-balance-sub">
                  {totalIncome > 0 ? `+${formatCurrency(totalIncome - totalExpense)} revenue from last month` : 'Start adding transactions to see your balance'}
                </p>
                <div className="eth-balance-actions">
                  <button className="eth-action-btn eth-action-primary" onClick={() => navigate('/transactions?action=add&type=expense')}>
                    <Send size={14} /> Transfer
                  </button>
                  <button className="eth-action-btn eth-action-secondary" onClick={() => navigate('/transactions?action=add&type=income')}>
                    <Plus size={14} /> Top Up
                  </button>
                  <button className="eth-action-btn eth-action-icon" onClick={() => fetchDashboardData(true)}>
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Income + Expense stacked */}
            <div className="eth-stat-stack">
              <div className="eth-stat-card">
                <div className="eth-stat-top">
                  <span className="eth-stat-label">Income</span>
                  <span className="eth-stat-badge eth-badge-income">
                    <TrendingUp size={10} /> {incomeChange}
                  </span>
                </div>
                <div className="eth-stat-value eth-value-income">
                  +{formatCurrency(totalIncome)}<sup className="eth-sup">$</sup>
                </div>
                <p className="eth-stat-sub">This week's income</p>
              </div>

              <div className="eth-stat-card">
                <div className="eth-stat-top">
                  <span className="eth-stat-label">Expense</span>
                  <span className="eth-stat-badge eth-badge-expense">
                    <TrendingDown size={10} /> {expenseChange}
                  </span>
                </div>
                <div className="eth-stat-value eth-value-expense">
                  -{formatCurrency(totalExpense)}<sup className="eth-sup">$</sup>
                </div>
                <p className="eth-stat-sub">This week's expense</p>
              </div>
            </div>
          </div>

          {/* ── Row 2: Charts ── */}
          <div className="eth-row2">
            {/* Revenue Flow (Bar) */}
            <div className="eth-chart-card">
              <div className="eth-chart-header">
                <span className="eth-chart-title">Revenue Flow</span>
                <div className="eth-chart-controls">
                  <span className="eth-chart-period">Monthly</span>
                  <button className="eth-chart-icon-btn"><ArrowUpRight size={14} /></button>
                </div>
              </div>
              {isViewer ? (
                <div className="eth-locked">
                  <ShieldAlert size={24} />
                  <p>Trend analysis locked</p>
                  <span>Viewer role – request analyst status</span>
                </div>
              ) : !monthlyTrends || monthlyTrends.length === 0 ? (
                <div className="eth-locked" style={{ minHeight: '280px' }}>
                  <div className="empty-chart-illustration">
                    <TrendingUp size={28} className="pulse-slow" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <p>No revenue trends</p>
                  <span>Log your monthly transactions to visualize income and expense trends.</span>
                </div>
              ) : (
                <MonthlyTrendChart data={monthlyTrends} compact />
              )}
            </div>

            {/* Expense Split (Donut) */}
            <div className="eth-chart-card">
              <div className="eth-chart-header">
                <span className="eth-chart-title">Expense Split</span>
                <span className="eth-chart-period">Current Month</span>
              </div>
              {isViewer ? (
                <div className="eth-locked">
                  <ShieldAlert size={24} />
                  <p>Category breakdown locked</p>
                </div>
              ) : !categories || categories.length === 0 ? (
                <div className="eth-locked" style={{ minHeight: '280px' }}>
                  <div className="empty-chart-illustration">
                    <PieChart size={28} className="pulse-slow" style={{ color: 'var(--color-warning)' }} />
                  </div>
                  <p>No category breakdown</p>
                  <span>Your top spending categories will appear here once expenses are recorded.</span>
                </div>
              ) : (
                <CategoryChart categories={categories} />
              )}
            </div>
          </div>

          {/* ── Row 3: Income vs Expense full-width ── */}
          {!isViewer && (
            <div className="eth-chart-card eth-chart-full">
              <div className="eth-chart-header">
                <span className="eth-chart-title">Income vs Expense</span>
                <BarChart3 size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              {!monthlyTrends || monthlyTrends.length === 0 ? (
                <div className="eth-locked" style={{ minHeight: '180px' }}>
                  <div className="empty-chart-illustration">
                    <BarChart3 size={28} className="pulse-slow" style={{ color: 'var(--color-income)' }} />
                  </div>
                  <p>No comparison data yet</p>
                  <span>We'll compare your income vs expenses side-by-side once you have transaction logs.</span>
                </div>
              ) : (
                <IncomeExpenseBar data={monthlyTrends} />
              )}
            </div>
          )}

          {/* ── Row 4: Recent Transactions ── */}
          <div className="eth-txn-card">
            <div className="eth-txn-header">
              <div>
                <span className="eth-chart-title">Recent Transactions</span>
                <span className="eth-txn-count">{recent.length}</span>
              </div>
              <button className="eth-see-all-btn" onClick={() => navigate('/transactions')}>See All <ChevronRight size={13} /></button>
            </div>

            {recent.length === 0 ? (
              <div className="eth-locked">
                <CircleDollarSign size={28} />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="eth-txn-list">
                {recent.slice(0, 6).map((tx) => (
                  <div
                    key={tx._id}
                    className="eth-txn-row"
                    onClick={() => navigate(`/transactions?action=edit&id=${tx._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`eth-txn-icon-wrap ${tx.type}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    </div>
                    <div className="eth-txn-info">
                      <span className="eth-txn-cat">{tx.category}</span>
                      <span className="eth-txn-date">{formatDate(tx.date)}</span>
                    </div>
                    <span className={`eth-txn-badge ${tx.type}`}>
                      {tx.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                    <span className={`eth-txn-amount ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <button className="eth-sub-dots"><MoreVertical size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <VirtualCardsPanel />
      </div>
    </div>
  );
}
