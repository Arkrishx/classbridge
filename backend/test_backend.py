import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_all():
    print("Testing ClassBridge Backend Endpoints...")
    
    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[OK] Health check passed:", r.json()["status"])
    
    # 2. Languages
    r = client.get("/api/languages")
    assert r.status_code == 200
    langs = r.json()["supported"]
    assert "ta" in langs and "ml" in langs and "hi" in langs
    assert len(langs) == 3
    print(f"[OK] Languages check passed: {len(langs)} supported Indic languages")
    
    # 3. Glossary
    r = client.get("/api/glossary?search=gradient")
    assert r.status_code == 200
    glossary_data = r.json()
    assert glossary_data["count"] > 0
    print(f"[OK] Glossary search passed: found {glossary_data['count']} terms for 'gradient'")

    # 4. Direct Translation
    r = client.post("/api/translate", json={"text": "Gradient descent optimizes the loss function.", "target_lang": "ta"})
    assert r.status_code == 200
    trans_res = r.json()
    assert "adapted_translation" in trans_res
    print(f"[OK] Translation endpoint passed (length: {len(trans_res['adapted_translation'])})")

    # 5. Sample Lecture
    r = client.get("/api/sample-lecture")
    assert r.status_code == 200
    samples = r.json()["samples"]
    assert len(samples) > 0
    print(f"[OK] Sample lecture endpoint returned {len(samples)} segments")
    
    # 5. Q&A (RAG)
    # Add a segment to RAG index first
    from backend.app.rag import rag_index, TranscriptSegment
    rag_index.clear()
    rag_index.add_segment(TranscriptSegment(
        segment_id=1,
        start=0.0,
        end=5.0,
        text_en="Today we explore gradient descent optimization and the learning rate parameter.",
        text_vernacular="இன்று நாம் சரிவு இறக்கம் (Gradient Descent) உகப்பாக்கம் மற்றும் கற்றல் வீதம் (Learning Rate) பற்றி ஆராய்வோம்.",
        confidence=96.5,
        domain_terms=[{"en": "Gradient Descent", "term": "gradient descent"}]
    ))
    
    r = client.post("/api/qa", json={"question": "What is gradient descent?", "target_lang": "ta"})
    assert r.status_code == 200
    qa_res = r.json()
    assert len(qa_res["citations"]) > 0
    assert qa_res["citations"][0]["segment_id"] == 1
    print("[OK] Grounded Q&A passed. Citation:", qa_res["citations"][0]["timestamp"])
    
    # 6. Study Guide Generation
    r = client.post("/api/study-guide", json={
        "target_lang": "ta",
        "segments": [
            {
                "id": 1,
                "text_en": "Eigenvalues and eigenvectors satisfy the characteristic equation Av = lambda v.",
                "text_vernacular": "சிறப்பியல்பு மதிப்பு மற்றும் திசையன் Av = λv சமன்பாட்டை நிறைவு செய்கின்றன.",
                "timestamp": "00:00 - 00:05"
            }
        ]
    })
    assert r.status_code == 200
    guide = r.json()
    assert len(guide["definitions"]) > 0 or len(guide["takeaways"]) > 0
    print(f"[OK] Study guide generated: '{guide['title']}' with {len(guide['definitions'])} definitions, {len(guide['formulas'])} formulas, {len(guide['flashcards'])} flashcards")
    
    # 7. PDF Export
    r = client.post("/api/study-guide/pdf", json={
        "target_lang": "ta",
        "segments": [
            {
                "id": 1,
                "text_en": "Gradient descent minimizes the loss function.",
                "text_vernacular": "சரிவு இறக்கம் இழப்புச் சார்பைக் குறைக்கிறது.",
                "timestamp": "00:00 - 00:05"
            }
        ]
    })
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 1000
    print(f"[OK] PDF Export generated successfully: {len(r.content)} bytes of PDF binary")
    
    print("\n========================================================")
    print("   ALL CLASSBRIDGE BACKEND UNIT & INTEGRATION TESTS PASSED!")
    print("========================================================")

if __name__ == "__main__":
    test_all()
