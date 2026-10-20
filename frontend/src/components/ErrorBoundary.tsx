import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const RELOAD_KEY = 'suraksha.chunk-reload';

/** A lazy chunk that fails to download (flaky network, or a redeploy renamed it). */
const isChunkError = (error: unknown) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(
    String((error as Error)?.message || error)
  );

interface Props {
  children: React.ReactNode;
  /** Shown as the page name in the message, e.g. "Watchtower". */
  label?: string;
  /** Offered as a way out, e.g. go back to the overview. */
  onReset?: () => void;
  /** Full-screen layout for the app root; inline panel inside the workspace. */
  fullscreen?: boolean;
}

interface State {
  error: Error | null;
}

/**
 * Keeps one broken page from blanking the whole app. A failed chunk download reloads the page once
 * (the new deploy's chunks are then fetched); any other error shows what happened and a way back.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SURAKSHA] Page error:', error, info.componentStack);
    if (isChunkError(error)) {
      // Reload at most once a minute, so a real outage shows the message instead of looping.
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
      } catch {
        /* storage blocked: fall through to the message */
      }
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkError(error);
    const panel = (
      <div role="alert" className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-warn/30 bg-warn/10 text-warn">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-fg">
          {chunk ? 'Part of the app did not download' : `${this.props.label || 'This page'} stopped working`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fgMuted">
          {chunk
            ? 'Check your connection, then reload. Your data is not affected.'
            : 'The error was contained to this page. Your findings and brand data are safe.'}
        </p>
        <p className="mt-4 truncate rounded-xl bg-surface2 px-3 py-2 font-mono text-xs text-fgSubtle" title={error.message}>
          {error.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-onAccent hover:bg-accentHover"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} /> Reload
          </button>
          {this.props.onReset && !chunk && (
            <button
              onClick={this.reset}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg hover:bg-surface3"
            >
              Back to overview
            </button>
          )}
        </div>
      </div>
    );

    return this.props.fullscreen ? (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas p-4 text-fg">{panel}</div>
    ) : (
      <div className="py-10">{panel}</div>
    );
  }
}

export default ErrorBoundary;
