import api from './api';

const TOKEN_KEY = 'cashflow_token';

export const cashFlowService = {
  // Gate Security
  getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  },

  setToken(token, remember = false) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    sessionStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  isUnlocked() {
    return Boolean(this.getToken());
  },

  async unlock(password, remember = false) {
    const { data } = await api.post('/cashflow/unlock', { password });
    if (data?.token) {
      this.setToken(data.token, remember);
    }
    return data;
  },

  // Overview & Analytics
  async getOverview() {
    const { data } = await api.get('/cashflow/overview');
    return data;
  },

  // Bank Accounts
  async getBankAccounts() {
    const { data } = await api.get('/cashflow/accounts');
    return data;
  },

  // Daily Position & Variance
  async getDailyPosition(date) {
    const params = date ? { date } : {};
    const { data } = await api.get('/cashflow/daily-position', { params });
    return data;
  },

  // Transactions
  async getTransactions(params = {}) {
    const { data } = await api.get('/cashflow/transactions', { params });
    return data;
  },

  // Manual Transaction Creation
  async createManualTransaction(txData) {
    const { data } = await api.post('/cashflow/transactions', txData);
    return data;
  },

  // Update Transaction
  async updateTransaction(id, txData) {
    const { data } = await api.put(`/cashflow/transactions/${id}`, txData);
    return data;
  },

  // Delete Transaction
  async deleteTransaction(id) {
    const { data } = await api.delete(`/cashflow/transactions/${id}`);
    return data;
  },

  // Clean Zero Reset
  async resetData() {
    const { data } = await api.post('/cashflow/reset-data');
    return data;
  },

  // Statement Upload
  async uploadStatement(formData) {
    const { data } = await api.post('/cashflow/upload-statement', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },

  // Daily Printable / Export Report
  async getDailyReport(date, bankId) {
    const params = {};
    if (date) params.date = date;
    if (bankId && bankId !== 'ALL') params.bankId = bankId;
    const { data } = await api.get('/cashflow/report/daily', { params });
    return data;
  },

  // Hierarchical Multi-Bank Structure (Capex, Opex, CC, Investments)
  async getHierarchyReport(date) {
    const params = date ? { date } : {};
    const { data } = await api.get('/cashflow/hierarchy', { params });
    return data;
  },

  // Quick Balance Update
  async updateAccountBalance(payload) {
    const { data } = await api.put('/cashflow/account-balance', payload);
    return data;
  },

  // Excel Binary File Download
  async downloadHierarchyExcel(date, division = 'ALL') {
    const params = { date, division };
    const response = await api.get('/cashflow/export/excel', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};

export default cashFlowService;
