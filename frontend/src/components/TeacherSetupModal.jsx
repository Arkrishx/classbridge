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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card teacher-setup-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%' }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={20} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Teacher Lecture Setup
                <span className="google-tag-pill" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Room {roomCode}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Configure your host profile and lecture language before starting
              </div>
            </div>
          </div>
          <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }} title="Close">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#f87171',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{error}</span>
            </div>
          )}

          {/* Teacher Name */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <User size={14} color="#f59e0b" />
              <span>Teacher Name / Academic Title *</span>
            </label>
            <input
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
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Spoken / Teaching Language */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Mic size={14} color="var(--google-blue)" />
              <span>Teaching Language You Will Speak *</span>
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
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Globe size={14} color="#34d399" />
              <span>Default Translation Target for Students</span>
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

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="google-pill-btn secondary"
              onClick={onClose}
              style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '20px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="google-pill-btn primary"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 20px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
              }}
            >
              <Video size={16} />
              <span>Start Online Lecture</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
