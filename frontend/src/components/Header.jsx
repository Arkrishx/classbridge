import React from 'react';
import { BookOpen, Clock, Sparkles, Languages, Headphones, Mic } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

export default function Header({
  targetLang,
  onLanguageChange,
  connectionStatus,
  sessionSeconds,
  onOpenGlossary,
  onOpenArchitecture,
  selectedDeviceLabel = 'Default Microphone',
  isBluetoothDevice = false,
  onOpenAudioDevices,
}) {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="logo-symbol">
          CB
        </div>
        <div>
          <div className="brand-title">
            ClassBridge
            <span className="brand-tag">EDU-02</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Real-Time Vernacular Lecture Companion
          </div>
        </div>
      </div>

      {/* Tactile Segmented Language Selector (Tamil, Malayalam, Hindi ONLY) */}
      <div className="lang-segmented" title="Select Vernacular Caption Language">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = targetLang === lang.code;
          return (
            <button
              key={lang.code}
              className={`lang-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => onLanguageChange(lang.code)}
            >
              <span>{lang.native}</span>
              <span style={{ fontSize: '11px', opacity: 0.7 }}>{lang.name}</span>
            </button>
          );
        })}
      </div>

      <div className="header-actions">
        {/* Audio Input Device Selector Button */}
        <button
          className="btn-minimal header-device-btn"
          onClick={onOpenAudioDevices}
          title={`Active Microphone: ${selectedDeviceLabel}. Click to switch to Bluetooth headset or internal mic.`}
          style={{
            borderColor: isBluetoothDevice ? 'rgba(52, 211, 153, 0.4)' : 'rgba(56, 189, 248, 0.3)',
            background: isBluetoothDevice ? 'rgba(52, 211, 153, 0.08)' : 'rgba(56, 189, 248, 0.06)',
          }}
        >
          {isBluetoothDevice ? (
            <Headphones size={14} color="var(--accent-emerald)" />
          ) : (
            <Mic size={14} color="var(--accent-cyan)" />
          )}
          <span className="header-device-text" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedDeviceLabel}
          </span>
        </button>

        <div className={`status-badge ${connectionStatus === 'connected' ? 'status-live' : 'status-browser'}`}>
          <span className="status-pulse-dot" />
          <span>{connectionStatus === 'connected' ? 'Live Stream' : 'Browser Engine'}</span>
        </div>

        <div className="status-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(sessionSeconds)}</span>
        </div>

        <button
          className="btn-minimal"
          onClick={onOpenGlossary}
          title="Inspect STEM Domain Adaptation Glossary"
        >
          <BookOpen size={14} color="var(--accent-cyan)" />
          <span>Glossary</span>
        </button>

        <button
          className="btn-minimal"
          onClick={onOpenArchitecture}
          title="Architecture & Compliance"
        >
          <Sparkles size={14} color="var(--accent-indigo)" />
          <span>About</span>
        </button>
      </div>
    </header>
  );
}
