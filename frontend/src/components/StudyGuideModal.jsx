import React, { useState } from 'react';
import { X, Download, BookOpen, Calculator, CheckSquare, Layers, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StudyGuideModal({
  guide,
  onClose,
  onDownloadPdf,
  isDownloadingPdf,
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [flippedCards, setFlippedCards] = useState({});

  if (!guide) return null;

  const toggleFlip = (id) => {
    setFlippedCards((prev) => {
      const nextState = { ...prev, [id]: !prev[id] };
      if (nextState[id]) {
        confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
      }
      return nextState;
    });
  };

  const tabs = [
    { id: 'summary', label: 'Overview', icon: BookOpen },
    { id: 'definitions', label: `Definitions (${guide.definitions?.length || 0})`, icon: FileText },
    { id: 'formulas', label: `Formulas (${guide.formulas?.length || 0})`, icon: Calculator },
    { id: 'takeaways', label: `Takeaways (${guide.takeaways?.length || 0})`, icon: CheckSquare },
    { id: 'flashcards', label: `Flashcards (${guide.flashcards?.length || 0})`, icon: Layers },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🎓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px' }}>
                {guide.title || 'Structured Lecture Study Guide'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Target Language: {guide.target_language} ({guide.native_language}) • {guide.date} • {guide.segment_count || 0} segments
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf}
              title="Download academic formatted PDF study guide"
            >
              <Download size={15} />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button className="btn btn-outline" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            padding: '0 16px',
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="modal-body">
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--brand-primary)', marginBottom: '8px' }}>Executive Summary (English)</h4>
                <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{guide.overview?.en}</p>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--vernacular-color)', marginBottom: '8px' }}>பாடத்தின் சுருக்கம் ({guide.target_language})</h4>
                <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--vernacular-color)' }}>{guide.overview?.vernacular}</p>
              </div>
            </div>
          )}

          {activeTab === 'definitions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {guide.definitions?.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No definitions detected.</div>
              ) : (
                guide.definitions?.map((d, i) => (
                  <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{d.term}</span>
                        <span style={{ marginLeft: '8px', color: 'var(--vernacular-color)', fontWeight: 600 }}>➔ {d.vernacular_term}</span>
                      </div>
                      <span className="badge-tag badge-blue">{d.category || 'STEM'}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{d.definition}</p>
                    {d.vernacular_definition && (
                      <p style={{ fontSize: '13px', color: 'var(--vernacular-color)', opacity: 0.9 }}>{d.vernacular_definition}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'formulas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {guide.formulas?.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No formulas detected in this session.</div>
              ) : (
                guide.formulas?.map((f, i) => (
                  <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '6px' }}>
                      {f.name}
                    </div>
                    <div className="formula-box">
                      {f.latex}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '8px' }}>
                      <b>Significance:</b> {f.description}
                    </p>
                    {f.variables && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <b>Variables:</b> {f.variables}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'takeaways' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {guide.takeaways?.map((t, i) => (
                <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge-tag badge-blue">⏱ {t.timestamp || `00:${i * 15}`}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.point}</span>
                  </div>
                  {t.vernacular_point && (
                    <div style={{ color: 'var(--vernacular-color)', fontSize: '13px', paddingLeft: '8px', borderLeft: '2px solid var(--vernacular-color)', marginTop: '4px' }}>
                      {t.vernacular_point}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                💡 Click any card to flip between Question and Answer. Use these for active recall practice!
              </p>
              <div className="flashcards-grid">
                {guide.flashcards?.map((fc) => {
                  const isFlipped = flippedCards[fc.id];
                  return (
                    <div
                      key={fc.id}
                      className="flashcard"
                      onClick={() => toggleFlip(fc.id)}
                      style={{
                        borderColor: isFlipped ? 'var(--success)' : 'var(--border-color)',
                        background: isFlipped ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-primary)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="badge-tag badge-blue">Card #{fc.id}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {isFlipped ? 'Answer' : 'Question (Click to flip)'}
                          </span>
                        </div>

                        {!isFlipped ? (
                          <>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                              {fc.front}
                            </div>
                            {fc.vernacular_front && (
                              <div style={{ color: 'var(--vernacular-color)', fontSize: '13px', marginTop: '6px' }}>
                                {fc.vernacular_front}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {fc.back}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                        Category: {fc.category || 'Review'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
