import React from 'react';
import { X, Sparkles, CheckCircle2, Cpu, Globe, FileText, Database } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="var(--brand-primary)" />
            <div style={{ fontWeight: 700, fontSize: '17px' }}>
              ClassBridge — Architecture & Explainability (TENSORA 2026)
            </div>
          </div>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ fontSize: '13px', lineHeight: '1.6', gap: '16px' }}>
          <div>
            <h4 style={{ color: 'var(--brand-primary)', marginBottom: '6px' }}>🎯 Problem Statement: EDU-02</h4>
            <p>
              Helps students follow and later study STEM lectures in Indic vernacular languages (Tamil, Hindi, Telugu, etc.) with real-time streaming dual captions, structured exportable PDF study guides, and grounded timestamp-cited Q&A.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                <Cpu size={15} />
                <span>1. ASR Layer (faster-whisper)</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Runs int8-quantized Whisper (base/small) with 3-5s sliding audio chunks. Computes average log-probability and no-speech probability to derive accurate confidence percentages.
              </p>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#facc15', marginBottom: '4px' }}>
                <Globe size={15} />
                <span>2. STEM Domain Adaptation</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                A post-MT correction pass with an 80+ term STEM glossary preventing mistranslation of core technical terms (eigenvalue, gradient descent, entropy, mitochondria) into Indic vernaculars.
              </p>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#4ade80', marginBottom: '4px' }}>
                <FileText size={15} />
                <span>3. Structured Study Guide & PDF</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Synthesizes the entire lecture into executive summaries, bilingual definitions, LaTeX formulas, bulleted takeaways, and interactive flashcards. Exports directly to academic PDF.
              </p>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#c084fc', marginBottom: '4px' }}>
                <Database size={15} />
                <span>4. Grounded RAG with Citations</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Indexes every transcript segment by start/end timestamps. Retrieval-Augmented Generation answers questions strictly using lecture statements, citing clickable timestamp pills.
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h5 style={{ color: 'var(--brand-primary)', marginBottom: '4px' }}>📚 Open-Source Model & Dataset Citations</h5>
            <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
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
