/**
 * AudioStreamer handles microphone capture via Web Audio API & MediaRecorder.
 * Streams audio to backend WebSocket and provides real-time volume analysis.
 */

export class AudioStreamer {
  constructor({ onAudioData, onVolumeChange, onError }) {
    this.onAudioData = onAudioData;
    this.onVolumeChange = onVolumeChange;
    this.onError = onError;
    
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
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

      // MediaRecorder for chunked streaming
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose default
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

      // Emit chunks every 3.0 seconds for low-latency ASR
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
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
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
