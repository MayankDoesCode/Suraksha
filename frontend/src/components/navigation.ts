import {
  Binary,
  Building2,
  FileSearch,
  FolderSearch,
  LayoutDashboard,
  Network,
  Radar,
  Share2,
  Smartphone,
  Activity,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string; // matches the `activeTab` values the workspace already routes on
  label: string;
  icon: LucideIcon;
  keywords?: string;
}

export interface NavGroup {
  id: string;
  title: string | null;
  items: NavItem[];
}

/** Task-oriented navigation. Only routes that exist; there is no Settings page yet, so none is listed. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'home', title: null, items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard, keywords: 'home summary queue dashboard' }] },
  {
    id: 'detect',
    title: 'Detection & Recon',
    items: [
      { id: 'lookalike-engine', label: 'Domains', icon: Binary, keywords: 'lookalike typosquat phishing url dns' },
      { id: 'social-monitoring', label: 'Social', icon: Share2, keywords: 'impersonation handle account social telegram' },
      { id: 'app-monitoring', label: 'Apps', icon: Smartphone, keywords: 'package store publisher trojan playstore appstore' },
      { id: 'watchtower', label: 'Watchtower', icon: Radar, keywords: 'backend evaluate perimeter geomap alert' },
    ],
  },
  {
    id: 'triage',
    title: 'Triage & Remediation',
    items: [
      { id: 'reports', label: 'Reports', icon: FileSearch, keywords: 'table export csv reports ciso briefing' },
      { id: 'investigation-center', label: 'Cases', icon: FolderSearch, keywords: 'cases status notes evidence takedowns' },
      { id: 'threat-graph', label: 'Threat graph', icon: Network, keywords: 'relationships links connected visual' },
    ],
  },
  { id: 'protect', title: 'Brand Perimeter', items: [{ id: 'brand-profile', label: 'Brand profile', icon: Building2, keywords: 'brand domains official verified allowlist' }] },
  { id: 'system', title: 'Intelligence System', items: [
    { id: 'methodology', label: 'Methodology', icon: BookOpen, keywords: 'method pipeline signals coverage limitations' },
    { id: 'diagnostics', label: 'System health', icon: Activity, keywords: 'health ml evaluation api telemetry' },
  ] },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));

export const pageInfo = (id: string) => NAV_ITEMS.find((i) => i.id === id);
