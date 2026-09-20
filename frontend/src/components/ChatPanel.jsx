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
    "What is the relationship between learning rate and overfitting?",
    "What does entropy represent in thermodynamics?",
  ];

  return (
    <div className="right-pane">
      <div className="chat-card">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} color="var(--brand-primary)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>
              Grounded Lecture Q&A
            </span>
          </div>
          <span className="badge-tag badge-blue" title="Only answers based on transcript with citations">
            Grounded RAG
          </span>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 10px' }}>
              <HelpCircle size={36} color="var(--text-muted)" />
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                Ask Questions About This Lecture
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Every answer is grounded strictly in the session transcript and cites the exact timestamp and line used.
              </p>

              {segmentCount > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Suggested Questions:
                  </span>
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      className="btn btn-outline"
                      style={{ fontSize: '12px', textAlign: 'left', padding: '6px 10px', justifyContent: 'flex-start' }}
                      onClick={() => onSendMessage(q)}
                    >
                      <Sparkles size={12} color="var(--brand-primary)" />
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
                className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-bot'}`}
              >
                <div>{msg.text}</div>

                {msg.vernacular && (
                  <div
                    style={{
                      marginTop: '4px',
                      paddingTop: '4px',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
                      color: 'var(--vernacular-color)',
                      fontSize: '13px',
                    }}
                  >
                    {msg.vernacular}
                  </div>
                )}

                {msg.citations && msg.citations.length > 0 && (
                  <div className="citation-box">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Grounded Citations:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {msg.citations.map((cite, cIdx) => (
                        <button
                          key={cIdx}
                          className="citation-pill"
                          onClick={() => onSelectCitation(cite.segment_id)}
                          title={`Click to jump to transcript at ${cite.timestamp}:\n"${cite.text_en}"`}
                        >
                          <ExternalLink size={10} />
                          <span>Seg #{cite.segment_id} [{cite.timestamp}]</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="message-bubble message-bot" style={{ opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} className="active" color="var(--brand-primary)" />
                <span style={{ fontSize: '13px' }}>Retrieving transcript segments and grounding answer...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder={
              segmentCount === 0
                ? "Record lecture or load sample to ask questions..."
                : "Ask anything about this lecture..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '8px 12px' }}
            disabled={isLoading || !input.trim()}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
