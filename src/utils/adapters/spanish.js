/**
 * Spanish language adapter — accent-insensitive normalization.
 */

const ACCENT_MAP = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
  'ü': 'u', 'ñ': 'ñ', // keep ñ as distinct
};

/**
 * Normalize Spanish text for similarity scoring.
 * Strips punctuation/whitespace, lowercases, and removes accent marks
 * (except ñ which is a distinct letter).
 */
export function normalize(s) {
  return s
    .replace(/[\p{P}\p{Z}]/gu, '')
    .toLowerCase()
    .replace(/[áéíóúü]/g, (ch) => ACCENT_MAP[ch] || ch);
}

/**
 * Plain substring keyword matching for Spanish.
 * Normalizes both keyword and text before comparison.
 */
export function matchKeyword(keyword, text) {
  const kw = keyword.replace(/~/g, '');

  // Slash alternatives
  if (kw.includes('/')) {
    return kw.split('/').some((part) => matchKeyword(part.trim(), text));
  }

  return normalize(text).includes(normalize(kw));
}
