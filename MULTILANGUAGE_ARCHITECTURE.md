# SpeakOut Multi-Language Architecture

## Scope

This document defines the target architecture for supporting multiple target languages in SpeakOut while preserving existing Korean behavior.

In scope:

- language-aware STT and TTS configuration
- language-aware UI shell behavior
- language-specific text processing boundaries via adapter layer
- any source-language ↔ target-language pair support
- content schema evolution toward language-neutral fields

Out of scope:

- full content authoring for all languages in a single release
- replacing all Korean-specific pedagogy at once
- full UI i18n (deferred — English shell labels are sufficient for now)

## Architectural Principles

- Keep current app flow and component hierarchy.
- Centralize language configuration in one registry.
- Isolate language-specific logic behind explicit adapters.
- Preserve backward compatibility during schema migration.
- Keep Korean as stable baseline while adding new languages.

## Implementation Status

## Completed

- [x] Created language registry with supported language configs.
- [x] Removed hardcoded STT locale from speech recognition startup.
- [x] Removed hardcoded Azure voice and SSML language defaults from call sites.
- [x] Added app-level selected language state with persistence.
- [x] Added language selector in settings.
- [x] Threaded selected language through Practice, Shadow, Monologue, and Writing flows.
- [x] Gated Korean keyboard helper behind language feature flag.
- [x] Created language adapter dispatch layer with default, Korean, and Spanish adapters.
- [x] Extracted Korean-specific keyword matching from MonologueMode/WritingMode into Korean adapter.
- [x] Routed all scoring and keyword checks through adapter dispatch.
- [x] Added adapter tests for Korean, Spanish, and default/generic behavior (21 tests).
- [x] Added pilot scenario content for Spanish (first non-Korean target).
- [x] Added language-aware field accessor utility (getLanguageField).
- [x] Updated all practice components (Practice, Shadow, Monologue, Writing) to use language-aware text fields.
- [x] Added languageId metadata to content sections for language-based filtering.
- [x] Added in-page language selector dropdown in topic grid header.
- [x] Removed redundant language selector from Settings popup.
- [x] Expanded Spanish content to full parity with Korean dialog topics (10 scenarios, 31 sessions across travel, casual, and work sections).

## Pending

- [ ] Evolve content schema toward language-neutral fields (targetText, supportTextByLocale).
- [ ] Add schema v2 loader support and dual-schema compatibility tests.
- [ ] Replace hardcoded shell copy with i18n dictionary keys (low priority — deferred).

## Logical Architecture

## 1) Language Registry

Language registry is the single source of truth for:

- sttLang
- tts.azureVoice
- tts.ssmlLang
- tts.fallbackLang
- feature flags (for example virtual keyboard, grammar-aware keywords)

Required behavior:

- unknown language IDs must resolve to Korean fallback
- all speech code must read from the registry, not hardcoded strings

## 2) Speech Layer

Speech layer must be language-driven:

- STT startup accepts language ID and resolves recognition locale from registry
- TTS playback accepts language ID and resolves Azure voice and SSML language from registry
- browser TTS fallback uses the registry fallback language

## 3) UI Language Context

App state holds selected language and persists it in local storage.

Downstream components receive selected language as explicit props for deterministic behavior.

## 4) Language Adapters

Language-sensitive text logic must move behind adapters.

Adapter interface (per language):

- normalize(text) — strip noise characters, normalize whitespace/punctuation
- computeSimilarity(target, spoken) — Levenshtein or language-appropriate scoring
- matchKeywords(transcript, keywords) — grammar-aware keyword detection

Adapter dispatch:

- getAdapter(languageId) resolves to language-specific or default adapter
- unknown language IDs fall back to default adapter
- default adapter: unicode punctuation/whitespace strip + plain substring keyword match
- Korean adapter: current behavior (grammar-aware patterns like (으)ㄹ, (으), (이), slash alternatives)
- Spanish adapter: default + accent-insensitive normalization (future)

File layout:

- src/utils/adapters/index.js — dispatch + default adapter
- src/utils/adapters/korean.js — Korean-specific logic extracted from MonologueMode + scoring
- src/utils/adapters/spanish.js — Spanish-specific overrides (accent-insensitive normalization)
- src/utils/getLanguageField.js — language-aware field accessor for content objects
- src/utils/scoring.js — re-exports from adapter layer

Current Korean-specific behavior remains baseline specialized adapter implementation.

## 5) Feature Modularity

Language feature flags control optional helpers:

- virtual keyboard visible only when enabled for selected language
- chart packs can be language-specific

## Content Model Evolution

Current content schema uses Korean-specific field names.

Target schema v2:

- targetText
- supportText
- optional languageId at section or scenario level

Migration requirements:

- loader must support both schema versions during transition
- migration is incremental by section

## Delivery Roadmap

## Phase 1: Speech Configuration

Status: completed

Acceptance:

- [x] language selection changes STT locale
- [x] language selection changes TTS voice and SSML language
- [x] Korean baseline behavior preserved

## Phase 2: Language Adapters

Status: completed

Acceptance:

- [x] adapter dispatch layer created with default + Korean adapters
- [x] scoring normalization routed through adapter
- [x] keyword matching routed through adapter
- [x] Korean-specific grammar logic extracted from components into Korean adapter
- [x] tests added for Korean, Spanish, and default adapter behavior
- [x] all existing tests remain green

## Phase 3: Spanish Pilot Content

Status: completed

Acceptance:

- [x] at least one complete Spanish scenario (dialog + monologue)
- [x] Spanish adapter handles accent normalization
- [x] no Korean regression in speaking and writing flows
- [x] full Spanish content parity with Korean dialog topics (travel, casual, work)
- [x] language-based content filtering in topic grid
- [x] in-page language selector for quick switching

## Phase 4: Schema v2 Migration

Status: pending

Acceptance:

- [ ] content fields evolved to language-neutral names (targetText, supportTextByLocale)
- [ ] dual-schema loader support implemented
- [ ] loader compatibility tests added

## Phase 5: UI Shell i18n (deferred)

Status: deferred

Rationale: English UI labels are simple and universally understood. Full i18n adds complexity with limited UX benefit at current scale.

Acceptance:

- [ ] hardcoded shell labels moved to dictionary
- [ ] missing keys safely fallback to English

## Validation

Automated:

- build must succeed
- scenario schema tests must pass
- adapter tests must pass once introduced

Manual:

- switch language in settings and verify STT locale change
- verify Azure voice changes with selected language
- verify Korean keyboard helper hidden for non-Korean languages

## Risks

- STT accuracy variance by language and browser
- Chinese tokenization quality for scoring
- temporary complexity during dual-schema support

Mitigations:

- keep thresholds configurable per language
- introduce language-specific tokenization where needed
- remove schema v1 support only after full migration
