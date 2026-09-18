import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import cashFlowService from '../../services/cashFlowService';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Building2,
  Calendar,
  X,
  Sparkles,
  ArrowRight,
  Info,
  Files,
  Trash2,
  Plus
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

export const UploadBankData = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultBankCode = searchParams.get('bankCode') || '';

  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await cashFlowService.getBankAccounts();
        if (res?.success && res.data.length > 0) {
          setBankAccounts(res.data);
          if (defaultBankCode) {
            const found = res.data.find(b => b.bankCode === defaultBankCode || b.code === defaultBankCode);
            if (found) setSelectedBankId(found._id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    };
    fetchAccounts();
  }, [defaultBankCode]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendValidatedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      appendValidatedFiles(Array.from(e.target.files));
    }
  };

  const appendValidatedFiles = (newFiles) => {
    const validExtensions = ['.xlsx', '.xls', '.csv', '.pdf'];
    const addedFiles = [];
    let skippedInvalid = 0;
    let skippedSize = 0;

    newFiles.forEach((file) => {
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));

      if (!isValid) {
        skippedInvalid++;
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        skippedSize++;
        return;
      }

      // Check duplicate in current queue
      const exists = files.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        addedFiles.push(file);
      }
    });

    if (skippedInvalid > 0) {
      toast.error(`${skippedInvalid} file(s) skipped. Only .xlsx, .xls, .csv, and .pdf are supported.`);
    }
    if (skippedSize > 0) {
      toast.error(`${skippedSize} file(s) skipped exceeding 10MB limit.`);
    }

    if (addedFiles.length > 0) {
      setFiles((prev) => {
        const combined = [...prev, ...addedFiles];
        if (combined.length > 30) {
          toast.error('Maximum 30 files per batch upload.');
          return combined.slice(0, 30);
        }
        return combined;
      });
      setUploadResult(null);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTotalSizeKB = () => {
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    return (totalBytes / 1024).toFixed(1);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Please select statement file(s) to upload.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append('statement', file);
      });

      if (selectedBankId) {
        formData.append('accountId', selectedBankId);
        formData.append('bankId', selectedBankId);
      }
      formData.append('statementDate', statementDate);
      formData.append('date', statementDate);

      const res = await cashFlowService.uploadStatement(formData);
      if (res?.success) {
        setUploadResult(res.data);
        if (res.data?.isBatch) {
          toast.success(`Processed ${res.data.successCount}/${res.data.totalFiles} statements successfully!`, {
            duration: 5000
          });
        } else {
          toast.success(`Statement processed for [${res.data.accountCode || 'Account'}]! Balances updated.`, {
            duration: 4000
          });
        }
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to process statements');
    } finally {
      setUploading(false);
    }
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const headers = ['Date', 'Description', 'Type', 'Amount', 'Reference', 'Counterparty', 'Category'];
    const sampleRows = [
      ['2026-09-11', 'Enterprise Software Retainer Q3', 'CREDIT', '250000', 'REF990182', 'Acro Corp', 'Customer Receipts'],
      ['2026-09-11', 'AWS Production Cloud Services', 'DEBIT', '42000', 'INV881029', 'Amazon Web Services', 'Office & Rent Expenses'],
      ['2026-09-10', 'Engineering Team Monthly Stipend', 'DEBIT', '180000', 'SAL202609', 'Danzo Engineering', 'Payroll & Salaries'],
      ['2026-09-09', 'GST Monthly Settlement Challan', 'DEBIT', '65000', 'GST991028', 'GST Department', 'Statutory & Tax (GST/TDS)']
    ];

    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'danzo_statement_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample statement template downloaded');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Privacy & Zero-Retention Security Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
            Zero Raw-File Retention Guarantee
          </h4>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
            All uploaded statement files (.xlsx, .csv, .pdf) are processed securely in-memory. Normalized transaction records are stored in MongoDB with SHA-256 hash deduplication, and the temporary raw files are <strong>immediately purged</strong> from system disks.
          </p>
        </div>
      </div>

      {/* Upload Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Bank Statement Ingestion
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select destination account or use Auto-Detect for single / bulk batch statement ingestion
            </p>
          </div>

          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Bank & Date selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">
                Destination Bank Account *
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full py-2.5 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">✨ Auto-Detect Account (Recommended for Bulk / Multi-Branch)</option>
                {bankAccounts.map((b) => (
                  <option key={b._id} value={b._id}>
                    [{b.code || b.bankCode}] {b.bankName} — A/C {b.maskedAccountNumber} ({formatINR(b.closingBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">
                Statement Reconcile Date *
              </label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full py-2.5 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Statement Document(s) (.xlsx, .xls, .csv, .pdf) *
              </label>
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Clear All ({files.length})
                </button>
              )}
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {files.length > 0 ? (
                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 text-left">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Files className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {files.length} {files.length === 1 ? 'file' : 'files'} selected ({getTotalSizeKB()} KB total)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ready for auto-detection and sequential ingestion
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add More Files</span>
                    </button>
                  </div>

                  {/* File List Chips */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-left">
                    {files.map((f, idx) => (
                      <div
                        key={`${f.name}-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {f.name}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drag & drop single / bulk statement files here
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Supports selecting multiple Excel (.xlsx, .xls), CSV, and PDF e-Statements up to 30 files per batch
                  </p>
                </div>
              )}
            </div>

            {/* File Size & Memory Optimization Note */}
            <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Statement Size & Bulk Ingestion Guidelines (Render 512MB RAM Optimized):
                </p>
                <ul className="list-disc list-inside text-amber-800/90 dark:text-amber-300/90 space-y-0.5">
                  <li><strong>Bulk Multi-File Upload:</strong> You can select/drop multiple individual files (e.g. 12 files at 5KB–10MB each, up to 30 files per batch). The server processes them sequentially in memory so RAM usage stays negligible.</li>
                  <li><strong>Auto-Detection:</strong> With Auto-Detect selected, the engine matches each file to its corresponding branch/account by account suffix (e.g. 565, 603, 607, 355) or file name automatically.</li>
                  <li><strong>Single File Size:</strong> Max 10MB per individual file. Zip archives are not supported—simply select and drop all statement files directly!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={files.length === 0 || uploading}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {files.length > 1
                      ? `Processing ${files.length} Statements in Batch...`
                      : 'Parsing & Ingesting Statement...'}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {files.length > 1
                      ? `Process All ${files.length} Statements`
                      : 'Process Bank Statement'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Upload Results Feedback Card */}
      {uploadResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {uploadResult.isBatch
                  ? `Batch Ingestion Summary (${uploadResult.successCount}/${uploadResult.totalFiles} Completed)`
                  : 'Statement Ingestion Summary'}
              </h3>
            </div>

            <button
              onClick={() => navigate('/cashflow/transactions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>View in Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-400 font-medium">Files Ingested</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {uploadResult.isBatch ? `${uploadResult.successCount} of ${uploadResult.totalFiles}` : '1 File'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-400 font-medium">New Added</div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {uploadResult.isBatch ? uploadResult.totalInserted : uploadResult.insertedCount} txs
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-400 font-medium">Deduplicated</div>
              <div className="text-base font-extrabold text-slate-600 dark:text-slate-300 mt-0.5">
                {uploadResult.isBatch ? (uploadResult.totalDuplicates || 0) : (uploadResult.duplicatesSkipped || 0)} skipped
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-slate-400 font-medium">
                {uploadResult.isBatch ? 'Status' : 'New Closing Balance'}
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 font-mono">
                {uploadResult.isBatch
                  ? (uploadResult.failureCount === 0 ? '100% Succeeded' : `${uploadResult.failureCount} Failed`)
                  : formatINR(uploadResult.updatedClosingBalance)}
              </div>
            </div>
          </div>

          {/* Itemized Batch Breakdown Table */}
          {uploadResult.isBatch && uploadResult.results?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Itemized Ingestion Breakdown:
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs border border-slate-200 dark:border-slate-800 rounded-xl">
                {uploadResult.results.map((r, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {r.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Matched: <span className="font-semibold text-emerald-600 dark:text-emerald-400">[{r.accountCode || 'N/A'}] {r.bankName || ''}</span> • {r.date}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{r.insertedCount || 0} txs
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Bal: {formatINR(r.updatedClosingBalance)}
                      </div>
                    </div>
                  </div>
                ))}

                {uploadResult.errors?.map((err, idx) => (
                  <div key={`err-${idx}`} className="p-3 flex items-center justify-between gap-3 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{err.filename}</div>
                      <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80">{err.error}</div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 shrink-0">
                      Failed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadBankData;
