import React from 'react';

/**
 * Ultra-Lightweight 0% CPU Marble Background.
 * 
 * 100% Static & Infinite (CSS Vector Gradients + SVG Filters).
 * - ZERO JavaScript animation loops (requestAnimationFrame is completely removed).
 * - ZERO CPU usage (0.0%).
 * - Instant rendering on page load.
 * - Perfectly captures luxury white Calacatta marble transitioning organically 
 *   into deep Marquina black obsidian, interwoven with liquid gold veins (#d4af37, #ffd700).
 */
export default function MarbleBackground({ mode = 'auto' }) {
  // Mode styles: 'auto' (blends white to noir diagonally), 'light' (Calacatta Gold), 'dark' (Marquina Gold)
  const isDark = mode === 'dark';
  const isLight = mode === 'light';

  return (
    <div
      className="marble-infinite-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Base Calacatta to Noir Infinite Stone Gradient */}
          <linearGradient id="marbleInfiniteBase" x1="0%" y1="0%" x2="100%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f5f3ec" />
                <stop offset="100%" stopColor="#e8e4d8" />
              </>
            ) : isDark ? (
              <>
                <stop offset="0%" stopColor="#0a0b0e" />
                <stop offset="50%" stopColor="#12141a" />
                <stop offset="100%" stopColor="#1a1c24" />
              </>
            ) : (
              <>
                {/* Auto mode: diagonal split from pure white Calacatta into dark Marquina */}
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="28%" stopColor="#f5f3ee" />
                <stop offset="52%" stopColor="#30333f" />
                <stop offset="78%" stopColor="#15171e" />
                <stop offset="100%" stopColor="#0a0b0f" />
              </>
            )}
          </linearGradient>

          {/* Liquid Gold Vector Vein Gradient 1 (24k Pure Gold) */}
          <linearGradient id="veinGold24k" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#aa7c11" stopOpacity="0.8" />
            <stop offset="20%" stopColor="#d4af37" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#fff2b2" stopOpacity="1" />
            <stop offset="70%" stopColor="#d4af37" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#8c5f0a" stopOpacity="0.75" />
          </linearGradient>

          {/* Liquid Gold Vector Vein Gradient 2 (Rose/Amber Gold) */}
          <linearGradient id="veinGoldAmber" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#e5b83b" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#fff5cc" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#b38210" stopOpacity="0.8" />
          </linearGradient>

          {/* Charcoal Mineral Vein Gradient */}
          <linearGradient id="veinCharcoal" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a1c24" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#2e323f" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#1e2029" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0d0e12" stopOpacity="0.8" />
          </linearGradient>

          {/* Light Pearl Vein Gradient */}
          <linearGradient id="veinPearl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#f3efe6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#dcd6c8" stopOpacity="0.2" />
          </linearGradient>

          {/* Static Soft Glow for Gold Veins (Instant GPU composite, 0 CPU) */}
          <filter id="staticGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="staticVeinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="5" stdDeviation="8" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 1. Base Marble Stone */}
        <rect width="1920" height="1080" fill="url(#marbleInfiniteBase)" />

        {/* 2. Soft Cloud-like Marble Mineral Washes */}
        <path
          d="M -100 250 Q 400 120 900 320 T 1950 200 L 1950 -50 L -100 -50 Z"
          fill="url(#veinPearl)"
          opacity="0.6"
        />
        <path
          d="M -50 750 Q 550 580 1100 820 T 2000 680 L 2000 1150 L -50 1150 Z"
          fill="url(#veinCharcoal)"
          opacity={isLight ? '0.08' : '0.45'}
        />

        {/* 3. Deep Charcoal & Obsidian Structural Veins */}
        <path
          d="M -50 180 C 320 80, 580 290, 920 220 C 1260 150, 1540 310, 1980 190 
             L 1980 230 C 1540 350, 1260 190, 920 260 C 580 330, 320 120, -50 220 Z"
          fill="url(#veinCharcoal)"
          filter="url(#staticVeinShadow)"
          opacity={isLight ? '0.15' : '0.7'}
        />

        <path
          d="M -50 680 C 380 540, 720 790, 1150 690 C 1580 590, 1720 740, 2000 620 
             L 2000 655 C 1720 775, 1580 625, 1150 725 C 720 825, 380 575, -50 715 Z"
          fill="url(#veinCharcoal)"
          filter="url(#staticVeinShadow)"
          opacity={isLight ? '0.12' : '0.65'}
        />

        {/* 4. Luxury 24K Liquid Gold Veins (Calacatta Gold signature) */}
        {/* Main Golden Diagonal Rift */}
        <path
          d="M -60 380 C 360 210, 680 480, 1080 350 C 1480 220, 1680 410, 2000 280 
             L 2000 310 C 1680 440, 1480 250, 1080 380 C 680 510, 360 240, -60 410 Z"
          fill="url(#veinGold24k)"
          filter="url(#staticGoldGlow)"
        />

        {/* Secondary Delicate Gold Filament */}
        <path
          d="M -40 395 C 380 225, 700 495, 1100 365 C 1500 235, 1700 425, 1980 295"
          fill="none"
          stroke="#fff9db"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Lower Amber-Gold Vein Flow */}
        <path
          d="M -80 840 C 420 710, 780 940, 1220 830 C 1660 720, 1790 860, 2020 760 
             L 2020 782 C 1790 882, 1660 742, 1220 852 C 780 962, 420 732, -80 862 Z"
          fill="url(#veinGoldAmber)"
          filter="url(#staticGoldGlow)"
        />

        {/* Fine Gold Micro-veins traversing the stone */}
        <path
          d="M 520 280 Q 750 420 880 560 T 1150 780"
          fill="none"
          stroke="url(#veinGold24k)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M 1240 320 Q 1420 480 1560 620"
          fill="none"
          stroke="url(#veinGoldAmber)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Subtle translucent crystalline speckles */}
        <circle cx="480" cy="290" r="3.5" fill="#fff5cc" opacity="0.8" />
        <circle cx="890" cy="540" r="2.5" fill="#ffd700" opacity="0.9" />
        <circle cx="1230" cy="340" r="4" fill="#ffffff" opacity="0.7" />
        <circle cx="1580" cy="650" r="3" fill="#ffe082" opacity="0.85" />
        <circle cx="720" cy="850" r="3" fill="#ffd54f" opacity="0.7" />
      </svg>
    </div>
  );
}
