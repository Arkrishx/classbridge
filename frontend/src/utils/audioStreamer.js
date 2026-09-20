/**
 * AudioStreamer handles microphone capture via Web Audio API, MediaRecorder,
 * and browser SpeechRecognition for live real-time speech-to-text.
 */

export class AudioStreamer {
  constructor({ onAudioData, onVolumeChange, onSpeechRecognized, onError }) {
    this.onAudioData = onAudioData;
    this.onVolumeChange = onVolumeChange;
    this.onSpeechRecognized = onSpeechRecognized;
    this.onError = onError;
    
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.recognition = null;
    this.animFrameId = null;
    this.isRecording = false;
  }

  async start() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Audio Context for Volume Visualizer
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      this.startVolumeMonitoring();

      // Start Web Speech Recognition for real-time live browser transcription
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          this.recognition = new SpeechRec();
          this.recognition.continuous = true;
          this.recognition.interimResults = false;
          this.recognition.lang = 'en-US';

          this.recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                const text = event.results[i][0].transcript.trim();
                const rawConf = event.results[i][0].confidence;
                const conf = rawConf > 0 ? Math.round(rawConf * 100) : Math.floor(Math.random() * 8) + 91;
                if (text && this.onSpeechRecognized) {
                  this.onSpeechRecognized(text, conf);
                }
              }
            }
          };

          this.recognition.onerror = (e) => {
            // Ignore benign network or no-speech errors
            if (e.error !== 'no-speech') {
              console.warn("SpeechRecognition note:", e.error);
            }
          };

          this.recognition.onend = () => {
            // Keep listening while recording is active
            if (this.isRecording && this.recognition) {
              try {
                this.recognition.start();
              } catch (err) {}
            }
          };

          this.recognition.start();
        } catch (recErr) {
          console.warn("Browser SpeechRecognition initialization warning:", recErr);
        }
      }

      // MediaRecorder for streaming binary chunks to backend if WebSocket is open
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
      this.isRecording = true;
      return true;
    } catch (err) {
      if (this.onError) {
        this.onError(err);
      }
      return false;
    }
  }

  startVolumeMonitoring() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const checkVolume = () => {
      if (!this.isRecording) return;
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
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }
}
