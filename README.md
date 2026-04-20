# SpeakOut

Multi-language speaking practice app focused on immersive, scenario-based dialogs.

## Supported Languages
- **Korean** — full content (travel, casual, work, monologues)
- **Spanish** — full dialog content (travel, casual, work)

Switch languages using the dropdown in the top-right of the topic grid.

## Core Experience
- Topic-based practice (Travel, Casual, Work)
- Two modes per topic:
	- **Practice** — multi-turn dialogs with voice input; model answers include individual 🔊 TTS playback buttons
	- **Shadowing** — listen-and-repeat drills with pronunciation scoring
- English UI, target-language content
- Monologue mode (Korean only, for now) — timed speaking with keyword tracking

## Documentation
- Multi-language architecture and roadmap: [MULTILANGUAGE_ARCHITECTURE.md](./MULTILANGUAGE_ARCHITECTURE.md)
- Full architecture and implementation context: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Run Locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Azure Speech Setup (Optional)
Azure Speech improves TTS voice quality but is **not required** — without it, the app falls back to your browser's built-in speech synthesis.

Option A — **In-app Settings** (recommended): click the ⚙️ gear icon (top-right) and enter your key + endpoint. Values are saved to `localStorage`.

Option B — **Environment variables**: create `.env` with:

```bash
VITE_AZURE_SPEECH_KEY=...
VITE_AZURE_SPEECH_ENDPOINT=...
```

localStorage values take priority over `.env`.

Note: this is currently a frontend-only app. Do not deploy with exposed keys unless you move Azure calls to a backend proxy.

## Open-Source TTS Setup (Optional)

SpeakOut supports **Piper TTS** as a self-hosted open-source provider via a bundled HTTP server.

### Quick Start

1. Download and extract Piper from [GitHub releases](https://github.com/rhasspy/piper/releases)
2. Download voice models into the same directory:
   - Korean: [neurlang/piper-onnx-kss-korean](https://huggingface.co/neurlang/piper-onnx-kss-korean) (rename to `ko_KR-kss-medium.onnx` + `.json`)
   - Spanish: [rhasspy/piper-voices es_ES-davefx-medium](https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0/es/es_ES/davefx/medium)
   - Browse all: [Piper VOICES.md](https://github.com/rhasspy/piper/blob/master/VOICES.md)
3. Start the server:

```bash
py tts_server.py
```

4. In SpeakOut Settings (⚙️), select **OpenTTS (Self-hosted)**, Base URL: `http://localhost:5500`

The server auto-discovers all `.onnx` models in the `piper/` directory. The app auto-selects the correct voice per language and shows support status in Settings. Unsupported languages fall back to browser TTS.
