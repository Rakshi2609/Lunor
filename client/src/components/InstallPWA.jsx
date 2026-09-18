import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Smartphone,
  X,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstallPWA() {
  const [promptInstall, setPromptInstall] = useState(() => window.deferredPrompt || null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [platform, setPlatform] = useState('android'); // 'ios' | 'android' | 'desktop'

  useEffect(() => {
    // 1. Detect if already running in standalone PWA mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    ) {
      setIsInstalled(true);
    }

    // 2. Detect OS / Platform
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else setPlatform('desktop');

    // 3. Listen for deferred prompt events
    const handler = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setPromptInstall(e);
    };

    const customHandler = (e) => {
      if (e.detail) {
        setPromptInstall(e.detail);
      }
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setPromptInstall(null);
      window.deferredPrompt = null;
      setShowGuideModal(false);
      toast.success('Danzo installed on your device successfully!', {
        duration: 4000
      });
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('danzo:pwa-prompt-ready', customHandler);
    window.addEventListener('appinstalled', installedHandler);

    // If global already had it
    if (window.deferredPrompt && !promptInstall) {
      setPromptInstall(window.deferredPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('danzo:pwa-prompt-ready', customHandler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async (e) => {
    if (e) e.preventDefault();

    const activePrompt = promptInstall || window.deferredPrompt;

    if (activePrompt) {
      try {
        activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          toast.success('Installing Danzo to your home screen...');
          setPromptInstall(null);
          window.deferredPrompt = null;
          return;
        }
      } catch (err) {
        console.warn('Native prompt error, opening mobile install guide:', err);
      }
    }

    // If native prompt is not directly available (e.g. iOS Safari, Chrome on iOS, or browser restrictions)
    setShowGuideModal(true);
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm border transition-all cursor-pointer bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:border-neutral-200 dark:hover:bg-neutral-100 active:scale-95"
        onClick={handleInstallClick}
        title="Install Danzo as App"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
        <span>Install App</span>
      </motion.button>

      {/* Mobile Install Instructions Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 border-t sm:border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 font-bold text-xl">
                  D
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Install Danzo App
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Fast • Offline Ready • Zero App Store Downloads
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
                Add Danzo directly to your mobile home screen for instantaneous loading, full-screen workspace view, and offline task support.
              </p>

              {/* iOS Instructions */}
              {platform === 'ios' && (
                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 text-xs">
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>How to Install on iPhone / iPad (Safari)</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">
                      Tap the <strong className="text-neutral-900 dark:text-white inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded"><Share className="w-3 h-3 text-blue-500" /> Share</strong> button in your Safari bottom toolbar.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">
                      Scroll down the share sheet and tap <strong className="text-neutral-900 dark:text-white inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded"><PlusSquare className="w-3 h-3 text-emerald-500" /> Add to Home Screen</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">
                      Tap <strong className="text-neutral-900 dark:text-white">Add</strong> in the top-right corner to place Danzo on your home screen!
                    </div>
                  </div>
                </div>
              )}

              {/* Android Instructions */}
              {platform === 'android' && (
                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 text-xs">
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>How to Install on Android (Chrome / Samsung)</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">
                      Tap the <strong className="text-neutral-900 dark:text-white inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded"><MoreVertical className="w-3 h-3 text-slate-700 dark:text-slate-200" /> Three Dots Menu (⋮)</strong> in top-right of your browser.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">
                      Select <strong className="text-neutral-900 dark:text-white">"Install app"</strong> or <strong className="text-neutral-900 dark:text-white">"Add to Home screen"</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">
                      Confirm by tapping <strong className="text-emerald-600 dark:text-emerald-400">Install</strong>. The Danzo icon will be added to your app drawer & home screen!
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop fallback */}
              {platform === 'desktop' && (
                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 text-xs">
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Install via Browser Address Bar</span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    Look for the <strong>Install Danzo</strong> icon located in the right side of your Chrome, Edge, or Brave address bar to install as a standalone desktop app.
                  </p>
                </div>
              )}

              {/* Action */}
              <div className="mt-6 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
