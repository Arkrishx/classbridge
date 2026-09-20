import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Globe,
  BookOpen,
  Clock,
} from 'lucide-react';

export default function ChatPanel({
  messages = [],
  onSendMessage,
  isLoading = false,
  onSelectCitation,
  segmentCount = 0,
  sourceLang = 'en',
  targetLang = 'ta',
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!input.trim() || isLoading) return;
    const textToSend = input.trim();
    setInput('');
    onSendMessage(textToSend);
  };

  const sampleQuestions = [
    "What is gradient descent?",
    "Explain eigenvalue and eigenvector.",
    "What causes model overfitting?",
  ];

  return (
    <div className="chat-card">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={15} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '-0.01em' }}>
            AI Tutor Focus
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="brand-tag">Grounded RAG + Web</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-box" style={{ padding: '24px 14px' }}>
            <HelpCircle size={32} color="var(--text-dim)" />
            <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-main)', marginTop: '4px' }}>
              Ask Any Lecture Question
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto' }}>
              The AI Tutor cross-references the live transcript to answer with exact timestamps and lecture quotes, paired with simple internet reference definitions.
            </p>

            {segmentCount > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '380px', margin: '14px auto 0 auto' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, textAlign: 'left' }}>
                  Suggested Questions:
                </span>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip-btn"
                    style={{ textAlign: 'left', padding: '6px 10px', justifyContent: 'flex-start' }}
                    onClick={(e) => {
                      if (e && e.preventDefault) e.preventDefault();
                      onSendMessage(q);
                    }}
                  >
                    <Sparkles size={11} color="var(--accent-cyan)" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            if (msg.role === 'user') {
              const userText = typeof msg.text === 'string' ? msg.text : String(msg.text || '');
              return (
                <div key={index} className="msg-bubble msg-user">
                  <div>{userText}</div>
                </div>
              );
            }

            // AI Tutor Bot Response
            const isInLecture = msg.found_in_lecture !== false;
            const citations = Array.isArray(msg.citations) ? msg.citations : [];
            const internetDef = msg.internet_definition;

            const botText = typeof msg.text === 'string'
              ? msg.text
              : (msg.text?.text || (msg.text ? JSON.stringify(msg.text) : ''));
            const botVernacular = typeof msg.vernacular === 'string'
              ? msg.vernacular
              : (msg.vernacular?.text || (msg.vernacular ? JSON.stringify(msg.vernacular) : ''));

            return (
              <div key={index} className="msg-bubble msg-bot upgraded-bot-card">
                {/* 1. Status Indicator Pill */}
                <div className="qa-status-row">
                  {isInLecture ? (
                    <span className="qa-status-pill in-lecture" title="Grounded in lecture caption transcript">
                      <CheckCircle2 size={11} />
                      <span>Grounded in Lecture</span>
                    </span>
                  ) : (
                    <span className="qa-status-pill out-of-topic" title="Not mentioned in lecture captions. Answered via internet knowledge.">
                      <AlertCircle size={11} />
                      <span>Not in Lecture (Out of Topic)</span>
                    </span>
                  )}
                </div>

                {/* 2. Main Explanation in Both Languages */}
                <div className="qa-answer-block">
                  {botText && (
                    <div className="qa-answer-lang-row">
                      <span className="qa-lang-tag src">{(msg.source_lang || sourceLang).toUpperCase()}</span>
                      <span className="qa-answer-text">{botText}</span>
                    </div>
                  )}

                  {botVernacular && (
                    <div className="qa-answer-lang-row vernacular-row">
                      <span className="qa-lang-tag tgt">{(msg.target_lang || targetLang).toUpperCase()}</span>
                      <span className="qa-answer-text vernacular-text">{botVernacular}</span>
                    </div>
                  )}
                </div>

                {/* 3. Lecture Evidence Card (Timestamps & Actual Sentences) */}
                {isInLecture && citations.length > 0 && (
                  <div className="lecture-evidence-card">
                    <div className="evidence-header">
                      <BookOpen size={11} color="var(--accent-emerald)" />
                      <span>Lecture Caption Evidence ({citations.length} Segment{citations.length > 1 ? 's' : ''})</span>
                    </div>

                    <div className="evidence-segments-list">
                      {citations.map((cite, cIdx) => {
                        const citeSource = typeof cite.text_source === 'string'
                          ? cite.text_source
                          : (cite.text_en || '');
                        const citeVernacular = typeof cite.text_vernacular === 'string'
                          ? cite.text_vernacular
                          : '';

                        return (
                          <div key={cIdx} className="evidence-item">
                            <div className="evidence-meta-row">
                              <button
                                type="button"
                                className="evidence-timestamp-btn"
                                onClick={(e) => {
                                  if (e && e.preventDefault) e.preventDefault();
                                  onSelectCitation && onSelectCitation(cite.segment_id);
                                }}
                                title="Click to jump and highlight this caption in the left pane"
                              >
                                <Clock size={10} />
                                <span>[{cite.timestamp || '00:00'}] Jump to Caption</span>
                              </button>
                              {cite.relevance_score && (
                                <span className="evidence-score">
                                  Match: {Math.round(cite.relevance_score * 100)}%
                                </span>
                              )}
                            </div>

                            <div className="evidence-quote-box">
                              <div className="evidence-quote-line">
                                <span className="evidence-lang-mini">{(msg.source_lang || sourceLang).toUpperCase()}</span>
                                <span className="evidence-sentence">"{citeSource}"</span>
                              </div>

                              {citeVernacular && (
                                <div className="evidence-quote-line tgt-line">
                                  <span className="evidence-lang-mini tgt">{(msg.target_lang || targetLang).toUpperCase()}</span>
                                  <span className="evidence-sentence tgt-text">"{citeVernacular}"</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Simple Internet Reference Definition Card */}
                {internetDef && (
                  <div className="internet-def-card">
                    <div className="def-card-header">
                      <div className="def-card-title-box">
                        <Globe size={12} color="var(--accent-cyan)" />
                        <span className="def-term-label">
                          Internet Definition: <b>{typeof internetDef.term === 'string' ? internetDef.term : String(internetDef.term || '')}</b>
                        </span>
                      </div>

                      {internetDef.source_url && (
                        <a
                          href={internetDef.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="def-source-link"
                          title="Open full reference page"
                        >
                          <ExternalLink size={9} />
                          <span>{internetDef.source_title || 'Wikipedia'}</span>
                        </a>
                      )}
                    </div>

                    <div className="def-card-body">
                      {internetDef.text_source && (
                        <div className="def-line">
                          <span className="qa-lang-tag src">{(msg.source_lang || sourceLang).toUpperCase()}</span>
                          <span className="def-text">
                            {typeof internetDef.text_source === 'string'
                              ? internetDef.text_source
                              : (internetDef.text_source?.adapted_translation || String(internetDef.text_source || ''))}
                          </span>
                        </div>
                      )}

                      {internetDef.text_target && (
                        <div className="def-line tgt-def">
                          <span className="qa-lang-tag tgt">{(msg.target_lang || targetLang).toUpperCase()}</span>
                          <span className="def-text tgt-text">
                            {typeof internetDef.text_target === 'string'
                              ? internetDef.text_target
                              : (internetDef.text_target?.adapted_translation || String(internetDef.text_target || ''))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="msg-bubble msg-bot" style={{ opacity: 0.9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--accent-cyan)' }}>
              <Sparkles size={13} className="spin-fast" />
              <span>Cross-referencing lecture captions & internet definitions...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        className="chat-input-row"
        action="javascript:void(0);"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="chat-input-field"
          placeholder={
            segmentCount === 0
              ? "Ask any topic or question (cross-references lecture + web)..."
              : "Ask about this lecture or technical topics..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-minimal"
          style={{ background: 'var(--accent-cyan)', color: '#08090d', border: 'none', padding: '8px 12px' }}
          disabled={isLoading || !input.trim()}
          title="Send question to AI Tutor"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
