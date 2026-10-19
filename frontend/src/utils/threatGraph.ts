import type { AssetType, CandidateAsset, InvestigationStatus, RiskLevel } from '../types';

/**
 * Builds the relationship graph from the findings themselves. Nothing is stored or invented:
 * every edge says why it exists and whether it was OBSERVED in the finding data or only INFERRED.
 *
 * Observed edges (a fact in the data):
 *   TARGETS_BRAND      the finding was recorded against this brand
 *   EXPLICIT_REFERENCE one finding's recorded evidence names the other finding's identifier
 *   SHARED_DEVELOPER   two app findings list the same developer string
 *   SHARED_HOST        two findings resolve to the same web host (shared platforms excluded)
 * Inferred edges (a guess, shown dashed with a strength):
 *   SIMILAR_NAME       the identifiers are lexically similar and nothing observed connects them
 */
export type EdgeKind = 'TARGETS_BRAND' | 'EXPLICIT_REFERENCE' | 'SHARED_DEVELOPER' | 'SHARED_HOST' | 'SIMILAR_NAME';

export interface GraphNode {
  id: string;
  kind: 'brand' | 'finding';
  label: string;
  sub?: string;
  candidateId?: string;
  risk?: RiskLevel;
  type?: AssetType;
  status?: InvestigationStatus;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  basis: 'observed' | 'inferred';
  label: string;
  evidence: string;
  strength?: number; // inferred edges only, 0-1
  observedAt?: string;
}

export const EDGE_LABEL: Record<EdgeKind, string> = {
  TARGETS_BRAND: 'Recorded against brand',
  EXPLICIT_REFERENCE: 'Explicitly referenced',
  SHARED_DEVELOPER: 'Same developer',
  SHARED_HOST: 'Same host',
  SIMILAR_NAME: 'Similar name (inferred)',
};

// Hosts that many unrelated accounts share, so sharing one proves nothing.
const SHARED_PLATFORMS = new Set([
  'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 't.me',
  'telegram.org', 'play.google.com', 'apps.apple.com', 'github.com', 'medium.com', 'reddit.com', 'google.com',
]);
const MIN_REFERENCE_LENGTH = 5;
const SIMILARITY_THRESHOLD = 0.6;
const MAX_SIMILAR_PER_NODE = 2;

const norm = (s: string) => (s || '').toLowerCase().replace(/^@/, '').trim();
const compact = (s: string) => norm(s).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[^a-z0-9]/g, '');

export function hostOf(value: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const x = trigrams(a);
  const y = trigrams(b);
  if (!x.size || !y.size) return 0;
  let inter = 0;
  x.forEach((t) => y.has(t) && inter++);
  return inter / (x.size + y.size - inter);
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function deriveThreatGraph(
  candidates: CandidateAsset[],
  brandName: string,
  opts: { includeDismissed?: boolean } = {},
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const items = candidates.filter((c) => opts.includeDismissed || c.status !== 'Dismissed');
  const nodes: GraphNode[] = [{ id: 'brand', kind: 'brand', label: brandName || 'Brand' }];
  const edges: GraphEdge[] = [];
  const connected = new Set<string>(); // pairs already joined by an observed edge
  const add = (e: Omit<GraphEdge, 'id'>) => edges.push({ ...e, id: `${e.kind}:${e.source}:${e.target}` });
  const nid = (c: CandidateAsset) => `f:${c.id}`;

  for (const c of items) {
    nodes.push({ id: nid(c), kind: 'finding', label: c.title, sub: c.identifier, candidateId: c.id, risk: c.riskCategory, type: c.type, status: c.status });
    add({ source: 'brand', target: nid(c), kind: 'TARGETS_BRAND', basis: 'observed', label: EDGE_LABEL.TARGETS_BRAND,
      evidence: `Recorded as a finding for ${brandName || 'this brand'}.`, observedAt: c.createdDate });
  }

  // EXPLICIT_REFERENCE: A's own recorded text names B's identifier.
  for (const a of items) {
    const hay = [a.summary, a.evidence, a.description, ...(a.evidenceSupporting || [])].join(' \n ').toLowerCase();
    for (const b of items) {
      if (a.id === b.id) continue;
      const needle = norm(b.identifier);
      if (needle.length < MIN_REFERENCE_LENGTH) continue;
      const at = hay.indexOf(needle);
      if (at < 0) continue;
      const key = pairKey(a.id, b.id);
      const snippet = hay.slice(Math.max(0, at - 40), at + needle.length + 40).replace(/\s+/g, ' ').trim();
      add({ source: nid(a), target: nid(b), kind: 'EXPLICIT_REFERENCE', basis: 'observed', label: EDGE_LABEL.EXPLICIT_REFERENCE,
        evidence: `Evidence for "${a.title}" mentions "${b.identifier}": …${snippet}…`, observedAt: a.createdDate });
      connected.add(key);
    }
  }

  // SHARED_DEVELOPER and SHARED_HOST: group, then link each member to the first (a star, not a clique).
  const groupLink = (groups: Map<string, CandidateAsset[]>, kind: 'SHARED_DEVELOPER' | 'SHARED_HOST', what: string) => {
    groups.forEach((members, value) => {
      if (members.length < 2) return;
      const [first, ...rest] = members;
      for (const m of rest) {
        add({ source: nid(first), target: nid(m), kind, basis: 'observed', label: EDGE_LABEL[kind],
          evidence: `Both findings have the same ${what}: ${value}.`, observedAt: m.createdDate });
        connected.add(pairKey(first.id, m.id));
      }
    });
  };
  const byDeveloper = new Map<string, CandidateAsset[]>();
  const byHost = new Map<string, CandidateAsset[]>();
  for (const c of items) {
    const dev = norm(c.developer || '');
    if (dev) byDeveloper.set(dev, [...(byDeveloper.get(dev) || []), c]);
    const host = hostOf(c.url) || (c.type === 'domain' ? hostOf(c.identifier) : null);
    if (host && !SHARED_PLATFORMS.has(host)) byHost.set(host, [...(byHost.get(host) || []), c]);
  }
  groupLink(byDeveloper, 'SHARED_DEVELOPER', 'developer');
  groupLink(byHost, 'SHARED_HOST', 'web host');

  // SIMILAR_NAME: inferred only, never between findings already connected by an observed edge.
  const perNode = new Map<string, number>();
  const candidatesPairs: { a: CandidateAsset; b: CandidateAsset; s: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (connected.has(pairKey(a.id, b.id))) continue;
      const s = trigramSimilarity(compact(a.identifier), compact(b.identifier));
      if (s >= SIMILARITY_THRESHOLD) candidatesPairs.push({ a, b, s });
    }
  }
  candidatesPairs.sort((x, y) => y.s - x.s);
  for (const { a, b, s } of candidatesPairs) {
    if ((perNode.get(a.id) || 0) >= MAX_SIMILAR_PER_NODE || (perNode.get(b.id) || 0) >= MAX_SIMILAR_PER_NODE) continue;
    perNode.set(a.id, (perNode.get(a.id) || 0) + 1);
    perNode.set(b.id, (perNode.get(b.id) || 0) + 1);
    add({ source: nid(a), target: nid(b), kind: 'SIMILAR_NAME', basis: 'inferred', label: EDGE_LABEL.SIMILAR_NAME,
      evidence: `Identifiers "${a.identifier}" and "${b.identifier}" are ${Math.round(s * 100)}% alike (character trigrams). No shared evidence was found; this may be coincidence.`,
      strength: Math.round(s * 100) / 100 });
  }

  return { nodes, edges };
}
