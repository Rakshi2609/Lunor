import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User.js';
import OtpVerification from '../models/OtpVerification.js';
import { sendOtpEmail } from '../utils/emailSummary.js';

const JWT_SECRET = process.env.JWT_SECRET || 'danzo_super_secret_jwt_key_7_days_2026';

/**
 * Step 1: Send 6-digit OTP to user's email via Google AppScript
 */
export const sendOtp = async (req, res) => {
  try {
    let { email, displayName, photoURL, googleId, credential, idToken, accessToken } = req.body;

    // Check if Google ID token / credential is provided
    const googleToken = credential || idToken;
    if (googleToken) {
      try {
        const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`, { timeout: 5000 });
        if (googleRes.data?.email) {
          email = googleRes.data.email;
          displayName = displayName || googleRes.data.name;
          photoURL = photoURL || googleRes.data.picture;
          googleId = googleRes.data.sub;
        }
      } catch (googleErr) {
        console.warn('⚠️ Google tokeninfo check notice:', googleErr.message);
      }
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    email = email.trim().toLowerCase();

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing active OTP for this email
    await OtpVerification.deleteMany({ email });

    // Store new OTP in MongoDB (auto-expires in 10 mins)
    await OtpVerification.create({
      email,
      otp,
      displayName: displayName || '',
      photoURL: photoURL || '',
      googleId: googleId || '',
      attempts: 0,
    });

    // Send email via Google AppScript
    await sendOtpEmail(email, otp, displayName);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}`,
      email
    });
  } catch (error) {
    console.error('❌ sendOtp error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch verification code' });
  }
};

/**
 * Step 2: Verify 6-digit OTP and issue 7-day persistent JWT session
 */
export const verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    email = email.trim().toLowerCase();
    otp = otp.toString().trim();

    // Find active OTP record
    const otpRecord = await OtpVerification.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        error: 'Verification code has expired or was not requested. Please request a new code.'
      });
    }

    if (otpRecord.attempts >= 5) {
      await OtpVerification.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        error: 'Too many incorrect attempts. Please request a fresh verification code.'
      });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({
        error: `Incorrect verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      });
    }

    // OTP is valid! Delete used OTP record
    await OtpVerification.deleteOne({ _id: otpRecord._id });

    // Find or create User in MongoDB
    let user = await User.findOne({ email });
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!user) {
      console.log('🟣 Backend Auth: Creating new verified user for:', email);
      user = await User.create({
        googleId: otpRecord.googleId || `user_${Date.now()}`,
        email,
        displayName: otpRecord.displayName || email.split('@')[0],
        photoURL: otpRecord.photoURL || '',
        loginStreak: 1,
        longestStreak: 1,
        lastLoginDate: today,
        loginHistory: [todayStr]
      });
    } else {
      console.log('🟣 Backend Auth: User verified, updating login streak');
      if (otpRecord.googleId && !user.googleId) user.googleId = otpRecord.googleId;
      if (otpRecord.displayName && !user.displayName) user.displayName = otpRecord.displayName;
      if (otpRecord.photoURL && !user.photoURL) user.photoURL = otpRecord.photoURL;

      // Calculate and update login streak
      if (!user.loginHistory) user.loginHistory = [];
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      if (lastLogin) {
        const lastDateStr = lastLogin.toISOString().split('T')[0];
        if (lastDateStr !== todayStr) {
          const lastMidnight = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const diffDays = Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            user.loginStreak = (user.loginStreak || 0) + 1;
          } else if (diffDays > 1) {
            user.loginStreak = 1;
          }
        }
      } else {
        user.loginStreak = 1;
      }

      if (!user.loginHistory.includes(todayStr)) {
        user.loginHistory.push(todayStr);
      }

      if ((user.loginStreak || 1) > (user.longestStreak || 1)) {
        user.longestStreak = user.loginStreak;
      }

      user.lastLoginDate = today;
      await user.save();
    }

    // Generate 7-day JWT token
    const jwtToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User ${email} verified successfully with OTP. Issued 7-day JWT.`);

    res.json({
      success: true,
      user,
      token: jwtToken,
      expiresIn: '7d'
    });
  } catch (error) {
    console.error('❌ verifyOtp error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify code' });
  }
};

/**
 * Direct Login endpoint (Strict Google OAuth Token Verification)
 */
export const login = async (req, res) => {
  try {
    const { credential, idToken, token, accessToken } = req.body;

    const googleToken = credential || idToken || (token && !token.startsWith('user_') && !token.startsWith('mock_') ? token : null);

    let verifiedEmail = null;
    let verifiedDisplayName = null;
    let verifiedPhotoURL = null;
    let verifiedGoogleId = null;

    if (googleToken) {
      try {
        const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`, { timeout: 5000 });
        if (googleRes.data?.email) {
          verifiedEmail = googleRes.data.email;
          verifiedDisplayName = googleRes.data.name;
          verifiedPhotoURL = googleRes.data.picture;
          verifiedGoogleId = googleRes.data.sub;
        }
      } catch (googleErr) {
        console.warn('⚠️ Google tokeninfo check failed:', googleErr.message);
      }
    } else if (accessToken) {
      try {
        const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000
        });
        if (googleRes.data?.email) {
          verifiedEmail = googleRes.data.email;
          verifiedDisplayName = googleRes.data.name;
          verifiedPhotoURL = googleRes.data.picture;
          verifiedGoogleId = googleRes.data.sub;
        }
      } catch (googleErr) {
        console.warn('⚠️ Google userinfo check failed:', googleErr.message);
      }
    }

    // Security Gate: Disallow unverified/passwordless email login without valid OAuth token
    if (!verifiedEmail) {
      return res.status(401).json({
        error: 'Authentication failed: A verified Google OAuth token is required. For passwordless email login, please use the OTP verification flow.'
      });
    }

    const email = verifiedEmail.trim().toLowerCase();
    const displayName = verifiedDisplayName || email.split('@')[0];
    const photoURL = verifiedPhotoURL || '';
    const googleId = verifiedGoogleId;

    let user = null;
    if (googleId) {
      user = await User.findOne({ googleId });
    }
    if (!user && email) {
      user = await User.findOne({ email });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!user) {
      user = await User.create({
        googleId: googleId || `google_${Date.now()}`,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || '',
        loginStreak: 1,
        longestStreak: 1,
        lastLoginDate: today,
        loginHistory: [todayStr]
      });
    } else {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;

      if (!user.loginHistory) user.loginHistory = [];
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      if (lastLogin) {
        const lastDateStr = lastLogin.toISOString().split('T')[0];
        if (lastDateStr !== todayStr) {
          const lastMidnight = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const diffDays = Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            user.loginStreak = (user.loginStreak || 0) + 1;
          } else if (diffDays > 1) {
            user.loginStreak = 1;
          }
        }
      } else {
        user.loginStreak = 1;
      }

      if (!user.loginHistory.includes(todayStr)) {
        user.loginHistory.push(todayStr);
      }

      if ((user.loginStreak || 1) > (user.longestStreak || 1)) {
        user.longestStreak = user.loginStreak;
      }

      user.lastLoginDate = today;
      await user.save();
    }

    const jwtToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user,
      token: jwtToken,
      expiresIn: '7d'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
