import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Tag, ArrowDown, Sparkles, Mic, Copy, Check, Download, Radio, Volume2, VolumeX, ArrowLeftRight, FileText, FileDown, Loader2 } from 'lucide-react';
import { detectDomainTermsClient } from '../utils/clientTranslator';
import { exportCaptionsAsTxt, exportCaptionsAsPdf } from '../utils/captionExport';

export default function CaptionPane({
  segments = [],
  sourceLang = 'en',
  sourceLangName = 'English',
  targetLangName = 'Tamil',
  targetLang = 'ta',
  onSwapLanguages,
  highlightedSegmentId = null,
  autoScroll = true,
  onToggleAutoScroll,
  isRecording = false,
  liveMicStatus = 'idle',
  interimSpeech = '',
  interimVernacular = '',
  glossary = {},
  onClearCaptions,
  isReadAloud = false,
  onToggleReadAloud,
  isSpeakingAudio = false,
  onSpeakSegment,
  currentlySpeakingId = null,
  apiBaseUrl = '',
  classMode = 'realtime_classroom',
  roomCode = 'EDU-02',
  userRole = 'teacher',
}) {
  const bottomRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments.length, interimSpeech, interimVernacular, autoScroll]);

  const handleCopyTranscript = async () => {
    if (segments.length === 0) return;
    const text = segments
      .map(
        (s) =>
          `[${s.timestamp || `${Math.floor(s.start)}s - ${Math.floor(s.end)}s`}]\n${(s.source_lang || sourceLang).toUpperCase()}: ${s.text_source || s.text_en}\n${(s.target_lang || targetLang).toUpperCase()}: ${s.text_vernacular}\n`
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  const handleExportTxt = () => {
    exportCaptionsAsTxt(segments, sourceLang, targetLang);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const apiBase = apiBaseUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await exportCaptionsAsPdf(segments, sourceLang, targetLang, apiBase);
    } catch (err) {
      console.error("Failed to export PDF captions:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

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

  // Extract live STEM domain terms for active interim speech
  const liveInterimTerms = interimSpeech
    ? detectDomainTermsClient(interimSpeech, targetLang, glossary)
    : [];

  const showLiveActiveCard = isRecording || interimSpeech.length > 0;

  return (
    <div className="caption-card">
      {/* Header with Title and Control Chips */}
      <div className="caption-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '-0.01em' }}>
            Live Dual Captions
          </span>
          <div className="caption-pair-badge" title="Active Language Pair (Click ⇄ to swap)">
            <span>{sourceLang.toUpperCase()}</span>
            <button
              className="caption-swap-inline-btn"
              onClick={onSwapLanguages}
              title={`Swap languages (${sourceLang.toUpperCase()} ⇄ ${targetLang.toUpperCase()})`}
            >
              ⇄
            </button>
            <span>{targetLang.toUpperCase()}</span>
          </div>
          {isRecording && (
            <span className="live-indicator-pill">
              <span className="live-dot-pulse" />
              LIVE
            </span>
          )}

          {classMode === 'realtime_classroom' && (
            <span
              className="caption-mode-pill offline"
              title={`Real-Time [Offline] Class (${userRole === 'teacher' ? 'Host Broadcaster' : 'Student Listener'})`}
            >
              📡 Real-Time Class ({roomCode})
            </span>
          )}

          {classMode === 'online_classroom' && (
            <span
              className="caption-mode-pill online"
              title={`Online Class Room ${roomCode}`}
            >
              🌐 Online Class ({roomCode})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {segments.length > 0 && (
            <>
              <button
                className="chip-btn"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={handleCopyTranscript}
                title="Copy entire bilingual transcript to clipboard"
              >
                {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                className="chip-btn export-txt-btn"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={handleExportTxt}
                title="Export bilingual captions as Plain Text (.txt) file"
              >
                <FileText size={12} color="var(--accent-cyan)" />
                <span>.TXT</span>
              </button>

              <button
                className="chip-btn export-pdf-btn"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                title="Export bilingual captions as Formatted PDF (.pdf) document"
              >
                {isExportingPdf ? <Loader2 size={12} className="spin-fast" /> : <FileDown size={12} color="#fb7185" />}
                <span>{isExportingPdf ? '...' : '.PDF'}</span>
              </button>
            </>
          )}

          <button
            className={`chip-btn ${isReadAloud ? 'active' : ''}`}
            style={{
              padding: '3px 10px',
              fontSize: '11.5px',
              background: isReadAloud ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              borderColor: isReadAloud ? 'rgba(52, 211, 153, 0.4)' : 'var(--border-subtle)',
              color: isReadAloud ? '#6ee7b7' : 'var(--text-dim)',
              fontWeight: isReadAloud ? 700 : 500,
            }}
            onClick={onToggleReadAloud}
            title="Toggle automatic real-time Read Aloud of captions through your laptop speakers"
          >
            {isSpeakingAudio ? (
              <Volume2 size={13} color="#6ee7b7" className="spin-icon" />
            ) : isReadAloud ? (
              <Volume2 size={13} color="#6ee7b7" />
            ) : (
              <VolumeX size={13} color="var(--text-muted)" />
            )}
            <span>{isReadAloud ? (isSpeakingAudio ? 'Speaking...' : 'Read Aloud: ON') : 'Read Aloud: OFF'}</span>
          </button>

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
      </div>

      <div className="caption-list">
        {segments.length === 0 && !showLiveActiveCard ? (
          <div className="empty-box">
            <Sparkles size={36} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              No Lecture Speech Captured Yet
            </div>
            <p style={{ maxWidth: '360px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Click <b>"Live Mic (Teacher)"</b> to capture speech in real time, or click a <b>Sample Lecture</b> above to test.
            </p>
          </div>
        ) : (
          <>
            {/* Finalized Segments */}
            {segments.map((seg) => {
              const isHighlighted = seg.id === highlightedSegmentId;
              const isSpeakingThis = currentlySpeakingId === seg.id;
              return (
                <div
                  key={seg.id}
                  id={`seg-${seg.id}`}
                  className={`segment-item ${isHighlighted ? 'highlighted' : ''}`}
                >
                  <div className="segment-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="timestamp-pill">
                        [{seg.timestamp || `${Math.floor(seg.start)}s - ${Math.floor(seg.end)}s`}]
                      </span>
                      {getConfidenceBadge(seg.confidence)}
                    </div>

                    <button
                      className="chip-btn"
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        gap: '4px',
                        color: isSpeakingThis ? '#6ee7b7' : 'var(--text-muted)',
                        borderColor: isSpeakingThis ? 'rgba(52, 211, 153, 0.4)' : 'transparent',
                        background: isSpeakingThis ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => onSpeakSegment && onSpeakSegment(seg)}
                      title="Read this translation aloud through laptop speaker"
                    >
                      <Volume2 size={11} color={isSpeakingThis ? '#6ee7b7' : 'var(--text-muted)'} />
                      <span>{isSpeakingThis ? 'Playing...' : 'Read Aloud'}</span>
                    </button>
                  </div>

                  <div className="caption-en">
                    <span className="caption-lang-tag">{(seg.source_lang || sourceLang).toUpperCase()}</span>
                    {seg.text_source || seg.text_en}
                  </div>

                  <div className="caption-vernacular">
                    <span className="caption-lang-tag target">{targetLang.toUpperCase()}</span>
                    {seg.translations?.[targetLang] || seg.text_vernacular}
                  </div>

                  {seg.domain_terms && seg.domain_terms.length > 0 && (
                    <div className="domain-tags">
                      {seg.domain_terms.map((dt, idx) => (
                        <span
                          key={idx}
                          className="domain-chip"
                          title={`STEM Concept: ${dt.en} (${dt.category})\n${dt.definition || ''}`}
                        >
                          <Tag size={9} />
                          <b>{dt.en}</b>: {dt.translations?.[targetLang] || dt.adapted_vernacular || dt.en}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Maestra AI-Style Live Streaming Active Card */}
            {showLiveActiveCard && (
              <div className="live-stream-card">
                <div className="live-stream-header">
                  <div className="live-stream-status">
                    <span className="live-stream-pulse" />
                    <span>
                      {interimSpeech
                        ? 'TRANSCRIBING & TRANSLATING IN REAL TIME'
                        : 'MICROPHONE ACTIVE — LISTENING FOR VOICE...'}
                    </span>
                  </div>
                  <div className="live-stream-header-right">
                    <div className="live-equalizer-bars" title="Real-time acoustic speech detection">
                      <span className="live-bar bar-1" />
                      <span className="live-bar bar-2" />
                      <span className="live-bar bar-3" />
                      <span className="live-bar bar-4" />
                    </div>
                    <span className="live-stream-badge">
                      {liveMicStatus === 'speaking' ? 'Speaking' : 'Listening'}
                    </span>
                  </div>
                </div>

                {/* Speech Streaming Line */}
                <div className="live-stream-body">
                  <div className="live-stream-label">{(sourceLangName || 'ORIGINAL').toUpperCase()} SPEECH</div>
                  <div className={`live-stream-en ${!interimSpeech ? 'placeholder' : ''}`}>
                    {interimSpeech ? (
                      <>
                        <span>{interimSpeech}</span>
                        <span className="live-stream-cursor">|</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Start speaking into the mic...
                      </span>
                    )}
                  </div>

                  {/* Real-time Translation Line */}
                  <div className="live-stream-label" style={{ marginTop: '10px' }}>
                    {(targetLangName || 'TARGET').toUpperCase()} TRANSLATION
                  </div>
                  <div className="live-stream-vernacular">
                    {interimVernacular ? (
                      <span>{interimVernacular}</span>
                    ) : interimSpeech ? (
                      <span className="live-stream-translating">Translating live...</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        {targetLang === 'ml'
                          ? 'തത്സമയ വിവർത്തനം ഇവിടെ ദൃശ്യമാകും...'
                          : targetLang === 'hi'
                          ? 'लाइव अनुवाद यहाँ दिखाई देगा...'
                          : 'நேரலை மொழிபெயர்ப்பு இங்கே தோன்றும்...'}
                      </span>
                    )}
                  </div>

                  {/* Real-Time Live STEM Concept Detection Badges */}
                  {liveInterimTerms.length > 0 && (
                    <div className="domain-tags" style={{ marginTop: '10px' }}>
                      {liveInterimTerms.map((dt, idx) => (
                        <span
                          key={idx}
                          className="domain-chip live-chip"
                          title={`Detected STEM Term: ${dt.en}`}
                        >
                          <Tag size={9} />
                          <b>{dt.en}</b>: {dt.adapted_vernacular || dt.en}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auto-Commit Hint */}
                <div className="live-stream-footer">
                  <span>⚡ Conversational Auto-Commit: natural pause (~1s) commits clause to permanent notes.</span>
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
