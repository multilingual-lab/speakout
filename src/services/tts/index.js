/**
 * TTS Provider Registry
 *
 * Manages available TTS providers, persists the user's preferred provider,
 * and exposes a fallback-aware synthesis function.
 */
import cdnProvider from './cdnProvider.js';
import azureProvider from './azureProvider.js';
import browserProvider from './browserProvider.js';

const STORAGE_PROVIDER_KEY = 'tts_provider';

// Ordered list — first match wins during fallback.
const providers = [cdnProvider, azureProvider, browserProvider];

/**
 * Return all registered providers.
 */
export function getProviders() {
  return providers;
}

/**
 * Return the provider whose id matches, or undefined.
 */
export function getProviderById(id) {
  return providers.find((p) => p.id === id);
}

/**
 * Return the user's preferred provider id (persisted in localStorage).
 * Defaults to 'azure' for backward compatibility.
 */
export function getPreferredProviderId() {
  return localStorage.getItem(STORAGE_PROVIDER_KEY) || 'cdn';
}

/**
 * Persist the user's preferred provider id.
 */
export function setPreferredProviderId(id) {
  localStorage.setItem(STORAGE_PROVIDER_KEY, id);
}

/**
 * Resolve the active provider: the preferred one if it is configured,
 * otherwise the first configured provider, otherwise browser fallback.
 */
export function getActiveProvider() {
  const preferredId = getPreferredProviderId();
  const preferred = getProviderById(preferredId);
  if (preferred && preferred.isConfigured()) return preferred;

  // Fallback: first configured non-browser provider, then browser
  for (const p of providers) {
    if (p.id !== 'browser' && p.isConfigured()) return p;
  }
  return browserProvider;
}

/**
 * Synthesize speech with fallback chain:
 *   active provider  →  browser fallback
 *
 * Returns { audioUrl: string | null, providerId: string }
 * audioUrl is null for browser provider (it plays inline).
 */
export async function synthesize(text, opts) {
  const active = getActiveProvider();

  if (active.id !== 'browser') {
    try {
      const audioUrl = await active.speak(text, opts);
      return { audioUrl, providerId: active.id };
    } catch (err) {
      console.error(`TTS provider "${active.id}" failed, falling back to browser:`, err);
    }
  }

  // Browser fallback — always available
  const audioUrl = await browserProvider.speak(text, opts);
  return { audioUrl, providerId: 'browser' };
}

/**
 * Synthesize speech using a specific provider (no fallback).
 * Used for user model answers where browser TTS is preferred.
 */
export async function synthesizeWithProvider(text, providerId, opts) {
  const provider = getProviderById(providerId);
  if (!provider) {
    console.warn(`Provider "${providerId}" not found, falling back to browser`);
    const audioUrl = await browserProvider.speak(text, opts);
    return { audioUrl, providerId: 'browser' };
  }
  const audioUrl = await provider.speak(text, opts);
  return { audioUrl, providerId };
}
