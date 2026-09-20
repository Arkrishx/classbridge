/**
 * Production-Grade Live Lecture Text-to-Speech (TTS) Service
 * 
 * Key Highlights:
 * 1. Physical Speaker Output Routing (setSinkId): Directs vernacular speech playback
 *    specifically to Laptop Speakers (Realtek) while Bluetooth headset captures mic input.
 * 2. Multi-Tier Audio Engine:
 *    - Primary: Backend /api/tts endpoint (caching, low latency, native Indic voices)
 *    - Fallback 1: Direct Google Translate TTS endpoint (client=tw-ob)
 *    - Fallback 2: Browser Web Speech API speechSynthesis with Indic locale binding
 * 3. Real-Time Sequential Queue: Sentences play one after another with auto-pruning
 *    so speech never falls behind a live lecture and never double-speaks.
 * 4. Speaker Output Device Enumeration: Detects internal laptop speakers, Bluetooth headsets,
 *    and USB outputs.
 */

const API_BASE_URL = typeof window !== 'undefined' && window.VITE_API_URL 
  ? window.VITE_API_URL 
  : (import.meta.env?.VITE_API_URL || 'http://localhost:8000');

export class TTSManager {
  constructor({ onStateChange } = {}) {
    this.outputDeviceId = 'default';
    try {
      this.outputDeviceId = localStorage.getItem('classbridge_speaker_device_id') || 'default';
    } catch (e) {}

    this.speechQueue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    this.currentUtterance = null;
    this.rate = 1.05;
    this.volume = 1.0;
    this.onStateChange = onStateChange || null;
    this.recentSpoken = [];
  }

  setOutputDevice(deviceId) {
    this.outputDeviceId = deviceId || 'default';
    try {
      localStorage.setItem('classbridge_speaker_device_id', this.outputDeviceId);
    } catch (e) {}

    if (this.currentAudio && typeof this.currentAudio.setSinkId === 'function') {
      try {
        this.currentAudio.setSinkId(this.outputDeviceId === 'default' ? '' : this.outputDeviceId);
      } catch (err) {
        console.warn("Could not switch sink on active audio:", err);
      }
    }
  }

  getOutputDevice() {
    return this.outputDeviceId;
  }

  notify(state, data = {}) {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        queueLength: this.speechQueue.length,
        state,
        ...data
      });
    }
  }

  /**
   * Queue a newly translated sentence for real-time sequential playback
   */
  queueSentence(text, lang = 'ta') {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    if (clean.length < 2) return;

    // Prune echoing or duplicate commits within 6 seconds
    const now = Date.now();
    this.recentSpoken = this.recentSpoken.filter((item) => (now - item.time) < 6000);
    if (this.recentSpoken.some((item) => item.text === clean.toLowerCase())) {
      return;
    }
    this.recentSpoken.push({ text: clean.toLowerCase(), time: now });

    // Keep live lecture real-time: if queue has more than 2 pending sentences, drop oldest
    if (this.speechQueue.length >= 2) {
      this.speechQueue.shift();
    }

    this.speechQueue.push({ text: clean, lang });
    this.notify('queued', { text: clean, lang });

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Immediately play a specific sentence (cancelling any background queue)
   */
  speakImmediate(text, lang = 'ta') {
    this.stop();
    if (!text || !text.trim()) return;
    this.speechQueue = [{ text: text.trim(), lang }];
    this.playNext();
  }

  stop() {
    this.speechQueue = [];
    this.isPlaying = false;

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
      } catch (e) {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    this.notify('stopped');
  }

  async playNext() {
    if (this.speechQueue.length === 0) {
      this.isPlaying = false;
      this.currentAudio = null;
      this.notify('idle');
      return;
    }

    this.isPlaying = true;
    const item = this.speechQueue.shift();
    const { text, lang } = item;
    this.notify('speaking', { text, lang });

    // Try Tier 1 & 2: HTMLAudioElement with setSinkId
    const playedViaAudio = await this.playAudioElement(text, lang);
    if (!playedViaAudio) {
      // Fallback Tier 3: Browser Web Speech API speechSynthesis
      this.playSpeechSynthesis(text, lang);
    }
  }

  playAudioElement(text, lang) {
    return new Promise((resolve) => {
      // Build primary URL from backend /api/tts
      const encodedText = encodeURIComponent(text.slice(0, 200));
      const targetLang = (lang || 'ta').toLowerCase();
      const primaryUrl = `${API_BASE_URL}/api/tts?text=${encodedText}&lang=${targetLang}`;
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${targetLang}&client=tw-ob`;

      const audio = new Audio();
      this.currentAudio = audio;
      audio.preload = 'auto';
      audio.playbackRate = this.rate;
      audio.volume = this.volume;

      // Direct to user's selected speaker output (e.g. Laptop Speakers)
      if (typeof audio.setSinkId === 'function' && this.outputDeviceId && this.outputDeviceId !== 'default') {
        audio.setSinkId(this.outputDeviceId).catch((err) => {
          console.warn("setSinkId notice:", err);
        });
      }

      let hasResolved = false;
      let usedFallback = false;

      const finishAndNext = (success) => {
        if (!hasResolved) {
          hasResolved = true;
          this.currentAudio = null;
          if (success) {
            this.playNext();
          }
          resolve(success);
        }
      };

      audio.onended = () => {
        finishAndNext(true);
      };

      audio.onerror = () => {
        if (!usedFallback) {
          usedFallback = true;
          // Try direct fallback URL
          audio.src = fallbackUrl;
          if (typeof audio.setSinkId === 'function' && this.outputDeviceId && this.outputDeviceId !== 'default') {
            audio.setSinkId(this.outputDeviceId).catch(() => {});
          }
          audio.play().catch(() => {
            finishAndNext(false);
          });
        } else {
          finishAndNext(false);
        }
      };

      // Safety timeout: if audio gets stuck loading, advance queue after 7 seconds
      const timeoutId = setTimeout(() => {
        if (!hasResolved) {
          try {
            audio.pause();
          } catch (e) {}
          finishAndNext(false);
        }
      }, 7000);

      audio.src = primaryUrl;
      audio.play().catch(() => {
        if (!usedFallback) {
          usedFallback = true;
          audio.src = fallbackUrl;
          audio.play().catch(() => {
            clearTimeout(timeoutId);
            finishAndNext(false);
          });
        } else {
          clearTimeout(timeoutId);
          finishAndNext(false);
        }
      });
    });
  }

  playSpeechSynthesis(text, lang) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.isPlaying = false;
      this.playNext();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      const langMap = {
        ta: 'ta-IN',
        ml: 'ml-IN',
        hi: 'hi-IN',
        en: 'en-US'
      };
      utterance.lang = langMap[lang] || 'en-US';
      utterance.rate = this.rate;
      utterance.volume = this.volume;

      // Pick matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langCode = (langMap[lang] || 'en').toLowerCase();
        const matchingVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langCode));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        this.playNext();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        this.playNext();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("speechSynthesis notice:", e);
      this.playNext();
    }
  }

  /**
   * Play a brief chime and audio confirmation on a specific speaker device
   */
  async testSpeaker(deviceId) {
    this.stop();
    const targetDevId = deviceId || this.outputDeviceId;

    try {
      // 1. Synthesize pleasant test chime using Web Audio API on target sink
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      if (typeof ctx.setSinkId === 'function' && targetDevId && targetDevId !== 'default') {
        try {
          await ctx.setSinkId(targetDevId);
        } catch (e) {}
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);

      setTimeout(() => {
        try {
          ctx.close();
        } catch (e) {}
      }, 500);
    } catch (e) {
      console.warn("AudioContext chime test notice:", e);
    }

    // 2. Play vocal confirmation through HTMLAudioElement bound to sink
    const audio = new Audio(`${API_BASE_URL}/api/tts?text=Speaker%20test%20successful&lang=en`);
    if (typeof audio.setSinkId === 'function' && targetDevId && targetDevId !== 'default') {
      try {
        await audio.setSinkId(targetDevId);
      } catch (e) {}
    }
    try {
      await audio.play();
    } catch (playErr) {
      // Fallback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance("Speaker test successful");
        u.lang = "en-US";
        window.speechSynthesis.speak(u);
      }
    }
  }
}

/**
 * Enumerate all available audio output devices (Speakers, Headsets, USB)
 */
export async function getAudioOutputDevices() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

    return parseAudioOutputDevices(audioOutputs);
  } catch (err) {
    console.warn("Could not enumerate audio outputs:", err);
    return [];
  }
}

function parseAudioOutputDevices(devices) {
  const parsed = devices.map((d, index) => {
    const label = d.label || `Speaker / Output ${index + 1}`;
    const lower = label.toLowerCase();

    const isBluetooth =
      lower.includes('bluetooth') ||
      lower.includes('airpods') ||
      lower.includes('headset') ||
      lower.includes('headphone') ||
      lower.includes('hands-free') ||
      lower.includes('wireless') ||
      lower.includes('buds') ||
      lower.includes('harmonics');

    const isSpeaker =
      lower.includes('speaker') ||
      lower.includes('realtek') ||
      lower.includes('internal') ||
      lower.includes('built-in') ||
      lower.includes('laptop') ||
      lower.includes('sound');

    const isUsb = lower.includes('usb');

    const isVirtual =
      lower.includes('audiorelay') ||
      lower.includes('virtual') ||
      lower.includes('vb-audio') ||
      lower.includes('cable') ||
      lower.includes('voicemeeter');

    const isDefault = d.deviceId === 'default' || lower.includes('default');

    let type = 'speaker';
    if (isBluetooth) type = 'bluetooth';
    else if (isSpeaker) type = 'speaker';
    else if (isUsb) type = 'usb';
    else if (isVirtual) type = 'virtual';
    else if (isDefault) type = 'default';

    return {
      deviceId: d.deviceId,
      groupId: d.groupId,
      label: label,
      type: type,
      isSpeaker: isSpeaker,
      isBluetooth: isBluetooth,
      isUsb: isUsb,
      isVirtual: isVirtual,
      isDefault: isDefault
    };
  });

  // Sort: Physical Laptop Speakers first, then Default, then Bluetooth, virtual last
  return parsed.sort((a, b) => {
    if (a.isSpeaker && !b.isSpeaker) return -1;
    if (!a.isSpeaker && b.isSpeaker) return 1;
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    if (!a.isVirtual && b.isVirtual) return -1;
    if (a.isVirtual && !b.isVirtual) return 1;
    return 0;
  });
}

// Global singleton instance for easy import and persistence across components
export const globalTTS = new TTSManager();
