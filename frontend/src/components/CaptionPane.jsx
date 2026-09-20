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
    const s = Math.round(score || 92);
    let colorClass = 'conf-high';
    if (s < 80) colorClass = 'conf-low';
    else if (s < 90) colorClass = 'conf-mid';

    return (
      <span className={`confidence-pill ${colorClass}`} title="ASR Confidence Score">
        <ShieldCheck size={11} style={{ display: 'inline', marginRight: '2px' }} />
        {s}% ASR Conf
      </span>
    );
  };

  return (
    <div className="caption-card">
      <div className="caption-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>
            Live Dual-Language Captions
          </span>
          <span className="badge-tag badge-blue">
            English ➔ {targetLangName}
          </span>
        </div>

        <button
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '12px' }}
          onClick={onToggleAutoScroll}
          title="Toggle Auto-Scroll"
        >
          <ArrowDown size={13} color={autoScroll ? 'var(--brand-primary)' : 'var(--text-muted)'} />
          <span>{autoScroll ? 'Auto-scroll On' : 'Auto-scroll Paused'}</span>
        </button>
      </div>

      <div className="caption-list">
        {segments.length === 0 && !interimSpeech ? (
          <div className="empty-state">
            <Sparkles size={40} color="var(--brand-primary)" style={{ opacity: 0.7 }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Lecture Speech Captured Yet
            </div>
            <p style={{ maxWidth: '380px', fontSize: '13px' }}>
              Click <b>"Live Mic (Teacher)"</b> to capture live classroom speech, or use the direct speech bar to test captions immediately.
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
                    <div className="timestamp-pill">
                      ⏱ [{seg.timestamp || `${Math.floor(seg.start)}s - ${Math.floor(seg.end)}s`}]
                    </div>
                    <div>{getConfidenceBadge(seg.confidence)}</div>
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
                          className="domain-pill"
                          title={`Domain Adapted Term: ${dt.en} (${dt.category})\nCanonical definition: ${dt.definition}`}
                        >
                          <Tag size={10} />
                          <b>{dt.en}</b>: {dt.adapted_vernacular || dt.en}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live streaming preview card while teacher is speaking */}
            {interimSpeech && (
              <div
                className="segment-item"
                style={{
                  border: '1px dashed var(--brand-primary)',
                  background: 'rgba(56, 189, 248, 0.08)',
                }}
              >
                <div className="segment-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', fontWeight: 700, fontSize: '12px' }}>
                    <Mic size={13} className="active" color="#ef4444" />
                    <span>Listening to speech in real-time...</span>
                  </div>
                  <span className="badge-tag badge-blue">Transcribing</span>
                </div>

                <div className="caption-en" style={{ fontStyle: 'italic', color: '#7dd3fc', fontSize: '15px' }}>
                  "{interimSpeech}"
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  (Pause speaking or click Stop Mic to commit translation)
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
