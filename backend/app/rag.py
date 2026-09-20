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


class InMemoryRAGIndex:
    """
    Lightweight, fast in-memory RAG index for real-time lecture transcripts.
    Supports BM25/TF-IDF similarity scoring with exact phrase matching for STEM vocabulary.
    """
    def __init__(self):
        self.segments: List[TranscriptSegment] = []

    def clear(self):
        self.segments = []

    def add_segment(self, segment: TranscriptSegment):
        self.segments.append(segment)

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Retrieves top_k most relevant transcript segments for a query.
        Combines token overlap, phrase matching, and STEM term boosts.
        """
        if not self.segments or not query.strip():
            return []

        query_tokens = set(re.findall(r'\w+', query.lower()))
        results = []

        for seg in self.segments:
            seg_text = (seg.text_en + " " + seg.text_vernacular).lower()
            seg_tokens = re.findall(r'\w+', seg_text)
            
            if not seg_tokens:
                continue

            # Token overlap score
            overlap = sum(1 for token in query_tokens if token in seg_tokens)
            score = overlap / (math.sqrt(len(query_tokens)) * math.sqrt(len(seg_tokens)) + 1e-5)

            # Bonus for exact query phrase match
            if query.lower() in seg_text:
                score += 1.0

            # Bonus if segment contains domain terms mentioned in query
            for term in seg.domain_terms:
                if term["term"] in query.lower():
                    score += 0.5

            if score > 0.05:
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

        title = term.title()
        extract_en = ""
        source_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(term)}"

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
                url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(term)}"
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
                logger.info(f"Wikipedia summary lookup for '{term}' direct page failed: {e}")

        # 3. If direct page summary not found, try Wikipedia OpenSearch for fuzzy topic title
        if not extract_en:
            try:
                search_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={urllib.parse.quote(term)}&limit=1&namespace=0&format=json"
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

        # Search index
        retrieved = self.rag_index.search(question, top_k=3)
        # In-lecture threshold: at least one match with score >= 0.10
        is_in_lecture = len(retrieved) > 0 and retrieved[0]["score"] >= 0.10

        # Fetch simple internet reference definition for both languages
        internet_def = self.internet_service.fetch_reference(
            query=question,
            source_lang=source_lang,
            target_lang=target_lang
        )

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
            grounded_en = (
                f"Based on segment #{top_seg['id']} at [{top_seg['timestamp']}], "
                f"the lecture explains: \"{actual_quote}\""
            )

            if target_lang == "ml":
                grounded_vernacular = (
                    f"പ്രഭാഷണ ഭാഗം #{top_seg['id']} [{top_seg['timestamp']}] പ്രകാരം: "
                    f"\"{top_seg['text_vernacular']}\""
                )
            elif target_lang == "hi":
                grounded_vernacular = (
                    f"व्याख्यान खंड #{top_seg['id']} [{top_seg['timestamp']}] के अनुसार: "
                    f"\"{top_seg['text_vernacular']}\""
                )
            elif target_lang == "ta":
                grounded_vernacular = (
                    f"விரிவுரை பகுதி #{top_seg['id']} [{top_seg['timestamp']}] இன் படி: "
                    f"\"{top_seg['text_vernacular']}\""
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
            concept_name = internet_def.get("term", question)
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

