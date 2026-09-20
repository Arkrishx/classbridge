import io
import json
import base64
import logging
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
    "target_lang": settings.DEFAULT_TARGET_LANG,
    "current_time_offset": 0.0
}

# Request / Response Schemas
class QuestionRequest(BaseModel):
    question: str
    target_lang: Optional[str] = "ta"

class StudyGuideRequest(BaseModel):
    target_lang: Optional[str] = "ta"
    segments: Optional[List[Dict[str, Any]]] = None

class LangSwitchRequest(BaseModel):
    target_lang: str


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

class TranslateRequest(BaseModel):
    text: str
    target_lang: Optional[str] = "ta"

@app.post("/api/translate")
def translate_text(req: TranslateRequest):
    if not req.text.strip():
        return {
            "original": "",
            "raw_translation": "",
            "adapted_translation": "",
            "target_lang": req.target_lang or "ta",
            "domain_terms": []
        }
    return translator_service.translate_segment(req.text, target_lang=req.target_lang)

@app.post("/api/qa")
def ask_lecture_question(req: QuestionRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    result = qa_service.answer_question(req.question, target_lang=req.target_lang or active_session["target_lang"])
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


# WebSocket Streaming Endpoint
@app.websocket("/ws/lecture")
async def websocket_lecture_endpoint(websocket: WebSocket, target_lang: str = Query(default="ta")):
    await websocket.accept()
    logger.info(f"WebSocket client connected with target language: {target_lang}")
    active_session["target_lang"] = target_lang

    try:
        # Send initial connection handshake
        await websocket.send_json({
            "type": "handshake",
            "status": "connected",
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
                            en_text = item["text"]
                            conf = item["confidence"]
                            start_t = item["start"]
                            end_t = item["end"]
                            
                            # Update offset
                            active_session["current_time_offset"] = max(active_session["current_time_offset"], end_t)

                            # Translate & Apply STEM Domain Adaptation
                            trans_res = translator_service.translate_segment(
                                en_text,
                                target_lang=active_session["target_lang"]
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
                                "text_en": en_text,
                                "text_vernacular": trans_res["adapted_translation"],
                                "raw_translation": trans_res["raw_translation"],
                                "confidence": conf,
                                "domain_terms": trans_res["domain_terms"],
                                "target_lang": active_session["target_lang"]
                            }

                            # Store in session & RAG index
                            active_session["segments"].append(segment_data)
                            rag_index.add_segment(TranscriptSegment(
                                segment_id=seg_id,
                                start=start_t,
                                end=end_t,
                                text_en=en_text,
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
                            "target_lang": new_lang
                        })

                    elif action == "process_text_segment":
                        # Direct text segment (e.g. from browser Web Speech API or sample lecture feeder)
                        en_text = payload.get("text", "").strip()
                        conf = float(payload.get("confidence", 95.0))
                        duration = float(payload.get("duration", 4.0))

                        if en_text:
                            start_t = active_session["current_time_offset"]
                            end_t = start_t + duration
                            active_session["current_time_offset"] = end_t

                            trans_res = translator_service.translate_segment(
                                en_text,
                                target_lang=active_session["target_lang"]
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
                                "text_en": en_text,
                                "text_vernacular": trans_res["adapted_translation"],
                                "raw_translation": trans_res["raw_translation"],
                                "confidence": conf,
                                "domain_terms": trans_res["domain_terms"],
                                "target_lang": active_session["target_lang"]
                            }

                            active_session["segments"].append(segment_data)
                            rag_index.add_segment(TranscriptSegment(
                                segment_id=seg_id,
                                start=start_t,
                                end=end_t,
                                text_en=en_text,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
