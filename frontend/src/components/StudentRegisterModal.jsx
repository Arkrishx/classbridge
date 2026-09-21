import React, { useState, useEffect } from 'react';
import { UserCheck, Hash, User, Globe, X, Sparkles, AlertCircle } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
];

export default function StudentRegisterModal({
  isOpen,
  onClose,
  initialName = '',
  initialRollNo = '',
  targetLang = 'ta',
  onChangeTargetLang,
  roomCode = 'EDU-02',
  onSubmit,
  isEditing = false,
}) {
  const [name, setName] = useState(initialName);
  const [rollNo, setRollNo] = useState(initialRollNo);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialName || localStorage.getItem('classbridge_student_name') || '');
    setRollNo(initialRollNo || localStorage.getItem('classbridge_student_roll') || '');
    setError('');
  }, [isOpen, initialName, initialRollNo]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanRoll = rollNo.trim().toUpperCase();

    if (!cleanName) {
      setError('Please enter your full name');
      return;
    }
    if (!cleanRoll) {
      setError('Please enter your roll number or register number');
      return;
    }

    try {
      localStorage.setItem('classbridge_student_name', cleanName);
      localStorage.setItem('classbridge_student_roll', cleanRoll);
    } catch (err) {}

    setError('');
    if (onSubmit) {
      onSubmit({ name: cleanName, roll_no: cleanRoll, target_lang: targetLang });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={isEditing ? onClose : undefined}>
      <div
        className="modal-card student-register-modal"
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
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(251, 188, 4, 0.2))',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} color="var(--google-blue)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditing ? 'Update Student Profile' : 'Online Class Registration'}
                <span className="google-tag-pill" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Room {roomCode}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Required for teacher attendance & classroom reference
              </div>
            </div>
          </div>
          {isEditing && (
            <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }} title="Close">
              <X size={17} />
            </button>
          )}
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
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Roll Number Input */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
              Roll Number / Register Number *
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--google-blue)' }}>
                <Hash size={16} />
              </div>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                placeholder="e.g. 22CS104 or CS-042"
                autoFocus={!isEditing}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '14px',
                  letterSpacing: '0.04em',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Used by teacher for official attendance grading
            </span>
          </div>

          {/* Student Full Name Input */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--google-blue)' }}>
                <User size={16} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arun Kumar"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Subtitle Translation Language Preference */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
              Preferred Live Subtitle Language
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onChangeTargetLang && onChangeTargetLang(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: targetLang === lang.code ? '2px solid var(--google-blue)' : '1px solid var(--border-subtle)',
                    background: targetLang === lang.code ? 'rgba(66, 133, 244, 0.12)' : 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: targetLang === lang.code ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{lang.flag}</span>
                  <span>{lang.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            {isEditing && (
              <button
                type="button"
                className="google-pill-btn secondary"
                onClick={onClose}
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="google-pill-btn primary"
              style={{ padding: '8px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Sparkles size={14} />
              <span>{isEditing ? 'Save Changes' : 'Enter Online Classroom'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
