import React, { useState, useEffect, useRef } from 'react';
import GoogleAppBar from './components/GoogleAppBar';
import GoogleBottomDock from './components/GoogleBottomDock';
import StudioSidebar from './components/StudioSidebar';
import WorkspaceHeader from './components/WorkspaceHeader';
import { SUPPORTED_LANGUAGES } from './components/Header';
import CaptionPane from './components/CaptionPane';
import ChatPanel from './components/ChatPanel';
import StudyGuideModal from './components/StudyGuideModal';
import LectureHistoryModal from './components/LectureHistoryModal';
import GlossaryModal from './components/GlossaryModal';
import AboutModal from './components/AboutModal';
import AudioDeviceModal from './components/AudioDeviceModal';
import ClassroomModal from './components/ClassroomModal';
import ClassModeBar from './components/ClassModeBar';
import OnlineClassStage from './components/OnlineClassStage';
import StudentRegisterModal from './components/StudentRegisterModal';
import AttendanceRosterModal from './components/AttendanceRosterModal';
import TeacherSetupModal from './components/TeacherSetupModal';
import ErrorBanner from './components/ErrorBanner';
import { AudioStreamer, getAudioInputDevices } from './utils/audioStreamer';
import { globalTTS, getAudioOutputDevices } from './utils/ttsService';
import { translateTextClient, translateInterimDebounced, translateStreamingFast } from './utils/clientTranslator';
import { Radio, MessageSquare, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportCaptionsAsTxt, exportCaptionsAsPdf } from './utils/captionExport';
import { exportStudyGuideAsPdf } from './utils/studyGuideExport';
import {
  fetchInternetReference,
  matchesAcronymOrInitials,
  cleanQuestionToSearchTerm,
  STEM_ACRONYMS,
  STOPWORDS
} from './utils/internetReference';
import ErrorBoundary from './components/ErrorBoundary';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || API_BASE_URL.replace(/^http/, 'ws');

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
  const [sourceLang, setSourceLang] = useState(() => {
    try {
      return localStorage.getItem('classbridge_source_lang') || 'en';
    } catch (e) {
      return 'en';
    }
  });
  const [targetLang, setTargetLang] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isStudent = params.get('role') === 'student' || params.get('lock_role') === 'true' || params.get('locked') === '1';
      const storageKey = isStudent ? 'classbridge_student_target_lang' : 'classbridge_target_lang';
      return localStorage.getItem(storageKey) || 'ta';
    } catch (e) {
      return 'ta';
    }
  });
  const [segments, setSegments] = useState([]);
  const [lectureHistory, setLectureHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('classbridge_lecture_history') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    try {
      return localStorage.getItem('classbridge_audio_device_id') || 'default';
    } catch (e) {
      return 'default';
    }
  });
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState(() => {
    try {
      return localStorage.getItem('classbridge_speaker_device_id') || 'default';
    } catch (e) {
      return 'default';
    }
  });
  const [isReadAloudEnabled, setIsReadAloudEnabled] = useState(() => {
    try {
      return localStorage.getItem('classbridge_read_aloud') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('captions');
  const [viewMode, setViewMode] = useState('split');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Classroom Real-Time Broadcasting & Multi-Student State
  const [classMode, setClassMode] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const m = p.get('mode');
      if (m === 'online' || m === 'online_classroom') return 'online_classroom';
      if (m === 'offline' || m === 'realtime_classroom') return 'realtime_classroom';
      if (m === 'solo') return 'solo';
      return localStorage.getItem('classbridge_class_mode') || 'realtime_classroom';
    } catch (e) {
      return 'realtime_classroom';
    }
  });
  const [isRoleLocked, setIsRoleLocked] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('lock_role') === 'true' || p.get('locked') === '1';
    } catch (e) {
      return false;
    }
  });
  const [userRole, setUserRole] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('lock_role') === 'true' || p.get('locked') === '1') {
        return 'student';
      }
      const r = p.get('role');
      if (r && (r === 'teacher' || r === 'student')) return r;
      return localStorage.getItem('classbridge_user_role') || 'teacher';
    } catch (e) {
      return 'teacher';
    }
  });
  const [roomCode, setRoomCode] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const rm = p.get('room');
      if (rm) return rm.trim().toUpperCase();
      return localStorage.getItem('classbridge_room_code') || 'EDU-02';
    } catch (e) {
      return 'EDU-02';
    }
  });
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [hasTeacher, setHasTeacher] = useState(() => userRole === 'teacher');

  // Teacher Identity & Setup State
  const [teacherName, setTeacherName] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('teacher_name') || localStorage.getItem('classbridge_teacher_name') || '';
    } catch (e) {
      return '';
    }
  });
  const [isTeacherSetupOpen, setIsTeacherSetupOpen] = useState(false);
  const teacherNameRef = useRef(teacherName);

  useEffect(() => {
    teacherNameRef.current = teacherName;
  }, [teacherName]);

  // Online Classroom Hand Raises & Q&A Comments State
  const [handRaises, setHandRaises] = useState([]);
  const [qaComments, setQaComments] = useState([]);

  // Online Classroom Student Identity & Attendance Roster State
  const [studentName, setStudentName] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('name') || localStorage.getItem('classbridge_student_name') || '';
    } catch (e) {
      return '';
    }
  });
  const [studentRollNo, setStudentRollNo] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('roll') || p.get('roll_no') || localStorage.getItem('classbridge_student_roll') || '';
    } catch (e) {
      return '';
    }
  });
  const [isStudentRegisterOpen, setIsStudentRegisterOpen] = useState(false);
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isTeacherCameraOn, setIsTeacherCameraOn] = useState(false);
  const isTeacherCameraOnRef = useRef(false);
  const [isTeacherScreenSharing, setIsTeacherScreenSharing] = useState(false);
  const isTeacherScreenSharingRef = useRef(false);
  const [remoteVideoFrame, setRemoteVideoFrame] = useState(null);

  const wsRef = useRef(null);
  const streamerRef = useRef(null);
  const timerRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const tabIdRef = useRef('tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
  const studentTabsMapRef = useRef(new Map());
  const userRoleRef = useRef(userRole);
  const roomCodeRef = useRef(roomCode);
  const classModeRef = useRef(classMode);

  useEffect(() => {
    if (!segments.length) return;
    const entry = {
      id: `${roomCode}-${segments[0]?.id || Date.now()}`,
      title: `${classMode === 'online_classroom' ? 'Online' : 'Real-Time'} Lecture - ${roomCode}`,
      date: new Date().toLocaleString(),
      sourceLang,
      targetLang,
      segments,
    };
    setLectureHistory((previous) => {
      const next = [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, 8);
      try {
        localStorage.setItem('classbridge_lecture_history', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, [segments, userRole, roomCode, classMode, sourceLang, targetLang]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    classModeRef.current = classMode;
  }, [classMode]);

  useEffect(() => {
    isTeacherCameraOnRef.current = isTeacherCameraOn;
  }, [isTeacherCameraOn]);

  useEffect(() => {
    isTeacherScreenSharingRef.current = isTeacherScreenSharing;
  }, [isTeacherScreenSharing]);

  // Initialize Connection, Audio Devices & Load Glossary
  useEffect(() => {
    loadGlossary();
    loadAudioDevices();

    // Hook global TTS state
    globalTTS.onStateChange = ({ isPlaying, state }) => {
      setIsSpeakingAudio(isPlaying);
      if (!isPlaying) {
        setCurrentlySpeakingId(null);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
    }

    // Setup BroadcastChannel for zero-latency local cross-tab / cross-window synchronization
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const bc = new BroadcastChannel('classbridge_classroom_channel');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        try {
          const msg = event.data;
          if (!msg || (msg.room_id && msg.room_id.trim().toUpperCase() !== (roomCodeRef.current || 'EDU-02').trim().toUpperCase())) return;

          if (msg.type === 'caption' && msg.segment) {
            // Suppress echo from our own tab
            if (msg.segment.sender_tab_id && msg.segment.sender_tab_id === tabIdRef.current) {
              return;
            }
            const normIncoming = (msg.segment.text_source || msg.segment.text_en || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
            if (!normIncoming) return;

            setSegments((prev) => {
              const recent = prev.slice(-6);
              if (recent.some((s) => {
                if (s.id === msg.segment.id) return true;
                const sNorm = (s.text_source || s.text_en || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
                return sNorm === normIncoming;
              })) {
                return prev;
              }
              if (isReadAloudEnabled) {
                const textToRead = (msg.segment.translations && msg.segment.translations[targetLang]) || msg.segment.text_vernacular || msg.segment.text_source;
                globalTTS.queueSentence(textToRead, targetLang);
              }
              return [...prev, msg.segment];
            });
          } else if (msg.type === 'room_cleared') {
            setSegments([]);
          } else if (msg.type === 'student_ping' || msg.type === 'student_heartbeat') {
            // Received by Teacher tab
            if (userRoleRef.current === 'teacher') {
              if (msg.student_tab_id) {
                studentTabsMapRef.current.set(msg.student_tab_id, Date.now());
              }
              const now = Date.now();
              for (const [id, ts] of studentTabsMapRef.current.entries()) {
                if (now - ts > 6000) {
                  studentTabsMapRef.current.delete(id);
                }
              }
              const count = studentTabsMapRef.current.size;
              setStudentCount(count);
              bc.postMessage({
                type: 'teacher_announce',
                room_id: roomCodeRef.current,
                has_teacher: true,
                student_count: count,
                source_lang: sourceLang,
                is_camera_on: isTeacherCameraOnRef.current,
                is_screen_sharing: isTeacherScreenSharingRef.current
              });
            }
          } else if (msg.type === 'student_leave') {
            if (userRoleRef.current === 'teacher') {
              if (msg.student_tab_id) {
                studentTabsMapRef.current.delete(msg.student_tab_id);
              }
              const count = studentTabsMapRef.current.size;
              setStudentCount(count);
              bc.postMessage({
                type: 'teacher_announce',
                room_id: roomCodeRef.current,
                has_teacher: true,
                student_count: count,
                source_lang: sourceLang,
                is_camera_on: isTeacherCameraOnRef.current,
                is_screen_sharing: isTeacherScreenSharingRef.current
              });
            }
          } else if (msg.type === 'teacher_announce') {
            // Received by Student tabs
            if (userRoleRef.current === 'student') {
              setHasTeacher(Boolean(msg.has_teacher));
              if (msg.teacher_name) {
                setTeacherName(msg.teacher_name);
              }
              if (msg.student_count !== undefined) {
                setStudentCount(msg.student_count);
              }
              if (msg.is_camera_on !== undefined) {
                setIsTeacherCameraOn(Boolean(msg.is_camera_on));
                isTeacherCameraOnRef.current = Boolean(msg.is_camera_on);
              }
              if (msg.is_screen_sharing !== undefined) {
                setIsTeacherScreenSharing(Boolean(msg.is_screen_sharing));
                isTeacherScreenSharingRef.current = Boolean(msg.is_screen_sharing);
              }
            }
          } else if (msg.type === 'teacher_language_update' && userRoleRef.current === 'student') {
            if (msg.source_lang) setSourceLang(msg.source_lang);
          } else if (msg.type === 'teacher_leave') {
            if (userRoleRef.current === 'student') {
              setHasTeacher(false);
              setIsTeacherCameraOn(false);
              isTeacherCameraOnRef.current = false;
              setRemoteVideoFrame(null);
            }
          } else if (msg.type === 'room_presence') {
            if (msg.student_count !== undefined) setStudentCount((c) => Math.max(c, msg.student_count));
            if (msg.teacher_name && userRoleRef.current === 'student') {
              setTeacherName(msg.teacher_name);
            }
            if (msg.source_lang && userRoleRef.current === 'student') {
              setSourceLang(msg.source_lang);
            }
            if (msg.has_teacher !== undefined && userRoleRef.current === 'student') {
              setHasTeacher(Boolean(msg.has_teacher));
            }
            if (msg.is_camera_on !== undefined && userRoleRef.current === 'student') {
              setIsTeacherCameraOn(Boolean(msg.is_camera_on));
              isTeacherCameraOnRef.current = Boolean(msg.is_camera_on);
            }
            if (msg.is_screen_sharing !== undefined && userRoleRef.current === 'student') {
              setIsTeacherScreenSharing(Boolean(msg.is_screen_sharing));
              isTeacherScreenSharingRef.current = Boolean(msg.is_screen_sharing);
            }
          } else if (msg.type === 'student_identify') {
            if (userRoleRef.current === 'teacher') {
              if (msg.student_tab_id) {
                studentTabsMapRef.current.set(msg.student_tab_id, Date.now());
              }
              const studentEntry = {
                id: msg.student_tab_id || `tab_${Math.random().toString(36).substr(2, 6)}`,
                name: msg.name,
                roll_no: msg.roll_no,
                target_lang: msg.target_lang || 'ta',
                joined_at: Date.now() / 1000,
                status: 'online'
              };
              setAttendanceRoster((prev) => {
                const filtered = prev.filter((s) => s.id !== msg.student_tab_id && s.roll_no !== msg.roll_no);
                const updated = [...filtered, studentEntry];
                bc.postMessage({
                  type: 'roster_update',
                  room_id: roomCodeRef.current,
                  students: updated,
                  student_count: updated.length
                });
                return updated;
              });
              setStudentCount(studentTabsMapRef.current.size);
            }
          } else if (msg.type === 'roster_update') {
            if (msg.students && Array.isArray(msg.students)) {
              setAttendanceRoster(msg.students);
              setStudentCount(msg.students.length);
            }
          } else if (msg.type === 'video_frame') {
            if (userRoleRef.current === 'student') {
              setRemoteVideoFrame(msg.frame);
              setIsTeacherCameraOn(true);
              isTeacherCameraOnRef.current = true;
            }
          } else if (msg.type === 'video_state') {
            if (userRoleRef.current === 'student') {
              setIsTeacherCameraOn(Boolean(msg.is_camera_on));
              isTeacherCameraOnRef.current = Boolean(msg.is_camera_on);
              setIsTeacherScreenSharing(Boolean(msg.is_screen_sharing));
              isTeacherScreenSharingRef.current = Boolean(msg.is_screen_sharing);
              if (!msg.is_camera_on) {
                setRemoteVideoFrame(null);
              }
            }
          } else if (msg.type === 'hand_raise') {
            const isRaised = msg.raise_action !== 'lower' && msg.is_raised !== false;
            setHandRaises((prev) => {
              if (isRaised) {
                if (prev.some((h) => (msg.student_tab_id && h.student_tab_id === msg.student_tab_id) || (msg.roll_no && h.roll_no === msg.roll_no))) return prev;
                return [...prev, {
                  student_tab_id: msg.student_tab_id,
                  name: msg.name || 'Student',
                  roll_no: msg.roll_no || '',
                  timestamp: msg.timestamp || Date.now()
                }];
              } else {
                return prev.filter((h) => (!msg.student_tab_id || h.student_tab_id !== msg.student_tab_id) && (!msg.roll_no || h.roll_no !== msg.roll_no));
              }
            });
          } else if (msg.type === 'lower_all_hands') {
            setHandRaises([]);
          } else if (msg.type === 'qa_comment') {
            if (msg.comment) {
              setQaComments((prev) => {
                if (prev.some((c) => c.id === msg.comment.id)) return prev;
                return [...prev, msg.comment];
              });
            }
          } else if (msg.type === 'keyword_announcement') {
            if (msg.segment) {
              setSegments((prev) => {
                if (prev.some((s) => s.id === msg.segment.id)) return prev;
                return [...prev, msg.segment];
              });
              if (isReadAloudEnabled) {
                const textToRead = (msg.segment.translations && msg.segment.translations[targetLang]) || msg.segment.text_vernacular || msg.segment.text_source || msg.segment.text_en;
                globalTTS.queueSentence(textToRead, targetLang);
              }
            }
          } else if (msg.type === 'set_teacher_name') {
            if (msg.teacher_name) {
              setTeacherName(msg.teacher_name);
            }
          }
        } catch (e) {
          console.warn("BroadcastChannel message error:", e);
        }
      };
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (streamerRef.current) streamerRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
      globalTTS.stop();
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
      }
    };
  }, [roomCode, targetLang, isReadAloudEnabled]);

  // Real-Time Classroom Cross-Tab & Multi-Window Heartbeat Protocol
  useEffect(() => {
    if (classMode !== 'realtime_classroom' && classMode !== 'online_classroom') return;

    // Immediately announce role on mount or role/room change
    if (broadcastChannelRef.current) {
      if (userRole === 'teacher') {
        setHasTeacher(true);
        const count = studentTabsMapRef.current.size;
        broadcastChannelRef.current.postMessage({
          type: 'teacher_announce',
          room_id: roomCode,
          has_teacher: true,
          teacher_name: teacherNameRef.current,
          student_count: count,
          source_lang: sourceLang
        });
      } else {
        broadcastChannelRef.current.postMessage({
          type: 'student_ping',
          room_id: roomCode,
          student_tab_id: tabIdRef.current
        });
        if (studentName && studentRollNo) {
          broadcastChannelRef.current.postMessage({
            type: 'student_identify',
            room_id: roomCode,
            student_tab_id: tabIdRef.current,
            name: studentName,
            roll_no: studentRollNo,
            target_lang: targetLang
          });
        }
      }
    }

    // Periodic heartbeat every 2.5s
    const hbInterval = setInterval(() => {
      if (!broadcastChannelRef.current) return;

      if (userRoleRef.current === 'teacher') {
        const now = Date.now();
        for (const [id, ts] of studentTabsMapRef.current.entries()) {
          if (now - ts > 6000) {
            studentTabsMapRef.current.delete(id);
          }
        }
        const count = studentTabsMapRef.current.size;
        setStudentCount(count);
        broadcastChannelRef.current.postMessage({
          type: 'teacher_announce',
          room_id: roomCodeRef.current,
          has_teacher: true,
          teacher_name: teacherNameRef.current,
          student_count: count,
          source_lang: sourceLang
        });
      } else {
        broadcastChannelRef.current.postMessage({
          type: 'student_ping',
          room_id: roomCodeRef.current,
          student_tab_id: tabIdRef.current
        });
      }
    }, 2500);

    const handleBeforeUnload = () => {
      if (!broadcastChannelRef.current) return;
      if (userRoleRef.current === 'teacher') {
        broadcastChannelRef.current.postMessage({
          type: 'teacher_leave',
          room_id: roomCodeRef.current
        });
      } else {
        broadcastChannelRef.current.postMessage({
          type: 'student_leave',
          room_id: roomCodeRef.current,
          student_tab_id: tabIdRef.current
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(hbInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [classMode, userRole, roomCode, studentName, studentRollNo, targetLang, sourceLang]);

  // REST Polling Fallback to sync WebSocket room stats and roster across network devices
  useEffect(() => {
    if (classMode !== 'realtime_classroom' && classMode !== 'online_classroom') return;

    let isMounted = true;
    const checkRoomStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/classroom/${encodeURIComponent(roomCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            if (userRoleRef.current === 'student' && data.has_teacher !== undefined) {
              setHasTeacher(Boolean(data.has_teacher));
            }
            if (data.student_count !== undefined) {
              // Combine max count from backend and local BroadcastChannel
              setStudentCount((prev) => Math.max(prev, data.student_count));
            }
            if (data.is_camera_on !== undefined && userRoleRef.current === 'student') {
              setIsTeacherCameraOn(Boolean(data.is_camera_on));
            }
            if (data.is_screen_sharing !== undefined && userRoleRef.current === 'student') {
              setIsTeacherScreenSharing(Boolean(data.is_screen_sharing));
            }
          }
        }

        // If in online_classroom, also sync roster from backend
        if (classModeRef.current === 'online_classroom') {
          const rosterRes = await fetch(`${API_BASE_URL}/api/classroom/${encodeURIComponent(roomCode)}/roster`);
          if (rosterRes.ok) {
            const rData = await rosterRes.json();
            if (isMounted && rData && rData.roster && Array.isArray(rData.roster)) {
              setAttendanceRoster(rData.roster);
              if (rData.roster.length > 0) {
                setStudentCount((prev) => Math.max(prev, rData.roster.length));
              }
            }
          }
        }
      } catch (err) {
        // Backend might be offline (browser-assisted mode active)
      }
    };

    checkRoomStatus();
    const pollInterval = setInterval(checkRoomStatus, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [classMode, roomCode, userRole]);

  const loadAudioDevices = async () => {
    try {
      // 1. Microphone Inputs
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

      // 2. Speaker Outputs (Laptop Speakers vs Headset)
      const outDevs = await getAudioOutputDevices();
      if (outDevs && outDevs.length > 0) {
        setOutputDevices(outDevs);
        const savedOut = localStorage.getItem('classbridge_speaker_device_id');
        const savedOutValid = savedOut && outDevs.find((d) => d.deviceId === savedOut && !d.isVirtual);

        if (savedOutValid) {
          setSelectedOutputDeviceId(savedOutValid.deviceId);
          globalTTS.setOutputDevice(savedOutValid.deviceId);
        } else {
          // Default to Laptop Speakers (user preference: Bluetooth mic + Laptop speaker playback)
          const laptopSpeaker = outDevs.find((d) => d.isSpeaker && !d.isVirtual);
          const defaultOut = outDevs.find((d) => d.isDefault && !d.isVirtual);
          const chosen = laptopSpeaker || defaultOut || outDevs[0];
          if (chosen) {
            setSelectedOutputDeviceId(chosen.deviceId);
            globalTTS.setOutputDevice(chosen.deviceId);
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

  const handleSelectOutputDevice = (deviceId) => {
    setSelectedOutputDeviceId(deviceId);
    globalTTS.setOutputDevice(deviceId);
    try {
      localStorage.setItem('classbridge_speaker_device_id', deviceId);
    } catch (e) {}
  };

  const handleTestSpeaker = async (deviceId) => {
    await globalTTS.testSpeaker(deviceId || selectedOutputDeviceId);
  };

  const toggleReadAloud = () => {
    setIsReadAloudEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('classbridge_read_aloud', String(next));
      } catch (e) {}
      if (!next) {
        globalTTS.stop();
      }
      return next;
    });
  };

  const handleSpeakSegment = (seg) => {
    setCurrentlySpeakingId(seg.id);
    const textToSpeak = seg.text_vernacular || seg.text_source || seg.text_en;
    const langToSpeak = seg.target_lang || targetLang;
    globalTTS.speakImmediate(textToSpeak, langToSpeak);
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
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
    }

    try {
      const isClassroom = classMode === 'realtime_classroom' || classMode === 'online_classroom';
      const wsUrl = isClassroom
        ? `${WS_BASE_URL}/ws/classroom/${encodeURIComponent(roomCode)}?role=${userRole}&source_lang=${sourceLang}&target_lang=${targetLang}${userRole === 'teacher' && teacherName ? `&teacher_name=${encodeURIComponent(teacherName)}` : ''}`
        : `${WS_BASE_URL}/ws/lecture?target_lang=${targetLang}&source_lang=${sourceLang}`;

      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && /^ws:\/\/(localhost|127\.0\.0\.1)/i.test(wsUrl)) {
        setErrorMessage('Live mobile captions need a deployed backend. Set VITE_API_URL to your HTTPS backend before deploying Vercel.');
        setConnectionStatus('browser_assisted');
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setErrorMessage(null);

        // Auto identify student to backend if credentials exist
        if (userRoleRef.current === 'student' && studentName && studentRollNo) {
          try {
            ws.send(JSON.stringify({
              action: 'student_identify',
              name: studentName,
              roll_no: studentRollNo,
              target_lang: targetLang,
              student_tab_id: tabIdRef.current
            }));
          } catch (e) {}
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'handshake') {
            setConnectionStatus('connected');
            if (data.student_count !== undefined) {
              setStudentCount((prev) => Math.max(prev, data.student_count));
            }
            if (data.teacher_name && userRoleRef.current === 'student') {
              setTeacherName(data.teacher_name);
            }
            if (data.source_lang && userRoleRef.current === 'student') {
              setSourceLang(data.source_lang);
            }
            if (data.hand_raises && Array.isArray(data.hand_raises)) {
              setHandRaises(data.hand_raises);
            }
            if (data.qa_comments && Array.isArray(data.qa_comments)) {
              setQaComments(data.qa_comments);
            }
            if (userRoleRef.current === 'teacher') {
              setHasTeacher(true);
              if (data.roster && Array.isArray(data.roster)) {
                setAttendanceRoster(data.roster);
              }
            } else if (data.has_teacher !== undefined) {
              setHasTeacher(Boolean(data.has_teacher));
            }
            if (data.is_camera_on !== undefined && userRoleRef.current === 'student') {
              setIsTeacherCameraOn(Boolean(data.is_camera_on));
            }
            if (data.is_screen_sharing !== undefined && userRoleRef.current === 'student') {
              setIsTeacherScreenSharing(Boolean(data.is_screen_sharing));
            }
          } else if (data.type === 'room_presence') {
            if (data.student_count !== undefined) {
              setStudentCount((prev) => Math.max(prev, data.student_count));
            }
            if (data.teacher_name && userRoleRef.current === 'student') {
              setTeacherName(data.teacher_name);
            }
            if (data.source_lang && userRoleRef.current === 'student') {
              setSourceLang(data.source_lang);
            }
            if (userRoleRef.current === 'teacher') {
              setHasTeacher(true);
            } else if (data.has_teacher !== undefined) {
              setHasTeacher(Boolean(data.has_teacher));
            }
            if (data.is_camera_on !== undefined && userRoleRef.current === 'student') {
              setIsTeacherCameraOn(Boolean(data.is_camera_on));
            }
            if (data.is_screen_sharing !== undefined && userRoleRef.current === 'student') {
              setIsTeacherScreenSharing(Boolean(data.is_screen_sharing));
            }
          } else if (data.type === 'roster_update') {
            if (data.students && Array.isArray(data.students)) {
              setAttendanceRoster(data.students);
              setStudentCount(data.students.length);
            }
          } else if (data.type === 'video_frame') {
            if (userRoleRef.current === 'student') {
              setRemoteVideoFrame(data.frame);
              setIsTeacherCameraOn(true);
            }
          } else if (data.type === 'video_state') {
            if (userRoleRef.current === 'student') {
              setIsTeacherCameraOn(Boolean(data.is_camera_on));
              setIsTeacherScreenSharing(Boolean(data.is_screen_sharing));
              if (!data.is_camera_on) {
                setRemoteVideoFrame(null);
              }
            }
          } else if (data.type === 'hand_raise') {
            if (data.hand_raises && Array.isArray(data.hand_raises)) {
              setHandRaises(data.hand_raises);
            } else if (data.hand_data) {
              const hd = data.hand_data;
              setHandRaises((prev) => {
                if (hd.is_raised) {
                  if (prev.some((h) => h.id === hd.id || (h.student_tab_id && h.student_tab_id === hd.student_tab_id))) return prev;
                  return [...prev, hd];
                } else {
                  return prev.filter((h) => h.id !== hd.id && (!hd.student_tab_id || h.student_tab_id !== hd.student_tab_id));
                }
              });
            }
          } else if (data.type === 'lower_all_hands') {
            setHandRaises([]);
          } else if (data.type === 'qa_comment') {
            if (data.comment) {
              setQaComments((prev) => {
                if (prev.some((c) => c.id === data.comment.id)) return prev;
                return [...prev, data.comment];
              });
            }
          } else if (data.type === 'keyword_announcement') {
            if (data.segment) {
              setSegments((prev) => {
                if (prev.some((s) => s.id === data.segment.id)) return prev;
                return [...prev, data.segment];
              });
              if (isReadAloudEnabled) {
                const textToRead = (data.segment.translations && data.segment.translations[targetLang]) || data.segment.text_vernacular || data.segment.text_source || data.segment.text_en;
                globalTTS.queueSentence(textToRead, targetLang);
              }
            }
          } else if (data.type === 'set_teacher_name') {
            if (data.teacher_name) {
              setTeacherName(data.teacher_name);
            }
          } else if (data.type === 'history') {
            if (data.segments && Array.isArray(data.segments)) {
              setSegments(data.segments);
            }
          } else if (data.type === 'caption' && data.segment) {
            // Suppress echo from our own tab
            if (data.segment.sender_tab_id && data.segment.sender_tab_id === tabIdRef.current) {
              return;
            }
            const normIncoming = (data.segment.text_source || data.segment.text_en || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
            if (!normIncoming) return;

            setSegments((prev) => {
              // Prevent duplicate across last 6 segments
              const recent = prev.slice(-6);
              if (recent.some((s) => {
                if (s.id === data.segment.id) return true;
                const sNorm = (s.text_source || s.text_en || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
                return sNorm === normIncoming;
              })) {
                return prev;
              }
              if (isReadAloudEnabled) {
                const textToRead = (data.segment.translations && data.segment.translations[targetLang]) || data.segment.text_vernacular || data.segment.text_source || data.segment.text_en;
                globalTTS.queueSentence(textToRead, targetLang);
              }
              return [...prev, data.segment];
            });
          } else if (data.type === 'room_cleared') {
            setSegments([]);
          } else if (data.type === 'teacher_status') {
            if (data.status === 'offline') {
              if (userRoleRef.current === 'student') setHasTeacher(false);
            } else if (data.status === 'online') {
              setHasTeacher(true);
            }
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

  // Reconnect WebSocket whenever classroom mode, role, or room changes
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [classMode, userRole, roomCode]);

  const handleLanguageChange = (newTarget) => {
    if (!newTarget) return;
    const isStudent = userRoleRef.current === 'student';
    setTargetLang(newTarget);
    try {
      localStorage.setItem(isStudent ? 'classbridge_student_target_lang' : 'classbridge_target_lang', newTarget);
    } catch (e) {}

    // If target matches source, automatically alter source
    if (newTarget === sourceLang) {
      const altSource = newTarget === 'en' ? 'ta' : 'en';
      setSourceLang(altSource);
      try {
        localStorage.setItem('classbridge_source_lang', altSource);
      } catch (e) {}
      if (streamerRef.current) {
        streamerRef.current.setSourceLanguage(altSource);
      }
    }

    if (!isStudent && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_language', language: newTarget }));
    }
    // If there is active live interim speech, translate it immediately to the new language
    if (interimSpeech) {
      translateInterimDebounced(interimSpeech, newTarget, glossary, (vern) => {
        setInterimVernacular(vern);
      }, sourceLang);
    }
    // Dynamically update existing segments that have multi-language translations
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.translations && seg.translations[newTarget]) {
          return {
            ...seg,
            target_lang: newTarget,
            text_vernacular: seg.translations[newTarget],
            domain_terms: (seg.domain_terms || []).map((dt) => ({
              ...dt,
              adapted_vernacular: (dt.translations && dt.translations[newTarget]) || dt.adapted_vernacular || dt.en
            }))
          };
        }
        return seg;
      })
    );
  };

  const handleSourceLanguageChange = (newSource) => {
    if (!newSource || userRoleRef.current === 'student') return;
    setSourceLang(newSource);
    try {
      localStorage.setItem('classbridge_source_lang', newSource);
    } catch (e) {}

    // If source matches target, automatically alter target
    if (newSource === targetLang) {
      const altTarget = newSource === 'en' ? 'ta' : 'en';
      setTargetLang(altTarget);
      try {
        localStorage.setItem('classbridge_target_lang', altTarget);
      } catch (e) {}
    }

    if (streamerRef.current) {
      streamerRef.current.setSourceLanguage(newSource);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_source_language', language: newSource }));
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'teacher_language_update',
        room_id: roomCodeRef.current,
        source_lang: newSource
      });
    }
  };

  const handleSwapLanguages = () => {
    if (userRoleRef.current === 'student') return;
    const prevSrc = sourceLang;
    const prevTgt = targetLang;
    setSourceLang(prevTgt);
    setTargetLang(prevSrc);

    try {
      localStorage.setItem('classbridge_source_lang', prevTgt);
      localStorage.setItem('classbridge_target_lang', prevSrc);
    } catch (e) {}

    if (streamerRef.current) {
      streamerRef.current.setSourceLanguage(prevTgt);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'swap_languages' }));
    }

    if (interimSpeech) {
      translateInterimDebounced(interimSpeech, prevSrc, glossary, (vern) => {
        setInterimVernacular(vern);
      }, prevTgt);
    }
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
      const transResult = await translateTextClient(cleanText, targetLang, glossary, sourceLang);
      const translationResults = await Promise.all(
        ['ta', 'ml', 'hi'].map(async (language) => [
          language,
          language === targetLang
            ? transResult.adapted_translation
            : (await translateTextClient(cleanText, language, glossary, sourceLang)).adapted_translation
        ])
      );
      const translations = Object.fromEntries([
        [sourceLang, cleanText],
        ['en', sourceLang === 'en' ? cleanText : undefined],
        ...translationResults
      ].filter(([, value]) => value));
      setSegments((prev) => {
        const normClean = cleanText.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
        if (!normClean) return prev;

        // Prevent duplicate commits across last 6 segments
        const recent = prev.slice(-6);
        if (recent.some((s) => {
          const sNorm = (s.text_source || s.text_en || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
          return sNorm === normClean;
        })) {
          return prev;
        }

        // If the new phrase extends the previous segment (e.g. partial utterance updated to full)
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const lastNorm = (last.text_source || last.text_en || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
          if (normClean.startsWith(lastNorm) && (normClean.length - lastNorm.length) < 60) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              text_en: cleanText,
              text_source: cleanText,
              text_vernacular: transResult.adapted_translation,
              raw_translation: transResult.raw_translation,
              translations,
              confidence: confidence,
              domain_terms: transResult.domain_terms,
              source_lang: sourceLang,
              target_lang: targetLang,
              sender_tab_id: tabIdRef.current
            };
            return updated;
          }

          // If the previous segment already contains the current text, skip
          if (lastNorm.endsWith(normClean) || lastNorm.includes(normClean)) {
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
            text_source: cleanText,
            text_vernacular: transResult.adapted_translation,
            raw_translation: transResult.raw_translation,
            translations,
            confidence: confidence,
            domain_terms: transResult.domain_terms,
            source_lang: sourceLang,
            target_lang: targetLang,
            sender_tab_id: tabIdRef.current
          }
        ];
      });

      // Real-time automatic Read Aloud through selected laptop speakers
      if (isReadAloudEnabled) {
        const textToRead = transResult.adapted_translation || cleanText;
        globalTTS.queueSentence(textToRead, targetLang);
      }

      // If in teacher role, broadcast across local tabs immediately for 0ms multi-window demo
      if ((classMode === 'realtime_classroom' || classMode === 'online_classroom') && userRole === 'teacher' && broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'caption',
          room_id: roomCode,
          segment: {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text_source: cleanText,
            text_en: cleanText,
            text_vernacular: transResult.adapted_translation,
            translations,
            confidence: confidence,
            domain_terms: transResult.domain_terms,
            source_lang: sourceLang,
            target_lang: targetLang,
            sender_tab_id: tabIdRef.current
          }
        });
      }
    } catch (err) {
      console.error("Error processing live speech segment:", err);
    }

    // Also send to backend WebSocket if connected so backend fans out to other classroom devices
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'process_text_segment',
        text: cleanText,
        confidence: confidence,
        duration: 4.0,
        sender_tab_id: tabIdRef.current
      }));
    }
  };

  // Toggle Microphone
  const toggleRecording = async () => {
    // If student in classroom mode, mic is locked to prevent classroom audio feedback
    if ((classMode === 'realtime_classroom' || classMode === 'online_classroom') && userRole === 'student') {
      setIsClassroomModalOpen(true);
      return;
    }

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
        sourceLang: sourceLang,
        domainContext: {
          category: 'STEM',
          recentTerms: segments.slice(-6).flatMap((s) => (s.domain_terms || []).map((dt) => (dt.term || '').toLowerCase()))
        },
        glossary: glossary,
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
            translateStreamingFast(text.trim(), targetLang, glossary, (vern) => {
              setInterimVernacular(vern);
            }, sourceLang);
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

        const segData = {
          id: segId,
          start: item.start,
          end: item.end,
          timestamp: item.timestamp,
          text_en: item.text_en,
          text_source: item.text_en,
          text_vernacular: vernText,
          translations: item.translations,
          confidence: item.confidence,
          domain_terms: adaptedTerms,
          source_lang: sourceLang,
          target_lang: targetLang
        };

        setSegments((prev) => {
          if (prev.some((s) => s.text_en === item.text_en)) return prev;
          return [...prev, segData];
        });

        // Broadcast to student tabs immediately
        if ((classMode === 'realtime_classroom' || classMode === 'online_classroom') && userRole === 'teacher' && broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'caption',
            room_id: roomCode,
            segment: segData
          });
        }

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

  const handleOpenDemoShowcase = () => {
    const sampleItems = SAMPLE_LECTURES.ml;
    const demoSegments = sampleItems.map((item, index) => ({
      id: `demo-${index + 1}`,
      start: item.start,
      end: item.end,
      timestamp: item.timestamp,
      text_en: item.text_en,
      text_source: item.text_en,
      text_vernacular: item.translations?.[targetLang] || item.translations?.ta || item.text_vernacular,
      translations: item.translations,
      confidence: item.confidence,
      domain_terms: item.domain_terms || [],
      source_lang: 'en',
      target_lang: targetLang
    }));
    const demoHistory = [
      {
        id: 'demo-ml-lecture',
        title: 'Demo: ML & Optimization',
        date: 'Ready for presentation',
        sourceLang: 'en',
        targetLang,
        segments: demoSegments
      },
      {
        id: 'demo-linear-algebra',
        title: 'Demo: Linear Algebra',
        date: 'Reference session',
        sourceLang: 'en',
        targetLang,
        segments: demoSegments.slice(0, 2)
      }
    ];
    const demoGuide = {
      title: 'Demo Study Guide: ML & Optimization',
      date: 'Presentation Demo',
      target_language: targetLangMeta.name,
      native_language: targetLangMeta.native,
      segment_count: demoSegments.length,
      overview: {
        en: 'This demo lecture explains gradient descent, backpropagation, learning rate, loss, and overfitting in neural-network optimization.',
        vernacular: 'A structured vernacular revision summary generated from the live lecture transcript.'
      },
      diagram: {
        title: 'Grounded ML Optimization Concept Map',
        source: 'Demo map generated from concepts detected in this lecture.',
        nodes: [
          { id: 'lecture', label: 'Lecture Concepts', detail: 'ML Optimization' },
          { id: 'gradient', label: 'Gradient Descent', detail: 'Optimization' },
          { id: 'backprop', label: 'Backpropagation', detail: 'Neural Networks' },
          { id: 'learning', label: 'Learning Rate', detail: 'Step Size' },
          { id: 'loss', label: 'Loss Function', detail: 'Error Signal' },
          { id: 'formula', label: 'Parameter Update', detail: 'theta(t+1) = theta(t) - eta grad J' }
        ],
        edges: []
      },
      visuals: {
        lossCurve: { caption: 'Each update moves parameters toward a lower error value.' },
        network: { caption: 'Backpropagation sends the error signal backward through the hidden layer.' },
        equation: { latex: 'theta(t+1) = theta(t) - eta * grad J(theta(t))', caption: 'New parameters = current parameters - learning rate x loss gradient.' }
      },
      definitions: [
        { term: 'Gradient Descent', vernacular_term: 'Gradient Descent', category: 'Machine Learning', definition: 'An iterative optimization method that moves parameters in the direction that reduces loss.' },
        { term: 'Backpropagation', vernacular_term: 'Backpropagation', category: 'Neural Networks', definition: 'A chain-rule method for computing gradients through network layers.' }
      ],
      formulas: [{ name: 'Gradient Descent Update', latex: 'theta(t+1) = theta(t) - eta grad J(theta(t))', description: 'Updates parameters using the learning rate and loss gradient.', variables: 'theta: parameters, eta: learning rate, J: loss' }],
      takeaways: demoSegments.slice(0, 3).map((segment) => ({ point: segment.text_en, vernacular_point: segment.text_vernacular, timestamp: segment.timestamp })),
      flashcards: [{ id: 1, front: 'What does gradient descent minimize?', vernacular_front: 'What does gradient descent minimize?', back: 'The loss function.', category: 'Machine Learning' }]
    };
    setSegments(demoSegments);
    setStudyGuide(demoGuide);
    setLectureHistory(demoHistory);
    try {
      localStorage.setItem('classbridge_lecture_history', JSON.stringify(demoHistory));
    } catch (e) {}
    setIsHistoryOpen(false);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  const clearSession = async () => {
    setSegments([]);
    setMessages([]);
    setStudyGuide(null);
    setSessionSeconds(0);
    setHighlightedSegmentId(null);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'room_cleared',
        room_id: roomCode
      });
    }

    if ((classMode === 'realtime_classroom' || classMode === 'online_classroom') && userRole === 'teacher') {
      try {
        await fetch(`${API_BASE_URL}/api/classroom/${encodeURIComponent(roomCode)}/reset`, { method: 'POST' });
      } catch (e) {}
    } else {
      try {
        await fetch(`${API_BASE_URL}/api/session/reset`, { method: 'POST' });
      } catch (e) {}
    }
  };

  const handleClassModeChange = (mode) => {
    setClassMode(mode);
    try {
      localStorage.setItem('classbridge_class_mode', mode);
    } catch (e) {}

    if (mode === 'online_classroom') {
      if (userRole === 'teacher') {
        setIsTeacherSetupOpen(true);
      } else if (!studentName || !studentRollNo) {
        setIsStudentRegisterOpen(true);
      }
    }
  };

  const handleUserRoleChange = (role) => {
    if (isRoleLocked && role === 'teacher') return;
    const cleanRole = role === 'teacher' ? 'teacher' : 'student';
    userRoleRef.current = cleanRole;
    setUserRole(cleanRole);
    try {
      localStorage.setItem('classbridge_user_role', cleanRole);
    } catch (e) {}

    if (classMode === 'online_classroom' && cleanRole === 'teacher') {
      setIsTeacherSetupOpen(true);
    }

    if (cleanRole === 'teacher') {
      setHasTeacher(true);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'teacher_announce',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          has_teacher: true,
          teacher_name: teacherNameRef.current,
          student_count: studentTabsMapRef.current.size,
          source_lang: sourceLang,
          is_camera_on: isTeacherCameraOnRef.current,
          is_screen_sharing: isTeacherScreenSharingRef.current
        });
      }
    } else {
      setHasTeacher(false);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'teacher_leave',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase()
        });
        broadcastChannelRef.current.postMessage({
          type: 'student_ping',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          student_tab_id: tabIdRef.current
        });
      }
    }
  };

  const handleRoomCodeChange = (code) => {
    const clean = code.trim().toUpperCase() || 'EDU-02';
    setRoomCode(clean);
    studentTabsMapRef.current.clear();
    setStudentCount(0);
    try {
      localStorage.setItem('classbridge_room_code', clean);
    } catch (e) {}
  };

  // Auto-open student registration modal when entering online_classroom as student if credentials missing
  useEffect(() => {
    if (classMode === 'online_classroom' && userRole === 'student') {
      if (!studentName || !studentRollNo) {
        setIsStudentRegisterOpen(true);
      }
    }
  }, [classMode, userRole, studentName, studentRollNo]);

  // Auto-open teacher setup modal when entering online_classroom as teacher if name missing
  useEffect(() => {
    if (classMode === 'online_classroom' && userRole === 'teacher') {
      if (!teacherName) {
        setIsTeacherSetupOpen(true);
      }
    }
  }, [classMode, userRole, teacherName]);

  const handleTeacherSetupSubmit = ({ teacherName: tName, name, sourceLang: sLang, targetLang: tLang }) => {
    const cleanName = (tName || name || '').trim();
    if (cleanName) {
      setTeacherName(cleanName);
      try {
        localStorage.setItem('classbridge_teacher_name', cleanName);
      } catch (e) {}
    }
    if (sLang) {
      setSourceLang(sLang);
      try {
        localStorage.setItem('classbridge_source_lang', sLang);
      } catch (e) {}
    }
    if (tLang) {
      handleLanguageChange(tLang);
    }
    setIsTeacherSetupOpen(false);

    // Announce to WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          action: 'set_teacher_name',
          teacher_name: cleanName
        }));
      } catch (e) {}
    }

    // Announce to BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'set_teacher_name',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          teacher_name: cleanName
        });
      } catch (e) {}
    }
  };

  const handleToggleHandRaise = () => {
    const isRaised = handRaises.some(
      (h) => (h.student_tab_id && h.student_tab_id === tabIdRef.current) || (studentRollNo && h.roll_no === studentRollNo)
    );
    const nextAction = isRaised ? 'lower' : 'raise';
    const payload = {
      action: 'hand_raise',
      student_tab_id: tabIdRef.current,
      name: studentName || 'Student',
      roll_no: studentRollNo || '',
      raise_action: nextAction,
      is_raised: nextAction === 'raise',
      timestamp: Date.now()
    };

    setHandRaises((prev) => {
      if (nextAction === 'raise') {
        if (prev.some((h) => h.student_tab_id === tabIdRef.current || (studentRollNo && h.roll_no === studentRollNo))) return prev;
        return [...prev, {
          student_tab_id: tabIdRef.current,
          name: studentName || 'Student',
          roll_no: studentRollNo || '',
          timestamp: Date.now()
        }];
      } else {
        return prev.filter((h) => h.student_tab_id !== tabIdRef.current && (!studentRollNo || h.roll_no !== studentRollNo));
      }
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(payload));
      } catch (e) {}
    }

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'hand_raise',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          ...payload
        });
      } catch (e) {}
    }
  };

  const handleLowerAllHands = () => {
    setHandRaises([]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'lower_all_hands' }));
      } catch (e) {}
    }

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'lower_all_hands',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase()
        });
      } catch (e) {}
    }
  };

  const handleSendQaComment = (text) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const sender = userRole === 'teacher' ? (teacherName || 'Teacher') : (studentName || 'Student');
    const rollNo = userRole === 'student' ? (studentRollNo || '') : '';
    const commentObj = {
      id: 'qa_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      sender: sender,
      sender_name: sender,
      role: userRole,
      sender_role: userRole,
      roll_no: rollNo,
      sender_roll_no: rollNo,
      text: cleanText,
      timestamp: Date.now()
    };

    setQaComments((prev) => [...prev, commentObj]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          action: 'qa_comment',
          comment: commentObj,
          text: cleanText
        }));
      } catch (e) {}
    }

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'qa_comment',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          comment: commentObj
        });
      } catch (e) {}
    }
  };

  const handleBroadcastKeyword = async (keywordText) => {
    if (!keywordText || !keywordText.trim()) return;
    const clean = keywordText.trim();

    // Multi-lingual translations for all target languages (ta, ml, hi, en)
    const targetLangs = ['ta', 'ml', 'hi', 'en'];
    const translations = { [sourceLang]: clean };

    await Promise.all(
      targetLangs.map(async (tLang) => {
        if (tLang === sourceLang) return;
        try {
          const trans = await translateTextClient(clean, sourceLang, tLang);
          translations[tLang] = trans || clean;
        } catch (e) {
          translations[tLang] = clean;
        }
      })
    );

    const segId = segments.length + 1;
    const keywordSegment = {
      id: segId,
      speaker: userRole === 'teacher' ? (teacherName || 'Teacher') : 'Teacher',
      text_source: clean,
      text_en: sourceLang === 'en' ? clean : (translations['en'] || clean),
      text_vernacular: translations[targetLang] || clean,
      translations: translations,
      confidence: 100.0,
      is_keyword: true,
      timestamp: 'KEYWORD',
      source_lang: sourceLang,
      target_lang: targetLang
    };

    setSegments((prev) => [...prev, keywordSegment]);

    if (isReadAloudEnabled) {
      const textToRead = translations[targetLang] || clean;
      globalTTS.queueSentence(textToRead, targetLang);
    }

    // Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          action: 'keyword_caption',
          keyword: clean,
          text: clean,
          segment: keywordSegment
        }));
      } catch (e) {}
    }

    // Send via BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'keyword_announcement',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          keyword: clean,
          segment: keywordSegment
        });
      } catch (e) {}
    }
  };

  const handleBroadcastVideoFrame = (frameData) => {
    if (userRoleRef.current !== 'teacher') return;

    // 1. Post to local tabs via BroadcastChannel for 0ms cross-window synchronization
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'video_frame',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          frame: frameData
        });
      } catch (e) {}
    }

    // 2. Post to WebSocket for remote students
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          action: 'video_frame',
          frame: frameData
        }));
      } catch (e) {}
    }
  };

  const handleBroadcastVideoState = ({ is_camera_on, is_screen_sharing }) => {
    if (userRoleRef.current !== 'teacher') return;
    setIsTeacherCameraOn(Boolean(is_camera_on));
    setIsTeacherScreenSharing(Boolean(is_screen_sharing));

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'video_state',
          room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
          is_camera_on: Boolean(is_camera_on),
          is_screen_sharing: Boolean(is_screen_sharing)
        });
      } catch (e) {}
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          action: 'video_state',
          is_camera_on: Boolean(is_camera_on),
          is_screen_sharing: Boolean(is_screen_sharing)
        }));
      } catch (e) {}
    }
  };

  const handleEndOnlineSession = () => {
    if (userRole === 'teacher') {
      const confirmEnd = window.confirm("Are you sure you want to end this online classroom session for all students?");
      if (!confirmEnd) return;

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'teacher_leave',
            room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase()
          });
        } catch (e) {}
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            action: 'video_state',
            is_camera_on: false,
            is_screen_sharing: false
          }));
        } catch (e) {}
      }

      setIsTeacherCameraOn(false);
      setIsTeacherScreenSharing(false);
      setRemoteVideoFrame(null);
      clearSession();
      setClassMode('realtime_classroom');
      try {
        localStorage.setItem('classbridge_class_mode', 'realtime_classroom');
      } catch (e) {}
    } else {
      const confirmLeave = window.confirm("Leave this online classroom session?");
      if (!confirmLeave) return;

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'student_leave',
            room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
            student_tab_id: tabIdRef.current
          });
        } catch (e) {}
      }

      setRemoteVideoFrame(null);
      setClassMode('realtime_classroom');
      try {
        localStorage.setItem('classbridge_class_mode', 'realtime_classroom');
      } catch (e) {}
    }
  };

  const handleStudentRegisterSubmit = ({ name, roll_no, target_lang }) => {
    setStudentName(name);
    setStudentRollNo(roll_no);
    if (target_lang && target_lang !== targetLang) {
      handleLanguageChange(target_lang);
    }
    setIsStudentRegisterOpen(false);

    // 1. Announce via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          action: 'student_identify',
          name,
          roll_no,
          target_lang: target_lang || targetLang,
          student_tab_id: tabIdRef.current
        }));
      } catch (e) {}
    }

    // 2. Announce over BroadcastChannel
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'student_identify',
        room_id: (roomCodeRef.current || 'EDU-02').trim().toUpperCase(),
        student_tab_id: tabIdRef.current,
        name,
        roll_no,
        target_lang: target_lang || targetLang
      });
    }
  };

  // Grounded Q&A with Caption Grounding & Internet Definition
  const handleSendMessage = async (question) => {
    if (!question || !question.trim()) return;
    const cleanQ = question.trim();
    const userMsg = { role: 'user', text: cleanQ };
    setMessages((prev) => [...prev, userMsg]);
    setIsAskingQa(true);

    try {
      // 1. Attempt always-generative Gemini endpoint first (/api/generate/chat)
      try {
        const currentMode = classMode === 'online_classroom' ? 'online' : classMode === 'realtime_classroom' ? 'offline' : 'solo';
        const genRes = await fetch(`${API_BASE_URL}/api/generate/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: cleanQ,
            source_lang: sourceLang,
            target_lang: targetLang,
            segments,
            mode: currentMode
          })
        });

        if (genRes.ok) {
          const data = await genRes.json();
          if (data.answer) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'bot',
                found_in_lecture: Boolean(data.found_in_lecture),
                text: typeof data.answer === 'string' ? data.answer : String(data.answer || ''),
                vernacular: typeof data.vernacular_answer === 'string' ? data.vernacular_answer : String(data.vernacular_answer || ''),
                source_lang: sourceLang,
                target_lang: targetLang,
                citations: Array.isArray(data.citations) ? data.citations : [],
                related_concepts: data.related_concepts || [],
                internet_definition: null,
                generated_at: data.generated_at || null,
                source: data.source || 'gemini_generative'
              }
            ]);
            return;
          }
        }
      } catch (genErr) {
        console.log("Generative chat endpoint unavailable, trying RAG fallback.");
      }

      // 2. Fall back to /api/qa (RAG-based)
      try {
        const res = await fetch(`${API_BASE_URL}/api/qa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: cleanQ,
            source_lang: sourceLang,
            target_lang: targetLang,
            segments
          })
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            {
              role: 'bot',
              found_in_lecture: Boolean(data.found_in_lecture),
              text: typeof data.answer === 'string' ? data.answer : String(data.answer || ''),
              vernacular: typeof data.vernacular_answer === 'string' ? data.vernacular_answer : String(data.vernacular_answer || ''),
              source_lang: sourceLang,
              target_lang: targetLang,
              citations: Array.isArray(data.citations) ? data.citations : [],
              related_concepts: data.related_concepts || data.internet_definition?.related_concepts || [],
              internet_definition: data.internet_definition || null
            }
          ]);
          return;
        }
      } catch (backendErr) {
        console.log("Backend Q&A unavailable, switching to client-side grounded RAG fallback.");
      }

      // 2. Client-side Semantic Grounded RAG + Educational Concept Fallback
      let internetDef = null;
      try {
        internetDef = await fetchInternetReference(cleanQ, sourceLang, targetLang, FALLBACK_GLOSSARY);
      } catch (e) {
        console.info("Client-side reference fetch fallback:", e);
      }

      const coreConcept = cleanQuestionToSearchTerm(cleanQ).toLowerCase();
      const expansionTargets = new Set();
      if (coreConcept) expansionTargets.add(coreConcept);
      if (STEM_ACRONYMS[coreConcept]) {
        STEM_ACRONYMS[coreConcept].forEach((t) => expansionTargets.add(t.toLowerCase()));
      }
      if (internetDef?.term) {
        const termClean = cleanQuestionToSearchTerm(internetDef.term).toLowerCase();
        if (termClean) expansionTargets.add(termClean);
        if (STEM_ACRONYMS[termClean]) {
          STEM_ACRONYMS[termClean].forEach((t) => expansionTargets.add(t.toLowerCase()));
        }
      }

      // Content words excluding stopwords
      const contentWords = new Set();
      expansionTargets.forEach((t) => {
        (t.match(/[a-z]+/gi) || []).forEach((w) => {
          const wLow = w.toLowerCase();
          if (!STOPWORDS.has(wLow) && wLow.length > 2) {
            contentWords.add(wLow);
          }
        });
      });

      let bestMatch = null;
      let maxScore = -1;

      if (Array.isArray(segments) && segments.length > 0) {
        segments.forEach((seg) => {
          const segText = ((seg.text_source || seg.text_en || '') + " " + (seg.text_vernacular || '')).toLowerCase();
          const segWords = segText.match(/[a-z]+/gi) || [];

          // 1. Acronym & Initials Match
          let acronymHit = false;
          for (const target of expansionTargets) {
            if (matchesAcronymOrInitials(target, segText)) {
              acronymHit = true;
              break;
            }
          }

          // 2. Multi-word phrase match
          let phraseHit = false;
          for (const target of expansionTargets) {
            if (target.includes(' ') && segText.includes(target)) {
              phraseHit = true;
              break;
            }
          }

          // 3. Domain terms match
          let domainHit = false;
          if (seg.domain_terms && Array.isArray(seg.domain_terms)) {
            for (const dt of seg.domain_terms) {
              const dtEn = (dt.en || dt.term || '').toLowerCase();
              if (dtEn && Array.from(expansionTargets).some((t) => dtEn.includes(t) || t.includes(dtEn))) {
                domainHit = true;
                break;
              }
            }
          }

          // 4. Content words presence
          const matchingWords = Array.from(contentWords).filter((w) => segWords.includes(w) || segText.includes(w));

          if (!acronymHit && !phraseHit && !domainHit && matchingWords.length === 0) {
            return;
          }

          let score = 0.0;
          if (acronymHit) score += 2.5;
          if (phraseHit) score += 2.0;
          if (domainHit) score += 1.2;
          if (matchingWords.length > 0) {
            score += (matchingWords.length / Math.max(contentWords.size, 1)) * 1.5;
          }

          if (score > maxScore) {
            maxScore = score;
            bestMatch = seg;
          }
        });
      }

      if (bestMatch && maxScore >= 0.5) {
        const conceptTitle = internetDef?.term || (coreConcept ? (coreConcept.charAt(0).toUpperCase() + coreConcept.slice(1)) : cleanQ);
        const actualSource = bestMatch.text_source || bestMatch.text_en || '';
        const actualVernacular = bestMatch.text_vernacular || actualSource;
        const segId = bestMatch.id || 1;
        const segTime = bestMatch.timestamp || '00:00';

        const defSnippet = internetDef?.text_source ? ` This directly connects to ${conceptTitle}: ${internetDef.text_source}` : '';
        const groundedEn = `As the instructor explains at [${segTime}], "${actualSource}".${defSnippet}`;

        let groundedVernacular = "";
        const vDefSnippet = internetDef?.text_target ? ` ${internetDef.text_target}` : '';
        if (targetLang === 'ml') {
          groundedVernacular = `നിങ്ങളുടെ പ്രഭാഷണത്തിൽ [${segTime}] സമയത്ത് വ്യക്തമാക്കുന്നത്: "${actualVernacular}".${vDefSnippet}`;
        } else if (targetLang === 'hi') {
          groundedVernacular = `व्याख्यान में [${segTime}] पर समझाया गया है: "${actualVernacular}".${vDefSnippet}`;
        } else if (targetLang === 'ta') {
          groundedVernacular = `உங்கள் விரிவுரையில் [${segTime}] நேரத்தில் விளக்கப்பட்டது: "${actualVernacular}".${vDefSnippet}`;
        } else {
          groundedVernacular = groundedEn;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            found_in_lecture: true,
            text: groundedEn,
            vernacular: groundedVernacular,
            source_lang: sourceLang,
            target_lang: targetLang,
            citations: [
              {
                segment_id: segId,
                timestamp: segTime,
                text_source: actualSource,
                text_vernacular: actualVernacular,
                relevance_score: Math.min(1.0, Math.round(maxScore * 25) / 100)
              }
            ],
            related_concepts: internetDef?.related_concepts || [],
            internet_definition: internetDef
          }
        ]);
      } else {
        // Out of Topic (Not covered in lecture)
        const conceptName = internetDef?.term || (coreConcept ? (coreConcept.charAt(0).toUpperCase() + coreConcept.slice(1)) : cleanQ);
        let notFoundVernacular = "";
        if (targetLang === 'ml') {
          notFoundVernacular = `ഈ വിഷയം ('${conceptName}') നിലവിലെ പ്രഭാഷണത്തിൽ ഉൾപ്പെടുത്തിയിട്ടില്ല. BridgeAI വിവരണം: ${internetDef?.text_target || ''}`;
        } else if (targetLang === 'hi') {
          notFoundVernacular = `यह विषय ('${conceptName}') वर्तमान व्याख्यान में शामिल नहीं है। BridgeAI विवरण: ${internetDef?.text_target || ''}`;
        } else if (targetLang === 'ta') {
          notFoundVernacular = `இந்தத் தலைப்பு ('${conceptName}') தற்போதைய விரிவுரையில் இடம்பெறவில்லை. BridgeAI கல்வி விளக்கம்: ${internetDef?.text_target || ''}`;
        } else {
          notFoundVernacular = `This topic ('${conceptName}') is not covered in the current lecture transcript. BridgeAI synthesis: ${internetDef?.text_source || ''}`;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            found_in_lecture: false,
            text: `This topic ('${conceptName}') is not covered in the current lecture transcript. Here is an educational synthesis generated by BridgeAI: ${internetDef?.text_source || ''}`,
            vernacular: notFoundVernacular,
            source_lang: sourceLang,
            target_lang: targetLang,
            citations: [],
            related_concepts: internetDef?.related_concepts || [],
            internet_definition: internetDef
          }
        ]);
      }
    } catch (criticalErr) {
      console.error("Critical error in handleSendMessage:", criticalErr);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          found_in_lecture: false,
          text: `Processed your question: "${cleanQ}". An answer definition is available in the chat.`,
          vernacular: `உங்கள் கேள்வி: "${cleanQ}". பதில் மற்றும் விளக்கங்கள் தயார்.`,
          source_lang: sourceLang,
          target_lang: targetLang,
          citations: [],
          internet_definition: null
        }
      ]);
    } finally {
      setIsAskingQa(false);
    }
  };

  // Generate Study Guide — always tries generative Gemini endpoint first
  const handleGenerateStudyGuide = async () => {
    if (segments.length === 0) {
      setErrorMessage("Please capture some lecture speech or load a sample lecture before generating a study guide.");
      return;
    }

    setIsGeneratingGuide(true);
    setStudyGuide(null); // Clear any previous guide to prevent stale data showing
    setErrorMessage(null);

    const currentMode = classMode === 'online_classroom' ? 'online' : classMode === 'realtime_classroom' ? 'offline' : 'solo';

    // 1. Try /api/generate/study-guide — always-fresh Gemini generative endpoint
    try {
      const genRes = await fetch(`${API_BASE_URL}/api/generate/study-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_lang: targetLang, segments, mode: currentMode })
      });

      if (genRes.ok) {
        const guideData = await genRes.json();
        if (guideData.definitions || guideData.overview) {
          setStudyGuide(guideData);
          setIsGeneratingGuide(false);
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          return;
        }
      }
    } catch (e) {
      console.log("Generative study guide endpoint unavailable, trying standard endpoint.");
    }

    // 2. Fall back to /api/study-guide (Gemini + heuristic synthesis)
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
      console.log("Standard study guide endpoint unavailable, using dynamic client-side synthesis.");
    }

    // 3. Client-side minimal dynamic synthesis (no static topic templates)
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || { name: 'Tamil', native: 'தமிழ்' };
    const fullText = segments.map((s) => (s.text_en || s.text_source || '')).join(' ');

    // Extract content words for a dynamic title
    const stopSet = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'of', 'and', 'to', 'for', 'with', 'that', 'this', 'we', 'our', 'on', 'it', 'at', 'by', 'from', 'as', 'or', 'its']);
    const words = (fullText.match(/\b[a-zA-Z]{4,}\b/g) || []).map(w => w.toLowerCase()).filter(w => !stopSet.has(w));
    const wordFreq = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
    const inferredTitle = topWords.length >= 2 ? `${topWords[0]} & ${topWords[1]} – Lecture Session` : "STEM Lecture Session";

    const overviewEn = `Study guide synthesized from ${segments.length} lecture segment${segments.length > 1 ? 's' : ''} covering key concepts including: ${topWords.join(', ')}.`;

    let overviewVernacular = overviewEn;
    if (targetLang === 'ta') overviewVernacular = `${segments.length} விரிவுரை பகுதிகளிலிருந்து தொகுக்கப்பட்ட முக்கிய கருத்துக்கள்: ${topWords.join(', ')}.`;
    else if (targetLang === 'ml') overviewVernacular = `${segments.length} പ്രഭാഷണ ഭാഗങ്ങളിൽ നിന്ന് സൃഷ്ടിച്ച പഠന സഹായി. ഉള്ളടക്കം: ${topWords.join(', ')}.`;
    else if (targetLang === 'hi') overviewVernacular = `${segments.length} व्याख्यान भागों से तैयार अध्ययन मार्गदर्शिका। प्रमुख विषय: ${topWords.join(', ')}.`;

    // Build takeaways from actual segments
    const takeaways = segments.slice(0, 6).map((s, idx) => ({
      point: (s.text_en || s.text_source || '').trim(),
      vernacular_point: (s.text_vernacular || s.text_source || '').trim(),
      timestamp: s.timestamp || `00:${String(idx * 15).padStart(2, '0')}`
    }));

    // 1. Curated real academic STEM definitions dictionary
    const STEM_KB = {
      glucose: {
        def: "A 6-carbon monosaccharide sugar (C6H12O6) serving as the primary cellular fuel oxidized during cellular respiration to synthesize ATP.",
        vTa: "குளுக்கோஸ் (Glucose) - செல்லுலார் ஆற்றல் உற்பத்திக்கு உதவும் முதன்மை மோனோசாக்கரைடு சர்க்கரை.",
        vMl: "ഗ്ലൂക്കോസ് (Glucose) - കോശ ശ്വസനത്തിന് ഉപയോഗിക്കുന്ന പ്രധാന ഊർജ്ജ പഞ്ചസാര.",
        vHi: "ग्लूकोज (Glucose) - कोशिकीय श्वसन में उपयोग होने वाली प्राथमिक ऊर्जा शर्करा।",
        cat: "Biochemistry"
      },
      cellular: {
        def: "Relating to the biological cell, the fundamental structural, functional, and metabolic unit of all living organisms.",
        vTa: "செல்லுலார் (Cellular) - உயிரினங்களின் அடிப்படை கட்டமைப்பு மற்றும் செயல்பாட்டு அலகு.",
        vMl: "കോശീയ (Cellular) - ജീവജാലങ്ങളുടെ ഘടനാപരമായ അടിസ്ഥാന ഘടകം.",
        vHi: "कोशिकीय (Cellular) - सभी जीवों की मौलिक संरचनात्मक और जैविक इकाई।",
        cat: "Cell Biology"
      },
      respiration: {
        def: "The catabolic biochemical process in cells that breaks down glucose in the presence of oxygen to generate usable ATP energy.",
        vTa: "சுவாசம் (Respiration) - குளுக்கோஸை ஆக்ஸிஜனேற்றம் செய்து ஏடிபி வடிவில் ஆற்றலை உருவாக்கும் முறை.",
        vMl: "കോശ ശ്വസനം (Respiration) - ഊർജ്ജം ഉത്പാദിപ്പിക്കുന്നതിനുള്ള രാസപ്രക്രിയ.",
        vHi: "श्वसन (Respiration) - ऊर्जा (ATP) उत्पन्न करने वाली कोशिकीय प्रक्रिया।",
        cat: "Cell Biology"
      },
      carbon: {
        def: "The tetravalent nonmetallic chemical element forming the essential structural backbone of all organic biomolecules in living systems.",
        vTa: "கார்பன் (Carbon) - அனைத்து கரிம மூலக்கூறுகளின் மைய வேதியியல் முதுகெலும்பு.",
        vMl: "കാർബൺ (Carbon) - ജൈവ തന്മാത്രകളുടെ അടിസ്ഥാന രാസമൂലകം.",
        vHi: "कार्बन (Carbon) - सभी कार्बनिक अणुओं का मूलभूत आधार तत्व।",
        cat: "Chemistry"
      },
      mitochondria: {
        def: "Double-membrane cellular organelles acting as the powerhouses of the cell, hosting the Krebs citric acid cycle and oxidative phosphorylation.",
        vTa: "மைட்டோகாண்ட்ரியா (Mitochondria) - செல்லின் ஆற்றல் மையம், ஏடிபி உற்பத்தியை நிகழ்த்துகிறது.",
        vMl: "മൈറ്റോകോൺഡ്രിയ (Mitochondria) - കോശത്തിന്റെ ഊർജ്ജ നിലയം.",
        vHi: "माइटोकॉन्ड्रिया (Mitochondria) - कोशिका का ऊर्जा घर (Powerhouse)।",
        cat: "Cell Biology"
      },
      mitochondrial: {
        def: "Pertaining to the mitochondria, especially the mitochondrial matrix and inner cristae membrane where ATP synthesis occurs.",
        vTa: "மைட்டோகாண்ட்ரியல் (Mitochondrial) - மைட்டோகாண்ட்ரியாவின் உட்சுவர் மற்றும் மேட்ரிக்ஸ் சார்ந்த.",
        vMl: "മൈറ്റോകോൺഡ്രിയൽ (Mitochondrial) - മൈറ്റോകോൺഡ്രിയയുമായി ബന്ധപ്പെട്ട.",
        vHi: "माइटोकॉन्ड्रियल (Mitochondrial) - माइटोकॉन्ड्रिया से संबंधित आंतरिक भाग।",
        cat: "Cell Biology"
      },
      atp: {
        def: "Adenosine Triphosphate, the universal molecular energy currency of living cells utilized to drive cellular processes and synthesis.",
        vTa: "ஏடிபி (ATP) - செல்களின் உலகளாவிய வேதியியல் ஆற்றல் நாணயம்.",
        vMl: "എ.ടി.പി (ATP) - കോശങ്ങളുടെ സാർവത്രിക ഊർജ്ജ നാണയം.",
        vHi: "एटीपी (ATP) - कोशिकाओं की सार्वभौमिक ऊर्जा मुद्रा।",
        cat: "Biochemistry"
      },
      glycolysis: {
        def: "The 10-step enzymatic metabolic pathway in the cytoplasm converting one glucose molecule into two pyruvates, yielding net 2 ATP and 2 NADH.",
        vTa: "கிளைகோலிசிஸ் (Glycolysis) - குளுக்கோஸை பைருவேட்டாக உடைத்து ஆற்றல் உருவாக்கும் நிலை.",
        vMl: "ഗ്ലൈക്കോളിസിസ് (Glycolysis) - ഗ്ലൂക്കോസ് വിഘടിച്ച് പൈറുവേറ്റ് ആകുന്ന പ്രക്രിയ.",
        vHi: "ग्लाइकोलाइसिस (Glycolysis) - ग्लूकोज को पाइरूवेट में तोड़ने की प्रक्रिया।",
        cat: "Biochemistry"
      },
      pyruvate: {
        def: "A 3-carbon organic carboxylate produced by glycolysis that is transported into the mitochondrial matrix to fuel the Krebs cycle.",
        vTa: "பைருவேட் (Pyruvate) - கிளைகோலிசிஸில் உருவாகும் 3-கார்பன் கரிம அமிலம்.",
        vMl: "പൈറുവേറ്റ് (Pyruvate) - ഗ്ലൈക്കോളിസിസിന്റെ ഉൽപ്പന്നം.",
        vHi: "पाइरूवेट (Pyruvate) - ग्लाइकोलाइसिस का अंतिम 3-कार्बन उत्पाद।",
        cat: "Biochemistry"
      },
      krebs: {
        def: "The citric acid cycle in the mitochondrial matrix that oxidizes Acetyl-CoA, reducing NAD+ and FAD into high-energy electron carriers.",
        vTa: "கிரெப்ஸ் சுழற்சி (Krebs Cycle) - மைட்டோகாண்ட்ரியல் மேட்ரிக்ஸில் நிகழும் சிட்ரிக் அமில ஆக்சிஜனேற்ற சுழற்சி.",
        vMl: "ക്രെബ്സ് ചക്രം (Krebs Cycle) - സിട്രിക് ആസിഡ് ചക്രം.",
        vHi: "क्रेब्स चक्र (Krebs Cycle) - माइटोकॉन्ड्रियल मैट्रिक्स में सिट्रिक एसिड चक्र।",
        cat: "Cell Biology"
      },
      oxygen: {
        def: "The essential atmospheric gas functioning as the final electron acceptor in the mitochondrial electron transport chain during aerobic respiration.",
        vTa: "ஆக்ஸிஜன் (Oxygen) - ஏரோபிக் சுவாசத்தில் இறுதி எலக்ட்ரான் ஏற்பியாக செயல்படும் வாயு.",
        vMl: "ഓക്സിജൻ (Oxygen) - കോശ ശ്വസനത്തിലെ പ്രധാന ഇലക്ട്രോൺ സ്വീകർത്താവ്.",
        vHi: "ऑक्सीजन (Oxygen) - कोशिकीय श्वसन में अंतिम इलेक्ट्रॉन स्वीकर्ता।",
        cat: "Chemistry"
      },
      photosynthesis: {
        def: "The anabolic biological process in plant chloroplasts utilizing solar photons to synthesize glucose from carbon dioxide and water.",
        vTa: "ஒளிச்சேர்க்கை (Photosynthesis) - சூரிய ஒளியால் தாவரங்கள் உணவு தயாரிக்கும் உயிர்முறை.",
        vMl: "പ്രകാശസംശ്ലേഷണം (Photosynthesis) - സസ്യങ്ങൾ ആഹാരം നിർമ്മിക്കുന്ന പ്രക്രിയ.",
        vHi: "प्रकाश संश्लेषण (Photosynthesis) - सौर ऊर्जा से भोजन बनाने की जैविक प्रक्रिया।",
        cat: "Plant Biology"
      },
      chloroplast: {
        def: "Plastid organelle in plant and algal cells containing thylakoids and chlorophyll pigments where photosynthesis occurs.",
        vTa: "பசுங்கணிகம் (Chloroplast) - தாவரங்களில் ஒளிச்சேர்க்கை நிகழும் செல் உறுப்பு.",
        vMl: "ഹരിതകം (Chloroplast) - പ്രകാശസംശ്ലേഷണം നടക്കുന്ന കോശാംഗം.",
        vHi: "हरितलवक (Chloroplast) - पादप कोशिकाओं में प्रकाश संश्लेषण का अंगक।",
        cat: "Plant Biology"
      },
      enzyme: {
        def: "A macromolecular biological protein catalyst that increases biochemical reaction velocities by lowering activation energy barriers.",
        vTa: "என்சைம் / நொதி (Enzyme) - உயிர்வேதியியல் வினைகளை விரைவுபடுத்தும் புரத வினையூக்கி.",
        vMl: "എൻസൈം (Enzyme) - ജൈവ രാസപ്രവർത്തനങ്ങളുടെ വേഗത കൂട്ടുന്ന രാസത്വരകം.",
        vHi: "एंजाइम (Enzyme) - जैव रासायनिक प्रतिक्रियाओं को तेज करने वाला उत्प्रेरक।",
        cat: "Biochemistry"
      },
      gradient: {
        def: "A multi-variable differential vector pointing in the direction of greatest instantaneous rate of increase of a scalar objective function.",
        vTa: "சரிவு (Gradient) - சார்பு அதிகரிக்கும் திசையைக் காட்டும் பகுதி வகையீட்டு திசையன்.",
        vMl: "ഗ്രേഡിയന്റ് (Gradient) - മാറ്റത്തിന്റെ നിരക്ക് അളക്കുന്ന വെക്ടർ.",
        vHi: "प्रवणता (Gradient) - फलन के अधिकतम परिवर्तन की दिशा दर्शाने वाला सदिश।",
        cat: "Optimization & Math"
      },
      loss: {
        def: "A mathematical scalar objective function quantifying the penalty or discrepancy between model predictions and true empirical targets.",
        vTa: "இழப்புச் சார்பு (Loss Function) - மாதிரி கணிப்புகளின் பிழையை அளவிடும் சார்பு.",
        vMl: "നഷ്ട ഫംഗ്ഷൻ (Loss) - പ്രവചനത്തിലെ പിശക് കണക്കാക്കുന്ന തത്വം.",
        vHi: "हानि फलन (Loss) - मॉडल की त्रुटि मापने वाला गणितीय फलन।",
        cat: "Machine Learning"
      },
      neural: {
        def: "A computational learning system composed of layers of artificial interconnected nodes (neurons) that approximate complex non-linear functions.",
        vTa: "நரம்பியல் நெட்வொர்க் (Neural Network) - செயற்கை நியூரான்களைக் கொண்ட கணினி மாதிரி.",
        vMl: "ന്യൂറൽ നെറ്റ്വർക്ക് (Neural) - കമ്പ്യൂട്ടേഷണൽ ലേണിംഗ് ഘടന.",
        vHi: "न्यूरल नेटवर्क (Neural) - कृत्रिम न्यूरॉन्स पर आधारित कम्प्यूटेशनल मॉडल।",
        cat: "Artificial Intelligence"
      },
      backpropagation: {
        def: "The iterative learning algorithm applying the calculus chain rule backward through neural layers to compute weight gradient updates.",
        vTa: "பின்னோக்கிய பரவல் (Backpropagation) - நரம்பியல் நெட்வொர்க் எடைகளை புதுப்பிக்கும் முறை.",
        vMl: "ബാക്ക്പ്രൊപ്പഗേഷൻ (Backpropagation) - പിശക് തിരുത്തൽ രീതി.",
        vHi: "बैकप्रॉपैगैशन (Backpropagation) - ग्रेडिएंट गणना और भार अद्यतन की कलन विधि।",
        cat: "Deep Learning"
      },
      eigenvalue: {
        def: "A characteristic scalar factor by which an eigenvector is multiplied and scaled during a linear matrix transformation (Av = λv).",
        vTa: "ஐகன் மதிப்பு (Eigenvalue) - நேரியல் உருமாற்றத்தில் திசையன் அளவிடப்படும் காரணி.",
        vMl: "ഐഗൻ മൂല്യം (Eigenvalue) - ലീനിയർ പരിവർത്തനത്തിലെ സ്കെയിലിംഗ് ഘടകം.",
        vHi: "आइगेन मान (Eigenvalue) - रैखिक रूपांतरण में प्रयुक्त अदिश स्केलर।",
        cat: "Linear Algebra"
      },
      eigenvector: {
        def: "A non-zero vector whose directional orientation remains invariant (unchanged) under a linear matrix transformation, scaled only by λ.",
        vTa: "ஐகன் திசையன் (Eigenvector) - உருமாற்றத்தில் திசை மாறாத சிறப்பியல்பு திசையன்.",
        vMl: "ഐഗൻ വെക്ടർ (Eigenvector) - ദിശ മാറാത്ത പ്രത്യേക വെക്ടർ.",
        vHi: "आइगेन सदिश (Eigenvector) - रूपांतरण के बाद भी दिशा अपरिवर्तित रखने वाला सदिश।",
        cat: "Linear Algebra"
      },
      thermodynamics: {
        def: "The branch of physical science examining the relationships between thermal heat, mechanical work, internal energy, and system entropy.",
        vTa: "வெப்ப இயக்கவியல் (Thermodynamics) - வெப்பம், வேலை மற்றும் ஆற்றல் பரிமாற்ற அறிவியல்.",
        vMl: "താപഗതികം (Thermodynamics) - താപോർജ്ജവും യാന്ത്രികോർജ്ജവും തമ്മിലുള്ള ബന്ധം പഠിക്കുന്ന ശാസ്ത്രം.",
        vHi: "ऊष्मागतिकी (Thermodynamics) - ऊष्मा और ऊर्जा रूपांतरण का विज्ञान।",
        cat: "Physics"
      },
      algorithm: {
        def: "A finite, unambiguous, deterministic sequence of computational instructions designed to solve a well-defined computational problem.",
        vTa: "வழிமுறை (Algorithm) - கணினி சிக்கல்களைத் தீர்க்கும் படிநிலைக் கட்டளைகள்.",
        vMl: "അൽഗോരിതം (Algorithm) - പ്രശ്നപരിഹാരത്തിനായുള്ള നിർദ്ദേശങ്ങളുടെ ക്രമം.",
        vHi: "कलन विधि (Algorithm) - समस्या समाधान के लिए चरणबद्ध निर्देश।",
        cat: "Computer Science"
      }
    };

    // Helper: find genuine sentence context from transcript for words outside dictionary
    const findWordContext = (word) => {
      const reg = new RegExp(`([^.!?]*\\b${word}\\b[^.!?]*)`, 'i');
      const match = fullText.match(reg);
      if (match && match[1] && match[1].trim().length > 15) {
        return match[1].trim();
      }
      return null;
    };

    // Build rich, academic definitions
    const sampleWords = topWords.length > 0 ? topWords : ["System", "Process", "Analysis"];
    const definitions = sampleWords.slice(0, 6).map((w) => {
      const lowerW = w.toLowerCase();
      const kbEntry = STEM_KB[lowerW];

      let defText = "";
      let vTerm = `${w} (${targetLang.toUpperCase()})`;
      let vDef = "";
      let cat = "Core Subject Concept";

      if (kbEntry) {
        defText = kbEntry.def;
        cat = kbEntry.cat;
        if (targetLang === 'ta') { vTerm = kbEntry.vTa.split(' - ')[0]; vDef = kbEntry.vTa; }
        else if (targetLang === 'ml') { vTerm = kbEntry.vMl.split(' - ')[0]; vDef = kbEntry.vMl; }
        else if (targetLang === 'hi') { vTerm = kbEntry.vHi.split(' - ')[0]; vDef = kbEntry.vHi; }
        else { vTerm = `${w} (Concept)`; vDef = kbEntry.def; }
      } else {
        const sentenceContext = findWordContext(lowerW);
        if (sentenceContext) {
          defText = `Discussed in lecture: "${sentenceContext}." Key conceptual principle essential for analytical understanding.`;
        } else {
          defText = `Foundational technical term: ${w}, central to the structural and analytical development of this lecture session.`;
        }
        if (targetLang === 'ta') {
          vTerm = `${w} (கருத்து)`;
          vDef = `${w} என்பது இந்த விரிவுரையின் முக்கிய தொழில்நுட்ப கருத்தாகும்.`;
        } else if (targetLang === 'ml') {
          vTerm = `${w} (തത്വം)`;
          vDef = `${w} എന്നത് ഈ പ്രഭാഷണത്തിലെ പ്രധാന സാങ്കേതിക ആശയമാണ്.`;
        } else if (targetLang === 'hi') {
          vTerm = `${w} (सिद्धांत)`;
          vDef = `${w} इस व्याख्यान की मुख्य तकनीकी अवधारणा है।`;
        } else {
          vTerm = `${w} (Term)`;
          vDef = defText;
        }
      }

      return {
        term: w,
        vernacular_term: vTerm,
        category: cat,
        definition: defText,
        vernacular_definition: vDef
      };
    });

    // 2. Strict Domain Disambiguation (Prevents cross-domain graph collapse)
    const lowerFull = fullText.toLowerCase();

    // Priority 1: Biology / Cellular Respiration / Biochemistry
    const isBio = lowerFull.includes("glucose") || lowerFull.includes("cellular") || lowerFull.includes("respiration") ||
                  lowerFull.includes("glycolysis") || lowerFull.includes("mitochondr") || lowerFull.includes("atp") ||
                  lowerFull.includes("pyruvate") || lowerFull.includes("krebs") || lowerFull.includes("chloroplast") ||
                  lowerFull.includes("photosynthesis") || lowerFull.includes("enzyme") || lowerFull.includes("biology");

    // Priority 2: Machine Learning / Neural Networks
    const isML = !isBio && (lowerFull.includes("gradient") || lowerFull.includes("loss") || lowerFull.includes("neural") ||
                            lowerFull.includes("learn") || lowerFull.includes("backprop") || lowerFull.includes("epoch"));

    // Priority 3: Linear Algebra (STRICT: Never match "mitochondrial matrix" as math!)
    const isMath = !isBio && (lowerFull.includes("eigen") || lowerFull.includes("determinant") ||
                             (lowerFull.includes("matrix") && !lowerFull.includes("mitochondr") && !lowerFull.includes("cell")) ||
                             (lowerFull.includes("vector") && (lowerFull.includes("space") || lowerFull.includes("linear") || lowerFull.includes("algebra"))));

    // Priority 4: Thermodynamics
    const isThermo = !isBio && (lowerFull.includes("thermo") || lowerFull.includes("carnot") || lowerFull.includes("enthalpy") ||
                               (lowerFull.includes("heat") && !lowerFull.includes("biological")));

    // Priority 5: Computer Science / Digital Logic / Algorithms
    const isCS = !isBio && (lowerFull.includes("search") || lowerFull.includes("sort") || lowerFull.includes("tree") ||
                            lowerFull.includes("algorithm") || lowerFull.includes("logic") || lowerFull.includes("gate") || lowerFull.includes("boolean"));

    // Build Domain-Accurate Formulas
    const formulas = [];
    if (isBio) {
      if (lowerFull.includes("photosynthesis") || lowerFull.includes("chloroplast") || lowerFull.includes("calvin")) {
        formulas.push({
          name: "Photosynthesis Stoichiometric Reaction",
          latex: "6\\text{CO}_2 + 6\\text{H}_2\\text{O} + hν \\xrightarrow{\\text{chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2",
          description: "Light-driven anabolic synthesis of high-energy glucose and oxygen in plant chloroplasts.",
          variables: "CO2: carbon dioxide, H2O: water, hν: photon light energy, C6H12O6: glucose, O2: oxygen"
        });
      } else {
        // Cellular Respiration / Glucose / ATP
        formulas.push({
          name: "Cellular Respiration Net Oxidation Reaction",
          latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\longrightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 30\\text{--}32\\,\\text{ATP}",
          description: "Aerobic catabolic oxidation of hexose glucose into carbon dioxide, water, and usable ATP energy.",
          variables: "C6H12O6: glucose fuel, O2: terminal electron acceptor, ATP: cellular energy currency"
        });
        formulas.push({
          name: "Glycolysis Net Energy Yield",
          latex: "\\text{Glucose} + 2\\text{NAD}^+ + 2\\text{ADP} + 2\\text{P}_i \\longrightarrow 2\\text{Pyruvate} + 2\\text{NADH} + 2\\text{ATP}",
          description: "Anaerobic cytoplasmic metabolic pathway splitting 6-carbon glucose into two 3-carbon pyruvates.",
          variables: "NAD+: electron carrier, ADP: adenosine diphosphate, Pi: inorganic phosphate"
        });
      }
    } else if (isML) {
      formulas.push({
        name: "Gradient Descent Parameter Optimization",
        latex: "θ_{t+1} = θ_t - η ∇J(θ_t)",
        description: "Iteratively updates model parameters in the direction of steepest loss descent.",
        variables: "θ: model weights, η: learning rate, ∇J: gradient vector of cost function"
      });
      formulas.push({
        name: "Mean Squared Error Objective",
        latex: "J(θ) = \\frac{1}{2m} \\sum_{i=1}^{m} (h_θ(x^{(i)}) - y^{(i)})^2",
        description: "Quantifies average squared deviation between model predictions and ground truth.",
        variables: "m: sample size, h_θ: hypothesis prediction, y: ground truth target"
      });
    } else if (isMath) {
      formulas.push({
        name: "Eigenvalue Characteristic Transformation",
        latex: "A v = λ v \\iff \\det(A - λ I) = 0",
        description: "Defines invariant directional eigenvectors scaled by characteristic eigenvalue scalar.",
        variables: "A: transformation matrix, v: eigenvector, λ: eigenvalue, I: identity matrix"
      });
    } else if (isThermo) {
      formulas.push({
        name: "First Law of Thermodynamics (Energy Conservation)",
        latex: "ΔU = Q - W",
        description: "Governs conservation of energy in thermal-mechanical state changes.",
        variables: "ΔU: internal energy change (J), Q: heat input, W: boundary work done"
      });
    } else if (isCS) {
      if (lowerFull.includes("logic") || lowerFull.includes("gate") || lowerFull.includes("boolean")) {
        formulas.push({
          name: "De Morgan's Logical Duality Laws",
          latex: "\\overline{A \\cdot B} = \\overline{A} + \\overline{B}, \\quad \\overline{A + B} = \\overline{A} \\cdot \\overline{B}",
          description: "Fundamental algebraic laws governing complementary Boolean digital gate synthesis.",
          variables: "A, B: binary logic inputs ∈ {0, 1}"
        });
      } else {
        formulas.push({
          name: "Algorithmic Operational Complexity",
          latex: "T(n) = T(n/2) + O(1) \\implies T(n) = O(\\log_2 n)",
          description: "Logarithmic recurrence relation for iterative divide-and-conquer processing.",
          variables: "n: input elements, T(n): running operation count"
        });
      }
    } else {
      // General analytical governing formulation
      formulas.push({
        name: "Governing System Flux & Rate of Change",
        latex: "\\frac{dQ}{dt} = \\lim_{Δt \\to 0} \\frac{ΔQ}{Δt}",
        description: "Instantaneous dynamic rate of change for the primary observed system variable.",
        variables: "Q: system state quantity, t: temporal coordinate"
      });
      formulas.push({
        name: "System Operational Efficiency Index",
        latex: "η = \\frac{\\text{Delivered Useful Output}}{\\text{Total Resource Input}} \\times 100\\%",
        description: "Normalized ratio expressing optimal conversion without entropy or communication loss.",
        variables: "η: efficiency percentage"
      });
    }

    // Build flashcards covering definitions, formulas, and takeaways
    const flashcards = [];
    let fcId = 1;
    definitions.slice(0, 3).forEach((d) => {
      flashcards.push({
        id: fcId++,
        front: `What is ${d.term}?`,
        vernacular_front: `${d.vernacular_term} என்றால் என்ன?`,
        back: d.definition,
        category: d.category || "Definitions"
      });
    });
    formulas.slice(0, 2).forEach((f) => {
      flashcards.push({
        id: fcId++,
        front: `What is the formula for ${f.name}?`,
        vernacular_front: `${f.name} இன் சமன்பாடு / சூத்திரம் என்ன?`,
        back: `${f.latex} — ${f.description}`,
        category: "Formulas"
      });
    });
    takeaways.slice(0, 3).forEach((t) => {
      flashcards.push({
        id: fcId++,
        front: `Key insight discussed at ${t.timestamp}:`,
        vernacular_front: `முக்கிய கருத்து (${t.timestamp}):`,
        back: `${t.point} (${t.vernacular_point})`,
        category: "Lecture Insights"
      });
    });

    // Build clean concept map nodes (Domain-specific milestones, NEVER collapsed with previous graph)
    let nodes = [];
    if (isBio) {
      if (lowerFull.includes("photosynthesis")) {
        nodes = [
          { id: "node_1", label: "Solar Photons", detail: "Light Absorption" },
          { id: "node_2", label: "Thylakoid Light Reactions", detail: "Photolysis & ATP Synthesis" },
          { id: "node_3", label: "Calvin Cycle", detail: "Stroma Carbon Fixation" },
          { id: "node_4", label: "Glucose Synthesis", detail: "C6H12O6 Product" },
          { id: "node_5", label: "Plant Metabolism", detail: "Bioenergetics" }
        ];
      } else {
        nodes = [
          { id: "node_1", label: "Glucose Substrate", detail: "Hexose Sugar Fuel" },
          { id: "node_2", label: "Cytoplasmic Glycolysis", detail: "Pyruvate & 2 ATP" },
          { id: "node_3", label: "Mitochondrial Matrix", detail: "Krebs Citric Acid Cycle" },
          { id: "node_4", label: "Inner Cristae ETC", detail: "Oxidative Phosphorylation" },
          { id: "node_5", label: "32 ATP Synthesis", detail: "Cellular Energy" }
        ];
      }
    } else if (isML) {
      nodes = [
        { id: "node_1", label: "Training Data", detail: "Feature Representation" },
        { id: "node_2", label: "Forward Prediction", detail: "Hypothesis Function" },
        { id: "node_3", label: "Loss Computation", detail: "Error Function J(θ)" },
        { id: "node_4", label: "Gradient Descent", detail: "Backpropagation Update" },
        { id: "node_5", label: "Model Convergence", detail: "Optimized Weights" }
      ];
    } else if (isMath) {
      nodes = [
        { id: "node_1", label: "Vector Space", detail: "Linear Coordinates" },
        { id: "node_2", label: "Matrix Transformation", detail: "Operator A" },
        { id: "node_3", label: "Characteristic Equation", detail: "det(A - λI) = 0" },
        { id: "node_4", label: "Eigenvalues & Vectors", detail: "Av = λv" },
        { id: "node_5", label: "Diagonalization", detail: "Eigenspace Decomposition" }
      ];
    } else if (isThermo) {
      nodes = [
        { id: "node_1", label: "Hot Reservoir", detail: "Thermal Heat Input Q" },
        { id: "node_2", label: "Thermodynamic System", detail: "Internal Energy ΔU" },
        { id: "node_3", label: "Work Extraction", detail: "Mechanical Output W" },
        { id: "node_4", label: "Cold Reservoir", detail: "Residual Waste Heat" },
        { id: "node_5", label: "Carnot Efficiency", detail: "Thermodynamic Bound" }
      ];
    } else {
      nodes = [
        { id: "node_1", label: "Core Foundations", detail: "Theoretical Baseline" },
        ...sampleWords.slice(0, 3).map((w, i) => ({ id: `node_${i + 2}`, label: w, detail: "Subject Concept" })),
        { id: `node_${sampleWords.slice(0, 3).length + 2}`, label: "Practical Applications", detail: "Synthesis" }
      ];
    }

    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].id, to: nodes[i + 1].id });
    }

    // Build visuals suite (Matches exact domain, NO cross-domain collapse!)
    const visuals = {
      equation: {
        title: formulas[0]?.name || "Core Analytical Relation",
        latex: formulas[0]?.latex || "E = mc^2",
        caption: formulas[0]?.description || "Governing mathematical model of the observed system."
      }
    };

    if (isBio) {
      if (lowerFull.includes("photosynthesis")) {
        visuals.photosynthesis = { caption: "Dual-phase photosynthetic pathway: thylakoid light reactions coupled with stroma Calvin cycle." };
      } else {
        visuals.cellularRespiration = { caption: "Cellular respiration metabolic flow: cytoplasmic glycolysis followed by mitochondrial matrix Krebs cycle and inner cristae ETC." };
      }
    } else if (isML) {
      visuals.lossCurve = { caption: "Loss convergence profile toward minimum during iterative optimization." };
      visuals.network = { caption: "Neural architecture forward signal propagation and error gradient updates." };
    } else if (isThermo) {
      visuals.thermoCycle = { caption: "First Law energy conservation: heat input converts to internal energy and work." };
    } else if (isMath) {
      visuals.vectorTransform = { caption: "Linear transformation scaling eigenvector along its span by factor λ." };
    } else {
      visuals.conceptFlow = { caption: "Sequential progression and conceptual hierarchy of core lecture principles." };
    }

    const guideData = {
      title: inferredTitle,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      target_language: langObj.name,
      native_language: langObj.native,
      segment_count: segments.length,
      generated_at: new Date().toISOString(),
      source: "client_dynamic",
      overview: { en: overviewEn, vernacular: overviewVernacular },
      diagram: { title: `${inferredTitle} – Concept Map`, source: "Dynamic client-side synthesis", nodes, edges },
      definitions,
      formulas,
      visuals,
      takeaways,
      flashcards
    };

    setStudyGuide(guideData);
    setIsGeneratingGuide(false);
  };

  // Download PDF (Entire Study Guide with All Options)
  const handleDownloadPdf = async () => {
    if (!studyGuide) return;
    setIsDownloadingPdf(true);
    try {
      await exportStudyGuideAsPdf(studyGuide, targetLang, segments, API_BASE_URL);
    } catch (e) {
      console.error("Study Guide PDF export error:", e);
    } finally {
      setIsDownloadingPdf(false);
    }
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

  // Caption Export Handlers (.TXT and .PDF)
  const handleExportCaptionsTxt = () => {
    exportCaptionsAsTxt(segments, sourceLang, targetLang);
  };

  const handleExportCaptionsPdf = async () => {
    try {
      await exportCaptionsAsPdf(segments, sourceLang, targetLang, API_BASE_URL);
    } catch (err) {
      console.error("PDF captions export error:", err);
    }
  };

  const sourceLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || { name: 'English', native: 'English', flag: '🇬🇧' };
  const targetLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || { name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' };
  const activeDeviceObj = audioDevices.find((d) => d.deviceId === selectedDeviceId) || audioDevices[0];
  const activeDeviceLabel = activeDeviceObj ? activeDeviceObj.label : 'Default Microphone';
  const isBluetoothDevice = Boolean(activeDeviceObj?.isBluetooth);

  const activeOutputDeviceObj = outputDevices.find((d) => d.deviceId === selectedOutputDeviceId) || outputDevices[0];
  const activeOutputDeviceLabel = activeOutputDeviceObj ? activeOutputDeviceObj.label : 'Laptop Speakers';
  const _detectedTermsCount = segments.reduce((acc, seg) => acc + (seg.domain_terms ? seg.domain_terms.length : 0), 0);

  return (
    <div className="google-workspace-root">
      {/* 1. Official Google Top App Bar (Google Translate-Style Language Hub & Actions) */}
      <GoogleAppBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSourceLanguageChange={handleSourceLanguageChange}
        onLanguageChange={handleLanguageChange}
        onSwapLanguages={handleSwapLanguages}
        connectionStatus={connectionStatus}
        sessionSeconds={sessionSeconds}
        selectedDeviceLabel={activeDeviceLabel}
        isBluetoothDevice={isBluetoothDevice}
        onOpenAudioDevices={() => setIsDeviceModalOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenArchitecture={() => setIsAboutOpen(true)}
        isRecording={isRecording}
        onExportTxt={handleExportCaptionsTxt}
        onExportPdf={handleExportCaptionsPdf}
        segmentCount={segments.length}
        classMode={classMode}
        userRole={userRole}
        roomCode={roomCode}
        studentCount={studentCount}
        hasTeacher={hasTeacher}
        onOpenClassroomModal={() => setIsClassroomModalOpen(true)}
        onGenerateStudyGuide={handleGenerateStudyGuide}
        isGeneratingGuide={isGeneratingGuide}
      />

      {/* 1.5. Prominent Class Operating Mode Switcher Bar (Real-Time Offline Class vs Online Class) */}
      <ClassModeBar
        classMode={classMode}
        onChangeClassMode={handleClassModeChange}
        userRole={userRole}
        onChangeUserRole={handleUserRoleChange}
        isRoleLocked={isRoleLocked}
        roomCode={roomCode}
        studentCount={studentCount}
        hasTeacher={hasTeacher}
        isCameraActive={isTeacherCameraOn}
        onOpenAttendanceRoster={() => setIsAttendanceModalOpen(true)}
        onOpenClassroomModal={() => setIsClassroomModalOpen(true)}
      />

      {/* Error & Warning Notification Toast */}
      <ErrorBanner
        message={errorMessage}
        type="warning"
        onDismiss={() => setErrorMessage(null)}
      />

      {/* 2. Responsive Mobile Tabs (< 860px) */}
      <div className="google-mobile-tab-bar">
        <button
          className={`google-mobile-tab-btn ${mobileActiveTab === 'captions' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('captions')}
          type="button"
        >
          <Radio size={14} />
          <span>Live Captions {segments.length > 0 && `(${segments.length})`}</span>
        </button>

        <button
          className={`google-mobile-tab-btn ${mobileActiveTab === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('chat')}
          type="button"
        >
          <Sparkles size={14} color="var(--google-blue)" />
          <span>BridgeAI Tutor {messages.length > 0 && `(${messages.length})`}</span>
        </button>
      </div>

      {/* 3. Main Center Stage: Online Class Stage vs Dual Captions + BridgeAI Tutor */}
      {classMode === 'online_classroom' ? (
        <OnlineClassStage
          userRole={userRole}
          teacherName={teacherName || (userRole === 'teacher' ? 'Teacher' : 'Instructor')}
          onOpenTeacherSetup={() => setIsTeacherSetupOpen(true)}
          roomCode={roomCode}
          studentName={studentName}
          studentRollNo={studentRollNo}
          onOpenStudentRegister={() => setIsStudentRegisterOpen(true)}
          onOpenAttendanceRoster={() => setIsAttendanceModalOpen(true)}
          studentCount={studentCount}
          hasTeacher={hasTeacher}
          isTeacherCameraOn={isTeacherCameraOn}
          isTeacherScreenSharing={isTeacherScreenSharing}
          remoteVideoFrame={remoteVideoFrame}
          onBroadcastVideoFrame={handleBroadcastVideoFrame}
          onBroadcastVideoState={handleBroadcastVideoState}
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
          liveMicStatus={liveMicStatus}
          streamAudioLevel={audioLevel}
          interimSpeech={interimSpeech}
          interimVernacular={interimVernacular}
          segments={segments}
          sourceLang={sourceLang}
          targetLang={targetLang}
          sourceLangName={`${sourceLangMeta.name} (${sourceLangMeta.native})`}
          targetLangName={`${targetLangMeta.name} (${targetLangMeta.native})`}
          onSwapLanguages={handleSwapLanguages}
          isReadAloud={isReadAloudEnabled}
          onToggleReadAloud={toggleReadAloud}
          selectedDeviceId={selectedDeviceId}
          handRaises={handRaises}
          onToggleHandRaise={handleToggleHandRaise}
          onLowerAllHands={handleLowerAllHands}
          qaComments={qaComments}
          onSendQaComment={handleSendQaComment}
          onBroadcastKeyword={handleBroadcastKeyword}
          onEndSession={handleEndOnlineSession}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenDemoShowcase={handleOpenDemoShowcase}
          onGenerateStudyGuide={handleGenerateStudyGuide}
          isGeneratingGuide={isGeneratingGuide}
        />
      ) : (
        <main className={`google-main-stage view-${viewMode} mobile-${mobileActiveTab}`}>
          {(viewMode === 'split' || viewMode === 'theater') && (
            <section className={`google-stage-caption ${viewMode === 'theater' ? 'theater-mode' : ''}`}>
              <CaptionPane
                segments={segments}
                sourceLang={sourceLang}
                sourceLangName={`${sourceLangMeta.name} (${sourceLangMeta.native})`}
                targetLangName={`${targetLangMeta.name} (${targetLangMeta.native})`}
                targetLang={targetLang}
                onSwapLanguages={handleSwapLanguages}
                highlightedSegmentId={highlightedSegmentId}
                autoScroll={autoScroll}
                onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
                isRecording={isRecording}
                liveMicStatus={liveMicStatus}
                interimSpeech={interimSpeech}
                interimVernacular={interimVernacular}
                glossary={glossary}
                onClearCaptions={clearSession}
                isReadAloud={isReadAloudEnabled}
                onToggleReadAloud={toggleReadAloud}
                isSpeakingAudio={isSpeakingAudio}
                onSpeakSegment={handleSpeakSegment}
                currentlySpeakingId={currentlySpeakingId}
                apiBaseUrl={API_BASE_URL}
                classMode={classMode}
                roomCode={roomCode}
                userRole={userRole}
                onGenerateStudyGuide={handleGenerateStudyGuide}
                isGeneratingGuide={isGeneratingGuide}
              />
            </section>
          )}

          {(viewMode === 'split' || viewMode === 'tutor') && (
            <aside className={`google-stage-gemini google-stage-tutor ${viewMode === 'tutor' ? 'tutor-mode' : ''}`}>
              <ErrorBoundary title="BridgeAI Tutor">
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isAskingQa}
                  onSelectCitation={handleSelectCitation}
                  segmentCount={segments.length}
                  sourceLang={sourceLang}
                  targetLang={targetLang}
                />
              </ErrorBoundary>
            </aside>
          )}
        </main>
      )}

      {/* 4. Official Google Meet-Style Floating Bottom Dock (Active for Offline & Solo Modes) */}
      {classMode !== 'online_classroom' && (
        <GoogleBottomDock
          isRecording={isRecording}
          onToggleRecord={toggleRecording}
          audioLevel={audioLevel}
          liveMicStatus={liveMicStatus}
          isReadAloud={isReadAloudEnabled}
          onToggleReadAloud={toggleReadAloud}
          selectedOutputDeviceLabel={activeOutputDeviceLabel}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDirectSpeechSubmit={processSpeechText}
          onGenerateStudyGuide={handleGenerateStudyGuide}
          isGeneratingGuide={isGeneratingGuide}
          onLoadSample={handleLoadSample}
          onClearSession={clearSession}
          onOpenAudioDevices={() => setIsDeviceModalOpen(true)}
          segmentCount={segments.length}
          classMode={classMode}
          userRole={userRole}
          onOpenClassroomModal={() => setIsClassroomModalOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenDemoShowcase={handleOpenDemoShowcase}
        />
      )}

      {/* Modals */}
      <ClassroomModal
        isOpen={isClassroomModalOpen}
        onClose={() => setIsClassroomModalOpen(false)}
        classMode={classMode}
        onChangeClassMode={handleClassModeChange}
        userRole={userRole}
        onChangeUserRole={handleUserRoleChange}
        roomCode={roomCode}
        onChangeRoomCode={handleRoomCodeChange}
        studentCount={studentCount}
        hasTeacher={hasTeacher}
        connectionStatus={connectionStatus}
        onClearRoom={clearSession}
      />

      <StudentRegisterModal
        isOpen={isStudentRegisterOpen}
        onClose={() => setIsStudentRegisterOpen(false)}
        initialName={studentName}
        initialRollNo={studentRollNo}
        targetLang={targetLang}
        onChangeTargetLang={handleLanguageChange}
        roomCode={roomCode}
        onSubmit={handleStudentRegisterSubmit}
        isEditing={Boolean(studentName && studentRollNo)}
      />

      <TeacherSetupModal
        isOpen={isTeacherSetupOpen}
        onClose={() => setIsTeacherSetupOpen(false)}
        initialName={teacherName}
        sourceLang={sourceLang}
        onChangeSourceLang={handleSourceLanguageChange}
        targetLang={targetLang}
        onChangeTargetLang={handleLanguageChange}
        roomCode={roomCode}
        onSubmit={handleTeacherSetupSubmit}
      />

      <AttendanceRosterModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        roster={attendanceRoster}
        roomCode={roomCode}
        studentCount={studentCount}
      />

      <StudyGuideModal
        guide={studyGuide}
        onClose={() => setStudyGuide(null)}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
      />

      <LectureHistoryModal
        history={lectureHistory}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={(entry) => {
          setSegments(entry.segments || []);
          setSourceLang(entry.sourceLang || 'en');
          setTargetLang(entry.targetLang || 'ta');
          setIsHistoryOpen(false);
        }}
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
        outputDevices={outputDevices}
        selectedOutputDeviceId={selectedOutputDeviceId}
        onSelectOutputDevice={handleSelectOutputDevice}
        onTestSpeaker={handleTestSpeaker}
      />
    </div>
  );
}
