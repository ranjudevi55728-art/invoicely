'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, ArrowRight, HelpCircle, AlertCircle, RefreshCw, UserCheck, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    loading, 
    error, 
    setError, 
    signInWithGoogle, 
    signInAnonymously, 
    signInWithEmail 
  } = useAuth();

  const [guestLoading, setGuestLoading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const handleGuestAccess = async () => {
    setGuestLoading(true);
    setError(null);
    try {
      // 1. Try Firebase Anonymous Sign-In first (no popups, extremely fast)
      await signInAnonymously();
    } catch (anonErr: any) {
      console.warn("Anonymous login disabled or failed, trying self-healing Guest email...", anonErr);
      
      // 2. Fall back to standard Email-based guest account (REST API based, no cookies/popups)
      const guestEmail = 'guest.developer@invoicely.io';
      const guestPass = 'GuestDevSafePass1!';
      
      try {
        await signInWithEmail(guestEmail, guestPass, false);
      } catch (signInErr: any) {
        const errMsg = signInErr?.message || '';
        if (
          signInErr?.code === 'auth/user-not-found' || 
          errMsg.includes('user-not-found') || 
          errMsg.includes('INVALID_LOGIN_CREDENTIALS') ||
          errMsg.includes('invalid-credential')
        ) {
          try {
            // Auto-create guest user if not present
            await signInWithEmail(guestEmail, guestPass, true);
          } catch (signUpErr: any) {
            console.error("Guest automatic sign up failed: ", signUpErr);
            setError(
              "Iframe Sandbox block detected. To continue with Google, please click the 'Open in new tab' button at the top-right of your preview frame."
            );
          }
        } else {
          console.error("Guest authentication error: ", signInErr);
          setError(
            "Browser storage limits or blocked cookies in this frame. For full Firebase Auth support, open this app in a 'New Tab' (top-right icon)."
          );
        }
      }
    } finally {
      setGuestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Sparkles className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-xs font-mono text-slate-500 tracking-widest uppercase">Initializing Invoicely...</p>
      </div>
    );
  }

  if (!user) {
    // Determine if we have a popup blocked or network request error
    const isNetworkError = error && (
      error.includes('network-request-failed') || 
      error.includes('popup-closed-by-user') ||
      error.includes('auth/popup-blocked')
    );

    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract background ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-[#111114] border border-white/5 rounded-3xl p-8 relative z-10 shadow-2xl shadow-black/50 space-y-6"
        >
          {/* Logo */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-7 h-7 text-indigo-100" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to Invoicely</h1>
              <p className="text-slate-400 text-sm mt-1.5">Elegant invoicing for professionals, agencies, and businesses</p>
            </div>
          </div>

          {/* Benefits bullets */}
          {!error && !showTroubleshooting && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/2 p-3 rounded-2xl border border-white/2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400">✓</div>
                <span className="text-xs text-slate-300 font-medium">Create invoices in under 60 seconds</span>
              </div>
              <div className="flex items-center gap-3 bg-white/2 p-3 rounded-2xl border border-white/2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400">✓</div>
                <span className="text-xs text-slate-300 font-medium">Track payments & send reminders</span>
              </div>
              <div className="flex items-center gap-3 bg-white/2 p-3 rounded-2xl border border-white/2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400">✓</div>
                <span className="text-xs text-slate-300 font-medium">Premium revenue analytics dashboard</span>
              </div>
            </div>
          )}

          {/* Error Notice Panel */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs space-y-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Interactive Frame Restrictions Detected</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Your browser blocked the login popup or third-party cookies because Invoicely is currently rendering inside a sandboxed iframe.
                </p>
                <div className="h-px bg-white/5 my-1" />
                <p className="text-[10px] text-slate-400 italic">
                  Error reference: auth/network-request-failed
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              disabled={guestLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer text-xs"
            >
              <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.435 1.21 15.62 0 12.24 0 5.58 0 0.24 5.37 0.24 12s5.34 12 11.97 12c6.93 0 11.53-4.875 11.53-11.73 0-.795-.085-1.4-.195-1.985H12.24z"/>
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            {/* Seamless Guest Launcher */}
            <button
              onClick={handleGuestAccess}
              disabled={guestLoading}
              className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-200 border border-white/5 hover:border-white/10 font-semibold py-3 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 active:scale-98 cursor-pointer text-xs"
            >
              {guestLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Quick Sandbox Guest &rarr;</span>
            </button>
          </div>

          {/* Troubleshooting and Helpful Tips Box */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <button
              onClick={() => {
                setShowTroubleshooting(!showTroubleshooting);
                setError(null);
              }}
              className="w-full flex items-center justify-between text-slate-400 hover:text-white transition-colors text-[11px] font-mono uppercase tracking-wider cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Troubleshoot Iframe Sync</span>
              </span>
              <span>{showTroubleshooting ? 'Hide' : 'Show'}</span>
            </button>

            {(showTroubleshooting || error) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/2 border border-white/5 rounded-2xl p-4 text-[11px] text-slate-300 space-y-3 leading-relaxed font-sans"
              >
                <p className="font-semibold text-white flex items-center gap-1">
                  💡 How to achieve zero-restricted Google Sign-In:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 pl-1">
                  <li>
                    Look at the top-right corner of this Google AI Studio workspace (the preview panel frame).
                  </li>
                  <li>
                    Click the <strong className="text-white">&quot;Open in new tab&quot;</strong> button (represented by an arrow pointing diagonal-up-right).
                  </li>
                  <li>
                    Once Invoicely loads in your browser tab, click <strong className="text-white">&quot;Continue with Google&quot;</strong>. It will authenticate instantly without sandbox blockages!
                  </li>
                </ol>
                <div className="bg-white/5 rounded-xl p-2.5 text-[10px] text-indigo-400 border border-indigo-500/10 flex items-start gap-2">
                  <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Alternatively, click <strong>&quot;Quick Sandbox Guest&quot;</strong> above to immediately spin up an active session directly here inside the iframe.
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <p className="text-[10px] text-center text-slate-600 font-mono uppercase tracking-wider">
            Secure, end-to-end encrypted database
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

