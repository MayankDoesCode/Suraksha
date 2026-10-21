import type { CandidateAsset, RiskLevel } from '../types';

const LEVELS: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const level = (s: string): RiskLevel => LEVELS.find((l) => l.toUpperCase() === String(s).toUpperCase()) || 'Low';
const label = (s: string) => s.toLowerCase().split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');

/** Turns a live-scan hit (from /social/monitor or /apps/monitor) into a finding for the triage workflow. */
export function hitToCandidate(kind: 'social' | 'app', h: any): Partial<CandidateAsset> {
  const signals: string[] = (h.signals || []).map(label);
  const base = {
    riskCategory: level(h.severity),
    evidenceSupporting: signals.map((s) => `Signal: ${s}`),
    analysisEngine: 'Live scan (public sources) + rule-based detector',
    missingInformation: [
      'Account or listing history, creation date and ownership have not been verified',
      'A public search hit is a lead, not proof of impersonation',
    ],
  };
  if (kind === 'social') {
    return {
      ...base,
      type: 'social',
      title: h.display_name ? `${h.display_name} (${h.handle})` : h.handle,
      identifier: h.handle,
      platform: h.platform,
      url: h.profile_url || '',
      summary: `Found by live ${h.platform} search. Score ${h.score}/100 from ${signals.length} signal(s).`,
      recommendedNextSteps: ['Open the profile and compare it with the verified accounts', 'If impersonation is confirmed, report it to the platform with this evidence'],
    };
  }
  return {
    ...base,
    type: 'app',
    title: h.title,
    identifier: h.package_id || h.title,
    platform: h.store || h.platform,
    developer: h.publisher || undefined,
    url: h.listing_url || '',
    summary: `Found by live ${h.store || h.platform} search. Score ${h.score}/100 from ${signals.length} signal(s).`,
    recommendedNextSteps: ['Compare the publisher and package id with the verified apps', 'If it is a rogue listing, file a store takedown with this evidence'],
  };
}
