import React, { useState, useEffect, useCallback } from 'react';
import cashFlowService from '../../services/cashFlowService';
import {
  Printer,
  Download,
  Calendar,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Landmark,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatINR = (val) => {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

export const CashFlowReports = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBankId, setSelectedBankId] = useState('ALL');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const [repRes, accRes] = await Promise.all([
        cashFlowService.getDailyReport(selectedDate, selectedBankId),
        cashFlowService.getBankAccounts()
      ]);

      if (repRes?.success) {
        setReportData(repRes.data);
      }
      if (accRes?.success) {
        setBankAccounts(accRes.data);
      }
      if (showToast) toast.success('Daily report updated');
    } catch (err) {
      console.error('Failed to load report:', err);
      toast.error('Failed to generate daily report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedBankId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const rows = [
      ['DANZO TECHNOLOGIES - DAILY CASH POSITION STATEMENT'],
      [`Report Date: ${selectedDate}`],
      [''],
      ['Line Item', 'Amount (INR)'],
      ['Opening Cash Balance', reportData.summary.openingCash],
      ['Total Cash Inflows', reportData.summary.totalInflows],
      ['Total Cash Outflows', reportData.summary.totalOutflows],
      ['Net Closing Cash Position', reportData.summary.closingCash],
      [''],
      ['Bank Account Breakdown'],
      ['Bank Name', 'Account Number', 'Opening', 'Inflows', 'Outflows', 'Closing'],
      ...(reportData.accountBreakdowns || []).map(a => [
        a.bankName,
        a.maskedAccountNumber,
        a.openingBalance,
        a.todayInflows,
        a.todayOutflows,
        a.closingBalance
      ])
    ];

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daily_cash_position_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV');
  };

  const summary = reportData?.summary || {
    openingCash: 0,
    totalInflows: 0,
    totalOutflows: 0,
    closingCash: 0
  };

  const accountBreakdowns = reportData?.accountBreakdowns || [];
  const transactions = reportData?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Non-printable Control Toolbar */}
      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span>Daily Cash Position Executive Report</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exportable and print-ready treasury statement for CFO sign-off
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Bank Filter */}
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Linked Accounts</option>
            {bankAccounts.map((b) => (
              <option key={b._id} value={b._id}>
                {b.bankName} ({b.maskedAccountNumber})
              </option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Formal Executive Statement */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-sm print:shadow-none print:border-0 print:p-0 print:m-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6 mb-8 flex items-start justify-between">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              Danzo Technologies Inc.
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Executive Treasury & Liquidity Management Division
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              DAILY CASH POSITION STATEMENT
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-1">
              Statement Date: <span className="font-bold">{new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Liquidity Summary Table */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            1. Executive Liquidity Reconciliation
          </h3>
          <table className="w-full text-xs border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="bg-slate-50 dark:bg-slate-800/40">
                <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                  Opening Liquid Cash Balance (INR)
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                  {formatINR(summary.openingCash)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 pl-8">
                  (+) Total Customer Receipts & Operational Collections
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  +{formatINR(summary.totalInflows)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 pl-8">
                  (-) Total Payroll, Operating Expenses & Vendor Payouts
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                  -{formatINR(summary.totalOutflows)}
                </td>
              </tr>
              <tr className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold text-sm">
                <td className="py-3 px-4 uppercase tracking-wider">
                  Net Closing Available Cash Position
                </td>
                <td className="py-3 px-4 text-right font-mono text-base">
                  {formatINR(summary.closingCash)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Bank Accounts Distribution */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            2. Multi-Bank Account Balances
          </h3>
          <table className="w-full text-xs border border-slate-200 dark:border-slate-800">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3 text-left">Bank Institution</th>
                <th className="py-2.5 px-3 text-left">Account (Masked)</th>
                <th className="py-2.5 px-3 text-right">Opening</th>
                <th className="py-2.5 px-3 text-right">Today Inflows</th>
                <th className="py-2.5 px-3 text-right">Today Outflows</th>
                <th className="py-2.5 px-3 text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {accountBreakdowns.map((acc, i) => (
                <tr key={i} className="text-slate-800 dark:text-slate-200">
                  <td className="py-2.5 px-3 font-semibold">{acc.bankName}</td>
                  <td className="py-2.5 px-3 font-mono">{acc.maskedAccountNumber}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatINR(acc.openingBalance)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">+{formatINR(acc.todayInflows)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">-{formatINR(acc.todayOutflows)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(acc.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Daily Transactions Ledger Itemized */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            3. Itemized Cash Activity on {selectedDate} ({transactions.length} items)
          </h3>
          {transactions.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 italic border border-slate-100 dark:border-slate-800 rounded-xl text-center">
              No transactions recorded for selected date filter.
            </div>
          ) : (
            <table className="w-full text-xs border border-slate-200 dark:border-slate-800">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                  <th className="py-2 px-3 text-left">Bank</th>
                  <th className="py-2 px-3 text-left">Description</th>
                  <th className="py-2 px-3 text-left">Category</th>
                  <th className="py-2 px-3 text-left">Reference</th>
                  <th className="py-2 px-3 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="py-2 px-3 font-semibold">{tx.bankCode}</td>
                    <td className="py-2 px-3 text-slate-900 dark:text-white max-w-[220px] truncate">{tx.description}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{tx.category}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{tx.reference || '—'}</td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${
                      tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 4: Sign-off Footer */}
        <div className="pt-8 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Prepared By:</div>
            <div>Danzo Automated Treasury & Reconciler</div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">Generated at: {new Date().toISOString()}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-6">CFO / Authorized Signatory:</div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1 inline-block min-w-[180px] text-center font-semibold">
              Rakshith Ganjimut (Admin)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowReports;
