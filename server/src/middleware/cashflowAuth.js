import jwt from 'jsonwebtoken';
import CashFlowAuditLog from '../models/CashFlowAuditLog.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'danzo_super_secret_jwt_key_7_days_2026';
const getCashFlowPassword = () => process.env.CASHFLOW_ACCESS_PASSWORD || 'danzo-cfo-2026';

/**
 * Generate a dedicated, cryptographically signed CashFlow Gate Token (12-hour session)
 */
export const generateCashFlowToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      scope: 'CASHFLOW_CFO_ACCESS'
    },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
};

/**
 * Verify CashFlow Password against server environment variable
 */
export const verifyCashFlowPassword = (inputPassword) => {
  if (!inputPassword || typeof inputPassword !== 'string') return false;
  return inputPassword.trim() === getCashFlowPassword().trim();
};

/**
 * Middleware: Enforces Admin Role + Valid CashFlow Session Gate Token
 */
export const requireCashFlowAuth = async (req, res, next) => {
  // 1. Verify basic user authentication
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 2. Strict Admin Role Enforcement on Server
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      error: 'Access Denied. Only workspace administrators are authorized to access the Cash Flow and Treasury module.'
    });
  }

  // 3. Verify CashFlow Gate Token
  const cashFlowToken = req.headers['x-cashflow-token'];
  if (!cashFlowToken) {
    return res.status(403).json({
      code: 'CASHFLOW_LOCKED',
      error: 'Cash Flow module is locked. Please enter your CFO access password to continue.'
    });
  }

  try {
    const decoded = jwt.verify(cashFlowToken, getJwtSecret());
    if (decoded.scope !== 'CASHFLOW_CFO_ACCESS' || String(decoded.userId) !== String(req.user._id)) {
      return res.status(403).json({
        code: 'CASHFLOW_LOCKED',
        error: 'Cash Flow session is invalid or belongs to another user. Please re-authenticate.'
      });
    }

    req.cashFlowSession = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      code: 'CASHFLOW_LOCKED',
      error: 'Cash Flow session has expired. Please enter the CFO password to re-unlock.'
    });
  }
};

/**
 * Helper to record audit events
 */
export const logCashFlowAudit = async (req, action, details = {}) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    await CashFlowAuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email || 'unknown',
      action,
      details,
      ipAddress: String(ip).split(',')[0].trim(),
      userAgent
    });
  } catch (err) {
    console.warn('⚠️ CashFlow audit logging notice:', err.message);
  }
};
