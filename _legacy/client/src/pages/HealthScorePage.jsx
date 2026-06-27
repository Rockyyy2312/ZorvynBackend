import { useState, useEffect } from 'react';
import { Shield, TrendingUp, BarChart2, Star, Flame, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { computeHealthScore } from '../utils/healthScore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';
import { useTheme } from '../context/ThemeContext';

const ICON_MAP = { '💰': null, '📊': null, '🎯': null, '📈': null, '🔥': null };

function RadialGauge({ score, color, grade }) {
  const R = 80;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  // Only draw 270deg arc (from 135° to 405°) — "horseshoe" style
  const ARC_RATIO   = 0.75; // 270° / 360°
  const ARC_LENGTH  = CIRCUMFERENCE * ARC_RATIO;
  const offset      = ARC_LENGTH - (score / 100) * ARC_LENGTH;

  return (
    <div className="radial-gauge-wrapper">
      <svg className="radial-gauge-svg" width="200" height="200" viewBox="0 0 200 200">
        {/* Track arc */}
        <circle className="radial-gauge-track" cx="100" cy="100" r={R}
          strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          strokeDashoffset={-CIRCUMFERENCE * 0.125}
        />
        {/* Fill arc */}
        <circle className="radial-gauge-fill" cx="100" cy="100" r={R}
          stroke={color}
          strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          strokeDashoffset={-CIRCUMFERENCE * 0.125 + offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div className="radial-gauge-center">
        <span className="radial-gauge-score" style={{ color }}>{score}</span>
        <span className="radial-gauge-label">out of 100</span>
        <span className="radial-gauge-grade" style={{
          background: `${color}20`, color,
          border: `1px solid ${color}40`
        }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

function SubScoreCard({ dim }) {
  const pct = (dim.score / dim.maxScore) * 100;
  return (
    <div className="sub-score-card">
      <div className="sub-score-card-header">
        <span className="sub-score-card-label">{dim.label}</span>
        <div className="sub-score-card-icon" style={{ background: `${dim.color}20` }}>
          <span style={{ fontSize: '14px' }}>{dim.icon}</span>
        </div>
      </div>
      <div className="sub-score-card-value" style={{ color: dim.color }}>
        {dim.score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/{dim.maxScore}</span>
      </div>
      <div className="sub-score-bar-track">
        <div className="sub-score-bar-fill" style={{ width: `${pct}%`, background: dim.color }} />
      </div>
      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>{dim.tip}</p>
    </div>
  );
}

export default function HealthScorePage() {
  const { theme } = useTheme(); // force re-render on theme switch
  const [monthly,    setMonthly]    = useState([]);
  const [categories, setCategories] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [result,     setResult]     = useState(null);

  const fetchAndCompute = async () => {
    setLoading(true);
    try {
      const [monRes, catRes] = await Promise.all([
        api.get('/dashboard/monthly'),
        api.get('/dashboard/categories'),
      ]);
      const mon = monRes.data.data || [];
      const cat = catRes.data.data || {};
      setMonthly(mon);
      setCategories(cat);
      setResult(computeHealthScore(mon, cat));
    } catch {
      setResult({ total: 0, grade: 'Error', color: '#ef4444', dimensions: [], recommendations: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAndCompute(); }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const { total, grade, color, dimensions, recommendations } = result;

  const colorMap = {
    '#10B981': 'var(--color-income)',
    '#34D399': 'var(--accent-primary-light)',
    '#F59E0B': 'var(--color-warning)',
    '#F97316': 'var(--color-warning)',
    '#EF4444': 'var(--color-expense)',
    '#6366F1': 'var(--color-balance)',
    '#EC4899': 'var(--chart-5)',
    '#14B8A6': 'var(--chart-7)',
    '#64748B': 'var(--text-muted)'
  };
  const resolveColor = (c) => {
    if (!c) return c;
    const upper = c.toUpperCase();
    return colorMap[upper] || c;
  };

  const totalColor = resolveColor(color);
  const resolvedDimensions = dimensions.map(d => ({ ...d, color: resolveColor(d.color) }));

  const priorityColor = { high: 'var(--color-expense)', medium: 'var(--color-warning)', low: 'var(--color-balance)', success: 'var(--color-income)' };
  const priorityBg    = { high: 'rgba(239,68,68,0.08)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(99,102,241,0.08)', success: 'rgba(16,185,129,0.08)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Health Score</h1>
          <p className="page-subtitle">A 5-dimension composite score of your financial well-being</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAndCompute}>
          <RefreshCw size={16} /> Recalculate
        </button>
      </div>

      {/* Hero — Gauge + summary */}
      <div className="glass-card animate-fade-in">
        <div className="health-score-hero">
          <RadialGauge score={total} color={totalColor} grade={grade} />
          <div className="health-score-info">
            <h2 className="health-score-title" style={{ color: totalColor }}>
              {grade === 'Excellent' && '🏆 '}
              {grade === 'Good'      && '✅ '}
              {grade === 'Fair'      && '⚠️ '}
              {grade === 'Poor'      && '❗ '}
              {grade === 'Critical'  && '🚨 '}
              Your financial health is {grade}
            </h2>
            <p className="health-score-subtitle">
              This score is computed from {monthly.length} months of transaction data across 5 key financial dimensions.
              {total >= 70 ? ' You\'re doing well — keep the momentum going.' : ' There are specific areas where improvements will significantly boost your score.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              {[
                { label: 'Data Points', val: monthly.length + ' months' },
                { label: 'Score Range', val: `${total}/100` },
                { label: 'Grade', val: grade, color: totalColor },
              ].map(s => (
                <div key={s.label} style={{ padding: '8px 14px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: s.color || 'var(--text-primary)' }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Score Breakdown</h2>
        <div className="sub-scores-grid">
          {resolvedDimensions.map(dim => <SubScoreCard key={dim.key} dim={dim} />)}
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={18} style={{ color: 'var(--color-warning)' }} />
          Personalized Recommendations
        </h2>
        <div className="recommendations-list">
          {recommendations.map((r, i) => (
            <div key={i} className="recommendation-item"
              style={{ borderColor: `${priorityColor[r.priority]}30`, background: priorityBg[r.priority] }}>
              <div className="recommendation-icon" style={{ background: `${priorityColor[r.priority]}15` }}>
                <span style={{ fontSize: '18px' }}>{r.icon}</span>
              </div>
              <div className="recommendation-text">
                <p className="recommendation-title">{r.title}</p>
                <p className="recommendation-desc">{r.desc}</p>
              </div>
              <div style={{ flexShrink: 0, color: priorityColor[r.priority] }}>
                {r.priority === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
