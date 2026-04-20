/**
 * TTS Provider Interface
 *
 * Every TTS provider must export an object conforming to this shape:
 *
 * {
 *   id:            string,
 *   label:         string,
 *   isConfigured:  () => boolean,
 *   getConfig:     () => object,
 *   saveConfig:    (cfg) => void,
 *   speak:         (text, opts) => Promise<string>,   // returns audio blob URL
 *   configFields:  Array<{ key, label, type, placeholder }>
 * }
 *
 * opts shape:
 *   { voice, ssmlLang, rate }
 *
 * If speak() throws, the caller will fall back to the next provider in the chain.
 */

// Re-export nothing — this file exists only as documentation of the contract.
