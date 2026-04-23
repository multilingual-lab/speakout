/**
 * Chinese language adapter — full-width punctuation normalization.
 * Simplified Chinese only.
 */

/**
 * Normalize Chinese text for similarity scoring.
 * Strips punctuation/whitespace (including full-width) and lowercases.
 */
export function normalize(s) {
  return s
    .replace(/[\p{P}\p{Z}]/gu, '')
    .toLowerCase();
}

/**
 * Substring keyword matching for Chinese.
 * Chinese has no word boundaries so substring match is the natural approach.
 */
export function matchKeyword(keyword, text) {
  const kw = keyword.replace(/~/g, '');

  if (kw.includes('/')) {
    return kw.split('/').some((part) => matchKeyword(part.trim(), text));
  }

  return normalize(text).includes(normalize(kw));
}
