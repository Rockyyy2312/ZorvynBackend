import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  transaction = null 
}) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount || '');
      setType(transaction.type || 'expense');
      setCategory(transaction.category || '');
      // Format ISO string date to YYYY-MM-DD for form input
      if (transaction.date) {
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
      } else {
        setDate('');
      }
      setNotes(transaction.notes || '');
    } else {
      setAmount('');
      setType('expense');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setErrors({});
  }, [transaction, isOpen]);

  const validateForm = () => {
    const tempErrors = {};
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      tempErrors.amount = 'Amount must be a positive number';
    }
    if (!category.trim()) {
      tempErrors.category = 'Category is required';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        type,
        category: category.trim(),
        notes: notes.trim()
      };
      
      // Convert date pickers to ISO datetime strings to satisfy backend Zod validators
      if (date) {
        payload.date = new Date(date).toISOString();
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h3 className="modal-title">
            {transaction && !transaction._isNew ? 'Edit Transaction' : 'New Transaction'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="type">Transaction Type</label>
            <select
              id="type"
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="expense">Expense (-)</option>
              <option value="income">Income (+)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount (INR)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              className={`form-input ${errors.amount ? 'error' : ''}`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {errors.amount && <span className="form-error">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              className={`form-input ${errors.category ? 'error' : ''}`}
              placeholder="e.g. Salary, Rent, Food"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            {errors.category && <span className="form-error">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="date">Transaction Date</label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              className="form-input"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
