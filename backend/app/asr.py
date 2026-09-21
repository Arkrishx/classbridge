import io
import math
import logging
import numpy as np
from typing import List, Dict, Any, Optional
from faster_whisper import WhisperModel
from backend.app.config import settings

logger = logging.getLogger("classbridge.asr")

class ASRProcessor:
    """
    Real-Time ASR Processor using faster-whisper (int8-quantized on CPU/GPU).
    Transcribes streaming audio chunks (~3-5s), computes segment timestamps
    and ASR confidence scores.
    """
    def __init__(
        self,
        model_size: str = settings.WHISPER_MODEL_SIZE,
        device: str = settings.WHISPER_DEVICE,
        compute_type: str = settings.WHISPER_COMPUTE_TYPE
    ):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model: Optional[WhisperModel] = None
        self._load_model()

    def _load_model(self):
        try:
            logger.info(f"Loading faster-whisper model '{self.model_size}' ({self.compute_type}) on {self.device}...")
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )
            logger.info("faster-whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load faster-whisper model: {e}")
            self.model = None

    def calculate_confidence(self, avg_logprob: float, no_speech_prob: float) -> float:
        """
        Derives an explainable confidence score percentage (0-100%)
        based on the segment's average log probability and silence probability.
        """
        try:
            # avg_logprob is typically between 0 (certain) and -1.5 or lower (uncertain)
            prob = math.exp(avg_logprob)
            penalty = 1.0 - min(1.0, max(0.0, no_speech_prob))
            score = (0.75 * prob + 0.25 * penalty) * 100.0
            return round(max(5.0, min(99.0, score)), 1)
        except Exception:
            return 85.0

    def transcribe_audio_bytes(
        self,
        audio_bytes: bytes,
        time_offset: float = 0.0,
        language: str = "en"
    ) -> List[Dict[str, Any]]:
        """
        Transcribes an audio chunk (WAV/WebM/PCM) and returns segment results.
        """
        if not self.model:
            # Fallback mock for resilience if model failed to load
            logger.warning("Whisper model not loaded, returning empty transcription.")
            return []

        if len(audio_bytes) < 1000:
            return []

        try:
            audio_stream = io.BytesIO(audio_bytes)
            segments, info = self.model.transcribe(
                audio_stream,
                language=language,
                beam_size=3,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
                condition_on_previous_text=False
            )

            results = []
            for seg in segments:
                text = seg.text.strip()
                if not text:
                    continue

                conf = self.calculate_confidence(seg.avg_logprob, seg.no_speech_prob)
                results.append({
                    "start": round(time_offset + seg.start, 2),
                    "end": round(time_offset + seg.end, 2),
                    "text": text,
                    "confidence": conf,
                    "no_speech_prob": round(seg.no_speech_prob, 3),
                    "avg_logprob": round(seg.avg_logprob, 3)
                })

            return results
        except Exception as e:
            logger.error(f"Error transcribing audio bytes: {e}")
            return []

    def transcribe_pcm16(
        self,
        pcm_bytes: bytes,
        sample_rate: int = 16000,
        time_offset: float = 0.0,
        language: str = "en"
    ) -> List[Dict[str, Any]]:
        """
        Transcribes raw 16-bit 16kHz mono PCM samples.
        """
        if not self.model or len(pcm_bytes) < 2000:
            return []

        try:
            # Convert 16-bit PCM bytes to float32 in [-1.0, 1.0]
            audio_np = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Simple silence threshold check
            energy = np.mean(np.abs(audio_np))
            if energy < 0.005:
                # Silence detected
                return []

            segments, info = self.model.transcribe(
                audio_np,
                language=language,
                beam_size=3,
                vad_filter=True,
                condition_on_previous_text=False
            )

            results = []
            for seg in segments:
                text = seg.text.strip()
                if not text:
                    continue
                conf = self.calculate_confidence(seg.avg_logprob, seg.no_speech_prob)
                results.append({
                    "start": round(time_offset + seg.start, 2),
                    "end": round(time_offset + seg.end, 2),
                    "text": text,
                    "confidence": conf,
                    "no_speech_prob": round(seg.no_speech_prob, 3),
                    "avg_logprob": round(seg.avg_logprob, 3)
                })
            return results
        except Exception as e:
            logger.error(f"Error in transcribe_pcm16: {e}")
            return []

# Global singleton
asr_processor = ASRProcessor()
