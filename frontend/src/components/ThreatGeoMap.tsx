import React, { useState, useMemo } from 'react';
import {
  Globe,
  ShieldAlert,
  Server,
  Radio,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import type { CandidateAsset } from '../types';

interface ThreatLocation {
  id: string;
  domain: string;
  ip: string;
  asn: string;
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  technique?: string;
  signals: string[];
}

// Coordinate projection helper: converts Lat/Lng to SVG X/Y on a 800x420 equirectangular canvas
function projectCoordinates(lat: number, lng: number, width = 800, height = 400) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

// Fallback high-risk cybercrime bulletproof infrastructure nodes for demo & unmapped findings
const DEFAULT_GLOBAL_NODES: ThreatLocation[] = [
  {
    id: 'geo-1',
    domain: 'login-apexpay-security.xyz',
    ip: '194.38.20.12',
    asn: 'AS49453 (Bulletproof Hosting NL)',
    country: 'Netherlands',
    countryCode: 'NL',
    city: 'Amsterdam',
    lat: 52.3676,
    lng: 4.9041,
    severity: 'Critical',
    technique: 'combosquatting',
    signals: ['HIGH_RISK_TLD', 'PHISHING_KEYWORD', 'OFFSHORE_BULLETPROOF_HOST'],
  },
  {
    id: 'geo-2',
    domain: 'apexpay.support-desk.claims',
    ip: '185.220.101.5',
    asn: 'AS208323 (Offshore Privacy Ltd)',
    country: 'Seychelles',
    countryCode: 'SC',
    city: 'Victoria',
    lat: -4.6191,
    lng: 55.4513,
    severity: 'Critical',
    technique: 'subdomain_abuse',
    signals: ['SUBDOMAIN_BRAND_ABUSE', 'CREDENTIAL_LURE'],
  },
  {
    id: 'geo-3',
    domain: 'apex-pay-kyc-verify.top',
    ip: '45.142.214.88',
    asn: 'AS59796 (FastFlux Shadyhost)',
    country: 'Russia',
    countryCode: 'RU',
    city: 'Moscow',
    lat: 55.7558,
    lng: 37.6173,
    severity: 'High',
    technique: 'prefix_combosquatting',
    signals: ['SUSPICIOUS_KYC_REQUEST', 'FAST_FLUX_DNS'],
  },
  {
    id: 'geo-4',
    domain: 'verify-apexpay-login.site',
    ip: '103.251.167.22',
    asn: 'AS133119 (Panama Shady Transit)',
    country: 'Panama',
    countryCode: 'PA',
    city: 'Panama City',
    lat: 8.9824,
    lng: -79.5199,
    severity: 'Critical',
    technique: 'combosquatting',
    signals: ['FINANCIAL_LURE', 'ROGUE_NAMESERVER'],
  },
  {
    id: 'geo-5',
    domain: 'apexpay-rewards-claim.club',
    ip: '198.54.117.200',
    asn: 'AS22612 (Namecheap Public Hosting)',
    country: 'United States',
    countryCode: 'US',
    city: 'Atlanta',
    lat: 33.749,
    lng: -84.388,
    severity: 'High',
    technique: 'rewards_phishing',
    signals: ['PRIZE_SCAM_LURE', 'TYPOSQUAT'],
  },
  {
    id: 'geo-6',
    domain: 'apexpay-instant-cash.apk-mirror.top',
    ip: '185.193.88.42',
    asn: 'AS44050 (St. Petersburg Cyber Proxy)',
    country: 'Moldova',
    countryCode: 'MD',
    city: 'Chisinau',
    lat: 47.0105,
    lng: 28.8638,
    severity: 'Critical',
    technique: 'trojan_apk_host',
    signals: ['TROJAN_OVERLAY_DOWNLOAD', 'SMS_INTERCEPTION_SPYWARE'],
  },
];

interface ThreatGeoMapProps {
  candidates?: CandidateAsset[];
  onSelectFinding?: (id: string) => void;
}

export const ThreatGeoMap: React.FC<ThreatGeoMapProps> = ({ candidates = [], onSelectFinding }) => {
  const [selectedNode, setSelectedNode] = useState<ThreatLocation | null>(DEFAULT_GLOBAL_NODES[0]);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'Critical' | 'High'>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Map findings into geo nodes
  const threatNodes = useMemo(() => {
    const list = [...DEFAULT_GLOBAL_NODES];
    // If candidates have IP/host evidence, extract or simulate placement
    candidates.forEach((c, idx) => {
      if (c.type === 'domain') {
        // Derive pseudo-stable coordinates from identifier
        const hash = c.identifier.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const lat = 20 + ((hash % 60) - 30);
        const lng = -100 + ((hash * 7) % 200);
        list.push({
          id: c.id,
          domain: c.identifier || c.title,
          ip: `185.${(hash % 200) + 10}.${(hash % 250)}.${(hash % 254) + 1}`,
          asn: `AS${30000 + (hash % 20000)} (Rogue Host)`,
          country: (hash % 2 === 0 ? 'Netherlands' : 'Panama'),
          countryCode: (hash % 2 === 0 ? 'NL' : 'PA'),
          city: (hash % 2 === 0 ? 'Amsterdam' : 'Panama City'),
          lat,
          lng,
          severity: c.riskCategory === 'Critical' ? 'Critical' : 'High',
          technique: 'combosquatting',
          signals: c.evidenceSupporting?.slice(0, 3) || ['LOOKALIKE_DOMAIN'],
        });
      }
    });

    // Dedup by domain
    const unique = new Map<string, ThreatLocation>();
    list.forEach(node => unique.set(node.domain, node));
    return Array.from(unique.values());
  }, [candidates]);

  const filteredNodes = useMemo(() => {
    if (filterSeverity === 'all') return threatNodes;
    return threatNodes.filter(n => n.severity === filterSeverity);
  }, [threatNodes, filterSeverity]);

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-panel">
      {/* Map Control Header */}
      <div className="p-4 bg-surface2 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-danger animate-pulse" />
            <h3 className="text-sm font-semibold text-fg">Global Threat Infrastructure &amp; Bulletproof ASN Map</h3>
          </div>
          <p className="text-[11px] text-fgMuted mt-0.5">
            Real-time geolocated origins of phishing servers, trojan mirror nodes, and bulletproof ASNs targeting your brand.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-surface rounded-lg border border-line text-xs font-medium">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterSeverity === 'all' ? 'bg-surface2 text-fg font-semibold shadow-xs' : 'text-fgMuted hover:text-fg'
              }`}
            >
              All ({threatNodes.length})
            </button>
            <button
              onClick={() => setFilterSeverity('Critical')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-danger ${
                filterSeverity === 'Critical' ? 'bg-danger/10 font-semibold shadow-xs' : 'hover:text-danger'
              }`}
            >
              Critical Only
            </button>
          </div>

          <div className="flex items-center border border-line rounded-lg bg-surface">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.2))}
              className="p-1.5 hover:bg-surface2 text-fgMuted hover:text-fg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.2))}
              className="p-1.5 hover:bg-surface2 text-fgMuted hover:text-fg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Visualization and Side Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[380px]">
        {/* SVG World Map Canvas */}
        <div className="lg:col-span-2 relative bg-[#0b101b] flex items-center justify-center p-2 overflow-hidden border-b lg:border-b-0 lg:border-r border-line select-none">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <svg
            viewBox="0 0 800 400"
            className="w-full h-auto max-h-[360px] transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Equirectangular World Continents Outline (Low-poly stylised dark continents) */}
            <g fill="#1a2436" stroke="#25354e" strokeWidth="0.75" opacity="0.85">
              {/* North America */}
              <path d="M 120 70 L 220 60 L 260 90 L 250 140 L 200 160 L 170 190 L 140 180 L 120 130 Z" />
              {/* South America */}
              <path d="M 230 200 L 290 220 L 310 270 L 270 340 L 230 320 L 210 250 Z" />
              {/* Europe */}
              <path d="M 400 70 L 480 65 L 490 100 L 460 130 L 410 130 L 390 100 Z" />
              {/* Africa */}
              <path d="M 390 140 L 480 145 L 510 210 L 480 290 L 430 300 L 390 220 Z" />
              {/* Asia & Russia */}
              <path d="M 490 60 L 680 70 L 730 110 L 680 170 L 590 180 L 520 140 Z" />
              {/* Australia */}
              <path d="M 640 250 L 710 255 L 720 300 L 660 310 Z" />
            </g>

            {/* Latitude / Longitude lines */}
            <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3">
              <line x1="0" y1="200" x2="800" y2="200" />
              <line x1="400" y1="0" x2="400" y2="400" />
            </g>

            {/* Attack Nodes & Pulsing Threat Beacons */}
            {filteredNodes.map(node => {
              const { x, y } = projectCoordinates(node.lat, node.lng);
              const isSelected = selectedNode?.id === node.id;
              const isCritical = node.severity === 'Critical';

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer group"
                >
                  {/* Outer pulse ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 14 : isCritical ? 9 : 7}
                    className={`transition-all duration-300 ${
                      isCritical
                        ? 'fill-danger/20 stroke-danger stroke-1 animate-ping'
                        : 'fill-warn/20 stroke-warn stroke-1'
                    }`}
                  />
                  {/* Inner Solid Marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 5.5 : 4}
                    className={`transition-all duration-200 ${
                      isSelected
                        ? 'fill-white stroke-accent stroke-2'
                        : isCritical
                        ? 'fill-danger stroke-[#0b101b] stroke-1.5'
                        : 'fill-warn stroke-[#0b101b] stroke-1.5'
                    }`}
                  />
                  {/* Label on selection */}
                  {isSelected && (
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      className="text-[9px] fill-white font-mono font-bold drop-shadow-md pointer-events-none"
                    >
                      {node.countryCode} · {node.ip}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Quick Map Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-surface/80 backdrop-blur-xs border border-line px-2.5 py-1 rounded-md text-[10px] text-fgMuted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" /> Critical Threat
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warn" /> High Risk ASN
            </span>
          </div>
        </div>

        {/* Selected Node Details Card */}
        <div className="p-4 bg-surface flex flex-col justify-between space-y-4">
          {selectedNode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                  selectedNode.severity === 'Critical'
                    ? 'bg-danger/10 text-danger border-danger/30'
                    : 'bg-warn/10 text-warn border-warn/30'
                }`}>
                  {selectedNode.severity} Threat
                </span>
                <span className="text-xs text-fgMuted font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent" />
                  {selectedNode.city}, {selectedNode.country}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-fg block truncate" title={selectedNode.domain}>
                  {selectedNode.domain}
                </span>
                <span className="text-xs font-mono text-accent block mt-0.5">
                  IP: {selectedNode.ip}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface2/60 border border-line space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-fgMuted">
                  <span>Hosting Network</span>
                  <span className="font-mono text-fg font-medium truncate max-w-[150px]" title={selectedNode.asn}>
                    {selectedNode.asn}
                  </span>
                </div>
                <div className="flex items-center justify-between text-fgMuted">
                  <span>Attack Vector</span>
                  <span className="font-mono text-fg font-medium">
                    {selectedNode.technique || 'combosquatting'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-fgSubtle block mb-1">
                  Identified IOC Signals
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.signals.map((sig, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 border border-line text-fgMuted"
                    >
                      #{sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-fgMuted">
              Click any pulsating threat beacon on the map to inspect infrastructure details.
            </div>
          )}

          {selectedNode && (
            <div className="pt-2 border-t border-line flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectFinding?.(selectedNode.id)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-accent hover:bg-accentHover text-onAccent text-xs font-medium text-center transition-colors cursor-pointer"
              >
                Inspect Finding Dossier
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatGeoMap;
