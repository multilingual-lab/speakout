/**
 * Azure TTS provider — wraps the existing azureTts service behind the
 * standard provider interface.
 */

const STORAGE_KEY = 'azure_speech_key';
const STORAGE_ENDPOINT = 'azure_speech_endpoint';

function getKey() {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_AZURE_SPEECH_KEY || '';
}

function getEndpoint() {
  return localStorage.getItem(STORAGE_ENDPOINT) || import.meta.env.VITE_AZURE_SPEECH_ENDPOINT || '';
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const azureProvider = {
  id: 'azure',
  label: 'Azure Speech',

  isConfigured() {
    return !!(getKey() && getEndpoint());
  },

  getConfig() {
    return { key: getKey(), endpoint: getEndpoint() };
  },

  saveConfig({ key, endpoint }) {
    localStorage.setItem(STORAGE_KEY, key);
    localStorage.setItem(STORAGE_ENDPOINT, endpoint);
  },

  configFields: [
    { key: 'key', label: 'Azure Speech Key', type: 'password', placeholder: 'Enter your Azure Speech key' },
    { key: 'endpoint', label: 'Azure Speech Endpoint', type: 'url', placeholder: 'https://<region>.tts.speech.microsoft.com' },
  ],

  async speak(text, { voice = 'ko-KR-SunHiNeural', ssmlLang = 'ko-KR', rate = '0.9' } = {}) {
    const key = getKey();
    const endpoint = getEndpoint();
    if (!key || !endpoint) {
      throw new Error('Azure Speech credentials not configured');
    }

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ssmlLang}">
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
    return URL.createObjectURL(audioBlob);
  },
};

export default azureProvider;
