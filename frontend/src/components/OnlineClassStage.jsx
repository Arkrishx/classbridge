import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Users,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  Edit3,
  Globe,
  Sparkles,
  Layout,
  Crown,
  Headphones,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function OnlineClassStage({
  userRole = 'teacher',
  roomCode = 'EDU-02',
  studentName = '',
  studentRollNo = '',
  onOpenStudentRegister,
  onOpenAttendanceRoster,
  studentCount = 0,
  hasTeacher = false,
  isTeacherCameraOn = false,
  remoteVideoFrame = null,
  onBroadcastVideoFrame,
  onBroadcastVideoState,
  isRecording = false,
  onToggleRecording,
  segments = [],
  sourceLang = 'en',
  targetLang = 'ta',
  sourceLangName = 'English',
  targetLangName = 'Tamil',
  onSwapLanguages,
  isReadAloud = false,
  onToggleReadAloud,
  selectedDeviceId = 'default',
}) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState('split'); // 'split' | 'docked'

  const localVideoRef = useRef(null);
  const remoteCanvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const localStreamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const stageContainerRef = useRef(null);

  // Audio level meter
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // ==========================================
  // TEACHER: Camera & Mic Capture Setup
  // ==========================================
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: selectedDeviceId && selectedDeviceId !== 'default'
          ? { deviceId: { exact: selectedDeviceId } }
          : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      if (onBroadcastVideoState) {
        onBroadcastVideoState({ is_camera_on: true, is_screen_sharing: false });
      }

      // Setup audio level visualizer
      setupAudioMeter(stream);

      // Start capturing frames at 12 fps for broadcast
      startFrameBroadcasting();
    } catch (err) {
      console.warn("Could not start camera:", err);
      alert("Could not access camera or microphone. Please check browser permissions.");
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }

    setIsCameraActive(false);
    setIsScreenSharing(false);
    setAudioLevel(0);

    if (onBroadcastVideoState) {
      onBroadcastVideoState({ is_camera_on: false, is_screen_sharing: false });
    }
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      stopCamera();
      startCamera();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        localStreamRef.current = screenStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.play().catch(() => {});
        }
        setIsScreenSharing(true);
        setIsCameraActive(true);
        if (onBroadcastVideoState) {
          onBroadcastVideoState({ is_camera_on: true, is_screen_sharing: true });
        }

        // When user clicks "Stop Sharing" on browser prompt
        screenStream.getVideoTracks()[0].onended = () => {
          stopCamera();
          startCamera();
        };

        startFrameBroadcasting();
      } catch (err) {
        console.warn("Screen share cancelled:", err);
      }
    }
  };

  const setupAudioMeter = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (e) {
      console.warn("Audio meter init error:", e);
    }
  };

  const startFrameBroadcasting = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvasRef.current;
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    frameIntervalRef.current = setInterval(() => {
      if (!localVideoRef.current || !isCameraActive) return;
      try {
        ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        if (onBroadcastVideoFrame) {
          onBroadcastVideoFrame(dataUrl);
        }
      } catch (e) {
        // Video might not be ready yet
      }
    }, 85); // ~12 fps
  };

  // Cleanup teacher stream on unmount or role change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [userRole]);

  // ==========================================
  // STUDENT: Render Remote Video Frames
  // ==========================================
  useEffect(() => {
    if (userRole === 'student' && remoteVideoFrame && remoteCanvasRef.current) {
      const canvas = remoteCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = remoteVideoFrame;
    }
  }, [userRole, remoteVideoFrame]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!isFullscreen) {
      if (stageContainerRef.current.requestFullscreen) {
        stageContainerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const latestSegment = segments.length > 0 ? segments[segments.length - 1] : null;

  return (
    <div
      ref={stageContainerRef}
      className={`online-class-stage ${isFullscreen ? 'stage-fullscreen' : ''} layout-${layoutMode}`}
    >
      {/* Main Video Viewport (Google Meet Style) */}
      <div className="video-viewport">
        {/* Top Floating Status Pill */}
        <div className="video-top-overlay">
          <div className="video-meta-tag">
            <span className="live-dot pulse-animation" />
            <b>ONLINE CLASS</b>
            <span className="meta-divider">•</span>
            <span>Room: {roomCode}</span>
          </div>

          {userRole === 'teacher' ? (
            <div className="teacher-live-badge">
              <Crown size={13} color="#f59e0b" />
              <span>Host (Broadcasting)</span>
              {isCameraActive && (
                <div className="audio-meter-bar" title="Live Mic Level">
                  <div className="audio-meter-fill" style={{ width: `${audioLevel}%` }} />
                </div>
              )}
            </div>
          ) : (
            <div className="student-profile-chip" onClick={onOpenStudentRegister} title="Click to edit your student profile">
              <Headphones size={13} color="var(--google-blue)" />
              <span>
                {studentName ? (
                  <><b>{studentName}</b> ({studentRollNo || 'No Roll'})</>
                ) : (
                  <span style={{ color: '#fbbf24' }}>Enter Name & Roll No</span>
                )}
              </span>
              <Edit3 size={12} color="var(--text-dim)" />
            </div>
          )}
        </div>

        {/* Video Surface */}
        <div className="video-surface-container">
          {userRole === 'teacher' ? (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`main-video-feed ${isCameraActive ? 'active' : 'hidden'}`}
              />
              {!isCameraActive && (
                <div className="camera-placeholder">
                  <div className="placeholder-avatar teacher-avatar">
                    <Crown size={40} color="#f59e0b" />
                  </div>
                  <div className="placeholder-title">Your Camera is Off</div>
                  <div className="placeholder-sub">Click "Start Camera" below to begin broadcasting video to students</div>
                  <button
                    type="button"
                    className="google-pill-btn primary"
                    onClick={startCamera}
                    style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Video size={16} />
                    <span>Start Camera Broadcast</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Student View */
            <>
              <canvas
                ref={remoteCanvasRef}
                className={`main-video-feed ${isTeacherCameraOn || remoteVideoFrame ? 'active' : 'hidden'}`}
              />
              {!(isTeacherCameraOn || remoteVideoFrame) && (
                <div className="camera-placeholder">
                  <div className="placeholder-avatar">
                    <Crown size={40} color="var(--google-blue)" />
                  </div>
                  <div className="placeholder-title">
                    {hasTeacher ? "Teacher's Camera is Paused" : "Teacher is Currently Offline"}
                  </div>
                  <div className="placeholder-sub">
                    {hasTeacher
                      ? "Listening to live teacher audio & subtitles. Video feed will resume when camera is turned on."
                      : `Waiting for teacher to connect to room ${roomCode}...`}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Subtitles Overlay Bar (Floating at bottom of video) */}
          {latestSegment && (
            <div className="video-caption-overlay">
              <div className="overlay-caption-source">
                {latestSegment.text_source || latestSegment.text_en}
              </div>
              <div className="overlay-caption-target">
                {(latestSegment.translations && latestSegment.translations[targetLang]) ||
                  latestSegment.text_vernacular ||
                  latestSegment.text_source}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating Control Dock (Google Meet Toolbar) */}
        <div className="video-control-dock">
          {userRole === 'teacher' ? (
            <>
              {/* Mic Toggle */}
              <button
                type="button"
                className={`meet-dock-btn ${isMicMuted ? 'danger' : 'active'}`}
                onClick={toggleMic}
                title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Camera Toggle */}
              <button
                type="button"
                className={`meet-dock-btn ${!isCameraActive ? 'danger' : 'active'}`}
                onClick={toggleCamera}
                title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
              >
                {!isCameraActive ? <VideoOff size={18} /> : <Video size={18} />}
              </button>

              {/* Screen Share */}
              <button
                type="button"
                className={`meet-dock-btn ${isScreenSharing ? 'warning' : 'secondary'}`}
                onClick={toggleScreenShare}
                title={isScreenSharing ? "Stop Screen Share" : "Share Your Screen"}
              >
                {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              </button>

              <div className="dock-divider" />

              {/* Attendance Roster Drawer Toggle */}
              <button
                type="button"
                className="meet-dock-btn secondary roster-btn"
                onClick={onOpenAttendanceRoster}
                title="View Connected Students Attendance Roster"
              >
                <Users size={17} />
                <span className="dock-pill-badge">{studentCount}</span>
              </button>
            </>
          ) : (
            /* Student Controls */
            <>
              <button
                type="button"
                className={`meet-dock-btn ${isReadAloud ? 'active' : 'secondary'}`}
                onClick={onToggleReadAloud}
                title={isReadAloud ? "Turn Off Read-Aloud Audio" : "Turn On Real-Time Speech Synthesis (TTS)"}
              >
                {isReadAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                className="meet-dock-btn secondary"
                onClick={onOpenStudentRegister}
                title="Edit Your Name and Roll Number"
              >
                <Edit3 size={17} />
              </button>
            </>
          )}

          {/* Layout Switcher */}
          <button
            type="button"
            className="meet-dock-btn secondary"
            onClick={() => setLayoutMode(layoutMode === 'split' ? 'docked' : 'split')}
            title="Toggle Layout (Side-by-side Captions vs Docked)"
          >
            <Layout size={17} />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            className="meet-dock-btn secondary"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>

      {/* Synchronized Side Dual Captions & Chat Stage */}
      {layoutMode === 'split' && (
        <div className="online-caption-sidebar">
          <div className="sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={15} color="var(--google-blue)" />
              <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
                Live Dual Subtitles
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {sourceLangName} ➔ {targetLangName}
            </div>
          </div>

          <div className="sidebar-transcript-list">
            {segments.length === 0 ? (
              <div className="empty-transcript-state">
                <Sparkles size={24} color="var(--google-blue)" style={{ opacity: 0.5, marginBottom: '6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Awaiting Lecture Speech
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {userRole === 'teacher'
                    ? "Speak into your microphone to generate real-time multi-lingual subtitles"
                    : "Live captions will appear here as the teacher speaks"}
                </div>
              </div>
            ) : (
              segments.slice(-15).map((seg) => {
                const vern = (seg.translations && seg.translations[targetLang]) || seg.text_vernacular || seg.text_source;
                return (
                  <div key={seg.id} className="online-transcript-bubble">
                    <div className="bubble-source">{seg.text_source || seg.text_en}</div>
                    <div className="bubble-vernacular">{vern}</div>
                    <div className="bubble-time">{seg.timestamp || 'Live'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
