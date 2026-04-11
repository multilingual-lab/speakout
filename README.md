# SpeekOut

Language speaking practice app focused on immersive, scenario-based dialogs.

## Core Experience
- Topic-based practice (Travel, Casual with Friends, Work)
- Two modes per topic:
	- **Practice** — multi-turn dialogs with voice input; model answers include individual 🔊 TTS playback buttons
	- **Shadowing** — listen-and-repeat drills with pronunciation scoring
- English UI, target-language content

## Documentation
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

## Environment
Create `.env` with:

```bash
VITE_AZURE_SPEECH_KEY=...
VITE_AZURE_SPEECH_ENDPOINT=...
```

Note: this is currently a frontend-only app. Do not deploy with exposed keys unless you move Azure calls to a backend proxy.
