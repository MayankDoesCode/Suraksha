import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadWorkspaceState } from './workspaceInit.ts';

const DEMO = ['demo'];
const EMPTY: string[] = [];
const isArr = (v: unknown) => Array.isArray(v);

test('the demo user gets demo data', () => {
  assert.deepEqual(loadWorkspaceState(true, null, DEMO, EMPTY, isArr), DEMO);
});

test('a real user with nothing saved starts EMPTY, never with demo data', () => {
  assert.deepEqual(loadWorkspaceState(false, null, DEMO, EMPTY, isArr), EMPTY);
});

test('a real user gets their own saved state back', () => {
  assert.deepEqual(loadWorkspaceState(false, JSON.stringify(['mine']), DEMO, EMPTY, isArr), ['mine']);
});

test('corrupt or invalid saved state falls back to EMPTY, not demo', () => {
  assert.deepEqual(loadWorkspaceState(false, '{not json', DEMO, EMPTY, isArr), EMPTY);
  assert.deepEqual(loadWorkspaceState(false, JSON.stringify({ a: 1 }), DEMO, EMPTY, isArr), EMPTY);
});
