/**
 * Ultra-Fast Real-Time Translation & STEM Domain Adaptation Engine
 * Inspired by Maestra AI Live Voice Translation.
 * 
 * Tiers:
 * 1. Instant In-Memory Translation Cache (0ms)
 * 2. High-speed Google Translate Single API (gtx client, < 150ms)
 * 3. Backend /api/translate FastAPI endpoint (with AbortController)
 * 4. MyMemory API fallback
 * 5. Deterministic STEM Domain Glossary Adaptation
 */

const API_BASE_URL = typeof window !== 'undefined' && window.VITE_API_URL 
  ? window.VITE_API_URL 
  : (import.meta.env?.VITE_API_URL || 'http://localhost:8000');

// In-Memory Translation Cache for 0ms repeated / interim resolution
const translationCache = new Map();

export async function translateTextClient(text, targetLang = 'ta', glossary = {}) {
  if (!text || !text.trim()) {
    return {
      original: text,
      raw_translation: '',
      adapted_translation: '',
      domain_terms: []
    };
  }

  const cleanText = text.trim();
  const cacheKey = `${targetLang}:${cleanText.toLowerCase()}`;

  // 1. Check in-memory cache
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  let rawTranslation = '';

  // 2. Try Google Translate Single API (Ultra-fast, CORS-friendly)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900);

    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const gRes = await fetch(gUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (gRes.ok) {
      const gData = await gRes.json();
      if (Array.isArray(gData) && Array.isArray(gData[0])) {
        rawTranslation = gData[0].map((item) => item[0]).filter(Boolean).join(' ');
      }
    }
  } catch (err) {
    // Continue to next tier
  }

  // 3. Try Backend /api/translate endpoint if Google API didn't return
  if (!rawTranslation) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const bRes = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, target_lang: targetLang }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData && bData.adapted_translation) {
          const result = {
            original: cleanText,
            raw_translation: bData.raw_translation || cleanText,
            adapted_translation: bData.adapted_translation,
            domain_terms: bData.domain_terms || []
          };
          translationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      // Continue to next tier
    }
  }

  // 4. Try MyMemory API fallback
  if (!rawTranslation) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const langPair = `en|${targetLang}`;
      const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langPair}`;
      const mRes = await fetch(mUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData?.responseData?.translatedText) {
          rawTranslation = mData.responseData.translatedText;
        }
      }
    } catch (err) {
      rawTranslation = cleanText;
    }
  }

  if (!rawTranslation) {
    rawTranslation = cleanText;
  }

  // 5. Apply STEM Domain Adaptation Layer
  const { adaptedText, domainTerms } = applyDomainAdaptationClient(cleanText, rawTranslation, targetLang, glossary);

  const finalResult = {
    original: cleanText,
    raw_translation: rawTranslation,
    adapted_translation: adaptedText,
    domain_terms: domainTerms
  };

  // Cache final result
  translationCache.set(cacheKey, finalResult);
  return finalResult;
}

// Debounced Interim Translator for live subtitle preview as user speaks
let interimDebounceTimer = null;
let lastInterimRequest = '';

export function translateInterimDebounced(text, targetLang = 'ta', glossary = {}, onResult) {
  if (!text || !text.trim()) {
    onResult('');
    return;
  }

  const clean = text.trim();
  const cacheKey = `${targetLang}:${clean.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    onResult(translationCache.get(cacheKey).adapted_translation);
    return;
  }

  if (interimDebounceTimer) {
    clearTimeout(interimDebounceTimer);
  }

  lastInterimRequest = clean;
  interimDebounceTimer = setTimeout(async () => {
    try {
      const res = await translateTextClient(clean, targetLang, glossary);
      if (lastInterimRequest === clean) {
        onResult(res.adapted_translation);
      }
    } catch (e) {
      // Fallback: apply glossary directly to interim text
      const { adaptedText } = applyDomainAdaptationClient(clean, clean, targetLang, glossary);
      onResult(adaptedText);
    }
  }, 120);
}

export function applyDomainAdaptationClient(enText, translatedText, targetLang, glossary) {
  let adaptedText = translatedText || enText;
  const domainTerms = [];
  const lowerEn = enText.toLowerCase();

  const entries = Object.entries(glossary || {});
  // Sort longest term first to match multi-word phrases before single words
  entries.sort((a, b) => b[0].length - a[0].length);

  for (const [key, termInfo] of entries) {
    const pattern = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i');
    if (pattern.test(lowerEn)) {
      const vernacularTerm =
        (termInfo.translations && termInfo.translations[targetLang]) ||
        termInfo[targetLang] ||
        termInfo.ta ||
        termInfo.en ||
        key;

      domainTerms.push({
        term: key,
        en: termInfo.en || key,
        adapted_vernacular: vernacularTerm,
        category: termInfo.category || 'STEM',
        definition: termInfo.definition || ''
      });

      // Replace generic or English term with canonical vernacular translation
      const rawTermRegex = new RegExp(escapeRegExp(key), 'gi');
      if (rawTermRegex.test(adaptedText)) {
        adaptedText = adaptedText.replace(rawTermRegex, vernacularTerm);
      }
    }
  }

  return { adaptedText, domainTerms };
}

export function detectDomainTermsClient(text, targetLang = 'ta', glossary = {}) {
  if (!text) return [];
  const { domainTerms } = applyDomainAdaptationClient(text, text, targetLang, glossary);
  return domainTerms;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
