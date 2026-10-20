import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'suraksha.theme.v3'; // UI preference only; nothing sensitive is stored.

const readPreference = (): ThemePreference => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark';
  } catch {
    return 'dark'; // storage can be blocked (private mode); fall back silently
  }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Applies the chosen theme to <html data-theme> while the workspace is mounted, and removes it on
 * unmount so the public landing page keeps its own look.
 */
export function useWorkspaceTheme() {
  const [preference, setPreference] = React.useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = React.useState(systemPrefersDark);

  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [resolved]);

  const set = React.useCallback((next: ThemePreference) => {
    setPreference(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preference just won't persist */
    }
  }, []);

  return { preference, resolved, setPreference: set };
}

const ThemeCtx = React.createContext<ReturnType<typeof useWorkspaceTheme> | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useWorkspaceTheme();
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
};

export const useTheme = () => {
  const ctx = React.useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};

export const ThemeToggle: React.FC = () => {
  const { resolved, setPreference } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <button
      onClick={() => setPreference(next)}
      className="rounded-md p-1.5 text-fgMuted transition-colors hover:bg-surface3 hover:text-fg"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {resolved === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
};
