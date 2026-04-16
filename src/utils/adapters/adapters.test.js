import { describe, it, expect } from 'vitest';
import { getAdapter, normalize, computeSimilarity, matchKeyword, matchKeywords } from './index.js';

/* ── Adapter dispatch ────────────────────────────────────────────── */

describe('getAdapter', () => {
  it('returns Korean adapter for "ko"', () => {
    const adapter = getAdapter('ko');
    expect(adapter.normalize).toBeDefined();
    expect(adapter.matchKeyword).toBeDefined();
  });

  it('returns Spanish adapter for "es"', () => {
    const adapter = getAdapter('es');
    expect(adapter.normalize).toBeDefined();
    expect(adapter.matchKeyword).toBeDefined();
  });

  it('returns default adapter for unknown language', () => {
    const adapter = getAdapter('xx');
    expect(adapter.normalize).toBeDefined();
    expect(adapter.matchKeyword).toBeDefined();
  });

  it('returns default adapter when no language specified', () => {
    const adapter = getAdapter();
    // defaults to 'ko'
    expect(adapter.normalize).toBeDefined();
  });
});

/* ── Default adapter behavior ────────────────────────────────────── */

describe('default adapter (unknown language)', () => {
  it('strips punctuation and whitespace', () => {
    expect(normalize('Hello, world!', 'xx')).toBe('helloworld');
  });

  it('lowercases text', () => {
    expect(normalize('HELLO', 'xx')).toBe('hello');
  });

  it('matches plain substring keywords', () => {
    expect(matchKeyword('hello', 'say hello to everyone', 'xx')).toBe(true);
    expect(matchKeyword('goodbye', 'say hello to everyone', 'xx')).toBe(false);
  });

  it('handles slash alternatives', () => {
    expect(matchKeyword('hi/hello', 'say hello', 'xx')).toBe(true);
    expect(matchKeyword('hi/hello', 'say hi', 'xx')).toBe(true);
    expect(matchKeyword('hi/hello', 'say bye', 'xx')).toBe(false);
  });
});

/* ── Korean adapter ──────────────────────────────────────────────── */

describe('Korean adapter', () => {
  it('normalizes Korean text', () => {
    expect(normalize('안녕하세요!', 'ko')).toBe('안녕하세요');
    expect(normalize('감사합니다.', 'ko')).toBe('감사합니다');
  });

  it('matches plain Korean keywords', () => {
    expect(matchKeyword('안녕', '안녕하세요', 'ko')).toBe(true);
  });

  it('handles (으) optional pattern', () => {
    expect(matchKeyword('(으)면', '가면', 'ko')).toBe(true);
    expect(matchKeyword('(으)면', '먹으면', 'ko')).toBe(true);
  });

  it('handles (이) optional pattern', () => {
    expect(matchKeyword('(이)라고', '이라고', 'ko')).toBe(true);
    expect(matchKeyword('(이)라고', '라고', 'ko')).toBe(true);
  });

  it('handles slash alternatives', () => {
    expect(matchKeyword('아서/어서', '가서', 'ko')).toBe(false);
    expect(matchKeyword('아서/어서', '해서 그래요', 'ko')).toBe(false);
    expect(matchKeyword('먹어서/가서', '먹어서', 'ko')).toBe(true);
    expect(matchKeyword('먹어서/가서', '가서', 'ko')).toBe(true);
  });

  it('handles (으)ㄹ jamo pattern', () => {
    // 먹을 거예요 — consonant stem with 을
    expect(matchKeyword('(으)ㄹ 거예요', '먹을 거예요', 'ko')).toBe(true);
    // 할 거예요 — vowel stem with ㄹ 받침
    expect(matchKeyword('(으)ㄹ 거예요', '할 거예요', 'ko')).toBe(true);
  });
});

/* ── Spanish adapter ─────────────────────────────────────────────── */

describe('Spanish adapter', () => {
  it('normalizes Spanish text with accents', () => {
    expect(normalize('¿Cómo estás?', 'es')).toBe('comoestas');
  });

  it('preserves ñ as distinct', () => {
    expect(normalize('año', 'es')).toBe('año');
  });

  it('matches keywords accent-insensitively', () => {
    expect(matchKeyword('como', '¿Cómo estás?', 'es')).toBe(true);
    expect(matchKeyword('cómo', 'como estas', 'es')).toBe(true);
  });

  it('computes similarity ignoring accents', () => {
    expect(computeSimilarity('Cómo estás', 'como estas', 'es')).toBe(100);
  });
});

/* ── matchKeywords convenience ───────────────────────────────────── */

describe('matchKeywords', () => {
  it('filters matched keywords for Korean', () => {
    const keywords = ['안녕', '감사', '없는단어'];
    const matched = matchKeywords(keywords, '안녕하세요 감사합니다', 'ko');
    expect(matched).toEqual(['안녕', '감사']);
  });

  it('filters matched keywords for Spanish', () => {
    const keywords = ['hola', 'adiós', 'missing'];
    const matched = matchKeywords(keywords, 'Hola, ¿cómo estás? Adiós.', 'es');
    expect(matched).toEqual(['hola', 'adiós']);
  });

  it('returns empty array for no matches', () => {
    const matched = matchKeywords(['xyz'], 'hello world', 'xx');
    expect(matched).toEqual([]);
  });
});
