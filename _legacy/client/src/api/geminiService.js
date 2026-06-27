/**
 * Gemini API client for the AI Financial Advisor.
 * Set VITE_GEMINI_API_KEY in your .env file.
 *
 * Usage:
 *   const reply = await askAdvisor(userMessage, financialContext);
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Builds the system prompt injected with the user's real financial data.
 */
export function buildSystemPrompt(context = {}) {
  const { summary, categories, monthly, user } = context;

  const topExpenses = (categories?.expense || [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(c => `  - ${c.category}: ₹${c.amount.toLocaleString('en-IN')}`)
    .join('\n');

  const recentMonths = (monthly || [])
    .slice(-3)
    .map(m => `  - ${new Date(m.year, m.month-1).toLocaleString('default',{month:'short',year:'numeric'})}: Income ₹${m.totalIncome.toLocaleString('en-IN')}, Expense ₹${m.totalExpense.toLocaleString('en-IN')}, Net ₹${m.netBalance.toLocaleString('en-IN')}`)
    .join('\n');

  return `You are Nexo AI, an expert personal financial advisor integrated into the Nexo finance platform. 
You have access to the user's real financial data below. Be concise, empathetic, specific, and actionable.
Format responses with clear bullet points or numbered steps when giving advice. Use ₹ for currency.
Never make up data. If something is unclear from the data, say so.

=== USER FINANCIAL PROFILE ===
Name: ${user?.name || 'User'}
Role: ${user?.role || 'user'}

OVERALL SUMMARY:
- Total Income (all time): ₹${(summary?.totalIncome || 0).toLocaleString('en-IN')}
- Total Expenses (all time): ₹${(summary?.totalExpense || 0).toLocaleString('en-IN')}
- Net Balance (all time): ₹${(summary?.netBalance || 0).toLocaleString('en-IN')}
- Total Transactions: ${summary?.totalTransactions || 0}

TOP EXPENSE CATEGORIES:
${topExpenses || '  - No expense data yet'}

LAST 3 MONTHS PERFORMANCE:
${recentMonths || '  - Not enough monthly data yet'}

=== END OF PROFILE ===

Answer the user's questions using this data. Be direct and give specific numbers from their data.`;
}

/**
 * Sends a message to Gemini API with financial context.
 * @param {string} userMessage - The user's chat message
 * @param {object} context - Financial context object
 * @param {Array} history - Previous messages [{role, content}]
 * @returns {Promise<string>} - AI response text
 */
export async function askAdvisor(userMessage, context = {}, history = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE') {
    // Fallback rule-based response when no API key
    return buildRuleBasedResponse(userMessage, context);
  }

  const systemPrompt = buildSystemPrompt(context);

  // Build conversation history for Gemini
  const contents = [
    { role: 'user',  parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I have your financial data loaded and I\'m ready to help with personalized advice.' }] },
    ...history.slice(-10).map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature:     0.7,
        topK:            40,
        topP:            0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400 && err?.error?.message?.includes('API_KEY')) {
      throw new Error('INVALID_API_KEY');
    }
    throw new Error(err?.error?.message || 'Gemini API request failed');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';
}

/**
 * Fallback rule-based advisor when no API key is set.
 * Provides genuine analysis from the financial data.
 */
function buildRuleBasedResponse(message, context = {}) {
  const { summary, monthly = [], categories = {} } = context;
  const msg = message.toLowerCase();

  const income  = summary?.totalIncome  || 0;
  const expense = summary?.totalExpense || 0;
  const net     = summary?.netBalance   || 0;
  const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0;

  const topCat = (categories.expense || []).sort((a,b) => b.amount - a.amount)[0];
  const recentMonth = monthly[monthly.length - 1];

  if (msg.includes('saving') || msg.includes('save')) {
    return `Based on your data, your overall savings rate is **${savingsRate.toFixed(1)}%**.\n\n${
      savingsRate >= 20
        ? '🎉 Great job! You\'re above the recommended 20% savings rate. Consider channeling this surplus into:\n• Index fund SIPs (Nifty 50 / S&P 500)\n• Emergency fund (3-6 months of expenses)\n• Recurring deposit for short-term goals'
        : `⚠️ Your savings rate is below the recommended 20%. Here's how to improve:\n• Your biggest expense category is **${topCat?.category || 'N/A'}** at ₹${(topCat?.amount || 0).toLocaleString('en-IN')} — review if this can be reduced by 10-15%\n• Automate savings: set up an auto-transfer on salary day\n• Target cutting ₹${Math.round((income * 0.2 - (income - expense)) / 3).toLocaleString('en-IN')}/month from discretionary spend`
    }`;
  }

  if (msg.includes('spend') || msg.includes('expense') || msg.includes('cost')) {
    const topExpenses = (categories.expense || []).sort((a,b) => b.amount - a.amount).slice(0,3);
    return `Your top expense categories are:\n${topExpenses.map((c,i) => `${i+1}. **${c.category}**: ₹${c.amount.toLocaleString('en-IN')} (${income > 0 ? (c.amount/income*100).toFixed(1) : 0}% of income)`).join('\n')}\n\nTotal expenses: ₹${expense.toLocaleString('en-IN')}.\n\n💡 Tip: Financial experts recommend keeping total expenses under 80% of income. You're at **${income > 0 ? (expense/income*100).toFixed(1) : 0}%**.`;
  }

  if (msg.includes('invest') || msg.includes('wealth')) {
    const investable = Math.max(0, income - expense);
    return `With your current net surplus of **₹${investable.toLocaleString('en-IN')}**, here are investment options to consider:\n\n• **50% — Index Funds (Nifty 50 SIP)**: Low cost, market-beating long-term returns\n• **30% — Emergency Fund**: Target 6 months of expenses (₹${Math.round(expense/monthly.length*6).toLocaleString('en-IN')})\n• **20% — Debt Repayment / Gold / FD**: For stability\n\n📌 Start with even ₹500/month SIP — compounding works over time.`;
  }

  if (msg.includes('budget') || msg.includes('plan')) {
    return `Here's a personalized 50/30/20 budget plan based on your income:\n\n• **50% Needs** (rent, utilities, food): ₹${Math.round(income*0.5).toLocaleString('en-IN')}/month\n• **30% Wants** (entertainment, dining): ₹${Math.round(income*0.3).toLocaleString('en-IN')}/month\n• **20% Savings/Investment**: ₹${Math.round(income*0.2).toLocaleString('en-IN')}/month\n\nYour current spend: ₹${recentMonth ? recentMonth.totalExpense.toLocaleString('en-IN') : expense.toLocaleString('en-IN')}/month.\n\n💡 Use the Budget Planner page to set category-level limits!`;
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello! I'm Nexo AI, your personal financial advisor 👋\n\nI have access to your financial data and I'm here to help. You can ask me things like:\n• "How can I save more money?"\n• "What are my biggest expenses?"\n• "Where should I invest?"\n• "Give me a budget plan"\n\nWhat would you like to know?`;
  }

  return `Based on your financial profile:\n\n• **Net Balance**: ₹${net.toLocaleString('en-IN')}\n• **Savings Rate**: ${savingsRate.toFixed(1)}%\n• **Biggest Expense**: ${topCat?.category || 'N/A'} (₹${(topCat?.amount || 0).toLocaleString('en-IN')})\n\nI can help you with savings strategies, budget planning, investment advice, and expense analysis. What would you like to explore? 💰\n\n*(Add your Gemini API key in .env as VITE_GEMINI_API_KEY for full AI responses)*`;
}

export const SUGGESTED_QUESTIONS = [
  'How can I save more money?',
  'What are my biggest expenses?',
  'Give me a budget plan',
  'Where should I invest my surplus?',
  'How does my savings rate compare?',
  'Am I overspending?',
];
