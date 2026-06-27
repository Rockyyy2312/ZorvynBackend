/**
 * Calculates a composite Financial Health Score (0–100) from transaction history.
 * Scores 5 dimensions, each weighted differently.
 */

// Helper: compute from monthly data
function clamp(v, min=0, max=100) { return Math.max(min, Math.min(max, v)); }

export function computeHealthScore(monthly = [], categories = {}) {
  if (!monthly || monthly.length === 0) {
    return { total: 0, grade: 'N/A', color: '#64748b', dimensions: [], recommendations: [] };
  }

  const recent = monthly.slice(-3); // last 3 months
  const allMonths = monthly;

  // --- 1. SAVINGS RATE SCORE (weight: 30) ---
  const avgSavingsRate = recent.reduce((s, m) => {
    const rate = m.totalIncome > 0 ? ((m.totalIncome - m.totalExpense) / m.totalIncome) : 0;
    return s + Math.max(0, rate);
  }, 0) / Math.max(recent.length, 1);
  // 0% → 0pts, 20%+ → 30pts
  const savingsScore = clamp(avgSavingsRate * 150, 0, 30);

  // --- 2. BUDGET CONSISTENCY SCORE (weight: 20) ---
  // Measured as low variance in expense/income ratio across months
  const ratios = allMonths.map(m => m.totalIncome > 0 ? m.totalExpense / m.totalIncome : 1);
  const avgRatio = ratios.reduce((s, r) => s + r, 0) / Math.max(ratios.length, 1);
  const variance = ratios.reduce((s, r) => s + Math.pow(r - avgRatio, 2), 0) / Math.max(ratios.length, 1);
  // Low variance = consistent = high score
  const consistencyScore = clamp(20 - variance * 40, 0, 20);

  // --- 3. EXPENSE DIVERSITY SCORE (weight: 20) ---
  // Penalize if one category takes > 50% of total spend (over-reliance on one area)
  const expCats = categories.expense || [];
  const totalExp = expCats.reduce((s, c) => s + c.amount, 0);
  let diversityScore = 20;
  if (expCats.length > 0 && totalExp > 0) {
    const maxShare = Math.max(...expCats.map(c => c.amount / totalExp));
    diversityScore = clamp(20 - (maxShare - 0.3) * 40, 0, 20);
  }

  // --- 4. INCOME GROWTH SCORE (weight: 15) ---
  let incomeGrowthScore = 7.5; // neutral if only 1 month
  if (allMonths.length >= 2) {
    const firstIncome = allMonths[0].totalIncome;
    const lastIncome  = allMonths[allMonths.length - 1].totalIncome;
    const growthRate  = firstIncome > 0 ? (lastIncome - firstIncome) / firstIncome : 0;
    incomeGrowthScore = clamp(7.5 + growthRate * 30, 0, 15);
  }

  // --- 5. POSITIVE BALANCE STREAK (weight: 15) ---
  // How many consecutive recent months had positive net balance
  let streak = 0;
  for (let i = allMonths.length - 1; i >= 0; i--) {
    if (allMonths[i].netBalance > 0) streak++;
    else break;
  }
  const streakScore = clamp(streak * 3, 0, 15);

  const total = Math.round(savingsScore + consistencyScore + diversityScore + incomeGrowthScore + streakScore);

  // Grade
  let grade, color;
  if      (total >= 85) { grade = 'Excellent'; color = '#10B981'; }
  else if (total >= 70) { grade = 'Good';      color = '#34d399'; }
  else if (total >= 55) { grade = 'Fair';      color = '#f59e0b'; }
  else if (total >= 35) { grade = 'Poor';      color = '#f97316'; }
  else                  { grade = 'Critical';  color = '#ef4444'; }

  const dimensions = [
    { key: 'savings',     label: 'Savings Rate',         score: Math.round(savingsScore),      maxScore: 30, icon: '💰', color: '#10B981', tip: `Current savings rate: ${(avgSavingsRate * 100).toFixed(1)}%` },
    { key: 'consistency', label: 'Spending Consistency', score: Math.round(consistencyScore),  maxScore: 20, icon: '📊', color: '#6366f1', tip: 'Measures how stable your expense pattern is' },
    { key: 'diversity',   label: 'Expense Diversity',    score: Math.round(diversityScore),    maxScore: 20, icon: '🎯', color: '#f59e0b', tip: 'Penalizes over-reliance on single expense category' },
    { key: 'income',      label: 'Income Growth',        score: Math.round(incomeGrowthScore), maxScore: 15, icon: '📈', color: '#ec4899', tip: 'Tracks how your income has grown over time' },
    { key: 'streak',      label: 'Positive Balance',     score: Math.round(streakScore),       maxScore: 15, icon: '🔥', color: '#14b8a6', tip: `${streak} consecutive months with positive net balance` },
  ];

  // Recommendations
  const recommendations = [];
  if (savingsScore < 15) {
    recommendations.push({
      icon: '💰', priority: 'high',
      title: 'Boost your savings rate',
      desc: `Your savings rate is ${(avgSavingsRate * 100).toFixed(1)}%. Target 20%+ by reducing variable expenses like dining or entertainment by 15%.`,
    });
  }
  if (consistencyScore < 10) {
    recommendations.push({
      icon: '📊', priority: 'medium',
      title: 'Stabilize your spending',
      desc: 'Your monthly spending varies significantly. Set a fixed budget for each category and stick to it.',
    });
  }
  if (diversityScore < 12) {
    recommendations.push({
      icon: '🎯', priority: 'medium',
      title: 'Diversify your expenses',
      desc: 'One category dominates your spending. Evaluate if that spend is essential and look for optimization opportunities.',
    });
  }
  if (streakScore < 9) {
    recommendations.push({
      icon: '🔥', priority: 'high',
      title: 'Maintain a positive monthly balance',
      desc: 'Some months you spend more than you earn. Build an emergency fund of 3 months expenses to buffer these gaps.',
    });
  }
  if (incomeGrowthScore < 8) {
    recommendations.push({
      icon: '📈', priority: 'low',
      title: 'Grow your income streams',
      desc: 'Your income has not grown significantly. Consider freelancing, investments, or skill-based income growth.',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      icon: '🎉', priority: 'success',
      title: 'Outstanding financial health!',
      desc: 'Keep maintaining your great habits. Consider investing your surplus in index funds for long-term wealth creation.',
    });
  }

  return { total, grade, color, dimensions, recommendations };
}
