import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import cashFlowService from '../../services/cashFlowService';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Calendar,
  Building2,
  Tag,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  Trash2,
  AlertTriangle,
  Edit3
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

const CATEGORIES = [
  'Customer Receipts',
  'Vendor Payments',
  'Payroll & Salaries',
  'Statutory & Tax (GST/TDS)',
  'Office & Rent Expenses',
  'Bank Charges & Interest',
  'Inter-Account Transfer',
  'Loan & Financing',
  'Investments & Treasury',
  'Uncategorized'
];

export const CashFlowTransactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const bankFilterParam = searchParams.get('bankId') || '';

  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState(bankFilterParam);
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  // Manual Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    bankId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    type: 'DEBIT',
    amount: '',
    category: 'Office & Rent Expenses',
    reference: '',
    notes: ''
  });

  // Edit Transaction Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    bankId: '',
    transactionDate: '',
    description: '',
    type: 'DEBIT',
    amount: '',
    category: '',
    reference: '',
    counterparty: ''
  });

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditForm({
      bankId: tx.bankAccountId?._id || tx.bankAccountId || '',
      transactionDate: tx.transactionDate ? new Date(tx.transactionDate).toISOString().split('T')[0] : '',
      description: tx.description || '',
      type: tx.type || 'DEBIT',
      amount: tx.amount || 0,
      category: tx.category || 'Uncategorized',
      reference: tx.reference || '',
      counterparty: tx.counterparty || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      setSavingEdit(true);
      const payload = {
        bankId: editForm.bankId,
        transactionDate: editForm.transactionDate,
        description: editForm.description,
        type: editForm.type,
        amount: Number(editForm.amount),
        category: editForm.category,
        reference: editForm.reference,
        counterparty: editForm.counterparty
      };

      const res = await cashFlowService.updateTransaction(editingTx._id, payload);
      if (res?.success) {
        toast.success('Transaction updated and balance recalculated');
        setEditModalOpen(false);
        fetchTransactions();
      } else {
        toast.error(res?.error || 'Failed to update transaction');
      }
    } catch (err) {
      console.error('Update transaction error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to update transaction');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchTransactions = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const params = {};
      if (selectedBank) params.bankId = selectedBank;
      if (selectedType) params.type = selectedType;
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [txRes, accRes] = await Promise.all([
        cashFlowService.getTransactions(params),
        cashFlowService.getBankAccounts()
      ]);

      if (txRes?.success) {
        setTransactions(txRes.data);
      }
      if (accRes?.success) {
        setBankAccounts(accRes.data);
        if (!manualForm.bankId && accRes.data.length > 0) {
          setManualForm((prev) => ({ ...prev, bankId: accRes.data[0]._id }));
        }
      }

      if (showToast) toast.success('Transactions refreshed');
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBank, selectedType, selectedCategory, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions available to export');
      return;
    }

    const headers = ['Date', 'Bank', 'Account', 'Type', 'Amount', 'Category', 'Description', 'Reference', 'Reconciled'];
    const rows = transactions.map((t) => [
      new Date(t.transactionDate).toISOString().split('T')[0],
      `"${t.bankName || t.bankCode}"`,
      `"${t.maskedAccountNumber}"`,
      t.type,
      t.amount,
      `"${t.category || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.reference || ''}"`,
      t.isReconciled ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cashflow_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transactions exported to CSV');
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.bankId || !manualForm.amount || !manualForm.description) {
      toast.error('Please complete all required fields.');
      return;
    }

    try {
      setSubmittingManual(true);
      const res = await cashFlowService.createManualTransaction({
        ...manualForm,
        amount: Number(manualForm.amount)
      });
      if (res?.success) {
        toast.success('Manual transaction recorded successfully');
        setIsModalOpen(false);
        setManualForm({
          bankId: bankAccounts[0]?._id || '',
          transactionDate: new Date().toISOString().split('T')[0],
          description: '',
          type: 'DEBIT',
          amount: '',
          category: 'Office & Rent Expenses',
          reference: '',
          notes: ''
        });
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleDelete = async (tx) => {
    const confirmMsg = `Are you sure you want to delete this transaction?\n\n"${tx.description}" (${tx.type === 'CREDIT' ? '+' : '-'}${formatINR(tx.amount)})\n\nThis will reverse the inflow/outflow on the bank account and recalculate balances.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(tx._id);
      const res = await cashFlowService.deleteTransaction(tx._id);
      if (res?.success) {
        toast.success('Transaction deleted and balance recalculated');
        setTransactions((prev) => prev.filter((t) => t._id !== tx._id));
      } else {
        toast.error(res?.error || 'Failed to delete transaction');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Multi-filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description, reference ID, counterparty..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTransactions(true)}
              disabled={refreshing}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Entry</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Bank Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Account</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Accounts</option>
              {bankAccounts.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.bankName} ({b.maskedAccountNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Flow Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Flows (Credit/Debit)</option>
              <option value="CREDIT">Inflow (Credit +)</option>
              <option value="DEBIT">Outflow (Debit -)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date Range</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full py-1 px-1.5 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Registry Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              CFO Transactions Ledger
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {transactions.length} Records
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading ledger records...</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm">No transactions match your current filters</p>
            <p className="text-xs mt-1">Try adjusting the search query or date parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Bank & A/C</th>
                  <th className="pb-3">Description & Counterparty</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Ref ID</th>
                  <th className="pb-3 text-right">Amount (INR)</th>
                  <th className="pb-3 text-right">Balance</th>
                  <th className="pb-3 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group">
                    <td className="py-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{tx.bankCode}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.maskedAccountNumber}</div>
                    </td>
                    <td className="py-3.5 max-w-[280px]">
                      <div className="font-medium text-slate-900 dark:text-white truncate" title={tx.description}>
                        {tx.description}
                      </div>
                      {tx.counterparty && (
                        <div className="text-[11px] text-slate-400 truncate">Party: {tx.counterparty}</div>
                      )}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {tx.reference || '—'}
                    </td>
                    <td className={`py-3.5 text-right font-mono font-extrabold whitespace-nowrap ${
                      tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                    </td>
                    <td className="py-3.5 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {tx.balanceAfter ? formatINR(tx.balanceAfter) : '—'}
                    </td>
                    <td className="py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(tx)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                          title="Edit transaction details and amounts"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(tx)}
                          disabled={deletingId === tx._id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete transaction and recalculate balance"
                        >
                          {deletingId === tx._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editModalOpen && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Edit Transaction
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Updates will automatically adjust bank balances and snapshot ledger entries.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Bank Account</label>
                  <select
                    value={editForm.bankId}
                    onChange={(e) => setEditForm({ ...editForm, bankId: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    required
                  >
                    {bankAccounts.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.bankName} ({b.maskedAccountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    value={editForm.transactionDate}
                    onChange={(e) => setEditForm({ ...editForm, transactionDate: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Flow Type *</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="DEBIT">DEBIT (Outflow -)</option>
                    <option value="CREDIT">CREDIT (Inflow +)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Amount (INR ₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Category *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Reference ID</label>
                  <input
                    type="text"
                    value={editForm.reference}
                    onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                    placeholder="e.g. TXN987654321"
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Description / Memo *</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="e.g. Vendor Invoice Payment"
                  className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Counterparty / Beneficiary</label>
                <input
                  type="text"
                  value={editForm.counterparty}
                  onChange={(e) => setEditForm({ ...editForm, counterparty: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Update Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Record Manual Bank Transaction
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Entries are logged into the immutable audit trail and update live cash positions.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Bank Account *</label>
                  <select
                    value={manualForm.bankId}
                    onChange={(e) => setManualForm({ ...manualForm, bankId: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    required
                  >
                    {bankAccounts.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.bankName} ({b.maskedAccountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    value={manualForm.transactionDate}
                    onChange={(e) => setManualForm({ ...manualForm, transactionDate: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Flow Type *</label>
                  <select
                    value={manualForm.type}
                    onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="DEBIT">DEBIT (Outflow -)</option>
                    <option value="CREDIT">CREDIT (Inflow +)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Amount (INR ₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Category *</label>
                <select
                  value={manualForm.category}
                  onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                  className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Description / Memo *</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder="e.g. Annual Cloud Services Payout"
                  className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submittingManual ? 'Saving...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowTransactions;
