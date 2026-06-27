import { createContext, useState, useEffect, useCallback } from 'react';

export const NotificationContext = createContext(null);

const STORAGE_KEY = 'nexo_notifications';
const ALERTS_KEY = 'nexo_alert_rules';

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [alertRules, setAlertRules] = useState([]);

  useEffect(() => {
    try {
      const storedNotifs = localStorage.getItem(STORAGE_KEY);
      if (storedNotifs) setNotifications(JSON.parse(storedNotifs));
      const storedAlerts = localStorage.getItem(ALERTS_KEY);
      if (storedAlerts) setAlertRules(JSON.parse(storedAlerts));
    } catch {
      setNotifications([]);
      setAlertRules([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alertRules));
  }, [alertRules]);

  // Native browser notification sender
  const sendBrowserNotification = useCallback((title, body) => {
    if ('Notification' in window && window.Notification.permission === 'granted') {
      try {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      } catch (err) {
        console.error('Error triggering browser notification:', err);
      }
    }
  }, []);

  // Request browser notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: Date.now().toString(),
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info', // info | warning | danger | success
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
    sendBrowserNotification(notif.title, notif.message);
    return newNotif;
  }, [sendBrowserNotification]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addAlertRule = useCallback((rule) => {
    const newRule = {
      id: Date.now().toString(),
      name: rule.name,
      type: rule.type,       // 'transaction_amount' | 'category_budget' | 'monthly_expense'
      threshold: parseFloat(rule.threshold),
      category: rule.category || '',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setAlertRules(prev => [...prev, newRule]);
    return newRule;
  }, []);

  const deleteAlertRule = useCallback((id) => {
    setAlertRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleAlertRule = useCallback((id) => {
    setAlertRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }, []);

  // Evaluate active alert rules and budget limits against a new transaction
  const evaluateTransaction = useCallback((transaction, budgets = [], transactions = []) => {
    // 1. Evaluate custom user threshold alert rules
    alertRules
      .filter(r => r.active)
      .forEach(rule => {
        if (rule.type === 'transaction_amount' && transaction.type === 'expense') {
          if (transaction.amount >= rule.threshold) {
            addNotification({
              title: '⚠️ Large Transaction Alert',
              message: `Transaction of ₹${transaction.amount.toLocaleString('en-IN')} in "${transaction.category}" exceeded your ₹${rule.threshold.toLocaleString('en-IN')} alert threshold.`,
              type: 'warning',
            });
          }
        }
      });

    // 2. Evaluate system budget limit alerts
    if (transaction.type === 'expense' && budgets.length > 0) {
      const budget = budgets.find(b => b.category.toLowerCase() === transaction.category.toLowerCase());
      if (budget) {
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
          // monthly
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Calculate total spent in category for current period (excluding this new transaction)
        const pastSpent = transactions
          .filter(tx =>
            tx.type === 'expense' &&
            tx._id !== transaction._id &&
            tx.category.toLowerCase() === budget.category.toLowerCase() &&
            new Date(tx.date) >= startDate
          )
          .reduce((sum, tx) => sum + tx.amount, 0);

        const currentSpent = pastSpent + transaction.amount;

        if (currentSpent > budget.limit) {
          addNotification({
            title: '🚨 Budget Exceeded Alert',
            message: `Spent ₹${currentSpent.toLocaleString('en-IN')} in "${budget.category}", exceeding your ₹${budget.limit.toLocaleString('en-IN')} limit!`,
            type: 'danger',
          });
        } else if (currentSpent >= budget.limit * 0.8) {
          addNotification({
            title: '⚠️ Budget Warning (80% reached)',
            message: `Spent ₹${currentSpent.toLocaleString('en-IN')} of your ₹${budget.limit.toLocaleString('en-IN')} limit in "${budget.category}".`,
            type: 'warning',
          });
        }
      }
    }
  }, [alertRules, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, alertRules, unreadCount,
      addNotification, markRead, markAllRead, clearAll,
      addAlertRule, deleteAlertRule, toggleAlertRule, evaluateTransaction,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
