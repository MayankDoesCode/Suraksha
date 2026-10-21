import React from 'react';
import { Download, FileText } from 'lucide-react';
import { BrandReport } from '../components/BrandReport';
import { useApp } from '../context/AppContext';
import type { CandidateAsset } from '../types';
import { FindingsTable } from '../components/FindingsTable';
import { exportCandidatesToCSV } from '../utils/csvExport';

export const ReportsView: React.FC = () => {
  const { candidates, brandProfile, setSelectedCandidateId, isDemoMode, setActiveTab } = useApp();
  const [showReport, setShowReport] = React.useState(false);
  const [visible, setVisible] = React.useState<CandidateAsset[]>(candidates);

  // The export contains exactly the rows currently matching the filters, in the order shown.
  // csvExport drops synthetic demo rows outside demo mode, so the count shown can differ from the file.
  const exportable = isDemoMode ? visible : visible.filter((c) => !c.isFictionalDemo);
  const filtered = visible.length !== candidates.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fgMuted">
          {candidates.length} finding{candidates.length === 1 ? '' : 's'} for <span className="text-fg">{brandProfile.brandName || 'this brand'}</span>.
          Click a row to open its evidence and set a status.
        </p>
        <button onClick={() => setShowReport(true)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-fg hover:bg-surface2">
          <FileText className="h-4 w-4" /> Brand report (PDF)
        </button>
        <button
          onClick={() => exportCandidatesToCSV(visible, brandProfile.brandName, isDemoMode)}
          disabled={exportable.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-onAccent hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export {exportable.length} {filtered ? 'filtered ' : ''}finding{exportable.length === 1 ? '' : 's'} (CSV)
        </button>
      </div>

      {showReport && <BrandReport onClose={() => setShowReport(false)} />}

      <FindingsTable
        candidates={candidates}
        onSelect={setSelectedCandidateId}
        onVisibleChange={setVisible}
        emptyMessage={
          <>
            No findings yet. <button onClick={() => setActiveTab('lookalike-engine')} className="text-accent hover:underline">Assess a domain</button> to create the first one.
          </>
        }
      />
    </div>
  );
};

export default ReportsView;
