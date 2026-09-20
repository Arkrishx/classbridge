import React, { useState, useEffect, useRef } from 'react';
import Header, { SUPPORTED_LANGUAGES } from './components/Header';
import AudioControls from './components/AudioControls';
import CaptionPane from './components/CaptionPane';
import ChatPanel from './components/ChatPanel';
import StudyGuideModal from './components/StudyGuideModal';
import GlossaryModal from './components/GlossaryModal';
import AboutModal from './components/AboutModal';
import ErrorBanner from './components/ErrorBanner';
import { AudioStreamer } from './utils/audioStreamer';
import { translateTextClient } from './utils/clientTranslator';
import confetti from 'canvas-confetti';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// Fallback STEM Glossary for standalone Vercel preview
const FALLBACK_GLOSSARY = {
  "eigenvalue": {
    "en": "Eigenvalue",
    "ta": "சிறப்பியல்பு மதிப்பு (Eigenvalue)",
    "hi": "अभिलाक्षणिक मान (Eigenvalue)",
    "category": "Linear Algebra",
    "definition": "A scalar associated with a linear system of equations that measures factor expansion."
  },
  "eigenvector": {
    "en": "Eigenvector",
    "ta": "சிறப்பியல்பு திசையன் (Eigenvector)",
    "hi": "अभिलाक्षणिक सदिश (Eigenvector)",
    "category": "Linear Algebra",
    "definition": "A non-zero vector whose direction remains unchanged when a linear transformation is applied."
  },
  "gradient descent": {
    "en": "Gradient Descent",
    "ta": "சரிவு இறக்கம் (Gradient Descent)",
    "hi": "प्रवणता अवरोहण (Gradient Descent)",
    "category": "Machine Learning",
    "definition": "First-order iterative optimization algorithm for finding a local minimum of a function."
  },
  "backpropagation": {
    "en": "Backpropagation",
    "ta": "பின்நோக்கு பரவல் (Backpropagation)",
    "hi": "पश्च-प्रसार (Backpropagation)",
    "category": "Machine Learning",
    "definition": "Algorithm used to calculate gradients of loss function with respect to weights using chain rule."
  },
  "loss function": {
    "en": "Loss Function",
    "ta": "இழப்புச் சார்பு (Loss Function)",
    "hi": "हानि फलन (Loss Function)",
    "category": "Machine Learning",
    "definition": "Function that maps values onto a real number representing cost or discrepancy."
  },
  "learning rate": {
    "en": "Learning Rate",
    "ta": "கற்றல் வீதம் (Learning Rate)",
    "hi": "सीखने की दर (Learning Rate)",
    "category": "Machine Learning",
    "definition": "Tuning parameter in optimization determining the step size at each iteration."
  },
  "overfitting": {
    "en": "Overfitting",
    "ta": "மிகைப்பொருத்தம் (Overfitting)",
    "hi": "अति-सन्निकटन (Overfitting)",
    "category": "Machine Learning",
    "definition": "Modeling error where a function corresponds too closely or exactly to a particular dataset."
  },
  "entropy": {
    "en": "Entropy",
    "ta": "என்ட்ரோபி / ஒழுங்கின்மை அளவு (Entropy)",
    "hi": "एन्ट्रॉपी / अव्यवस्था (Entropy)",
    "category": "Physics",
    "definition": "Scientific concept associated with state of disorder, randomness, or uncertainty."
  },
  "binary search": {
    "en": "Binary Search",
    "ta": "இருபடி தேடல் (Binary Search)",
    "hi": "द्विआधारी खोज (Binary Search)",
    "category": "Computer Science",
    "definition": "Search algorithm that finds target position in a sorted array in O(log n) time."
  }
};

// Rich Sample Lecture Datasets for 1-Click Demos
const SAMPLE_LECTURES = {
  ml: [
    {
      text_en: "Welcome class, today we begin our study of gradient descent and neural network optimization.",
      text_vernacular: "வணக்கம் மாணவர்களே, இன்று நாம் சரிவு இறக்கம் (Gradient Descent) மற்றும் நரம்பியல் வலைப்பின்னல் உகப்பாக்கம் பற்றிய நமது ஆய்வைத் தொடங்குகிறோம்.",
      confidence: 97.4,
      start: 0.0,
      end: 4.5,
      timestamp: "00:00 - 00:04",
      domain_terms: [{ en: "Gradient Descent", term: "gradient descent", adapted_vernacular: "சரிவு இறக்கம் (Gradient Descent)", category: "Machine Learning", definition: "First-order iterative optimization algorithm for finding a local minimum." }]
    },
    {
      text_en: "In deep learning, we compute derivatives via backpropagation to update the weights using our chosen learning rate.",
      text_vernacular: "ஆழ்ந்த கற்றலில் (Deep Learning), நமது கற்றல் வீதம் (Learning Rate) பயன்படுத்தி எடைகளைப் புதுப்பிக்க பின்நோக்கு பரவல் (Backpropagation) வழியாக வகைக்கெழுக்களைக் கணக்கிடுகிறோம்.",
      confidence: 95.8,
      start: 4.5,
      end: 10.2,
      timestamp: "00:04 - 00:10",
      domain_terms: [
        { en: "Backpropagation", term: "backpropagation", adapted_vernacular: "பின்நோக்கு பரவல் (Backpropagation)", category: "Machine Learning", definition: "Algorithm used to calculate gradients of loss function with respect to weights." },
        { en: "Learning Rate", term: "learning rate", adapted_vernacular: "கற்றல் வீதம் (Learning Rate)", category: "Machine Learning", definition: "Tuning parameter in optimization determining the step size." }
      ]
    },
    {
      text_en: "If the learning rate is too high, the loss function may diverge and cause severe overfitting on training data.",
      text_vernacular: "கற்றல் வீதம் அதிகமாக இருந்தால், இழப்புச் சார்பு (Loss Function) விலகி பயிற்சித் தரவில் கடுமையான மிகைப்பொருத்தம் (Overfitting) ஏற்படுத்தக்கூடும்.",
      confidence: 96.5,
      start: 10.2,
      end: 16.0,
      timestamp: "00:10 - 00:16",
      domain_terms: [
        { en: "Loss Function", term: "loss function", adapted_vernacular: "இழப்புச் சார்பு (Loss Function)", category: "Machine Learning", definition: "Cost function measuring prediction error." },
        { en: "Overfitting", term: "overfitting", adapted_vernacular: "மிகைப்பொருத்தம் (Overfitting)", category: "Machine Learning", definition: "Model error corresponding too closely to training data." }
      ]
    },
    {
      text_en: "The fundamental parameter update formula is theta at t plus one equals theta minus eta times the gradient of the loss.",
      text_vernacular: "அடிப்படை அளவுரு புதுப்பித்தல் சூத்திரம்: தீட்டா t கூட்டல் ஒன்று சமன் தீட்டா கழித்தல் ஈட்டா பெருக்கல் இழப்பின் சரிவு (θ_{t+1} = θ_t - η ∇J(θ_t)).",
      confidence: 98.2,
      start: 16.0,
      end: 22.8,
      timestamp: "00:16 - 00:22",
      domain_terms: [{ en: "Gradient Descent", term: "gradient descent", adapted_vernacular: "சரிவு இறக்கம் (Gradient Descent)", category: "Machine Learning", definition: "Parameter update θ_{t+1} = θ_t - η ∇J(θ_t)." }]
    },
    {
      text_en: "Next lecture we will study stochastic gradient descent which computes gradients over mini-batches instead of the full dataset.",
      text_vernacular: "அடுத்த விரிவுரையில் நாம் முழுத் தரவுத்தொகுப்பிற்குப் பதிலாக மினி-பேட்சுகளில் சரிவுகளைக் கணக்கிடும் சீரற்ற சரிவு இறக்கம் (Stochastic Gradient Descent) பற்றி படிப்போம்.",
      confidence: 94.7,
      start: 22.8,
      end: 29.5,
      timestamp: "00:22 - 00:29",
      domain_terms: [{ en: "Stochastic Gradient Descent", term: "stochastic gradient descent", adapted_vernacular: "சீரற்ற சரிவு இறக்கம் (Stochastic Gradient Descent)", category: "Machine Learning", definition: "SGD computes updates over mini-batches." }]
    }
  ],
  linear_algebra: [
    {
      text_en: "Welcome to Linear Algebra. Today we explore eigenvalues and eigenvectors of square transformation matrices.",
      text_vernacular: "நேரியல் இயற்கணிதத்திற்கு நல்வரவு. இன்று நாம் சதுர உருமாற்ற அணிகளின் சிறப்பியல்பு மதிப்பு (Eigenvalue) மற்றும் சிறப்பியல்பு திசையன் (Eigenvector) பற்றி ஆராய்வோம்.",
      confidence: 97.0,
      start: 0.0,
      end: 5.2,
      timestamp: "00:00 - 00:05",
      domain_terms: [
        { en: "Eigenvalue", term: "eigenvalue", adapted_vernacular: "சிறப்பியல்பு மதிப்பு (Eigenvalue)", category: "Linear Algebra", definition: "Scalar factor measuring vector expansion." },
        { en: "Eigenvector", term: "eigenvector", adapted_vernacular: "சிறப்பியல்பு திசையன் (Eigenvector)", category: "Linear Algebra", definition: "Vector whose direction remains unchanged under linear transformation." }
      ]
    },
    {
      text_en: "Remember that an eigenvalue lambda and eigenvector v satisfy the fundamental matrix equation A v equals lambda v.",
      text_vernacular: "சிறப்பியல்பு மதிப்பு லாம்ப்டா (λ) மற்றும் திசையன் v ஆகியவை அடிப்படை அணிச் சமன்பாடான A v = λ v ஐ நிறைவு செய்கின்றன என்பதை நினைவில் கொள்க.",
      confidence: 96.2,
      start: 5.2,
      end: 11.5,
      timestamp: "00:05 - 00:11",
      domain_terms: [{ en: "Eigenvalue", term: "eigenvalue", adapted_vernacular: "சிறப்பியல்பு மதிப்பு (Eigenvalue)", category: "Linear Algebra", definition: "A v = λ v characteristic equation." }]
    },
    {
      text_en: "To solve for eigenvalues, we compute the determinant of A minus lambda times identity matrix and set it to zero.",
      text_vernacular: "சிறப்பியல்பு மதிப்புகளைக் கண்டுபிடிக்க, A கழித்தல் லாம்ப்டா பெருக்கல் அலகு அணியின் அணிக்கோவை மதிப்பை (Determinant: det(A - λI) = 0) கணக்கிடுகிறோம்.",
      confidence: 95.1,
      start: 11.5,
      end: 18.0,
      timestamp: "00:11 - 00:18",
      domain_terms: [{ en: "Determinant", term: "determinant", adapted_vernacular: "அணிக்கோவை மதிப்பு (Determinant)", category: "Linear Algebra", definition: "det(A - λI) = 0 characteristic polynomial." }]
    },
    {
      text_en: "In geometric terms, eigenvectors define the invariant axes along which space merely stretches or shrinks.",
      text_vernacular: "வடிவியல் ரீதியாக, சிறப்பியல்பு திசையன்கள் விண்வெளி நீட்டிக்கப்படும் அல்லது சுருங்கும் மாறாத அச்சுகளை வரையறுக்கின்றன.",
      confidence: 94.3,
      start: 18.0,
      end: 24.5,
      timestamp: "00:18 - 00:24",
      domain_terms: [{ en: "Eigenvector", term: "eigenvector", adapted_vernacular: "சிறப்பியல்பு திசையன் (Eigenvector)", category: "Linear Algebra", definition: "Invariant axes of transformation." }]
    }
  ]
};

export default function App() {
  const [targetLang, setTargetLang] = useState('ta');
  const [segments, setSegments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [studyGuide, setStudyGuide] = useState(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isAskingQa, setIsAskingQa] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [glossary, setGlossary] = useState(FALLBACK_GLOSSARY);
  const [interimSpeech, setInterimSpeech] = useState('');

  const wsRef = useRef(null);
  const streamerRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize Connection & Load Glossary
  useEffect(() => {
    connectWebSocket();
    loadGlossary();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (streamerRef.current) streamerRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Session duration timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const loadGlossary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/glossary`);
      if (res.ok) {
        const data = await res.json();
        if (data.terms && Object.keys(data.terms).length > 0) {
          setGlossary(data.terms);
        }
      }
    } catch (e) {
      // Backend not running yet, use built-in fallback glossary
      setGlossary(FALLBACK_GLOSSARY);
    }
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = `${WS_BASE_URL}/ws/lecture?target_lang=${targetLang}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setErrorMessage(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'caption' && data.segment) {
            setSegments((prev) => [...prev, data.segment]);
          } else if (data.type === 'silence') {
            // Ambient noise / silence detected
          } else if (data.type === 'error') {
            setErrorMessage(data.message);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('browser_assisted');
      };

      ws.onerror = () => {
        setConnectionStatus('browser_assisted');
      };
    } catch (e) {
      setConnectionStatus('browser_assisted');
    }
  };

  const handleLanguageChange = (newLang) => {
    setTargetLang(newLang);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_language', language: newLang }));
    }
  };

  const processSpeechText = async (spokenText, confidence = 95) => {
    if (!spokenText || !spokenText.trim()) return;
    setInterimSpeech('');

    // If backend WebSocket is open, send for backend ASR/MT processing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'process_text_segment',
        text: spokenText.trim(),
        confidence: confidence,
        duration: 4.0
      }));
      return;
    }

    // Real-time live browser transcription & translation fallback
    try {
      const transResult = await translateTextClient(spokenText.trim(), targetLang, glossary);
      setSegments((prev) => {
        const segId = prev.length + 1;
        const startT = (segId - 1) * 4;
        const endT = segId * 4;
        const sMin = Math.floor(startT / 60);
        const sSec = startT % 60;
        const eMin = Math.floor(endT / 60);
        const eSec = endT % 60;
        const timestampStr = `${sMin.toString().padStart(2, '0')}:${sSec.toString().padStart(2, '0')} - ${eMin.toString().padStart(2, '0')}:${eSec.toString().padStart(2, '0')}`;

        return [
          ...prev,
          {
            id: segId,
            start: startT,
            end: endT,
            timestamp: timestampStr,
            text_en: spokenText.trim(),
            text_vernacular: transResult.adapted_translation,
            raw_translation: transResult.raw_translation,
            confidence: confidence,
            domain_terms: transResult.domain_terms,
            target_lang: targetLang
          }
        ];
      });
    } catch (err) {
      console.error("Error processing live speech segment:", err);
    }
  };

  // Toggle Microphone
  const toggleRecording = () => {
    if (isRecording) {
      if (streamerRef.current) {
        streamerRef.current.stop();
      }
      setIsRecording(false);
      setAudioLevel(0);
      setInterimSpeech('');
    } else {
      const streamer = new AudioStreamer({
        onAudioData: (buffer) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(buffer);
          }
        },
        onVolumeChange: (vol) => {
          setAudioLevel(vol);
        },
        onInterimSpeech: (text) => {
          setInterimSpeech(text);
        },
        onSpeechRecognized: (text, conf) => {
          processSpeechText(text, conf);
        },
        onError: (err) => {
          setErrorMessage(`Microphone note: ${err.message}. You can also type or paste speech in the box below to test without a microphone.`);
          setIsRecording(false);
          setInterimSpeech('');
        }
      });

      streamer.start();
      streamerRef.current = streamer;
      setIsRecording(true);
      setErrorMessage(null);
    }
  };

  // 1-Click Sample Lecture Replay
  const handleLoadSample = (topic = 'ml') => {
    const sampleItems = SAMPLE_LECTURES[topic] || SAMPLE_LECTURES.ml;
    
    // Animate streaming in the segments sequentially to simulate live lecture capture
    sampleItems.forEach((item, index) => {
      setTimeout(() => {
        const segId = segments.length + index + 1;
        setSegments((prev) => {
          if (prev.some((s) => s.text_en === item.text_en)) return prev;
          return [
            ...prev,
            {
              id: segId,
              start: item.start,
              end: item.end,
              timestamp: item.timestamp,
              text_en: item.text_en,
              text_vernacular: item.text_vernacular,
              confidence: item.confidence,
              domain_terms: item.domain_terms,
              target_lang: targetLang
            }
          ];
        });

        // Also notify backend if websocket connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: 'process_text_segment',
            text: item.text_en,
            confidence: item.confidence,
            duration: item.end - item.start
          }));
        }
      }, index * 800);
    });

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
  };

  const clearSession = async () => {
    setSegments([]);
    setMessages([]);
    setStudyGuide(null);
    setSessionSeconds(0);
    setHighlightedSegmentId(null);

    try {
      await fetch(`${API_BASE_URL}/api/session/reset`, { method: 'POST' });
    } catch (e) {
      // Ignored if backend offline
    }
  };

  // Grounded Q&A
  const handleSendMessage = async (question) => {
    const userMsg = { role: 'user', text: question };
    setMessages((prev) => [...prev, userMsg]);
    setIsAskingQa(true);

    try {
      // Attempt call to backend RAG
      const res = await fetch(`${API_BASE_URL}/api/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, target_lang: targetLang })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: data.answer,
            vernacular: data.vernacular_answer,
            citations: data.citations || []
          }
        ]);
        setIsAskingQa(false);
        return;
      }
    } catch (e) {
      console.log("Backend Q&A unavailable, using client-side grounded RAG fallback.");
    }

    // Client-side Grounded RAG Fallback
    const qTokens = question.toLowerCase().split(/\s+/);
    let bestMatch = null;
    let maxScore = -1;

    segments.forEach((seg) => {
      const text = (seg.text_en + " " + seg.text_vernacular).toLowerCase();
      let score = 0;
      qTokens.forEach((tok) => {
        if (tok.length > 2 && text.includes(tok)) score += 1;
      });
      if (score > maxScore) {
        maxScore = score;
        bestMatch = seg;
      }
    });

    if (bestMatch && maxScore > 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Based on segment #${bestMatch.id} at [${bestMatch.timestamp}], the lecture explains: "${bestMatch.text_en}"`,
          vernacular: `பகுதி #${bestMatch.id} [${bestMatch.timestamp}] இன் படி: "${bestMatch.text_vernacular}"`,
          citations: [
            {
              segment_id: bestMatch.id,
              timestamp: bestMatch.timestamp,
              text_en: bestMatch.text_en,
              text_vernacular: bestMatch.text_vernacular
            }
          ]
        }
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `I could not find information directly addressing "${question}" in this lecture transcript yet. Try asking about the formulas, eigenvalues, or gradient descent mentioned in the captions.`,
          vernacular: `விரிவுரையில் இந்தக் கேள்விக்கான தகவல் இன்னும் இடம்பெறவில்லை.`,
          citations: []
        }
      ]);
    }
    setIsAskingQa(false);
  };

  // Generate Study Guide
  const handleGenerateStudyGuide = async () => {
    if (segments.length === 0) {
      setErrorMessage("Please capture some lecture speech or load a sample lecture before generating a study guide.");
      return;
    }

    setIsGeneratingGuide(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/study-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_lang: targetLang, segments })
      });

      if (res.ok) {
        const guideData = await res.json();
        setStudyGuide(guideData);
        setIsGeneratingGuide(false);
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        return;
      }
    } catch (e) {
      console.log("Backend study guide unavailable, generating client-side guide.");
    }

    // Client-side fallback study guide generator
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || { name: 'Tamil', native: 'தமிழ்' };
    const guideData = {
      title: "Machine Learning & STEM Fundamentals",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      target_language: langObj.name,
      native_language: langObj.native,
      segment_count: segments.length,
      overview: {
        en: `Comprehensive study guide synthesized from ${segments.length} lecture segments focusing on gradient descent, eigenvalues, backpropagation, and core STEM principles.`,
        vernacular: `${segments.length} விரிவுரை பகுதிகளிலிருந்து தொகுக்கப்பட்ட விரிவான STEM படிப்பு வழிகாட்டி.`
      },
      definitions: [
        {
          term: "Gradient Descent",
          vernacular_term: "சரிவு இறக்கம் (Gradient Descent)",
          category: "Machine Learning",
          definition: "First-order iterative optimization algorithm for finding a local minimum of a differentiable loss function.",
          vernacular_definition: "ஒரு சார்பின் உள்ளூர் குறைந்தபட்சத்தைக் கண்டறிவதற்கான முதல்-வரிசை மறுசெயல்முறை உகப்பாக்கம்."
        },
        {
          term: "Eigenvalue",
          vernacular_term: "சிறப்பியல்பு மதிப்பு (Eigenvalue)",
          category: "Linear Algebra",
          definition: "Scalar factor that scales an eigenvector during a linear transformation without changing its line of action.",
          vernacular_definition: "நேரியல் உருமாற்றத்தில் திசையனின் திசையை மாற்றாமல் அளவிடும் காரணி."
        },
        {
          term: "Backpropagation",
          vernacular_term: "பின்நோக்கு பரவல் (Backpropagation)",
          category: "Machine Learning",
          definition: "Efficient gradient computation algorithm via chain rule throughout layered neural networks.",
          vernacular_definition: "சங்கிலி விதியைப் பயன்படுத்தி நரம்பியல் வலைப்பின்னல்களில் சரிவுகளைக் கணக்கிடும் வழிமுறை."
        }
      ],
      formulas: [
        {
          name: "Gradient Descent Parameter Update",
          latex: "θ_{t+1} = θ_t - η ∇J(θ_t)",
          description: "Iteratively steps parameter vector θ in the negative gradient direction scaled by learning rate η.",
          variables: "θ: weights/parameters, η: learning rate, ∇J: gradient of loss"
        },
        {
          name: "Eigenvalue Characteristic Equation",
          latex: "A v = λ v  ⟺  det(A - λ I) = 0",
          description: "Relates square transformation matrix A to eigenvalue λ and eigenvector v.",
          variables: "A: transformation matrix, v: eigenvector, λ: eigenvalue, I: identity matrix"
        }
      ],
      takeaways: segments.slice(0, 5).map((s, idx) => ({
        point: s.text_en,
        vernacular_point: s.text_vernacular,
        timestamp: s.timestamp || `00:${idx * 15}`
      })),
      flashcards: [
        {
          id: 1,
          front: "What is Gradient Descent?",
          vernacular_front: "சரிவு இறக்கம் என்றால் என்ன?",
          back: "An optimization algorithm that minimizes the loss function by iteratively moving in the direction of steepest descent.",
          category: "Machine Learning"
        },
        {
          id: 2,
          front: "What equation defines an eigenvalue and eigenvector?",
          vernacular_front: "சிறப்பியல்பு மதிப்பு மற்றும் திசையனை வரையறுக்கும் சமன்பாடு எது?",
          back: "A v = λ v, where matrix A acts on non-zero vector v resulting in scaled vector λv.",
          category: "Linear Algebra"
        },
        {
          id: 3,
          front: "What happens if the learning rate is too large?",
          vernacular_front: "கற்றல் வீதம் மிக அதிகமாக இருந்தால் என்ன நடக்கும்?",
          back: "The optimization may diverge, overshoot the minimum, and cause unstable oscillations or severe overfitting.",
          category: "Deep Learning"
        }
      ]
    };

    setStudyGuide(guideData);
    setIsGeneratingGuide(false);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!studyGuide) return;
    setIsDownloadingPdf(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/study-guide/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_lang: targetLang, segments })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ClassBridge_Study_Guide_${targetLang}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setIsDownloadingPdf(false);
        return;
      }
    } catch (e) {
      console.log("Backend PDF endpoint unavailable, using browser print fallback.");
    }

    // Client-side print fallback
    setIsDownloadingPdf(false);
    window.print();
  };

  // Click citation in chat to jump and pulse caption in left pane
  const handleSelectCitation = (segmentId) => {
    setHighlightedSegmentId(segmentId);
    const element = document.getElementById(`seg-${segmentId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedSegmentId(null);
    }, 4000);
  };

  const selectedLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || { name: 'Tamil', native: 'தமிழ்' };

  return (
    <div className="app-container">
      <Header
        targetLang={targetLang}
        onLanguageChange={handleLanguageChange}
        connectionStatus={connectionStatus}
        sessionSeconds={sessionSeconds}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenArchitecture={() => setIsAboutOpen(true)}
      />

      <ErrorBanner
        message={errorMessage}
        type="warning"
        onDismiss={() => setErrorMessage(null)}
      />

      <div className="left-pane" style={{ marginBottom: '16px' }}>
        <AudioControls
          isRecording={isRecording}
          onToggleRecord={toggleRecording}
          audioLevel={audioLevel}
          segmentCount={segments.length}
          onGenerateStudyGuide={handleGenerateStudyGuide}
          onLoadSample={handleLoadSample}
          onClearSession={clearSession}
          isGeneratingGuide={isGeneratingGuide}
          interimSpeech={interimSpeech}
          onDirectSpeechSubmit={processSpeechText}
        />
      </div>

      <main className="main-grid">
        <CaptionPane
          segments={segments}
          targetLangName={`${selectedLangMeta.name} (${selectedLangMeta.native})`}
          highlightedSegmentId={highlightedSegmentId}
          autoScroll={autoScroll}
          onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
          interimSpeech={interimSpeech}
        />

        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isAskingQa}
          onSelectCitation={handleSelectCitation}
          segmentCount={segments.length}
        />
      </main>

      {/* Modals */}
      <StudyGuideModal
        guide={studyGuide}
        onClose={() => setStudyGuide(null)}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
      />

      <GlossaryModal
        glossary={glossary}
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
