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
  { id: 'home', title: null, items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard, keywords: 'home summary queue' }] },
  {
    id: 'detect',
    title: 'Detect',
    items: [
      { id: 'lookalike-engine', label: 'Check a domain', icon: Binary, keywords: 'lookalike typosquat phishing url' },
      { id: 'social-monitoring', label: 'Check a social profile', icon: Share2, keywords: 'impersonation handle account' },
      { id: 'app-monitoring', label: 'Check a mobile app', icon: Smartphone, keywords: 'package store publisher' },
      { id: 'watchtower', label: 'Watchtower', icon: Radar, keywords: 'backend evaluate perimeter' },
    ],
  },
  {
    id: 'triage',
    title: 'Triage',
    items: [
      { id: 'reports', label: 'Findings', icon: FileSearch, keywords: 'table export csv reports' },
      { id: 'investigation-center', label: 'Investigations', icon: FolderSearch, keywords: 'cases status notes evidence' },
      { id: 'threat-graph', label: 'Threat graph', icon: Network, keywords: 'relationships links connected' },
    ],
  },
  { id: 'protect', title: 'Protect', items: [{ id: 'brand-profile', label: 'Protected assets', icon: Building2, keywords: 'brand domains official verified' }] },
  { id: 'system', title: 'System', items: [
    { id: 'methodology', label: 'How it works', icon: BookOpen, keywords: 'method pipeline signals coverage limitations' },
    { id: 'diagnostics', label: 'Models & status', icon: Activity, keywords: 'health ml evaluation' },
  ] },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));

export const pageInfo = (id: string) => NAV_ITEMS.find((i) => i.id === id);
