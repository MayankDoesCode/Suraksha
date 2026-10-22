import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSocialCandidate,
  normalizeSocialUrl,
  extractHandleFromUrl,
} from './socialEngine.ts';
import type { SocialCandidateInput } from './socialEngine.ts';
import type { BrandProfile } from '../types/index.ts';

const MOCK_BRAND_PROFILE: BrandProfile = {
  id: 'brand-sentinelpay-001',
  brandName: 'SentinelPay',
  officialWebsite: 'https://sentinelpay.com',
  officialDomains: ['sentinelpay.com', 'sentinelpay.io'],
  officialSocialUrls: [
    {
      id: 'soc-01',
      platform: 'Twitter / X',
      handle: '@sentinelpay_official',
      url: 'https://x.com/sentinelpay_official',
      verificationStatus: 'verified_platform',
      notes: 'Verified Organization Gold Badge',
    },
    {
      id: 'soc-02',
      platform: 'Instagram',
      handle: '@sentinelpay.fintech',
      url: 'https://instagram.com/sentinelpay.fintech',
      verificationStatus: 'verified_platform',
    },
  ],
};

describe('Social Media Monitor - URL Normalization & Handle Extraction', () => {
  test('normalizeSocialUrl handles standard X/Twitter variants', () => {
    assert.strictEqual(normalizeSocialUrl('https://x.com/sentinelpay_official'), 'x.com/sentinelpay_official');
    assert.strictEqual(normalizeSocialUrl('https://x.com/sentinelpay_official/'), 'x.com/sentinelpay_official');
    assert.strictEqual(normalizeSocialUrl('https://twitter.com/SentinelPay_Official'), 'x.com/sentinelpay_official');
    assert.strictEqual(normalizeSocialUrl('http://mobile.twitter.com/sentinelpay_official/'), 'x.com/sentinelpay_official');
    assert.strictEqual(normalizeSocialUrl('https://www.x.com/@sentinelpay_official'), 'x.com/sentinelpay_official');
    assert.strictEqual(normalizeSocialUrl('https://x.com/sentinelpay_official?ref_src=twsrc'), 'x.com/sentinelpay_official');
  });

  test('extractHandleFromUrl extracts handle from X/Twitter URLs', () => {
    assert.strictEqual(extractHandleFromUrl('https://x.com/Microsoft'), 'microsoft');
    assert.strictEqual(extractHandleFromUrl('https://twitter.com/@sentinelpay_official/'), 'sentinelpay_official');
    assert.strictEqual(extractHandleFromUrl('https://mobile.twitter.com/SentinelPay_Official'), 'sentinelpay_official');
  });
});

describe('Social Media Monitor - Official Profile URL Mismatch Regression Tests', () => {
  test('REGRESSION: @sentinelpay_official paired with https://x.com/Microsoft is NOT exempt and flagged as conflict', () => {
    const candidate: SocialCandidateInput = {
      name: 'SentinelPay Official',
      username: '@sentinelpay_official',
      platform: 'X',
      url: 'https://x.com/Microsoft',
      bio: 'The official handle for SentinelPay Global.',
      followerCount: '148500',
    };

    const result = analyzeSocialCandidate(candidate, MOCK_BRAND_PROFILE);

    // Must NOT be marked as an authentic official match
    assert.strictEqual(result.isExactOfficialMatch, false, 'Should not receive exact official match status');
    assert.notStrictEqual(result.recommendedAction, 'Mark Benign & Allowlist', 'Should not recommend allowlisting');
    assert.notStrictEqual(result.riskCategory, 'Low', 'Risk category must not be Low');

    // Must flag explicit identity/URL conflict signal
    const mismatchSignal = result.signals.find(s => s.type === 'OFFICIAL_IDENTITY_URL_MISMATCH');
    assert.ok(mismatchSignal, 'Must produce OFFICIAL_IDENTITY_URL_MISMATCH signal');
    assert.strictEqual(mismatchSignal?.severity, 'high');
    assert.match(mismatchSignal?.detail || '', /microsoft/i, 'Detail should mention the conflicting account');

    // Risk category must be at least High
    assert.strictEqual(result.riskCategory, 'High');
    assert.strictEqual(result.recommendedAction, 'Escalate to Brand Protection Investigation');
  });

  test('LEGITIMATE: @sentinelpay_official paired with matching official URL https://x.com/sentinelpay_official is allowlisted', () => {
    const candidate: SocialCandidateInput = {
      name: 'SentinelPay Official',
      username: '@sentinelpay_official',
      platform: 'X',
      url: 'https://x.com/sentinelpay_official',
      bio: 'The official handle for SentinelPay Global.',
      followerCount: '148500',
    };

    const result = analyzeSocialCandidate(candidate, MOCK_BRAND_PROFILE);

    assert.strictEqual(result.isExactOfficialMatch, true, 'Should be marked as exact official match');
    assert.strictEqual(result.riskCategory, 'Low', 'Risk category must be Low');
    assert.strictEqual(result.heuristicScore, 0, 'Heuristic score must be 0');
    assert.strictEqual(result.recommendedAction, 'Mark Benign & Allowlist');
    assert.strictEqual(result.signals.length, 1);
    assert.strictEqual(result.signals[0].type, 'OFFICIAL_REGISTERED_HANDLE');
  });

  test('LEGITIMATE EQUIVALENT: @sentinelpay_official paired with https://twitter.com/sentinelpay_official/ is allowlisted', () => {
    const candidate: SocialCandidateInput = {
      name: 'SentinelPay Official',
      username: '@sentinelpay_official',
      platform: 'X',
      url: 'https://twitter.com/SentinelPay_Official/',
      bio: 'The official handle for SentinelPay Global.',
      followerCount: '148500',
    };

    const result = analyzeSocialCandidate(candidate, MOCK_BRAND_PROFILE);

    assert.strictEqual(result.isExactOfficialMatch, true, 'Twitter domain alias must match');
    assert.strictEqual(result.riskCategory, 'Low');
    assert.strictEqual(result.heuristicScore, 0);
    assert.strictEqual(result.recommendedAction, 'Mark Benign & Allowlist');
  });

  test('LEGITIMATE EQUIVALENT: @sentinelpay_official with mobile.twitter.com and www variants', () => {
    const candidate: SocialCandidateInput = {
      name: 'SentinelPay Official',
      username: '@sentinelpay_official',
      platform: 'X',
      url: 'https://mobile.twitter.com/sentinelpay_official',
      bio: 'The official handle for SentinelPay Global.',
      followerCount: '148500',
    };

    const result = analyzeSocialCandidate(candidate, MOCK_BRAND_PROFILE);
    assert.strictEqual(result.isExactOfficialMatch, true);
    assert.strictEqual(result.riskCategory, 'Low');
  });
});


describe('no brand registered', () => {
  const noBrand = { id: 'x', brandName: '', officialWebsite: '', officialDomains: [], officialSocialUrls: [], officialApps: [], authorizedPartners: [], protectedKeywords: [], lastUpdated: '' } as unknown as BrandProfile;
  const cand = (over: Partial<SocialCandidateInput>): SocialCandidateInput => ({ name: 'Garden Tips', username: '@garden_tips_daily', platform: 'X', url: 'https://x.com/garden_tips_daily', bio: 'Plants and soil.', ...over });

  test('a harmless account is not called critical just because no brand exists to compare against', () => {
    const r = analyzeSocialCandidate(cand({}), noBrand);
    assert.equal(r.riskCategory, 'Low');
    assert.ok(!r.signals.some((s) => s.type === 'UNREGISTERED_BRAND_DOMAIN'));
  });

  test('credential requests are still flagged with no brand', () => {
    const r = analyzeSocialCandidate(cand({ bio: 'Share your OTP and UPI PIN to claim your reward.' }), noBrand);
    assert.ok(['High', 'Critical'].includes(r.riskCategory));
  });
});

describe('Social Media Monitor - Brand Token and Support Mimicry Tests', () => {
  const acmeBrand: BrandProfile = {
    id: 'demo-brand',
    brandName: 'Acme Corp',
    officialWebsite: 'https://acme.com',
    officialDomains: ['acme.com'],
    officialSocialUrls: [
      {
        id: 'soc-acme-official',
        platform: 'X',
        handle: '@acmecorp',
        url: 'https://x.com/acmecorp',
        verificationStatus: 'verified_platform',
      }
    ],
    officialApps: [],
    authorizedPartners: [],
    protectedKeywords: ['Acme Corp', 'Acme'],
    lastUpdated: ''
  };

  test('flags fake support desk combining brand token with lure words and recovery claims as Critical/High', () => {
    const candidate: SocialCandidateInput = {
      name: 'Acme Support Desk',
      username: '@acme_support_claims',
      platform: 'X',
      url: 'https://social.example.invalid/acme_support_claims',
      bio: 'Official Acme support desk. Message us for account recovery, payment reversal, and wallet assistance.',
      followerCount: '186',
      observedBranding: 'Orange-and-black Acme-style shield icon and "Verified Acme Support"'
    };

    const result = analyzeSocialCandidate(candidate, acmeBrand);
    assert.notStrictEqual(result.riskCategory, 'Low');
    assert.ok(result.heuristicScore >= 70, `Expected score >= 70, got ${result.heuristicScore}`);
    assert.ok(result.signals.some(s => s.type === 'BRAND_LURE_COMPOUND'));
    assert.ok(result.signals.some(s => s.type === 'UNREGISTERED_OFFICIAL_CLAIM'));
    assert.ok(result.signals.some(s => s.type === 'UNMONITORED_COMMUNICATION_LURE'));
  });
});
