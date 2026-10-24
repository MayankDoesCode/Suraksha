import { analyzeSocialCandidate } from './socialEngine';
import { runFullLookalikeAnalysis } from './lookalikeEngine';
import type { BrandProfile } from '../types';

/**
 * Browser-side answer for the copilot when the backend cannot be reached: pulls a handle or domain out of the message
 * and scores it with the same engines the workspace uses. Returns null when the message names nothing to check.
 */
const deobfuscate = (s: string) => s.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/[1|]/g, 'l').replace(/0/g, 'o');

export interface QuickCheck {
  target: string;
  kind: 'Social handle' | 'Domain';
  level: string;
  score: number;
  reasons: string[];
}

export function extractTarget(message: string): string | null {
  const handle = message.match(/(^|\s)(@[A-Za-z0-9_.]{2,30})/);
  if (handle) return handle[2];
  const url = message.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/?#]\S*)?/i);
  return url ? url[1].toLowerCase() : null;
}

export function quickCheck(message: string, brand: BrandProfile): QuickCheck | null {
  const target = extractTarget(message);
  if (!target) return null;
  try {
    if (target.startsWith('@')) {
      const official = (brand.officialSocialUrls?.[0]?.handle || '').toLowerCase();
      const r = analyzeSocialCandidate({ name: deobfuscate(target.slice(1).toLowerCase()).replace(/[_.]+/g, ' '), username: target, platform: 'X', url: `https://x.com/${target.slice(1)}`, bio: '', followerCount: 0, creationDate: '' } as any, brand);
      const reasons = (r.signals || []).map((s: any) => s.title as string);
      let score = r.heuristicScore; let level = String(r.riskCategory);
      if (official && deobfuscate(target.toLowerCase()) === official && target.toLowerCase() !== official) {
        reasons.unshift(`Reads as ${official} once look-alike letters are normalised`);
        score = Math.max(score, 78); if (!/crit|high/i.test(level)) level = 'High';
      }
      return { target, kind: 'Social handle', level, score, reasons };
    }
    const r = runFullLookalikeAnalysis(target.replace(/\..*$/, ''), target, brand, '');
    return { target, kind: 'Domain', level: String(r.overallRiskCategory), score: r.overallScore, reasons: (r.signals || []).map((s: any) => s.title as string) };
  } catch {
    return null;
  }
}
