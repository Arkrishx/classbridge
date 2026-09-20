import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Columns,
  Tv,
  MessageSquare,
  BookCheck,
  Send,
  Play,
  RotateCcw,
  Headphones,
  Sliders,
} from 'lucide-react';

export default function GoogleBottomDock({
  isRecording = false,
  onToggleRecord,
  audioLevel = 0,
  liveMicStatus = 'idle',
  isReadAloud = false,
  onToggleReadAloud,
  selectedOutputDeviceLabel = 'Laptop Speakers',
  viewMode = 'split',
  onViewModeChange,
  onDirectSpeechSubmit,
  onGenerateStudyGuide,
  isGeneratingGuide = false,
  onLoadSample,
  onClearSession,
  onOpenAudioDevices,
  segmentCount = 0,
}) {
  const [quickInput, setQuickInput] = useState('');

  const handleQuickSubmit = (e) => {
    if (e) e.preventDefault();
    if (!quickInput.trim()) return;
    if (onDirectSpeechSubmit) {
      onDirectSpeechSubmit(quickInput.trim());
    }
    setQuickInput('');
  };

  return (
    <div className="google-meet-dock-wrapper">
      <div className="google-meet-dock">
        {/* 1. Primary Tactile Record Circle Button (Google Meet Style) */}
        <div className="dock-mic-group">
          <button
            className={`google-circle-btn mic-btn ${isRecording ? 'active-recording' : 'idle'}`}
            onClick={onToggleRecord}
            title={isRecording ? "Stop Live Mic (Teacher)" : "Start Live Mic (Teacher Speech Capture)"}
            type="button"
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            {isRecording && <span className="google-mic-ripple" />}
          </button>

          {/* Mini Speech Equalizer Indicator */}
          {isRecording && (
            <div className="dock-audio-indicator" title={`Audio Level: ${audioLevel}%`}>
              <span className={`dock-dot dot-1 ${audioLevel > 15 ? 'active' : ''}`} />
              <span className={`dock-dot dot-2 ${audioLevel > 30 ? 'active' : ''}`} />
              <span className={`dock-dot dot-3 ${audioLevel > 50 ? 'active' : ''}`} />
              <span className="dock-status-text">
                {liveMicStatus === 'speaking' ? 'Speaking' : 'Listening'}
              </span>
            </div>
          )}
        </div>

        {/* 2. Speaker Output & Read Aloud Toggle */}
        <button
          className={`google-pill-btn speaker-btn ${isReadAloud ? 'active-read' : ''}`}
          onClick={onToggleReadAloud}
          title={`Laptop Speaker Read Aloud: ${isReadAloud ? 'ON' : 'OFF'} (${selectedOutputDeviceLabel})`}
          type="button"
        >
          {isReadAloud ? <Volume2 size={16} color="var(--google-green)" /> : <VolumeX size={16} />}
          <span className="pill-btn-label">{isReadAloud ? 'Read Aloud: ON' : 'Read Aloud'}</span>
        </button>

        {/* 3. Quick Dictation / Fast Caption Input Bar */}
        <form onSubmit={handleQuickSubmit} className="google-dock-input-bar">
          <Sparkles size={14} color="var(--google-blue)" className="dock-input-sparkle" />
          <input
            type="text"
            className="dock-quick-input"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder='Dictate or type lecture note (e.g. "Gradient descent and eigenvalues")...'
            title="Fast Dictation Bar: Type or press Win+H to voice type directly into captions"
          />
          <button
            type="submit"
            className="dock-send-btn"
            disabled={!quickInput.trim()}
            title="Commit spoken phrase immediately to live subtitles"
          >
            <Send size={12} />
          </button>
        </form>

        {/* 4. Segmented View Mode Deck (Google Meet Style) */}
        <div className="google-view-switcher" title="Switch Workspace Layout">
          <button
            className={`view-btn ${viewMode === 'theater' ? 'active' : ''}`}
            onClick={() => onViewModeChange('theater')}
            title="Captions Theater View: Expanded subtitles for lecture hall screens"
            type="button"
          >
            <Tv size={14} />
            <span className="view-btn-label">Captions</span>
          </button>

          <button
            className={`view-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => onViewModeChange('split')}
            title="Split View: Dual Subtitles + Gemini AI Tutor Copilot"
            type="button"
          >
            <Columns size={14} />
            <span className="view-btn-label">Split Studio</span>
          </button>

          <button
            className={`view-btn ${viewMode === 'tutor' ? 'active' : ''}`}
            onClick={() => onViewModeChange('tutor')}
            title="Gemini AI Tutor: Focus mode for grounded Q&A and research"
            type="button"
          >
            <MessageSquare size={14} />
            <span className="view-btn-label">Gemini Tutor</span>
          </button>
        </div>

        {/* 5. Study Guide Shimmer Action */}
        <button
          className="google-pill-btn guide-btn"
          onClick={onGenerateStudyGuide}
          disabled={isGeneratingGuide || segmentCount === 0}
          title={segmentCount === 0 ? "Capture captions first to compile study guide" : "Compile structured bilingual PDF study guide"}
          type="button"
        >
          <BookCheck size={16} color="var(--google-yellow)" />
          <span className="pill-btn-label">
            {isGeneratingGuide ? 'Generating...' : 'Study Guide'}
          </span>
        </button>

        {/* 6. Quick Demo Replay & Reset */}
        <div className="dock-utility-group">
          <button
            className="google-circle-btn utility-btn"
            onClick={() => onLoadSample && onLoadSample('ml')}
            title="Replay Sample ML Lecture Demo"
            type="button"
          >
            <Play size={14} color="var(--google-green)" />
          </button>

          <button
            className="google-circle-btn utility-btn danger-hover"
            onClick={onClearSession}
            title="Clear and reset live session"
            type="button"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
