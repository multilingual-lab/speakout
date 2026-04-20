import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractVoiceLang,
  normalizeLang,
  resolveVoice,
  _resetCache,
} from './openTtsProvider.js';

describe('extractVoiceLang', () => {
  it('extracts language from Piper voice name', () => {
    expect(extractVoiceLang('es_ES-davefx-medium')).toBe('es-es');
  });

  it('extracts language from Korean voice name', () => {
    expect(extractVoiceLang('ko_KR-kss-medium')).toBe('ko-kr');
  });

  it('extracts language from English voice name', () => {
    expect(extractVoiceLang('en_US-lessac-high')).toBe('en-us');
  });
});

describe('normalizeLang', () => {
  it('normalizes SSML lang tag', () => {
    expect(normalizeLang('ko-KR')).toBe('ko-kr');
    expect(normalizeLang('es-ES')).toBe('es-es');
    expect(normalizeLang('en-US')).toBe('en-us');
  });
});

describe('resolveVoice — language matching', () => {
  beforeEach(() => {
    _resetCache();
    vi.restoreAllMocks();
  });

  const spanishOnlyServer = [
    { id: 'es_ES-davefx-medium', model: 'es_ES-davefx-medium.onnx' },
  ];

  const multiLangServer = [
    { id: 'es_ES-davefx-medium', model: 'es_ES-davefx-medium.onnx' },
    { id: 'ko_KR-kss-medium', model: 'ko_KR-kss-medium.onnx' },
    { id: 'en_US-lessac-high', model: 'en_US-lessac-high.onnx' },
  ];

  function mockFetch(voices) {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(voices) })
    ));
  }

  // --- Explicit voice matches requested language ---
  it('returns explicit voice when language matches', async () => {
    mockFetch(spanishOnlyServer);
    const result = await resolveVoice('http://localhost:5500', 'es_ES-davefx-medium', 'es-ES');
    expect(result).toBe('es_ES-davefx-medium');
  });

  // --- Explicit voice does NOT match requested language ---
  it('rejects explicit Spanish voice for Korean language', async () => {
    mockFetch(spanishOnlyServer);
    const result = await resolveVoice('http://localhost:5500', 'es_ES-davefx-medium', 'ko-KR');
    expect(result).toBeNull();
  });

  // --- No explicit voice, server has matching language ---
  it('auto-selects Spanish voice from server for Spanish request', async () => {
    mockFetch(multiLangServer);
    const result = await resolveVoice('http://localhost:5500', '', 'es-ES');
    expect(result).toBe('es_ES-davefx-medium');
  });

  it('auto-selects Korean voice from server for Korean request', async () => {
    mockFetch(multiLangServer);
    const result = await resolveVoice('http://localhost:5500', '', 'ko-KR');
    expect(result).toBe('ko_KR-kss-medium');
  });

  it('auto-selects English voice from server for English request', async () => {
    mockFetch(multiLangServer);
    const result = await resolveVoice('http://localhost:5500', '', 'en-US');
    expect(result).toBe('en_US-lessac-high');
  });

  // --- No explicit voice, server does NOT have matching language ---
  it('returns null when server has no Korean voice', async () => {
    mockFetch(spanishOnlyServer);
    const result = await resolveVoice('http://localhost:5500', '', 'ko-KR');
    expect(result).toBeNull();
  });

  it('returns null when server has no French voice', async () => {
    mockFetch(multiLangServer);
    const result = await resolveVoice('http://localhost:5500', '', 'fr-FR');
    expect(result).toBeNull();
  });

  // --- Explicit voice mismatch, but server has correct language ---
  it('falls back to server voice when explicit voice is wrong language', async () => {
    mockFetch(multiLangServer);
    // User configured Spanish voice, but requesting Korean
    const result = await resolveVoice('http://localhost:5500', 'es_ES-davefx-medium', 'ko-KR');
    expect(result).toBe('ko_KR-kss-medium');
  });

  // --- Server unreachable ---
  it('returns null when server is unreachable and no voice matches', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))));
    const result = await resolveVoice('http://localhost:5500', '', 'ko-KR');
    expect(result).toBeNull();
  });

  it('returns explicit voice when server is unreachable but voice matches language', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))));
    const result = await resolveVoice('http://localhost:5500', 'ko_KR-kss-medium', 'ko-KR');
    expect(result).toBe('ko_KR-kss-medium');
  });
});
