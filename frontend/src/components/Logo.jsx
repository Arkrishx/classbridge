import React from 'react';

export default function Logo({ isRecording = false, size = 'default' }) {
  const iconSize = size === 'large' ? 44 : 38;

  return (
    <div className="classbridge-brand" title="ClassBridge — Real-Time Vernacular STEM Studio">
      <div className={`logo-mark-wrapper ${isRecording ? 'pulse-live' : ''}`}>
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="logo-svg"
        >
          <defs>
            {/* Ambient Bridge Gradient */}
            <linearGradient id="cbBridgeGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            {/* Acoustic Waveform Gradient */}
            <linearGradient id="cbWaveGrad" x1="12" y1="14" x2="32" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Glowing Drop Filter */}
            <filter id="cbGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Background Rounded Shield */}
          <rect
            x="2"
            y="2"
            width="40"
            height="40"
            rx="11"
            fill="#0f172a"
            stroke="url(#cbBridgeGrad)"
            strokeWidth="1.5"
          />

          {/* Architectural Left Bridge Span Arch */}
          <path
            d="M8 32 C12 20, 18 13, 22 13"
            stroke="url(#cbBridgeGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#cbGlow)"
          />

          {/* Architectural Right Bridge Span Arch */}
          <path
            d="M36 32 C32 20, 26 13, 22 13"
            stroke="url(#cbBridgeGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#cbGlow)"
          />

          {/* Bridge Baseline Roadway Deck */}
          <path
            d="M7 32 H37"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Acoustic Soundwave Suspension Cables (Bridging Voice & Vernacular) */}
          <line x1="14" y1="32" x2="14" y2="24" stroke="url(#cbWaveGrad)" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="32" x2="18" y2="18" stroke="url(#cbWaveGrad)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="22" y1="32" x2="22" y2="14" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="26" y1="32" x2="26" y2="18" stroke="url(#cbWaveGrad)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="30" y1="32" x2="30" y2="24" stroke="url(#cbWaveGrad)" strokeWidth="2" strokeLinecap="round" />

          {/* Center Bridge Keystone Node */}
          <circle cx="22" cy="13" r="3.2" fill="#38bdf8" filter="url(#cbGlow)" />
          <circle cx="22" cy="13" r="1.5" fill="#ffffff" />
        </svg>

        {isRecording && <div className="logo-live-ring" />}
      </div>

      <div className="brand-text-block">
        <div className="brand-primary-row">
          <span className="brand-name">ClassBridge</span>
          <span className="studio-pill">STUDIO</span>
        </div>
        <div className="brand-subtext">
          <span>Real-Time Indic STEM Companion</span>
          <span className="edu-tag">EDU-02</span>
        </div>
      </div>
    </div>
  );
}
