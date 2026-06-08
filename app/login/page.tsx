'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { FileText, Lock, Mail, Building, AlertCircle, Sparkles, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithEmail, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all standard fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signInWithEmail(email, password, true);
      } else {
        await signInWithEmail(email, password, false);
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'An authentication error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Visual Left Frame: Branding / Marketing Pitch */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-blue-600 dark:bg-blue-900 border-r border-blue-700 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-t from-blue-500 to-transparent opacity-80 pointer-events-none"></div>
        
        {/* Top Header */}
        <div className="flex items-center space-x-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center font-extrabold text-xl shadow-md">
            I
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Invoicely</span>
        </div>

        {/* Content Body */}
        <div className="space-y-6 max-w-lg relative z-10 my-auto">
          <div className="inline-flex items-center space-x-2 bg-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Now with GST-Compliant Tax Invoicing</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Seamless invoicing built for Indian businesses.
          </h1>
          <p className="text-blue-100 text-base leading-relaxed">
            Beautiful invoices, real-time GST calculations (CGST, SGST, IGST), PDF customization, payment reminders, and instantly shareable WhatsApp links — all in a sleek platform.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-6 text-sm text-blue-100/95 font-medium border-t border-white/10">
            <div>
              <span className="block text-white text-lg font-bold">100%</span>
              <span>GST India Compliant</span>
            </div>
            <div>
              <span className="block text-white text-lg font-bold">PDF templates</span>
              <span>Classic, Modern, Minimal</span>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="text-sm text-blue-200 relative z-10 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Invoicely. All rights reserved.</span>
          <button 
            onClick={toggleTheme} 
            className="p-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Interactive Right Frame: Forms */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-24 relative">
        
        {/* Absolute header toggle for theme on mobile */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Brand Header for Mobile View */}
          <div className="md:hidden flex flex-col items-center space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
              I
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Invoicely</h2>
            <p className="text-sm text-slate-500">GST-compliant Tax Invoices on the fly</p>
          </div>

          <div className="space-y-2 md:text-left text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {isSignUp ? 'Create your business account' : 'Sign in to Invoicely'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isSignUp 
                ? 'Ready to generate professional invoices? Enter your business details below.' 
                : 'Enter your email and password to access your dashboard reports and templates.'}
            </p>
          </div>

          {/* Toggle Tab */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <button
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                !isSignUp 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                isSignUp 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Sign Up (Free)
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Company / Organization Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="E.g., Acme Solutions Pvt Ltd"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Business Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-lg disabled:bg-blue-400 dark:disabled:bg-blue-800 hover:scale-[1.01] transition-all duration-150 text-sm flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{isSignUp ? 'Construct Account & Brand' : 'Sign In securely'}</span>
              )}
            </button>
          </form>

          {/* Quick Demo Assist */}
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50/50 dark:bg-slate-900/40">
            <p className="font-bold text-slate-700 dark:text-slate-300">💡 Quick Start Demonstration Note:</p>
            <p>You can use a demo credential like <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 font-mono">test@invoice.com</code> / <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 font-mono">123456</code> to log in instantly, or register any custom business details safely.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
