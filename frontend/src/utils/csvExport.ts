import type { CandidateAsset } from '../types';

export function exportCandidatesToCSV(candidates: CandidateAsset[], brandName: string) {
  const headers = [
    'Candidate ID',
    'Asset Title',
    'Identifier',
    'Asset Type',
    'Platform / Store',
    'Risk Category',
    'Investigation Status',
    'Summary Assessment',
    'Supporting Evidence',
    'Mitigating / Benign Evidence',
    'Missing Information',
    'Recommended Next Steps',
    'Analyst Notes Count',
    'Created Date',
  ];

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = candidates.map(c => [
    escapeCSV(c.id),
    escapeCSV(c.title),
    escapeCSV(c.identifier),
    escapeCSV(c.type),
    escapeCSV(c.platform),
    escapeCSV(c.riskCategory),
    escapeCSV(c.status),
    escapeCSV(c.summary),
    escapeCSV(c.evidenceSupporting.join('; ')),
    escapeCSV(c.evidenceAgainst.join('; ')),
    escapeCSV(c.missingInformation.join('; ')),
    escapeCSV(c.recommendedNextSteps.join('; ')),
    escapeCSV(c.analystNotes.length),
    escapeCSV(c.createdDate),
  ]);

  const csvContent = [
    `# Suraksha — AI-Powered Digital Brand Protection Report - Monitored Brand: ${brandName}`,
    `# Exported: ${new Date().toISOString()}`,
    `# Note: Digital Risk Protection Finding Archive - Confidential Security Report`,
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const filename = `suraksha-${brandName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-threat-findings-${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
