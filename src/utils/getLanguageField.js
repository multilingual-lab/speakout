const languageAliases = {
  ko: 'korean',
  es: 'spanish',
};

/**
 * Get the target language field from an object.
 * For Korean: returns 'korean', 'promptKorean', 'modelAnswer'
 * For Spanish: returns 'spanish', 'promptSpanish', 'modelAnswerEs'
 * Falls back to 'ko' (Korean) for unknown languages.
 *
 * @param {object} obj - The object to get the field from
 * @param {string} baseFieldName - The base field name (e.g., 'modelAnswer', 'prompt')
 * @param {string} languageId - The language ID (e.g., 'ko', 'es')
 * @returns {string|null} The field value or null if not found
 */
export function getLanguageField(obj, baseFieldName, languageId = 'ko') {
  if (!obj || !baseFieldName) return null;

  if (baseFieldName === 'text') {
    const langField = languageAliases[languageId] || languageAliases.ko;
    return obj[langField] || obj.korean || null;
  }

  if (baseFieldName === 'prompt') {
    if (languageId === 'es') {
      return obj.promptSpanish || obj.promptKorean || obj.prompt || null;
    }
    return obj.promptKorean || obj.prompt || null;
  }

  if (baseFieldName === 'modelAnswer') {
    if (languageId === 'es') {
      return obj.modelAnswerEs || obj.modelAnswer || null;
    }
    return obj.modelAnswer || obj.modelAnswerEs || null;
  }

  return obj[baseFieldName] || null;
}

/**
 * Get the English translation field (always uses 'En' suffix or base name 'english')
 */
export function getEnglishField(obj, baseFieldName) {
  if (!obj || !baseFieldName) return null;

  // Direct 'english' field for text exchanges
  if (baseFieldName === 'text') {
    return obj.english || null;
  }

  // For other fields use 'En' suffix
  return obj[`${baseFieldName}En`] || obj.english || null;
}

export default { getLanguageField, getEnglishField };
