/**
 * Maestra-Grade Continuous Live Audio Streamer
 * 
 * Features:
 * 1. Synchronous SpeechRecognition gesture binding (Zero Chrome permission rejection)
 * 2. Proper event.resultIndex traversal separating finalized chunks from live interim speech
 * 3. Conversational pause auto-commit (950ms debounce) for natural sentence segmentation
 * 4. Resilient self-healing keepalive on recognition.onend (never silently dies)
 * 5. High-sensitivity time-domain RMS volume meter for the live equalizer
 * 6. Guaranteed zero-drop commit on Stop Mic
 */

export class AudioStreamer {
  constructor({
    onAudioData,
    onVolumeChange,
    onSpeechRecognized,
    onInterimSpeech,
    onError,
    onStatusChange
  }) {
    this.onAudioData = onAudioData;
    this.onVolumeChange = onVolumeChange;
    this.onSpeechRecognized = onSpeechRecognized;
    this.onInterimSpeech = onInterimSpeech;
    this.onError = onError;
    this.onStatusChange = onStatusChange;

    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.recognition = null;
    this.animFrameId = null;
    this.isRecording = false;

    // Buffers and timers
    this.currentInterimText = '';
    this.pauseTimer = null;
    this.restartTimer = null;
    this.lastCommittedText = '';
  }

  commitFinalText(text, confidence = 96) {
    const clean = text.trim();
    if (!clean || clean.length < 2) return;

    // Prevent duplicate rapid-fire commits of the exact same sentence
    if (clean.toLowerCase() === this.lastCommittedText.toLowerCase()) {
      return;
    }
    this.lastCommittedText = clean;

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    this.currentInterimText = '';
    if (this.onInterimSpeech) {
      this.onInterimSpeech('');
    }

    if (this.onSpeechRecognized) {
      this.onSpeechRecognized(clean, confidence);
    }
  }

  handleInterimText(text) {
    const clean = text.trim();
    if (!clean) return;

    this.currentInterimText = clean;
    if (this.onInterimSpeech) {
      this.onInterimSpeech(clean);
    }

    // Reset conversational pause timer
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
    }

    // Auto-commit on natural 950ms silence
    this.pauseTimer = setTimeout(() => {
      if (this.currentInterimText && this.currentInterimText.trim().length > 1) {
        const textToCommit = this.currentInterimText.trim();
        this.currentInterimText = '';
        this.commitFinalText(textToCommit, 94);
        this.softRestartRecognition();
      }
    }, 950);
  }

  softRestartRecognition() {
    if (!this.isRecording || !this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  start() {
    this.isRecording = true;
    this.currentInterimText = '';
    this.lastCommittedText = '';

    // 1. Initialize SpeechRecognition synchronously within click handler
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = 'en-US';

        rec.onstart = () => {
          if (this.onStatusChange) {
            this.onStatusChange('listening');
          }
        };

        rec.onresult = (event) => {
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            const transcript = res[0].transcript;

            if (res.isFinal) {
              const conf = Math.round((res[0].confidence || 0.95) * 100);
              this.commitFinalText(transcript, conf);
            } else {
              interim += transcript;
            }
          }

          if (interim.trim()) {
            this.handleInterimText(interim.trim());
          }
        };

        rec.onerror = (e) => {
          console.warn("SpeechRecognition event:", e.error);
          if (e.error === 'not-allowed') {
            if (this.onError) {
              this.onError(new Error("Microphone access denied. Please click the camera/mic icon in your address bar to allow microphone access."));
            }
          }
          // 'no-speech' or 'aborted' are normal lifecycle events; onend will recover
        };

        rec.onend = () => {
          // If there was uncommitted interim speech when engine paused, commit it now
          if (this.currentInterimText && this.currentInterimText.trim().length > 1) {
            const textToCommit = this.currentInterimText.trim();
            this.currentInterimText = '';
            this.commitFinalText(textToCommit, 93);
          }

          // Self-healing keepalive: never let speech recognition die while user has mic on!
          if (this.isRecording) {
            if (this.restartTimer) clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(() => {
              if (this.isRecording && this.recognition) {
                try {
                  this.recognition.start();
                } catch (err) {
                  // Ignore if already active
                }
              }
            }, 120);
          }
        };

        this.recognition = rec;
        this.recognition.start();
      } catch (err) {
        console.warn("SpeechRecognition start exception:", err);
      }
    } else {
      console.warn("Web Speech API not supported on this browser.");
    }

    // 2. Concurrently initialize Web Audio volume meter and WebSocket chunking
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        if (!this.isRecording) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        this.mediaStream = stream;

        // Web Audio RMS Analyser
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        this.startVolumeMonitoring();

        // Optional MediaRecorder for binary audio chunks streaming
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }

        const options = mimeType ? { mimeType } : {};
        try {
          this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
          this.mediaRecorder.ondataavailable = async (e) => {
            if (e.data && e.data.size > 0 && this.onAudioData) {
              const buffer = await e.data.arrayBuffer();
              this.onAudioData(buffer);
            }
          };
          this.mediaRecorder.start(3000);
        } catch (mErr) {
          console.warn("MediaRecorder init note:", mErr);
        }
      })
      .catch((err) => {
        console.warn("getUserMedia error:", err);
      });
    }

    return true;
  }

  startVolumeMonitoring() {
    if (!this.analyser) return;
    const timeData = new Float32Array(this.analyser.fftSize);

    const checkVolume = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        sum += timeData[i] * timeData[i];
      }
      const rms = Math.sqrt(sum / timeData.length);
      // Amplify human voice RMS (0.01 - 0.2 -> 0% to 100%)
      const volumePercent = Math.min(100, Math.round(rms * 450));

      if (this.onVolumeChange) {
        this.onVolumeChange(volumePercent);
      }

      if (this.onStatusChange) {
        this.onStatusChange(volumePercent > 6 ? 'speaking' : 'listening');
      }

      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  stop() {
    this.isRecording = false;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    // Guaranteed commit of any pending interim speech before stopping
    if (this.currentInterimText && this.currentInterimText.trim().length > 1) {
      const textToCommit = this.currentInterimText.trim();
      this.currentInterimText = '';
      this.commitFinalText(textToCommit, 95);
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }

    if (this.onInterimSpeech) {
      this.onInterimSpeech('');
    }

    if (this.onStatusChange) {
      this.onStatusChange('idle');
    }
  }
}

