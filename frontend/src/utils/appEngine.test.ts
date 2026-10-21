import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAppCandidate, similarity } from './appEngine.ts';
import { hashFromGray, hashSimilarity } from './imageHash.ts';
import type { BrandProfile } from '../types/index.ts';

const brand = {
  id: 'b1', brandName: 'Acme Bank', officialWebsite: '', officialDomains: ['acmebank.com'], officialSocialUrls: [],
  officialApps: [{ name: 'Acme Bank', developer: 'Acme Bank Ltd', store: 'Google Play Store', appId: 'com.acme.bank', verificationStatus: 'verified_store' }],
  authorizedPartners: [{ id: 'p1', name: 'VeriPay Hardware Solutions GmbH', websiteUrl: '', relationshipType: 'Hardware / POS Partner', authorizedMarks: '', verificationStatus: 'contract_verified', agreementReference: 'POS-998' }], brandDescription: 'Mobile banking: check balances, transfer money, pay bills and manage cards securely.',
  protectedKeywords: [], lastUpdated: '',
} as unknown as BrandProfile;

const run = (o: Partial<Parameters<typeof analyzeAppCandidate>[0]>) =>
  analyzeAppCandidate({ name: 'x', developer: 'Random Dev', store: 'Google Play Store', ...o }, brand);

describe('app engine', () => {
  test('excludes the official app and same-publisher apps', () => {
    assert.equal(run({ name: 'Acme Bank', developer: 'Acme Bank Ltd' }).isExcluded, true);
    assert.equal(run({ name: 'Anything', developer: 'x', packageId: 'com.acme.bank' }).isExcluded, true);
    assert.equal(run({ name: 'Acme Wallet', developer: 'Acme Bank Ltd' }).isExcluded, true);
  });
  test('does not trust the official name on an untrusted mirror', () => {
    const r = run({ name: 'Acme Bank', developer: 'Acme Bank Ltd', store: 'Third-Party APK Mirror' });
    assert.equal(r.isExcluded, false);
    assert.ok(['High', 'Critical'].includes(r.riskCategory));
  });
  for (const t of ['Acme Banking', 'AcmeBank Pro', 'Acme Bnak', 'Acme B4nk', 'Acme-Bank', 'Acme Bank Rewards', 'Acme Wallet', 'Acme Bank Secure Login']) {
    test(`flags look-alike title ${t}`, () => {
      const r = run({ name: t });
      assert.equal(r.isExcluded, false);
      assert.ok(r.signals.length > 0);
      assert.ok(['Medium', 'High', 'Critical'].includes(r.riskCategory), r.riskCategory);
    });
  }
  for (const t of ['Daily Yoga', 'Bank Calculator', 'River Bank Cafe', 'Pocket Budget', 'Tacoma Transit', 'Acorn Games']) {
    test(`does not flag normal app ${t}`, () => {
      const r = run({ name: t, description: 'Guided yoga sessions to stretch and relax.' });
      assert.equal(r.riskCategory, 'Low');
      assert.equal(r.signals.length, 0);
    });
  }
  test('authorized partner co-branding is mitigated, not flagged as impersonation', () => {
    const r = run({ name: 'Acme Bank POS Terminal Companion', developer: 'VeriPay POS Hardware Solutions GmbH' });
    assert.equal(r.riskCategory, 'Medium');
    assert.equal(r.signals.some(s => s.type === 'PUBLISHER_MISMATCH'), false);
    assert.ok(r.signals.some(s => s.type === 'AUTHORIZED_PARTNER'));
  });
  test('same name by another developer is critical', () => {
    assert.equal(run({ name: 'Acme Bank' }).riskCategory, 'Critical');
  });
  test('flags icon copies, package mimicry and brand-like descriptions', () => {
    const r = run({ name: 'Quick Cash Hub', packageId: 'com.acmebank.cash', logoSimilarity: 0.93, description: 'Acme Bank mobile banking: check balances, transfer money and pay bills.' });
    const types = r.signals.map(s => s.type);
    for (const t of ['ICON_SIMILARITY', 'PACKAGE_ID_MIMICRY', 'DESCRIPTION_SIMILARITY', 'PUBLISHER_MISMATCH']) assert.ok(types.includes(t), t);
    assert.ok(['High', 'Critical'].includes(r.riskCategory));
  });
  test('missing developer is reported, not treated as a mismatch', () => {
    const r = run({ name: 'Acme Wallet', developer: '' });
    assert.equal(r.signals.some(s => s.type === 'PUBLISHER_MISMATCH'), false);
    assert.match(r.missingInformation.join(' '), /Developer name not provided/);
  });
  test('similarity handles swaps, leet and homoglyphs', () => {
    assert.ok(similarity('Acme Bnak', 'Acme Bank') > 0.8);
    assert.equal(similarity('4cme B4nk', 'Acme Bank'), 1);
    assert.equal(similarity('аcme bank', 'Acme Bank'), 1);
  });
});

describe('perceptual hash', () => {
  const grad = (n: number, f: (x: number, y: number) => number) => Array.from({ length: n }, (_, i) => f(i % 17, Math.floor(i / 17)));
  test('is stable for brightness shifts and different for other art', () => {
    const big = grad(17 * 16, (x, y) => (x * 9 + y * 3) % 255);
    const tiny = grad(16 * 16, (x, y) => ((x * 16) + y * 4) % 255);
    const a = hashFromGray(big, tiny);
    const b = hashFromGray(big.map(v => Math.min(255, v * 0.6 + 40)), tiny.map(v => Math.min(255, v * 0.6 + 40)));
    const other = hashFromGray(grad(17 * 16, (x, y) => ((x * y) * 7) % 255), grad(16 * 16, (x, y) => ((x ^ y) * 31) % 255));
    assert.ok(hashSimilarity(a, b) > 0.95);
    assert.ok(hashSimilarity(a, other) < 0.8);
  });
});


describe('brand-independent checks', () => {
  const noBrand = { id: 'x', brandName: '', officialWebsite: '', officialDomains: [], officialSocialUrls: [], officialApps: [], authorizedPartners: [], protectedKeywords: [], lastUpdated: '' } as unknown as BrandProfile;
  const go = (o: Partial<Parameters<typeof analyzeAppCandidate>[0]>) => analyzeAppCandidate({ name: 'Paytm Cashback Pro', developer: 'Unknown Rewards Technologies', store: 'Google Play Store', ...o }, noBrand);

  test('a listing that asks for a UPI PIN is flagged even with no brand registered', () => {
    const r = go({ description: 'Earn ₹5,000 cashback instantly. Verify your bank account and enter your UPI PIN to claim your reward.' });
    assert.ok(['High', 'Critical'].includes(r.riskCategory));
    assert.ok(r.signals.some((s) => s.type === 'CREDENTIAL_REQUEST'));
    assert.ok(r.signals.some((s) => s.type === 'CASH_REWARD_LURE'));
  });

  test('with no brand and nothing suspicious the verdict says it cannot judge, not that it is low risk', () => {
    const r = go({ name: 'Weather Today', description: 'Daily forecast.' });
    assert.match(r.summary, /not enough to judge/i);
    assert.ok(r.missingInformation.some((m) => /no brand is registered/i.test(m)));
  });

  test('a reviewer note that the app copies a brand is recorded as a human observation', () => {
    const r = go({ description: 'Daily forecast.', observedBranding: 'Copies Paytm branding and colors' });
    assert.ok(r.signals.some((s) => s.type === 'REPORTED_BRAND_COPY'));
  });
});
