import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Share2,
  Crosshair,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

/**
 * DigitalGlobeCanvas
 * 
 * High-performance, photorealistic 3D digital Earth canvas for Suraksha.
 * Features:
 * - Spherical orthographic 3D projection with continental landmass dot-matrix
 * - Latitude/longitude cyber grid lines and atmospheric rim corona
 * - Glowing city nodes (magenta, purple, cyan) at major cyber/financial hubs
 * - 3D great-circle telemetry arcs with moving light packets
 * - Dual tilted orbital rings with rotating satellite markers
 * - Ambient floating space particles and cinematic depth lighting
 * - Accessible: respects prefers-reduced-motion
 * - Four glassmorphic capability callout cards placed around the globe perimeter
 */
export default function DigitalGlobeCanvas({ onLaunchDashboard, onScrollToSection }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activeCard, setActiveCard] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = 0;
    let height = 0;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReducedMotion = mediaQuery.matches;

    // Responsive sizing with Device Pixel Ratio for crystal clarity
    const resize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // ----------------------------------------------------
    // CONTINENTAL COORDINATE GENERATOR (Dense Landmass Points)
    // ----------------------------------------------------
    const landmassRegions = [
      // North America
      { minLat: 25, maxLat: 60, minLon: -125, maxLon: -70, density: 160 },
      // Central & South America
      { minLat: -50, maxLat: 15, minLon: -78, maxLon: -38, density: 120 },
      // Europe
      { minLat: 36, maxLat: 65, minLon: -10, maxLon: 35, density: 140 },
      // Africa
      { minLat: -34, maxLat: 35, minLon: -16, maxLon: 48, density: 150 },
      // Asia & Middle East
      { minLat: 10, maxLat: 65, minLon: 42, maxLon: 140, density: 240 },
      // Australia & NZ
      { minLat: -42, maxLat: -12, minLon: 115, maxLon: 175, density: 90 },
      // Japan & Archipelago
      { minLat: 30, maxLat: 45, minLon: 130, maxLon: 146, density: 40 },
    ];

    const landDots = [];
    landmassRegions.forEach(region => {
      for (let i = 0; i < region.density; i++) {
        // Sample points within rough continent bounds
        const lat = region.minLat + Math.random() * (region.maxLat - region.minLat);
        const lon = region.minLon + Math.random() * (region.maxLon - region.minLon);
        landDots.push({
          lat: (lat * Math.PI) / 180,
          lon: (lon * Math.PI) / 180,
          size: Math.random() > 0.85 ? 1.8 : 1.2,
          isBright: Math.random() > 0.8,
        });
      }
    });

    // ----------------------------------------------------
    // MAJOR CYBER TELEMETRY HUBS
    // ----------------------------------------------------
    const hubs = [
      { name: 'New York', lat: 40.71, lon: -74.0, color: '#00f0ff', glow: '#00f0ff' },
      { name: 'San Francisco', lat: 37.77, lon: -122.41, color: '#38bdf8', glow: '#38bdf8' },
      { name: 'London', lat: 51.5, lon: -0.12, color: '#a855f7', glow: '#c084fc' },
      { name: 'Frankfurt', lat: 50.11, lon: 8.68, color: '#ec4899', glow: '#f472b6' },
      { name: 'Tokyo', lat: 35.67, lon: 139.65, color: '#00f0ff', glow: '#00f0ff' },
      { name: 'Singapore', lat: 1.35, lon: 103.81, color: '#00f0ff', glow: '#38bdf8' },
      { name: 'Mumbai', lat: 19.07, lon: 72.87, color: '#f59e0b', glow: '#fbbf24' },
      { name: 'Sydney', lat: -33.86, lon: 151.2, color: '#a855f7', glow: '#c084fc' },
      { name: 'São Paulo', lat: -23.55, lon: -46.63, color: '#38bdf8', glow: '#00f0ff' },
    ].map(h => ({
      ...h,
      latRad: (h.lat * Math.PI) / 180,
      lonRad: (h.lon * Math.PI) / 180,
    }));

    // Arc pairs connecting hubs
    const arcPairs = [
      [0, 1], // NY - SF
      [0, 2], // NY - London
      [2, 3], // London - Frankfurt
      [3, 5], // Frankfurt - Singapore
      [5, 4], // Singapore - Tokyo
      [4, 1], // Tokyo - SF
      [5, 6], // Singapore - Mumbai
      [6, 2], // Mumbai - London
      [5, 7], // Singapore - Sydney
      [0, 8], // NY - São Paulo
    ];

    // Background floating dust particles
    const particles = Array.from({ length: 42 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.0003,
      speedY: (Math.random() - 0.5) * 0.0003,
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Animation state
    let rotation = 0;
    const axialTilt = (-23.5 * Math.PI) / 180;
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      mouse.targetX = nx * 0.15;
      mouse.targetY = ny * 0.15;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // ----------------------------------------------------
    // 3D PROJECTION HELPER
    // ----------------------------------------------------
    const project = (lat, lon, radius, rotY, tiltX) => {
      // 1. Sphere position
      const x0 = radius * Math.cos(lat) * Math.sin(lon + rotY);
      const y0 = -radius * Math.sin(lat);
      const z0 = radius * Math.cos(lat) * Math.cos(lon + rotY);

      // 2. Axial tilt rotation
      const y1 = y0 * Math.cos(tiltX) - z0 * Math.sin(tiltX);
      const z1 = y0 * Math.sin(tiltX) + z0 * Math.cos(tiltX);

      return { x: x0, y: y1, z: z1 };
    };

    // ----------------------------------------------------
    // MAIN RENDER LOOP
    // ----------------------------------------------------
    let lastTime = performance.now();

    const render = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Ease mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const currentTilt = axialTilt + mouse.y;
      if (!isReducedMotion) {
        rotation += 0.004 + mouse.x * 0.02;
      }

      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const globeRadius = Math.min(width, height) * 0.36;

      // 1. Draw Background Floating Starfield / Dust
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        const tw = Math.sin(time * 0.002 + p.pulse) * 0.2 + 0.8;

        ctx.fillStyle = `rgba(165, 200, 255, ${p.alpha * tw * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Atmospheric Ambient Backglow (Cyan + Violet Radial Halo)
      const haloGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        globeRadius * 0.7,
        centerX,
        centerY,
        globeRadius * 1.55
      );
      haloGradient.addColorStop(0, 'rgba(0, 240, 255, 0.16)');
      haloGradient.addColorStop(0.35, 'rgba(99, 102, 241, 0.10)');
      haloGradient.addColorStop(0.7, 'rgba(168, 85, 247, 0.04)');
      haloGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.55, 0, Math.PI * 2);
      ctx.fill();

      // 3. Dark Globe Base Shading
      const globeShade = ctx.createRadialGradient(
        centerX - globeRadius * 0.3,
        centerY - globeRadius * 0.3,
        globeRadius * 0.1,
        centerX,
        centerY,
        globeRadius
      );
      globeShade.addColorStop(0, '#0d1527');
      globeShade.addColorStop(0.65, '#070c18');
      globeShade.addColorStop(1, '#040710');

      ctx.fillStyle = globeShade;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Dual Tilted Orbital Rings with Orbiting Beacons
      const drawOrbitalRing = (ringR, tiltDeg, strokeStyle, beaconColor, speed, offset) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((tiltDeg * Math.PI) / 180);

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);

        ctx.beginPath();
        ctx.ellipse(0, 0, ringR, ringR * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting beacon point
        const bAngle = time * speed + offset;
        const bx = ringR * Math.cos(bAngle);
        const by = ringR * 0.35 * Math.sin(bAngle);

        // Beacon glow
        ctx.fillStyle = beaconColor;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Outer violet orbital ring
      drawOrbitalRing(
        globeRadius * 1.35,
        -28,
        'rgba(168, 85, 247, 0.22)',
        '#c084fc',
        0.0006,
        1.5
      );

      // Inner cyan orbital ring
      drawOrbitalRing(
        globeRadius * 1.2,
        34,
        'rgba(0, 240, 255, 0.28)',
        '#00f0ff',
        -0.0008,
        3.2
      );

      // 5. Latitude & Longitude Cyber Grid (Front and Back)
      ctx.save();
      const parallels = [-60, -30, 0, 30, 60];
      parallels.forEach(latDeg => {
        const latRad = (latDeg * Math.PI) / 180;
        ctx.beginPath();
        let first = true;
        for (let lonDeg = 0; lonDeg <= 360; lonDeg += 6) {
          const p = project((latDeg * Math.PI) / 180, (lonDeg * Math.PI) / 180, globeRadius, rotation, currentTilt);
          if (p.z > 0) {
            const sx = centerX + p.x;
            const sy = centerY + p.y;
            if (first) {
              ctx.moveTo(sx, sy);
              first = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            first = true;
          }
        }
        ctx.strokeStyle = latDeg === 0 ? 'rgba(0, 240, 255, 0.16)' : 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = latDeg === 0 ? 1 : 0.75;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
      });
      ctx.restore();

      // 6. Continental Landmass Dots (Volumetric Depth Rendering)
      landDots.forEach(dot => {
        const p = project(dot.lat, dot.lon, globeRadius, rotation, currentTilt);
        const sx = centerX + p.x;
        const sy = centerY + p.y;

        if (p.z > 0) {
          // Front hemisphere dot
          const depthRatio = p.z / globeRadius; // 0 to 1
          const alpha = 0.2 + depthRatio * 0.75;

          if (dot.isBright) {
            ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, dot.size + 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(sx, sy, dot.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = `rgba(96, 165, 250, ${alpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(sx, sy, dot.size, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Back hemisphere faint dot (depth translucency)
          const depthRatio = Math.abs(p.z) / globeRadius;
          const alpha = 0.08 * (1 - depthRatio * 0.5);
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Great-Circle 3D Telemetry Arcs with Animated Signal Pulses
      arcPairs.forEach(([idxA, idxB], arcIdx) => {
        const hubA = hubs[idxA];
        const hubB = hubs[idxB];
        const pA = project(hubA.latRad, hubA.lonRad, globeRadius, rotation, currentTilt);
        const pB = project(hubB.latRad, hubB.lonRad, globeRadius, rotation, currentTilt);

        // If at least one node is on front hemisphere
        if (pA.z > -20 || pB.z > -20) {
          const sxA = centerX + pA.x;
          const syA = centerY + pA.y;
          const sxB = centerX + pB.x;
          const syB = centerY + pB.y;

          // Midpoint lifted above sphere
          const midX = (pA.x + pB.x) * 0.5;
          const midY = (pA.y + pB.y) * 0.5;
          const midZ = (pA.z + pB.z) * 0.5;
          const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ) || 1;
          const arcAltitude = globeRadius * 0.28;
          const peakX = (midX / midLen) * (globeRadius + arcAltitude);
          const peakY = (midY / midLen) * (globeRadius + arcAltitude);
          const sPeakX = centerX + peakX;
          const sPeakY = centerY + peakY;

          // Arc gradient
          const arcGrad = ctx.createLinearGradient(sxA, syA, sxB, syB);
          arcGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
          arcGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
          arcGrad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');

          ctx.strokeStyle = arcGrad;
          ctx.lineWidth = 1.3;
          ctx.setLineDash([2, 4]);

          ctx.beginPath();
          ctx.moveTo(sxA, syA);
          ctx.quadraticCurveTo(sPeakX, sPeakY, sxB, syB);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated traveling light packet
          const arcProgress = ((time * 0.0006 + arcIdx * 0.25) % 1);
          const t = arcProgress;
          const invT = 1 - t;
          // Quadratic Bezier interpolation
          const px = invT * invT * sxA + 2 * invT * t * sPeakX + t * t * sxB;
          const py = invT * invT * syA + 2 * invT * t * sPeakY + t * t * syB;

          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 8. Cyber City Hub Markers (Glowing Pulsing Nodes)
      hubs.forEach(hub => {
        const p = project(hub.latRad, hub.lonRad, globeRadius, rotation, currentTilt);
        if (p.z > 0) {
          const sx = centerX + p.x;
          const sy = centerY + p.y;
          const depthRatio = p.z / globeRadius;
          const pulse = (Math.sin(time * 0.004 + p.x) + 1) * 0.5;

          // Outer pulse ring
          ctx.strokeStyle = hub.glow;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, 4 + pulse * 4, 0, Math.PI * 2);
          ctx.stroke();

          // Hub point
          ctx.fillStyle = hub.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 9. Luminous Atmospheric Rim Corona (Electric Cyan & Sapphire Rim Light)
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;

      const rimGradient = ctx.createLinearGradient(
        centerX - globeRadius,
        centerY - globeRadius,
        centerX + globeRadius,
        centerY + globeRadius
      );
      rimGradient.addColorStop(0, '#00f0ff');
      rimGradient.addColorStop(0.35, '#3b82f6');
      rimGradient.addColorStop(0.7, '#8b5cf6');
      rimGradient.addColorStop(1, '#00f0ff');

      ctx.strokeStyle = rimGradient;
      ctx.stroke();

      // Specular highlight crescent along top-left atmospheric edge
      const crescentGlow = ctx.createRadialGradient(
        centerX - globeRadius * 0.7,
        centerY - globeRadius * 0.7,
        globeRadius * 0.2,
        centerX - globeRadius * 0.7,
        centerY - globeRadius * 0.7,
        globeRadius * 0.9
      );
      crescentGlow.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
      crescentGlow.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)');
      crescentGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = crescentGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // ----------------------------------------------------
  // CALLOUT CAPABILITY CARDS AROUND GLOBE
  // ----------------------------------------------------
  const capabilityCards = [
    {
      id: 'social',
      title: 'Social Media Monitoring',
      subtitle: 'Impersonation & Lookalike Detection',
      icon: Share2,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      badge: 'ML CLASSIFIER',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
      posClasses: 'top-2 left-2 sm:top-4 sm:-left-4',
      targetSection: 'preview',
    },
    {
      id: 'threats',
      title: 'Threat Intelligence',
      subtitle: 'Explainable Bounded Risk Index',
      icon: Crosshair,
      iconColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      badge: '0.0 - 100.0 MATH',
      badgeColor: 'text-violet-400 bg-violet-950/60 border-violet-500/30',
      posClasses: 'top-8 right-2 sm:top-10 sm:-right-4',
      targetSection: 'scoring',
    },
    {
      id: 'brand',
      title: 'Brand Protection',
      subtitle: 'Ground Truth Asset Whitelisting',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'ZERO-FP SHIELD',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
      posClasses: 'bottom-12 left-2 sm:bottom-14 sm:-left-4',
      targetSection: 'capabilities',
    },
    {
      id: 'apps',
      title: 'App Store Ingestion',
      subtitle: 'Rogue App & Package Tracking',
      icon: Smartphone,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      badge: 'LIVE ITUNES API',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-500/30',
      posClasses: 'bottom-4 right-2 sm:bottom-6 sm:-right-4',
      targetSection: 'architecture',
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px] flex items-center justify-center select-none"
      aria-label="Interactive 3D Digital Cyber Threat Globe"
    >
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-radial from-cyan-500/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* HTML5 Digital Earth Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block relative z-10 cursor-grab active:cursor-grabbing"
      />

      {/* 4 Glassmorphism Capability Callout Cards Around Globe */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {capabilityCards.map(card => {
          const Icon = card.icon;
          const isHovered = activeCard === card.id;

          return (
            <div
              key={card.id}
              onClick={() => {
                if (onScrollToSection) {
                  onScrollToSection(card.targetSection);
                } else if (onLaunchDashboard) {
                  onLaunchDashboard();
                }
              }}
              onMouseEnter={() => setActiveCard(card.id)}
              onMouseLeave={() => setActiveCard(null)}
              className={`absolute ${card.posClasses} pointer-events-auto cursor-pointer transition-all duration-300 transform ${
                isHovered ? 'scale-105 -translate-y-1' : ''
              }`}
            >
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#090e1c]/85 backdrop-blur-xl border border-slate-800/80 hover:border-cyan-500/50 shadow-2xl shadow-black/80 flex items-center gap-3 max-w-[240px] sm:max-w-[260px] transition-all group">
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${card.iconColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-white font-mono truncate group-hover:text-cyan-400 transition-colors">
                      {card.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                    {card.subtitle}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className={`text-[8px] font-mono font-semibold px-1.5 py-0.2 rounded border ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
