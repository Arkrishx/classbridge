import React, { useState } from 'react';
import { Mic, MicOff, PlayCircle, BookCheck, Trash2, Volume2, Sparkles, Send } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="control-card">
        <div className="control-left">
          <button
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={onToggleRecord}
            title="Start live speech capture from microphone"
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

          {/* Real-time Audio Level Visualizer */}
          <div className="audio-visualizer" title={`Input Level: ${audioLevel}%`}>
            <Volume2 size={16} color={isRecording ? 'var(--brand-primary)' : 'var(--text-muted)'} />
            {[...Array(8)].map((_, i) => {
              const isActive = isRecording && audioLevel > i * 12;
              return (
                <div
                  key={i}
                  className={`viz-bar ${isActive ? 'active' : ''}`}
                  style={{
                    height: isActive ? `${Math.max(6, Math.min(22, (audioLevel / 100) * 24 + i * 2))}px` : '4px',
                    backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                  }}
                />
              );
            })}
          </div>

          {/* 1-Click Sample Lecture Replay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-outline"
              onClick={() => onLoadSample('ml')}
              title="Load Pre-recorded Machine Learning & Optimization Lecture"
            >
              <PlayCircle size={15} />
              <span>Sample: ML & Optimization</span>
            </button>

            <button
              className="btn btn-outline"
              onClick={() => onLoadSample('linear_algebra')}
              title="Load Pre-recorded Linear Algebra & Eigenvalues Lecture"
            >
              <PlayCircle size={15} />
              <span>Sample: Linear Algebra</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-accent"
            onClick={onGenerateStudyGuide}
            disabled={isGeneratingGuide || segmentCount === 0}
            title="Auto-generate structured PDF study guide with definitions, formulas, takeaways, and flashcards"
          >
            <BookCheck size={16} />
            <span>{isGeneratingGuide ? 'Synthesizing...' : 'Generate Study Guide'}</span>
            {segmentCount > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}
              >
                {segmentCount}
              </span>
            )}
          </button>

          {segmentCount > 0 && (
            <button
              className="btn btn-outline"
              onClick={onClearSession}
              title="Clear all captions and reset session"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Live Speech Feedback Bar */}
      {isRecording && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: '#7dd3fc',
          }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
          <span><b>Live Mic Active:</b> {interimSpeech ? `"${interimSpeech}..."` : "Listening... Speak clearly into your microphone."}</span>
        </div>
      )}

      {/* Direct Test Speech Input Bar */}
      <form
        onSubmit={handleQuickSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '6px 12px',
        }}
      >
        <Sparkles size={15} color="var(--brand-primary)" />
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder='Or dictate/type live speech to test (e.g. "Today we study eigenvalues and gradient descent in neural networks")'
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '4px 12px', fontSize: '12px' }}
          disabled={!quickInput.trim()}
        >
          <Send size={12} />
          <span>Live Caption</span>
        </button>
      </form>
    </div>
  );
}
