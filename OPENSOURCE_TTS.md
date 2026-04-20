# Open-Source TTS Solutions for SpeakOut

SpeakOut now supports **OpenTTS**, a lightweight HTTP wrapper around popular open-source TTS engines. This guide shows how to set up and use each option for Korean speech practice.

## Quick Start

### Option 1: Coqui TTS (Recommended for Korean)

Fastest setup with good Korean voice support.

```bash
docker run --rm -it -p 5500:5500 synesthesiam/opentts:en
```

Then in SpeakOut Settings (⚙️):

- **Provider:** OpenTTS (Self-hosted)
- **Base URL:** `http://localhost:5500`
- **Voice:** `ko_KR-kss-medium`

### Option 2: pTTS (Pure Text-to-Speech)

Lightweight Python alternative, no Docker.

```bash
pip install pTTS
ptts_server --port 5500
```

Query format: `GET http://localhost:5500/api/tts?text=안녕하세요&voice=ko_KR-kss-medium`

### Option 3: OpenVoice (Multi-speaker)

For experimenting with voice cloning:

```bash
pip install openvoice
python -c "from openvoice import ToneColorConverter; ToneColorConverter.init()"
# (then wrap with a simple HTTP server)
```

## Architecture

SpeakOut's TTS fallback chain is now:

```
User selects provider in Settings
  ↓
1. Azure (if credentials configured)
   ↓ (on fail)
2. OpenTTS (if base URL configured)
   ↓ (on fail/unreachable)
3. Browser Built-in (Web Speech API)
```

Each provider is independent — missing credentials don't block fallback.

## Provider Interface

All providers conform to this interface (see [ARCHITECTURE.md](./ARCHITECTURE.md#adding-a-new-tts-provider)):

```js
{
  id: string,
  label: string,
  isConfigured: () => boolean,
  getConfig: () => object,
  saveConfig: (cfg) => void,
  speak: (text, opts) => Promise<string>,  // returns audio blob URL
  configFields: [{ key, label, type, placeholder }]
}
```

A new provider requires:

1. Create `src/services/tts/<name>Provider.js` with the interface
2. Import and add to `providers[]` in `src/services/tts/index.js`
3. Settings UI auto-renders config fields

## Adding Your Own Provider

Example: **Google Text-to-Speech** (via cloud or self-hosted proxy):

```js
// src/services/tts/googleTtsProvider.js
const googleTtsProvider = {
  id: 'google',
  label: 'Google Cloud TTS',

  isConfigured() {
    return !!localStorage.getItem('google_api_key');
  },

  getConfig() {
    return { apiKey: localStorage.getItem('google_api_key') || '' };
  },

  saveConfig({ apiKey }) {
    localStorage.setItem('google_api_key', apiKey);
  },

  configFields: [
    { key: 'apiKey', label: 'Google API Key', type: 'password', placeholder: '...' }
  ],

  async speak(text, { voice = 'ko-KR-Neural2-A' } = {}) {
    const apiKey = localStorage.getItem('google_api_key');
    const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: voice },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });

    const data = await response.json();
    const audioBlob = Buffer.from(data.audioContent, 'base64');
    return URL.createObjectURL(new Blob([audioBlob], { type: 'audio/mpeg' }));
  }
};

export default googleTtsProvider;
```

Then in `src/services/tts/index.js`:

```js
import googleTtsProvider from './googleTtsProvider.js';
const providers = [azureProvider, openTtsProvider, googleTtsProvider, browserProvider];
```

Settings UI will auto-render the "Google API Key" field.

## Known Open-Source Engines

| Engine | Korean Support | Setup | Quality |
| ------ | -------------- | ----- | ------- |
| **Coqui TTS** | ✅ kss-medium | Docker, REST API | High |
| **Espeak-ng** | ⚠️ Limited | CLI | Low |
| **TTS (Mozilla)** | ✅ (with pretrained) | Python, HTTP wrapper | Medium |
| **VITS** | ✅ (via HuggingFace) | Python, ONNX export | High |
| **Tacotron2** | ⚠️ (legacy) | Complex setup | Medium |

## Troubleshooting

**OpenTTS endpoint unreachable**

- Check firewall (port 5500 open locally)
- Verify URL in Settings: `http://localhost:5500` (without trailing slash)
- Check server logs: `docker logs <container-id>`
- Falls back to browser TTS automatically if down

**Audio plays but no voice selected**

- OpenTTS server may not have the voice model loaded
- Leave "Voice" field empty to use server default
- Or query available voices: `GET http://localhost:5500/api/voices`

**Slow synthesis**

- First call to an engine loads the model (5–30s)
- Subsequent calls much faster
- Consider running server continuously in background

## Storage

All provider credentials are stored in `localStorage` — **only configure on trusted machines**. Don't expose keys in `.env` unless running a backend proxy.

Stored keys:

- `tts_provider` → selected provider id
- `azure_speech_key`, `azure_speech_endpoint`
- `opentts_base_url`, `opentts_voice`
- Custom provider keys per implementation

## Next Steps

1. Pick an engine from the table above and follow its setup
2. Open SpeakOut Settings (⚙️)
3. Select "OpenTTS (Self-hosted)"
4. Enter base URL and optional voice
5. Go back and practice speaking

Browser built-in will kick in as fallback if the server goes down.
