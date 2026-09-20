/**
 * Client-Side Real-Time Translation & Domain Adaptation Engine
 * Fully CORS-compatible for browser execution on Vercel or any static host.
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

  // Language pair mapping for MyMemory
  const langPair = `en|${targetLang}`;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langPair}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        rawTranslation = data.responseData.translatedText;
      }
    }
  } catch (e) {
    console.warn("Translation API request failed, falling back:", e);
    rawTranslation = cleanText;
  }

  // Domain Adaptation post-processing pass
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
