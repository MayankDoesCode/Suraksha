import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  User,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SurakshaLogo } from '../components/SurakshaLogo';

interface AuthViewProps {
  onNavigateHome?: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

const inputClass =
  'w-full rounded-xl border border-line bg-surface2/80 px-3.5 py-2.5 text-sm text-fg placeholder:text-fgSubtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-150 disabled:opacity-60';

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
      setLocalError('Please provide both work email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please verify your credentials.');
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
      setLocalError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setLocalError('You must agree to the Brand Protection security policy.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(email.trim(), password, fullName.trim(), organization.trim() || 'Enterprise Org');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setLocalError('Please specify the registered email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(email.trim());
      setSuccessMessage('Password reset instructions sent. Please check your inbox.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to request password reset link.');
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
      setLocalError(err.message || 'Google Single Sign-On failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center bg-canvas font-sans text-fg py-8 px-4 sm:px-6 selection:bg-accent/30 selection:text-fg">
      {/* Background Ambient Glow (matches app design system) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[500px] rounded-full bg-accent/[0.07] blur-[140px]" />
        <div className="absolute top-2/3 right-1/4 h-[350px] w-[450px] rounded-full bg-ai/[0.04] blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/30 via-transparent to-canvas/80" />
      </div>

      {/* Top Header / Back Navigation */}
      <header className="relative z-10 w-full max-w-md flex items-center justify-between">
        {onNavigateHome ? (
          <button
            type="button"
            onClick={onNavigateHome}
            className="group inline-flex items-center gap-2 rounded-lg border border-line bg-surface/80 px-3 py-1.5 text-xs font-medium text-fgMuted backdrop-blur-md transition-all hover:bg-surface2 hover:text-fg hover:border-line"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Overview</span>
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[11px] font-medium text-ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
          <span>SOC Platform Active</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 w-full max-w-[410px] my-auto pt-4 pb-6">
        <div className="relative rounded-2xl border border-line bg-surface/90 p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
          {/* Subtle top edge gradient reflection */}
          <div className="absolute top-0 inset-x-8 h-[1.5px] bg-gradient-to-r from-transparent via-accent/80 to-transparent" />

          {/* Brand Emblem & Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 flex items-center justify-center">
              <SurakshaLogo size={46} glow={true} className="relative z-10" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-[0.2em] text-fg uppercase">SURAKSHA</span>
              <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-mono text-accent">
                SOC v1.0
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              {mode === 'login' && 'Sign in to Console'}
              {mode === 'signup' && 'Create SOC Workspace'}
              {mode === 'forgot' && 'Reset your password'}
            </h1>
            <p className="mt-1 text-xs text-fgMuted leading-relaxed">
              {mode === 'login' && 'Enter your credentials to access the brand protection platform.'}
              {mode === 'signup' && 'Establish an analyst account to configure real-time monitoring.'}
              {mode === 'forgot' && 'Enter your work email to receive password recovery instructions.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {activeError && (
            <div
              key={activeError}
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger leading-relaxed animate-in fade-in"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{activeError}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-ok/30 bg-ok/10 p-3 text-xs text-ok leading-relaxed animate-in fade-in"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google SSO Button */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-xs sm:text-sm font-medium text-fg shadow-xs transition-all duration-150 hover:bg-surface3 hover:border-fgSubtle active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-fgSubtle">
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-fgSubtle">or continue with email</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          {/* Form: Login */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-fg mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="analyst@enterprise.com"
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10`}
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-fg">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] font-medium text-accent hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    placeholder="••••••••"
                    className={`${inputClass} pl-10 pr-10 font-mono text-xs`}
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fgSubtle hover:text-fg p-1 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs text-fgMuted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-line accent-[rgb(var(--c-accent))]"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs sm:text-sm font-semibold text-onAccent shadow-md hover:bg-accentHover active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isSubmitting ? (
                  <>
                    <span className="sk-spinner" aria-hidden />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In to Console</span>
                )}
              </button>
            </form>
          )}

          {/* Form: Sign Up */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5" noValidate>
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-fg mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="auth-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    placeholder="Alex Mercer"
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10`}
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="auth-org" className="block text-xs font-medium text-fg mb-1.5">
                  Organization <span className="text-[11px] font-normal text-fgSubtle">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    id="auth-org"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    autoComplete="organization"
                    placeholder="Acme Global Security"
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10`}
                  />
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="auth-email-up" className="block text-xs font-medium text-fg mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    id="auth-email-up"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="analyst@acme.com"
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10`}
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="auth-pass-up" className="block text-xs font-medium text-fg mb-1.5">
                  Password <span className="text-[11px] font-normal text-fgSubtle">(min 6 chars)</span>
                </label>
                <div className="relative">
                  <input
                    id="auth-pass-up"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    placeholder="••••••••"
                    className={`${inputClass} pl-10 pr-10 font-mono text-xs`}
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fgSubtle hover:text-fg p-1 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="auth-confirm-pass" className="block text-xs font-medium text-fg mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="auth-confirm-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    placeholder="••••••••"
                    className={`${inputClass} pl-10 pr-10 font-mono text-xs`}
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fgSubtle hover:text-fg p-1 rounded transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-fgMuted cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-line accent-[rgb(var(--c-accent))]"
                />
                <span>I agree to the Enterprise Brand Protection Terms and security policy.</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs sm:text-sm font-semibold text-onAccent shadow-md hover:bg-accentHover active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isSubmitting ? (
                  <>
                    <span className="sk-spinner" aria-hidden />
                    <span>Provisioning workspace…</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          )}

          {/* Form: Forgot Password */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="auth-forgot-email" className="block text-xs font-medium text-fg mb-1.5">
                  Registered Work Email
                </label>
                <div className="relative">
                  <input
                    id="auth-forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="analyst@enterprise.com"
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10`}
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fgSubtle pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs sm:text-sm font-semibold text-onAccent shadow-md hover:bg-accentHover active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isSubmitting ? (
                  <>
                    <span className="sk-spinner" aria-hidden />
                    <span>Sending reset instructions…</span>
                  </>
                ) : (
                  <span>Send Recovery Email</span>
                )}
              </button>
            </form>
          )}

          {/* Switcher Footer */}
          <div className="mt-6 pt-4 border-t border-line text-center text-xs text-fgMuted">
            {mode === 'login' && (
              <p>
                Don't have an enterprise workspace?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have verified credentials?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Return to sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* "A little bit" extra: Quick Analyst Demo Access */}
        <div className="mt-4">
          <button
            type="button"
            onClick={signInAsDemoAnalyst}
            className="group w-full flex items-center justify-between rounded-xl border border-line bg-surface/80 px-4 py-3 backdrop-blur-md transition-all duration-200 hover:border-accent/40 hover:bg-surface2 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ok/15 text-ok border border-ok/30">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-fg group-hover:text-accent transition-colors">
                    Direct Analyst Access
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
                </div>
                <span className="text-[11px] text-fgMuted block">
                  1-click entry to explore live SOC operations (Sandbox)
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-fgMuted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </main>

      {/* Subtle Credibility Bar: "not much but a little bit" */}
      <footer className="relative z-10 w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center gap-2.5 text-[11px] text-fgSubtle">
          <span className="flex items-center gap-1 text-ok font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            TLS 1.3 Encrypted
          </span>
          <span className="text-line">·</span>
          <span>SOC-2 Certified Ops</span>
          <span className="text-line">·</span>
          <span>Zero-Knowledge Architecture</span>
        </div>
      </footer>
    </div>
  );
};

export default AuthView;
