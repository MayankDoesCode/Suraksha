import React, { useState } from 'react';
import { Radar } from 'lucide-react';
import api from '../api/client';
import { ScanResults } from './ScanResults';
import { useApp } from '../context/AppContext';
import { hitToCandidate } from '../utils/liveHits';

type Hit = { platform: string; store: string; title: string; package_id: string; publisher: string; listing_url: string; score: number; severity: string; signals: string[] };
type Result = { scanned: number; official_excluded: number; flagged: Hit[]; sources: { source: string; ok: boolean; reason?: string }[] };

const SAMPLE = '[{"app_title":"Brand Wallet Pro","package_id":"net.example.wallet","developer":"Unknown Dev","store":"Google Play"}]';

/** Searches the Apple App Store and scores any pasted Google Play / APK-mirror listings against the brand. */
export function LiveAppScan({ brand }: { brand: any }) {
  const { addCandidate } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [listings, setListings] = useState('');

  const run = async () => {
    setBusy(true); setErr(''); setRes(null);
    try {
      const payload: any = {
        brand_profile: {
          name: brand.brandName,
          app_identifiers: (brand.officialApps || []).map((a: any) => ({ identifier: a.appId })).filter((a: any) => a.identifier),
          publishers: (brand.officialApps || []).map((a: any) => ({ publisher_name: a.developer })).filter((p: any) => p.publisher_name),
        },
      };
      if (listings.trim()) { payload.listings = listings.trim(); payload.format = listings.trim().startsWith('[') ? 'json' : 'csv'; }
      setRes(await api.monitorApps(payload));
    } catch (e: any) {
      setErr(e?.message || 'Live scan unavailable. The backend may be waking up; try again in a minute.');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-surface p-4 rounded-xl border border-line space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-fg flex items-center gap-1.5"><Radar className="w-3.5 h-3.5 text-accent" /> Live scan: App Store + imported listings</span>
        <button onClick={run} disabled={busy || !brand.brandName} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {busy ? 'Scanning…' : 'Scan now'}
        </button>
      </div>
      <button type="button" onClick={() => setShowImport(!showImport)} className="text-[11px] text-accent">
        {showImport ? 'Hide' : 'Add'} Google Play / APK listings (paste JSON or CSV)
      </button>
      {showImport && (
        <textarea value={listings} onChange={(e) => setListings(e.target.value)} placeholder={SAMPLE} rows={4}
          className="w-full rounded-md border border-line bg-surface2 p-2 font-mono text-[11px] text-fg" />
      )}
      {err && <p className="text-xs text-bad">{err}</p>}
      {res && <ScanResults kind="app" data={res as any} onTrack={(h) => addCandidate(hitToCandidate('app', h))} />}
    </div>
  );
}
