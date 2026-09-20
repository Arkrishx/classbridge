import re
import math
import logging
from typing import List, Dict, Any, Optional
from backend.app.config import settings

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


class LectureQAService:
    """
    Retrieval-Augmented Generation (RAG) Q&A Service.
    Answers student questions strictly grounded in the lecture transcript,
    citing timestamps and transcript lines for maximum explainability.
    """
    def __init__(self, rag_index: InMemoryRAGIndex):
        self.rag_index = rag_index

    def answer_question(self, question: str, target_lang: str = "ta") -> Dict[str, Any]:
        retrieved = self.rag_index.search(question, top_k=4)
        
        if not retrieved:
            # Fallback if no relevant segment found
            if target_lang == "ml":
                vernacular_not_found = f"ഈ പ്രഭാഷണത്തിൽ '{question}' എന്നതുമായി ബന്ധപ്പെട്ട വിവരങ്ങൾ കണ്ടെത്തിയില്ല."
            elif target_lang == "hi":
                vernacular_not_found = f"इस व्याख्यान में '{question}' से संबंधित कोई जानकारी नहीं मिली।"
            else:
                vernacular_not_found = f"இந்த விரிவுரையில் '{question}' தொடர்பான குறிப்புகள் எதுவும் கிடைக்கவில்லை."

            return {
                "question": question,
                "answer": f"I could not find information directly addressing '{question}' in this lecture transcript yet. Try asking about topics or terms mentioned in the lecture.",
                "vernacular_answer": vernacular_not_found,
                "citations": []
            }

        # Build context from retrieved segments
        context_parts = []
        citations = []
        for match in retrieved:
            seg = match["segment"]
            context_parts.append(
                f"[Segment {seg['id']} | Timestamp: {seg['timestamp']}]\n"
                f"English: {seg['text_en']}\n"
                f"Vernacular: {seg['text_vernacular']}"
            )
            citations.append({
                "segment_id": seg["id"],
                "timestamp": seg["timestamp"],
                "text_en": seg["text_en"],
                "text_vernacular": seg["text_vernacular"],
                "relevance_score": match["score"]
            })

        context_str = "\n\n".join(context_parts)

        # Attempt LLM generation if key available
        llm_answer = self._generate_with_llm(question, context_str, target_lang)
        if llm_answer:
            return {
                "question": question,
                "answer": llm_answer.get("answer"),
                "vernacular_answer": llm_answer.get("vernacular_answer"),
                "citations": citations
            }

        # High quality grounded deterministic synthesis fallback
        top_seg = retrieved[0]["segment"]
        grounded_answer = (
            f"Based on segment {top_seg['id']} at {top_seg['timestamp']}, "
            f"the lecture states: \"{top_seg['text_en']}\""
        )
        if target_lang == "ml":
            vernacular_ans = (
                f"പ്രഭാഷണ ഭാഗം {top_seg['id']} ({top_seg['timestamp']}) പ്രകാരം: "
                f"\"{top_seg['text_vernacular']}\""
            )
        elif target_lang == "hi":
            vernacular_ans = (
                f"व्याख्यान खंड {top_seg['id']} ({top_seg['timestamp']}) के अनुसार: "
                f"\"{top_seg['text_vernacular']}\""
            )
        else:
            vernacular_ans = (
                f"விரிவுரை பகுதி {top_seg['id']} ({top_seg['timestamp']}) இன் படி: "
                f"\"{top_seg['text_vernacular']}\""
            )

        return {
            "question": question,
            "answer": grounded_answer,
            "vernacular_answer": vernacular_ans,
            "citations": citations
        }

    def _generate_with_llm(self, question: str, context: str, target_lang: str) -> Optional[Dict[str, str]]:
        # 1. Try Gemini
        gemini_key = settings.GEMINI_API_KEY
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                prompt = f"""You are ClassBridge, an AI lecture assistant for students.
Answer the following student question ONLY using facts explicitly stated in the lecture transcript segments provided below.
Rules:
1. Ground every statement in the lecture. Cite the specific timestamp [MM:SS] used.
2. Provide both an English answer and a clear vernacular ({target_lang}) translation.
3. Be concise, educational, and clear.

Transcript Segments:
{context}

Question: {question}

Format your response as:
ENGLISH: <answer with [MM:SS] citation>
VERNACULAR: <vernacular answer with [MM:SS] citation>
"""
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                text = response.text
                return self._parse_llm_output(text)
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}")

        # 2. Try OpenAI if key present
        if settings.OPENAI_API_KEY:
            try:
                import requests
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are ClassBridge, a grounded lecture assistant. Answer using ONLY the provided transcript segments with [MM:SS] citations."},
                        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}\nProvide ENGLISH: and VERNACULAR: response."}
                    ],
                    "temperature": 0.2
                }
                res = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=10)
                if res.status_code == 200:
                    text = res.json()["choices"][0]["message"]["content"]
                    return self._parse_llm_output(text)
            except Exception as e:
                logger.warning(f"OpenAI call failed: {e}")

        return None

    def _parse_llm_output(self, text: str) -> Dict[str, str]:
        en_part = text
        vernacular_part = ""
        if "VERNACULAR:" in text:
            parts = text.split("VERNACULAR:")
            en_part = parts[0].replace("ENGLISH:", "").strip()
            vernacular_part = parts[1].strip()
        return {
            "answer": en_part,
            "vernacular_answer": vernacular_part
        }

# Global instances
rag_index = InMemoryRAGIndex()
qa_service = LectureQAService(rag_index)
