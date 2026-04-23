/**
 * Language Registry — central configuration for supported languages
 * Defines STT locale, TTS voice, and feature flags per language
 */

export const LANGUAGES = {
  ko: {
    id: 'ko',
    label: '한국어',
    shortLabel: 'KR',
    flag: '🇰🇷',
    sttLang: 'ko-KR',
    tts: {
      azureVoice: 'ko-KR-SunHiNeural',
      ssmlLang: 'ko-KR',
      fallbackLang: 'ko-KR',
    },
    features: {
      virtualKeyboard: true,
      grammarAwareKeywords: true,
    },
    ui: {
      quickPhrases: '빠른 연습',
    },
  },
  es: {
    id: 'es',
    label: 'Español',
    shortLabel: 'ES',
    flag: '🇪🇸',
    sttLang: 'es-ES',
    tts: {
      azureVoice: 'es-ES-ElviraNeural',
      ssmlLang: 'es-ES',
      fallbackLang: 'es-ES',
    },
    features: {
      virtualKeyboard: false,
      grammarAwareKeywords: false,
    },
    ui: {
      quickPhrases: 'Práctica Rápida',
    },
  },
  fr: {
    id: 'fr',
    label: 'French',
    shortLabel: 'FR',
    flag: '🇫🇷',
    sttLang: 'fr-FR',
    tts: {
      azureVoice: 'fr-FR-CelesteNeural',
      ssmlLang: 'fr-FR',
      fallbackLang: 'fr-FR',
    },
    features: {
      virtualKeyboard: false,
      grammarAwareKeywords: false,
    },
    ui: {
      quickPhrases: 'Pratique Rapide',
    },
  },
  zh: {
    id: 'zh',
    label: '中文',
    shortLabel: 'ZH',
    flag: '🇨🇳',
    sttLang: 'zh-CN',
    tts: {
      azureVoice: 'zh-CN-XiaoxiaoNeural',
      ssmlLang: 'zh-CN',
      fallbackLang: 'zh-CN',
    },
    features: {
      virtualKeyboard: false,
      grammarAwareKeywords: false,
    },
    ui: {
      quickPhrases: '快速练习',
    },
  },
};

/**
 * Get language config by ID, with fallback to Korean if not found
 */
export function getLanguageConfig(languageId = 'ko') {
  return LANGUAGES[languageId] || LANGUAGES['ko'];
}

/**
 * Get list of all supported language IDs
 */
export function getSupportedLanguages() {
  return Object.keys(LANGUAGES);
}
