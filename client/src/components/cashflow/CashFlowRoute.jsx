import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCashFlow } from '../../contexts/CashFlowContext';
import CashFlowGateModal from './CashFlowGateModal';
import { ShieldAlert, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const CashFlowRoute = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isUnlocked } = useCashFlow();
  const [isGateModalOpen, setIsGateModalOpen] = useState(!isUnlocked);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Role Authorization Check: Only Admin users can enter
  if (!user || user.role !== 'Admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Restricted CFO Access
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          The Cash Flow and Treasury Management module is strictly restricted to workspace Administrators. Please contact your organization administrator if you require access.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 transition"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  // 2. Gate Protection: If locked, show high-security unlock portal
  if (!isUnlocked) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/30">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Confidential Treasury Module
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Executive Cash Flow Gateway
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Bank account balances, liquidity positions, and transaction audit trails are encrypted behind the CFO security gate. Enter your security key to proceed.
          </p>

          <button
            onClick={() => setIsGateModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            <span>Authenticate & Unlock</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-5">
            Default Environment Key: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">CASHFLOW_ACCESS_PASSWORD</code>
          </p>
        </div>

        <CashFlowGateModal
          isOpen={isGateModalOpen}
          onClose={() => setIsGateModalOpen(false)}
        />
      </div>
    );
  }

  return children;
};

export default CashFlowRoute;
