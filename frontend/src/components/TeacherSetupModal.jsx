import React, { useState, useEffect } from 'react';
import { Crown, Globe, User, Sparkles, X, Check, Video, Mic } from 'lucide-react';

const SPOKEN_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
];

const TARGET_LANGUAGES = [
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
];

export default function TeacherSetupModal({
  isOpen,
  onClose,
  initialName = '',
  sourceLang = 'en',
  onChangeSourceLang,
  targetLang = 'ta',
  onChangeTargetLang,
  roomCode = 'EDU-02',
  onSubmit,
}) {
  const [name, setName] = useState(initialName);
  const [selectedSource, setSelectedSource] = useState(sourceLang);
  const [selectedTarget, setSelectedTarget] = useState(targetLang);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialName || localStorage.getItem('classbridge_teacher_name') || '');
    setSelectedSource(sourceLang || localStorage.getItem('classbridge_source_lang') || 'en');
    setSelectedTarget(targetLang || 'ta');
    setError('');
  }, [isOpen, initialName, sourceLang, targetLang]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter your name or academic title before starting');
      return;
    }

    try {
      localStorage.setItem('classbridge_teacher_name', cleanName);
      localStorage.setItem('classbridge_source_lang', selectedSource);
    } catch (err) {}

    if (onChangeSourceLang && selectedSource !== sourceLang) {
      onChangeSourceLang(selectedSource);
    }
    if (onChangeTargetLang && selectedTarget !== targetLang) {
      onChangeTargetLang(selectedTarget);
    }
    if (onSubmit) {
      onSubmit({ teacherName: cleanName, sourceLang: selectedSource, targetLang: selectedTarget });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="google-modal-overlay" onClick={onClose}>
      <div
        className="google-modal-dialog student-register-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px' }}
      >
        <div className="modal-header-gradient" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(66, 133, 244, 0.08))' }}>
          <div className="modal-title-wrap">
            <div className="modal-icon-chip" style={{ background: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
              <Crown size={22} color="#f59e0b" />
            </div>
            <div>
              <h3 className="modal-heading">Teacher Lecture Setup</h3>
              <p className="modal-subheading">
                Configure your host profile and teaching language for room <b>{roomCode}</b>
              </p>
            </div>
          </div>
          <button type="button" className="google-icon-btn close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="student-form">
          {error && (
            <div className="form-error-banner">
              <span>{error}</span>
            </div>
          )}

          {/* Teacher Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-name-input">
              <User size={14} color="#f59e0b" />
              <span>Teacher Name / Title</span>
              <span className="required-star">*</span>
            </label>
            <input
              id="teacher-name-input"
              type="text"
              className="google-input"
              placeholder="e.g. Prof. Ramanathan, Dr. Anitha"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              required
            />
          </div>

          {/* Spoken / Teaching Language */}
          <div className="form-group">
            <label className="form-label">
              <Mic size={14} color="var(--google-blue)" />
              <span>Language You Will Speak (Teacher Mic)</span>
              <span className="required-star">*</span>
            </label>
            <div className="lang-pill-grid">
              {SPOKEN_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-select-pill ${selectedSource === lang.code ? 'selected' : ''}`}
                  onClick={() => setSelectedSource(lang.code)}
                >
                  <span className="pill-flag">{lang.flag}</span>
                  <div className="pill-text">
                    <b>{lang.name}</b>
                    <small>{lang.native}</small>
                  </div>
                  {selectedSource === lang.code && <Check size={14} className="check-icon" />}
                </button>
              ))}
            </div>
          </div>

          {/* Default Student Target Language */}
          <div className="form-group">
            <label className="form-label">
              <Globe size={14} color="#34d399" />
              <span>Default Translation Target</span>
            </label>
            <div className="lang-pill-grid">
              {TARGET_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-select-pill ${selectedTarget === lang.code ? 'selected' : ''}`}
                  onClick={() => setSelectedTarget(lang.code)}
                >
                  <span className="pill-flag">{lang.flag}</span>
                  <div className="pill-text">
                    <b>{lang.name}</b>
                    <small>{lang.native}</small>
                  </div>
                  {selectedTarget === lang.code && <Check size={14} className="check-icon" />}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-action-row" style={{ marginTop: '20px' }}>
            <button type="button" className="google-pill-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="google-pill-btn primary"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
            >
              <Video size={15} style={{ marginRight: '6px' }} />
              <span>Start Broadcasting</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
