/**
 * High-Reliability AudioStreamer for Live Lecture Capture:
 * 1. Synchronous SpeechRecognition start inside click gesture
 * 2. Instant auto-commit on natural pause (1100ms debounce), without waiting for Chrome's delayed isFinal
 * 3. Guaranteed commit on Stop Mic
 * 4. Concurrent volume visualizer & WebSockets audio streaming
 */

export class AudioStreamer {
  constructor({ onAudioData, onVolumeChange, onSpeechRecognized, onInterimSpeech, onError, onStatusChange }) {
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

    // Buffer for speech accumulation
    this.currentSpeechBuffer = '';
    this.silenceDebounceTimer = null;
  }

  commitSpeech(confidence = 95) {
    if (this.silenceDebounceTimer) {
      clearTimeout(this.silenceDebounceTimer);
      this.silenceDebounceTimer = null;
    }

    const textToCommit = this.currentSpeechBuffer.trim();
    if (textToCommit && textToCommit.length > 1) {
      if (this.onSpeechRecognized) {
        this.onSpeechRecognized(textToCommit, confidence);
      }
    }
    this.currentSpeechBuffer = '';
    if (this.onInterimSpeech) {
      this.onInterimSpeech('');
    }
  }

  start() {
    this.isRecording = true;
    this.currentSpeechBuffer = '';

    // 1. Synchronously start SpeechRecognition within the click event
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          if (this.onStatusChange) {
            this.onStatusChange('listening');
          }
        };

        this.recognition.onresult = (event) => {
          let fullSpokenText = '';
          let isFinalSentence = false;

          for (let i = 0; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            fullSpokenText += ' ' + transcript;
            if (event.results[i].isFinal) {
              isFinalSentence = true;
            }
          }

          const cleanText = fullSpokenText.trim();
          if (cleanText) {
            this.currentSpeechBuffer = cleanText;

            // Broadcast real-time words to UI
            if (this.onInterimSpeech) {
              this.onInterimSpeech(cleanText);
            }

            // Reset pause timer
            if (this.silenceDebounceTimer) {
              clearTimeout(this.silenceDebounceTimer);
            }

            if (isFinalSentence) {
              // Direct commit if Chrome marked final
              this.commitSpeech(96);
            } else {
              // Auto-commit on natural conversational pause (1200ms of silence)
              this.silenceDebounceTimer = setTimeout(() => {
                this.commitSpeech(94);
              }, 1200);
            }
          }
        };

        this.recognition.onerror = (e) => {
          console.warn("SpeechRecognition event:", e.error);
          if (e.error === 'not-allowed') {
            if (this.onError) {
              this.onError(new Error("Microphone permission was denied. Please allow microphone access in your browser address bar."));
            }
          } else if (e.error === 'network') {
            console.warn("SpeechRecognition network warning - falling back to direct input mode.");
          }
        };

        this.recognition.onend = () => {
          // Commit any pending buffer on recognition end
          this.commitSpeech();

          // Keep recognition alive while recording is active
          if (this.isRecording && this.recognition) {
            try {
              this.recognition.start();
            } catch (err) {}
          }
        };

        this.recognition.start();
      } catch (recErr) {
        console.warn("SpeechRecognition initialization note:", recErr);
      }
    } else {
      console.warn("SpeechRecognition is not supported on this browser.");
    }

    // 2. Concurrently initialize Web Audio volume meter and WebSocket chunking
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      .then((stream) => {
        if (!this.isRecording) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        this.mediaStream = stream;

        // Audio Context for Volume Visualizer
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        this.startVolumeMonitoring();

        // MediaRecorder for chunked streaming to backend WebSocket
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }

        const options = mimeType ? { mimeType } : {};
        this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

        this.mediaRecorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0 && this.onAudioData) {
            const buffer = await e.data.arrayBuffer();
            this.onAudioData(buffer);
          }
        };

        this.mediaRecorder.start(3000);
      })
      .catch((err) => {
        console.warn("getUserMedia audio capture note:", err);
      });
    }

    return true;
  }

  startVolumeMonitoring() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const checkVolume = () => {
      if (!this.isRecording || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(100, Math.round((avg / 128) * 100));
      if (this.onVolumeChange) {
        this.onVolumeChange(normalized);
      }
      this.animFrameId = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  }

  stop() {
    this.isRecording = false;

    // Immediately commit whatever was spoken before stopping!
    this.commitSpeech();

    if (this.silenceDebounceTimer) {
      clearTimeout(this.silenceDebounceTimer);
      this.silenceDebounceTimer = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.recognition) {
      try {
        this.recognition.onend = null;
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
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
    if (this.onStatusChange) {
      this.onStatusChange('idle');
    }
  }
}
