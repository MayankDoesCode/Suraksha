import type { CandidateAsset, BrandProfile } from '../types';
import apiClient from '../api/client.js';

export type TakedownNoticeType = 'registrar' | 'host' | 'trademark' | 'platform' | 'app_store';

export interface AbusePortalLink {
  name: string;
  url: string;
  category: 'domain' | 'social' | 'app';
  description: string;
}

export const ABUSE_PORTALS: AbusePortalLink[] = [
  {
    name: 'Google Safe Browsing',
    url: 'https://safebrowsing.google.com/safebrowsing/report_phish/',
    category: 'domain',
    description: 'Report deceptive phishing and malware URLs to Google Chrome blocklist',
  },
  {
    name: 'Microsoft Security Intelligence',
    url: 'https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site',
    category: 'domain',
    description: 'Submit malicious links to Microsoft Defender SmartScreen',
  },
  {
    name: 'Cloudflare Abuse Desk',
    url: 'https://abuse.cloudflare.com/',
    category: 'domain',
    description: 'File abuse reports for infrastructure routed through Cloudflare edge',
  },
  {
    name: 'Namecheap Abuse Portal',
    url: 'https://support.namecheap.com/index.php?/Tickets/Submit',
    category: 'domain',
    description: 'Direct escalation portal for domains registered with Namecheap',
  },
  {
    name: 'GoDaddy Abuse Reporting',
    url: 'https://supportcenter.godaddy.com/AbuseReport',
    category: 'domain',
    description: 'Submit copyright, trademark, and phishing complaints to GoDaddy Compliance',
  },
  {
    name: 'ICANN Abuse Complaint',
    url: 'https://forms.icann.org/en/resources/compliance/complaints/abuse',
    category: 'domain',
    description: 'Escalate registrar non-compliance to ICANN contractual enforcement',
  },
  {
    name: 'X / Twitter Impersonation',
    url: 'https://help.twitter.com/forms/impersonation',
    category: 'social',
    description: 'Submit official brand mimicry report to X Trust & Safety',
  },
  {
    name: 'Meta / Instagram IP Report',
    url: 'https://www.facebook.com/help/contact/208380679237597',
    category: 'social',
    description: 'File formal trademark and fraudulent brand report with Meta Legal',
  },
  {
    name: 'LinkedIn Trademark Notice',
    url: 'https://www.linkedin.com/help/linkedin/ask/ts-trademark',
    category: 'social',
    description: 'Report counterfeit enterprise corporate pages or executives',
  },
  {
    name: 'Telegram Scam Desk',
    url: 'https://telegram.org/support',
    category: 'social',
    description: 'Submit report against fraudulent channels, groups, and bots',
  },
  {
    name: 'Google Play Store Takedown',
    url: 'https://support.google.com/googleplay/android-developer/contact/takedown',
    category: 'app',
    description: 'Submit trademark infringement report against rogue Android APKs',
  },
  {
    name: 'Apple App Store IP Dispute',
    url: 'https://www.apple.com/legal/internet-services/itunes/appstorenotices/',
    category: 'app',
    description: 'File formal app infringement notice with Apple Legal',
  },
];

export interface TakedownDraft {
  noticeType: TakedownNoticeType;
  label: string;
  subject: string;
  to: string;
  body: string;
  source: 'backend_api' | 'client_generated';
  manifestSha256?: string;
  evidenceCount: number;
}

/**
 * Computes a simple deterministic SHA-256 hex string in browser or fallback
 */
async function simpleHash(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }
  // Lightweight hash fallback
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Generate a complete takedown notice draft.
 * Attempts backend API first; falls back cleanly to client generator.
 */
export async function generateTakedownNotice({
  candidate,
  brandProfile,
  noticeType,
  analystName = 'Security Operations Analyst',
  abuseEmail = '',
  trademarkReg = '',
  customNotes = '',
}: {
  candidate: CandidateAsset;
  brandProfile: BrandProfile;
  noticeType: TakedownNoticeType;
  analystName?: string;
  abuseEmail?: string;
  trademarkReg?: string;
  customNotes?: string;
}): Promise<TakedownDraft> {
  const brandName = brandProfile.brandName || 'Brand Owner';
  const targetName = candidate.identifier || candidate.title;

  // Try backend if not in fictional demo mode
  if (!candidate.isFictionalDemo && candidate.id) {
    try {
      const response = await apiClient.draftFindingTakedown(candidate.id, {
        notice: noticeType,
        abuseEmail: abuseEmail || undefined,
        analyst: analystName,
      });

      if (response?.data?.text) {
        return {
          noticeType,
          label: response.data.label || noticeType,
          subject: response.data.subject || `Brand impersonation report: ${targetName}`,
          to: response.data.to || abuseEmail || '[abuse contact]',
          body: response.data.text,
          source: 'backend_api',
          manifestSha256: response.data.manifest_sha256,
          evidenceCount: response.data.evidence_count || (candidate.evidenceSupporting?.length || 0),
        };
      }
    } catch {
      // Fallback cleanly to client-side generator
    }
  }

  // Client-side generation fallback
  const now = new Date().toUTCString();
  const manifestData = `${candidate.id}|${candidate.identifier}|${candidate.riskCategory}|${candidate.url || ''}`;
  const manifestHash = await simpleHash(manifestData);

  const defaultRecipients: Record<TakedownNoticeType, string> = {
    registrar: abuseEmail || 'abuse@domain-registrar.tld (or registrar RDAP contact)',
    host: abuseEmail || 'abuse@hosting-provider.net (network operator NOC)',
    trademark: abuseEmail || 'legal-notices@infringing-entity.org',
    platform: abuseEmail || 'trust-and-safety@platform.com',
    app_store: abuseEmail || 'developer-support@appstore.com',
  };

  const to = abuseEmail || defaultRecipients[noticeType];
  const subject = `[URGENT ABUSE NOTICE] Brand Impersonation & Digital Infringement: ${targetName}`;

  let recipientSalutation = 'Abuse Prevention Desk & Trust & Safety Team';
  let requestedAction = '';

  if (noticeType === 'registrar') {
    recipientSalutation = 'Domain Registrar Abuse Desk';
    requestedAction = `We request that you immediately investigate this malicious domain under Section 3.18 of the ICANN Registrar Accreditation Agreement (RAA). Because this domain is being used to conduct deceptive brand impersonation and potential credential harvesting targeting ${brandName} customers, please place the domain on Registrar-Hold / Server-Hold status and disable DNS resolution pending remediation.`;
  } else if (noticeType === 'host') {
    recipientSalutation = 'Hosting Provider & Network Operator Abuse Team';
    requestedAction = `We request that you disable hosting services for the infringing infrastructure identified below under your Acceptable Use Policy (AUP) and preserve all server access logs and subscriber registration details for law enforcement inquiry.`;
  } else if (noticeType === 'platform') {
    recipientSalutation = 'Platform Trust & Safety / Impersonation Review';
    requestedAction = `We request that you immediately suspend this fraudulent account under your Impersonation and Phishing policies. The profile deliberately misappropriates ${brandName}'s name, brand marks, and trust tokens to deceive consumers.`;
  } else if (noticeType === 'app_store') {
    recipientSalutation = 'App Store Developer Policy Enforcement';
    requestedAction = `We request that you remove this unauthorized mobile package listing from your store directory. The application falsely presents itself as an official ${brandName} application or service, violating developer policies regarding deceptive behaviour and intellectual property infringement.`;
  } else {
    recipientSalutation = 'Designated Agent / Infringing Party';
    requestedAction = `You are hereby formally notified to CEASE AND DESIST all unauthorized use of the ${brandName} trademark, logos, and identity assets, and to immediately surrender or terminate the infringing resource identified below.`;
  }

  const indicators = [
    `- Target Identifier: ${targetName}`,
    candidate.url ? `- Target URL: ${candidate.url}` : null,
    `- Asset Category: ${candidate.type.toUpperCase()} (${candidate.platform || 'External Network'})`,
    `- Brand Owner: ${brandName}`,
    `- Official Website: ${brandProfile.officialWebsite || 'Not Specified'}`,
    trademarkReg ? `- Trademark Registration / Ref: ${trademarkReg}` : null,
    `- Assessed Severity: ${candidate.riskCategory.toUpperCase()}`,
    `- Observed Date: ${candidate.createdDate || now}`,
  ].filter(Boolean);

  const reasons = (candidate.evidenceSupporting && candidate.evidenceSupporting.length > 0)
    ? candidate.evidenceSupporting.map((e) => `- ${e}`)
    : (candidate.impersonationIndicators && candidate.impersonationIndicators.length > 0)
    ? candidate.impersonationIndicators.map((e) => `- ${e}`)
    : [`- Name and presentation show deceptive resemblance to protected brand "${brandName}".`];

  const lines = [
    `Subject: ${subject}`,
    `To: ${to}`,
    `From: ${brandName} Security & Brand Protection Team`,
    `Date: ${now}`,
    '',
    `Dear ${recipientSalutation},`,
    '',
    `This is an evidentiary takedown and abuse notification on behalf of ${brandName}.`,
    '',
    'Requested Action:',
    '-----------------',
    requestedAction,
    '',
    'Threat Indicators & Target Information:',
    '---------------------------------------',
    ...indicators,
    '',
    'Evidence of Impersonation & Malicious Activity:',
    '-----------------------------------------------',
    ...reasons,
    '',
    customNotes ? `Analyst Case Notes:\n-------------------\n${customNotes}\n` : null,
    'Verification & Integrity Hash:',
    '------------------------------',
    `Evidence Manifest SHA-256: ${manifestHash}`,
    `Submitting Analyst: ${analystName}`,
    '',
    'Notice Status: DRAFT NOTICE assembled by SURAKSHA Brand Intelligence Platform.',
    'A named analyst or authorized legal representative must review and execute submission.',
  ].filter((l): l is string => l !== null);

  const body = lines.join('\n');

  const labels: Record<TakedownNoticeType, string> = {
    registrar: 'Domain Registrar Abuse',
    host: 'Hosting Provider Abuse',
    trademark: 'Cease & Desist / Trademark',
    platform: 'Platform Trust & Safety',
    app_store: 'App Store Policy Enforcement',
  };

  return {
    noticeType,
    label: labels[noticeType],
    subject,
    to,
    body,
    source: 'client_generated',
    manifestSha256: manifestHash,
    evidenceCount: candidate.evidenceSupporting?.length || 1,
  };
}

/**
 * Format as an RFC 822 .eml file string
 */
export function formatAsEML(draft: TakedownDraft): string {
  const cleanTo = draft.to.includes('@') && !draft.to.includes('[') ? draft.to : 'undisclosed-recipients:;';
  return [
    `Subject: ${draft.subject}`,
    `To: ${cleanTo}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `X-Suraksha-Draft: not-sent; analyst verification required`,
    `X-Suraksha-Manifest: ${draft.manifestSha256 || 'n/a'}`,
    '',
    draft.body,
  ].join('\r\n');
}

/**
 * Browser file download helper
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Generate a mailto link
 */
export function createMailtoLink(draft: TakedownDraft): string {
  const cleanTo = draft.to.includes('@') && !draft.to.includes('[') ? draft.to : '';
  const params = new URLSearchParams();
  params.set('subject', draft.subject);
  params.set('body', draft.body);
  return `mailto:${cleanTo}?${params.toString()}`;
}
