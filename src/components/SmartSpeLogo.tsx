import React from 'react';

interface SmartSpeLogoProps {
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export default function SmartSpeLogo({
  size = 40,
  showText = false,
  showTagline = false,
  className = '',
  theme = 'auto'
}: SmartSpeLogoProps) {
  // Pure SVG high quality replica of the official 3D-gradient SmartSpe logo
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-350"
      >
        <defs>
          {/* Blue Gradient - Elegant glossy 3D blue for the top 'S' curve */}
          <linearGradient id="smartspe-blue-grad" x1="20" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="50%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#0033BB" />
          </linearGradient>

          {/* Green Gradient - Vibrant environmental organic green for the bottom 'S' curve */}
          <linearGradient id="smartspe-green-grad" x1="15" y1="100" x2="85" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="60%" stopColor="#8BC34A" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>

          {/* Circle Ring Blue Gradient */}
          <linearGradient id="smartspe-ring-blue" x1="30" y1="20" x2="80" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0066FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00C8FF" stopOpacity="0.2" />
          </linearGradient>

          {/* Circle Ring Green Gradient */}
          <linearGradient id="smartspe-ring-green" x1="90" y1="60" x2="40" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8BC34A" stopOpacity="0.1" />
          </linearGradient>

          {/* Drop Shadows for 3D Layering Overlap */}
          <filter id="logo-shadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* 1. The Orbit Rings (Futuristic cyber circular borders) */}
        {/* Blue Orbit Arc (top and left area) */}
        <path
          d="M 68 20 A 45 45 0 1 0 35 90"
          stroke="url(#smartspe-ring-blue)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Green Orbit Arc (bottom and right area) */}
        <path
          d="M 75 35 A 45 45 0 0 1 65 105 A 45 45 0 0 1 45 107"
          stroke="url(#smartspe-ring-green)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* 2. The Tech Pixel Grid (Digital solution aspect - top right) */}
        {/* Pixel 1: Blue (Right-most) */}
        <rect x="83" y="24" width="7" height="7" rx="1.5" fill="#0066FF" />
        <rect x="83" y="24" width="7" height="7" rx="1.5" fill="#00C8FF" opacity="0.4" />
        {/* Pixel 2: Bright Blue (Center-right top) */}
        <rect x="73" y="19" width="7" height="7" rx="1.5" fill="#00BFFF" />
        {/* Pixel 3: Vibrant Green (Top-right) */}
        <rect x="83" y="13" width="7" height="7" rx="1.5" fill="#66BB6A" />
        {/* Pixel 4: Deep Green (Center-right down) */}
        <rect x="73" y="30" width="7" height="7" rx="1.5" fill="#2E7D32" />

        {/* 3. The Stylized 'S' - Layered 3D Swirl */}
        <g filter="url(#logo-shadow)">
          {/* Top Blue glossy curve of the 'S' */}
          <path
            d="M 45 38 
               C 50 32, 65 24, 82 23 
               C 85 23, 86 26, 83 29 
               C 74 38, 62 45, 52 46
               C 44 47, 39 40, 45 38 Z"
            fill="url(#smartspe-blue-grad)"
          />
          
          {/* Intermediary flowing connection layer */}
          <path
            d="M 52 46
               C 60 45, 75 42, 85 36
               C 87 35, 87 38, 85 40
               C 72 50, 58 56, 45 56
               C 40 56, 43 51, 52 46 Z"
            fill="#0066FF"
            opacity="0.85"
          />

          {/* Bottom Green organic wave / leaf curve of the 'S' */}
          <path
            d="M 45 56 
               C 52 56, 68 53, 75 49 
               C 79 47, 81 50, 78 54 
               C 75 62, 70 82, 58 92 
               C 42 105, 30 102, 35 94
               C 40 85, 48 76, 52 68
               C 54 62, 50 56, 45 56 Z"
            fill="url(#smartspe-green-grad)"
          />

          {/* Leaf vein overlay to give that organic SmartSpe HD leaf aesthetic */}
          <path
            d="M 37 92 C 45 80, 51 72, 53 66"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.32"
          />
        </g>
      </svg>

      {/* Reusable Typographic Representation of SmartSpe */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline select-none">
            <span className="font-display font-extrabold tracking-tight text-xl md:text-2xl italic text-blue-800 dark:text-blue-400">
              Smart
            </span>
            <span className="font-display font-extrabold tracking-tight text-xl md:text-2xl italic text-emerald-600 dark:text-emerald-500">
              Spe
            </span>
          </div>
          {showTagline && (
            <div className="flex items-center gap-1.5 mt-0.5 select-none">
              <span className="h-[2px] w-2 bg-blue-600 rounded-sm" />
              <span className="text-[7.5px] uppercase tracking-widest font-mono font-extrabold text-slate-500 dark:text-slate-400">
                Smart Solution, Powerful Future
              </span>
              <span className="h-[2px] w-2 bg-emerald-500 rounded-sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
