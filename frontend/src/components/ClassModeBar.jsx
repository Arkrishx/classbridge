import React, { useState } from 'react';
import {
  Radio,
  Globe,
  Laptop,
  Crown,
  Headphones,
  Users,
  Copy,
  Check,
  ExternalLink,
  Settings2,
  Sparkles,
  Wifi,
  Video
} from 'lucide-react';

export default function ClassModeBar({
  classMode = 'realtime_classroom',
  onChangeClassMode,
  userRole = 'teacher',
  onChangeUserRole,
  roomCode = 'EDU-02',
  studentCount = 0,
  hasTeacher = false,
  isCameraActive = false,
  isRoleLocked = false,
  onOpenAttendanceRoster,
  onOpenClassroomModal,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const isTeacherOnline = userRole === 'teacher' || Boolean(hasTeacher);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const studentInviteUrl = `${currentOrigin}?room=${encodeURIComponent(roomCode)}&mode=${classMode === 'online_classroom' ? 'online' : 'offline'}&role=student&lock_role=true`;

  const handleCopyStudentLink = async (e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(studentInviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('Could not copy invite link:', err);
    }
  };

  return (
    <div className="class-mode-bar-container">
      <div className="class-mode-bar">
        {/* Left: Primary Class Mode Tabs (The 2 Main Options) */}
        <div className="class-mode-tabs" role="tablist" aria-label="Classroom Mode Selection">
          {/* 1. Real-Time [Offline] Class */}
          <button
            type="button"
            role="tab"
            aria-selected={classMode === 'realtime_classroom'}
            className={`class-mode-tab ${classMode === 'realtime_classroom' ? 'active offline-mode' : ''}`}
            onClick={() => onChangeClassMode && onChangeClassMode('realtime_classroom')}
            title="Real-Time [Offline] Class: Single teacher mic broadcast to all student devices via WebSockets"
          >
            <div className="tab-icon-box offline">
              <Radio size={16} />
            </div>
            <div className="tab-text-box">
              <span className="tab-title">Real-Time [Offline] Class</span>
              <span className="tab-title-short">Offline</span>
              <span className="tab-desc">Single Teacher Mic Broadcast</span>
            </div>
            {classMode === 'realtime_classroom' && (
              <span className="tab-active-dot" title="Active Mode" />
            )}
          </button>

          {/* 2. Online Class */}
          <button
            type="button"
            role="tab"
            aria-selected={classMode === 'online_classroom'}
            className={`class-mode-tab ${classMode === 'online_classroom' ? 'active online-mode' : ''}`}
            onClick={() => onChangeClassMode && onChangeClassMode('online_classroom')}
            title="Online Class: Remote video & audio classroom with synchronized multi-lingual live subtitles"
          >
            <div className="tab-icon-box online">
              <Globe size={16} />
            </div>
            <div className="tab-text-box">
              <span className="tab-title">Online Class</span>
              <span className="tab-title-short">Online</span>
              <span className="tab-desc">Remote Video & Captions</span>
            </div>
            {classMode === 'online_classroom' && (
              <span className="tab-active-dot" title="Active Mode" />
            )}
          </button>

          {/* 3. Solo Studio (Compact) */}
          <button
            type="button"
            role="tab"
            aria-selected={classMode === 'solo'}
            className={`class-mode-tab solo-tab ${classMode === 'solo' ? 'active solo-mode' : ''}`}
            onClick={() => onChangeClassMode && onChangeClassMode('solo')}
            title="Solo Studio: Single-user workstation transcription & study guide generation"
          >
            <div className="tab-icon-box solo">
              <Laptop size={14} />
            </div>
            <div className="tab-text-box">
              <span className="tab-title solo-title">Solo Studio</span>
              <span className="tab-title-short">Solo</span>
            </div>
          </button>
        </div>

        {/* Right: Active Mode Context Controls (Role Switcher & Room Info) */}
        {classMode === 'realtime_classroom' && (
          <div className="class-context-deck">
            {/* Direct Role Toggle (Teacher vs Student) */}
            {isRoleLocked ? (
              <div className="role-switch-pills role-locked-deck" title="Student role is locked for this invite link">
                <div className="role-pill active-student" style={{ cursor: 'default', background: 'rgba(66, 133, 244, 0.18)', borderColor: 'rgba(66, 133, 244, 0.4)' }}>
                  <Headphones size={13} color="var(--google-blue)" />
                  <span style={{ fontWeight: 700 }}>🔒 Student (Locked)</span>
                </div>
              </div>
            ) : (
              <div className="role-switch-pills" title="Toggle your classroom role">
                <button
                  type="button"
                  className={`role-pill ${userRole === 'teacher' ? 'active-teacher' : ''}`}
                  onClick={() => onChangeUserRole && onChangeUserRole('teacher')}
                  title="Teacher: Broadcast your microphone to the entire classroom"
                >
                  <Crown size={13} />
                  <span>Teacher (Host)</span>
                </button>

                <button
                  type="button"
                  className={`role-pill ${userRole === 'student' ? 'active-student' : ''}`}
                  onClick={() => onChangeUserRole && onChangeUserRole('student')}
                  title="Student: Listen to teacher mic with locked student mic to prevent room feedback"
                >
                  <Headphones size={13} />
                  <span>Student (Listener)</span>
                </button>
              </div>
            )}

            {/* Room Code & Connected Students Badge */}
            <button
              type="button"
              className="room-info-pill"
              onClick={onOpenClassroomModal}
              title={`Room: ${roomCode}. Click to change room code or manage settings.`}
            >
              <span className="room-label">Room:</span>
              <span className="room-code-tag">{roomCode}</span>
              <span className="room-divider">•</span>
              <Users size={12} color="var(--google-blue)" />
              <span className="room-count">
                <b>{studentCount}</b> {studentCount === 1 ? 'Student' : 'Students'} Connected
              </span>
              <span className="room-divider">•</span>
              {isTeacherOnline ? (
                <span className="teacher-live-indicator online" title="Teacher microphone is active and broadcasting">
                  🟢 {userRole === 'teacher' ? 'Teacher Online (You)' : 'Teacher Online'}
                </span>
              ) : (
                <span className="teacher-live-indicator offline" title="Teacher has not connected to this room yet">
                  ⚪ Teacher Offline
                </span>
              )}
            </button>

            {/* 1-Click Share Student Link Button */}
            <button
              type="button"
              className={`copy-student-link-btn ${copiedLink ? 'copied' : ''}`}
              onClick={handleCopyStudentLink}
              title="Copy shareable link for students to join on their laptops or mobile phones"
            >
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Student Link'}</span>
            </button>
          </div>
        )}

        {/* When in Online Class Mode */}
        {classMode === 'online_classroom' && (
          <div className="class-context-deck online-deck">
            {/* Direct Role Toggle (Teacher vs Student) */}
            {isRoleLocked ? (
              <div className="role-switch-pills role-locked-deck" title="Student role is locked for this invite link">
                <div className="role-pill active-student" style={{ cursor: 'default', background: 'rgba(66, 133, 244, 0.18)', borderColor: 'rgba(66, 133, 244, 0.4)' }}>
                  <Headphones size={13} color="var(--google-blue)" />
                  <span style={{ fontWeight: 700 }}>🔒 Student (Locked)</span>
                </div>
              </div>
            ) : (
              <div className="role-switch-pills" title="Toggle your online classroom role">
                <button
                  type="button"
                  className={`role-pill ${userRole === 'teacher' ? 'active-teacher' : ''}`}
                  onClick={() => onChangeUserRole && onChangeUserRole('teacher')}
                  title="Teacher: Broadcast your camera & microphone to the entire online classroom"
                >
                  <Crown size={13} />
                  <span>Teacher (Host)</span>
                </button>

                <button
                  type="button"
                  className={`role-pill ${userRole === 'student' ? 'active-student' : ''}`}
                  onClick={() => onChangeUserRole && onChangeUserRole('student')}
                  title="Student: View teacher camera stream & synchronized multi-lingual subtitles"
                >
                  <Headphones size={13} />
                  <span>Student (Listener)</span>
                </button>
              </div>
            )}

            {/* Room Code & Connected Students Badge */}
            <button
              type="button"
              className="room-info-pill"
              onClick={onOpenClassroomModal}
              title={`Room: ${roomCode}. Click to change room code or settings.`}
            >
              <span className="room-label">Room:</span>
              <span className="room-code-tag">{roomCode}</span>
              <span className="room-divider">•</span>
              <Users size={12} color="var(--google-blue)" />
              <span className="room-count">
                <b>{studentCount}</b> {studentCount === 1 ? 'Student' : 'Students'}
              </span>
              <span className="room-divider">•</span>
              {isTeacherOnline ? (
                <span className="teacher-live-indicator online" title="Teacher is broadcasting online">
                  🟢 {userRole === 'teacher' ? 'Teacher Live (You)' : 'Teacher Live'}
                </span>
              ) : (
                <span className="teacher-live-indicator offline" title="Teacher has not started class yet">
                  ⚪ Teacher Offline
                </span>
              )}
              {isCameraActive && (
                <>
                  <span className="room-divider">•</span>
                  <span className="camera-active-tag">
                    <Video size={11} color="var(--google-green)" />
                    Camera Live
                  </span>
                </>
              )}
            </button>

            {/* Teacher: Live Attendance Roster Button */}
            {userRole === 'teacher' && onOpenAttendanceRoster && (
              <button
                type="button"
                className="google-pill-btn secondary"
                onClick={onOpenAttendanceRoster}
                style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="View registered student attendance roster (Roll Numbers & Names)"
              >
                <Users size={13} color="var(--google-blue)" />
                <span>Attendance ({studentCount})</span>
              </button>
            )}

            {/* 1-Click Share Student Link Button */}
            <button
              type="button"
              className={`copy-student-link-btn ${copiedLink ? 'copied' : ''}`}
              onClick={handleCopyStudentLink}
              title="Copy shareable link for students to join online class"
            >
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Student Link'}</span>
            </button>
          </div>
        )}

        {/* When in Solo Mode */}
        {classMode === 'solo' && (
          <div className="class-context-deck solo-deck">
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Solo Workstation Mode • Personal STEM Transcription
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
