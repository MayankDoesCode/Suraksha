import React, { useEffect, useRef } from 'react';

/**
 * ThreatNetworkCanvas
 * High-performance, animated HTML5 canvas visual depicting an interactive
 * cyber threat-intelligence network with radar sweeps, ground-truth nodes,
 * and flagged threat vectors. Includes reduced-motion accessibility support.
 */
export default function ThreatNetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement.clientHeight || 500);

    // Check for user reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReducedMotion = mediaQuery.matches;

    // Node definitions: Green = verified ground truth, Cyan = active telemetry, Amber/Rose = candidate threats
    const NODE_COUNT = Math.min(Math.floor(width / 16), 46);
    const nodes = [];
    const nodeTypes = [
      { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', type: 'VERIFIED', label: 'OFFICIAL ASSET' },
      { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)', type: 'SCANNER', label: 'API INGESTION' },
      { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', type: 'THREAT', label: 'SUSPICIOUS APP' },
      { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', type: 'ANALYSIS', label: 'EVALUATION' },
    ];

    for (let i = 0; i < NODE_COUNT; i++) {
      const typeCfg = nodeTypes[i % nodeTypes.length];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 2,
        baseRadius: Math.random() * 2 + 2,
        ...typeCfg,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    let radarAngle = 0;
    let mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const render = (time) => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadarRadius = Math.min(width, height) * 0.45;

      // Draw subtle radar rings
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 47, 76, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      for (let r = 1; r <= 3; r++) {
        const ringRadius = (maxRadarRadius / 3) * r;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadarRadius - 10, centerY);
      ctx.lineTo(centerX + maxRadarRadius + 10, centerY);
      ctx.moveTo(centerX, centerY - maxRadarRadius - 10);
      ctx.lineTo(centerX, centerY + maxRadarRadius + 10);
      ctx.stroke();
      ctx.restore();

      // Draw rotating radar sweep if motion is allowed
      if (!isReducedMotion) {
        radarAngle += 0.008;
        ctx.save();
        const sweepGradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          maxRadarRadius
        );
        sweepGradient.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
        sweepGradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

        ctx.fillStyle = sweepGradient;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadarRadius, radarAngle - 0.4, radarAngle);
        ctx.closePath();
        ctx.fill();

        // Sweep leading line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(radarAngle) * maxRadarRadius,
          centerY + Math.sin(radarAngle) * maxRadarRadius
        );
        ctx.stroke();
        ctx.restore();
      }

      // Update and draw interconnected network nodes
      const maxConnDist = 120;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        if (!isReducedMotion) {
          n1.x += n1.vx;
          n1.y += n1.vy;

          if (n1.x < 10 || n1.x > width - 10) n1.vx *= -1;
          if (n1.y < 10 || n1.y > height - 10) n1.vy *= -1;

          // Mouse gentle repulsion
          if (mouse.active) {
            const dx = n1.x - mouse.x;
            const dy = n1.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 90 && dist > 0) {
              n1.x += (dx / dist) * 1.5;
              n1.y += (dy / dist) * 1.5;
            }
          }
        }

        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnDist) {
            const alpha = (1 - dist / maxConnDist) * 0.22;
            ctx.strokeStyle = `rgba(34, 47, 76, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Pulse effect
        const pulse = Math.sin(time * 0.003 + n1.pulseOffset) * 0.8;
        const currentRadius = Math.max(1.5, n1.baseRadius + pulse);

        // Node outer glow
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, currentRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = n1.glow;
        ctx.fill();

        // Node core
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = n1.color;
        ctx.fill();
      }

      // Cyber HUD Overlay Elements
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.fillText('TARGET: EXTERNAL ECOSYSTEM', 20, 30);
      ctx.fillStyle = 'rgba(130, 149, 179, 0.6)';
      ctx.fillText('RADAR FREQ: 2.4 GHz • THREAT MATRIX ACTIVE', 20, 46);
      ctx.fillText(`NODES MONITORED: ${NODE_COUNT} ASSETS`, width - 190, 30);
      ctx.fillText('DETERMINISTIC EVALUATION: ACTIVE', width - 190, 46);
      ctx.restore();

      if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (isReducedMotion) {
      render(0);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-cyber-border/80 bg-cyber-dark/60 backdrop-blur-md shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Corner HUD crosshairs */}
      <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-cyber-accent/60 pointer-events-none" />
      <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-cyber-accent/60 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-cyber-accent/60 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-cyber-accent/60 pointer-events-none" />

      {/* Floating Status Badge */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyber-darkest/90 border border-cyber-border text-[11px] font-mono text-cyber-textMuted pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse" />
          <span className="text-white font-medium">LIVE THREAT SURVEILLANCE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyber-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald" />
            GROUND TRUTH EXCLUSION
          </span>
          <span className="hidden sm:inline-block text-cyber-border">|</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-cyber-rose">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-rose" />
            SUSPICIOUS RISK MAPPING
          </span>
        </div>
      </div>
    </div>
  );
}
