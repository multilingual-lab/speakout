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
