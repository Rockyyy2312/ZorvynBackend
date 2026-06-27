import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, BarChart2, Lightbulb, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import LoadingSpinner from '../components/common/LoadingSpinner';

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [monthly, setMonthly]   = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [monthlyRes, catRes, txnRes] = await Promise.all([
        api.get('/dashboard/monthly'),
        api.get('/dashboard/categories'),
        api.get('/transactions', { params: { limit: '1000', page: '1' } })
      ]);
      setMonthly(monthlyRes.data.data || []);
      setCategories(catRes.data.data || { expense: [], income: [] });
      setTransactions(txnRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner fullPage />;

  if (error) return (
    <div className="page-header">
      <div>
        <h1 className="page-title">Smart Insights</h1>
        <p style={{ color: 'var(--color-expense)', marginTop: 8 }}>{error}</p>
      </div>
    </div>
  );

  // --- Derived analytics ---
  const current  = monthly[monthly.length - 1] || null;
  const previous = monthly[monthly.length - 2] || null;

  const topExpenses = [...(categories.expense || [])].sort((a,b) => b.amount - a.amount).slice(0,6);
  const totalExp    = topExpenses.reduce((s,c) => s + c.amount, 0);

  // Savings rate from most recent month
  const savingsRate = current && current.totalIncome > 0
    ? Math.max(0, ((current.totalIncome - current.totalExpense) / current.totalIncome) * 100)
    : 0;

  // Best / worst months
  const sorted = [...monthly].sort((a,b) => b.netBalance - a.netBalance);
  const bestMonth  = sorted[0];
  const worstMonth = sorted[sorted.length - 1];

  // Avg monthly expense
  const avgExpense = monthly.length
    ? monthly.reduce((s,m) => s + m.totalExpense, 0) / monthly.length
    : 0;

  const savingsColor = savingsRate >= 20 ? 'var(--color-income)' : savingsRate >= 10 ? 'var(--color-warning)' : 'var(--color-expense)';

  // --- Outliers and Pareto Analysis (Expenses specifically) ---
  const expenses = transactions.filter(tx => tx.type === 'expense');
  const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
  const totalExpenseAmt = sortedExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Pareto Rule
  const top20Count = Math.ceil(sortedExpenses.length * 0.2);
  const top20Sum = sortedExpenses.slice(0, top20Count).reduce((sum, tx) => sum + tx.amount, 0);
  const paretoRatio = totalExpenseAmt > 0 ? (top20Sum / totalExpenseAmt) * 100 : 0;

  // Standard Deviation Outliers
  const meanExpense = expenses.length > 0 ? (totalExpenseAmt / expenses.length) : 0;
  const variance = expenses.length > 0
    ? expenses.reduce((sum, tx) => sum + Math.pow(tx.amount - meanExpense, 2), 0) / expenses.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const outlierThreshold = meanExpense + 1.2 * stdDev;
  const outliers = expenses.filter(tx => tx.amount > outlierThreshold);

  // Amount Distribution Histogram Bins
  const bins = [
    { label: '₹0 - ₹500', count: 0 },
    { label: '₹500 - ₹2k', count: 0 },
    { label: '₹2k - ₹5k', count: 0 },
    { label: '₹5k+', count: 0 }
  ];

  expenses.forEach(tx => {
    const amt = tx.amount;
    if (amt >= 0 && amt <= 500) bins[0].count++;
    else if (amt > 500 && amt <= 2000) bins[1].count++;
    else if (amt > 2000 && amt <= 5000) bins[2].count++;
    else if (amt > 5000) bins[3].count++;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Insights</h1>
          <p className="page-subtitle">AI-powered analysis of your financial patterns</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="insights-grid">
        {/* ROW 1: Top Expenses + MoM Comparison */}
        <div className="insights-top-row">

          {/* Top Expense Categories */}
          <div className="insight-card glass-card">
            <div className="insight-card-title">
              <TrendingDown size={18} style={{ color: 'var(--color-expense)' }} />
              Top Expense Categories
            </div>
            {topExpenses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No expense data yet.</p>
            ) : (
              <div className="insight-rank-list">
                {topExpenses.map((cat, i) => {
                  const barPct = totalExp > 0 ? (cat.amount / totalExp) * 100 : 0;
                  return (
                    <div key={cat.category} className="insight-rank-item">
                      <span className="insight-rank-num">{i + 1}</span>
                      <span className="insight-rank-label">{cat.category}</span>
                      <div className="insight-rank-bar-track" style={{ maxWidth: '100px' }}>
                        <div className="insight-rank-bar-fill" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="insight-rank-amount">{formatCurrency(cat.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Savings Rate Gauge */}
          <div className="insight-card glass-card">
            <div className="insight-card-title">
              <Lightbulb size={18} style={{ color: 'var(--color-warning)' }} />
              This Month's Savings Rate
            </div>
            <div className="savings-gauge-wrapper">
              {/* SVG Radial Gauge */}
              {(() => {
                const R = 65;
                const CIRC = 2 * Math.PI * R;
                const ARC_RATIO = 0.75;
                const ARC_LEN  = CIRC * ARC_RATIO;
                const offset   = ARC_LEN - (Math.min(savingsRate, 100) / 100) * ARC_LEN;
                return (
                  <div className="radial-gauge-wrapper" style={{ width: 160, height: 160 }}>
                    <svg className="radial-gauge-svg" width="160" height="160" viewBox="0 0 160 160">
                      <circle className="radial-gauge-track" cx="80" cy="80" r={R}
                        strokeDasharray={`${ARC_LEN} ${CIRC}`}
                        strokeDashoffset={-CIRC * 0.125}
                      />
                      <circle className="radial-gauge-fill" cx="80" cy="80" r={R}
                        stroke={savingsColor}
                        strokeDasharray={`${ARC_LEN} ${CIRC}`}
                        strokeDashoffset={-CIRC * 0.125 + offset}
                        style={{ filter: `drop-shadow(0 0 8px ${savingsColor}66)` }}
                      />
                    </svg>
                    <div className="radial-gauge-center">
                      <span className="radial-gauge-score" style={{ color: savingsColor, fontSize: '2rem' }}>{savingsRate.toFixed(1)}%</span>
                      <span className="radial-gauge-label">saved this month</span>
                    </div>
                  </div>
                );
              })()}
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                {savingsRate >= 20 ? '🎉 Excellent! You\'re saving well.'
                  : savingsRate >= 10 ? '👍 Good, but there\'s room to improve.'
                  : '⚠️ Low savings rate. Review your expenses.'}
              </p>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              {[
                { label: 'Avg Monthly Expense', val: formatCurrency(avgExpense), color: 'var(--color-expense)' },
                { label: 'Total Months Tracked', val: monthly.length, color: 'var(--color-balance)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: '12px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{s.label}</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 800, color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 2: Month-over-Month Comparison */}
        <div className="insight-card glass-card insights-full-row">
          <div className="insight-card-title">
            <BarChart2 size={18} style={{ color: 'var(--color-balance)' }} />
            Month-over-Month Comparison
          </div>
          {monthly.length < 2 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Need at least 2 months of data for comparison.</p>
          ) : (
            <div className="mom-comparison">
              {/* Header */}
              <div className="mom-row" style={{ background: 'var(--bg-tertiary)' }}>
                {['Month', 'Income', 'Expenses', 'Net Balance', 'vs Prior Month'].map(h => (
                  <div key={h} className="mom-cell" style={{ gridColumn: h === 'Month' ? 'span 1' : undefined }}>
                    <span className="mom-cell-label">{h}</span>
                  </div>
                ))}
              </div>
              {/* Data rows — last 6 months */}
              {[...monthly].reverse().slice(0, 6).map((m, idx, arr) => {
                const prev = arr[idx + 1];
                const expChange = prev ? pctChange(m.totalExpense, prev.totalExpense) : null;
                const netChange = prev ? pctChange(m.netBalance, prev.netBalance) : null;
                return (
                  <div key={`${m.year}-${m.month}`} className="mom-row">
                    <div className="mom-cell">
                      <span className="mom-cell-value" style={{ fontSize: '0.9375rem' }}>
                        {MONTH_NAMES[m.month - 1]} {m.year}
                      </span>
                    </div>
                    <div className="mom-cell">
                      <span className="mom-cell-value" style={{ color: 'var(--color-income)' }}>
                        {formatCurrency(m.totalIncome)}
                      </span>
                    </div>
                    <div className="mom-cell">
                      <span className="mom-cell-value" style={{ color: 'var(--color-expense)' }}>
                        {formatCurrency(m.totalExpense)}
                      </span>
                    </div>
                    <div className="mom-cell">
                      <span className="mom-cell-value" style={{ color: m.netBalance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                        {formatCurrency(m.netBalance)}
                      </span>
                    </div>
                    <div className="mom-cell">
                      {expChange !== null ? (
                        <span className={`mom-cell-change ${expChange > 0 ? 'up' : expChange < 0 ? 'down' : 'same'}`}>
                          {expChange > 0 ? <ArrowUp size={12} /> : expChange < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                          {Math.abs(expChange).toFixed(1)}% spend
                        </span>
                      ) : (
                        <span className="mom-cell-change same">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ROW 3: Best & Worst months */}
        {monthly.length >= 2 && (
          <div className="insight-card glass-card insights-full-row">
            <div className="insight-card-title">
              <TrendingUp size={18} style={{ color: 'var(--color-income)' }} />
              Best & Worst Performing Months
            </div>
            <div className="highlight-cards">
              {[
                { label: '🏆 Best Month (Highest Net)', month: bestMonth, color: 'var(--color-income)' },
                { label: '⚠️  Worst Month (Lowest Net)', month: worstMonth, color: 'var(--color-expense)' },
              ].map(({ label, month, color }) => month && (
                <div key={label} className="highlight-card">
                  <p className="highlight-card-label">{label}</p>
                  <p className="highlight-card-month">{MONTH_NAMES[month.month - 1]} {month.year}</p>
                  <p className="highlight-card-amount" style={{ color }}>Net: {formatCurrency(month.netBalance)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Income {formatCurrency(month.totalIncome)} · Expenses {formatCurrency(month.totalExpense)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROW 4: Advanced Statistical Analytics & Outliers */}
        <div className="insight-card glass-card insights-full-row animate-fade-in" style={{ marginTop: '12px' }}>
          <div className="insight-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>High-Value Outliers & Statistical Analytics</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Threshold (Mean + 1.2σ): {formatCurrency(outlierThreshold)}
            </span>
          </div>

          <div className="stats-analytics-layout">
            {/* Left side: Pareto + Histogram */}
            <div className="stats-card-group">
              {/* Pareto Rule Summary Box */}
              <div className="pareto-card" style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pareto Spend Rule (80/20)</span>
                  <span className="insight-badge" style={{ background: paretoRatio > 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: paretoRatio > 60 ? 'var(--color-expense)' : 'var(--color-income)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700 }}>
                    {paretoRatio > 60 ? 'Concentrated Spend' : 'Distributed Spend'}
                  </span>
                </div>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{paretoRatio.toFixed(1)}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  of your total expense volume is driven by the top 20% highest transactions. 
                  {paretoRatio > 60 
                    ? " Review these high-value items to optimize your budget." 
                    : " Your spending is well-distributed across transactions."}
                </p>
              </div>

              {/* Amount Distribution Histogram */}
              <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Expense Distribution Histogram</p>
                {expenses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No expense distribution data available.</p>
                ) : (
                  (() => {
                    const maxCount = Math.max(...bins.map(b => b.count), 1);
                    const chartHeight = 110;
                    const chartWidth = 320;
                    const paddingLeft = 25;
                    const paddingBottom = 20;
                    const barWidth = 45;
                    const barGap = 25;

                    return (
                      <div className="histogram-svg-container" style={{ width: '100%' }}>
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                          {/* Draw grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = chartHeight * (1 - ratio);
                            return (
                              <g key={idx}>
                                <line x1={paddingLeft} y1={y} x2={chartWidth} y2={y} stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <text x={paddingLeft - 6} y={y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                  {Math.round(maxCount * ratio)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Draw bars */}
                          {bins.map((bin, i) => {
                            const x = paddingLeft + i * (barWidth + barGap) + barGap/2;
                            const pctOfMax = bin.count / maxCount;
                            const barHeight = chartHeight * pctOfMax;
                            const y = chartHeight - barHeight;
                            const pctOfTotal = expenses.length > 0 ? ((bin.count / expenses.length) * 100).toFixed(0) : 0;

                            return (
                              <g key={bin.label} className="histogram-bar-group" style={{ cursor: 'pointer' }}>
                                <title>{`${bin.label}: ${bin.count} transactions (${pctOfTotal}%)`}</title>
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={Math.max(barHeight, 2)}
                                  rx="4"
                                  ry="4"
                                  fill="url(#neonGradient)"
                                  style={{
                                    transition: 'all 0.3s ease',
                                    opacity: 0.85,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.opacity = '1';
                                    e.target.style.filter = 'drop-shadow(0 0 6px var(--accent-primary))';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.opacity = '0.85';
                                    e.target.style.filter = 'none';
                                  }}
                                />
                                {bin.count > 0 && (
                                  <text x={x + barWidth / 2} y={y - 6} fill="var(--text-primary)" fontSize="9" fontWeight="700" textAnchor="middle">
                                    {bin.count}
                                  </text>
                                )}
                                <text x={x + barWidth / 2} y={chartHeight + 14} fill="var(--text-muted)" fontSize="8" fontWeight="600" textAnchor="middle">
                                  {bin.label}
                                </text>
                              </g>
                            );
                          })}

                          {/* Definitions */}
                          <defs>
                            <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a8edaf" />
                              <stop offset="100%" stopColor="#c5f082" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Right side: Statistical Outliers list */}
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Detected Anomalies ({outliers.length})
              </p>
              {outliers.length === 0 ? (
                <div className="empty-outliers">
                  <BarChart2 size={24} style={{ color: 'var(--color-income)' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>No high-value anomalies detected</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Your transaction amounts are consistently within normal statistical range.
                  </span>
                </div>
              ) : (
                <div className="outliers-container">
                  {outliers.slice(0, 5).map(tx => {
                    const dev = stdDev > 0 ? (tx.amount - meanExpense) / stdDev : 0;
                    const isHigh = dev >= 2.0;
                    return (
                      <div 
                        key={tx._id} 
                        className="outlier-row" 
                        onClick={() => navigate(`/transactions?action=edit&id=${tx._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="outlier-info">
                          <span className="outlier-category">{tx.category}</span>
                          <span className="outlier-date">{formatDate(tx.date)}</span>
                        </div>
                        <div className="outlier-details">
                          <span className="outlier-amount">-{formatCurrency(tx.amount)}</span>
                          <span className={`anomaly-badge ${isHigh ? 'critical' : 'warning'}`}>
                            {isHigh ? 'High Anomaly' : 'Warning'} ({dev.toFixed(1)}σ)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {outliers.length > 5 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                      Showing top 5 out of {outliers.length} anomalies.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
