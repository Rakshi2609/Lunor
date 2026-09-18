import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'danzo_super_secret_jwt_key_7_days_2026';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    let user = null;

    // 1. Verify 7-day signed JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.id) {
        user = await User.findById(decoded.id);
      } else if (decoded.email) {
        user = await User.findOne({ email: decoded.email });
      } else if (decoded.googleId) {
        user = await User.findOne({ googleId: decoded.googleId });
      }
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid, malformed, or expired token' });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or account deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message || error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
