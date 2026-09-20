import React from 'react';
import { Globe, BookOpen, Clock, Activity, Sparkles } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
];

export default function Header({
  targetLang,
  onLanguageChange,
  connectionStatus,
  sessionSeconds,
  onOpenGlossary,
  onOpenArchitecture,
}) {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    if (connectionStatus === 'connected') {
      return <span className="badge-tag badge-green">● Live Stream (WebSocket)</span>;
    }
    if (connectionStatus === 'browser_assisted') {
      return <span className="badge-tag badge-blue">● Browser/Demo Mode</span>;
    }
    if (connectionStatus === 'connecting') {
      return <span className="badge-tag badge-amber">● Connecting...</span>;
    }
    return <span className="badge-tag badge-blue">● Offline / Demo</span>;
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="logo-badge">
          CB
        </div>
        <div>
          <div className="brand-title">
            ClassBridge
            <span className="badge-tag badge-blue">TENSORA 2026 | EDU-02</span>
          </div>
          <div className="brand-subtitle">
            Real-Time Vernacular Lecture Companion & Grounded Study Synthesis
          </div>
        </div>
      </div>

      <div className="header-actions">
        {getStatusBadge()}

        <div className="badge-tag badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          <span>{formatTime(sessionSeconds)}</span>
        </div>

        <div className="lang-selector">
          <Globe size={16} color="var(--brand-primary)" />
          <select
            className="lang-dropdown"
            value={targetLang}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-outline"
          onClick={onOpenGlossary}
          title="Inspect STEM Domain Adaptation Glossary"
        >
          <BookOpen size={15} />
          <span>STEM Glossary</span>
        </button>

        <button
          className="btn btn-outline"
          onClick={onOpenArchitecture}
          title="Architecture & Explainability Details"
        >
          <Sparkles size={15} />
          <span>About</span>
        </button>
      </div>
    </header>
  );
}
