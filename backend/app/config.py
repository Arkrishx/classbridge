import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

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
        "ta": {"name": "Tamil", "native": "தமிழ்", "nllb": "tam_Taml"},
        "hi": {"name": "Hindi", "native": "हिन्दी", "nllb": "hin_Deva"},
        "te": {"name": "Telugu", "native": "తెలుగు", "nllb": "tel_Telu"},
        "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "nllb": "kan_Knda"},
        "ml": {"name": "Malayalam", "native": "മലയാളം", "nllb": "mal_Mlym"},
        "bn": {"name": "Bengali", "native": "বাংলা", "nllb": "ben_Beng"},
        "mr": {"name": "Marathi", "native": "मराठी", "nllb": "mar_Deva"},
        "gu": {"name": "Gujarati", "native": "ગુજરાતી", "nllb": "guj_Gujr"}
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
