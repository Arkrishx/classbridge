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
  AlertCircle,
  Hand,
  MessageSquare,
  Download,
  FileText,
  Send,
  Circle,
  Tag,
  Megaphone,
  Settings,
  X,
  Clock,
  ArrowRight,
  PhoneOff
} from 'lucide-react';
import { exportCaptionsAsTxt, exportCaptionsAsPdf } from '../utils/captionExport';

export default function OnlineClassStage({
  userRole = 'teacher',
  teacherName = 'Teacher',
  onOpenTeacherSetup,
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
  handRaises = [],
  onToggleHandRaise,
  onLowerAllHands,
  qaComments = [],
  onSendQaComment,
  onBroadcastKeyword,
  onEndSession,
}) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const isCameraActiveRef = useRef(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState('split'); // 'split' | 'docked'
  const [sidebarTab, setSidebarTab] = useState('subtitles'); // 'subtitles' | 'qa' | 'hands'

  // Teacher Keyword Broadcast Input State
  const [isKeywordDrawerOpen, setIsKeywordDrawerOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  // Q&A Comment Input State
  const [qaInput, setQaInput] = useState('');
  const qaListRef = useRef(null);

  // Session Recording State (Browser MediaRecorder)
  const [isSessionRecording, setIsSessionRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const recordingStreamRef = useRef(null);

  // Teacher Camera & Screen Media Refs
  const localVideoRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const localStreamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const stageContainerRef = useRef(null);

  // Audio level meter
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Hand raise state for student
  const isMyHandRaised = handRaises.some(
    (h) => (h.name && h.name === studentName) || (h.roll_no && h.roll_no === studentRollNo)
  );

  // ==========================================
  // TEACHER: Camera & Mic Capture Setup
  // ==========================================
  const startCamera = async () => {
    try {
      let stream = null;
      try {
        const constraints = {
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 360, max: 720 },
            facingMode: 'user'
          },
          audio: selectedDeviceId && selectedDeviceId !== 'default'
            ? { deviceId: { exact: selectedDeviceId } }
            : true
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (audioErr) {
        console.warn("Could not acquire combined video+audio, falling back to video-only:", audioErr);
        // Fallback to video-only stream so camera ALWAYS starts even if mic is busy or locked
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 360, max: 720 },
            facingMode: 'user'
          }
        });
      }

      localStreamRef.current = stream;
      isCameraActiveRef.current = true;
      setIsCameraActive(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(() => {});
        };
        localVideoRef.current.play().catch(() => {});
      }

      if (onBroadcastVideoState) {
        onBroadcastVideoState({ is_camera_on: true, is_screen_sharing: false });
      }

      // Setup audio level visualizer if audio track exists
      if (stream.getAudioTracks().length > 0) {
        setupAudioMeter(stream);
      }

      // Start capturing frames for broadcast
      startFrameBroadcasting();
    } catch (err) {
      console.warn("Could not start camera:", err);
      setIsCameraActive(false);
      isCameraActiveRef.current = false;
    }
  };

  const stopCamera = () => {
    isCameraActiveRef.current = false;
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
    if (isCameraActiveRef.current) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
    if (onToggleRecording) {
      onToggleRecording();
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
        isCameraActiveRef.current = true;
        setIsCameraActive(true);
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(() => {});
          };
          localVideoRef.current.play().catch(() => {});
        }

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
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');

    frameIntervalRef.current = setInterval(() => {
      const video = localVideoRef.current;
      if (!video || !isCameraActiveRef.current) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        if (onBroadcastVideoFrame) {
          onBroadcastVideoFrame(dataUrl);
        }
      } catch (e) {
        // Video might not be ready yet
      }
    }, 90); // ~11 fps
  };

  // Auto-start camera when entering as teacher, cleanup on unmount
  useEffect(() => {
    if (userRole === 'teacher') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [userRole]);

  // ==========================================
  // SESSION RECORDING (MediaRecorder)
  // ==========================================
  const startSessionRecording = async () => {
    let streamToRecord = localStreamRef.current;
    let isDisplayStream = false;

    if (!streamToRecord) {
      try {
        // Fallback to capture browser screen / window / tab so both teacher and students can record lectures
        streamToRecord = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        isDisplayStream = true;
      } catch (err) {
        console.warn("Screen recording prompt cancelled or failed:", err);
        return;
      }
    }

    try {
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(streamToRecord, { mimeType });
      mediaRecorderRef.current = recorder;
      recordingStreamRef.current = isDisplayStream ? streamToRecord : null;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = `ClassBridge_Lecture_${roomCode}_${dateStr}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach((t) => t.stop());
          recordingStreamRef.current = null;
        }
      };

      if (isDisplayStream && streamToRecord.getVideoTracks()[0]) {
        streamToRecord.getVideoTracks()[0].onended = () => {
          stopSessionRecording();
        };
      }

      recorder.start(1000); // 1-second chunks
      setIsSessionRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Session recording failed:", err);
      alert("Session recording is not supported on this browser or stream configuration.");
    }
  };

  const stopSessionRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsSessionRecording(false);
  };

  const toggleSessionRecording = () => {
    if (isSessionRecording) {
      stopSessionRecording();
    } else {
      startSessionRecording();
    }
  };

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // TEACHER KEYWORD BROADCAST
  // ==========================================
  const handleKeywordSubmit = (e) => {
    e.preventDefault();
    const clean = keywordInput.trim();
    if (!clean) return;

    if (onBroadcastKeyword) {
      onBroadcastKeyword(clean);
    }
    setKeywordInput('');
    setIsKeywordDrawerOpen(false);
  };

  // ==========================================
  // Q&A COMMENT SUBMISSION
  // ==========================================
  const handleQaSubmit = (e) => {
    e.preventDefault();
    const clean = qaInput.trim();
    if (!clean) return;

    if (userRole === 'student' && (!studentName || !studentRollNo)) {
      if (onOpenStudentRegister) {
        onOpenStudentRegister();
      }
      return;
    }

    if (onSendQaComment) {
      onSendQaComment(clean);
    }
    setQaInput('');

    setTimeout(() => {
      if (qaListRef.current) {
        qaListRef.current.scrollTop = qaListRef.current.scrollHeight;
      }
    }, 80);
  };

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
        {/* Top Floating Status Pill & Meta Badges */}
        <div className="video-top-overlay">
          <div className="video-meta-tag">
            <span className="live-dot pulse-animation" />
            <b>ONLINE CLASS</b>
            <span className="meta-divider">•</span>
            <span>Room: {roomCode}</span>
          </div>

          {/* Recording Timer Indicator */}
          {isSessionRecording && (
            <div className="recording-indicator-pill pulse-animation">
              <span className="rec-dot" />
              <span>REC {formatRecordingTime(recordingDuration)}</span>
            </div>
          )}

          {userRole === 'teacher' ? (
            <div className="teacher-live-badge" onClick={onOpenTeacherSetup} title="Click to edit your Host profile or Teaching Language">
              <Crown size={13} color="#f59e0b" />
              <span><b>{teacherName || 'Host'}</b> (Host)</span>
              <Settings size={12} color="var(--text-dim)" style={{ marginLeft: '4px' }} />
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
                style={{
                  ...(!isCameraActive ? { position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' } : {}),
                  transform: isCameraActive && isFlipHorizontal && !isScreenSharing ? 'scaleX(-1)' : 'none'
                }}
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
              {remoteVideoFrame ? (
                <img
                  src={remoteVideoFrame}
                  alt="Teacher Live Broadcast"
                  className="main-video-feed"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : isTeacherCameraOn ? (
                <div className="camera-placeholder">
                  <div className="placeholder-avatar pulse-animation">
                    <Video size={40} color="var(--google-blue)" />
                  </div>
                  <div className="placeholder-title">Connecting to Teacher's Video Stream...</div>
                  <div className="placeholder-sub">Receiving live lecture broadcast from {teacherName} in room {roomCode}.</div>
                </div>
              ) : (
                <div className="camera-placeholder">
                  <div className="placeholder-avatar">
                    <Crown size={40} color="var(--google-blue)" />
                  </div>
                  <div className="placeholder-title">
                    {hasTeacher ? `${teacherName}'s Camera is Paused` : "Teacher is Currently Offline"}
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
            <div className={`video-caption-overlay ${latestSegment.is_keyword ? 'keyword-overlay-highlight' : ''}`}>
              {latestSegment.is_keyword && (
                <div className="keyword-badge-tag">
                  <Tag size={12} />
                  <span>KEYWORD CONCEPT</span>
                </div>
              )}
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

          {/* Teacher Keyword Broadcaster Floating Drawer */}
          {isKeywordDrawerOpen && userRole === 'teacher' && (
            <div className="keyword-broadcast-drawer">
              <div className="keyword-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  <Megaphone size={15} color="#f59e0b" />
                  <span>Broadcast Keyword / Concept Caption</span>
                </div>
                <button type="button" className="close-mini-btn" onClick={() => setIsKeywordDrawerOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={handleKeywordSubmit} className="keyword-drawer-form">
                <input
                  type="text"
                  className="google-input keyword-input"
                  placeholder="e.g. Photosynthesis, Eigenvector, Backpropagation..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="google-pill-btn primary send-keyword-btn">
                  <span>Send</span>
                  <ArrowRight size={14} />
                </button>
              </form>
              <div className="keyword-drawer-hint">
                Instantly translated to all target languages (Tamil, Malayalam, Hindi, English) and highlighted for students!
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

              {/* Session Recording Button */}
              <button
                type="button"
                className={`meet-dock-btn record-session-btn ${isSessionRecording ? 'rec-active' : 'secondary'}`}
                onClick={toggleSessionRecording}
                title={isSessionRecording ? "Stop Session Recording and Save Video" : "Start Session Video & Audio Recording"}
              >
                <Circle size={15} fill={isSessionRecording ? "#ea4335" : "none"} color={isSessionRecording ? "#ea4335" : "currentColor"} />
                <span className="dock-btn-text">{isSessionRecording ? `REC ${formatRecordingTime(recordingDuration)}` : 'Record'}</span>
              </button>

              {/* Keyword Broadcaster Toggle */}
              <button
                type="button"
                className={`meet-dock-btn ${isKeywordDrawerOpen ? 'active-gold' : 'secondary'}`}
                onClick={() => setIsKeywordDrawerOpen((prev) => !prev)}
                title="Broadcast Keyword Caption (Auto-translated to students' language)"
              >
                <Megaphone size={17} />
              </button>

              {/* Hand Raises Counter Button */}
              {handRaises.length > 0 && (
                <button
                  type="button"
                  className="meet-dock-btn warning hand-raise-alert-btn pulse-animation"
                  onClick={() => {
                    setLayoutMode('split');
                    setSidebarTab('hands');
                  }}
                  title={`${handRaises.length} Student${handRaises.length === 1 ? '' : 's'} Raised Hand`}
                >
                  <Hand size={17} />
                  <span className="dock-pill-badge" style={{ background: '#f59e0b', color: '#000' }}>
                    {handRaises.length}
                  </span>
                </button>
              )}

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

              {/* Teacher Setup / Profile Button */}
              <button
                type="button"
                className="meet-dock-btn secondary"
                onClick={onOpenTeacherSetup}
                title="Teacher Settings (Name & Language)"
              >
                <Settings size={17} />
              </button>

              {/* End Session Button for Teacher */}
              {onEndSession && (
                <button
                  type="button"
                  className="meet-dock-btn end-session-btn"
                  onClick={onEndSession}
                  title="End Online Lecture for Everyone"
                >
                  <PhoneOff size={16} />
                  <span className="dock-btn-text">End Session</span>
                </button>
              )}
            </>
          ) : (
            /* Student Controls */
            <>
              {/* Hand Raise Toggle */}
              <button
                type="button"
                className={`meet-dock-btn ${isMyHandRaised ? 'hand-raised-active pulse-animation' : 'secondary'}`}
                onClick={onToggleHandRaise}
                title={isMyHandRaised ? "Lower Your Hand" : "Raise Hand to ask teacher a question"}
              >
                <Hand size={18} color={isMyHandRaised ? "#fbbf24" : "currentColor"} />
              </button>

              {/* Read Aloud TTS Toggle */}
              <button
                type="button"
                className={`meet-dock-btn ${isReadAloud ? 'active' : 'secondary'}`}
                onClick={onToggleReadAloud}
                title={isReadAloud ? "Turn Off Read-Aloud Audio" : "Turn On Real-Time Speech Synthesis (TTS)"}
              >
                {isReadAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              {/* Session Recording Button for Student */}
              <button
                type="button"
                className={`meet-dock-btn record-session-btn ${isSessionRecording ? 'rec-active' : 'secondary'}`}
                onClick={toggleSessionRecording}
                title={isSessionRecording ? "Stop Recording (Save Lecture Video)" : "Record Lecture Session for Revision"}
              >
                <Circle size={15} fill={isSessionRecording ? "#ea4335" : "none"} color={isSessionRecording ? "#ea4335" : "currentColor"} />
                <span className="dock-btn-text">{isSessionRecording ? `REC ${formatRecordingTime(recordingDuration)}` : 'Record'}</span>
              </button>

              {/* Q&A Chat Shortcut */}
              <button
                type="button"
                className={`meet-dock-btn ${sidebarTab === 'qa' ? 'active' : 'secondary'}`}
                onClick={() => {
                  setLayoutMode('split');
                  setSidebarTab('qa');
                }}
                title="Open Q&A Chat"
              >
                <MessageSquare size={17} />
                {qaComments.length > 0 && (
                  <span className="dock-pill-badge">{qaComments.length}</span>
                )}
              </button>

              {/* Edit Student Profile */}
              <button
                type="button"
                className="meet-dock-btn secondary"
                onClick={onOpenStudentRegister}
                title="Edit Your Name and Roll Number"
              >
                <Edit3 size={17} />
              </button>

              {/* Leave Session Button for Student */}
              {onEndSession && (
                <button
                  type="button"
                  className="meet-dock-btn end-session-btn"
                  onClick={onEndSession}
                  title="Leave Online Classroom"
                >
                  <PhoneOff size={16} />
                  <span className="dock-btn-text">Leave</span>
                </button>
              )}
            </>
          )}

          {/* Layout Switcher */}
          <button
            type="button"
            className="meet-dock-btn secondary"
            onClick={() => setLayoutMode(layoutMode === 'split' ? 'docked' : 'split')}
            title="Toggle Layout (Side-by-side Panel vs Docked)"
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

      {/* Synchronized Side Dual Captions & Q&A Chat Stage */}
      {layoutMode === 'split' && (
        <div className="online-caption-sidebar">
          {/* Tabs: Subtitles vs Q&A Chat vs Hand Raises */}
          <div className="sidebar-tab-bar sidebar-tabs-bar">
            <button
              type="button"
              className={`sidebar-tab-btn ${sidebarTab === 'subtitles' ? 'active' : ''}`}
              onClick={() => setSidebarTab('subtitles')}
            >
              <Radio size={13} />
              <span>Subtitles</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab-btn ${sidebarTab === 'qa' ? 'active' : ''}`}
              onClick={() => setSidebarTab('qa')}
            >
              <MessageSquare size={13} />
              <span>Q&A</span>
              {qaComments.length > 0 && (
                <span className="tab-counter-badge">{qaComments.length}</span>
              )}
            </button>
            {handRaises.length > 0 && (
              <button
                type="button"
                className={`sidebar-tab-btn tab-hands ${sidebarTab === 'hands' ? 'active' : ''}`}
                onClick={() => setSidebarTab('hands')}
              >
                <Hand size={13} />
                <span>Hands</span>
                <span className="tab-counter-badge amber">{handRaises.length}</span>
              </button>
            )}
          </div>

          {/* TAB 1: Subtitles View */}
          {sidebarTab === 'subtitles' && (
            <>
              <div className="sidebar-header">
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} color="var(--google-blue)" />
                  <span>{sourceLangName} ➔ {targetLangName}</span>
                </div>
                {/* 1-Click Caption Export Options */}
                <div className="caption-export-actions">
                  <button
                    type="button"
                    className="export-mini-btn export-btn"
                    onClick={() => exportCaptionsAsTxt(segments, sourceLang, targetLang)}
                    title="Export Captions as Plain Text (.txt)"
                  >
                    <FileText size={12} />
                    <span>TXT</span>
                  </button>
                  <button
                    type="button"
                    className="export-mini-btn export-btn pdf-btn pdf"
                    onClick={() => exportCaptionsAsPdf(segments, sourceLang, targetLang)}
                    title="Export Academic Publication PDF (.pdf)"
                  >
                    <Download size={12} />
                    <span>PDF</span>
                  </button>
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
                  segments.slice(-25).map((seg) => {
                    const vern = (seg.translations && seg.translations[targetLang]) || seg.text_vernacular || seg.text_source;
                    return (
                      <div key={seg.id} className={`online-transcript-bubble ${seg.is_keyword ? 'bubble-keyword' : ''}`}>
                        {seg.is_keyword && (
                          <div className="bubble-keyword-pill">
                            <Tag size={10} />
                            <span>KEYWORD CONCEPT</span>
                          </div>
                        )}
                        <div className="bubble-source">{seg.text_source || seg.text_en}</div>
                        <div className="bubble-vernacular">{vern}</div>
                        <div className="bubble-time">{seg.timestamp || 'Live'}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: Q&A & Comments View */}
          {sidebarTab === 'qa' && (
            <div className="qa-sidebar-container">
              <div className="qa-messages-list" ref={qaListRef}>
                {qaComments.length === 0 ? (
                  <div className="empty-transcript-state">
                    <MessageSquare size={24} color="var(--google-blue)" style={{ opacity: 0.5, marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      No Questions Yet
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {userRole === 'teacher'
                        ? "Students can ask questions or post comments here in real time with their Roll Number."
                        : "Have a question about the lecture? Ask below with your verified Roll Number!"}
                    </div>
                  </div>
                ) : (
                  qaComments.map((c) => {
                    const isTeacher = c.role === 'teacher' || c.sender_role === 'teacher';
                    const senderName = c.sender_name || c.sender || (isTeacher ? (teacherName || 'Faculty Host') : (studentName || 'Student'));
                    const rollNumber = c.sender_roll_no || c.roll_no;
                    const timeMs = c.timestamp ? (c.timestamp > 1e11 ? c.timestamp : c.timestamp * 1000) : Date.now();
                    const timeString = new Date(timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const initials = senderName
                      ? senderName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                      : (isTeacher ? 'T' : 'S');

                    return (
                      <div key={c.id} className={`qa-comment-card ${isTeacher ? 'teacher-comment teacher-card' : 'student-card'}`}>
                        <div className="qa-card-meta qa-comment-header">
                          <div className="qa-user-profile">
                            <div className={`qa-avatar ${isTeacher ? 'teacher-avatar' : ''}`}>
                              {isTeacher ? <Crown size={13} color="#f59e0b" /> : initials}
                            </div>
                            <div className="qa-user-details">
                              <span className="qa-sender-name">
                                {senderName}
                              </span>
                              {isTeacher ? (
                                <span className="qa-role-badge teacher-role-badge teacher">
                                  <Crown size={10} style={{ marginRight: '3px' }} />
                                  Faculty / Host
                                </span>
                              ) : (
                                <span className="qa-roll-badge qa-roll-no" title={`Student Roll No: ${rollNumber || 'Unassigned'}`}>
                                  <Tag size={10} style={{ marginRight: '3px' }} />
                                  Roll: {rollNumber || 'N/A'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="qa-time-stamp qa-timestamp" title={new Date(timeMs).toLocaleString()}>
                            {timeString}
                          </span>
                        </div>
                        <div className="qa-card-text qa-comment-body">
                          {c.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Author Identity Bar: Shows who is asking & Roll Number reference */}
              {userRole === 'student' ? (
                studentName && studentRollNo ? (
                  <div className="qa-author-identity-bar">
                    <div className="qa-author-badge">
                      <span className="qa-active-dot" />
                      <span className="qa-posting-text">
                        Posting as: <strong>{studentName}</strong>
                      </span>
                      <span className="qa-roll-reference-tag" title="Verified Academic Roll Number">
                        <Tag size={10} />
                        Roll: {studentRollNo}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="qa-change-id-btn"
                      onClick={onOpenStudentRegister}
                      title="Edit your Name and Roll Number"
                    >
                      <Edit3 size={11} />
                      <span>Change</span>
                    </button>
                  </div>
                ) : (
                  <div className="qa-missing-identity-bar">
                    <div className="qa-missing-text">
                      <AlertCircle size={13} color="#f59e0b" />
                      <span>Set your <b>Name & Roll Number</b> before asking questions</span>
                    </div>
                    <button
                      type="button"
                      className="qa-set-id-btn"
                      onClick={onOpenStudentRegister}
                    >
                      Set ID
                    </button>
                  </div>
                )
              ) : (
                <div className="qa-author-identity-bar teacher-identity-bar">
                  <div className="qa-author-badge">
                    <Crown size={12} color="#f59e0b" />
                    <span className="qa-posting-text">
                      Posting as Host: <strong>{teacherName || 'Faculty Host'}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="qa-change-id-btn"
                    onClick={onOpenTeacherSetup}
                    title="Teacher Settings"
                  >
                    <Settings size={11} />
                    <span>Settings</span>
                  </button>
                </div>
              )}

              {/* Q&A Input Box */}
              <form onSubmit={handleQaSubmit} className="qa-input-form">
                <input
                  type="text"
                  className="google-input qa-input"
                  placeholder={
                    userRole === 'teacher'
                      ? "Post an announcement or answer to class..."
                      : (studentName && studentRollNo
                          ? `Ask question as ${studentName} (Roll: ${studentRollNo})...`
                          : "Enter your Roll No & Name to ask a question...")
                  }
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="google-icon-btn send-qa-btn qa-send-btn"
                  title="Send Question / Comment"
                  disabled={!qaInput.trim()}
                >
                  <Send size={15} color="var(--google-blue)" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Hand Raises View */}
          {sidebarTab === 'hands' && (
            <div className="hands-sidebar-container">
              <div className="hands-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}>
                  <Hand size={15} color="#f59e0b" />
                  <span>Raised Hands ({handRaises.length})</span>
                </div>
                {userRole === 'teacher' && onLowerAllHands && (
                  <button type="button" className="lower-all-btn" onClick={onLowerAllHands}>
                    Lower All
                  </button>
                )}
              </div>
              <div className="hands-list">
                {handRaises.map((h, i) => {
                  const hTimeMs = h.timestamp ? (h.timestamp > 1e11 ? h.timestamp : h.timestamp * 1000) : Date.now();
                  const hTimeString = new Date(hTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={h.id || i} className="hand-raise-row">
                      <div className="hand-row-avatar hand-avatar">
                        <Hand size={14} color="#f59e0b" />
                      </div>
                      <div className="hand-row-info hand-info">
                        <div className="hand-row-name hand-name">{h.name || 'Student'}</div>
                        <div className="hand-row-roll hand-roll">
                          <Tag size={10} style={{ marginRight: '3px' }} />
                          Roll: {h.roll_no || 'N/A'}
                        </div>
                      </div>
                      <div className="hand-row-time hand-time">
                        <Clock size={11} />
                        <span>{hTimeString}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
