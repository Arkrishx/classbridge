/**
 * Production-Grade Continuous Live Audio Streamer
 * 
 * Key Engineering Highlights:
 * 1. Real Hardware Audio Capture on Selected Device: Opens physical getUserMedia
 *    track bound to selectedDeviceId (Bluetooth headset Harmonics Y3 or laptop mic)
 *    so the 16-bar equalizer responds in real-time to physical acoustic energy.
 * 2. Edge & Windows Resilient Speech Recognition: Defaults to universal 'en-US',
 *    recovering automatically from Edge regional 'network' and 'language-not-supported'
 *    dropouts without killing the dictation loop.
 * 3. 350ms Debounced Edge Lifecycle: Prevents InvalidStateError on Microsoft Edge
 *    continuous restarts, preserving seamless continuous transcription.
 * 4. Zero-Collision Dual Engine: AudioContext analyser operates concurrently with
 *    SpeechRecognition on Windows desktop without locking device handles.
 * 5. Smart Device Detection: Identifies Bluetooth headsets, USB mics, internal mics,
 *    and flags virtual audio cables (AudioRelay, VB-Cable).
 */

import { decodeAcousticTranscript } from './probabilisticAcousticDecoder.js';

export const BCP47_MAP = {
  en: 'en-US',
  ta: 'ta-IN',
  ml: 'ml-IN',
  hi: 'hi-IN'
};

/**
 * Punctuation and whitespace-agnostic text normalizer for accurate deduplication
 */
export function normalizeSpeechText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class AudioStreamer {
  constructor({
    onAudioData,
    onVolumeChange,
    onSpeechRecognized,
    onInterimSpeech,
    onError,
    onStatusChange,
    selectedDeviceId = 'default',
    sourceLang = 'en',
    domainContext = {},
    glossary = {}
  }) {
    this.onAudioData = onAudioData;
    this.onVolumeChange = onVolumeChange;
    this.onSpeechRecognized = onSpeechRecognized;
    this.onInterimSpeech = onInterimSpeech;
    this.onError = onError;
    this.onStatusChange = onStatusChange;
    this.selectedDeviceId = selectedDeviceId;
    this.sourceLang = sourceLang || 'en';
    this.domainContext = domainContext || {};
    this.glossary = glossary || {};

    this.recognition = null;
    this.isRecording = false;
    this.isStarting = false;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.pcmProcessor = null;
    this.pcmBuffers = [];
    this.pcmSamples = 0;

    // Buffers, timers, and state
    this.currentInterimText = '';
    this.lastCommittedText = '';
    this.lastCommittedNorm = '';
    this.pauseTimer = null;
    this.restartTimer = null;
    this.watchdogTimer = null;
    this.volumeAnimId = null;
    this.currentSimVolume = 0;
    this.targetSimVolume = 0;
    this.isSpeaking = false;
    this.consecutiveErrors = 0;
    this.recLang = BCP47_MAP[this.sourceLang] || 'en-US';
    this.recentCommitted = [];
  }

  setSourceLanguage(sourceLang) {
    if (!sourceLang) return;
    this.sourceLang = sourceLang;
    this.recLang = BCP47_MAP[sourceLang] || 'en-US';
    console.log(`[AudioStreamer] Language set to: ${sourceLang} (${this.recLang})`);

    // If currently recording, restart SpeechRecognition with the new language cleanly
    if (this.isRecording) {
      const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
      if (SpeechRec) {
        try {
          if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
          }
          if (this.recognition) {
            this.recognition.onend = null;
            this.recognition.onerror = null;
            this.recognition.stop();
            this.recognition = null;
          }
        } catch (e) {}

        this.restartTimer = setTimeout(() => {
          if (this.isRecording) {
            this.initSpeechRecognition(SpeechRec);
          }
        }, 150);
      }
    }
  }

  setGlossary(glossary) {
    this.glossary = glossary || {};
  }

  setDomainContext(domainContext) {
    this.domainContext = domainContext || {};
  }

  commitFinalText(text, confidence = 96) {
    if (!text || !text.trim()) return;

    // Apply Probabilistic Acoustic-Semantic Decoder to correct pronunciation errors in ASR
    const { decodedText } = decodeAcousticTranscript(text, this.domainContext, this.glossary);
    let clean = (decodedText || text).trim();
    if (!clean || clean.length < 2) return;

    // Deduplicate repeated consecutive words within the utterance (e.g. "visit visit visit" -> "visit")
    const words = clean.split(/\s+/);
    const dedupedWords = [];
    for (let i = 0; i < words.length; i++) {
      if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
        dedupedWords.push(words[i]);
      }
    }
    clean = dedupedWords.join(' ');
    if (!clean || clean.length < 2) return;

    const normClean = normalizeSpeechText(clean);
    if (!normClean || normClean.length < 2) return;

    // Prevent duplicate rapid-fire commits of identical or punctuation-variant sentence
    if (normClean === this.lastCommittedNorm) {
      return;
    }

    // Ring buffer of recently committed sentences to prevent echoing and bounce
    if (!this.recentCommitted) {
      this.recentCommitted = [];
    }
    const now = Date.now();
    // Prune entries older than 8 seconds
    this.recentCommitted = this.recentCommitted.filter((item) => (now - item.time) < 8000);
    
    // Check exact normalized match
    if (this.recentCommitted.some((item) => item.norm === normClean)) {
      return;
    }

    // Check sub-phrase repetition within 3.5 seconds (prevents stutter repeats like "to the store" right after "went to the store")
    if (this.recentCommitted.some((item) => (now - item.time) < 3500 && normClean.length > 4 && item.norm.endsWith(normClean))) {
      return;
    }

    this.recentCommitted.push({ text: clean, norm: normClean, time: now });
    this.lastCommittedText = clean;
    this.lastCommittedNorm = normClean;

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
    if (!text || !text.trim()) return;

    // Apply Probabilistic Acoustic-Semantic Decoder in real time to interim speech
    const { decodedText } = decodeAcousticTranscript(text, this.domainContext, this.glossary);
    let clean = (decodedText || text).trim();
    if (!clean) return;

    // Deduplicate repeated consecutive words in interim text
    const words = clean.split(/\s+/);
    const dedupedWords = [];
    for (let i = 0; i < words.length; i++) {
      if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
        dedupedWords.push(words[i]);
      }
    }
    clean = dedupedWords.join(' ');
    if (!clean) return;

    // Progressive Clause Chunking (ASR Streaming Model):
    // If interim text has reached a natural clause boundary (8+ words ending with a conjunction or comma),
    // progressively commit the completed clause so translation streams in real time instead of waiting
    // for a massive paragraph.
    const cleanWords = clean.split(/\s+/);
    if (cleanWords.length >= 8) {
      const clauseConnectors = new Set(['and', 'because', 'so', 'therefore', 'where', 'which', 'while', 'hence', 'then', 'since', 'also']);
      let splitIndex = -1;
      for (let i = 5; i <= cleanWords.length - 3; i++) {
        const w = cleanWords[i].toLowerCase().replace(/[^a-z]/g, '');
        const prevW = cleanWords[i - 1];
        if (prevW.endsWith(',') || prevW.endsWith(';') || clauseConnectors.has(w)) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex !== -1) {
        const completedClause = cleanWords.slice(0, splitIndex).join(' ');
        const remainingInterim = cleanWords.slice(splitIndex).join(' ');
        this.commitFinalText(completedClause, 95);
        clean = remainingInterim.trim();
        if (!clean) return;
      }
    }

    const normClean = normalizeSpeechText(clean);
    // If identical to last committed text (ignoring punctuation), don't display as interim
    if (normClean === this.lastCommittedNorm) {
      return;
    }
    if (this.recentCommitted && this.recentCommitted.some((item) => item.norm === normClean)) {
      return;
    }

    this.currentInterimText = clean;
    this.isSpeaking = true;
    this.targetSimVolume = Math.min(85, Math.max(35, 30 + clean.length * 2));

    if (this.onStatusChange) {
      this.onStatusChange('speaking');
    }

    if (this.onInterimSpeech) {
      this.onInterimSpeech(clean);
    }

    // Reset conversational pause auto-commit timer (950ms natural conversational pause for snappy clause completion)
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
    }

    this.pauseTimer = setTimeout(() => {
      if (this.currentInterimText && this.currentInterimText.trim().length > 1) {
        const textToCommit = this.currentInterimText.trim();
        this.currentInterimText = '';
        this.commitFinalText(textToCommit, 94);
        this.isSpeaking = false;
        this.targetSimVolume = 0;
        if (this.onStatusChange) {
          this.onStatusChange('listening');
        }
      }
    }, 950);
  }

  /**
   * Initializes real physical audio capture on the selected device (Bluetooth or internal mic)
   * Feeds the Web Audio RMS Analyser for the live visualizer and MediaRecorder for streaming
   */
  async initPhysicalAudioStream() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    // Tear down any existing physical stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
      this.analyser = null;
    }

    const buildConstraints = (devId) => {
      const audioConstraints = {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (devId && devId !== 'default') {
        audioConstraints.deviceId = { exact: devId };
      }
      return { audio: audioConstraints };
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(buildConstraints(this.selectedDeviceId));
    } catch (err) {
      console.warn("Could not capture with exact deviceId, falling back to default device:", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (fallbackErr) {
        console.warn("getUserMedia failed completely:", fallbackErr);
        return;
      }
    }

    if (!this.isRecording) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    this.mediaStream = stream;

    // Initialize Web Audio RMS Analyser for real-time equalizer bars
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.2;
      source.connect(this.analyser);
    } catch (ctxErr) {
      console.warn("AudioContext setup notice:", ctxErr);
    }

    // Initialize MediaRecorder for streaming to backend if WebSocket is connected
    try {
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
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
      }
    } catch (recErr) {
      // Non-fatal if browser speech recognition is active
    }
  }

  async start() {
    this.isRecording = true;
    this.currentInterimText = '';
    this.lastCommittedText = '';
    this.isSpeaking = false;
    this.targetSimVolume = 0;
    this.consecutiveErrors = 0;
    this.recLang = BCP47_MAP[this.sourceLang] || 'en-US';

    // Start volume animation ticker for the 16-bar visualizer
    this.startVolumeTicker();

    // Start physical audio capture on selected device for real-time RMS meter & WebSocket
    try {
      await this.initPhysicalAudioStream();
    } catch (e) {
      console.warn("Physical audio stream init notice:", e);
    }

    const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRec) {
      this.initSpeechRecognition(SpeechRec);
      this.startWatchdog(SpeechRec);
    } else {
      console.warn("Web Speech API not supported; using raw PCM backend transcription.");
      if (this.mediaRecorder) {
        try { this.mediaRecorder.stop(); } catch (e) {}
        this.mediaRecorder = null;
      }
      this.startPcmFallback();
      if (this.onStatusChange) this.onStatusChange('listening');
    }

    return true;
  }

  startWatchdog(SpeechRec) {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
    }
    this.watchdogTimer = setInterval(() => {
      if (this.isRecording && !this.recognition && !this.isStarting) {
        console.log("[AudioStreamer] Watchdog auto-reviving SpeechRecognition engine...");
        this.initSpeechRecognition(SpeechRec);
      }
    }, 3500);
  }

  startPcmFallback() {
    if (!this.audioContext || !this.mediaStream || this.pcmProcessor) return;

    try {
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.pcmBuffers = [];
      this.pcmSamples = 0;
      processor.onaudioprocess = (event) => {
        if (!this.isRecording) return;
        const input = event.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let index = 0; index < input.length; index += 1) {
          pcm[index] = Math.max(-1, Math.min(1, input[index])) * 32767;
        }
        this.pcmBuffers.push(pcm);
        this.pcmSamples += pcm.length;
        const targetSamples = Math.floor((this.audioContext.sampleRate || 44100) * 3);
        if (this.pcmSamples < targetSamples) return;

        const output = new Int16Array(this.pcmSamples);
        let offset = 0;
        for (const buffer of this.pcmBuffers) {
          output.set(buffer, offset);
          offset += buffer.length;
        }
        this.pcmBuffers = [];
        this.pcmSamples = 0;
        const sourceRate = this.audioContext.sampleRate || 44100;
        const targetRate = 16000;
        const resampled = new Int16Array(Math.floor(output.length * targetRate / sourceRate));
        for (let index = 0; index < resampled.length; index += 1) {
          const sourceIndex = Math.min(output.length - 1, Math.floor(index * sourceRate / targetRate));
          resampled[index] = output[sourceIndex];
        }
        if (this.onAudioData) this.onAudioData(resampled.buffer);
      };
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      this.pcmProcessor = processor;
      this.audioContext.resume?.().catch(() => {});
    } catch (error) {
      console.warn('[AudioStreamer] PCM mobile fallback unavailable:', error);
    }
  }

  initSpeechRecognition(SpeechRec) {
    if (!this.isRecording) return;

    try {
      if (this.recognition) {
        try {
          this.recognition.onend = null;
          this.recognition.onerror = null;
          this.recognition.stop();
        } catch (e) {}
        this.recognition = null;
      }

      const rec = new SpeechRec();
      
      // Continuous transcription mode
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      // en-US is universally supported by Chrome and Edge speech services
      rec.lang = this.recLang || 'en-US';

      rec.onstart = () => {
        this.isStarting = false;
        this.consecutiveErrors = 0;
        if (this.onStatusChange) {
          this.onStatusChange('listening');
        }
      };

      rec.onspeechstart = () => {
        this.isSpeaking = true;
        this.targetSimVolume = 65;
        if (this.onStatusChange) {
          this.onStatusChange('speaking');
        }
      };

      rec.onspeechend = () => {
        this.isSpeaking = false;
        this.targetSimVolume = 0;
        if (this.onStatusChange) {
          this.onStatusChange('listening');
        }
      };

      rec.onaudiostart = () => {
        if (this.onStatusChange && !this.isSpeaking) {
          this.onStatusChange('listening');
        }
      };

      rec.onaudioend = () => {
        this.isSpeaking = false;
        this.targetSimVolume = 0;
      };

      // Loop strictly from event.resultIndex to process ONLY newly arrived utterances.
      // This prevents the mobile repetition explosion where past results were re-accumulated.
      rec.onresult = (event) => {
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
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
        this.isStarting = false;
        const err = e.error;
        console.warn("Speech recognition event:", err);

        // 'no-speech' or 'aborted' are normal quiet pauses, not fatal errors
        if (err === 'no-speech' || err === 'aborted') {
          return;
        }

        if (err === 'not-allowed') {
          console.warn("Speech recognition mic permission not allowed:", err);
          if (this.consecutiveErrors > 0 && this.onError) {
            this.onError(new Error("Microphone permission denied. Please allow microphone access in your browser settings."));
          }
          this.consecutiveErrors += 1;
          return;
        }

        if (err === 'network' || err === 'language-not-supported') {
          console.warn(`Speech recognition ${err} error on language ${this.recLang}`);
          this.consecutiveErrors += 1;
          if (err === 'language-not-supported' && this.recLang !== 'en-US') {
            console.warn(`Browser speech engine does not support ${this.recLang}, falling back to en-US`);
            this.recLang = 'en-US';
          }
          if (this.consecutiveErrors > 2 && this.onError) {
            this.onError(new Error("Browser speech recognition encountered a network/privacy restriction. In Windows Settings > Privacy > Speech, turn ON 'Online speech recognition', or open ClassBridge in Google Chrome."));
          }
          // Auto-recover cleanly if still recording
          if (this.isRecording) {
            if (this.restartTimer) clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(() => {
              if (this.isRecording && !this.isStarting) {
                this.initSpeechRecognition(SpeechRec);
              }
            }, 500);
          }
          return;
        }

        if (err === 'audio-capture') {
          console.warn("Audio capture error on device:", err);
          if (this.onError) {
            this.onError(new Error("Could not capture audio. Please verify your Bluetooth headset or microphone is connected and set as default in Windows Sound settings."));
          }
          return;
        }
      };

      rec.onend = () => {
        this.isStarting = false;
        this.recognition = null;
        // If there was uncommitted interim speech, commit it safely
        if (this.currentInterimText && this.currentInterimText.trim().length > 1) {
          const textToCommit = this.currentInterimText.trim();
          this.currentInterimText = '';
          this.commitFinalText(textToCommit, 94);
        }

        // Resilient self-healing loop: restart if user still has mic turned on
        if (this.isRecording) {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isRecording && !this.isStarting) {
              this.initSpeechRecognition(SpeechRec);
            }
          }, 300);
        }
      };

      this.recognition = rec;
      this.isStarting = true;
      rec.start();
    } catch (err) {
      this.isStarting = false;
      this.recognition = null;
      console.warn("Speech recognition start note:", err);
      if (this.isRecording) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (this.isRecording && !this.isStarting) {
            this.initSpeechRecognition(SpeechRec);
          }
        }, 400);
      }
    }
  }

  startVolumeTicker() {
    let tick = 0;
    const updateVolume = () => {
      if (!this.isRecording) return;

      if (this.analyser) {
        // Real Physical Microphone RMS Volume Level
        const timeData = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          sum += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sum / timeData.length);
        // Amplify subtle speech levels so quiet headset mics register clearly
        const volumePercent = Math.min(100, Math.round(rms * 480));

        if (this.onVolumeChange) {
          this.onVolumeChange(volumePercent);
        }

        // Keep speaking status synced to physical acoustic energy
        if (volumePercent > 18) {
          if (!this.isSpeaking && this.onStatusChange) {
            this.onStatusChange('speaking');
          }
          this.isSpeaking = true;
        } else if (volumePercent < 8 && !this.currentInterimText) {
          if (this.isSpeaking && this.onStatusChange) {
            this.onStatusChange('listening');
          }
          this.isSpeaking = false;
        }
      } else {
        // Fallback simulation mode
        tick += 0.2;
        if (this.isSpeaking) {
          const oscillation = Math.sin(tick) * 15 + Math.sin(tick * 2.3) * 8;
          this.currentSimVolume += (this.targetSimVolume + oscillation - this.currentSimVolume) * 0.25;
        } else {
          this.currentSimVolume += (0 - this.currentSimVolume) * 0.2;
        }

        const roundedVol = Math.max(0, Math.min(100, Math.round(this.currentSimVolume)));
        if (this.onVolumeChange) {
          this.onVolumeChange(roundedVol);
        }
      }

      this.volumeAnimId = requestAnimationFrame(updateVolume);
    };

    this.volumeAnimId = requestAnimationFrame(updateVolume);
  }

  stop() {
    this.isRecording = false;
    this.isStarting = false;

    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    if (this.volumeAnimId) {
      cancelAnimationFrame(this.volumeAnimId);
      this.volumeAnimId = null;
    }

    // Guaranteed commit of any pending interim speech before shutting down
    if (this.currentInterimText && this.currentInterimText.trim().length > 1) {
      const textToCommit = this.currentInterimText.trim();
      this.currentInterimText = '';
      this.commitFinalText(textToCommit, 95);
    }

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onspeechstart = null;
        this.recognition.onspeechend = null;
        this.recognition.onaudiostart = null;
        this.recognition.onaudioend = null;
        this.recognition.onresult = null;
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }

    if (this.pcmProcessor) {
      try { this.pcmProcessor.disconnect(); } catch (e) {}
      this.pcmProcessor.onaudioprocess = null;
      this.pcmProcessor = null;
    }
    this.pcmBuffers = [];
    this.pcmSamples = 0;

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

    this.analyser = null;

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

  async setAudioDevice(deviceId) {
    this.selectedDeviceId = deviceId;
    if (this.isRecording) {
      await this.initPhysicalAudioStream();
    }
  }
}

/**
 * Enumerate all available audio input devices (detecting Bluetooth headsets, internal mics, USB, virtual)
 */
export async function getAudioInputDevices() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    let audioInputs = devices.filter((d) => d.kind === 'audioinput');

    // If labels are empty (before permissions are granted), prompt for a temporary stream
    const hasLabels = audioInputs.some((d) => Boolean(d.label));
    if (!hasLabels && navigator.mediaDevices.getUserMedia) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        audioInputs = devices.filter((d) => d.kind === 'audioinput');
      } catch (e) {
        // User may have denied or dismissed
      }
    }

    return parseAudioDevices(audioInputs);
  } catch (err) {
    console.warn("Could not enumerate audio devices:", err);
    return [];
  }
}

function parseAudioDevices(devices) {
  const parsed = devices.map((d, index) => {
    const label = d.label || `Microphone ${index + 1}`;
    const lower = label.toLowerCase();
    const isBluetooth =
      lower.includes('bluetooth') ||
      lower.includes('airpods') ||
      lower.includes('headset') ||
      lower.includes('hands-free') ||
      lower.includes('wireless') ||
      lower.includes('buds') ||
      lower.includes('galaxy buds') ||
      lower.includes('pixel buds') ||
      lower.includes('wh-') ||
      lower.includes('wf-') ||
      lower.includes('bose') ||
      lower.includes('jbl') ||
      lower.includes('jabra') ||
      lower.includes('jabber') ||
      lower.includes('plantronics') ||
      lower.includes('sennheiser') ||
      lower.includes('harmonics');

    const isUsb =
      lower.includes('usb') ||
      lower.includes('focusrite') ||
      lower.includes('blue yeti') ||
      lower.includes('rode') ||
      lower.includes('fifine') ||
      lower.includes('hyperx') ||
      lower.includes('samson');

    const isVirtual =
      lower.includes('audiorelay') ||
      lower.includes('virtual') ||
      lower.includes('vb-audio') ||
      lower.includes('cable') ||
      lower.includes('voicemeeter') ||
      lower.includes('stereo mix') ||
      lower.includes('wave out');

    const isDefault = d.deviceId === 'default' || lower.includes('default');

    let type = 'internal';
    if (isBluetooth) type = 'bluetooth';
    else if (isUsb) type = 'usb';
    else if (isVirtual) type = 'virtual';
    else if (isDefault) type = 'default';

    return {
      deviceId: d.deviceId,
      groupId: d.groupId,
      label: label,
      type: type,
      isBluetooth: isBluetooth,
      isUsb: isUsb,
      isVirtual: isVirtual,
      isDefault: isDefault
    };
  });

  // Sort devices: Bluetooth headsets first, then physical mics/USB, then default, virtual last
  return parsed.sort((a, b) => {
    if (a.isBluetooth && !b.isBluetooth) return -1;
    if (!a.isBluetooth && b.isBluetooth) return 1;
    if (!a.isVirtual && b.isVirtual) return -1;
    if (a.isVirtual && !b.isVirtual) return 1;
    return 0;
  });
}
