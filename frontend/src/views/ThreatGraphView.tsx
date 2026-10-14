import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ThreatNode, ThreatEdge } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  Network,
  Shield,
  Share2,
  Smartphone,
  Globe,
  Server,
  Filter,
  Eye,
  EyeOff,
  Info,
  Maximize2,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

export const ThreatGraphView: React.FC = () => {
  const { threatNodes, threatEdges, setSelectedCandidateId, brandProfile } = useApp();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-brand');
  const [showInferred, setShowInferred] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const selectedNode = threatNodes.find(n => n.id === selectedNodeId);

  // Nodes filtered by type
  const visibleNodes = threatNodes.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'official') return n.type === 'official_asset' || n.type === 'brand';
    if (filterType === 'social') return n.type === 'social_candidate';
    if (filterType === 'app') return n.type === 'app_candidate';
    if (filterType === 'domain') return n.type === 'domain_candidate';
    if (filterType === 'infra') return n.type === 'shared_infra';
    return true;
  });

  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

  // Edges filtered
  const visibleEdges = threatEdges.filter(e => {
    if (!showInferred && e.isInferred) return false;
    return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
  });

  // Helper node color & styling
  const getNodeStyling = (node: ThreatNode) => {
    const isSelected = node.id === selectedNodeId;

    if (node.type === 'brand') {
      return {
        bg: 'fill-[#1265F8]',
        stroke: isSelected ? 'stroke-[#00D9FF] stroke-[3]' : 'stroke-[#3B82F6] stroke-2',
        glow: 'drop-shadow-[0_0_12px_rgba(18,101,248,0.6)]',
        radius: 34,
        icon: Shield,
      };
    }
    if (node.type === 'official_asset') {
      return {
        bg: 'fill-emerald-600',
        stroke: isSelected ? 'stroke-[#00E5A0] stroke-[3]' : 'stroke-emerald-400/80 stroke-2',
        glow: 'drop-shadow-[0_0_8px_rgba(0,229,160,0.4)]',
        radius: 26,
        icon: Shield,
      };
    }
    if (node.type === 'shared_infra') {
      return {
        bg: 'fill-purple-700',
        stroke: isSelected ? 'stroke-purple-300 stroke-[3]' : 'stroke-purple-400 stroke-2',
        glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]',
        radius: 26,
        icon: Server,
      };
    }
    if (node.riskCategory === 'Critical' || node.riskCategory === 'High') {
      return {
        bg: 'fill-rose-600',
        stroke: isSelected ? 'stroke-rose-300 stroke-[3]' : 'stroke-rose-400 stroke-2',
        glow: 'drop-shadow-[0_0_10px_rgba(255,49,91,0.5)]',
        radius: 28,
        icon: node.type === 'app_candidate' ? Smartphone : node.type === 'domain_candidate' ? Globe : Share2,
      };
    }
    if (node.riskCategory === 'Medium') {
      return {
        bg: 'fill-amber-500',
        stroke: isSelected ? 'stroke-amber-200 stroke-[3]' : 'stroke-amber-400 stroke-2',
        glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]',
        radius: 26,
        icon: Share2,
      };
    }
    return {
      bg: 'fill-[#0A1C3D]',
      stroke: isSelected ? 'stroke-[#00D9FF] stroke-[3]' : 'stroke-[#123E78] stroke-2',
      glow: '',
      radius: 24,
      icon: Share2,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#123E78] bg-gradient-to-r from-[#06142D] via-[#081B3B] to-[#06142D] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <Network className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Correlated Threat Graph
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[#00D9FF] font-mono">
                Dynamic Matrix
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#F1F5FF] tracking-tight">
              Threat Relationship & Infrastructure Graph
            </h2>
            <p className="text-xs text-[#91ACD1] max-w-2xl mt-1 leading-relaxed">
              Visualize relationships between candidate accounts, mobile binaries, lookalike domains, and shared C2 infrastructure.
              <strong className="text-[#F1F5FF]"> Note:</strong> Edges are strictly established via observed telemetry or verified indicators.
            </p>
          </div>

          {/* Graph Controls */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              onClick={() => setShowInferred(!showInferred)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-semibold transition-all ${
                showInferred
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'bg-[#0A1C3D] text-[#91ACD1] border-[#123E78]'
              }`}
            >
              {showInferred ? <Eye className="w-3.5 h-3.5 text-purple-300" /> : <EyeOff className="w-3.5 h-3.5 text-[#91ACD1]" />}
              <span>{showInferred ? 'Inferred Links: ON' : 'Inferred Links: OFF'}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-[#0A1C3D] px-2.5 py-1.5 rounded-xl border border-[#123E78]">
              <Filter className="w-3.5 h-3.5 text-[#91ACD1]" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-transparent text-[#F1F5FF] text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-[#0A1C3D] text-[#F1F5FF]">All Entities</option>
                <option value="official" className="bg-[#0A1C3D] text-[#F1F5FF]">Official Brand Assets</option>
                <option value="social" className="bg-[#0A1C3D] text-[#F1F5FF]">Social Candidates</option>
                <option value="app" className="bg-[#0A1C3D] text-[#F1F5FF]">Mobile Apps</option>
                <option value="domain" className="bg-[#0A1C3D] text-[#F1F5FF]">Lookalike Domains</option>
                <option value="infra" className="bg-[#0A1C3D] text-[#F1F5FF]">Shared Infrastructure</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Canvas Area (8 Cols) */}
        <div className="lg:col-span-8 bg-[#030D22] rounded-2xl border border-[#123E78] shadow-2xl overflow-hidden relative min-h-[560px] flex flex-col justify-between">
          {/* Canvas Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 bg-[#06142D]/90 backdrop-blur-md p-3 rounded-xl border border-[#123E78] text-[10px] text-[#91ACD1] space-y-1.5 shadow-xl">
            <span className="font-bold text-[#F1F5FF] uppercase tracking-wider block border-b border-[#123E78] pb-1">
              Topology Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1265F8] inline-block shadow-[0_0_6px_#1265F8]" />
              <span className="text-[#F1F5FF]">Brand Core</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_#10B981]" />
              <span className="text-[#F1F5FF]">Verified Official Asset</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_#F43F5E]" />
              <span className="text-[#F1F5FF]">High / Critical Threat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shadow-[0_0_6px_#9333EA]" />
              <span className="text-[#F1F5FF]">Shared Infra / C2</span>
            </div>
            <div className="flex items-center gap-2 pt-1.5 border-t border-[#123E78]">
              <span className="w-4 h-0.5 bg-[#475569] inline-block" />
              <span>Observed Link</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t border-dashed border-purple-400 inline-block" />
              <span className="text-purple-300">Inferred Correlation</span>
            </div>
          </div>

          {/* Zoom / Reset Controls Overlay */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#06142D]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#123E78] shadow-lg">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.6))}
              className="p-1.5 rounded-lg text-[#91ACD1] hover:text-[#00D9FF] hover:bg-[#0A1C3D] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.7))}
              className="p-1.5 rounded-lg text-[#91ACD1] hover:text-[#00D9FF] hover:bg-[#0A1C3D] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-[#91ACD1] hover:text-[#00D9FF] hover:bg-[#0A1C3D] transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-[#91ACD1] px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="w-full h-[520px] overflow-hidden flex items-center justify-center">
            <svg
              className="w-full h-full select-none transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
              viewBox="0 0 820 600"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker id="arrow-inferred" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
                </marker>
                {/* Cyber grid pattern */}
                <pattern id="cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#123E78" strokeWidth="0.5" strokeOpacity="0.4" />
                  <circle cx="0" cy="0" r="1" fill="#00D9FF" fillOpacity="0.3" />
                </pattern>
              </defs>

              {/* Grid Backdrop */}
              <rect width="820" height="600" fill="url(#cyber-grid)" />

              {/* Central Radar Rings Background Accent */}
              <circle cx="410" cy="300" r="120" fill="none" stroke="#123E78" strokeWidth="1" strokeDasharray="3,6" strokeOpacity="0.4" />
              <circle cx="410" cy="300" r="220" fill="none" stroke="#123E78" strokeWidth="1" strokeDasharray="4,8" strokeOpacity="0.25" />

              {/* Render Edges */}
              {visibleEdges.map(edge => {
                const src = threatNodes.find(n => n.id === edge.source);
                const tgt = threatNodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;

                const x1 = src.x || 410;
                const y1 = src.y || 300;
                const x2 = tgt.x || 410;
                const y2 = tgt.y || 300;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={edge.id} className="cursor-pointer group">
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={edge.isInferred ? '#a855f7' : '#334155'}
                      strokeWidth={edge.isInferred ? 2 : 2}
                      strokeDasharray={edge.isInferred ? '6,4' : 'none'}
                      markerEnd={edge.isInferred ? 'url(#arrow-inferred)' : 'url(#arrow)'}
                      className="transition-all hover:stroke-[#00D9FF] hover:stroke-[3]"
                    />
                    {/* Edge Label Badge */}
                    <rect
                      x={midX - 58}
                      y={midY - 10}
                      width="116"
                      height="20"
                      rx="5"
                      fill="#06142D"
                      stroke={edge.isInferred ? '#a855f7' : '#123E78'}
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      fill={edge.isInferred ? '#c084fc' : '#91ACD1'}
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {visibleNodes.map(node => {
                const x = node.x || 410;
                const y = node.y || 300;
                const styling = getNodeStyling(node);
                const isSelected = node.id === selectedNodeId;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer group transition-transform"
                  >
                    {/* Outer selection ring */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={styling.radius + 8}
                        fill="none"
                        stroke="#00D9FF"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        className="animate-spin"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={styling.radius}
                      className={`${styling.bg} ${styling.stroke} ${styling.glow} transition-all group-hover:scale-105`}
                    />

                    {/* Node Title Text */}
                    <text
                      x={x}
                      y={y + styling.radius + 15}
                      textAnchor="middle"
                      fill={isSelected ? '#00D9FF' : '#F1F5FF'}
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="sans-serif"
                      className="drop-shadow-md select-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {threatNodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#030D22]/85 backdrop-blur-xs z-20">
                <Network className="w-12 h-12 text-[#91ACD1]/40 mb-3" />
                <h4 className="text-sm font-bold text-white">No Threat Graph Nodes Recorded</h4>
                <p className="text-xs text-[#91ACD1] max-w-sm mt-1 leading-relaxed">
                  Your workspace does not have any active threat relationships yet. As candidates are detected and analyzed, relational clusters will map here automatically.
                </p>
              </div>
            )}
          </div>

          {/* Bottom helper bar */}
          <div className="bg-[#06142D] px-4 py-2.5 border-t border-[#123E78] text-[11px] text-[#91ACD1] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
              Click any node to inspect telemetry, shared indicators, and forensic evidence.
            </span>
            <span className="font-mono text-[#00D9FF] font-semibold">
              {visibleNodes.length} Nodes • {visibleEdges.length} Edges Active
            </span>
          </div>
        </div>

        {/* Node Details Inspection Drawer (4 Cols) */}
        <div className="lg:col-span-4 bg-[#06142D] rounded-2xl border border-[#123E78] p-5 shadow-xl space-y-4">
          <div className="border-b border-[#123E78] pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F1F5FF] flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              Node Metadata & Evidence
            </h3>
            {selectedNode && (
              <span className="text-[10px] font-mono text-[#00D9FF] bg-[#0A1C3D] px-2 py-0.5 rounded-md border border-[#123E78]">
                {selectedNode.type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[#91ACD1] font-semibold block">Selected Entity:</span>
                <h4 className="font-bold text-[#F1F5FF] text-base mt-0.5">{selectedNode.label}</h4>
                <p className="text-[#91ACD1] text-[11px] mt-1 leading-relaxed">{selectedNode.details}</p>
              </div>

              <div>
                <span className="text-[#91ACD1] font-semibold block mb-1">Threat Classification:</span>
                <RiskBadge
                  level={selectedNode.riskCategory === 'Safe' ? 'Safe' : selectedNode.riskCategory}
                  size="md"
                />
              </div>

              {/* Connected Relationships list */}
              <div className="space-y-2 pt-2 border-t border-[#123E78]">
                <span className="font-bold text-[#F1F5FF] uppercase tracking-wider text-[11px] block">
                  Active Connections ({threatEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {threatEdges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map(edge => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = threatNodes.find(n => n.id === otherId);

                      return (
                        <div key={edge.id} className="p-3 rounded-xl bg-[#0A1C3D] border border-[#123E78] text-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-purple-300 font-mono text-[11px]">
                              {edge.label}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                                edge.isInferred
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-[#123E78]/50 text-[#91ACD1] border border-[#123E78]'
                              }`}
                            >
                              {edge.isInferred ? 'Inferred' : 'Observed Link'}
                            </span>
                          </div>
                          <p className="text-[#F1F5FF] font-medium text-[11px]">
                            Connected to: <span className="text-[#00D9FF]">{otherNode?.label || otherId}</span>
                          </p>
                          <p className="text-[#91ACD1] text-[11px] mt-1.5 leading-relaxed italic bg-[#030D22] p-2 rounded-lg border border-[#123E78]/40">
                            {edge.evidenceDetail}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Quick jump to candidate dossier if applicable */}
              {selectedNode.id.startsWith('node-cand-') && (
                <button
                  onClick={() => setSelectedCandidateId(selectedNode.id.replace('node-', ''))}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                >
                  <span>Open Full Forensic Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#91ACD1] italic py-8 text-center">Select any node on the canvas to inspect relationship telemetry.</p>
          )}
        </div>
      </div>
    </div>
  );
};
