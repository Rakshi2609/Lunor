import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCashFlow } from '../../contexts/CashFlowContext';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  ReceiptText,
  UploadCloud,
  FileSpreadsheet,
  Lock,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CashFlowLayout = ({ children }) => {
  const { lock } = useCashFlow();
  const location = useLocation();

  const handleLock = () => {
    lock();
    toast.success('Cash Flow session locked');
  };

  const navTabs = [
    { to: '/cashflow', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/cashflow/accounts', label: 'Bank Accounts', icon: Building2 },
    { to: '/cashflow/daily-position', label: 'Daily Position', icon: TrendingUp },
    { to: '/cashflow/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/cashflow/upload', label: 'Upload Data', icon: UploadCloud },
    { to: '/cashflow/reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Module Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Cash Flow & Bank Position
              </h1>
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                INR (₹)
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Multi-bank liquidity management, daily variance forecasting, and automated statement ingestion
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>CFO Gate: Active (12h)</span>
            </div>
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
              title="Lock Cash Flow Session"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Module</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact 
              ? location.pathname === tab.to 
              : location.pathname.startsWith(tab.to) && (tab.to !== '/cashflow' || location.pathname === '/cashflow');

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default CashFlowLayout;
