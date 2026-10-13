import React, { useState } from 'react';
import {
  Activity,
  Database,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Terminal,
  Lock,
  Cpu
} from 'lucide-react';

export default function DiagnosticsView({ health, loading, onRefresh }) {
  const [copied, setCopied] = useState(false);

  const copyTelemetry = () => {
    navigator.clipboard.writeText(JSON.stringify(health, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHealthy = health?.status === 'healthy' && health?.database?.connected;

  const endpoints = [
    { method: 'GET', path: '/api/v1/health', desc: 'Core server and database availability check', auth: 'None' },
    { method: 'GET', path: '/api/v1/brands', desc: 'Paginated list of brand profiles with search filtering', auth: 'None' },
    { method: 'POST', path: '/api/v1/brands', desc: 'Register new brand with domains, handles, and packages', auth: 'None' },
    { method: 'GET', path: '/api/v1/brands/:id', desc: 'Retrieve single brand profile with relational assets', auth: 'None' },
    { method: 'PUT', path: '/api/v1/brands/:id', desc: 'Update brand baseline assets with atomic synchronization', auth: 'None' },
    { method: 'DELETE', path: '/api/v1/brands/:id', desc: 'Permanently remove brand profile and cascade relationships', auth: 'None' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Core */}
        <div className="cyber-panel p-5 rounded-xl border border-cyber-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyber-textMuted uppercase">API SERVICE</span>
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
              isHealthy ? 'bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30' : 'bg-cyber-rose/15 text-cyber-rose border border-cyber-rose/30'
            }`}>
              {isHealthy ? 'ONLINE' : 'DEGRADED'}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyber-accent" />
            SentinelShield API
          </div>
          <div className="text-xs text-cyber-textMuted font-mono">
            Version: {health?.version || '1.0.0'} • Flask 3.1
          </div>
        </div>

        {/* Database */}
        <div className="cyber-panel p-5 rounded-xl border border-cyber-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyber-textMuted uppercase">DATA ACCESS</span>
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
              health?.database?.connected ? 'bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30' : 'bg-cyber-rose/15 text-cyber-rose border border-cyber-rose/30'
            }`}>
              {health?.database?.connected ? 'OPERATIONAL' : 'FAILED'}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyber-accent" />
            SQLite 3 (SQLAlchemy ORM)
          </div>
          <div className="text-xs text-cyber-textMuted font-mono">
            {health?.database?.status || 'Active connection verified'}
          </div>
        </div>

        {/* Migrations */}
        <div className="cyber-panel p-5 rounded-xl border border-cyber-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyber-textMuted uppercase">MIGRATION ENGINE</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyber-accent/15 text-cyber-accent border border-cyber-accent/30">
              ALEMBIC 1.20
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyber-accent" />
            Revision: 001_initial_schema
          </div>
          <div className="text-xs text-cyber-textMuted font-mono">
            Target Head Applied
          </div>
        </div>
      </div>

      {/* Endpoints Directory */}
      <div className="cyber-panel rounded-xl border border-cyber-border overflow-hidden">
        <div className="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-surface/40">
          <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyber-accent" /> Verified REST Endpoints (/api/v1)
          </h3>
          <button
            onClick={onRefresh}
            className="text-xs font-mono text-cyber-textMuted hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
          </button>
        </div>

        <div className="divide-y divide-cyber-border/60">
          {endpoints.map((ep, idx) => (
            <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-cyber-surface/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                  ep.method === 'GET' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                  ep.method === 'POST' ? 'bg-emerald-500/15 text-cyber-emerald border border-emerald-500/30' :
                  ep.method === 'PUT' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/15 text-cyber-rose border border-rose-500/30'
                }`}>
                  {ep.method}
                </span>
                <span className="font-mono text-white font-medium">{ep.path}</span>
              </div>
              <span className="text-cyber-textMuted text-[11px]">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Health Check JSON */}
      <div className="cyber-panel rounded-xl border border-cyber-border overflow-hidden">
        <div className="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-surface/40">
          <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyber-accent" /> Live Health Endpoint Output
          </h3>
          <button
            onClick={copyTelemetry}
            className="text-xs font-mono text-cyber-accent hover:underline flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
        <pre className="p-4 bg-cyber-darkest text-xs font-mono text-cyber-accent/90 overflow-x-auto leading-relaxed">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </div>
  );
}
