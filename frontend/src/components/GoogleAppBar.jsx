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
  FileText,
  FileDown,
  Users,
  Crown,
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
  onExportTxt,
  onExportPdf,
  segmentCount = 0,
  classMode = 'realtime_classroom',
  userRole = 'student',
  roomCode = 'EDU-02',
  studentCount = 0,
  hasTeacher = false,
  onOpenClassroomModal,
  onGenerateStudyGuide,
  isGeneratingGuide = false,
}) {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sourceLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
  const targetLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

  const [isSwapping, setIsSwapping] = React.useState(false);

  const handleSwapClick = () => {
    setIsSwapping(true);
    if (onSwapLanguages) onSwapLanguages();
    setTimeout(() => setIsSwapping(false), 500);
  };

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
      <div className={`google-translate-bar ${isSwapping ? 'bar-swapping' : ''}`} title="Google Translate-Style Bidirectional Language Pair">
        <div className="google-lang-pill source-pill" title="Spoken Lecture Source Language (Tap to change)">
          <span className="lang-flag">{sourceLangMeta.flag}</span>
          <span className="lang-label-full">{sourceLangMeta.name}</span>
          <span className="lang-label-short">{sourceLang.toUpperCase()}</span>
          <span className="lang-chevron-arrow">▾</span>
          <select
            value={sourceLang}
            onChange={(e) => userRole === 'teacher' && onSourceLanguageChange && onSourceLanguageChange(e.target.value)}
            disabled={userRole !== 'teacher'}
            className="google-lang-dropdown-native"
            aria-label="Spoken Lecture Source Language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} disabled={l.code === targetLang}>
                {l.name} ({l.native})
              </option>
            ))}
          </select>
        </div>

        <button
          className={`google-swap-circle-btn ${isSwapping ? 'is-swapping' : ''}`}
          onClick={handleSwapClick}
          disabled={userRole !== 'teacher'}
          title={`Click to swap languages (${sourceLang.toUpperCase()} ⇄ ${targetLang.toUpperCase()})`}
          type="button"
          aria-label="Swap source and target languages"
        >
          <ArrowLeftRight size={14} />
        </button>

        <div className="google-lang-pill target-pill" title="Real-Time Translation & Subtitles Language (Tap to change)">
          <span className="lang-flag">{targetLangMeta.flag}</span>
          <span className="lang-label-full">{targetLangMeta.name}</span>
          <span className="lang-label-short">{targetLang.toUpperCase()}</span>
          <span className="lang-chevron-arrow">▾</span>
          <select
            value={targetLang}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            className="google-lang-dropdown-native"
            aria-label="Real-Time Subtitle Translation Language"
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
        {/* Classroom Room & Role Chip (Teacher vs Student) */}
        {classMode === 'realtime_classroom' ? (
          <button
            className={`google-chip-action classroom-chip ${userRole === 'teacher' ? 'teacher' : 'student'}`}
            onClick={onOpenClassroomModal}
            title={`Real-Time [Offline] Class: Room ${roomCode}. Click to switch role or share student link.`}
            type="button"
          >
            {userRole === 'teacher' ? (
              <>
                <Radio size={13} color="var(--google-blue)" />
                <span className="google-chip-text status-label-desktop">
                  <b>Real-Time Class</b> • 👑 Teacher ({roomCode})
                </span>
                <span className="google-chip-text status-label-tablet">👑 {roomCode}</span>
              </>
            ) : (
              <>
                <Radio size={13} color="var(--google-blue)" />
                <span className="google-chip-text status-label-desktop">
                  <b>Real-Time Class</b> • 🎧 Student ({roomCode})
                </span>
                <span className="google-chip-text status-label-tablet">🎧 {roomCode}</span>
              </>
            )}
          </button>
        ) : classMode === 'online_classroom' ? (
          <button
            className="google-chip-action classroom-chip online"
            onClick={onOpenClassroomModal}
            title={`Online Class: Room ${roomCode}. Click to manage online class.`}
            type="button"
          >
            <Globe size={13} color="var(--google-yellow)" />
            <span className="google-chip-text status-label-desktop">
              <b>Online Class</b> • {roomCode}
            </span>
            <span className="google-chip-text status-label-tablet">{roomCode}</span>
          </button>
        ) : (
          <button
            className="google-chip-action classroom-chip solo"
            onClick={onOpenClassroomModal}
            title="Solo Studio Mode. Click to switch to Real-Time Classroom."
            type="button"
          >
            <Radio size={13} color="var(--google-green)" />
            <span className="google-chip-text status-label-desktop">Solo Studio</span>
            <span className="google-chip-text status-label-tablet">Solo</span>
          </button>
        )}

        {/* Audio Hardware Chip (Desktop & Tablet) */}
        <button
          className="google-chip-action device-chip"
          onClick={onOpenAudioDevices}
          title={`Active Microphone: ${selectedDeviceLabel}. Click to switch between Bluetooth and laptop mic.`}
          type="button"
        >
          {isBluetoothDevice ? (
            <Headphones size={13} color="var(--google-green)" />
          ) : (
            <Mic size={13} color="var(--google-blue)" />
          )}
          <span className="google-chip-text">{selectedDeviceLabel}</span>
          <Settings2 size={12} color="var(--text-dim)" className="chip-gear-icon" />
        </button>

        {/* Compact Mobile Audio Button (Mobile) */}
        <button
          className="google-icon-btn mobile-device-btn"
          onClick={onOpenAudioDevices}
          title={`Microphone: ${selectedDeviceLabel}`}
          type="button"
          aria-label="Audio Hardware Settings"
        >
          {isBluetoothDevice ? (
            <Headphones size={15} color="var(--google-green)" />
          ) : (
            <Mic size={15} color="var(--google-blue)" />
          )}
        </button>

        {/* Live Session Status Pill */}
        <div className={`google-status-pill ${connectionStatus === 'connected' ? 'live' : 'browser'}`}>
          <span className="google-status-dot" />
          <span className="status-label-desktop">{connectionStatus === 'connected' ? 'Live Stream' : 'Browser Engine'}</span>
          <span className="status-label-tablet">{connectionStatus === 'connected' ? 'Live' : 'Local'}</span>
        </div>

        {/* Session Timer */}
        <div className="google-chip-action timer-chip" title="Live lecture elapsed time">
          <Clock size={12} color="var(--google-yellow)" className="timer-icon" />
          <span className="google-timer-mono">{formatTime(sessionSeconds)}</span>
        </div>

        {/* Study Guide Generator Quick Action (All Modes) */}
        {onGenerateStudyGuide && (
          <button
            className="google-pill-btn primary study-guide-topbar-btn"
            onClick={onGenerateStudyGuide}
            disabled={isGeneratingGuide}
            title="Generate AI Study Guide from Lecture Transcripts"
            type="button"
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              gap: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '16px',
              height: '30px',
              cursor: isGeneratingGuide ? 'wait' : 'pointer'
            }}
          >
            <Sparkles size={13} className={isGeneratingGuide ? "spin-fast" : ""} color="#fff" />
            <span className="pill-btn-label">{isGeneratingGuide ? 'Generating...' : 'Study Guide'}</span>
          </button>
        )}

        {/* Secondary actions group — hidden on ≤680px */}
        <div className="google-bar-overflow-group">
          {/* Glossary Modal Button */}
          <button
            className="google-icon-btn"
            onClick={onOpenGlossary}
            title="STEM Technical Glossary & Domain Adaptation"
            type="button"
            aria-label="Open STEM Glossary"
          >
            <BookOpen size={15} />
          </button>

          {/* Caption Export Actions (TXT & PDF) */}
          {segmentCount > 0 && (
            <div className="google-bar-export-group" style={{ display: 'flex', gap: '4px' }}>
              <button
                className="google-icon-btn export-icon"
                onClick={onExportTxt}
                title="Export Captions as Plain Text (.txt)"
                type="button"
              >
                <FileText size={16} color="var(--google-blue)" />
              </button>
              <button
                className="google-icon-btn export-icon"
                onClick={onExportPdf}
                title="Export Captions as Formatted PDF (.pdf)"
                type="button"
              >
                <FileDown size={16} color="var(--google-red)" />
              </button>
            </div>
          )}

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
      </div>
    </header>
  );
}

