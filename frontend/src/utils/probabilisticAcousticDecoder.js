/**
 * Probabilistic Acoustic-Semantic Decoder for Real-Time ASR Pronunciation Error Correction
 * 
 * Mathematical Formulation:
 * P(W | O, C) ∝ P(O | W) * P(W | C)
 * 
 * Where:
 * - O = Observed acoustic token sequence from Web Speech API / microphone
 * - W = Candidate canonical STEM word or n-gram phrase
 * - C = Active lecture context (Linear Algebra, Machine Learning, Calculus, Physics, Bioenergetics)
 * - P(O | W) = Acoustic / phonetic likelihood computed via Soundex / Double Metaphone
 *              phonetic distance and weighted Levenshtein edit distance with vowel/accent tolerance
 * - P(W | C) = Prior probability of term W appearing in academic lecture context
 */

// Common English words and stopwords that must never be accidentally converted into STEM terms
const COMMON_ENGLISH_PRESERVED = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'book',
  'books', 'but', 'by', 'can', 'cannot', 'class', 'classes', 'could', 'did', 'do', 'does',
  'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'conversation',
  'normal', 'talk', 'talking', 'listen', 'listening', 'hello', 'welcome', 'thank', 'thanks',
  'please', 'okay', 'yes', 'no', 'right', 'write', 'read', 'speak', 'spoken', 'day', 'today'
]);

// 1. Common English / South Asian Accent Phonetic Mapping Rules
const PHONETIC_CONVERSIONS = [
  // Voicing and aspiration pairs
  [/ph/g, 'f'],
  [/gh/g, 'g'],
  [/kh/g, 'k'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/bh/g, 'b'],
  // Indic vowel and semi-vowel collapses
  [/v/g, 'w'],      // v and w are often interchangeable in South Asian English
  [/ck/g, 'k'],
  [/c([eiy])/g, 's$1'],
  [/c/g, 'k'],
  [/q/g, 'k'],
  [/x/g, 'ks'],
  [/z/g, 's'],
  [/j/g, 'g'],
  // Collapse duplicate consonants
  [/([b-df-hj-np-tv-z])\1+/g, '$1'],
];

/**
 * Computes a robust phonetic fingerprint of a word (Metaphone/Soundex hybrid)
 */
export function getPhoneticFingerprint(word) {
  if (!word) return '';
  let str = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (!str) return '';

  for (const [pattern, replacement] of PHONETIC_CONVERSIONS) {
    str = str.replace(pattern, replacement);
  }

  // Preserve initial sound, then strip interior vowels to extract consonant skeleton
  const initial = str[0];
  const skeleton = initial + str.slice(1).replace(/[aeiouy]/g, '');
  return skeleton;
}

/**
 * Weighted Levenshtein Distance with Accent Tolerance
 * Penalizes vowel substitutions and known dialect shifts very lightly (0.2)
 * while heavily penalizing discordant consonants (1.0).
 */
export function weightedPhoneticDistance(strA, strB) {
  const a = (strA || '').toLowerCase();
  const b = (strB || '').toLowerCase();
  const lenA = a.length;
  const lenB = b.length;

  if (a === b) return 0;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const dp = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

  for (let i = 1; i <= lenA; i++) {
    const charA = a[i - 1];
    for (let j = 1; j <= lenB; j++) {
      const charB = b[j - 1];
      if (charA === charB) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // Soft penalty for vowel-to-vowel or accent-specific consonant shifts
        let cost = 1.0;
        if (VOWELS.has(charA) && VOWELS.has(charB)) {
          cost = 0.25; // light vowel difference
        } else if ((charA === 'w' && charB === 'v') || (charA === 'v' && charB === 'w')) {
          cost = 0.15; // w/v accent neutral
        } else if ((charA === 'b' && charB === 'v') || (charA === 'v' && charB === 'b')) {
          cost = 0.3; // b/v shift
        } else if ((charA === 's' && charB === 'c') || (charA === 'k' && charB === 'c')) {
          cost = 0.2;
        } else if ((charA === 'd' && charB === 't') || (charA === 't' && charB === 'd')) {
          cost = 0.35;
        }

        dp[i][j] = Math.min(
          dp[i - 1][j] + 1.0,        // deletion
          dp[i][j - 1] + 1.0,        // insertion
          dp[i - 1][j - 1] + cost    // weighted substitution
        );
      }
    }
  }

  return dp[lenA][lenB];
}

/**
 * Computes Acoustic Likelihood P(O | W) in range [0, 1]
 */
export function computeAcousticLikelihood(observed, candidate) {
  if (observed.toLowerCase() === candidate.toLowerCase()) return 1.0;

  // 1. Normalized weighted string distance
  const maxLen = Math.max(observed.length, candidate.length);
  if (maxLen === 0) return 0;
  const rawDist = weightedPhoneticDistance(observed, candidate);
  const textSim = Math.max(0, 1 - (rawDist / maxLen));

  // 2. Phonetic fingerprint distance
  const fpObs = getPhoneticFingerprint(observed);
  const fpCand = getPhoneticFingerprint(candidate);
  const maxFpLen = Math.max(fpObs.length, fpCand.length);
  let fpSim = 0;
  if (maxFpLen > 0) {
    const fpDist = weightedPhoneticDistance(fpObs, fpCand);
    fpSim = Math.max(0, 1 - (fpDist / maxFpLen));
  }

  // Combined acoustic score
  return (0.45 * textSim) + (0.55 * fpSim);
}

// 2. Canonical STEM Academic Term Catalog with Base Priors P(W | C)
export const STEM_TERMS_PRIORS = {
  // Machine Learning & AI
  "gradient descent": { prior: 0.95, category: "ML" },
  "stochastic gradient descent": { prior: 0.90, category: "ML" },
  "loss function": { prior: 0.93, category: "ML" },
  "cost function": { prior: 0.91, category: "ML" },
  "backpropagation": { prior: 0.95, category: "ML" },
  "learning rate": { prior: 0.93, category: "ML" },
  "neural network": { prior: 0.94, category: "ML" },
  "neural net": { prior: 0.88, category: "ML" },
  "deep learning": { prior: 0.94, category: "ML" },
  "activation function": { prior: 0.90, category: "ML" },
  "hyperparameter": { prior: 0.89, category: "ML" },
  "overfitting": { prior: 0.91, category: "ML" },
  "underfitting": { prior: 0.88, category: "ML" },
  "cross-entropy": { prior: 0.89, category: "ML" },
  "regularization": { prior: 0.89, category: "ML" },
  "batch size": { prior: 0.87, category: "ML" },
  "epoch": { prior: 0.87, category: "ML" },
  "latent space": { prior: 0.86, category: "ML" },
  "supervised learning": { prior: 0.90, category: "ML" },
  "unsupervised learning": { prior: 0.88, category: "ML" },
  "reinforcement learning": { prior: 0.89, category: "ML" },
  "convolution": { prior: 0.89, category: "ML" },
  "momentum": { prior: 0.87, category: "ML" },
  "tensor": { prior: 0.88, category: "ML" },

  // Linear Algebra & Mathematics
  "eigenvector": { prior: 0.96, category: "MATH" },
  "eigenvalue": { prior: 0.96, category: "MATH" },
  "vector space": { prior: 0.93, category: "MATH" },
  "matrix multiplication": { prior: 0.92, category: "MATH" },
  "determinant": { prior: 0.91, category: "MATH" },
  "singular value decomposition": { prior: 0.90, category: "MATH" },
  "differential equation": { prior: 0.93, category: "MATH" },
  "partial derivative": { prior: 0.93, category: "MATH" },
  "linear regression": { prior: 0.91, category: "MATH" },
  "orthonormal": { prior: 0.88, category: "MATH" },
  "orthogonal": { prior: 0.88, category: "MATH" },
  "euclidean distance": { prior: 0.89, category: "MATH" },
  "hypothesis": { prior: 0.87, category: "MATH" },
  "standard deviation": { prior: 0.91, category: "STATS" },
  "variance": { prior: 0.90, category: "STATS" },
  "probability": { prior: 0.91, category: "STATS" },
  "bayesian": { prior: 0.91, category: "STATS" },
  "bayesian inference": { prior: 0.90, category: "STATS" },
  "algorithm": { prior: 0.94, category: "CS" },

  // Science & Thermodynamics & Biology
  "entropy": { prior: 0.92, category: "PHYS" },
  "photosynthesis": { prior: 0.94, category: "BIO" },
  "conduction": { prior: 0.91, category: "PHYS" },
  "convection": { prior: 0.91, category: "PHYS" },
  "radiation": { prior: 0.90, category: "PHYS" },
  "thermodynamics": { prior: 0.92, category: "PHYS" },
  "mitochondria": { prior: 0.93, category: "BIO" },
  "cellular respiration": { prior: 0.91, category: "BIO" }
};

// 3. High-Confidence Direct Acoustic Confusion Mappings (N-gram & Single Word)
// Maps misrecognized utterances from browser ASR engines directly to canonical forms
export const ACOUSTIC_CONFUSION_MAP = [
  // Multi-word phrases (checked first)
  { pattern: /\b(?:radiant|radian|radial)\s+descent\b/gi, canonical: "gradient descent" },
  { pattern: /\bgradient\s+(?:percent|resent|present)\b/gi, canonical: "gradient descent" },
  { pattern: /\bradiant\s+(?:percent|resent)\b/gi, canonical: "gradient descent" },
  { pattern: /\b(?:iron|ion|icon|i\s*can|eigen)\s+vectors?\b/gi, canonical: "eigenvector" },
  { pattern: /\b(?:iron|ion|icon|i\s*can|eigen)\s+values?\b/gi, canonical: "eigenvalue" },
  { pattern: /\b(?:lost|laws|law'?s|lots?)\s+functions?\b/gi, canonical: "loss function" },
  { pattern: /\b(?:cause|costs)\s+functions?\b/gi, canonical: "cost function" },
  { pattern: /\b(?:bag|back|black)\s+(?:propagation|proportion|preparation)\b/gi, canonical: "backpropagation" },
  { pattern: /\b(?:running|earning|turning|burning)\s+rates?\b/gi, canonical: "learning rate" },
  { pattern: /\b(?:an\s+trophy|anthropos|and\s+trophy)\b/gi, canonical: "entropy" },
  { pattern: /\b(?:photo\s+synthesis|photo\s+synthetic|photos\s+in\s+this)\b/gi, canonical: "photosynthesis" },
  { pattern: /\b(?:can\s+duction|con\s+duction)\b/gi, canonical: "conduction" },
  { pattern: /\b(?:victor|wictor)\s+space\b/gi, canonical: "vector space" },
  { pattern: /\b(?:viper|wiper)\s+parameters?\b/gi, canonical: "hyperparameter" },
  { pattern: /\b(?:moral|morel|new\s*real)\s+nets?\b/gi, canonical: "neural net" },
  { pattern: /\b(?:moral|morel|new\s*real)\s+networks?\b/gi, canonical: "neural network" },
  { pattern: /\bdeep\s+running\b/gi, canonical: "deep learning" },
  { pattern: /\b(?:slow\s+caustic|so\s+caustic)\b/gi, canonical: "stochastic" },
  { pattern: /\b(?:active\s+asian|activation)\s+functions?\b/gi, canonical: "activation function" },
  { pattern: /\bover\s+sitting\b/gi, canonical: "overfitting" },
  { pattern: /\bunder\s+sitting\b/gi, canonical: "underfitting" },
  { pattern: /\blinear\s+(?:aggression|oppression)\b/gi, canonical: "linear regression" },
  { pattern: /\b(?:across|a\s+cross)\s+entropy\b/gi, canonical: "cross-entropy" },
  { pattern: /\bmatrices\s+multiplication\b/gi, canonical: "matrix multiplication" },
  { pattern: /\bdeter\s+meant\b/gi, canonical: "determinant" },
  { pattern: /\bdifferent\s+shell\s+equations?\b/gi, canonical: "differential equation" },
  { pattern: /\bpar\s+shell\s+derivatives?\b/gi, canonical: "partial derivative" },
  { pattern: /\bhigh\s+pothesis\b/gi, canonical: "hypothesis" },
  { pattern: /\bstandard\s+(?:aviation|naviation)\b/gi, canonical: "standard deviation" },
  { pattern: /\bvery\s+ants\b/gi, canonical: "variance" },
  { pattern: /\bprop\s+ability\b/gi, canonical: "probability" },
  { pattern: /\b(?:base\s+ian|asian)\s+inference\b/gi, canonical: "Bayesian inference" },
  { pattern: /\b(?:algo\s+rhythm|al\s+rhythm)\b/gi, canonical: "algorithm" },
  { pattern: /\bmoment\s+dumb\b/gi, canonical: "momentum" },
  { pattern: /\bbad\s+size\b/gi, canonical: "batch size" },
  { pattern: /\bregular\s+relation\b/gi, canonical: "regularization" },
  { pattern: /\blate\s+and\s+space\b/gi, canonical: "latent space" },
  { pattern: /\btenth\s+sir\b/gi, canonical: "tensor" },
  { pattern: /\byou\s+claudian\b/gi, canonical: "Euclidean" },
  { pattern: /\bauthor\s+normal\b/gi, canonical: "orthonormal" },
  { pattern: /\bsingle\s+value\s+decomposition\b/gi, canonical: "singular value decomposition" },
  { pattern: /\bsuper\s+vice\s+learning\b/gi, canonical: "supervised learning" },
  { pattern: /\bunsuper\s+vice\b/gi, canonical: "unsupervised" },
  { pattern: /\brain\s+force\s+meant\b/gi, canonical: "reinforcement" }
];

/**
 * Evaluates Bayesian Posterior P(W | O, C) for candidate STEM terms against an observed phrase
 */
export function evaluateCandidatePosterior(observedPhrase, candidateTerm, domainContext = {}) {
  const acousticLikelihood = computeAcousticLikelihood(observedPhrase, candidateTerm);
  const termInfo = STEM_TERMS_PRIORS[candidateTerm.toLowerCase()];
  let prior = termInfo ? termInfo.prior : 0.70;

  // Contextual Prior Boosting: If active lecture domain or glossary matches category, boost prior
  if (domainContext.category && termInfo && termInfo.category === domainContext.category) {
    prior = Math.min(0.98, prior + 0.15);
  }
  if (domainContext.recentTerms && domainContext.recentTerms.includes(candidateTerm.toLowerCase())) {
    prior = Math.min(0.99, prior + 0.10);
  }

  // Bayes Rule: P(W | O) = (P(O | W) * P(W))
  const unnormalizedPosterior = acousticLikelihood * prior;
  return {
    candidate: candidateTerm,
    acousticLikelihood,
    prior,
    posterior: unnormalizedPosterior
  };
}

/**
 * Decodes acoustic transcript using Bayesian inference and phonetic distance
 * 
 * @param {string} rawText - Raw speech transcript from Web Speech API
 * @param {Object} domainContext - Optional domain context (category, recentTerms)
 * @param {Object} glossary - Active session glossary terms
 * @returns {Object} { decodedText, correctionsApplied: Array<{ original, corrected, confidence }> }
 */
export function decodeAcousticTranscript(rawText, domainContext = {}, glossary = {}) {
  if (!rawText || !rawText.trim()) {
    return { decodedText: '', correctionsApplied: [] };
  }

  let text = rawText;
  const correctionsApplied = [];

  // Stage 1: High-Confidence Direct Acoustic Confusion Patterns (Fast Regex Pass)
  for (const { pattern, canonical } of ACOUSTIC_CONFUSION_MAP) {
    if (pattern.test(text)) {
      pattern.lastIndex = 0; // reset regex state
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((m) => {
          if (m.toLowerCase() !== canonical.toLowerCase()) {
            correctionsApplied.push({
              original: m,
              corrected: canonical,
              confidence: 96,
              method: 'acoustic_confusion_prior'
            });
          }
        });
      }
      text = text.replace(pattern, canonical);
    }
  }

  // Stage 2: Probabilistic Acoustic-Semantic Window Matching for Glossary & STEM Terms
  // Target only domain-specific STEM terms (multi-word and single technical words)
  const targetTerms = new Set([
    ...Object.keys(STEM_TERMS_PRIORS),
    ...Object.keys(glossary || {})
  ]);

  const words = text.split(/\s+/);
  if (words.length > 0) {
    let i = 0;
    const resultWords = [];

    while (i < words.length) {
      let matched = false;

      // Try 3-word window, then 2-word, then 1-word
      for (const windowSize of [3, 2, 1]) {
        if (i + windowSize <= words.length) {
          const windowPhrase = words.slice(i, i + windowSize).join(' ');
          const cleanWindow = windowPhrase.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim().toLowerCase();

          // 1. If it is already an exact STEM term, keep it as is
          if (targetTerms.has(cleanWindow)) {
            resultWords.push(windowPhrase);
            i += windowSize;
            matched = true;
            break;
          }

          // 2. Protect standard everyday conversational words from single-word STEM substitution
          if (windowSize === 1 && COMMON_ENGLISH_PRESERVED.has(cleanWindow)) {
            resultWords.push(windowPhrase);
            i += 1;
            matched = true;
            break;
          }

          // 3. For multi-word candidates, check if any constituent word is already an exact STEM term
          // This prevents overlapping greedy merges like ("the" + "learning") -> "deep learning"
          if (windowSize === 2) {
            const nextWord = words[i + 1]?.toLowerCase();
            if (nextWord && (nextWord === 'rate' || nextWord === 'function' || nextWord === 'descent')) {
              // Let the canonical phrase stand
              continue;
            }
          }

          // Search candidate terms with high acoustic likelihood
          let bestCandidate = null;
          let bestPosterior = 0;

          for (const cand of targetTerms) {
            const candWords = cand.split(/\s+/);
            if (candWords.length !== windowSize) continue;

            // Prevent matching stopword combinations (e.g., "the learning" should NOT match "deep learning")
            const firstObsWord = words[i].toLowerCase().replace(/[^a-z]/g, '');
            if (windowSize > 1 && COMMON_ENGLISH_PRESERVED.has(firstObsWord) && !COMMON_ENGLISH_PRESERVED.has(candWords[0].toLowerCase())) {
              continue;
            }

            const evalResult = evaluateCandidatePosterior(cleanWindow, cand, domainContext);
            // High strict threshold for probabilistic substitution:
            // High acoustic similarity (> 0.82) and posterior score (> 0.75)
            if (evalResult.acousticLikelihood >= 0.82 && evalResult.posterior >= 0.75) {
              if (evalResult.posterior > bestPosterior) {
                bestPosterior = evalResult.posterior;
                bestCandidate = cand;
              }
            }
          }

          if (bestCandidate && bestCandidate.toLowerCase() !== cleanWindow) {
            // Preserve leading/trailing punctuation if present
            const firstWord = words[i];
            const lastWord = words[i + windowSize - 1];
            const leadingPunct = firstWord.match(/^[^a-zA-Z0-9]+/)?.[0] || '';
            const trailingPunct = lastWord.match(/[^a-zA-Z0-9]+$/)?.[0] || '';

            const correctedPhrase = `${leadingPunct}${bestCandidate}${trailingPunct}`;
            correctionsApplied.push({
              original: windowPhrase,
              corrected: bestCandidate,
              confidence: Math.round(bestPosterior * 100),
              method: 'bayesian_posterior'
            });

            resultWords.push(correctedPhrase);
            i += windowSize;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        resultWords.push(words[i]);
        i += 1;
      }
    }

    text = resultWords.join(' ');
  }

  return {
    decodedText: text,
    correctionsApplied
  };
}
