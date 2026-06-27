import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound, Mail, User, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/common/Logo';

export function RegisterForm({ onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const tempErrors = {};
    if (!name) {
      tempErrors.name = 'Name is required';
    } else if (name.length < 2) {
      tempErrors.name = 'Name must be at least 2 characters';
    }
    if (!email) {
      tempErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Please provide a valid email';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(name, email, password, role);
      toast.success('Registration successful!');
      if (onRegisterSuccess) {
        onRegisterSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="name">Full Name</label>
        <div style={{ position: 'relative' }}>
          <User size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            id="name"
            type="text"
            className={`form-input ${errors.name ? 'error' : ''}`}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">Email Address</label>
        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            id="email"
            type="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">Password</label>
        <div style={{ position: 'relative' }}>
          <KeyRound size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            id="password"
            type="password"
            className={`form-input ${errors.password ? 'error' : ''}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        {errors.password && <span className="form-error">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="role">User Role</label>
        <div style={{ position: 'relative' }}>
          <ShieldCheck size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <select
            id="role"
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
          >
            <option value="viewer">Viewer (Read-only)</option>
            <option value="analyst">Analyst (Read + Analytics)</option>
            <option value="admin">Admin (Full Control)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', marginTop: '10px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        {loading ? (
          'Creating Account...'
        ) : (
          <>
            <UserPlus size={16} />
            Sign Up
          </>
        )}
      </button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="auth-centered-layout">
      {/* 3D background grid & neon glow orbs */}
      <div className="auth-bg-glow-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      <div className="auth-bg-grid-perspective"></div>

      {/* 3D financial graphics floating in background */}
      <div className="auth-3d-bg-canvas">
        {/* fg-1: Balance & SVG line chart */}
        <div className="floating-graphic fg-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Balance Pool</span>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-income)', fontFamily: "'Outfit', sans-serif", margin: 0 }}>₹1,48,250</p>
            </div>
            <span className="trend-badge" style={{ background: 'var(--color-income-bg)', color: 'var(--color-income)', padding: '2px 6px', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', fontWeight: 700, border: '1px solid rgba(52,211,153,0.15)' }}>
              +24.8%
            </span>
          </div>
          
          <svg viewBox="0 0 200 60" style={{ width: '100%', height: 'auto', overflow: 'visible', marginTop: '6px' }}>
            <defs>
              <linearGradient id="glowGradBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-income)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--color-income)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0 50 Q 30 35 60 45 T 120 15 T 200 2 L 200 60 L 0 60 Z" fill="url(#glowGradBg)" />
            <path d="M 0 50 Q 30 35 60 45 T 120 15 T 200 2" stroke="var(--color-income)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="200" cy="2" r="3" fill="var(--color-income)" />
          </svg>
        </div>

        {/* fg-2: Virtual VISA card */}
        <div className="floating-graphic fg-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Nexo VISA</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff' }}>DEBIT</span>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', letterSpacing: '0.15em', marginBottom: '12px', fontFamily: "'Outfit', sans-serif" }}>
            •••• •••• •••• 6902
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>VAL THRU 07/28</span>
            <div style={{ width: '20px', height: '14px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px' }} />
          </div>
        </div>

        {/* fg-3: Savings Goal Tracker */}
        <div className="floating-graphic fg-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>Emergency Fund Goal</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>85%</span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, var(--color-warning), #fb923c)', borderRadius: '10px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
            <span>Saved: ₹1,20,000</span>
            <span>Target: ₹1,50,000</span>
          </div>
        </div>

        {/* fg-4: Subscriptions Panel */}
        <div className="floating-graphic fg-4">
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Upcoming Bills
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              { name: 'iCloud', price: '₹219', date: 'Jul 15' },
              { name: 'Discord Nitro', price: '₹650', date: 'Jul 19' }
            ].map((sub, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{sub.name}</span>
                <span style={{ color: 'var(--color-expense)', fontWeight: 700 }}>{sub.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Centered Glassmorphic container */}
      <div className="auth-glass-container animate-fade-in-up">
        <div className="auth-centered-logo">
          <Logo size="md" variant="full" />
        </div>

        <div className="auth-form-container" style={{ maxWidth: '400px' }}>
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create Account</h1>
            <p className="auth-form-subtitle">Get started with Nexo Finance Manager</p>
          </div>

          <RegisterForm />

          <div className="auth-form-link">
            Already have an account? <Link to="/login">Log in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
