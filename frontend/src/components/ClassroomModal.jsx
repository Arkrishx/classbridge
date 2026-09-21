import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Users,
  Crown,
  Headphones,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Wifi,
  WifiOff,
  Volume2,
  Mic,
  MicOff,
  Laptop,
  Smartphone,
  Globe,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

export default function ClassroomModal({
  isOpen,
  onClose,
  classMode = 'realtime_classroom',
  onChangeClassMode,
  userRole = 'student',
  onChangeUserRole,
  roomCode = 'EDU-02',
  onChangeRoomCode,
  studentCount = 0,
  hasTeacher = false,
  connectionStatus = 'connected',
  onClearRoom,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [tempRoomInput, setTempRoomInput] = useState(roomCode);
  const [copiedTeacherLink, setCopiedTeacherLink] = useState(false);

  useEffect(() => {
    setTempRoomInput(roomCode);
  }, [roomCode, isOpen]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const studentInviteUrl = `${currentOrigin}?room=${encodeURIComponent(tempRoomInput.trim().toUpperCase() || 'EDU-02')}&role=student`;
  const teacherInviteUrl = `${currentOrigin}?room=${encodeURIComponent(tempRoomInput.trim().toUpperCase() || 'EDU-02')}&role=teacher`;

  const handleCopyStudentLink = async () => {
    try {
      await navigator.clipboard.writeText(studentInviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn("Could not copy link:", e);
    }
  };

  const handleCopyTeacherLink = async () => {
    try {
      await navigator.clipboard.writeText(teacherInviteUrl);
      setCopiedTeacherLink(true);
      setTimeout(() => setCopiedTeacherLink(false), 2500);
    } catch (e) {
      console.warn("Could not copy link:", e);
    }
  };

  const handleApplyRoomCode = (e) => {
    if (e) e.preventDefault();
    const clean = tempRoomInput.trim().toUpperCase() || 'EDU-02';
    if (onChangeRoomCode) {
      onChangeRoomCode(clean);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card classroom-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        {/* Modal Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={22} color="var(--google-blue)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-main)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Classroom Network Hub
                <span className="google-tag-pill" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  EDU-02
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Single Teacher Mic Broadcast to all student devices via WebSockets
              </div>
            </div>
          </div>
          <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }} title="Close">
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Classroom Mode Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              1. Class Operating Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {/* Option A: Real-Time [Offline] Class */}
              <div
                onClick={() => onChangeClassMode && onChangeClassMode('realtime_classroom')}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: classMode === 'realtime_classroom' ? '2px solid var(--google-blue)' : '1px solid var(--border-subtle)',
                  background: classMode === 'realtime_classroom' ? 'rgba(66, 133, 244, 0.08)' : 'var(--bg-card)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                    <Radio size={16} color="var(--google-blue)" />
                    Real-Time [Offline]
                  </div>
                  <span style={{ fontSize: '10px', background: 'rgba(52, 168, 83, 0.2)', color: 'var(--google-green)', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Teacher mic broadcast to all student screens in the lecture room. Zero audio feedback.
                </div>
              </div>

              {/* Option B: Online Class (Phase 2) */}
              <div
                onClick={() => {
                  if (onChangeClassMode) onChangeClassMode('online_classroom');
                }}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: classMode === 'online_classroom' ? '2px solid var(--google-yellow)' : '1px solid var(--border-subtle)',
                  background: classMode === 'online_classroom' ? 'rgba(251, 188, 4, 0.08)' : 'var(--bg-card)',
                  opacity: 0.95,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                    <Globe size={16} color="var(--google-yellow)" />
                    Online Class
                  </div>
                  <span style={{ fontSize: '10px', background: 'rgba(251, 188, 4, 0.2)', color: '#f59e0b', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                    NEXT
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Remote interactive video/audio lecture stream with synchronized multi-lingual live captions.
                </div>
              </div>

              {/* Option C: Solo Studio */}
              <div
                onClick={() => onChangeClassMode && onChangeClassMode('solo')}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: classMode === 'solo' ? '2px solid var(--google-green)' : '1px solid var(--border-subtle)',
                  background: classMode === 'solo' ? 'rgba(52, 168, 83, 0.08)' : 'var(--bg-card)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                    <Laptop size={16} color="var(--google-green)" />
                    Solo Studio
                  </div>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Single workstation transcription, study guide generation, and personal AI tutoring.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Role Selection (Teacher vs Student) */}
          {classMode !== 'solo' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                2. Your Role in Room <span style={{ color: 'var(--google-blue)' }}>{roomCode}</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Teacher Card */}
                <div
                  onClick={() => onChangeUserRole && onChangeUserRole('teacher')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: userRole === 'teacher' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                    background: userRole === 'teacher' ? 'rgba(245, 158, 11, 0.09)' : 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: userRole === 'teacher' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Crown size={18} color={userRole === 'teacher' ? '#ffffff' : '#f59e0b'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Teacher / Host
                      {userRole === 'teacher' && <Check size={14} color="#f59e0b" />}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Controls microphone, speaks to the classroom. Captions broadcast to all students.
                    </div>
                  </div>
                </div>

                {/* Student Card */}
                <div
                  onClick={() => onChangeUserRole && onChangeUserRole('student')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: userRole === 'student' ? '2px solid var(--google-blue)' : '1px solid var(--border-subtle)',
                    background: userRole === 'student' ? 'rgba(66, 133, 244, 0.09)' : 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: userRole === 'student' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Headphones size={18} color={userRole === 'student' ? '#ffffff' : 'var(--google-blue)'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Student / Listener
                      {userRole === 'student' && <Check size={14} color="var(--google-blue)" />}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Mic locked to prevent room noise. Receives live captions and selects vernacular language.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Room Code & Student Invite Link */}
          {classMode !== 'solo' && (
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="var(--google-blue)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Classroom Room & Broadcast Status
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    👥 <b>{studentCount}</b> Student{studentCount === 1 ? '' : 's'} Connected
                  </span>
                  <span style={{ fontSize: '11px', color: hasTeacher ? 'var(--google-green)' : 'var(--text-dim)' }}>
                    • {hasTeacher ? '👑 Teacher Live' : '⚪ Teacher Offline'}
                  </span>
                </div>
              </div>

              {/* Room Code Input Form */}
              <form onSubmit={handleApplyRoomCode} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={tempRoomInput}
                    onChange={(e) => setTempRoomInput(e.target.value.toUpperCase())}
                    placeholder="Enter Room Code (e.g. EDU-02)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="google-pill-btn"
                  style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--google-blue)', color: '#ffffff', border: 'none' }}
                >
                  Join / Switch Room
                </button>
              </form>

              {/* Quick 1-Click Shareable Link */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {studentInviteUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyStudentLink}
                  className="google-pill-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    flexShrink: 0,
                    background: copiedLink ? 'rgba(52, 168, 83, 0.15)' : 'rgba(66, 133, 244, 0.12)',
                    borderColor: copiedLink ? 'rgba(52, 168, 83, 0.4)' : 'rgba(66, 133, 244, 0.3)',
                    color: copiedLink ? 'var(--google-green)' : 'var(--google-blue)',
                  }}
                >
                  {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Copied Student Link!' : 'Copy Student Link'}</span>
                </button>
              </div>

              {/* Teacher Share Link if Host */}
              {userRole === 'teacher' && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyTeacherLink}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    {copiedTeacherLink ? 'Copied Teacher URL!' : 'Copy Teacher URL'}
                  </button>
                  {onClearRoom && (
                    <button
                      type="button"
                      onClick={onClearRoom}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--google-red)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '12px'
                      }}
                      title="Clear room subtitles for everyone"
                    >
                      <RotateCcw size={11} />
                      Reset Room Subtitles
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Live Architecture Diagram & Protocol */}
          <div style={{ padding: '12px 14px', background: 'rgba(66, 133, 244, 0.04)', borderRadius: '12px', border: '1px solid rgba(66, 133, 244, 0.15)' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--google-blue)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} />
              How Offline Classroom Broadcasting Solves Problem EDU-02:
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              • <b>Single Mic Capture</b>: The lecturer speaks once into their Bluetooth headset or podium mic.<br />
              • <b>Real-Time Fan-Out</b>: The server transcribes speech once and fans out translations to Tamil, Malayalam, Hindi, and English.<br />
              • <b>Zero Audio Feedback</b>: Student microphones remain locked so there is no acoustic echo in the lecture hall.<br />
              • <b>Independent Vernacular</b>: Each student chooses their own subtitle language without affecting peers.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="google-status-dot" style={{ background: 'var(--google-green)' }} />
            Connected to Room <b>{roomCode}</b> as <b>{userRole === 'teacher' ? 'Teacher' : 'Student'}</b>
          </div>
          <button
            className="google-pill-btn primary"
            onClick={onClose}
            type="button"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Enter Classroom
          </button>
        </div>
      </div>
    </div>
  );
}
