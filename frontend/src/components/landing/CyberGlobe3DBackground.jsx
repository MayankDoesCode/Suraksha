import React, { useEffect, useRef, useState } from 'react';

/**
 * CyberGlobe3DBackground
 * 
 * Interactive 3D Cybersecurity Telemetry Background for SURAKSHA.
 * Features:
 * - Slowly rotating 3D digital Earth/globe with Ice Cyan and Muted Violet network nodes and curved connection arcs.
 * - 3-layer 3D particle field (background, midground, foreground) moving at different depths and speeds.
 * - Restrained lighting with realistic depth and smooth, non-distracting motion.
 * - Gentle mouse-based parallax creating smooth depth without disorientation.
 * - Obsidian Navy (#080F1D), Ice Cyan (#45C8E8), and Muted Violet (#9B8AFB) palette.
 * - Left-side dark gradient overlay preserving full contrast and readability for headline and CTAs.
 * - Responsive placement: right-framed on desktop, centered on mobile/tablet.
 * - Smooth vertical blend into lower hero section.
 * - Respects prefers-reduced-motion, pauses animation when tab is hidden, and handles WebGL/Canvas failures gracefully.
 * - pointer-events-none ensures zero click interference with buttons, links, or navigation.
 */
export default function CyberGlobe3DBackground() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hasCanvasError, setHasCanvasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setHasCanvasError(true);
      return;
    }

    let animId;
    let width = 0;
    let height = 0;
    let isVisible = true;

    // Check user accessibility preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReducedMotion = mediaQuery.matches;

    // Responsive sizing with Device Pixel Ratio clamping (max 2 for high-DPI performance)
    const resize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Visibility API listener to conserve GPU/CPU when tab is hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !isReducedMotion) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      } else if (!isVisible && animId) {
        cancelAnimationFrame(animId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ----------------------------------------------------
    // 1. CONTINENTAL COORDINATES (Dense Landmass Points)
    // ----------------------------------------------------
    const landmassRegions = [
      // North America
      { minLat: 22, maxLat: 62, minLon: -128, maxLon: -68, density: 160 },
      // Central & South America
      { minLat: -52, maxLat: 16, minLon: -80, maxLon: -36, density: 120 },
      // Europe & UK
      { minLat: 35, maxLat: 66, minLon: -12, maxLon: 38, density: 145 },
      // Africa
      { minLat: -35, maxLat: 36, minLon: -18, maxLon: 50, density: 155 },
      // Asia, India & Middle East
      { minLat: 8, maxLat: 66, minLon: 40, maxLon: 142, density: 250 },
      // Japan & East Asian Archipelago
      { minLat: 28, maxLat: 46, minLon: 128, maxLon: 146, density: 45 },
      // Australia & Oceania
      { minLat: -44, maxLat: -10, minLon: 112, maxLon: 178, density: 95 },
    ];

    const landDots = [];
    landmassRegions.forEach(region => {
      for (let i = 0; i < region.density; i++) {
        const lat = region.minLat + Math.random() * (region.maxLat - region.minLat);
        const lon = region.minLon + Math.random() * (region.maxLon - region.minLon);
        landDots.push({
          lat: (lat * Math.PI) / 180,
          lon: (lon * Math.PI) / 180,
          size: Math.random() > 0.82 ? 1.5 : 1.0,
          isBright: Math.random() > 0.80,
        });
      }
    });

    // ----------------------------------------------------
    // 2. GLOBAL CYBER SECURITY TELEMETRY HUBS
    // ----------------------------------------------------
    const hubs = [
      { name: 'US-East (Ashburn)', lat: 39.04, lon: -77.48, pulseSpeed: 1.8 },
      { name: 'US-West (Silicon Valley)', lat: 37.38, lon: -122.08, pulseSpeed: 2.1 },
      { name: 'Europe (Frankfurt)', lat: 50.11, lon: 8.68, pulseSpeed: 1.7 },
      { name: 'Europe (London)', lat: 51.50, lon: -0.12, pulseSpeed: 2.4 },
      { name: 'India (Mumbai/Delhi)', lat: 19.07, lon: 72.87, pulseSpeed: 2.6 },
      { name: 'Asia (Singapore)', lat: 1.35, lon: 103.81, pulseSpeed: 2.2 },
      { name: 'East Asia (Tokyo)', lat: 35.67, lon: 139.65, pulseSpeed: 1.9 },
      { name: 'Australia (Sydney)', lat: -33.86, lon: 151.20, pulseSpeed: 1.6 },
      { name: 'South America (São Paulo)', lat: -23.55, lon: -46.63, pulseSpeed: 1.5 },
      { name: 'Middle East (Dubai)', lat: 25.20, lon: 55.27, pulseSpeed: 2.0 },
    ].map(h => ({
      ...h,
      latRad: (h.lat * Math.PI) / 180,
      lonRad: (h.lon * Math.PI) / 180,
      phase: Math.random() * Math.PI * 2,
    }));

    // Inter-hub network arcs
    const arcPairs = [
      [0, 1], // Ashburn <-> Silicon Valley
      [0, 3], // Ashburn <-> London
      [3, 2], // London <-> Frankfurt
      [2, 9], // Frankfurt <-> Dubai
      [9, 4], // Dubai <-> Mumbai
      [4, 5], // Mumbai <-> Singapore
      [5, 6], // Singapore <-> Tokyo
      [6, 7], // Tokyo <-> Sydney
      [0, 8], // Ashburn <-> Sao Paulo
      [1, 6], // Silicon Valley <-> Tokyo (Trans-Pacific)
      [3, 4], // London <-> Mumbai
      [5, 7], // Singapore <-> Sydney
    ];

    // Flowing arc telemetry packets
    const arcPackets = arcPairs.map((_, i) => ({
      progress: (i / arcPairs.length) * 0.95,
      speed: 0.18 + Math.random() * 0.15,
      size: 2.2,
    }));

    // ----------------------------------------------------
    // 3. LAYERED 3D DEPTH PARTICLE FIELD
    // ----------------------------------------------------
    // Layer 1: Background ambient dust (slow, small, faint)
    const bgParticles = Array.from({ length: 45 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      size: Math.random() * 1.2 + 0.6,
      alpha: Math.random() * 0.35 + 0.15,
      depth: 0.25,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Layer 2: Midground cyber telemetry particles (moderate speed)
    const midParticles = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      size: Math.random() * 1.6 + 0.8,
      alpha: Math.random() * 0.45 + 0.2,
      depth: 0.65,
      pulse: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? '#45C8E8' : '#9B8AFB',
    }));

    // Layer 3: Foreground floating beacons (closest, parallax sensitive)
    const fgParticles = Array.from({ length: 15 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      size: Math.random() * 2.0 + 1.1,
      alpha: Math.random() * 0.5 + 0.3,
      depth: 1.0,
      pulse: Math.random() * Math.PI * 2,
    }));

    // ----------------------------------------------------
    // 4. MOUSE PARALLAX & ROTATION STATE
    // ----------------------------------------------------
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let rotation = 0;
    const axialTilt = (23.4 * Math.PI) / 180; // Earth's true axial tilt in radians

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      // Normalized between -1 and 1
      mouse.targetX = (clientX / width - 0.5) * 2;
      mouse.targetY = (clientY / height - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // ----------------------------------------------------
    // 5. 3D ORTHOGRAPHIC PROJECTION HELPER
    // ----------------------------------------------------
    const project = (lat, lon, radius, rotY, tiltX) => {
      // 1. Sphere position with Y rotation
      const x0 = radius * Math.cos(lat) * Math.sin(lon + rotY);
      const y0 = -radius * Math.sin(lat);
      const z0 = radius * Math.cos(lat) * Math.cos(lon + rotY);

      // 2. Axial tilt rotation
      const y1 = y0 * Math.cos(tiltX) - z0 * Math.sin(tiltX);
      const z1 = y0 * Math.sin(tiltX) + z0 * Math.cos(tiltX);

      return { x: x0, y: y1, z: z1 };
    };

    // ----------------------------------------------------
    // 6. MAIN RENDER LOOP
    // ----------------------------------------------------
    let lastTime = performance.now();

    const render = (time) => {
      if (!isVisible) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerping
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const currentTilt = axialTilt + mouse.y * 0.4;
      if (!isReducedMotion) {
        rotation += 0.0028 + mouse.x * 0.01;
      }

      // Responsive globe placement:
      // Desktop: placed in right column (~72% across width)
      // Mobile / Tablet: centered (~50% across width)
      const isDesktop = width >= 1024;
      const centerX = isDesktop ? width * 0.72 + mouse.x * 25 : width * 0.5 + mouse.x * 15;
      const centerY = isDesktop ? height * 0.50 + mouse.y * 25 : height * 0.52 + mouse.y * 15;

      const globeRadius = isDesktop
        ? Math.min(width * 0.32, height * 0.40, 350)
        : Math.min(width * 0.40, height * 0.32, 220);

      // --------------------------------------------------
      // A. RENDER LAYER 1: BACKGROUND PARTICLES
      // --------------------------------------------------
      bgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        const pX = p.x * width + mouse.x * 30 * p.depth;
        const pY = p.y * height + mouse.y * 30 * p.depth;
        const tw = Math.sin(time * 0.0015 + p.pulse) * 0.2 + 0.8;

        ctx.fillStyle = `rgba(142, 162, 198, ${p.alpha * tw * 0.4})`;
        ctx.beginPath();
        ctx.arc(pX, pY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // --------------------------------------------------
      // B. RENDER LAYER 2: MIDGROUND CYBER PARTICLES
      // --------------------------------------------------
      midParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        const pX = p.x * width + mouse.x * 55 * p.depth;
        const pY = p.y * height + mouse.y * 55 * p.depth;
        const tw = Math.sin(time * 0.002 + p.pulse) * 0.25 + 0.75;

        ctx.fillStyle =
          p.color === '#45C8E8'
            ? `rgba(69, 200, 232, ${p.alpha * tw * 0.55})`
            : `rgba(155, 138, 251, ${p.alpha * tw * 0.45})`;
        ctx.beginPath();
        ctx.arc(pX, pY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // --------------------------------------------------
      // C. RESTRAINED AMBIENT HALO BEHIND GLOBE
      // --------------------------------------------------
      const haloGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        globeRadius * 0.70,
        centerX,
        centerY,
        globeRadius * 1.45
      );
      haloGradient.addColorStop(0, 'rgba(69, 200, 232, 0.08)');
      haloGradient.addColorStop(0.4, 'rgba(56, 189, 248, 0.04)');
      haloGradient.addColorStop(0.75, 'rgba(155, 138, 251, 0.02)');
      haloGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // --------------------------------------------------
      // D. GLOBE INTERIOR BASE SHADING
      // --------------------------------------------------
      const globeShade = ctx.createRadialGradient(
        centerX - globeRadius * 0.35,
        centerY - globeRadius * 0.35,
        globeRadius * 0.08,
        centerX,
        centerY,
        globeRadius
      );
      globeShade.addColorStop(0, '#0E1726');
      globeShade.addColorStop(0.65, '#0B1424');
      globeShade.addColorStop(1, '#080F1D');

      ctx.fillStyle = globeShade;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();

      // --------------------------------------------------
      // E. DUAL RESTRAINED ORBITAL RINGS & SATELLITE BEACONS
      // --------------------------------------------------
      const drawOrbitalRing = (ringR, tiltDeg, strokeStyle, beaconColor, speed, offset) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((tiltDeg * Math.PI) / 180);

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([3, 7]);

        ctx.beginPath();
        ctx.ellipse(0, 0, ringR, ringR * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting beacon marker
        const bAngle = time * speed + offset;
        const bx = ringR * Math.cos(bAngle);
        const by = ringR * 0.34 * Math.sin(bAngle);

        // Beacon outer pulse
        ctx.fillStyle = beaconColor;
        ctx.beginPath();
        ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Beacon center core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Outer violet orbital ring
      drawOrbitalRing(
        globeRadius * 1.34,
        -26,
        'rgba(155, 138, 251, 0.16)',
        '#9B8AFB',
        0.0004,
        1.2
      );

      // Inner cyan orbital ring
      drawOrbitalRing(
        globeRadius * 1.18,
        32,
        'rgba(69, 200, 232, 0.20)',
        '#45C8E8',
        -0.0005,
        2.8
      );

      // --------------------------------------------------
      // F. LATITUDE & LONGITUDE CYBER GRID
      // --------------------------------------------------
      ctx.save();
      const parallels = [-60, -30, 0, 30, 60];
      parallels.forEach(latDeg => {
        ctx.beginPath();
        let first = true;
        for (let lonDeg = 0; lonDeg <= 360; lonDeg += 8) {
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
        ctx.strokeStyle = latDeg === 0 ? 'rgba(69, 200, 232, 0.14)' : 'rgba(142, 162, 198, 0.06)';
        ctx.lineWidth = latDeg === 0 ? 0.9 : 0.6;
        ctx.setLineDash([3, 6]);
        ctx.stroke();
      });
      ctx.restore();

      // --------------------------------------------------
      // G. CONTINENTAL LANDMASS DOTS (3D Volumetric Depth)
      // --------------------------------------------------
      landDots.forEach(dot => {
        const p = project(dot.lat, dot.lon, globeRadius, rotation, currentTilt);
        const sx = centerX + p.x;
        const sy = centerY + p.y;

        if (p.z > 0) {
          // Front hemisphere dot
          const depthRatio = p.z / globeRadius; // 0 (horizon) to 1 (zenith)
          const alpha = 0.20 + depthRatio * 0.70;

          if (dot.isBright) {
            ctx.fillStyle = `rgba(69, 200, 232, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, dot.size + 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
            ctx.beginPath();
            ctx.arc(sx, sy, dot.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = `rgba(142, 162, 198, ${alpha * 0.65})`;
            ctx.beginPath();
            ctx.arc(sx, sy, dot.size, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Back hemisphere faint translucency
          const depthRatio = Math.abs(p.z) / globeRadius;
          const alpha = 0.05 * (1 - depthRatio * 0.5);
          ctx.fillStyle = `rgba(30, 49, 79, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --------------------------------------------------
      // H. CURVED 3D CONNECTION ARCS WITH FLOWING LIGHT TRAILS
      // --------------------------------------------------
      arcPairs.forEach(([idxA, idxB], arcIdx) => {
        const hubA = hubs[idxA];
        const hubB = hubs[idxB];
        const pA = project(hubA.latRad, hubA.lonRad, globeRadius, rotation, currentTilt);
        const pB = project(hubB.latRad, hubB.lonRad, globeRadius, rotation, currentTilt);

        // Render if at least one hub is on the front side
        if (pA.z > -25 || pB.z > -25) {
          const sxA = centerX + pA.x;
          const syA = centerY + pA.y;
          const sxB = centerX + pB.x;
          const syB = centerY + pB.y;

          // Lift arc midpoint into 3D space above globe surface
          const midX = (pA.x + pB.x) * 0.5;
          const midY = (pA.y + pB.y) * 0.5;
          const midZ = (pA.z + pB.z) * 0.5;
          const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ) || 1;
          const arcAltitude = globeRadius * 0.24;
          const peakX = (midX / midLen) * (globeRadius + arcAltitude);
          const peakY = (midY / midLen) * (globeRadius + arcAltitude);
          const sPeakX = centerX + peakX;
          const sPeakY = centerY + peakY;

          // Arc stroke gradient
          const arcGrad = ctx.createLinearGradient(sxA, syA, sxB, syB);
          arcGrad.addColorStop(0, 'rgba(69, 200, 232, 0.30)');
          arcGrad.addColorStop(0.5, 'rgba(155, 138, 251, 0.35)');
          arcGrad.addColorStop(1, 'rgba(69, 200, 232, 0.30)');

          ctx.strokeStyle = arcGrad;
          ctx.lineWidth = 1.1;
          ctx.setLineDash([2, 5]);

          ctx.beginPath();
          ctx.moveTo(sxA, syA);
          ctx.quadraticCurveTo(sPeakX, sPeakY, sxB, syB);
          ctx.stroke();

          // Flowing Light Packet along quadratic bezier curve
          if (!isReducedMotion) {
            const pkt = arcPackets[arcIdx];
            pkt.progress += pkt.speed * dt;
            if (pkt.progress > 1) pkt.progress = 0;

            const t = pkt.progress;
            // Quadratic Bezier point: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const omt = 1 - t;
            const pktX = omt * omt * sxA + 2 * omt * t * sPeakX + t * t * sxB;
            const pktY = omt * omt * syA + 2 * omt * t * sPeakY + t * t * syB;

            // Packet glow head
            ctx.fillStyle = '#45C8E8';
            ctx.beginPath();
            ctx.arc(pktX, pktY, pkt.size, 0, Math.PI * 2);
            ctx.fill();

            // Packet white core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pktX, pktY, pkt.size * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // --------------------------------------------------
      // I. CYBER SECURITY TELEMETRY HUBS (Pulsing Nodes)
      // --------------------------------------------------
      hubs.forEach(hub => {
        const p = project(hub.latRad, hub.lonRad, globeRadius, rotation, currentTilt);
        if (p.z > 0) {
          const sx = centerX + p.x;
          const sy = centerY + p.y;
          const depthRatio = p.z / globeRadius;
          const pulse = (Math.sin(time * 0.003 * hub.pulseSpeed + hub.phase) + 1) * 0.5;

          // Outer ripple circle
          const rippleRadius = 4.0 + pulse * 6.5;
          ctx.strokeStyle = `rgba(69, 200, 232, ${(1 - pulse) * 0.45 * depthRatio})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(sx, sy, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Core node marker
          ctx.fillStyle = `rgba(69, 200, 232, ${0.85 * depthRatio})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --------------------------------------------------
      // J. RENDER LAYER 3: FOREGROUND FLOATING TELEMETRY PARTICLES
      // --------------------------------------------------
      fgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        const pX = p.x * width + mouse.x * 95 * p.depth;
        const pY = p.y * height + mouse.y * 95 * p.depth;
        const tw = Math.sin(time * 0.0025 + p.pulse) * 0.3 + 0.7;

        ctx.fillStyle = `rgba(69, 200, 232, ${p.alpha * tw * 0.6})`;
        ctx.beginPath();
        ctx.arc(pX, pY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Continue animation loop if motion is permitted
      if (!isReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Static Fallback Image if Canvas Fails */}
      {hasCanvasError && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-no-repeat bg-[center_right] opacity-90 transition-opacity"
          style={{ backgroundImage: "url('/cyber_hero_bg.jpg')" }}
        />
      )}

      {/* 1. Geometric Cyber Dot Grid Overlay across entire hero canvas */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#1E314F_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />

      {/* 2. Interactive 3D Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* 3. Obsidian Navy Contrast Overlays Protecting Headline & CTA Readability */}
      {/* Left-to-right gradient protecting text content on the left column */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#080F1D] via-[#080F1D]/90 via-45% to-transparent sm:via-50% lg:via-46% lg:to-transparent" />

      {/* Vertical vignette blending smoothly into top nav and bottom hero boundary */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#080F1D]/60 via-transparent via-40% to-[#080F1D]" />

      {/* 4. Restrained Ambient Radial Glows */}
      <div className="absolute top-[20%] right-[16%] w-[380px] h-[380px] bg-[#45C8E8]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[45%] right-[12%] w-[340px] h-[340px] bg-[#9B8AFB]/4 rounded-full blur-[160px] pointer-events-none" />
    </div>
  );
}
