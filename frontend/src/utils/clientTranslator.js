/**
 * Client-Side Real-Time Translation & Domain Adaptation Engine
 * High-speed, timeout-protected, and CORS-friendly.
 */

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
  let rawTranslation = cleanText;

  // 1. Try MyMemory API with a strict 1500ms timeout to prevent any UI delay
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const langPair = `en|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langPair}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        rawTranslation = data.responseData.translatedText;
      }
    }
  } catch (e) {
    // Timeout or network limit - gracefully use original text and let Domain Adaptation translate terms
    rawTranslation = cleanText;
  }

  // 2. STEM Domain Adaptation Layer (Guaranteed accurate technical terminology)
  const { adaptedText, domainTerms } = applyDomainAdaptationClient(cleanText, rawTranslation, targetLang, glossary);

  return {
    original: cleanText,
    raw_translation: rawTranslation,
    adapted_translation: adaptedText,
    domain_terms: domainTerms
  };
}

export function applyDomainAdaptationClient(enText, translatedText, targetLang, glossary) {
  let adaptedText = translatedText;
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

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
