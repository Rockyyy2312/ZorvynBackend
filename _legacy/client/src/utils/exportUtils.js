import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Converts an array of transaction objects into a CSV string and triggers browser download.
 */
export function exportTransactionsCSV(transactions, filename = 'nexo_transactions.csv') {
  if (!transactions || transactions.length === 0) return;

  const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Notes'];
  const rows = transactions.map(tx => [
    new Date(tx.date).toLocaleDateString('en-IN'),
    tx.type,
    tx.category,
    tx.amount,
    (tx.notes || '').replace(/,/g, ';'), // escape commas in notes
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser print dialog on the element with id="report-print-area"
 */
export function printReport() {
  const content = document.getElementById('report-print-area');
  if (!content) return;

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Nexo Financial Report</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; background: white; padding: 32px; }
          h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 4px; }
          p  { color: #64748b; font-size: 0.875rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 0.875rem; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .income { color: #059669; font-weight: 600; }
          .expense { color: #dc2626; font-weight: 600; }
          .summary-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin: 24px 0; }
          .summary-cell { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
          .summary-cell label { font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
          .summary-cell span { font-size: 1.25rem; font-weight: 800; }
          .header-block { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

/**
 * Generates a branded PDF report from transaction data.
 */
export function exportTransactionsPDF(transactions, { title = 'Nexo Financial Report', period = 'All Time', income = 0, expense = 0, net = 0 } = {}) {
  if (!transactions || transactions.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ──
  doc.setFillColor(10, 12, 25);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(160, 170, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NEXO', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(150, 160, 200);
  doc.text('Premium Financial Portfolio Manager', 14, 25);

  doc.setFontSize(8);
  doc.setTextColor(120, 130, 170);
  doc.text(`Generated: ${reportDate}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Period: ${period}`, pageWidth - 14, 24, { align: 'right' });
  doc.text(`${transactions.length} transactions`, pageWidth - 14, 30, { align: 'right' });

  // ── Summary boxes ──
  const boxY = 44;
  const boxW = (pageWidth - 42) / 3;
  const summaryData = [
    { label: 'TOTAL INCOME', value: `₹${income.toLocaleString('en-IN')}`, color: [16, 185, 129] },
    { label: 'TOTAL EXPENSES', value: `₹${expense.toLocaleString('en-IN')}`, color: [248, 113, 113] },
    { label: 'NET BALANCE', value: `₹${net.toLocaleString('en-IN')}`, color: net >= 0 ? [16, 185, 129] : [248, 113, 113] },
  ];

  summaryData.forEach((s, i) => {
    const x = 14 + i * (boxW + 7);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, boxY, boxW, 22, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 160);
    doc.text(s.label, x + 6, boxY + 8);
    doc.setFontSize(13);
    doc.setTextColor(...s.color);
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, x + 6, boxY + 17);
  });

  // ── Transaction table ──
  const tableData = transactions.map(tx => [
    new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    tx.category,
    `${tx.type === 'income' ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')}`,
    tx.notes || '—',
  ]);

  autoTable(doc, {
    startY: boxY + 30,
    head: [['Date', 'Type', 'Category', 'Amount', 'Notes']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 35, 60],
      textColor: [200, 210, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 55, 80],
    },
    alternateRowStyles: {
      fillColor: [248, 249, 252],
    },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const text = data.cell.raw || '';
        if (text.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
        else if (text.startsWith('-')) data.cell.styles.textColor = [220, 70, 70];
      }
    },
  });

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 180);
    doc.text(`Nexo — Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  doc.save(`nexo_report_${period.replace(/\s/g, '_').toLowerCase()}.pdf`);
}
