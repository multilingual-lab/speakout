/**
 * Browser TTS provider — uses the Web Speech API (speechSynthesis).
 * Always available, no configuration needed. Used as the final fallback.
 */

const browserProvider = {
  id: 'browser',
  label: 'Browser Built-in',

  isConfigured() {
    return typeof speechSynthesis !== 'undefined';
  },

  getConfig() {
    return {};
  },

  saveConfig() {
    // no-op — nothing to persist
  },

  configFields: [],

  speak(text, { ssmlLang = 'ko-KR', rate = '0.9' } = {}) {
    return new Promise((resolve, reject) => {
      if (typeof speechSynthesis === 'undefined') {
        reject(new Error('Web Speech API not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = ssmlLang;
      utterance.rate = parseFloat(rate) || 0.9;

      // Resolve with null — callers use onended/onerror on utterance or
      // detect null audioUrl to know this was browser-based playback.
      utterance.onend = () => resolve(null);
      utterance.onerror = (e) => reject(new Error(`Browser TTS error: ${e.error}`));

      speechSynthesis.speak(utterance);
    });
  },
};

export default browserProvider;
