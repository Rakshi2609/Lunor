import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import cashFlowService from '../../services/cashFlowService';
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  UploadCloud,
  Receipt,
  Plus,
  Shield,
  CreditCard,
  Phone,
  Landmark,
  RefreshCw,
  Edit3,
  X,
  RotateCcw
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

export const BankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  // Edit Balance Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({
    openingBalance: 0,
    todayInflows: 0,
    todayOutflows: 0,
    closingBalance: 0
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAccounts = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await cashFlowService.getBankAccounts();
      if (res?.success) {
        setAccounts(res.data);
        if (showToast) toast.success('Bank accounts updated');
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch bank accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleOpenEdit = (acc) => {
    setEditingAccount(acc);
    setEditForm({
      openingBalance: acc.openingBalance || 0,
      todayInflows: acc.todayInflows || 0,
      todayOutflows: acc.todayOutflows || 0,
      closingBalance: acc.closingBalance || 0
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      setSavingEdit(true);
      const payload = {
        id: editingAccount._id,
        code: editingAccount.bankCode,
        openingBalance: Number(editForm.openingBalance),
        todayInflows: Number(editForm.todayInflows),
        todayOutflows: Number(editForm.todayOutflows),
        closingBalance: Number(editForm.openingBalance) + Number(editForm.todayInflows) - Number(editForm.todayOutflows)
      };

      const res = await cashFlowService.updateAccountBalance(payload);
      if (res?.success) {
        toast.success(`Updated ${editingAccount.bankName} balance!`);
        setEditModalOpen(false);
        fetchAccounts();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update balance');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetDatabase = async () => {
    const confirmPrompt = window.confirm(
      '⚠️ ZERO RESET CASH FLOW DATA?\n\n' +
      'This will:\n' +
      '1. Reset all bank account balances to ₹0.00.\n' +
      '2. Clear all uploaded transactions & statement records.\n' +
      '3. Clear all daily snapshots.\n\n' +
      'Are you sure you want to proceed?'
    );
    if (!confirmPrompt) return;

    try {
      setResettingDb(true);
      const res = await cashFlowService.resetData();
      if (res?.success) {
        toast.success('Cash Flow database reset to Zero!');
        fetchAccounts();
      } else {
        toast.error(res?.message || 'Failed to reset data');
      }
    } catch (err) {
      console.error('Reset error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset database');
    } finally {
      setResettingDb(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.closingBalance || 0), 0);
  const totalInflows = accounts.reduce((sum, a) => sum + (a.todayInflows || 0), 0);
  const totalOutflows = accounts.reduce((sum, a) => sum + (a.todayOutflows || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Corporate Banking Positions
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {accounts.length} Active Accounts Configured • Masked identifier security enabled
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Liquid Funds</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(totalBalance)}
            </div>
          </div>

          <button
            onClick={() => fetchAccounts(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleResetDatabase}
            disabled={resettingDb}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
            title="Reset all bank balances to Zero"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resettingDb ? 'animate-spin' : ''}`} />
            <span>{resettingDb ? 'Resetting...' : 'Reset to Zero'}</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const isHDFC = acc.bankCode === 'HDFC';
          const isICICI = acc.bankCode === 'ICICI';
          const isSBI = acc.bankCode === 'SBI';

          const brandBadgeClass = isHDFC
            ? 'bg-blue-600 text-white'
            : isICICI
            ? 'bg-amber-600 text-white'
            : 'bg-emerald-600 text-white';

          return (
            <div
              key={acc._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500/50 transition-colors"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${brandBadgeClass}`}>
                      {acc.bankName}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
                      {acc.accountType} Account
                    </h3>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    title="Edit account balance"
                  >
                    <Edit3 className="w-3 h-3 text-emerald-500" />
                    <span>Edit Balance</span>
                  </button>
                </div>

                {/* Account Number & Branch */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-5 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Account Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {acc.maskedAccountNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Currency</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {acc.currency} (INR ₹)
                    </span>
                  </div>
                </div>

                {/* Balance & Inflows/Outflows */}
                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Current Available Balance
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                      {formatINR(acc.closingBalance)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                        Today Inflows
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatINR(acc.todayInflows)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-rose-500" />
                        Today Outflows
                      </span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatINR(acc.todayOutflows)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata details */}
                {acc.metadata && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mb-6 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {acc.metadata.relationshipManager && (
                      <div className="truncate">
                        <span className="font-semibold">RM:</span> {acc.metadata.relationshipManager}
                      </div>
                    )}
                    {acc.metadata.odLimit > 0 && (
                      <div>
                        <span className="font-semibold">Overdraft Limit:</span> {formatINR(acc.metadata.odLimit)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/cashflow/transactions?bankId=${acc._id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Transactions</span>
                </Link>

                <Link
                  to={`/cashflow/upload?bankCode=${acc.bankCode}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Stmt</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Account Balance Modal */}
      {editModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Account Balance
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {editingAccount.bankName} ({editingAccount.maskedAccountNumber})
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editForm.openingBalance}
                  onChange={(e) => setEditForm({ ...editForm, openingBalance: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Today Inflows / Deposits (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editForm.todayInflows}
                  onChange={(e) => setEditForm({ ...editForm, todayInflows: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Today Outflows / Withdrawals (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editForm.todayOutflows}
                  onChange={(e) => setEditForm({ ...editForm, todayOutflows: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500">Calculated Closing Balance: </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(Number(editForm.openingBalance) + Number(editForm.todayInflows) - Number(editForm.todayOutflows))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
