import { Search } from 'lucide-react';

export default function TransactionFilters({ filters, onChange, onClear }) {
  const handleInputChange = (name, value) => {
    onChange(name, value);
  };

  return (
    <div className="glass-card filters-bar animate-fade-in">
      <div className="filter-group" style={{ flex: '1 1 200px' }}>
        <span className="filter-label">Search notes/category</span>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            className="filter-input"
            placeholder="Type search..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            style={{ paddingLeft: '32px', width: '100%', minHeight: '36px' }}
          />
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Type</span>
        <select
          className="filter-input form-select"
          value={filters.type || ''}
          onChange={(e) => handleInputChange('type', e.target.value)}
          style={{ minHeight: '36px' }}
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div className="filter-group">
        <span className="filter-label">Category</span>
        <input
          type="text"
          className="filter-input"
          placeholder="e.g. Salary, Food"
          value={filters.category || ''}
          onChange={(e) => handleInputChange('category', e.target.value)}
          style={{ minHeight: '36px' }}
        />
      </div>

      {/* Amount range filters */}
      <div className="filter-group">
        <span className="filter-label">Min Amount</span>
        <input
          type="number"
          className="filter-input"
          placeholder="₹ Min"
          min="0"
          value={filters.minAmount || ''}
          onChange={(e) => handleInputChange('minAmount', e.target.value)}
          style={{ minHeight: '36px', minWidth: '100px' }}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Max Amount</span>
        <input
          type="number"
          className="filter-input"
          placeholder="₹ Max"
          min="0"
          value={filters.maxAmount || ''}
          onChange={(e) => handleInputChange('maxAmount', e.target.value)}
          style={{ minHeight: '36px', minWidth: '100px' }}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Start Date</span>
        <input
          type="date"
          className="filter-input"
          value={filters.startDate || ''}
          onChange={(e) => handleInputChange('startDate', e.target.value)}
          style={{ minHeight: '36px' }}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">End Date</span>
        <input
          type="date"
          className="filter-input"
          value={filters.endDate || ''}
          onChange={(e) => handleInputChange('endDate', e.target.value)}
          style={{ minHeight: '36px' }}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Sort By</span>
        <select
          className="filter-input form-select"
          value={filters.sort || ''}
          onChange={(e) => handleInputChange('sort', e.target.value)}
          style={{ minHeight: '36px' }}
        >
          <option value="">Latest Created</option>
          <option value="date">Transaction Date</option>
          <option value="amount">Highest Amount</option>
        </select>
      </div>

      <button 
        className="btn btn-secondary btn-sm" 
        onClick={onClear}
        style={{ minHeight: '36px' }}
      >
        Clear Filters
      </button>
    </div>
  );
}
