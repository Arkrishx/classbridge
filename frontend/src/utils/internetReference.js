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

/**
 * Fetch a simple reference definition from the internet (Wikipedia) with translation
 */
export async function fetchInternetReference(question, sourceLang = 'en', targetLang = 'ta', fallbackGlossary = {}) {
  const term = cleanQuestionToSearchTerm(question) || (typeof question === 'string' ? question.trim() : '');
  const cacheKey = `${term.toLowerCase()}:${sourceLang}:${targetLang}`;

  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey);
  }

  let title = term ? (term.charAt(0).toUpperCase() + term.slice(1)) : 'Topic';
  let extractEn = '';
  let sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`;

  // 1. Check fallback STEM glossary first for instant local matching
  const termLower = term.toLowerCase();
  for (const [key, item] of Object.entries(fallbackGlossary || {})) {
    if (termLower === key.toLowerCase() || termLower.includes(key.toLowerCase()) || key.toLowerCase().includes(termLower)) {
      title = item.en || title;
      extractEn = item.definition || '';
      break;
    }
  }

  // 2. Query Wikipedia REST API for clean 1-2 sentence extract
  if (!extractEn) {
    try {
      const resp = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`, {
        headers: { 'Accept': 'application/json' }
      }, 3500);
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data.extract) {
          title = data.title || title;
          extractEn = data.extract;
          if (data.content_urls?.desktop?.page) {
            sourceUrl = data.content_urls.desktop.page;
          }
        }
      }
    } catch (err) {
      console.info("Wikipedia direct summary lookup skipped:", err);
    }
  }

  // 3. If direct page not found, try OpenSearch
  if (!extractEn) {
    try {
      const searchResp = await fetchWithTimeout(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=1&namespace=0&format=json&origin=*`,
        {},
        3500
      );
      if (searchResp && searchResp.ok) {
        const searchData = await searchResp.json();
        if (Array.isArray(searchData) && searchData[1] && searchData[1][0]) {
          const matchedTitle = searchData[1][0];
          const pageResp = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matchedTitle)}`, {}, 3500);
          if (pageResp && pageResp.ok) {
            const pageData = await pageResp.json();
            if (pageData.extract) {
              title = pageData.title || matchedTitle;
              extractEn = pageData.extract;
              if (pageData.content_urls?.desktop?.page) {
                sourceUrl = pageData.content_urls.desktop.page;
              }
            }
          }
        }
      }
    } catch (err) {
      console.info("Wikipedia opensearch lookup skipped:", err);
    }
  }

  // 4. Default fallback description if offline or no match
  if (!extractEn) {
    extractEn = `${title} is a core scientific and computational concept studied in technical curricula.`;
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
    source_title: "Wikipedia Reference",
    source_url: String(sourceUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`)
  };

  CACHE.set(cacheKey, result);
  return result;
}
