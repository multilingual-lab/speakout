# SpeekOut — Architecture & Context

## Goal
A browser-based language speaking practice app, currently focused on Korean. The core pain point: without an immersive environment it is hard to produce spoken language in real time (user freezes up). The app solves this with scenario-based forced production practice.

## Tech Stack
- **Framework:** React + Vite (v5, Node 20.9 compatible)
- **TTS:** Azure Cognitive Services TTS REST API (`ko-KR-SunHiNeural`) with Web Speech API fallback
- **STT:** Web Speech API (`ko-KR`), Chrome required
- **Styling:** Plain CSS under `src/styles/`, dark theme (`#1a1a2e` background). Unified design system using CSS custom properties (`--color-primary`, `--color-surface`, etc.) defined in `index.css`
- **Color palette:** Slate-blue primary (`#4a6da8`) with hover/muted variants (`#5b7fbf`, `#3d5a8a`). Muted rose (`#a84f5a`) for record button, vivid rose (`#c0545f`) for active recording state. All UI tones stay in the blue-navy family — surfaces (`#16213e`, `#1e2d4d`), borders (`#2a3550`), and muted text (`#8a9abc`) share the same hue to maintain cohesion. WCAG AA contrast verified for all text-on-background pairings.
- **No backend** — all runs in the browser. Azure key stored in `.env` (gitignored)

## Environment Variables (`.env`)
```
VITE_AZURE_SPEECH_KEY=<key>
VITE_AZURE_SPEECH_ENDPOINT=<your-endpoint>
```

## Project Structure
```
src/
├── App.jsx                  # Root: manages { topicId, mode } selection state
├── data/
│   └── scenarios.js         # All content — sections → scenarios → dialogs → exchanges
├── components/
│   ├── TopicGrid.jsx         # Home page: section headers + topic cards with mode buttons
│   ├── SceneView.jsx         # Per-topic wrapper: mode toggle bar + dialog picker
│   ├── PracticeMode.jsx      # Dialog practice with scrolling chat history
│   └── ShadowMode.jsx        # Listen & repeat with Levenshtein match scoring
├── hooks/
│   └── useSpeech.js          # Azure TTS (primary) + Web Speech TTS (fallback) + STT
├── services/
│   └── azureTts.js           # Azure TTS REST API: SSML builder, fetch, blob → Audio URL
└── styles/
    ├── TopicGrid.css
    ├── SceneView.css
    ├── Shadow.css
    └── Practice.css
```

## UI Flow
```
TopicGrid (home)
  └─ Topic card → [🎙️ 실전] or [🔄 쉐도잉] button
        └─ SceneView (mode toggle bar always visible)
              ├─ Practice mode → Dialog picker → PracticeMode (chat)
              │     └─ Feedback phase: model answers with per-answer 🔊 TTS buttons
              └─ Shadow mode → ShadowMode (phrase drills)
```

## Data Model (`src/data/scenarios.js`)
```js
sections[]          // "여행 한국어" | "친구와 대화"
  └─ scenarios[]    // e.g. "카페에서", "인사하기"
        ├─ shadow[] // { korean, english, romanization }  — for ShadowMode
        └─ dialogs[]   // named dialog blocks
              └─ exchanges[]
                    // { speaker: 'other' | 'you-initiate', korean, english,
                    //   expectedResponses[], hint }
```

`you-initiate` exchanges show an English situation prompt and skip TTS playback — the user speaks first.

## Key Decisions
- **No LLM in Phase 1** — all content is pre-written JSON. LLM evaluation is a planned Phase 2 addition.
- **Dialogs over flat Q&A** — each practice dialog is a coherent multi-turn exchange (6–8 turns), not disconnected question/answer pairs.
- **Two modes on home card** — clicking a topic goes directly into practice or shadow; no intermediate mode-selector page. A toggle bar inside the topic lets you switch modes.
- **Azure TTS** — `ko-KR-SunHiNeural` neural voice. Falls back to `SpeechSynthesisUtterance` if Azure fails.
- **Levenshtein similarity** in ShadowMode for match % scoring (character-level, normalised).
- **Model answer TTS** — each model answer in the feedback phase has an individual 🔊 button. Only the clicked button shows an active (pulsing) state; others remain idle. Clicks are no-op while audio is playing to prevent overlap.
- **Recording UX** — single button toggles between "🎙️ Your turn — speak!" and "🎙️ Listening… tap to finish" with a pulsing ring animation. A `processing` phase prevents button flash on transition. Auto-detection: when the browser's speech recognition stops on its own (silence timeout), the app automatically transitions to feedback — no manual tap required.
- **Consistent button sizing** — action buttons use `min-width: 220px` to maintain visual consistency across states.

## Completed Phases
- [x] Phase 1: Vite + React scaffold
- [x] Azure TTS integration
- [x] Topic sections (Travel / Casual with Friends / Work)
- [x] Dialog-based conversation practice with chat history
- [x] Shadow mode with pronunciation scoring
- [x] Direct mode buttons on home cards (no intermediate screen)
- [x] Model answer TTS playback in practice feedback phase
- [x] Unified slate-blue design system with CSS custom properties (WCAG AA verified)
- [x] Recording UX: toggle button with pulse animation, auto-stop detection, processing phase

## Planned / Next Steps
- [ ] Ambient audio per scene (café sounds, street sounds)
- [ ] More scenario content (병원, 호텔, 택시 등)
- [ ] Dialog progress tracking / history (localStorage)
- [ ] LLM evaluation for free responses (GPT-4o-mini)
- [ ] Mobile layout improvements
- [ ] Azure Pronunciation Assessment API for detailed phoneme feedback
