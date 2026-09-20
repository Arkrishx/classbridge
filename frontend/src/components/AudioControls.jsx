import React from 'react';
import { Mic, MicOff, PlayCircle, BookCheck, Trash2, Volume2 } from 'lucide-react';

export default function AudioControls({
  isRecording,
  onToggleRecord,
  audioLevel,
  segmentCount,
  onGenerateStudyGuide,
  onLoadSample,
  onClearSession,
  isGeneratingGuide,
}) {
  return (
    <div className="control-card">
      <div className="control-left">
        <button
          className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
          onClick={onToggleRecord}
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
  );
}
