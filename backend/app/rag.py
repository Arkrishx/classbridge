import re
import math
import json
import urllib.parse
import urllib.request
import logging
from typing import List, Dict, Any, Optional
from backend.app.config import settings
from backend.app.translator import translator_service
from backend.app.glossary import glossary_engine

logger = logging.getLogger("classbridge.rag")

class TranscriptSegment:
    def __init__(
        self,
        segment_id: int,
        start: float,
        end: float,
        text_en: str,
        text_vernacular: str,
        confidence: float = 90.0,
        domain_terms: Optional[List[Dict[str, Any]]] = None
    ):
        self.id = segment_id
        self.start = start
        self.end = end
        self.text_en = text_en
        self.text_vernacular = text_vernacular
        self.confidence = confidence
        self.domain_terms = domain_terms or []

    def format_timestamp(self) -> str:
        s_min = int(self.start // 60)
        s_sec = int(self.start % 60)
        e_min = int(self.end // 60)
        e_sec = int(self.end % 60)
        return f"{s_min:02d}:{s_sec:02d} - {e_min:02d}:{e_sec:02d}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "start": self.start,
            "end": self.end,
            "timestamp": self.format_timestamp(),
            "text_en": self.text_en,
            "text_source": self.text_en,
            "text_vernacular": self.text_vernacular,
            "confidence": self.confidence,
            "domain_terms": self.domain_terms
        }


from rapidfuzz import fuzz

# Comprehensive STEM & Academic Acronyms / Synonyms Knowledgebase
STEM_ACRONYMS = {
    "nlp": ["natural language processing", "natural language understanding", "nlu", "nlg"],
    "natural language processing": ["nlp"],
    "ml": ["machine learning"],
    "machine learning": ["ml"],
    "dl": ["deep learning"],
    "deep learning": ["dl"],
    "ai": ["artificial intelligence"],
    "artificial intelligence": ["ai"],
    "cv": ["computer vision"],
    "computer vision": ["cv"],
    "rl": ["reinforcement learning"],
    "reinforcement learning": ["rl"],
    "sgd": ["stochastic gradient descent"],
    "stochastic gradient descent": ["sgd"],
    "gd": ["gradient descent"],
    "gradient descent": ["gd"],
    "ann": ["artificial neural network", "neural network"],
    "neural network": ["ann", "nn"],
    "cnn": ["convolutional neural network", "convnet"],
    "convolutional neural network": ["cnn"],
    "rnn": ["recurrent neural network"],
    "recurrent neural network": ["rnn"],
    "lstm": ["long short term memory", "long short-term memory"],
    "gru": ["gated recurrent unit"],
    "gan": ["generative adversarial network"],
    "llm": ["large language model", "foundation model"],
    "large language model": ["llm"],
    "pca": ["principal component analysis"],
    "principal component analysis": ["pca"],
    "svd": ["singular value decomposition"],
    "singular value decomposition": ["svd"],
    "svm": ["support vector machine"],
    "support vector machine": ["svm"],
    "rf": ["random forest"],
    "random forest": ["rf"],
    "lr": ["learning rate", "linear regression", "logistic regression"],
    "learning rate": ["lr", "step size", "eta"],
    "mse": ["mean squared error"],
    "mae": ["mean absolute error"],
    "rmse": ["root mean squared error"],
    "bptt": ["backpropagation through time"],
    "bp": ["backpropagation"],
    "backpropagation": ["bp", "backward pass"],
    "relu": ["rectified linear unit"],
    "bert": ["bidirectional encoder representations from transformers"],
    "gpt": ["generative pre-trained transformer"],
    "rag": ["retrieval augmented generation", "retrieval-augmented generation"],
    "api": ["application programming interface"],
    "loss": ["cost function", "loss function", "objective function", "error"],
    "loss function": ["cost function", "loss", "objective function", "error"],
    "cost function": ["loss function", "loss", "objective function"],
    "overfitting": ["high variance", "generalization error", "overfit"],
    "underfitting": ["high bias", "underfit"],
    "eigenvalue": ["characteristic value", "latent root", "eigen value"],
    "eigenvector": ["characteristic vector", "eigen vector"]
}

STOPWORDS = {
    'in', 'of', 'and', 'the', 'for', 'with', 'at', 'by', 'to', 'a', 'an',
    'is', 'are', 'was', 'were', 'it', 'on', 'this', 'that', 'from', 'as',
    'what', 'explain', 'define', 'tell', 'about', 'how', 'does', 'can', 'you',
    'give', 'me', 'some', 'info', 'briefly'
}

def clean_query_text(query: str) -> str:
    """Strips common interrogative prefixes to isolate core concepts."""
    q = query.strip().strip("?.!\"'¿¡")
    patterns = [
        r'^(?:what is|what are|what does|how does|can you explain|explain|define|tell me about|meaning of|definition of)\s+',
        r'^(?:what do you mean by|describe|briefly explain|give me info on|can you describe)\s+',
        r'\s+(?:in this lecture|in the lecture|in machine learning|in deep learning|in linear algebra)$'
    ]
    for p in patterns:
        q = re.sub(p, '', q, flags=re.IGNORECASE).strip()
    return q.strip("?.!\"'")

def matches_acronym_initials(acronym_or_term: str, text: str) -> bool:
    """
    Checks if an acronym (e.g. 'nlp' or 'gnn') matches the initial letters of words in text,
    or if text contains an acronym matching the phrase.
    """
    clean_term = acronym_or_term.lower().strip()
    clean_text = text.lower()
    
    # 1. Dictionary lookup
    if clean_term in STEM_ACRONYMS:
        for full in STEM_ACRONYMS[clean_term]:
            if full in clean_text:
                return True
                
    # 2. Dynamic initials regex: 'nlp' -> \bn\w+\s+l\w+\s+p\w*\b
    letters = [c for c in clean_term if c.isalpha()]
    if 2 <= len(letters) <= 5:
        pattern = r'\b' + r'\w+\s+'.join(letters[:-1]) + r'\w+\s+' + letters[-1] + r'\w*\b'
        try:
            if re.search(pattern, clean_text):
                return True
        except Exception:
            pass

    # 3. Dynamic reverse: if query has multi-word phrase, check if its acronym is in text
    words = re.findall(r'[a-zA-Z]+', clean_term)
    if 2 <= len(words) <= 5:
        initials = ''.join(w[0] for w in words).lower()
        if re.search(r'\b' + re.escape(initials) + r'\b', clean_text):
            return True

    return False


class InMemoryRAGIndex:
    """
    AI-Powered Semantic In-Memory RAG Index for real-time lecture transcripts.
    Combines:
    1. Acronym & abbreviation expansion (NLP <-> Natural Language Processing, ML <-> Machine Learning).
    2. Dynamic initials regex matching for unseen subject acronyms (e.g. GNN <-> Graph Neural Network).
    3. Cross-pollinated entity matching from Wikipedia and domain dictionaries.
    4. RapidFuzz token-set & partial string similarity scoring.
    """
    def __init__(self):
        self.segments: List[TranscriptSegment] = []

    def clear(self):
        self.segments = []

    def add_segment(self, segment: TranscriptSegment):
        self.segments.append(segment)

    def search(self, query: str, extra_concepts: Optional[List[str]] = None, top_k: int = 4) -> List[Dict[str, Any]]:
        if not self.segments or not query.strip():
            return []

        core_concept = clean_query_text(query).lower()
        query_lower = query.lower()
        query_tokens = set(re.findall(r'\w+', query_lower))
        concept_tokens = set(re.findall(r'\w+', core_concept))

        # Build list of expansion targets
        expansion_targets = set()
        if core_concept:
            expansion_targets.add(core_concept)
        if core_concept in STEM_ACRONYMS:
            expansion_targets.update(STEM_ACRONYMS[core_concept])
            
        if extra_concepts:
            for ec in extra_concepts:
                if ec:
                    ec_clean = clean_query_text(ec).lower()
                    if ec_clean:
                        expansion_targets.add(ec_clean)
                        if ec_clean in STEM_ACRONYMS:
                            expansion_targets.update(STEM_ACRONYMS[ec_clean])

        results = []

        for seg in self.segments:
            seg_text = (seg.text_en + " " + seg.text_vernacular).lower()
            seg_tokens = re.findall(r'\w+', seg_text)
            if not seg_tokens:
                continue

            # Content word extraction (filtering stopwords)
            content_words = set()
            for t in expansion_targets:
                for w in re.findall(r'[a-zA-Z]+', t):
                    if w not in STOPWORDS and len(w) > 2:
                        content_words.add(w)

            # 1. Acronym & Initials Matcher (Highest semantic confidence)
            acronym_hit = False
            for target in expansion_targets:
                if matches_acronym_initials(target, seg_text):
                    acronym_hit = True
                    break

            # 2. Phrase hit in lecture segment
            phrase_hit = False
            for target in expansion_targets:
                if len(target.split()) >= 2 and target in seg_text:
                    phrase_hit = True
                    break

            # 3. Domain terms match
            domain_hit = False
            for term in seg.domain_terms:
                term_en = term.get("en", "").lower()
                term_raw = term.get("term", "").lower()
                if (term_en and any(term_en in t or t in term_en for t in expansion_targets)) or \
                   (term_raw and any(term_raw in t or t in term_raw for t in expansion_targets)):
                    domain_hit = True
                    break

            # 4. Content words presence
            matching_content_words = [w for w in content_words if w in seg_tokens]

            # Strict guard: If there is no acronym match, no multi-word phrase match,
            # no domain term match, and no non-stopword content match, this segment is irrelevant!
            if not acronym_hit and not phrase_hit and not domain_hit and not matching_content_words:
                continue

            score = 0.0
            if acronym_hit:
                score += 2.5
            if phrase_hit:
                score += 2.0
            if domain_hit:
                score += 1.2
            if matching_content_words:
                token_ratio = len(matching_content_words) / max(len(content_words), 1)
                score += token_ratio * 1.5

            # Fuzzy token set bonus
            if core_concept:
                ts_score = fuzz.token_set_ratio(core_concept, seg_text) / 100.0
                score += ts_score * 0.8

            if score >= 0.5 or acronym_hit:
                results.append((score, seg))

        # Sort descending by relevance score
        results.sort(key=lambda x: x[0], reverse=True)
        top_matches = results[:top_k]

        return [
            {
                "score": round(score, 3),
                "segment": seg.to_dict()
            }
            for score, seg in top_matches
        ]


class InternetReferenceService:
    """
    Fetches simple educational definitions and summaries from the internet (Wikipedia / open web)
    for reference, with translation into the requested source and target languages.
    """
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def clean_query_term(self, question: str) -> str:
        q = question.strip().strip("?.!\"'")
        patterns = [
            r'^(?:what is|what are|what does|how does|can you explain|explain|define|tell me about|meaning of|definition of)\s+',
            r'^(?:what do you mean by|describe|briefly explain|give me info on)\s+',
            r'\s+(?:in this lecture|in the lecture|in machine learning|in deep learning|in linear algebra)$'
        ]
        for p in patterns:
            q = re.sub(p, '', q, flags=re.IGNORECASE).strip()
        return q.strip("?.!\"'")

    def fetch_reference(self, query: str, source_lang: str = "en", target_lang: str = "ta") -> Dict[str, Any]:
        term = self.clean_query_term(query)
        if not term:
            term = query.strip()

        cache_key = f"{term.lower()}:{source_lang}:{target_lang}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Check acronym expansion for clean encyclopedic lookup (e.g. nlp -> natural language processing)
        lookup_term = term
        term_lower = term.lower()
        if term_lower in STEM_ACRONYMS and STEM_ACRONYMS[term_lower]:
            lookup_term = STEM_ACRONYMS[term_lower][0]

        title = lookup_term.title()
        extract_en = ""
        source_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(lookup_term.replace(' ', '_'))}"

        # 1. Check local STEM domain glossary first for instant matching
        glossary_terms = glossary_engine.get_all_terms()
        matched_glossary = None
        term_lower = term.lower()
        if term_lower in glossary_terms:
            matched_glossary = glossary_terms[term_lower]
        else:
            for k, v in glossary_terms.items():
                if term_lower in k or k in term_lower:
                    matched_glossary = v
                    break

        if matched_glossary:
            title = matched_glossary.get("en", title)
            extract_en = matched_glossary.get("definition", "")

        # 2. If not in glossary or need live internet definition, query Wikipedia
        if not extract_en:
            try:
                url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(lookup_term)}"
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "ClassBridgeEdu/1.0 (educational-companion)"}
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        if data.get("extract"):
                            title = data.get("title", title)
                            extract_en = data.get("extract", "")
                            source_url = data.get("content_urls", {}).get("desktop", {}).get("page", source_url)
            except Exception as e:
                logger.info(f"Wikipedia summary lookup for '{lookup_term}' direct page failed: {e}")

        # 3. If direct page summary not found, try Wikipedia OpenSearch for fuzzy topic title
        if not extract_en:
            try:
                search_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={urllib.parse.quote(lookup_term)}&limit=1&namespace=0&format=json"
                req = urllib.request.Request(
                    search_url,
                    headers={"User-Agent": "ClassBridgeEdu/1.0 (educational-companion)"}
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.status == 200:
                        s_data = json.loads(resp.read().decode("utf-8"))
                        if len(s_data) >= 4 and s_data[1]:
                            found_title = s_data[1][0]
                            page_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(found_title)}"
                            req2 = urllib.request.Request(
                                page_url,
                                headers={"User-Agent": "ClassBridgeEdu/1.0"}
                            )
                            with urllib.request.urlopen(req2, timeout=3.0) as resp2:
                                if resp2.status == 200:
                                    data2 = json.loads(resp2.read().decode("utf-8"))
                                    if data2.get("extract"):
                                        title = data2.get("title", found_title)
                                        extract_en = data2.get("extract", "")
                                        source_url = data2.get("content_urls", {}).get("desktop", {}).get("page", source_url)
            except Exception as e:
                logger.info(f"Wikipedia OpenSearch fallback failed: {e}")

        # 4. Fallback if still empty
        if not extract_en:
            extract_en = f"{title} is a scientific or computational concept studied in technical curricula."

        # Keep definition concise (up to 2 sentences)
        sentences = re.split(r'(?<=[.!?])\s+', extract_en)
        concise_en = " ".join(sentences[:2]) if len(sentences) > 1 else extract_en

        # Translate into source_lang (if not en) and target_lang
        text_source = concise_en
        if source_lang != "en":
            tr_src = translator_service.translate(concise_en, source_lang="en", target_lang=source_lang)
            text_source = tr_src.get("adapted_translation", concise_en)

        text_target = concise_en
        if target_lang != "en":
            tr_tgt = translator_service.translate(concise_en, source_lang="en", target_lang=target_lang)
            text_target = tr_tgt.get("adapted_translation", concise_en)

        ref_result = {
            "term": title,
            "text_source": text_source,
            "text_target": text_target,
            "source_title": "Wikipedia Reference",
            "source_url": source_url
        }

        if len(self._cache) < 200:
            self._cache[cache_key] = ref_result

        return ref_result

internet_reference_service = InternetReferenceService()


class LectureQAService:
    """
    Retrieval-Augmented Generation (RAG) Q&A Service.
    Cross-references lecture captions to answer student questions with timestamps
    and actual sentences in both selected languages.
    If the question is out of topic, clearly indicates that it is not covered in the lecture
    and provides the simple reference definition from the internet in both selected languages.
    """
    def __init__(self, rag_index: InMemoryRAGIndex, internet_service: Optional[InternetReferenceService] = None):
        self.rag_index = rag_index
        self.internet_service = internet_service or internet_reference_service

    def answer_question(
        self,
        question: str,
        source_lang: str = "en",
        target_lang: str = "ta",
        segments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        # Synchronize dynamic segments if provided
        if segments:
            existing_ids = {s.id for s in self.rag_index.segments}
            for s in segments:
                s_id = s.get("id") or (len(self.rag_index.segments) + 1)
                if s_id not in existing_ids:
                    self.rag_index.add_segment(TranscriptSegment(
                        segment_id=s_id,
                        start=s.get("start", 0.0),
                        end=s.get("end", 5.0),
                        text_en=s.get("text_source") or s.get("text_en") or "",
                        text_vernacular=s.get("text_vernacular") or "",
                        confidence=s.get("confidence", 95.0),
                        domain_terms=s.get("domain_terms", [])
                    ))

        # 1. Fetch simple internet reference definition first for semantic entity resolution
        internet_def = self.internet_service.fetch_reference(
            query=question,
            source_lang=source_lang,
            target_lang=target_lang
        )

        resolved_term = internet_def.get("term")
        extra_concepts = [resolved_term] if resolved_term else []

        # 2. Search index using both question and resolved entity concepts
        retrieved = self.rag_index.search(question, extra_concepts=extra_concepts, top_k=3)
        # In-lecture threshold: at least one match with score >= 0.20
        is_in_lecture = len(retrieved) > 0 and retrieved[0]["score"] >= 0.20

        if is_in_lecture:
            top_seg = retrieved[0]["segment"]
            citations = []
            for match in retrieved:
                seg = match["segment"]
                citations.append({
                    "segment_id": seg["id"],
                    "timestamp": seg["timestamp"],
                    "text_source": seg.get("text_source") or seg["text_en"],
                    "text_vernacular": seg["text_vernacular"],
                    "relevance_score": match["score"]
                })

            actual_quote = top_seg.get("text_source") or top_seg["text_en"]
            actual_vernacular = top_seg.get("text_vernacular") or actual_quote
            concept_title = resolved_term or clean_query_text(question).title()

            # Default AI Tutor Synthesized Explanation
            grounded_en = (
                f"In this lecture at [{top_seg['timestamp']}], the instructor covers {concept_title}: "
                f"\"{actual_quote}\". "
                f"{internet_def.get('text_source', '')}"
            )

            # Optional: Enhanced Generative AI Tutor synthesis if Gemini API key available
            if settings.GEMINI_API_KEY:
                try:
                    from google import genai
                    client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    prompt = (
                        f"You are ClassBridge, an empathetic, top-tier AI tutor. "
                        f"Student Question: '{question}'\n"
                        f"Lecture Quote at [{top_seg['timestamp']}]: '{actual_quote}'\n"
                        f"Internet Definition: '{internet_def.get('text_source', '')}'\n"
                        f"In 2-3 concise, clear sentences, answer the student's question directly by connecting "
                        f"the lecture quote and concept. Include the timestamp [{top_seg['timestamp']}]."
                    )
                    resp = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt
                    )
                    if resp and resp.text:
                        grounded_en = resp.text.strip()
                except Exception as e:
                    logger.info(f"Gemini LLM generation fallback: {e}")

            if target_lang == "ml":
                grounded_vernacular = (
                    f"നിങ്ങളുടെ പ്രഭാഷണത്തിൽ [{top_seg['timestamp']}] സമയത്ത് {concept_title} സംബന്ധിച്ച് വിശദീകരിച്ചിട്ടുണ്ട്: "
                    f"\"{actual_vernacular}\". "
                    f"{internet_def.get('text_target', '')}"
                )
            elif target_lang == "hi":
                grounded_vernacular = (
                    f"आपके व्याख्यान में [{top_seg['timestamp']}] पर {concept_title} के बारे में बताया गया है: "
                    f"\"{actual_vernacular}\". "
                    f"{internet_def.get('text_target', '')}"
                )
            elif target_lang == "ta":
                grounded_vernacular = (
                    f"உங்கள் விரிவுரையில் [{top_seg['timestamp']}] நேரத்தில் {concept_title} பற்றி விரிவாகக் கூறப்பட்டுள்ளது: "
                    f"\"{actual_vernacular}\". "
                    f"{internet_def.get('text_target', '')}"
                )
            else:
                grounded_vernacular = grounded_en

            return {
                "found_in_lecture": True,
                "question": question,
                "answer": grounded_en,
                "vernacular_answer": grounded_vernacular,
                "citations": citations,
                "internet_definition": internet_def
            }
        else:
            # Out of Topic
            concept_name = resolved_term or question
            not_covered_en = (
                f"This topic ('{concept_name}') is not covered in the current lecture session transcript. "
                f"Here is a reference definition from the internet:"
            )

            if target_lang == "ml":
                not_covered_vernacular = (
                    f"ഈ വിഷയം ('{concept_name}') നിലവിലെ പ്രഭാഷണത്തിൽ ഉൾപ്പെടുത്തിയിട്ടില്ല. "
                    f"ഇന്റർനെറ്റിൽ നിന്നുള്ള ലളിതമായ വിവരണം താഴെ നൽകുന്നു:"
                )
            elif target_lang == "hi":
                not_covered_vernacular = (
                    f"यह विषय ('{concept_name}') वर्तमान व्याख्यान में शामिल नहीं है। "
                    f"इंटरनेट से सरल संदर्भ परिभाषा नीचे दी गई है:"
                )
            elif target_lang == "ta":
                not_covered_vernacular = (
                    f"இந்தத் தலைப்பு ('{concept_name}') தற்போதைய விரிவுரையில் இடம்பெறவில்லை. "
                    f"இணையத்திலிருந்து எளிய குறிப்பு வரையறை கீழே கொடுக்கப்பட்டுள்ளது:"
                )
            else:
                not_covered_vernacular = not_covered_en

            return {
                "found_in_lecture": False,
                "question": question,
                "answer": not_covered_en,
                "vernacular_answer": not_covered_vernacular,
                "citations": [],
                "internet_definition": internet_def
            }

# Global instances
rag_index = InMemoryRAGIndex()
qa_service = LectureQAService(rag_index, internet_reference_service)

