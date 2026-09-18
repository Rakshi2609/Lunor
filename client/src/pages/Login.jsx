import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Sun,
  Moon,
  ArrowRight,
  Layers,
  Users,
  Repeat,
  Mail,
  KeyRound,
  RefreshCw,
  Edit3
} from 'lucide-react';

export default function Login() {
  const { user, sendOtp, verifyOtp, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Step 1: 'email' | Step 2: 'otp'
  const [authStep, setAuthStep] = useState('email');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputRef = useRef(null);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Resend Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus OTP input when entering OTP step
  useEffect(() => {
    if (authStep === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [authStep]);

  // Google Sign-In with OAuth2 Token Client (Always-working popup)
  const handleGoogleSignIn = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '970495410286-2rjuge880ong5d50uh8rf7oh14a52prt.apps.googleusercontent.com';
    
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              console.error('Google OAuth token error:', tokenResponse);
              toast.error(tokenResponse.error_description || 'Google sign-in was cancelled');
              return;
            }
            if (tokenResponse?.access_token) {
              try {
                setIsSubmitting(true);
                const loggedInUser = await loginWithGoogle({ accessToken: tokenResponse.access_token });
                toast.success(`Welcome back, ${loggedInUser.displayName || 'Friend'}!`);
                navigate('/dashboard');
              } catch (err) {
                console.error('Google token login error:', err);
                toast.error(err.response?.data?.error || 'Google authentication failed');
              } finally {
                setIsSubmitting(false);
              }
            }
          }
        });
        client.requestAccessToken();
      } catch (err) {
        console.error('Failed to launch Google OAuth popup:', err);
        if (window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        }
      }
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast.error('Google Sign-In is loading, please try again in a moment');
    }
  };

  // Initialize Google One-Tap in background if available
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '970495410286-2rjuge880ong5d50uh8rf7oh14a52prt.apps.googleusercontent.com';
    if (!googleClientId || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (response?.credential) {
            try {
              setIsSubmitting(true);
              const loggedInUser = await loginWithGoogle({ credential: response.credential });
              toast.success(`Welcome back, ${loggedInUser.displayName || 'Friend'}!`);
              navigate('/dashboard');
            } catch (err) {
              console.error('Google login error:', err);
              toast.error(err.response?.data?.error || 'Google authentication failed');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      });
    } catch (e) {
      console.warn('Google Identity initialization notice:', e);
    }
  }, [loginWithGoogle, navigate]);

  // Step 1 Submit: Dispatch OTP to email
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendOtp({
        email: cleanEmail,
        displayName: displayName.trim() || cleanEmail.split('@')[0]
      });
      setAuthStep('otp');
      setCountdown(30);
      toast.success(`Verification code sent to ${cleanEmail}`);
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Submit: Verify OTP code
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length < 6) {
      toast.error('Please enter the 6-digit code sent to your email');
      return;
    }

    try {
      setIsSubmitting(true);
      const verifiedUser = await verifyOtp({
        email: email.trim().toLowerCase(),
        otp: cleanOtp
      });
      toast.success(`Welcome to Danzo, ${verifiedUser.displayName || 'Friend'}!`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error(error.response?.data?.error || error.message || 'Invalid verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (countdown > 0 || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await sendOtp({
        email: email.trim().toLowerCase(),
        displayName: displayName.trim()
      });
      setCountdown(30);
      toast.success('Fresh verification code sent to your email!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const featureHighlights = [
    {
      icon: Zap,
      title: 'Real-Time Sync',
      desc: 'Seamless state updates across all connected devices.'
    },
    {
      icon: Repeat,
      title: 'Automated Routines',
      desc: 'Scheduled recurring triggers with Sunday skip protection.'
    },
    {
      icon: Users,
      title: 'Delegation & Follow-Ups',
      desc: 'Track assignments and monitor workflow progress directly.'
    }
  ];

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
      isDark ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-950'
    }`}>
      {/* Top Navigation Bar */}
      <header className={`w-full border-b px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 ${
        isDark ? 'bg-neutral-950/80 border-neutral-900' : 'bg-white/80 border-neutral-200'
      }`}>
        <Link
          to="/"
          className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            isDark
              ? 'border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900'
              : 'border-neutral-200 text-neutral-700 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border text-sm transition-all cursor-pointer ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'
                : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Sign In Card Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 flex flex-col justify-center max-w-md mx-auto w-full"
          >
            <div className={`p-7 sm:p-9 rounded-2xl border shadow-xl transition-all ${
              isDark
                ? 'bg-neutral-900/90 border-neutral-800 backdrop-blur-xl shadow-black/40'
                : 'bg-white border-neutral-200 shadow-neutral-200/50'
            }`}>
              {/* Brand Logo & Pill */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-extrabold text-sm tracking-tighter shadow-sm">
                    DANZO
                  </div>
                  <span className="font-bold text-xl tracking-tight text-neutral-950 dark:text-white">
                    Danzo
                  </span>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>7-Day Session</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                  {authStep === 'email' ? 'Sign in to workspace' : 'Enter verification code'}
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {authStep === 'email'
                    ? 'Enter your email to receive a secure one-time verification code.'
                    : `We sent a 6-digit code to ${email}. Check your inbox or spam.`}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {authStep === 'email' ? (
                  <div className="space-y-4">
                    {/* Google Sign In button */}
                    <motion.button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 border transition-all cursor-pointer shadow-sm ${
                        isDark
                          ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-white'
                          : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
                      } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <FcGoogle className="w-5 h-5 shrink-0" />
                      <span>Continue with Google</span>
                    </motion.button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
                      </div>
                      <div className="relative flex justify-center text-[11px] uppercase">
                        <span className={`px-3 font-semibold tracking-wider ${
                          isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-white text-neutral-500'
                        }`}>
                          or continue with email code
                        </span>
                      </div>
                    </div>

                    <motion.form
                      key="step-email"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.25 }}
                      onSubmit={handleSendOtp}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. yourname@gmail.com"
                            className={`w-full pl-9 pr-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                              isDark
                                ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                                : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Display Name <span className="text-[10px] lowercase text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Rakshith"
                          className={`w-full px-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                            isDark
                              ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                              : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                          }`}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                          isDark
                            ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                            : 'bg-neutral-950 text-white hover:bg-neutral-800'
                        } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        <span>{isSubmitting ? 'Sending Code...' : 'Send Verification Code'}</span>
                      </motion.button>
                    </motion.form>
                  </div>
                ) : (
                  /* ================= STEP 2: OTP VERIFICATION ================= */
                  <motion.form
                    key="step-otp"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-4"
                  >
                    {/* Active Email Pill with Edit button */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                    }`}>
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold truncate">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStep('email');
                          setOtp('');
                        }}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer ml-2"
                      >
                        <Edit3 className="w-3 h-3" /> Change
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        6-Digit Security Code
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                        <input
                          ref={otpInputRef}
                          type="text"
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          autoComplete="one-time-code"
                          className={`w-full pl-9 pr-4 py-3 text-lg tracking-widest font-mono text-center rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold ${
                            isDark
                              ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600'
                              : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Resend Code Action */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Didn't receive the email?</span>
                      <button
                        type="button"
                        disabled={countdown > 0 || isSubmitting}
                        onClick={handleResendOtp}
                        className={`font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          countdown > 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-primary hover:underline'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                        <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</span>
                      </button>
                    </div>

                    {/* Verify & Enter Workspace Button */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting || otp.length < 6}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        isDark
                          ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                          : 'bg-neutral-950 text-white hover:bg-neutral-800'
                      } ${isSubmitting || otp.length < 6 ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{isSubmitting ? 'Verifying...' : 'Verify & Enter Workspace'}</span>
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Session Notice & Security Guarantee */}
              <div className={`mt-6 p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                isDark
                  ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600'
              }`}>
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-200">7-Day Persistent Auth:</span>{' '}
                  Once verified, your session stays active for 7 days without repeated sign-ins.
                </div>
              </div>

              {/* Terms Footer */}
              <p className="mt-6 text-center text-[11px] text-neutral-500 dark:text-neutral-500 leading-relaxed">
                By continuing, you agree to Danzo's Terms of Service and Privacy Policy.
              </p>
            </div>
          </motion.div>

          {/* Right / Features Preview Column (Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hidden lg:flex lg:col-span-6 flex-col gap-5 pl-4"
          >
            {/* Live Interactive Task Widget Mockup */}
            <div className={`p-6 rounded-2xl border transition-all ${
              isDark
                ? 'bg-neutral-900/60 border-neutral-800/90'
                : 'bg-white border-neutral-200 shadow-lg shadow-neutral-100'
            }`}>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Live Workspace Preview
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  Daily Sprint
                </span>
              </div>

              {/* Sample Task Items */}
              <div className="space-y-2.5 text-xs">
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium line-through text-neutral-400">Deploy Token Engine API</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    Completed
                  </span>
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">Synchronize Team Standup</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                    In Progress
                  </span>
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Repeat className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Daily Recurring Sync (1:00 AM)</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                    Automated
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {featureHighlights.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white mb-2.5">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-semibold text-xs text-neutral-950 dark:text-white mb-1">
                      {feat.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                      {feat.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className={`w-full border-t py-4 text-center text-xs ${
        isDark ? 'border-neutral-900 text-neutral-600' : 'border-neutral-200 text-neutral-400'
      }`}>
        <p>&copy; {new Date().getFullYear()} Danzo Productivity. All rights reserved.</p>
      </footer>
    </div>
  );
}
