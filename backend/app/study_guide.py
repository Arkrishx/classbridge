import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.config import settings
from backend.app.glossary import glossary_engine
from backend.app.rag import extract_json_from_response

logger = logging.getLogger("classbridge.study_guide")

QUANT_INDICATORS = [
    "equation", "formula", "law", "=", "+", "-", "*", "/", "calcul", "deriv",
    "gradient", "loss", "matrix", "vector", "energy", "heat", "force", "mass", "rate", "reaction",
    "logic", "gate", "boolean", "circuit", "algorithm", "complexity", "search", "sort", "tree",
    "binary", "network", "system", "model", "function", "variable", "parameter", "ohm", "voltage",
    "current", "resistance", "power", "bayes", "probability", "entropy", "variance", "optimi", "physics"
]

STEM_KB: Dict[str, Dict[str, str]] = {
    "glucose": {
        "term": "Glucose",
        "cat": "Biochemistry",
        "def": "A 6-carbon monosaccharide sugar (C6H12O6) serving as the primary cellular fuel oxidized during cellular respiration to synthesize ATP.",
        "ta": "குளுக்கோஸ் (Glucose) - செல்லுலார் ஆற்றல் உற்பத்திக்கு உதவும் முதன்மை மோனோசாக்கரைடு சர்க்கரை.",
        "ml": "ഗ്ലൂക്കോസ് (Glucose) - കോശ ശ്വസനത്തിന് ഉപയോഗിക്കുന്ന പ്രധാന ഊർജ്ജ പഞ്ചസാര.",
        "hi": "ग्लूकोज (Glucose) - कोशिकीय श्वसन में उपयोग होने वाली प्राथमिक ऊर्जा शर्करा।"
    },
    "cellular": {
        "term": "Cellular",
        "cat": "Cell Biology",
        "def": "Relating to the biological cell, the fundamental structural, functional, and metabolic unit of all living organisms.",
        "ta": "செல்லுலார் (Cellular) - உயிரினங்களின் அடிப்படை கட்டமைப்பு மற்றும் செயல்பாட்டு அலகு.",
        "ml": "കോശീയ (Cellular) - ജീവജാലങ്ങളുടെ ഘടനാപരമായ അടിസ്ഥാന ഘടകം.",
        "hi": "कोशिकीय (Cellular) - सभी जीवों की मौलिक संरचनात्मक और जैविक इकाई।"
    },
    "respiration": {
        "term": "Cellular Respiration",
        "cat": "Cell Biology",
        "def": "The catabolic biochemical process in cells that breaks down glucose in the presence of oxygen to generate usable ATP energy.",
        "ta": "செல்லுலார் சுவாசம் (Respiration) - குளுக்கோஸை ஆக்ஸிஜனேற்றம் செய்து ஏடிபி வடிவில் ஆற்றலை உருவாக்கும் முறை.",
        "ml": "കോശ ശ്വസനം (Respiration) - ഊർജ്ജം ഉത്പാദിപ്പിക്കുന്നതിനുള്ള രാസപ്രക്രിയ.",
        "hi": "श्वसन (Respiration) - ऊर्जा (ATP) उत्पन्न करने वाली कोशिकीय प्रक्रिया।"
    },
    "mitochondria": {
        "term": "Mitochondria",
        "cat": "Cell Biology",
        "def": "Double-membrane cellular organelles acting as the powerhouses of the cell, hosting the Krebs citric acid cycle and oxidative phosphorylation.",
        "ta": "மைட்டோகாண்ட்ரியா (Mitochondria) - செல்லின் ஆற்றல் மையம், ஏடிபி உற்பத்தியை நிகழ்த்துகிறது.",
        "ml": "മൈറ്റോകോൺഡ്രിയ (Mitochondria) - കോശത്തിന്റെ ഊർജ്ജ നിലയം.",
        "hi": "माइटोकॉन्ड्रिया (Mitochondria) - कोशिका का ऊर्जा घर (Powerhouse)।"
    },
    "mitochondrial": {
        "term": "Mitochondrial Matrix",
        "cat": "Cell Biology",
        "def": "The gel-like internal space bounded by the inner mitochondrial membrane containing enzymes for the Krebs cycle and mitochondrial DNA.",
        "ta": "மைட்டோகாண்ட்ரியல் மேட்ரிக்ஸ் (Mitochondrial Matrix) - கிரெப்ஸ் சுழற்சி நொதிகளைக் கொண்ட உட்சுவர் திரவம்.",
        "ml": "മൈറ്റോകോൺഡ്രിയൽ മാട്രിക്സ് (Mitochondrial Matrix) - ക്രെബ്സ് ചക്രം നടക്കുന്ന ഉൾഭാഗം.",
        "hi": "माइटोकॉन्ड्रियल मैट्रिक्स (Mitochondrial Matrix) - क्रेब्स चक्र का स्थान।"
    },
    "atp": {
        "term": "Adenosine Triphosphate (ATP)",
        "cat": "Biochemistry",
        "def": "Adenosine Triphosphate, the universal molecular energy currency of living cells utilized to drive cellular processes and synthesis.",
        "ta": "ஏடிபி (ATP) - செல்களின் உலகளாவிய வேதியியல் ஆற்றல் நாணயம்.",
        "ml": "എ.ടി.പി (ATP) - കോശങ്ങളുടെ സാർവത്രിക ഊർജ്ജ നാണയം.",
        "hi": "एटीपी (ATP) - कोशिकाओं की सार्वभौमिक ऊर्जा मुद्रा।"
    },
    "glycolysis": {
        "term": "Glycolysis",
        "cat": "Biochemistry",
        "def": "The 10-step enzymatic metabolic pathway in the cytoplasm converting one glucose molecule into two pyruvates, yielding net 2 ATP and 2 NADH.",
        "ta": "கிளைகோலிசிஸ் (Glycolysis) - குளுக்கோஸை பைருவேட்டாக உடைத்து ஆற்றல் உருவாக்கும் நிலை.",
        "ml": "ഗ്ലൈക്കോളിസിസ് (Glycolysis) - ഗ്ലൂക്കോസ് വിഘടിച്ച് പൈറുവേറ്റ് ആകുന്ന പ്രക്രിയ.",
        "hi": "ग्लाइकोलाइसिस (Glycolysis) - ग्लूकोज को पाइरूवेट में तोड़ने की प्रक्रिया।"
    },
    "pyruvate": {
        "term": "Pyruvate",
        "cat": "Biochemistry",
        "def": "A 3-carbon organic carboxylate produced by glycolysis that is transported into the mitochondrial matrix to fuel the Krebs cycle.",
        "ta": "பைருவேட் (Pyruvate) - கிளைகோலிசிஸில் உருவாகும் 3-கார்பன் கரிம அமிலம்.",
        "ml": "പൈറുവേറ്റ് (Pyruvate) - ഗ്ലൈക്കോളിസിസിന്റെ ഉൽപ്പന്നം.",
        "hi": "पाइरूवेट (Pyruvate) - ग्लाइकोलाइसिस का अंतिम 3-कार्बन उत्पाद।"
    },
    "krebs": {
        "term": "Krebs Cycle",
        "cat": "Cell Biology",
        "def": "The citric acid cycle in the mitochondrial matrix that oxidizes Acetyl-CoA, reducing NAD+ and FAD into high-energy electron carriers.",
        "ta": "கிரெப்ஸ் சுழற்சி (Krebs Cycle) - மைட்டோகாண்ட்ரியல் மேட்ரிக்ஸில் நிகழும் சிட்ரிக் அமில ஆக்சிஜனேற்ற சுழற்சி.",
        "ml": "ക്രെബ്സ് ചക്രം (Krebs Cycle) - സിട്രിക് ആസിഡ് ചക്രം.",
        "hi": "क्रेब्स चक्र (Krebs Cycle) - माइटोकॉन्ड्रियल मैट्रिक्स में सिट्रिक एसिड चक्र।"
    },
    "oxygen": {
        "term": "Oxygen",
        "cat": "Chemistry",
        "def": "The essential atmospheric gas functioning as the final electron acceptor in the mitochondrial electron transport chain during aerobic respiration.",
        "ta": "ஆக்ஸிஜன் (Oxygen) - ஏரோபிக் சுவாசத்தில் இறுதி எலக்ட்ரான் ஏற்பியாக செயல்படும் வாயு.",
        "ml": "ഓക്സിജൻ (Oxygen) - കോശ ശ്വസനത്തിലെ പ്രധാന ഇലക്ട്രോൺ സ്വീകർത്താവ്.",
        "hi": "ऑक्सीजन (Oxygen) - कोशिकीय श्वसन में अंतिम इलेक्ट्रॉन स्वीकर्ता।"
    },
    "carbon": {
        "term": "Carbon",
        "cat": "Chemistry",
        "def": "The tetravalent nonmetallic chemical element forming the essential structural backbone of all organic biomolecules in living systems.",
        "ta": "கார்பன் (Carbon) - அனைத்து கரிம மூலக்கூறுகளின் மைய வேதியியல் முதுகெலும்பு.",
        "ml": "കാർബൺ (Carbon) - ജൈവ തന്മാത്രകളുടെ അടിസ്ഥാന രാസമൂലകം.",
        "hi": "कार्बन (Carbon) - सभी कार्बनिक अणुओं का मूलभूत आधार तत्व।"
    },
    "photosynthesis": {
        "term": "Photosynthesis",
        "cat": "Plant Biology",
        "def": "The anabolic biological process in plant chloroplasts utilizing solar photons to synthesize glucose from carbon dioxide and water.",
        "ta": "ஒளிச்சேர்க்கை (Photosynthesis) - சூரிய ஒளியால் தாவரங்கள் உணவு தயாரிக்கும் உயிர்முறை.",
        "ml": "പ്രകാശസംശ്ലേഷണം (Photosynthesis) - സസ്യങ്ങൾ ആഹാരം നിർമ്മിക്കുന്ന പ്രക്രിയ.",
        "hi": "प्रकाश संश्लेषण (Photosynthesis) - सौर ऊर्जा से भोजन बनाने की जैविक प्रक्रिया।"
    },
    "chloroplast": {
        "term": "Chloroplast",
        "cat": "Plant Biology",
        "def": "Plastid organelle in plant and algal cells containing thylakoids and chlorophyll pigments where photosynthesis occurs.",
        "ta": "பசுங்கணிகம் (Chloroplast) - தாவரங்களில் ஒளிச்சேர்க்கை நிகழும் செல் உறுப்பு.",
        "ml": "ഹരിതകം (Chloroplast) - പ്രകാശസംശ്ലേഷണം നടക്കുന്ന കോശാംഗം.",
        "hi": "हरितलवक (Chloroplast) - पादप कोशिकाओं में प्रकाश संश्लेषण का अंगक।"
    },
    "enzyme": {
        "term": "Enzymes",
        "cat": "Biochemistry",
        "def": "Macromolecular biological protein catalysts that increase biochemical reaction velocities by lowering activation energy barriers.",
        "ta": "என்சைம் / நொதி (Enzyme) - உயிர்வேதியியல் வினைகளை விரைவுபடுத்தும் புரத வினையூக்கி.",
        "ml": "എൻസൈം (Enzyme) - ജൈവ രാസപ്രവർത്തനങ്ങളുടെ വേഗത കൂട്ടുന്ന രാസത്വരകം.",
        "hi": "एंजाइम (Enzyme) - जैव रासायनिक प्रतिक्रियाओं को तेज करने वाला उत्प्रेरक।"
    },
    "gradient": {
        "term": "Gradient Descent",
        "cat": "Optimization & Math",
        "def": "A multi-variable differential vector pointing in the direction of greatest instantaneous rate of increase of a scalar objective function.",
        "ta": "சரிவு இறக்கம் (Gradient Descent) - சார்பு குறையும் திசையில் எடைகளை மாற்றும் முறை.",
        "ml": "ഗ്രേഡിയന്റ് ഡിസന്റ് (Gradient Descent) - ഒപ്റ്റിമൈസേഷൻ രീതി.",
        "hi": "प्रवणता ह्रास (Gradient Descent) - न्यूनतम त्रुटि खोजने की अनुकूलन विधि।"
    },
    "loss": {
        "term": "Loss Function",
        "cat": "Machine Learning",
        "def": "A mathematical scalar objective function quantifying the penalty or discrepancy between model predictions and true empirical targets.",
        "ta": "இழப்புச் சார்பு (Loss Function) - மாதிரி கணிப்புகளின் பிழையை அளவிடும் சார்பு.",
        "ml": "നഷ്ട ഫംഗ്ഷൻ (Loss Function) - പ്രവചനത്തിലെ പിശക് കണക്കാക്കുന്ന തത്വം.",
        "hi": "हानि फलन (Loss Function) - मॉडल की त्रुटि मापने वाला गणितीय फलन।"
    },
    "neural": {
        "term": "Neural Network",
        "cat": "Artificial Intelligence",
        "def": "A computational learning system composed of layers of artificial interconnected nodes (neurons) that approximate complex non-linear functions.",
        "ta": "நரம்பியல் நெட்வொர்க் (Neural Network) - செயற்கை நியூரான்களைக் கொண்ட கணினி மாதிரி.",
        "ml": "ന്യൂറൽ നെറ്റ്വർക്ക് (Neural Network) - കമ്പ്യൂട്ടേഷണൽ ലേണിംഗ് ഘടന.",
        "hi": "न्यूरल नेटवर्क (Neural Network) - कृत्रिम न्यूरॉन्स पर आधारित कम्प्यूटेशनल मॉडल।"
    },
    "backpropagation": {
        "term": "Backpropagation",
        "cat": "Deep Learning",
        "def": "The iterative learning algorithm applying the calculus chain rule backward through neural layers to compute weight gradient updates.",
        "ta": "பின்னோக்கிய பரவல் (Backpropagation) - நரம்பியல் நெட்வொர்க் எடைகளை புதுப்பிக்கும் முறை.",
        "ml": "ബാക്ക്പ്രൊപ്പഗേഷൻ (Backpropagation) - പിശക് തിരുത്തൽ രീതി.",
        "hi": "बैकप्रॉपैगैशन (Backpropagation) - ग्रेडिएंट गणना और भार अद्यतन की कलन विधि।"
    },
    "eigenvalue": {
        "term": "Eigenvalue",
        "cat": "Linear Algebra",
        "def": "A characteristic scalar factor by which an eigenvector is multiplied and scaled during a linear matrix transformation (Av = λv).",
        "ta": "ஐகன் மதிப்பு (Eigenvalue) - நேரியல் உருமாற்றத்தில் திசையன் அளவிடப்படும் காரணி.",
        "ml": "ഐഗൻ മൂല്യം (Eigenvalue) - ലീനിയർ പരിവർത്തനത്തിലെ സ്കെയിലിംഗ് ഘടകം.",
        "hi": "आइगेन मान (Eigenvalue) - रैखिक रूपांतरण में प्रयुक्त अदिश स्केलर।"
    },
    "eigenvector": {
        "term": "Eigenvector",
        "cat": "Linear Algebra",
        "def": "A non-zero vector whose directional orientation remains invariant (unchanged) under a linear matrix transformation, scaled only by λ.",
        "ta": "ஐகன் திசையன் (Eigenvector) - உருமாற்றத்தில் திசை மாறாத சிறப்பியல்பு திசையன்.",
        "ml": "ഐഗൻ വെക്ടർ (Eigenvector) - ദിശ മാറാത്ത പ്രത്യേക വെക്ടർ.",
        "hi": "आइगेन सदिश (Eigenvector) - रूपांतरण के बाद भी दिशा अपरिवर्तित रखने वाला सदिश।"
    },
    "thermodynamics": {
        "term": "Thermodynamics",
        "cat": "Physics",
        "def": "The branch of physical science examining the relationships between thermal heat, mechanical work, internal energy, and system entropy.",
        "ta": "வெப்ப இயக்கவியல் (Thermodynamics) - வெப்பம், வேலை மற்றும் ஆற்றல் பரிமாற்ற அறிவியல்.",
        "ml": "താപഗതികം (Thermodynamics) - താപോർജ്ജവും യാന്ത്രികോർജ്ജവും തമ്മിലുള്ള ബന്ധം പഠിക്കുന്ന ശാസ്ത്രം.",
        "hi": "ऊष्मागतिकी (Thermodynamics) - ऊष्मा और ऊर्जा रूपांतरण का विज्ञान।"
    },
    "algorithm": {
        "term": "Algorithm",
        "cat": "Computer Science",
        "def": "A finite, unambiguous, deterministic sequence of computational instructions designed to solve a well-defined computational problem.",
        "ta": "வழிமுறை (Algorithm) - கணினி சிக்கல்களைத் தீர்க்கும் படிநிலைக் கட்டளைகள்.",
        "ml": "അൽഗോരിതം (Algorithm) - പ്രശ്നപരിഹാരത്തിനായുള്ള നിർദ്ദേശങ്ങളുടെ ക്രമം.",
        "hi": "कलन विधि (Algorithm) - समस्या समाधान के लिए चरणबद्ध निर्देश।"
    }
}

def find_word_context(text: str, word: str) -> Optional[str]:
    pattern = re.compile(rf"([^.!?]*\b{re.escape(word)}\b[^.!?]*)", re.IGNORECASE)
    match = pattern.search(text)
    if match and len(match.group(1).strip()) > 15:
        return match.group(1).strip()
    return None

class StudyGuideGenerator:
    """
    Synthesizes session transcripts into a comprehensive structured study guide:
    - Executive Overview (Bilingual English + Vernacular)
    - Concept Map & Visual Models (Nodes, Edges, Governing Equation & SVG Diagrams)
    - Key Definitions (Bilingual with domain-adapted Indic terms)
    - Formulas & Mathematical/Computational Equations
    - Bulleted Key Takeaways with Timestamps
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
        full_text_en = " ".join(s.get("text_en", "") or s.get("text_source", "") for s in segments)
        
        # 1. Try LLM synthesis if API key is provided
        llm_result = self._try_llm_synthesis(segments, full_text_en, target_lang)
        if llm_result:
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
        Guaranteed fallback synthesis ensuring ALL 6 options/sections are populated:
        1. Overview (Bilingual)
        2. Concept Map (Diagram + SVG Visuals + Equation Card)
        3. Definitions (At least 5-8 domain terms with definitions & vernacular translations)
        4. Formulas (Governing equations, laws, complexity relations, or quantitative principles)
        5. Takeaways (Bulleted key takeaways with timestamps)
        6. Flashcards (Active recall self-test cards)
        """
        # 1. Detect domain terms in transcript using glossary
        detected_terms = glossary_engine.detect_terms_in_text(full_text_en)
        
        # 2. Dynamically extract additional terms if detected terms are sparse
        all_terms = self._ensure_rich_terms(full_text_en, detected_terms, target_lang)

        # 3. Infer topic from terms or transcript
        topic = self._infer_lecture_topic(all_terms, full_text_en)

        # 4. Build bilingual definitions
        definitions = []
        for term_info in all_terms[:8]:
            trans = term_info.get("translations", {}).get(target_lang) or term_info.get("translations", {}).get("ta", term_info["en"])
            definition_text = term_info.get("definition", f"Core technical concept representing {term_info['en']}.")
            if target_lang == "ml":
                v_def = f"{trans} എന്നത് {definition_text}"
            elif target_lang == "hi":
                v_def = f"{trans}: {definition_text}"
            else:
                v_def = f"{trans} என்பது {definition_text}"
            definitions.append({
                "term": term_info["en"],
                "vernacular_term": trans,
                "category": term_info.get("category", "STEM"),
                "definition": definition_text,
                "vernacular_definition": v_def
            })

        # 5. Extract or synthesize mathematical/computational formulas
        formulas = self._extract_formulas(full_text_en, all_terms, detected_terms)

        # 6. Generate bulleted takeaways from segments
        takeaways = []
        seg_list = segments if len(segments) <= 8 else segments[:8]
        for i, seg in enumerate(seg_list):
            pt_en = (seg.get("text_en", "") or seg.get("text_source", "")).strip()
            pt_vern = (seg.get("text_vernacular", "") or seg.get("text_source", "")).strip()
            if not pt_vern or pt_vern == pt_en:
                pt_vern = f"{pt_en} ({target_lang.upper()})"
            takeaways.append({
                "point": pt_en,
                "vernacular_point": pt_vern,
                "timestamp": seg.get("timestamp", f"00:{i*15:02d}")
            })
        if not takeaways:
            takeaways.append({
                "point": "Foundational principles of the lecture session.",
                "vernacular_point": "விரிவுரை அமர்வின் அடிப்படை கொள்கைகள்.",
                "timestamp": "00:00"
            })

        # 7. Generate interactive flashcards
        flashcards = self._generate_flashcards(definitions, formulas, takeaways, target_lang)

        # 8. Build Concept Diagram (nodes & edges)
        diagram = self._build_concept_diagram(all_terms, formulas, takeaways)

        # 9. Build Visuals (SVG visual explanation cards + equation card)
        visuals = self._build_visuals(full_text_en, formulas)

        # 10. Overview text
        lang_meta = settings.SUPPORTED_LANGUAGES.get(target_lang, {"name": "Tamil", "native": "தமிழ்"})
        seg_count = len(segments)
        top_concepts = ", ".join(d["term"] for d in definitions[:3]) if definitions else "core concepts"
        en_overview = (
            f"Comprehensive study guide synthesized from {seg_count} lecture segment{'s' if seg_count != 1 else ''}. "
            f"Explores key theoretical frameworks and applications centering on {top_concepts}, "
            f"accompanied by formal definitions, analytical equations, and structured review materials."
        )
        if target_lang == "ml":
            v_overview = f"{seg_count} പ്രഭാഷണ ഭാഗങ്ങളിൽ നിന്ന് തയ്യാറാക്കിയ സമഗ്രമായ പഠന സഹായി. പ്രധാന വിഷയങ്ങൾ: {top_concepts}."
        elif target_lang == "hi":
            v_overview = f"{seg_count} व्याख्यान खंडों से तैयार की गई व्यापक अध्ययन मार्गदर्शिका। मुख्य विषय: {top_concepts}."
        else:
            v_overview = f"{seg_count} விரிவுரை பகுதிகளிலிருந்து தொகுக்கப்பட்ட விரிவான படிப்பு வழிகாட்டி. முக்கிய கருத்துக்கள்: {top_concepts}."

        return {
            "title": topic,
            "date": datetime.now().strftime("%B %d, %Y"),
            "target_language": lang_meta["name"],
            "native_language": lang_meta["native"],
            "overview": {
                "en": en_overview,
                "vernacular": v_overview
            },
            "definitions": definitions,
            "formulas": formulas,
            "diagram": diagram,
            "visuals": visuals,
            "takeaways": takeaways,
            "flashcards": flashcards,
            "segment_count": seg_count,
            "source": "heuristic_synthesis"
        }

    def _ensure_rich_terms(
        self,
        text: str,
        detected_terms: List[Dict[str, Any]],
        target_lang: str
    ) -> List[Dict[str, Any]]:
        terms = list(detected_terms)
        seen = {t["en"].lower() for t in terms}

        domain_patterns = [
            (r"\b(?:cellular\s+respiration|respiration)\b", "Cellular Respiration", "Cell Biology", "Catabolic biochemical process converting glucose and oxygen into usable ATP biochemical energy, water, and CO2.", "செல்லுலார் சுவாசம் (Cellular Respiration)"),
            (r"\b(?:glucose)\b", "Glucose", "Biochemistry", "Six-carbon hexose monosaccharide (C6H12O6) serving as the primary metabolic fuel source in cellular energy production.", "குளுக்கோஸ் (Glucose)"),
            (r"\b(?:mitochondri(?:a|on))\b", "Mitochondria", "Cell Biology", "Double-membraned eukaryotic cellular organelle known as the powerhouse of the cell, executing the Krebs cycle and oxidative phosphorylation.", "மைட்டோகாண்ட்ரியா (Mitochondria)"),
            (r"\b(?:mitochondrial(?:\s+matrix)?)\b", "Mitochondrial Matrix", "Cell Biology", "The internal gel space bounded by the inner mitochondrial membrane containing enzymes for the Krebs cycle and mitochondrial DNA.", "மைட்டோகாண்ட்ரியல் மேட்ரிக்ஸ் (Mitochondrial Matrix)"),
            (r"\b(?:glycolysis)\b", "Glycolysis", "Metabolism", "Anaerobic sequence of enzymatic reactions in the cytoplasm breaking down glucose into two molecules of pyruvate while generating net 2 ATP.", "கிளைகோலிசிஸ் (Glycolysis)"),
            (r"\b(?:atp|adenosine\s+triphosphate)\b", "Adenosine Triphosphate (ATP)", "Biochemistry", "Universal cellular energy currency storing high-energy chemical bonds in terminal phosphate groups.", "ஏடிபி (ATP)"),
            (r"\b(?:krebs\s+cycle|citric\s+acid\s+cycle)\b", "Krebs Cycle", "Metabolism", "Cyclical series of enzymatic chemical reactions in mitochondrial matrix generating NADH and FADH2 via acetyl-CoA oxidation.", "கிரெப்ஸ் சுழற்சி (Krebs Cycle)"),
            (r"\b(?:pyruvate)\b", "Pyruvate", "Biochemistry", "Three-carbon carboxylate compound produced at the end of glycolysis that enters mitochondria for aerobic oxidation.", "பைருவேட் (Pyruvate)"),
            (r"\b(?:electron\s+transport\s+chain|oxidative\s+phosphorylation)\b", "Electron Transport Chain", "Cell Biology", "Series of mitochondrial inner-membrane protein complexes transferring electrons to generate a proton gradient powering ATP synthesis.", "எலக்ட்ரான் கடத்து சங்கிலி (ETC)"),
            (r"\b(?:digital\s+logic\s+gates?|logic\s+gates?)\b", "Logic Gates", "Digital Electronics", "Fundamental building blocks of digital circuits performing boolean operations.", "தர்க்க வாயில்கள் (Logic Gates)"),
            (r"\b(?:boolean\s+algebra)\b", "Boolean Algebra", "Mathematics & CS", "Algebraic system dealing with binary variables and logic operations (AND, OR, NOT).", "பூலியன் இயற்கணிதம் (Boolean Algebra)"),
            (r"\b(?:truth\s+tables?)\b", "Truth Table", "Digital Electronics", "Mathematical table showing output states for all possible input combinations.", "உண்மை அட்டவணை (Truth Table)"),
            (r"\b(?:flip\s*flops?)\b", "Flip-Flop", "Digital Electronics", "Bistable multivibrator circuit used as a basic 1-bit memory storage element.", "ஃபிளிப்-ஃப்ளாப் (Flip-Flop)"),
            (r"\b(?:operating\s+systems?)\b", "Operating System", "Computer Science", "System software managing computer hardware, processes, and memory resources.", "இயக்க முறைமை (Operating System)"),
            (r"\b(?:process\s+scheduling|scheduler)\b", "CPU Scheduling", "Computer Science", "Mechanism by which the OS allocates CPU execution time to competing processes.", "செயலி திட்டமிடல் (CPU Scheduling)"),
            (r"\b(?:virtual\s+memory|paging)\b", "Virtual Memory", "Computer Science", "Memory management capability mapping secondary storage into continuous address spaces.", "மெய்நிகர் நினைவகம் (Virtual Memory)"),
            (r"\b(?:computer\s+networks?|networking)\b", "Computer Networks", "Computer Science", "Interconnected computing devices exchanging data using standardized protocols.", "கணினி நெட்வொர்க் (Computer Networks)"),
            (r"\b(?:tcp(?:\s*[/]\s*ip)?)\b", "TCP/IP Protocol", "Networking", "Foundational communication protocol suite providing reliable end-to-end data transmission.", "டிசிபி/ஐபி நெறிமுறை (TCP/IP)"),
            (r"\b(?:data\s+structures?)\b", "Data Structures", "Computer Science", "Specialized formats for organizing, processing, retrieving, and storing data efficiently.", "தரவு கட்டமைப்புகள் (Data Structures)"),
            (r"\b(?:binary\s+trees?)\b", "Binary Tree", "Data Structures", "Hierarchical data structure in which each node has at most two children.", "இருமை மரம் (Binary Tree)"),
            (r"\b(?:sorting\s+algorithms?)\b", "Sorting Algorithm", "Algorithms", "Algorithmic procedure arranging elements of a collection into a systematic order.", "வரிசையாக்க வழிமுறை (Sorting Algorithm)"),
            (r"\b(?:machine\s+learning)\b", "Machine Learning", "Artificial Intelligence", "Computational methods using statistical models to learn patterns from training data.", "இயந்திரக் கற்றல் (Machine Learning)"),
            (r"\b(?:neural\s+networks?)\b", "Neural Network", "Deep Learning", "Network of interconnected artificial neurons computing non-linear functional representations.", "நரம்பியல் நெட்வொர்க் (Neural Network)"),
            (r"\b(?:deep\s+learning)\b", "Deep Learning", "Artificial Intelligence", "Subset of machine learning utilizing multi-layered artificial neural architectures.", "ஆழ்ந்த கற்றல் (Deep Learning)"),
            (r"\b(?:loss\s+functions?|cost\s+function)\b", "Loss Function", "Optimization", "Scalar evaluation metric quantifying the error between predicted output and ground truth.", "இழப்புச் சார்பு (Loss Function)"),
            (r"\b(?:gradient\s+descent)\b", "Gradient Descent", "Optimization", "First-order iterative optimization method following the negative gradient of objective function.", "சரிவு இறக்கம் (Gradient Descent)"),
            (r"\b(?:eigenvalues?|eigenvectors?)\b", "Eigenvalues & Eigenvectors", "Linear Algebra", "Characteristic scalar and directional vector satisfying the linear transformation Av = λv.", "ஐகன் மதிப்புகள் (Eigenvalues)"),
            (r"\b(?:thermodynamics?)\b", "Thermodynamics", "Physics", "Branch of physical science dealing with heat, work, internal energy, and temperature.", "வெப்ப இயக்கவியல் (Thermodynamics)"),
            (r"\b(?:photosynthesis)\b", "Photosynthesis", "Biochemistry", "Biological synthesis converting solar radiant energy and CO2 into chemical glucose.", "ஒளிச்சேர்க்கை (Photosynthesis)"),
            (r"\b(?:linear\s+algebra)\b", "Linear Algebra", "Mathematics", "Branch of mathematics concerning vector spaces, linear mappings, and matrices.", "நேரியல் இயற்கணிதம் (Linear Algebra)"),
            (r"\b(?:calculus|derivatives?|integration)\b", "Calculus & Derivatives", "Mathematics", "Mathematical study of continuous change, instantaneous rates, and accumulated quantities.", "நுண்கணிதம் (Calculus)"),
            (r"\b(?:probability|random\s+variables?)\b", "Probability Theory", "Mathematics", "Mathematical framework quantifying uncertainty and likelihood of random events.", "நிகழ்தகவு கோட்பாடு (Probability)"),
            (r"\b(?:ohm'?s\s+law|resistance|voltage)\b", "Ohm's Law & Circuit Analysis", "Electrical Engineering", "Fundamental physical law relating electric voltage, current flow, and ohmic resistance.", "ஓம் விதி (Ohm's Law)"),
            (r"\b(?:kinetics?|kinematics?|momentum)\b", "Kinematics & Momentum", "Classical Mechanics", "Physical principles describing particle motion, trajectory, mass, and conservation of momentum.", "இயக்கவியல் (Kinematics)")
        ]

        for pattern, name, cat, desc, v_ta in domain_patterns:
            if re.search(pattern, text, re.IGNORECASE) and name.lower() not in seen:
                seen.add(name.lower())
                v_trans = {
                    "ta": v_ta,
                    "ml": f"{name} (മലയാളം)",
                    "hi": f"{name} (हिन्दी)"
                }
                terms.append({
                    "en": name,
                    "term": name,
                    "category": cat,
                    "definition": desc,
                    "translations": v_trans
                })

        if len(terms) < 6:
            stopset = {
                "the", "and", "that", "this", "with", "from", "they", "will", "have", "were",
                "been", "their", "there", "about", "which", "would", "these", "other", "today",
                "class", "lecture", "student", "welcome", "discuss", "study", "hello", "everyone",
                "first", "second", "third", "using", "being", "where", "after", "before", "each",
                "some", "such", "than", "then", "into", "over", "more", "most", "also", "here"
            }
            words = re.findall(r"\b[A-Za-z]{4,}\b", text)
            freq: Dict[str, int] = {}
            for w in words:
                lw = w.lower()
                if lw not in stopset:
                    freq[lw] = freq.get(lw, 0) + 1
            
            sorted_words = sorted(freq.items(), key=lambda kv: kv[1], reverse=True)
            for word, count in sorted_words:
                if word not in seen and len(terms) < 8:
                    seen.add(word)
                    display_word = word.capitalize()
                    kb_entry = STEM_KB.get(word)
                    if kb_entry:
                        terms.append({
                            "en": kb_entry["term"],
                            "term": kb_entry["term"],
                            "category": kb_entry["cat"],
                            "definition": kb_entry["def"],
                            "translations": {
                                "ta": kb_entry["ta"].split(" - ")[0],
                                "ml": kb_entry["ml"].split(" - ")[0],
                                "hi": kb_entry["hi"].split(" - ")[0]
                            }
                        })
                    else:
                        sentence_ctx = find_word_context(text, word)
                        if sentence_ctx:
                            def_str = f"Discussed in lecture: \"{sentence_ctx}\". Key conceptual principle essential for analytical understanding."
                        else:
                            def_str = f"Foundational technical term: {display_word}, central to the structural and analytical development of this lecture session."
                        terms.append({
                            "en": display_word,
                            "term": display_word,
                            "category": "Core Principle",
                            "definition": def_str,
                            "translations": {
                                "ta": f"{display_word} (கருத்து)",
                                "ml": f"{display_word} (തത്വം)",
                                "hi": f"{display_word} (सिद्धांत)"
                            }
                        })

        return terms

    def _infer_lecture_topic(self, terms: List[Dict[str, Any]], text: str) -> str:
        lower = text.lower()
        if any(w in lower for w in ["respiration", "glycolysis", "mitochondri", "krebs", "pyruvate", "atp", "glucose"]):
            return "Cell Biology: Cellular Respiration & ATP Metabolic Energy"
        if "photosynthesis" in lower or "chloroplast" in lower:
            return "Biochemistry: Photosynthetic Energy Conversion"

        if terms:
            top_term = terms[0].get("en", "STEM")
            cat = terms[0].get("category", "STEM")
            if any(w in lower for w in ["respiration", "glycolysis", "mitochondri", "glucose"]) and cat == "Linear Algebra":
                return "Cell Biology: Cellular Respiration & ATP Metabolic Energy"
            if len(terms) >= 2:
                second_term = terms[1].get("en", "Concepts")
                return f"{cat}: {top_term} & {second_term}"
            return f"{cat}: {top_term} Principles"
        
        if "gradient" in lower or "neural" in lower:
            return "Machine Learning: Gradient Optimization & Neural Networks"
        if ("matrix" in lower and not any(w in lower for w in ["mitochondri", "cell", "biolog", "organelle", "respiration"])) or "eigen" in lower:
            return "Linear Algebra: Eigenvalues & Vector Spaces"
        if "thermo" in lower or "heat" in lower:
            return "Thermodynamics: Heat Engines & Energy Conservation"
        if "photosynthesis" in lower:
            return "Biochemistry: Photosynthetic Energy Conversion"
        if "search" in lower or "tree" in lower or "sort" in lower:
            return "Computer Science: Algorithmic Complexity & Data Structures"
        return "STEM Lecture: Core Scientific Principles & Applications"

    def _extract_formulas(self, text: str, all_terms: List[Dict[str, Any]], detected_terms: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        formulas = []
        lower = text.lower()
        all_terms_str = " ".join(t.get("en", "").lower() for t in all_terms)
        combined_text = lower + " " + all_terms_str

        # Strict evidence check: if text contains ZERO quantitative/STEM keywords and no glossary terms
        has_quant = any(tok in combined_text for tok in QUANT_INDICATORS)
        if not has_quant and not detected_terms:
            return []

        # Prioritize Biology so terms like 'mitochondrial matrix' do NOT trigger linear algebra
        is_bio = any(k in combined_text for k in [
            "respiration", "glucose", "mitochondri", "glycolysis", "pyruvate", "atp", "krebs",
            "photosynthesis", "chloroplast", "calvin", "thylakoid", "biology", "biochem"
        ])

        # 1. Biology, Photosynthesis & Cellular Respiration
        if is_bio:
            if any(k in combined_text for k in ["photosynthesis", "chloroplast", "calvin", "thylakoid"]):
                formulas.append({
                    "name": "Photosynthesis Stoichiometric Equation",
                    "latex": "6\\text{CO}_2 + 6\\text{H}_2\\text{O} + hν \\xrightarrow{\\text{chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2",
                    "description": "Solar photolysis and carbon fixation yielding high-energy glucose and breathable oxygen.",
                    "variables": "hν: photon solar energy, C6H12O6: glucose hexose sugar, CO2: carbon dioxide"
                })
            else:
                formulas.append({
                    "name": "Cellular Respiration Net Oxidation Reaction",
                    "latex": "\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\longrightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 30\\text{--}32\\,\\text{ATP}",
                    "description": "Aerobic catabolic oxidation of hexose glucose into carbon dioxide, water, and usable ATP energy.",
                    "variables": "C6H12O6: glucose fuel, O2: terminal electron acceptor, ATP: cellular energy currency"
                })
                formulas.append({
                    "name": "Glycolysis Net Energy Yield",
                    "latex": "\\text{Glucose} + 2\\text{NAD}^+ + 2\\text{ADP} + 2\\text{P}_i \\longrightarrow 2\\text{Pyruvate} + 2\\text{NADH} + 2\\text{ATP}",
                    "description": "Anaerobic cytoplasmic metabolic pathway splitting 6-carbon glucose into two 3-carbon pyruvates.",
                    "variables": "NAD+: electron carrier, ADP: adenosine diphosphate, Pi: inorganic phosphate"
                })

        # 2. Machine Learning, Neural Networks & Optimization
        if not is_bio and any(k in combined_text for k in ["gradient descent", "loss", "optimizer", "backprop", "weight update"]):
            formulas.append({
                "name": "Gradient Descent Parameter Update",
                "latex": "θ_{t+1} = θ_t - η ∇J(θ_t)",
                "description": "Updates model parameter vector θ along negative gradient of cost function J with step size η.",
                "variables": "θ: parameter weights, η: learning rate, ∇J: gradient vector of cost function"
            })
            formulas.append({
                "name": "Mean Squared Error Loss Function",
                "latex": "J(θ) = \\frac{1}{2m} \\sum_{i=1}^{m} (h_θ(x^{(i)}) - y^{(i)})^2",
                "description": "Measures quadratic discrepancy between model hypothesis predictions and ground truth labels.",
                "variables": "m: training sample count, h_θ(x): model hypothesis, y: true target label"
            })

        if not is_bio and any(k in combined_text for k in ["neural", "activation", "sigmoid", "softmax", "deep learning"]):
            formulas.append({
                "name": "Logistic Sigmoid Activation Function",
                "latex": "σ(z) = \\frac{1}{1 + e^{-z}}",
                "description": "Maps linear combination z into bounded probability interval (0, 1) introducing non-linearity.",
                "variables": "z: linear input (W·x + b), σ(z): activated output probability"
            })

        # 3. Linear Algebra, Matrices & Transformations
        if not is_bio and any(k in combined_text for k in ["eigenvalue", "eigenvector", "matrix", "linear algebra", "determinant"]):
            formulas.append({
                "name": "Eigenvalue Characteristic Equation",
                "latex": "A v = λ v \\iff \\det(A - λ I) = 0",
                "description": "Defines invariant direction v and scalar scaling factor λ under linear transformation A.",
                "variables": "A: n×n transformation matrix, v: eigenvector, λ: eigenvalue, I: identity matrix"
            })
            formulas.append({
                "name": "Euclidean Vector Norm & Dot Product",
                "latex": "\\|v\\|_2 = \\sqrt{\\sum_{i=1}^{n} v_i^2}, \\quad u \\cdot v = \\|u\\| \\|v\\| \\cos θ",
                "description": "Computes geometric length and angle-dependent projection between vectors in inner product space.",
                "variables": "u, v: vectors in ℝⁿ, θ: angle between vectors, ‖v‖: Euclidean L2 norm"
            })

        # 3. Computer Science, Algorithms & Complexity
        if any(k in combined_text for k in ["binary search", "search", "divide and conquer", "logarithm"]):
            formulas.append({
                "name": "Binary Search Recurrence & Complexity",
                "latex": "T(n) = T(n/2) + O(1) \\implies T(n) = O(\\log_2 n)",
                "description": "Expresses the halving of candidate search space per iteration on sorted arrays.",
                "variables": "n: array elements, T(n): running comparison operations"
            })
        if any(k in combined_text for k in ["sort", "merge sort", "quicksort", "recursion", "complexity", "big o"]):
            formulas.append({
                "name": "Divide-and-Conquer Sorting Complexity",
                "latex": "T(n) = 2T(n/2) + O(n) \\implies T(n) = O(n \\log_2 n)",
                "description": "Master Theorem solution for splitting array into equal halves and linear recombination.",
                "variables": "n: input data size, T(n): asymptotic time complexity"
            })

        # 4. Digital Electronics & Boolean Logic
        if any(k in combined_text for k in ["logic gate", "boolean", "truth table", "flip flop", "digital circuit"]):
            formulas.append({
                "name": "De Morgan's Laws of Boolean Logic",
                "latex": "\\overline{A \\cdot B} = \\overline{A} + \\overline{B}, \\quad \\overline{A + B} = \\overline{A} \\cdot \\overline{B}",
                "description": "Duality laws relating logical AND/OR operations with inverted inputs for digital simplification.",
                "variables": "A, B: binary logic inputs ∈ {0, 1}, ·: AND operator, +: OR operator, ¯: NOT negation"
            })
            formulas.append({
                "name": "Clock Period & Circuit Switching Frequency",
                "latex": "f_{\\text{clk}} = \\frac{1}{T_{\\text{cycle}}}, \\quad T_{\\text{cycle}} \\ge t_{\\text{prop}} + t_{\\text{comb}} + t_{\\text{setup}}",
                "description": "Calculates maximum safe operating frequency determined by critical propagation delay paths.",
                "variables": "f_clk: clock frequency in Hz, T_cycle: clock period, t_prop: flip-flop propagation delay"
            })

        # 5. Thermodynamics & Energy
        if any(k in combined_text for k in ["thermodynamic", "heat", "internal energy", "carnot", "enthalpy", "entropy"]):
            formulas.append({
                "name": "First Law of Thermodynamics (Energy Conservation)",
                "latex": "ΔU = Q - W",
                "description": "Relates internal energy change ΔU to net heat added Q and boundary work performed W.",
                "variables": "ΔU: internal energy change (Joules), Q: heat absorbed, W: work done by system"
            })
            formulas.append({
                "name": "Carnot Thermal Efficiency Upper Bound",
                "latex": "η_{\\text{max}} = 1 - \\frac{T_C}{T_H}",
                "description": "Maximum theoretical thermodynamic efficiency achievable by heat engine between reservoirs.",
                "variables": "η: thermal efficiency (0–1), T_C: cold sink temp (K), T_H: hot source temp (K)"
            })

        # 6. Classical Mechanics & Motion
        if any(k in combined_text for k in ["kinetic energy", "momentum", "force", "acceleration", "newton", "velocity"]):
            formulas.append({
                "name": "Newton's Second Law & Linear Momentum",
                "latex": "F_{\\text{net}} = m \\cdot a = \\frac{dp}{dt}",
                "description": "Fundamental dynamical relation between net applied force vector and rate of momentum change.",
                "variables": "F_net: applied force vector (N), m: inertial mass (kg), a: acceleration (m/s²), p: momentum"
            })
            formulas.append({
                "name": "Kinetic Energy & Momentum Duality",
                "latex": "K = \\frac{1}{2} m v^2 = \\frac{p^2}{2m}",
                "description": "Expresses translational kinetic energy in terms of velocity and conserved linear momentum.",
                "variables": "K: kinetic energy (Joules), m: mass, v: velocity scalar, p: momentum"
            })

        # 8. Electromagnetism & Circuits
        if any(k in combined_text for k in ["ohm", "circuit", "voltage", "current", "resistor", "capacitance"]):
            formulas.append({
                "name": "Ohm's Law & Electric Power Dissipation",
                "latex": "V = I \\cdot R, \\quad P = V \\cdot I = I^2 R = \\frac{V^2}{R}",
                "description": "Governing linear relationship between electrical potential, current flow, and thermal power dissipation.",
                "variables": "V: voltage potential (Volts), I: electric current (Amperes), R: resistance (Ohms), P: power (Watts)"
            })

        # 9. Probability & Statistics
        if any(k in combined_text for k in ["bayes", "probability", "variance", "distribution", "random"]):
            formulas.append({
                "name": "Bayes' Theorem for Conditional Probability",
                "latex": "P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}",
                "description": "Inverts conditional probabilities to update prior belief P(A) with observed evidence B.",
                "variables": "P(A|B): posterior probability, P(B|A): likelihood, P(A): prior, P(B): marginal evidence"
            })

        # 10. General Analytical Fallback for STEM sessions
        if not formulas and has_quant:
            formulas.append({
                "name": "Governing System Rate of Change",
                "latex": "\\frac{dQ}{dt} = \\lim_{Δt \\to 0} \\frac{ΔQ}{Δt}",
                "description": "Continuous instantaneous flux and change of state parameter Q across the observed domain.",
                "variables": "Q: state quantity or variable, t: temporal coordinate, dQ/dt: instantaneous rate"
            })
            formulas.append({
                "name": "Operational Performance & Efficiency Metric",
                "latex": "η = \\frac{\\text{Actual Useful Output}}{\\text{Total Energy / Work Input}} \\times 100\\%",
                "description": "Normalized efficiency index quantifying conversion ratio and minimizing entropy/latency loss.",
                "variables": "η: operational efficiency percentage, Output: delivered result, Input: total consumed resource"
            })

        return formulas

    def _generate_flashcards(
        self,
        definitions: List[Dict[str, Any]],
        formulas: List[Dict[str, Any]],
        takeaways: List[Dict[str, Any]],
        target_lang: str
    ) -> List[Dict[str, Any]]:
        flashcards = []
        fc_id = 1

        for d in definitions[:4]:
            v_term = d.get("vernacular_term", d["term"])
            if target_lang == "ml":
                q_v = f"{v_term} എന്നാൽ എന്താണ്?"
            elif target_lang == "hi":
                q_v = f"{v_term} क्या है?"
            else:
                q_v = f"{v_term} என்றால் என்ன?"

            flashcards.append({
                "id": fc_id,
                "front": f"What is {d['term']}?",
                "vernacular_front": q_v,
                "back": d["definition"],
                "category": d.get("category", "Concepts")
            })
            fc_id += 1

        for f in formulas[:2]:
            if target_lang == "ml":
                q_vf = f"{f['name']} സമവാക്യം / സൂത്രം"
            elif target_lang == "hi":
                q_vf = f"{f['name']} का सूत्र / समीकरण"
            else:
                q_vf = f"{f['name']} இன் சமன்பாடு / சூத்திரம்"

            flashcards.append({
                "id": fc_id,
                "front": f"State the formula for {f['name']}.",
                "vernacular_front": q_vf,
                "back": f"{f['latex']} — {f['description']}",
                "category": "Formulas"
            })
            fc_id += 1

        for t in takeaways[:3]:
            pt = t.get("point", "")
            v_pt = t.get("vernacular_point", "")
            if pt:
                if target_lang == "ml":
                    q_vt = f"ഈ സെഷനിലെ പ്രധാന തത്വം എന്താണ്?"
                elif target_lang == "hi":
                    q_vt = f"इस व्याख्यान का मुख्य निष्कर्ष क्या है?"
                else:
                    q_vt = f"இந்த விரிவுரையின் முக்கிய கருத்து என்ன?"

                flashcards.append({
                    "id": fc_id,
                    "front": f"What key insight was emphasized at {t.get('timestamp', 'during lecture')}?",
                    "vernacular_front": q_vt,
                    "back": f"{pt} ({v_pt})",
                    "category": "Key Insights"
                })
                fc_id += 1

        return flashcards

    def _build_concept_diagram(
        self,
        detected_terms: List[Dict[str, Any]],
        formulas: List[Dict[str, Any]],
        takeaways: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        terms_str = " ".join(t.get("en", "").lower() for t in (detected_terms or []))
        is_resp = any(k in terms_str for k in ["respiration", "glucose", "mitochondri", "glycolysis", "pyruvate", "atp", "krebs"])
        is_photo = any(k in terms_str for k in ["photosynthesis", "chloroplast", "calvin", "thylakoid"])
        
        if is_resp:
            nodes = [
                {"id": "node_1", "label": "Glucose Substrate", "detail": "Hexose Sugar Fuel"},
                {"id": "node_2", "label": "Cytoplasmic Glycolysis", "detail": "Pyruvate & 2 ATP"},
                {"id": "node_3", "label": "Mitochondrial Matrix", "detail": "Krebs Citric Acid Cycle"},
                {"id": "node_4", "label": "Inner Cristae ETC", "detail": "Oxidative Phosphorylation"},
                {"id": "node_5", "label": "32 ATP Synthesis", "detail": "Cellular Energy"}
            ]
            edges = [
                {"from": "node_1", "to": "node_2"},
                {"from": "node_2", "to": "node_3"},
                {"from": "node_3", "to": "node_4"},
                {"from": "node_4", "to": "node_5"}
            ]
            return {
                "title": "Cellular Respiration Metabolic Concept Map",
                "nodes": nodes,
                "edges": edges,
                "source": "Grounded Cellular Bioenergetics Model"
            }
        elif is_photo:
            nodes = [
                {"id": "node_1", "label": "Solar Photons", "detail": "Light Absorption"},
                {"id": "node_2", "label": "Thylakoid Light Reactions", "detail": "Photolysis & ATP Synthesis"},
                {"id": "node_3", "label": "Calvin Cycle", "detail": "Stroma Carbon Fixation"},
                {"id": "node_4", "label": "Glucose Synthesis", "detail": "C6H12O6 Product"},
                {"id": "node_5", "label": "Plant Metabolism", "detail": "Bioenergetics"}
            ]
            edges = [
                {"from": "node_1", "to": "node_2"},
                {"from": "node_2", "to": "node_3"},
                {"from": "node_3", "to": "node_4"},
                {"from": "node_4", "to": "node_5"}
            ]
            return {
                "title": "Photosynthesis Biochemical Concept Map",
                "nodes": nodes,
                "edges": edges,
                "source": "Grounded Plant Bioenergetics Model"
            }

        nodes = [{
            "id": "lecture",
            "label": "Core Foundations",
            "detail": "Theoretical Baseline"
        }]
        edges = []

        term_subset = detected_terms[:5] if detected_terms else []
        for index, term in enumerate(term_subset, start=1):
            node_id = f"concept_{index}"
            nodes.append({
                "id": node_id,
                "label": term.get("en", f"Concept {index}"),
                "detail": term.get("category", "Domain Principle")
            })
            prev_id = "lecture" if index == 1 else f"concept_{index - 1}"
            edges.append({"from": prev_id, "to": node_id})

        if formulas:
            f_node_id = f"concept_{len(nodes)}"
            nodes.append({
                "id": f_node_id,
                "label": formulas[0].get("name", "Governing Equation"),
                "detail": "Analytical Law"
            })
            edges.append({"from": nodes[-2]["id"], "to": f_node_id})

        app_node_id = f"concept_{len(nodes)}"
        nodes.append({
            "id": app_node_id,
            "label": "Synthesis & Applications",
            "detail": "Practical Execution"
        })
        edges.append({"from": nodes[-2]["id"], "to": app_node_id})

        return {
            "title": "Grounded Lecture Concept Map",
            "nodes": nodes,
            "edges": edges,
            "source": "Grounded AI concept hierarchy generated from lecture session"
        }

    def _build_visuals(self, text: str, formulas: List[Dict[str, Any]]) -> Dict[str, Any]:
        lower_text = text.lower()
        visuals = {}

        if formulas:
            primary_eq = formulas[0]
            if primary_eq.get("latex"):
                visuals["equation"] = {
                    "title": primary_eq.get("name", "Governing Mathematical Law"),
                    "latex": primary_eq["latex"],
                    "caption": f"{primary_eq.get('name', 'Equation')}: {primary_eq.get('description', '')}"
                }

        is_bio = any(k in lower_text for k in ["respiration", "glucose", "mitochondri", "glycolysis", "pyruvate", "atp", "krebs", "photosynthesis", "chloroplast"])

        if any(k in lower_text for k in ["respiration", "glycolysis", "mitochondri", "krebs", "pyruvate", "atp"]):
            visuals["cellularRespiration"] = {
                "caption": "Cellular respiration metabolic flow: cytoplasmic glycolysis followed by mitochondrial matrix Krebs cycle and inner cristae ETC."
            }
        elif any(k in lower_text for k in ["photosynthesis", "chloroplast", "calvin", "thylakoid"]):
            visuals["photosynthesis"] = {
                "caption": "Dual-phase photosynthetic pathway: thylakoid light reactions coupled with stroma Calvin cycle."
            }
        elif any(k in lower_text for k in ["thermodynamic", "heat", "internal energy", "conduction", "convection", "carnot"]):
            visuals["thermoCycle"] = {
                "caption": "First Law energy conservation: heat input converts to internal energy change and work output."
            }
        elif not is_bio and any(k in lower_text for k in ["eigenvalue", "eigenvector", "matrix", "linear algebra", "vector"]):
            visuals["vectorTransform"] = {
                "caption": "Linear transformation scaling eigenvector v along its span by characteristic factor λ."
            }
        elif not is_bio and any(k in lower_text for k in ["gradient", "loss", "training", "epoch", "neural", "deep learning", "machine learning"]):
            visuals["lossCurve"] = {
                "caption": "Optimization convergence profile: loss decreases toward global minimum over training epochs."
            }
            visuals["network"] = {
                "caption": "Neural architecture showing forward signal propagation and backward gradient updates."
            }
        else:
            visuals["conceptFlow"] = {
                "caption": "Sequential progression and conceptual hierarchy of core lecture principles."
            }

        return visuals

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
            today = datetime.now().strftime("%B %d, %Y")

            transcript_excerpt = " ".join(s.get("text_en", "") or s.get("text_source", "") for s in segments[:120])

            prompt = f"""You are ClassBridge, an expert AI educational assistant specialized in STEM instruction.
Synthesize a comprehensive, high-quality, structured lecture study guide from the following lecture transcript.
The student's target vernacular language is '{lang_name}' ({lang_native}, code: '{target_lang}').

Lecture Transcript:
{transcript_excerpt}

CRITICAL GENERATION REQUIREMENTS:
1. Overview: Provide a rich 3-5 sentence executive overview in English, and accurate translation in {lang_name}.
2. Definitions: MINIMUM 5-8 key technical terms, jargon, or concepts discussed in the lecture with definitions and vernacular translations.
3. Formulas: If the topic has mathematical, computational, algorithmic, physical, or logical formulas/equations, provide 3-5 formulas. If the lecture contains ZERO formula evidence or is non-STEM, 'formulas' MUST be [].
4. Takeaways: MINIMUM 6 bulleted key takeaways with timestamps and vernacular translations.
5. Flashcards: MINIMUM 7 interactive question/answer self-test cards.
6. Diagram: MINIMUM 5 sequential concept nodes with connecting edges.

Return ONLY valid JSON matching this exact JSON schema:
{{
  "title": "<Concise descriptive title of this specific lecture>",
  "date": "{today}",
  "target_language": "{lang_name}",
  "native_language": "{lang_native}",
  "overview": {{
    "en": "<Comprehensive 3-5 sentence executive overview>",
    "vernacular": "<Accurate translation in {lang_name}>"
  }},
  "diagram": {{
    "title": "<Lecture Concept Map>",
    "source": "BridgeAI Concept Map generated by Gemini",
    "nodes": [
      {{"id": "concept_1", "label": "<Concept 1>", "detail": "<Domain/Category>"}},
      {{"id": "concept_2", "label": "<Concept 2>", "detail": "<Relation or Category>"}},
      {{"id": "concept_3", "label": "<Concept 3>", "detail": "<Relation or Category>"}},
      {{"id": "concept_4", "label": "<Concept 4>", "detail": "<Relation or Category>"}},
      {{"id": "concept_5", "label": "<Concept 5>", "detail": "<Relation or Category>"}}
    ],
    "edges": [
      {{"from": "concept_1", "to": "concept_2"}},
      {{"from": "concept_2", "to": "concept_3"}},
      {{"from": "concept_3", "to": "concept_4"}},
      {{"from": "concept_4", "to": "concept_5"}}
    ]
  }},
  "definitions": [
    {{
      "term": "<English technical term>",
      "vernacular_term": "<{lang_name} translation with English in parentheses>",
      "category": "<STEM Domain>",
      "definition": "<Clear textbook-quality English definition>",
      "vernacular_definition": "<Clear vernacular explanation in {lang_name}>"
    }}
  ],
  "formulas": [
    {{
      "name": "<Formula or Law name>",
      "latex": "<Clean LaTeX or Unicode equation string>",
      "description": "<What the formula computes>",
      "variables": "<Variables list e.g. m: mass, v: velocity>"
    }}
  ],
  "takeaways": [
    {{
      "point": "<Bulleted key takeaway in English>",
      "vernacular_point": "<Bulleted key takeaway in {lang_name}>",
      "timestamp": "<Approximate timestamp>"
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
            models_to_try = ["gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-flash-latest"]
            data = None
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=dict(response_mime_type="application/json")
                    )
                    if response and response.text:
                        data = extract_json_from_response(response.text)
                        if data and data.get("definitions"):
                            logger.info(f"Successfully generated rich study guide with Gemini model {model_name}")
                            break
                except Exception as model_err:
                    logger.warning(f"Gemini model {model_name} failed: {model_err}, trying next model...")

            if not data:
                return None

            heuristic_fallback = self._heuristic_synthesis(segments, full_text_en, target_lang)

            if not data.get("definitions") or len(data.get("definitions", [])) < 3:
                data["definitions"] = heuristic_fallback["definitions"]

            # Strict evidence check for non-STEM / non-formula lectures
            lower_text = full_text_en.lower()
            detected_terms = glossary_engine.detect_terms_in_text(full_text_en)
            has_quant = any(tok in lower_text for tok in QUANT_INDICATORS)
            if not has_quant and not detected_terms:
                data["formulas"] = []
            elif not data.get("formulas") or len(data.get("formulas", [])) == 0:
                data["formulas"] = heuristic_fallback["formulas"]

            if not data.get("takeaways") or len(data.get("takeaways", [])) < 3:
                data["takeaways"] = heuristic_fallback["takeaways"]

            if not data.get("flashcards") or len(data.get("flashcards", [])) < 4:
                data["flashcards"] = heuristic_fallback["flashcards"]

            if not data.get("diagram") or not data.get("diagram", {}).get("nodes"):
                data["diagram"] = heuristic_fallback["diagram"]

            data["visuals"] = self._build_visuals(full_text_en, data.get("formulas", []))
            data["segment_count"] = len(segments)
            data["source"] = "gemini_generative"

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
            "visuals": {},
            "takeaways": [],
            "flashcards": [],
            "segment_count": 0
        }

study_guide_generator = StudyGuideGenerator()
