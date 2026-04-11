const STORAGE_KEY = 'azure_speech_key';
const STORAGE_ENDPOINT = 'azure_speech_endpoint';

function getAzureKey() {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_AZURE_SPEECH_KEY || '';
}

function getAzureEndpoint() {
  return localStorage.getItem(STORAGE_ENDPOINT) || import.meta.env.VITE_AZURE_SPEECH_ENDPOINT || '';
}

export function getAzureConfig() {
  return { key: getAzureKey(), endpoint: getAzureEndpoint() };
}

export function saveAzureConfig(key, endpoint) {
  localStorage.setItem(STORAGE_KEY, key);
  localStorage.setItem(STORAGE_ENDPOINT, endpoint);
}

// Sanitize text for safe SSML embedding
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Synthesize Korean speech using Azure TTS REST API.
 * Returns an Audio element that can be played.
 */
export async function azureSpeak(text, { voice = 'ko-KR-SunHiNeural', rate = '0.9' } = {}) {
  const key = getAzureKey();
  const endpoint = getAzureEndpoint();
  if (!key || !endpoint) {
    throw new Error('Azure Speech credentials not configured');
  }

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">
  <voice name="${voice}">
    <prosody rate="${rate}">${escapeXml(text)}</prosody>
  </voice>
</speak>`;

  const response = await fetch(`${endpoint}/tts/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure TTS failed (${response.status}): ${errorText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  return audioUrl;
}

export function isAzureConfigured() {
  return !!(getAzureKey() && getAzureEndpoint());
}
