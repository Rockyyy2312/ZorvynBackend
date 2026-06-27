import { Link } from 'react-router-dom';
import { Home, TrendingUp } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="not-found-page animate-fade-in">
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <TrendingUp size={20} />
        </div>
        <span className="auth-logo-text">ZORVYN</span>
      </div>
      
      <div className="not-found-code">404</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto var(--space-md)' }}>
        The link you followed may be broken, or the page may have been removed.
      </p>
      
      <Link to="/dashboard" className="btn btn-primary">
        <Home size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
