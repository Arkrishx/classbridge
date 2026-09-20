import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, HelpCircle, ExternalLink } from 'lucide-react';

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  onSelectCitation,
  segmentCount,
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
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
            Lecture Q&A
          </span>
        </div>
        <span className="brand-tag">Grounded RAG</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-box" style={{ padding: '24px 12px' }}>
            <HelpCircle size={32} color="var(--text-dim)" />
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
              Ask Any Question
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Answers are grounded strictly in the session transcript and cite the exact timestamp line.
            </p>

            {segmentCount > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Suggested Questions:
                </span>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="chip-btn"
                    style={{ textAlign: 'left', padding: '6px 10px', justifyContent: 'flex-start' }}
                    onClick={() => onSendMessage(q)}
                  >
                    <Sparkles size={11} color="var(--accent-cyan)" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`msg-bubble ${msg.role === 'user' ? 'msg-user' : 'msg-bot'}`}
            >
              <div>{msg.text}</div>

              {msg.vernacular && (
                <div
                  style={{
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
                    color: 'var(--accent-gold)',
                    fontSize: '13px',
                  }}
                >
                  {msg.vernacular}
                </div>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 600 }}>
                    Sources:
                  </span>
                  {msg.citations.map((cite, cIdx) => (
                    <button
                      key={cIdx}
                      className="citation-chip"
                      onClick={() => onSelectCitation(cite.segment_id)}
                      title={`Jump to [${cite.timestamp}]:\n"${cite.text_en}"`}
                    >
                      <ExternalLink size={9} />
                      <span>[{cite.timestamp}]</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="msg-bubble msg-bot" style={{ opacity: 0.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--accent-cyan)' }}>
              <Sparkles size={13} className="active" />
              <span>Retrieving transcript evidence & grounding answer...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input-field"
          placeholder={
            segmentCount === 0
              ? "Capture lecture speech to ask questions..."
              : "Ask about this lecture..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn-minimal"
          style={{ background: 'var(--accent-cyan)', color: '#08090d', border: 'none', padding: '8px 12px' }}
          disabled={isLoading || !input.trim()}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
