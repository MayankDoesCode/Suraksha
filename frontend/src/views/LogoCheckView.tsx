import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Upload, ShieldCheck, ShieldAlert, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compareToOfficialLogo, fileToDataUrl, LOGO_MATCH_LIKELY, LOGO_MATCH_STRONG, VisualComparison } from '../utils/imageHash';
import { ACME_LOGO, ACME_LOGO_COPY, OTHER_LOGO } from '../data/demoLogos';
import { LogoLookup } from '../components/LogoLookup';

/**
 * Logo-only check: compares one image with the brand's official logo using the in-browser perceptual hash
 * (same matcher the social and app checks use). Nothing is uploaded anywhere. A match is evidence, not proof.
 */
const SAMPLES = [
  { label: 'Edited copy of the logo', src: ACME_LOGO_COPY },
  { label: 'Unrelated logo', src: OTHER_LOGO },
];

function verdict(r: VisualComparison | null) {
  if (!r) return null;
  if (!r.available) return { tone: 'text-fgMuted', bar: 'bg-line', Icon: HelpCircle, title: 'Could not compare', note: r.reason };
  if (r.similarity >= LOGO_MATCH_STRONG) return { tone: 'text-danger', bar: 'bg-danger', Icon: ShieldAlert, title: 'Near-identical copy of the official logo', note: 'Same artwork, possibly re-encoded or lightly edited.' };
  if (r.similarity >= LOGO_MATCH_LIKELY) return { tone: 'text-high', bar: 'bg-high', Icon: ShieldAlert, title: 'Likely copied, with edits', note: 'The artwork matches closely but was changed (colours, crop or text).' };
  return { tone: 'text-ok', bar: 'bg-ok', Icon: ShieldCheck, title: 'Not a match', note: 'This image does not look like the official logo.' };
}

const Drop: React.FC<{ label: string; src: string; onChange: (s: string) => void; hint?: string }> = ({ label, src, onChange, hint }) => {
  const [err, setErr] = useState('');
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-fgSubtle">{label}</p>
      <div className="mt-3 grid h-44 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-surface2">
        {src ? <img src={src} alt={label} className="max-h-40 max-w-[90%] object-contain" /> : <ImageIcon className="h-8 w-8 text-fgSubtle" aria-hidden />}
      </div>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-fgMuted hover:border-accent hover:text-fg">
        <Upload className="h-3.5 w-3.5" aria-hidden />Upload image
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          try { setErr(''); onChange(await fileToDataUrl(f)); } catch (x) { setErr((x as Error).message); }
        }} />
      </label>
      <input value={src.startsWith('data:') ? '' : src} onChange={(e) => onChange(e.target.value.trim())} placeholder="…or paste an image URL"
        className="mt-2 w-full rounded-lg border border-line bg-surface2 px-3 py-1.5 text-xs text-fg outline-none focus:border-accent" />
      {hint && <p className="mt-1.5 text-[11px] text-fgSubtle">{hint}</p>}
      {err && <p className="mt-1.5 text-[11px] text-danger">{err}</p>}
    </div>
  );
};

export const LogoCheckView: React.FC = () => {
  const { brandProfile } = useApp();
  const [official, setOfficial] = useState<string>(brandProfile?.logoUrl || ACME_LOGO);
  const [candidate, setCandidate] = useState<string>(ACME_LOGO_COPY);
  const [result, setResult] = useState<VisualComparison | null>(null);

  useEffect(() => {
    let live = true;
    if (!candidate) { setResult(null); return undefined; }
    compareToOfficialLogo(candidate, official).then((r) => { if (live) setResult(r); });
    return () => { live = false; };
  }, [candidate, official]);

  const [mode, setMode] = useState<'compare' | 'lookup'>('compare');
  const v = verdict(result);
  const pct = result?.available ? Math.round(result.similarity * 100) : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Logo check</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Does this image copy the official logo?</h1>
        <p className="mt-1 max-w-2xl text-sm text-fgMuted">Compares only the artwork, using a perceptual fingerprint that survives resizing and re-encoding. Runs in your browser; nothing is uploaded.</p>
      </header>

      <div className="inline-flex rounded-xl border border-line bg-surface p-1">
        {([['compare', 'Compare with official logo'], ['lookup', 'Find which brand (fake logo only)']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-lg px-3 py-1.5 text-sm ${mode === k ? 'bg-accent text-onAccent' : 'text-fgMuted hover:text-fg'}`}>{label}</button>
        ))}
      </div>

      {mode === 'lookup' ? <LogoLookup /> : (<>
      <div className="grid gap-4 md:grid-cols-2">
        <Drop label={`Official logo${brandProfile?.brandName ? ` · ${brandProfile.brandName}` : ''}`} src={official} onChange={setOfficial}
          hint={brandProfile?.logoUrl ? 'From your brand profile.' : 'Demo logo. Upload your real logo in Brand profile to use it everywhere.'} />
        <Drop label="Suspicious image (avatar, app icon, page header)" src={candidate} onChange={setCandidate} />
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s.label} type="button" onClick={() => setCandidate(s.src)} className="rounded-full border border-line px-3 py-1 text-xs text-fgMuted hover:border-accent hover:text-fg">Try: {s.label}</button>
        ))}
      </div>

      {v && (
        <section className="rounded-2xl border border-line bg-surface p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <v.Icon className={`mt-0.5 h-6 w-6 shrink-0 ${v.tone}`} aria-hidden />
              <div>
                <p className={`text-lg font-semibold ${v.tone}`}>{v.title}</p>
                <p className="mt-0.5 text-sm text-fgMuted">{v.note}</p>
              </div>
            </div>
            {pct !== null && <p className="font-display text-3xl font-semibold tabular-nums text-fg">{pct}%</p>}
          </div>
          {pct !== null && (
            <>
              <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${v.bar}`} style={{ width: `${pct}%` }} /></div>
              <div className="mt-1 flex justify-between text-[11px] text-fgSubtle"><span>0%</span><span>likely copy ≥ {Math.round(LOGO_MATCH_LIKELY * 100)}%</span><span>near-identical ≥ {Math.round(LOGO_MATCH_STRONG * 100)}%</span></div>
            </>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs text-fgSubtle">A logo match is evidence, not proof: partners, resellers and press articles may use the real logo legitimately. Check who runs the account or site before acting.</p>
        </section>
      )}
      </>)}
    </div>
  );
};
