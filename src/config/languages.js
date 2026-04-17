/**
 * Language Registry — central configuration for supported languages
 * Defines STT locale, TTS voice, and feature flags per language
 */

export const LANGUAGES = {
  ko: {
    id: 'ko',
    label: 'Korean',
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
  },
  es: {
    id: 'es',
    label: 'Spanish',
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
  },
  zh: {
    id: 'zh',
    label: 'Chinese (Mandarin)',
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
