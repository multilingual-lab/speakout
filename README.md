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

## TTS Providers

SpeakOut supports three TTS providers with automatic fallback (CDN → Azure → Browser):

| Provider | Quality | Config needed | Notes |
| -------- | ------- | ------------- | ----- |
| **Pre-recorded (CDN)** | Best | None | Pre-generated Azure TTS audio served from Cloudflare R2 |
| **Azure Speech** | Best | API key + endpoint | Real-time synthesis; requires Azure subscription |
| **Browser Built-in** | Varies | None | Uses the Web Speech API; quality depends on OS/browser |

### Pre-recorded CDN Audio

Audio files are pre-generated using Azure Speech and uploaded to Cloudflare R2. This is the default provider and requires no user configuration.

```bash
# Generate MP3s from scenario content (requires Azure credentials)
npm run generate-audio

# Upload new files to Cloudflare R2
npm run upload-audio

# Preview what would be uploaded
npm run upload-audio -- --dry-run
```

Environment variables (in `.env`):

```bash
# For audio generation
VITE_AZURE_SPEECH_KEY=...
VITE_AZURE_SPEECH_ENDPOINT=...

# CDN base URL (set automatically for production)
VITE_CDN_BASE_URL=...

# For R2 uploads
CLOUDFLARE_API_TOKEN=...
```

### Azure Speech (Optional)

Azure Speech can also be used for real-time TTS. Configure via the ⚙️ settings panel in-app, or set environment variables:

```bash
VITE_AZURE_SPEECH_KEY=...
VITE_AZURE_SPEECH_ENDPOINT=...
```

In-app `localStorage` values take priority over `.env`.

> **Note:** This is a frontend-only app. Do not deploy with exposed keys unless you add a backend proxy.

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

## Testing

```bash
npm test
```
