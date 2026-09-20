import React, { useState, useEffect, useRef } from 'react';
import StudioSidebar from './components/StudioSidebar';
import WorkspaceHeader from './components/WorkspaceHeader';
import { SUPPORTED_LANGUAGES } from './components/Header';
import CaptionPane from './components/CaptionPane';
import ChatPanel from './components/ChatPanel';
import StudyGuideModal from './components/StudyGuideModal';
import GlossaryModal from './components/GlossaryModal';
import AboutModal from './components/AboutModal';
import AudioDeviceModal from './components/AudioDeviceModal';
import ErrorBanner from './components/ErrorBanner';
import { AudioStreamer, getAudioInputDevices } from './utils/audioStreamer';
import { translateTextClient, translateInterimDebounced } from './utils/clientTranslator';
import { Radio, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// Fallback STEM Glossary for standalone Vercel preview (Tamil, Malayalam, Hindi)
const FALLBACK_GLOSSARY = {
  "eigenvalue": {
    "en": "Eigenvalue",
    "ta": "சிறப்பியல்பு மதிப்பு (Eigenvalue)",
    "ml": "ഐഗൺവാല്യു (Eigenvalue)",
    "hi": "अभिलाक्षणिक मान (Eigenvalue)",
    "category": "Linear Algebra",
    "definition": "A scalar associated with a linear system of equations that measures factor expansion."
  },
  "eigenvector": {
    "en": "Eigenvector",
    "ta": "சிறப்பியல்பு திசையன் (Eigenvector)",
    "ml": "ഐഗൺവെക്ടർ (Eigenvector)",
    "hi": "अभिलाक्षणिक सदिश (Eigenvector)",
    "category": "Linear Algebra",
    "definition": "A non-zero vector whose direction remains unchanged when a linear transformation is applied."
  },
  "gradient descent": {
    "en": "Gradient Descent",
    "ta": "சரிவு இறக்கம் (Gradient Descent)",
    "ml": "ഗ്രേഡിയന്റ് ഡിസന്റ് (Gradient Descent)",
    "hi": "प्रवणता अवरोहण (Gradient Descent)",
    "category": "Machine Learning",
    "definition": "First-order iterative optimization algorithm for finding a local minimum of a function."
  },
  "backpropagation": {
    "en": "Backpropagation",
    "ta": "பின்நோக்கு பரவல் (Backpropagation)",
    "ml": "ബാക്ക്പ്രൊപ്പഗേഷൻ (Backpropagation)",
    "hi": "पश्च-प्रसार (Backpropagation)",
    "category": "Machine Learning",
    "definition": "Algorithm used to calculate gradients of loss function with respect to weights using chain rule."
  },
  "loss function": {
    "en": "Loss Function",
    "ta": "இழப்புச் சார்பு (Loss Function)",
    "ml": "നഷ്ട ഫലനം (Loss Function)",
    "hi": "हानि फलन (Loss Function)",
    "category": "Machine Learning",
    "definition": "Function that maps values onto a real number representing cost or discrepancy."
  },
  "learning rate": {
    "en": "Learning Rate",
    "ta": "கற்றல் வீதம் (Learning Rate)",
    "ml": "ലേണിംഗ് റേറ്റ് (Learning Rate)",
    "hi": "सीखने की दर (Learning Rate)",
    "category": "Machine Learning",
    "definition": "Tuning parameter in optimization determining the step size at each iteration."
  },
  "overfitting": {
    "en": "Overfitting",
    "ta": "மிகைப்பொருத்தம் (Overfitting)",
    "ml": "ഓവർഫിറ്റിംഗ് (Overfitting)",
    "hi": "अति-सन्निकटन (Overfitting)",
    "category": "Machine Learning",
    "definition": "Modeling error where a function corresponds too closely or exactly to a particular dataset."
  },
  "entropy": {
    "en": "Entropy",
    "ta": "என்ட்ரோபி / ஒழுங்கின்மை அளவு (Entropy)",
    "ml": "എൻട്രോപ്പി (Entropy)",
    "hi": "एन्ट्रॉपी / अव्यवस्था (Entropy)",
    "category": "Physics",
    "definition": "Scientific concept associated with state of disorder, randomness, or uncertainty."
  },
  "binary search": {
    "en": "Binary Search",
    "ta": "இருபடி தேடல் (Binary Search)",
    "ml": "ബൈനറി സെർച്ച് (Binary Search)",
    "hi": "द्विआधारी खोज (Binary Search)",
    "category": "Computer Science",
    "definition": "Search algorithm that finds target position in a sorted array in O(log n) time."
  }
};

// Rich Sample Lecture Datasets with Tamil, Malayalam, and Hindi Support
const SAMPLE_LECTURES = {
  ml: [
    {
      text_en: "Welcome class, today we begin our study of gradient descent and neural network optimization.",
      translations: {
        ta: "வணக்கம் மாணவர்களே, இன்று நாம் சரிவு இறக்கம் (Gradient Descent) மற்றும் நரம்பியல் வலைப்பின்னல் உகப்பாக்கம் பற்றிய நமது ஆய்வைத் தொடங்குகிறோம்.",
        ml: "ക്ലാസ്സിലേക്ക് സ്വാഗതം, ഇന്ന് നമ്മൾ ഗ്രേഡിയന്റ് ഡിസന്റ് (Gradient Descent), ന്യൂറൽ നെറ്റ്‌വർക്ക് ഒപ്റ്റിമൈസേഷൻ എന്നിവയെക്കുറിച്ചുള്ള പഠനം ആരംഭിക്കുന്നു.",
        hi: "कक्षा में स्वागत है, आज हम प्रवणता अवरोहण (Gradient Descent) और तंत्रिका नेटवर्क अनुकूलन का अपना अध्ययन शुरू करते हैं।"
      },
      confidence: 97.4,
      start: 0.0,
      end: 4.5,
      timestamp: "00:00 - 00:04",
      domain_terms: [
        {
          en: "Gradient Descent",
          term: "gradient descent",
          category: "Machine Learning",
          definition: "First-order iterative optimization algorithm for finding a local minimum.",
          translations: {
            ta: "சரிவு இறக்கம் (Gradient Descent)",
            ml: "ഗ്രേഡിയന്റ് ഡിസന്റ് (Gradient Descent)",
            hi: "प्रवणता अवरोहण (Gradient Descent)"
          }
        }
      ]
    },
    {
      text_en: "In deep learning, we compute derivatives via backpropagation to update the weights using our chosen learning rate.",
      translations: {
        ta: "ஆழ்ந்த கற்றலில் (Deep Learning), நமது கற்றல் வீதம் (Learning Rate) பயன்படுத்தி எடைகளைப் புதுப்பிக்க பின்நோக்கு பரவல் (Backpropagation) வழியாக வகைக்கெழுக்களைக் கணக்கிடுகிறோம்.",
        ml: "ഡീപ് ലേണിംഗിൽ, നമ്മൾ തിരഞ്ഞെടുത്ത ലേണിംഗ് റേറ്റ് (Learning Rate) ഉപയോഗിച്ച് വെയ്റ്റുകൾ അപ്‌ഡേറ്റ് ചെയ്യാൻ ബാക്ക്പ്രൊപ്പഗേഷൻ (Backpropagation) വഴി ഡെറിവേറ്റീവുകൾ കണക്കാക്കുന്നു.",
        hi: "डीप लर्निंग में, हम अपनी चुनी गई सीखने की दर (Learning Rate) का उपयोग करके भारों को अपडेट करने के लिए पश्च-प्रसार (Backpropagation) के माध्यम से अवकलज की गणना करते हैं।"
      },
      confidence: 95.8,
      start: 4.5,
      end: 10.2,
      timestamp: "00:04 - 00:10",
      domain_terms: [
        {
          en: "Backpropagation",
          term: "backpropagation",
          category: "Machine Learning",
          definition: "Algorithm used to calculate gradients of loss function with respect to weights.",
          translations: {
            ta: "பின்நோக்கு பரவல் (Backpropagation)",
            ml: "ബാക്ക്പ്രൊപ്പഗേഷൻ (Backpropagation)",
            hi: "पश्च-प्रसार (Backpropagation)"
          }
        },
        {
          en: "Learning Rate",
          term: "learning rate",
          category: "Machine Learning",
          definition: "Tuning parameter in optimization determining the step size.",
          translations: {
            ta: "கற்றல் வீதம் (Learning Rate)",
            ml: "ലേണിംഗ് റേറ്റ് (Learning Rate)",
            hi: "सीखने की दर (Learning Rate)"
          }
        }
      ]
    },
    {
      text_en: "If the learning rate is too high, the loss function may diverge and cause severe overfitting on training data.",
      translations: {
        ta: "கற்றல் வீதம் அதிகமாக இருந்தால், இழப்புச் சார்பு (Loss Function) விலகி பயிற்சித் தரவில் கடுமையான மிகைப்பொருத்தம் (Overfitting) ஏற்படுத்தக்கூடும்.",
        ml: "ലേണിംഗ് റേറ്റ് വളരെ ഉയർന്നതാണെങ്കിൽ, നഷ്ട ഫലനം (Loss Function) വഴിമാറിപ്പോവുകയും പരിശീലന ഡാറ്റയിൽ കടുത്ത ഓവർഫിറ്റിംഗ് (Overfitting) ഉണ്ടാക്കുകയും ചെയ്യാം.",
        hi: "यदि सीखने की दर बहुत अधिक है, तो हानि फलन (Loss Function) विचलित हो सकता है और प्रशिक्षण डेटा पर गंभीर अति-सन्निकटन (Overfitting) पैदा कर सकता है।"
      },
      confidence: 96.5,
      start: 10.2,
      end: 16.0,
      timestamp: "00:10 - 00:16",
      domain_terms: [
        {
          en: "Loss Function",
          term: "loss function",
          category: "Machine Learning",
          definition: "Cost function measuring prediction error.",
          translations: {
            ta: "இழப்புச் சார்பு (Loss Function)",
            ml: "നഷ്ട ഫലനം (Loss Function)",
            hi: "हानि फलन (Loss Function)"
          }
        },
        {
          en: "Overfitting",
          term: "overfitting",
          category: "Machine Learning",
          definition: "Model error corresponding too closely to training data.",
          translations: {
            ta: "மிகைப்பொருத்தம் (Overfitting)",
            ml: "ഓവർഫിറ്റിംഗ് (Overfitting)",
            hi: "अति-सन्निकटन (Overfitting)"
          }
        }
      ]
    },
    {
      text_en: "The fundamental parameter update formula is theta at t plus one equals theta minus eta times the gradient of the loss.",
      translations: {
        ta: "அடிப்படை அளவுரு புதுப்பித்தல் சூத்திரம்: தீட்டா t கூட்டல் ஒன்று சமன் தீட்டா கழித்தல் ஈட்டா பெருக்கல் இழப்பின் சரிவு (θ_{t+1} = θ_t - η ∇J(θ_t)).",
        ml: "അടിസ്ഥാന പാരാമീറ്റർ അപ്‌ഡേറ്റ് ഫോർമുല: തീറ്റ t പ്ലസ് ഒന്ന് സമം തീറ്റ മൈനസ് ഈറ്റ ഗുണം നഷ്ടത്തിന്റെ ഗ്രേഡിയന്റ് (θ_{t+1} = θ_t - η ∇J(θ_t)).",
        hi: "मूल पैरामीटर अपडेट सूत्र है: थीटा t प्लस एक बराबर थीटा माइनस ईटा गुणा हानि की प्रवणता (θ_{t+1} = θ_t - η ∇J(θ_t))।"
      },
      confidence: 98.2,
      start: 16.0,
      end: 22.8,
      timestamp: "00:16 - 00:22",
      domain_terms: [
        {
          en: "Gradient Descent",
          term: "gradient descent",
          category: "Machine Learning",
          definition: "Parameter update θ_{t+1} = θ_t - η ∇J(θ_t).",
          translations: {
            ta: "சரிவு இறக்கம் (Gradient Descent)",
            ml: "ഗ്രേഡിയന്റ് ഡിസന്റ് (Gradient Descent)",
            hi: "प्रवणता अवरोहण (Gradient Descent)"
          }
        }
      ]
    },
    {
      text_en: "Next lecture we will study stochastic gradient descent which computes gradients over mini-batches instead of the full dataset.",
      translations: {
        ta: "அடுத்த விரிவுரையில் நாம் முழுத் தரவுத்தொகுப்பிற்குப் பதிலாக மினி-பேட்சுகளில் சரிவுகளைக் கணக்கிடும் சீரற்ற சரிவு இறக்கம் (Stochastic Gradient Descent) பற்றி படிப்போம்.",
        ml: "അടുത്ത ക്ലാസ്സിൽ പൂർണ്ണ ഡാറ്റാസെറ്റിന് പകരം മിനി-ബാച്ചുകളിലായി ഗ്രേഡിയന്റുകൾ കണക്കാക്കുന്ന സ്റ്റോക്കാസ്റ്റിക് ഗ്രേഡിയന്റ് ഡിസന്റ് (Stochastic Gradient Descent) നമ്മൾ പഠിക്കും.",
        hi: "अगले व्याख्यान में हम प्रसंभाव्य प्रवणता अवरोहण (Stochastic Gradient Descent) का अध्ययन करेंगे जो पूरे डेटासेट के बजाय मिनी-बैचों पर प्रवणता की गणना करता है।"
      },
      confidence: 94.7,
      start: 22.8,
      end: 29.5,
      timestamp: "00:22 - 00:29",
      domain_terms: [
        {
          en: "Stochastic Gradient Descent",
          term: "stochastic gradient descent",
          category: "Machine Learning",
          definition: "SGD computes updates over mini-batches.",
          translations: {
            ta: "சீரற்ற சரிவு இறக்கம் (Stochastic Gradient Descent)",
            ml: "സ്റ്റോക്കാസ്റ്റിക് ഗ്രേഡിയന്റ് ഡിസന്റ് (Stochastic Gradient Descent)",
            hi: "प्रसंभाव्य प्रवणता अवरोहण (Stochastic Gradient Descent)"
          }
        }
      ]
    }
  ],
  linear_algebra: [
    {
      text_en: "Welcome to Linear Algebra. Today we explore eigenvalues and eigenvectors of square transformation matrices.",
      translations: {
        ta: "நேரியல் இயற்கணிதத்திற்கு நல்வரவு. இன்று நாம் சதுர உருமாற்ற அணிகளின் சிறப்பியல்பு மதிப்பு (Eigenvalue) மற்றும் சிறப்பியல்பு திசையன் (Eigenvector) பற்றி ஆராய்வோம்.",
        ml: "ലീനിയർ ആൾജിബ്രയിലേക്ക് സ്വാഗതം. ഇന്ന് നമ്മൾ സ്ക്വയർ ട്രാൻസ്ഫോർമേഷൻ മാട്രിക്സുകളുടെ ഐഗൺവാല്യു (Eigenvalue), ഐഗൺവെക്ടർ (Eigenvector) എന്നിവ പരിശോധിക്കുന്നു.",
        hi: "रैखिक बीजगणित में आपका स्वागत है। आज हम वर्ग रूपांतरण आव्यूहों के अभिलाक्षणिक मान (Eigenvalue) और अभिलाक्षणिक सदिश (Eigenvector) का अध्ययन करेंगे।"
      },
      confidence: 97.0,
      start: 0.0,
      end: 5.2,
      timestamp: "00:00 - 00:05",
      domain_terms: [
        {
          en: "Eigenvalue",
          term: "eigenvalue",
          category: "Linear Algebra",
          definition: "Scalar factor measuring vector expansion.",
          translations: {
            ta: "சிறப்பியல்பு மதிப்பு (Eigenvalue)",
            ml: "ഐഗൺവാല്യു (Eigenvalue)",
            hi: "अभिलाक्षणिक मान (Eigenvalue)"
          }
        },
        {
          en: "Eigenvector",
          term: "eigenvector",
          category: "Linear Algebra",
          definition: "Vector whose direction remains unchanged under linear transformation.",
          translations: {
            ta: "சிறப்பியல்பு திசையன் (Eigenvector)",
            ml: "ഐഗൺവെക്ടർ (Eigenvector)",
            hi: "अभिलाक्षणिक सदिश (Eigenvector)"
          }
        }
      ]
    },
    {
      text_en: "Remember that an eigenvalue lambda and eigenvector v satisfy the fundamental matrix equation A v equals lambda v.",
      translations: {
        ta: "சிறப்பியல்பு மதிப்பு லாம்ப்டா (λ) மற்றும் திசையன் v ஆகியவை அடிப்படை அணிச் சமன்பாடான A v = λ v ஐ நிறைவு செய்கின்றன என்பதை நினைவில் கொள்க.",
        ml: "ഐഗൺവാല്യു ലാംഡയും (λ) ഐഗൺവെക്ടർ v-യും അടിസ്ഥാന മാട്രിക്സ് സമവാക്യമായ A v = λ v നിറവേറ്റുന്നു എന്ന് ഓർക്കുക.",
        hi: "याद रखें कि एक अभिलाक्षणिक मान लैम्ब्डा (λ) और अभिलाक्षणिक सदिश v मौलिक आव्यूह समीकरण A v = λ v को संतुष्ट करते हैं।"
      },
      confidence: 96.2,
      start: 5.2,
      end: 11.5,
      timestamp: "00:05 - 00:11",
      domain_terms: [
        {
          en: "Eigenvalue",
          term: "eigenvalue",
          category: "Linear Algebra",
          definition: "A v = λ v characteristic equation.",
          translations: {
            ta: "சிறப்பியல்பு மதிப்பு (Eigenvalue)",
            ml: "ഐഗൺവാല്യു (Eigenvalue)",
            hi: "अभिलाक्षणिक मान (Eigenvalue)"
          }
        }
      ]
    },
    {
      text_en: "To solve for eigenvalues, we compute the determinant of A minus lambda times identity matrix and set it to zero.",
      translations: {
        ta: "சிறப்பியல்பு மதிப்புகளைக் கண்டுபிடிக்க, A கழித்தல் லாம்ப்டா பெருக்கல் அலகு அணியின் அணிக்கோவை மதிப்பை (Determinant: det(A - λI) = 0) கணக்கிடுகிறோம்.",
        ml: "ഐഗൺവാല്യുകൾ കണ്ടെത്തുന്നതിന്, A മൈനസ് ലാംഡ ഗുണം ഐഡന്റിറ്റി മാട്രിക്സിന്റെ ഡിറ്റർമിനന്റ് (det(A - λI) = 0) കണക്കാക്കുന്നു.",
        hi: "अभिलाक्षणिक मान ज्ञात करने के लिए, हम A माइनस लैम्ब्डा गुणा तत्समक आव्यूह के सारणिक (det(A - λI) = 0) की गणना करते हैं।"
      },
      confidence: 95.1,
      start: 11.5,
      end: 18.0,
      timestamp: "00:11 - 00:18",
      domain_terms: [
        {
          en: "Determinant",
          term: "determinant",
          category: "Linear Algebra",
          definition: "det(A - λI) = 0 characteristic polynomial.",
          translations: {
            ta: "அணிக்கோவை மதிப்பு (Determinant)",
            ml: "ഡിറ്റർമിനന്റ് (Determinant)",
            hi: "सारणिक (Determinant)"
          }
        }
      ]
    },
    {
      text_en: "In geometric terms, eigenvectors define the invariant axes along which space merely stretches or shrinks.",
      translations: {
        ta: "வடிவியல் ரீதியாக, சிறப்பியல்பு திசையன்கள் விண்வெளி நீட்டிக்கப்படும் அல்லது சுருங்கும் மாறாத அச்சுகளை வரையறுக்கின்றன.",
        ml: "ജ്യാമിതീയപരമായി, ഇടം വികസിക്കുകയോ ചുരുങ്ങുകയോ മാത്രം ചെയ്യുന്ന മാറ്റമില്ലാത്ത അക്ഷങ്ങളെയാണ് ഐഗൺവെക്ടറുകൾ നിർവചിക്കുന്നത്.",
        hi: "ज्यामितीय दृष्टि से, अभिलाक्षणिक सदिश उन अपरिवर्तनीय अक्षों को परिभाषित करते हैं जिनके अनुदिश केवल स्थान फैलता या सिकुड़ता है।"
      },
      confidence: 94.3,
      start: 18.0,
      end: 24.5,
      timestamp: "00:18 - 00:24",
      domain_terms: [
        {
          en: "Eigenvector",
          term: "eigenvector",
          category: "Linear Algebra",
          definition: "Invariant axes of transformation.",
          translations: {
            ta: "சிறப்பியல்பு திசையன் (Eigenvector)",
            ml: "ഐഗൺവെക്ടർ (Eigenvector)",
            hi: "अभिलाक्षणिक सदिश (Eigenvector)"
          }
        }
      ]
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
  const [interimVernacular, setInterimVernacular] = useState('');
  const [liveMicStatus, setLiveMicStatus] = useState('idle');
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    try {
      return localStorage.getItem('classbridge_audio_device_id') || 'default';
    } catch (e) {
      return 'default';
    }
  });
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('captions');
  const [viewMode, setViewMode] = useState('split');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const wsRef = useRef(null);
  const streamerRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize Connection, Audio Devices & Load Glossary
  useEffect(() => {
    connectWebSocket();
    loadGlossary();
    loadAudioDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (streamerRef.current) streamerRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
      }
    };
  }, []);

  const loadAudioDevices = async () => {
    try {
      const devs = await getAudioInputDevices();
      if (devs && devs.length > 0) {
        setAudioDevices(devs);
        const saved = localStorage.getItem('classbridge_audio_device_id');
        const savedValid = saved && devs.find((d) => d.deviceId === saved && !d.isVirtual);

        if (savedValid) {
          setSelectedDeviceId(savedValid.deviceId);
        } else {
          // Prefer Bluetooth headset first (e.g. Harmonics Y3), then physical mic, avoid virtual
          const bt = devs.find((d) => d.isBluetooth && !d.isVirtual);
          const physical = devs.find((d) => !d.isVirtual && d.deviceId !== 'default');
          const nonVirtual = devs.find((d) => !d.isVirtual);

          if (bt) {
            setSelectedDeviceId(bt.deviceId);
          } else if (physical) {
            setSelectedDeviceId(physical.deviceId);
          } else if (nonVirtual) {
            setSelectedDeviceId(nonVirtual.deviceId);
          } else {
            setSelectedDeviceId(devs[0].deviceId);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load audio devices:", e);
    }
  };

  const handleSelectAudioDevice = (deviceId) => {
    setSelectedDeviceId(deviceId);
    try {
      localStorage.setItem('classbridge_audio_device_id', deviceId);
    } catch (e) {}
    if (streamerRef.current) {
      streamerRef.current.setAudioDevice(deviceId);
    }
  };

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
            setSegments((prev) => {
              // Prevent duplicate if already committed optimistically
              if (prev.some((s) => s.text_en.trim().toLowerCase() === data.segment.text_en.trim().toLowerCase())) {
                return prev;
              }
              return [...prev, data.segment];
            });
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
    // If there is active live interim speech, translate it immediately to the new language
    if (interimSpeech) {
      translateInterimDebounced(interimSpeech, newLang, glossary, (vern) => {
        setInterimVernacular(vern);
      });
    }
    // Dynamically update existing segments that have multi-language translations
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.translations && seg.translations[newLang]) {
          return {
            ...seg,
            target_lang: newLang,
            text_vernacular: seg.translations[newLang],
            domain_terms: (seg.domain_terms || []).map((dt) => ({
              ...dt,
              adapted_vernacular: (dt.translations && dt.translations[newLang]) || dt.adapted_vernacular || dt.en
            }))
          };
        }
        return seg;
      })
    );
  };

  const processSpeechText = async (spokenText, confidence = 95) => {
    if (!spokenText || !spokenText.trim()) return;
    const cleanText = spokenText.trim();

    // Clear interim states immediately
    setInterimSpeech('');
    setInterimVernacular('');
    setLiveMicStatus(isRecording ? 'listening' : 'idle');

    // Instant optimistic client translation & commit for 0ms lag
    try {
      const transResult = await translateTextClient(cleanText, targetLang, glossary);
      setSegments((prev) => {
        // Prevent duplicate commits
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.text_en.trim().toLowerCase() === cleanText.toLowerCase()) {
            return prev;
          }
        }

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
            text_en: cleanText,
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

    // Also send to backend WebSocket if connected so backend RAG & session stay synced
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'process_text_segment',
        text: cleanText,
        confidence: confidence,
        duration: 4.0
      }));
    }
  };

  // Toggle Microphone
  const toggleRecording = async () => {
    if (isRecording) {
      if (streamerRef.current) {
        streamerRef.current.stop();
        streamerRef.current = null;
      }
      setIsRecording(false);
      setAudioLevel(0);
      setInterimSpeech('');
      setInterimVernacular('');
      setLiveMicStatus('idle');
    } else {
      const streamer = new AudioStreamer({
        selectedDeviceId: selectedDeviceId,
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
          if (text && text.trim()) {
            setLiveMicStatus('speaking');
            translateInterimDebounced(text.trim(), targetLang, glossary, (vern) => {
              setInterimVernacular(vern);
            });
          } else {
            setInterimVernacular('');
            setLiveMicStatus('listening');
          }
        },
        onSpeechRecognized: (text, conf) => {
          processSpeechText(text, conf);
        },
        onStatusChange: (status) => {
          setLiveMicStatus(status);
        },
        onError: (err) => {
          setErrorMessage(`Audio note: ${err.message}. If using a Bluetooth headset, verify that it is connected and selected in Windows Sound settings.`);
          setIsRecording(false);
          setAudioLevel(0);
          setInterimSpeech('');
          setInterimVernacular('');
          setLiveMicStatus('idle');
        }
      });

      try {
        await streamer.start();
        streamerRef.current = streamer;
        setIsRecording(true);
        setLiveMicStatus('listening');
        setErrorMessage(null);
      } catch (err) {
        setErrorMessage(`Could not start live mic: ${err.message}.`);
        setIsRecording(false);
        setLiveMicStatus('idle');
      }
    }
  };

  // 1-Click Sample Lecture Replay
  const handleLoadSample = (topic = 'ml') => {
    const sampleItems = SAMPLE_LECTURES[topic] || SAMPLE_LECTURES.ml;
    
    // Animate streaming in the segments sequentially to simulate live lecture capture
    sampleItems.forEach((item, index) => {
      setTimeout(() => {
        const segId = segments.length + index + 1;
        const vernText = item.translations ? (item.translations[targetLang] || item.translations.ta) : item.text_vernacular;
        const adaptedTerms = (item.domain_terms || []).map((dt) => ({
          ...dt,
          adapted_vernacular: (dt.translations && dt.translations[targetLang]) || dt.adapted_vernacular || dt.en
        }));

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
              text_vernacular: vernText,
              translations: item.translations,
              confidence: item.confidence,
              domain_terms: adaptedTerms,
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
      const text = (seg.text_en + " " + (seg.text_vernacular || '')).toLowerCase();
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
      let botVernacular = "";
      if (targetLang === 'ml') {
        botVernacular = `ഭാഗം #${bestMatch.id} [${bestMatch.timestamp}] പ്രകാരം: "${bestMatch.text_vernacular}"`;
      } else if (targetLang === 'hi') {
        botVernacular = `खंड #${bestMatch.id} [${bestMatch.timestamp}] के अनुसार: "${bestMatch.text_vernacular}"`;
      } else {
        botVernacular = `பகுதி #${bestMatch.id} [${bestMatch.timestamp}] இன் படி: "${bestMatch.text_vernacular}"`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Based on segment #${bestMatch.id} at [${bestMatch.timestamp}], the lecture explains: "${bestMatch.text_en}"`,
          vernacular: botVernacular,
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
      let notFoundVernacular = "";
      if (targetLang === 'ml') {
        notFoundVernacular = `ഈ പ്രഭാഷണത്തിൽ ഈ ചോദ്യത്തിനുള്ള വിവരങ്ങൾ ഇതുവരെ ലഭ്യമായിട്ടില്ല.`;
      } else if (targetLang === 'hi') {
        notFoundVernacular = `इस व्याख्यान में इस प्रश्न की जानकारी अभी उपलब्ध नहीं है।`;
      } else {
        notFoundVernacular = `விரிவுரையில் இந்தக் கேள்விக்கான தகவல் இன்னும் இடம்பெறவில்லை.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `I could not find information directly addressing "${question}" in this lecture transcript yet. Try asking about the formulas, eigenvalues, or gradient descent mentioned in the captions.`,
          vernacular: notFoundVernacular,
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

    let overviewVernacular = `${segments.length} விரிவுரை பகுதிகளிலிருந்து தொகுக்கப்பட்ட விரிவான STEM படிப்பு வழிகாட்டி.`;
    let defs = [
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
    ];

    let flashcards = [
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
    ];

    if (targetLang === 'ml') {
      overviewVernacular = `${segments.length} പ്രഭാഷണ ഭാഗങ്ങളിൽ നിന്ന് തയ്യാറാക്കിയ സമഗ്രമായ STEM പഠന സഹായി.`;
      defs = [
        {
          term: "Gradient Descent",
          vernacular_term: "ഗ്രേഡിയന്റ് ഡിസന്റ് (Gradient Descent)",
          category: "Machine Learning",
          definition: "First-order iterative optimization algorithm for finding a local minimum of a differentiable loss function.",
          vernacular_definition: "ഒരു ഫംഗ്ഷന്റെ ലോക്കൽ മിനിമം കണ്ടെത്താനുള്ള ആവർത്തന ഒപ്റ്റിമൈസേഷൻ അൽഗോരിതം."
        },
        {
          term: "Eigenvalue",
          vernacular_term: "ഐഗൺവാല്യു (Eigenvalue)",
          category: "Linear Algebra",
          definition: "Scalar factor that scales an eigenvector during a linear transformation without changing its line of action.",
          vernacular_definition: "ലീനിയർ ട്രാൻസ്ഫോർമേഷനിൽ ഐഗൺവെക്ടറിനെ സ്കെയിൽ ചെയ്യുന്ന മൂല്യം."
        },
        {
          term: "Backpropagation",
          vernacular_term: "ബാക്ക്പ്രൊപ്പഗേഷൻ (Backpropagation)",
          category: "Machine Learning",
          definition: "Efficient gradient computation algorithm via chain rule throughout layered neural networks.",
          vernacular_definition: "ചെയിൻ റൂൾ ഉപയോഗിച്ച് ന്യൂറൽ നെറ്റ്‌വർക്കുകളിൽ ഗ്രേഡിയന്റുകൾ കണക്കാക്കുന്ന രീതി."
        }
      ];
      flashcards = [
        {
          id: 1,
          front: "What is Gradient Descent?",
          vernacular_front: "ഗ്രേഡിയന്റ് ഡിസന്റ് എന്നാൽ എന്താണ്?",
          back: "An optimization algorithm that minimizes the loss function by iteratively moving in the direction of steepest descent.",
          category: "Machine Learning"
        },
        {
          id: 2,
          front: "What equation defines an eigenvalue and eigenvector?",
          vernacular_front: "ഐഗൺവാല്യുവും ഐഗൺവെക്ടറും നിർവചിക്കുന്ന സമവാക്യം ഏതാണ്?",
          back: "A v = λ v, where matrix A acts on non-zero vector v resulting in scaled vector λv.",
          category: "Linear Algebra"
        },
        {
          id: 3,
          front: "What happens if the learning rate is too large?",
          vernacular_front: "ലേണിംഗ് റേറ്റ് വളരെ കൂടിയാൽ എന്ത് സംഭവിക്കും?",
          back: "The optimization may diverge, overshoot the minimum, and cause unstable oscillations or severe overfitting.",
          category: "Deep Learning"
        }
      ];
    } else if (targetLang === 'hi') {
      overviewVernacular = `${segments.length} व्याख्यान खंडों से तैयार की गई व्यापक STEM अध्ययन मार्गदर्शिका।`;
      defs = [
        {
          term: "Gradient Descent",
          vernacular_term: "प्रवणता अवरोहण (Gradient Descent)",
          category: "Machine Learning",
          definition: "First-order iterative optimization algorithm for finding a local minimum of a differentiable loss function.",
          vernacular_definition: "किसी अवकलनीय हानि फलन का स्थानीय न्यूनतम खोजने के लिए प्रथम-क्रम पुनरावृत्ति अनुकूलन एल्गोरिदम।"
        },
        {
          term: "Eigenvalue",
          vernacular_term: "अभिलाक्षणिक मान (Eigenvalue)",
          category: "Linear Algebra",
          definition: "Scalar factor that scales an eigenvector during a linear transformation without changing its line of action.",
          vernacular_definition: "एक अदिश मान जो रैखिक रूपांतरण के दौरान दिशा बदले बिना सदिश का परिमाण बदलता है।"
        },
        {
          term: "Backpropagation",
          vernacular_term: "पश्च-प्रसार (Backpropagation)",
          category: "Machine Learning",
          definition: "Efficient gradient computation algorithm via chain rule throughout layered neural networks.",
          vernacular_definition: "श्रृंखला नियम का उपयोग करके तंत्रिका नेटवर्क में ग्रेडिएंट की गणना करने की कुशल विधि।"
        }
      ];
      flashcards = [
        {
          id: 1,
          front: "What is Gradient Descent?",
          vernacular_front: "प्रवणता अवरोहण (Gradient Descent) क्या है?",
          back: "An optimization algorithm that minimizes the loss function by iteratively moving in the direction of steepest descent.",
          category: "Machine Learning"
        },
        {
          id: 2,
          front: "What equation defines an eigenvalue and eigenvector?",
          vernacular_front: "अभिलाक्षणिक मान और अभिलाक्षणिक सदिश को परिभाषित करने वाला समीकरण कौन सा है?",
          back: "A v = λ v, where matrix A acts on non-zero vector v resulting in scaled vector λv.",
          category: "Linear Algebra"
        },
        {
          id: 3,
          front: "What happens if the learning rate is too large?",
          vernacular_front: "यदि सीखने की दर बहुत अधिक हो तो क्या होगा?",
          back: "The optimization may diverge, overshoot the minimum, and cause unstable oscillations or severe overfitting.",
          category: "Deep Learning"
        }
      ];
    }

    const guideData = {
      title: "Machine Learning & STEM Fundamentals",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      target_language: langObj.name,
      native_language: langObj.native,
      segment_count: segments.length,
      overview: {
        en: `Comprehensive study guide synthesized from ${segments.length} lecture segments focusing on gradient descent, eigenvalues, backpropagation, and core STEM principles.`,
        vernacular: overviewVernacular
      },
      definitions: defs,
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
      flashcards: flashcards
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
  const activeDeviceObj = audioDevices.find((d) => d.deviceId === selectedDeviceId) || audioDevices[0];
  const activeDeviceLabel = activeDeviceObj ? activeDeviceObj.label : 'Default Microphone';
  const isBluetoothDevice = Boolean(activeDeviceObj?.isBluetooth);
  const detectedTermsCount = segments.reduce((acc, seg) => acc + (seg.domain_terms ? seg.domain_terms.length : 0), 0);

  return (
    <div className="studio-workspace-root">
      {/* Studio Interactive Left Control Rail */}
      <StudioSidebar
        isRecording={isRecording}
        onToggleRecord={toggleRecording}
        audioLevel={audioLevel}
        liveMicStatus={liveMicStatus}
        targetLang={targetLang}
        onLanguageChange={handleLanguageChange}
        sessionSeconds={sessionSeconds}
        segmentCount={segments.length}
        onGenerateStudyGuide={handleGenerateStudyGuide}
        isGeneratingGuide={isGeneratingGuide}
        onLoadSample={handleLoadSample}
        onClearSession={clearSession}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenArchitecture={() => setIsAboutOpen(true)}
        selectedDeviceLabel={activeDeviceLabel}
        isBluetoothDevice={isBluetoothDevice}
        onOpenAudioDevices={() => setIsDeviceModalOpen(true)}
        detectedTermsCount={detectedTermsCount}
      />

      {/* Main Interactive Stage */}
      <div className="workspace-stage">
        <WorkspaceHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          connectionStatus={connectionStatus}
          onDirectSpeechSubmit={processSpeechText}
          segmentCount={segments.length}
        />

        <ErrorBanner
          message={errorMessage}
          type="warning"
          onDismiss={() => setErrorMessage(null)}
        />

        {/* Responsive Mobile Screen Workspace Tabs (< 820px) */}
        <div className="mobile-tab-bar">
          <button
            className={`mobile-tab-btn ${mobileActiveTab === 'captions' ? 'active' : ''}`}
            onClick={() => setMobileActiveTab('captions')}
          >
            <Radio size={14} />
            <span>Live Captions {segments.length > 0 && `(${segments.length})`}</span>
          </button>

          <button
            className={`mobile-tab-btn ${mobileActiveTab === 'chat' ? 'active' : ''}`}
            onClick={() => setMobileActiveTab('chat')}
          >
            <MessageSquare size={14} />
            <span>AI Tutor & Q&A {messages.length > 0 && `(${messages.length})`}</span>
          </button>
        </div>

        <main className={`workspace-canvas view-${viewMode} mobile-${mobileActiveTab}`}>
          {(viewMode === 'split' || viewMode === 'theater') && (
            <div className={`canvas-pane-caption ${viewMode === 'theater' ? 'theater-active' : ''}`}>
              <CaptionPane
                segments={segments}
                targetLangName={`${selectedLangMeta.name} (${selectedLangMeta.native})`}
                targetLang={targetLang}
                highlightedSegmentId={highlightedSegmentId}
                autoScroll={autoScroll}
                onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
                isRecording={isRecording}
                liveMicStatus={liveMicStatus}
                interimSpeech={interimSpeech}
                interimVernacular={interimVernacular}
                glossary={glossary}
                onClearCaptions={clearSession}
              />
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'tutor') && (
            <div className={`canvas-pane-chat ${viewMode === 'tutor' ? 'tutor-active' : ''}`}>
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isAskingQa}
                onSelectCitation={handleSelectCitation}
                segmentCount={segments.length}
              />
            </div>
          )}
        </main>
      </div>

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

      <AudioDeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        devices={audioDevices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={handleSelectAudioDevice}
        onRefreshDevices={loadAudioDevices}
      />
    </div>
  );
}
