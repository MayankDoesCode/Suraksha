import React, { useState } from 'react';
import api from '../api/client';

const AUDIENCES: Record<string, { id: string; label: string }[]> = {
  domain: [{ id: 'registrar', label: 'Registrar' }, { id: 'hosting', label: 'Hosting' }, { id: 'internal', label: 'Internal' }],
  social: [{ id: 'platform', label: 'Platform' }, { id: 'internal', label: 'Internal' }],
  mobile_app: [{ id: 'app_store', label: 'App store' }, { id: 'internal', label: 'Internal' }],
};

export const FindingIntelPanel: React.FC<{ findingId: string; assetType: string; onChanged?: () => Promise<void> | void }> = ({ findingId, assetType, onChanged }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ body_markdown: string; manifest_sha256: string } | null>(null);
  const [take, setTake] = useState<{ to: string; source: string; eml: string; pdf: string; name: string } | null>(null);
  const takedown = async (notice: string) => {
    setBusy(true); setErr(null);
    try {
      const d = (await api.createTakedown(findingId, notice)).data;
      setReport({ body_markdown: d.text, manifest_sha256: d.manifest_sha256 });
      setTake({ to: d.to, source: d.abuse_contact_source, eml: d.eml_base64, pdf: d.pdf_base64, name: `takedown-${notice}` });
    } catch (e: any) { setErr(e?.message || 'Could not draft the takedown notice.'); } finally { setBusy(false); }
  };
  const href = (b64: string, type: string) => `data:${type};base64,${b64}`;
  const audiences = AUDIENCES[assetType] || [];

  const enrich = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await api.enrichFinding(findingId);
      setMsg(`Observed ${new Date(r.data.intel.observed_at).toLocaleString()}. Registration age: ${r.data.intel.rdap?.age_days ?? 'unknown'} days.`);
      await onChanged?.();
    } catch (e: any) { setErr(e?.message || 'Enrichment failed.'); } finally { setBusy(false); }
  };
  const draft = async (aud: string) => {
    setBusy(true); setErr(null);
    try { setReport((await api.getFindingReport(findingId, aud)).data); } catch (e: any) { setErr(e?.message || 'Could not draft the report.'); } finally { setBusy(false); }
  };

  return (
    <div className="mb-4 rounded-md border border-line bg-surface2 p-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs font-medium text-fgSubtle">Actions</span>
        {assetType === 'domain' && <button onClick={enrich} disabled={busy} className="rounded-md border border-line px-2.5 py-1 text-fg hover:bg-surface3 disabled:opacity-40">Look up DNS, registration and certificate</button>}
        {assetType === 'domain' && ['registrar', 'host', 'trademark'].map((n) => <button key={n} onClick={() => takedown(n)} disabled={busy} className="rounded-md border border-line px-2.5 py-1 text-fg hover:bg-surface3 disabled:opacity-40">Takedown: {n}</button>)}
        {audiences.map((a) => <button key={a.id} onClick={() => draft(a.id)} disabled={busy} className="rounded-md border border-line px-2.5 py-1 text-fg hover:bg-surface3 disabled:opacity-40">Draft report: {a.label}</button>)}
      </div>
      {msg && <p className="mt-2 text-xs text-fgMuted" aria-live="polite">{msg}</p>}
      {err && <p role="alert" className="mt-2 text-xs text-danger">{err}</p>}
      {take && <p className="mt-2 text-xs text-fgMuted">Send to: {take.to} ({take.source === 'rdap' ? 'from the RDAP record' : 'abuse contact not found; look it up'}). <a className="text-accent underline" download={`${take.name}.eml`} href={href(take.eml, 'message/rfc822')}>Download .eml</a> · <a className="text-accent underline" download={`${take.name}.pdf`} href={href(take.pdf, 'application/pdf')}>Download PDF</a></p>}
      {report && (
        <div className="mt-3">
          <textarea readOnly value={report.body_markdown} rows={12} className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs" />
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-xs text-fgSubtle">Draft only; nothing is sent. Verify the facts before submitting.</p>
            <button onClick={() => navigator.clipboard?.writeText(report.body_markdown)} className="rounded-md border border-line px-2.5 py-1 text-fg hover:bg-surface3">Copy</button>
          </div>
        </div>
      )}
    </div>
  );
};
