# ClassBridge Architecture Specification
**TENSORA 2026 Hackathon | Problem Statement EDU-02**  
*Real-Time Vernacular Lecture Companion & Grounded Study Synthesis*

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Client Browser (React + Vite, Vercel Deployable)"]
        Mic["Microphone Input (16kHz Mono Stream)"]
        Preload["Sample Lecture Replay Buffer"]
        Streamer["AudioStreamer (MediaRecorder + Web Audio)"]
        WSClient["WebSocket Client (/ws/lecture)"]
        DualCaption["Dual-Language Caption Pane (Side-by-Side)"]
        ConfBadge["ASR Confidence Pill & Timestamps"]
        StudyModal["Structured Study Guide Modal"]
        PDFAction["PDF Export Engine"]
        ChatBot["Grounded Q&A Chat Panel"]
        Citations["Clickable Citation Badges [MM:SS]"]
    end

    subgraph Backend ["FastAPI Streaming Server (Python, int8 CPU/GPU)"]
        WSServer["WebSocket Endpoint & Multiplexer"]
        ASR["ASR Engine: faster-whisper (base int8)"]
        MT["Translation Engine: Config-driven Indic MT"]
        DomainLayer["Domain Adaptation Layer: STEM Glossary (80+ terms)"]
        SessionStore["Transcript Store & Memory Buffer"]
        RAGIndex["In-Memory RAG Vector / BM25 Index"]
        Synth["Study Guide Synthesizer (Gemini / Structured Fallback)"]
        PDF["ReportLab Academic PDF Generator"]
    end

    Mic --> Streamer
    Preload --> Streamer
    Streamer -->|Binary Audio Chunks (3s)| WSClient
    WSClient <-->|Bidirectional Events| WSServer

    WSServer --> ASR
    ASR -->|English Text + LogProb Confidence| MT
    MT -->|Raw Translation| DomainLayer
    DomainLayer -->|Corrected Vernacular + Domain Badges| SessionStore

    SessionStore --> WSServer
    WSServer -->|Live Caption Event| WSClient
    WSClient --> DualCaption
    WSClient --> ConfBadge

    SessionStore --> RAGIndex
    SessionStore --> Synth
    Synth --> PDF
    PDF --> PDFAction
    Synth --> StudyModal

    ChatBot <-->|Question & Citations| RAGIndex
    RAGIndex --> Citations
    Citations -.->|Jump & Highlight Line| DualCaption
```

---

## 2. Low-Latency Pipeline & Budget

To deliver a comfortable real-time experience for students following a live lecture, the pipeline operates with a target latency budget under 3.5 seconds:

| Stage | Operation | Target Duration | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Capture** | Audio Buffer Slicing | 3.00 s | Browser `MediaRecorder` / Web Audio buffer emitting chunks every 3s |
| **ASR** | faster-whisper Transcription | 0.18 s | int8-quantized CTranslate2 model on CPU with beam size 3 & VAD filter |
| **Confidence** | Log-Prob Score Mapping | < 0.01 s | Math formula: `(0.75 * exp(avg_logprob) + 0.25 * (1 - no_speech_prob)) * 100` |
| **Translation** | English ➔ Indic Vernacular | 0.12 s | Config-driven translation service with parallel request handling |
| **Domain Adaptation** | STEM Glossary Correction | 0.01 s | Longest-match regex scan over 80+ curated STEM technical terms |
| **WebSocket Emit** | JSON Transmission | < 0.01 s | Broadcasts `{ caption, confidence, domain_terms, timestamp }` |
| **Total Turnaround** | **End-to-End Latency** | **~3.32 s** | Continuous, smooth stream updating every 3 seconds |

---

## 3. Core Subsystems

### 3.1 Domain Adaptation Layer
General-purpose MT algorithms fail drastically on technical scientific phrases (e.g. translating *"gradient descent"* into *"சாய்வு வம்சாவளி"* — literal slope genealogy). 
The Domain Adaptation Layer:
1. Detects specialized STEM terms in English transcript segments using boundary-aware regex matching.
2. Applies standardized Indic terminology (Tamil, Malayalam, and Hindi) with dual-script English annotations in parentheses.
3. Attaches explanatory metadata (`category`, `definition`) directly to the caption payload so students can inspect the concept in the UI.

### 3.2 Explainable ASR Confidence Scoring
Rather than hiding model uncertainty, ClassBridge exposes a live confidence badge on every caption segment:
$$\text{Confidence} = \Big( 0.75 \cdot e^{\text{avg\_logprob}} + 0.25 \cdot (1 - P(\text{no\_speech})) \Big) \times 100\%$$
Color-coded thresholds:
- **High ($\ge 90\%$):** Green badge (`96% ASR Conf`)
- **Moderate ($80\% - 89\%$):** Amber badge
- **Low ($< 80\%$):** Red/Orange alert badge

### 3.3 Grounded RAG with Interactive Citations
The Retrieval-Augmented Generation subsystem:
1. Chunks and indexes every lecture segment with strict temporal boundaries (`start`, `end`, `timestamp_str`).
2. Combines term frequency, keyword overlap, and STEM glossary boosts for instant sub-millisecond retrieval.
3. Constrains synthesis to the retrieved segments, outputting citation tags.
4. **UI Linkage:** Clicking any citation badge in the chat panel triggers a smooth scroll and a glowing pulse effect on the exact corresponding caption line in the transcript pane.

### 3.4 Structured Study Guide & PDF Export
Synthesizes the entire lecture into a 5-part academic digest:
1. **Executive Overview** (Bilingual English + Indic)
2. **Key Scientific Definitions** (Formal definitions, vernacular equivalents, STEM categories)
3. **Formulas & Equations** (LaTeX rendered mathematical models, variable breakdowns)
4. **Bulleted Takeaways** (Time-stamped bullet points)
5. **Interactive Self-Study Flashcards** (Active recall flip cards)
6. **PDF Engine:** Rendered via ReportLab with custom typography, tables, and pagination for offline distribution.

---

## 4. Deployment Topology

1. **Vercel Frontend (Production Ready):**
   - Single Page Application built with Vite and React 19.
   - Configured via root and frontend `vercel.json` rewrites.
   - Built-in Browser/Demo fallback mode ensuring 100% functionality and interactivity even when inspecting the static Vercel preview.
2. **Containerized Backend (Render / Railway / Hugging Face Spaces / Local):**
   - Multi-stage `Dockerfile` with Python 3.11, ffmpeg, and CTranslate2.
   - Deploys via `render.yaml` blueprint or local `uvicorn backend.app.main:app --port 8000`.
