import React, { useState, useEffect, useCallback } from 'react';
import cashFlowService from '../../services/cashFlowService';
import {
  TrendingUp,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  RefreshCw,
  Calculator,
  Download,
  UploadCloud,
  Edit3,
  X,
  Check,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatINR = (val) => {
  if (val === undefined || val === null) return '₹0.00';
  const num = Number(val);
  if (isNaN(num)) return '₹0.00';
  if (num < 0) {
    return `(₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const DailyCashPosition = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({
    openingBalance: 0,
    todayInflows: 0,
    todayOutflows: 0,
    closingBalance: 0
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Upload Statement Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTargetId, setUploadTargetId] = useState('');
  const [uploadingStatement, setUploadingStatement] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  // Collapsible sections
  const [capexExpanded, setCapexExpanded] = useState(true);
  const [opexExpanded, setOpexExpanded] = useState(true);

  const handleResetDatabase = async () => {
    const confirmPrompt = window.confirm(
      '⚠️ ZERO RESET CASH FLOW DATA?\n\n' +
      'This will:\n' +
      '1. Reset all bank account balances (Opening, Inflows, Outflows, Closing) to ₹0.00.\n' +
      '2. Clear all uploaded transactions & statement records.\n' +
      '3. Clear all daily snapshots and variance data.\n\n' +
      'Are you sure you want to proceed?'
    );
    if (!confirmPrompt) return;

    try {
      setResettingDb(true);
      const res = await cashFlowService.resetData();
      if (res?.success) {
        toast.success('Cash Flow database successfully reset to Zero!');
        fetchHierarchy();
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

  const fetchHierarchy = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await cashFlowService.getHierarchyReport(selectedDate);
      if (res?.success) {
        setHierarchyData(res.data);
        if (showToast) toast.success(`Cash Position loaded for ${selectedDate}`);
      }
    } catch (err) {
      console.error('Failed to load hierarchy data:', err);
      toast.error(err.response?.data?.error || 'Failed to fetch cash position');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  // Handle Excel Download
  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const blob = await cashFlowService.downloadHierarchyExcel(selectedDate, selectedDivision);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bank_Balance_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`Bank Balance Excel downloaded for ${selectedDate}`);
    } catch (err) {
      console.error('Excel download failed:', err);
      toast.error('Failed to download Excel file');
    } finally {
      setDownloading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (acc, title) => {
    setEditingAccount({ ...acc, displayTitle: title || acc.code || acc.bankName });
    setEditForm({
      openingBalance: acc.openingBalance || 0,
      todayInflows: acc.todayInflows || 0,
      todayOutflows: acc.todayOutflows || 0,
      closingBalance: acc.closingBalance || 0
    });
    setEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      setSavingEdit(true);
      const payload = {
        id: editingAccount._id,
        code: editingAccount.code,
        openingBalance: Number(editForm.openingBalance),
        todayInflows: Number(editForm.todayInflows),
        todayOutflows: Number(editForm.todayOutflows),
        closingBalance: Number(editForm.openingBalance) + Number(editForm.todayInflows) - Number(editForm.todayOutflows),
        date: selectedDate
      };

      const res = await cashFlowService.updateAccountBalance(payload);
      if (res?.success) {
        toast.success(`Updated ${editingAccount.displayTitle || editingAccount.code} for ${selectedDate}`);
        setEditModalOpen(false);
        fetchHierarchy();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update balance');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Statement Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select an Excel (.xlsx, .xls) or CSV statement file.');
      return;
    }

    try {
      setUploadingStatement(true);
      const formData = new FormData();
      formData.append('statement', uploadFile);
      if (uploadTargetId) {
        formData.append('accountId', uploadTargetId);
        formData.append('bankId', uploadTargetId);
      }
      formData.append('statementDate', selectedDate);
      formData.append('date', selectedDate);

      const res = await cashFlowService.uploadStatement(formData);
      if (res?.success) {
        toast.success(`Statement processed for [${res.data.accountCode || 'Account'}]! Balances updated for ${selectedDate}.`);
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadTargetId('');
        fetchHierarchy();
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to process statement');
    } finally {
      setUploadingStatement(false);
    }
  };

  const opTotal = hierarchyData?.operatingTotal || {
    openingBalance: 0,
    todayInflows: 0,
    todayOutflows: 0,
    closingBalance: 0
  };

  const capex = hierarchyData?.capex;
  const opex = hierarchyData?.opex;
  const ccAccount = hierarchyData?.ccAccount;
  const investmentsAccount = hierarchyData?.investmentsAccount;
  const grandTotal = hierarchyData?.grandTotal;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top Filter & Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Daily Cash Position & Multi-Bank Hierarchy
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula: <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Opening Balance - Withdrawals (Outflow) + Deposits (Inflow) = Closing Balance</span>
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Division Filter */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Divisions</option>
                <option value="Capex">Capex Only</option>
                <option value="Opex">Opex Only</option>
                <option value="CC A/c Usage">CC A/c Usage Only</option>
                <option value="Investments">Investments Only</option>
              </select>
            </div>

            {/* Upload Statement Button */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-sm"
              title="Upload bank statement for selected date"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
              <span>Upload Statement</span>
            </button>

            {/* Download Excel Button */}
            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-800 transition cursor-pointer shadow-sm"
              title="Download Excel spreadsheet matching this exact structure"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? 'Generating Excel...' : 'Download Excel'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchHierarchy(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Reset to Zero */}
            <button
              onClick={handleResetDatabase}
              disabled={resettingDb}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
              title="Reset all bank balances and transactions to Zero"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resettingDb ? 'animate-spin' : ''}`} />
              <span>{resettingDb ? 'Resetting...' : 'Reset to Zero'}</span>
            </button>
          </div>
        </div>

        {/* Live Operating KPI Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Opening Balance
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
              {formatINR(opTotal.openingBalance)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Total Inflows (+)
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              +{formatINR(opTotal.todayInflows)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Total Outflows (-)
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
              -{formatINR(opTotal.todayOutflows)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700/80 shadow-md">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Net Closing Position
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-white font-mono mt-1">
              {formatINR(opTotal.closingBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Hierarchy Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Division / Bank Account</th>
                <th className="py-3.5 px-6 text-right">Opening Balance</th>
                <th className="py-3.5 px-6 text-right">Inflow</th>
                <th className="py-3.5 px-6 text-right">Outflow</th>
                <th className="py-3.5 px-6 text-right">Closing Balance</th>
                <th className="py-3.5 px-4 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm font-sans">
              {/* 1. TOTAL ROW (Navy / Slate Top Bar) */}
              {(selectedDivision === 'ALL' || selectedDivision === 'TOTAL') && (
                <tr className="bg-slate-900 text-white font-bold">
                  <td className="py-3.5 px-6 tracking-wide text-sm font-extrabold">TOTAL</td>
                  <td className="py-3.5 px-6 text-right font-mono">{formatINR(opTotal.openingBalance)}</td>
                  <td className="py-3.5 px-6 text-right font-mono text-emerald-400">+{formatINR(opTotal.todayInflows)}</td>
                  <td className="py-3.5 px-6 text-right font-mono text-rose-300">-{formatINR(opTotal.todayOutflows)}</td>
                  <td className="py-3.5 px-6 text-right font-mono text-emerald-300 font-extrabold">{formatINR(opTotal.closingBalance)}</td>
                  <td className="py-3.5 px-4 text-center"></td>
                </tr>
              )}

              {/* 2. CAPEX DIVISION */}
              {(selectedDivision === 'ALL' || selectedDivision === 'Capex') && capex && (
                <>
                  {/* Capex Section Header */}
                  <tr className="bg-emerald-100 dark:bg-emerald-950/60 font-bold text-emerald-900 dark:text-emerald-100 border-t-2 border-emerald-300 dark:border-emerald-700">
                    <td className="py-3 px-6 cursor-pointer" onClick={() => setCapexExpanded(!capexExpanded)}>
                      <div className="flex items-center gap-2">
                        {capexExpanded ? <ChevronDown className="w-4 h-4 text-emerald-700" /> : <ChevronRight className="w-4 h-4 text-emerald-700" />}
                        <span className="font-extrabold text-base">Capex</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-4 text-center"></td>
                  </tr>

                  {capexExpanded && (
                    <>
                      {/* Capex Master */}
                      {capex.master && (
                        <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/80 transition">
                          <td className="py-2.5 px-6 pl-10 font-semibold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>Capex Master (CORP 606)</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono">****8606</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300">{formatINR(capex.master.openingBalance)}</td>
                          <td className="py-2.5 px-6 text-right font-mono text-slate-500">{formatINR(capex.master.todayInflows)}</td>
                          <td className="py-2.5 px-6 text-right font-mono text-slate-500">{formatINR(capex.master.todayOutflows)}</td>
                          <td className="py-2.5 px-6 text-right font-mono font-semibold text-slate-900 dark:text-white">{formatINR(capex.master.closingBalance)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenEdit(capex.master, 'Capex Master (CORP 606)')}
                              className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                              title="Edit balance"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )}

                      {/* City Level Summary Row */}
                      <tr className="bg-emerald-100/70 dark:bg-emerald-950/50 font-bold text-emerald-950 dark:text-emerald-100">
                        <td className="py-2.5 px-6 pl-10">City Level</td>
                        <td className="py-2.5 px-6 text-right font-mono">{formatINR(capex.cityLevel.openingBalance)}</td>
                        <td className="py-2.5 px-6 text-right font-mono">{formatINR(capex.cityLevel.todayInflows)}</td>
                        <td className="py-2.5 px-6 text-right font-mono">{formatINR(capex.cityLevel.todayOutflows)}</td>
                        <td className="py-2.5 px-6 text-right font-mono font-extrabold">{formatINR(capex.cityLevel.closingBalance)}</td>
                        <td className="py-2.5 px-4 text-center"></td>
                      </tr>

                      {/* Capex Sub-Branches */}
                      {capex.cityLevel.branches.map((b) => (
                        <tr key={b._id || b.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-2 px-6 pl-16 text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white font-mono">{b.code || b.bankCode}</span>
                              <span className="text-slate-400">({b.bankName} - ****{b.accountNumberLast3 || '***'})</span>
                            </div>
                          </td>
                          <td className="py-2 px-6 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{formatINR(b.openingBalance)}</td>
                          <td className="py-2 px-6 text-right font-mono text-xs text-slate-500">{formatINR(b.todayInflows)}</td>
                          <td className="py-2 px-6 text-right font-mono text-xs text-slate-500">{formatINR(b.todayOutflows)}</td>
                          <td className="py-2 px-6 text-right font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{formatINR(b.closingBalance)}</td>
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={() => handleOpenEdit(b, b.code || b.bankName)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition cursor-pointer"
                              title="Edit balance"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Capex Total Footer */}
                      <tr className="bg-emerald-200/60 dark:bg-emerald-900/60 font-bold text-emerald-950 dark:text-emerald-100 border-b border-emerald-300">
                        <td className="py-3 px-6 pl-8 font-extrabold">Capex Total</td>
                        <td className="py-3 px-6 text-right font-mono">{formatINR(capex.total.openingBalance)}</td>
                        <td className="py-3 px-6 text-right font-mono">{formatINR(capex.total.todayInflows)}</td>
                        <td className="py-3 px-6 text-right font-mono">{formatINR(capex.total.todayOutflows)}</td>
                        <td className="py-3 px-6 text-right font-mono font-extrabold">{formatINR(capex.total.closingBalance)}</td>
                        <td className="py-3 px-4 text-center"></td>
                      </tr>
                    </>
                  )}
                </>
              )}

              {/* 3. OPEX DIVISION */}
              {(selectedDivision === 'ALL' || selectedDivision === 'Opex') && opex && (
                <>
                  {/* Opex Section Header */}
                  <tr className="bg-rose-100 dark:bg-rose-950/60 font-bold text-rose-900 dark:text-rose-100 border-t-2 border-rose-300 dark:border-rose-700">
                    <td className="py-3 px-6 cursor-pointer" onClick={() => setOpexExpanded(!opexExpanded)}>
                      <div className="flex items-center gap-2">
                        {opexExpanded ? <ChevronDown className="w-4 h-4 text-rose-700" /> : <ChevronRight className="w-4 h-4 text-rose-700" />}
                        <span className="font-extrabold text-base">Opex</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-6 text-right font-mono"></td>
                    <td className="py-3 px-4 text-center"></td>
                  </tr>

                  {opexExpanded && (
                    <>
                      {/* Opex Master */}
                      {opex.master && (
                        <tr className="bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 transition">
                          <td className="py-2.5 px-6 pl-10 font-semibold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>Opex Master (CORP 609)</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300 font-mono">****8609</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300">{formatINR(opex.master.openingBalance)}</td>
                          <td className="py-2.5 px-6 text-right font-mono text-emerald-600 font-semibold">+{formatINR(opex.master.todayInflows)}</td>
                          <td className="py-2.5 px-6 text-right font-mono text-slate-500">{formatINR(opex.master.todayOutflows)}</td>
                          <td className="py-2.5 px-6 text-right font-mono font-semibold text-slate-900 dark:text-white">{formatINR(opex.master.closingBalance)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenEdit(opex.master, 'Opex Master (CORP 609)')}
                              className="p-1 hover:bg-rose-200 dark:hover:bg-rose-800 rounded text-rose-700 dark:text-rose-300 transition cursor-pointer"
                              title="Edit balance"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )}

                      {/* City Level Summary Row */}
                      <tr className="bg-rose-100/70 dark:bg-rose-950/50 font-bold text-rose-950 dark:text-rose-100">
                        <td className="py-2.5 px-6 pl-10">City Level</td>
                        <td className="py-2.5 px-6 text-right font-mono">{formatINR(opex.cityLevel.openingBalance)}</td>
                        <td className="py-2.5 px-6 text-right font-mono">{formatINR(opex.cityLevel.todayInflows)}</td>
                        <td className="py-2.5 px-6 text-right font-mono">{formatINR(opex.cityLevel.todayOutflows)}</td>
                        <td className="py-2.5 px-6 text-right font-mono font-extrabold">{formatINR(opex.cityLevel.closingBalance)}</td>
                        <td className="py-2.5 px-4 text-center"></td>
                      </tr>

                      {/* Opex Sub-Branches */}
                      {opex.cityLevel.branches.map((b) => (
                        <tr key={b._id || b.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-2 px-6 pl-16 text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white font-mono">{b.code || b.bankCode}</span>
                              <span className="text-slate-400">({b.bankName} - ****{b.accountNumberLast3 || '***'})</span>
                            </div>
                          </td>
                          <td className="py-2 px-6 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{formatINR(b.openingBalance)}</td>
                          <td className="py-2 px-6 text-right font-mono text-xs text-slate-500">{formatINR(b.todayInflows)}</td>
                          <td className="py-2 px-6 text-right font-mono text-xs text-slate-500">{formatINR(b.todayOutflows)}</td>
                          <td className="py-2 px-6 text-right font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{formatINR(b.closingBalance)}</td>
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={() => handleOpenEdit(b, b.code || b.bankName)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition cursor-pointer"
                              title="Edit balance"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Opex Total Footer */}
                      <tr className="bg-rose-200/60 dark:bg-rose-900/60 font-bold text-rose-950 dark:text-rose-100 border-b border-rose-300">
                        <td className="py-3 px-6 pl-8 font-extrabold">Opex Total</td>
                        <td className="py-3 px-6 text-right font-mono">{formatINR(opex.total.openingBalance)}</td>
                        <td className="py-3 px-6 text-right font-mono text-emerald-700 dark:text-emerald-300">+{formatINR(opex.total.todayInflows)}</td>
                        <td className="py-3 px-6 text-right font-mono">{formatINR(opex.total.todayOutflows)}</td>
                        <td className="py-3 px-6 text-right font-mono font-extrabold">{formatINR(opex.total.closingBalance)}</td>
                        <td className="py-3 px-4 text-center"></td>
                      </tr>
                    </>
                  )}
                </>
              )}

              {/* 4. CC A/C USAGE (Bright Green Bar) */}
              {(selectedDivision === 'ALL' || selectedDivision === 'CC A/c Usage') && ccAccount && (
                <tr className="bg-lime-200 dark:bg-lime-900/50 font-bold text-lime-950 dark:text-lime-100 border-t border-b border-lime-300">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold">CC A/c Usage</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-300 dark:bg-lime-800 font-mono">****8860</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right font-mono text-rose-700 dark:text-rose-300 font-bold">{formatINR(ccAccount.openingBalance)}</td>
                  <td className="py-3 px-6 text-right font-mono">{formatINR(ccAccount.todayInflows)}</td>
                  <td className="py-3 px-6 text-right font-mono">{formatINR(ccAccount.todayOutflows)}</td>
                  <td className="py-3 px-6 text-right font-mono text-rose-700 dark:text-rose-300 font-extrabold">{formatINR(ccAccount.closingBalance)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenEdit(ccAccount, 'CC A/c Usage')}
                      className="p-1 hover:bg-lime-300 dark:hover:bg-lime-800 rounded text-lime-900 dark:text-lime-100 transition cursor-pointer"
                      title="Edit balance"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )}

              {/* 5. INVESTMENTS (Purple / Plum Bar) */}
              {(selectedDivision === 'ALL' || selectedDivision === 'Investments') && investmentsAccount && (
                <tr className="bg-purple-200 dark:bg-purple-950/60 font-bold text-purple-950 dark:text-purple-100 border-t border-b border-purple-300">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold">Investments</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-300 dark:bg-purple-800 font-mono">****9900</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right font-mono">{formatINR(investmentsAccount.openingBalance)}</td>
                  <td className="py-3 px-6 text-right font-mono text-emerald-700 dark:text-emerald-300 font-bold">+{formatINR(investmentsAccount.todayInflows)}</td>
                  <td className="py-3 px-6 text-right font-mono">{formatINR(investmentsAccount.todayOutflows)}</td>
                  <td className="py-3 px-6 text-right font-mono font-extrabold">{formatINR(investmentsAccount.closingBalance)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenEdit(investmentsAccount, 'Investments')}
                      className="p-1 hover:bg-purple-300 dark:hover:bg-purple-800 rounded text-purple-900 dark:text-purple-100 transition cursor-pointer"
                      title="Edit balance"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )}

              {/* 6. GRAND TOTAL WITH INVESTMENTS */}
              {selectedDivision === 'ALL' && grandTotal && (
                <tr className="bg-slate-950 text-white font-extrabold border-t-2 border-slate-700">
                  <td className="py-4 px-6 uppercase tracking-wider text-xs">Grand Total (Operating + Investments)</td>
                  <td className="py-4 px-6 text-right font-mono text-slate-300">{formatINR(grandTotal.openingBalance)}</td>
                  <td className="py-4 px-6 text-right font-mono text-emerald-400">+{formatINR(grandTotal.todayInflows)}</td>
                  <td className="py-4 px-6 text-right font-mono text-rose-400">-{formatINR(grandTotal.todayOutflows)}</td>
                  <td className="py-4 px-6 text-right font-mono text-emerald-300 text-base">{formatINR(grandTotal.closingBalance)}</td>
                  <td className="py-4 px-4 text-center"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Privacy Notice */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold">Bank-Grade Data Privacy & Statement Security: </span>
          <span>
            Bank account statements uploaded to Danzo are processed purely in ephemeral volatile memory. Only the last 3 digits of account numbers are used for identification and matching. Raw statements and sensitive customer PII are instantly purged and never stored on persistent storage disks.
          </span>
        </div>
      </div>

      {/* Quick Edit Balance Modal */}
      {editModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Update Account Balance
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {editingAccount.displayTitle || editingAccount.code}
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
                  Deposits / Inflow (₹)
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
                  Withdrawals / Outflow (₹)
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
                <span className="text-slate-500">Computed Closing Balance: </span>
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

      {/* Upload Statement Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Upload Bank Statement
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  disabled
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Target Account (Optional)
                </label>
                <select
                  value={uploadTargetId}
                  onChange={(e) => setUploadTargetId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">✨ Auto-Detect (from statement last 3 digits / name)</option>
                  {(hierarchyData?.rawAccounts || []).map((b) => (
                    <option key={b._id} value={b._id}>
                      [{b.code || b.bankCode}] {b.bankName} — A/C {b.maskedAccountNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Statement File (.xlsx, .xls, .csv, .pdf) *
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/50 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">🔒 Ephemeral Zero-Retention Security</p>
                <p className="text-blue-600 dark:text-blue-400">
                  File is scanned in memory, account numbers are matched strictly by the last 3 digits, and the raw file is deleted immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingStatement || !uploadFile}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${uploadingStatement ? 'animate-bounce' : ''}`} />
                  <span>{uploadingStatement ? 'Processing...' : 'Upload & Reconcile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCashPosition;
