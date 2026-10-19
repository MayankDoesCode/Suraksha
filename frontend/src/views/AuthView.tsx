import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { ShieldMark } from '../components/ShieldMark';

interface AuthViewProps {
  onNavigateHome?: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

// Defined at module level so inputs keep focus while typing (components declared inside render remount every keystroke).
const input =
  'w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-fg placeholder:text-fgSubtle focus:border-accent disabled:opacity-60';

const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-fg">
      {label}
      {hint && <span className="text-xs font-normal text-fgSubtle">{hint}</span>}
    </label>
    {children}
  </div>
);

const PasswordInput: React.FC<{
  id: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; autoComplete: string; disabled: boolean;
}> = ({ id, value, onChange, show, onToggle, autoComplete, disabled }) => (
  <div className="relative">
    <input
      id={id}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      disabled={disabled}
      className={`${input} pr-10`}
    />
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fgSubtle hover:text-fg"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>
);


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
      setLocalError('Please provide both work email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please check your credentials.');
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
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify both fields.');
      return;
    }
    if (!acceptTerms) {
      setLocalError('You must agree to the Brand Protection Terms and security policy.');
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
      setSuccessMessage('Password reset link sent. Please inspect your inbox.');
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

  const primary =
    'flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-onAccent transition-[transform,background-color] duration-150 hover:bg-accentHover active:scale-[0.98] disabled:opacity-60';
  const submitLabel = (idle: string, busy: string) =>
    isSubmitting ? (<><span className="sk-spinner" aria-hidden /> {busy}</>) : idle;

  const heading =
    mode === 'login'
      ? { title: 'Welcome back', sub: 'Sign in to your SURAKSHA workspace.' }
      : mode === 'signup'
      ? { title: 'Create your workspace', sub: 'Set up an account, then register the brand you want to protect.' }
      : { title: 'Reset your password', sub: 'We will email you a reset link.' };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-canvas px-4 py-10 font-sans text-fg">
      <div aria-hidden className="sk-glow pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--c-accent)/0.12),transparent)]" />
      {onNavigateHome && (
        <button
          type="button"
          onClick={onNavigateHome}
          className="sk-rise group absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-fgMuted transition-colors hover:text-fg sm:left-8 sm:top-6"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" /> Back to site
        </button>
      )}

      <main className="w-full max-w-[26rem]">
        <div className="sk-rise relative rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <ShieldMark size={46} />
            <span className="sk-rise mt-3 text-xs font-semibold tracking-[0.3em] text-fgMuted" style={{ animationDelay: '0.6s' }}>SURAKSHA</span>
          </div>

          {/* One heading per mode, mounted conditionally so each switch re-runs the entrance animation. */}
          {(['login', 'signup', 'forgot'] as const).map((m) =>
            mode === m ? (
              <div key={m} className="sk-rise">
                <h1 className="mt-6 text-center text-2xl font-semibold">{heading.title}</h1>
                <p className="mt-1 text-center text-sm text-fgMuted">{heading.sub}</p>
              </div>
            ) : null,
          )}

          {!firebaseConfigStatus?.isConfigured && (
            <div role="status" className="mt-5 flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Sign-in is not configured for this deployment, so accounts cannot be used yet. You can still explore with demo data below.
              </p>
            </div>
          )}
          {activeError && (
            <div key={activeError} role="alert" className="sk-shake mt-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{activeError}</span>
            </div>
          )}
          {successMessage && (
            <div role="status" className="sk-rise mt-5 flex items-start gap-2.5 rounded-xl border border-ok/30 bg-ok/10 p-3 text-sm text-ok">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="sk-rise mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-medium text-fg transition-[transform,background-color] duration-150 hover:bg-surface3 active:scale-[0.98] disabled:opacity-60"
              >
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-fgSubtle">
                <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          {mode === 'login' && (
            <form key="login" onSubmit={handleLoginSubmit} className="sk-stagger space-y-4" noValidate>
              <Field id="auth-email" label="Email">
                <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@company.com" disabled={isSubmitting} className={input} />
              </Field>
              <Field id="auth-password" label="Password">
                <PasswordInput id="auth-password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((v) => !v)} autoComplete="current-password" disabled={isSubmitting} />
              </Field>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-fgMuted">
                  <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-accent))]" />
                  Remember me
                </label>
                <button type="button" onClick={() => switchMode('forgot')} className="text-fgMuted hover:text-fg">Forgot password?</button>
              </div>
              <button type="submit" disabled={isSubmitting} className={primary}>
                {submitLabel('Sign in', 'Signing in…')}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form key="signup" onSubmit={handleSignUpSubmit} className="sk-stagger space-y-4" noValidate>
              <Field id="auth-name" label="Full name">
                <input id="auth-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" disabled={isSubmitting} className={input} />
              </Field>
              <Field id="auth-org" label="Organisation" hint="Optional">
                <input id="auth-org" value={organization} onChange={(e) => setOrganization(e.target.value)} autoComplete="organization" disabled={isSubmitting} className={input} />
              </Field>
              <Field id="auth-email" label="Work email">
                <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@company.com" disabled={isSubmitting} className={input} />
              </Field>
              <Field id="auth-password" label="Password" hint="At least 6 characters">
                <PasswordInput id="auth-password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((v) => !v)} autoComplete="new-password" disabled={isSubmitting} />
              </Field>
              <Field id="auth-confirm" label="Confirm password">
                <PasswordInput id="auth-confirm" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} autoComplete="new-password" disabled={isSubmitting} />
              </Field>
              <label className="flex items-start gap-2 text-sm text-fgMuted">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-accent))]" />
                I agree to the Brand Protection Terms and security policy.
              </label>
              <button type="submit" disabled={isSubmitting} className={primary}>
                {submitLabel('Create workspace', 'Creating…')}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form key="forgot" onSubmit={handleForgotSubmit} className="sk-stagger mt-6 space-y-4" noValidate>
              <Field id="auth-email" label="Registered email">
                <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@company.com" disabled={isSubmitting} className={input} />
              </Field>
              <button type="submit" disabled={isSubmitting} className={primary}>
                {submitLabel('Send reset link', 'Sending…')}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-fgMuted">
            {mode === 'login' && (<>New here? <button type="button" onClick={() => switchMode('signup')} className="font-medium text-fg hover:text-accent">Create a workspace</button></>)}
            {mode === 'signup' && (<>Already have an account? <button type="button" onClick={() => switchMode('login')} className="font-medium text-fg hover:text-accent">Sign in</button></>)}
            {mode === 'forgot' && (<button type="button" onClick={() => switchMode('login')} className="font-medium text-fg hover:text-accent">Back to sign in</button>)}
          </p>
        </div>

        <div className="sk-rise mt-4 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-fgSubtle" style={{ animationDelay: '260ms' }}>
          <button
            type="button"
            onClick={signInAsDemoAnalyst}
            className="group flex w-full items-center justify-between text-left"
          >
            <span>
              <span className="block text-sm font-medium text-fg">Explore with demo data</span>
              <span className="block text-xs text-fgMuted">Synthetic findings in an isolated sandbox. Nothing is saved to a real workspace.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-fgMuted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-fg" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default AuthView;
