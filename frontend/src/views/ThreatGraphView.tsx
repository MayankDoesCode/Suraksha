import React, { useState, useRef } from 'react';
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
} from 'lucide-react';

export const ThreatGraphView: React.FC = () => {
  const { threatNodes, threatEdges, setSelectedCandidateId, brandProfile } = useApp();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-brand');
  const [showInferred, setShowInferred] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');

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
        bg: 'fill-blue-600',
        stroke: isSelected ? 'stroke-white stroke-4' : 'stroke-blue-300 stroke-2',
        text: 'text-white',
        radius: 34,
        icon: Shield,
      };
    }
    if (node.type === 'official_asset') {
      return {
        bg: 'fill-emerald-600',
        stroke: isSelected ? 'stroke-white stroke-4' : 'stroke-emerald-300 stroke-2',
        text: 'text-white',
        radius: 26,
        icon: Shield,
      };
    }
    if (node.type === 'shared_infra') {
      return {
        bg: 'fill-purple-700',
        stroke: isSelected ? 'stroke-white stroke-4' : 'stroke-purple-300 stroke-2',
        text: 'text-white',
        radius: 26,
        icon: Server,
      };
    }
    if (node.riskCategory === 'Critical' || node.riskCategory === 'High') {
      return {
        bg: 'fill-rose-600',
        stroke: isSelected ? 'stroke-white stroke-4' : 'stroke-rose-300 stroke-2',
        text: 'text-white',
        radius: 28,
        icon: node.type === 'app_candidate' ? Smartphone : node.type === 'domain_candidate' ? Globe : Share2,
      };
    }
    if (node.riskCategory === 'Medium') {
      return {
        bg: 'fill-amber-500',
        stroke: isSelected ? 'stroke-white stroke-4' : 'stroke-amber-200 stroke-2',
        text: 'text-white',
        radius: 26,
        icon: Share2,
      };
    }
    return {
      bg: 'fill-slate-600',
      stroke: isSelected ? 'stroke-white stroke-4' : 'stroke-slate-300 stroke-2',
      text: 'text-white',
      radius: 24,
      icon: Share2,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
              <Network className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
              Correlated Threat Graph
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Threat Relationship & Infrastructure Graph
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Visualize relationships between candidate accounts, apps, domains, and shared C2 infrastructure.
            <strong> Note:</strong> Relationships are strictly created from observed technical links or clear shared
            indicators—never merely because two names share letters.
          </p>
        </div>

        {/* Graph Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowInferred(!showInferred)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-colors ${
              showInferred
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            {showInferred ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showInferred ? 'Inferred Links: ON' : 'Inferred Links: OFF'}</span>
          </button>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:outline-hidden"
          >
            <option value="all">All Entities</option>
            <option value="official">Official Brand Assets</option>
            <option value="social">Social Candidates</option>
            <option value="app">Mobile Apps</option>
            <option value="domain">Domains</option>
            <option value="infra">Shared Infrastructure</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Canvas Area (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative min-h-[540px] flex flex-col justify-between">
          {/* Canvas Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-xs p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 space-y-1.5 shadow-md">
            <span className="font-bold text-slate-400 uppercase tracking-wider block">Legend</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Brand Core</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Verified Official Asset</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>High/Critical Threat Candidate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
              <span>Shared Infrastructure / C2</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
              <span className="w-4 h-0.5 bg-slate-400 inline-block" />
              <span>Observed Link</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t border-dashed border-purple-400 inline-block" />
              <span>Inferred Correlation</span>
            </div>
          </div>

          {/* SVG Diagram */}
          <svg className="w-full h-[520px] select-none" viewBox="0 0 820 600">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
              <marker id="arrow-inferred" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
              </marker>
              <linearGradient id="grid-pattern" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Grid Backdrop */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <rect width="820" height="600" fill="url(#grid)" />

            {/* Render Edges */}
            {visibleEdges.map(edge => {
              const src = threatNodes.find(n => n.id === edge.source);
              const tgt = threatNodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;

              const x1 = src.x || 400;
              const y1 = src.y || 300;
              const x2 = tgt.x || 400;
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
                    stroke={edge.isInferred ? '#a855f7' : '#475569'}
                    strokeWidth={edge.isInferred ? 2 : 2}
                    strokeDasharray={edge.isInferred ? '6,4' : 'none'}
                    markerEnd={edge.isInferred ? 'url(#arrow-inferred)' : 'url(#arrow)'}
                    className="transition-all hover:stroke-cyan-400 hover:stroke-3"
                  />
                  {/* Edge Label Badge */}
                  <rect
                    x={midX - 55}
                    y={midY - 9}
                    width="110"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke={edge.isInferred ? '#a855f7' : '#334155'}
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    fill={edge.isInferred ? '#c084fc' : '#94a3b8'}
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
              const x = node.x || 400;
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
                    <circle cx={x} cy={y} r={styling.radius + 6} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" className="animate-spin" />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={styling.radius}
                    className={`${styling.bg} ${styling.stroke} transition-all group-hover:scale-105`}
                  />

                  {/* Node Title Text */}
                  <text
                    x={x}
                    y={y + styling.radius + 14}
                    textAnchor="middle"
                    fill={isSelected ? '#38bdf8' : '#cbd5e1'}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="sans-serif"
                    className="drop-shadow-md"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Bottom helper text */}
          <div className="bg-slate-900/80 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Click any node to inspect relationship telemetry.</span>
            <span className="font-mono text-slate-500">
              {visibleNodes.length} Nodes • {visibleEdges.length} Edges
            </span>
          </div>
        </div>

        {/* Node Details Inspection Drawer (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-600" />
              Node Metadata & Evidence
            </h3>
            {selectedNode && (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {selectedNode.type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Selected Identity:</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedNode.label}</h4>
                <p className="text-slate-600 text-[11px] mt-0.5">{selectedNode.details}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium block mb-1">Threat Level:</span>
                <RiskBadge
                  level={selectedNode.riskCategory === 'Safe' ? 'Safe' : selectedNode.riskCategory}
                  size="md"
                />
              </div>

              {/* Connected Relationships list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Active Connections ({threatEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {threatEdges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map(edge => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = threatNodes.find(n => n.id === otherId);

                      return (
                        <div key={edge.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-purple-700 font-mono text-[11px]">
                              {edge.label}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                edge.isInferred ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {edge.isInferred ? 'Inferred' : 'Observed Link'}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium text-[11px]">
                            Connected to: {otherNode?.label || otherId}
                          </p>
                          <p className="text-slate-500 text-[10px] mt-1 leading-normal italic">
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
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open Full Investigation Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Select a node in the graph to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
};
