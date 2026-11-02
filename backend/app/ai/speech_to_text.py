"""
AIRA - Multilingual Speech-to-Text Recognition Engine (faster-whisper)
Performs fully offline, high-accuracy speech-to-text with support for:
- Telugu (తెలుగు) + English loanwords
- Hindi (हिन्दी) + English loanwords
- English
- Tamil (தமிழ்) + English loanwords
- Malayalam (മലയാളം) + English loanwords
Using faster-whisper CTranslate2 backend on CPU.
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

LANGUAGE_PROMPTS = {
    "te": "AIRA retail supermarket store sales billing stock inventory price Telugu డిమాండ్ అమ్మకాలు బియ్యం నూనె పాలు చక్కెర ధర",
    "hi": "AIRA retail supermarket store sales billing stock inventory price Hindi बिक्री स्टॉक भाव दाम चावल तेल दूध चीनी",
    "ta": "AIRA retail supermarket store sales billing stock inventory price Tamil விற்பனை இருப்பு விலை அரிசி எண்ணெய் பால் சர்க்கரை",
    "ml": "AIRA retail supermarket store sales billing stock inventory price Malayalam വിൽപ്പന സ്റ്റോക്ക് വില അരി എണ്ണ പാൽ പഞ്ചസാര",
    "en": "AIRA retail supermarket store sales billing stock inventory price items orders profit margin revenue"
}

DEFAULT_MULTILINGUAL_PROMPT = (
    "AIRA retail supermarket store sales billing stock inventory price "
    "Telugu అమ్మకాలు బియ్యం నూనె Hindi बिक्री चावल तेल Tamil விற்பனை அரிசி Malayalam വിൽപ്പന അരി"
)

SUPPORTED_LANGUAGES = {"te", "hi", "en", "ta", "ml"}

class LocalSpeechToTextEngine:
    _instance: Optional['LocalSpeechToTextEngine'] = None

    def __init__(self, model_size: str = "small", device: Optional[str] = None, compute_type: Optional[str] = None):
        import ctranslate2
        has_cuda = ctranslate2.get_cuda_device_count() > 0

        self.model_size = os.getenv("WHISPER_MODEL", model_size)
        self.device = os.getenv("WHISPER_DEVICE", "cuda" if has_cuda else "cpu")
        self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "float16" if has_cuda else "int8")
        self.model: Optional[WhisperModel] = None
        self._is_loading = False

    @classmethod
    def get_instance(cls) -> 'LocalSpeechToTextEngine':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self) -> WhisperModel:
        """Loads and caches the faster-whisper model in GPU VRAM (or CPU) in memory (singleton)."""
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
                logger.info(f"faster-whisper model loaded successfully on {self.device}!")
            except Exception as e:
                logger.error(f"Failed to load {self.model_size} model on {self.device}: {e}. Falling back to 'cpu'...")
                try:
                    self.device = "cpu"
                    self.compute_type = "int8"
                    self.model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
                except Exception as fallback_err:
                    logger.critical(f"Fallback model also failed: {fallback_err}")
                    raise fallback_err
            finally:
                self._is_loading = False
        return self.model

    def _normalize_lang_code(self, lang_code: Optional[str]) -> Optional[str]:
        if not lang_code:
            return None
        code = lang_code.strip().lower()
        if code.startswith("te"):
            return "te"
        if code.startswith("hi"):
            return "hi"
        if code.startswith("ta"):
            return "ta"
        if code.startswith("ml"):
            return "ml"
        if code.startswith("en"):
            return "en"
        return code[:2]

    def transcribe(
        self,
        audio_input: Union[str, bytes, io.BytesIO],
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes speech audio into text supporting:
        Telugu, Hindi, English, Tamil, and Malayalam with English retail loanwords.
        
        Args:
            audio_input: File path, raw bytes, or BytesIO buffer containing audio (.webm, .wav, .ogg, .mp3).
            language: Optional ISO language code ('te', 'hi', 'en', 'ta', 'ml').
            
        Returns:
            Dict containing:
                text: Transcribed string in native script
                language: Detected or provided language ('te', 'hi', 'ta', 'ml', 'en')
                language_probability: Detection confidence (0.0 to 1.0)
                duration: Audio length in seconds
        """
        model = self.load_model()
        temp_file_path = None
        clean_lang = self._normalize_lang_code(language)

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

            # Select domain priming prompt matching target language
            prime_prompt = LANGUAGE_PROMPTS.get(clean_lang, DEFAULT_MULTILINGUAL_PROMPT)

            # Transcribe with language constraint and gentle VAD (1000ms pause tolerance, 0.25 threshold)
            segments, info = model.transcribe(
                target_path,
                beam_size=5,
                language=clean_lang if (clean_lang and clean_lang in SUPPORTED_LANGUAGES) else None,
                temperature=0.0,
                condition_on_previous_text=False,
                initial_prompt=prime_prompt,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=1000, threshold=0.25)
            )

            transcribed_segments = []
            for seg in segments:
                transcribed_segments.append(seg.text)

            full_text = " ".join(transcribed_segments).strip()

            # Fallback check: if forced regional language produced empty text (e.g. user spoke English while Telugu was selected),
            # retry with open auto-language detection
            if not full_text and clean_lang and clean_lang != "en":
                logger.info(f"Forced language '{clean_lang}' produced empty transcript. Retrying with auto-detection...")
                retry_segments, retry_info = model.transcribe(
                    target_path,
                    beam_size=5,
                    language=None,
                    temperature=0.0,
                    condition_on_previous_text=False,
                    initial_prompt="AIRA retail supermarket store sales billing stock inventory price items orders",
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=1000, threshold=0.25)
                )
                retry_texts = [seg.text for seg in retry_segments]
                retry_full = " ".join(retry_texts).strip()
                if retry_full:
                    full_text = retry_full
                    info = retry_info

            detected_lang = clean_lang if clean_lang else info.language
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
                "language": clean_lang or "en",
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
