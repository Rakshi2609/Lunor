import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import cashFlowService from '../../services/cashFlowService';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Building2,
  Receipt,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper to format Indian Rupee currency
const formatINR = (val) => {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

// Format in Lakhs / Crores for large numbers
const formatLakhs = (val) => {
  if (!val && val !== 0) return '₹0';
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return formatINR(val);
};

export const CashFlowOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await cashFlowService.getOverview();
      if (res?.success) {
        setData(res.data);
        if (showToast) toast.success('Cash Flow position updated');
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch Cash Flow summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800/60 rounded-2xl lg:col-span-2" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalCash: 0,
    todayInflows: 0,
    todayOutflows: 0,
    netPosition: 0
  };

  const bankAccounts = data?.bankAccounts || [];
  const recentTransactions = data?.recentTransactions || [];
  const categoryBreakdown = data?.categoryBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4 text-emerald-500" />
          <span>Last Position Reconciled: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/cashflow/upload"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Statement</span>
          </Link>

          <Link
            to="/cashflow/reports"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Daily Report</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Available */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700/60 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Total Cash Available
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {formatINR(kpis.totalCash)}
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{formatLakhs(kpis.totalCash)}</span>
            <span>across {bankAccounts.length} Active Accounts</span>
          </div>
        </div>

        {/* Today's Inflows */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's Inflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            +{formatINR(kpis.todayInflows)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Customer Receipts & Returns</span>
          </div>
        </div>

        {/* Today's Outflows */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's Outflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            -{formatINR(kpis.todayOutflows)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Disbursements & Operating Bills</span>
          </div>
        </div>

        {/* Net Cash Position */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Day Liquidity
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              kpis.netPosition >= 0 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            kpis.netPosition >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {kpis.netPosition >= 0 ? '+' : ''}{formatINR(kpis.netPosition)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Healthy</span>
            <span>operating buffer</span>
          </div>
        </div>
      </div>

      {/* Bank Account Balances Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Bank Accounts Liquidity Distribution
            </h2>
          </div>
          <Link
            to="/cashflow/accounts"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Manage Accounts →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => {
            const pctOfTotal = kpis.totalCash > 0 ? ((acc.closingBalance / kpis.totalCash) * 100).toFixed(1) : 0;
            return (
              <div
                key={acc._id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {acc.bankName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-300 font-semibold mb-3">
                    A/C {acc.maskedAccountNumber}
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {formatINR(acc.closingBalance)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatLakhs(acc.closingBalance)} • {pctOfTotal}% of total cash
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Today: +{formatINR(acc.todayInflows)}</span>
                  <span>-{formatINR(acc.todayOutflows)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>Cash Flow by Category</span>
          </h3>

          <div className="space-y-3.5">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No categorized data available.</p>
            ) : (
              categoryBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                      {item._id.category || 'Uncategorized'}
                    </span>
                    <span className={`font-mono font-bold ${item._id.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {item._id.type === 'CREDIT' ? '+' : '-'}{formatINR(item.totalAmount)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item._id.type === 'CREDIT' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, Math.max(10, (item.totalAmount / (kpis.totalCash || 1000000)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Recent Cash Transactions</span>
            </h3>
            <Link
              to="/cashflow/transactions"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All Transactions ({data?.totalTransactionsCount || 0}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Bank & A/C</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      <span className="font-semibold">{tx.bankCode}</span>
                      <span className="text-slate-400 ml-1 text-[11px]">{tx.maskedAccountNumber}</span>
                    </td>
                    <td className="py-3 text-slate-800 dark:text-slate-200 max-w-[220px] truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-mono font-bold whitespace-nowrap ${
                      tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowOverview;
