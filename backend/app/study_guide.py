import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.config import settings
from backend.app.glossary import glossary_engine

logger = logging.getLogger("classbridge.study_guide")

class StudyGuideGenerator:
    """
    Synthesizes session transcripts into a comprehensive structured study guide:
    - Executive Overview
    - Key Definitions (bilingual with domain-adapted Indic terms)
    - Formulas & Mathematical Equations
    - Bulleted Key Takeaways
    - Interactive Review Flashcards
    """

    def generate(
        self,
        segments: List[Dict[str, Any]],
        target_lang: str = "ta"
    ) -> Dict[str, Any]:
        if not segments:
            return self._generate_empty_guide(target_lang)

        # Combine text for analysis
        full_text_en = " ".join(s.get("text_en", "") for s in segments)
        
        # 1. Try LLM synthesis if API key is provided
        llm_result = self._try_llm_synthesis(segments, full_text_en, target_lang)
        if llm_result:
            detected_terms = glossary_engine.detect_terms_in_text(full_text_en)
            llm_result.setdefault("diagram", self._build_concept_diagram(detected_terms, llm_result.get("formulas", [])))
            return llm_result

        # 2. Robust Heuristic & Domain-Adapted Synthesis Fallback
        return self._heuristic_synthesis(segments, full_text_en, target_lang)

    def _heuristic_synthesis(
        self,
        segments: List[Dict[str, Any]],
        full_text_en: str,
        target_lang: str
    ) -> Dict[str, Any]:
        """
        Guaranteed fallback synthesis using domain glossary matching,
        formula extraction regex, and linguistic summarization.
        """
        # Detect all domain terms in transcript
        detected_terms = glossary_engine.detect_terms_in_text(full_text_en)
        
        # Infer topic from detected terms or text
        topic = "STEM Lecture Session"
        if detected_terms:
            top_category = detected_terms[0].get("category", "STEM")
            topic = f"{top_category}: {detected_terms[0]['en']} & Core Concepts"

        # Build definitions
        definitions = []
        for term_info in detected_terms[:8]:
            trans = term_info["translations"].get(target_lang) or term_info["translations"].get("ta", term_info["en"])
            if target_lang == "ml":
                v_def = f"{trans} എന്നത് {term_info['definition']}"
            elif target_lang == "hi":
                v_def = f"{trans}: {term_info['definition']}"
            else:
                v_def = f"{trans} என்பது {term_info['definition']}"
            definitions.append({
                "term": term_info["en"],
                "vernacular_term": trans,
                "category": term_info["category"],
                "definition": term_info["definition"],
                "vernacular_definition": v_def
            })

        # Extract or infer STEM formulas
        formulas = self._extract_formulas(full_text_en, detected_terms)
        diagram = self._build_concept_diagram(detected_terms, formulas)

        # Generate bulleted takeaways from segments
        takeaways = []
        for i, seg in enumerate(segments[:6]):
            takeaways.append({
                "point": seg.get("text_en", "").strip(),
                "vernacular_point": seg.get("text_vernacular", "").strip(),
                "timestamp": seg.get("timestamp", f"00:{i*15:02d}")
            })

        # Generate flashcards for self-testing
        flashcards = []
        fc_id = 1
        for d in definitions[:5]:
            if target_lang == "ml":
                q_v = f"{d['vernacular_term']} എന്നാൽ എന്താണ്?"
            elif target_lang == "hi":
                q_v = f"{d['vernacular_term']} क्या है?"
            else:
                q_v = f"{d['vernacular_term']} என்றால் என்ன?"

            flashcards.append({
                "id": fc_id,
                "front": f"What is {d['term']}?",
                "vernacular_front": q_v,
                "back": d["definition"],
                "category": d["category"]
            })
            fc_id += 1

        for f in formulas[:3]:
            if target_lang == "ml":
                q_vf = f"{f['name']} സമവാക്യം / സൂത്രം"
            elif target_lang == "hi":
                q_vf = f"{f['name']} का सूत्र / समीकरण"
            else:
                q_vf = f"{f['name']} இன் சமன்பாடு / சூத்திரம்"

            flashcards.append({
                "id": fc_id,
                "front": f"Formula for {f['name']}",
                "vernacular_front": q_vf,
                "back": f"{f['latex']} — {f['description']}",
                "category": "Formulas"
            })
            fc_id += 1

        lang_meta = settings.SUPPORTED_LANGUAGES.get(target_lang, {"name": "Tamil", "native": "தமிழ்"})
        if target_lang == "ml":
            v_overview = f"{len(segments)} പ്രഭാഷണ ഭാഗങ്ങളിൽ നിന്ന് തയ്യാറാക്കിയ സമഗ്രമായ STEM പഠന സഹായി."
        elif target_lang == "hi":
            v_overview = f"{len(segments)} व्याख्यान खंडों से तैयार की गई व्यापक STEM अध्ययन मार्गदर्शिका।"
        else:
            v_overview = f"{len(segments)} விரிவுரை பகுதிகளிலிருந்து தொகுக்கப்பட்ட விரிவான STEM படிப்பு வழிகாட்டி."

        return {
            "title": topic,
            "date": datetime.now().strftime("%B %d, %Y"),
            "target_language": lang_meta["name"],
            "native_language": lang_meta["native"],
            "overview": {
                "en": f"Comprehensive lecture study guide synthesized from {len(segments)} transcript segments focusing on foundational STEM concepts, definitions, and equations.",
                "vernacular": v_overview
            },
            "definitions": definitions,
            "formulas": formulas,
            "diagram": diagram,
            "takeaways": takeaways,
            "flashcards": flashcards,
            "segment_count": len(segments)
        }

    def _extract_formulas(self, text: str, detected_terms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formulas = []
        lower = text.lower()

        # Known standard STEM formulas linked to detected terms
        if any("gradient descent" in t["term"] or "loss" in t["term"] for t in detected_terms) or "gradient" in lower:
            formulas.append({
                "name": "Gradient Descent Parameter Update",
                "latex": "θ_{t+1} = θ_t - η ∇J(θ_t)",
                "description": "Updates model parameter θ in the opposite direction of the gradient ∇J with learning rate η.",
                "variables": "θ: parameter vector, η: learning rate, ∇J: gradient of cost function"
            })

        if any("eigenvalue" in t["term"] or "matrix" in t["term"] for t in detected_terms) or "eigen" in lower:
            formulas.append({
                "name": "Eigenvalue Characteristic Equation",
                "latex": "A v = λ v  ⟺  det(A - λ I) = 0",
                "description": "Defines eigenvalue λ and eigenvector v for square matrix A.",
                "variables": "A: n×n matrix, v: eigenvector, λ: eigenvalue scalar, I: identity matrix"
            })

        if any("kinetic energy" in t["term"] or "momentum" in t["term"] for t in detected_terms) or "energy" in lower:
            formulas.append({
                "name": "Kinetic Energy & Momentum Relation",
                "latex": "K = \\frac{1}{2} m v^2 = \\frac{p^2}{2m}",
                "description": "Relates kinetic energy K to mass m, velocity v, and momentum p.",
                "variables": "K: kinetic energy, m: mass, v: velocity, p: linear momentum"
            })

        if any("photosynthesis" in t["term"] for t in detected_terms) or "photosynthesis" in lower:
            formulas.append({
                "name": "Photosynthesis Chemical Equation",
                "latex": "6 CO_2 + 6 H_2O + \\text{light} \\rightarrow C_6H_{12}O_6 + 6 O_2",
                "description": "Conversion of carbon dioxide and water into glucose and oxygen via sunlight.",
                "variables": "CO2: carbon dioxide, H2O: water, C6H12O6: glucose, O2: oxygen"
            })

        if any("complexity" in t["term"] or "search" in t["term"] for t in detected_terms) or "binary search" in lower:
            formulas.append({
                "name": "Binary Search Time Complexity",
                "latex": "T(n) = T(n/2) + O(1) \\implies T(n) = O(\\log_2 n)",
                "description": "Recurrence relation for halving the search space per comparison step.",
                "variables": "n: number of elements, T(n): running time"
            })

        return formulas

    def _build_concept_diagram(self, detected_terms: List[Dict[str, Any]], formulas: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build a grounded concept flow from terms actually found in the transcript."""
        nodes = [{
            "id": "lecture",
            "label": "Lecture Concepts",
            "detail": "Transcript"
        }]
        edges = []
        for index, term in enumerate(detected_terms[:6], start=1):
            node_id = f"concept_{index}"
            nodes.append({
                "id": node_id,
                "label": term.get("en", "Concept"),
                "detail": term.get("category", "STEM")
            })
            edges.append({"from": "lecture", "to": node_id})
        if formulas:
            nodes.append({"id": "formula", "label": "Applied Formula", "detail": formulas[0].get("name", "Formula")})
            edges.append({"from": "lecture", "to": "formula"})
        return {
            "title": "Grounded Lecture Concept Map",
            "nodes": nodes,
            "edges": edges,
            "source": "Generated only from detected transcript concepts and formulas"
        }

    def _try_llm_synthesis(
        self,
        segments: List[Dict[str, Any]],
        full_text_en: str,
        target_lang: str
    ) -> Optional[Dict[str, Any]]:
        gemini_key = settings.GEMINI_API_KEY
        if not gemini_key:
            return None

        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            lang_meta = settings.SUPPORTED_LANGUAGES.get(target_lang, {"name": "Tamil", "native": "தமிழ்"})
            lang_name = lang_meta.get("name", "Tamil")
            lang_native = lang_meta.get("native", "தமிழ்")

            prompt = f"""You are ClassBridge, an expert AI educational assistant specialized in STEM instruction.
Synthesize a comprehensive, high-quality, structured lecture study guide from the following lecture transcript.
The student's target vernacular language is '{lang_name}' ({lang_native}, code: '{target_lang}').

Lecture Transcript:
{full_text_en}

Generate rich, accurate academic content directly from this transcript.
Return ONLY valid JSON matching this exact JSON schema:
{{
  "title": "<Concise descriptive title of this specific lecture>",
  "date": "{datetime.now().strftime('%B %d, %Y')}",
  "target_language": "{lang_name}",
  "native_language": "{lang_native}",
  "overview": {{
    "en": "<Comprehensive 2-4 sentence executive overview of what was taught in English>",
    "vernacular": "<Comprehensive 2-4 sentence executive overview translated accurately into {lang_name}>"
  }},
  "diagram": {{
    "title": "<Lecture Concept Map>",
    "source": "AI Concept Map generated by Gemini",
    "nodes": [
      {{
        "id": "concept_1",
        "label": "<Key Concept / Step 1>",
        "detail": "<Category or brief 2-3 word relation>"
      }},
      {{
        "id": "concept_2",
        "label": "<Key Concept / Step 2>",
        "detail": "<Category or brief 2-3 word relation>"
      }}
    ],
    "edges": [
      {{"from": "concept_1", "to": "concept_2"}}
    ]
  }},
  "definitions": [
    {{
      "term": "<English technical term>",
      "vernacular_term": "<Vernacular translation with English in parentheses, e.g. சரிவு இறக்கம் (Gradient Descent)>",
      "category": "<STEM Domain e.g. Machine Learning, Physics, Mathematics, Computer Science>",
      "definition": "<Clear English textbook definition>",
      "vernacular_definition": "<Clear vernacular explanation in {lang_name}>"
    }}
  ],
  "formulas": [
    {{
      "name": "<Formula or Law name>",
      "latex": "<Clean LaTeX equation string>",
      "description": "<Clear explanation of what the formula computes>",
      "variables": "<Variables list e.g. m: mass, v: velocity>"
    }}
  ],
  "takeaways": [
    {{
      "point": "<Bulleted key takeaway in English>",
      "vernacular_point": "<Bulleted key takeaway in {lang_name}>",
      "timestamp": "<Approximate timestamp or step>"
    }}
  ],
  "flashcards": [
    {{
      "id": 1,
      "front": "<Exam review question in English>",
      "vernacular_front": "<Exam review question in {lang_name}>",
      "back": "<Accurate concise answer in English and {lang_name}>",
      "category": "<Domain Category>"
    }}
  ]
}}
"""
            models_to_try = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash"]
            data = None
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=dict(response_mime_type="application/json")
                    )
                    if response and response.text:
                        data = json.loads(response.text)
                        logger.info(f"Successfully generated study guide with Gemini model {model_name}")
                        break
                except Exception as model_err:
                    logger.warning(f"Gemini model {model_name} failed: {model_err}, trying next model...")

            if not data:
                return None

            data["segment_count"] = len(segments)

            # Ensure diagram has nodes
            detected_terms = glossary_engine.detect_terms_in_text(full_text_en)
            if not data.get("diagram") or not data.get("diagram", {}).get("nodes"):
                data["diagram"] = self._build_concept_diagram(detected_terms, data.get("formulas", []))

            # Build visuals (diagram cards / SVG visual aids)
            lower_text = full_text_en.lower()
            formulas = data.get("formulas", [])
            primary_eq = formulas[0] if formulas else None

            # Always construct rich visual explanation package
            visuals = {}
            if primary_eq and primary_eq.get("latex"):
                visuals["equation"] = {
                    "latex": primary_eq["latex"],
                    "caption": f"Parameter equation: {primary_eq.get('name', 'Formula')}"
                }
            elif any("gradient" in lower_text or "loss" in lower_text for _ in [1]):
                visuals["equation"] = {
                    "latex": "θ_{t+1} = θ_t - η ∇J(θ_t)",
                    "caption": "Parameter update equation: Gradient Descent"
                }

            if any(k in lower_text for k in ["thermodynamic", "heat", "internal energy", "conduction", "convection", "radiation"]):
                visuals["thermoCycle"] = {
                    "caption": "First Law energy conservation: heat input converts to internal energy change and work output."
                }
            elif any(k in lower_text for k in ["photosynthesis", "chloroplast", "calvin", "thylakoid", "glucose"]):
                visuals["photosynthesis"] = {
                    "caption": "Dual-phase pathway: thylakoid light reactions coupled with stroma Calvin cycle."
                }
            elif any(k in lower_text for k in ["eigenvalue", "eigenvector", "matrix", "linear algebra"]):
                visuals["vectorTransform"] = {
                    "caption": "Linear transformation scaling eigenvector v along its span by factor λ."
                }
            elif any(k in lower_text for k in ["gradient", "loss", "train", "epoch", "neural", "optim"]):
                visuals["lossCurve"] = {
                    "caption": "Cost function decreases toward minimum as iterations increase."
                }
                visuals["network"] = {
                    "caption": "Forward signal propagation and backward error gradient updates."
                }
            else:
                visuals["conceptFlow"] = {
                    "caption": "Sequential progression and hierarchy of core lecture principles."
                }

            if visuals:
                data["visuals"] = visuals

            return data
        except Exception as e:
            logger.warning(f"LLM study guide synthesis failed: {e}. Using deterministic fallback.")
            return None

    def _generate_empty_guide(self, target_lang: str) -> Dict[str, Any]:
        lang_meta = settings.SUPPORTED_LANGUAGES.get(target_lang, {"name": "Tamil", "native": "தமிழ்"})
        if target_lang == "ml":
            empty_v = "പഠന സഹായി നിർമ്മിക്കുന്നതിന് മൈക്രോഫോൺ പ്രവർത്തിപ്പിക്കുക അല്ലെങ്കിൽ സാമ്പിൾ പ്രഭാഷണം ലോഡ് ചെയ്യുക."
        elif target_lang == "hi":
            empty_v = "अध्ययन मार्गदर्शिका तैयार करने के लिए कृपया माइक्रोफ़ोन शुरू करें या एक नमूना व्याख्यान लोड करें।"
        else:
            empty_v = "படிப்பு வழிகாட்டியை உருவாக்க ஒலிவாங்கியை இயக்கவும் அல்லது மாதிரி விரிவுரையை ஏற்றவும்."

        return {
            "title": "No Lecture Transcript Recorded Yet",
            "date": datetime.now().strftime("%B %d, %Y"),
            "target_language": lang_meta["name"],
            "native_language": lang_meta["native"],
            "overview": {
                "en": "Please start the microphone or load a sample lecture to record transcript segments before generating a study guide.",
                "vernacular": empty_v
            },
            "definitions": [],
            "formulas": [],
            "diagram": {"title": "No concepts detected", "nodes": [], "edges": [], "source": "No transcript available"},
            "takeaways": [],
            "flashcards": [],
            "segment_count": 0
        }

# Global singleton
study_guide_generator = StudyGuideGenerator()
