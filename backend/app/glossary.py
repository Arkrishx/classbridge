import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from backend.app.config import settings

class DomainAdaptationGlossary:
    """
    Domain Adaptation Layer for STEM Lectures.
    Applies post-MT glossary corrections and identifies STEM technical terms
    to ensure precise scientific and mathematical vernacular translations.
    """
    def __init__(self, glossary_file: Optional[Path] = None):
        self.glossary_path = glossary_file or settings.GLOSSARY_PATH
        self.terms: Dict[str, Dict[str, Any]] = {}
        self.load_glossary()

    def load_glossary(self):
        try:
            if self.glossary_path.exists():
                with open(self.glossary_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.terms = data.get("terms", {})
            else:
                self.terms = {}
        except Exception as e:
            print(f"[Glossary] Error loading glossary: {e}")
            self.terms = {}

    def normalize_acoustic_transcript(self, text: str) -> str:
        """Corrects common ASR pronunciation errors in STEM terms (e.g. radiant descent -> gradient descent)"""
        if not text:
            return ""
        corrections = [
            (re.compile(r'\b(?:radiant|radian|radial)\s+descent\b', re.I), "gradient descent"),
            (re.compile(r'\bgradient\s+(?:percent|resent|present)\b', re.I), "gradient descent"),
            (re.compile(r'\b(?:iron|ion|icon)\s+vectors?\b', re.I), "eigenvector"),
            (re.compile(r'\b(?:iron|ion|icon)\s+values?\b', re.I), "eigenvalue"),
            (re.compile(r'\b(?:lost|laws|law\'?s)\s+functions?\b', re.I), "loss function"),
            (re.compile(r'\b(?:cause|costs)\s+functions?\b', re.I), "cost function"),
            (re.compile(r'\b(?:bag|back)\s+(?:propagation|proportion)\b', re.I), "backpropagation"),
            (re.compile(r'\b(?:running|earning)\s+rates?\b', re.I), "learning rate"),
            (re.compile(r'\b(?:an\s+trophy|anthropos)\b', re.I), "entropy"),
            (re.compile(r'\b(?:photo\s+synthesis|photo\s+synthetic)\b', re.I), "photosynthesis"),
            (re.compile(r'\b(?:can\s+duction|con\s+duction)\b', re.I), "conduction"),
            (re.compile(r'\b(?:moral|new\s*real)\s+nets?\b', re.I), "neural net"),
            (re.compile(r'\bdeep\s+running\b', re.I), "deep learning"),
            (re.compile(r'\bhigh\s+pothesis\b', re.I), "hypothesis"),
            (re.compile(r'\bstandard\s+(?:aviation|naviation)\b', re.I), "standard deviation"),
        ]
        result = text
        for pattern, replacement in corrections:
            result = pattern.sub(replacement, result)
        return result

    def get_all_terms(self) -> Dict[str, Dict[str, Any]]:
        return self.terms

    def detect_terms_in_text(self, text: str) -> List[Dict[str, Any]]:
        """Finds all STEM terms present in the English source text."""
        detected = []
        normalized = self.normalize_acoustic_transcript(text)
        lower_text = normalized.lower()
        
        # Sort terms by length descending to match longest phrases first (e.g. 'stochastic gradient descent' before 'gradient descent')
        sorted_keys = sorted(self.terms.keys(), key=lambda k: len(k), reverse=True)
        
        for term_key in sorted_keys:
            pattern = r'\b' + re.escape(term_key) + r'\b'
            if re.search(pattern, lower_text):
                info = self.terms[term_key]
                detected.append({
                    "term": term_key,
                    "en": info.get("en", term_key.title()),
                    "category": info.get("category", "General STEM"),
                    "definition": info.get("definition", ""),
                    "translations": {
                        "ta": info.get("ta"),
                        "ml": info.get("ml"),
                        "hi": info.get("hi"),
                    }
                })
        return detected

    def apply_domain_adaptation(
        self,
        en_text: str,
        vernacular_text: str,
        target_lang: str = "ta"
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Post-MT correction pass:
        1. Identifies technical vocabulary in en_text.
        2. Ensures the vernacular translation accurately embeds or aligns the canonical STEM definition.
        3. Returns corrected text and list of domain-adapted terms.
        """
        detected = self.detect_terms_in_text(en_text)
        if not detected:
            return vernacular_text, []

        adapted_text = vernacular_text
        adapted_terms_info = []

        for item in detected:
            target_term = item["translations"].get(target_lang)
            if not target_term:
                # Fallback to Tamil if target lang missing
                target_term = item["translations"].get("ta", item["en"])

            adapted_terms_info.append({
                "term": item["term"],
                "en": item["en"],
                "adapted_vernacular": target_term,
                "category": item["category"],
                "definition": item["definition"]
            })

            # Check if vernacular translation already contains the term or phonetic transliteration
            en_term = item["term"]
            # Look for generic translations or English loan word occurrences in the MT output
            # If MT output kept raw english term, replace it with domain-adapted bilingual version
            pattern = re.compile(r'\b' + re.escape(en_term) + r'\b', re.IGNORECASE)
            if pattern.search(adapted_text):
                adapted_text = pattern.sub(target_term, adapted_text)

        return adapted_text, adapted_terms_info

# Global singleton
glossary_engine = DomainAdaptationGlossary()
