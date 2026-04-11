const AZURE_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_SPEECH_ENDPOINT;

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
  if (!AZURE_KEY || !AZURE_ENDPOINT) {
    throw new Error('Azure Speech credentials not configured');
  }

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">
  <voice name="${voice}">
    <prosody rate="${rate}">${escapeXml(text)}</prosody>
  </voice>
</speak>`;

  const response = await fetch(`${AZURE_ENDPOINT}/tts/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
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
  return !!(AZURE_KEY && AZURE_ENDPOINT);
}
