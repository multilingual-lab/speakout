import { describe, it, expect } from 'vitest';
import { sections } from './scenarios.js';

const scenarios = sections.flatMap((s) => s.scenarios);
const dialogScenarios = scenarios.filter((s) => s.sessions);
const monologueScenarios = scenarios.filter((s) => s.monologues);
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];
const VALID_SPEAKERS = ['other', 'you-initiate'];

describe('scenarios.js — schema validation', () => {
  // ── Section-level ──

  it('has at least one section', () => {
    expect(sections.length).toBeGreaterThan(0);
  });

  it('every section has required fields', () => {
    for (const section of sections) {
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('title');
      expect(section).toHaveProperty('titleEn');
      expect(section).toHaveProperty('scenarios');
      expect(typeof section.id).toBe('string');
      expect(typeof section.title).toBe('string');
      expect(typeof section.titleEn).toBe('string');
      expect(Array.isArray(section.scenarios)).toBe(true);
      expect(section.scenarios.length).toBeGreaterThan(0);
    }
  });

  it('section ids are unique', () => {
    const ids = sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── Scenario-level ──

  it('every scenario has required fields', () => {
    for (const s of scenarios) {
      expect(s, `scenario missing id`).toHaveProperty('id');
      expect(s, `${s.id} missing title`).toHaveProperty('title');
      expect(s, `${s.id} missing titleEn`).toHaveProperty('titleEn');
      expect(s, `${s.id} missing emoji`).toHaveProperty('emoji');
      expect(s, `${s.id} missing color`).toHaveProperty('color');
      // Dialog scenarios need shadow + sessions; monologue scenarios need monologues
      if (s.monologues) {
        expect(Array.isArray(s.monologues), `${s.id} monologues not array`).toBe(true);
        expect(s.monologues.length, `${s.id} has no monologues`).toBeGreaterThan(0);
      } else {
        expect(s, `${s.id} missing shadow`).toHaveProperty('shadow');
        expect(s, `${s.id} missing sessions`).toHaveProperty('sessions');
        expect(Array.isArray(s.shadow), `${s.id} shadow not array`).toBe(true);
        expect(Array.isArray(s.sessions), `${s.id} sessions not array`).toBe(true);
        expect(s.shadow.length, `${s.id} has empty shadow`).toBeGreaterThan(0);
        expect(s.sessions.length, `${s.id} has no sessions`).toBeGreaterThan(0);
      }
    }
  });

  it('scenario ids are unique', () => {
    const ids = scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── Shadow phrases ──

  it('every shadow phrase has korean and english', () => {
    for (const scenario of dialogScenarios) {
      for (const phrase of scenario.shadow) {
        expect(phrase, `${scenario.id} shadow phrase missing korean`).toHaveProperty('korean');
        expect(phrase, `${scenario.id} shadow phrase missing english`).toHaveProperty('english');
        expect(phrase.korean.length, `${scenario.id} empty korean`).toBeGreaterThan(0);
        expect(phrase.english.length, `${scenario.id} empty english`).toBeGreaterThan(0);
      }
    }
  });

  // ── Session-level ──

  it('every session has required fields with valid level', () => {
    for (const scenario of dialogScenarios) {
      for (const session of scenario.sessions) {
        expect(session, `${scenario.id} session missing id`).toHaveProperty('id');
        expect(session, `${session.id} missing title`).toHaveProperty('title');
        expect(session, `${session.id} missing titleEn`).toHaveProperty('titleEn');
        expect(session, `${session.id} missing level`).toHaveProperty('level');
        expect(session, `${session.id} missing exchanges`).toHaveProperty('exchanges');
        expect(
          VALID_LEVELS,
          `${session.id} has invalid level "${session.level}"`
        ).toContain(session.level);
        expect(Array.isArray(session.exchanges), `${session.id} exchanges not array`).toBe(true);
        expect(session.exchanges.length, `${session.id} has no exchanges`).toBeGreaterThan(0);
      }
    }
  });

  it('session ids are globally unique', () => {
    const ids = dialogScenarios.flatMap((s) => s.sessions.map((sess) => sess.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── Exchange-level ──

  it('every exchange has required fields', () => {
    for (const scenario of dialogScenarios) {
      for (const session of scenario.sessions) {
        session.exchanges.forEach((ex, i) => {
          const label = `${session.id}[${i}]`;
          expect(ex, `${label} missing speaker`).toHaveProperty('speaker');
          expect(VALID_SPEAKERS, `${label} invalid speaker "${ex.speaker}"`).toContain(ex.speaker);
          expect(ex, `${label} missing korean`).toHaveProperty('korean');
          expect(ex, `${label} missing english`).toHaveProperty('english');
          expect(ex, `${label} missing expectedResponses`).toHaveProperty('expectedResponses');
          expect(ex, `${label} missing hint`).toHaveProperty('hint');
          expect(ex, `${label} missing englishResponse`).toHaveProperty('englishResponse');
          expect(Array.isArray(ex.expectedResponses), `${label} expectedResponses not array`).toBe(true);
          expect(ex.expectedResponses.length, `${label} empty expectedResponses`).toBeGreaterThan(0);
        });
      }
    }
  });

  it('you-initiate exchanges have expectedResponses for shadow target', () => {
    for (const scenario of dialogScenarios) {
      for (const session of scenario.sessions) {
        session.exchanges
          .filter((ex) => ex.speaker === 'you-initiate')
          .forEach((ex, i) => {
            const label = `${session.id} you-initiate[${i}]`;
            // you-initiate korean can be empty (user speaks first), but expectedResponses[0] is the shadow target
            expect(
              ex.expectedResponses.length,
              `${label} needs at least 1 expectedResponse for shadow`
            ).toBeGreaterThanOrEqual(1);
            expect(
              ex.expectedResponses[0].length,
              `${label} first expectedResponse must not be empty`
            ).toBeGreaterThan(0);
          });
      }
    }
  });

  // ── No empty strings ──

  it('no exchange has empty string values (except you-initiate korean)', () => {
    for (const scenario of dialogScenarios) {
      for (const session of scenario.sessions) {
        session.exchanges.forEach((ex, i) => {
          const label = `${session.id}[${i}]`;
          if (ex.speaker !== 'you-initiate') {
            expect(ex.korean, `${label} korean empty`).not.toBe('');
          }
          expect(ex.english, `${label} english empty`).not.toBe('');
          expect(ex.hint, `${label} hint empty`).not.toBe('');
          expect(ex.englishResponse, `${label} englishResponse empty`).not.toBe('');
          for (const resp of ex.expectedResponses) {
            expect(resp, `${label} expectedResponse contains empty string`).not.toBe('');
          }
        });
      }
    }
  });

  // ── Monologue-level ──

  it('every monologue has required fields', () => {
    for (const scenario of monologueScenarios) {
      for (const m of scenario.monologues) {
        expect(m, `${scenario.id} monologue missing id`).toHaveProperty('id');
        expect(m, `${m.id} missing title`).toHaveProperty('title');
        expect(m, `${m.id} missing titleEn`).toHaveProperty('titleEn');
        expect(m, `${m.id} missing prompt`).toHaveProperty('prompt');
        expect(m, `${m.id} missing promptKorean`).toHaveProperty('promptKorean');
        expect(m, `${m.id} missing duration`).toHaveProperty('duration');
        expect(m, `${m.id} missing modelAnswer`).toHaveProperty('modelAnswer');
        expect(m, `${m.id} missing modelAnswerEn`).toHaveProperty('modelAnswerEn');
        expect(m, `${m.id} missing level`).toHaveProperty('level');
        expect(VALID_LEVELS, `${m.id} has invalid level "${m.level}"`).toContain(m.level);
        expect(m.prompt.length, `${m.id} empty prompt`).toBeGreaterThan(0);
        expect(m.modelAnswer.length, `${m.id} empty modelAnswer`).toBeGreaterThan(0);
        expect(m.duration, `${m.id} duration must be positive`).toBeGreaterThan(0);
      }
    }
  });

  it('monologue ids are globally unique', () => {
    const ids = monologueScenarios.flatMap((s) => s.monologues.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
