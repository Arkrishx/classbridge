import logging
from typing import Dict, Any, Optional
from deep_translator import GoogleTranslator
from backend.app.config import settings
from backend.app.glossary import glossary_engine

logger = logging.getLogger("classbridge.translator")

class TranslationService:
    """
    Config-driven Machine Translation service for Indic languages.
    Translates English ASR segments into target vernacular (default Tamil)
    and passes output through the STEM Domain Adaptation layer.
    """
    def __init__(self, default_target: str = settings.DEFAULT_TARGET_LANG):
        self.default_target = default_target
        self._translators: Dict[str, GoogleTranslator] = {}

    def _get_translator(self, target_lang: str) -> GoogleTranslator:
        if target_lang not in self._translators:
            self._translators[target_lang] = GoogleTranslator(source="en", target=target_lang)
        return self._translators[target_lang]

    def translate_segment(
        self,
        text: str,
        target_lang: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Translates English text to target Indic language and applies
        domain adaptation post-processing.
        """
        lang = target_lang or self.default_target
        clean_text = text.strip()
        
        if not clean_text:
            return {
                "original": text,
                "raw_translation": "",
                "adapted_translation": "",
                "target_lang": lang,
                "domain_terms": []
            }

        raw_translation = ""
        try:
            translator = self._get_translator(lang)
            raw_translation = translator.translate(clean_text)
        except Exception as e:
            logger.warning(f"Translation failed for '{clean_text}': {e}. Using fallback transliteration/identity.")
            raw_translation = clean_text

        # Domain Adaptation pass:
        adapted_translation, domain_terms = glossary_engine.apply_domain_adaptation(
            en_text=clean_text,
            vernacular_text=raw_translation,
            target_lang=lang
        )

        return {
            "original": clean_text,
            "raw_translation": raw_translation,
            "adapted_translation": adapted_translation,
            "target_lang": lang,
            "domain_terms": domain_terms
        }

# Global singleton
translator_service = TranslationService()
