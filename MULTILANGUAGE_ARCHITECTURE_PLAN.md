# SpeakOut Multi-Language Architecture Plan (Checkpoint)

## Why this checkpoint is the right move

Yes, this is the right moment to checkpoint.

- Current architecture is mostly reusable.
- Korean-specific logic is concentrated in a few files.
- A staged plan reduces risk and prevents over-engineering.

This document defines the minimum architecture needed to support Spanish, French, and Chinese without making the app much more complex.

## Decision summary

- Keep the current app flow and component hierarchy.
- Add a language layer (configuration + adapters), not a full rewrite.
- Migrate data schema from Korean-specific fields to generic target/native fields.
- Start with a small spike: one scenario in Spanish and one in French.

## Current constraints (baseline)

Coupling points today:

1. Speech defaults hardcoded to Korean in speech hook and Azure TTS service.
2. Korean-specific normalization and grammar matching in scoring and keyword matching.
3. Korean UI copy and labels in several components.
4. Data schema names and content strongly tied to Korean.
5. Korean-only helper features (keyboard reference, TOPIK-focused charts).

## Target architecture (v1)

## 1) Language Registry (single source of truth)

Create a registry that describes each supported language.

Example shape:

```ts
LanguageConfig = {
  id: 'ko' | 'es' | 'fr' | 'zh-CN',
  label: string,
  sttLang: string,
  tts: {
    azureVoice: string,
    ssmlLang: string,
    fallbackLang: string,
  },
  features: {
    virtualKeyboard: boolean,
    grammarAwareKeywords: boolean,
    chartPack?: string,
  },
}
```

Notes:

- STT/TTS should read from this registry, never hardcoded in components.
- Feature flags avoid branching all over the UI.

## 2) Language Services boundary

Refactor language-sensitive logic behind adapters:

- Normalizer adapter per language
- Keyword matching adapter per language
- Optional input helper adapter (virtual keyboard or none)

Interface sketch:

```ts
normalize(text: string, languageId: string): string
matchKeywords(transcript: string, keywords: string[], languageId: string): MatchResult[]
```

Behavior:

- Korean keeps advanced grammar-aware matcher.
- New languages can start with simple token/substring matcher.
- Improve per language later without touching mode components.

## 3) UI text localization (minimal i18n)

Introduce a small dictionary-based i18n layer for app chrome text:

- button labels
- status copy
- speaker labels
- placeholders

Keep scenario content in scenario files (not in i18n dictionaries).

## 4) Content model v2

Move from Korean-specific field names to generic names.

Current pattern:

- korean
- english

Target pattern:

- targetText
- supportText

Optional additions:

- languageId at scenario or section level
- tags for level/formality/register

Migration guideline:

- Keep backward compatibility loader during transition.
- Convert existing content progressively.

## 5) Feature modularity

Make language-specific features optional:

- Korean keyboard helper shown only when language config enables it.
- TOPIK chart pack shown only for Korean monologue entries.
- Other languages can use plain prompt cards at first.

## Implementation phases

## Phase 0: Checkpoint and branch

- Create a branch for spike work.
- Keep current Korean behavior unchanged as baseline.

## Phase 1: Speech config extraction (low risk)

- Replace hardcoded STT and TTS language/voice with Language Registry values.
- Add language selector in settings or top-level app state.

Exit criteria:

- Korean still works exactly as before.
- Switching language changes STT locale and TTS voice.

## Phase 2: i18n shell (low risk)

- Replace hardcoded UI labels with dictionary lookups.
- Keep fallback to English if key is missing.

Exit criteria:

- No hardcoded Korean strings in shared shell components.

## Phase 3: Language adapters (medium risk)

- Move normalize and keyword matching into language adapter module.
- Keep Korean adapter behavior intact.
- Add simple adapters for Spanish and French.

Exit criteria:

- Existing tests still pass.
- New unit tests cover adapter behavior for at least 3 languages.

## Phase 4: Data model migration (medium-high risk)

- Add schema v2 support in loader.
- Migrate one section to v2 as pilot.

Exit criteria:

- App can read both old and new schemas during transition.

## Phase 5: Pilot content (validation)

- Add one complete scenario in Spanish and one in French.
- Run manual end-to-end checks in Practice, Shadow, and Writing.

Exit criteria:

- New language scenarios are usable without regressions in Korean.

## Test strategy for the spike

## Automated

1. Unit tests for language registry validity.
2. Unit tests for normalizers by language.
3. Unit tests for keyword matcher adapters.
4. Contract tests for scenario loader v1 + v2 compatibility.

## Manual

1. Select language and verify STT locale changes.
2. Verify Azure voice changes and fallback speech still works.
3. Complete one full dialog in each pilot language.
4. Confirm Korean-specific helpers are hidden for non-Korean.

## Complexity and effort estimate

- Phase 1-2: low, around 1-2 days.
- Phase 3: medium, around 1-2 days.
- Phase 4-5: medium-high, around 2-4 days plus content authoring.

Total spike: around 1 week for architecture validation.

## Risks and mitigations

1. Speech recognition quality differences by language.
Mitigation: keep scoring thresholds configurable per language.

2. Chinese tokenization may reduce scoring quality.
Mitigation: start with character-level similarity, add tokenizer later.

3. Content migration churn.
Mitigation: dual-schema loader until migration completes.

4. Feature creep from per-language custom logic.
Mitigation: strict adapter interfaces and feature flags.

## Definition of done for this checkpoint

This checkpoint is successful when:

1. Korean behavior is unchanged by default.
2. Spanish and French each have at least one working scenario.
3. STT/TTS and UI labels switch by selected language.
4. Scoring and keyword checks route through adapters.
5. Loader supports both current schema and v2 schema.

## Recommended next command sequence

Use this as a safe start:

```text
git checkout -b feat/multilang-architecture-spike
npm test
```

Then implement Phase 1 first and keep commits small by phase.
