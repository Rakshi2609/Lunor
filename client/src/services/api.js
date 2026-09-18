import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000
});

// Request interceptor: Add JWT auth token & Cash Flow gate token
api.interceptors.request.use(async (config) => {
  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    config.headers.Authorization = `Bearer ${storedToken}`;
  }
  const cashFlowToken = sessionStorage.getItem('cashflow_token') || localStorage.getItem('cashflow_token');
  if (cashFlowToken) {
    config.headers['x-cashflow-token'] = cashFlowToken;
  }
  return config;
});

// Response interceptor: Handle 401 unauthenticated
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?.url?.includes('/auth/login') && !originalRequest?.url?.includes('/auth/me')) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
