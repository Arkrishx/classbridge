import React, { useState } from 'react';
import { Mic, MicOff, Play, BookCheck, Trash2, Sparkles, Send, Activity } from 'lucide-react';

export default function AudioControls({
  isRecording,
  onToggleRecord,
  audioLevel,
  segmentCount,
  onGenerateStudyGuide,
  onLoadSample,
  onClearSession,
  isGeneratingGuide,
  interimSpeech,
  onDirectSpeechSubmit,
}) {
  const [quickInput, setQuickInput] = useState('');

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    if (onDirectSpeechSubmit) {
      onDirectSpeechSubmit(quickInput.trim());
    }
    setQuickInput('');
  };

  return (
    <div className="control-dock">
      <div className="dock-top-row">
        <div className="dock-left-actions">
          {/* Immersive Tactile Record Button */}
          <button
            className={`btn-record ${isRecording ? 'recording' : 'idle'}`}
            onClick={onToggleRecord}
            title={isRecording ? "Click to stop recording" : "Click to start live speech capture"}
          >
            {isRecording ? (
              <>
                <MicOff size={16} />
                <span>Stop Mic</span>
              </>
            ) : (
              <>
                <Mic size={16} />
                <span>Live Mic (Teacher)</span>
              </>
            )}
          </button>

          {/* Organic Audio Waveform Visualizer */}
          <div className="waveform-container" title={`Audio Level: ${audioLevel}%`}>
            {[...Array(12)].map((_, i) => {
              const active = isRecording && audioLevel > i * 8;
              const barHeight = active
                ? Math.max(6, Math.min(26, (audioLevel / 100) * 28 + Math.sin(i) * 6))
                : 4;
              return (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{
                    height: `${barHeight}px`,
                    background: active
                      ? 'linear-gradient(180deg, var(--accent-cyan), var(--accent-indigo))'
                      : 'rgba(255, 255, 255, 0.1)',
                  }}
                />
              );
            })}
          </div>

          {/* Minimalist Sample Lecture Chips */}
          <div className="dock-chips">
            <button
              className="chip-btn"
              onClick={() => onLoadSample('ml')}
              title="Load Pre-recorded Machine Learning & Optimization Lecture"
            >
              <Play size={11} fill="currentColor" />
              <span>Sample: ML & Optimization</span>
            </button>

            <button
              className="chip-btn"
              onClick={() => onLoadSample('linear_algebra')}
              title="Load Pre-recorded Linear Algebra & Eigenvalues Lecture"
            >
              <Play size={11} fill="currentColor" />
              <span>Sample: Linear Algebra</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Shimmering Study Guide Button */}
          <button
            className="btn-shimmer"
            onClick={onGenerateStudyGuide}
            disabled={isGeneratingGuide || segmentCount === 0}
            title="Synthesize structured PDF study guide"
          >
            <BookCheck size={16} />
            <span>{isGeneratingGuide ? 'Synthesizing...' : 'Study Guide'}</span>
            {segmentCount > 0 && (
              <span
                style={{
                  background: 'rgba(52, 211, 153, 0.25)',
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {segmentCount}
              </span>
            )}
          </button>

          {segmentCount > 0 && (
            <button
              className="btn-minimal"
              onClick={onClearSession}
              title="Clear transcript session"
              style={{ padding: '8px' }}
            >
              <Trash2 size={15} color="var(--text-muted)" />
            </button>
          )}
        </div>
      </div>

      {/* Live Speech Recognition Feedback (Active while speaking) */}
      {isRecording && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: '#7dd3fc',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulseBlink 1s infinite' }} />
          <span><b>Live Voice:</b> {interimSpeech ? `"${interimSpeech}..."` : "Listening for speech... (Say: 'Today we learn eigenvalues and gradient descent')"}</span>
        </div>
      )}

      {/* Minimalist Integrated Speech / Dictation Input */}
      <form onSubmit={handleQuickSubmit} className="quick-speech-bar">
        <Sparkles size={14} color="var(--accent-cyan)" />
        <input
          type="text"
          className="quick-speech-input"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder='Or dictate/type lecture speech (e.g. "We compute eigenvalues and backpropagation in neural networks")'
        />
        <button
          type="submit"
          className="btn-minimal"
          style={{ padding: '4px 12px', fontSize: '12px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
          disabled={!quickInput.trim()}
        >
          <Send size={11} />
          <span>Caption</span>
        </button>
      </form>
    </div>
  );
}
