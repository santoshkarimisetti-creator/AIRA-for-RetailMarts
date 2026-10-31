"""
AIRA - Local Speech-to-Text Recognition Engine (faster-whisper)
Performs fully offline, high-accuracy speech-to-text with bilingual support (Telugu & English)
and automatic language detection using faster-whisper CTranslate2 backend.
"""

import os
import io
import tempfile
import logging
from typing import Dict, Any, Optional, Union

# Compatibility patch for PyAV metadata_errors across newer av versions
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop('metadata_errors', None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except Exception:
    pass

from faster_whisper import WhisperModel

logger = logging.getLogger("aira.speech_to_text")

class LocalSpeechToTextEngine:
    _instance: Optional['LocalSpeechToTextEngine'] = None

    def __init__(self, model_size: str = "small", device: str = "cpu", compute_type: str = "int8"):
        self.model_size = os.getenv("WHISPER_MODEL", model_size)
        self.device = os.getenv("WHISPER_DEVICE", device)
        self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", compute_type)
        self.model: Optional[WhisperModel] = None
        self._is_loading = False

    @classmethod
    def get_instance(cls) -> 'LocalSpeechToTextEngine':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self) -> WhisperModel:
        """Loads and caches the faster-whisper model in memory (singleton)."""
        if self.model is None and not self._is_loading:
            self._is_loading = True
            try:
                logger.info(f"Loading faster-whisper model: {self.model_size} ({self.device}, {self.compute_type})...")
                self.model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type,
                    cpu_threads=4
                )
                logger.info("faster-whisper model loaded successfully!")
            except Exception as e:
                logger.error(f"Failed to load {self.model_size} model: {e}. Falling back to 'base' model...")
                try:
                    self.model_size = "base"
                    self.model = WhisperModel("base", device="cpu", compute_type="int8")
                except Exception as fallback_err:
                    logger.critical(f"Fallback model also failed: {fallback_err}")
                    raise fallback_err
            finally:
                self._is_loading = False
        return self.model

    def transcribe(
        self,
        audio_input: Union[str, bytes, io.BytesIO],
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes speech audio into text and detects language (e.g. 'te' for Telugu, 'en' for English).
        
        Args:
            audio_input: File path, raw bytes, or BytesIO buffer containing audio (wav, mp3, webm, ogg).
            language: Optional ISO language code ('te', 'en'). If None, automatically detected.
            
        Returns:
            Dict containing:
                text: Transcribed string
                language: Detected or provided language ('te', 'en', etc.)
                language_probability: Detection confidence (0.0 to 1.0)
                duration: Audio length in seconds
        """
        model = self.load_model()
        temp_file_path = None

        try:
            if isinstance(audio_input, (bytes, bytearray)):
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                    tmp.write(audio_input)
                    temp_file_path = tmp.name
                target_path = temp_file_path
            elif isinstance(audio_input, io.BytesIO):
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                    tmp.write(audio_input.getvalue())
                    temp_file_path = tmp.name
                target_path = temp_file_path
            else:
                target_path = audio_input

            # Run transcription with automatic language detection
            segments, info = model.transcribe(
                target_path,
                beam_size=5,
                language=language,
                vad_filter=True, # Voice Activity Detection filters out silence
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            transcribed_segments = []
            for seg in segments:
                transcribed_segments.append(seg.text)

            full_text = " ".join(transcribed_segments).strip()

            detected_lang = info.language
            prob = round(float(info.language_probability), 3)

            return {
                "text": full_text,
                "language": detected_lang,
                "language_probability": prob,
                "duration": round(float(info.duration), 2)
            }
        except Exception as e:
            logger.error(f"Error during audio transcription: {e}")
            return {
                "text": "",
                "language": "en",
                "language_probability": 0.0,
                "duration": 0.0,
                "error": str(e)
            }
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except OSError:
                    pass

# Singleton instance
stt_engine = LocalSpeechToTextEngine.get_instance()
