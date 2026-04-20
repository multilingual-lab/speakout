/**
 * OpenTTS provider — uses a self-hosted OpenTTS-compatible HTTP endpoint.
 *
 * Default target is localhost so users can run an open-source TTS server
 * without exposing cloud credentials.
 *
 * Language safety: only synthesizes when a voice matching the requested
 * language is available on the server. Falls back to browser TTS otherwise.
 */

const STORAGE_BASE_URL = 'opentts_base_url';
const STORAGE_VOICE = 'opentts_voice';

function getBaseUrl() {
  return (localStorage.getItem(STORAGE_BASE_URL) || 'http://localhost:5500').trim();
}

function getVoice() {
  return (localStorage.getItem(STORAGE_VOICE) || '').trim();
}

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

/**
 * Extract the language tag from a Piper voice name.
 * "es_ES-davefx-medium" → "es-es"
 * Returns lowercase for comparison.
 */
export function extractVoiceLang(voiceName) {
  return voiceName.replace('_', '-').split('-').slice(0, 2).join('-').toLowerCase();
}

/**
 * Normalize an SSML lang tag for comparison.
 * "ko-KR" → "ko-kr"
 */
export function normalizeLang(ssmlLang) {
  return ssmlLang.split('-').slice(0, 2).join('-').toLowerCase();
}

// Cached voices list from the server (refreshed per session).
let cachedVoices = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // 1 minute

async function fetchVoices(baseUrl) {
  const now = Date.now();
  if (cachedVoices && now < cacheExpiry) return cachedVoices;

  try {
    const resp = await fetch(`${trimTrailingSlash(baseUrl)}/api/voices`);
    if (resp.ok) {
      cachedVoices = await resp.json();
      cacheExpiry = now + CACHE_TTL;
      return cachedVoices;
    }
  } catch {
    // Server unreachable — will throw later
  }
  return null;
}

/**
 * Find a voice on the server that matches the requested language.
 * Returns the voice id string or null.
 */
export async function resolveVoice(baseUrl, explicitVoice, ssmlLang) {
  const lang = normalizeLang(ssmlLang);

  // If user configured an explicit voice, check it matches
  if (explicitVoice) {
    if (extractVoiceLang(explicitVoice) === lang) return explicitVoice;
    // Mismatch — don't use it, try to find an alternative
  }

  // Query server for available voices and auto-select
  const voices = await fetchVoices(baseUrl);
  if (!voices || !Array.isArray(voices)) return null;

  const match = voices.find((v) => extractVoiceLang(v.id) === lang);
  return match ? match.id : null;
}

// Allow tests to reset cached state
export function _resetCache() {
  cachedVoices = null;
  cacheExpiry = 0;
}

const openTtsProvider = {
  id: 'opentts',
  label: 'OpenTTS (Self-hosted)',

  isConfigured() {
    return !!getBaseUrl();
  },

  getConfig() {
    return {
      baseUrl: getBaseUrl(),
      voice: getVoice(),
    };
  },

  saveConfig({ baseUrl, voice }) {
    localStorage.setItem(STORAGE_BASE_URL, (baseUrl || '').trim());
    localStorage.setItem(STORAGE_VOICE, (voice || '').trim());
  },

  configFields: [
    {
      key: 'baseUrl',
      label: 'OpenTTS Base URL',
      type: 'url',
      placeholder: 'http://localhost:5500',
    },
    {
      key: 'voice',
      label: 'Voice (optional)',
      type: 'text',
      placeholder: 'e.g. ko_KR-kss-medium or es_ES-davefx-medium',
    },
  ],

  async speak(text, { ssmlLang = 'ko-KR' } = {}) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('OpenTTS base URL not configured');
    }

    const explicitVoice = getVoice();
    const resolvedVoice = await resolveVoice(baseUrl, explicitVoice, ssmlLang);

    if (!resolvedVoice) {
      throw new Error(
        `No OpenTTS voice available for language "${ssmlLang}" — falling back`
      );
    }

    const endpoint = `${trimTrailingSlash(baseUrl)}/api/tts`;
    const params = new URLSearchParams();
    params.set('text', text);
    params.set('voice', resolvedVoice);

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenTTS failed (${response.status}): ${errorText}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  },
};

export default openTtsProvider;