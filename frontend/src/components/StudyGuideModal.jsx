import React, { useState } from 'react';
import { X, Download, BookOpen, Calculator, CheckSquare, Layers, FileText, Sparkles } from 'lucide-react';
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
    { id: 'diagram', label: 'Concept Map', icon: Sparkles },
    { id: 'definitions', label: `Definitions (${guide.definitions?.length || 0})`, icon: FileText },
    { id: 'formulas', label: `Formulas (${guide.formulas?.length || 0})`, icon: Calculator },
    { id: 'takeaways', label: `Takeaways (${guide.takeaways?.length || 0})`, icon: CheckSquare },
    { id: 'flashcards', label: `Flashcards (${guide.flashcards?.length || 0})`, icon: Layers },
  ];

  const getVernacularHeader = (langName, nativeName) => {
    if (langName?.toLowerCase().includes('malayalam') || nativeName?.includes('മലയാളം')) {
      return `പാഠ സംഗ്രഹം (${nativeName || 'മലയാളം'})`;
    }
    if (langName?.toLowerCase().includes('hindi') || nativeName?.includes('हिन्दी')) {
      return `पाठ सारांश (${nativeName || 'हिन्दी'})`;
    }
    return `பாடத்தின் சுருக்கம் (${nativeName || 'தமிழ்'})`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card study-guide-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '980px' }}>
        {/* Modal Header */}
        <div className="modal-head study-guide-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(5, 150, 105, 0.3))',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16.5px', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                {guide.title || 'Structured Lecture Study Guide'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                <span className="brand-tag" style={{ fontSize: '10px' }}>
                  {guide.target_language} ({guide.native_language})
                </span>
                <span>• {guide.date}</span>
                <span>• {guide.segment_count || 0} segments</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-shimmer"
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf}
              title="Download academic formatted PDF study guide"
              style={{ padding: '7px 16px', fontSize: '12.5px' }}
            >
              <Download size={14} />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="study-guide-tabs"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(10, 14, 24, 0.4)',
            padding: '4px 16px',
            gap: '6px',
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
                aria-selected={isActive}
                role="tab"
                className={`lang-pill-btn ${isActive ? 'active' : ''}`}
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Icon size={13} color={isActive ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="modal-scroll study-guide-body" style={{ maxHeight: '65vh', padding: '20px' }}>
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.05)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '13.5px' }}>
                  <Sparkles size={15} />
                  <span>Executive Summary (English)</span>
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--text-main)' }}>
                  {guide.overview?.en}
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(250, 204, 21, 0.05)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(250, 204, 21, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '14px' }}>
                  <BookOpen size={15} />
                  <span>{getVernacularHeader(guide.target_language, guide.native_language)}</span>
                </div>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--accent-gold)' }}>
                  {guide.overview?.vernacular}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'diagram' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {guide.diagram?.source || 'Generated from this lecture transcript.'}
              </div>
              {guide.diagram?.nodes?.length ? (
                <div className="concept-map-flow" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {guide.diagram.nodes.map((node) => (
                    <React.Fragment key={node.id}>
                      <div className="concept-map-node" style={{ minWidth: '150px', padding: '14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.35)', background: 'rgba(56, 189, 248, 0.08)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '13px' }}>{node.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>{node.detail}</div>
                      </div>
                      {node.id !== guide.diagram.nodes[guide.diagram.nodes.length - 1].id && <span style={{ color: 'var(--accent-gold)', fontSize: '20px' }}>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="empty-box"><div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No concept relationships detected in this session.</div></div>
              )}
              {guide.visuals && (
                <div className="visual-explanation-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '4px' }}>
                  {/* 1. Machine Learning Loss Curve */}
                  {guide.visuals.lossCurve && (
                    <div className="visual-explanation-card loss-card" style={{ padding: '12px', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', background: 'rgba(52, 211, 153, 0.05)' }}>
                      <div style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Loss Convergence Profile</div>
                      <svg viewBox="0 0 320 170" role="img" aria-label="Loss curve descending over training iterations" style={{ width: '100%', height: '170px' }}>
                        <line x1="38" y1="12" x2="38" y2="140" stroke="rgba(255,255,255,0.3)" />
                        <line x1="38" y1="140" x2="305" y2="140" stroke="rgba(255,255,255,0.3)" />
                        <polyline points="42,28 82,55 122,78 162,96 202,110 242,120 300,130" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
                        {[['42','28'], ['82','55'], ['122','78'], ['162','96'], ['202','110'], ['242','120'], ['300','130']].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#facc15" />)}
                        <text x="42" y="158" fill="#94a3b8" fontSize="10">iteration</text>
                        <text x="8" y="24" fill="#94a3b8" fontSize="10">loss</text>
                      </svg>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guide.visuals.lossCurve.caption}</div>
                    </div>
                  )}

                  {/* 2. Neural Network Learning Flow */}
                  {guide.visuals.network && (
                    <div className="visual-explanation-card network-card" style={{ padding: '12px', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.05)' }}>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Neural Network Architecture</div>
                      <svg viewBox="0 0 320 170" role="img" aria-label="Neural network layers connected by arrows" style={{ width: '100%', height: '170px' }}>
                        <g stroke="rgba(148,163,184,0.45)" strokeWidth="2">
                          <line x1="55" y1="48" x2="155" y2="38" /><line x1="55" y1="48" x2="155" y2="88" /><line x1="55" y1="112" x2="155" y2="38" /><line x1="55" y1="112" x2="155" y2="88" />
                          <line x1="165" y1="38" x2="265" y2="62" /><line x1="165" y1="88" x2="265" y2="62" />
                        </g>
                        {[['55','48','#facc15'], ['55','112','#facc15'], ['160','38','#38bdf8'], ['160','88','#38bdf8'], ['270','62','#34d399']].map(([cx, cy, fill]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="12" fill={fill} stroke="#0f1422" strokeWidth="4" />)}
                        <text x="38" y="150" fill="#94a3b8" fontSize="10">input</text><text x="143" y="150" fill="#94a3b8" fontSize="10">hidden</text><text x="252" y="150" fill="#94a3b8" fontSize="10">output</text>
                      </svg>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guide.visuals.network.caption}</div>
                    </div>
                  )}

                  {/* 3. Thermodynamics Energy Flow Diagram */}
                  {guide.visuals.thermoCycle && (
                    <div className="visual-explanation-card thermo-card" style={{ padding: '12px', border: '1px solid rgba(249, 115, 22, 0.35)', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.05)' }}>
                      <div style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>First Law Energy Balance</div>
                      <svg viewBox="0 0 320 170" role="img" aria-label="Thermodynamic system heat in work out" style={{ width: '100%', height: '170px' }}>
                        {/* Hot Reservoir */}
                        <rect x="20" y="20" width="70" height="35" rx="6" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1.5" />
                        <text x="32" y="42" fill="#f87171" fontSize="11" fontWeight="bold">Hot (Q_in)</text>
                        {/* System Box */}
                        <rect x="120" y="45" width="80" height="65" rx="8" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="2" />
                        <text x="135" y="75" fill="#38bdf8" fontSize="12" fontWeight="bold">System</text>
                        <text x="138" y="95" fill="#94a3b8" fontSize="11">ΔU = Q - W</text>
                        {/* Work Out */}
                        <rect x="235" y="45" width="70" height="35" rx="6" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="1.5" />
                        <text x="245" y="67" fill="#4ade80" fontSize="11" fontWeight="bold">Work (W)</text>
                        {/* Cold Reservoir */}
                        <rect x="20" y="110" width="70" height="35" rx="6" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1.5" />
                        <text x="28" y="132" fill="#60a5fa" fontSize="11" fontWeight="bold">Cold (Q_out)</text>
                        {/* Arrows */}
                        <line x1="90" y1="38" x2="120" y2="60" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrow)" />
                        <line x1="200" y1="62" x2="235" y2="62" stroke="#4ade80" strokeWidth="2" />
                        <line x1="135" y1="110" x2="90" y2="128" stroke="#60a5fa" strokeWidth="2" />
                      </svg>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guide.visuals.thermoCycle.caption}</div>
                    </div>
                  )}

                  {/* 4. Photosynthesis Biochemical Pathway */}
                  {guide.visuals.photosynthesis && (
                    <div className="visual-explanation-card bio-card" style={{ padding: '12px', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.05)' }}>
                      <div style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Dual-Phase Photosynthetic Pathway</div>
                      <svg viewBox="0 0 320 170" role="img" aria-label="Photosynthesis light and dark reaction flow" style={{ width: '100%', height: '170px' }}>
                        {/* Light Reactions Box */}
                        <rect x="20" y="30" width="125" height="90" rx="8" fill="rgba(250, 204, 21, 0.15)" stroke="#facc15" strokeWidth="1.5" />
                        <text x="32" y="52" fill="#facc15" fontSize="11" fontWeight="bold">Light Reactions</text>
                        <text x="32" y="70" fill="#cbd5e1" fontSize="10">• Thylakoid Membrane</text>
                        <text x="32" y="86" fill="#cbd5e1" fontSize="10">• H₂O ➔ O₂ (Photolysis)</text>
                        <text x="32" y="102" fill="#34d399" fontSize="10" fontWeight="bold">Yields ATP & NADPH</text>
                        {/* Calvin Cycle Box */}
                        <rect x="175" y="30" width="125" height="90" rx="8" fill="rgba(52, 211, 153, 0.15)" stroke="#34d399" strokeWidth="1.5" />
                        <text x="187" y="52" fill="#34d399" fontSize="11" fontWeight="bold">Calvin Cycle</text>
                        <text x="187" y="70" fill="#cbd5e1" fontSize="10">• Chloroplast Stroma</text>
                        <text x="187" y="86" fill="#cbd5e1" fontSize="10">• CO₂ Fixation via RuBisCO</text>
                        <text x="187" y="102" fill="#facc15" fontSize="10" fontWeight="bold">Produces Glucose</text>
                        {/* Connecting Transfer Arrows */}
                        <line x1="145" y1="58" x2="175" y2="58" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3,3" />
                        <line x1="175" y1="88" x2="145" y2="88" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3,3" />
                        <text x="135" y="145" fill="#94a3b8" fontSize="10">6CO₂ + 6H₂O ➔ C₆H₁₂O₆ + 6O₂</text>
                      </svg>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guide.visuals.photosynthesis.caption}</div>
                    </div>
                  )}

                  {/* 5. Linear Algebra Vector Transformation */}
                  {guide.visuals.vectorTransform && (
                    <div className="visual-explanation-card math-card" style={{ padding: '12px', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.05)' }}>
                      <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Eigenvector Linear Scaling</div>
                      <svg viewBox="0 0 320 170" role="img" aria-label="Eigenvector scaling transformation" style={{ width: '100%', height: '170px' }}>
                        <line x1="30" y1="140" x2="290" y2="140" stroke="rgba(255,255,255,0.2)" />
                        <line x1="160" y1="20" x2="160" y2="150" stroke="rgba(255,255,255,0.2)" />
                        {/* Original Vector v */}
                        <line x1="160" y1="140" x2="210" y2="90" stroke="#38bdf8" strokeWidth="3" />
                        <text x="215" y="92" fill="#38bdf8" fontSize="11" fontWeight="bold">v</text>
                        {/* Scaled Eigenvector Av = λv */}
                        <line x1="160" y1="140" x2="260" y2="40" stroke="#c084fc" strokeWidth="3" strokeDasharray="4,4" />
                        <text x="265" y="42" fill="#c084fc" fontSize="11" fontWeight="bold">Av = λv</text>
                        <text x="40" y="45" fill="#facc15" fontSize="11">Characteristic: det(A - λI) = 0</text>
                        <text x="40" y="65" fill="#94a3b8" fontSize="10">Direction invariant, magnitude scaled</text>
                      </svg>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guide.visuals.vectorTransform.caption}</div>
                    </div>
                  )}

                  {/* 6. Universal Concept Progression Flow */}
                  {guide.visuals.conceptFlow && !guide.visuals.lossCurve && !guide.visuals.thermoCycle && !guide.visuals.photosynthesis && !guide.visuals.vectorTransform && (
                    <div className="visual-explanation-card general-card" style={{ padding: '12px', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.05)' }}>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Core Concept Progression</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '170px', gap: '8px' }}>
                        {(guide.diagram?.nodes || []).slice(0, 3).map((node, i) => (
                          <React.Fragment key={node.id}>
                            <div style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '8px', textAlign: 'center', minWidth: '80px' }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600 }}>{node.label}</div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{node.detail}</div>
                            </div>
                            {i < 2 && i < (guide.diagram?.nodes?.length || 0) - 1 && <span style={{ color: 'var(--accent-gold)', fontSize: '16px' }}>➔</span>}
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guide.visuals.conceptFlow.caption || "Sequential progression of core lecture principles."}</div>
                    </div>
                  )}

                  {/* 7. Governing Equation Card */}
                  {guide.visuals.equation && (
                    <div className="visual-explanation-card equation-card" style={{ padding: '12px', border: '1px solid rgba(250, 204, 21, 0.35)', borderRadius: '10px', background: 'rgba(250, 204, 21, 0.05)', gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '13px' }}>
                        {guide.visuals.equation.title || guide.formulas?.[0]?.name || "Governing Equation"}
                      </div>
                      <div style={{ color: '#f8fafc', fontFamily: 'var(--font-mono)', fontSize: '22px', textAlign: 'center', padding: '16px 8px' }}>
                        {guide.visuals.equation.latex}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
                        {guide.visuals.equation.caption}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Definitions Tab */}
          {activeTab === 'definitions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(!guide.definitions || guide.definitions.length === 0) ? (
                <div className="empty-box">
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No definitions detected in this session yet.</div>
                </div>
              ) : (
                guide.definitions.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>{d.term}</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '14px' }}>➔ {d.vernacular_term}</span>
                      </div>
                      <span className="brand-tag" style={{ fontSize: '10px' }}>{d.category || 'STEM'}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{d.definition}</p>
                    {d.vernacular_definition && (
                      <p style={{ fontSize: '13px', color: 'var(--accent-gold)', opacity: 0.9, lineHeight: '1.5', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                        {d.vernacular_definition}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Formulas Tab */}
          {activeTab === 'formulas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(!guide.formulas || guide.formulas.length === 0) ? (
                <div className="empty-box">
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No formulas detected in this session.</div>
                </div>
              ) : (
                guide.formulas.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '14px' }}>
                      {f.name}
                    </div>
                    <div
                      style={{
                        background: 'rgba(10, 14, 24, 0.8)',
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '14px',
                        color: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {f.latex}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px' }}>
                      <b>Significance:</b> {f.description}
                    </p>
                    {f.variables && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <b>Variables:</b> {f.variables}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Takeaways Tab */}
          {activeTab === 'takeaways' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(!guide.takeaways || guide.takeaways.length === 0) ? (
                <div className="empty-box">
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No takeaways recorded yet.</div>
                </div>
              ) : (
                guide.takeaways.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="timestamp-pill">⏱ {t.timestamp || `00:${i * 15}`}</span>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>{t.point}</span>
                    </div>
                    {t.vernacular_point && (
                      <div style={{ color: 'var(--accent-gold)', fontSize: '13px', paddingLeft: '10px', borderLeft: '2px solid var(--accent-gold)', marginTop: '6px' }}>
                        {t.vernacular_point}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Flashcards Tab */}
          {activeTab === 'flashcards' && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                💡 Click any card to flip between Question and Answer. Test yourself with active recall!
              </p>
              <div className="flashcards-grid">
                {guide.flashcards?.map((fc) => {
                  const isFlipped = flippedCards[fc.id];
                  return (
                    <div
                      key={fc.id}
                      className="card-flip"
                      onClick={() => toggleFlip(fc.id)}
                      style={{
                        borderColor: isFlipped ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                        background: isFlipped ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="brand-tag" style={{ fontSize: '10px' }}>Card #{fc.id}</span>
                          <span style={{ fontSize: '11px', color: isFlipped ? 'var(--accent-emerald)' : 'var(--text-dim)', fontWeight: 600 }}>
                            {isFlipped ? '✓ Answer' : 'Question (Click)'}
                          </span>
                        </div>

                        {!isFlipped ? (
                          <>
                            <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                              {fc.front}
                            </div>
                            {fc.vernacular_front && (
                              <div style={{ color: 'var(--accent-gold)', fontSize: '13px', marginTop: '6px' }}>
                                {fc.vernacular_front}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.55' }}>
                            {fc.back}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '12px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
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

