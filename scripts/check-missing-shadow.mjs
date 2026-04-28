#!/usr/bin/env node
/**
 * check-missing-shadow.mjs — Report ALL shadow-mode sentences not in audioManifest.json
 * Includes both shadow[] phrases and dialog exchange user responses.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const RATE = '0.9';
function hashKey(text, langId) {
  return createHash('sha256').update(`${text}|${langId}|${RATE}`).digest('hex').slice(0, 16);
}

function getTargetText(obj, langId) {
  if (langId === 'ko') return obj.korean;
  if (langId === 'es') return obj.spanish;
  if (langId === 'fr') return obj.french;
  if (langId === 'zh') return obj.chinese;
  return obj.korean || obj.spanish || obj.french || obj.chinese;
}

const scenariosUrl = pathToFileURL(resolve(ROOT, 'src/data/scenarios.js')).href;
const mod = await import(scenariosUrl);
const sections = mod.sections || mod.default;

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'src/data/audioManifest.json'), 'utf-8'));

const missing = [];
function lookup(text, langId) {
  const stripped = text.replace(/[.!?。！？]+$/, '');
  return manifest[`${langId}:${text}`]
    || manifest[`${langId}:${stripped}`]
    || manifest[`${langId}:${stripped}.`]
    || manifest[`${langId}:${stripped}!`]
    || manifest[`${langId}:${stripped}?`];
}
function check(text, langId, source) {
  if (!text) return;
  if (!lookup(text, langId)) {
    missing.push({ text, langId, hash: hashKey(text, langId), source });
  }
}

for (const section of sections) {
  const langId = section.languageId || 'ko';
  for (const scenario of section.scenarios) {
    // Shadow phrases
    if (scenario.shadow) {
      for (const s of scenario.shadow) {
        check(getTargetText(s, langId), langId, `shadow:${scenario.id}`);
      }
    }
    // Dialog exchanges — user response lines used by dialog shadowing
    if (scenario.sessions) {
      for (const session of scenario.sessions) {
        if (session.exchanges) {
          for (const ex of session.exchanges) {
            if (ex.speaker === 'other' && ex.expectedResponses?.length) {
              check(ex.expectedResponses[0], langId, `dialog-response:${session.id}`);
            }
            if (ex.speaker === 'you-initiate') {
              const text = getTargetText(ex, langId) || ex.expectedResponses?.[0];
              check(text, langId, `dialog-initiate:${session.id}`);
            }
          }
        }
      }
    }
  }
}

console.log(`Lines missing from manifest: ${missing.length}`);
for (const m of missing) {
  console.log(`  ${m.hash} [${m.langId}] ${m.source} — ${m.text}`);
}
