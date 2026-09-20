import React from 'react';
import {
  Columns,
  Tv,
  MessageSquare,
  Sparkles,
  Send,
  Radio,
  Download,
  Copy,
  Check,
  Menu,
} from 'lucide-react';

export default function WorkspaceHeader({
  viewMode = 'split',
  onViewModeChange,
  connectionStatus = 'connected',
  onDirectSpeechSubmit,
  segmentCount = 0,
  onToggleMobileSidebar,
  sourceLang = 'en',
  targetLang = 'ta',
  onSwapLanguages,
}) {
  const [quickInput, setQuickInput] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    if (onDirectSpeechSubmit) {
      onDirectSpeechSubmit(quickInput.trim());
    }
    setQuickInput('');
  };

  return (
    <header className="workspace-header">
      {/* Left: Mobile Drawer Toggle & Stage Title */}
      <div className="workspace-title-box">
        {onToggleMobileSidebar && (
          <button
            className="btn-minimal mobile-sidebar-toggle"
            onClick={onToggleMobileSidebar}
            title="Toggle Studio Controls"
          >
            <Menu size={16} />
          </button>
        )}

        <div>
          <div className="workspace-heading-row">
            <span className="workspace-heading">Live Lecture Studio</span>
            <div className={`status-badge ${connectionStatus === 'connected' ? 'status-live' : 'status-browser'}`}>
              <span className="status-pulse-dot" />
              <span>{connectionStatus === 'connected' ? 'Live Stream' : 'Browser Engine'}</span>
            </div>

            {onSwapLanguages && (
              <button
                className="workspace-lang-swap-badge"
                onClick={onSwapLanguages}
                title={`Active Direction: ${sourceLang.toUpperCase()} ➔ ${targetLang.toUpperCase()}. Click to swap ⇄`}
              >
                <span className="lang-tag-src">{sourceLang.toUpperCase()}</span>
                <span className="lang-tag-arrow">⇄</span>
                <span className="lang-tag-tgt">{targetLang.toUpperCase()}</span>
              </button>
            )}
          </div>
          <div className="workspace-subheading">
            Dual-language real-time speech synthesis & grounded AI knowledge companion
          </div>
        </div>
      </div>

      {/* Center: Interactive View Mode Switcher (Split, Theater, Tutor) */}
      <div className="view-mode-deck" title="Switch Workspace Layout Mode">
        <button
          className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
          onClick={() => onViewModeChange('split')}
          title="Split Studio: Dual Captions and AI Tutor side-by-side"
        >
          <Columns size={13} />
          <span>Split Studio</span>
        </button>

        <button
          className={`view-mode-btn ${viewMode === 'theater' ? 'active' : ''}`}
          onClick={() => onViewModeChange('theater')}
          title="Theater Mode: Full-width expanded dual captions for lecture hall viewing"
        >
          <Tv size={13} />
          <span>Theater Captions</span>
        </button>

        <button
          className={`view-mode-btn ${viewMode === 'tutor' ? 'active' : ''}`}
          onClick={() => onViewModeChange('tutor')}
          title="Tutor Focus: Full-width AI Lecture Copilot with citation search"
        >
          <MessageSquare size={13} />
          <span>AI Tutor Focus</span>
        </button>
      </div>

      {/* Right: Quick Dictation / Fast Speech Input Bar */}
      <div className="workspace-quick-input-box">
        <form onSubmit={handleSubmit} className="workspace-speech-bar">
          <Sparkles size={13} color="var(--accent-cyan)" />
          <input
            type="text"
            className="workspace-speech-input"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder='Type or dictate text (e.g. "We compute eigenvalues and gradient descent")...'
            title="Tip: You can also press Windows Key + H in this box for instant Windows Voice Typing!"
          />
          <button
            type="submit"
            className="btn-caption-send"
            disabled={!quickInput.trim()}
            title="Commit spoken phrase immediately"
          >
            <Send size={11} />
            <span>Caption</span>
          </button>
        </form>
      </div>
    </header>
  );
}
