import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import cashFlowService from '../services/cashFlowService';
import { useAuth } from './AuthContext';

const CashFlowContext = createContext();

export const CashFlowProvider = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [isUnlocked, setIsUnlocked] = useState(() => cashFlowService.isUnlocked());
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state if user changes or role is not admin
  useEffect(() => {
    if (!isAdmin) {
      setIsUnlocked(false);
      cashFlowService.clearToken();
    } else {
      setIsUnlocked(cashFlowService.isUnlocked());
    }
  }, [isAdmin, user]);

  const unlock = async (password, remember = true) => {
    try {
      setLoading(true);
      setError(null);
      await cashFlowService.unlock(password, remember);
      setIsUnlocked(true);
      setIsGateOpen(false);
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to authenticate Cash Flow access';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const lock = () => {
    cashFlowService.clearToken();
    setIsUnlocked(false);
  };

  const openGate = () => {
    setError(null);
    setIsGateOpen(true);
  };

  const closeGate = () => {
    setIsGateOpen(false);
  };

  const value = {
    isAdmin,
    isUnlocked,
    isGateOpen,
    loading,
    error,
    setError,
    unlock,
    lock,
    openGate,
    closeGate
  };

  return (
    <CashFlowContext.Provider value={value}>
      {children}
    </CashFlowContext.Provider>
  );
};

export const useCashFlow = () => {
  const context = useContext(CashFlowContext);
  if (!context) {
    throw new Error('useCashFlow must be used within CashFlowProvider');
  }
  return context;
};

export default CashFlowContext;
