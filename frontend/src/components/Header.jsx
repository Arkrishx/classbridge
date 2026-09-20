import React from 'react';
import { BookOpen, Clock, Sparkles, Languages, Headphones, Mic } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', bcp47: 'en-US', flag: '🇬🇧' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', bcp47: 'ta-IN', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', bcp47: 'ml-IN', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', bcp47: 'hi-IN', flag: '🇮🇳' },
];

export default function Header({
  sourceLang = 'en',
  targetLang = 'ta',
  onSourceLanguageChange,
  onLanguageChange,
  onSwapLanguages,
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

      {/* Bidirectional Language Pair Bar with 1-Click Swap */}
      <div className="header-lang-hub" title="Bidirectional Language Pair (Click ⇄ to swap)">
        <select
          className="header-lang-select"
          value={sourceLang}
          onChange={(e) => onSourceLanguageChange && onSourceLanguageChange(e.target.value)}
          title="Microphone Voice Recognition Language"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} disabled={l.code === targetLang}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>

        <button
          className="header-swap-btn"
          onClick={onSwapLanguages}
          title={`Swap languages: ${sourceLang.toUpperCase()} ⇄ ${targetLang.toUpperCase()}`}
        >
          ⇄
        </button>

        <select
          className="header-lang-select"
          value={targetLang}
          onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
          title="Translation & Read Aloud Output Language"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} disabled={l.code === sourceLang}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
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
