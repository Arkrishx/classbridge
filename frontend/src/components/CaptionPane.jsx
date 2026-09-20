import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Tag, ArrowDown, Sparkles, Mic } from 'lucide-react';

export default function CaptionPane({
  segments,
  targetLangName,
  highlightedSegmentId,
  autoScroll,
  onToggleAutoScroll,
  interimSpeech,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, interimSpeech, autoScroll]);

  const getConfidenceBadge = (score) => {
    const s = Math.round(score || 94);
    const isHigh = s >= 90;
    return (
      <span className={`conf-pill ${isHigh ? 'high' : 'mid'}`} title="ASR Confidence Score">
        <ShieldCheck size={10} style={{ display: 'inline', marginRight: '3px' }} />
        {s}%
      </span>
    );
  };

  return (
    <div className="caption-card">
      <div className="caption-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '-0.01em' }}>
            Live Dual Captions
          </span>
          <span className="brand-tag">
            EN ➔ {targetLangName}
          </span>
        </div>

        <button
          className="chip-btn"
          style={{ padding: '3px 10px', fontSize: '11.5px' }}
          onClick={onToggleAutoScroll}
          title="Toggle Auto-Scroll"
        >
          <ArrowDown size={12} color={autoScroll ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
          <span>{autoScroll ? 'Auto-scroll' : 'Paused'}</span>
        </button>
      </div>

      <div className="caption-list">
        {segments.length === 0 && !interimSpeech ? (
          <div className="empty-box">
            <Sparkles size={36} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              No Lecture Speech Captured Yet
            </div>
            <p style={{ maxWidth: '340px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Click <b>"Live Mic (Teacher)"</b> to capture speech in real time, or load a sample lecture above to test.
            </p>
          </div>
        ) : (
          <>
            {segments.map((seg) => {
              const isHighlighted = seg.id === highlightedSegmentId;
              return (
                <div
                  key={seg.id}
                  id={`seg-${seg.id}`}
                  className={`segment-item ${isHighlighted ? 'highlighted' : ''}`}
                >
                  <div className="segment-meta">
                    <span className="timestamp-pill">
                      [{seg.timestamp || `${Math.floor(seg.start)}s - ${Math.floor(seg.end)}s`}]
                    </span>
                    {getConfidenceBadge(seg.confidence)}
                  </div>

                  <div className="caption-en">
                    {seg.text_en}
                  </div>

                  <div className="caption-vernacular">
                    {seg.text_vernacular}
                  </div>

                  {seg.domain_terms && seg.domain_terms.length > 0 && (
                    <div className="domain-tags">
                      {seg.domain_terms.map((dt, idx) => (
                        <span
                          key={idx}
                          className="domain-chip"
                          title={`STEM Concept: ${dt.en} (${dt.category})\n${dt.definition}`}
                        >
                          <Tag size={9} />
                          <b>{dt.en}</b>: {dt.adapted_vernacular || dt.en}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Streaming Speech Preview */}
            {interimSpeech && (
              <div
                className="segment-item"
                style={{
                  border: '1px dashed var(--accent-cyan)',
                  background: 'rgba(56, 189, 248, 0.05)',
                }}
              >
                <div className="segment-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '11.5px' }}>
                    <Mic size={12} color="#f43f5e" />
                    <span>Transcribing live speech...</span>
                  </div>
                  <span className="brand-tag">Live</span>
                </div>

                <div className="caption-en" style={{ fontStyle: 'italic', color: '#7dd3fc', fontSize: '15px' }}>
                  "{interimSpeech}"
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  (Pause 1s to finalize caption and translate)
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
