export function SkeletonCard({ count = 3 }) {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card glass-card" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="skeleton-line skeleton-line-sm" />
          <div className="skeleton-line skeleton-line-lg" />
          <div className="skeleton-line skeleton-line-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table glass-card">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-line skeleton-line-sm" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row" style={{ animationDelay: `${r * 0.06}s` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton-line skeleton-line-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton-chart glass-card">
      <div className="skeleton-line skeleton-line-sm" style={{ width: '40%', marginBottom: '1.5rem' }} />
      <div className="skeleton-chart-bars">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-chart-bar"
            style={{ height: `${30 + Math.random() * 60}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
}
