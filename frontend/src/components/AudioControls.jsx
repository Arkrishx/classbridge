import React, { useState } from 'react';
import { Mic, MicOff, Play, BookCheck, Trash2, Sparkles, Send, Activity, Headphones, Settings2 } from 'lucide-react';

export default function AudioControls({
  isRecording,
  onToggleRecord,
  audioLevel,
  liveMicStatus = 'idle',
  segmentCount,
  onGenerateStudyGuide,
  onLoadSample,
  onClearSession,
  isGeneratingGuide,
  interimSpeech,
  interimVernacular,
  onDirectSpeechSubmit,
  selectedDeviceLabel = 'Default Microphone',
  isBluetoothDevice = false,
  onOpenAudioDevices,
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

          {/* Quick Audio Input Device Switcher Button */}
          <button
            className="chip-btn dock-device-btn"
            onClick={onOpenAudioDevices}
            title={`Active Microphone: ${selectedDeviceLabel}. Click to switch microphone or test headset audio.`}
            style={{
              padding: '8px 12px',
              borderColor: isBluetoothDevice ? 'rgba(52, 211, 153, 0.4)' : 'var(--border-subtle)',
              background: isBluetoothDevice ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            }}
          >
            {isBluetoothDevice ? (
              <Headphones size={15} color="var(--accent-emerald)" />
            ) : (
              <Mic size={15} color="var(--accent-cyan)" />
            )}
            <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isBluetoothDevice ? 'Headset' : 'Mic'}
            </span>
          </button>

          {/* Organic Audio Waveform Visualizer */}
          <div className="waveform-container" title={`Audio Level: ${audioLevel}%`}>
            {[...Array(16)].map((_, i) => {
              const active = isRecording && (audioLevel > i * 5 || audioLevel > 15);
              const barHeight = isRecording
                ? Math.max(5, Math.min(26, (audioLevel / 100) * 26 + Math.sin((i + Date.now() / 200) * 1.5) * 4))
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

      {/* Live Speech Recognition Feedback (Active while recording) */}
      {isRecording && (
        <div
          style={{
            background: interimSpeech ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.05)',
            border: interimSpeech ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '13px',
            color: '#7dd3fc',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: interimSpeech ? '#f43f5e' : '#34d399',
                boxShadow: interimSpeech ? '0 0 10px #f43f5e' : '0 0 10px #34d399',
                animation: 'pulseBlink 1.2s infinite',
                flexShrink: 0,
              }}
            />
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {interimSpeech ? (
                <span>
                  <b style={{ color: '#fff' }}>Streaming:</b> "{interimSpeech}"
                  {interimVernacular && (
                    <span style={{ color: '#fde047', marginLeft: '8px', fontWeight: 600 }}>
                      ➔ "{interimVernacular}"
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>
                  Listening for voice... (Speak now or say: <i>"Today we learn eigenvalues and backpropagation"</i>)
                </span>
              )}
            </div>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: interimSpeech ? 'rgba(244, 63, 94, 0.2)' : 'rgba(52, 211, 153, 0.2)',
              color: interimSpeech ? '#fda4af' : '#6ee7b7',
              border: interimSpeech ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(52, 211, 153, 0.4)',
              flexShrink: 0,
            }}
          >
            {interimSpeech ? 'Speaking' : 'Listening'}
          </span>
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
