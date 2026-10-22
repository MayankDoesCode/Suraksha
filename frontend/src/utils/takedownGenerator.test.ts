import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  generateTakedownNotice,
  formatAsEML,
  createMailtoLink,
  ABUSE_PORTALS,
} from './takedownGenerator.ts';
import type { CandidateAsset, BrandProfile } from '../types/index.ts';

const dummyBrand: BrandProfile = {
  id: 'brand-1',
  brandName: 'Acme Bank',
  officialWebsite: 'https://acmebank.com',
  officialDomains: ['acmebank.com'],
  officialSocialUrls: [],
  officialApps: [],
  authorizedPartners: [],
  brandDescription: 'Financial Services',
  protectedKeywords: ['acme', 'bank'],
  lastUpdated: '2026-10-20',
};

const dummyDomainFinding: CandidateAsset = {
  id: 'find-101',
  type: 'domain',
  title: 'Acme Bank Phishing Portal',
  identifier: 'acme-login-secure.xyz',
  platform: 'web',
  url: 'https://acme-login-secure.xyz/login',
  description: 'Deceptive credential harvesting portal',
  evidence: 'UTS #39 lookalike domain with login form',
  riskCategory: 'Critical',
  summary: 'Active credential trap targeting banking customers',
  evidenceSupporting: [
    'Domain contains sensitive keyword "login"',
    'Typo distance of 1 from official domain',
    'Self-signed TLS certificate detected',
  ],
  evidenceAgainst: [],
  missingInformation: [],
  recommendedNextSteps: ['Issue immediate registrar takedown notice'],
  status: 'Confirmed Suspicious',
  statusHistory: [],
  analystNotes: [],
  createdDate: '2026-10-21T10:00:00Z',
  isFictionalDemo: true, // test client generation fallback
};

const dummySocialFinding: CandidateAsset = {
  id: 'find-102',
  type: 'social',
  title: 'Acme HelpDesk Official',
  identifier: '@acme_support247',
  platform: 'Twitter',
  url: 'https://x.com/acme_support247',
  description: 'Fake customer service bot soliciting OTPs',
  evidence: 'Authority token "support" with fake badge',
  riskCategory: 'High',
  summary: 'Interception risk for customer support queries',
  evidenceSupporting: ['Directing users to unverified Telegram chat for refund processing'],
  evidenceAgainst: [],
  missingInformation: [],
  recommendedNextSteps: ['File impersonation complaint on X'],
  status: 'Investigating',
  statusHistory: [],
  analystNotes: [],
  createdDate: '2026-10-21T11:00:00Z',
  isFictionalDemo: true,
};

test('generates domain registrar takedown notice with evidence manifest and requested action', async () => {
  const draft = await generateTakedownNotice({
    candidate: dummyDomainFinding,
    brandProfile: dummyBrand,
    noticeType: 'registrar',
    analystName: 'Jane SOC',
    abuseEmail: 'abuse@nameserver.test',
  });

  assert.equal(draft.noticeType, 'registrar');
  assert.equal(draft.to, 'abuse@nameserver.test');
  assert.ok(draft.subject.includes('acme-login-secure.xyz'));
  assert.ok(draft.body.includes('Acme Bank'));
  assert.ok(draft.body.includes('ICANN Registrar Accreditation Agreement'));
  assert.ok(draft.body.includes('Domain contains sensitive keyword "login"'));
  assert.ok(draft.body.includes('Jane SOC'));
  assert.ok(draft.body.includes('Evidence Manifest SHA-256:'));
});

test('generates social platform impersonation notice with trust & safety citations', async () => {
  const draft = await generateTakedownNotice({
    candidate: dummySocialFinding,
    brandProfile: dummyBrand,
    noticeType: 'platform',
    analystName: 'Alex Lead',
    trademarkReg: 'USPTO #97123456',
  });

  assert.equal(draft.noticeType, 'platform');
  assert.ok(draft.body.includes('@acme_support247'));
  assert.ok(draft.body.includes('Impersonation and Phishing policies'));
  assert.ok(draft.body.includes('USPTO #97123456'));
});

test('formats valid RFC 822 EML string with headers', async () => {
  const draft = await generateTakedownNotice({
    candidate: dummyDomainFinding,
    brandProfile: dummyBrand,
    noticeType: 'registrar',
    abuseEmail: 'abuse@registrar.org',
  });

  const eml = formatAsEML(draft);
  assert.ok(eml.startsWith('Subject:'));
  assert.ok(eml.includes('To: abuse@registrar.org'));
  assert.ok(eml.includes('X-Suraksha-Draft: not-sent'));
  assert.ok(eml.includes('MIME-Version: 1.0'));
});

test('generates valid mailto URI', async () => {
  const draft = await generateTakedownNotice({
    candidate: dummyDomainFinding,
    brandProfile: dummyBrand,
    noticeType: 'registrar',
    abuseEmail: 'abuse@host.com',
  });

  const mailto = createMailtoLink(draft);
  assert.ok(mailto.startsWith('mailto:abuse@host.com?'));
  assert.ok(mailto.includes('subject='));
  assert.ok(mailto.includes('body='));
});

test('contains authoritative reporting portals for domain, social and mobile app vectors', () => {
  const domainPortals = ABUSE_PORTALS.filter((p) => p.category === 'domain');
  const socialPortals = ABUSE_PORTALS.filter((p) => p.category === 'social');
  const appPortals = ABUSE_PORTALS.filter((p) => p.category === 'app');

  assert.ok(domainPortals.length >= 3);
  assert.ok(socialPortals.length >= 2);
  assert.ok(appPortals.length >= 2);
  assert.ok(domainPortals.some((p) => p.name.includes('Google Safe Browsing')));
  assert.ok(socialPortals.some((p) => p.name.includes('Twitter') || p.name.includes('X')));
  assert.ok(appPortals.some((p) => p.name.includes('Google Play')));
});
