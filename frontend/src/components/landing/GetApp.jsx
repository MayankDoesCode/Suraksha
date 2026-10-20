import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

// Public APK link (GitHub Release asset). Override at build time with VITE_APK_URL.
const APK_URL =
  import.meta.env.VITE_APK_URL ||
  'https://github.com/MayankDoesCode/Suraksha/releases/latest/download/suraksha.apk';

/** "Get the app": Android APK download + installable web app (PWA). Hidden inside the installed app. */
export default function GetApp() {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvent(e); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (typeof window !== 'undefined' && (window.Capacitor || window.matchMedia?.('(display-mode: standalone)').matches)) {
    return null;
  }

  const install = async () => {
    if (!installEvent) { setHelp(true); return; }
    installEvent.prompt();
    try { await installEvent.userChoice; } catch { /* dismissed */ }
    setInstallEvent(null);
  };

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7" id="get-app">
      <p className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
          <Smartphone className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Get Suraksha on your phone
      </p>
      <p className="mt-3 text-sm leading-relaxed text-fgMuted">
        The Android app and the installable web app both work offline in demo mode.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={APK_URL}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-onAccent transition-colors hover:bg-accentHover"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} /> Android app (APK)
        </a>
        <button
          type="button"
          onClick={install}
          disabled={installed}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-fgSubtle/60 hover:bg-surface3 disabled:opacity-60"
        >
          <Download className="h-4 w-4 text-accent" strokeWidth={1.75} /> {installed ? 'Installed' : 'Install web app'}
        </button>
      </div>
      {help && (
        <p className="mt-4 text-sm leading-relaxed text-fgMuted">
          Your browser did not offer a one-tap install. On iPhone (Safari): Share, then Add to Home Screen.
          On Android or desktop Chrome/Edge: menu, then Install app / Add to Home screen.
        </p>
      )}
      <p className="mt-4 text-xs leading-relaxed text-fgSubtle">
        Android: open the downloaded file and allow installs from this source.
      </p>
    </div>
  );
}
