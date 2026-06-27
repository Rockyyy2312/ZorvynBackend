import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const PALETTE = ['#10B981','#6366f1','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6','#ef4444'];

export default function BudgetModal({ isOpen, onClose, onSubmit, budget = null }) {
  const [category, setCategory] = useState('');
  const [limit, setLimit]       = useState('');
  const [period, setPeriod]     = useState('monthly');
  const [color, setColor]       = useState('#10B981');
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (budget) {
      setCategory(budget.category);
      setLimit(String(budget.limit));
      setPeriod(budget.period);
      setColor(budget.color);
    } else {
      setCategory(''); setLimit(''); setPeriod('monthly'); setColor('#10B981');
    }
    setErrors({});
  }, [budget, isOpen]);

  const validate = () => {
    const e = {};
    if (!category.trim()) e.category = 'Category name is required';
    if (!limit || isNaN(limit) || parseFloat(limit) <= 0) e.limit = 'Enter a positive budget amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ category: category.trim(), limit, period, color });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h3 className="modal-title">{budget ? 'Edit Budget' : 'New Budget'}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className={`form-input ${errors.category ? 'error' : ''}`}
              placeholder="e.g. Food, Rent, Entertainment"
              value={category} onChange={e => setCategory(e.target.value)} />
            {errors.category && <span className="form-error">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Budget Limit (₹)</label>
            <input type="number" step="1" min="1"
              className={`form-input ${errors.limit ? 'error' : ''}`}
              placeholder="5000"
              value={limit} onChange={e => setLimit(e.target.value)} />
            {errors.limit && <span className="form-error">{errors.limit}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Period</label>
            <select className="form-select" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PALETTE.map(c => (
                <button key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', outline: color === c ? `3px solid white` : 'none',
                    outlineOffset: '2px', transition: 'all 0.15s'
                  }} />
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            <Save size={16} />
            {budget ? 'Update Budget' : 'Create Budget'}
          </button>
        </form>
      </div>
    </div>
  );
}
