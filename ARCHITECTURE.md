# SpeakOut — Architecture & Context

## Goal

Browser-based Korean speaking practice app. Solves the "freeze-up" problem — without immersion, learners can't produce spoken language in real time. Uses scenario-based forced production drills.

## Tech Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Framework | React + Vite v5 | Node 20.9+, no backend — 100% browser |
| TTS | Azure Cognitive Services (`ko-KR-SunHiNeural`) | Web Speech API fallback if Azure fails |
| STT | Web Speech API (`ko-KR`) | Chrome required |
| Styling | Plain CSS + custom properties | Dark slate-blue theme, WCAG AA verified |
| Storage | `localStorage` | Azure creds, future: progress tracking |
| Testing | Vitest | `npm test` — schema validation + scoring unit tests |
| Content | Pre-authored JSON | No LLM yet (planned Phase 2) |

## Project Structure

```text
src/
├── App.jsx                  # Root: manages { topicId, mode } selection state
├── main.jsx                 # Entry point with ErrorBoundary wrapper
├── data/
│   └── scenarios.js         # All content — sections → scenarios → dialogs → exchanges
├── components/
│   ├── TopicGrid.jsx         # Home: section headers + topic cards with mode buttons
│   ├── SceneView.jsx         # Per-topic wrapper: mode toggle + dialog/monologue picker
│   ├── PracticeMode.jsx      # Dialog practice with scrolling chat history
│   ├── ShadowMode.jsx        # Listen & repeat with Levenshtein match scoring
│   ├── MonologueMode.jsx     # Extended speaking: prompt → record → review
│   ├── Settings.jsx          # Azure key/endpoint config modal
│   └── charts/
│       └── TopikCharts.jsx   # TOPIK-style bar/line/pie SVG charts for monologue prompts
├── utils/
│   └── scoring.js            # Korean-aware normalize + Levenshtein similarity
├── hooks/
│   └── useSpeech.js          # TTS (Azure primary, Web Speech fallback) + STT
├── services/
│   └── azureTts.js           # Azure TTS REST: SSML builder, fetch, blob → Audio URL
│                             #   getAzureConfig/saveAzureConfig (localStorage + env fallback)
└── styles/                   # One CSS file per component
```

## Configuration

Azure credentials resolve in order:

1. **In-app Settings** (⚙️ gear icon, top-right) → `localStorage`
2. **`.env` fallback:** `VITE_AZURE_SPEECH_KEY`, `VITE_AZURE_SPEECH_ENDPOINT`

## Data Model (`src/data/scenarios.js`)

```js
sections[]            // "여행 한국어" | "친구와 대화" | "직장 한국어" | "말하기 연습"
  └─ scenarios[]      // e.g. "카페에서", "인사하기", "의견 말하기"
        // ── Dialog scenarios (have sessions[]):
        ├─ shadow[]           // { korean, english } — quick phrases for ShadowMode
        └─ sessions[]         // named dialog sessions
              └─ exchanges[]
                    // { speaker: 'other'|'you-initiate', korean, english,
                    //   expectedResponses[], hint, englishResponse, level? }
        // ── Monologue scenarios (have monologues[], mutually exclusive with sessions):
        └─ monologues[]
              // { id, title, titleEn, level, prompt, promptKorean, duration,
              //   keywords[], drills[], modelAnswer, modelAnswerEn, chartId? }
              //   drills[]: { term, meaning, example }
```

### Content Rules (must follow when adding/editing scenarios)

- **`expectedResponses[0]`** must flow naturally into the *next* exchange — dialog shadowing uses `[0]` to build conversation sequence. Other responses are unordered alternatives for practice mode.
- **`you-initiate`** exchanges show an English situation prompt and skip TTS — user speaks first.
- **Formality registers — never mix within a scenario:**
  - Travel/service → 해요체 (polite conversational)
  - Casual/friends → 반말
  - Work/interview → 합니다체 (formal)
- **Dialog coherence:** each session's exchanges must form a logical multi-turn conversation (6–8 turns), not disconnected Q&A.
- **Monologue scenarios** live in their own section ("말하기 연습"), detected by presence of `monologues[]` instead of `sessions[]`.

## UI Flow

```text
TopicGrid (home)              ⚙️ Settings (always visible, top-right)
  ├─ Dialog topic card → [🎙️ 실전] or [🔄 쉐도잉]
  │     └─ SceneView (mode toggle bar visible)
  │           ├─ Practice → Dialog picker → PracticeMode
  │           │     ├─ Respond phase → Feedback phase (model answers + 🔊)
  │           │     └─ "Next: <dialog>" or "last dialog" indicator
  │           └─ Shadow → Session picker → ShadowMode
  │                 ├─ Quick Phrases (phrase drills)
  │                 └─ Dialog Shadow (full conversation, sequential lines)
  │                       └─ "Next: <dialog>" or "last dialog" indicator
  └─ Monologue topic card → [Monologue]
        └─ SceneView (no mode toggle)
              └─ Topic picker → MonologueMode
                    ├─ Prompt phase (Korean/English prompt, keywords, optional warm-up drill)
                    ├─ Recording phase (timer + live transcript)
                    └─ Review phase (transcript, keyword checklist, model answer + TTS)
```

## Behavioral Specifications

### Speech Recognition (STT)

- **Practice/Shadow:** single-result mode (`continuous: false`) on all platforms
- **Monologue (desktop):** `continuous: true` with 10s idle timeout resetting on each phrase
- **Monologue (mobile):** falls back to `continuous: false` via `isMobile` UA detection
- **Safety caps:** 60s single / 120s continuous max duration
- **Auto-stop:** when browser recognition ends on its own, app transitions to feedback automatically
- **No auto-restart** on session end (avoids beep on mobile Chrome from repeated `.start()`)

### Recording UX

- Single toggle button: "🎙️ Your turn — speak!" ↔ "🎙️ Listening… tap to finish" with pulsing ring animation
- Exchange `hint` shown as status prompt (e.g. "🎤 Order a drink")
- `processing` phase prevents button flash between states
- **Retry auto-records:** tapping Retry starts recording after brief delay (no double-tap)

### TTS Playback

- Azure `ko-KR-SunHiNeural` primary, `SpeechSynthesisUtterance` fallback
- Feedback phase: per-answer 🔊 buttons. Only clicked button pulses; others idle. Clicks are no-op while audio plays.

### Scoring (`src/utils/scoring.js`)

- Levenshtein character similarity with Korean-aware normalization
- Strips: punctuation, emoticons (ㅋㅎㅠㅜ), trailing 요, whitespace

### Keyword Matching (monologue review)

Grammar-aware `keywordMatchesTranscript`:

- `(으)ㄹ` → checks ㄹ 받침 (e.g. `~(으)ㄹ 거예요` matches "할 거예요") or `을` for consonant stems
- `(으)`, `(이)` → optional syllable, matches with or without
- `/` alternatives → e.g. `~아서/~어서` matches either side

### Monologue-Specific

- Monologues with `chartId` render TOPIK-style charts via `TopikCharts.jsx` inside prompt card
- `drills[]` → optional warm-up: listen-only flashcards (example sentence + 🔊 + term/meaning), paged before full monologue
- Keywords always visible in prompt phase; review shows match highlighting

### Navigation & Layout

- **Immersion-first:** Korean only by default in shadow mode; English behind toggle. Practice model answers Korean-only.
- **Two modes on home card:** direct entry into practice or shadow — no intermediate screen. Toggle bar inside topic preserves dialog selection.
- **Scroll position restore:** `App.jsx` saves `scrollY` in ref before sub-page; restores via `requestAnimationFrame` on back.
- **Dialog lists** sorted by difficulty (beginner → intermediate → advanced).

## CSS / Layout Patterns

### Design System (`index.css` custom properties)

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--color-primary` | `#4a6da8` | Primary actions, links |
| hover/muted | `#5b7fbf` / `#3d5a8a` | Hover, secondary |
| record | `#a84f5a` → `#c0545f` active | Record button states |
| surfaces | `#16213e`, `#1e2d4d` | Cards, panels |
| borders | `#2a3550` | Dividers |
| muted text | `#8a9abc` | Secondary text |
| background | `#1a1a2e` | Page background |

All tones in blue-navy family for cohesion. WCAG AA verified.

### Pinned Bottom Bars

All three modes: scroll-area + pinned-bottom-bar. Scene container `height: 100vh; overflow: hidden`. Scrollbars hidden (`scrollbar-width: none`).

**Mobile (≤768px):** bottom bars become `position: fixed; bottom: 0` with `calc(env(safe-area-inset-bottom, 0px) + 1.25rem)` padding. 200px scroll-area bottom padding to compensate. Bottom spacing set *inside* the bar (fixed bars escape container padding).

**CSS specificity pitfall:** `.practice-bottom-bar.respond-bar` (2-class) overrides single-class mobile rule — always add matching `.respond-bar` override inside the media query.

### Button Sizing

Action buttons: `min-width: 220px` for visual consistency across states.

## Conventions

### Markdown

All `.md` files must pass **markdownlint** with zero warnings. Key rules:

- Blank lines around headings (MD022), lists (MD032), tables (MD058), fenced code blocks (MD031)
- Fenced code blocks must have a language tag (MD040) — use `text` for plain diagrams/trees
- Table separator rows need spaces: `| ----- |` not `|-------|` (MD060)

## Known Issues

- **Mobile Chrome STT duplication:** `continuous: true` mode re-delivers finalized results → duplicate words. Workaround: mobile uses `continuous: false`.

## Roadmap

- [ ] Ambient audio per scene (café sounds, street sounds)
- [ ] More scenario content (병원, 호텔, 택시 등)
- [ ] Dialog progress tracking / history (localStorage)
- [ ] LLM evaluation for free responses (GPT-4o-mini)
- [ ] Mobile layout improvements
- [ ] Azure Pronunciation Assessment API for phoneme feedback
