import React from 'react';
import { X, Sparkles, Cpu, Globe, FileText, Database } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(129, 140, 248, 0.15)',
                border: '1px solid rgba(129, 140, 248, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="var(--accent-indigo)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16.5px', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                ClassBridge — Architecture & Explainability (TENSORA 2026)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Problem EDU-02: Real-Time Vernacular Lecture Companion
              </div>
            </div>
          </div>
          <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-scroll" style={{ fontSize: '13px', lineHeight: '1.6', gap: '16px', maxHeight: '70vh' }}>
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', fontSize: '13.5px' }}>
              🎯 Problem Statement: EDU-02
            </div>
            <p style={{ color: 'var(--text-main)', fontSize: '13px' }}>
              Helps students follow and later study STEM lectures in Indic vernacular languages (<b>Tamil</b>, <b>Malayalam</b>, and <b>Hindi</b>) with real-time streaming dual captions, structured exportable PDF study guides, and grounded timestamp-cited Q&A.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                <Cpu size={16} />
                <span>1. ASR Layer (faster-whisper)</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Runs int8-quantized Whisper (base/small) with 3-5s sliding audio chunks. Computes average log-probability and no-speech probability to derive explainable confidence percentages.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px' }}>
                <Globe size={16} />
                <span>2. STEM Domain Adaptation Layer</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                A post-MT correction pass with an 80+ term STEM glossary preventing mistranslation of core technical terms (eigenvalue, gradient descent, entropy, mitochondria) into Tamil, Malayalam, and Hindi.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                <FileText size={16} />
                <span>3. Structured Study Guide & PDF Export</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Synthesizes the entire lecture into executive summaries, bilingual definitions, LaTeX formulas, bulleted takeaways, and interactive flashcards. Exports directly to academic PDF via ReportLab.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                <Database size={16} />
                <span>4. Grounded RAG with Timestamp Citations</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Indexes every transcript segment by start/end timestamps. Retrieval-Augmented Generation answers questions strictly using lecture statements, citing clickable timestamp pills.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '6px', fontSize: '12.5px' }}>
              📚 Open-Source Model & Dataset Citations
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><b>faster-whisper:</b> Guillaume Klein et al., SYSTRAN (OpenAI Whisper reimplementation with CTranslate2).</li>
              <li><b>IndicTrans2 & AI4Bharat:</b> Gala et al., AI4Bharat IndicTrans2 Indic Language Translation Benchmark.</li>
              <li><b>Common Voice & NPTEL:</b> Mozilla Common Voice & NPTEL Indian English STEM lecture datasets for evaluation.</li>
              <li><b>ReportLab:</b> Open-source PDF generation engine for academic document synthesis.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
