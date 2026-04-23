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
 * Compute Levenshtein similarity using language-specific normalization.
 */
export function computeSimilarity(target, spoken, languageId) {
  const adapter = getAdapter(languageId);
  const a = adapter.normalize(target);
  const b = adapter.normalize(spoken);

  if (!a && !b) return 0;
  if (a === b) return 100;
  if (!a || !b) return 0;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLen = Math.max(a.length, b.length);
  return Math.round(((maxLen - distance) / maxLen) * 100);
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
