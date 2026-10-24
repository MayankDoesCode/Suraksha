import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { fileToDataUrl, hashImageSource, hashSimilarity, LOGO_MATCH_LIKELY, LOGO_MATCH_STRONG } from '../utils/imageHash';
import { ACME_LOGO, ACME_LOGO_COPY, OTHER_LOGO } from '../data/demoLogos';

/**
 * Logo lookup: upload only the suspicious logo, and it is compared with every official logo the workspace knows
 * (the current brand profile, logos uploaded for backend brands, and a small local library you can add to).
 * It ranks the brands by visual similarity. It can only find brands whose official logo is in that set; it does not
 * search the internet.
 */
type Ref = { name: string; src: string; source: string };
const LIB_KEY = 'suraksha.logoLibrary.v1';

function loadLibrary(): Ref[] {
  try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch { return []; }
}
function saveLibrary(refs: Ref[]) {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(refs)); } catch { /* storage unavailable: keep in memory */ }
}

export const LogoLookup: React.FC = () => {
  const { brandProfile, backendBrands } = useApp() as any;
  const [library, setLibrary] = useState<Ref[]>(loadLibrary);
  const [candidate, setCandidate] = useState<string>(ACME_LOGO_COPY);
  const [ranked, setRanked] = useState<{ ref: Ref; sim: number | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState('');

  const refs = useMemo<Ref[]>(() => {
    const out: Ref[] = [];
    out.push({ name: brandProfile?.brandName || 'Acme Corp', src: brandProfile?.logoUrl || ACME_LOGO, source: brandProfile?.logoUrl ? 'Brand profile' : 'Demo logo' });
    out.push({ name: 'Other Co (demo)', src: OTHER_LOGO, source: 'Demo logo' });
    for (const b of backendBrands || []) {
      if (b?.id && !/demo/i.test(String(b.id))) out.push({ name: b.name, src: `${(api as any).baseUrl}/brands/${encodeURIComponent(b.id)}/logo`, source: 'Workspace brand' });
    }
    return [...out, ...library];
  }, [brandProfile, backendBrands, library]);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!candidate) { setRanked([]); return; }
      setBusy(true);
      const c = await hashImageSource(candidate);
      const rows = await Promise.all(refs.map(async (ref) => {
        const h = await hashImageSource(ref.src);
        return { ref, sim: c && h ? hashSimilarity(c, h) : null };
      }));
      if (live) { setRanked(rows.sort((a, b) => (b.sim ?? -1) - (a.sim ?? -1))); setBusy(false); }
    })();
    return () => { live = false; };
  }, [candidate, refs]);

  const best = ranked.find((r) => r.sim !== null);
  const compared = ranked.filter((r) => r.sim !== null).length;
  const verdict = !best || best.sim === null ? null
    : best.sim >= LOGO_MATCH_STRONG ? { tone: 'text-danger', text: `Copies the ${best.ref.name} logo`, sub: 'Near-identical artwork.' }
    : best.sim >= LOGO_MATCH_LIKELY ? { tone: 'text-high', text: `Most likely imitates ${best.ref.name}`, sub: 'Same artwork with edits.' }
    : { tone: 'text-ok', text: 'No brand in the library matches', sub: `Closest is ${best.ref.name}, but not close enough to call it a copy.` };

  const addToLibrary = async (file?: File) => {
    if (!file || !newName.trim()) { setErr('Give the brand a name, then choose its official logo.'); return; }
    try {
      const src = await fileToDataUrl(file);
      const next = [...library.filter((r) => r.name.toLowerCase() !== newName.trim().toLowerCase()), { name: newName.trim(), src, source: 'Your library' }];
      setLibrary(next); saveLibrary(next); setNewName(''); setErr('');
    } catch (x) { setErr((x as Error).message); }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fgSubtle">Suspicious logo only</p>
          <div className="mt-3 grid h-44 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-surface2">
            {candidate ? <img src={candidate} alt="Suspicious logo" className="max-h-40 max-w-[90%] object-contain" /> : <Search className="h-8 w-8 text-fgSubtle" aria-hidden />}
          </div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-fgMuted hover:border-accent hover:text-fg">
            <Upload className="h-3.5 w-3.5" aria-hidden />Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setCandidate(await fileToDataUrl(f)); } catch (x) { setErr((x as Error).message); } } }} />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCandidate(ACME_LOGO_COPY)} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-fgMuted hover:text-fg">Try: copied logo</button>
            <button type="button" onClick={() => setCandidate(OTHER_LOGO)} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-fgMuted hover:text-fg">Try: another brand</button>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4" aria-live="polite">
          {verdict ? (
            <div><p className={`text-lg font-semibold ${verdict.tone}`}>{verdict.text}</p><p className="text-sm text-fgMuted">{verdict.sub} Compared with {compared} official logo{compared === 1 ? '' : 's'}.</p></div>
          ) : <p className="text-sm text-fgMuted">{busy ? 'Comparing…' : 'Upload a logo to search.'}</p>}
          <ul className="mt-4 space-y-2">
            {ranked.map(({ ref, sim }, i) => (
              <li key={`${ref.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-line p-2">
                <img src={ref.src} alt="" className="h-9 w-9 rounded bg-white object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-fg">{ref.name}</p><p className="text-[11px] text-fgSubtle">{ref.source}</p></div>
                {sim === null ? <span className="text-xs text-fgSubtle">no logo</span> : (
                  <div className="w-32"><div className="h-1.5 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${sim >= LOGO_MATCH_STRONG ? 'bg-danger' : sim >= LOGO_MATCH_LIKELY ? 'bg-high' : 'bg-fgSubtle'}`} style={{ width: `${Math.round(sim * 100)}%` }} /></div>
                    <p className="mt-0.5 text-right text-[11px] tabular-nums text-fgMuted">{Math.round(sim * 100)}%</p></div>
                )}
                {ref.source === 'Your library' && (
                  <button type="button" aria-label={`Remove ${ref.name}`} onClick={() => { const next = library.filter((r) => r !== ref); setLibrary(next); saveLibrary(next); }} className="text-fgSubtle hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-fg">Add an official logo to the library</p>
        <p className="text-xs text-fgSubtle">The lookup can only recognise brands whose official logo it has. Saved in this browser only.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Brand name, e.g. Paytm" className="rounded-lg border border-line bg-surface2 px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-onAccent hover:bg-accentHover">
            <Plus className="h-3.5 w-3.5" aria-hidden />Choose its official logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => addToLibrary(e.target.files?.[0])} />
          </label>
          {err && <span className="text-xs text-danger">{err}</span>}
        </div>
      </section>
      <p className="text-xs text-fgSubtle">A visual match is evidence, not proof: partners and press may use a real logo legitimately.</p>
    </div>
  );
};
