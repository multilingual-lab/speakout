/**
 * Korean language adapter — grammar-aware keyword matching and normalization.
 * Extracted from MonologueMode.jsx inline logic.
 */

/**
 * Normalize Korean text for similarity scoring.
 * Strips unicode punctuation and whitespace, lowercases Latin chars.
 */
export function normalize(s) {
  return s
    .replace(/[\p{P}\p{Z}]/gu, '')
    .toLowerCase();
}

/**
 * Check if a Korean grammar keyword pattern matches the transcript.
 * Handles notations: (으)ㄹ (jamo 받침), (으), (이), and / alternatives.
 */
export function matchKeyword(keyword, text) {
  const kw = keyword.replace(/~/g, '');

  // Slash alternatives: "아서/어서" → match either side
  if (kw.includes('/')) {
    return kw.split('/').some((part) => matchKeyword(part.trim(), text));
  }

  // (으)ㄹ + suffix: ㄹ combines as 받침 with the preceding syllable
  if (kw.includes('(으)ㄹ')) {
    const suffix = kw.split('(으)ㄹ').pop();
    if (text.includes('을' + suffix)) return true;
    let pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf(suffix, pos);
      if (idx <= 0) break;
      const code = text.charCodeAt(idx - 1);
      if (code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 === 8) return true;
      pos = idx + 1;
    }
    return false;
  }

  // (으) without ㄹ jamo: 으 is optional
  if (kw.includes('(으)')) {
    return text.includes(kw.replace('(으)', '으')) || text.includes(kw.replace('(으)', ''));
  }

  // (이): 이 is optional
  if (kw.includes('(이)')) {
    return text.includes(kw.replace('(이)', '이')) || text.includes(kw.replace('(이)', ''));
  }

  return text.includes(kw);
}
