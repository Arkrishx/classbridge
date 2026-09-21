import io
import json
import base64
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

class LangSwitchRequest(BaseModel):
    target_lang: str
    source_lang: Optional[str] = "en"

class CaptionsExportRequest(BaseModel):
    segments: Optional[List[Dict[str, Any]]] = None
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "ta"
    title: Optional[str] = "ClassBridge Live Bilingual Lecture Captions"


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
        "recent_segments": room.segments[-20:]
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

@app.post("/api/study-guide/pdf")
def export_study_guide_pdf(req: StudyGuideRequest):
    segs = req.segments if req.segments is not None else active_session["segments"]
    target_lang = req.target_lang or active_session["target_lang"]
    guide = study_guide_generator.generate(segs, target_lang=target_lang)
    pdf_bytes = pdf_export_service.generate_pdf(guide)

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
                    asr_results = asr_processor.transcribe_audio_bytes(raw_bytes, time_offset=offset)
                    
                    if not asr_results:
                        # Try raw PCM 16-bit
                        asr_results = asr_processor.transcribe_pcm16(raw_bytes, time_offset=offset)

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
                                "target_lang": active_session["target_lang"]
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
    target_lang: str = Query(default="ta")
):
    await websocket.accept()
    clean_room = room_id.strip().upper()
    role = role.strip().lower()
    if role != "teacher":
        role = "student"

    logger.info(f"Classroom WS connection: room={clean_room}, role={role}, source={source_lang}, target={target_lang}")

    if role == "teacher":
        room = await classroom_manager.register_teacher(clean_room, websocket, source_lang=source_lang, target_lang=target_lang)
    else:
        room = await classroom_manager.register_student(clean_room, websocket)

    try:
        # Handshake confirmation
        await websocket.send_json({
            "type": "handshake",
            "room_id": clean_room,
            "role": role,
            "has_teacher": room.has_teacher,
            "student_count": room.student_count,
            "source_lang": room.source_lang,
            "message": f"Connected to room {clean_room} as {role}."
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
                        asr_results = asr_processor.transcribe_audio_bytes(raw_bytes, time_offset=offset)
                        if not asr_results:
                            asr_results = asr_processor.transcribe_pcm16(raw_bytes, time_offset=offset)

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

                        elif action == "ping":
                            await websocket.send_json({"type": "pong"})

                    except json.JSONDecodeError:
                        pass

            else:
                # Student role: read-only captions stream
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
