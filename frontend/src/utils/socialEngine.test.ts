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
  id: 'brand-apexpay-001',
  brandName: 'ApexPay',
  officialWebsite: 'https://apexpay.com',
  officialDomains: ['apexpay.com', 'apexpay.io'],
  officialSocialUrls: [
    {
      id: 'soc-01',
      platform: 'Twitter / X',
      handle: '@apexpay_official',
      url: 'https://x.com/apexpay_official',
      verificationStatus: 'verified_platform',
      notes: 'Verified Organization Gold Badge',
    },
    {
      id: 'soc-02',
      platform: 'Instagram',
      handle: '@apexpay.fintech',
      url: 'https://instagram.com/apexpay.fintech',
      verificationStatus: 'verified_platform',
    },
  ],
};

describe('Social Media Monitor - URL Normalization & Handle Extraction', () => {
  test('normalizeSocialUrl handles standard X/Twitter variants', () => {
    assert.strictEqual(normalizeSocialUrl('https://x.com/apexpay_official'), 'x.com/apexpay_official');
    assert.strictEqual(normalizeSocialUrl('https://x.com/apexpay_official/'), 'x.com/apexpay_official');
    assert.strictEqual(normalizeSocialUrl('https://twitter.com/ApexPay_Official'), 'x.com/apexpay_official');
    assert.strictEqual(normalizeSocialUrl('http://mobile.twitter.com/apexpay_official/'), 'x.com/apexpay_official');
    assert.strictEqual(normalizeSocialUrl('https://www.x.com/@apexpay_official'), 'x.com/apexpay_official');
    assert.strictEqual(normalizeSocialUrl('https://x.com/apexpay_official?ref_src=twsrc'), 'x.com/apexpay_official');
  });

  test('extractHandleFromUrl extracts handle from X/Twitter URLs', () => {
    assert.strictEqual(extractHandleFromUrl('https://x.com/Microsoft'), 'microsoft');
    assert.strictEqual(extractHandleFromUrl('https://twitter.com/@apexpay_official/'), 'apexpay_official');
    assert.strictEqual(extractHandleFromUrl('https://mobile.twitter.com/ApexPay_Official'), 'apexpay_official');
  });
});

describe('Social Media Monitor - Official Profile URL Mismatch Regression Tests', () => {
  test('REGRESSION: @apexpay_official paired with https://x.com/Microsoft is NOT exempt and flagged as conflict', () => {
    const candidate: SocialCandidateInput = {
      name: 'ApexPay Official',
      username: '@apexpay_official',
      platform: 'X',
      url: 'https://x.com/Microsoft',
      bio: 'The official handle for ApexPay Global.',
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

  test('LEGITIMATE: @apexpay_official paired with matching official URL https://x.com/apexpay_official is allowlisted', () => {
    const candidate: SocialCandidateInput = {
      name: 'ApexPay Official',
      username: '@apexpay_official',
      platform: 'X',
      url: 'https://x.com/apexpay_official',
      bio: 'The official handle for ApexPay Global.',
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

  test('LEGITIMATE EQUIVALENT: @apexpay_official paired with https://twitter.com/apexpay_official/ is allowlisted', () => {
    const candidate: SocialCandidateInput = {
      name: 'ApexPay Official',
      username: '@apexpay_official',
      platform: 'X',
      url: 'https://twitter.com/ApexPay_Official/',
      bio: 'The official handle for ApexPay Global.',
      followerCount: '148500',
    };

    const result = analyzeSocialCandidate(candidate, MOCK_BRAND_PROFILE);

    assert.strictEqual(result.isExactOfficialMatch, true, 'Twitter domain alias must match');
    assert.strictEqual(result.riskCategory, 'Low');
    assert.strictEqual(result.heuristicScore, 0);
    assert.strictEqual(result.recommendedAction, 'Mark Benign & Allowlist');
  });

  test('LEGITIMATE EQUIVALENT: @apexpay_official with mobile.twitter.com and www variants', () => {
    const candidate: SocialCandidateInput = {
      name: 'ApexPay Official',
      username: '@apexpay_official',
      platform: 'X',
      url: 'https://mobile.twitter.com/apexpay_official',
      bio: 'The official handle for ApexPay Global.',
      followerCount: '148500',
    };

    const result = analyzeSocialCandidate(candidate, MOCK_BRAND_PROFILE);
    assert.strictEqual(result.isExactOfficialMatch, true);
    assert.strictEqual(result.riskCategory, 'Low');
  });
});
