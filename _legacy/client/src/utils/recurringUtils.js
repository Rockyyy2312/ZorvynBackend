/**
 * Recurring Transaction Pattern Detector
 * Analyzes transaction history to identify subscriptions and recurring payments.
 */

const CATEGORY_ICONS = {
  entertainment: '🎬', subscriptions: '📱', utilities: '💡', food: '🍔',
  health: '🏥', transport: '🚗', education: '📚', shopping: '🛒',
  rent: '🏠', insurance: '🛡️', default: '🔄',
};

/**
 * Finds the icon for a given category string
 */
function getCategoryIcon(category = '') {
  const key = category.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return CATEGORY_ICONS.default;
}

/**
 * Groups transactions by category and analyzes recurrence patterns.
 * A group is considered recurring if:
 *  - It appears in at least 2 distinct months
 *  - The average amount stays within ±20% of the mean
 *  - The interval between occurrences is reasonably regular
 */
export function detectRecurring(transactions = []) {
  if (!transactions.length) return [];

  // Only expenses
  const expenses = transactions.filter(t => t.type === 'expense');

  // Group by category
  const byCategory = {};
  for (const tx of expenses) {
    const cat = tx.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ ...tx, dateObj: new Date(tx.date) });
  }

  const recurring = [];

  for (const [category, txs] of Object.entries(byCategory)) {
    if (txs.length < 2) continue;

    // Sort by date ascending
    txs.sort((a, b) => a.dateObj - b.dateObj);

    // Find transactions in distinct months
    const monthSet = new Set(txs.map(t => `${t.dateObj.getFullYear()}-${t.dateObj.getMonth()}`));
    if (monthSet.size < 2) continue;

    const amounts = txs.map(t => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    // Check if amounts are within ±20% of average (steady payments)
    const isAmountStable = amounts.every(a => Math.abs(a - avgAmount) / avgAmount <= 0.25);

    // Compute average interval between transactions (in days)
    let avgIntervalDays = null;
    if (txs.length >= 2) {
      const intervals = [];
      for (let i = 1; i < txs.length; i++) {
        intervals.push((txs[i].dateObj - txs[i-1].dateObj) / (1000 * 60 * 60 * 24));
      }
      avgIntervalDays = intervals.reduce((s, d) => s + d, 0) / intervals.length;
    }

    // Determine frequency label
    let frequency = 'irregular';
    let intervalDays = null;
    if (avgIntervalDays !== null) {
      if (avgIntervalDays >= 25 && avgIntervalDays <= 35)       { frequency = 'monthly'; intervalDays = 30; }
      else if (avgIntervalDays >= 6 && avgIntervalDays <= 8)    { frequency = 'weekly';  intervalDays = 7; }
      else if (avgIntervalDays >= 80 && avgIntervalDays <= 100) { frequency = 'quarterly'; intervalDays = 90; }
      else if (avgIntervalDays >= 340)                           { frequency = 'yearly';  intervalDays = 365; }
      else if (avgIntervalDays >= 13 && avgIntervalDays <= 16)  { frequency = 'bi-weekly'; intervalDays = 14; }
    }

    if (!isAmountStable || frequency === 'irregular') continue;

    // Compute next expected charge date
    const lastTx = txs[txs.length - 1];
    const nextDate = new Date(lastTx.dateObj);
    nextDate.setDate(nextDate.getDate() + (intervalDays || 30));

    // Confidence: based on how many occurrences and how stable the amount is
    const occurrences = txs.length;
    const amountVariance = amounts.reduce((s, a) => s + Math.abs(a - avgAmount), 0) / (avgAmount * amounts.length);
    const confidence = Math.min(100, Math.round((occurrences * 15) + (1 - amountVariance) * 40 + 20));

    recurring.push({
      id:           category,
      category,
      icon:         getCategoryIcon(category),
      amount:       Math.round(avgAmount),
      frequency,
      occurrences,
      confidence,
      lastDate:     lastTx.dateObj,
      nextDate,
      transactions: txs,
      monthlyEquivalent: frequency === 'weekly'    ? Math.round(avgAmount * 4.33)
                       : frequency === 'quarterly' ? Math.round(avgAmount / 3)
                       : frequency === 'yearly'    ? Math.round(avgAmount / 12)
                       : frequency === 'bi-weekly' ? Math.round(avgAmount * 2)
                       : Math.round(avgAmount), // monthly
    });
  }

  // Sort by monthly equivalent descending (biggest spend first)
  return recurring.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
}

/**
 * Compute burn summary from detected recurring list
 */
export function computeBurnSummary(recurring = []) {
  const monthlyTotal = recurring.reduce((s, r) => s + r.monthlyEquivalent, 0);
  const yearlyTotal  = monthlyTotal * 12;
  const count        = recurring.length;

  // Next 30 days upcoming charges
  const now = new Date();
  const in30 = new Date(); in30.setDate(now.getDate() + 30);
  const upcoming = recurring.filter(r => r.nextDate >= now && r.nextDate <= in30)
    .sort((a, b) => a.nextDate - b.nextDate);

  return { monthlyTotal, yearlyTotal, count, upcoming };
}
