import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Load and refresh user from stored session token
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.warn('Session verification failed, clearing session:', error.message);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const loginUser = (userData, token) => {
    if (token) {
      localStorage.setItem('token', token);
    }
    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // Step 1: Send OTP to user's email
  const sendOtp = async (payload) => {
    try {
      const { data } = await api.post('/auth/send-otp', payload);
      return data;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  };

  // Step 2: Verify OTP code and log in
  const verifyOtp = async (payload) => {
    try {
      const { data } = await api.post('/auth/verify-otp', payload);
      if (data?.token && data?.user) {
        loginUser(data.user, data.token);
        return data.user;
      }
      throw new Error('Invalid verification response from server');
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  };

  // Google / OAuth direct login fallback
  const loginWithGoogle = async (authPayload) => {
    try {
      const { data } = await api.post('/auth/login', authPayload);
      if (data?.token && data?.user) {
        loginUser(data.user, data.token);
        return data.user;
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Google OAuth Login error:', error);
      throw error;
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    loginUser,
    sendOtp,
    verifyOtp,
    loginWithGoogle,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
