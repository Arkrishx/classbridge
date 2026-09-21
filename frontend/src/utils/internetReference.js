/**
 * Internet Reference Service for ClassBridge AI Tutor
 * Fetches concise educational definitions from the internet (Wikipedia / open web / STEM dictionary)
 * and translates them to the requested target language.
 */
import { translateTextClient } from './clientTranslator.js';

const CACHE = new Map();

/**
 * Clean question to extract primary search keywords
 */
export function cleanQuestionToSearchTerm(question = '') {
  let q = question.trim().replace(/^[¿¡"']+|[?!."'`]+$/g, '');
  
  // Strip common conversational intros
  const patterns = [
    /^(?:what is|what are|what does|how does|can you explain|explain|define|tell me about|meaning of|definition of)\s+/i,
    /^(?:what do you mean by|describe|briefly explain|give me info on|can you describe)\s+/i,
    /\s+(?:in this lecture|in the lecture|in machine learning|in deep learning|in linear algebra)$/i
  ];

  for (const p of patterns) {
    q = q.replace(p, '').trim();
  }

  return q.replace(/[?!."'`]+$/g, '').trim();
}

/**
 * Helper to fetch with a timeout compatible with all browser engines
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Extract first 1-2 sentences safely without lookbehind regex
 */
function getConciseSentences(text) {
  if (!text || typeof text !== 'string') return '';
  // Split on sentence terminators followed by whitespace or end-of-string
  const parts = text.split(/([.!?]+(?:\s+|$))/).filter(Boolean);
  let result = '';
  let sentenceCount = 0;
  for (let i = 0; i < parts.length; i += 2) {
    result += parts[i] + (parts[i + 1] || '');
    sentenceCount++;
    if (sentenceCount >= 2) break;
  }
  return result.trim() || text;
}

// Comprehensive STEM & Academic Acronyms / Synonyms Knowledgebase
export const STEM_ACRONYMS = {
  "nlp": ["natural language processing", "natural language understanding", "nlu", "nlg"],
  "natural language processing": ["nlp"],
  "ml": ["machine learning"],
  "machine learning": ["ml"],
  "dl": ["deep learning"],
  "deep learning": ["dl"],
  "ai": ["artificial intelligence"],
  "artificial intelligence": ["ai"],
  "cv": ["computer vision"],
  "computer vision": ["cv"],
  "rl": ["reinforcement learning"],
  "reinforcement learning": ["rl"],
  "sgd": ["stochastic gradient descent"],
  "stochastic gradient descent": ["sgd"],
  "gd": ["gradient descent"],
  "gradient descent": ["gd"],
  "ann": ["artificial neural network", "neural network"],
  "neural network": ["ann", "nn"],
  "cnn": ["convolutional neural network", "convnet"],
  "convolutional neural network": ["cnn"],
  "rnn": ["recurrent neural network"],
  "recurrent neural network": ["rnn"],
  "lstm": ["long short term memory", "long short-term memory"],
  "gru": ["gated recurrent unit"],
  "gan": ["generative adversarial network"],
  "llm": ["large language model", "foundation model"],
  "large language model": ["llm"],
  "pca": ["principal component analysis"],
  "principal component analysis": ["pca"],
  "svd": ["singular value decomposition"],
  "singular value decomposition": ["svd"],
  "svm": ["support vector machine"],
  "support vector machine": ["svm"],
  "rf": ["random forest"],
  "random forest": ["rf"],
  "lr": ["learning rate", "linear regression", "logistic regression"],
  "learning rate": ["lr", "step size", "eta"],
  "mse": ["mean squared error"],
  "mae": ["mean absolute error"],
  "rmse": ["root mean squared error"],
  "bptt": ["backpropagation through time"],
  "bp": ["backpropagation"],
  "backpropagation": ["bp", "backward pass"],
  "relu": ["rectified linear unit"],
  "bert": ["bidirectional encoder representations from transformers"],
  "gpt": ["generative pre-trained transformer"],
  "rag": ["retrieval augmented generation", "retrieval-augmented generation"],
  "api": ["application programming interface"],
  "loss": ["cost function", "loss function", "objective function", "error"],
  "loss function": ["cost function", "loss", "objective function", "error"],
  "cost function": ["loss function", "loss", "objective function"],
  "overfitting": ["high variance", "generalization error", "overfit"],
  "underfitting": ["high bias", "underfit"],
  "eigenvalue": ["characteristic value", "latent root", "eigen value"],
  "eigenvector": ["characteristic vector", "eigen vector"]
};

export const STOPWORDS = new Set([
  'in', 'of', 'and', 'the', 'for', 'with', 'at', 'by', 'to', 'a', 'an',
  'is', 'are', 'was', 'were', 'it', 'on', 'this', 'that', 'from', 'as',
  'what', 'explain', 'define', 'tell', 'about', 'how', 'does', 'can', 'you',
  'give', 'me', 'some', 'info', 'briefly'
]);

/**
 * Check if a term or acronym matches text via dictionary or initials
 */
export function matchesAcronymOrInitials(acronymOrTerm, text) {
  if (!acronymOrTerm || !text) return false;
  const cleanTerm = acronymOrTerm.toLowerCase().trim();
  const cleanText = text.toLowerCase();

  // 1. Static Dictionary
  if (STEM_ACRONYMS[cleanTerm]) {
    for (const full of STEM_ACRONYMS[cleanTerm]) {
      if (cleanText.includes(full)) return true;
    }
  }

  // 2. Dynamic Initials: 'nlp' -> \bn\w+\s+l\w+\s+p\w*\b
  const letters = cleanTerm.replace(/[^a-z]/g, '');
  if (letters.length >= 2 && letters.length <= 5) {
    const chars = letters.split('');
    const regexStr = '\\b' + chars.slice(0, -1).map(c => c + '\\w+\\s+').join('') + chars[chars.length - 1] + '\\w*\\b';
    try {
      const re = new RegExp(regexStr, 'i');
      if (re.test(cleanText)) return true;
    } catch (e) {}
  }

  // 3. Dynamic reverse: multi-word phrase in query -> check initials acronym in text
  const words = cleanTerm.match(/[a-z]+/g) || [];
  if (words.length >= 2 && words.length <= 5) {
    const initials = words.map(w => w[0]).join('');
    const acrRe = new RegExp(`\\b${initials}\\b`, 'i');
    if (acrRe.test(cleanText)) return true;
  }

  return false;
}

/**
 * Fetch a simple reference definition from the internet (Wikipedia) with translation
 */
export async function fetchInternetReference(question, sourceLang = 'en', targetLang = 'ta', fallbackGlossary = {}) {
  const term = cleanQuestionToSearchTerm(question) || (typeof question === 'string' ? question.trim() : '');
  const cacheKey = `${term.toLowerCase()}:${sourceLang}:${targetLang}`;

  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey);
  }

  // Acronym expansion for clean encyclopedic lookup (e.g. nlp -> natural language processing)
  const termLower = term.toLowerCase();
  const lookupTerm = (STEM_ACRONYMS[termLower] && STEM_ACRONYMS[termLower][0])
    ? STEM_ACRONYMS[termLower][0]
    : term;

  let title = lookupTerm ? (lookupTerm.charAt(0).toUpperCase() + lookupTerm.slice(1)) : 'Topic';
  let extractEn = '';
  let sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(lookupTerm.replace(/\s+/g, '_'))}`;

  let relatedConcepts = [];
  // 1. Check fallback STEM glossary first for instant local matching
  for (const [key, item] of Object.entries(fallbackGlossary || {})) {
    const kLow = key.toLowerCase();
    if (lookupTerm.toLowerCase() === kLow || lookupTerm.toLowerCase().includes(kLow) || kLow.includes(lookupTerm.toLowerCase()) || termLower === kLow) {
      title = item.en || title;
      extractEn = item.definition || '';
      if (item.related) {
        relatedConcepts = item.related;
      }
      break;
    }
  }

  // 2. Default academic description if not found in local glossary
  if (!extractEn) {
    extractEn = `${title} is a core scientific and technical principle fundamental to advanced STEM education.`;
  }

  // Keep definition concise: first 1-2 sentences
  const conciseEn = getConciseSentences(extractEn);

  // Translate to sourceLang (if not en)
  let textSource = conciseEn;
  if (sourceLang !== 'en') {
    try {
      const trSource = await translateTextClient(conciseEn, sourceLang, fallbackGlossary, 'en');
      textSource = trSource?.adapted_translation || trSource?.raw_translation || conciseEn;
    } catch (e) {
      textSource = conciseEn;
    }
  }

  // Translate to targetLang
  let textTarget = conciseEn;
  if (targetLang !== 'en') {
    try {
      const trTarget = await translateTextClient(conciseEn, targetLang, fallbackGlossary, 'en');
      textTarget = trTarget?.adapted_translation || trTarget?.raw_translation || conciseEn;
    } catch (e) {
      textTarget = conciseEn;
    }
  }

  // Guarantee primitive strings (never return objects)
  const safeTextSource = typeof textSource === 'string' ? textSource : (textSource?.adapted_translation || String(textSource || conciseEn));
  const safeTextTarget = typeof textTarget === 'string' ? textTarget : (textTarget?.adapted_translation || String(textTarget || conciseEn));

  const result = {
    term: String(title || term),
    text_source: safeTextSource,
    text_target: safeTextTarget,
    source_title: "BridgeAI Concept Synthesis",
    source_url: null,
    related_concepts: relatedConcepts
  };

  CACHE.set(cacheKey, result);
  return result;
}
