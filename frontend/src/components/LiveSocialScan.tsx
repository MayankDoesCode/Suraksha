import React, { useState } from 'react';
import { Radar } from 'lucide-react';
import api from '../api/client';
import { ScanResults } from './ScanResults';

type Hit = { platform: string; handle: string; display_name: string; profile_url: string; score: number; severity: string; signals: string[] };
type Result = { scanned: number; official_excluded: number; flagged: Hit[]; sources: { source: string; ok: boolean; reason?: string; count?: number }[] };

const handleOf = (o: any) => (typeof o === 'string' ? o : o?.handle || o?.url || '').replace(/\/+$/, '').split('/').pop()?.replace(/^@/, '') || '';

/** Searches public platforms (Bluesky, Mastodon) for look-alikes of the brand; official handles are excluded server-side. */
export function LiveSocialScan({ brandName, officialUrls }: { brandName: string; officialUrls: any[] }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);

  const run = async () => {
    setBusy(true); setErr(''); setRes(null);
    try {
      setRes(await api.monitorSocial({
        brand_profile: { name: brandName, social_handles: officialUrls.map((u) => ({ handle: handleOf(u) })).filter((h) => h.handle) },
      }));
    } catch (e: any) {
      setErr(e?.message || 'Live scan unavailable. The backend may be waking up; try again in a minute.');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-surface p-4 rounded-xl border border-line space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-fg flex items-center gap-1.5"><Radar className="w-3.5 h-3.5 text-accent" /> Live scan: public platforms (Bluesky, Mastodon)</span>
        <button onClick={run} disabled={busy || !brandName} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {busy ? 'Scanning…' : 'Scan now'}
        </button>
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
      {res && <ScanResults kind="social" data={res as any} />}
    </div>
  );
}
