import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

# Automatically read backend/.env if present
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    try:
        with open(_env_file, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip().strip("'").strip('"'))
    except Exception:
        pass

class Settings(BaseModel):
    PROJECT_NAME: str = "ClassBridge - Real-Time Vernacular Lecture Companion"
    VERSION: str = "1.0.0"
    
    # Whisper ASR Settings
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    SAMPLE_RATE: int = 16000
    CHUNK_DURATION_SEC: float = 3.0
    
    # Translation Settings (Config-driven, defaults to Tamil 'ta')
    DEFAULT_TARGET_LANG: str = os.getenv("DEFAULT_TARGET_LANG", "ta")
    SUPPORTED_LANGUAGES: dict = {
        "en": {"name": "English", "native": "English", "nllb": "eng_Latn"},
        "ta": {"name": "Tamil", "native": "தமிழ்", "nllb": "tam_Taml"},
        "ml": {"name": "Malayalam", "native": "മലയാളം", "nllb": "mal_Mlym"},
        "hi": {"name": "Hindi", "native": "हिन्दी", "nllb": "hin_Deva"}
    }
    
    # Domain Adaptation Glossary Path
    GLOSSARY_PATH: Path = BASE_DIR / "app" / "data" / "stem_glossary.json"
    
    # LLM & API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list = ["*"]

settings = Settings()
