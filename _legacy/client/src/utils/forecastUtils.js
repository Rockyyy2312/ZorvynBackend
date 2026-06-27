/**
 * Statistical Cash Flow Forecasting Utilities
 * Uses linear regression + exponential moving average for prediction.
 */

// Simple linear regression: returns { slope, intercept, predict(x) }
export function linearRegression(points) {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, predict: () => 0 };
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, predict: () => sumY / n };
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, predict: (x) => slope * x + intercept };
}

// Exponential Moving Average
export function ema(values, alpha = 0.3) {
  if (!values.length) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// R² coefficient of determination (0→1, higher = better fit)
export function rSquared(actual, predicted) {
  if (actual.length < 2) return 0;
  const mean    = actual.reduce((s, v) => s + v, 0) / actual.length;
  const ssTot   = actual.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
  const ssRes   = actual.reduce((s, v, i) => s + Math.pow(v - predicted[i], 2), 0);
  return ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
}

/**
 * Main forecast function.
 * @param {Array} monthly - Array of {year, month, totalIncome, totalExpense, netBalance}
 * @param {number} horizon - Number of months to forecast ahead (default 3)
 * @returns forecast object with chart data and summary
 */
export function buildForecast(monthly, horizon = 3) {
  if (!monthly || monthly.length < 3) {
    return { chartData: null, summary: null, insufficient: true };
  }

  const n = monthly.length;

  // Build index-based points for regression
  const incomePoints  = monthly.map((m, i) => ({ x: i, y: m.totalIncome }));
  const expensePoints = monthly.map((m, i) => ({ x: i, y: m.totalExpense }));

  const incomeReg  = linearRegression(incomePoints);
  const expenseReg = linearRegression(expensePoints);

  // EMA smoothing on actuals
  const incomeEMA  = ema(monthly.map(m => m.totalIncome));
  const expenseEMA = ema(monthly.map(m => m.totalExpense));

  // Blend regression + EMA for final forecast (50/50)
  const forecastMonths = [];
  for (let i = 0; i < horizon; i++) {
    const xi = n + i;
    const regInc  = incomeReg.predict(xi);
    const regExp  = expenseReg.predict(xi);
    const emaInc  = incomeEMA[incomeEMA.length - 1];
    const emaExp  = expenseEMA[expenseEMA.length - 1];
    const predInc = Math.max(0, (regInc + emaInc) / 2);
    const predExp = Math.max(0, (regExp + emaExp) / 2);
    forecastMonths.push({
      x: xi,
      predictedIncome:  Math.round(predInc),
      predictedExpense: Math.round(predExp),
      predictedNet:     Math.round(predInc - predExp),
    });
  }

  // R² for confidence
  const incomeFit  = monthly.map((_, i) => incomeReg.predict(i));
  const expenseFit = monthly.map((_, i) => expenseReg.predict(i));
  const incomeR2   = rSquared(monthly.map(m => m.totalIncome),  incomeFit);
  const expenseR2  = rSquared(monthly.map(m => m.totalExpense), expenseFit);
  const confidence = Math.round(((incomeR2 + expenseR2) / 2) * 100);

  // Month labels for chart
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  // Generate future month labels from last data point
  const lastMonth = monthly[monthly.length - 1];
  const futureLabels = [];
  for (let i = 1; i <= horizon; i++) {
    let m = lastMonth.month + i;
    let y = lastMonth.year;
    if (m > 12) { m -= 12; y += 1; }
    futureLabels.push(`${MONTH_NAMES[m - 1]} ${y}`);
  }

  const historicalLabels = monthly.map(m => `${MONTH_NAMES[m.month - 1]} ${String(m.year).slice(-2)}`);

  const chartData = {
    labels: [...historicalLabels, ...futureLabels],
    datasets: [
      {
        label: 'Actual Income',
        data: [...monthly.map(m => m.totalIncome), ...Array(horizon).fill(null)],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Actual Expense',
        data: [...monthly.map(m => m.totalExpense), ...Array(horizon).fill(null)],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Forecast Income',
        data: [...Array(monthly.length).fill(null), ...forecastMonths.map(f => f.predictedIncome)],
        borderColor: '#10B981',
        borderDash: [6, 4],
        borderWidth: 2,
        pointStyle: 'triangle',
        pointRadius: 6,
        tension: 0.4,
        fill: false,
        borderDashOffset: 0,
      },
      {
        label: 'Forecast Expense',
        data: [...Array(monthly.length).fill(null), ...forecastMonths.map(f => f.predictedExpense)],
        borderColor: '#ef4444',
        borderDash: [6, 4],
        borderWidth: 2,
        pointStyle: 'triangle',
        pointRadius: 6,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  // Scenario adjustment support — returns adjusted forecast given % modifiers
  const buildScenario = (incomeModPct = 0, expenseModPct = 0) =>
    forecastMonths.map(f => ({
      ...f,
      scenarioIncome:  Math.round(f.predictedIncome  * (1 + incomeModPct  / 100)),
      scenarioExpense: Math.round(f.predictedExpense * (1 + expenseModPct / 100)),
      scenarioNet:     Math.round(f.predictedIncome * (1 + incomeModPct / 100) - f.predictedExpense * (1 + expenseModPct / 100)),
    }));

  const nextMonth = forecastMonths[0];

  return {
    chartData,
    forecastMonths,
    futureLabels,
    confidence,
    buildScenario,
    summary: {
      nextIncome:  nextMonth?.predictedIncome  || 0,
      nextExpense: nextMonth?.predictedExpense || 0,
      nextNet:     nextMonth?.predictedNet     || 0,
      avgForecastIncome:  Math.round(forecastMonths.reduce((s, f) => s + f.predictedIncome,  0) / horizon),
      avgForecastExpense: Math.round(forecastMonths.reduce((s, f) => s + f.predictedExpense, 0) / horizon),
      trend: forecastMonths[forecastMonths.length - 1]?.predictedNet > forecastMonths[0]?.predictedNet ? 'improving' : 'declining',
    },
    insufficient: false,
  };
}
