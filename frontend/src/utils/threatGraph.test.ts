import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveThreatGraph, hostOf, trigramSimilarity } from './threatGraph.ts';

// Minimal synthetic findings: only the fields the graph reads.
const f = (id: string, over: Record<string, unknown> = {}) =>
  ({
    id, type: 'domain', title: `Finding ${id}`, identifier: `unrelated-${id}-zzzz.example`, platform: 'x', url: '',
    description: '', evidence: '', summary: '', evidenceSupporting: [], riskCategory: 'High', status: 'New',
    statusHistory: [], analystNotes: [], createdDate: '2026-10-01T00:00:00Z', ...over,
  }) as any;

test('every finding is linked to the brand as an observed relationship', () => {
  const { nodes, edges } = deriveThreatGraph([f('a'), f('b')], 'Acme');
  assert.equal(nodes.length, 3);
  const brandEdges = edges.filter((e) => e.kind === 'TARGETS_BRAND');
  assert.equal(brandEdges.length, 2);
  assert.ok(brandEdges.every((e) => e.basis === 'observed'));
});

test('unrelated findings get no relationship beyond the brand link', () => {
  const { edges } = deriveThreatGraph([f('a', { identifier: 'alpha-bakery.example' }), f('b', { identifier: 'zzz-tools.org' })], 'Acme');
  assert.deepEqual(edges.filter((e) => e.kind !== 'TARGETS_BRAND'), []);
});

test('explicit reference is observed and quotes the evidence', () => {
  const a = f('a', { evidence: 'Landing page directly linked to rogue handle @acme_support_claims in the bio.' });
  const b = f('b', { type: 'social', identifier: '@acme_support_claims' });
  const { edges } = deriveThreatGraph([a, b], 'Acme');
  const ref = edges.find((e) => e.kind === 'EXPLICIT_REFERENCE');
  assert.ok(ref);
  assert.equal(ref!.basis, 'observed');
  assert.match(ref!.evidence, /acme_support_claims/);
});

test('short identifiers are never treated as references', () => {
  const a = f('a', { evidence: 'mentions abc somewhere' });
  const b = f('b', { identifier: 'abc' });
  assert.equal(deriveThreatGraph([a, b], 'Acme').edges.filter((e) => e.kind === 'EXPLICIT_REFERENCE').length, 0);
});

test('same developer links app findings (star, not clique) and is observed', () => {
  const apps = ['a', 'b', 'c'].map((id) => f(id, { type: 'app', developer: 'Shady Apps Ltd', identifier: `com.shady.${id}.zz` }));
  const dev = deriveThreatGraph(apps, 'Acme').edges.filter((e) => e.kind === 'SHARED_DEVELOPER');
  assert.equal(dev.length, 2);
  assert.ok(dev.every((e) => e.basis === 'observed'));
});

test('shared platforms do not link findings, but a shared private host does', () => {
  const social = [f('a', { type: 'social', url: 'https://instagram.com/x1' }), f('b', { type: 'social', url: 'https://instagram.com/x2' })];
  assert.equal(deriveThreatGraph(social, 'Acme').edges.filter((e) => e.kind === 'SHARED_HOST').length, 0);
  const same = [f('a', { url: 'https://login.evil-host.example/a' }), f('b', { url: 'https://login.evil-host.example/b' })];
  assert.equal(deriveThreatGraph(same, 'Acme').edges.filter((e) => e.kind === 'SHARED_HOST').length, 1);
});

test('name similarity is inferred, carries a strength and is skipped when observed evidence exists', () => {
  const a = f('a', { identifier: 'acme-wallet-recovery.xyz' });
  const b = f('b', { identifier: 'acme-wallet-recovery.top' });
  const { edges } = deriveThreatGraph([a, b], 'Acme');
  const sim = edges.find((e) => e.kind === 'SIMILAR_NAME');
  assert.ok(sim);
  assert.equal(sim!.basis, 'inferred');
  assert.ok(sim!.strength! >= 0.6 && sim!.strength! <= 1);
  assert.match(sim!.evidence, /coincidence/);

  const linked = [f('a', { identifier: 'acme-wallet-recovery.xyz', developer: 'Same Dev' }), f('b', { identifier: 'acme-wallet-recovery.top', developer: 'Same Dev' })];
  assert.equal(deriveThreatGraph(linked, 'Acme').edges.filter((e) => e.kind === 'SIMILAR_NAME').length, 0);
});

test('dismissed findings are hidden unless requested', () => {
  const list = [f('a'), f('b', { status: 'Dismissed' })];
  assert.equal(deriveThreatGraph(list, 'Acme').nodes.length, 2);
  assert.equal(deriveThreatGraph(list, 'Acme', { includeDismissed: true }).nodes.length, 3);
});

test('helpers', () => {
  assert.equal(hostOf('https://www.Example.com/x'), 'example.com');
  assert.equal(hostOf('nonsense'), null);
  assert.equal(trigramSimilarity('abcdef', 'abcdef'), 1);
  assert.equal(trigramSimilarity('abcdef', 'uvwxyz'), 0);
});
