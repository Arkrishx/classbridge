import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

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
    assert "en" in langs and "ta" in langs and "ml" in langs and "hi" in langs
    assert len(langs) == 4
    print(f"[OK] Languages check passed: {len(langs)} supported languages (en, ta, ml, hi)")
    
    # 3. Glossary
    r = client.get("/api/glossary?search=gradient")
    assert r.status_code == 200
    glossary_data = r.json()
    assert glossary_data["count"] > 0
    print(f"[OK] Glossary search passed: found {glossary_data['count']} terms for 'gradient'")

    # 4. Bidirectional Translation Across All 4 Languages
    # Test en -> ta
    r = client.post("/api/translate", json={"text": "Gradient descent optimizes the loss function.", "source_lang": "en", "target_lang": "ta"})
    assert r.status_code == 200
    trans_res = r.json()
    assert len(trans_res["adapted_translation"]) > 0
    print(f"[OK] en -> ta translation passed: {trans_res['adapted_translation'][:30]}...")

    # Test ta -> en
    r = client.post("/api/translate", json={"text": "வணக்கம் மாணவர்களே", "source_lang": "ta", "target_lang": "en"})
    assert r.status_code == 200
    trans_res = r.json()
    assert len(trans_res["adapted_translation"]) > 0
    print(f"[OK] ta -> en translation passed: {trans_res['adapted_translation']}")

    # Test ml -> en
    r = client.post("/api/translate", json={"text": "നമസ്കാരം", "source_lang": "ml", "target_lang": "en"})
    assert r.status_code == 200
    trans_res = r.json()
    assert len(trans_res["adapted_translation"]) > 0
    print(f"[OK] ml -> en translation passed: {trans_res['adapted_translation']}")

    # Test hi -> en
    r = client.post("/api/translate", json={"text": "नमस्ते छात्रों", "source_lang": "hi", "target_lang": "en"})
    assert r.status_code == 200
    trans_res = r.json()
    assert len(trans_res["adapted_translation"]) > 0
    print(f"[OK] hi -> en translation passed: {trans_res['adapted_translation']}")

    # 5. Sample Lecture
    r = client.get("/api/sample-lecture")
    assert r.status_code == 200
    samples = r.json()["samples"]
    assert len(samples) > 0
    print(f"[OK] Sample lecture endpoint returned {len(samples)} segments")
    
    # 5. Q&A (RAG) — In-Lecture and Out-of-Topic Grounded Testing
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
    
    # 5a. In-Lecture Question
    r = client.post("/api/qa", json={"question": "What is gradient descent?", "source_lang": "en", "target_lang": "ta"})
    assert r.status_code == 200
    qa_res = r.json()
    assert qa_res["found_in_lecture"] is True
    assert len(qa_res["citations"]) > 0
    assert qa_res["citations"][0]["segment_id"] == 1
    assert "timestamp" in qa_res["citations"][0]
    assert "text_source" in qa_res["citations"][0]
    assert "internet_definition" in qa_res
    assert len(qa_res["internet_definition"]["text_source"]) > 0
    print(f"[OK] In-Lecture Grounded Q&A passed. Citation: {qa_res['citations'][0]['timestamp']} | Def: {qa_res['internet_definition']['term']}")

    # 5b. Out-of-Topic Question
    r = client.post("/api/qa", json={"question": "Explain photosynthesis in plants", "source_lang": "en", "target_lang": "ta"})
    assert r.status_code == 200
    oot_res = r.json()
    assert oot_res["found_in_lecture"] is False
    assert len(oot_res["citations"]) == 0
    assert "not covered" in oot_res["answer"].lower()
    assert "internet_definition" in oot_res
    assert len(oot_res["internet_definition"]["text_source"]) > 0
    print(f"[OK] Out-of-Topic Q&A passed: Detected out-of-lecture with Internet Def: {oot_res['internet_definition']['term']}")
    
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
    
    # 8. Real-Time Text-to-Speech (TTS)
    r = client.get("/api/tts?text=வணக்கம்&lang=ta")
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/mpeg"
    assert len(r.content) > 100
    print(f"[OK] Indic TTS audio stream generated: {len(r.content)} bytes audio/mpeg")

    # 9. Captions PDF Export
    r = client.post("/api/captions/pdf", json={
        "source_lang": "en",
        "target_lang": "ta",
        "title": "Unit Test Captions Export",
        "segments": [
            {
                "id": 1,
                "text_en": "Backpropagation computes gradients using the chain rule.",
                "text_vernacular": "பின்நோக்கு பரவல் சங்கிலி விதியைப் பயன்படுத்தி சாய்வுகளைக் கணக்கிடுகிறது.",
                "timestamp": "00:00 - 00:06",
                "confidence": 98.2,
                "domain_terms": [{"en": "Backpropagation", "term": "backpropagation"}]
            }
        ]
    })
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 1000
    print(f"[OK] Captions PDF Export passed: {len(r.content)} bytes of PDF binary")

    # 10. Online Classroom Advanced Features (Teacher Setup, Q&A, Keyword Broadcast, Hand Raises)
    print("\nTesting Online Classroom WebSocket Protocol & Advanced Features...")

    # 10A. Teacher Flow: setup, Q&A comment broadcast, lower all hands
    with client.websocket_connect("/ws/classroom/TEST-ONLINE-CLASS?role=teacher&teacher_name=Prof.%20Sharma&source_lang=en&target_lang=ta") as ws_teacher:
        msgs = [ws_teacher.receive_json() for _ in range(3)]
        t_hs = next((m for m in msgs if m.get("type") == "handshake"), None)
        assert t_hs is not None, "Teacher handshake missing"
        assert t_hs["teacher_name"] == "Prof. Sharma"
        assert t_hs["role"] == "teacher"
        print(f"[OK] Teacher handshake verified with name: {t_hs['teacher_name']}")

        # Teacher Q&A
        ws_teacher.send_json({"action": "qa_comment", "text": "Welcome students to today's machine learning session."})
        m_qa = ws_teacher.receive_json()
        assert m_qa["type"] == "qa_comment"
        assert "Welcome" in m_qa["comment"]["text"]
        print(f"[OK] Teacher Q&A comment verified: '{m_qa['comment']['text'][:35]}...'")

        # Teacher Lower All Hands
        ws_teacher.send_json({"action": "lower_all_hands"})
        m_low = ws_teacher.receive_json()
        assert m_low["type"] == "hand_raise"
        assert m_low["hand_raises_count"] == 0
        print("[OK] Teacher lower all hands verified (hand_raises_count = 0)")

    # 10B. Student Flow: locked student connection, registration, hand raise, Q&A comment
    with client.websocket_connect("/ws/classroom/TEST-ONLINE-CLASS?role=student&source_lang=en&target_lang=ta") as ws_student:
        s_hs = ws_student.receive_json()
        while s_hs.get("type") != "handshake":
            s_hs = ws_student.receive_json()
        assert s_hs["role"] == "student"
        print("[OK] Student connected with role=student verified")

        # Student identify
        ws_student.send_json({
            "action": "student_identify",
            "name": "Kavitha S",
            "roll_no": "22CS104",
            "target_lang": "ta",
            "student_tab_id": "tab_kavitha_104"
        })
        reg = ws_student.receive_json()
        assert reg["type"] == "student_registered"
        assert reg["student"]["name"] == "Kavitha S"
        assert reg["student"]["roll_no"] == "22CS104"
        print(f"[OK] Student registered: {reg['student']['name']} ({reg['student']['roll_no']})")

        # Student Hand Raise
        ws_student.send_json({
            "action": "hand_raise",
            "student_tab_id": "tab_kavitha_104",
            "name": "Kavitha S",
            "roll_no": "22CS104",
            "raise_action": "raise"
        })
        hr = ws_student.receive_json()
        while hr.get("type") != "hand_raise":
            hr = ws_student.receive_json()
        assert hr["type"] == "hand_raise"
        assert hr["hand_raises_count"] == 1
        print(f"[OK] Student hand raised broadcast received (count = {hr['hand_raises_count']})")

        # Student Q&A Comment
        ws_student.send_json({
            "action": "qa_comment",
            "text": "Why is the loss function convex in linear regression?",
            "name": "Kavitha S",
            "roll_no": "22CS104"
        })
        qa = ws_student.receive_json()
        while qa.get("type") != "qa_comment":
            qa = ws_student.receive_json()
        assert qa["type"] == "qa_comment"
        assert "convex" in qa["comment"]["text"]
        print(f"[OK] Student Q&A comment broadcast received: '{qa['comment']['text'][:35]}...'")

    print("\n========================================================")
    print("   ALL CLASSBRIDGE BACKEND UNIT & INTEGRATION TESTS PASSED!")
    print("========================================================")

if __name__ == "__main__":
    test_all()
