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
  classMode = 'realtime_classroom',
  userRole = 'student',
  onOpenClassroomModal,
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
          {classMode === 'realtime_classroom' && userRole === 'student' ? (
            <button
              className="google-circle-btn mic-btn student-locked"
              onClick={onOpenClassroomModal}
              title="Student Mode: Listening to Teacher's broadcast mic. Microphone is locked to prevent classroom room audio feedback."
              type="button"
              style={{
                background: 'rgba(66, 133, 244, 0.12)',
                borderColor: 'rgba(66, 133, 244, 0.35)',
                color: 'var(--google-blue)',
              }}
            >
              <Headphones size={20} />
            </button>
          ) : (
            <button
              className={`google-circle-btn mic-btn ${isRecording ? 'active-recording' : 'idle'}`}
              onClick={onToggleRecord}
              title={
                classMode === 'realtime_classroom'
                  ? (isRecording ? "Stop Broadcast Mic (Teacher)" : "Start Live Broadcast Mic to All Students")
                  : (isRecording ? "Stop Live Mic" : "Start Live Mic")
              }
              type="button"
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              {isRecording && <span className="google-mic-ripple" />}
            </button>
          )}

          {/* Dynamic 5-Bar Google Color Audio Waveform Visualizer */}
          {isRecording && (
            <div className="dock-audio-indicator animated-waveform" title={`Live Audio Level: ${audioLevel}%`}>
              <div className="dock-soundwave-bars">
                <span className="wave-bar bar-blue" style={{ transform: `scaleY(${Math.max(0.25, Math.min(1.8, audioLevel / 28))})` }} />
                <span className="wave-bar bar-red" style={{ transform: `scaleY(${Math.max(0.35, Math.min(2.0, audioLevel / 22))})` }} />
                <span className="wave-bar bar-yellow" style={{ transform: `scaleY(${Math.max(0.2, Math.min(2.2, audioLevel / 18))})` }} />
                <span className="wave-bar bar-green" style={{ transform: `scaleY(${Math.max(0.3, Math.min(1.9, audioLevel / 24))})` }} />
                <span className="wave-bar bar-blue-2" style={{ transform: `scaleY(${Math.max(0.25, Math.min(1.7, audioLevel / 30))})` }} />
              </div>
              <span className="dock-status-text">
                {liveMicStatus === 'speaking' ? 'Speaking' : 'Listening'}
              </span>
            </div>
          )}

          {classMode === 'realtime_classroom' && userRole === 'student' && (
            <div className="dock-audio-indicator student-listening" title="Student Listening Mode Active">
              <span className="google-status-dot" style={{ background: 'var(--google-green)', width: 6, height: 6 }} />
              <span className="dock-status-text" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Teacher Mic Stream
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
            placeholder={
              classMode === 'realtime_classroom' && userRole === 'student'
                ? 'Student Mode: Receiving live teacher captions in your selected language...'
                : 'Dictate or type lecture note (e.g. "Gradient descent and eigenvalues")...'
            }
            title={
              classMode === 'realtime_classroom' && userRole === 'student'
                ? 'Student Mode: Captions stream automatically from teacher mic'
                : 'Fast Dictation Bar: Type or press Win+H to voice type directly into captions'
            }
            disabled={classMode === 'realtime_classroom' && userRole === 'student'}
          />
          {!(classMode === 'realtime_classroom' && userRole === 'student') && (
            <button
              type="submit"
              className="dock-send-btn"
              disabled={!quickInput.trim()}
              title="Commit spoken phrase immediately to live subtitles"
            >
              <Send size={12} />
            </button>
          )}
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
            title="Split View: Dual Subtitles + BridgeAI Tutor Copilot"
            type="button"
          >
            <Columns size={14} />
            <span className="view-btn-label">Split Studio</span>
          </button>

          <button
            className={`view-btn ${viewMode === 'tutor' ? 'active' : ''}`}
            onClick={() => onViewModeChange('tutor')}
            title="BridgeAI Tutor: Focus mode for grounded Q&A and research"
            type="button"
          >
            <MessageSquare size={14} />
            <span className="view-btn-label">BridgeAI Tutor</span>
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
