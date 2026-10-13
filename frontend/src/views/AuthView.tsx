import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  User,
  Building,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Crosshair,
  Database,
  ChevronRight,
  Radio,
} from 'lucide-react';
import ThreatRadarVisualization from '../components/ThreatRadarVisualization';

interface AuthViewProps {
  onNavigateHome?: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigateHome, initialMode = 'login' }) => {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    signInAsDemoAnalyst,
    error,
    clearError,
    firebaseConfigStatus,
  } = useAuth();


  // Mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status indicators
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setLocalError('Please provide both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your work email.');
      return;
    }
    if (!password) {
      setLocalError('Please choose a secure password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify.');
      return;
    }
    if (!acceptTerms) {
      setLocalError('You must accept the security policies and terms to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(email.trim(), password, fullName.trim(), organization.trim());
      setSuccessMessage('Account provisioned successfully! Loading your brand protection workspace...');
    } catch (err: any) {
      setLocalError(err.message || 'Account registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(email.trim());
      setSuccessMessage('Password reset link sent! Please check your inbox.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setSuccessMessage(null);
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Google Sign-In failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#020817] text-[#F8FAFC] font-sans overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* ========================================================= */}
      {/* LEFT PANEL: SURAKSHA BRAND EXPERIENCE (~56% Desktop Width) */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[56%] relative bg-gradient-to-br from-[#020817] via-[#071632] to-[#020817] p-6 sm:p-8 lg:p-8 xl:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-blue-500/15 overflow-hidden">
        {/* Ambient Subtle Background Lighting */}
        <div className="absolute top-0 left-1/4 w-[420px] h-[320px] bg-[#2563EB]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[380px] h-[340px] bg-[#06D6F5]/8 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-[300px] h-[300px] bg-[#7C3AED]/8 rounded-full blur-[140px] pointer-events-none" />

        {/* 1. Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#2563EB] via-indigo-600 to-[#06D6F5] p-[1.5px] shadow-lg shadow-blue-500/20 shrink-0">
            <div className="w-full h-full rounded-[10px] bg-[#020817]/85 backdrop-blur-md flex items-center justify-center border border-cyan-400/40">
              <Shield className="w-5 h-5 text-[#06D6F5]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl sm:text-2xl tracking-tight text-white font-mono">
                Suraksha
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 text-[#06D6F5] border border-cyan-500/30">
                AI
              </span>
            </div>
            <p className="text-[10px] font-mono tracking-widest text-[#94A3B8] uppercase mt-0.5">
              DIGITAL BRAND PROTECTION MATRIX
            </p>
          </div>
        </div>

        {/* 2. Hero Section */}
        <div className="relative z-10 my-auto py-5 sm:py-6 lg:py-4 xl:py-7 max-w-xl space-y-3.5 sm:space-y-4">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#071632]/80 border border-blue-500/25 text-[10px] font-mono tracking-widest text-[#06D6F5] shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06D6F5] shadow-[0_0_8px_#06D6F5] animate-pulse" />
            <span className="font-semibold uppercase">INTELLIGENCE / MONITOR / PROTECT</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl lg:text-3xl xl:text-[40px] font-extrabold text-white tracking-tight leading-[1.15]">
            Protect what makes{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-[#06D6F5] to-teal-200">
              your brand yours.
            </span>
          </h1>

          {/* Supporting Description */}
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-lg font-normal">
            Discover look-alike domains, rogue apps, and unauthorized social handles before they impact your brand, customers and revenue.
          </p>

          {/* Central Threat-Intelligence Radar Visualization */}
          <div className="py-1 flex justify-center lg:justify-start">
            <ThreatRadarVisualization />
          </div>

          {/* Two Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Card 1: Look-alike Engine */}
            <div className="p-3 sm:p-3.5 xl:p-4 rounded-xl bg-[#071632]/50 hover:bg-[#071632]/80 border border-blue-500/20 hover:border-[#06D6F5]/40 backdrop-blur-md transition-all group shadow-md shadow-black/40">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Crosshair className="w-3.5 h-3.5 text-[#06D6F5] group-hover:scale-110 transition-transform" />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-[11px] sm:text-xs font-mono font-bold text-white uppercase tracking-wider group-hover:text-[#06D6F5] transition-colors">
                LOOK-ALIKE ENGINE
              </h4>
              <p className="text-[10.5px] sm:text-[11px] text-[#94A3B8] mt-1 leading-snug">
                Homoglyphs, Levenshtein distance, and brand token analysis.
              </p>
            </div>

            {/* Card 2: Asset Directory */}
            <div className="p-3 sm:p-3.5 xl:p-4 rounded-xl bg-[#071632]/50 hover:bg-[#071632]/80 border border-blue-500/20 hover:border-[#06D6F5]/40 backdrop-blur-md transition-all group shadow-md shadow-black/40">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Database className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-[11px] sm:text-xs font-mono font-bold text-white uppercase tracking-wider group-hover:text-[#06D6F5] transition-colors">
                ASSET DIRECTORY
              </h4>
              <p className="text-[10.5px] sm:text-[11px] text-[#94A3B8] mt-1 leading-snug">
                Single source of truth for verified domains, handles, and stores.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Bottom Trust Badge */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Enterprise Grade • ISO/SOC2 Ready</span>
          </div>
          <span className="text-slate-500">v5.2 Threat Matrix Engine</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL: AUTHENTICATION (~44% Desktop Width)          */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[44%] relative flex items-center justify-center p-5 sm:p-8 lg:p-6 xl:p-10 overflow-y-auto">
        {/* Subtle Dark Blue Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)] pointer-events-none" />

        {/* Centered Authentication Card Container */}
        <div className="w-full max-w-[440px] rounded-2xl bg-[#071632]/40 backdrop-blur-xl border border-blue-500/20 p-6 sm:p-7 xl:p-8 shadow-2xl shadow-black/80 space-y-4 sm:space-y-5 relative z-10">
          {/* Navigation: Return to SURAKSHA Public Site */}
          {onNavigateHome && (
            <div>
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-2 text-xs font-mono text-[#06D6F5] hover:text-white transition-colors cursor-pointer group"
                aria-label="Return to SURAKSHA Public Site"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                <span>Return to SURAKSHA Public Site</span>
              </button>
            </div>
          )}

          {/* Heading */}
          <div>
            {mode === 'login' && (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5">
                  Sign in to your brand protection workspace.
                </p>
              </>
            )}

            {mode === 'signup' && (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
                  Create your workspace
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5">
                  Register your enterprise identity to begin monitoring.
                </p>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white mb-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
                  Reset credentials
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5">
                  We'll send a secure password reset link to your email.
                </p>
              </>
            )}
          </div>

          {/* Feedback alerts */}
          {!firebaseConfigStatus?.isConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-100">Firebase Configuration Pending</p>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Production environment variables (<code className="bg-amber-950/40 px-1 py-0.5 rounded font-mono text-[10px]">VITE_FIREBASE_*</code>) have not yet been provided. You can continue using <span className="font-semibold text-white">Quick Access: Continue as Demo Analyst</span> below to explore the full dashboard.
                </p>
              </div>
            </div>
          )}

          {activeError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{activeError}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Google SSO Button (Available for Login & Signup) */}
          {mode !== 'forgot' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#020817]/90 hover:bg-[#071632] border border-slate-700/80 hover:border-cyan-500/40 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#050e20] px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 shrink-0">
                  OR CONTINUE WITH EMAIL
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>
            </div>
          )}

          {/* Form: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@enterprise.com"
                    className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] text-[#06D6F5] hover:text-cyan-300 font-medium transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="rounded bg-[#020817] border-slate-700 text-[#2563EB] focus:ring-[#06D6F5] focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Remember session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-600 hover:from-blue-600 hover:to-[#06D6F5] text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60 cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={signInAsDemoAnalyst}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#071632]/80 hover:bg-[#071632] border border-slate-700/60 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
                  title="Bypass login for offline/local demonstration testing"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick Access: Continue as Demo Analyst</span>
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-[#94A3B8]">
                Don't have an enterprise workspace?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-[#06D6F5] hover:text-cyan-300 font-semibold transition-colors cursor-pointer"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* Form: SIGN UP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ananya Pattnayak"
                    className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="security@apexpay.io"
                    className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Organization / Company
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="ApexPay Technologies, Inc."
                    className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-[#94A3B8] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded bg-[#020817] border-slate-700 text-[#2563EB] focus:ring-[#06D6F5] cursor-pointer"
                  />
                  <span>
                    I accept the{' '}
                    <span className="text-slate-300 underline underline-offset-2">Brand Protection Terms</span>{' '}
                    and privacy security mandates.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-600 hover:from-blue-600 hover:to-[#06D6F5] text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Workspace...
                  </span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={signInAsDemoAnalyst}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#071632]/80 hover:bg-[#071632] border border-slate-700/60 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
                  title="Bypass login for offline/local demonstration testing"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick Access: Continue as Demo Analyst</span>
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-[#94A3B8]">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-[#06D6F5] hover:text-cyan-300 font-semibold transition-colors cursor-pointer"
                >
                  Sign in instead
                </button>
              </div>
            </form>
          )}

          {/* Form: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@enterprise.com"
                    className="w-full bg-[#020817]/90 border border-slate-800 focus:border-[#2563EB] focus:ring-1 focus:ring-[#06D6F5]/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-colors outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-600 hover:from-blue-600 hover:to-[#06D6F5] text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Instructions...
                  </span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Send Password Reset Email</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Workspace info note */}
          <div className="p-3 rounded-lg bg-[#020817]/70 border border-slate-800/80 text-[11px] text-[#94A3B8] text-center font-mono">
            {firebaseConfigStatus?.source === 'env'
              ? 'Secured by Firebase Enterprise Authentication & zero-trust Firestore token authorization.'
              : firebaseConfigStatus?.source === 'fallback'
              ? 'Connected via local development fallback credentials (firebase-applet-config).'
              : 'Firebase configuration pending — sandbox demonstration mode active.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
