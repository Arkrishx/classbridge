import logging
from typing import Dict, Any, Optional, List
from deep_translator import GoogleTranslator
from backend.app.config import settings
from backend.app.glossary import glossary_engine

logger = logging.getLogger("classbridge.translator")

class TranslationService:
    """
    Config-driven Machine Translation service supporting any-to-any bidirectional
    translation across English, Tamil, Malayalam, and Hindi, with STEM domain adaptation.
    """
    def __init__(self, default_target: str = settings.DEFAULT_TARGET_LANG):
        self.default_target = default_target
        self._translators: Dict[str, GoogleTranslator] = {}

    def _get_translator(self, source_lang: str, target_lang: str) -> GoogleTranslator:
        key = f"{source_lang}->{target_lang}"
        if key not in self._translators:
            self._translators[key] = GoogleTranslator(source=source_lang, target=target_lang)
        return self._translators[key]

    def translate(
        self,
        text: str,
        target_lang: Optional[str] = None,
        source_lang: Optional[str] = "en"
    ) -> Dict[str, Any]:
        return self.translate_segment(text, target_lang=target_lang, source_lang=source_lang)

    def translate_segment(
        self,
        text: str,
        target_lang: Optional[str] = None,
        source_lang: Optional[str] = "en"
    ) -> Dict[str, Any]:
        """
        Translates text between any supported language pair (e.g. en->ta, ta->en, ml->en, hi->en)
        and applies domain adaptation post-processing.
        """
        tgt = (target_lang or self.default_target).lower()
        src = (source_lang or "en").lower()
        clean_text = text.strip()
        
        if not clean_text:
            return {
                "original": text,
                "raw_translation": "",
                "adapted_translation": "",
                "source_lang": src,
                "target_lang": tgt,
                "domain_terms": []
            }

        # Normalize ASR acoustic pronunciation errors if English source
        if src == "en":
            clean_text = glossary_engine.normalize_acoustic_transcript(clean_text)

        # If source and target language are identical, return identity directly
        if src == tgt:
            return {
                "original": clean_text,
                "raw_translation": clean_text,
                "adapted_translation": clean_text,
                "source_lang": src,
                "target_lang": tgt,
                "domain_terms": []
            }

        raw_translation = ""
        try:
            translator = self._get_translator(src, tgt)
            raw_translation = translator.translate(clean_text)
        except Exception as e:
            logger.warning(f"Translation failed for '{clean_text}' ({src}->{tgt}): {e}. Using fallback identity.")
            raw_translation = clean_text

        # Domain Adaptation pass:
        if src == "en":
            adapted_translation, domain_terms = glossary_engine.apply_domain_adaptation(
                en_text=clean_text,
                vernacular_text=raw_translation,
                target_lang=tgt
            )
        else:
            adapted_translation = raw_translation
            domain_terms = []

        return {
            "original": clean_text,
            "raw_translation": raw_translation,
            "adapted_translation": adapted_translation,
            "source_lang": src,
            "target_lang": tgt,
            "domain_terms": domain_terms
        }

    def translate_all_targets(
        self,
        text: str,
        source_lang: Optional[str] = "en",
        target_languages: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Translates text to all target Indic languages (ta, ml, hi) and English,
        returning a multi-language map optimized for classroom broadcast.
        """
        targets = target_languages or ["ta", "ml", "hi", "en"]
        src = (source_lang or "en").lower()
        clean_text = text.strip()
        
        translations = {}
        all_domain_terms = []

        for tgt in targets:
            res = self.translate_segment(clean_text, target_lang=tgt, source_lang=src)
            translations[tgt] = res["adapted_translation"]
            if res["domain_terms"] and not all_domain_terms:
                all_domain_terms = res["domain_terms"]

        # Ensure source text is mapped
        if src not in translations:
            translations[src] = clean_text

        return {
            "text_source": clean_text,
            "translations": translations,
            "domain_terms": all_domain_terms
        }

# Global singleton
translator_service = TranslationService()
