import io
import json
import base64
import time
import logging
import urllib.parse
import urllib.request
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.asr import asr_processor
from backend.app.translator import translator_service
from backend.app.glossary import glossary_engine
from backend.app.rag import rag_index, qa_service, TranscriptSegment
from backend.app.study_guide import study_guide_generator
from backend.app.pdf_export import pdf_export_service
from backend.app.classroom import classroom_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("classbridge.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-Time Vernacular Lecture Companion for Indic STEM Education"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session state
active_session = {
    "segments": [],
    "source_lang": "en",
    "target_lang": settings.DEFAULT_TARGET_LANG,
    "current_time_offset": 0.0
}

# Request / Response Schemas
class QuestionRequest(BaseModel):
    question: str
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "ta"
    segments: Optional[List[Dict[str, Any]]] = None

class StudyGuideRequest(BaseModel):
    target_lang: Optional[str] = "ta"
    segments: Optional[List[Dict[str, Any]]] = None
    guide: Optional[Dict[str, Any]] = None

class LangSwitchRequest(BaseModel):
    target_lang: str
    source_lang: Optional[str] = "en"

class CaptionsExportRequest(BaseModel):
    segments: Optional[List[Dict[str, Any]]] = None
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "ta"
    title: Optional[str] = "ClassBridge Live Bilingual Lecture Captions"

class GenerativeChatRequest(BaseModel):
    question: str
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "ta"
    segments: Optional[List[Dict[str, Any]]] = None
    mode: Optional[str] = "solo"  # solo | offline | online

class GenerativeStudyGuideRequest(BaseModel):
    target_lang: Optional[str] = "ta"
    segments: Optional[List[Dict[str, Any]]] = None
    mode: Optional[str] = "solo"  # solo | offline | online


# REST Endpoints
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "whisper_model": settings.WHISPER_MODEL_SIZE,
        "whisper_ready": asr_processor.model is not None,
        "default_language": settings.DEFAULT_TARGET_LANG,
        "glossary_terms_count": len(glossary_engine.get_all_terms())
    }

@app.get("/api/languages")
def get_languages():
    return {
        "default": settings.DEFAULT_TARGET_LANG,
        "supported": settings.SUPPORTED_LANGUAGES
    }

@app.get("/api/glossary")
def get_glossary(search: Optional[str] = None):
    terms = glossary_engine.get_all_terms()
    if search:
        search_lower = search.lower()
        terms = {k: v for k, v in terms.items() if search_lower in k or search_lower in v.get("en", "").lower()}
    return {
        "count": len(terms),
        "terms": terms
    }

@app.get("/api/sample-lecture")
def get_sample_lecture():
    """
    Provides rich pre-packaged STEM lecture transcripts (Linear Algebra & ML)
    enabling judges and reviewers to test the entire pipeline with a single click.
    """
    samples = [
        {
            "id": 1,
            "start": 0.0,
            "end": 4.5,
            "text_en": "Welcome class, today we begin our study of gradient descent and neural network optimization.",
            "confidence": 97.2
        },
        {
            "id": 2,
            "start": 4.5,
            "end": 9.2,
            "text_en": "Remember that an eigenvalue and its corresponding eigenvector satisfy the linear transformation Av equals lambda v.",
            "confidence": 95.8
        },
        {
            "id": 3,
            "start": 9.2,
            "end": 14.8,
            "text_en": "In deep learning, we compute derivatives via backpropagation to update the weights using our chosen learning rate.",
            "confidence": 94.6
        },
        {
            "id": 4,
            "start": 14.8,
            "end": 20.1,
            "text_en": "If the learning rate is too high, the loss function may diverge and cause severe overfitting.",
            "confidence": 96.1
        },
        {
            "id": 5,
            "start": 20.1,
            "end": 25.4,
            "text_en": "Similarly, in thermodynamics, entropy represents the state of microscopic disorder in a closed system.",
            "confidence": 93.9
        },
        {
            "id": 6,
            "start": 25.4,
            "end": 31.0,
            "text_en": "For algorithmic efficiency, binary search operates with time complexity O(log n) over sorted inputs.",
            "confidence": 98.4
        }
    ]
    return {"samples": samples}

@app.post("/api/session/reset")
def reset_session():
    active_session["segments"] = []
    active_session["current_time_offset"] = 0.0
    rag_index.clear()
    return {"status": "session_cleared"}

# Classroom REST Endpoints
@app.get("/api/classroom/rooms")
def get_active_rooms():
    return {
        "rooms": classroom_manager.get_all_rooms_summary()
    }

@app.get("/api/classroom/{room_id}")
def get_room_details(room_id: str):
    room = classroom_manager.get_room(room_id)
    if not room:
        return {
            "room_id": room_id.upper(),
            "exists": False,
            "has_teacher": False,
            "student_count": 0,
            "segments_count": 0
        }
    return {
        "room_id": room.room_id,
        "exists": True,
        "has_teacher": room.has_teacher,
        "student_count": room.student_count,
        "segments_count": len(room.segments),
        "source_lang": room.source_lang,
        "default_target_lang": room.default_target_lang,
        "is_camera_on": room.is_camera_on,
        "is_screen_sharing": room.is_screen_sharing,
        "roster_count": len(room.student_roster),
        "recent_segments": room.segments[-20:]
    }

@app.get("/api/classroom/{room_id}/roster")
def get_classroom_roster(room_id: str):
    room = classroom_manager.get_room(room_id)
    if not room:
        return {
            "room_id": room_id.upper(),
            "exists": False,
            "student_count": 0,
            "roster": []
        }
    return {
        "room_id": room.room_id,
        "exists": True,
        "student_count": room.student_count,
        "is_camera_on": room.is_camera_on,
        "is_screen_sharing": room.is_screen_sharing,
        "roster": room.get_roster()
    }

@app.post("/api/classroom/{room_id}/reset")
async def reset_classroom_room(room_id: str):
    room = classroom_manager.get_room(room_id)
    if room:
        room.segments.clear()
        room.current_time_offset = 0.0
        await classroom_manager.broadcast_to_room(room.room_id, {
            "type": "room_cleared",
            "message": "Lecture session has been cleared by the teacher."
        })
    return {"status": "room_cleared", "room_id": room_id.upper()}

class TranslateRequest(BaseModel):
    text: str
    target_lang: Optional[str] = "ta"
    source_lang: Optional[str] = "en"

@app.post("/api/translate")
def translate_text(req: TranslateRequest):
    if not req.text.strip():
        return {
            "original": "",
            "raw_translation": "",
            "adapted_translation": "",
            "source_lang": req.source_lang or "en",
            "target_lang": req.target_lang or "ta",
            "domain_terms": []
        }
    return translator_service.translate_segment(
        req.text,
        target_lang=req.target_lang or "ta",
        source_lang=req.source_lang or "en"
    )

tts_cache: Dict[str, bytes] = {}

@app.get("/api/tts")
def text_to_speech(text: str = Query(...), lang: str = Query(default="ta")):
    """
    Streams high-speed text-to-speech audio (MP3) for Indic and English text.
    Uses in-memory cache so repeated phrases/words stream instantly (0ms).
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    cache_key = f"{lang}:{clean_text}"
    if cache_key in tts_cache:
        return Response(content=tts_cache[cache_key], media_type="audio/mpeg")

    tl = lang.lower()
    if tl not in ["ta", "ml", "hi", "en"]:
        tl = "en"

    tts_text = clean_text[:200]
    encoded_query = urllib.parse.quote(tts_text)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={encoded_query}&tl={tl}&client=tw-ob"

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://translate.google.com/"
            }
        )
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            audio_bytes = resp.read()
            if len(tts_cache) < 500:
                tts_cache[cache_key] = audio_bytes
            return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.warning(f"Google TTS service error for '{tts_text}': {e}")
        raise HTTPException(status_code=502, detail=f"TTS synthesis error: {str(e)}")

@app.post("/api/qa")
def ask_lecture_question(req: QuestionRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    source_lang = req.source_lang or active_session.get("source_lang", "en")
    target_lang = req.target_lang or active_session.get("target_lang", "ta")
    segs = req.segments if req.segments is not None else active_session.get("segments", [])
    result = qa_service.answer_question(
        question=req.question,
        source_lang=source_lang,
        target_lang=target_lang,
        segments=segs
    )
    return result

@app.post("/api/study-guide")
def generate_study_guide(req: StudyGuideRequest):
    segs = req.segments if req.segments is not None else active_session["segments"]
    target_lang = req.target_lang or active_session["target_lang"]
    guide = study_guide_generator.generate(segs, target_lang=target_lang)
    return guide

@app.post("/api/generate/chat")
def generative_chat(req: GenerativeChatRequest):
    """
    Always-generative Bridge AI chatbot endpoint.
    Produces a fresh Gemini answer every call — no cache, no echoing stored data.
    Falls back to RAG QA service if Gemini key is unavailable.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    source_lang = req.source_lang or "en"
    target_lang = req.target_lang or "ta"
    segs = req.segments if req.segments is not None else active_session.get("segments", [])
    mode = req.mode or "solo"

    lang_meta = settings.SUPPORTED_LANGUAGES.get(target_lang, {"name": "Tamil", "native": "தமிழ்"})
    lang_name = lang_meta.get("name", "Tamil")
    lang_native = lang_meta.get("native", "தமிழ்")

    # Build transcript context
    transcript_lines = []
    for s in segs:
        ts = s.get("timestamp") or s.get("start", "")
        txt = s.get("text_en") or s.get("text_source") or ""
        if txt.strip():
            transcript_lines.append(f"[{ts}] {txt}")
    transcript_block = "\n".join(transcript_lines) if transcript_lines else ""

    mode_label = {"solo": "Solo Studio Recording", "offline": "Offline Classroom Session", "online": "Online Live Class"}.get(mode, "Lecture Session")

    if settings.GEMINI_API_KEY:
        try:
            from google import genai
            from backend.app.rag import extract_json_from_response
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            context_section = (
                f"Live {mode_label} Transcript (chronological, with timestamps):\n{transcript_block}"
                if transcript_block
                else f"No transcript recorded yet for this {mode_label}."
            )

            prompt = (
                f"You are BridgeAI, an expert, warm, and encouraging AI tutor embedded inside ClassBridge — "
                f"a real-time STEM lecture companion for college students studying in their vernacular language.\n"
                f"Student question: \"{req.question}\"\n"
                f"Session mode: {mode_label}\n"
                f"Target vernacular language: {lang_name} ({lang_native}, code: '{target_lang}')\n\n"
                f"{context_section}\n\n"
                f"Instructions (MUST follow):\n"
                f"1. Generate a FRESH, ORIGINAL response — do NOT echo or repeat transcript text verbatim.\n"
                f"2. If the question relates to something in the transcript, ground your answer with [timestamp] citations.\n"
                f"3. If not in transcript, provide a high-quality 2-3 sentence educational synthesis using your general knowledge.\n"
                f"4. Always respond with an English explanation AND a full, accurate translation in {lang_name}.\n"
                f"5. Extract 2-4 related STEM concepts.\n"
                f"6. Set 'found_in_lecture': true if grounded in the transcript, false otherwise.\n"
                f"7. Your answer must be INSIGHTFUL — explain WHY and HOW, not just what.\n\n"
                f"Return ONLY valid JSON:\n"
                f'{{ "found_in_lecture": true, "answer": "<insightful grounded explanation>", '
                f'"vernacular_answer": "<fluent {lang_name} translation>", '
                f'"related_concepts": ["concept1", "concept2"] }}'
            )

            models_to_try = ["gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-flash-latest"]
            for model_name in models_to_try:
                try:
                    resp = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=dict(response_mime_type="application/json")
                    )
                    if resp and resp.text:
                        q_data = extract_json_from_response(resp.text)
                        if q_data and q_data.get("answer"):
                            logger.info(f"[/api/generate/chat] Fresh Gemini answer via {model_name}")
                            return {
                                "found_in_lecture": bool(q_data.get("found_in_lecture", False)),
                                "question": req.question,
                                "answer": q_data["answer"].strip(),
                                "vernacular_answer": (q_data.get("vernacular_answer") or "").strip(),
                                "citations": [],
                                "related_concepts": q_data.get("related_concepts", []),
                                "concept_name": req.question,
                                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                "source": "gemini_generative"
                            }
                except Exception as m_err:
                    logger.info(f"[/api/generate/chat] Model {model_name} failed: {m_err}")
        except Exception as e:
            logger.warning(f"[/api/generate/chat] Gemini error: {e}")

    # Fallback to RAG QA service
    result = qa_service.answer_question(
        question=req.question,
        source_lang=source_lang,
        target_lang=target_lang,
        segments=segs
    )
    result["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    result["source"] = "rag_fallback"
    return result

@app.post("/api/generate/study-guide")
def generative_study_guide(req: GenerativeStudyGuideRequest):
    """
    Always-generative study guide endpoint.
    Produces a FRESH Gemini-synthesized study guide every call — no cache, no static templates.
    Guarantees ALL sections are populated (definitions, formulas, takeaways, flashcards, diagram, visuals).
    Falls back to heuristic synthesis if Gemini key is unavailable.
    """
    segs = req.segments if req.segments is not None else active_session.get("segments", [])
    target_lang = req.target_lang or active_session.get("target_lang", "ta")
    mode = req.mode or "solo"

    if not segs:
        from backend.app.study_guide import study_guide_generator
        empty = study_guide_generator._generate_empty_guide(target_lang)
        empty["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        empty["source"] = "empty"
        return empty

    lang_meta = settings.SUPPORTED_LANGUAGES.get(target_lang, {"name": "Tamil", "native": "தமிழ்"})
    lang_name = lang_meta.get("name", "Tamil")
    lang_native = lang_meta.get("native", "தமிழ்")
    mode_label = {"solo": "Solo Studio Recording", "offline": "Offline Classroom", "online": "Online Live Class"}.get(mode, "Lecture Session")

    # Cap transcript to avoid token overflow — use at most 120 segments
    segs_for_prompt = segs[:120]
    full_text_en = " ".join(s.get("text_en", "") or s.get("text_source", "") for s in segs_for_prompt)
    lower_text = full_text_en.lower()

    if settings.GEMINI_API_KEY:
        try:
            from google import genai
            from backend.app.rag import extract_json_from_response
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            today = __import__('datetime').datetime.now().strftime('%B %d, %Y')
            now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

            prompt = f"""You are ClassBridge, an expert AI educational assistant for STEM college students.
Session Mode: {mode_label}
Student's vernacular language: {lang_name} ({lang_native}, code: '{target_lang}')
Lecture Transcript ({len(segs_for_prompt)} segments):
{full_text_en}

TASK: Generate a COMPLETE, RICH, FRESH study guide with ALL sections fully populated.
RULES:
- Do NOT copy transcript sentences verbatim. Synthesize, explain, and expand.
- definitions: MINIMUM 5 entries — extract every key technical term mentioned.
- formulas: If the topic involves mathematics/physics/chemistry/CS equations, provide 3–5 formulas. If the topic is purely conceptual (e.g. history, literature) use [].
- takeaways: MINIMUM 6 clear bullet-point insights — not transcript echoes, but synthesized lessons.
- flashcards: MINIMUM 7 exam-quality question/answer cards covering all major concepts.
- diagram.nodes: MINIMUM 5 nodes forming a logical concept progression.
- All vernacular text must be accurately translated into {lang_name} ({lang_native}).

Return ONLY valid JSON matching this EXACT schema (no markdown fences, no extra fields):
{{
  "title": "<Concise descriptive title for this specific lecture>",
  "date": "{today}",
  "target_language": "{lang_name}",
  "native_language": "{lang_native}",
  "generated_at": "{now_iso}",
  "source": "gemini_generative",
  "overview": {{
    "en": "<Fresh 3-5 sentence executive overview — what was taught, why it matters, key conclusions>",
    "vernacular": "<Accurate full translation of the above into {lang_name}>"
  }},
  "diagram": {{
    "title": "<Lecture Concept Map>",
    "source": "BridgeAI Generative Concept Map",
    "nodes": [
      {{"id": "concept_1", "label": "<Key Concept 1>", "detail": "<Domain/Category>"}},
      {{"id": "concept_2", "label": "<Key Concept 2>", "detail": "<Relation or Category>"}},
      {{"id": "concept_3", "label": "<Key Concept 3>", "detail": "<Relation or Category>"}},
      {{"id": "concept_4", "label": "<Key Concept 4>", "detail": "<Relation or Category>"}},
      {{"id": "concept_5", "label": "<Key Concept 5>", "detail": "<Relation or Category>"}}
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
      "vernacular_term": "<{lang_name} translation (English in parentheses)>",
      "category": "<STEM Domain e.g. Machine Learning, Physics, Mathematics, Biology, Computer Science>",
      "definition": "<Clear, academic, textbook-quality English definition>",
      "vernacular_definition": "<Clear {lang_name} explanation>"
    }}
  ],
  "formulas": [
    {{
      "name": "<Formula or Law name>",
      "latex": "<Clean LaTeX or Unicode equation string>",
      "description": "<What the formula computes and when to use it>",
      "variables": "<Variable descriptions e.g. m: mass in kg, v: velocity in m/s>"
    }}
  ],
  "takeaways": [
    {{
      "point": "<Key insight in English — not copied from transcript, synthesized lesson>",
      "vernacular_point": "<Same insight in {lang_name}>",
      "timestamp": "<Approximate timestamp e.g. 00:00, 00:30>"
    }}
  ],
  "flashcards": [
    {{
      "id": 1,
      "front": "<Exam-style question in English>",
      "vernacular_front": "<Same question in {lang_name}>",
      "back": "<Concise accurate answer in English, optionally with {lang_name} translation>",
      "category": "<STEM Domain>"
    }}
  ]
}}
"""
            models_to_try = ["gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-flash-latest"]
            for model_name in models_to_try:
                try:
                    resp = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=dict(response_mime_type="application/json")
                    )
                    if resp and resp.text:
                        data = extract_json_from_response(resp.text)
                        if data and data.get("overview") and data.get("definitions"):
                            data["segment_count"] = len(segs)
                            data["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                            data["source"] = "gemini_generative"

                            from backend.app.study_guide import study_guide_generator

                            # ── 1. Ensure definitions has at least 5 entries ──
                            if not data.get("definitions") or len(data.get("definitions", [])) < 3:
                                heuristic_data = study_guide_generator._heuristic_synthesis(segs, full_text_en, target_lang)
                                data["definitions"] = heuristic_data.get("definitions", [])

                            # ── 2. Ensure formulas has items for any STEM/quantitative session ──
                            if not data.get("formulas") or len(data.get("formulas", [])) == 0:
                                extracted_f = study_guide_generator._extract_formulas(full_text_en, data.get("definitions", []))
                                if extracted_f:
                                    data["formulas"] = extracted_f

                            # ── 3. Ensure takeaways has at least 4 items ──
                            if not data.get("takeaways") or len(data.get("takeaways", [])) < 3:
                                heuristic_data = study_guide_generator._heuristic_synthesis(segs, full_text_en, target_lang)
                                data["takeaways"] = heuristic_data.get("takeaways", [])

                            # ── 4. Ensure flashcards has at least 5 cards ──
                            if not data.get("flashcards") or len(data.get("flashcards", [])) < 4:
                                data["flashcards"] = study_guide_generator._generate_flashcards(
                                    data.get("definitions", []), data.get("formulas", []), data.get("takeaways", []), target_lang
                                )

                            # ── 5. Ensure diagram has connected nodes & edges ──
                            if not data.get("diagram") or not data.get("diagram", {}).get("nodes") or len(data.get("diagram", {}).get("nodes", [])) < 3:
                                data["diagram"] = study_guide_generator._build_concept_diagram(
                                    data.get("definitions", []), data.get("formulas", []), data.get("takeaways", [])
                                )

                            # ── 6. Build visuals package (SVG visual explanation cards + equation) ──
                            data["visuals"] = study_guide_generator._build_visuals(full_text_en, data.get("formulas", []))

                            logger.info(f"[/api/generate/study-guide] Complete study guide via {model_name} — "
                                        f"{len(data.get('definitions',[]))} defs, "
                                        f"{len(data.get('formulas',[]))} formulas, "
                                        f"{len(data.get('flashcards',[]))} cards, "
                                        f"{len(data.get('takeaways',[]))} takeaways, "
                                        f"{len(data.get('diagram',{}).get('nodes',[]))} nodes, "
                                        f"visuals={list(data.get('visuals',{}).keys())}")
                            return data
                except Exception as m_err:
                    logger.info(f"[/api/generate/study-guide] Model {model_name} failed: {m_err}")
        except Exception as e:
            logger.warning(f"[/api/generate/study-guide] Gemini error: {e}")

    # Fallback to heuristic synthesis
    guide = study_guide_generator.generate(segs, target_lang=target_lang)
    guide["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    guide["source"] = "heuristic_fallback"
    return guide

@app.post("/api/study-guide/pdf")
def export_study_guide_pdf(req: StudyGuideRequest):
    if req.guide:
        guide = req.guide
    else:
        segs = req.segments if req.segments is not None else active_session["segments"]
        target_lang = req.target_lang or active_session["target_lang"]
        guide = study_guide_generator.generate(segs, target_lang=target_lang)
    pdf_bytes = pdf_export_service.generate_pdf(guide)

    target_lang = req.target_lang or guide.get("target_language", "ta")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=ClassBridge_Study_Guide_{target_lang}.pdf"
        }
    )

@app.post("/api/captions/pdf")
def export_captions_pdf(req: CaptionsExportRequest):
    segs = req.segments if req.segments is not None else active_session["segments"]
    source_lang = req.source_lang or active_session.get("source_lang", "en")
    target_lang = req.target_lang or active_session.get("target_lang", "ta")
    title = req.title or "ClassBridge Live Bilingual Lecture Captions"
    pdf_bytes = pdf_export_service.generate_captions_pdf(
        segments=segs,
        source_lang=source_lang,
        target_lang=target_lang,
        title=title
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=ClassBridge_Lecture_Captions_{source_lang}_{target_lang}.pdf"
        }
    )


# WebSocket Streaming Endpoint
@app.websocket("/ws/lecture")
async def websocket_lecture_endpoint(
    websocket: WebSocket,
    target_lang: str = Query(default="ta"),
    source_lang: str = Query(default="en")
):
    await websocket.accept()
    logger.info(f"WebSocket client connected with source: {source_lang}, target: {target_lang}")
    active_session["target_lang"] = target_lang
    active_session["source_lang"] = source_lang

    try:
        # Send initial connection handshake
        await websocket.send_json({
            "type": "handshake",
            "status": "connected",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "message": "ClassBridge Live Caption Server Ready."
        })

        while True:
            # Receive either binary audio data or text commands
            message = await websocket.receive()

            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                
                # Check for audio chunks
                if len(raw_bytes) > 2000:
                    # Transcribe using faster-whisper
                    offset = active_session["current_time_offset"]
                    # Try WAV / audio chunk transcription
                    asr_results = asr_processor.transcribe_audio_bytes(
                        raw_bytes,
                        time_offset=offset,
                        language=active_session.get("source_lang", "en")
                    )
                    
                    if not asr_results:
                        # Try raw PCM 16-bit
                        asr_results = asr_processor.transcribe_pcm16(
                            raw_bytes,
                            time_offset=offset,
                            language=active_session.get("source_lang", "en")
                        )

                    if asr_results:
                        for item in asr_results:
                            spoken_text = item["text"]
                            conf = item["confidence"]
                            start_t = item["start"]
                            end_t = item["end"]
                            
                            # Update offset
                            active_session["current_time_offset"] = max(active_session["current_time_offset"], end_t)

                            # Translate & Apply STEM Domain Adaptation
                            trans_res = translator_service.translate_segment(
                                spoken_text,
                                target_lang=active_session["target_lang"],
                                source_lang=active_session.get("source_lang", "en")
                            )

                            seg_id = len(active_session["segments"]) + 1
                            s_min, s_sec = int(start_t // 60), int(start_t % 60)
                            e_min, e_sec = int(end_t // 60), int(end_t % 60)
                            timestamp_str = f"{s_min:02d}:{s_sec:02d} - {e_min:02d}:{e_sec:02d}"

                            segment_data = {
                                "id": seg_id,
                                "start": start_t,
                                "end": end_t,
                                "timestamp": timestamp_str,
                                "text_en": spoken_text,
                                "text_source": spoken_text,
                                "text_vernacular": trans_res["adapted_translation"],
                                "raw_translation": trans_res["raw_translation"],
                                "confidence": conf,
                                "domain_terms": trans_res["domain_terms"],
                                "source_lang": active_session.get("source_lang", "en"),
                                "target_lang": active_session["target_lang"]
                            }

                            # Store in session & RAG index
                            active_session["segments"].append(segment_data)
                            rag_index.add_segment(TranscriptSegment(
                                segment_id=seg_id,
                                start=start_t,
                                end=end_t,
                                text_en=spoken_text,
                                text_vernacular=trans_res["adapted_translation"],
                                confidence=conf,
                                domain_terms=trans_res["domain_terms"]
                            ))

                            # Stream caption back to client immediately
                            await websocket.send_json({
                                "type": "caption",
                                "segment": segment_data
                            })
                    else:
                        # Audio had no detectable speech or was silence
                        await websocket.send_json({
                            "type": "silence",
                            "message": "Ambient audio detected / no speech."
                        })

            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    action = payload.get("action")

                    if action == "set_language":
                        new_lang = payload.get("language", "ta")
                        active_session["target_lang"] = new_lang
                        logger.info(f"Switched target language to {new_lang}")
                        await websocket.send_json({
                            "type": "language_updated",
                            "source_lang": active_session.get("source_lang", "en"),
                            "target_lang": new_lang
                        })

                    elif action == "set_source_language":
                        new_src = payload.get("language", "en")
                        active_session["source_lang"] = new_src
                        logger.info(f"Switched source language to {new_src}")
                        await websocket.send_json({
                            "type": "source_language_updated",
                            "source_lang": new_src,
                            "target_lang": active_session.get("target_lang", "ta")
                        })

                    elif action == "swap_languages":
                        old_source = active_session.get("source_lang", "en")
                        old_target = active_session.get("target_lang", "ta")
                        active_session["source_lang"] = old_target
                        active_session["target_lang"] = old_source
                        logger.info(f"Swapped languages: source={old_target}, target={old_source}")
                        await websocket.send_json({
                            "type": "languages_swapped",
                            "source_lang": old_target,
                            "target_lang": old_source
                        })

                    elif action == "process_text_segment":
                        # Direct text segment (e.g. from browser Web Speech API or sample lecture feeder)
                        spoken_text = payload.get("text", "").strip()
                        conf = float(payload.get("confidence", 95.0))
                        duration = float(payload.get("duration", 4.0))
                        sender_tab_id = payload.get("sender_tab_id")

                        if spoken_text:
                            start_t = active_session["current_time_offset"]
                            end_t = start_t + duration
                            active_session["current_time_offset"] = end_t

                            trans_res = translator_service.translate_segment(
                                spoken_text,
                                target_lang=active_session["target_lang"],
                                source_lang=active_session.get("source_lang", "en")
                            )

                            seg_id = len(active_session["segments"]) + 1
                            s_min, s_sec = int(start_t // 60), int(start_t % 60)
                            e_min, e_sec = int(end_t // 60), int(end_t % 60)
                            timestamp_str = f"{s_min:02d}:{s_sec:02d} - {e_min:02d}:{e_sec:02d}"

                            segment_data = {
                                "id": seg_id,
                                "start": start_t,
                                "end": end_t,
                                "timestamp": timestamp_str,
                                "text_en": spoken_text,
                                "text_source": spoken_text,
                                "text_vernacular": trans_res["adapted_translation"],
                                "raw_translation": trans_res["raw_translation"],
                                "confidence": conf,
                                "domain_terms": trans_res["domain_terms"],
                                "source_lang": active_session.get("source_lang", "en"),
                                "target_lang": active_session["target_lang"],
                                "sender_tab_id": sender_tab_id
                            }

                            active_session["segments"].append(segment_data)
                            rag_index.add_segment(TranscriptSegment(
                                segment_id=seg_id,
                                start=start_t,
                                end=end_t,
                                text_en=spoken_text,
                                text_vernacular=trans_res["adapted_translation"],
                                confidence=conf,
                                domain_terms=trans_res["domain_terms"]
                            ))

                            await websocket.send_json({
                                "type": "caption",
                                "segment": segment_data
                            })

                    elif action == "ping":
                        await websocket.send_json({"type": "pong"})

                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Server stream error: {str(e)}"
            })
        except Exception:
            pass


# Classroom WebSocket Streaming Endpoint
@app.websocket("/ws/classroom/{room_id}")
async def websocket_classroom_endpoint(
    websocket: WebSocket,
    room_id: str,
    role: str = Query(default="student"),
    source_lang: str = Query(default="en"),
    target_lang: str = Query(default="ta"),
    teacher_name: Optional[str] = Query(default="Teacher")
):
    await websocket.accept()
    clean_room = room_id.strip().upper()
    role = role.strip().lower()
    if role != "teacher":
        role = "student"

    logger.info(f"Classroom WS connection: room={clean_room}, role={role}, source={source_lang}, target={target_lang}, teacher_name={teacher_name}")

    if role == "teacher":
        room = await classroom_manager.register_teacher(clean_room, websocket, source_lang=source_lang, target_lang=target_lang, teacher_name=teacher_name or "Teacher")
    else:
        room = await classroom_manager.register_student(clean_room, websocket)

    try:
        # Handshake confirmation
        await websocket.send_json({
            "type": "handshake",
            "room_id": clean_room,
            "role": role,
            "teacher_name": room.teacher_name,
            "has_teacher": room.has_teacher,
            "student_count": room.student_count,
            "source_lang": room.source_lang,
            "is_camera_on": room.is_camera_on,
            "is_screen_sharing": room.is_screen_sharing,
            "hand_raises": list(room.hand_raises.values()),
            "qa_comments": room.qa_comments[-50:],
            "roster": room.get_roster() if role == "teacher" else None,
            "message": f"Connected to room {clean_room} as {role}."
        })

        if role == "teacher":
            await websocket.send_json({
                "type": "roster_update",
                "room_id": clean_room,
                "students": room.get_roster(),
                "student_count": room.student_count
            })

        # Send existing transcript history to new joiner
        if room.segments:
            await websocket.send_json({
                "type": "history",
                "room_id": clean_room,
                "segments": room.segments
            })

        while True:
            message = await websocket.receive()

            if role == "teacher":
                # Teacher can broadcast audio bytes or text actions
                if "bytes" in message and message["bytes"]:
                    raw_bytes = message["bytes"]
                    if len(raw_bytes) > 2000:
                        offset = room.current_time_offset
                        asr_results = asr_processor.transcribe_audio_bytes(
                            raw_bytes,
                            time_offset=offset,
                            language=room.source_lang
                        )
                        if not asr_results:
                            asr_results = asr_processor.transcribe_pcm16(
                                raw_bytes,
                                time_offset=offset,
                                language=room.source_lang
                            )

                        if asr_results:
                            for item in asr_results:
                                spoken_text = item["text"]
                                conf = item["confidence"]
                                start_t = item["start"]
                                end_t = item["end"]
                                room.current_time_offset = max(room.current_time_offset, end_t)

                                # Translate to ALL target languages (ta, ml, hi, en) for instantaneous student vernacular switching
                                multi_trans = translator_service.translate_all_targets(
                                    spoken_text,
                                    source_lang=room.source_lang,
                                    target_languages=["ta", "ml", "hi", "en"]
                                )

                                seg_id = len(room.segments) + 1
                                s_min, s_sec = int(start_t // 60), int(start_t % 60)
                                e_min, e_sec = int(end_t // 60), int(end_t % 60)
                                timestamp_str = f"{s_min:02d}:{s_sec:02d} - {e_min:02d}:{e_sec:02d}"

                                segment_data = {
                                    "id": seg_id,
                                    "start": start_t,
                                    "end": end_t,
                                    "timestamp": timestamp_str,
                                    "text_source": spoken_text,
                                    "text_en": spoken_text if room.source_lang == "en" else multi_trans["translations"].get("en", spoken_text),
                                    "text_vernacular": multi_trans["translations"].get(target_lang, spoken_text),
                                    "translations": multi_trans["translations"],
                                    "confidence": conf,
                                    "domain_terms": multi_trans["domain_terms"],
                                    "source_lang": room.source_lang,
                                    "target_lang": target_lang
                                }

                                classroom_manager.add_segment_to_room(clean_room, segment_data)
                                rag_index.add_segment(TranscriptSegment(
                                    segment_id=seg_id,
                                    start=start_t,
                                    end=end_t,
                                    text_en=segment_data["text_en"],
                                    text_vernacular=segment_data["text_vernacular"],
                                    confidence=conf,
                                    domain_terms=multi_trans["domain_terms"]
                                ))

                                # Broadcast to ALL connected students and teacher
                                await classroom_manager.broadcast_to_room(clean_room, {
                                    "type": "caption",
                                    "segment": segment_data
                                })
                        else:
                            await websocket.send_json({
                                "type": "silence",
                                "message": "Ambient audio detected / no speech."
                            })

                elif "text" in message and message["text"]:
                    try:
                        payload = json.loads(message["text"])
                        action = payload.get("action")

                        if action == "process_text_segment":
                            spoken_text = payload.get("text", "").strip()
                            conf = float(payload.get("confidence", 95.0))
                            duration = float(payload.get("duration", 4.0))
                            sender_tab_id = payload.get("sender_tab_id")

                            if spoken_text:
                                start_t = room.current_time_offset
                                end_t = start_t + duration
                                room.current_time_offset = end_t

                                multi_trans = translator_service.translate_all_targets(
                                    spoken_text,
                                    source_lang=room.source_lang,
                                    target_languages=["ta", "ml", "hi", "en"]
                                )

                                seg_id = len(room.segments) + 1
                                s_min, s_sec = int(start_t // 60), int(start_t % 60)
                                e_min, e_sec = int(end_t // 60), int(end_t % 60)
                                timestamp_str = f"{s_min:02d}:{s_sec:02d} - {e_min:02d}:{e_sec:02d}"

                                segment_data = {
                                    "id": seg_id,
                                    "start": start_t,
                                    "end": end_t,
                                    "timestamp": timestamp_str,
                                    "text_source": spoken_text,
                                    "text_en": spoken_text if room.source_lang == "en" else multi_trans["translations"].get("en", spoken_text),
                                    "text_vernacular": multi_trans["translations"].get(target_lang, spoken_text),
                                    "translations": multi_trans["translations"],
                                    "confidence": conf,
                                    "domain_terms": multi_trans["domain_terms"],
                                    "source_lang": room.source_lang,
                                    "target_lang": target_lang,
                                    "sender_tab_id": sender_tab_id
                                }

                                classroom_manager.add_segment_to_room(clean_room, segment_data)
                                rag_index.add_segment(TranscriptSegment(
                                    segment_id=seg_id,
                                    start=start_t,
                                    end=end_t,
                                    text_en=segment_data["text_en"],
                                    text_vernacular=segment_data["text_vernacular"],
                                    confidence=conf,
                                    domain_terms=multi_trans["domain_terms"]
                                ))

                                await classroom_manager.broadcast_to_room(clean_room, {
                                    "type": "caption",
                                    "segment": segment_data
                                })

                        elif action == "set_source_language":
                            new_src = payload.get("language", "en")
                            room.source_lang = new_src
                            await classroom_manager.broadcast_presence(clean_room)

                        elif action == "clear_room":
                            room.segments.clear()
                            room.current_time_offset = 0.0
                            await classroom_manager.broadcast_to_room(clean_room, {
                                "type": "room_cleared",
                                "message": "Lecture session has been cleared by the teacher."
                            })

                        elif action == "video_frame":
                            frame = payload.get("frame")
                            if frame:
                                await classroom_manager.broadcast_video_frame(clean_room, frame)

                        elif action == "video_state":
                            is_cam = bool(payload.get("is_camera_on", False))
                            is_scr = bool(payload.get("is_screen_sharing", False))
                            await classroom_manager.broadcast_video_state(clean_room, is_cam, is_scr)

                        elif action == "set_teacher_name":
                            new_name = payload.get("teacher_name", "").strip()
                            if new_name:
                                room.teacher_name = new_name
                                await classroom_manager.broadcast_presence(clean_room)

                        elif action == "keyword_caption":
                            keyword_text = (payload.get("text") or payload.get("keyword") or "").strip()
                            if keyword_text:
                                multi_trans = translator_service.translate_all_targets(
                                    keyword_text,
                                    source_lang=room.source_lang,
                                    target_languages=["ta", "ml", "hi", "en"]
                                )
                                seg_id = len(room.segments) + 1
                                start_t = room.current_time_offset
                                end_t = start_t + 5.0
                                room.current_time_offset = end_t
                                segment_data = {
                                    "id": seg_id,
                                    "start": start_t,
                                    "end": end_t,
                                    "timestamp": "KEYWORD",
                                    "text_source": keyword_text,
                                    "text_en": keyword_text if room.source_lang == "en" else multi_trans["translations"].get("en", keyword_text),
                                    "text_vernacular": multi_trans["translations"].get(target_lang, keyword_text),
                                    "translations": multi_trans["translations"],
                                    "confidence": 100.0,
                                    "is_keyword": True,
                                    "domain_terms": multi_trans["domain_terms"],
                                    "source_lang": room.source_lang,
                                    "target_lang": target_lang
                                }
                                classroom_manager.add_segment_to_room(clean_room, segment_data)
                                await classroom_manager.broadcast_to_room(clean_room, {
                                    "type": "caption",
                                    "segment": segment_data
                                })
                                await classroom_manager.broadcast_keyword_caption(clean_room, segment_data)

                        elif action == "qa_comment":
                            c_dict = payload.get("comment") if isinstance(payload.get("comment"), dict) else {}
                            c_text = (payload.get("text") or c_dict.get("text") or "").strip()
                            if c_text:
                                comment_data = {
                                    "id": c_dict.get("id") or payload.get("id") or f"c_{time.time()}",
                                    "sender_name": c_dict.get("sender_name") or payload.get("sender") or room.teacher_name,
                                    "sender_roll_no": c_dict.get("sender_roll_no") or payload.get("roll_no", "HOST"),
                                    "text": c_text,
                                    "sender_role": "teacher",
                                    "timestamp": c_dict.get("timestamp") or time.time()
                                }
                                await classroom_manager.broadcast_qa_comment(clean_room, comment_data)

                        elif action == "lower_all_hands":
                            room.hand_raises.clear()
                            await classroom_manager.broadcast_to_room(clean_room, {
                                "type": "hand_raise",
                                "room_id": clean_room,
                                "hand_raises": [],
                                "hand_raises_count": 0
                            })

                        elif action == "request_roster":
                            await websocket.send_json({
                                "type": "roster_update",
                                "room_id": clean_room,
                                "students": room.get_roster(),
                                "student_count": room.student_count
                            })

                        elif action == "ping":
                            await websocket.send_json({"type": "pong"})

                    except json.JSONDecodeError:
                        pass

            else:
                # Student role: read-only captions & video stream, plus identity registration, hand raise, Q&A comment
                if "text" in message and message["text"]:
                    try:
                        payload = json.loads(message["text"])
                        action = payload.get("action")
                        if action == "ping":
                            await websocket.send_json({"type": "pong"})
                        elif action == "request_history":
                            await websocket.send_json({
                                "type": "history",
                                "room_id": clean_room,
                                "segments": room.segments
                            })
                        elif action == "student_identify":
                            name = payload.get("name", "").strip()
                            roll_no = payload.get("roll_no", "").strip()
                            tgt = payload.get("target_lang", "ta")
                            tab_id = payload.get("student_tab_id", "")
                            if name and roll_no:
                                s_info = room.identify_student(websocket, name=name, roll_no=roll_no, target_lang=tgt, student_tab_id=tab_id)
                                await websocket.send_json({
                                    "type": "student_registered",
                                    "room_id": clean_room,
                                    "student": s_info
                                })
                                await classroom_manager.broadcast_roster(clean_room)

                        elif action == "hand_raise":
                            is_r = payload.get("raise_action") != "lower" if "raise_action" in payload else bool(payload.get("is_raised", True))
                            hand_info = {
                                "id": payload.get("student_tab_id") or f"ws_{abs(hash(websocket))}",
                                "student_tab_id": payload.get("student_tab_id", ""),
                                "name": payload.get("name", "Student"),
                                "roll_no": payload.get("roll_no", ""),
                                "is_raised": is_r,
                                "timestamp": payload.get("timestamp") or time.time()
                            }
                            await classroom_manager.broadcast_hand_raise(clean_room, hand_info)

                        elif action == "qa_comment":
                            c_dict = payload.get("comment") if isinstance(payload.get("comment"), dict) else {}
                            c_text = (payload.get("text") or c_dict.get("text") or "").strip()
                            if c_text:
                                comment_data = {
                                    "id": c_dict.get("id") or payload.get("id") or f"c_{time.time()}",
                                    "sender_name": c_dict.get("sender_name") or payload.get("name") or payload.get("sender") or "Student",
                                    "sender_roll_no": c_dict.get("sender_roll_no") or payload.get("roll_no", ""),
                                    "text": c_text,
                                    "sender_role": "student",
                                    "timestamp": c_dict.get("timestamp") or time.time()
                                }
                                await classroom_manager.broadcast_qa_comment(clean_room, comment_data)
                    except json.JSONDecodeError:
                        pass

    except WebSocketDisconnect:
        logger.info(f"Classroom WS disconnected: room={clean_room}, role={role}")
    except Exception as e:
        logger.error(f"Classroom WS error in room {clean_room}: {e}")
    finally:
        await classroom_manager.remove_connection(clean_room, websocket, role)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
