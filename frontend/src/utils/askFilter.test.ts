import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesAsk, parseAsk } from './askFilter.ts';

const NOW = Date.parse('2026-10-19T12:00:00Z');
const row = (over: Record<string, unknown> = {}) =>
  ({ title: 'Acme Wallet Recovery', identifier: 'acme-wallet-recovery.xyz', platform: 'web', summary: 'credential trap', type: 'domain',
     riskCategory: 'Critical', status: 'New', createdDate: '2026-10-17T12:00:00Z', ...over }) as any;

test('severity, type and status words become filters and chips', () => {
  const r = parseAsk('critical or high domains that are unreviewed');
  assert.deepEqual(r.filters.severity, ['Critical', 'High']);
  assert.deepEqual(r.filters.type, ['domain']);
  assert.deepEqual(r.filters.status, ['New']);
  assert.ok(r.chips.includes('type: domain'));
  assert.deepEqual(r.filters.text, []);
});

test('"severe" means critical and high', () => {
  assert.deepEqual(parseAsk('severe findings').filters.severity, ['Critical', 'High']);
});

test('time phrases', () => {
  assert.equal(parseAsk('anything in the last 7 days').filters.maxAgeDays, 7);
  assert.equal(parseAsk('past 2 weeks').filters.maxAgeDays, 14);
  assert.equal(parseAsk('older than 30 days').filters.minAgeDays, 30);
  assert.equal(parseAsk('today').filters.maxAgeDays, 1);
});

test('open means not dismissed; dismissed is a status', () => {
  assert.equal(parseAsk('open social profiles').filters.notDismissed, true);
  assert.deepEqual(parseAsk('false positives').filters.status, ['Dismissed']);
});

test('leftover words become text terms, short ones are reported as ignored', () => {
  const r = parseAsk('critical wallet xx');
  assert.deepEqual(r.filters.text, ['wallet']);
  assert.deepEqual(r.ignored, ['xx']);
});

test('nothing is invented from unrecognised input', () => {
  const r = parseAsk('zebra');
  assert.deepEqual(r.filters, { text: ['zebra'] });
});

test('matching applies every filter', () => {
  const f = parseAsk('critical domains in the last 7 days wallet').filters;
  assert.equal(matchesAsk(row(), f, 0, NOW), true);
  assert.equal(matchesAsk(row({ riskCategory: 'Low' }), f, 0, NOW), false);
  assert.equal(matchesAsk(row({ type: 'social' }), f, 0, NOW), false);
  assert.equal(matchesAsk(row({ createdDate: '2026-09-01T00:00:00Z' }), f, 0, NOW), false);
  assert.equal(matchesAsk(row({ title: 'Other', identifier: 'other.com', summary: '' }), f, 0, NOW), false);
});

test('linked requires observed links; bad dates fail time filters', () => {
  const f = parseAsk('linked').filters;
  assert.equal(matchesAsk(row(), f, 0, NOW), false);
  assert.equal(matchesAsk(row(), f, 2, NOW), true);
  assert.equal(matchesAsk(row({ createdDate: 'nonsense' }), parseAsk('today').filters, 0, NOW), false);
});
