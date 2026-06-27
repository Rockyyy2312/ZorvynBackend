import { useState, useEffect } from 'react';
import { Download, Printer, FileText, RefreshCw, FileDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { exportTransactionsCSV, printReport, exportTransactionsPDF } from '../utils/exportUtils';
import { SkeletonTable } from '../components/common/Skeletons';

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary]           = useState(null);
  const [monthly, setMonthly]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, sumRes, monRes] = await Promise.all([
        api.get('/transactions', { params: { limit: '500', page: '1' } }),
        api.get('/dashboard/summary'),
        api.get('/dashboard/monthly'),
      ]);
      setTransactions(txRes.data.data || []);
      setSummary(sumRes.data);
      setMonthly(monRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter transactions by selected month
  const filteredTx = selectedMonth === 'all' ? transactions : transactions.filter(tx => {
    const d = new Date(tx.date);
    return `${d.getFullYear()}-${d.getMonth() + 1}` === selectedMonth;
  });

  // Summary for filtered set
  const filteredIncome  = filteredTx.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const filteredExpense = filteredTx.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const filteredNet     = filteredIncome - filteredExpense;

  const handleCSVExport = () => {
    exportTransactionsCSV(filteredTx, `nexo_report_${selectedMonth}.csv`);
    toast.success('CSV file downloaded!');
  };

  const handlePDFExport = () => {
    const period = selectedMonth === 'all' ? 'All Time' : (() => {
      const [y, m] = selectedMonth.split('-');
      return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
    })();
    exportTransactionsPDF(filteredTx, {
      title: 'Nexo Financial Report',
      period,
      income: filteredIncome,
      expense: filteredExpense,
      net: filteredNet,
    });
    toast.success('PDF report downloaded!');
  };

  if (loading) return <SkeletonTable rows={8} cols={5} />;

  const reportDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Generate and export detailed financial statements</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={16} /></button>
          <button className="btn btn-secondary" onClick={handleCSVExport}>
            <Download size={16} /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handlePDFExport}>
            <FileDown size={16} /> PDF
          </button>
          <button className="btn btn-primary" onClick={printReport}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <FileText size={18} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Filter report by:</span>
        <select className="form-select" style={{ minWidth: '160px' }}
          value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="all">All Time</option>
          {monthly.map(m => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
              {MONTH_NAMES[m.month - 1]} {m.year}
            </option>
          ))}
        </select>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {filteredTx.length} transactions
        </span>
      </div>

      {/* Printable report body */}
      <div id="report-print-area" className="glass-card report-panel">
        {/* Header */}
        <div className="report-header-block">
          <div className="report-title-block">
            <h2>Nexo Financial Report</h2>
            <p>
              {selectedMonth === 'all' ? 'All-time summary' : (() => {
                const [y, m] = selectedMonth.split('-');
                return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
              })()}
            </p>
          </div>
          <div className="report-meta">
            <p>Generated: {reportDate}</p>
            <p style={{ marginTop: '2px' }}>{filteredTx.length} transactions</p>
          </div>
        </div>

        {/* Summary cells */}
        <div className="report-summary-row">
          {[
            { label: 'Total Income',   val: filteredIncome,  color: 'var(--color-income)' },
            { label: 'Total Expenses', val: filteredExpense, color: 'var(--color-expense)' },
            { label: 'Net Balance',    val: filteredNet,     color: filteredNet >= 0 ? 'var(--color-income)' : 'var(--color-expense)' },
          ].map(s => (
            <div key={s.label} className="report-summary-cell">
              <p className="report-summary-cell-label">{s.label}</p>
              <p className="report-summary-cell-value" style={{ color: s.color }}>{formatCurrency(s.val)}</p>
            </div>
          ))}
        </div>

        {/* Transaction table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No transactions found</td></tr>
              ) : filteredTx.map(tx => (
                <tr key={tx._id}>
                  <td>{formatDate(tx.date, 'short')}</td>
                  <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                  <td style={{ fontWeight: 500 }}>{tx.category}</td>
                  <td className={tx.type === 'income' ? 'badge-income' : 'badge-expense'} style={{ fontWeight: 700 }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{tx.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monthly breakdown */}
        {monthly.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Monthly Summary</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Balance</th></tr>
                </thead>
                <tbody>
                  {[...monthly].reverse().map(m => (
                    <tr key={`${m.year}-${m.month}`}>
                      <td style={{ fontWeight: 600 }}>{MONTH_NAMES[m.month-1]} {m.year}</td>
                      <td style={{ color: 'var(--color-income)', fontWeight: 600 }}>{formatCurrency(m.totalIncome)}</td>
                      <td style={{ color: 'var(--color-expense)', fontWeight: 600 }}>{formatCurrency(m.totalExpense)}</td>
                      <td style={{ color: m.netBalance >= 0 ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: 700 }}>
                        {formatCurrency(m.netBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
