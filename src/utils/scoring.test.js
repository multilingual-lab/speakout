import { describe, it, expect } from 'vitest';
import { normalize, computeSimilarity } from './scoring.js';

describe('normalize', () => {
  it('strips punctuation and whitespace', () => {
    expect(normalize('안녕하세요!')).toBe('안녕하세요');
    expect(normalize('감사합니다.')).toBe('감사합니다');
  });

  it('preserves 요 formality particle', () => {
    expect(normalize('괜찮아요')).toBe('괜찮아요');
    expect(normalize('감사해요')).toBe('감사해요');
  });

  it('preserves Korean emoticons (ㅋㅎㅠㅜ)', () => {
    expect(normalize('좋아요ㅎㅎ')).toBe('좋아요ㅎㅎ');
    expect(normalize('힘들어요ㅠㅠ')).toBe('힘들어요ㅠㅠ');
  });

  it('strips whitespace', () => {
    expect(normalize('한 잔 주세요')).toBe('한잔주세요');
  });

  it('lowercases Latin characters', () => {
    expect(normalize('OK')).toBe('ok');
  });

  it('returns empty string for punctuation-only input', () => {
    expect(normalize('...!')).toBe('');
  });
});

describe('computeSimilarity', () => {
  it('returns 100 for identical strings', () => {
    expect(computeSimilarity('안녕하세요', '안녕하세요')).toBe(100);
  });

  it('returns 100 when only differing by punctuation', () => {
    // Punctuation stripped → both normalize to 안녕하세요
    expect(computeSimilarity('안녕하세요!', '안녕하세요')).toBe(100);
  });

  it('returns 0 when one string is empty', () => {
    expect(computeSimilarity('', '안녕하세요')).toBe(0);
    expect(computeSimilarity('안녕하세요', '')).toBe(0);
  });

  it('returns 0 when both strings normalize to empty', () => {
    expect(computeSimilarity('...', '!!!')).toBe(0);
  });

  it('gives high score for close matches', () => {
    // "아이스아메리카노한잔주세" vs "아메리카노주세" — substantial overlap
    const score = computeSimilarity(
      '아이스 아메리카노 한 잔 주세요',
      '아메리카노 주세요'
    );
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('gives low score for very different strings', () => {
    const score = computeSimilarity('안녕하세요', '카드로 계산할게요');
    expect(score).toBeLessThan(40);
  });

  it('is symmetric', () => {
    const a = '감사합니다';
    const b = '감사해요';
    expect(computeSimilarity(a, b)).toBe(computeSimilarity(b, a));
  });

  it('distinguishes formality particle difference', () => {
    // "괜찮아요" and "괜찮아" are different after normalization
    expect(computeSimilarity('괜찮아요', '괜찮아')).toBe(75);
  });

  it('handles mixed Korean and whitespace', () => {
    const score = computeSimilarity(
      '여기서 먹고 갈게요',
      '여기서먹고갈게요'
    );
    expect(score).toBe(100);
  });
});
