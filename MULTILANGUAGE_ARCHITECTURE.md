# SpeakOut Multi-Language Architecture

## Scope

This document defines the target architecture for supporting multiple target languages in SpeakOut while preserving existing Korean behavior.

In scope:

- language-aware STT and TTS configuration
- language-aware UI shell behavior
- language-specific text processing boundaries
- content schema evolution

Out of scope:

- full content authoring for all languages
- replacing all Korean-specific pedagogy in a single release

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

## In Progress / Pending

- [ ] Replace hardcoded shell copy with i18n dictionary keys.
- [ ] Move scoring normalization into language adapters.
- [ ] Move keyword matching into language adapters.
- [ ] Add schema v2 loader support and dual-schema compatibility tests.
- [ ] Add pilot scenario content for Spanish and French.

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

Language-sensitive text logic must move behind adapters:

- normalize(text, languageId)
- matchKeywords(transcript, keywords, languageId)

Current Korean-specific behavior remains baseline adapter implementation.

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

## Phase 2: UI Shell i18n

Status: pending

Acceptance:

- [ ] hardcoded shell labels moved to dictionary
- [ ] missing keys safely fallback to English

## Phase 3: Language Adapters

Status: pending

Acceptance:

- [ ] scoring normalization routed through adapter
- [ ] keyword matching routed through adapter
- [ ] tests added for at least 3 languages

## Phase 4: Schema v2 Migration

Status: pending

Acceptance:

- [ ] dual-schema loader support implemented
- [ ] loader compatibility tests added

## Phase 5: Pilot Language Content

Status: pending

Acceptance:

- [ ] at least one complete Spanish scenario
- [ ] at least one complete French scenario
- [ ] no Korean regression in speaking and writing flows

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
