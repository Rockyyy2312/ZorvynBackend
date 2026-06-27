import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, Sparkles, Shield, Zap, BarChart3, PieChart, 
  ArrowRight, Lock, UserPlus, FileText, Activity, ShieldAlert,
  ChevronRight, RefreshCw, Layers
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/common/Logo';
import { LoginForm } from './LoginPage';
import { RegisterForm } from './RegisterPage';

function WavyBackground() {
  const waves = [];
  for (let i = 0; i < 18; i++) {
    const yOffset = (i - 9) * 32;
    waves.push(
      <path
        key={`left-${i}`}
        d={`M 500 300 C 320 300, 160 ${300 + yOffset}, -100 ${300 + yOffset * 2.2}`}
        className="landing-wave-path"
        style={{ animationDelay: `${i * 0.08}s` }}
      />
    );
    waves.push(
      <path
        key={`right-${i}`}
        d={`M 500 300 C 680 300, 840 ${300 + yOffset}, 1100 ${300 + yOffset * 2.2}`}
        className="landing-wave-path"
        style={{ animationDelay: `${i * 0.08}s` }}
      />
    );
  }

  return (
    <svg className="landing-wavy-bg" viewBox="0 0 1000 600" preserveAspectRatio="none">
      {waves}
    </svg>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if logged in and try to access login/register tabs
  useEffect(() => {
    if (user && (activeTab === 'login' || activeTab === 'register')) {
      navigate('/dashboard');
    }
  }, [user, activeTab, navigate]);

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  const handleRegisterSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="landing-portal">
      {/* 3D background grids, waves, and glow effects */}
      <div className="auth-bg-glow-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      <div className="auth-bg-grid-perspective"></div>
      <WavyBackground />

      {/* Top Navbar */}
      <header className="landing-navbar">
        <div className="landing-navbar-logo">
          <Logo size="sm" variant="full" />
        </div>
        <nav className="landing-navbar-links">
          {['overview', 'features', 'analytics'].map((tab) => (
            <button
              key={tab}
              className={`landing-nav-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className="landing-navbar-actions">
          {user ? (
            <button className="landing-btn-enter" onClick={() => navigate('/dashboard')}>
              DASHBOARD <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <button 
                className={`landing-nav-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
                style={{ marginRight: '12px' }}
              >
                LOG IN
              </button>
              <button className="landing-btn-enter" onClick={() => setActiveTab('register')}>
                ENTER APP <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Slide Layout with Sidebar */}
      <div className="landing-main-layout">
        
        {/* Left Sidebar tabs selector */}
        <aside className="landing-sidebar">
          {[
            { id: 'overview', label: 'Overview', icon: <Layers size={18} /> },
            { id: 'features', label: 'Features', icon: <Zap size={18} /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
            ...(!user ? [
              { id: 'login', label: 'Log In', icon: <Lock size={18} /> },
              { id: 'register', label: 'Sign Up', icon: <UserPlus size={18} /> }
            ] : [])
          ].map((item) => (
            <button
              key={item.id}
              className={`landing-sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Dynamic sliding panel container */}
        <main className="landing-content-canvas">
          
          {/* Overview slide */}
          {activeTab === 'overview' && (
            <div className="landing-slide-panel active-slide animate-3d-flip">
              
              {/* Dribbble Style Vault Card centerpiece */}
              <div className="dribbble-vault-card">
                <div className="vault-header">
                  <div className="vault-avatar">
                    <Logo size="xs" variant="icon" />
                  </div>
                  <div>
                    <span className="vault-name">Nexo Finance</span>
                    <span className="vault-sub">Capital Management Pool</span>
                  </div>
                </div>
                <div className="vault-tags">
                  <span className="vault-tag">INR</span>
                  <span className="vault-tag">Fixed rate</span>
                </div>
                <p className="vault-description">
                  Automate and secure your capital allocation. Build multi-category budgets, monitor manual or parsed subscriptions, track deviations in high-value ledger items, and interact with the Nexo AI Advisor.
                </p>
                <div className="vault-stats">
                  <div className="vault-stat">
                    <span className="vault-stat-lbl">TVL</span>
                    <span className="vault-stat-val">₹8.5Cr</span>
                  </div>
                  <div className="vault-stat">
                    <span className="vault-stat-lbl">APY</span>
                    <span className="vault-stat-val">14.2%</span>
                  </div>
                  <div className="vault-stat">
                    <span className="vault-stat-lbl">Frequency</span>
                    <span className="vault-stat-val">Monthly</span>
                  </div>
                </div>
                <div className="vault-partners">
                  <span>ACTIVE LIQUIDITY POOLS</span>
                </div>
              </div>

              {/* Tagline Heading */}
              <div className="landing-hero-block">
                <h1 className="landing-hero-title">
                  Radically transforming wealth, on-chain.
                </h1>
                <p className="landing-hero-subtitle">
                  An advanced financial ledger merging automated analysis, cash flow forecasting, and statistical deviation outliers into a beautiful interface.
                </p>
              </div>
            </div>
          )}

          {/* Features slide */}
          {activeTab === 'features' && (
            <div className="landing-slide-panel active-slide animate-3d-flip">
              <div className="features-showcase-grid">
                {[
                  {
                    icon: <Zap size={22} style={{ color: 'var(--accent-primary)' }} />,
                    title: 'Automated Budget Checks',
                    desc: 'Compare categories dynamically and receive push alerts when expense usage reaches critical thresholds.'
                  },
                  {
                    icon: <Activity size={22} style={{ color: 'var(--color-income)' }} />,
                    title: 'Outliers & Deviation Audits',
                    desc: 'Scan expenses using standard deviation formulas to extract high-value spend anomalies instantly.'
                  },
                  {
                    icon: <FileText size={22} style={{ color: 'var(--color-warning)' }} />,
                    title: 'Tax-Ready Statement Export',
                    desc: 'Generate customized PDF summaries and download ledger history formatted for reporting.'
                  },
                  {
                    icon: <Sparkles size={22} style={{ color: 'var(--accent-primary-light)' }} />,
                    title: 'Nexo AI Advisor',
                    desc: 'Discuss alerts, plan investments, and review monthly reports with a personal AI financial advisor.'
                  }
                ].map((feat, i) => (
                  <div key={i} className="feature-glow-card">
                    <div className="feature-icon-box">{feat.icon}</div>
                    <h3 className="feature-card-title">{feat.title}</h3>
                    <p className="feature-card-desc">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics slide */}
          {activeTab === 'analytics' && (
            <div className="landing-slide-panel active-slide animate-3d-flip">
              <div className="analytics-preview-layout">
                {/* Visual mock card 1: Pareto */}
                <div className="glass-card feature-glow-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pareto Rule Analysis</span>
                    <span className="trend-badge" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-income)', fontSize: '0.65rem' }}>Distributed</span>
                  </div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '8px 0', color: '#fff' }}>68.4%</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of expense volume generated by the top 20% highest value transactions.</p>
                </div>

                {/* Visual mock card 2: SVG Histogram */}
                <div className="glass-card feature-glow-card" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>
                    Expense Bins Distribution
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '60px', gap: '8px' }}>
                    {[
                      { l: '₹0-500', h: 80 },
                      { l: '₹500-2k', h: 45 },
                      { l: '₹2k-5k', h: 95 },
                      { l: '₹5k+', h: 30 }
                    ].map((bin, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: `${bin.h}%`, background: 'linear-gradient(to top, var(--accent-primary), var(--accent-primary-light))', borderRadius: '3px' }} />
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '4px' }}>{bin.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual mock card 3: Statistical Deviation Table */}
                <div className="glass-card feature-glow-card" style={{ padding: '20px', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                    Standard Deviation Anomalies
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { cat: 'Office Supplies', amt: '₹14,500', dev: '2.4σ' },
                      { cat: 'Hardware Upgrade', amt: '₹48,200', dev: '3.1σ' }
                    ].map((an, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{an.cat}</span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-expense)', fontWeight: 700 }}>-{an.amt}</span>
                          <span className="anomaly-badge critical" style={{ fontSize: '0.6rem' }}>{an.dev}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Login slide */}
          {activeTab === 'login' && !user && (
            <div className="landing-slide-panel active-slide animate-3d-flip">
              <div className="auth-glass-container" style={{ margin: '0 auto', boxShadow: 'none', background: 'rgba(10, 12, 22, 0.3)' }}>
                <div className="auth-form-container">
                  <div className="auth-form-header">
                    <h1 className="auth-form-title">Welcome back</h1>
                    <p className="auth-form-subtitle">Log in to your Nexo account to manage your finances</p>
                  </div>
                  <LoginForm onLoginSuccess={handleLoginSuccess} />
                  <div className="auth-form-link">
                    Don't have an account? <button onClick={() => setActiveTab('register')} className="tab-switch-btn">Create one here</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Register slide */}
          {activeTab === 'register' && !user && (
            <div className="landing-slide-panel active-slide animate-3d-flip">
              <div className="auth-glass-container" style={{ margin: '0 auto', boxShadow: 'none', background: 'rgba(10, 12, 22, 0.3)' }}>
                <div className="auth-form-container" style={{ maxWidth: '400px' }}>
                  <div className="auth-form-header">
                    <h1 className="auth-form-title">Create Account</h1>
                    <p className="auth-form-subtitle">Get started with Nexo Finance Manager</p>
                  </div>
                  <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
                  <div className="auth-form-link">
                    Already have an account? <button onClick={() => setActiveTab('login')} className="tab-switch-btn">Log in here</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
