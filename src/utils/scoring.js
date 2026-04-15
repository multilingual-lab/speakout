/**
 * Korean-aware text normalization and Levenshtein similarity scoring.
 */

export function normalize(s) {
  return s
    .replace(/[\p{P}\p{Z}]/gu, '') // strip all unicode punctuation and whitespace
    .toLowerCase();
}

export function computeSimilarity(target, spoken) {
  const a = normalize(target);
  const b = normalize(spoken);

  if (!a && !b) return 0;
  if (a === b) return 100;
  if (!a || !b) return 0;

  // Levenshtein distance
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
