import React, { useState } from 'react';
import classbridgeLogoImg from '../assets/classbridge-logo.jpg';

export default function Logo({ isRecording = false, size = 'default', showSubtitle = true }) {
  const [imgError, setImgError] = useState(false);

  const dim = size === 'large' ? 46 : size === 'small' ? 32 : 40;

  return (
    <div className={`classbridge-brand size-${size}`} title="ClassBridge — Real-Time Vernacular STEM Studio">
      <div className={`logo-mark-wrapper ${isRecording ? 'pulse-live' : ''}`} style={{ width: dim, height: dim }}>
        {!imgError ? (
          <img
            src={classbridgeLogoImg}
            alt="ClassBridge Logo"
            className="logo-img"
            width={dim}
            height={dim}
            onError={() => setImgError(true)}
            style={{
              width: `${dim}px`,
              height: `${dim}px`,
              borderRadius: size === 'small' ? '9px' : '12px',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          <svg
            width={dim}
            height={dim}
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="logo-svg"
          >
            <defs>
              <linearGradient id="cbBridgeGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="40" height="40" rx="12" fill="#0c101c" stroke="url(#cbBridgeGrad)" strokeWidth="1.5" />
            <path d="M8 30 C13 18, 19 13, 22 13 C25 13, 31 18, 36 30" stroke="url(#cbBridgeGrad)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="30" x2="14" y2="23" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="30" x2="18" y2="18" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="30" x2="22" y2="14" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="26" y1="30" x2="26" y2="18" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <line x1="30" y1="30" x2="30" y2="23" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <circle cx="22" cy="13" r="2.8" fill="#38bdf8" />
          </svg>
        )}

        {isRecording && <div className="logo-live-ring" />}
      </div>

      <div className="brand-text-block">
        <div className="brand-primary-row">
          <span className="brand-name">ClassBridge</span>
          <span className="studio-pill">STUDIO</span>
        </div>
        {showSubtitle && (
          <div className="brand-subtext">
            <span>Live Vernacular STEM Studio</span>
            <span className="edu-tag">EDU-02</span>
          </div>
        )}
      </div>
    </div>
  );
}
