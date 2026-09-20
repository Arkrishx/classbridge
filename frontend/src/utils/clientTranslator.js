/**
 * Client-Side Real-Time Translation & Domain Adaptation Engine
 * Used for live speech translation in the browser even when backend is cold-booting or offline.
 */

export async function translateTextClient(text, targetLang, glossary = {}) {
  if (!text || !text.trim()) {
    return {
      original: text,
      raw_translation: '',
      adapted_translation: '',
      domain_terms: []
    };
  }

  let rawTranslation = text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        rawTranslation = data[0].map((chunk) => chunk[0]).join('');
      }
    }
  } catch (e) {
    console.warn("Client translation fallback to original:", e);
    rawTranslation = text;
  }

  // Apply STEM Domain Adaptation layer
  const { adaptedText, domainTerms } = applyDomainAdaptationClient(text, rawTranslation, targetLang, glossary);

  return {
    original: text.trim(),
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
  // Sort longest term first
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

      // If the raw translated text still has the English term, replace it with adapted vernacular
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
