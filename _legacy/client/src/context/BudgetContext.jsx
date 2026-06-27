import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/budgets');
      const mapped = (res.data.data || []).map(b => ({
        ...b,
        id: b._id || b.id
      }));
      setBudgets(mapped);
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch budgets on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('nexo_token');
    if (token) {
      fetchBudgets();
    }
  }, [fetchBudgets]);

  const addBudget = useCallback(async (budget) => {
    try {
      const res = await api.post('/budgets', {
        category: budget.category,
        limit: parseFloat(budget.limit),
        period: budget.period || 'monthly',
        color: budget.color || '#10B981',
      });
      const newBudget = {
        ...res.data.data,
        id: res.data.data._id || res.data.data.id
      };
      setBudgets(prev => [...prev, newBudget]);
      return newBudget;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create budget';
      toast.error(errMsg);
      throw err;
    }
  }, []);

  const updateBudget = useCallback(async (id, updates) => {
    try {
      const res = await api.put(`/budgets/${id}`, {
        category: updates.category,
        limit: parseFloat(updates.limit),
        period: updates.period,
        color: updates.color,
      });
      const updatedBudget = {
        ...res.data.data,
        id: res.data.data._id || res.data.data.id
      };
      setBudgets(prev =>
        prev.map(b => b.id === id || b._id === id ? updatedBudget : b)
      );
      return updatedBudget;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update budget';
      toast.error(errMsg);
      throw err;
    }
  }, []);

  const deleteBudget = useCallback(async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets(prev => prev.filter(b => b.id !== id && b._id !== id));
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to delete budget';
      toast.error(errMsg);
      throw err;
    }
  }, []);

  // Calculate how much has been spent for a budget category from transactions
  const getSpentAmount = useCallback((budget, transactions = []) => {
    const now = new Date();
    let startDate;

    if (budget.period === 'weekly') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
    } else if (budget.period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // monthly (default)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return transactions
      .filter(tx =>
        tx.type === 'expense' &&
        tx.category.toLowerCase() === budget.category.toLowerCase() &&
        new Date(tx.date) >= startDate
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, []);

  return (
    <BudgetContext.Provider value={{ budgets, addBudget, updateBudget, deleteBudget, getSpentAmount, fetchBudgets, loading }}>
      {children}
    </BudgetContext.Provider>
  );
}
