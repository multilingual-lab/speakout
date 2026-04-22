# SpeakOut — Architecture & Context

## Goal

Multi-language speaking practice app. Solves the "freeze-up" problem — without immersion, learners can't produce spoken language in real time. Uses scenario-based forced production drills.

Supported target languages: Korean, Spanish (with Chinese planned). Language selection via in-page dropdown; all speech, scoring, and content are language-aware.

## Tech Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Framework | React + Vite v5 | Node 20.9+, no backend — 100% browser |
| TTS | Provider-based: CDN, Azure, Browser, extensible | Fallback chain: CDN → Azure → browser |
| STT | Web Speech API | Chrome required; locale resolved from language registry |
| Styling | Plain CSS + custom properties | Dark slate-blue theme, WCAG AA verified |
| Storage | `localStorage` | Azure creds, language selection, future: progress tracking |
| Testing | Vitest | `npm test` — schema validation + scoring + adapter unit tests |
| Content | Pre-authored JSON | No LLM yet (planned Phase 2) |
| Audio CDN | Cloudflare R2 | Pre-generated Azure TTS audio; CORS configured via `r2-cors.json` |

## Project Structure

```text
src/
├── App.jsx                  # Root: manages { topicId, mode, language } selection state
├── main.jsx                 # Entry point with ErrorBoundary wrapper
├── config/
│   └── languages.js         # Language registry: STT locale, TTS voice, feature flags per language
├── data/
│   ├── scenarios.js         # All content — sections → scenarios → dialogs → exchanges
│   └── audioManifest.json   # Maps "lang:text" keys → CDN filenames (auto-generated)
├── components/
│   ├── TopicGrid.jsx         # Home: language selector + section headers + topic cards
│   ├── SceneView.jsx         # Per-topic wrapper: mode toggle + dialog/monologue picker
│   ├── PracticeMode.jsx      # Dialog practice with scrolling chat history
│   ├── ShadowMode.jsx        # Listen & repeat with Levenshtein match scoring
│   ├── MonologueMode.jsx     # Extended speaking: prompt → record → review
│   ├── WritingMode.jsx        # Writing practice: phrase dictation + composition
│   ├── KoreanKeyboardRef.jsx  # Virtual Korean keyboard (feature-flagged per language)
│   ├── Settings.jsx          # Azure key/endpoint config modal
│   ├── AuthModal.jsx         # Sign-in / sign-up / forgot-password flows
│   ├── AuthModal.test.jsx    # Auth flow tests (14 tests)
│   ├── MyPage.jsx            # User profile & saved progress (auth-gated)
│   └── charts/
│       └── TopikCharts.jsx   # TOPIK-style bar/line/pie SVG charts for monologue prompts
├── hooks/
│   ├── useSpeech.js          # TTS + STT (language-aware via registry)
│   └── useAuth.js            # Auth state & session management (Supabase)
├── services/
│   ├── supabase.js           # Supabase client initialization
│   └── tts/                  # Provider-based TTS abstraction
│       ├── index.js          # Registry: getProviders, getActiveProvider, synthesize
│       ├── provider.js       # Interface contract documentation
│       ├── cdnProvider.js    # CDN adapter: audioManifest lookup → R2 fetch
│       ├── azureProvider.js  # Azure TTS adapter (SSML builder, fetch, blob → Audio URL)
│       └── browserProvider.js # Web Speech API adapter (final fallback)
├── styles/                   # One CSS file per component (incl. Auth.css)
├── utils/
│   ├── scoring.js            # Re-exports from adapter layer
│   ├── getLanguageField.js   # Language-aware field accessor for content objects
│   └── adapters/             # Language-specific text processing
│       ├── index.js          # Adapter dispatch + default adapter
│       ├── korean.js         # Korean: grammar-aware keywords, jamo normalization
│       └── spanish.js        # Spanish: accent-insensitive normalization
├── test-setup.js             # Vitest setup (testing-library DOM assertions)
scripts/
├── generate-audio.mjs       # Azure TTS → MP3 files + audioManifest.json
└── upload-audio.mjs         # Upload new MP3s to Cloudflare R2
```

## Configuration

### TTS Provider Selection

Users choose a TTS provider in Settings (⚙️ gear icon). Selection is persisted in `localStorage` key `tts_provider`. Default: `azure`.

Built-in providers:

- `cdn` — pre-generated audio files served from CDN
- `azure` — cloud neural voice
- `browser` — Web Speech API fallback

The provider registry (`src/services/tts/index.js`) resolves the active provider:

1. **Preferred provider** — if configured, use it
2. **First configured non-browser provider** — fallback
3. **Browser built-in** — always-available final fallback

### Azure Credentials

Azure credentials resolve in order:

1. **In-app Settings** (⚙️ gear icon, top-right) → `localStorage`
2. **`.env` fallback:** `VITE_AZURE_SPEECH_KEY`, `VITE_AZURE_SPEECH_ENDPOINT`

### Language System

#### Language Registry (`src/config/languages.js`)

Single source of truth for per-language configuration:

- `sttLang` — Web Speech API recognition locale (e.g. `ko-KR`, `es-ES`)
- `tts.azureVoice` — Azure neural voice name
- `tts.ssmlLang` — SSML language tag
- `tts.fallbackLang` — browser TTS fallback locale
- Feature flags — `virtualKeyboard`, `grammarAwareKeywords`

Unknown language IDs resolve to Korean fallback. All speech code reads from the registry.

#### Language Adapters (`src/utils/adapters/`)

Language-sensitive text processing behind a dispatch layer:

- `getAdapter(languageId)` → returns language-specific or default adapter
- **Default adapter:** Unicode punctuation/whitespace strip + plain substring keyword match
- **Korean adapter:** grammar-aware patterns (`(으)ㄹ`, `(으)`, `(이)`, `/` alternatives)
- **Spanish adapter:** accent-insensitive normalization

Adapter interface per language:

- `normalize(text)` — strip noise characters, normalize whitespace/punctuation
- `computeSimilarity(target, spoken)` — Levenshtein or language-appropriate scoring
- `matchKeywords(transcript, keywords)` — grammar-aware keyword detection

#### Language-Aware Content Access (`src/utils/getLanguageField.js`)

Utility to resolve the correct text field from content objects based on selected language. Components use this instead of hardcoded field names.

#### Language Selection

In-page dropdown in TopicGrid header. Persisted in `localStorage`. Sections filtered by `languageId` metadata.

### Audio Pipeline (CDN Pre-generation)

Pre-generated Azure TTS audio served from Cloudflare R2 — zero-latency, no API key needed for end users.

#### What Gets CDN Audio

| Source | Gets CDN audio? | Why |
| ------ | --------------- | --- |
| Shadow phrases (`shadow[]`) | Yes | Core drill content |
| NPC dialog lines (`speaker: 'other'`) | Yes | Auto-played in Practice/Shadow modes |
| Monologue model answers (`modelAnswer`) | Yes | "Listen to model" button |
| Monologue prompts (`promptKorean` / `promptSpanish`) | Yes | Prompt speaker button |
| Grammar drill examples (`grammarDrills[].example`) | Yes | Dictation drill speaker button |
| User model answers (`expectedResponses[]`) | No | Short phrases; browser TTS is fine |
| `you-initiate` exchange text | No | Never spoken by TTS (user speaks first) |

#### Workflow

1. **Generate:** `node scripts/generate-audio.mjs` — reads `scenarios.js`, extracts all TTS-able lines (see table above), generates MP3 via Azure Speech at 0.9× speed, deduplicates by `lang:text` key, writes files to `public/audio/` with content-hash filenames, updates `src/data/audioManifest.json`
2. **Upload:** `node scripts/upload-audio.mjs` — uploads files where `uploaded: false` to R2 via S3 API, marks them `uploaded: true` in manifest
3. **Commit:** updated `audioManifest.json` is committed to git (tracks upload status across machines)

#### Adding a New Language

1. Add voice mapping in `scripts/generate-audio.mjs` `VOICE_MAP` (e.g. `zh: { voice: 'zh-CN-XiaoxiaoNeural', ssmlLang: 'zh-CN' }`)
2. Add language config in `src/config/languages.js`
3. Add scenarios with the new `languageId` and language-specific fields (e.g. `chinese`)
4. Run generate → upload → commit

#### Adding New Topics / Scenarios

1. Add scenario data in `src/data/scenarios.js`
2. Run `node scripts/generate-audio.mjs --dry-run` to preview new entries
3. Run `node scripts/generate-audio.mjs` (requires `AZURE_SPEECH_KEY` and `AZURE_SPEECH_ENDPOINT` env vars)
4. Run `node scripts/upload-audio.mjs` (requires `CLOUDFLARE_API_TOKEN` in `.env`)
5. Commit updated `audioManifest.json` and `public/audio/` files
6. Run `npm test` to validate scenario schema

#### Keeping Audio and Text Aligned

- The manifest key is `"lang:exactText"` — any text change (even punctuation) creates a new entry
- `generate-audio.mjs` is incremental: only generates files not already in the manifest
- `--dry-run` shows the full list without calling Azure; compare count vs manifest to spot gaps
- CDN provider does fuzzy punctuation matching at runtime (strips trailing `.!?` for lookup)
- If you rename/edit scenario text, old manifest entries become orphans (harmless but wasteful); periodically prune by re-generating with `--force`

#### Options

- `--dry-run` — list what would be generated/uploaded without acting
- `--force` — re-generate or re-upload all files

#### R2 Configuration

- Bucket: `speakout`, public URL: `https://pub-*.r2.dev/audio/`
- CORS rules: `r2-cors.json` (allow all origins, GET/HEAD)
- Cache: `public, max-age=31536000, immutable`

## Data Model (`src/data/scenarios.js`)

```js
sections[]            // Each has languageId: 'ko' | 'es' | 'zh' | ...
  └─ scenarios[]      // e.g. "카페에서", "En la cafetería"
        // ── Dialog scenarios (have sessions[]):
        ├─ shadow[]           // { korean|spanish|..., english } — quick phrases for ShadowMode
        └─ sessions[]         // named dialog sessions
              └─ exchanges[]
                    // { speaker: 'other'|'you-initiate', korean|spanish|..., english,
                    //   expectedResponses[], hint, englishResponse, level? }
        // ── Monologue scenarios (have monologues[], mutually exclusive with sessions):
        └─ monologues[]
              // { id, title, titleEn, level, prompt, promptKorean, duration,
              //   keywords[], drills[], modelAnswer, modelAnswerEn, chartId? }
              //   drills[]: { term, meaning, example }
```

Content uses language-specific field names (e.g. `korean`, `spanish`) resolved at runtime via `getLanguageField()`. Schema v2 migration to language-neutral fields (`targetText`, `supportTextByLocale`) is planned but deferred.

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
  │     └─ SceneView (mode toggle: Practice | Shadowing)
  │           ├─ Practice → Dialog picker → PracticeMode
  │           │     ├─ Respond phase → Feedback phase (model answers + 🔊)
  │           │     └─ "Next: <dialog>" or "last dialog" indicator
  │           ├─ Shadow → Session picker → ShadowMode
  │           │     ├─ Quick Phrases (phrase drills)
  │           │     └─ Dialog Shadow (full conversation, sequential lines)
  │           │           └─ "Next: <dialog>" or "last dialog" indicator
  │           └─ "✍️ practice writing" link (in session picker) → WritingMode
      │                 └─ Phrase dictation: English → type Korean → score bar; on submit reveal Korean under English
  └─ Monologue topic card → [Monologue]
        └─ SceneView (no mode toggle)
              └─ Topic picker → MonologueMode
                    ├─ Prompt phase (keywords, optional warm-up drill, "✍️ practice writing" link)
                    ├─ Recording phase (timer + live transcript)
                    ├─ Review phase (transcript, keyword checklist, model answer + TTS)
                    └─ "✍️ practice writing" → WritingMode (composition)
                          ├─ Writing phase (textarea + char count + keywords)
                          └─ Review phase (keyword checklist, model answer + TTS)
```

## Behavioral Specifications

### Speech Recognition (STT)

- **Practice/Shadow:** single-result mode (`continuous: false`) on all platforms
- **Monologue (laptop/desktop input):** `continuous: true` with 15s idle timeout resetting on each phrase
- **Monologue (touch/mobile input):** falls back to `continuous: false` (mobile UA detection)
- **Safety caps:** 60s single / 120s continuous max duration
- **Auto-stop:** when browser recognition ends on its own, app transitions to feedback automatically
- **No auto-restart** on session end (avoids beep on mobile Chrome from repeated `.start()`)

### Recording UX

- Single toggle button: "🎙️ Your turn — speak!" ↔ "🎙️ Listening… tap to finish" with pulsing ring animation
- Exchange `hint` shown as status prompt (e.g. "🎤 Order a drink")
- `processing` phase prevents button flash between states
- **Retry auto-records:** tapping Retry starts recording after brief delay (no double-tap)

### TTS Playback

- Provider-based: `useSpeech.speak()` calls `synthesize()` from the TTS registry
- Fallback chain: preferred provider → browser `SpeechSynthesisUtterance`
- Azure provider returns audio blob URL played via `new Audio(url)`
- Browser provider plays inline via `speechSynthesis.speak()` (returns null URL)
- Feedback phase: per-answer 🔊 buttons. Only clicked button pulses; others idle. Clicks are no-op while audio plays.

#### Adding a New TTS Provider

1. Create `src/services/tts/<name>Provider.js` exporting the provider interface (`id`, `label`, `isConfigured`, `getConfig`, `saveConfig`, `speak`, `configFields`)
2. Import and add it to the `providers` array in `src/services/tts/index.js`
3. Settings UI auto-renders config fields from `configFields` — no component changes needed

### Scoring (`src/utils/scoring.js` → adapter dispatch)

Scoring and normalization are routed through the language adapter layer:

- **Default:** Levenshtein character similarity with Unicode punctuation/whitespace strip
- **Korean:** grammar-aware normalization (jamo handling)
- **Spanish:** accent-insensitive normalization

### Keyword Matching (monologue review)

Keyword matching is routed through the adapter's `matchKeywords()`. Korean adapter implements grammar-aware patterns:

- `(으)ㄹ` → checks ㄹ 받침 (e.g. `~(으)ㄹ 거예요` matches "할 거예요") or `을` for consonant stems
- `(으)`, `(이)` → optional syllable, matches with or without
- `/` alternatives → e.g. `~아서/~어서` matches either side

Default and Spanish adapters use plain substring matching.

### Monologue-Specific

- Monologues with `chartId` render TOPIK-style charts via `TopikCharts.jsx` inside prompt card
- `drills[]` → optional warm-up: listen-only flashcards (example sentence + 🔊 + term/meaning), paged before full monologue
- Keywords always visible in prompt phase; review shows match highlighting

### Writing Mode (addon)

Writing mode is an optional addon — speakout is primarily a speaking app. Entry points are secondary links, not primary mode toggles:

- **Dialog scenarios:** "✍️ practice writing" link appears in the session picker next to "Choose a dialog" / "Choose what to shadow"
- **Monologue scenarios:** "✍️ practice writing" link appears in the keywords area next to "📝 warm up"

**Two flows in one component (`WritingMode.jsx`):**

- **Phrase dictation** (dialog scenarios): uses `shadow[]` quick phrases. Shows English → user types Korean → `computeSimilarity()` scores the match in a compact result bar. After submit, Korean is revealed directly under the English prompt with optional TTS playback. Prev/Retry/Next navigation. No session picker needed.
- **Composition** (monologue scenarios): uses same `monologues[]` data. Shows prompt/keywords → user types response → keyword match review → model answer reveal with TTS.

Dialog phrase dictation uses a dedicated bottom action bar (`writing-bottom-bar`) for Prev/Check/Retry/Next. Composition keeps inline controls (`drill-nav` + `hint-link`). "Exit writing" returns to speaking mode.

WritingMode uses TTS only (no STT). It has its own `keywordMatchesTranscript` copy to avoid coupling with MonologueMode. Reuses monologue CSS classes for prompt/review elements to maintain visual consistency.

### Virtual Korean Keyboard (`KoreanKeyboardRef.jsx`)

Gated behind the `virtualKeyboard` feature flag in the language registry — only visible when Korean is the selected language. Hidden on mobile via CSS media query (`max-width: 768px`). Features:

- **Full 두벌식 layout** with Shift toggle for double consonants (ㅃ ㅉ ㄸ ㄲ ㅆ) and ㅒ ㅖ
- **Jamo-to-syllable composition** — implements the standard Korean IME algorithm: initial → medial → final, with compound vowel/final support and automatic final-consonant splitting when followed by a vowel
- **Backspace decomposition** — removes jamo incrementally (final → vowel → initial) rather than deleting whole syllables
- **Space** finalizes the current composition
- **Co-exists with native IME** — detects external textarea edits and resets composition state
- **Persistent toggle state** via `localStorage` (`kb-ref-open`)
- Rendered as SVG keys; receives `value` + `onChange` props from WritingMode

### Navigation & Layout

- **Immersion-first:** Korean only by default in shadow mode; English behind toggle. Practice model answers Korean-only.
- **Two modes on home card:** direct entry into practice or shadow — no intermediate screen. Toggle bar inside topic preserves dialog selection. Writing is a secondary link, not a mode toggle.
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

## Authentication (Supabase)

SpeakOut integrates optional user authentication via Supabase for progress tracking across devices.

**Architecture:**

| Component | Location | Purpose |
| --------- | -------- | ------- |
| Supabase client | `src/services/supabase.js` | Initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Auth hook | `src/hooks/useAuth.js` | Manages session state, sign-in/sign-up/reset operations, auth state listener |
| Auth modal | `src/components/AuthModal.jsx` | UI for password sign-in, sign-up, forgot password flow (tests: [AuthModal.test.jsx](./src/components/AuthModal.test.jsx)) |
| MyPage component | `src/components/MyPage.jsx` | User profile & saved progress (visible only when authenticated) |

**Auth flow:**

1. User clicks profile icon → `showAuth` state toggles AuthModal
2. AuthModal calls `useAuth` hook functions: `signInWithPassword`, `signUp`, `signInWithGoogle`, `resetPassword`
3. On success, modal closes and `user` state updates (triggers re-render in App.jsx)
4. Authenticated user sees MyPage; unauthenticated sees login prompt

**Environment variables:**

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If either is missing, `supabase` client is `null` and all auth operations become no-ops (graceful degradation).

## Testing & CI

### Test Suite

**Test runner:** Vitest (configured in `vite.config.js` with `happy-dom` environment)

**Current test coverage:**

- **Auth flow** (`src/components/AuthModal.test.jsx`): 14 tests
  - Password sign-in success/failure, input validation, modal close on success
  - Sign-up success/failure, whitespace trimming
  - Forgot-password flow and error handling
  - Google sign-in integration
  - Modal overlay and close button behavior

- **Data validation** (`src/data/scenarios.test.js`): schema validation for scenarios, dialogs, exchanges
- **Scoring** (`src/utils/scoring.test.js`): Levenshtein similarity, adapter-based scoring
- **Adapters** (`src/utils/adapters/adapters.test.js`): language-specific normalization (Korean jamo, Spanish accents)

**Run all tests:**

```bash
npm test
```

**Run a specific test file:**

```bash
npx vitest run src/components/AuthModal.test.jsx
```

**Watch mode (for development):**

```bash
npm run test:watch
```

### CI/CD Pipeline

**Local gate:** Pre-push hook at `.githooks/pre-push`

Runs before every `git push`:
- `npm test` — all tests must pass
- `npm run build` — build must succeed

If either command fails, push is aborted.

**Server gate:** GitHub Actions workflow at `.github/workflows/test.yml`

Runs on:
- Every push to `main`
- Every pull request to `main`

Job steps:
1. Checkout code
2. Setup Node.js (v22)
3. `npm ci` — install dependencies
4. `npm test` — run all tests
5. `npm run build` — build for production

**Branch protection (GitHub):**

To enforce that PRs cannot merge without passing CI:

1. Go to repo Settings → Branches
2. Add a rule for `main`:
   - Enable "Require pull request before merging"
   - Enable "Require status checks to pass before merging"
   - Select the `test` job as a required check

### Contributing

Before pushing, ensure:

```bash
npm test          # All tests pass
npm run build     # Build succeeds
```

The pre-push hook enforces this automatically. If you need to force-push (not recommended), use:

```bash
git push --no-verify
```

## Known Issues

- **Mobile Chrome STT duplication:** `continuous: true` mode re-delivers finalized results → duplicate words. Workaround: mobile uses `continuous: false`.

## Roadmap

- [ ] Chinese content (travel, casual, work — matching Spanish parity)
- [ ] Schema v2: language-neutral content fields (`targetText`, `supportTextByLocale`)
- [ ] Ambient audio per scene (café sounds, street sounds)
- [ ] Dialog progress tracking / history (localStorage)
- [ ] LLM evaluation for free responses (GPT-4o-mini)
- [ ] Mobile layout improvements
- [ ] Azure Pronunciation Assessment API for phoneme feedback
- [ ] UI shell i18n (deferred — English labels sufficient for now)
