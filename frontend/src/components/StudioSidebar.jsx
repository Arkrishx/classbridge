import React from 'react';
import Logo from './Logo';
import { SUPPORTED_LANGUAGES } from './Header';
import {
  Mic,
  MicOff,
  Headphones,
  Play,
  BookCheck,
  BookOpen,
  Sparkles,
  Trash2,
  Clock,
  Radio,
  Layers,
  Activity,
  Cpu,
  Settings2,
  Volume2,
  VolumeX,
} from 'lucide-react';

export default function StudioSidebar({
  isRecording,
  onToggleRecord,
  audioLevel,
  liveMicStatus = 'idle',
  targetLang,
  onLanguageChange,
  sessionSeconds,
  segmentCount,
  onGenerateStudyGuide,
  isGeneratingGuide,
  onLoadSample,
  onClearSession,
  onOpenGlossary,
  onOpenArchitecture,
  selectedDeviceLabel = 'Default Microphone',
  isBluetoothDevice = false,
  onOpenAudioDevices,
  detectedTermsCount = 0,
  isReadAloud = false,
  onToggleReadAloud,
  selectedOutputDeviceLabel = 'Laptop Speakers',
  isSpeakingAudio = false,
}) {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="studio-sidebar">
      {/* Studio Brand Header */}
      <div className="sidebar-brand-box">
        <Logo isRecording={isRecording} />
      </div>

      <div className="sidebar-scrollable-content">
        {/* 1. Interactive Microphone & Hardware Hub */}
        <div className="sidebar-card mic-hub-card">
          <div className="card-mini-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={13} color="var(--accent-cyan)" />
              <span className="card-label-title">VOICE INPUT HUB</span>
            </div>
            {isRecording && (
              <span className="live-status-pill">
                <span className="live-dot-pulse" />
                {liveMicStatus === 'speaking' ? 'Speaking' : 'Listening'}
              </span>
            )}
          </div>

          {/* Primary Tactile Record Action */}
          <button
            className={`btn-studio-record ${isRecording ? 'recording' : 'idle'}`}
            onClick={onToggleRecord}
            title={isRecording ? "Click to stop recording" : "Click to start live speech capture"}
          >
            {isRecording ? (
              <>
                <MicOff size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '13.5px' }}>Stop Live Mic</div>
                  <div style={{ fontSize: '10.5px', opacity: 0.8 }}>Streaming audio active</div>
                </div>
              </>
            ) : (
              <>
                <Mic size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '13.5px' }}>Live Mic (Teacher)</div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85 }}>Click to capture lecture speech</div>
                </div>
              </>
            )}
          </button>

          {/* Connected Device Card (1-Click Switcher) */}
          <button
            className="device-select-chip"
            onClick={onOpenAudioDevices}
            title={`Active Audio Device: ${selectedDeviceLabel}. Click to switch between Bluetooth headset and laptop mic.`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              {isBluetoothDevice ? (
                <Headphones size={15} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
              ) : (
                <Mic size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedDeviceLabel}
                </div>
                <div style={{ fontSize: '10px', color: isBluetoothDevice ? 'var(--accent-emerald)' : 'var(--text-dim)' }}>
                  {isBluetoothDevice ? '🎧 Bluetooth Headset Active' : '💻 Laptop Internal Mic'}
                </div>
              </div>
            </div>
            <Settings2 size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
          </button>

          {/* Speaker Output / Read Aloud Card */}
          <button
            className={`device-select-chip ${isReadAloud ? 'active-read-aloud' : ''}`}
            onClick={onToggleReadAloud}
            style={{
              marginTop: '6px',
              border: isReadAloud ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid var(--border-subtle)',
              background: isReadAloud ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Click to toggle Real-Time Read Aloud of live captions through your laptop speakers"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              {isReadAloud ? (
                <Volume2 size={15} color="#6ee7b7" style={{ flexShrink: 0 }} />
              ) : (
                <VolumeX size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: isReadAloud ? '#6ee7b7' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isReadAloud ? 'Read Aloud: ON' : 'Read Aloud: OFF'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🔊 {selectedOutputDeviceLabel}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: isReadAloud ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                color: isReadAloud ? '#6ee7b7' : 'var(--text-muted)'
              }}
            >
              {isSpeakingAudio ? 'Speaking...' : isReadAloud ? 'Active' : 'Muted'}
            </div>
          </button>

          {/* Organic Waveform Equalizer */}
          <div className="sidebar-waveform-box" title={`Mic RMS Level: ${audioLevel}%`}>
            {[...Array(16)].map((_, i) => {
              const active = isRecording && (audioLevel > i * 5 || audioLevel > 15);
              const barHeight = isRecording
                ? Math.max(4, Math.min(22, (audioLevel / 100) * 22 + Math.sin(i * 0.9) * 3))
                : 3;
              return (
                <div
                  key={i}
                  className="sidebar-waveform-bar"
                  style={{
                    height: `${barHeight}px`,
                    background: active
                      ? 'linear-gradient(180deg, var(--accent-cyan), var(--accent-emerald))'
                      : 'rgba(255, 255, 255, 0.08)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* 2. Tactile Indic Language Selector */}
        <div className="sidebar-card">
          <div className="card-mini-head">
            <span className="card-label-title">TARGET VERNACULAR</span>
            <span className="badge-dim">Indic STEM</span>
          </div>

          <div className="lang-vertical-deck">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = targetLang === lang.code;
              return (
                <button
                  key={lang.code}
                  className={`lang-card-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onLanguageChange(lang.code)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="lang-script-avatar">{lang.native.slice(0, 1)}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div className="lang-native-text">{lang.native}</div>
                      <div className="lang-name-text">{lang.name}</div>
                    </div>
                  </div>
                  {isActive && <div className="active-glow-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Live Session Telemetry Widget */}
        <div className="sidebar-card telemetry-card">
          <div className="card-mini-head">
            <span className="card-label-title">SESSION TELEMETRY</span>
            <Activity size={12} color="var(--accent-cyan)" />
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <div className="telemetry-icon">
                <Clock size={13} color="var(--accent-cyan)" />
              </div>
              <div>
                <div className="telemetry-value">{formatTime(sessionSeconds)}</div>
                <div className="telemetry-label">Lecture Time</div>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon">
                <Layers size={13} color="var(--accent-indigo)" />
              </div>
              <div>
                <div className="telemetry-value">{segmentCount}</div>
                <div className="telemetry-label">Captions</div>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon">
                <Cpu size={13} color="var(--accent-gold)" />
              </div>
              <div>
                <div className="telemetry-value">{detectedTermsCount}</div>
                <div className="telemetry-label">STEM Terms</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 1-Click Interactive Sample Lectures */}
        <div className="sidebar-card">
          <div className="card-mini-head">
            <span className="card-label-title">SAMPLE LECTURE REPLAYS</span>
            <Sparkles size={12} color="var(--accent-gold)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              className="sample-replay-btn"
              onClick={() => onLoadSample('ml')}
              title="Simulate live Machine Learning & Gradient Descent lecture"
            >
              <Play size={12} fill="currentColor" color="var(--accent-cyan)" />
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div className="sample-btn-title">ML & Optimization</div>
                <div className="sample-btn-sub">Gradient Descent, Backprop</div>
              </div>
            </button>

            <button
              className="sample-replay-btn"
              onClick={() => onLoadSample('linear_algebra')}
              title="Simulate live Linear Algebra & Eigenvalues lecture"
            >
              <Play size={12} fill="currentColor" color="var(--accent-indigo)" />
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div className="sample-btn-title">Linear Algebra</div>
                <div className="sample-btn-sub">Eigenvalues, Matrix det(A - λI)</div>
              </div>
            </button>
          </div>
        </div>

        {/* 5. Studio Tools & Synthesis */}
        <div className="sidebar-card actions-card">
          <button
            className="btn-shimmer full-width"
            onClick={onGenerateStudyGuide}
            disabled={isGeneratingGuide || segmentCount === 0}
            title="Synthesize structured PDF study guide with flashcards"
          >
            <BookCheck size={16} />
            <span>{isGeneratingGuide ? 'Synthesizing...' : 'Study Guide & Notes'}</span>
            {segmentCount > 0 && <span className="pill-counter">{segmentCount}</span>}
          </button>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              className="btn-minimal flex-1"
              onClick={onOpenGlossary}
              title="Inspect STEM Domain Adaptation Glossary"
            >
              <BookOpen size={13} color="var(--accent-cyan)" />
              <span>Glossary</span>
            </button>

            <button
              className="btn-minimal flex-1"
              onClick={onOpenArchitecture}
              title="System Specs & Architecture"
            >
              <Sparkles size={13} color="var(--accent-indigo)" />
              <span>About</span>
            </button>

            {segmentCount > 0 && (
              <button
                className="btn-minimal btn-danger-icon"
                onClick={onClearSession}
                title="Clear current lecture session"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
