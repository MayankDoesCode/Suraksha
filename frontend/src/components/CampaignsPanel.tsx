import React, { useEffect, useState } from 'react';
import api from '../api/client';

type Campaign = { id: string; label: string; members: string[]; targets: string[]; shared_indicator_kinds: string[]; max_severity: string };

export const CampaignsPanel: React.FC<{ brandId: string; onOpen?: (findingId: string) => void }> = ({ brandId, onOpen }) => {
  const [camps, setCamps] = useState<Campaign[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api.getBrandGraph(brandId).then((r: any) => live && setCamps(r.data.campaigns || [])).catch((e: any) => live && setErr(e?.message || 'Could not load campaigns.'));
    return () => { live = false; };
  }, [brandId]);

  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-4" aria-labelledby="camp-h">
      <h2 id="camp-h" className="text-sm font-medium text-fg">Likely campaigns</h2>
      <p className="mt-1 text-xs text-fgMuted">Findings that share an IP, certificate or name server (or two weaker indicators). A shared registrar or common provider alone never forms a campaign.</p>
      {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
      {!err && camps === null && <p className="mt-3 text-sm text-fgSubtle">Loading…</p>}
      {camps && camps.length === 0 && <p className="mt-3 text-sm text-fgSubtle">No campaigns found. Run discovery and look up registration data on findings to link them.</p>}
      <ul className="mt-3 divide-y divide-line">
        {camps?.map((c) => (
          <li key={c.id} className="py-2 text-[13px]">
            <div className="flex items-center justify-between gap-3"><span className="text-fg">{c.label}</span><span className="shrink-0 text-xs text-fgSubtle">{c.max_severity}</span></div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {c.members.map((m, i) => <button key={m} onClick={() => onOpen?.(m)} className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-fgMuted hover:text-fg">{c.targets[i] ?? m}</button>)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
