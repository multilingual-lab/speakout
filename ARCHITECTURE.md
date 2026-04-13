# SpeakOut — Architecture & Context

## Goal
A browser-based language speaking practice app, currently focused on Korean. The core pain point: without an immersive environment it is hard to produce spoken language in real time (user freezes up). The app solves this with scenario-based forced production practice.

## Tech Stack
- **Framework:** React + Vite (v5, Node 20.9 compatible)
- **TTS:** Azure Cognitive Services TTS REST API (`ko-KR-SunHiNeural`) with Web Speech API fallback
- **STT:** Web Speech API (`ko-KR`), Chrome required
- **Styling:** Plain CSS under `src/styles/`, dark theme (`#1a1a2e` background). Unified design system using CSS custom properties (`--color-primary`, `--color-surface`, etc.) defined in `index.css`
- **Color palette:** Slate-blue primary (`#4a6da8`) with hover/muted variants (`#5b7fbf`, `#3d5a8a`). Muted rose (`#a84f5a`) for record button, vivid rose (`#c0545f`) for active recording state. All UI tones stay in the blue-navy family — surfaces (`#16213e`, `#1e2d4d`), borders (`#2a3550`), and muted text (`#8a9abc`) share the same hue to maintain cohesion. WCAG AA contrast verified for all text-on-background pairings.
- **No backend** — all runs in the browser. Azure key configurable via in-app Settings UI (stored in `localStorage`) with `.env` fallback

## Azure Speech Configuration
Credentials are resolved in this order:
1. **In-app Settings** (⚙️ gear icon, top-right) — saved to `localStorage`
2. **Environment variables** (`.env` fallback):
```
VITE_AZURE_SPEECH_KEY=<key>
VITE_AZURE_SPEECH_ENDPOINT=<your-endpoint>
```

## Project Structure
```
src/
├── App.jsx                  # Root: manages { topicId, mode } selection state
├── main.jsx                 # Entry point with ErrorBoundary wrapper
├── data/
│   └── scenarios.js         # All content — sections → scenarios → dialogs → exchanges
├── components/
│   ├── TopicGrid.jsx         # Home page: section headers + topic cards with mode buttons
│   ├── SceneView.jsx         # Per-topic wrapper: mode toggle bar + dialog picker
│   ├── PracticeMode.jsx      # Dialog practice with scrolling chat history
│   ├── ShadowMode.jsx        # Listen & repeat with Levenshtein match scoring
│   └── Settings.jsx          # Azure key/endpoint config modal (localStorage)
├── hooks/
│   └── useSpeech.js          # Azure TTS (primary) + Web Speech TTS (fallback) + STT
├── services/
│   └── azureTts.js           # Azure TTS REST API: SSML builder, fetch, blob → Audio URL
│                             # getAzureConfig/saveAzureConfig — localStorage with env fallback
└── styles/
    ├── TopicGrid.css
    ├── SceneView.css
    ├── Shadow.css
    ├── Practice.css
    └── Settings.css
```

## UI Flow
```
TopicGrid (home)          ⚙️ Settings gear (always visible, top-right)
  └─ Topic card → [🎙️ 실전] or [🔄 쉐도잉] button
        └─ SceneView (mode toggle bar always visible)
              ├─ Practice mode → Dialog picker → PracticeMode (chat)
              │     └─ Feedback phase: model answers with per-answer 🔊 TTS buttons
              └─ Shadow mode → Session picker → ShadowMode
                    ├─ Quick Phrases (original phrase drills)
                    └─ Dialog Shadow (shadow full conversations with context)
```

## Data Model (`src/data/scenarios.js`)
```js
sections[]          // "여행 한국어" | "친구와 대화" | "직장 한국어"
  └─ scenarios[]    // e.g. "카페에서", "인사하기"
        ├─ shadow[] // { korean, english }  — for ShadowMode quick phrases
        └─ sessions[]   // named dialog sessions
              └─ exchanges[]
                    // { speaker: 'other' | 'you-initiate', korean, english,
                    //   expectedResponses[], hint, englishResponse, level? }
```

`you-initiate` exchanges show an English situation prompt and skip TTS playback — the user speaks first.

**expectedResponses ordering rule:** `expectedResponses[0]` must be the response that flows naturally into the *next* exchange's prompt, because dialog shadowing uses `[0]` to build the conversation. Other responses are alternatives for practice mode (order doesn't matter there).

## Key Decisions
- **No LLM in Phase 1** — all content is pre-written JSON. LLM evaluation is a planned Phase 2 addition.
- **Dialogs over flat Q&A** — each practice dialog is a coherent multi-turn exchange (6–8 turns), not disconnected question/answer pairs.
- **Two modes on home card** — clicking a topic goes directly into practice or shadow; no intermediate mode-selector page. A toggle bar inside the topic lets you switch modes.
- **Azure TTS** — `ko-KR-SunHiNeural` neural voice. Falls back to `SpeechSynthesisUtterance` if Azure fails.
- **Similarity scoring** — Levenshtein-based character similarity with Korean-aware normalization: strips punctuation, emoticons (ㅋㅎㅠㅜ), trailing formality particle (요), and whitespace before comparison.
- **Dialog shadowing** — shadow mode now has a session picker like practice mode. Users can choose "Quick Phrases" (original phrase drills) or any dialog session. Dialog shadow flattens exchanges into sequential lines (both sides of the conversation), showing past lines as scrollable context above the current line. For `you-initiate` exchanges, the first expected response is used as the shadow target.
- **Immersion-first** — shadow mode shows Korean only by default. English translation is behind a "Show English" toggle. Model answers in practice mode are Korean-only — no translations added to avoid creating a crutch. Users who need translation can use external tools.
- **Pinned action bars** — both modes use a scroll-area + pinned-bottom-bar layout. In shadow mode, Listen/Record + Previous/Next are pinned at the bottom. In practice mode, Retry/Next are pinned at the bottom during feedback phase. Scrollbars are hidden (`scrollbar-width: none`) for cleaner appearance. The scene container uses `height: 100vh` with `overflow: hidden` to prevent full-page scrolling.
- **Retry auto-records** — tapping Retry in practice feedback automatically starts recording after a brief delay, so users don't have to tap twice (Retry then Record).
- **Model answer TTS** — each model answer in the feedback phase has an individual 🔊 button. Only the clicked button shows an active (pulsing) state; others remain idle. Clicks are no-op while audio is playing to prevent overlap.
- **Recording UX** — single button toggles between "🎙️ Your turn — speak!" and "🎙️ Listening… tap to finish" with a pulsing ring animation. A `processing` phase prevents button flash on transition. Auto-detection: when the browser's speech recognition stops on its own (silence timeout), the app automatically transitions to feedback — no manual tap required.
- **Consistent button sizing** — action buttons use `min-width: 220px` to maintain visual consistency across states.

## Content Quality Rules
- **Formality consistency:** Travel/service scenarios use 해요체 (polite conversational). Casual/friend scenarios use 반말. Work/interview scenarios use 합니다체 (formal). Never mix registers within a scenario.
- **Response ordering:** `expectedResponses[0]` must connect naturally to the next exchange's prompt (see Data Model section).
- **Dialog coherence:** Each session's exchanges must form a logical, flowing conversation from start to finish.

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
- [x] In-app Settings UI for Azure key/endpoint (localStorage with .env fallback)
- [x] Dialog shadowing mode (shadow full conversations with session picker)
- [x] Pinned bottom bars for stable button positioning in both modes
- [x] Retry auto-record in practice mode
- [x] Content quality review: formality consistency (합니다체 for work, 해요체 for travel, 반말 for casual), response ordering for shadow flow
- [x] Removed romanization — immersion-first, only Korean + English toggle
- [x] Slim inline result bar for shadow mode (replaces stacked card)
- [x] Shadow "Finished ✓" indicator on last item
- [x] Difficulty level badges (beginner / intermediate / advanced)
- [x] English translations for user responses (`englishResponse` field) in shadow mode
- [x] Code quality: fixed Promise anti-pattern, added error states to useSpeech, error boundary, Korean-aware similarity scoring

## Planned / Next Steps
- [ ] Ambient audio per scene (café sounds, street sounds)
- [ ] More scenario content (병원, 호텔, 택시 등)
- [ ] Dialog progress tracking / history (localStorage)
- [ ] LLM evaluation for free responses (GPT-4o-mini)
- [ ] Mobile layout improvements
- [ ] Azure Pronunciation Assessment API for detailed phoneme feedback
