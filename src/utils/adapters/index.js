/**
 * Language adapter dispatch layer.
 *
 * Each adapter exports: normalize(text), matchKeyword(keyword, text)
 * The dispatch layer resolves the correct adapter by languageId.
 */

import * as korean from './korean.js';
import * as spanish from './spanish.js';
import * as chinese from './chinese.js';

/* ── Default adapter ─────────────────────────────────────────────── */

const defaultAdapter = {
  normalize(s) {
    return s
      .replace(/[\p{P}\p{Z}]/gu, '')
      .toLowerCase();
  },

  matchKeyword(keyword, text) {
    const kw = keyword.replace(/~/g, '');

    if (kw.includes('/')) {
      return kw.split('/').some((part) => defaultAdapter.matchKeyword(part.trim(), text));
    }

    return defaultAdapter.normalize(text).includes(defaultAdapter.normalize(kw));
  },
};

/* ── Adapter registry ────────────────────────────────────────────── */

const adapters = {
  ko: korean,
  es: spanish,
  zh: chinese,
};

/**
 * Resolve language adapter by ID. Falls back to default adapter.
 */
export function getAdapter(languageId = 'ko') {
  return adapters[languageId] || defaultAdapter;
}

/* ── Convenience functions ───────────────────────────────────────── */

/**
 * Normalize text using the appropriate language adapter.
 */
export function normalize(text, languageId) {
  return getAdapter(languageId).normalize(text);
}

/**
 * Compute similarity using approximate substring matching.
 * Finds the best-matching region within the spoken text for the target,
 * so extra words (prefixes, suffixes, fillers) don't penalize the score.
 * Uses semi-global Levenshtein: free start position in spoken text.
 */
export function computeSimilarity(target, spoken, languageId) {
  const adapter = getAdapter(languageId);
  const a = adapter.normalize(target);
  const b = adapter.normalize(spoken);

  if (!a && !b) return 0;
  if (a === b) return 100;
  if (!a || !b) return 0;

  // If spoken text contains the target exactly, it's a full match
  if (b.includes(a)) return 100;

  // Semi-global alignment: first row zeroed (free start in spoken text)
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  // Initialize first column (deletions from target)
  for (let i = 1; i < rows; i++) matrix[i][0] = i;
  // First row stays 0 — free start position in spoken text

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  // Best match = minimum in last row (best end position in spoken text)
  const subDist = Math.min(...matrix[a.length]);

  // Also compute full-string distance for cases where spoken is shorter
  const fullDist = matrix[a.length][b.length];
  const fullMax = Math.max(a.length, b.length);
  const fullScore = Math.round(((fullMax - fullDist) / fullMax) * 100);

  // Substring score: relative to target length (what fraction of target was matched)
  const subScore = Math.round(((a.length - subDist) / a.length) * 100);

  // Return the better of the two scores
  return Math.max(fullScore, subScore);
}

/**
 * Check if a keyword matches text using the appropriate language adapter.
 */
export function matchKeyword(keyword, text, languageId) {
  return getAdapter(languageId).matchKeyword(keyword, text);
}

/**
 * Filter keywords that match text using the appropriate language adapter.
 */
export function matchKeywords(keywords, text, languageId) {
  const adapter = getAdapter(languageId);
  return keywords.filter((kw) => adapter.matchKeyword(kw, text));
}

/* ── Korean stop words (particles, endings, fillers) ─────────────── */
const KO_STOPS = new Set([
  '네', '아', '음', '좀', '잘', '더', '안', '못', '좀', '뭐', '이', '그', '저',
  '을', '를', '이', '가', '은', '는', '에', '에서', '도', '로', '으로',
  '한', '두', '세', '잔', '개', '명',
]);

/* ── Spanish stop words (articles, prepositions, fillers) ────────── */
const ES_STOPS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'en', 'a', 'al', 'con', 'por', 'para', 'y', 'o', 'que',
  'es', 'si', 'no', 'me', 'te', 'se', 'lo', 'le', 'les',
  'mi', 'tu', 'su', 'nos', 'muy', 'mas',
]);

/**
 * Extract 1–3 content keywords from a response string.
 * Filters out stop words/particles, returns the most meaningful tokens.
 */
export function extractKeywords(response, languageId = 'ko', max = 3) {
  if (!response) return [];
  const stops = languageId === 'es' ? ES_STOPS : KO_STOPS;
  const tokens = response
    .replace(/[~?!.,…·ㅋㅎ]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stops.has(t));
  // Prefer longer tokens (more meaningful), take up to max
  tokens.sort((a, b) => b.length - a.length);
  return tokens.slice(0, max);
}
