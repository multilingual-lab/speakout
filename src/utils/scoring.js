/**
 * Text normalization and Levenshtein similarity scoring.
 * Delegates to language-specific adapters via the adapter dispatch layer.
 */
export { normalize, computeSimilarity, matchKeyword, matchKeywords } from './adapters/index.js';
