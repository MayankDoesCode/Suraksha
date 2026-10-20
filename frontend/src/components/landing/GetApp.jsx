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
    <div className="mt-6 rounded-lg border border-line/70 bg-surface2/40 p-4" id="get-app">
      <p className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Smartphone className="h-4 w-4 text-accent" /> Get Suraksha on your phone
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={APK_URL}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Android app (APK)
        </a>
        <button
          type="button"
          onClick={install}
          disabled={installed}
          className="inline-flex items-center gap-2 rounded-md border border-line/60 bg-surface2/50 px-4 py-2.5 text-sm font-medium text-fgSubtle hover:bg-surface3 hover:text-fg disabled:opacity-60"
        >
          <Download className="h-4 w-4 text-accent" /> {installed ? 'Installed' : 'Install web app'}
        </button>
      </div>
      {help && (
        <p className="mt-3 text-xs leading-relaxed text-fgSubtle">
          Your browser did not offer a one-tap install. On iPhone (Safari): Share, then Add to Home Screen.
          On Android or desktop Chrome/Edge: menu, then Install app / Add to Home screen.
        </p>
      )}
      <p className="mt-3 text-[11px] text-fgSubtle">
        Android: open the downloaded file and allow installs from this source. Works offline in demo mode.
      </p>
    </div>
  );
}
