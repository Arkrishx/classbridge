import React from 'react';
import Logo from './Logo';
import { SUPPORTED_LANGUAGES } from './Header';
import {
  Clock,
  Radio,
  BookOpen,
  Sparkles,
  Headphones,
  Mic,
  ArrowLeftRight,
  Globe,
  Settings2,
} from 'lucide-react';

export default function GoogleAppBar({
  sourceLang = 'en',
  targetLang = 'ta',
  onSourceLanguageChange,
  onLanguageChange,
  onSwapLanguages,
  connectionStatus = 'connected',
  sessionSeconds = 0,
  selectedDeviceLabel = 'Default Microphone',
  isBluetoothDevice = false,
  onOpenAudioDevices,
  onOpenGlossary,
  onOpenArchitecture,
  isRecording = false,
}) {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sourceLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
  const targetLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

  return (
    <header className="google-app-bar">
      {/* 1. Left: Official Brand & Logo */}
      <div className="google-bar-left">
        <Logo size="small" isRecording={isRecording} showSubtitle={false} />
        <div className="google-brand-meta">
          <span className="google-app-title">ClassBridge</span>
          <span className="google-tag-pill">EDU-02</span>
        </div>
      </div>

      {/* 2. Center: Prominent Google Translate-Style Bilingual Selector */}
      <div className="google-translate-bar" title="Google Translate-Style Bidirectional Language Pair">
        <div className="google-lang-pill source-pill">
          <span className="lang-flag">{sourceLangMeta.flag}</span>
          <select
            value={sourceLang}
            onChange={(e) => onSourceLanguageChange && onSourceLanguageChange(e.target.value)}
            className="google-lang-dropdown"
            title="Spoken Lecture Source Language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} disabled={l.code === targetLang}>
                {l.name} ({l.native})
              </option>
            ))}
          </select>
        </div>

        <button
          className="google-swap-circle-btn"
          onClick={onSwapLanguages}
          title={`Click to swap languages (${sourceLang.toUpperCase()} ⇄ ${targetLang.toUpperCase()})`}
          type="button"
        >
          <ArrowLeftRight size={15} />
        </button>

        <div className="google-lang-pill target-pill">
          <span className="lang-flag">{targetLangMeta.flag}</span>
          <select
            value={targetLang}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            className="google-lang-dropdown"
            title="Real-Time Subtitle Translation & Read Aloud Language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} disabled={l.code === sourceLang}>
                {l.name} ({l.native})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Right: System Actions, Audio Hardware Chip & Modals */}
      <div className="google-bar-right">
        {/* Audio Hardware Chip */}
        <button
          className="google-chip-action device-chip"
          onClick={onOpenAudioDevices}
          title={`Active Microphone: ${selectedDeviceLabel}. Click to switch between Bluetooth and laptop mic.`}
          type="button"
        >
          {isBluetoothDevice ? (
            <Headphones size={14} color="var(--google-green)" />
          ) : (
            <Mic size={14} color="var(--google-blue)" />
          )}
          <span className="google-chip-text">{selectedDeviceLabel}</span>
          <Settings2 size={12} color="var(--text-dim)" />
        </button>

        {/* Live Session Status */}
        <div className={`google-status-pill ${connectionStatus === 'connected' ? 'live' : 'browser'}`}>
          <span className="google-status-dot" />
          <span>{connectionStatus === 'connected' ? 'Live Stream' : 'Browser Engine'}</span>
        </div>

        {/* Session Timer */}
        <div className="google-chip-action timer-chip" title="Live lecture elapsed time">
          <Clock size={13} color="var(--google-yellow)" />
          <span className="google-timer-mono">{formatTime(sessionSeconds)}</span>
        </div>

        {/* Glossary Modal Button */}
        <button
          className="google-icon-btn"
          onClick={onOpenGlossary}
          title="STEM Technical Glossary & Domain Adaptation"
          type="button"
        >
          <BookOpen size={16} />
        </button>

        {/* About / Architecture Button */}
        <button
          className="google-icon-btn"
          onClick={onOpenArchitecture}
          title="About ClassBridge (Problem EDU-02)"
          type="button"
        >
          <Sparkles size={16} />
        </button>
      </div>
    </header>
  );
}
